# 2. Only official job-board APIs — no LinkedIn scraping

**Status:** accepted

## Context
Most candidates find roles on LinkedIn, JobsDB and Indeed. LinkedIn prohibits automated access and
actively blocks it; scraped HTML breaks without warning. Meanwhile many employers publish their
openings through ATS job-board APIs that exist precisely for syndication: Greenhouse
(`boards-api.greenhouse.io`), Lever (`api.lever.co/v0/postings`) and Ashby (`api.ashbyhq.com/posting-api`).

## Decision
Search uses only sources intended for programmatic use: the public ATS board APIs, and Google Jobs
through SerpAPI for aggregator coverage (JobsDB, Indeed, LinkedIn listings indexed by Google).
Roles found anywhere else are added by pasting the link and description.

## Consequences
- Every fetcher is a small, typed adapter with a stable contract (`RawJob`), unit-tested with
  mocked responses.
- Coverage depends on which companies the user adds; the settings page explains how to find a
  board name, and the run history shows which boards are healthy.
- No account bans, no proxy infrastructure, nothing to explain away in a security review.
