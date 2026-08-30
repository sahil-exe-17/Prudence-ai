/**
 * Extracts MEASUREMENTS from a building drawing. Never returns a verdict.
 *
 * Compliance Pass/Fail is decided exclusively by the deterministic engine in
 * `src/lib/complianceEngine.ts`, which runs in the browser. Keeping the model
 * on facts — and keeping evaluation in one place — is what makes two devices
 * agree on the same drawing.
 *
 * Mirrors `gemini_plan_facts` in localhost/server.py.
 */

// Mirrors FactKey in src/lib/complianceKnowledgeBase.ts — keep in sync.
const FACT_FIELDS = [
  ["plotArea", "Net plot area in square metres"],
  ["builtUpArea", "Total built-up area across all floors, square metres"],
  ["footprintArea", "Ground floor footprint / covered area, square metres"],
  ["carpetArea", "Measured carpet area, square metres"],
  ["declaredCarpetArea", "Declared or advertised carpet area, square metres"],
  ["buildingHeight", "Building height above ground level, metres"],
  ["floors", "Number of storeys, count"],
  ["frontSetback", "Front setback, metres"],
  ["rearSetback", "Rear setback, metres"],
  ["sideSetbackLeft", "Left side setback, metres"],
  ["sideSetbackRight", "Right side setback, metres"],
  ["roadWidth", "Abutting road width, metres"],
  ["accessWidth", "Public street or means of access width, metres"],
  ["stairWidth", "Fire evacuation stair clear width, metres"],
  ["corridorWidth", "Common corridor clear width, metres"],
  ["rampSlopeRun", "Vehicle ramp run per 1 unit of rise, e.g. 8 for a 1:8 ramp"],
  ["plinthHeight", "Plinth height above finished ground level, metres"],
  ["roomHeight", "Habitable room clear ceiling height, metres"],
  ["fireGateWidth", "Main entrance gate clear opening, metres"],
  ["fireTenderClearance", "Fire tender approach clearance around the building, metres"],
  ["turningRadius", "Fire tender turning radius, metres"],
  ["parkingProvided", "Car parking bays provided, count"],
  ["parkingRequired", "Car parking bays stated as required, count"],
  ["refugeAreaProvided", "Refuge area provided, square metres"],
  ["reraRegistrationShown", "true if a RERA registration number appears anywhere"],
  ["sanctionApprovalShown", "true if sanctioned plan / layout approval / commencement certificate is referenced"],
  ["completionDisclosureShown", "true if a completion date or occupancy certificate status is stated"],
  ["layoutOpenSpaceShown", "true if layout open space / recreational ground is marked"],
];

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
  const fieldLines = FACT_FIELDS.map(([name, description]) => `  - ${name}: ${description}`).join("\n");
  return [
    "You are PRUDENCE, a measurement extraction engine for Indian building plan review.",
    "Your ONLY job is to read values that are actually printed on this drawing.",
    "You do NOT judge compliance. You do NOT decide pass or fail. You do NOT give opinions.",
    "",
    "Extract these fields where — and only where — the drawing shows them:",
    fieldLines,
    "",
    'Return STRICT JSON shaped as: {"fieldName": {"value": <number or boolean>, "evidence": "<the exact text or dimension you read it from>", "confidence": <0..1>}, ...}',
    "",
    "HARD RULES — violating these produces wrong statutory verdicts:",
    "1. OMIT any field you cannot read. An omitted field is reported to the assessor as 'not readable' and is safe. A guessed field silently becomes a wrong legal finding.",
    "2. 'evidence' must quote text or a dimension that genuinely appears on the sheet. Never write evidence for a value you inferred, estimated or assumed.",
    "3. Convert every length to METRES and every area to SQUARE METRES before returning it. If the sheet is in mm, feet or sq.ft, convert and say so in the evidence.",
    "4. For a ramp written '1:8', return rampSlopeRun = 8.",
    "5. Boolean fields are true only if the item genuinely appears; otherwise return false.",
    "6. Do not copy the numbers in this prompt. They are field descriptions, not data.",
    `Drawing metadata: ${JSON.stringify({ filename: payload.filename, size: payload.size, mimeType: payload.mimeType })}`,
  ].join("\n");
}

function readImage(payload) {
  let mimeType = String(payload.mimeType || payload.type || "");
  let data = String(payload.data || payload.base64 || "").trim();
  const sniff = data.match(/^data:([^;,]+)[;,]/);
  if (sniff) mimeType = sniff[1];
  data = data.replace(/^data:[^,]+,/, "").replace(/\s/g, "");
  return { mimeType, data };
}

async function geminiFacts(payload) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.PRUDENCE_GEMINI_API_KEY;
  if (!apiKey) return { error: "GEMINI_API_KEY not configured", facts: {} };

  const { mimeType, data } = readImage(payload);
  if (!data) return { error: "No drawing data supplied", facts: {} };
  if (!(mimeType.toLowerCase().startsWith("image/") || mimeType.toLowerCase() === "application/pdf")) {
    return { error: `Fact extraction needs an image or PDF, got ${mimeType || "unknown type"}`, facts: {} };
  }

  const model = process.env.PRUDENCE_GEMINI_MODEL || "gemini-3.1-flash-lite";
  const body = {
    contents: [{
      parts: [
        { text: buildPrompt(payload) },
        { inline_data: { mime_type: mimeType, data } },
      ],
    }],
    // Temperature 0: same drawing, same key, same numbers.
    generationConfig: {
      temperature: 0,
      topP: 1,
      topK: 1,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!response.ok) {
    return { error: `Gemini returned HTTP ${response.status} during fact extraction`, facts: {} };
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { facts: stripJsonText(text), provider: `Gemini (${model})` };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const result = await geminiFacts(parseBody(req));
    // The serverless runtime has no PDF text layer; the browser is told so
    // explicitly rather than being left to infer it from an empty string.
    res.status(200).json({ ...result, sheetText: "", textCharacters: 0, textExtractionAvailable: false });
  } catch (error) {
    res.status(200).json({
      error: error instanceof Error ? error.message : "Fact extraction failed",
      facts: {},
      sheetText: "",
      textCharacters: 0,
      textExtractionAvailable: false,
    });
  }
}
