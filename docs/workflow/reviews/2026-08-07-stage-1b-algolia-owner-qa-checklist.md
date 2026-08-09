# Manual QA Checklist: Stage 1b Algolia catalog search (dev)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | **Stage 1b-C complete** — Signoff **approved_with_notes**; Stage 4 **not started** |
| Checkpoint | `docs/workflow/reviews/2026-08-07-stage-1b-algolia-dev-secrets-checkpoint.md` |
| Environment | localhost Portal → `fresh-prints-dev` |

---

## Prerequisites

- [x] Algolia Grow app + `portal_catalog_ready_dev` index created
- [x] Admin key in Secret Manager; search-only key in Portal env
- [x] `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true` (local `.env.local`)
- [x] Functions `syncPortalCatalogDesignToAlgolia` + reconcile deployed
- [x] Reconcile completed (`dryRun: false`) — scanned=45, upserted=45
- [x] Generated publisher still alive (expected until Stage 4)

---

## Generated-read proof (Algolia path active)

Owner Network evidence (prior Stage 1b-C QA) — **PASS** (reuse; do not re-run unless regression suspected):

- [x] Free-text does **not** fetch `generated/portal-catalog/**` search shards
- [x] Multi-tag does **not** fetch tag ID list assets for search
- [x] Search + multi-tag generated reads = 0
- [x] Global facets do **not** fetch `tags-facet.json` — accepted via `GLOBAL FACETS: PASS` (Algolia ON); optional Network re-spot-check
- [x] Narrowed facets do **not** fetch generated facet/ID assets — accepted via `NARROWED FACET COUNTS: PASS` (Algolia ON); optional Network re-spot-check

---

## Search / tags / facets

- [x] Free-text finds titles — owner PASS
- [x] Tag names / aliases searchable — covered in free-text / tag QA
- [x] Tags A+B use **AND** (not OR) — owner PASS
- [x] Search + multi-tag combines — owner PASS
- [x] Category ∩ search/tags works — `CATEGORY SEARCH: PASS`
- [x] Pagination stable; order matches Algolia after FS hydrate — `PAGINATION ORDER: PASS`
- [x] Empty search returns to Firestore browse — `EMPTY SEARCH: PASS`
- [x] Typing debounced (no request per keystroke storm) — implemented + prior QA
- [x] Global facet counts present; zero-use tags absent — `GLOBAL FACETS: PASS`
- [x] Narrowed facet counts update after selecting tags — `NARROWED FACET COUNTS: PASS`

## Sync

- [x] Approve → appears in search — `APPROVE SYNC: PASS`
- [x] Edit ready metadata/tags → search updates — `READY EDIT SYNC: PASS`
- [x] Archive → disappears from search promptly — `ARCHIVE SYNC: PASS`
- [x] Restore/reapprove → returns — `RESTORE SYNC: PASS`

## Regression (Firestore)

- [x] Ordinary Library browse — `LIBRARY BROWSE: PASS`
- [x] Category — `CATEGORY BROWSE: PASS`
- [x] Single-tag — `SINGLE TAG BROWSE: PASS`
- [x] Discover / Home / New This Week (`readyAt`) — `DISCOVER VIEW ALL: PASS WITH NOTES` (2026-08-07); corrective signed off
- [x] Favorites / details / share / Add to Request — `FAVORITES DETAILS SHARE REQUEST: PASS WITH NOTES` (2026-08-07); UX qty-control parity deferred as TD-030
- [x] Algolia outage → browse still works; search shows unavailable — `ALGOLIA OUTAGE: PASS` (2026-08-07)

## Narrowed facets (Stage 1b-C — A/B re-QA)

Owner: **`NARROWED FACET COUNTS: PASS`** (2026-08-07)

### Algolia ON (`NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true`)

- [x] Unfiltered Tags → global counts
- [x] One / two tags AND → counts update
- [x] `q=stupid` + funny + quote → counts match small result set
- [x] `q=jerk` (search-only) → Tags show only tags on the 1 matching design (counts ≈1), not funny(32)

### Algolia OFF (`=false`, restart Portal)

- [x] Same `q=jerk` search-only case → Tags **not** global
- [x] Multi-tag AND + search still work on generated path
- [x] Unfiltered Tags still global

## Initial unselected count freshness (Stage 1b-C)

Owner: **`INITIAL FACET COUNT: PASS`** (2026-08-07)

Prior: `cartoon (3)` unselected → select → `cartoon (4)` + 4 designs.
Cause: mount-cached global tags; live index already had 4.
Fix: Tags modal always refreshes facets on open.

- [x] Open Tags (Algolia ON), search `cartoon` → **cartoon (4) before selecting**
- [x] Select cartoon → still 4 designs; count stays 4
- [x] Prior narrowed q/tags behavior still OK

Signoff: `docs/workflow/reviews/2026-08-07-stage-1b-c-initial-facet-count-mismatch-signoff.md`
