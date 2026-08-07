# Signoff: Portal Discover New This Week → `readyAt` (Case D)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-plan.md` |
| Review | Formal: `docs/workflow/reviews/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-review.md`; Impl: `docs/workflow/reviews/2026-08-06-portal-new-this-week-readyat-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-08-06-portal-new-this-week-readyat-test-report.md` |
| Manual QA | `docs/workflow/reviews/2026-08-06-portal-new-this-week-readyat-manual-qa.md` |
| Commit | `f9bc19c` (`fix(portal): order new-this-week by ready time`) |
| Branch / PR | `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, **unmerged**) |
| Final status | **approved** |

---

## Summary

Customer-facing **New This Week** now means newly approved / newly ready for customers: Discover Library (`?discover=new`) uses Firestore **`readyAt`** for both the 7-day membership window and newest-first order; Home **New This Week** uses shared **`rankNewThisWeek`** on **`readyAtMs`**. Owner QA **PASS**. No App Hosting / Functions deploy was required for this local Portal QA against `fresh-prints-dev`.

Does **not** reopen Amendment 9 P4 implementation. Does **not** start Stage 1b or P3. No production merge/deploy.

---

## Changes Delivered

### Behavior
- Discover → New This Week: `readyAfterMs` → `where('readyAt','>=',…)` + `orderBy(readyAt desc)` + `__name__` tie-breaker
- Home → New This Week: membership/order via `readyAtMs` (`readyAtMs ?? createdAtMs` legacy key only)
- Old-import / recent-approval designs correctly appear as new
- Ordinary Library / category / single-tag unchanged
- Metric Discover rails unchanged
- Search / multi-tag / facets unchanged

### Key commit
- `f9bc19c` — already on PR #40

### Out of scope (unchanged)
- P4 rate-guard / publisher (separate Signoff)
- Stage 1b / P3 / generated-search redesign / snapshot retirement

---

## Tests

### Automated
- Focused Case D + containment suites: **35/35 pass**
- Studio ready-order suites: **23/23 pass**
- Portal typecheck: exit 0
- Repo lint: exit 0
- `git diff --check`: exit 0
- Portal `next build`: **failed_documented** (concurrent `dev:portal` `.next` lock); typecheck green

### Manual
- Owner QA: **PASS** (2026-08-06)
- No deploy required for local Portal QA

---

## Human checkpoints

| Item | Result |
|------|--------|
| Manual New This Week QA | **PASS** |
| Production deploy | Not requested / not performed |
| PR merge | Not performed — PR #40 remains open |

---

## Risks / follow-ups

- None blocking this corrective. Generated search/facet architecture and remaining publication C+T+R cost tracked under Amendment 9 P4 notes / later Stage 1b work.

---

## Final status

**approved**
