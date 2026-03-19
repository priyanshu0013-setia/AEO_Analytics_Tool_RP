import { Router, type IRouter } from "express";
import { db, campaignsTable, llmResponsesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateCampaignBody } from "@workspace/api-zod";
import { generateQueryVariations } from "../lib/queryGenerator.ts";
import { queryAllLLMs } from "../lib/llmQuerier.ts";
import {
  detectBrandMentions,
  extractBrandName,
  extractRankPositions,
} from "../lib/brandDetector.ts";
import {
  calculateAverageRankPosition,
  MISSING_RANK_PENALTY,
} from "../lib/rankCalculator.ts";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const campaigns = await db.select().from(campaignsTable).orderBy(campaignsTable.id);
  res.json(campaigns);
});

router.post("/", async (req, res) => {
  const body = CreateCampaignBody.parse(req.body);
  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      name: body.name,
      targetUrl: body.targetUrl,
      competitorUrls: body.competitorUrls,
      seedQueries: body.seedQueries,
      status: "idle",
    })
    .returning();
  res.status(201).json(campaign);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  return res.json(campaign);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
  res.json({ success: true });
});

router.post("/:id/run", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await db.update(campaignsTable).set({ status: "running" }).where(eq(campaignsTable.id, id));
    await db.delete(llmResponsesTable).where(eq(llmResponsesTable.campaignId, id));

    send({ type: "progress", message: `Starting analysis for campaign: ${campaign.name}` });
    send({ type: "progress", message: `Target: ${campaign.targetUrl}` });
    send({
      type: "progress",
      message: `Competitors: ${(campaign.competitorUrls as string[]).join(", ")}`,
    });
    send({ type: "progress", message: `Seed queries: ${(campaign.seedQueries as string[]).length}` });

    const allQueries: string[] = [];

    for (const seed of campaign.seedQueries as string[]) {
      send({ type: "progress", message: `\nGenerating variations for: "${seed}"` });
      const variations = await generateQueryVariations(seed, 7);
      send({ type: "progress", message: `  Generated ${variations.length} variations` });
      allQueries.push(...variations);
    }

    send({ type: "progress", message: `\nTotal queries to send: ${allQueries.length}` });
    send({ type: "progress", message: `Sending to OpenAI (GPT), Anthropic (Claude), Gemini...\n` });

    let completed = 0;
    const batchSize = 3;
    const BATCH_DELAY_MS = 1500;

    for (let i = 0; i < allQueries.length; i += batchSize) {
      if (i > 0) {
        const jitter = Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS + jitter));
      }
      const batch = allQueries.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (query) => {
          send({ type: "progress", message: `Querying all LLMs: "${query.slice(0, 60)}..."` });
          const results = await queryAllLLMs(query);

          for (const r of results) {
            if (r.error) {
              send({
                type: "progress",
                message: `  [${r.llm}] Error: ${r.error.slice(0, 80)}`,
              });
              continue;
            }
            if (!r.response) continue;

            await db.insert(llmResponsesTable).values({
              campaignId: id,
              llm: r.llm,
              query,
              responseText: r.response,
            });

            const mentions = detectBrandMentions(
              r.response,
              campaign.targetUrl,
              campaign.competitorUrls as string[]
            );
            const mentionedBrands = mentions.map((m) => m.brand).join(", ");
            send({
              type: "progress",
              message: `  [${r.llm}] ✓ Mentions: ${mentionedBrands || "none"}`,
            });
          }

          completed++;
        })
      );
    }

    await db
      .update(campaignsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(campaignsTable.id, id));

    send({ type: "progress", message: `\nAnalysis complete! ${completed} queries processed.` });
    send({ type: "done" });
  } catch (err) {
    console.error("Campaign run error:", err);
    await db
      .update(campaignsTable)
      .set({ status: "failed" })
      .where(eq(campaignsTable.id, id));
    send({ type: "error", message: String(err) });
  }

  res.end();
});

router.get("/:id/results", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const responses = await db
    .select()
    .from(llmResponsesTable)
    .where(eq(llmResponsesTable.campaignId, id));
  res.json(responses);
});

