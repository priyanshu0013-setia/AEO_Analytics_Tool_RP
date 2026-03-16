import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error(
    "ANTHROPIC_API_KEY must be set (Render env var).",
  );
}

export const anthropic = new Anthropic({ apiKey });
