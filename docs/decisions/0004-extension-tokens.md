# 4. Extension auth with hashed personal tokens

**Status:** accepted

## Context
The extension runs on employer domains, where the CareerOS session cookie isn't available, and it
needs to read the user's answers and resume and to record submissions.

## Decision
Users generate a personal token in settings, shown once: `cos_<userId>.<32 random bytes>`. Only its
SHA-256 hash is stored. The API verifies by recomputing the hash with a constant-time comparison,
then serves only that user's data via the service role. Generating a new token replaces the old one.
The token lives in the extension's service worker storage; content scripts on employer pages talk
to the worker by message and never see it.

## Consequences
- A leaked database row can't be replayed; a leaked token is revoked by generating a new one.
- Embedding the user id makes lookup a single read instead of a scan over all users.
- Unit tests cover issue, verify, rotation, tampering and user-id swapping.
