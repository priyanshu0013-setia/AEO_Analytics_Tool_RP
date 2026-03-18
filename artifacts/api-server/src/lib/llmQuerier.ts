import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai } from "@workspace/integrations-gemini-ai";

const SYSTEM_PROMPT = `You are a helpful assistant. When answering questions about services, companies, or brands, provide a comprehensive response that includes relevant options and recommendations. Be specific and mention company or brand names when relevant.`;

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;

export interface LlmResult {
  llm: string;
  response: string;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Request timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function isRetryableError(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("overloaded") ||
    msg.includes("service unavailable")
  );
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  llmName: string,
  options: { maxAttempts?: number; initialDelayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = MAX_RETRY_ATTEMPTS, initialDelayMs = INITIAL_DELAY_MS } = options;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryableError(err) || attempt === maxAttempts) {
        throw err;
      }
      const jitter = Math.random() * 500;
      const delay = initialDelayMs * Math.pow(2, attempt - 1) + jitter;
      console.warn(`[${llmName}] Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
  throw new Error(`[${llmName}] All ${maxAttempts} retry attempts exhausted`);
}

async function queryOpenAI(query: string): Promise<LlmResult> {
  if (!openai) {
    return { llm: "openai", response: "", error: "OPENAI_API_KEY is not configured" };
  }
  try {
    const response = await retryWithBackoff(
      () => withTimeout(
        openai.chat.completions.create({
          model: "gpt-5-mini",
          max_completion_tokens: 2048,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query },
          ],
        }),
        REQUEST_TIMEOUT_MS
      ),
      "openai"
    );
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
    const message = await retryWithBackoff(
      () => withTimeout(
        anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: query }],
        }),
        REQUEST_TIMEOUT_MS
      ),
      "claude"
    );
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
    return { llm: "gemini", response: "", error: "GEMINI_API_KEY is not configured or is invalid" };
  }
  try {
    const result = await retryWithBackoff(
      () => withTimeout(
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: query,
          config: {
            systemInstruction: SYSTEM_PROMPT,
          },
        }),
        REQUEST_TIMEOUT_MS
      ),
      "gemini"
    );
    const text = result.text ?? "";
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
