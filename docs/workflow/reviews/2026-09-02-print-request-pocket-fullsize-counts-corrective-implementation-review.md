# Implementation Review (corrective): Pocket / Full Size width-only + scroll

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Correction record | docs/workflow/reviews/2026-09-02-print-request-pocket-fullsize-counts-owner-qa-correction.md |
| Prior Owner QA | **FAIL** |
| Verdict | **approved** (corrective) |

---

## Summary

Owner QA corrections applied: (1) width-only operational counts via dedicated `resolvePrintRequestPocketFullSizeCounts`, (2) one compact pill `Pocket N · Full Size M` on PR list/detail, (3) removed nested `.print-requests-main` vertical scroll. Pricing/weight classifier unchanged. History regressions green. Owner fixture **Pocket 10 / Full Size 3** covered by unit test.

---

## Confirmation checklist

| Requirement | Status |
|-------------|--------|
| Count is WIDTH-ONLY | **pass** |
| Total is PRINT QUANTITY | **pass** |
| Owner fixture Pocket 10 / Full Size 3 | **pass** |
| Cutoff not hardcoded | **pass** |
| Show / Internal cutoffs correct | **pass** |
| Pricing/weight classifier unchanged | **pass** |
| One compact pill on PR list + detail | **pass** |
| Show/Internal cards compact one-line | **pass** |
| Nested request-detail scrollbar removed | **pass** |
| Outer-scroll-only restored | **pass** |
| History/Past/Upcoming sorting unchanged | **pass** |
| No backend / Rules / indexes / migration | **pass** |

---

## Nested scrollbar root cause (git audit)

**Cause:** `.print-requests-main` already had (pre-amendment, in HEAD):

- `max-height: calc(100vh - var(--topbar-height) - var(--space-8));`
- `overflow-y: auto;`

Amendment size-class CSS did **not** introduce those properties. Owner QA made the nested scrollbar unacceptable; corrective pass removes them so vertical navigation uses the outer page/shell scroll only. Left rail list retains its own `overflow-y: auto` (list pane only).

**Fix:** `.print-requests-main` reduced to `min-height: 0` with no nested overflow/max-height. Contract test asserts no `overflow-y: auto` / viewport max-height on `.print-requests-main` rules.

---

## Next Step

Owner QA re-check (A–E). Do not signoff/commit/push/deploy until PASS.
