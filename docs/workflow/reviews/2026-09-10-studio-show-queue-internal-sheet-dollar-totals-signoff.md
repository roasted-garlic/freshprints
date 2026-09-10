# Signoff: Studio Show Queue / Internal Sheet dollar totals

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-09-10-studio-show-queue-internal-sheet-dollar-totals-plan.md |
| Review | docs/workflow/reviews/2026-09-10-studio-show-queue-internal-sheet-dollar-totals-review.md |
| Test report | docs/workflow/reviews/2026-09-10-studio-show-queue-internal-sheet-dollar-totals-test-report.md |
| Final status | **approved** |

---

## Summary

Studio polish (orthogonal to paused maintenance prerequisite): Show Queue and Internal Sheet surfaces show per-PR and glance dollar/sheet stats from existing gang-sheet pricing; rail cards show `$` totals; CR/IR Print Request list cards show `$` totals; owner visual QA **PASS**.

---

## Changes Delivered

### Behavior

- Attached PR rows on Show Queue / Internal Sheets show `$` from active allocations.
- Selected show/sheet glance stats: Total `$`, PR count, print qty, designs, Standard / Grouped by Customer / Sheet per Customer sheet estimates, size mix pills (`P x N` …).
- Left-rail show/sheet cards show `$` total (bottom-right) with subtle border.
- CR/IR Print Requests list cards show `$` pill beside designs/qty.
- Whatnot link removed from detail header; Whatnot ID shown instead.
- Sheet counts estimated sync from allocation print sizes (no artwork fetch).

### Files Created

- `apps/studio/.../utils/showAllocationDollarTotals.ts` (+ test)
- `apps/studio/.../utils/showQueueGlanceStats.ts` (+ test)
- `apps/studio/.../hooks/useShowRailDollarTotals.ts`
- Plan / review / test report / this signoff under `docs/workflow/`

### Files Modified

- `UpcomingShowsPage.tsx`, `useExportGangSheetPng.ts`
- `PrintRequestsPage.tsx`
- `show-queue.css`, `print-requests.css`
- Workflow state + ChatGPT handoff CURRENT-STATE / NEXT-PLANNED-GOAL

### Documentation Updated

- Workflow plan/review/test/signoff for this polish
- FreshForge state and handoff snapshots

---

## Tests

### Automated

- `npx tsx --test` showAllocationDollarTotals + showQueueGlanceStats: **8/8 pass**

### Manual

| Checkpoint | Result |
|------------|--------|
| Owner visual QA (Show Queue / Internal / CR-IR cards / glance stats) | **PASS** (2026-09-10) |

### Human approvals

- Owner authorized commit/push of this polish after PASS

---

## Risks and Follow-ups

- Rail `$` totals use one-shot allocation fetches for visible shows; selected show overridden by live subscription totals.
- Sheet counts are packing estimates (may differ slightly from final PNG if artwork aspect differs); acceptable for glance.
- Maintenance prerequisite remains Formal Review complete; Implement still requires owner acceptance + `Continue FreshForge`.

---

## Final Status

**approved** — polish closed; resume maintenance prerequisite when owner ready.
