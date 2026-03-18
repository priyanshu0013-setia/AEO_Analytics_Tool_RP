import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("OPENAI_API_KEY is not set - OpenAI queries will be skipped.");
}

export const openai: OpenAI | null = apiKey ? new OpenAI({ apiKey }) : null;
