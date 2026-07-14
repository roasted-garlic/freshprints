# Test Report: Helper permission restrictions

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-14-helper-permission-restrictions-plan.md |
| Review | docs/workflow/reviews/2026-07-14-helper-permission-restrictions-review.md |
| Overall | **passed** |

---

## Summary

Permission unit tests passed (7). Studio `tsc` fails on pre-existing `ignoreDeprecations: "6.0"` (TS5103), unrelated to this change. Owner manual role UI check: **PASS** (2026-07-14).

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test …/permissionService.helperRestrictions.test.ts …/permissionService.aiReview.test.ts` (apps/studio) | 0 | pass | 7 tests |
| Typecheck | `npx tsc --noEmit -p tsconfig.json` (apps/studio) | 2 | failed_documented | Pre-existing TS5103 on ignoreDeprecations |
| Lint | ReadLints on touched files | — | pass | No issues |
| Build | — | — | skip | Not required by plan |
| Integration | — | — | skip | N/A |
| E2E | — | — | skip | N/A |
| Backend/rules | — | — | skip | No rules/functions change |

---

## Failures (if any)

### Studio tsc ignoreDeprecations

- **Command:** `npx tsc --noEmit -p tsconfig.json`
- **Output excerpt:**
```
tsconfig.json(22,27): error TS5103: Invalid value for '--ignoreDeprecations'.
```
- **In scope to fix:** no
- **Action taken:** Documented; not introduced by this phase

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Build | Plan did not require |
| Rules deploy | No rules change |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Helper: no Import Shows | **PASS** | Owner 2026-07-14 |
| Helper: no Dev Tools | **PASS** | Owner 2026-07-14 |
| Admin: no Dev Tools | **PASS** | Owner 2026-07-14 |
| Owner: Dev Tools (dev); admin/owner Import + Restore | **PASS** | Owner 2026-07-14 |

### Manual Test Checkpoint

**Feature / area:** Helper / admin Studio permissions  
**Result:** **PASS** — owner reply 2026-07-14

#### Pass criteria

- [x] Helper: no Import Shows  
- [x] Helper: no Dev Tools  
- [x] Admin: no Dev Tools  
- [x] Helper: can archive; cannot restore  
- [x] Owner: Dev Tools (dev); admin/owner keep Import Shows + Restore  

---

## Recommendations

- Optional follow-up: fix Studio `ignoreDeprecations` / TypeScript version mismatch so `tsc` is usable again.

---

## Signoff Readiness

- [x] Required automated checks pass OR failures documented  
- [x] Manual tests complete OR checkpoint pending  
- [x] Ready for signoff phase  

**Next step:** signoff-phase
