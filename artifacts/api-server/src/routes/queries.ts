import { Router, type IRouter } from "express";
import { GenerateRelatedQueriesBody } from "@workspace/api-zod";
import { generateRelatedQueries } from "../lib/queryGenerator.ts";

const router: IRouter = Router();

router.post("/related", async (req, res) => {
  try {
    const body = GenerateRelatedQueriesBody.parse(req.body);
    const result = await generateRelatedQueries(body.seedQuery);
    res.json(result);
  } catch (err: any) {
    const status = err?.name === "ZodError" ? 400 : 500;
    res.status(status).json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
