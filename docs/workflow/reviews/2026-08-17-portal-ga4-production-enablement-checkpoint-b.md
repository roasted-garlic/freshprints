# Checkpoint B: Apply production GA4 Measurement ID

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Managed goal | `portal-ga4-production-enablement` |
| Authorization | `AUTHORIZE PROD GA4 MEASUREMENT ID` |
| Owner secret action | **COMPLETE** (version 1; IAM granted; YAML `--force` declined) |
| Status | **YAML + docs pushed; production PR not yet opened (agent `gh pr create` hook-blocked)** |
| App Hosting | **not run** |

---

## Gates already satisfied

| Gate | Result |
|------|--------|
| Git | Implement from `origin/production` via isolated worktree; dirty TD-030 checkout not committed |
| Checkpoint A | `GA4 STREAM READY` — `https://myprintrequest.com`; Enhanced Measurement **fully OFF** |
| Decision 7 | **SATISFIED** |
| Secret | `NEXT_PUBLIC_GA_MEASUREMENT_ID` on `fresh-prints-prod`, version **1 enabled** |
| IAM | `firebase-app-hosting-compute@fresh-prints-prod.iam.gserviceaccount.com` has `secretAccessor` + `viewer`; App Hosting SA has `secretVersionManager` |
| YAML | Mapping present with BUILD + RUNTIME; `--force` was **not** used |

---

## Read-only verification (this pass)

- Secret name exists; version **1** state **enabled**
- Backend compute SA can read the secret
- `apps/portal/apphosting.yaml` contains the reviewed mapping
- Literal Measurement ID **not** in branch diff or committed files

---

## Production PR

Agent `gh pr create --base production` was **hook-blocked** (classified as production secret/env change). The branch is on origin. Owner must open the PR from:

https://github.com/roasted-garlic/freshprints/compare/production...chore/portal-ga4-measurement-id?expand=1

Then independent pre-merge audit. **Do not merge. Do not run App Hosting.**

---

## Not done (later checkpoints)

- Merge to `production`
- App Hosting rollout
- DebugView / `PROD GA4 QA`

Phrase for later: `AUTHORIZE PROD APP HOSTING ROLLOUT: GA4 ENABLEMENT`
