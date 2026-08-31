/**
 * Vectorises a 2D building drawing into 3D-ready geometry.
 *
 * Mirrors `gemini_plan_geometry` in localhost/server.py so the deployed build
 * and the local demo server behave identically. On any failure this returns a
 * plain { error } and the browser falls back to its deterministic geometry
 * engine, so the 3D view never goes blank.
 */

const PLAN_GEOMETRY_SCHEMA = [
  '{"plot": {"width": number, "depth": number},',
  '"setbacks": {"front": number, "rear": number, "left": number, "right": number},',
  '"levels": number, "floorHeight": number,',
  '"walls": [{"x1": number, "y1": number, "x2": number, "y2": number, "thickness": number, "height": number, "level": number, "kind": "exterior|interior"}],',
  '"rooms": [{"name": string, "polygon": [[number, number]], "level": number}],',
  '"openings": [{"type": "door|window", "wall": number, "t": number, "width": number, "height": number, "sill": number, "level": number}],',
  '"sourcePanel": string, "notes": [string], "confidence": number}',
].join(" ");

/**
 * True when a result has the signature of a mis-traced site plan.
 *
 * A floor plan always has interior partitions. A bare rectangle with no rooms
 * and no openings means the site plan's building outline was traced instead.
 */
function looksLikeSitePlanOutline(model) {
  if (!model || typeof model !== "object") return false;
  const walls = Array.isArray(model.walls) ? model.walls : [];
  if (!walls.length) return false;
  const rooms = Array.isArray(model.rooms) ? model.rooms : [];
  const openings = Array.isArray(model.openings) ? model.openings : [];
  const interior = walls.filter((wall) => wall && wall.kind === "interior");
  return walls.length <= 6 && interior.length === 0 && rooms.length <= 1 && openings.length === 0;
}

function stripJsonText(text) {
  const trimmed = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : trimmed);
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

/**
 * Prompt for tracing a building out of an architectural sheet.
 *
 * A sheet is almost never one drawing: it is a SITE PLAN, one or more FLOOR
 * PLANS, ELEVATIONS and SECTIONS laid out side by side. Without being told
 * which panel to trace, the model follows the site plan's building outline and
 * returns a hollow four-wall box. The panel selection is the load-bearing part.
 *
 * Kept in lockstep with `build_geometry_prompt` in localhost/server.py.
 */
function buildPrompt(payload, insistFloorPlan) {
  const hints = payload.hints || {};
  return [
    "You are PRUDENCE, a CAD vectorisation engine. This image is ONE architectural sheet that",
    "usually contains SEVERAL SEPARATE DRAWINGS (panels) laid out side by side.",
    insistFloorPlan
      ? "IMPORTANT — a previous attempt on this same sheet returned only a bare outline with no interior partitions, which means the SITE PLAN was traced by mistake. Do not do that again. Locate the panel that shows ROOMS INSIDE THE BUILDING and trace that one. A correct floor-plan trace has many interior walls and several rooms, not four walls."
      : "",
    "STEP 1 — Identify every panel and its type. Panels carry a caption such as 'SITE PLAN',",
    "'TYPICAL FLOOR PLAN', 'GROUND FLOOR PLAN', 'FRONT ELEVATION' or 'SECTION AA', usually",
    "directly above or below the drawing.",
    "STEP 2 — Choose exactly ONE panel to trace: the FLOOR PLAN. That is the panel showing the",
    "INTERIOR layout — room subdivisions, room names, door swings, window openings, staircase",
    "and lift cores, and internal dimension strings.",
    "  * If several floor plans are shown, trace the most detailed typical floor.",
    "  * NEVER trace the SITE PLAN. It shows only the building outline sitting inside the plot",
    "boundary, and tracing it yields a hollow box with no rooms — that is a failed read.",
    "  * NEVER trace an ELEVATION or SECTION. Those are vertical views, not plans.",
    "  * Only if the sheet genuinely contains no floor plan at all, trace the site plan's building",
    "footprint, and set sourcePanel to say so.",
    "STEP 3 — Report the caption of the panel you traced in 'sourcePanel'.",
    "STEP 4 — Trace the chosen panel. Work in METRES. Use a coordinate system whose origin is the",
    "TOP-LEFT corner of that panel's BUILDING FOOTPRINT, x increasing right, y increasing down.",
    "Do NOT try to place the building inside the plot yourself — report footprint-local coordinates",
    "and the setbacks separately; PRUDENCE positions it.",
    "Read printed dimension strings and the panel's own scale (each panel may have a different",
    "scale, e.g. site 1:250 but floor plan 1:100) to recover real metre values. If no scale is",
    "printed, infer it from a door leaf (0.9 m) or a parking bay (2.5 m x 5.0 m) and lower",
    "'confidence' accordingly.",
    "Trace every wall as a straight centre-line segment. Walls on the building outline are",
    "'exterior'; partitions between rooms are 'interior'. Give each wall a level index from 0.",
    "For rooms, return the closed polygon of the internal face in the same coordinates, with the",
    "printed room name.",
    "For openings, 'wall' is the 0-based index into the walls array and 't' is the position along",
    "that wall from 0 at (x1,y1) to 1 at (x2,y2). Mark door swings as 'door' and window symbols as",
    "'window'.",
    "Use the OTHER panels ONLY for context, never for wall geometry: the SITE PLAN gives",
    "plot.width, plot.depth and the four setbacks; an ELEVATION or SECTION gives 'levels' and",
    "'floorHeight'; an AREA STATEMENT cross-checks your areas.",
    `Return STRICT JSON only, with this exact schema: ${PLAN_GEOMETRY_SCHEMA}`,
    "Rules: a real floor plan has interior walls — if you emit fewer than 6 walls or zero rooms,",
    "re-examine the sheet, you have probably picked the wrong panel. Use 0.23 m as default exterior",
    "wall thickness and 0.115 m for partitions, and 3.0 m floor height if none is printed. Put",
    "caveats in 'notes'.",
    'If the sheet is not a building drawing at all, return {"walls": []}.',
    `Known values from the compliance report (prefer these when they conflict): ${JSON.stringify(hints)}`,
    `File metadata: ${JSON.stringify({ filename: payload.filename, size: payload.size, mimeType: payload.mimeType })}`,
  ]
    .filter(Boolean)
    .join(" ");
}

