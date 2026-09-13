# Implementation Review: Design Library → Reprocess with AI

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Implementation / Test Agent |
| Plan | `docs/workflow/plans/2026-09-04-design-library-ai-processing-reprocess-plan.md` |
| Formal Review | `approved_with_changes` |
| Owner decisions | Incorporated (category on Approve; retain roots; preserve readyAt; label; confirm UX) |
| Verdict | **approved_with_notes** |

---

## Summary

Owner-only **Reprocess with AI** is implemented end-to-end in source: Design Details confirm → callable `reprocessReadyDesignWithAi` demotes Ready→imported/pending without wiping Smart Profile, runs queue enrichment with staff/preset merge, retains root title/description/category and `readyAt`. Approve path stamps `readyAt` only when missing. **DEV deploy not performed.**

---

## IR checklist

| # | Item | Result |
|---|------|--------|
| 1 | Verdict | **approved_with_notes** |
| 2 | Exact files changed | See below |
| 3 | Callable | `reprocessReadyDesignWithAi` |
| 4 | Server auth | Active **owner** only |
| 5 | Lifecycle eligibility | `ready` + `aiReviewStatus=approved` only |
| 6 | Duplicate handling | Rejects imported+pending / processing / active non-stale stage |
| 7 | Studio surface | Design Details (Design Library) |
| 8 | Button label | **Reprocess with AI** |
| 9 | Confirmation UX | Modal with consequences |
| 10 | Typed phrase | **NO** |
| 11–13 | Root title/desc/category on demotion | **Retained** |
| 14 | Category on Approve | Normal AI Review draft → Approve applies reviewed category |
| 15 | readyAt preservation | Demotion does not clear `readyAt`; Approve stamps only if `readyAt == null` |
| 16 | Audit metadata | `lastOwnerAiReprocessAt`, `lastOwnerAiReprocessBy` |
| 17 | Public visibility | Leaves Ready → not in Design Library / Portal Ready |
| 18 | Algolia | Existing status sync deletes when not Ready (no settings change) |
| 19 | Print Request refs | Untouched (IDs retained; new adds blocked while not Ready) |
| 20 | Staff SP | Demotion keeps `smartProfile`; queue write uses `mergeReadyBackfillSmartProfile` when prior exists |
| 21 | Presets | `smartProfileImportPresets` retained + merged |
| 22 | Halftone/bg | Preserved (not in demotion write) |
| 23 | Artwork/storage | Paths preserved |
| 24–25 | Taxonomy | Live Firestore + revision-aware materialization (no hardcodes) |
| 26 | Enqueue path | `runAiEnrichmentPipeline(..., { mode: "queue" })` |
| 27–28 | Failure / retry | Demotion sticks; pipeline failure → recoverable Processing/failed; retry via existing AI Review |
| 29 | Single-design only | **YES** |
| 30 | Functions tests | PASS (core + contract) |
| 31 | Studio tests | PASS (contract + readyOrder) |
| 32 | AI regressions | PASS (resolver + quality contract) |
| 33 | Functions build | PASS |
| 34 | Studio typecheck | Touched paths clean (full Studio tsc has pre-existing debt) |
| 35 | Lint | PASS on touched files (after fix) |
| 36 | diff-check | PASS (LF warnings only) |
| 37–39 | Rules / indexes / migration | **None** |
| 40 | DEV deploy inventory | `reprocessReadyDesignWithAi` (+ pipeline if not already live) — **not deployed this session** |
| 41 | Manual QA readiness | Checklist ready; awaits owner DEV deploy auth |
| 42 | WS4 status | **PASS WITH NOTES** (taxonomy retest #5/#6/#15 pending deploy+QA) |
| 43 | WS5 readiness | **Blocked** |
| 44 | [NEEDS OWNER DECISION] | **None blocking** — deploy authorization next |

---

## Files changed (this feature)

**Created**

- `functions/src/reprocessReadyDesignWithAi.ts`
- `functions/src/ai/reprocessReadyDesignWithAiCore.ts`
- `functions/src/ai/reprocessReadyDesignWithAiCore.test.ts`
- `functions/src/reprocessReadyDesignWithAi.contract.test.ts`
- `apps/studio/.../designReprocessWithAiService.ts`
- `apps/studio/.../ReprocessReadyDesignWithAiConfirmDialog.tsx`
- `apps/studio/.../reprocessReadyDesignWithAi.contract.test.ts`

**Modified**

- `functions/src/index.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `apps/studio/.../DesignDetailsModal.tsx`
- `apps/studio/.../DesignLibraryPage.tsx`
- `apps/studio/.../designService.ts` (readyAt stamp if missing)
- `apps/studio/.../readyOrder.test.ts`
- `apps/studio/.../permissionService.ts`
- `docs/project/DECISIONS.md` (ADR-FP-164)
- `docs/standards/TESTING.md`

---

## Manual QA checklist (after DEV deploy)

1. Owner: Design Details → Reprocess with AI → confirm → leaves Library → Processing → Needs Review  
2. Admin/helper: button hidden / callable denied  
3. Staff-edited Ready (Jimothy): staff dimensions survive  
4. Preset Dolly designs: seed survives  
5. Approve #5/#6/#15 → expect **Inspirational Quotes & Affirmations**; `readyAt` unchanged  
6. Faith / Music / Pop regressions  
7. Reject path still valid  
8. Algolia absent while demoted; present after Approve  

---

## Notes

- No deploy, no WS5, no Autonomous, no commit/push.
- Autonomous still OFF; category hardcoding avoided.
