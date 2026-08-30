/**
 * PRUDENCE AI — 2D drawing to 3D plan model.
 *
 * Plan space is metres, origin at the top-left corner of the plot, X to the
 * right and Y downwards (the same orientation as the uploaded raster), so a
 * violation pin at 40%/60% of the sheet maps straight onto the model.
 * The Three.js scene maps plan (x, y) to world (x, -y) with Y up.
 */

export type Vec2 = { x: number; y: number };

export type PlanWall = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  height: number;
  level: number;
  kind: 'exterior' | 'interior';
};

export type PlanOpening = {
  type: 'door' | 'window';
  /** Index into PlanModel.walls, or -1 when the opening is free-standing. */
  wall: number;
  /** Position along the wall, 0 at (x1,y1) and 1 at (x2,y2). */
  t: number;
  width: number;
  height: number;
  sill: number;
  level: number;
};

export type PlanRoom = {
  name: string;
  polygon: Vec2[];
  area: number;
  level: number;
};

export type PlanMarker = {
  id: string;
  label: string;
  /** Plan-space position in metres. */
  x: number;
  y: number;
  level: number;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'PASS';
};

export type PlanModel = {
  source: 'ai' | 'synthetic';
  providerMessage: string;
  confidence: number;
  units: 'm';
  plot: { width: number; depth: number };
  setbacks: { front: number; rear: number; left: number; right: number };
  levels: number;
  floorHeight: number;
  walls: PlanWall[];
  rooms: PlanRoom[];
  openings: PlanOpening[];
  markers: PlanMarker[];
  notes: string[];
};

export type PlanHints = {
  plotWidth?: number;
  plotDepth?: number;
  levels?: number;
  floorHeight?: number;
  setbacks?: Partial<PlanModel['setbacks']>;
};

