// Generic words that are commonly appended to brand names in domain names.
// Sorted by length descending so that the longest (most specific) suffix is
// stripped first and shorter overlapping entries (e.g. "invest" vs
// "investments") are only reached when a longer one doesn't apply.
const GENERIC_DOMAIN_WORDS = [
  "technologies", "consultancy", "infrastructure", "corporation",
  "investments", "investment", "enterprises", "enterprise",
  "properties", "automotive", "healthcare", "industries", "financial",
  "beverages", "logistics", "insurance", "solutions", "advisors",
  "lifestyle", "consulting", "technology", "telecom", "finance",
  "industry", "ventures", "advisory", "property", "services",
  "markets", "trading", "banking", "premium", "realty", "groups",
  "assets", "luxury", "pharma", "retail", "energy", "global",
  "online", "infra", "power", "media", "asset", "foods", "trade",
  "store", "group", "funds", "india", "banks", "shops", "watch",
  "auto", "fund", "shop", "bank", "tech", "food", "corp", "pvt",
  "ltd", "inc", "service", "market", "motors", "capital", "wealth",
  "digital", "fashion", "health", "invest", "advisor", "watches",
  "venture",
].sort((a, b) => b.length - a.length);

export function extractBrandName(url: string): string {
  let domainPart: string;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const hostname = u.hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    domainPart = parts[0];
  } catch {
    const clean = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    domainPart = clean.split(".")[0];
  }

  // Strip one generic suffix so that e.g. "maximawatches" → "maxima"
  // and "adityabirlacapital" → "adityabirla"
  const lower = domainPart.toLowerCase();
  for (const word of GENERIC_DOMAIN_WORDS) {
    if (lower.endsWith(word) && lower.length > word.length) {
      const stripped = lower.slice(0, lower.length - word.length);
      if (stripped.length >= 2) {
        return stripped;
      }
    }
  }

  return domainPart;
}

export function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

export interface BrandMention {
  brand: string;
  url: string;
  positions: number[];
}

// Builds a regex that matches a brand name written either as one word
// or as two adjacent words (e.g. "adityabirla" → also matches "Aditya Birla").
// All valid two-part splits (each part >= 3 chars) are tried as alternatives
// with one or more spaces/hyphens between the parts.  This avoids the
// over-broad per-character approach that could match "a d i t y a b i r l a".
function buildFlexibleBrandPattern(brand: string): RegExp {
  const MIN_PART = 3;
  const alternatives: string[] = [escapeRegex(brand)];

  for (let i = MIN_PART; i <= brand.length - MIN_PART; i++) {
    const left = escapeRegex(brand.slice(0, i));
    const right = escapeRegex(brand.slice(i));
    alternatives.push(`${left}[\\s-]+${right}`);
  }

  return new RegExp(`\\b(?:${alternatives.join("|")})\\b`, "gi");
}

export function detectBrandMentions(
  text: string,
  targetUrl: string,
  competitorUrls: string[]
): BrandMention[] {
  const allUrls = [targetUrl, ...competitorUrls];
  const results: BrandMention[] = [];

  for (const url of allUrls) {
    const brand = extractBrandName(url);
    const domain = extractDomain(url);
    const positions: number[] = [];

    const patterns = [
      // Exact brand name match (case-insensitive), e.g. "maxima"
      new RegExp(`\\b${escapeRegex(brand)}\\b`, "gi"),
      // Flexible match: tries all valid two-part splits of the brand name so
      // "adityabirla" also matches "Aditya Birla" in LLM responses
      buildFlexibleBrandPattern(brand),
      // Full domain match, e.g. "maximawatches.com"
      new RegExp(`\\b${escapeRegex(domain)}\\b`, "gi"),
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        if (!positions.includes(match.index)) {
          positions.push(match.index);
        }
      }
    }

    if (positions.length > 0) {
      results.push({ brand, url, positions: positions.sort((a, b) => a - b) });
    }
  }

  return results;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractRankPositions(text: string, brandName: string): number[] {
  const ranks: number[] = [];
  const lines = text.split("\n");
  const bulletRegex = /^(\s*[\d]+[.)]\s*|\s*[-•*]\s*)/;

  lines.forEach((line, lineIndex) => {
    const isBullet = bulletRegex.test(line);
    if (!isBullet) return;

    const rankMatch = line.match(/^[\s]*(\d+)[.)]/);
    const rank = rankMatch ? parseInt(rankMatch[1], 10) : lineIndex + 1;

    if (new RegExp(`\\b${escapeRegex(brandName)}\\b`, "i").test(line)) {
      ranks.push(rank);
    }
  });

  return ranks;
}
