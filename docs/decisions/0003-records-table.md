# 3. One JSON records table behind row-level security

**Status:** accepted

## Context
The domain is small (six document types), every query is "this user's X", and the shapes were
changing daily while the product was being discovered. Relational modelling would add a migration
for every field and joins nobody needs; the heaviest list is a few hundred jobs per user.

## Decision
Store each document as JSONB in `records (user_id, collection, id, data)`, keyed by user and
collection, with row-level security on `user_id = auth.uid()`. TypeScript types are the schema.
Access goes through a small `Store` interface with a Supabase implementation and a local JSON-file
implementation for development and tests.

## Consequences
- New fields ship without migrations; adding a collection is one check-constraint change.
- One RLS policy set protects everything, and it is easy to audit.
- No cross-user analytics or server-side filtering inside documents yet. If a collection outgrows
  this (e.g. shared job postings across users), it moves to its own table behind the same interface.
- The file implementation makes the full app runnable — and end-to-end testable — with no cloud
  services.