function readImage(payload) {
  let mimeType = String(payload.mimeType || payload.type || "");
  let data = String(payload.data || payload.base64 || "").trim();

  const sniff = data.match(/^data:([^;,]+)[;,]/);
  if (sniff) mimeType = sniff[1];
  data = data.replace(/^data:[^,]+,/, "").replace(/\s/g, "");

  return { mimeType, data };
}

async function geminiGeometry(payload) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.PRUDENCE_GEMINI_API_KEY;
  if (!apiKey) return { error: "GEMINI_API_KEY not configured" };

  const { mimeType, data } = readImage(payload);
  if (!data) return { error: "No drawing data supplied" };
  if (!(mimeType.toLowerCase().startsWith("image/") || mimeType.toLowerCase() === "application/pdf")) {
    return { error: `Geometry extraction needs an image or PDF, got ${mimeType || "unknown type"}` };
  }

  const model = process.env.PRUDENCE_GEMINI_MODEL || "gemini-3.1-flash-lite";

  const attempt = async (insist) => {
    const body = {
      contents: [{
        parts: [
          { text: buildPrompt(payload, insist) },
          { inline_data: { mime_type: mimeType, data } },
        ],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!response.ok) {
      throw new Error(`Gemini returned HTTP ${response.status} during geometry extraction`);
    }
    const json = await response.json();
    return stripJsonText(json?.candidates?.[0]?.content?.parts?.[0]?.text || "");
  };

  const parsed = await attempt(false);

  // A hollow four-wall box means the site plan was traced. One retry that
  // names the mistake recovers the floor plan on most multi-panel sheets.
  if (looksLikeSitePlanOutline(parsed)) {
    const retried = await attempt(true);
    if (!looksLikeSitePlanOutline(retried)) {
      retried.notes = [
        ...(Array.isArray(retried.notes) ? retried.notes : []),
        "First pass traced the site-plan outline; re-traced against the floor plan panel.",
      ];
      return { model: retried, provider: `Gemini (${model})`, retried: true };
    }
    parsed.notes = [
      ...(Array.isArray(parsed.notes) ? parsed.notes : []),
      "Only a building outline was recoverable — no floor plan panel was legible on this sheet.",
    ];
  }

  return { model: parsed, provider: `Gemini (${model})` };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    res.status(200).json(await geminiGeometry(parseBody(req)));
  } catch (error) {
    res.status(200).json({
      error: error instanceof Error ? error.message : "Geometry extraction failed",
    });
  }
}
