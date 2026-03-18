import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn("ANTHROPIC_API_KEY is not set - Anthropic queries will be skipped.");
}

export const anthropic: Anthropic | null = apiKey ? new Anthropic({ apiKey }) : null;
