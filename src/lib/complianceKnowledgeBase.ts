/**
 * PRUDENCE AI — Statutory knowledge base.
 *
 * This file is the SINGLE source of truth for every threshold, formula and
 * clause reference the product evaluates. Nothing else in the codebase is
 * allowed to decide Pass/Fail.
 *
 * Provenance: thresholds are transcribed from this repository's own statutory
 * reference (`docs/06_Building_Bylaws_Statutory_Domain_Knowledge.md`) and the
 * DCR/NBC rule packs that shipped in `localhost/server.py`. They are encoded as
 * plain data so a domain expert can correct a value in one place and have every
 * surface — browser, local server, Vercel — agree immediately.
 *
 * IMPORTANT: these are demo-grade values for a hackathon prototype, not legal
 * advice. Each entry carries a `clause` string so an assessor can trace a
 * verdict back to the provision it came from and challenge it.
 */

export const KB_VERSION = '2026.08.1';

export type PackId = 'dcr' | 'nbc' | 'rera';
export type JurisdictionId = 'bbmp' | 'mcgm' | 'ubbl';
export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR';

/* ------------------------------------------------------------------ *
 * Facts — everything the engine is allowed to reason about
 * ------------------------------------------------------------------ */

/**
 * Every measurable quantity the rules can consume. Adding a rule that needs a
 * new quantity means adding it here first, which keeps the extractor prompt and
 * the evaluator permanently in sync.
 */
export type FactKey =
  | 'plotArea'
  | 'builtUpArea'
  | 'footprintArea'
  | 'carpetArea'
  | 'declaredCarpetArea'
  | 'buildingHeight'
  | 'floors'
  | 'frontSetback'
  | 'rearSetback'
  | 'sideSetbackLeft'
  | 'sideSetbackRight'
  | 'roadWidth'
  | 'accessWidth'
  | 'stairWidth'
  | 'corridorWidth'
  | 'rampSlopeRun'
  | 'plinthHeight'
  | 'roomHeight'
  | 'fireGateWidth'
  | 'fireTenderClearance'
  | 'turningRadius'
  | 'parkingProvided'
  | 'parkingRequired'
  | 'refugeAreaProvided'
  | 'reraRegistrationShown'
  | 'sanctionApprovalShown'
  | 'completionDisclosureShown'
  | 'layoutOpenSpaceShown';

/** Where a fact came from. Ordered weakest to strongest for conflict resolution. */
export type FactSource = 'assumed' | 'text' | 'geometry' | 'vision';

export const FACT_SOURCE_RANK: Record<FactSource, number> = {
  assumed: 0,
  text: 1,
  geometry: 2,
  vision: 3,
};

export type Fact = {
  /** Numeric quantity in the unit below, or a boolean for disclosure checks. */
  value: number | boolean;
  unit?: 'm' | 'm2' | 'count' | 'ratio' | 'bool';
  source: FactSource;
  /** 0..1. Purely informational — it never changes a verdict. */
  confidence: number;
  /** Verbatim text or measurement the value was read from. */
  evidence: string;
};

export type PlanFacts = Partial<Record<FactKey, Fact>>;

export const FACT_LABELS: Record<FactKey, string> = {
  plotArea: 'Net plot area',
  builtUpArea: 'Total built-up area',
  footprintArea: 'Ground floor footprint area',
  carpetArea: 'Measured carpet area',
  declaredCarpetArea: 'Declared/advertised carpet area',
  buildingHeight: 'Building height above ground level',
  floors: 'Number of storeys',
  frontSetback: 'Front setback',
  rearSetback: 'Rear setback',
  sideSetbackLeft: 'Left side setback',
  sideSetbackRight: 'Right side setback',
  roadWidth: 'Abutting road width',
  accessWidth: 'Public street / means of access width',
  stairWidth: 'Fire evacuation stair clear width',
  corridorWidth: 'Common circulation corridor width',
  rampSlopeRun: 'Vehicle ramp run per 1 unit rise',
  plinthHeight: 'Plinth height above finished ground level',
  roomHeight: 'Habitable room clear ceiling height',
  fireGateWidth: 'Main entrance gate clear opening',
  fireTenderClearance: 'Fire tender approach clearance',
  turningRadius: 'Fire tender turning radius',
  parkingProvided: 'Car parking bays provided',
  parkingRequired: 'Car parking bays required',
  refugeAreaProvided: 'Refuge area provided',
  reraRegistrationShown: 'RERA registration disclosed',
  sanctionApprovalShown: 'Sanctioned plan / approvals disclosed',
  completionDisclosureShown: 'Completion / occupancy disclosed',
  layoutOpenSpaceShown: 'Layout open space shown',
};

