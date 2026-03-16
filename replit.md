# AEO Analytics Platform

## Overview

A full-stack Answer Engine Optimization (AEO) analytics tool that measures how often a brand appears in AI-generated answers (ChatGPT/OpenAI, Claude/Anthropic, Gemini) compared to competitors.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite (Tailwind CSS, Recharts, Lucide, Framer Motion)
- **LLMs**: OpenAI GPT (gpt-5-mini), Anthropic Claude (claude-haiku-4-5), Google Gemini (gemini-2.5-flash) via Replit AI Integrations

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/             # Express API server
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── brandDetector.ts    # Brand mention detection & rank extraction
│   │       │   ├── queryGenerator.ts   # LLM-powered query variation generation
│   │       │   └── llmQuerier.ts       # Multi-LLM query dispatch
│   │       └── routes/
│   │           └── campaigns.ts        # Campaign CRUD + run + report endpoints
│   └── aeo-dashboard/          # React + Vite frontend
│       └── src/
│           ├── pages/           # CampaignsList, NewCampaign, RunCampaign, CampaignReport
│           └── hooks/           # use-sse-run.ts (SSE run stream)
├── lib/
│   ├── api-spec/               # OpenAPI spec + Orval codegen config
│   ├── api-client-react/       # Generated React Query hooks
│   ├── api-zod/                # Generated Zod schemas from OpenAPI
│   ├── db/                     # Drizzle ORM schema + DB connection
│   │   └── src/schema/
│   │       ├── campaigns.ts    # campaigns table
│   │       └── llmResponses.ts # llm_responses table
│   ├── integrations-openai-ai-server/   # OpenAI integration
│   ├── integrations-anthropic-ai/       # Anthropic integration
│   └── integrations-gemini-ai/          # Gemini integration
```

## Key Features

1. **Campaign Management** — Create campaigns with target URL, competitor URLs, and seed queries
2. **Query Variation Generation** — GPT generates 5–7 variations per seed query
3. **Multi-LLM Querying** — All queries sent to OpenAI, Claude, and Gemini in parallel
4. **Brand Detection** — Domain + brand name matching across all responses
5. **AEO Metrics**:
   - Share of Voice (brand mentions / total mentions)
   - Average Rank Position in ordered lists
   - Visibility by LLM (per-model breakdown)
6. **Live Run Progress** — SSE stream shows real-time progress during analysis

## API Endpoints

- `GET /api/campaigns` — List all campaigns
- `POST /api/campaigns` — Create campaign
- `GET /api/campaigns/:id` — Get campaign
- `DELETE /api/campaigns/:id` — Delete campaign
- `POST /api/campaigns/:id/run` — Run analysis (SSE stream)
- `GET /api/campaigns/:id/results` — Get raw LLM responses
- `GET /api/campaigns/:id/report` — Get computed AEO metrics

## DB Tables

- `campaigns` — name, targetUrl, competitorUrls (json), seedQueries (json), status, timestamps
- `llm_responses` — campaignId, llm, query, responseText, createdAt