/** JSON schema handed to the vision model. Kept here so client and server agree. */
export const PLAN_SCHEMA_PROMPT = `{
  "plot": {"width": number, "depth": number},
  "setbacks": {"front": number, "rear": number, "left": number, "right": number},
  "levels": number,
  "floorHeight": number,
  "walls": [{"x1": number, "y1": number, "x2": number, "y2": number, "thickness": number, "height": number, "level": number, "kind": "exterior|interior"}],
  "rooms": [{"name": string, "polygon": [[number, number]], "level": number}],
  "openings": [{"type": "door|window", "wall": number, "t": number, "width": number, "height": number, "sill": number, "level": number}],
  "notes": [string],
  "confidence": number
}`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const finite = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Deterministic 32-bit string hash so the same drawing always builds the same model. */
function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Seeded PRNG (mulberry32) — no Math.random so the model is reproducible. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wallKey = (wall: { x1: number; y1: number; x2: number; y2: number }) => {
  const round = (value: number) => Math.round(value * 100) / 100;
  const a = `${round(wall.x1)},${round(wall.y1)}`;
  const b = `${round(wall.x2)},${round(wall.y2)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
};

export function wallLength(wall: PlanWall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

export function polygonArea(polygon: Vec2[]) {
  let sum = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

export function polygonCentroid(polygon: Vec2[]): Vec2 {
  if (!polygon.length) return { x: 0, y: 0 };
  let cx = 0;
  let cy = 0;
  let signedArea = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const cross = current.x * next.y - next.x * current.y;
    signedArea += cross;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }
  if (Math.abs(signedArea) < 1e-6) {
    return {
      x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
      y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length,
    };
  }
  signedArea *= 0.5;
  return { x: cx / (6 * signedArea), y: cy / (6 * signedArea) };
}

/* ------------------------------------------------------------------ *
 * Hints pulled off the compliance analysis
 * ------------------------------------------------------------------ */

/**
 * Reads plot size, setbacks and storey count out of whatever the rule engine
 * already surfaced, so the 3D model agrees with the numbers on the report.
 */
export function derivePlanHints(source: {
  ruleResults?: { title?: string; current?: string; required?: string }[];
  summary?: string;
}): PlanHints {
  const hints: PlanHints = { setbacks: {} };
  const rows = Array.isArray(source.ruleResults) ? source.ruleResults : [];
  const corpus = [source.summary || '', ...rows.map((row) => `${row.title} ${row.current} ${row.required}`)]
    .join(' ')
    .toLowerCase();

  const firstMetres = (text: string) => {
    const match = String(text || '').match(/(-?\d+(?:\.\d+)?)\s*(?:m\b|metre|meter|mt)/i);
    return match ? Number.parseFloat(match[1]) : undefined;
  };

  for (const row of rows) {
    const title = String(row.title || '').toLowerCase();
    const value = firstMetres(row.current || '') ?? firstMetres(row.required || '');
    if (value === undefined || value <= 0 || value > 60) continue;
    if (title.includes('front') && title.includes('setback')) hints.setbacks!.front = value;
    else if (title.includes('rear') && title.includes('setback')) hints.setbacks!.rear = value;
    else if (title.includes('side') && title.includes('setback')) {
      hints.setbacks!.left = value;
      hints.setbacks!.right = value;
    }
  }

  const plotMatch = corpus.match(/(\d+(?:\.\d+)?)\s*(?:m|metre|meter)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:m\b|metre|meter)/);
  if (plotMatch) {
    const width = Number.parseFloat(plotMatch[1]);
    const depth = Number.parseFloat(plotMatch[2]);
    if (width > 4 && width < 400 && depth > 4 && depth < 400) {
      hints.plotWidth = width;
      hints.plotDepth = depth;
    }
  }

  const floorsMatch = corpus.match(/(\d+)\s*(?:storey|storeys|story|stories|floors?)\b/);
  if (floorsMatch) {
    const levels = Number.parseInt(floorsMatch[1], 10);
    if (levels >= 1 && levels <= 12) hints.levels = levels;
  }

  const heightMatch = corpus.match(/floor(?:-to-floor)?\s*height[^\d]{0,12}(\d+(?:\.\d+)?)/);
  if (heightMatch) {
    const height = Number.parseFloat(heightMatch[1]);
    if (height >= 2.4 && height <= 6) hints.floorHeight = height;
  }

  return hints;
}

/* ------------------------------------------------------------------ *
 * AI response normalisation
 * ------------------------------------------------------------------ */

/**
 * Validates and clamps a vision-model response into a PlanModel. Returns null
 * when the payload has too little real geometry to be worth rendering, which
 * lets the caller drop to the deterministic generator.
 */
export function normalizePlanModel(
  raw: unknown,
  options: { providerMessage?: string; hints?: PlanHints } = {}
): PlanModel | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, any>;

  const hints = options.hints || {};
  const plotWidth = clamp(finite(input.plot?.width, hints.plotWidth ?? 0), 0, 500);
  const plotDepth = clamp(finite(input.plot?.depth, hints.plotDepth ?? 0), 0, 500);

  const rawWalls: PlanWall[] = Array.isArray(input.walls) ? input.walls : [];
  const levels = clamp(Math.round(finite(input.levels, hints.levels ?? 1)), 1, 12);
  const floorHeight = clamp(finite(input.floorHeight, hints.floorHeight ?? 3), 2.2, 6);

  const walls: PlanWall[] = [];
  const seen = new Set<string>();
  for (const candidate of rawWalls) {
    const wall: PlanWall = {
      x1: finite(candidate?.x1, NaN),
      y1: finite(candidate?.y1, NaN),
      x2: finite(candidate?.x2, NaN),
      y2: finite(candidate?.y2, NaN),
      thickness: clamp(finite(candidate?.thickness, 0.23), 0.05, 1.2),
      height: clamp(finite(candidate?.height, floorHeight), 0.3, 8),
      level: clamp(Math.round(finite(candidate?.level, 0)), 0, levels - 1),
      kind: candidate?.kind === 'interior' ? 'interior' : 'exterior',
    };
    if (![wall.x1, wall.y1, wall.x2, wall.y2].every(Number.isFinite)) continue;
    if (wallLength(wall) < 0.25 || wallLength(wall) > 500) continue;
    const key = `${wall.level}:${wallKey(wall)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    walls.push(wall);
  }

  // Fewer than four segments is a failed read, not a building.
  if (walls.length < 4) return null;

  const bounds = walls.reduce(
    (acc, wall) => ({
      minX: Math.min(acc.minX, wall.x1, wall.x2),
      minY: Math.min(acc.minY, wall.y1, wall.y2),
      maxX: Math.max(acc.maxX, wall.x1, wall.x2),
      maxY: Math.max(acc.maxY, wall.y1, wall.y2),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  const setbacks = {
    front: clamp(finite(input.setbacks?.front, hints.setbacks?.front ?? 3), 0, 30),
    rear: clamp(finite(input.setbacks?.rear, hints.setbacks?.rear ?? 3), 0, 30),
    left: clamp(finite(input.setbacks?.left, hints.setbacks?.left ?? 2), 0, 30),
    right: clamp(finite(input.setbacks?.right, hints.setbacks?.right ?? 2), 0, 30),
  };

  const plot = {
    width: plotWidth > 1 ? plotWidth : bounds.maxX - bounds.minX + setbacks.left + setbacks.right,
    depth: plotDepth > 1 ? plotDepth : bounds.maxY - bounds.minY + setbacks.front + setbacks.rear,
  };

  const rooms: PlanRoom[] = (Array.isArray(input.rooms) ? input.rooms : [])
    .map((room: any, index: number) => {
      const points: Vec2[] = (Array.isArray(room?.polygon) ? room.polygon : [])
        .map((point: any) => {
          if (Array.isArray(point)) return { x: finite(point[0], NaN), y: finite(point[1], NaN) };
          return { x: finite(point?.x, NaN), y: finite(point?.y, NaN) };
        })
        .filter((point: Vec2) => Number.isFinite(point.x) && Number.isFinite(point.y));
      if (points.length < 3) return null;
      return {
        name: String(room?.name || `Room ${index + 1}`).slice(0, 28),
        polygon: points,
        area: polygonArea(points),
        level: clamp(Math.round(finite(room?.level, 0)), 0, levels - 1),
      };
    })
    .filter(Boolean) as PlanRoom[];

  const openings: PlanOpening[] = (Array.isArray(input.openings) ? input.openings : [])
    .map((opening: any) => {
      const wall = Math.round(finite(opening?.wall, -1));
      if (wall < 0 || wall >= walls.length) return null;
      const host = walls[wall];
      const length = wallLength(host);
      const isDoor = opening?.type !== 'window';
      const width = clamp(finite(opening?.width, isDoor ? 0.9 : 1.2), 0.4, Math.max(0.4, length - 0.3));
      const halfSpan = length > 0 ? width / (2 * length) : 0.5;
      return {
        type: isDoor ? 'door' : 'window',
        wall,
        t: clamp(finite(opening?.t, 0.5), halfSpan, 1 - halfSpan),
        width,
        height: clamp(finite(opening?.height, isDoor ? 2.1 : 1.2), 0.3, host.height - 0.1),
        sill: clamp(finite(opening?.sill, isDoor ? 0 : 0.9), 0, host.height - 0.4),
        level: host.level,
      } as PlanOpening;
    })
    .filter(Boolean) as PlanOpening[];

  return {
    source: 'ai',
    providerMessage: options.providerMessage || 'Vision model geometry',
    confidence: clamp(finite(input.confidence, 0.75), 0, 1),
    units: 'm',
    plot,
    setbacks,
    levels,
    floorHeight,
    walls,
    rooms,
    openings,
    markers: [],
    notes: (Array.isArray(input.notes) ? input.notes : []).map((note: any) => String(note).slice(0, 160)).slice(0, 8),
  };
}

/* ------------------------------------------------------------------ *
 * Deterministic generator (no API key required)
 * ------------------------------------------------------------------ */

type Rect = { x: number; y: number; w: number; h: number };

const ROOM_NAMES = [
  'Living',
  'Master Bed',
  'Bedroom 2',
  'Kitchen',
  'Bedroom 3',
  'Dining',
  'Toilet',
  'Bath',
  'Study',
  'Utility',
  'Balcony',
  'Store',
];

function splitRect(rect: Rect, random: () => number, depth: number, out: Rect[]) {
  const minArea = 8.5;
  const minSide = 2.3;
  if (depth <= 0 || rect.w * rect.h < minArea * 2 || Math.min(rect.w, rect.h) < minSide * 2) {
    out.push(rect);
    return;
  }
  const splitAlongWidth = rect.w >= rect.h;
  const ratio = 0.38 + random() * 0.24;
  if (splitAlongWidth) {
    const cut = Math.round(rect.w * ratio * 10) / 10;
    if (cut < minSide || rect.w - cut < minSide) {
      out.push(rect);
      return;
    }
    splitRect({ x: rect.x, y: rect.y, w: cut, h: rect.h }, random, depth - 1, out);
    splitRect({ x: rect.x + cut, y: rect.y, w: rect.w - cut, h: rect.h }, random, depth - 1, out);
  } else {
    const cut = Math.round(rect.h * ratio * 10) / 10;
    if (cut < minSide || rect.h - cut < minSide) {
      out.push(rect);
      return;
    }
    splitRect({ x: rect.x, y: rect.y, w: rect.w, h: cut }, random, depth - 1, out);
    splitRect({ x: rect.x, y: rect.y + cut, w: rect.w, h: rect.h - cut }, random, depth - 1, out);
  }
}

/**
 * Builds a statutorily-shaped building from the plot envelope and setbacks when
 * no vision geometry is available. It is a real slice-and-dice floor layout —
 * every wall, room and opening is derived, not hard-coded — so the hologram
 * still reflects the plot the report is talking about.
 */
export function synthesizePlanModel(seed: string, hints: PlanHints = {}): PlanModel {
  const random = seededRandom(hashString(seed || 'prudence'));

  const plot = {
    width: hints.plotWidth ?? Math.round((16 + random() * 12) * 10) / 10,
    depth: hints.plotDepth ?? Math.round((20 + random() * 14) * 10) / 10,
  };
  const setbacks = {
    front: hints.setbacks?.front ?? 4.5,
    rear: hints.setbacks?.rear ?? 3,
    left: hints.setbacks?.left ?? 2,
    right: hints.setbacks?.right ?? 2,
  };

  // Keep the buildable envelope sane even if the hints are aggressive.
  const maxSideSetback = Math.max(0.5, (plot.width - 4) / 2);
  const maxDepthSetback = Math.max(0.5, (plot.depth - 4) / 2);
  setbacks.left = Math.min(setbacks.left, maxSideSetback);
  setbacks.right = Math.min(setbacks.right, maxSideSetback);
  setbacks.front = Math.min(setbacks.front, maxDepthSetback);
  setbacks.rear = Math.min(setbacks.rear, maxDepthSetback);

  const levels = clamp(hints.levels ?? 2 + Math.floor(random() * 2), 1, 8);
  const floorHeight = hints.floorHeight ?? 3.1;

  const footprint: Rect = {
    x: setbacks.left,
    y: setbacks.front,
    w: plot.width - setbacks.left - setbacks.right,
    h: plot.depth - setbacks.front - setbacks.rear,
  };

  const walls: PlanWall[] = [];
  const rooms: PlanRoom[] = [];
  const openings: PlanOpening[] = [];
  const wallIndex = new Map<string, number>();

  const addWall = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    level: number,
    kind: 'exterior' | 'interior'
  ) => {
    const wall: PlanWall = {
      x1,
      y1,
      x2,
      y2,
      thickness: kind === 'exterior' ? 0.23 : 0.115,
      height: floorHeight - 0.15,
      level,
      kind,
    };
    const key = `${level}:${wallKey(wall)}`;
    const existing = wallIndex.get(key);
    if (existing !== undefined) {
      // A shared partition discovered from both sides — keep the thicker read.
      if (kind === 'exterior') walls[existing].kind = 'exterior';
      return existing;
    }
    walls.push(wall);
    wallIndex.set(key, walls.length - 1);
    return walls.length - 1;
  };

  const onFootprintEdge = (a: Vec2, b: Vec2) => {
    const eps = 0.01;
    const left = Math.abs(a.x - footprint.x) < eps && Math.abs(b.x - footprint.x) < eps;
    const right =
      Math.abs(a.x - (footprint.x + footprint.w)) < eps && Math.abs(b.x - (footprint.x + footprint.w)) < eps;
    const top = Math.abs(a.y - footprint.y) < eps && Math.abs(b.y - footprint.y) < eps;
    const bottom =
      Math.abs(a.y - (footprint.y + footprint.h)) < eps && Math.abs(b.y - (footprint.y + footprint.h)) < eps;
    return left || right || top || bottom;
  };

  for (let level = 0; level < levels; level += 1) {
    const cells: Rect[] = [];
    // Upper floors reuse the ground layout seed but split one step differently,
    // which reads as a real building rather than a stack of clones.
    splitRect(footprint, seededRandom(hashString(`${seed}#${level}`)), 4, cells);

    cells.forEach((cell, cellIndex) => {
      const polygon: Vec2[] = [
        { x: cell.x, y: cell.y },
        { x: cell.x + cell.w, y: cell.y },
        { x: cell.x + cell.w, y: cell.y + cell.h },
        { x: cell.x, y: cell.y + cell.h },
      ];
      rooms.push({
        name: level === 0 ? ROOM_NAMES[cellIndex % ROOM_NAMES.length] : `L${level} ${ROOM_NAMES[cellIndex % ROOM_NAMES.length]}`,
        polygon,
        area: cell.w * cell.h,
        level,
      });

      for (let edge = 0; edge < 4; edge += 1) {
        const a = polygon[edge];
        const b = polygon[(edge + 1) % 4];
        const kind = onFootprintEdge(a, b) ? 'exterior' : 'interior';
        addWall(a.x, a.y, b.x, b.y, level, kind);
      }
    });
  }

  walls.forEach((wall, index) => {
    const length = wallLength(wall);
    if (wall.kind === 'interior') {
      if (length < 1.6) return;
      openings.push({
        type: 'door',
        wall: index,
        t: 0.5,
        width: 0.9,
        height: 2.1,
        sill: 0,
        level: wall.level,
      });
      return;
    }
    if (length < 2.4) return;
    const count = length > 6 ? 2 : 1;
    for (let n = 0; n < count; n += 1) {
      const t = count === 1 ? 0.5 : 0.3 + n * 0.4;
      openings.push({
        type: 'window',
        wall: index,
        t,
        width: Math.min(1.5, length * 0.28),
        height: 1.35,
        sill: 0.9,
        level: wall.level,
      });
    }
  });

  // Front door on the longest ground-floor wall facing the road (min Y).
  const frontCandidates = walls
    .map((wall, index) => ({ wall, index }))
    .filter(
      ({ wall }) =>
        wall.level === 0 &&
        wall.kind === 'exterior' &&
        Math.abs(wall.y1 - footprint.y) < 0.01 &&
        Math.abs(wall.y2 - footprint.y) < 0.01
    )
    .sort((a, b) => wallLength(b.wall) - wallLength(a.wall));
  if (frontCandidates.length) {
    openings.push({
      type: 'door',
      wall: frontCandidates[0].index,
      t: 0.5,
      width: 1.2,
      height: 2.4,
      sill: 0,
      level: 0,
    });
  }

  return {
    source: 'synthetic',
    providerMessage:
      'Deterministic geometry engine — envelope, setbacks and partitions derived locally from the plot and rule data.',
    confidence: 0.45,
    units: 'm',
    plot,
    setbacks,
    levels,
    floorHeight,
    walls,
    rooms,
    openings,
    markers: [],
    notes: [
      `Buildable envelope ${footprint.w.toFixed(1)} m x ${footprint.h.toFixed(1)} m after statutory setbacks.`,
      `${levels} storey stack at ${floorHeight.toFixed(2)} m floor-to-floor.`,
    ],
  };
}

/**
 * Converts the compliance pins (percentages of the drawing sheet) into
 * plan-space markers so violations float over the right part of the hologram.
 */
export function markersFromAnalysis(
  model: PlanModel,
  rules: {
    id: string;
    title: string;
    status: string;
    severity?: string;
    annotation?: { x: number; y: number };
  }[]
): PlanMarker[] {
  return rules
    .filter((rule) => rule.annotation)
    .slice(0, 12)
    .map((rule) => {
      const annotation = rule.annotation!;
      const severity: PlanMarker['severity'] =
        rule.status === 'Pass'
          ? 'PASS'
          : rule.severity === 'CRITICAL'
          ? 'CRITICAL'
          : rule.severity === 'MINOR'
          ? 'MINOR'
          : 'MAJOR';
      return {
        id: rule.id,
        label: rule.title,
        x: clamp(annotation.x / 100, 0, 1) * model.plot.width,
        y: clamp(annotation.y / 100, 0, 1) * model.plot.depth,
        level: 0,
        severity,
      };
    });
}

export function planStats(model: PlanModel) {
  const groundRooms = model.rooms.filter((room) => room.level === 0);
  const builtUp = groundRooms.reduce((sum, room) => sum + room.area, 0);
  const plotArea = model.plot.width * model.plot.depth;
  return {
    plotArea,
    builtUp,
    coverage: plotArea > 0 ? (builtUp / plotArea) * 100 : 0,
    fsi: plotArea > 0 ? (builtUp * model.levels) / plotArea : 0,
    height: model.levels * model.floorHeight,
    rooms: groundRooms.length,
    walls: model.walls.length,
    openings: model.openings.length,
  };
}
