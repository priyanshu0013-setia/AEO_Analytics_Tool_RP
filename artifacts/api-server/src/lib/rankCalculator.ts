/**
 * AEO Average Rank Position Calculator
 *
 * Traditional SEO metrics like a simple arithmetic mean are NOT suitable for
 * Answer Engine Optimization (AEO).  A flat average:
 *  - inflates scores when high-priority (transactional) queries are mixed with
 *    low-priority (informational) ones at equal weight
 *  - silently ignores queries where the brand is absent, making the metric
 *    appear better than reality
 *  - mixes semantically unrelated queries, losing cluster-level insights
 *
 * This module replaces that approach with a weighted, cluster-aware model:
 *  1. Each query receives a numeric rank; absent brand → MISSING_RANK_PENALTY.
 *  2. Ranks are weighted by query intent (transactional > commercial > informational).
 *  3. Related queries are grouped into clusters; the final metric is derived
 *     from per-cluster weighted averages so that over-represented clusters
 *     don't dominate the overall score.
 */

/** Penalty rank assigned to any query where the brand was not found. */
export const MISSING_RANK_PENALTY = 100;

/** Query intent categories used to weight rank contributions. */
export type QueryIntent = "transactional" | "commercial" | "informational";

/**
 * Intent weights reflect business value:
 *  - transactional = 1.0  (user is ready to act; highest signal)
 *  - commercial   = 0.7  (user is comparing; strong signal)
 *  - informational = 0.4  (user is learning; weaker signal)
 */
export const INTENT_WEIGHTS: Record<QueryIntent, number> = {
  transactional: 1.0,
  commercial: 0.7,
  informational: 0.4,
};

/** A single query's rank data to feed into the calculator. */
export interface QueryRankEntry {
  /** The query text (used for intent inference and cluster assignment). */
  query: string;
  /**
   * Numeric rank position for the brand in the LLM response.
   * null / undefined → brand not found; MISSING_RANK_PENALTY will be used.
   * Position 1 = first item / only mention.
   */
  rank?: number | null;
  /** Pre-determined intent; if omitted it is inferred from the query text. */
  intent?: QueryIntent;
  /**
   * Optional explicit weight override (e.g. search volume, business priority).
   * Falls back to the intent-based weight when absent.
   */
  weight?: number;
  /** Cluster name; if omitted the calculator assigns one from seedQueries. */
  cluster?: string;
}

/** Per-cluster aggregated rank result. */
export interface ClusterRankResult {
  cluster_name: string;
  /** Weighted average rank across all queries in this cluster. */
  cluster_rank: number;
  query_count: number;
}

