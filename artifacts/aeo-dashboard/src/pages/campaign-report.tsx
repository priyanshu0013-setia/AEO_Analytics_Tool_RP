import { useRoute, Link } from "wouter";
import { useGetCampaignReport, useGetCampaign } from "@workspace/api-client-react";
import { PageHeader, Card, Spinner, Badge } from "@/components/ui-components";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Trophy, BrainCircuit, ArrowLeft,
  Target, Award, TrendingUp, Hash, Cpu, Download
} from "lucide-react";

const BRAND_COLORS = ["#10b981", "#6366f1", "#f43f5e", "#f59e0b", "#8b5cf6", "#06b6d4"];
const LLM_LABELS: Record<string, string> = {
  openai: "OpenAI GPT",
  claude: "Anthropic Claude",
  gemini: "Google Gemini",
};

function pct(v: number) {
  return `${v.toFixed(1)}%`;
}

function downloadReport(campaign: { name: string; targetUrl: string }, report: {
  totalResponses: number;
  totalQueries: number;
  brandStats: Array<{ brand: string; url: string; isTarget: boolean; mentions: number; shareOfVoice: number; avgRankPosition: number | null }>;
  llmVisibility: Array<{ llm: string; targetMentions: number; totalMentions: number; competitorBreakdown: Array<{ brand: string; mentions: number }> }>;
}) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const slug = campaign.name.replace(/\s+/g, "-").toLowerCase();
  const COLORS = ["#10b981", "#6366f1", "#f43f5e", "#f59e0b", "#8b5cf6", "#06b6d4"];
  const targetStat = report.brandStats.find((s) => s.isTarget);
  const maxMentions = Math.max(...report.brandStats.map((s) => s.mentions), 1);
  const totalAllMentions = report.brandStats.reduce((sum, s) => sum + s.mentions, 0);

  const brandRows = report.brandStats.map((s, idx) => {
    const color = s.isTarget ? COLORS[0] : COLORS[(idx % (COLORS.length - 1)) + 1];
    const barW = Math.round((s.mentions / maxMentions) * 100);
    const badge = s.isTarget
      ? `<span style="background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;">Target</span>`
      : `<span style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;">Competitor</span>`;
    return `
      <tr style="border-bottom:1px solid #f1f5f9;${s.isTarget ? "background:#f0fdf4;" : ""}">
        <td style="padding:14px 20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:4px;height:36px;border-radius:4px;background:${color};flex-shrink:0;"></div>
            <div>
              <div style="font-weight:700;color:#0f172a;font-size:14px;">${s.brand}</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${s.url}</div>
            </div>
          </div>
        </td>
        <td style="padding:14px 20px;text-align:center;">${badge}</td>
        <td style="padding:14px 20px;text-align:right;">
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            <span style="font-weight:700;color:#0f172a;">${s.mentions}</span>
            <div style="width:80px;height:5px;background:#f1f5f9;border-radius:999px;overflow:hidden;">
              <div style="height:100%;width:${barW}%;background:${color};border-radius:999px;"></div>
            </div>
          </div>
        </td>
        <td style="padding:14px 20px;text-align:right;font-weight:700;font-size:15px;color:${color};">${s.shareOfVoice.toFixed(1)}%</td>
        <td style="padding:14px 20px;text-align:right;font-weight:600;color:#64748b;">${s.avgRankPosition != null ? `#${s.avgRankPosition.toFixed(1)}` : "—"}</td>
      </tr>`;
  }).join("");

  const llmRows = report.llmVisibility.map((llm) => {
    const label = LLM_LABELS[llm.llm] ?? llm.llm;
    const sovPct = llm.totalMentions > 0 ? (llm.targetMentions / llm.totalMentions) * 100 : 0;
    const compCells = llm.competitorBreakdown.map((c, ci) => {
      const color = COLORS[(ci % (COLORS.length - 1)) + 1];
      const cSov = llm.totalMentions > 0 ? (c.mentions / llm.totalMentions) * 100 : 0;
      return `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
        <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#64748b;">
          <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>${c.brand}
        </span>
        <span style="font-size:12px;font-weight:600;color:#64748b;">${c.mentions} &nbsp;·&nbsp; ${cSov.toFixed(1)}%</span>
      </div>`;
    }).join("");
    const barW = Math.round(sovPct);
    return `
      <div style="border:1px solid #e2e8f0;border-radius:14px;padding:20px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="font-weight:700;color:#0f172a;font-size:14px;">${label}</span>
          <span style="font-size:12px;font-weight:600;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;padding:3px 10px;border-radius:999px;">${llm.totalMentions} total mentions</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#065f46;">
            <span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;"></span>
            ${campaign.targetUrl} <span style="font-weight:400;color:#94a3b8;">(target)</span>
          </span>
          <span style="font-size:13px;font-weight:700;color:#10b981;">${llm.targetMentions} &nbsp;·&nbsp; ${sovPct.toFixed(1)}%</span>
        </div>
        ${compCells}
        <div style="margin-top:10px;height:6px;background:#f1f5f9;border-radius:999px;overflow:hidden;display:flex;">
          <div style="height:100%;width:${barW}%;background:#10b981;"></div>
        </div>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AEO Report — ${campaign.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print {
    body { background: #fff; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>

<!-- PRINT BUTTON -->
<div class="no-print" style="position:fixed;top:20px;right:20px;z-index:999;">
  <button onclick="window.print()" style="background:#4f46e5;color:#fff;border:none;padding:10px 20px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 16px rgba(79,70,229,.35);">
    🖨 Print / Save as PDF
  </button>
</div>

<!-- COVER HEADER -->
<div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%);padding:56px 60px 48px;color:#fff;">
  <div style="max-width:960px;margin:0 auto;">
    <div style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#a5b4fc;margin-bottom:16px;">AEO Scope · Answer Engine Optimization Report</div>
    <h1 style="font-size:38px;font-weight:900;letter-spacing:-.02em;line-height:1.1;margin-bottom:12px;">${campaign.name}</h1>
    <p style="font-size:16px;color:#c7d2fe;margin-bottom:32px;">Brand visibility across OpenAI GPT, Anthropic Claude, and Google Gemini</p>
    <div style="display:flex;gap:32px;flex-wrap:wrap;">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#818cf8;margin-bottom:4px;">Target Domain</div>
        <div style="font-size:17px;font-weight:700;color:#e0e7ff;">${campaign.targetUrl}</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#818cf8;margin-bottom:4px;">Report Date</div>
        <div style="font-size:17px;font-weight:700;color:#e0e7ff;">${date}</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#818cf8;margin-bottom:4px;">LLMs Tested</div>
        <div style="font-size:17px;font-weight:700;color:#e0e7ff;">GPT · Claude · Gemini</div>
      </div>
    </div>
  </div>
</div>

<!-- SUMMARY STATS -->
<div style="max-width:960px;margin:0 auto;padding:40px 60px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:20px;">Executive Summary</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
    <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);border-radius:16px;padding:24px;color:#fff;box-shadow:0 8px 24px rgba(79,70,229,.3);">
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#c7d2fe;margin-bottom:8px;">Total Responses</div>
      <div style="font-size:40px;font-weight:900;line-height:1;">${report.totalResponses}</div>
      <div style="font-size:12px;color:#a5b4fc;margin-top:6px;">${report.totalQueries} unique queries</div>
    </div>
    <div style="background:linear-gradient(135deg,#059669,#10b981);border-radius:16px;padding:24px;color:#fff;box-shadow:0 8px 24px rgba(16,185,129,.3);">
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#a7f3d0;margin-bottom:8px;">Target Share of Voice</div>
      <div style="font-size:40px;font-weight:900;line-height:1;">${targetStat ? targetStat.shareOfVoice.toFixed(1) : "0.0"}%</div>
      <div style="font-size:12px;color:#6ee7b7;margin-top:6px;">${targetStat?.mentions ?? 0} mentions detected</div>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 4px 16px rgba(0,0,0,.06);">
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Total Brand Mentions</div>
      <div style="font-size:40px;font-weight:900;color:#0f172a;line-height:1;">${totalAllMentions}</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:6px;">across all brands &amp; models</div>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 4px 16px rgba(0,0,0,.06);">
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">Target Avg Rank</div>
      <div style="font-size:40px;font-weight:900;color:#0f172a;line-height:1;">${targetStat?.avgRankPosition != null ? `#${targetStat.avgRankPosition.toFixed(1)}` : "N/A"}</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:6px;">position in AI-generated lists</div>
    </div>
  </div>
</div>

<!-- BRAND SHARE OF VOICE TABLE -->
<div style="max-width:960px;margin:0 auto;padding:40px 60px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:20px;">Brand Share of Voice</div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06);">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <th style="padding:14px 20px;text-align:left;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">Brand</th>
          <th style="padding:14px 20px;text-align:center;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">Role</th>
          <th style="padding:14px 20px;text-align:right;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">Mentions</th>
          <th style="padding:14px 20px;text-align:right;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">Share of Voice</th>
          <th style="padding:14px 20px;text-align:right;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">Avg Rank</th>
        </tr>
      </thead>
      <tbody>${brandRows}</tbody>
    </table>
  </div>
</div>

<!-- VISIBILITY BY LLM -->
<div style="max-width:960px;margin:0 auto;padding:40px 60px 0;">
  <div style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:20px;">Visibility by AI Model</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
    ${llmRows}
  </div>
</div>

<!-- METHODOLOGY -->
<div style="max-width:960px;margin:0 auto;padding:40px 60px 48px;">
  <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0;border-radius:16px;padding:28px 32px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:14px;">Methodology</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div>
        <div style="font-weight:700;color:#0f172a;margin-bottom:6px;font-size:14px;">How brand detection works</div>
        <div style="font-size:13px;color:#64748b;line-height:1.6;">Each seed query is expanded into multiple variations using GPT. All variations are sent in parallel to OpenAI GPT, Anthropic Claude, and Google Gemini. Responses are scanned for domain and brand name mentions using substring matching.</div>
      </div>
      <div>
        <div style="font-weight:700;color:#0f172a;margin-bottom:6px;font-size:14px;">How Share of Voice is calculated</div>
        <div style="font-size:13px;color:#64748b;line-height:1.6;">Share of Voice = brand mentions ÷ total mentions across all brands. Rank Position is extracted from numbered and bulleted lists — a brand ranked #1 means it appeared first in the AI's list.</div>
      </div>
    </div>
  </div>
  <div style="text-align:center;margin-top:32px;font-size:12px;color:#cbd5e1;">Generated by AEO Scope · ${date}</div>
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aeo-report-${slug}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CampaignReport() {
  const [, params] = useRoute("/campaigns/:id/report");
  const id = Number(params?.id);

  const { data: campaign, isLoading: isLoadingCamp } = useGetCampaign(id);
  const { data: report, isLoading: isLoadingRep } = useGetCampaignReport(id);

  if (isLoadingCamp || isLoadingRep) return <Spinner />;
  if (!campaign || !report) return <div className="p-8 text-slate-500">Data not found.</div>;

  const targetStat = report.brandStats.find((s) => s.isTarget);
  const competitors = report.brandStats.filter((s) => !s.isTarget);
  const topCompetitor = [...competitors].sort((a, b) => b.mentions - a.mentions)[0];
  const hasData = report.totalResponses > 0;
  const hasMentions = report.brandStats.some((s) => s.mentions > 0);

  // ── Share of Voice pie data ───────────────────────────────────────────────
  const pieData = report.brandStats.map((stat, idx) => ({
    name: stat.brand,
    value: stat.mentions,
    color: stat.isTarget ? BRAND_COLORS[0] : BRAND_COLORS[(idx % (BRAND_COLORS.length - 1)) + 1],
  }));

  // ── Visibility by LLM bar data ────────────────────────────────────────────
  const competitorKeys = Array.from(
    new Set(report.llmVisibility.flatMap((l) => l.competitorBreakdown.map((c) => c.brand)))
  );
  const barData = report.llmVisibility.map((llm) => {
    const obj: Record<string, string | number> = {
      name: LLM_LABELS[llm.llm] ?? llm.llm,
      Target: llm.targetMentions,
    };
    llm.competitorBreakdown.forEach((c) => { obj[c.brand] = c.mentions; });
    return obj;
  });

  // ── Avg rank bar data ─────────────────────────────────────────────────────
  const rankData = report.brandStats
    .filter((s) => s.avgRankPosition != null)
    .map((s, idx) => ({
      name: s.brand,
      rank: s.avgRankPosition as number,
      fill: s.isTarget ? BRAND_COLORS[0] : BRAND_COLORS[(idx % (BRAND_COLORS.length - 1)) + 1],
    }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-16 space-y-8">

      {/* Back nav */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      {/* Header */}
      <PageHeader
        title={`${campaign.name} — AEO Report`}
        description="Brand visibility across OpenAI GPT, Anthropic Claude, and Google Gemini."
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadReport(campaign, report)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-indigo-600/25 transition-all"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Target</div>
            <div className="font-bold text-emerald-600 flex items-center gap-1.5 justify-end">
              <Target className="w-4 h-4" />
              {campaign.targetUrl}
            </div>
          </div>
        </div>
      </PageHeader>

      {/* ── Section 1: Summary Stats ──────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-none shadow-lg shadow-indigo-600/20">
            <BrainCircuit className="w-7 h-7 text-indigo-300 mb-3" />
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Total Responses</p>
            <p className="text-3xl font-bold">{report.totalResponses}</p>
            <p className="text-indigo-200 text-xs mt-1">{report.totalQueries} unique queries</p>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg shadow-emerald-500/20">
            <Trophy className="w-7 h-7 text-emerald-200 mb-3" />
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Target Share of Voice</p>
            <p className="text-3xl font-bold">{targetStat ? pct(targetStat.shareOfVoice) : "0%"}</p>
            <p className="text-emerald-100 text-xs mt-1">{targetStat?.mentions ?? 0} mentions</p>
          </Card>

          <Card className="p-5">
            <Award className="w-7 h-7 text-amber-500 mb-3" />
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Top Competitor</p>
            <p className="text-2xl font-bold text-slate-900 truncate">
              {topCompetitor ? topCompetitor.brand : "—"}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {topCompetitor ? `${pct(topCompetitor.shareOfVoice)} share of voice` : "No mentions found"}
            </p>
          </Card>

          <Card className="p-5">
            <Hash className="w-7 h-7 text-violet-500 mb-3" />
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Target Avg Rank</p>
            <p className="text-3xl font-bold text-slate-900">
              {targetStat?.avgRankPosition != null ? `#${targetStat.avgRankPosition.toFixed(1)}` : "N/A"}
            </p>
            <p className="text-slate-500 text-xs mt-1">Position in ranked lists</p>
          </Card>
        </div>
      </section>

      {/* ── Zero-state notice ─────────────────────────────────────────────── */}
      {hasData && !hasMentions && (
        <Card className="p-6 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">No brand mentions detected</p>
              <p className="text-sm text-amber-700 mt-1">
                The AI models answered your queries without naming these specific brands. This is a common AEO finding — it means the brands have low AI visibility for these queries. Try adding more specific queries (e.g. "Is Crimson Education good?") or branded queries to detect mentions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Section 2: Share of Voice ─────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
          Share of Voice — Brand Mentions / Total Mentions
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Donut chart */}
          <Card className="p-6 lg:col-span-2 flex flex-col items-center">
            <h3 className="text-base font-bold text-slate-800 w-full mb-2">Mentions Distribution</h3>
            <p className="text-xs text-slate-400 w-full mb-4">Share of every brand mention across all LLM responses</p>
            {hasMentions ? (
              <>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={65} outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, name: string) => [`${v} mention${v !== 1 ? "s" : ""}`, name]}
                        contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2 w-full">
                  {pieData.map((e) => (
                    <div key={e.name} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                      {e.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No mentions yet</div>
            )}
          </Card>

          {/* Brand table */}
          <Card className="lg:col-span-3 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-800">Brand Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-3 text-left">Brand</th>
                  <th className="px-6 py-3 text-right">Mentions</th>
                  <th className="px-6 py-3 text-right">Share of Voice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {report.brandStats.map((stat, idx) => {
                  const color = stat.isTarget ? BRAND_COLORS[0] : BRAND_COLORS[(idx % (BRAND_COLORS.length - 1)) + 1];
                  const maxMentions = Math.max(...report.brandStats.map((s) => s.mentions), 1);
                  return (
                    <tr key={idx} className={cn("hover:bg-slate-50/60 transition-colors", stat.isTarget && "bg-emerald-50/40")}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-6 rounded-full shrink-0" style={{ background: color }} />
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              {stat.brand}
                              {stat.isTarget && <Badge variant="success">Target</Badge>}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{stat.url}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-slate-800">{stat.mentions}</span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(stat.mentions / maxMentions) * 100}%`, background: color }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold" style={{ color }}>
                        {pct(stat.shareOfVoice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </section>

      {/* ── Section 3: Average Rank Position ─────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
          Average Rank Position — Position in AI-Generated Lists
        </h2>
        <Card className="p-6">
          {rankData.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 13, fontWeight: 600 }} dy={8} />
                  <YAxis
                    reversed
                    axisLine={false} tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    label={{ value: "Rank (lower = better)", angle: -90, position: "insideLeft", offset: 10, style: { fill: "#94a3b8", fontSize: 11 } }}
                    domain={[1, "auto"]}
                  />
                  <Tooltip
                    formatter={(v: number) => [`#${v.toFixed(1)}`, "Avg Rank Position"]}
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                  />
                  <Bar dataKey="rank" maxBarSize={60} radius={[6, 6, 0, 0]}>
                    {rankData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Hash className="w-8 h-8 mb-3 opacity-40" />
              <p className="text-sm font-medium">No ranked list positions detected</p>
              <p className="text-xs text-slate-400 mt-1">Rank data is extracted when AI models produce numbered lists</p>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-4">
            Lower rank = better. Position #1 means the brand was listed first. Only responses containing ordered lists are counted.
          </p>
        </Card>
      </section>

      {/* ── Section 4: Visibility by LLM ──────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
          Visibility by LLM — Per-Model Brand Mentions
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grouped bar chart */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-slate-800 mb-1">Mentions per Model</h3>
            <p className="text-xs text-slate-400 mb-5">How many times each brand was mentioned by each AI</p>
            {barData.length > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                    <Bar dataKey="Target" fill={BRAND_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    {competitorKeys.map((key, idx) => (
                      <Bar key={key} dataKey={key} fill={BRAND_COLORS[(idx % (BRAND_COLORS.length - 1)) + 1]} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-slate-400 text-sm">No data</div>
            )}
          </Card>

          {/* Per-LLM cards */}
          <div className="space-y-4">
            {report.llmVisibility.map((llm, idx) => {
              const label = LLM_LABELS[llm.llm] ?? llm.llm;
              const sovPct = llm.totalMentions > 0
                ? (llm.targetMentions / llm.totalMentions) * 100
                : 0;
              return (
                <Card key={idx} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800 text-sm">{label}</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {llm.totalMentions} total mention{llm.totalMentions !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Target vs competitors */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-medium text-slate-700">
                          {campaign.targetUrl} <span className="text-slate-400">(target)</span>
                        </span>
                      </span>
                      <span className="font-bold text-emerald-600">
                        {llm.targetMentions} — {pct(sovPct)} SoV
                      </span>
                    </div>
                    {llm.competitorBreakdown.map((comp, ci) => {
                      const compColor = BRAND_COLORS[(ci % (BRAND_COLORS.length - 1)) + 1];
                      const compSov = llm.totalMentions > 0 ? (comp.mentions / llm.totalMentions) * 100 : 0;
                      return (
                        <div key={ci} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: compColor }} />
                            <span className="font-medium text-slate-600">{comp.brand}</span>
                          </span>
                          <span className="font-semibold text-slate-500">
                            {comp.mentions} — {pct(compSov)} SoV
                          </span>
                        </div>
                      );
                    })}
                    {llm.totalMentions === 0 && (
                      <p className="text-xs text-slate-400 italic">No brand mentions in any response from this model</p>
                    )}
                  </div>

                  {/* Progress bar */}
                  {llm.totalMentions > 0 && (
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${sovPct}%` }} />
                      {llm.competitorBreakdown.map((comp, ci) => {
                        const compColor = BRAND_COLORS[(ci % (BRAND_COLORS.length - 1)) + 1];
                        const w = (comp.mentions / llm.totalMentions) * 100;
                        return <div key={ci} className="h-full" style={{ width: `${w}%`, background: compColor }} />;
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 5: Raw Detail Table ───────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
          Full Analytics Table
        </h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4 text-left">Brand / Domain</th>
                <th className="px-6 py-4 text-right">Mentions</th>
                <th className="px-6 py-4 text-right">Share of Voice</th>
                <th className="px-6 py-4 text-right">Avg Rank Position</th>
                <th className="px-6 py-4 text-right">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {report.brandStats.map((stat, idx) => {
                const color = stat.isTarget ? BRAND_COLORS[0] : BRAND_COLORS[(idx % (BRAND_COLORS.length - 1)) + 1];
                return (
                  <tr key={idx} className={cn("hover:bg-slate-50/80 transition-colors", stat.isTarget && "bg-emerald-50/30")}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: color }} />
                        <div>
                          <div className="font-semibold text-slate-900">{stat.brand}</div>
                          <div className="text-xs text-slate-400">{stat.url}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">{stat.mentions}</td>
                    <td className="px-6 py-4 text-right font-bold" style={{ color }}>
                      {pct(stat.shareOfVoice)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">
                      {stat.avgRankPosition != null ? `#${stat.avgRankPosition.toFixed(1)}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {stat.isTarget
                        ? <Badge variant="success">Target</Badge>
                        : <Badge variant="secondary">Competitor</Badge>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>
    </motion.div>
  );
}
