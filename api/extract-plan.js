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
  '"notes": [string], "confidence": number}',
].join(" ");

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

function buildPrompt(payload) {
  const hints = payload.hints || {};
  return [
    "You are PRUDENCE, a CAD vectorisation engine. Convert this 2D architectural drawing",
    "(floor plan, site plan, or elevation sheet) into 3D building geometry.",
    "Work in METRES. Use a coordinate system whose origin is the TOP-LEFT corner of the plot,",
    "with x increasing to the right and y increasing downwards, exactly matching the image.",
    "Read the printed dimension strings and the drawing scale to recover real metre values;",
    "if no scale is printed, infer it from a known reference such as a door leaf (0.9 m) or a",
    "standard parking bay (2.5 m x 5.0 m), and lower your confidence accordingly.",
    "Trace every wall you can see as a straight centre-line segment. Mark walls on the building",
    "outline as 'exterior' and partitions as 'interior'. Give each wall a level index starting at 0.",
    "For rooms, return the closed polygon of the internal face in the same coordinates.",
    "For openings, 'wall' is the 0-based index into the walls array and 't' is the position along",
    "that wall from 0 at (x1,y1) to 1 at (x2,y2).",
    `Return STRICT JSON only, with this exact schema: ${PLAN_GEOMETRY_SCHEMA}`,
    "Rules: emit at least 4 walls if any structure is visible; never return coordinates outside the",
    "plot; use 0.23 m as default exterior wall thickness and 0.115 m for partitions;",
    "use 3.0 m floor height if none is printed. Set 'confidence' between 0 and 1 to describe how",
    "reliable your scale recovery was, and put any caveats in 'notes'.",
    'If the sheet is not a building drawing at all, return {"walls": []}.',
    `Known values from the compliance report (prefer these when they conflict with your read): ${JSON.stringify(hints)}`,
    `File metadata: ${JSON.stringify({ filename: payload.filename, size: payload.size, mimeType: payload.mimeType })}`,
  ].join(" ");
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
  const body = {
    contents: [{
      parts: [
        { text: buildPrompt(payload) },
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
    return { error: `Gemini returned HTTP ${response.status} during geometry extraction` };
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { model: stripJsonText(text), provider: `Gemini (${model})` };
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
