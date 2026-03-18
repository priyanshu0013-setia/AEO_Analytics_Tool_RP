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

const RELATED_QUERIES_PROMPT = (seedQuery: string) =>
  `You are an expert in search intent modeling and query expansion.

Your task is to generate high-quality related search queries based on a given seed query.

You are a query expansion engine.

INPUT:
Seed Query: ${seedQuery}

STEP 1: Identify the core domain of the seed query.

STEP 2: Generate related search queries strictly within this domain.

HARD CONSTRAINTS:
* Do NOT include queries from adjacent or different domains
* Do NOT assume any specific industry unless derived from the seed query
* Avoid generic synonyms or repetitive variations

EXPANSION RULES:
Generate queries across:

1. Intent Types:
   * Informational (learn, understand, guides)
   * Commercial (best, top, comparison)
   * Transactional (buy, apply, get, near me)

2. Modifiers (adapt dynamically to the domain):
   * Cost/value (cheap, premium, pricing, rates)
   * Features/attributes (key characteristics relevant to the domain)
   * Audience (user segments relevant to the domain)
   * Use-case (situations where the product/service is used)

3. Query Formats:
   * Short queries
   * Long-tail queries
   * Question-based queries
   * Comparison queries

OUTPUT RULES:
* Generate 20–30 queries
* Ensure diversity across intent and modifiers
* Avoid duplicate meaning queries
* Keep queries realistic and natural

STRICT OUTPUT:
Return ONLY valid JSON in this exact format with no markdown or extra text:

{
  "seed_query": "${seedQuery}",
  "domain": "<identified domain>",
  "related_queries": [
    "<query 1>",
    "<query 2>"
  ]
}`;

export interface RelatedQueriesResult {
  seed_query: string;
  domain: string;
  related_queries: string[];
}

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

function parseRelatedQueriesJson(content: string): RelatedQueriesResult | null {
  try {
    // Strip possible markdown code fences
    const cleaned = content.replace(/```(?:json)?/g, "").trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "seed_query" in parsed &&
      "domain" in parsed &&
      "related_queries" in parsed &&
      Array.isArray((parsed as RelatedQueriesResult).related_queries)
    ) {
      return parsed as RelatedQueriesResult;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

export async function generateRelatedQueries(seedQuery: string): Promise<RelatedQueriesResult> {
  const prompt = RELATED_QUERIES_PROMPT(seedQuery);
  const fallback: RelatedQueriesResult = { seed_query: seedQuery, domain: "unknown", related_queries: [] };

  // Try Gemini first
  if (ai) {
    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      const content = result.text ?? "";
      const parsed = parseRelatedQueriesJson(content);
      if (parsed) return parsed;
    } catch (err) {
      console.error("Related query generation via Gemini failed:", err);
    }
  }

  // Fallback to OpenAI
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        max_completion_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });
      const content = response.choices[0]?.message?.content ?? "";
      const parsed = parseRelatedQueriesJson(content);
      if (parsed) return parsed;
    } catch (err) {
      console.error("Related query generation via OpenAI failed:", err);
    }
  }

  // Fallback to Anthropic
  if (anthropic) {
    try {
      const message = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });
      const block = message.content[0];
      const content = block.type === "text" ? block.text : "";
      const parsed = parseRelatedQueriesJson(content);
      if (parsed) return parsed;
    } catch (err) {
      console.error("Related query generation via Anthropic failed:", err);
    }
  }

  console.error("Related query generation failed: no LLM is configured or all failed.");
  return fallback;
}
