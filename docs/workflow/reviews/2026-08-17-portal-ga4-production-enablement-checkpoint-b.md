# Checkpoint B: Apply production GA4 Measurement ID

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Managed goal | `portal-ga4-production-enablement` |
| Authorization | `AUTHORIZE PROD GA4 MEASUREMENT ID` |
| Owner secret action | **COMPLETE** (version 1; IAM granted; YAML `--force` declined) |
| Status | **PR #80 OPEN — merge NOT authorized; App Hosting NOT run** |
| PR | [#80](https://github.com/roasted-garlic/freshprints/pull/80) |
| PR base | `production` @ `f8acb26d76acdaed5f145138681f30b1d63c7257` |
| Audited-pre-correction head | `c213ad5f75245417fccbd4b77dfee335a2104b92` |
| Merge | **NOT authorized** |
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

**PR #80 is OPEN:** https://github.com/roasted-garlic/freshprints/pull/80

- Base: `production` @ `f8acb26d76acdaed5f145138681f30b1d63c7257`
- Audited-pre-correction head: `c213ad5f75245417fccbd4b77dfee335a2104b92`
- Merge **NOT authorized**
- App Hosting **NOT run**

Historical note: the agent's original `gh pr create --base production` attempt was hook-blocked. The owner opened PR #80 afterward.

Independent pre-merge audit: application/configuration scope was clean; this docs-only correction records the open PR. **Do not merge. Do not run App Hosting.** STOP for final independent pre-merge re-audit.

---

## Not done (later checkpoints)

- Merge to `production`
- App Hosting rollout
- DebugView / `PROD GA4 QA`

Phrase for later: `AUTHORIZE PROD APP HOSTING ROLLOUT: GA4 ENABLEMENT`
