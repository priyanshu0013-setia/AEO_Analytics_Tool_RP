import OpenAI from "openai";

const rawKey = process.env.OPENAI_API_KEY;

function isValidOpenAIKey(key: string | undefined): key is string {
  return typeof key === "string" && key.trim().startsWith("sk-") && key.trim().length > 20;
}

const apiKey = isValidOpenAIKey(rawKey) ? rawKey.trim() : undefined;

if (!rawKey) {
  console.warn("OPENAI_API_KEY is not set - OpenAI queries will be skipped.");
} else if (!apiKey) {
  console.warn("OPENAI_API_KEY appears to be invalid (should start with 'sk-') - OpenAI queries will be skipped.");
}

export const openai: OpenAI | null = apiKey ? new OpenAI({ apiKey }) : null;
