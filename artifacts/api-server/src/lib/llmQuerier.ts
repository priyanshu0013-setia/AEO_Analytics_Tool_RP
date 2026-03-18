import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai } from "@workspace/integrations-gemini-ai";

const SYSTEM_PROMPT = `You are a helpful assistant. When answering questions about services, companies, or brands, provide a comprehensive response that includes relevant options and recommendations. Be specific and mention company or brand names when relevant.`;

export interface LlmResult {
  llm: string;
  response: string;
  error?: string;
}

async function queryOpenAI(query: string): Promise<LlmResult> {
  if (!openai) {
    return { llm: "openai", response: "", error: "OPENAI_API_KEY is not configured" };
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
    });
    return { llm: "openai", response: response.choices[0]?.message?.content ?? "" };
  } catch (err) {
    console.error("[openai] Error:", err);
    return { llm: "openai", response: "", error: String(err) };
  }
}

async function queryAnthropic(query: string): Promise<LlmResult> {
  if (!anthropic) {
    return { llm: "claude", response: "", error: "ANTHROPIC_API_KEY is not configured" };
  }
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });
    const block = message.content[0];
    const text = block.type === "text" ? block.text : "";
    return { llm: "claude", response: text };
  } catch (err) {
    console.error("[claude] Error:", err);
    return { llm: "claude", response: "", error: String(err) };
  }
}

async function queryGemini(query: string): Promise<LlmResult> {
  if (!ai) {
    return { llm: "gemini", response: "", error: "GEMINI_API_KEY is not configured" };
  }
  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(SYSTEM_PROMPT + "\n\n" + query);
    const text = result.response.text();
    return { llm: "gemini", response: text };
  } catch (err) {
    console.error("[gemini] Error:", err);
    return { llm: "gemini", response: "", error: String(err) };
  }
}

export async function queryAllLLMs(query: string): Promise<LlmResult[]> {
  const results = await Promise.allSettled([
    queryOpenAI(query),
    queryAnthropic(query),
    queryGemini(query),
  ]);

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { llm: "unknown", response: "", error: String(r.reason) }
  );
}
