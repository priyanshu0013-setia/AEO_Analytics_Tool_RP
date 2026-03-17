import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set - Gemini queries will be skipped.");
}

export const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
