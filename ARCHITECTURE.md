# AEO Scope — Architecture & Approach

## What is AEO?

Answer Engine Optimization (AEO) is the practice of improving a brand's visibility inside AI-generated answers — ChatGPT, Claude, Gemini — rather than traditional search engine results pages. Where SEO asks "does Google rank my page?", AEO asks "does the AI mention my brand when someone asks a relevant question?"

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (React)                    │
│  New Campaign → Run Campaign → Report Dashboard      │
└────────────────────────┬────────────────────────────┘
                         │ REST + SSE
┌────────────────────────▼────────────────────────────┐
│              Express 5 API Server                    │
│                                                      │
│  ┌─────────────────┐   ┌──────────────────────────┐ │
│  │ queryGenerator  │   │      llmQuerier           │ │
│  │  (GPT expands   │   │  (parallel dispatch to    │ │
│  │   seed queries) │   │   OpenAI / Claude /       │ │
│  └────────┬────────┘   │   Gemini)                 │ │
│           │            └──────────────┬─────────────┘ │
│           └──────────────────────────▼             │ │
│                     brandDetector                   │ │
│               (domain substring matching,           │ │
│                rank extraction from lists)          │ │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│            PostgreSQL (via Drizzle ORM)              │
│                                                      │
│  campaigns         llm_responses                     │
│  ─────────         ─────────────                     │
│  id                id                                │
│  name              campaignId → campaigns.id         │
│  targetUrl         llm (openai|claude|gemini)        │
│  competitorUrls[]  query                             │
│  seedQueries[]     responseText                      │
│  status            createdAt                         │
│  createdAt                                           │
└─────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
/
├── artifacts/
│   ├── aeo-dashboard/          React + Vite frontend
│   │   └── src/
│   │       ├── pages/          CampaignsList, NewCampaign,
│   │       │                   RunCampaign, CampaignReport
│   │       ├── components/     UI components, layout
│   │       └── hooks/          use-sse-run (SSE stream)
│   │
│   └── api-server/             Express 5 backend
│       └── src/
│           ├── lib/
│           │   ├── queryGenerator.ts   Query variation via GPT
│           │   ├── llmQuerier.ts       Multi-LLM dispatch
│           │   └── brandDetector.ts    Mention + rank detection
│           └── routes/
│               └── campaigns.ts        All campaign endpoints
│
├── lib/
│   ├── db/                     PostgreSQL schema (Drizzle ORM)
│   ├── api-spec/               OpenAPI 3.1 specification
│   ├── api-client-react/       Auto-generated React Query hooks
│   ├── api-zod/                Auto-generated Zod validators
│   ├── integrations-openai-ai-server/
│   ├── integrations-anthropic-ai/
│   └── integrations-gemini-ai/
```

---

## End-to-End Flow

### 1. Campaign Creation
The user enters:
- **Target domain** (e.g. `ascendnow.org`)
- **Competitor domains** (e.g. `crimson.education, ivywise.com`)
- **Seed queries** (e.g. "best college counseling services")

### 2. Query Variation Generation
Each seed query is sent to GPT, which rewrites it into 5–7 natural variations:

```
"best college counseling services"
  → "top college counseling programs"
  → "recommended college admissions consultants"
  → "college counseling services for international students"
  ...
```

This simulates how real users phrase the same question differently.

### 3. Multi-LLM Querying
All query variations are dispatched **in parallel** to:
- OpenAI GPT (`gpt-4o-mini`)
- Anthropic Claude (`claude-haiku-4-5`)
- Google Gemini (`gemini-2.5-flash`)

Every raw response is stored in PostgreSQL.

### 4. Brand Detection
Each stored response is scanned for brand mentions using:

**Domain matching** — case-insensitive substring search:
```
"ascendnow.org" found in response? → mention detected
```

**Rank extraction** — numbered and bulleted lists are parsed line-by-line:
```
1. Crimson Education (crimson.education) ...  → rank #1
2. IvyWise (ivywise.com) ...                 → rank #2
```

### 5. Metrics Computation
Computed on-the-fly from stored responses when the report is requested:

| Metric | Formula |
|--------|---------|
| Share of Voice | `brand_mentions / total_all_brand_mentions × 100` |
| Avg Rank Position | `mean(rank_position)` for ranked-list mentions only |
| Visibility by LLM | Same SoV calculation, grouped per model |

---

## Key Design Decisions

**Why query LLMs directly?**
No proxy data (SEO metrics, backlinks, traffic) can substitute for the actual signal — you need to ask the AI and see what it says.

**Why three LLMs?**
Each model has different training data, knowledge cutoffs, and tendencies to cite brands. A brand invisible to GPT may be cited frequently by Gemini. Cross-model coverage gives a complete picture.

**Why domain matching instead of NER?**
Simpler, faster, and more reliable for this use case. Named Entity Recognition adds complexity and can miss domain-format citations (`example.com`). Domain matching is transparent and auditable.

**Why SSE (Server-Sent Events) for run progress?**
LLM calls take 2–10 seconds each. With 5–7 query variations × 3 models, a run involves 15–21 LLM calls. SSE lets the frontend show real-time progress instead of making the user wait in silence.

**Why store raw responses?**
Re-computing detections from stored text makes the system auditable — you can always go back and verify why a brand was or wasn't counted.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/campaigns` | List all campaigns |
| POST | `/api/campaigns` | Create a campaign |
| GET | `/api/campaigns/:id` | Get campaign details |
| DELETE | `/api/campaigns/:id` | Delete a campaign |
| POST | `/api/campaigns/:id/run` | Run analysis (SSE stream) |
| GET | `/api/campaigns/:id/results` | Raw LLM responses |
| GET | `/api/campaigns/:id/report` | Computed AEO metrics |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, Recharts, Framer Motion |
| Backend | Express 5, TypeScript, Node 24 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4, drizzle-zod |
| API Contract | OpenAPI 3.1 → Orval codegen |
| LLM Access | Replit AI Integrations (no user API keys in dev) |
| Monorepo | pnpm workspaces |
