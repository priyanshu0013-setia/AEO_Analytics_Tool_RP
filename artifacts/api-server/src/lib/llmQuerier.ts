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
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
    });
    return { llm: "openai", response: response.choices[0]?.message?.content ?? "" };
  } catch (err) {
    console.error("OpenAI query failed:", err);
    return { llm: "openai", response: "", error: String(err) };
  }
}

async function queryAnthropic(query: string): Promise<LlmResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
    });
    const block = message.content[0];
    const text = block.type === "text" ? block.text : "";
    return { llm: "claude", response: text };
  } catch (err) {
    console.error("Anthropic query failed:", err);
    return { llm: "claude", response: "", error: String(err) };
  }
}

async function queryGemini(query: string): Promise<LlmResult> {
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + query }] }],
      config: { maxOutputTokens: 2048 },
    });
    return { llm: "gemini", response: result.text ?? "" };
  } catch (err) {
    console.error("Gemini query failed:", err);
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
