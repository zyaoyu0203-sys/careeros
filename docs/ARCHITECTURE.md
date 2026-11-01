# Architecture

## Overview

CareerOS is a single Next.js application deployed on Vercel, with Supabase for authentication and
storage, and a Chrome extension for filling application forms. There is no separate backend
service: server components read data, server actions write it, and four route handlers cover the
cases that need plain HTTP (streaming, cron, the extension, PDF download).

```
src/
  app/            routes — (app) pages behind sign-in, onboarding, login, api/*
  components/     UI primitives and client components
  lib/
    types.ts      the domain model
    store/        storage interface + Supabase and local-file implementations
    sources/      job-board fetchers (Greenhouse, Lever, Ashby, Google Jobs)
    discovery.ts  the search pipeline: fetch → filter → dedupe → score → save → log
    ai/claude.ts  scoring, resume tailoring, cover letters, resume import
    insights.ts   pure metric functions behind the dashboard
    autofill.ts   form-label → answer mapping shared with the extension
extension/        Chrome MV3 extension
tests/            unit (Vitest) and end-to-end (Playwright)
```

## Data model

Everything a user owns lives in one table:

```sql
records (user_id uuid, collection text, id text, data jsonb, updated_at timestamptz)
  primary key (user_id, collection, id)
```

| collection | id | holds |
|---|---|---|
| `profile` | `me` | knowledge base: contact, education, experiences (facts, metrics, skills), application answers |
| `preferences` | `me` | target roles, filters, sources, schedule, last run, extension token hash |
| `jobs` | `job_…` | a pushed role with its score, fit reasons, risks, suggested resume and status |
| `resumes` | `res_…` | a version (view over the knowledge base) or a tailored draft (with `baseId`, `approved`) |
| `applications` | `app_…` | status, history, resume used, notes and evidence |
| `runs` | `run_…` | one search execution: per-source counts, latency and errors, AI outcome (last 30 kept) |

The TypeScript types in `src/lib/types.ts` are the schema. Why JSON documents instead of
normalised tables is in [ADR 0003](decisions/0003-records-table.md).

**Isolation.** Row-level security allows a user to read and write only rows where
`user_id = auth.uid()`. Requests on behalf of a user go through their session, so the database
enforces this. Two paths use the service role instead, and both scope every query by an explicit
user id: the scheduled search (no session) and the extension API (authenticated by token).

**Storage interface.** `lib/store` exposes `list / get / put / putMany / remove`. The Supabase
implementation is used in production; a JSON-file implementation runs local development and the
end-to-end tests. Local mode has no sign-in, so it throws if it ever runs on Vercel.

## Flows

### Search (job push)

```
fetchAll ──► per source, in parallel: fetch → normalise to RawJob → record {fetched, ms, error}
   │
   ▼
filter     title must contain a target role (whole words) · not an excluded word · location / remote
dedupe     against existing jobs by source id and company|title|location
score      keyword score for all → top 24 re-scored by Claude in batches of 6 (structured output)
route      suggested resume version per job (focus keywords, or Claude's choice)
save       jobs + a SearchRun record + preferences.lastRunAt
```

- **Scheduled:** Vercel Cron calls `/api/cron/discover` daily (protected by `CRON_SECRET`); each
  user's own frequency (daily / weekly / manual) decides whether their search runs.
- **Manual:** `/api/search` runs the same pipeline and streams NDJSON events (`plan`, one
  `source` per board as it finishes, `phase`, `done`), which the Jobs page renders live.
- **Failure handling:** a failing board is recorded on the run and skipped; the rest still land.
  If Claude fails (rate limit, refusal, no credit), keyword scores stand and the error is stored
  on the run. The Insights page aggregates runs into per-board success rate and latency.

### One-click apply

```
CareerOS                     Employer site (Greenhouse/Lever/Ashby)        Extension
────────                     ──────────────────────────────────────        ─────────
choose resume version
startOneClickApply ─► application (preparing, resumeId)
open posting#careeros-app=ID ───────────────► form loads ─────────────► content script reads ID
                                                                         worker GET /api/extension/applications/ID
                                                                         fill fields by label → answer rules
                                                                         GET resume PDF → attach to file input
                                              user reviews, presses Submit
                                              confirmation page ──────────► detected (URL or text)
application → applied (+ evidence) ◄───────────────────────────────────── POST …/ID/submitted
```

The mapping from form labels to answers (`FIELD_RULES`) is defined once in `lib/autofill.ts`,
unit-tested, and sent to the extension with each pack. The token stays in the extension's
service worker; content scripts on employer pages never see it.

### Resume tailoring

Claude receives the knowledge base and the job description and returns structured output:
headline, summary, chosen experience ids with rewritten bullets, and ordered skills. The prompt
forbids anything not in the knowledge base; the response is validated against a Zod schema and
experience ids not in the profile are dropped. Drafts start unapproved and appear on the home
page until reviewed.

## Testing

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | filters (whole-word matching), keyword scoring, resume routing, schedule logic, ATS normalisation with mocked HTTP and partial failure, insights metrics, autofill mapping, token issue/verify/rotation, file-store concurrency |
| End-to-end | Playwright | onboarding with validation, manual role → pack → submitted → status change → insights, knowledge base → resume rebuild, and the extension filling a Greenhouse-style form and recording the submission |
| CI | GitHub Actions | lint, type-check, unit, then e2e against a production build |

## Deployment

Vercel builds on push to `main`. Environment variables are listed in `.env.example`.
The database schema is in `supabase/migrations`; auth redirect URLs in `supabase/config.toml`.
