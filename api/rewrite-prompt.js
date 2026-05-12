export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  try {
    const { rawPrompt, niche, goal, tone, options } = req.body || {};

    if (!rawPrompt || !niche) {
      return res.status(400).json({
        error: "Missing required fields: rawPrompt and niche."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured on the server."
      });
    }

    const systemPrompt = `
You are PromptPro Assistant, a senior prompt engineer.

Your job is to rewrite rough user prompts into professional, niche-specific prompts that produce consistent, high-quality AI outputs.

Rules:
- Preserve the user's original intent.
- Improve clarity, structure, specificity, and quality.
- Tailor the prompt to the user's niche.
- Add role, context, task, audience, constraints, style direction, output format, and quality checks.
- Avoid vague wording, contradictions, and unsupported claims.
- Make the final prompt ready to paste into ChatGPT, Gemini, Claude, image tools, video tools, or other AI systems.
`;

    const userPrompt = `
NICHE:
${niche}

MAIN GOAL:
${goal || "Rewrite the prompt professionally and make it more consistent."}

TONE:
${tone || "Professional and clear"}

USER OPTIONS:
${JSON.stringify(options || {}, null, 2)}

ROUGH PROMPT:
${rawPrompt}

Return the answer using this structure:

1. Professional Rewritten Prompt
2. Why This Version Is Stronger
3. Missing Details To Ask The User, if any
4. Optional Improved Variations, if useful
`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.45,
            topP: 0.9,
            maxOutputTokens: 1800
          }
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error: data.error?.message || "Gemini API request failed."
      });
    }

    const rewrittenPrompt =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No rewritten prompt was returned.";

    return res.status(200).json({
      rewrittenPrompt
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Something went wrong."
    });
  }
}
