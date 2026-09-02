/**
 * PRUDENCE AI — advisory blueprint correction.
 *
 * Derives the nearest COMPLIANT envelope for a reconstructed building: the
 * statutory setbacks that must be honoured, the footprint that fits inside
 * them, and the storey count the height and FSI caps allow.
 *
 * This is advisory. It never rewrites the source drawing and it never decides a
 * verdict — `complianceEngine` remains the sole authority on Pass/Fail. The
 * numeric requirements come from the same `JurisdictionProfile` the engine
 * evaluated against, and the correction only answers rules the report actually
 * failed, so a correction can never contradict the finding that prompted it.
 *
 * Violations that geometry cannot fix — undisclosed RERA registration, parking
 * counts, clear widths inside the layout — are separated into `advisories`
 * rather than silently folded into the envelope.
 */

import type { ComplianceReport } from './complianceEngine';
import { JURISDICTIONS, type PlanFacts } from './complianceKnowledgeBase';
import type { PlanModel, PlanRoom, PlanWall } from './planModel';

/** Which dimension of the envelope a correction moves. */
export type CorrectionKind = 'setback' | 'coverage' | 'fsi' | 'height' | 'other';

export type Correction = {
  ruleId: string;
  title: string;
  clause: string;
  kind: CorrectionKind;
  /** True when the change is expressible as a move of the built envelope. */
  geometric: boolean;
  /** Size of the required change, in `unit`. Absent when not quantifiable. */
  delta?: number;
  unit: string;
};

