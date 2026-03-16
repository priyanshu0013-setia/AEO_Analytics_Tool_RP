export function extractBrandName(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const hostname = u.hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    return parts[0];
  } catch {
    const clean = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    return clean.split(".")[0];
  }
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
      new RegExp(`\\b${escapeRegex(brand)}\\b`, "gi"),
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
