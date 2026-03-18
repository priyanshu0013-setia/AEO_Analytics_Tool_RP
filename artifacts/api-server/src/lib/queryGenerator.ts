import { ai } from "@workspace/integrations-gemini-ai";
import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-mini";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const VARIATION_PROMPT = (seedQuery: string, count: number) =>
  `You are an expert at understanding how users search for information using AI assistants like ChatGPT, Claude, and Gemini.

Given the following seed query, generate ${count} distinct variations that someone might ask an AI assistant. 
Make them sound natural, conversational, and varied in phrasing. Return ONLY the queries, one per line, no numbering or bullets.

Seed query: "${seedQuery}"

Generate ${count} variations:`;

function parseVariations(content: string, count: number): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 5 && !l.startsWith("#"))
    .slice(0, count);
}

export async function generateQueryVariations(seedQuery: string, count = 7): Promise<string[]> {
  const prompt = VARIATION_PROMPT(seedQuery, count);

  // Try Gemini first
  if (ai) {
    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      const content = result.text ?? "";
      const variations = parseVariations(content, count);
      if (variations.length > 0) return variations;
    } catch (err) {
      console.error("Query generation via Gemini failed:", err);
    }
  }

  // Fallback to OpenAI
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        max_completion_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      const content = response.choices[0]?.message?.content ?? "";
      const variations = parseVariations(content, count);
      if (variations.length > 0) return variations;
    } catch (err) {
      console.error("Query generation via OpenAI failed:", err);
    }
  }

  // Fallback to Anthropic
  if (anthropic) {
    try {
      const message = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      const block = message.content[0];
      const content = block.type === "text" ? block.text : "";
      const variations = parseVariations(content, count);
      if (variations.length > 0) return variations;
    } catch (err) {
      console.error("Query generation via Anthropic failed:", err);
    }
  }

  // Last resort: return the seed query as-is
  console.error("Query generation failed: no LLM is configured or all failed.");
  return [seedQuery];
}
