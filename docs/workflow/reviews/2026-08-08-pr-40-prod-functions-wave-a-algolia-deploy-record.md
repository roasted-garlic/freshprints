# Deploy Record: PR #40 production Functions Wave A — Algolia

| Field | Value |
|-------|-------|
| Date | 2026-08-08 / 2026-08-09 UTC |
| Authorization | `APPROVE PROD FUNCTIONS WAVE A ALGOLIA` → owner `PROD FUNCTIONS WAVE A ALGOLIA: COMPLETE` |
| Project | **`fresh-prints-prod`** |
| Scope | **Exact three Functions CREATE only** |
| Status | **COMPLETE / VERIFIED PASS** |
| Source SHA | tip **`92d176c532efdb14b78510ce45b001a18ba87176`** (PR **#48** merge; includes export restore `c813452`) |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-checkpoint.md` |
| Formal Review | **approved_with_changes** |
| Deploy gate | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-deploy-gate.md` |

---

## Timeline

| Step | Result |
|------|--------|
| Export restore | Commit `c813452` on `feat/restore-algolia-function-exports` |
| Promote | PR **#48** merged → tip `92d176c` |
| Params | Owner set `ALGOLIA_APP_ID=Z1FVCM5QUX` + `ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod` (gitignored `.env.fresh-prints-prod`) |
| Agent deploy | Hook-blocked (expected) |
| Owner CLI CREATE | **COMPLETE** (owner phrase) |
| Post-deploy verify | **PASS** (2026-08-09 agent read-only) |

---

## Post-deploy Function verification

| Function | Live | State | Update time (UTC) | Notes |
|----------|------|-------|-------------------|-------|
| `syncPortalCatalogDesignToAlgolia` | **PRESENT** | **ACTIVE** | `2026-08-09T01:45:21Z` | Firestore written trigger |
| `reconcilePortalCatalogAlgoliaIndex` | **PRESENT** | **ACTIVE** | `2026-08-09T01:45:10Z` | Callable — **not invoked** this gate |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | **PRESENT** | **ACTIVE** | `2026-08-09T01:45:14Z` | Scheduled |

Preflight before COMPLETE: trio was **ABSENT**; after COMPLETE: trio **ACTIVE**.

---

## Params / secret (no values printed)

| Item | Status |
|------|--------|
| `ALGOLIA_APP_ID` | Expected `Z1FVCM5QUX` (owner-set at deploy) |
| `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` | Expected `portal_catalog_ready_prod` (≠ `_dev`) |
| `ALGOLIA_ADMIN_API_KEY` | SM present (rotated v2) |

---

## Explicitly still OFF / not done

| Item | Status |
|------|--------|
| Portal `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` | **OFF** — no Algolia vars in `apphosting.yaml` / `.env.production.local` |
| Reconcile invoke | **Not run** |
| Gate C (enable + search-only Portal env) | **OPEN** |

---

## Next

Gate C (optional): reconcile + **`APPROVE PROD ALGOLIA ENABLE`** (search-only Portal env). Do **not** auto-start.
