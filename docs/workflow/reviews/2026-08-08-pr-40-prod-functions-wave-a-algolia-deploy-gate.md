# Deploy Gate: PR #40 production Functions Wave A — Algolia

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Authorization | Owner **`APPROVE PROD FUNCTIONS WAVE A ALGOLIA`** |
| Project | **`fresh-prints-prod`** |
| Phase | **COMPLETE / VERIFIED PASS** — owner `PROD FUNCTIONS WAVE A ALGOLIA: COMPLETE` |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-checkpoint.md` |
| Formal Review | **approved_with_changes** |
| Deploy record | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-deploy-record.md` |
| Tip | **`92d176c`** (PR #48) |

---

## Exact CREATE allowlist

```text
functions:syncPortalCatalogDesignToAlgolia
functions:reconcilePortalCatalogAlgoliaIndex
functions:reconcilePortalCatalogAlgoliaIndexScheduled
```

## Required params (non-secret)

| Param | Value |
|-------|--------|
| `ALGOLIA_APP_ID` | `Z1FVCM5QUX` |
| `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` | `portal_catalog_ready_prod` |

## Required secret

| Secret | Status |
|--------|--------|
| `ALGOLIA_ADMIN_API_KEY` | Present — rotated (SM v2); do not print value |

---

## Agent progress (this pass)

| Step | Result |
|------|--------|
| Export restore commit | **DONE** — `c813452` |
| Push / PR #48 / merge | **DONE** — tip **`92d176c`** |
| Params + scoped CREATE | **DONE** — owner CLI |
| Post-verify | **PASS** — trio **ACTIVE** (see deploy record) |
| Portal enable / reconcile | **Still forbidden** until Gate C |

Owner phrase: **`PROD FUNCTIONS WAVE A ALGOLIA: COMPLETE`**

---

## Owner CLI (historical — executed)

### 1) Promote source to `production` — DONE (PR #48 → `92d176c`)

### 2) Set Functions params — DONE (owner)

### 3) Scoped CREATE deploy — DONE (owner)

### 4) Verify + reply — DONE (`PROD FUNCTIONS WAVE A ALGOLIA: COMPLETE`)

---

## Explicitly forbidden until Gate C

- Portal `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true`
- Reconcile invoke
- Broad `firebase deploy --only functions`
- Index `portal_catalog_ready_dev` on prod
