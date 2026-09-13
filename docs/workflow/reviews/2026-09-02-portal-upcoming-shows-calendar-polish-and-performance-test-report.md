# Test Report: Portal Upcoming Shows calendar polish + performance

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-plan.md |
| Implementation | Portal shell-first + today hierarchy + soft upcoming CSS + cache snapshot |
| Overall | **passed_with_notes** |

---

## Summary

Final closeout regression: **29/29** focused tests PASS. Portal `tsc --noEmit` still fails only on **pre-existing** unrelated `catalogService.ts` interactive-enhance typing (out of scope). Owner QA **PASS** on local DEV Portal. No Functions/Rules/index changes.

---

## Commands Run (final)

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit/contract | `npx tsx --test` shellFirst + aria + cache + showCalendarGrid | 0 | **pass** | 29 tests |
| Portal typecheck | `npm run typecheck` in `apps/portal` | 2 | **fail (pre-existing)** | `interactiveEnhanced*` on `DesignDocumentData` only |
| Functions / Rules / Build | — | — | skip | No infra/release this goal |

---

## Failures

### Portal typecheck — pre-existing catalog enhance fields

- **In scope to fix:** no  
- **Action:** Documented; no goal-scoped TS errors in touched files

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner QA (shell-first + visual hierarchy) | **PASS** | local DEV Portal; not production |

Manual record: `docs/workflow/reviews/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-owner-qa.md`

---

## Signoff Readiness

- [x] Automated goal tests pass OR failures documented
- [x] Manual Owner QA PASS
- [x] Ready for signoff phase
