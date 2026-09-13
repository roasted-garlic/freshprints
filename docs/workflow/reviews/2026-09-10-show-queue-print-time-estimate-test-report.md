# Test Report: Show Queue / Internal Sheet print-time estimate

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Plan | `docs/workflow/plans/2026-09-10-show-queue-print-time-estimate-plan.md` |
| Status | **passed_with_notes** — automated pass; owner visual QA pending |

---

## Commands run

```bash
npx tsx --test packages/shared/src/utils/gangSheetEfficiencyLayout.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueueGlanceStats.test.ts
```

**Result:** 7/7 pass (exit 0)

| Suite | Tests |
|-------|-------|
| `planEfficiencyGangSheetLayout` | interleave, multi-sheet, `totalSheetHeightPx` sum |
| `showQueueGlanceStats` | sheet counts + linear inches, formatter `12m 32s · 94 in`, glance label, null when empty |

## Skipped

- Full Studio typecheck / build — not required for this narrow utils+UI polish; no Functions/Rules.
- E2E — covered by owner visual QA checkpoint.

## Manual

See `docs/workflow/reviews/2026-09-10-show-queue-print-time-estimate-visual-qa.md` — **pending**.
