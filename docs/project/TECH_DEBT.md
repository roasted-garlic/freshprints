# Technical Debt Register — Fresh Prints

**Last reviewed:** 2026-06-24 (Existing Project Intake)

---

## How to Use

See field definitions in template. Fixes require approved Managed Phases — **not** implemented during intake.

---

## Active Items

| ID | Issue | Category | Severity | Location | Why it matters | Recommended fix | Suggested phase | Status |
|----|-------|----------|----------|----------|----------------|-----------------|-----------------|--------|
| TD-001 | Generated build artifacts tracked in git | deployment | **high** | `release/`, `dist-electron/`, `build/icon.*` | Bloated repo, slow clones | Added to `.gitignore`; `git rm --cached` | `git-generated-output-cleanup` | **resolved** |
| TD-002 | Unit tests exist but no `npm test` script | testing | medium | 13 `*.test.ts` files; root `package.json` | Tests cannot run in CI or signoff workflow | Add vitest or node:test runner; `npm test` script | `testing-and-ci-bootstrap` | open |
| TD-003 | No CI pipeline | deployment | medium | No `.github/workflows/` | Regressions caught only manually | Add lint (+ test when TD-002 done) workflow | `testing-and-ci-bootstrap` | open |
| TD-004 | `designService.restoreDesign` hardcoded `status: "ready"` | data | medium | `designService.ts` `[INFERRED]` | Restore may set wrong status; noted in Phase 3C signoff C2 | Capture `previousStatus` on archive; restore accurately | Phase 3D follow-up | open |
| TD-005 | Broad preload IPC surface | security | medium | `electron/preload.ts` | Larger attack surface if renderer compromised | Narrow exposed channels per `docs/standards/SECURITY.md` | `electron-ipc-hardening` | open |
| TD-006 | Placeholder routes (show queue, customer requests) | architecture | low | `ShowQueuePage`, `CustomerRequestsPage` | Navigation implies features not built | Keep routes; document as shells until roadmap phases | Phase 6+ | deferred |
| TD-007 | Historical workflow docs use pre-migration paths | docs | low | `docs/workflow/plans/`, `reviews/` phase 1–3 | Confusing when searching; active entry points fixed | Optional doc path sweep or add README note | `workflow-doc-path-sweep` | deferred |
| TD-008 | `functions/lib/` in `.gitignore` but verify not tracked | deployment | low | `functions/` | Compiled JS should not ship | Verified not tracked | `git-generated-output-cleanup` | **resolved** |
| TD-009 | Cloud Functions on Node.js 20 (deprecated 2026-04-30, decommission 2026-10-30) | deployment | medium | `functions/package.json` | Deploy blocked after runtime EOL | Upgrade `engines.node` to 22+; retest all functions | `functions-runtime-upgrade` | open |
| TD-010 | `firebase-functions` package outdated vs latest | dependencies | low | `functions/package.json` | Missing fixes/features; upgrade has breaking changes | Plan upgrade + regression test callables/triggers | `functions-runtime-upgrade` | open |
| TD-011 | Functions TS build emits nested `lib/functions/src/` (shared types in `include`) | deployment | low | `functions/tsconfig.json` | `main` must match nested output; stale flat `lib/index.js` caused deploy filter miss | Flatten with `rootDir: src` + project references or local type shim | `functions-build-layout` | open |
| TD-012 | Accidental `tsc` output in `shared/types/` breaks Vite (CJS `.js` resolved before `.ts`) | deployment | **high** | `shared/types/ai/` | White screen — Rollup cannot import named exports from stale CJS | Keep `shared/**/*.js` gitignored; never commit compiled shared types | **resolved** 2026-06-24 | **resolved** |
| TD-013 | Customer creation/provisioning unavailable from User Management | feature gap | medium | `/users`, customer record creation flow | Owner could not create a customer record for registered customer Print Request QA | Implement owner/admin customer-record creation from Users for Phase 6 Print Requests without customer Auth, Portal login, or Studio access | `customer-creation-provisioning-bug` | resolved |
| TD-014 | Print Request broad reads need indexed server-side query hardening before scale | data/performance | medium | `printRequestService`, `firestore.indexes.json` | Current Phase 6 broad reads are acceptable for foundation but will not scale cleanly | Add server-side query patterns and indexes for request status/customer/internal/item-status/customer-directory filters | `print-request-query-index-hardening` | open |

---

## Resolved Items

| ID | Issue | Resolved | Resolution notes |
|----|-------|----------|------------------|
| TD-R01 | ROADMAP showed Phase 1 Active | 2026-06-24 | Intake updated to Phase 3D |
| TD-R02 | AGENTS.md/ARCHITECTURE.md wrong Electron paths | 2026-06-24 | Updated to `electron/` layout |
| TD-R03 | AppForge doc migration incomplete | 2026-06-24 | Prior managed phase `fresh-prints-appforge-migration` |
| TD-R04 | Generated build artifacts tracked in git | 2026-06-24 | Repository stabilization: untracked 84 files; `.gitignore` updated |
| TD-R05 | Customer creation/provisioning unavailable from User Management | 2026-06-29 | `/users` now supports customer record create/edit flows, duplicate email prevention, and registered customer Print Request QA without customer Auth or Studio access |

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-06-29 | Manual QA rejected inline Print Request customer creation UX; implementation corrected to move customer record creation into Users |
| 2026-06-29 | TD-014 added during wrap-up audit; Print Request indexes deferred to scale hardening and do not block Phase 6 closeout |
| 2026-06-29 | TD-013 resolved after authenticated manual QA passed and final checks completed |
| 2026-06-29 | TD-013 implementation completed with automated checks passing; authenticated manual QA pending |
| 2026-06-29 | TD-013 implementation started as owner/admin customer-record creation from Print Requests |
| 2026-06-29 | TD-013 moved to planned with managed bug plan `docs/workflow/plans/2026-06-29-customer-creation-provisioning-bug-plan.md` |
| 2026-06-29 | TD-013 added after Phase 6 PASS WITH NOTES signoff |
| 2026-06-24 | TD-001 resolved in repository stabilization |
| 2026-06-24 | Populated from Existing Project Intake |
