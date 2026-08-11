# Implementation Review: Workstream H — Studio upload intake performance + sidebar counts

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Reviewer | Review Agent (independent of Implement Agent) |
| Plan | `docs/workflow/plans/2026-08-11-studio-customer-upload-intake-performance-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-11-studio-customer-upload-intake-performance-plan-review.md` |
| Branch | `fix/studio-upload-intake-perf-counts` |
| Production base | `913329caefa5cf5041b269da1e5192424d0b95c6` |
| Branch tip (committed) | `913329caefa5cf5041b269da1e5192424d0b95c6` (**H changes are currently uncommitted working tree**) |
| Verdict | **approved_with_notes** |

---

## Summary

The working-tree implementation on `fix/studio-upload-intake-perf-counts` matches the approved H Plan and Formal Review constraints H-DM-1, H-DM-2, H-BE-1, and H-BE-2. Primary list queries are purpose+status+createdAt+limit(50); badges are purpose-scoped Pending-only and do not use paginated `rows.length`; loading clears on metadata shells with concurrency-4 progressive enrichment; legacy missing-purpose recovery is metadata-filtered before enrichment. No Functions/Rules/E/F3/A–G branch mutations. Residual notes: commit H before integration; production index presence remains a later human verify; DEV QA (not production) after A–H integration.

**No additional product code changes were made during this Implementation Review.**

---

## Formal Review constraints

| Constraint | Result | Evidence |
|------------|--------|----------|
| **H-DM-1** | **pass** | Primary Uploaded query is `purpose==print_request` + status + orderBy + limit — true pending print_request rows are no longer crowded out by donations. No UI hide of legitimate badge totals. |
| **H-DM-2** | **pass** | `isMissingCustomerUploadPurpose` + status-scoped companion; `filterLegacyMissingPurposeDocs` **before** `enrichDocsProgressively`; only merged ≤50 shells are enriched. Does not restore sequential enrich-of-50-mixed-purpose defect. |
| **H-BE-1** | **pass** | No `functions/`, no Rules, no E/F3 lifecycle source in H diff. |
| **H-BE-2** | **pass** | `firestore.indexes.json` **unchanged**. Required composites already present (`purpose+catalogReviewStatus+createdAt`, `purpose+catalogReviewStatus`). **Prod build status still needs owner verification later** — not deployed in this pass. |

---

## Checklist vs review items 1–20

| # | Check | Result |
|---|-------|--------|
| 1 | Uploaded: purpose==print_request + status + createdAt + limit | **pass** (`buildPurposeScopedIntakeQuery`) |
| 2 | Donated: purpose==catalog_donation + status + createdAt + limit | **pass** (same builder, `purposeScope` from page) |
| 3 | Pending + Excluded both use `filter` in purpose-scoped query | **pass** |
| 4 | Opposite-purpose not enriched by primary query | **pass** (server purpose filter; donation route skips legacy companion) |
| 5 | Legacy compat metadata-only | **pass** (filter then merge; enrich only merged) |
| 6 | Compat filtered before enrichment | **pass** |
| 7 | No unbounded *expensive* fallback | **pass with note** — companion status listener is unbounded **document metadata** reads (same order of magnitude as prior badge scan); **not** unbounded `getDownloadURL`/enrich. Acceptable under H; scale note only. |
| 8 | Loading ends on shells | **pass** (`setIsInitialLoading(false)` before enrich) |
| 9 | Progressive images | **pass** |
| 10 | Concurrency 4 | **pass** (`CUSTOMER_UPLOAD_INTAKE_ENRICH_CONCURRENCY = 4`) |
| 11 | Broken image cannot block route | **pass** (`resolvePreviewUrl` catch → null; loading already cleared) |
| 12 | Badges purpose-scoped Pending-only | **pass** |
| 13 | Badges exclude `not_eligible` | **pass** |
| 14 | Badges not from limit(50) list | **pass** (dedicated count listeners / snapshot.size) |
| 15 | Badge no image enrichment | **pass** |
| 16 | List/badge predicates match intent | **pass** (Pending purpose + missing-purpose as print_request; list page-bounded) |
| 17 | Live updates | **pass** (`onSnapshot`) |
| 18 | Listener cleanup | **pass** (effect unsubscribers + enrich generation bump) |
| 19 | Exclude / Restore / Promote / Delete intact | **pass** (mutation API unchanged) |
| 20 | A–G branches untouched | **pass** (tips still Portal `e618a87`, OG `9d2144d`, Intake `633d3fa`, Quota `e39fc20`) |

