# Implementation Review: Portal show-schedule visibility + independent limit settings

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent of Implementation Agent) |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-show-schedule-and-limit-settings-plan.md` |
| Formal Review | `approved_with_changes` |
| Test Report | `docs/workflow/reviews/2026-07-31-production-portal-show-schedule-and-limit-settings-test-report.md` |
| Verdict | **approved** |

---

## Summary

Implementation matches the approved plan and Formal Review required changes: ownership-bounded schedule callables, batch ID cap, additive card/detail schedule UI, dual limit settings with linked defaults, and split enforcement paths. Automated checks passed. No Rules changes. Deploys remain gated.

---

## Checklist vs Formal Review required changes

| Requirement | Status |
|-------------|--------|
| Named batch `printRequestIds` cap + test | pass — `PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX` + validation tests |
| Server derives show IDs from owned allocations | pass — `getPortalPrintRequestShowSchedules` |
| Linked save persists equal numerics | pass — `parsePrintRequestLimitSettingsInput` + Studio section |
| Progress status chip unchanged; schedule additive | pass — card `scheduleLine` + progress panel list |
| ADR supersession + deploy checklist | pass — ADR-FP-102 amendment; checkpoint lists deploys |
| Linked equal-value compatibility test | pass — shared settings test |

---

## Security / privacy

- Customers cannot read `upcomingShows` via Rules; schedules only via Admin callables after ownership checks.
- Response fields omit title, Whatnot id/URL, capacity, notes, allocation ids in UI copy.
- Settings writes remain owner callable; no write permission added for customers.
- Missing show → `Schedule unavailable` without exposing show id.

---

## Gaps / follow-ups (not blocking source)

- Functions must be deployed before production schedule/limit server behavior activates.
- Portal App Hosting + Studio installer + owner settings save remain separate phrases.
- Manual owner QA after rollouts.

---

## Verdict

**approved** — proceed to development commit and protected production PR (source only).
