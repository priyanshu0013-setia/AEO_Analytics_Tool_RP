import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY must be set (Render env var).",
  );
}

// Matches usage in api-server: ai.models.generateContent(...)
export const ai = new GoogleGenAI({ apiKey });
