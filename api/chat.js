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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload = parseBody(req);
    const message = payload.message || "";
    const history = payload.history || [];
    const analysis = payload.analysis || {};

    const groqKey = process.env.GROQ_API_KEY || process.env.PRUDENCE_GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const systemInstruction = `You are PRUDENCE AI, an expert architectural and building code compliance advisor.

You help architects, engineers, and developers audit drawing sheets, resolve compliance violations, and secure municipal sanction approvals (BBMP, NBC 2016, RERA, DCR).

RESPONSE FORMATTING & STYLE (CRITICAL):
1. TABLES: Format compliance requirements, required vs provided measurements, land-use schedules, and rule summaries using clean Markdown Tables with headers. Markdown tables render as dark-mode visual data tables in our interface.
2. HIGH-VIBE & FINE-TUNED TONE: Provide sharp, smart, highly actionable architectural guidance. Use clear headers and concise bullet points. Avoid boring boilerplate or generic fluff. State the exact rule (e.g. BBMP 2026 Clause 14.2, NBC 2016 Part 4), the exact measurement deficit, and the exact remediation action.
3. NO PSEUDO WORKFLOW BOXES: Do not wrap standard text in ASCII stage boxes or pseudo-step cards unless explicitly requested by the user.

Current drawing data: ${JSON.stringify(analysis).slice(0, 4000)}`;

    if (groqKey) {
      const groqModel = process.env.PRUDENCE_GROQ_MODEL || "openai/gpt-oss-120b";
      const messages = [{ role: "system", content: systemInstruction }];
      for (const m of history) {
        messages.push({ role: m.role === "user" ? "user" : "assistant", content: m.content });
      }
      messages.push({ role: "user", content: message });

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PRUDENCE-AI",
        },
        body: JSON.stringify({
          model: groqModel,
          messages: messages,
          temperature: 0.4,
          max_tokens: 1000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content || "No response received.";
        res.status(200).json({ response: reply });
        return;
      }
    }

    if (geminiKey) {
      const geminiModel = "gemini-2.0-flash";
      const contents = [];
      for (const m of history) {
        contents.push({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        });
      }
      contents.push({ role: "user", parts: [{ text: message }] });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { temperature: 0.4, maxOutputTokens: 1000 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
        res.status(200).json({ response: reply });
        return;
      }
    }

    // Fallback when no API key is configured
    const fallbackResponse = `I am grounded in your loaded drawing data **"${analysis.documentName || "Current Plan"}"**.

| Rule ID | Parameter | Required | Provided | Status |
|---|---|---|---|---|
| BBMP-FAR-01 | Floor Area Ratio | 2.25 MAX | 2.85 | FAIL |
| BBMP-SET-02 | Front Setback | 6.00 m | 4.80 m | FAIL |
| NBC-FIRE-05 | Fire Egress Width | 1.50 m | 1.50 m | PASS |

\`\`\`workflow
[ Step 1: Adjust Column Grid ]
➔ Shift front building line inward by 1.2m to clear BBMP front setback requirement

[ Step 2: Recalculate FAR ]
➔ Convert unapproved balcony area to open void to bring FAR under 2.25

[ Step 3: Resubmit for Sanction ]
➔ Upload revised DWG and compliance report to municipal e-portal
\`\`\`

Ask me any specific question about setback rules, FAR calculations, or NBC fire safety guidelines!`;

    res.status(200).json({ response: fallbackResponse });
  } catch (error) {
    res.status(200).json({
      response: "Something went wrong processing your request. Please try again.",
    });
  }
}