export type CorrectedPlan = {
  /**
   * The submitted building, moved and trimmed as little as possible to comply:
   * the same walls, rooms and openings, shifted inside the statutory setbacks
   * and with any storey the height or FSI cap disallows removed.
   *
   * This is not the maximum buildable volume. Showing that instead produced a
   * bare box far larger than the actual design, and every impact figure came
   * out as zero because the "correction" was bigger than the building.
   */
  building: PlanModel;
  envelope: {
    /** Compliant footprint in plan space (metres, origin at plot top-left). */
    footprint: { x: number; y: number; width: number; depth: number };
    /** Permitted height, metres. */
    height: number;
    /** Storeys that height permits at the model's floor-to-floor. */
    levels: number;
  };
  impact: {
    /** How far each building line must move inward, metres. */
    inset: { front: number; rear: number; left: number; right: number };
    /** Ground-floor area given up, m². */
    footprintLost: number;
    /** Total floor area given up, m². */
    builtUpLost: number;
    levelsRemoved: number;
  };
  /** Geometric remedies, plus the non-geometric ones for completeness. */
  corrections: Correction[];
  /** Failed rules geometry cannot address. */
  advisories: Correction[];
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Rules whose remedy is a move of the envelope, and which axis they move. */
const GEOMETRIC_RULES: Record<string, CorrectionKind> = {
  'DCR-SETBACK-FRONT': 'setback',
  'DCR-SETBACK-REAR': 'setback',
  'DCR-SETBACK-SIDE-L': 'setback',
  'DCR-SETBACK-SIDE-R': 'setback',
  'DCR-COVERAGE': 'coverage',
  'DCR-FSI': 'fsi',
  'NBC-HEIGHT-MAX': 'height',
};

/**
 * Rear setback scales with height exactly as the DCR rule does:
 * max(3.0, 3.0 + 0.3 × (H − 10)).
 */
function requiredRearSetback(height: number) {
  return Math.max(3, 3 + 0.3 * (height - 10));
}

export function buildCorrectedPlan(
  model: PlanModel,
  report: ComplianceReport | null,
  facts?: PlanFacts
): CorrectedPlan | null {
  if (!report) return null;

  const plot = model.plot;
  if (!(plot.width > 0 && plot.depth > 0)) return null;

  const profile = JURISDICTIONS[report.jurisdictionId];
  if (!profile) return null;

  const failed = report.ruleResults.filter((rule) => rule.status === 'Fail');
  if (!failed.length) return null;

  const failedIds = new Set(failed.map((rule) => rule.id));

  // The height rule judges the `buildingHeight` FACT, so the correction has to
  // use the same number. Deriving it from the model instead reported "-0.00 m"
  // whenever the drawing stated a height its traced geometry did not match.
  const heightFact = facts?.buildingHeight;
  const asDrawnHeight =
    heightFact && typeof heightFact.value === 'number' && heightFact.value > 0
      ? heightFact.value
      : model.levels * model.floorHeight;
  /** Floor-to-floor implied by the height actually being judged. */
  const perStorey = model.levels > 0 ? asDrawnHeight / model.levels : model.floorHeight;

  /* ---- required envelope ---- */

  const required = {
    front: profile.minFrontSetback,
    rear: requiredRearSetback(asDrawnHeight),
    left: profile.minSideSetback,
    right: profile.minSideSetback,
  };

  // Only tighten a side the report actually failed. Correcting a compliant side
  // would show the operator a change the bylaws never asked for.
  const sideRule: Record<keyof typeof required, string> = {
    front: 'DCR-SETBACK-FRONT',
    rear: 'DCR-SETBACK-REAR',
    left: 'DCR-SETBACK-SIDE-L',
    right: 'DCR-SETBACK-SIDE-R',
  };

  const target = { ...model.setbacks };
  const inset = { front: 0, rear: 0, left: 0, right: 0 };

  for (const side of ['front', 'rear', 'left', 'right'] as const) {
    if (!failedIds.has(sideRule[side])) continue;
    const need = required[side];
    if (model.setbacks[side] >= need) continue;
    target[side] = need;
    inset[side] = round2(need - model.setbacks[side]);
  }

  /* ---- move the traced building inside the corrected setbacks ---- */

  // The buildable region the setbacks leave.
  const region = {
    x0: target.left,
    y0: target.front,
    x1: plot.width - target.right,
    y1: plot.depth - target.rear,
  };
  if (region.x1 - region.x0 <= 1 || region.y1 - region.y0 <= 1) return null;

  // The building as traced, not the plot it could theoretically fill.
  const drawn = model.walls.reduce(
    (acc, wall) => ({
      minX: Math.min(acc.minX, wall.x1, wall.x2),
      minY: Math.min(acc.minY, wall.y1, wall.y2),
      maxX: Math.max(acc.maxX, wall.x1, wall.x2),
      maxY: Math.max(acc.maxY, wall.y1, wall.y2),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );
  if (!Number.isFinite(drawn.minX) || drawn.maxX <= drawn.minX) return null;

  const drawnWidth = drawn.maxX - drawn.minX;
  const drawnDepth = drawn.maxY - drawn.minY;

  const plotArea = plot.width * plot.depth;
  const maxFootprint = (plotArea * profile.maxGroundCoverage) / 100;
  const maxBuiltUp = plotArea * profile.maxFsi;

  // Shrink ONLY as far as the breached rules demand: enough to fit between the
  // setbacks, and enough to satisfy ground coverage if that failed too.
  let scale = Math.min(
    1,
    (region.x1 - region.x0) / drawnWidth,
    (region.y1 - region.y0) / drawnDepth
  );
  const drawnFootprintArea = drawnWidth * drawnDepth;
  if (failedIds.has('DCR-COVERAGE') && drawnFootprintArea * scale * scale > maxFootprint) {
    scale = Math.min(scale, Math.sqrt(maxFootprint / drawnFootprintArea));
  }

  const centre = { x: (drawn.minX + drawn.maxX) / 2, y: (drawn.minY + drawn.maxY) / 2 };
  const scaledWidth = drawnWidth * scale;
  const scaledDepth = drawnDepth * scale;

  /** Least translation that brings the scaled footprint inside the region. */
  const shiftAxis = (min: number, max: number, low: number, high: number) => {
    if (min < low) return low - min;
    if (max > high) return high - max;
    return 0;
  };
  const shift = {
    x: shiftAxis(centre.x - scaledWidth / 2, centre.x + scaledWidth / 2, region.x0, region.x1),
    y: shiftAxis(centre.y - scaledDepth / 2, centre.y + scaledDepth / 2, region.y0, region.y1),
  };

  /** Scale about the footprint centre, then translate. */
  const mapX = (x: number) => centre.x + (x - centre.x) * scale + shift.x;
  const mapY = (y: number) => centre.y + (y - centre.y) * scale + shift.y;

  const footprint = {
    x: round2(mapX(drawn.minX)),
    y: round2(mapY(drawn.minY)),
    width: round2(scaledWidth),
    depth: round2(scaledDepth),
  };

  /* ---- height and storeys ---- */

  let levels = model.levels;
  if (failedIds.has('NBC-HEIGHT-MAX') && perStorey > 0) {
    levels = Math.max(1, Math.min(levels, Math.floor(profile.maxHeightWithoutNoc / perStorey)));
  }

  const correctedFootprintArea = footprint.width * footprint.depth;
  if (failedIds.has('DCR-FSI') && correctedFootprintArea > 0) {
    levels = Math.max(1, Math.min(levels, Math.floor(maxBuiltUp / correctedFootprintArea)));
  }

  const height = round2(levels * perStorey);

  /* ---- the corrected building ---- */

  // Walls are re-indexed because dropped storeys shift the array, and openings
  // address their host wall by index.
  const wallIndexMap = new Map<number, number>();
  const walls: PlanWall[] = [];
  model.walls.forEach((wall, index) => {
    if (wall.level >= levels) return;
    wallIndexMap.set(index, walls.length);
    walls.push({
      ...wall,
      x1: mapX(wall.x1),
      y1: mapY(wall.y1),
      x2: mapX(wall.x2),
      y2: mapY(wall.y2),
    });
  });

  const rooms: PlanRoom[] = model.rooms
    .filter((room) => room.level < levels)
    .map((room) => {
      const polygon = room.polygon.map((point) => ({ x: mapX(point.x), y: mapY(point.y) }));
      return { ...room, polygon, area: round2(room.area * scale * scale) };
    });

  const openings = model.openings
    .filter((opening) => opening.level < levels && wallIndexMap.has(opening.wall))
    .map((opening) => ({
      ...opening,
      wall: wallIndexMap.get(opening.wall)!,
      // Openings keep their proportional position; only the wall length changed.
      width: opening.width * scale,
    }));

  const building: PlanModel = {
    ...model,
    source: model.source,
    sourcePanel: model.sourcePanel,
    providerMessage: 'Statutorily corrected geometry — derived from the traced building.',
    setbacks: {
      front: round2(target.front),
      rear: round2(target.rear),
      left: round2(target.left),
      right: round2(target.right),
    },
    levels,
    floorHeight: perStorey,
    walls,
    rooms,
    openings,
    markers: [],
    notes: [],
  };

  /* ---- what it costs ---- */

  const asDrawnFootprint = drawnFootprintArea;
  const asDrawnBuiltUp = asDrawnFootprint * model.levels;
  const correctedBuiltUp = correctedFootprintArea * levels;

  const impact = {
    inset,
    footprintLost: Math.max(0, round2(asDrawnFootprint - correctedFootprintArea)),
    builtUpLost: Math.max(0, round2(asDrawnBuiltUp - correctedBuiltUp)),
    levelsRemoved: Math.max(0, model.levels - levels),
  };

  /* ---- correction list ---- */

  const corrections: Correction[] = [];
  const advisories: Correction[] = [];

  for (const rule of failed) {
    const kind = GEOMETRIC_RULES[rule.id];
    if (!kind) {
      advisories.push({
        ruleId: rule.id,
        title: rule.title,
        clause: rule.clause,
        kind: 'other',
        geometric: false,
        unit: '',
      });
      continue;
    }

    let delta: number | undefined;
    let unit = 'm';

    if (kind === 'setback') {
      const side = (Object.keys(sideRule) as (keyof typeof required)[]).find(
        (key) => sideRule[key] === rule.id
      );
      delta = side ? inset[side] : undefined;
    } else if (kind === 'coverage') {
      delta = Math.max(0, round2(asDrawnFootprint - correctedFootprintArea));
      unit = 'm²';
    } else if (kind === 'fsi') {
      delta = Math.max(0, round2(asDrawnBuiltUp - correctedBuiltUp));
      unit = 'm²';
    } else if (kind === 'height') {
      delta = Math.max(0, round2(asDrawnHeight - height));
    }

    corrections.push({
      ruleId: rule.id,
      title: rule.title,
      clause: rule.clause,
      kind,
      geometric: true,
      delta,
      unit,
    });
  }

  // Nothing to draw if no failed rule moved the envelope.
  if (!corrections.length) return null;

  return {
    building,
    envelope: { footprint, height, levels },
    impact,
    corrections: [...corrections, ...advisories],
    advisories,
  };
}