---

## Files changed (working tree vs `origin/production`)

**Product / tests**
- `apps/studio/.../hooks/useCustomerUploadIntake.ts`
- `apps/studio/.../hooks/usePendingCustomerUploadCount.ts`
- `apps/studio/.../services/customerUploadIntakeService.ts`
- `apps/studio/.../utils/customerUploadIntakeQueries.ts` (**new**)
- `apps/studio/.../utils/customerUploadIntakeQueries.test.ts` (**new**)
- `apps/studio/.../utils/customerUploadIntakeParityContract.test.ts`
- `packages/shared/src/utils/customerUploadPurpose.ts`
- `packages/shared/src/utils/customerUploadPurpose.test.ts`

**Docs / workflow**
- `docs/architecture/DATA_MODEL.md`
- `docs/workflow/plans/2026-08-11-studio-customer-upload-intake-performance-plan.md`
- `docs/workflow/reviews/2026-08-11-studio-customer-upload-intake-performance-plan-review.md`
- `docs/workflow/reviews/2026-08-11-studio-customer-upload-intake-performance-test-report.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`

**Unchanged:** `functions/**`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, all A–G branches.

---

## Test / quality verification (this review pass)

| Check | Result |
|-------|--------|
| Focused tests | **13/13 PASS** |
| Studio `tsc --noEmit` | **PASS** (exit 0) |
| ESLint (changed product files) | **PASS** (exit 0, `--max-warnings 0`) |
| `git diff --check` | **PASS** (exit 0; CRLF warnings only) |
| Studio Vite / electron-builder build | **Not run** — H changes are renderer hooks/utils + shared purpose helper only; no Electron packaging, Vite config, native deps, or main-process surface. Typecheck is the applicable Studio static gate per `TESTING.md` for this surface. Full `vite build` / installer deferred to pre-release packaging. |

---

## Manual QA classification

**Do not require production QA for H now.**

Classify as **DEV QA after A–H integrated into development QA state** (`fresh-prints-dev` / local Studio):

- Studio cold restart
- Uploaded Designs badge vs Pending list
- Donated Designs load performance
- Uploaded Designs load performance
- Progressive thumbnail rendering
- Live Pending/Excluded transitions

---

## Residual notes (not blockers for DEV integration)

1. **Commit required:** H product/docs are uncommitted; committed tip still equals production. Commit (or squash) on `fix/studio-upload-intake-perf-counts` before merge into a DEV integration branch.
2. **Prod index verify later:** Confirm Firebase prod has purpose composites built; deploy indexes only if missing — **not** in this pass.
3. **Legacy companion reads:** Status-scoped listener downloads all matching-status docs for missing-purpose filter (metadata). Bounded enrichment remains; monitor if pending volume grows large.

---

## Integration strategy recommendation (DEV only — no production)

Recommended path to a **development QA state** without touching production:

1. Commit H on `fix/studio-upload-intake-perf-counts`.
2. Create a **throwaway or durable DEV integration branch** from current `development` (or agreed DEV tip), e.g. `qa/prefinal-a-h-dev`.
3. Merge in order (resolve conflicts as needed): **Portal A+B+G → OG C+D → Intake E → Quota F3 → H** (or merge A–G first as already-reviewed package, then H).
4. Point local Studio + Functions emulator / `fresh-prints-dev` at that tip.
5. Run the DEV QA list above.
6. Keep **production**, App Hosting, Functions/Rules deploys, Studio 1.0.3 publish, and development→production sync **blocked** until owner issues separate production approval phrases.

Do **not** treat this Implementation Review as production merge/deploy approval.

---

## Verdict

**approved_with_notes**

H is **ready for development integration/QA** after the working tree is committed to the H branch. Not production-ready until DEV QA + index verify + separate owner production gates for A–G+H.

### Exact next phrases (DEV / later — not executed here)

- Commit H (owner/agent when asked): normal git commit request  
- Later DEV merge (example): owner-directed merge into DEV integration branch  
- Production: **no approval phrase provided or executed in this review**
