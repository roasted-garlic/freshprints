# Test Report: Remediation r6 — Portal UX polish + past show calendar

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Result | **passed_with_notes** (automated + deploy); awaiting manual |

## Automated

| Check | Exit | Notes |
|-------|------|-------|
| `npx tsx --test packages/show-picker/src/getDefaultShowPickerOptionId.test.ts packages/show-picker/src/getShowPickerDayMarker.test.ts` | 0 | 14 pass |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | Pass |
| `npm --prefix functions run build` | 0 | Pass |
| Studio `tsc --noEmit` | 2 | Pre-existing errors unrelated to AddToShowModal (print-request designId, staff-inbox, audit trail) |

## Deploy (fresh-prints-dev)

| Target | Result |
|--------|--------|
| `listPortalAllocatableShows` | updated |

## Manual

See `docs/workflow/reviews/2026-07-12-portal-ux-polish-r6-manual-checkpoint.md`
