# Production maintenance-mode prerequisite — amendment Test Report

**Date:** 2026-09-10<br>
**Goal:** `production-maintenance-mode-prerequisite`<br>
**Environment:** local source plus DEV Rules emulators<br>
**Production:** untouched

## Required validation

| Check | Result |
|---|---|
| Targeted shared/Functions/Portal/Admin contracts | **PASS — 16/16** (`tsx --test` across shared constants, trusted helper, Portal maintenance contract, and Admin Show Queue contract) |
| Trusted tester validation integration | **PASS — 2/2** under the Firestore emulator; unlinked/inactive/deleted/disabled/guest targets reject, active linked target saves, and clearing removes the field immediately |
| Firestore + Storage Rules emulator regression | **PASS — 182/182**, 22 suites, including tester, clear, ordinary-customer, guest, and Assisted Creation pending Storage cases |
| Portal typecheck | **PASS** — `npm run typecheck --workspace @fresh-prints/portal` |
| Functions build | **PASS** — `npm run build` in `functions` |
| Changed-source ESLint | **PASS** — explicit amendment file allowlist, zero warnings/errors |
| `git diff --check` | **PASS** — no whitespace errors (Git only emitted normal LF/CRLF warnings) |
| Studio validation | **Known baseline** — project typecheck reports 25 existing unrelated diagnostics; none reference the amendment files. The new maintenance selector type errors were fixed and no longer appear. |
| Portal production build | **Known existing Windows blocker** — `next build` fails opening `apps/portal/.next/trace` with `EPERM` while the existing dev process owns the build output; not caused by this amendment. |

## Security/behavior evidence

- Shared tests prove OFF with/without a tester remains normal, ON grants only the configured caller,
  different/unconfigured callers remain blocked, and the public projection contains no UID.
- The trusted resolver integration test caught and fixed an invalid Firestore `FieldValue.delete()`
  use in non-merge `set()`; replacement writes now omit cleared optional fields and the corrected
  `updatePortalMaintenanceState` revision was redeployed to DEV.
- Rules tests prove owner/admin control remains callable-only, direct client writes remain denied,
  ordinary customers and guests remain denied while ON, and the configured tester can use only the
  existing mutation path.
- The full-screen branch returns before customer providers/navigation/page children mount.
- The Admin contract proves existing authorization/redirect behavior and static Access denied copy.

## Test conclusion

All amendment-specific automated gates passed. The only recorded failures are the documented Studio
baseline diagnostics and the existing Windows Portal `.next/trace` EPERM condition.