router.get("/:id/report", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });

  const responses = await db
    .select()
    .from(llmResponsesTable)
    .where(eq(llmResponsesTable.campaignId, id));

  if (responses.length === 0) {
    return res.json({
      campaignId: id,
      totalQueries: 0,
      totalResponses: 0,
      brandStats: [],
      llmVisibility: [],
    });
  }

  // Cast responses to a well-typed shape. The underlying DB query returns
  // a structurally-correct array; we just need to help TypeScript when
  // the DB dependency types are not fully resolved in this TS project.
  type LlmResponseRow = { query: string; llm: string; responseText: string; campaignId: number };
  const typedResponses = responses as LlmResponseRow[];

  const targetUrl = campaign.targetUrl;
  const allUrls = [targetUrl, ...(campaign.competitorUrls as string[])];
  const uniqueQueries = new Set(typedResponses.map((r) => r.query));
  const seedQueries = (campaign.seedQueries as string[]) ?? [];

  const brandMentionCounts: Record<string, {
    url: string;
    mentions: number;
    isTarget: boolean;
    // query → best (lowest) rank found across all LLM responses for that query.
    // A rank of null means the brand was mentioned but not inside a ranked list.
    queryRanks: Map<string, number | null>;
  }> = {};
  for (const url of allUrls) {
    const brand = extractBrandName(url);
    brandMentionCounts[brand] = {
      url,
      mentions: 0,
      isTarget: url === targetUrl,
      queryRanks: new Map(),
    };
  }

  const llmStats: Record<string, { targetMentions: number; totalMentions: number; competitors: Record<string, number> }> = {};
  const llms = [...new Set(typedResponses.map((r) => r.llm))];
  for (const llm of llms) {
    llmStats[llm] = { targetMentions: 0, totalMentions: 0, competitors: {} };
  }

  for (const resp of typedResponses) {
    const mentions = detectBrandMentions(resp.responseText, targetUrl, campaign.competitorUrls as string[]);

    for (const mention of mentions) {
      const brand = mention.brand;
      if (!brandMentionCounts[brand]) {
        brandMentionCounts[brand] = {
          url: mention.url,
          mentions: 0,
          isTarget: mention.url === targetUrl,
          queryRanks: new Map(),
        };
      }
      brandMentionCounts[brand].mentions += 1;

      // Collect rank positions from structured lists in this response.
      // If the brand appears in a numbered/bulleted list, we record the
      // position; otherwise we track a null (mentioned, rank unknown).
      const rankPositions = extractRankPositions(resp.responseText, brand);
      const existing = brandMentionCounts[brand].queryRanks.get(resp.query);
      if (rankPositions.length > 0) {
        const bestRank = Math.min(...rankPositions);
        // Keep the best (lowest) rank seen for this query across all LLMs
        brandMentionCounts[brand].queryRanks.set(
          resp.query,
          existing != null ? Math.min(existing, bestRank) : bestRank
        );
      } else if (existing === undefined) {
        // Mentioned but not in a ranked list → mark as present, rank unknown
        brandMentionCounts[brand].queryRanks.set(resp.query, null);
      }

      if (llmStats[resp.llm]) {
        llmStats[resp.llm].totalMentions += 1;
        if (mention.url === targetUrl) {
          llmStats[resp.llm].targetMentions += 1;
        } else {
          llmStats[resp.llm].competitors[brand] = (llmStats[resp.llm].competitors[brand] ?? 0) + 1;
        }
      }
    }
  }

  const totalMentions = Object.values(brandMentionCounts).reduce((s, b) => s + b.mentions, 0);

  const brandStats = Object.entries(brandMentionCounts).map(([brand, data]) => {
    // Build one QueryRankEntry per unique query so the weighted calculator
    // can penalise queries where the brand was absent.
    const queryRankEntries = (Array.from(uniqueQueries) as string[]).map((query) => {
      const rankValue = data.queryRanks.get(query);
      if (rankValue === undefined) {
        // Brand was not found for this query → apply missing-rank penalty
        return { query, rank: null };
      }
      // Brand was mentioned; use the list position if available, otherwise 1
      return { query, rank: rankValue ?? 1 };
    });

    const rankResult = calculateAverageRankPosition(
      queryRankEntries,
      seedQueries,
      MISSING_RANK_PENALTY
    );

    return {
      brand,
      url: data.url,
      mentions: data.mentions,
      totalMentions,
      shareOfVoice: totalMentions > 0 ? Math.round((data.mentions / totalMentions) * 1000) / 10 : 0,
      // avgRankPosition uses the weighted metric for backward-compatibility;
      // null is returned only when no queries were analysed.
      avgRankPosition: uniqueQueries.size > 0 ? rankResult.weighted_average_rank_position : null,
      rankDetails: rankResult,
      isTarget: data.isTarget,
    };
  });

  brandStats.sort((a, b) => b.mentions - a.mentions);

  const llmVisibility = Object.entries(llmStats).map(([llm, data]) => ({
    llm,
    targetMentions: data.targetMentions,
    totalMentions: data.totalMentions,
    shareOfVoice:
      data.totalMentions > 0
        ? Math.round((data.targetMentions / data.totalMentions) * 1000) / 10
        : 0,
    competitorBreakdown: Object.entries(data.competitors).map(([brand, mentions]) => ({
      brand,
      mentions,
    })),
  }));

  return res.json({
    campaignId: id,
    totalQueries: uniqueQueries.size,
    totalResponses: typedResponses.length,
    brandStats,
    llmVisibility,
  });
});

export default router;
