import { describe, it, expect } from "vitest";
import {
  MISSING_RANK_PENALTY,
  INTENT_WEIGHTS,
  inferQueryIntent,
  getIntentWeight,
  assignToCluster,
  calculateWeightedAverageRank,
  calculateAverageRankPosition,
  type QueryRankEntry,
} from "./rankCalculator.ts";

// ---------------------------------------------------------------------------
// inferQueryIntent
// ---------------------------------------------------------------------------
describe("inferQueryIntent", () => {
  it("detects transactional queries", () => {
    expect(inferQueryIntent("buy running shoes online")).toBe("transactional");
    expect(inferQueryIntent("how to apply for a loan")).toBe("transactional");
    expect(inferQueryIntent("price of iPhone 15")).toBe("transactional");
  });

  it("detects commercial queries", () => {
    expect(inferQueryIntent("best running shoes for flat feet")).toBe("commercial");
    expect(inferQueryIntent("compare credit cards with cashback")).toBe("commercial");
    expect(inferQueryIntent("top 10 project management tools")).toBe("commercial");
  });

  it("defaults to informational for neutral queries", () => {
    expect(inferQueryIntent("what is machine learning")).toBe("informational");
    expect(inferQueryIntent("history of the Roman Empire")).toBe("informational");
    expect(inferQueryIntent("explain quantum computing")).toBe("informational");
  });
});

// ---------------------------------------------------------------------------
// getIntentWeight
// ---------------------------------------------------------------------------
describe("getIntentWeight", () => {
  it("returns correct weights for each intent", () => {
    expect(getIntentWeight("transactional")).toBe(1.0);
    expect(getIntentWeight("commercial")).toBe(0.7);
    expect(getIntentWeight("informational")).toBe(0.4);
  });

  it("matches the INTENT_WEIGHTS constant", () => {
    expect(getIntentWeight("transactional")).toBe(INTENT_WEIGHTS.transactional);
    expect(getIntentWeight("commercial")).toBe(INTENT_WEIGHTS.commercial);
    expect(getIntentWeight("informational")).toBe(INTENT_WEIGHTS.informational);
  });
});

// ---------------------------------------------------------------------------
// assignToCluster
// ---------------------------------------------------------------------------
describe("assignToCluster", () => {
  it('returns "default" when no seed queries are provided', () => {
    expect(assignToCluster("some query", [])).toBe("default");
  });

  it("assigns to the seed with the most keyword overlap", () => {
    const seeds = ["running shoes review", "best credit cards", "travel insurance"];
    expect(assignToCluster("best running shoes for beginners", seeds)).toBe(
      "running shoes review"
    );
    expect(assignToCluster("cheapest travel insurance plans", seeds)).toBe(
      "travel insurance"
    );
    expect(assignToCluster("top credit cards with no annual fee", seeds)).toBe(
      "best credit cards"
    );
  });

  it("falls back to the first seed when no overlap exists", () => {
    const seeds = ["running shoes", "credit cards"];
    expect(assignToCluster("quantum computing explanation", seeds)).toBe("running shoes");
  });
});

