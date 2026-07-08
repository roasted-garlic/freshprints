# Test Report: Show Queue Timer + Calendar Picker

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Plans | `2026-07-07-show-queue-production-timer-plan.md`, `2026-07-07-show-calendar-picker-plan.md` |
| Test status | **passed** |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Studio typecheck | `npx tsc --noEmit` | PASS |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | PASS |
| Lint | `npm run lint` | PASS (0 warnings) |
| Unit tests (timer, calendar, capacity, past-show) | `npx tsx --test packages/shared/src/utils/showCalendarGrid.test.ts packages/shared/src/utils/showPrintTimer.test.ts packages/shared/src/utils/showCapacityDisplay.test.ts src/renderer/src/features/upcoming-shows/utils/groupShowsByUpcomingPast.test.ts` | PASS, 56/56 |
| Studio build | `npx vite build` | PASS (this session) |

## Deploy

| Item | Status |
|------|--------|
| `firestore:rules` to `fresh-prints-dev` | **User confirmed deployed** 2026-07-08 |

## Manual (required before final signoff approval)

| Test | Status |
|------|--------|
| Add to Show calendar: date select, slot auto-select, capacity bar | **PASS** (user 2026-07-08) |
| Past shows: read-only, PAST badge, not in picker | **PASS** (user 2026-07-08) |
| Start/Pause/Resume/Mark finished timer on upcoming show | **PASS** (user 2026-07-08) |
| Portal **Printing** tab when allocation `in_progress` | **PASS** (user 2026-07-08) |
| Sidebar nav order (Print Requests above AI Processing) | **PASS** (user 2026-07-08) |

## Notes

- Full repo `npx tsx --test` sweep not re-run this session; targeted suites cover changed areas.
- Portal `@fresh-prints/show-picker` wiring deferred until customer show-selection flow.
