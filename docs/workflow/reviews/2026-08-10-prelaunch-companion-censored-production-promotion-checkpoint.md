# Human Checkpoint: Production promotion — prelaunch companions + censored

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Status | **OWNER APPROVED — EXECUTING** |
| Plan | `docs/workflow/plans/2026-08-10-prelaunch-companion-censored-production-promotion-plan.md` |
| Owner phrase | `APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED` (2026-08-10) |

---

## Bundle includes (DEV signed off)

- Pairwise companions + Needs Companion + Placement + post-add Matching Designs
- Censored / Uncensored + staff `censoredTerms` text masking
- Featured Tags
- Help About panel; Algolia default-ON (no reconcile)
- Design Details Current Request qty controls
- AI Review: remove “No companion set”; approve Rules expression-budget hotfix
- Scoped Function `getPortalGlobalOpenGraph`

## Explicit non-goals (still forbidden)

- myprintrequest.com / DNS / Auth / Coming Soon
- Algolia index mutation
- Unfiltered Functions deploy

## Artifact checklist

| Artifact | Required | Status |
|----------|----------|--------|
| Commit + merge `development` → `production` | YES | in progress |
| Firestore Rules → `fresh-prints-prod` | YES | pending |
| Firestore indexes → `fresh-prints-prod` | YES | pending |
| Function `getPortalGlobalOpenGraph` only | YES | pending |
| Portal App Hosting rollout | YES | pending |
| Studio production package | YES | pending |
| Algolia reconcile | **NO** | N/A |
| myprintrequest.com | **NO** | N/A |

## Post-promote smoke

Owner reply: `PROD COMPANION CENSORED PROMOTE SMOKE: PASS` / `FAIL` / `PASS WITH NOTES`
