# Test Report: Studio Show Queue / Internal Sheet dollar totals

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Plan | docs/workflow/plans/2026-09-10-studio-show-queue-internal-sheet-dollar-totals-plan.md |
| Review | docs/workflow/reviews/2026-09-10-studio-show-queue-internal-sheet-dollar-totals-review.md |
| Status | **passed_with_notes** — automated helper tests pass; owner visual QA required |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Helper unit tests | `npx tsx --test apps/studio/src/renderer/src/features/upcoming-shows/utils/showAllocationDollarTotals.test.ts` | **6/6 pass**, exit 0 |
| Diff hygiene | `git diff --check` on touched Studio files | pass (LF/CRLF warning only on CSS) |

## Manual

Owner visual QA outstanding (see plan checkpoint). No Browser session used for interactive Studio smoke in this pass.

## Notes

- Pricing uses allocated-on-this-show quantities and `gangSheetSettings.settings.sectionPricing` via shared `calculateGangSheetCustomerSectionSummary`.
- No deploy, commit, or push.