// ---------------------------------------------------------------------------
// calculateWeightedAverageRank
// ---------------------------------------------------------------------------
describe("calculateWeightedAverageRank", () => {
  it("returns missing rank penalty for empty input", () => {
    expect(calculateWeightedAverageRank([])).toBe(MISSING_RANK_PENALTY);
  });

  it("computes weighted average correctly for normal ranked queries", () => {
    // transactional (w=1.0) rank 2, informational (w=0.4) rank 4
    // expected = (2*1.0 + 4*0.4) / (1.0 + 0.4) = (2 + 1.6) / 1.4 = 3.6 / 1.4 ≈ 2.571
    const entries: QueryRankEntry[] = [
      { query: "buy now", rank: 2, intent: "transactional" },
      { query: "what is this", rank: 4, intent: "informational" },
    ];
    const result = calculateWeightedAverageRank(entries);
    expect(result).toBeCloseTo(3.6 / 1.4, 5);
  });

  it("applies missing rank penalty for null ranks", () => {
    const entries: QueryRankEntry[] = [
      { query: "buy now", rank: 1, intent: "transactional" },
      { query: "what is this", rank: null, intent: "informational" },
    ];
    // (1*1.0 + 100*0.4) / (1.0 + 0.4) = 41 / 1.4 ≈ 29.286
    const result = calculateWeightedAverageRank(entries);
    expect(result).toBeCloseTo(41 / 1.4, 5);
  });

  it("applies missing rank penalty for undefined ranks", () => {
    const entries: QueryRankEntry[] = [
      { query: "buy now", intent: "transactional" },  // rank omitted
    ];
    expect(calculateWeightedAverageRank(entries)).toBe(MISSING_RANK_PENALTY);
  });

  it("uses custom missing rank penalty", () => {
    const entries: QueryRankEntry[] = [{ query: "find me", rank: null }];
    expect(calculateWeightedAverageRank(entries, 50)).toBe(50);
  });

  it("uses explicit weight override", () => {
    // Both transactional but one has weight 2 → higher contribution
    const entries: QueryRankEntry[] = [
      { query: "buy now", rank: 2, intent: "transactional", weight: 2 },
      { query: "buy later", rank: 4, intent: "transactional", weight: 1 },
    ];
    // (2*2 + 4*1) / (2+1) = 8/3 ≈ 2.667
    expect(calculateWeightedAverageRank(entries)).toBeCloseTo(8 / 3, 5);
  });

  it("falls back to intent weight when explicit weight is 0 or negative", () => {
    const entries: QueryRankEntry[] = [
      { query: "buy now", rank: 3, intent: "transactional", weight: 0 },
    ];
    // weight 0 is invalid → falls back to transactional=1.0 → result = 3
    expect(calculateWeightedAverageRank(entries)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// calculateAverageRankPosition
// ---------------------------------------------------------------------------
describe("calculateAverageRankPosition", () => {
  it("handles empty input gracefully", () => {
    const result = calculateAverageRankPosition([]);
    expect(result.total_queries).toBe(0);
    expect(result.queries_not_found).toBe(0);
    expect(result.average_rank_position).toBe(MISSING_RANK_PENALTY);
    expect(result.weighted_average_rank_position).toBe(MISSING_RANK_PENALTY);
    expect(result.cluster_average_rank_position).toBe(MISSING_RANK_PENALTY);
    expect(result.clusters).toHaveLength(0);
    expect(result.missing_rank_penalty).toBe(MISSING_RANK_PENALTY);
  });

  it("counts missing ranks correctly", () => {
    const entries: QueryRankEntry[] = [
      { query: "buy shoes", rank: 1 },
      { query: "shoe history", rank: null },
      { query: "shoe history 2", rank: undefined },
    ];
    const result = calculateAverageRankPosition(entries);
    expect(result.total_queries).toBe(3);
    expect(result.queries_not_found).toBe(2);
  });

  it("returns stable results for all-found queries", () => {
    const entries: QueryRankEntry[] = [
      { query: "buy shoes", rank: 1, intent: "transactional" },
      { query: "best shoes", rank: 2, intent: "commercial" },
      { query: "shoe history", rank: 3, intent: "informational" },
    ];
    const result = calculateAverageRankPosition(entries);
    expect(result.queries_not_found).toBe(0);
    expect(result.weighted_average_rank_position).toBeGreaterThan(0);
    expect(result.weighted_average_rank_position).toBeLessThan(MISSING_RANK_PENALTY);
  });

  it("weighted rank is NOT the same as simple average for mixed intents", () => {
    const entries: QueryRankEntry[] = [
      { query: "buy shoes now", rank: 1, intent: "transactional" },  // w=1.0
      { query: "shoe history", rank: 9, intent: "informational" },   // w=0.4
    ];
    const result = calculateAverageRankPosition(entries);
    // Simple avg = (1+9)/2 = 5
    expect(result.average_rank_position).toBe(5);
    // Weighted avg = (1*1.0 + 9*0.4)/(1.0+0.4) = (1+3.6)/1.4 = 4.6/1.4 ≈ 3.286
    expect(result.weighted_average_rank_position).toBeCloseTo(4.6 / 1.4, 1);
    expect(result.weighted_average_rank_position).not.toBe(result.average_rank_position);
  });

  it("groups queries into clusters and returns per-cluster ranks", () => {
    const seedQueries = ["running shoes", "credit cards"];
    const entries: QueryRankEntry[] = [
      { query: "best running shoes", rank: 1 },
      { query: "running shoes for flat feet", rank: 2 },
      { query: "top credit cards", rank: 3 },
    ];
    const result = calculateAverageRankPosition(entries, seedQueries);
    expect(result.clusters).toHaveLength(2);

    const shoeCluster = result.clusters.find((c) =>
      c.cluster_name.includes("running shoes")
    );
    const cardCluster = result.clusters.find((c) =>
      c.cluster_name.includes("credit cards")
    );
    expect(shoeCluster).toBeDefined();
    expect(cardCluster).toBeDefined();
    expect(shoeCluster!.query_count).toBe(2);
    expect(cardCluster!.query_count).toBe(1);
  });

  it("cluster-level metric differs from flat weighted average when clusters are imbalanced", () => {
    // 3 queries in cluster A (all rank 1), 1 query in cluster B (rank 100)
    const seedQueries = ["shoes", "cards"];
    const entries: QueryRankEntry[] = [
      { query: "buy shoes now", rank: 1, cluster: "shoes" },
      { query: "best shoes review", rank: 1, cluster: "shoes" },
      { query: "top shoes list", rank: 1, cluster: "shoes" },
      { query: "credit cards comparison", rank: 100, cluster: "cards" },
    ];
    const result = calculateAverageRankPosition(entries, seedQueries);

    // Flat weighted avg is pulled toward the 3 rank-1 entries
    // Cluster avg = (avg of shoes cluster + avg of cards cluster) / 2
    //             = (1 + 100) / 2 = 50.5
    expect(result.cluster_average_rank_position).toBeGreaterThan(
      result.weighted_average_rank_position
    );
  });

  it("does not inflate score from missing queries", () => {
    const allFound: QueryRankEntry[] = Array.from({ length: 5 }, (_, i) => ({
      query: `query ${i}`,
      rank: 2,
    }));
    const halfMissing: QueryRankEntry[] = Array.from({ length: 5 }, (_, i) => ({
      query: `query ${i}`,
      rank: i < 3 ? 2 : null,
    }));

    const resultAllFound = calculateAverageRankPosition(allFound);
    const resultHalfMissing = calculateAverageRankPosition(halfMissing);

    // Missing queries should increase (worsen) the rank
    expect(resultHalfMissing.weighted_average_rank_position).toBeGreaterThan(
      resultAllFound.weighted_average_rank_position
    );
  });

  it("uses pre-assigned cluster when provided", () => {
    const entries: QueryRankEntry[] = [
      { query: "q1", rank: 2, cluster: "myCluster" },
      { query: "q2", rank: 4, cluster: "myCluster" },
    ];
    const result = calculateAverageRankPosition(entries);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].cluster_name).toBe("myCluster");
  });

  it("handles invalid data without throwing", () => {
    const entries: QueryRankEntry[] = [
      { query: "q1", rank: NaN },
      { query: "q2", rank: -5 },
      { query: "q3", rank: Infinity },
      { query: "q4", rank: 0 },
    ];
    expect(() => calculateAverageRankPosition(entries)).not.toThrow();
    const result = calculateAverageRankPosition(entries);
    // All invalid → all treated as missing
    expect(result.queries_not_found).toBe(4);
    expect(result.weighted_average_rank_position).toBe(MISSING_RANK_PENALTY);
  });

  it("exposes the missing rank penalty used", () => {
    const result = calculateAverageRankPosition([], [], 42);
    expect(result.missing_rank_penalty).toBe(42);
  });

  it("output shape matches expected structure", () => {
    const result = calculateAverageRankPosition([{ query: "q", rank: 3 }]);
    expect(typeof result.average_rank_position).toBe("number");
    expect(typeof result.weighted_average_rank_position).toBe("number");
    expect(typeof result.cluster_average_rank_position).toBe("number");
    expect(typeof result.missing_rank_penalty).toBe("number");
    expect(typeof result.total_queries).toBe("number");
    expect(typeof result.queries_not_found).toBe("number");
    expect(Array.isArray(result.clusters)).toBe(true);
    expect(typeof result.clusters[0].cluster_name).toBe("string");
    expect(typeof result.clusters[0].cluster_rank).toBe("number");
    expect(typeof result.clusters[0].query_count).toBe("number");
  });
});
