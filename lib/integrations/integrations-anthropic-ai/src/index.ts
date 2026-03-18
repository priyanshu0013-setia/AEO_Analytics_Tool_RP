import Anthropic from "@anthropic-ai/sdk";

const rawKey = process.env.ANTHROPIC_API_KEY;

function isValidAnthropicKey(key: string | undefined): key is string {
  return typeof key === "string" && key.startsWith("sk-ant-") && key.length > 20;
}

const apiKey = rawKey ? (isValidAnthropicKey(rawKey.trim()) ? rawKey.trim() : undefined) : undefined;

if (!rawKey) {
  console.warn("ANTHROPIC_API_KEY is not set - Anthropic queries will be skipped.");
} else if (!apiKey) {
  console.warn("ANTHROPIC_API_KEY appears to be invalid (should start with 'sk-ant-') - Anthropic queries will be skipped.");
}

export const anthropic: Anthropic | null = apiKey ? new Anthropic({ apiKey }) : null;
