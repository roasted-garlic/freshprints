# Dev deploy record — Assisted Creation proof 80 MB

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Project | `fresh-prints-dev` |
| Approval | Owner: `APPROVE DEV DEPLOYMENT: ASSISTED CREATION PROOF 80 MB LIMIT` |
| Source HEAD | `982855c` |
| Production | **not** deployed |

## Deployed

| Surface | Command | Result |
|---|---|---|
| Storage Rules | `firebase deploy --only storage --project fresh-prints-dev` | **Success** — `isValidAssistedCreationProof` now `<= 80 * 1024 * 1024` |
| Functions | `firebase deploy --only functions:staffAddAssistedCreationProof,functions:staffAddAssistedCreationFinalSource,functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev` | **Success** (all three updated) |

## Not deployed

- Production (`fresh-prints-prod`)
- App Hosting / Studio installer release (Studio client already uses shared constant when rebuilt/restarted from this branch)
- Unrelated Functions / Firestore Rules / indexes

## Owner next

Continue owner QA on
`docs/workflow/reviews/2026-08-06-catalog-display-ready-ordering-and-assisted-proof-limit-manual-qa.md`
including a proof between 25–80 MB and a reject above 80 MB.
