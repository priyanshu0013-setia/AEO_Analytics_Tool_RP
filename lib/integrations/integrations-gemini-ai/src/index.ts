import { GoogleGenerativeAI } from "@google/generative-ai";

const rawKey = process.env.GEMINI_API_KEY;

function isValidGeminiKey(key: string | undefined): key is string {
  return typeof key === "string" && key.startsWith("AIza") && key.length > 20;
}

const apiKey = rawKey ? (isValidGeminiKey(rawKey.trim()) ? rawKey.trim() : undefined) : undefined;

if (!rawKey) {
  console.warn("GEMINI_API_KEY is not set - Gemini queries will be skipped.");
} else if (!apiKey) {
  console.warn("GEMINI_API_KEY appears to be invalid (should start with 'AIza') - Gemini queries will be skipped.");
}

export const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
