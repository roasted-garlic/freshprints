# Implementation Review: Portal Discover New This Week → `readyAt` (Case D)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Reviewer | Review Agent (Independent Implementation Review) |
| Plan | `docs/workflow/plans/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-review.md` |
| Test report | `docs/workflow/reviews/2026-08-06-portal-new-this-week-readyat-test-report.md` |
| Verdict | **APPROVED** |

---

## Diff verification

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Discover membership + ordering → `readyAt` | **pass** — `readyAfterMs` + `sortField: 'readyAt'`; `where('readyAt','>=',…)` |
| 2 | Home `rankNewThisWeek` → `readyAtMs` | **pass** — `resolveNewThisWeekReadyMillis` |
| 3 | Tests: old-import / new-approval | **pass** |
| 4 | Tests: new-import / stale-ready excluded | **pass** |
| 5 | Ordinary Library not unnecessarily changed | **pass** — default still `readyAt` without `readyAfterMs` |
| 6 | Metric Discover rails unchanged | **pass** |
| 7 | Other Home rails unchanged | **pass** — only `rankNewThisWeek` |
| 8 | No publisher / P4 source | **pass** — no `functions/` Case D edits |
| 9 | No Stage 1b / generated-search redesign | **pass** |
| 10 | Missing-`readyAt` compatibility documented | **pass** — see below |
| 11 | Assertions would fail pre-fix | **pass** — membership/order were `createdAt` |

---

## Missing-`readyAt` compatibility (intentional)

| Surface | Behavior |
|---------|----------|
| Discover Firestore (`readyAfterMs`) | `where('readyAt','>=',cutoff)` — docs **missing** `readyAt` are omitted by Firestore (cannot match inequality). Completeness/index **must not** demote to `createdAt` week semantics when `readyAfterMs` is set. |
| Home `rankNewThisWeek` | Key = `readyAtMs ?? createdAtMs` (same legacy contract as ready-order sort). Docs with neither timestamp excluded. |

---

## Scope confirmation

- No Rules / index / migration / deploy / merge / production in this pass.
- P4 rate-guard remains PASSING (untouched).
- PR #40 remains open/unmerged.

---

## Verdict

**APPROVED** — proceed to commit + push; stop for owner Manual QA.
