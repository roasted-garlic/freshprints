# Test Report: Show calendar day markers

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Status | **passed_with_notes** |

## Commands

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit | `npx tsx --test .\packages\show-picker\src\getShowPickerDayMarker.test.ts` | 0 | PASS 6/6 |

## Notes

- Portal queue list is mostly upcoming; **full** markers will show often; **completed** mostly when those statuses appear in Studio (or rare portal cases).
- Optional visual smoke after hard refresh.

## Verdict

PASS — proceed to signoff.
