import { GoogleGenerativeAI } from "@google/generative-ai";

const rawKey = process.env.GEMINI_API_KEY;

function isValidGeminiKey(key: string | undefined): key is string {
  return typeof key === "string" && key.trim().startsWith("AIza") && key.trim().length > 20;
}

const apiKey = isValidGeminiKey(rawKey) ? rawKey.trim() : undefined;

if (!rawKey) {
  console.warn("GEMINI_API_KEY is not set - Gemini queries will be skipped.");
} else if (!apiKey) {
  console.warn("GEMINI_API_KEY appears to be invalid (should start with 'AIza') - Gemini queries will be skipped.");
}

export const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
