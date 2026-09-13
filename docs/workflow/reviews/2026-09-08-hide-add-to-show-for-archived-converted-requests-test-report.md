# Test Report: Hide Add to Show for archived / converted print requests

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-08-hide-add-to-show-for-archived-converted-requests-plan.md |
| Implementation | session (uncommitted) |
| Overall | **passed** |

---

## Summary

Add-to-Show gate: owner DEV **PASS** (2026-09-08). Amendment: hide Working queue-state badge when archived — implemented; focused tests re-run. Combined owner UI verify pending for both behaviors.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit / contract (gate) | `npx tsx --test` printRequestConversion + AddToShow + upcomingShow contracts | 0 | pass | 14/14 earlier |
| Unit / contract (amendment) | `npx tsx --test` printRequestConversion + printRequestQueueBadge + contracts | 0 | pass | 16/16 |
| Typecheck | `npx tsc --noEmit` (studio) | 2 | fail (pre-existing) | Unrelated; none in touched files |
| Lint / build | — | — | skip | Manual DEV reload |

---

## Manual Tests

| ID | Steps | Expected | Result |
|----|-------|----------|--------|
| M1 | Open archived converted customer request | **Add to Show** absent | **PASS** (owner 2026-09-08) |
| M2 | Open linked internal request | Internal Gangsheet CTA when eligible | **PASS** (owner 2026-09-08) |
| M3 | Open normal working customer request | **Add to Show** works | **PASS** (owner 2026-09-08) |
| M4 | Open archived converted request | No **Working** (or other queue-state) pill; **ARCHIVED** status remains | **PASS** (owner 2026-09-08) |
| M5 | Open normal working customer request | **Working** (or correct queue pill) still shows | **PASS** (owner 2026-09-08) |

---

## Signoff Readiness

- [x] Manual M1–M5 complete (owner combined **PASS**)
- [x] Ready for signoff: yes

**Overall:** **passed** (owner combined PASS 2026-09-08)
