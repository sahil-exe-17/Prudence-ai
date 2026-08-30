/**
 * Presentation helpers for compliance results — pin placement and the sample
 * dataset. Kept out of the engine so nothing here can influence a verdict.
 */

import type { EvaluatedRule } from './complianceEngine';
import type { PlanFacts } from './complianceKnowledgeBase';

/**
 * Where each rule's pin sits on the sheet, as percentages from the top-left.
 *
 * Positions follow site-plan convention: the road (and therefore the front
 * setback) is at the bottom, rear at the top. Fixed per rule id so the same
 * drawing always pins in the same place on every device.
 */
const PIN_POSITIONS: Record<string, { x: number; y: number }> = {
  'DCR-SETBACK-FRONT': { x: 50, y: 88 },
  'DCR-SETBACK-REAR': { x: 50, y: 10 },
  'DCR-SETBACK-SIDE-L': { x: 9, y: 50 },
  'DCR-SETBACK-SIDE-R': { x: 91, y: 50 },
  'DCR-FSI': { x: 76, y: 22 },
  'DCR-COVERAGE': { x: 24, y: 22 },
  'DCR-ROAD-WIDTH': { x: 50, y: 96 },
  'DCR-ACCESS-WIDTH': { x: 22, y: 92 },
  'DCR-LOS': { x: 80, y: 78 },
  'DCR-PARKING': { x: 30, y: 70 },
  'NBC-STAIR-WIDTH': { x: 62, y: 45 },
  'NBC-CORRIDOR-WIDTH': { x: 46, y: 55 },
  'NBC-HEIGHT-MAX': { x: 88, y: 12 },
  'NBC-FIRE-GATE': { x: 66, y: 92 },
  'NBC-FIRE-ACCESS': { x: 14, y: 34 },
  'NBC-TURNING-RADIUS': { x: 18, y: 78 },
  'NBC-RAMP-SLOPE': { x: 36, y: 82 },
  'NBC-PLINTH': { x: 58, y: 66 },
  'NBC-ROOM-HEIGHT': { x: 40, y: 38 },
  'NBC-REFUGE': { x: 72, y: 34 },
  'RERA-REGISTRATION': { x: 86, y: 62 },
  'RERA-CARPET-AREA': { x: 56, y: 28 },
  'RERA-SANCTION': { x: 86, y: 70 },
  'RERA-COMPLETION': { x: 86, y: 54 },
};

/** Attaches a stable pin to each rule that has a defined position. */
export function withPins(rules: EvaluatedRule[]) {
  return rules.map((rule) => {
    const position = PIN_POSITIONS[rule.id];
    if (!position) return rule;
    return {
      ...rule,
      annotation: {
        x: position.x,
        y: position.y,
        page: 1,
        label: `${rule.id} ${rule.current}`,
      },
    };
  });
}

/**
 * A fully-specified sample project, used only when the operator explicitly asks
 * for it. These are *facts*, not verdicts — they run through the same engine as
 * a real upload, so the demo exercises the real rule logic rather than replaying
 * a canned result.
 *
 * Deliberately mixed: some values comply, some breach, some are absent, so the
 * three outcome classes are all visible.
 */
export const SAMPLE_PROJECT_LABEL = 'Green Heights — sample dataset';

