/**
 * PRUDENCE AI — fact extraction.
 *
 * Turns a drawing into a `PlanFacts` bag. Three independent sources feed it,
 * strongest last so `mergeFacts` resolves conflicts predictably:
 *
 *   1. `factsFromText`     — deterministic regex over selectable sheet text
 *   2. `factsFromGeometry` — derived from the reconstructed 3D model
 *   3. `factsFromVision`   — validated output of the vision extractor
 *
 * Nothing here decides a verdict. Everything here is deterministic: the same
 * input string always yields the same facts, with no reliance on locale, clock
 * or environment.
 */

import type { PlanModel } from './planModel';
import {
  type Fact,
  type FactKey,
  type PlanFacts,
} from './complianceKnowledgeBase';
import { round2 } from './complianceKnowledgeBase';

/* ------------------------------------------------------------------ *
 * Text extraction
 * ------------------------------------------------------------------ */

type NumericPattern = {
  key: FactKey;
  unit: Fact['unit'];
  /** Label alternatives, matched case-insensitively. Longest match wins. */
  labels: string[];
  /** Plausible range; values outside it are treated as misreads and dropped. */
  min: number;
  max: number;
  /** Converts a matched value + its written unit into the canonical unit. */
  convert?: (value: number, rawUnit: string) => number | null;
};

const M_UNIT = String.raw`(?:m\b|mtr\b|mtrs\b|metre?s?\b|meter?s?\b|mm\b|cm\b|ft\b|feet\b|')`;
const AREA_UNIT = String.raw`(?:sq\.?\s?m\.?|sqm\b|m2\b|m²|square\s+met(?:re|er)s?)`;

/** Normalises a length written in mm/cm/ft into metres. */
function toMetres(value: number, rawUnit: string): number | null {
  const unit = rawUnit.toLowerCase().replace(/[.\s]/g, '');
  if (unit === 'mm') return value / 1000;
  if (unit === 'cm') return value / 100;
  if (unit === 'ft' || unit === 'feet' || unit === "'") return value * 0.3048;
  return value;
}

const NUMERIC_PATTERNS: NumericPattern[] = [
  {
    key: 'frontSetback',
    unit: 'm',
    labels: ['front setback', 'front margin', 'front open space', 'setback front'],
    min: 0,
    max: 60,
    convert: toMetres,
  },
  {
    key: 'rearSetback',
    unit: 'm',
    labels: ['rear setback', 'rear margin', 'rear open space', 'back setback', 'setback rear'],
    min: 0,
    max: 60,
    convert: toMetres,
  },
  {
    key: 'sideSetbackLeft',
    unit: 'm',
    labels: ['left side setback', 'left setback', 'side setback left', 'left margin', 'left open space'],
    min: 0,
    max: 60,
    convert: toMetres,
  },
  {
    key: 'sideSetbackRight',
    unit: 'm',
    labels: ['right side setback', 'right setback', 'side setback right', 'right margin', 'right open space'],
    min: 0,
    max: 60,
    convert: toMetres,
  },
  {
    key: 'buildingHeight',
    unit: 'm',
    labels: ['building height', 'proposed height', 'total height', 'height of building', 'overall height'],
    min: 1,
    max: 400,
    convert: toMetres,
  },
  {
    key: 'roadWidth',
    unit: 'm',
    labels: ['road width', 'abutting road', 'existing road', 'width of road', 'approach road'],
    min: 0,
    max: 120,
    convert: toMetres,
  },
  {
    key: 'accessWidth',
    unit: 'm',
    labels: ['means of access', 'access width', 'public street', 'street width', 'private access'],
    min: 0,
    max: 120,
    convert: toMetres,
  },
  {
    key: 'stairWidth',
    unit: 'm',
    labels: ['stair width', 'staircase width', 'stair case width', 'flight width', 'tread width of stair'],
    min: 0,
    max: 12,
    convert: toMetres,
  },
  {
    key: 'corridorWidth',
    unit: 'm',
    labels: ['corridor width', 'passage width', 'lobby width', 'circulation width'],
    min: 0,
    max: 20,
    convert: toMetres,
  },
  {
    key: 'plinthHeight',
    unit: 'm',
    labels: ['plinth height', 'plinth level', 'plinth'],
    min: 0,
    max: 5,
    convert: toMetres,
  },
  {
    key: 'roomHeight',
    unit: 'm',
    labels: ['floor to ceiling', 'ceiling height', 'clear height', 'room height', 'floor height'],
    min: 1,
    max: 12,
    convert: toMetres,
  },
  {
    key: 'fireGateWidth',
    unit: 'm',
    labels: ['gate width', 'entrance gate', 'entry gate', 'main gate'],
    min: 0,
    max: 30,
    convert: toMetres,
  },
  {
    key: 'fireTenderClearance',
    unit: 'm',
    labels: ['fire tender', 'fire engine access', 'fire access', 'fire tender path'],
    min: 0,
    max: 40,
    convert: toMetres,
  },
  {
    key: 'turningRadius',
    unit: 'm',
    labels: ['turning radius', 'turning circle'],
    min: 0,
    max: 40,
    convert: toMetres,
  },
  {
    key: 'plotArea',
    unit: 'm2',
    labels: ['plot area', 'site area', 'net plot area', 'land area', 'total plot area'],
    min: 1,
    max: 2_000_000,
  },
  {
    key: 'builtUpArea',
    unit: 'm2',
    labels: ['built up area', 'built-up area', 'builtup area', 'total built up', 'proposed built up area'],
    min: 1,
    max: 5_000_000,
  },
  {
    key: 'footprintArea',
    unit: 'm2',
    labels: ['ground coverage area', 'ground floor area', 'footprint area', 'covered area'],
    min: 1,
    max: 2_000_000,
  },
  {
    key: 'carpetArea',
    unit: 'm2',
    labels: ['carpet area', 'measured carpet area', 'actual carpet area'],
    min: 1,
    max: 1_000_000,
  },
  {
    key: 'declaredCarpetArea',
    unit: 'm2',
    labels: ['declared carpet area', 'advertised carpet area', 'sanctioned carpet area', 'agreement carpet area'],
    min: 1,
    max: 1_000_000,
  },
  {
    key: 'refugeAreaProvided',
    unit: 'm2',
    labels: ['refuge area', 'refuge terrace'],
    min: 0,
    max: 100_000,
  },
];

