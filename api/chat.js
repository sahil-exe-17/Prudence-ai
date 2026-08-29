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

    const systemInstruction = `You are PRUDENCE AI, an expert architectural and building code compliance assistant. You help users understand building drawings, municipal rules (DCR, NBC 2016, RERA), and violation mitigation steps.

Instructions for formatting your response:
1. Do NOT format every answer as a table. Use natural markdown paragraphs, bullet points, and numbered lists for general explanations, advice, and summaries.
2. Use markdown tables ONLY when presenting structured comparison data, measurement metrics, or multi-column checklists where a table improves clarity.
3. When explaining workflows, approval stages, or process steps, include visual workflow diagrams using ASCII flowcharts (e.g. [ Step 1: Upload Plan ] ➔ [ Step 2: Setback Audit ] ➔ [ Step 3: Approval Certificate ]) or code blocks.
4. Keep answers concise, professional, and directly grounded in the drawing data provided.

Current Drawing Data: ${JSON.stringify(analysis).slice(0, 4000)}`;

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
      const geminiModel = "gemini-3.1-flash-lite";
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

    // Smart Fallback response if API key is not configured or fails
    const fallbackResponse = `### PRUDENCE AI Assistant

I am grounded in your loaded drawing data **"${analysis.documentName || "Current Plan"}"**.

**Key Findings:**
- **Status:** ${analysis.status || "Review Pending"} (Score: ${analysis.score || 0}%)
- **Risk Level:** ${analysis.risk || "Low"}
- **Jurisdiction:** ${analysis.jurisdiction || "BBMP 2026"}

**Active Violations:**
${(analysis.violations || []).map((v) => `- **[${v.severity || "INFO"}] ${v.title}**: ${v.note || `Required: ${v.required}, Found: ${v.found}`}`).join("\n") || "- No major violations detected."}

*Tip: Add your \`GROQ_API_KEY\` or \`GEMINI_API_KEY\` to enable dynamic AI chat!*`;

    res.status(200).json({ response: fallbackResponse });
  } catch (error) {
    res.status(200).json({
      response: "I encountered an error processing your request. Please check server logs.",
    });
  }
}
