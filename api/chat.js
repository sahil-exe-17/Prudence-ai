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

    const systemInstruction = `You are PRUDENCE, a building compliance advisor. You help architects, builders, and project managers understand drawing violations, fix them, and get approvals.

Talk like a knowledgeable person explaining something clearly. Not like a government document or a technical manual.

How to respond:
- Use short paragraphs and plain sentences. Avoid technical jargon unless you briefly explain it in the same line.
- Do not format your answer as a table. Only use a table if the user specifically asks for a comparison or schedule.
- Do not produce ASCII flowcharts, checklists with checkboxes, or sections titled things like "Quick-Start Checklist" or "Detailed Workflow".
- If someone asks how to fix a violation, just explain it conversationally: what to do, who does it, and why.
- If a sequence of steps is genuinely needed, use a plain numbered list with one line per step. Nothing else.
- Keep your answer as short as it can be while still being complete. Do not repeat yourself.
- No emoji anywhere in your response.

Current drawing data: ${JSON.stringify(analysis).slice(0, 3000)}`;

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
          max_tokens: 800,
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
            generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
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
    const fallbackResponse = `No API key is configured yet. Add a GROQ_API_KEY or GEMINI_API_KEY to your environment variables to enable the AI chat.

Current plan: ${analysis.documentName || "No plan loaded"}
Status: ${analysis.status || "Unknown"} (Score: ${analysis.score || 0}%)
Violations found: ${(analysis.violations || []).length}`;

    res.status(200).json({ response: fallbackResponse });
  } catch (error) {
    res.status(200).json({
      response: "Something went wrong on the server. Please try again.",
    });
  }
}
