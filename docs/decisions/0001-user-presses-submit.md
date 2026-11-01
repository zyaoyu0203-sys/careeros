# 1. The user always presses Submit

**Status:** accepted

## Context
"Auto-apply" is the obvious headline feature for a job-search tool. There are three ways to build it:

1. **ATS submission APIs.** Greenhouse and Lever accept applications by API, but only with the
   *employer's* API key. A third party can't use them.
2. **Headless browser automation** on the user's behalf. It needs the user's credentials for each
   portal, breaks on CAPTCHAs and layout changes, conflicts with most job sites' terms, and sends
   applications nobody looked at.
3. **Assisted submission.** A browser extension fills the form in the user's own session; the user
   reviews and submits.

An application is a representation made in the candidate's name. A wrong answer about work rights,
or a resume claim the candidate can't defend, costs more than the minute saved.

## Decision
CareerOS prepares everything and fills the form (option 3), but never submits. The extension
records the application only after it sees the employer's confirmation page, and stores that page
as evidence.

## Consequences
- One click and one review per application instead of zero — the honest version of "one-click".
- No stored portal passwords, no CAPTCHA arms race, nothing sent without being seen.
- "Applied" in the tracker means the employer confirmed it, which keeps the funnel metrics trustworthy.
