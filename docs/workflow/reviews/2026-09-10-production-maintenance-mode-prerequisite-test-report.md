# Production Maintenance-Mode Prerequisite — Test Report

**Date:** 2026-09-10<br>
**Goal:** `production-maintenance-mode-prerequisite`<br>
**Phase:** Test complete; stopped before the required owner DEV-QA checkpoint<br>
**Production:** untouched; no deployment or setting mutation performed

## Automated results

| Check | Result |
|---|---|
| Shared maintenance constants | **PASS** — 3/3 subtests |
| Frozen-source callable/Rules/UX contract | **PASS** — 3/3 tests |
| Portal typecheck (`npm run typecheck --workspace @fresh-prints/portal`) | **PASS** |
| Functions build (`npm run build --prefix functions`) | **PASS** |
| Changed-source ESLint (`npx eslint … --max-warnings 0`) | **PASS** |
| Full Firebase Rules regression (`npm run test:rules`) | **PASS** — 179/179 tests across 24 suites |
| Maintenance Firestore/Storage Rules fixture | **PASS** — 5/5 tests |

The full Rules run emits the repository’s existing expression-budget/deprecation warning traces for
denied paths, but exits successfully and all expected-deny assertions pass. The allowed absent/OFF
maintenance fixture passes the affected customer-write paths without an expression-budget failure.

## Additional verification notes

- Firestore coverage proves missing/OFF allows representative profile, favorite, request, item, and
  notification writes; ON denies all five; malformed `enabled` denies; owner/admin private read is
  preserved; customer, helper, and owner direct setting writes are denied.
- Storage coverage proves customer source upload is allowed with missing state and denied when ON.
- The contract test mechanically checks every frozen customer-mutation Function source file for
  `assertPortalMaintenanceAllowsCustomerMutation`, the callable exports, private settings Rules,
  owner/admin control, server-authored audit fields, bounded refresh, and staff Storage gates.
- `npx tsc --noEmit -p apps/studio/tsconfig.json` was run and remains **blocked by unrelated
  pre-existing errors** in `electron/ipc/import/pngValidator.ts`, artwork-enhance tracing, staff
  inbox/upcoming-shows unused imports, and shared test fixtures; no maintenance file is named in
  those diagnostics.
- `npm run build --workspace @fresh-prints/portal` was attempted and is **environment-blocked** by
  `EPERM` opening `apps/portal/.next/trace` while the existing Portal dev server owns the `.next`
  build output. Portal typecheck and changed-file lint remain clean.

## DEV and production boundary

No DEV deployment was required for the automated checks. No Firebase Functions, Firestore Rules,
Storage Rules, Portal hosting, Studio publication, production settings, or production maintenance
activation was performed.

## Owner DEV-QA checkpoint (next action)

Use the established DEV environment only:

1. With maintenance **OFF**, verify one normal Portal customer mutation (for example, change a
   notification preference or resize a working request item).
2. In Studio Settings → Portal maintenance, enable **ON** with a short customer-safe message.
3. Confirm a guest and an already-loaded customer converge to the branded read-only experience;
   confirm a representative customer mutation is blocked.
4. Confirm owner/admin recovery and `/admin/show-queue` remain usable.
5. Disable maintenance in Studio.
6. Refresh or refocus the Portal and confirm it converges back to normal; repeat the representative
   safe mutation successfully.

Do not deploy to or mutate `fresh-prints-prod`, activate a production maintenance window, freeze the
parent release candidate, or begin the parent coordinated rollout during this checkpoint.
