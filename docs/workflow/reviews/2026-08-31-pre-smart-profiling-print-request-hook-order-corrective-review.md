# Corrective Review: PrintRequestDetailView React Hook Order

| Field | Value |
|-------|-------|
| Date | 2026-08-31 |
| Goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| Type | Owner QA blocker corrective (WS1 Portal) |
| Verdict | **approved** |
| Deploy | **NOT PERFORMED** |

---

## Root cause

`handleUnqueueFromShow` was declared with `useCallback` **after** the component's `if (isLoading)` and `if (error || !printRequest)` early returns.

Initial render exited at loading (fewer hooks). Loaded render reached the new `useCallback` → React hook order violation.

---

## Fix

- Moved `handleUnqueueFromShow` and `canShowUnqueueFromShowCta` derivation **above** all early returns.
- Extracted `resolveCanShowUnqueueFromShowCta` pure helper for focused tests.
- Added static hook-order contract test to prevent regression.

---

## Verification

| Check | Result |
|-------|--------|
| Hook-order contract test | pass |
| Unqueue CTA visibility tests | 4/4 pass |
| WS1 server/callable behavior | unchanged |
| Unrelated files | not modified (except prior permissions fix in same session) |

---

## Verdict

**approved** — narrow Portal render corrective; owner may re-run queued-request QA before DEV deploy authorization.
