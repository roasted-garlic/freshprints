# Apply Record: Production Algolia Gate C reconcile

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Authorization | `APPROVE PROD ALGOLIA RECONCILE APPLY` → owner **`PROD ALGOLIA RECONCILE: COMPLETE`** |
| Project | **`fresh-prints-prod`** |
| Callable | `reconcilePortalCatalogAlgoliaIndex` |
| Payload | `{ "dryRun": false }` |
| Index | **`portal_catalog_ready_prod`** |
| Status | **COMPLETE / PASS** |
| Dry-run prerequisite | PASS — 46/46 (`…-prod-algolia-gate-c-reconcile-dry-run-record.md`) |
| Apply gate | `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-reconcile-apply-gate.md` |
| Portal enable | **OFF** (unchanged) |

---

## Owner apply result

| Field | Value |
|-------|-------|
| startedAt | `2026-08-09T15:39:32.956Z` |
| completedAt | `2026-08-09T15:39:34.707Z` |
| mode | `apply` |
| scanned | **46** |
| upserted | **46** |
| cleared | **true** |
| dryRun | **false** |

Matches dry-run counts (46/46). Index clear + upsert completed in ~1.8s.

Agent did not invoke apply (hook-blocked); owner CLI used corrected ADC + `serviceAccountId` path.

---

## Explicitly still OFF / not done

| Item | Status |
|------|--------|
| Portal `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` | **OFF** |
| Search-only API key / App Hosting Algolia env | **Not set** |
| Gate C-enable | **OPEN** — optional |

---

## Next (optional)

**`APPROVE PROD ALGOLIA ENABLE`** — search-only Portal env + App Hosting rollout. Not required for Firestore browse launch.

Do **not** auto-start.
