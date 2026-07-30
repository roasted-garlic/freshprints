# Amendment 16 — Dev Firestore Rules Deployment Record

**Target:** `fresh-prints-dev`  
**Scope:** Firestore Rules only  
**Reported status:** owner completed  
**Codex deployment:** not run; do not redeploy

The owner reported that the Amendment 16 Firestore Rules deployment is already complete.

- Owner deployment command: `[NEEDS OWNER CONFIRMATION]`
- Owner deployment exit code: `[NEEDS OWNER CONFIRMATION]`
- Owner CLI output/ruleset identifier: `[NEEDS OWNER CONFIRMATION]`
- Owner deployment time: `[NEEDS OWNER CONFIRMATION]`

## Read-only verification

Codex ran:

`node functions/scripts/compare-deployed-firestore-rules.mjs`

Result: exit `2`. The read-only Admin Security Rules API lookup could not obtain Application Default
Credentials (`metadata.google.internal` unavailable). This was an authentication limitation of the
local verification command, not evidence that the owner deployment failed. No login, credential,
Rules write, or deployment was attempted.

- Active deployed ruleset identifier: `[NEEDS OWNER CONFIRMATION]`
- Deployed/local SHA-256 equality: `[NEEDS OWNER CONFIRMATION]`

Local release readiness remains verified by `npm run test:rules`: 48/48 passed with exit `0`.
Owner QA v18 is reopened based on the owner's explicit deployment-complete statement.