/** Full output of the rank position calculator. */
export interface RankPositionResult {
  /** Simple arithmetic mean (retained for backward-compatibility). */
  average_rank_position: number;
  /**
   * Primary metric: weighted average using intent weights.
   * Lower is better (position 1 = best).
   */
  weighted_average_rank_position: number;
  /**
   * Cluster-level metric: average of per-cluster weighted ranks.
   * Prevents over-represented clusters from dominating the score.
   */
  cluster_average_rank_position: number;
  /** The missing-rank penalty that was applied. */
  missing_rank_penalty: number;
  /** Total number of query entries provided. */
  total_queries: number;
  /** Number of queries where the brand was not found (received penalty rank). */
  queries_not_found: number;
  /** Per-cluster breakdown. */
  clusters: ClusterRankResult[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Keyword sets that indicate each intent tier. */
const TRANSACTIONAL_SIGNALS =
  /\b(buy|purchase|order|get|apply|sign up|register|near me|price|cost|fee|download|install|subscribe|hire|book|schedule|enroll|join|open account)\b/i;

const COMMERCIAL_SIGNALS =
  /\b(best|top|compare|vs\.?|versus|review|recommend|alternative|which|should i|options|list|ranking|rated|worth it|pros and cons)\b/i;

/**
 * Infers the query intent from its text.
 * The order of checks matters: transactional signals take precedence over
 * commercial, which take precedence over informational.
 */
export function inferQueryIntent(query: string): QueryIntent {
  if (TRANSACTIONAL_SIGNALS.test(query)) return "transactional";
  if (COMMERCIAL_SIGNALS.test(query)) return "commercial";
  return "informational";
}

/** Returns the intent weight for a given intent label. */
export function getIntentWeight(intent: QueryIntent): number {
  return INTENT_WEIGHTS[intent];
}

/**
 * Assigns a query to the most relevant seed-query cluster by counting shared
 * words (≥ 3 characters) between the query and each seed.
 * Falls back to the first seed when no overlap exists.
 */
export function assignToCluster(query: string, seedQueries: string[]): string {
  if (seedQueries.length === 0) return "default";

  // Tokenise the query once, outside the seed loop.
  const queryWords = new Set(
    query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3)
  );

  let bestCluster = seedQueries[0];
  let bestScore = -1;

  for (const seed of seedQueries) {
    // Tokenise the seed with the same logic.
    const seedWords = seed.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
    let score = 0;
    for (const word of seedWords) {
      if (queryWords.has(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCluster = seed;
    }
  }

  return bestCluster;
}

// ---------------------------------------------------------------------------
// Core calculation functions
// ---------------------------------------------------------------------------

/**
 * Computes the weighted average rank from a list of resolved rank entries.
 *
 * Formula:
 *   weighted_average_rank = Σ(rank_i × weight_i) / Σ(weight_i)
 *
 * Guards:
 *  - Invalid or missing ranks are replaced by missingRankPenalty before calling.
 *  - Zero or negative weights default to 1 to avoid division-by-zero.
 *  - Returns missingRankPenalty when the list is empty.
 */
export function calculateWeightedAverageRank(
  entries: QueryRankEntry[],
  missingRankPenalty = MISSING_RANK_PENALTY
): number {
  if (entries.length === 0) return missingRankPenalty;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const entry of entries) {
    // Treat null / undefined / non-positive / NaN ranks as missing
    const rank =
      entry.rank != null && Number.isFinite(entry.rank) && entry.rank > 0
        ? entry.rank
        : missingRankPenalty;

    const intent = entry.intent ?? inferQueryIntent(entry.query);
    // Use explicit weight if valid, otherwise fall back to intent weight
    const weight =
      entry.weight != null && Number.isFinite(entry.weight) && entry.weight > 0
        ? entry.weight
        : getIntentWeight(intent);

    weightedSum += rank * weight;
    totalWeight += weight;
  }

  // Prevent division by zero (shouldn't happen given defaults, but be safe)
  if (totalWeight === 0) return missingRankPenalty;
  return weightedSum / totalWeight;
}

/**
 * Main entry point.
 *
 * Computes the full AEO rank position result for a brand across a set of
 * queries:
 *
 *  1. Each query entry with a missing/invalid rank receives the penalty rank.
 *  2. Entries are assigned to clusters (based on seedQueries or entry.cluster).
 *  3. A weighted average is computed per cluster.
 *  4. The cluster-level metric averages the per-cluster ranks (equal cluster weight)
 *     so that no single over-represented cluster dominates the final score.
 *
 * @param entries          Query rank entries collected from LLM responses.
 * @param seedQueries      Seed queries used as cluster centroids.
 * @param missingRankPenalty  Rank assigned to queries where the brand was absent.
 */
export function calculateAverageRankPosition(
  entries: QueryRankEntry[],
  seedQueries: string[] = [],
  missingRankPenalty = MISSING_RANK_PENALTY
): RankPositionResult {
  if (entries.length === 0) {
    return {
      average_rank_position: missingRankPenalty,
      weighted_average_rank_position: missingRankPenalty,
      cluster_average_rank_position: missingRankPenalty,
      missing_rank_penalty: missingRankPenalty,
      total_queries: 0,
      queries_not_found: 0,
      clusters: [],
    };
  }

  // Resolve each entry: fill in intent, cluster, and effective rank
  const resolved = entries.map((e) => {
    const intent = e.intent ?? inferQueryIntent(e.query);
    const cluster =
      e.cluster ?? assignToCluster(e.query, seedQueries);
    const effectiveRank =
      e.rank != null && Number.isFinite(e.rank) && e.rank > 0
        ? e.rank
        : missingRankPenalty;
    return { ...e, intent, cluster, effectiveRank };
  });

  const queriesNotFound = resolved.filter(
    (e) => e.effectiveRank >= missingRankPenalty
  ).length;

  // --- Simple average (backward-compatible metric) ---
  const simpleSum = resolved.reduce((s, e) => s + e.effectiveRank, 0);
  const simpleAvg = simpleSum / resolved.length;

  // --- Weighted average across all queries ---
  const weightedAvg = calculateWeightedAverageRank(
    resolved.map((e) => ({ ...e, rank: e.effectiveRank })),
    missingRankPenalty
  );

  // --- Cluster-level aggregation ---
  const clusterMap = new Map<string, typeof resolved>();
  for (const e of resolved) {
    const list = clusterMap.get(e.cluster) ?? [];
    list.push(e);
    clusterMap.set(e.cluster, list);
  }

  const clusterResults: ClusterRankResult[] = [];
  for (const [name, clusterEntries] of clusterMap) {
    const clusterRank = calculateWeightedAverageRank(
      clusterEntries.map((e) => ({ ...e, rank: e.effectiveRank })),
      missingRankPenalty
    );
    clusterResults.push({
      cluster_name: name,
      cluster_rank: Math.round(clusterRank * 10) / 10,
      query_count: clusterEntries.length,
    });
  }

  // Average the per-cluster scores (equal weight per cluster) so that clusters
  // with many queries don't inflate the overall metric
  const clusterAvgRank =
    clusterResults.length > 0
      ? clusterResults.reduce((s, c) => s + c.cluster_rank, 0) /
        clusterResults.length
      : missingRankPenalty;

  return {
    average_rank_position: Math.round(simpleAvg * 10) / 10,
    weighted_average_rank_position: Math.round(weightedAvg * 10) / 10,
    cluster_average_rank_position: Math.round(clusterAvgRank * 10) / 10,
    missing_rank_penalty: missingRankPenalty,
    total_queries: entries.length,
    queries_not_found: queriesNotFound,
    clusters: clusterResults,
  };
}
