# Test Report: Cap B remove-first (no choose-prints split)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Plan | docs/workflow/plans/2026-07-19-cap-b-remove-first-no-split-plan.md |
| Review | docs/workflow/reviews/2026-07-19-cap-b-remove-first-no-split-review.md |
| Status | **passed_with_notes** (automated pass; manual QA pending) |

---

## Automated

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Unit | `npx tsx --test` on portalShowQueueFit, dailyDesignLimit, perShowCap, showCapacity, queue validation | 0 | 36 tests pass |
| Functions build | `npm --prefix functions run build` | 0 | |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | |
| Deploy | `firebase deploy --only functions:queuePortalPrintRequestToShow,functions:listPortalAllocatableShows --project fresh-prints-dev` | 0 | Marker `cap-b-remove-first-v1` |

## Manual

See `docs/workflow/reviews/2026-07-19-cap-b-remove-first-no-split-manual-qa.md`.

## Notes

- Prior Cap B split allotment bug phase is superseded; no 25+25 partial-queue re-test.
- Soft-reload Portal before QA so remove-first UI loads.