/* ------------------------------------------------------------------ *
 * Jurisdiction profiles
 * ------------------------------------------------------------------ */

export type JurisdictionProfile = {
  id: JurisdictionId;
  label: string;
  authority: string;
  /** Maximum permissible Floor Space Index. */
  maxFsi: number;
  /** Maximum permissible ground coverage, percent of plot area. */
  maxGroundCoverage: number;
  /** Minimum front setback, metres. */
  minFrontSetback: number;
  /** Minimum side setback, metres. */
  minSideSetback: number;
  /** Minimum abutting road width for a non-high-rise building, metres. */
  minRoadWidth: number;
  /** Height above which high-rise fire provisions are triggered, metres. */
  highRiseThreshold: number;
  /** Maximum building height without a separate high-rise NOC, metres. */
  maxHeightWithoutNoc: number;
  /** Carpet-area disclosure tolerance, percent. */
  carpetAreaTolerance: number;
  /** Car parking bays required per 100 m² of built-up area. */
  parkingPer100SqM: number;
};

export const JURISDICTIONS: Record<JurisdictionId, JurisdictionProfile> = {
  bbmp: {
    id: 'bbmp',
    label: 'BBMP 2026',
    authority: 'Bruhat Bengaluru Mahanagara Palike',
    maxFsi: 2.5,
    maxGroundCoverage: 60,
    minFrontSetback: 6.0,
    minSideSetback: 3.0,
    minRoadWidth: 6.0,
    highRiseThreshold: 15.0,
    maxHeightWithoutNoc: 24.0,
    carpetAreaTolerance: 1.4,
    parkingPer100SqM: 1.0,
  },
  mcgm: {
    id: 'mcgm',
    label: 'DCPR 2034',
    authority: 'Municipal Corporation of Greater Mumbai',
    maxFsi: 3.0,
    maxGroundCoverage: 45,
    minFrontSetback: 4.5,
    minSideSetback: 3.0,
    minRoadWidth: 9.0,
    highRiseThreshold: 15.0,
    maxHeightWithoutNoc: 24.0,
    carpetAreaTolerance: 1.4,
    parkingPer100SqM: 1.25,
  },
  ubbl: {
    id: 'ubbl',
    label: 'UBBL 2016',
    authority: 'Delhi Development Authority',
    maxFsi: 2.0,
    maxGroundCoverage: 50,
    minFrontSetback: 6.0,
    minSideSetback: 3.0,
    minRoadWidth: 9.0,
    highRiseThreshold: 15.0,
    maxHeightWithoutNoc: 24.0,
    carpetAreaTolerance: 1.4,
    parkingPer100SqM: 1.0,
  },
};

/* ------------------------------------------------------------------ *
 * Statutory formulas
 * ------------------------------------------------------------------ */

/**
 * Rear/side open space required for a given building height.
 * docs/06 §2.3: min rear setback = max(3.0, 3.0 + 0.3 x (H - 10.0)).
 */
export function requiredRearSetback(heightM: number): number {
  return Math.max(3.0, 3.0 + 0.3 * (heightM - 10.0));
}

/**
 * Minimum abutting road width for high-rise buildings.
 * DCR high-rise road table: >32-70 m needs 9 m, >70-120 m needs 12 m,
 * above 120 m needs 18 m.
 */
export function requiredRoadWidthForHeight(heightM: number, base: number): number {
  if (heightM > 120) return 18.0;
  if (heightM > 70) return 12.0;
  if (heightM > 32) return 9.0;
  return base;
}

/** Rounds to 2 dp without floating-point drift, so two devices print the same string. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatM(value: number): string {
  return `${round2(value).toFixed(2)} m`;
}

export function formatArea(value: number): string {
  return `${round2(value).toFixed(2)} m²`;
}

/* ------------------------------------------------------------------ *
 * Rule definitions
 * ------------------------------------------------------------------ */

export type RuleOutcome =
  | { status: 'Pass' | 'Fail'; current: string; calculation: string; action: string }
  /** Returned when the drawing does not carry the evidence to decide. */
  | { status: 'Missing'; current: string; calculation: string; action: string };