const COUNT_PATTERNS: { key: FactKey; labels: string[]; min: number; max: number }[] = [
  { key: 'floors', labels: ['storeys', 'storey', 'stories', 'floors', 'no of floors', 'number of floors'], min: 1, max: 200 },
  { key: 'parkingProvided', labels: ['parking provided', 'car parks provided', 'parking bays provided', 'parking spaces provided'], min: 0, max: 20_000 },
  { key: 'parkingRequired', labels: ['parking required', 'car parks required', 'parking bays required', 'parking spaces required'], min: 0, max: 20_000 },
];

const DISCLOSURE_PATTERNS: { key: FactKey; terms: string[] }[] = [
  { key: 'reraRegistrationShown', terms: ['rera registration', 'rera no', 'rera number', 'rera reg', 'registered under rera'] },
  { key: 'sanctionApprovalShown', terms: ['sanctioned plan', 'sanction no', 'layout approval', 'commencement certificate', 'approval no'] },
  { key: 'completionDisclosureShown', terms: ['completion certificate', 'occupancy certificate', 'completion date', 'proposed completion'] },
  { key: 'layoutOpenSpaceShown', terms: ['layout open space', 'recreational ground', 'open space area', 'l.o.s', 'mother earth'] },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Grabs the first quoted snippet around a match, for the audit trail. */
function snippet(corpus: string, index: number, length: number): string {
  const start = Math.max(0, index - 15);
  const end = Math.min(corpus.length, index + length + 15);
  return corpus.slice(start, end).replace(/\s+/g, ' ').trim();
}

/**
 * Reads facts out of selectable sheet text.
 *
 * Matching is anchored to a label, so a bare "3.00" floating on a sheet is
 * never adopted as a setback. When a label appears more than once the FIRST
 * occurrence wins, which keeps the result stable across runs.
 */
export function factsFromText(rawText: string): PlanFacts {
  const facts: PlanFacts = {};
  if (!rawText || !rawText.trim()) return facts;

  // Collapse whitespace so labels split across CAD text runs still match.
  const corpus = rawText.replace(/\s+/g, ' ');
  const lower = corpus.toLowerCase();

  for (const pattern of NUMERIC_PATTERNS) {
    // Longest labels first so "left side setback" beats "side setback".
    const labels = [...pattern.labels].sort((a, b) => b.length - a.length);
    for (const label of labels) {
      const unitGroup = pattern.unit === 'm2' ? AREA_UNIT : M_UNIT;
      const regex = new RegExp(
        `${escapeRegExp(label)}[^0-9\\-]{0,20}(\\d+(?:[.,]\\d+)?)\\s*(${unitGroup})?`,
        'i'
      );
      const match = regex.exec(lower);
      if (!match) continue;

      const numeric = Number.parseFloat(match[1].replace(',', '.'));
      if (!Number.isFinite(numeric)) continue;

      const converted = pattern.convert ? pattern.convert(numeric, match[2] || '') : numeric;
      if (converted === null || !Number.isFinite(converted)) continue;
      if (converted < pattern.min || converted > pattern.max) continue;

      facts[pattern.key] = {
        value: round2(converted),
        unit: pattern.unit,
        source: 'text',
        confidence: match[2] ? 0.8 : 0.6,
        evidence: snippet(corpus, match.index, match[0].length),
      };
      break;
    }
  }

  for (const pattern of COUNT_PATTERNS) {
    const labels = [...pattern.labels].sort((a, b) => b.length - a.length);
    for (const label of labels) {
      // Counts are written either before or after the label ("4 floors" / "floors: 4").
      const after = new RegExp(`${escapeRegExp(label)}[^0-9]{0,12}(\\d{1,5})`, 'i');
      const before = new RegExp(`(\\d{1,5})\\s*${escapeRegExp(label)}`, 'i');
      const match = after.exec(lower) || before.exec(lower);
      if (!match) continue;
      const numeric = Number.parseInt(match[1], 10);
      if (!Number.isFinite(numeric) || numeric < pattern.min || numeric > pattern.max) continue;
      facts[pattern.key] = {
        value: numeric,
        unit: 'count',
        source: 'text',
        confidence: 0.7,
        evidence: snippet(corpus, match.index, match[0].length),
      };
      break;
    }
  }

  // Ramp gradients are written as a ratio, e.g. "1:8" or "1 in 10".
  const rampMatch = /ramp[^0-9]{0,24}1\s*(?::|in)\s*(\d{1,2}(?:\.\d+)?)/i.exec(lower);
  if (rampMatch) {
    const run = Number.parseFloat(rampMatch[1]);
    if (Number.isFinite(run) && run > 0 && run <= 40) {
      facts.rampSlopeRun = {
        value: round2(run),
        unit: 'ratio',
        source: 'text',
        confidence: 0.8,
        evidence: snippet(corpus, rampMatch.index, rampMatch[0].length),
      };
    }
  }

  for (const pattern of DISCLOSURE_PATTERNS) {
    const hit = pattern.terms.find((term) => lower.includes(term));
    // A disclosure check only yields `false` when there IS readable text to
    // search; absence of text is absence of evidence, handled by the caller.
    facts[pattern.key] = {
      value: Boolean(hit),
      unit: 'bool',
      source: 'text',
      confidence: hit ? 0.85 : 0.6,
      evidence: hit ? snippet(corpus, lower.indexOf(hit), hit.length) : 'Term not present in extracted sheet text',
    };
  }

  return facts;
}

/* ------------------------------------------------------------------ *
 * Geometry-derived facts
 * ------------------------------------------------------------------ */

/**
 * Derives areas and setbacks from the reconstructed 3D model. These are real
 * measurements of the traced geometry, so they rank above text guesses but
 * below an explicit vision read of a printed dimension.
 */
export function factsFromGeometry(model: PlanModel): PlanFacts {
  const facts: PlanFacts = {};
  const note = model.source === 'ai' ? 'vision-traced geometry' : 'derived geometry';

  // A trace only supports a fact the vision model actually reported. Defaults
  // applied while normalising are scaffolding for the hologram, not evidence:
  // asserting them produced setback violations on sheets stating no setbacks.
  // Absent provenance (older payloads) is treated as untraced, i.e. safe.
  const provided = model.provided ?? {};

  const plotArea = round2(model.plot.width * model.plot.depth);
  if (provided.plot && plotArea > 0) {
    facts.plotArea = {
      value: plotArea,
      unit: 'm2',
      source: 'geometry',
      confidence: model.confidence,
      evidence: `${model.plot.width.toFixed(2)} m × ${model.plot.depth.toFixed(2)} m plot from ${note}`,
    };
  }

  const groundRooms = model.rooms.filter((room) => room.level === 0);
  const footprint = round2(groundRooms.reduce((sum, room) => sum + room.area, 0));
  if (footprint > 0) {
    facts.footprintArea = {
      value: footprint,
      unit: 'm2',
      source: 'geometry',
      confidence: model.confidence,
      evidence: `${groundRooms.length} ground-floor spaces totalling ${footprint.toFixed(2)} m² from ${note}`,
    };
    // Total built-up area needs a storey count. Multiplying by a defaulted
    // `levels: 1` reports one traced floor as the whole building.
    if (provided.levels) {
      facts.builtUpArea = {
        value: round2(footprint * model.levels),
        unit: 'm2',
        source: 'geometry',
        confidence: model.confidence,
        evidence: `${footprint.toFixed(2)} m² footprint × ${model.levels} storeys from ${note}`,
      };
    }
  }

  // A single floor plan says nothing about how many storeys the building has.
  if (provided.levels) {
    facts.floors = {
      value: model.levels,
      unit: 'count',
      source: 'geometry',
      confidence: model.confidence,
      evidence: `${model.levels} storeys in ${note}`,
    };

    if (provided.floorHeight) {
      facts.buildingHeight = {
        value: round2(model.levels * model.floorHeight),
        unit: 'm',
        source: 'geometry',
        confidence: model.confidence,
        evidence: `${model.levels} storeys × ${model.floorHeight.toFixed(2)} m floor-to-floor from ${note}`,
      };
    }
  }

  const setbackPairs: [FactKey, number][] = [
    ['frontSetback', model.setbacks.front],
    ['rearSetback', model.setbacks.rear],
    ['sideSetbackLeft', model.setbacks.left],
    ['sideSetbackRight', model.setbacks.right],
  ];
  for (const [key, value] of setbackPairs) {
    // `>= 0` previously let a 0 through as "built to the boundary". On a trace
    // with no plot boundary that is a non-read, and it became a CRITICAL fail.
    if (!provided.setbacks || !Number.isFinite(value) || value <= 0) continue;
    facts[key] = {
      value: round2(value),
      unit: 'm',
      source: 'geometry',
      confidence: model.confidence,
      evidence: `${value.toFixed(2)} m clear to the plot boundary in ${note}`,
    };
  }

  return facts;
}

/* ------------------------------------------------------------------ *
 * Vision facts
 * ------------------------------------------------------------------ */

const NUMERIC_KEYS = new Set<FactKey>(
  NUMERIC_PATTERNS.map((pattern) => pattern.key).concat(COUNT_PATTERNS.map((pattern) => pattern.key), ['rampSlopeRun'])
);
const BOOLEAN_KEYS = new Set<FactKey>(DISCLOSURE_PATTERNS.map((pattern) => pattern.key));

const UNIT_BY_KEY = new Map<FactKey, Fact['unit']>([
  ...NUMERIC_PATTERNS.map((pattern) => [pattern.key, pattern.unit] as [FactKey, Fact['unit']]),
  ...COUNT_PATTERNS.map((pattern) => [pattern.key, 'count'] as [FactKey, Fact['unit']]),
  ['rampSlopeRun', 'ratio'],
]);

const RANGE_BY_KEY = new Map<FactKey, [number, number]>([
  ...NUMERIC_PATTERNS.map((pattern) => [pattern.key, [pattern.min, pattern.max]] as [FactKey, [number, number]]),
  ...COUNT_PATTERNS.map((pattern) => [pattern.key, [pattern.min, pattern.max]] as [FactKey, [number, number]]),
  ['rampSlopeRun', [0.5, 40]],
]);

/**
 * Validates the vision extractor's response into facts.
 *
 * Anything the model returns that is not a known key, is out of physical range,
 * or arrives without supporting evidence text is discarded rather than trusted.
 * A hallucinated measurement that survives this becomes a wrong verdict, so the
 * gate is deliberately strict.
 */
export function factsFromVision(raw: unknown): PlanFacts {
  const facts: PlanFacts = {};
  if (!raw || typeof raw !== 'object') return facts;
  const input = raw as Record<string, any>;

  const keys = Object.keys(input).sort();
  for (const key of keys) {
    const factKey = key as FactKey;
    const entry = input[key];
    if (entry === null || entry === undefined) continue;

    // Accept either a bare value or {value, evidence, confidence}.
    const rawValue = typeof entry === 'object' && 'value' in entry ? entry.value : entry;
    const evidence =
      typeof entry === 'object' && typeof entry.evidence === 'string' ? entry.evidence.slice(0, 180) : '';
    const confidenceRaw = typeof entry === 'object' ? Number(entry.confidence) : NaN;
    const confidence = Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : 0.7;

    if (BOOLEAN_KEYS.has(factKey)) {
      if (typeof rawValue !== 'boolean') continue;
      facts[factKey] = {
        value: rawValue,
        unit: 'bool',
        source: 'vision',
        confidence,
        evidence: evidence || 'Read from the drawing by the vision extractor',
      };
      continue;
    }

    if (!NUMERIC_KEYS.has(factKey)) continue;

    const numeric = typeof rawValue === 'string' ? Number.parseFloat(rawValue) : Number(rawValue);
    if (!Number.isFinite(numeric)) continue;

    const range = RANGE_BY_KEY.get(factKey);
    if (range && (numeric < range[0] || numeric > range[1])) continue;

    // A measurement with no stated evidence is a guess; refuse to build a
    // verdict on it.
    if (!evidence) continue;

    facts[factKey] = {
      value: round2(numeric),
      unit: UNIT_BY_KEY.get(factKey) || 'm',
      source: 'vision',
      confidence,
      evidence,
    };
  }

  return facts;
}

/** The keys the vision extractor is asked to fill, shared with the prompt builders. */
export const VISION_FACT_KEYS: FactKey[] = [
  ...Array.from(NUMERIC_KEYS),
  ...Array.from(BOOLEAN_KEYS),
].sort();
