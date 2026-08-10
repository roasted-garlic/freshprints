# Current Goal
**DONE** — Prelaunch companion/censored production promote + Studio 1.0.2.

Current Mode: managed-phase
Current Phase: signoff
Managed goal: Complete prelaunch promote

DONE: **yes**
Last Completed Step: Signoff
Signoff Status: **approved**
Human Checkpoint Required: **no**
Blocked: **no**

Signoff: `docs/workflow/reviews/2026-08-10-prelaunch-companion-censored-promote-signoff.md`
Owner smoke: `PROD COMPANION CENSORED PROMOTE SMOKE: PASS` (2026-08-10)

## Production final status
| Artifact | Status |
|----------|--------|
| Firestore Rules | LIVE |
| Firestore indexes | LIVE |
| `getPortalGlobalOpenGraph` | LIVE |
| Portal App Hosting | LIVE |
| Studio stable | **v1.0.2 published** — `target_commitish` `b6e67be1b7fe02a69cd31077a203ee9102611ca5` |
| Feature merge SHA | `8cc014fb23370be6a7ac3672436163a47d390103` |
| Algolia / myprintrequest.com / DNS / Coming Soon | untouched |

Allowed Actions: idle / start new managed phase when requested
Forbidden Actions: silent redeploy of closed promote; cutover without `APPROVE MYPRINTREQUEST.COM CUTOVER`

Next Required Step: None for this goal. Awaiting cutover phrase or new goal.

## Decision Log
- 2026-08-10: Backend + Portal promote complete; Studio 1.0.2 published after QA corrective (PR #54 → `b6e67be…`).
- 2026-08-10: Owner `PROD COMPANION CENSORED PROMOTE SMOKE: PASS` — signoff approved; DONE.
