# Test Report: Studio Messages history modal

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-17-studio-message-history-plan.md |
| Implementation | session (uncommitted) |
| Overall | **passed_with_notes** |

---

## Summary

Shared unit tests for read/unread helpers pass (9/9). Studio `tsc --noEmit` still fails on pre-existing `ignoreDeprecations: "6.0"` (TS5103); override run shows **no errors** in Assisted Messages / assistedCreationHistory files. Owner manual QA **PASS** (2026-07-17): “I would call this PASS” for Studio Message history.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test "packages/shared/src/utils/assistedCreationHistory.test.ts"` | 0 | pass | 9 tests |
| Studio typecheck | `npx tsc --noEmit` (cwd `apps/studio`) | 2 | fail_documented | Pre-existing TS5103 on `ignoreDeprecations` |
| Studio typecheck (override) | `npx tsc --noEmit --ignoreDeprecations 5.0` filtered for AssistedMessages / assistedCreationHistory | 2 (unrelated) | pass for in-scope files | No matches for changed paths |
| Lint | skipped | — | skip | Narrow UX; unit + type filter sufficient |
| Build | skipped | — | skip | Renderer-only; plan does not require |
| Integration / E2E | skipped | — | skip | N/A |
| Backend/rules | skipped | — | skip | No backend changes |

---

## Failures (if any)

### Studio tsconfig ignoreDeprecations (pre-existing)

- **Command:** `npx tsc --noEmit` from `apps/studio`
- **Output excerpt:**
```
tsconfig.json(22,27): error TS5103: Invalid value for '--ignoreDeprecations'.
```
- **In scope to fix:** no
- **Action taken:** Documented; verified changed files clean via override + path filter (same pattern as prior Studio phases).

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Lint | Not required for this narrow UX phase; no new deps |
| Full Studio Vite build | Renderer CSS/UI only; type filter + unit tests cover logic |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Unread dropdown + Message history modal + deep-link | **PASS** | Owner 2026-07-17: “I would call this PASS” |

Manual test instructions: `docs/workflow/reviews/2026-07-17-studio-message-history-manual-qa.md`

---

## Recommendations

- Align Studio `ignoreDeprecations` with installed TypeScript in a separate tooling phase (known debt).

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending
- [x] Ready for signoff phase

**Next step:** signoff-phase
