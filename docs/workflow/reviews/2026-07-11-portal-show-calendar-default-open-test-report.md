# Test Report: Portal show calendar defaults to next open show

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Plan | docs/workflow/plans/2026-07-11-portal-show-calendar-default-open-plan.md |
| Status | **passed_with_notes** |

---

## Commands Run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit | `npx tsx --test .\packages\show-picker\src\getDefaultShowPickerOptionId.test.ts` | 0 | PASS (6/6) |

## Skipped

| Check | Why |
|-------|-----|
| Full portal typecheck / lint / build | Narrow pure-helper + one modal call site; unit coverage owns selection logic |
| E2E | No E2E harness for this flow |

## Notes

- Optional manual smoke: open queue-to-show when soonest show is full; calendar should land on next open / fitting show.
- Confirm remains capacity-gated when all shows are full (selects first but confirm disabled via existing message).

## Verdict

Automated required checks for this scope **PASS**. Proceed to signoff; light manual smoke optional.
