const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["PASS", "NEEDS IMPROVEMENT", "FAIL"] },
    overallPreferenceScore: { type: "number", minimum: 1, maximum: 5 },
    summary: { type: "string" },
    personas: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          profile: { type: "string" },
          preferenceScore: { type: "number", minimum: 1, maximum: 5 },
          purchaseIntent: { type: "string" },
          sentiment: { type: "string", enum: ["Positive", "Mixed", "Cautious", "Negative"] },
          rationale: { type: "string" }
        },
        required: ["id", "name", "profile", "preferenceScore", "purchaseIntent", "sentiment", "rationale"]
      }
    },
    strengths: { type: "array", items: { type: "string" } },
    improvementIdeas: { type: "array", items: { type: "string" } },
    researchCaveats: { type: "array", items: { type: "string" } },
    recommendedNextSteps: { type: "array", items: { type: "string" } }
  },
  required: ["verdict", "overallPreferenceScore", "summary", "personas", "strengths", "improvementIdeas", "researchCaveats", "recommendedNextSteps"]
};

export async function analyzeWithAI({ image, product, model }) {
  const mime = image.mimetype;
  const base64 = image.buffer.toString("base64");
  const prompt = `
You are assisting a market-research study, not certifying commercial success.
Study title: Development and Validation of a Multi-Persona AI System for Accurate Consumer Preference Simulation in Market Research.
Prompt version: market-research-v1.0.

Product context:
${JSON.stringify(product, null, 2)}

Generate 4–6 DISTINCT synthetic consumer perspectives. Vary motivations, constraints, prior experience and decision heuristics; do not infer protected traits from the image and do not rely on stereotypes. Use the image only for visible product attributes. Do not invent hidden specifications, safety certifications, customer reviews, sales data or market facts. Explicitly separate visible evidence from assumptions. Persona ratings are simulated opinions on a 1–5 scale, not probabilities and not observations from real consumers. Include uncertainty and limitations in researchCaveats.

Verdict is only a provisional research-screening label:
- PASS: concept appears promising enough for a real-world test based on stated criteria and available context.
- NEEDS IMPROVEMENT: important evidence or design details are missing or mixed.
- FAIL: major stated mismatch or concern appears to warrant redesign before testing.
Do not claim statistical validation or actual market demand. Return JSON matching the requested schema.`;

  const payload = {
    model,
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: prompt },
        { type: "input_image", image_url: `data:${mime};base64,${base64}` }
      ]
    }],
    text: {
      format: {
        type: "json_schema",
        name: "market_research_analysis",
        strict: true,
        schema
      }
    },
    max_output_tokens: 2200
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || `AI provider request failed (${response.status}).`);
  }

  const outputText = (body.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("");

  if (!outputText) throw new Error("The AI provider returned no structured analysis.");
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("The AI provider response could not be parsed as JSON.");
  }

  return {
    ...parsed,
    product: { name: product.name, category: product.category, price: product.price },
    scoreScale: "1–5 synthetic preference score; not a measured probability"
  };
}
