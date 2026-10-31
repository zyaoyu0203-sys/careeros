# CareerOS

A job seeker portal: it searches the sources you choose, scores every role against your own
knowledge base, picks (or tailors) the right resume, prepares an application pack, and tracks
each application from preparing to offer. It never submits an application on your behalf.

## How it works

| Area | What it does | Code |
|---|---|---|
| Knowledge base | Onboarding wizard + editor: contact, education, experience facts, skills, standard application answers (work rights, sponsorship, start date…) | `src/app/onboarding`, `src/app/(app)/profile`, `src/components/fields.tsx` |
| Job push | Fetches public ATS boards (Greenhouse, Lever, Ashby) and Google Jobs via SerpAPI, filters by target-role words in the title, dedupes, scores (Claude, or a keyword fallback) | `src/lib/sources`, `src/lib/discovery.ts`, `src/app/api/cron/discover` |
| Resumes | Versions are views over the knowledge base, routed to jobs by focus keywords; tailored drafts are rewritten per job from verified facts only and need approval | `src/lib/resume.ts`, `src/lib/ai/claude.ts`, `src/app/(app)/resumes` |
| Application packs | Chosen resume (print to PDF), copyable form answers, optional cover letter, link to the employer's form | `src/app/(app)/applications/[id]` |
| Tracker | Status per application with history | `src/app/(app)/applications` |

Data lives in one Supabase table, `records` (per user, per collection, JSON), protected by
row-level security — see `supabase/migrations`. Without Supabase env vars the app runs in a
single-user local mode backed by `.data/db.json`; that mode refuses to run on Vercel.

## Develop

```bash
npm install
cp .env.example .env.local   # optional: leave blank for local mode
npm run dev
```

In local mode, onboarding offers a fictional demo profile.

## Deploy (Vercel + Supabase)

1. Create a Supabase project, then apply the migration:
   `npx supabase link --project-ref <ref>` and `npx supabase db query --linked -f supabase/migrations/20261101000000_records.sql`
2. In Supabase → Authentication → URL configuration, set the Site URL to the production domain.
3. Add the variables from `.env.example` to the Vercel project (`vercel env add`).
4. `vercel deploy --prod`. The cron in `vercel.json` runs the search daily at 08:00 Hong Kong time;
   each user's own schedule (daily / weekly / manual) decides whether their search runs.
