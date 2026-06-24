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

---

## Resolved Items

| ID | Issue | Resolved | Resolution notes |
|----|-------|----------|------------------|
| TD-R01 | ROADMAP showed Phase 1 Active | 2026-06-24 | Intake updated to Phase 3D |
| TD-R02 | AGENTS.md/ARCHITECTURE.md wrong Electron paths | 2026-06-24 | Updated to `electron/` layout |
| TD-R03 | AppForge doc migration incomplete | 2026-06-24 | Prior managed phase `fresh-prints-appforge-migration` |
| TD-R04 | Generated build artifacts tracked in git | 2026-06-24 | Repository stabilization: untracked 84 files; `.gitignore` updated |

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-06-24 | TD-001 resolved in repository stabilization |
| 2026-06-24 | Populated from Existing Project Intake |
