/**
 * PRUDENCE AI — "why did this drawing read nothing?"
 *
 * A drawing set spreads its data across sheets: the SITE PLAN carries setbacks
 * and plot dimensions, the AREA STATEMENT carries areas and FSI, an ELEVATION
 * or SECTION carries height and storey count, and a FLOOR PLAN carries room
 * sizes and clear widths. Upload one floor plan and most statutory checks have
 * no evidence to work from — which is correct, but a flat list of 21 "not
 * readable" chips reads as a broken product rather than a missing sheet.
 *
 * This maps the gap onto the sheet that would close it.
 */

import type { FactKey, PlanFacts } from './complianceKnowledgeBase';

export type SheetKind = 'site-plan' | 'area-statement' | 'elevation' | 'floor-plan' | 'disclosures';

export type SheetRequest = {
  kind: SheetKind;
  /** How the sheet is captioned on a real drawing set. */
  label: string;
  /** What this sheet would unlock. */
  provides: string;
  /** Statutory checks still undecided for want of it. */
  missing: FactKey[];
};

/** Which sheet normally carries each measurement. */
const FACT_SOURCE: Partial<Record<FactKey, SheetKind>> = {
  frontSetback: 'site-plan',
  rearSetback: 'site-plan',
  sideSetbackLeft: 'site-plan',
  sideSetbackRight: 'site-plan',
  roadWidth: 'site-plan',
  accessWidth: 'site-plan',
  fireTenderClearance: 'site-plan',
  turningRadius: 'site-plan',
  fireGateWidth: 'site-plan',
  layoutOpenSpaceShown: 'site-plan',

  plotArea: 'area-statement',
  builtUpArea: 'area-statement',
  footprintArea: 'area-statement',
  carpetArea: 'area-statement',
  declaredCarpetArea: 'area-statement',
  parkingProvided: 'area-statement',
  parkingRequired: 'area-statement',

  buildingHeight: 'elevation',
  floors: 'elevation',
  plinthHeight: 'elevation',
  roomHeight: 'elevation',

  stairWidth: 'floor-plan',
  corridorWidth: 'floor-plan',
  rampSlopeRun: 'floor-plan',
  refugeAreaProvided: 'floor-plan',

  reraRegistrationShown: 'disclosures',
  sanctionApprovalShown: 'disclosures',
  completionDisclosureShown: 'disclosures',
};

const SHEETS: Record<SheetKind, { label: string; provides: string }> = {
  'site-plan': {
    label: 'SITE PLAN',
    provides: 'setbacks, plot dimensions, road width, fire access',
  },
  'area-statement': {
    label: 'AREA STATEMENT',
    provides: 'plot area, built-up area, coverage, FSI, parking counts',
  },
  elevation: {
    label: 'FRONT ELEVATION or SECTION',
    provides: 'building height, storey count, plinth and floor heights',
  },
  'floor-plan': {
    label: 'FLOOR PLAN',
    provides: 'stair and corridor clear widths, ramp slope, refuge area',
  },
  disclosures: {
    label: 'TITLE BLOCK / APPROVALS',
    provides: 'RERA registration, sanction and completion disclosures',
  },
};

const ORDER: SheetKind[] = ['site-plan', 'area-statement', 'elevation', 'floor-plan', 'disclosures'];

/** True when a fact carries a real reading rather than an absent-by-default false. */
function isRead(facts: PlanFacts, key: FactKey) {
  const fact = facts[key];
  if (!fact) return false;
  // A boolean `false` means "the sheet did not show it", which is an answer for
  // a disclosure check but is not a measurement worth crediting elsewhere.
  if (typeof fact.value === 'boolean') return fact.value === true;
  // None of these quantities is meaningfully zero, so a 0 is a failed read.
  return typeof fact.value === 'number' && Number.isFinite(fact.value) && fact.value > 0;
}

/**
 * Groups the undecided checks by the sheet that would decide them, commonest
 * gap first. Returns [] when nothing useful is missing.
 */
export function sheetsThatWouldHelp(facts: PlanFacts, missingKeys: FactKey[]): SheetRequest[] {
  const wanted = missingKeys.filter((key) => !isRead(facts, key));
  const grouped = new Map<SheetKind, FactKey[]>();

  for (const key of wanted) {
    const kind = FACT_SOURCE[key];
    if (!kind) continue;
    const list = grouped.get(kind) || [];
    list.push(key);
    grouped.set(kind, list);
  }

  return ORDER.filter((kind) => (grouped.get(kind) || []).length > 0).map((kind) => ({
    kind,
    label: SHEETS[kind].label,
    provides: SHEETS[kind].provides,
    missing: grouped.get(kind) || [],
  }));
}

/**
 * One-line read of what was actually uploaded, inferred from which fact
 * families came back. Used to explain the gap in the operator's own terms.
 */
export function describeUploadedSheet(facts: PlanFacts): string {
  const has = (keys: FactKey[]) => keys.some((key) => isRead(facts, key));

  const hasSite = has(['frontSetback', 'rearSetback', 'sideSetbackLeft', 'roadWidth']);
  // Declared areas only. `footprintArea` is measured off the traced geometry,
  // so counting it would report every floor plan as an area statement.
  const hasAreas = has(['plotArea', 'builtUpArea', 'carpetArea', 'declaredCarpetArea']);
  const hasHeight = has(['buildingHeight', 'floors']);
  const hasRooms = has(['stairWidth', 'corridorWidth', 'roomHeight', 'footprintArea']);

  if (hasSite && hasAreas && hasHeight) return 'Complete submission set';
  if (hasSite && hasAreas) return 'Site plan with area statement';
  if (hasSite) return 'Site plan';
  if (hasAreas) return 'Area statement';
  if (hasHeight) return 'Elevation or section';
  if (hasRooms) return 'Floor plan only — no statutory data printed on it';
  return 'Nothing legible on this sheet';
}
