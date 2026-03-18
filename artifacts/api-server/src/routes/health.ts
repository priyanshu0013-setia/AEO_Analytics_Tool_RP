import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/llm", (_req, res) => {
  res.json({
    openai: openai !== null ? "configured" : "not configured",
    anthropic: anthropic !== null ? "configured" : "not configured",
    gemini: ai !== null ? "configured" : "not configured",
  });
});

export default router;
