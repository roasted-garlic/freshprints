# Implementation Review: Studio Design Library archive / restore / companion Load More

| Field | Value |
|-------|-------|
| Date | 2026-08-14 (updated — final promotion package after owner overall QA PASS) |
| Reviewer | Implementation Review |
| Plan | docs/workflow/plans/2026-08-14-studio-design-library-archive-restore-reconciliation-plan.md |
| Formal Review | docs/workflow/reviews/2026-08-14-studio-design-library-archive-restore-reconciliation-review.md |
| Verdict | **approved_with_notes** |

---

## Summary

Owner overall QA **PASS** (A/B/C/D including D1/D2 corrective). Final promotion package includes Defects A–D Studio source, Restore Rules, Companion Firestore indexes, D1/D2 query/cache identity fix, and owner-approved Studio default window minimum **1656×1032** (`studioWindowConstraints.ts`). No Portal/Functions/Storage/schema/Algolia B3/Phase 9. Production still untouched at review time; promotion is PR-gated.

---

## Root causes (proven)

### D1 — Load More when nothing more exists

`companionSetIncomplete` was omitted from `useDesigns` query identity. Needs Companion ON still used the **ordinary ready** list query identity, so the UI kept paging the full ready catalog while client/server filter semantics diverged. `hasMore` therefore reflected the **ready** pageSize+1 result (often true) even when the companion result set was empty or tiny. One extra Load More click eventually exhausted the ready cursor and hid the button — not because hasMore started optimistic-true, and not because pageSize+1 was missing (service already uses `limit(pageSize+1)` / `hasMore = returnedCount > pageSize`).

### D2 — Needs Companion OFF leaves ready library empty

Same identity gap: toggle OFF did **not** change `listQueryKey`, so `useDesigns` did not reset cursor / refetch ordinary ready. Service page/count cache keys also omitted `companionSetIncomplete`, so companion and ready pages could share the 15s cache. Empty companion state could stick (or a stale companion-shaped cache entry could serve) after OFF.

---

## Corrective strategy

| Area | Strategy |
|------|----------|
| Pagination | Existing bounded contract kept: request `pageSize + 1`, render `pageSize`, `hasMore = returnedCount > pageSize` (`buildDesignListPageHasMore` + `designService`) |
| Filter transition / cache | Shared pure identity util: `serializeDesignListQueryKey` (hook reload) and `getDesignListQueryCacheKey` (page/count cache) both include `companionSetIncomplete`. Toggle ON/OFF changes key → cursor cleared → fresh fetch. Generation + query-key guards reject stale in-flight companion responses after OFF. Distinct cache keys prevent companion pages overwriting ready cache. |

---

## Files changed (this corrective)

- `apps/studio/src/renderer/src/features/designs/utils/designListQueryIdentity.ts` (new)
- `apps/studio/src/renderer/src/features/designs/utils/designListPageHasMore.ts` (new)
- `apps/studio/src/renderer/src/features/designs/utils/needsCompanionPagination.contract.test.ts` (new)
- `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts`
- `apps/studio/src/renderer/src/features/designs/services/designService.ts`
- `apps/studio/src/renderer/src/features/designs/pages/designLibraryArchiveRestoreReconciliation.contract.test.ts` (identity assertion update)

Prior A–D implementation files (DesignLibraryPage, filters, Rules, indexes, etc.) unchanged in this corrective pass.

---

## Re-verification (D1/D2 corrective)

| Check | Result |
|-------|--------|
| Focused companion pagination + archive reconciliation contract tests | PASS (17/17) |
| Studio typecheck (`tsc --noEmit`) | PASS |
| Studio build (`npm run build` / vite + electron-builder) | PASS |
| Lint (root eslint on changed design files) | PASS |
| `git diff --check` | PASS |
| Firebase deploy | **Not performed / not required** |

---

## Final package notes (owner overall PASS)

| Item | Status |
|------|--------|
| Defect A | PASS — ready hard-delete checkboxes removed |
| Defect B | PASS — archived purge local reconcile |
| Defect C | PASS after DEV Rules deploy |
| Defect D / D1+D2 | PASS after Companion identity corrective |
| Window min size | 1656×1032 included in final source |
| DEV Rules + indexes | Deployed to `fresh-prints-dev` (2026-08-14) |
| Production | Untouched until protected PR + deploy checkpoints |

## Notes / gates

1. Algolia + Needs Companion residual remains out of scope.
2. Rules emulator suite still not run (Java missing) — do not fabricate PASS.
3. Production Firebase scope for promotion is **only** `firestore:rules,firestore:indexes` on `fresh-prints-prod` after explicit approval.
4. Production Studio release must use exact promoted production SHA and production Firebase config.

---

## Verdict rationale

**approved_with_notes** — owner overall QA PASS; final source package reviewed for promotion; Rules emulator unavailable locally (Java); production deploy/release remain human-gated.