export type RuleContext = {
  profile: JurisdictionProfile;
  facts: PlanFacts;
  /** Reads a numeric fact, or undefined when absent. */
  num: (key: FactKey) => number | undefined;
  /** Reads a boolean disclosure fact, or undefined when absent. */
  bool: (key: FactKey) => boolean | undefined;
};

export type RuleDefinition = {
  id: string;
  pack: PackId;
  title: string;
  clause: string;
  severity: Severity;
  /** Human-readable statement of what the code demands. */
  requirement: (ctx: RuleContext) => string;
  /** Facts without which the rule cannot be decided. */
  needs: FactKey[];
  evaluate: (ctx: RuleContext) => RuleOutcome;
};

/** Standard "we could not read this" outcome, so wording is consistent. */
function missing(needs: FactKey[]): RuleOutcome {
  const labels = needs.map((key) => FACT_LABELS[key]).join(', ');
  return {
    status: 'Missing',
    current: 'Not readable from the uploaded drawing',
    calculation: `Cannot evaluate: ${labels} not found.`,
    action: `Add a legible dimension or note for ${labels} to the drawing set, or upload a sheet where it is readable.`,
  };
}

/** Builds a minimum-value rule (provided must be >= required). */
function minValueRule(config: {
  id: string;
  pack: PackId;
  title: string;
  clause: string;
  severity: Severity;
  fact: FactKey;
  required: (ctx: RuleContext) => number | undefined;
  requirementText: (required: number | undefined, ctx: RuleContext) => string;
  extraNeeds?: FactKey[];
}): RuleDefinition {
  return {
    id: config.id,
    pack: config.pack,
    title: config.title,
    clause: config.clause,
    severity: config.severity,
    needs: [config.fact, ...(config.extraNeeds || [])],
    requirement: (ctx) => config.requirementText(config.required(ctx), ctx),
    evaluate: (ctx) => {
      const provided = ctx.num(config.fact);
      const required = config.required(ctx);
      if (provided === undefined || required === undefined) {
        return missing([config.fact, ...(config.extraNeeds || [])]);
      }
      const deficit = round2(required - provided);
      if (provided >= required) {
        return {
          status: 'Pass',
          current: formatM(provided),
          calculation: `${formatM(provided)} provided ≥ ${formatM(required)} required (surplus ${formatM(-deficit)}).`,
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: formatM(provided),
        calculation: `${formatM(required)} required − ${formatM(provided)} provided = ${formatM(deficit)} deficit.`,
        action: `Increase ${config.title.toLowerCase()} by ${formatM(deficit)} to reach the required ${formatM(required)}.`,
      };
    },
  };
}

/** Builds a disclosure rule — the item is either shown on the sheet or it is not. */
function disclosureRule(config: {
  id: string;
  pack: PackId;
  title: string;
  clause: string;
  severity: Severity;
  fact: FactKey;
  requirementText: string;
  actionText: string;
}): RuleDefinition {
  return {
    id: config.id,
    pack: config.pack,
    title: config.title,
    clause: config.clause,
    severity: config.severity,
    needs: [config.fact],
    requirement: () => config.requirementText,
    evaluate: (ctx) => {
      const shown = ctx.bool(config.fact);
      if (shown === undefined) return missing([config.fact]);
      if (shown) {
        return {
          status: 'Pass',
          current: 'Disclosed on the submitted set',
          calculation: 'Required disclosure located in the drawing/document text.',
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: 'Not disclosed',
        calculation: 'Required disclosure was not found anywhere in the submitted set.',
        action: config.actionText,
      };
    },
  };
}

/* ------------------------------------------------------------------ *
 * The rule packs
 * ------------------------------------------------------------------ */

export const RULES: RuleDefinition[] = [
  /* ---------------------------- DCR ---------------------------- */

  minValueRule({
    id: 'DCR-SETBACK-FRONT',
    pack: 'dcr',
    title: 'Front setback',
    clause: 'DCR Table 4.2 — Setback Clearances (SETBACK-F01)',
    severity: 'CRITICAL',
    fact: 'frontSetback',
    required: (ctx) => ctx.profile.minFrontSetback,
    requirementText: (required, ctx) =>
      `Minimum ${formatM(required ?? 0)} front setback from the road boundary under ${ctx.profile.label}.`,
  }),

  {
    id: 'DCR-SETBACK-REAR',
    pack: 'dcr',
    title: 'Rear setback',
    clause: 'DCR Table 4.2 — Setback Clearances (SETBACK-R01)',
    severity: 'CRITICAL',
    needs: ['rearSetback', 'buildingHeight'],
    requirement: (ctx) => {
      const height = ctx.num('buildingHeight');
      if (height === undefined) return 'Minimum rear setback scales with building height: max(3.0, 3.0 + 0.3 × (H − 10)).';
      return `Minimum ${formatM(requiredRearSetback(height))} rear setback for a ${formatM(height)} building.`;
    },
    evaluate: (ctx) => {
      const provided = ctx.num('rearSetback');
      const height = ctx.num('buildingHeight');
      if (provided === undefined || height === undefined) return missing(['rearSetback', 'buildingHeight']);
      const required = round2(requiredRearSetback(height));
      const deficit = round2(required - provided);
      if (provided >= required) {
        return {
          status: 'Pass',
          current: formatM(provided),
          calculation: `max(3.00, 3.00 + 0.3 × (${round2(height)} − 10.00)) = ${formatM(required)} required; ${formatM(provided)} provided.`,
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: formatM(provided),
        calculation: `max(3.00, 3.00 + 0.3 × (${round2(height)} − 10.00)) = ${formatM(required)} required − ${formatM(provided)} provided = ${formatM(deficit)} deficit.`,
        action: `Shift the rear building line ${formatM(deficit)} inward, or reduce building height to ${formatM(round2((provided - 3.0) / 0.3 + 10.0))}.`,
      };
    },
  },

  minValueRule({
    id: 'DCR-SETBACK-SIDE-L',
    pack: 'dcr',
    title: 'Left side setback',
    clause: 'DCR Table 4.2 — Side Open Space',
    severity: 'MAJOR',
    fact: 'sideSetbackLeft',
    required: (ctx) => ctx.profile.minSideSetback,
    requirementText: (required, ctx) =>
      `Minimum ${formatM(required ?? 0)} left side open space under ${ctx.profile.label}.`,
  }),

  minValueRule({
    id: 'DCR-SETBACK-SIDE-R',
    pack: 'dcr',
    title: 'Right side setback',
    clause: 'DCR Table 4.2 — Side Open Space',
    severity: 'MAJOR',
    fact: 'sideSetbackRight',
    required: (ctx) => ctx.profile.minSideSetback,
    requirementText: (required, ctx) =>
      `Minimum ${formatM(required ?? 0)} right side open space under ${ctx.profile.label}.`,
  }),

  {
    id: 'DCR-FSI',
    pack: 'dcr',
    title: 'Floor Space Index (FSI/FAR)',
    clause: 'DCR §2.1 — Floor Space Index',
    severity: 'CRITICAL',
    needs: ['builtUpArea', 'plotArea'],
    requirement: (ctx) => `Maximum permissible FSI ${ctx.profile.maxFsi.toFixed(2)} under ${ctx.profile.label}.`,
    evaluate: (ctx) => {
      const builtUp = ctx.num('builtUpArea');
      const plot = ctx.num('plotArea');
      if (builtUp === undefined || plot === undefined || plot <= 0) return missing(['builtUpArea', 'plotArea']);
      const fsi = round2(builtUp / plot);
      const max = ctx.profile.maxFsi;
      if (fsi <= max) {
        return {
          status: 'Pass',
          current: `FSI ${fsi.toFixed(2)}`,
          calculation: `${formatArea(builtUp)} built-up ÷ ${formatArea(plot)} plot = ${fsi.toFixed(2)} ≤ ${max.toFixed(2)} permitted.`,
          action: 'No action required.',
        };
      }
      const excessArea = round2((fsi - max) * plot);
      return {
        status: 'Fail',
        current: `FSI ${fsi.toFixed(2)}`,
        calculation: `${formatArea(builtUp)} ÷ ${formatArea(plot)} = ${fsi.toFixed(2)} > ${max.toFixed(2)} permitted (excess ${(fsi - max).toFixed(2)} FSI = ${formatArea(excessArea)}).`,
        action: `Remove ${formatArea(excessArea)} of built-up area, or apply for premium/TDR FSI to cover the excess.`,
      };
    },
  },

  {
    id: 'DCR-COVERAGE',
    pack: 'dcr',
    title: 'Ground coverage',
    clause: 'DCR §2.2 — Ground Coverage Percentage',
    severity: 'MAJOR',
    needs: ['footprintArea', 'plotArea'],
    requirement: (ctx) =>
      `Maximum ${ctx.profile.maxGroundCoverage.toFixed(1)}% ground coverage under ${ctx.profile.label}.`,
    evaluate: (ctx) => {
      const footprint = ctx.num('footprintArea');
      const plot = ctx.num('plotArea');
      if (footprint === undefined || plot === undefined || plot <= 0) return missing(['footprintArea', 'plotArea']);
      const coverage = round2((footprint / plot) * 100);
      const max = ctx.profile.maxGroundCoverage;
      if (coverage <= max) {
        return {
          status: 'Pass',
          current: `${coverage.toFixed(1)} %`,
          calculation: `${formatArea(footprint)} footprint ÷ ${formatArea(plot)} plot × 100 = ${coverage.toFixed(1)}% ≤ ${max.toFixed(1)}% permitted.`,
          action: 'No action required.',
        };
      }
      const excess = round2(((coverage - max) / 100) * plot);
      return {
        status: 'Fail',
        current: `${coverage.toFixed(1)} %`,
        calculation: `${formatArea(footprint)} ÷ ${formatArea(plot)} × 100 = ${coverage.toFixed(1)}% > ${max.toFixed(1)}% permitted (excess ${formatArea(excess)}).`,
        action: `Reduce the ground floor footprint by ${formatArea(excess)}.`,
      };
    },
  },

  {
    id: 'DCR-ROAD-WIDTH',
    pack: 'dcr',
    title: 'Abutting road width',
    clause: 'DCR — High-Rise Road Width Table',
    severity: 'CRITICAL',
    needs: ['roadWidth', 'buildingHeight'],
    requirement: (ctx) => {
      const height = ctx.num('buildingHeight');
      const base = ctx.profile.minRoadWidth;
      if (height === undefined) {
        return `Minimum ${formatM(base)}; widens to 9 m above 32 m height, 12 m above 70 m, 18 m above 120 m.`;
      }
      return `Minimum ${formatM(requiredRoadWidthForHeight(height, base))} abutting road for a ${formatM(height)} building.`;
    },
    evaluate: (ctx) => {
      const provided = ctx.num('roadWidth');
      const height = ctx.num('buildingHeight');
      if (provided === undefined || height === undefined) return missing(['roadWidth', 'buildingHeight']);
      const required = requiredRoadWidthForHeight(height, ctx.profile.minRoadWidth);
      const deficit = round2(required - provided);
      if (provided >= required) {
        return {
          status: 'Pass',
          current: formatM(provided),
          calculation: `Building height ${formatM(height)} requires ${formatM(required)} road; ${formatM(provided)} available.`,
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: formatM(provided),
        calculation: `Building height ${formatM(height)} requires ${formatM(required)} road − ${formatM(provided)} available = ${formatM(deficit)} deficit.`,
        action: `Reduce building height to the band served by a ${formatM(provided)} road, or secure road widening of ${formatM(deficit)}.`,
      };
    },
  },

  minValueRule({
    id: 'DCR-ACCESS-WIDTH',
    pack: 'dcr',
    title: 'Means of access width',
    clause: 'DCR — Public Street / Access Width (DCR-ACCESS-6M)',
    severity: 'CRITICAL',
    fact: 'accessWidth',
    required: () => 6.0,
    requirementText: () => 'Minimum 6.00 m clear public street / means of access.',
  }),

  disclosureRule({
    id: 'DCR-LOS',
    pack: 'dcr',
    title: 'Layout open space',
    clause: 'DCR — Layout Open Space (DCR-LOS)',
    severity: 'MAJOR',
    fact: 'layoutOpenSpaceShown',
    requirementText:
      'Layout open space must be shown; 60% of required LOS at ground level and 50% of that on mother earth.',
    actionText: 'Mark the layout open space / recreational ground area and its extent on the site plan.',
  }),

  {
    id: 'DCR-PARKING',
    pack: 'dcr',
    title: 'Car parking provision',
    clause: 'DCR — Parking Requirement Table',
    severity: 'MAJOR',
    needs: ['parkingProvided', 'builtUpArea'],
    requirement: (ctx) =>
      `${ctx.profile.parkingPer100SqM.toFixed(2)} car parking bays per 100 m² of built-up area under ${ctx.profile.label}.`,
    evaluate: (ctx) => {
      const provided = ctx.num('parkingProvided');
      const builtUp = ctx.num('builtUpArea');
      if (provided === undefined || builtUp === undefined) return missing(['parkingProvided', 'builtUpArea']);
      // An explicitly stated requirement on the sheet overrides the derived one.
      const stated = ctx.num('parkingRequired');
      const required = stated !== undefined ? Math.ceil(stated) : Math.ceil((builtUp / 100) * ctx.profile.parkingPer100SqM);
      const basis =
        stated !== undefined
          ? `Sheet states ${required} bays required.`
          : `${formatArea(builtUp)} ÷ 100 × ${ctx.profile.parkingPer100SqM.toFixed(2)} = ${required} bays required (rounded up).`;
      if (provided >= required) {
        return {
          status: 'Pass',
          current: `${provided} bays provided`,
          calculation: `${basis} ${provided} provided ≥ ${required} required.`,
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: `${provided} bays provided`,
        calculation: `${basis} ${required} required − ${provided} provided = ${required - provided} bays short.`,
        action: `Provide ${required - provided} additional car parking bays, or reduce built-up area accordingly.`,
      };
    },
  },

  /* ---------------------------- NBC ---------------------------- */

  minValueRule({
    id: 'NBC-STAIR-WIDTH',
    pack: 'nbc',
    title: 'Fire evacuation stair width',
    clause: 'NBC 2016 Part 4 Table 7 (FIRE-STAIR-01)',
    severity: 'CRITICAL',
    fact: 'stairWidth',
    required: () => 1.2,
    requirementText: () => 'Minimum 1.20 m clear width for fire evacuation staircases.',
  }),

  minValueRule({
    id: 'NBC-CORRIDOR-WIDTH',
    pack: 'nbc',
    title: 'Common corridor width',
    clause: 'NBC 2016 Part 4 Clause 4.3 (FIRE-CORR-01)',
    severity: 'CRITICAL',
    fact: 'corridorWidth',
    required: () => 1.5,
    requirementText: () => 'Minimum 1.50 m clear width for common circulation corridors.',
  }),

  {
    id: 'NBC-HEIGHT-MAX',
    pack: 'nbc',
    title: 'Maximum building height',
    clause: 'NBC 2016 Part 4 Clause 6.1 (HEIGHT-MAX-01)',
    severity: 'CRITICAL',
    needs: ['buildingHeight'],
    requirement: (ctx) =>
      `Maximum ${formatM(ctx.profile.maxHeightWithoutNoc)} without a high-rise NOC under ${ctx.profile.label}.`,
    evaluate: (ctx) => {
      const height = ctx.num('buildingHeight');
      if (height === undefined) return missing(['buildingHeight']);
      const max = ctx.profile.maxHeightWithoutNoc;
      if (height <= max) {
        return {
          status: 'Pass',
          current: formatM(height),
          calculation: `${formatM(height)} ≤ ${formatM(max)} permitted without high-rise NOC.`,
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: formatM(height),
        calculation: `${formatM(height)} − ${formatM(max)} = ${formatM(round2(height - max))} above the threshold.`,
        action: `Reduce height by ${formatM(round2(height - max))} or submit a high-rise fire NOC with the application.`,
      };
    },
  },

  minValueRule({
    id: 'NBC-FIRE-GATE',
    pack: 'nbc',
    title: 'Main entrance gate opening',
    clause: 'NBC 2016 — Fire Tender Entry (NBC-GATE-6M)',
    severity: 'MAJOR',
    fact: 'fireGateWidth',
    required: () => 6.0,
    requirementText: () => 'Entrance gate clear opening at least 6.00 m (4.50 m headroom where a lintel exists).',
  }),

  {
    id: 'NBC-FIRE-ACCESS',
    pack: 'nbc',
    title: 'Fire tender access clearance',
    clause: 'NBC 2016 Part 4 — Fire Tender Access (NBC-FIRE-ACCESS)',
    severity: 'CRITICAL',
    needs: ['fireTenderClearance', 'buildingHeight'],
    requirement: (ctx) =>
      `Buildings above ${formatM(ctx.profile.highRiseThreshold)} need 6.00 m clear approach on all sides.`,
    evaluate: (ctx) => {
      const clearance = ctx.num('fireTenderClearance');
      const height = ctx.num('buildingHeight');
      if (height === undefined) return missing(['buildingHeight']);
      // Below the high-rise trigger the provision does not bite at all.
      if (height <= ctx.profile.highRiseThreshold) {
        return {
          status: 'Pass',
          current: `Not applicable at ${formatM(height)}`,
          calculation: `${formatM(height)} ≤ ${formatM(ctx.profile.highRiseThreshold)} high-rise threshold — provision not triggered.`,
          action: 'No action required.',
        };
      }
      if (clearance === undefined) return missing(['fireTenderClearance']);
      const required = 6.0;
      if (clearance >= required) {
        return {
          status: 'Pass',
          current: formatM(clearance),
          calculation: `${formatM(clearance)} ≥ ${formatM(required)} required for a ${formatM(height)} high-rise.`,
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: formatM(clearance),
        calculation: `${formatM(required)} required − ${formatM(clearance)} provided = ${formatM(round2(required - clearance))} deficit on a ${formatM(height)} high-rise.`,
        action: `Widen the perimeter fire tender path by ${formatM(round2(required - clearance))} on all sides.`,
      };
    },
  },

  minValueRule({
    id: 'NBC-TURNING-RADIUS',
    pack: 'nbc',
    title: 'Fire tender turning radius',
    clause: 'NBC 2016 Part 4 — Fire Tender Manoeuvring',
    severity: 'MAJOR',
    fact: 'turningRadius',
    required: () => 9.0,
    requirementText: () => 'Minimum 9.00 m turning radius on a hard surface rated for 45 t.',
  }),

  {
    id: 'NBC-RAMP-SLOPE',
    pack: 'nbc',
    title: 'Vehicle ramp slope',
    clause: 'NBC 2016 — Vehicle Ramp Profile (NBC-RAMP)',
    severity: 'MAJOR',
    needs: ['rampSlopeRun'],
    requirement: () => 'Maximum vehicle ramp gradient 1:8 (run of at least 8 units per 1 unit of rise).',
    evaluate: (ctx) => {
      const run = ctx.num('rampSlopeRun');
      if (run === undefined) return missing(['rampSlopeRun']);
      const required = 8;
      if (run >= required) {
        return {
          status: 'Pass',
          current: `1:${round2(run)}`,
          calculation: `Gradient 1:${round2(run)} is shallower than the 1:${required} maximum.`,
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: `1:${round2(run)}`,
        calculation: `Gradient 1:${round2(run)} is steeper than the permitted 1:${required}.`,
        action: `Lengthen the ramp run so the gradient is 1:${required} or shallower.`,
      };
    },
  },

  minValueRule({
    id: 'NBC-PLINTH',
    pack: 'nbc',
    title: 'Plinth height',
    clause: 'NBC 2016 — Plinth Level (NBC-PLINTH-450)',
    severity: 'MINOR',
    fact: 'plinthHeight',
    required: () => 0.45,
    requirementText: () => 'Finished plinth top at least 0.45 m above surrounding finished ground level.',
  }),

  minValueRule({
    id: 'NBC-ROOM-HEIGHT',
    pack: 'nbc',
    title: 'Habitable room height',
    clause: 'NBC 2016 — General Building Requirements (NBC-ROOM-HEIGHT)',
    severity: 'MAJOR',
    fact: 'roomHeight',
    required: () => 2.75,
    requirementText: () => 'Habitable room clear ceiling height at least 2.75 m.',
  }),

  {
    id: 'NBC-REFUGE',
    pack: 'nbc',
    title: 'Refuge area',
    clause: 'NBC 2016 Part 4 — Refuge Area',
    severity: 'CRITICAL',
    needs: ['buildingHeight', 'refugeAreaProvided'],
    requirement: (ctx) =>
      `Refuge area required for buildings above ${formatM(ctx.profile.highRiseThreshold)}.`,
    evaluate: (ctx) => {
      const height = ctx.num('buildingHeight');
      if (height === undefined) return missing(['buildingHeight']);
      if (height <= ctx.profile.highRiseThreshold) {
        return {
          status: 'Pass',
          current: `Not applicable at ${formatM(height)}`,
          calculation: `${formatM(height)} ≤ ${formatM(ctx.profile.highRiseThreshold)} — refuge area not triggered.`,
          action: 'No action required.',
        };
      }
      const area = ctx.num('refugeAreaProvided');
      if (area === undefined) return missing(['refugeAreaProvided']);
      if (area > 0) {
        return {
          status: 'Pass',
          current: formatArea(area),
          calculation: `${formatArea(area)} refuge area marked on a ${formatM(height)} high-rise.`,
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: 'None marked',
        calculation: `Building height ${formatM(height)} exceeds the ${formatM(ctx.profile.highRiseThreshold)} trigger, but no refuge area is marked.`,
        action: 'Mark a refuge area on the appropriate floors and dimension it on the plan.',
      };
    },
  },

  /* ---------------------------- RERA ---------------------------- */

  disclosureRule({
    id: 'RERA-REGISTRATION',
    pack: 'rera',
    title: 'Project registration',
    clause: 'RERA 2016 §3 — Prior Registration',
    severity: 'CRITICAL',
    fact: 'reraRegistrationShown',
    requirementText: 'RERA registration number must appear before advertisement, marketing, sale or booking.',
    actionText: 'Print the RERA registration number in the title block before the set is issued for marketing.',
  }),

  {
    id: 'RERA-CARPET-AREA',
    pack: 'rera',
    title: 'Carpet area disclosure',
    clause: 'RERA 2016 §2(k) — Carpet Area (CARPET-DISC-01)',
    severity: 'MAJOR',
    needs: ['carpetArea', 'declaredCarpetArea'],
    requirement: (ctx) =>
      `Declared carpet area must match the measured area within ±${ctx.profile.carpetAreaTolerance.toFixed(2)}%.`,
    evaluate: (ctx) => {
      const measured = ctx.num('carpetArea');
      const declared = ctx.num('declaredCarpetArea');
      if (measured === undefined || declared === undefined || declared <= 0) {
        return missing(['carpetArea', 'declaredCarpetArea']);
      }
      const deviation = round2(((measured - declared) / declared) * 100);
      const tolerance = ctx.profile.carpetAreaTolerance;
      if (Math.abs(deviation) <= tolerance) {
        return {
          status: 'Pass',
          current: `${formatArea(measured)} vs ${formatArea(declared)} declared`,
          calculation: `Deviation (${formatArea(measured)} − ${formatArea(declared)}) ÷ ${formatArea(declared)} × 100 = ${deviation.toFixed(2)}%, within ±${tolerance.toFixed(2)}%.`,
          action: 'No action required.',
        };
      }
      return {
        status: 'Fail',
        current: `${formatArea(measured)} vs ${formatArea(declared)} declared`,
        calculation: `Deviation = ${deviation.toFixed(2)}%, outside the ±${tolerance.toFixed(2)}% tolerance.`,
        action: `Re-align unit partitions or correct the declared carpet area; the gap is ${formatArea(round2(Math.abs(measured - declared)))}.`,
      };
    },
  },

  disclosureRule({
    id: 'RERA-SANCTION',
    pack: 'rera',
    title: 'Sanctioned plan / approvals',
    clause: 'RERA 2016 §11 — Promoter Disclosure',
    severity: 'CRITICAL',
    fact: 'sanctionApprovalShown',
    requirementText: 'Sanctioned plan, layout approval and commencement certificate status must be disclosed.',
    actionText: 'Add the sanction number, layout approval reference and commencement certificate status to the set.',
  }),

  disclosureRule({
    id: 'RERA-COMPLETION',
    pack: 'rera',
    title: 'Completion / occupancy disclosure',
    clause: 'RERA 2016 §11(1) — Completion Disclosure',
    severity: 'MAJOR',
    fact: 'completionDisclosureShown',
    requirementText: 'Proposed completion date and occupancy/completion certificate status must be disclosed.',
    actionText: 'State the proposed completion date and current OC/CC status on the cover sheet.',
  }),
];

export const RULES_BY_PACK: Record<PackId, RuleDefinition[]> = {
  dcr: RULES.filter((rule) => rule.pack === 'dcr'),
  nbc: RULES.filter((rule) => rule.pack === 'nbc'),
  rera: RULES.filter((rule) => rule.pack === 'rera'),
};

export const PACK_LABELS: Record<PackId, string> = {
  dcr: 'DCR',
  nbc: 'NBC',
  rera: 'RERA',
};