export const SAMPLE_PROJECT_FACTS: PlanFacts = {
  plotArea: { value: 1200, unit: 'm2', source: 'text', confidence: 1, evidence: 'AREA STATEMENT — PLOT AREA 1200.00 SQ.M' },
  builtUpArea: { value: 3360, unit: 'm2', source: 'text', confidence: 1, evidence: 'AREA STATEMENT — TOTAL BUILT UP AREA 3360.00 SQ.M' },
  footprintArea: { value: 560, unit: 'm2', source: 'text', confidence: 1, evidence: 'AREA STATEMENT — GROUND COVERAGE AREA 560.00 SQ.M' },
  buildingHeight: { value: 18.6, unit: 'm', source: 'text', confidence: 1, evidence: 'SECTION AA — BUILDING HEIGHT 18.60 M' },
  floors: { value: 6, unit: 'count', source: 'text', confidence: 1, evidence: 'G+5 (6 FLOORS)' },
  frontSetback: { value: 6.0, unit: 'm', source: 'text', confidence: 1, evidence: 'SITE PLAN — FRONT SETBACK 6.00 M' },
  rearSetback: { value: 2.4, unit: 'm', source: 'text', confidence: 1, evidence: 'SITE PLAN — REAR SETBACK 2.40 M' },
  sideSetbackLeft: { value: 3.0, unit: 'm', source: 'text', confidence: 1, evidence: 'SITE PLAN — LEFT SIDE SETBACK 3.00 M' },
  sideSetbackRight: { value: 3.0, unit: 'm', source: 'text', confidence: 1, evidence: 'SITE PLAN — RIGHT SIDE SETBACK 3.00 M' },
  roadWidth: { value: 12.0, unit: 'm', source: 'text', confidence: 1, evidence: 'SITE PLAN — EXISTING ROAD WIDTH 12.00 M' },
  accessWidth: { value: 7.5, unit: 'm', source: 'text', confidence: 1, evidence: 'SITE PLAN — MEANS OF ACCESS 7.50 M' },
  stairWidth: { value: 0.9, unit: 'm', source: 'text', confidence: 1, evidence: 'CORE DETAIL — STAIR WIDTH 0.90 M' },
  corridorWidth: { value: 1.2, unit: 'm', source: 'text', confidence: 1, evidence: 'TYPICAL FLOOR — CORRIDOR WIDTH 1.20 M' },
  rampSlopeRun: { value: 6, unit: 'ratio', source: 'text', confidence: 1, evidence: 'BASEMENT RAMP SLOPE 1:6' },
  plinthHeight: { value: 0.6, unit: 'm', source: 'text', confidence: 1, evidence: 'SECTION AA — PLINTH HEIGHT 0.60 M' },
  roomHeight: { value: 2.9, unit: 'm', source: 'text', confidence: 1, evidence: 'SECTION AA — FLOOR TO CEILING 2.90 M' },
  fireGateWidth: { value: 4.5, unit: 'm', source: 'text', confidence: 1, evidence: 'SITE PLAN — MAIN GATE WIDTH 4.50 M' },
  fireTenderClearance: { value: 4.5, unit: 'm', source: 'text', confidence: 1, evidence: 'SITE PLAN — FIRE TENDER PATH 4.50 M' },
  turningRadius: { value: 9.0, unit: 'm', source: 'text', confidence: 1, evidence: 'SITE PLAN — TURNING RADIUS 9.00 M' },
  parkingProvided: { value: 25, unit: 'count', source: 'text', confidence: 1, evidence: 'PARKING STATEMENT — 25 CAR PARKS PROVIDED' },
  refugeAreaProvided: { value: 0, unit: 'm2', source: 'text', confidence: 1, evidence: 'No refuge area marked on any floor plate' },
  carpetArea: { value: 82.4, unit: 'm2', source: 'text', confidence: 1, evidence: 'UNIT 3BHK — MEASURED CARPET AREA 82.40 SQ.M' },
  declaredCarpetArea: { value: 86.0, unit: 'm2', source: 'text', confidence: 1, evidence: 'BROCHURE — DECLARED CARPET AREA 86.00 SQ.M' },
  reraRegistrationShown: { value: true, unit: 'bool', source: 'text', confidence: 1, evidence: 'TITLE BLOCK — RERA REGISTRATION NO. PRM/KA/RERA/1251/446' },
  sanctionApprovalShown: { value: true, unit: 'bool', source: 'text', confidence: 1, evidence: 'TITLE BLOCK — SANCTIONED PLAN REF. BBMP/ADD/0421' },
  completionDisclosureShown: { value: false, unit: 'bool', source: 'text', confidence: 1, evidence: 'No completion date or OC status stated on the set' },
  layoutOpenSpaceShown: { value: true, unit: 'bool', source: 'text', confidence: 1, evidence: 'SITE PLAN — LAYOUT OPEN SPACE 120.00 SQ.M HATCHED' },
};
