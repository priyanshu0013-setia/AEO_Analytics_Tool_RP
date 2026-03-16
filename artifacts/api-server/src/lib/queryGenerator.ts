import { openai } from "@workspace/integrations-openai-ai-server";

export async function generateQueryVariations(seedQuery: string, count = 7): Promise<string[]> {
  const prompt = `You are an expert at understanding how users search for information using AI assistants like ChatGPT, Claude, and Gemini.

Given the following seed query, generate ${count} distinct variations that someone might ask an AI assistant. 
Make them sound natural, conversational, and varied in phrasing. Return ONLY the queries, one per line, no numbering or bullets.

Seed query: "${seedQuery}"

Generate ${count} variations:`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content ?? "";
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
