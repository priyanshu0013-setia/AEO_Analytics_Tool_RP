import { ai } from "@workspace/integrations-gemini-ai";

export async function generateQueryVariations(seedQuery: string, count = 7): Promise<string[]> {
  const prompt = `You are an expert at understanding how users search for information using AI assistants like ChatGPT, Claude, and Gemini.

Given the following seed query, generate ${count} distinct variations that someone might ask an AI assistant. 
Make them sound natural, conversational, and varied in phrasing. Return ONLY the queries, one per line, no numbering or bullets.

Seed query: "${seedQuery}"

Generate ${count} variations:`;

  if (!ai) {
    console.error("Query generation failed: GEMINI_API_KEY is not configured");
    return [seedQuery];
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const content = result.response.text();
    const variations = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 5 && !l.startsWith("#"));

    return variations.slice(0, count);
  } catch (err) {
    console.error("Query generation failed:", err);
    return [seedQuery];
  }
}
