# Technical Debt Register — Fresh Prints

**Last reviewed:** 2026-06-24 (Existing Project Intake)

---

## How to Use

See field definitions in template. Fixes require approved Managed Phases — **not** implemented during intake.

---

## Active Items

| ID | Issue | Category | Severity | Location | Why it matters | Recommended fix | Suggested phase | Status |
|----|-------|----------|----------|----------|----------------|-----------------|-----------------|--------|
| TD-031 | Discover/View All total badge / NTW Counting stuck | ui/data | medium | Portal Discover `new`; `countReadyDesigns` + badge | Page-length badge fixed; NTW aggregate failed without DESC orderBy → stuck Counting; corrective source ready | Align NTW count orderBy + Count unavailable UI; promote+rollout+QA | `portal-discover-view-all-complete-pagination` | open — corrective implement **complete** 2026-08-08; prod deploy / QA pending; **not signed off** |
| TD-001 | Generated build artifacts tracked in git | deployment | **high** | `release/`, `dist-electron/`, `build/icon.*` | Bloated repo, slow clones | Added to `.gitignore`; `git rm --cached` | `git-generated-output-cleanup` | **resolved** |
| TD-002 | Unit tests exist but no `npm test` script | testing | medium | 13 `*.test.ts` files; root `package.json` | Tests cannot run in CI or signoff workflow | Add vitest or node:test runner; `npm test` script | `testing-and-ci-bootstrap` | open |
| TD-003 | No CI pipeline | deployment | medium | No `.github/workflows/` | Regressions caught only manually | Add lint (+ test when TD-002 done) workflow | `testing-and-ci-bootstrap` | open |
| TD-004 | `designService.restoreDesign` hardcoded `status: "ready"` | data | medium | `designService.ts` `[INFERRED]` | Restore may set wrong status; noted in Phase 3C signoff C2 | Capture `previousStatus` on archive; restore accurately | Phase 3D follow-up | open |
| TD-005 | Broad preload IPC surface | security | medium | `apps/studio/electron/preload.ts` | Larger attack surface if renderer compromised | Narrow exposed channels per `docs/standards/SECURITY.md` | `electron-ipc-hardening` | open |
| TD-006 | Placeholder routes (show queue, customer requests) | architecture | low | `ShowQueuePage`, `CustomerRequestsPage` | Navigation implies features not built | Keep routes; document as shells until roadmap phases | Phase 6+ | deferred |
| TD-007 | Historical workflow docs use pre-migration paths | docs | low | `docs/workflow/plans/`, `reviews/` phase 1–3 | Confusing when searching; active entry points fixed | Optional doc path sweep or add README note | `workflow-doc-path-sweep` | deferred |
| TD-008 | `functions/lib/` in `.gitignore` but verify not tracked | deployment | low | `functions/` | Compiled JS should not ship | Verified not tracked | `git-generated-output-cleanup` | **resolved** |
| TD-009 | Cloud Functions on Node.js 20 (deprecated 2026-04-30, decommission 2026-10-30) | deployment | medium | `functions/package.json` | Deploy blocked after runtime EOL | Upgrade `engines.node` to 22+; retest all functions | `functions-runtime-upgrade` | open |
| TD-010 | `firebase-functions` package outdated vs latest | dependencies | low | `functions/package.json` | Missing fixes/features; upgrade has breaking changes | Plan upgrade + regression test callables/triggers | `functions-runtime-upgrade` | open |
| TD-011 | Functions TS build emits nested `lib/functions/src/` (shared types in `include`) | deployment | low | `functions/tsconfig.json` | `main` must match nested output; stale flat `lib/index.js` caused deploy filter miss | Flatten with `rootDir: src` + project references or local type shim | `functions-build-layout` | open |
| TD-012 | Accidental `tsc` output in `shared/types/` breaks Vite (CJS `.js` resolved before `.ts`) | deployment | **high** | `shared/types/ai/` | White screen — Rollup cannot import named exports from stale CJS | Keep `shared/**/*.js` gitignored; never commit compiled shared types | **resolved** 2026-06-24 | **resolved** |
| TD-013 | Customer creation/provisioning unavailable from User Management | feature gap | medium | `/users`, customer record creation flow | Owner could not create a customer record for registered customer Print Request QA | Implement owner/admin customer-record creation from Users for Phase 6 Print Requests without customer Auth, Portal login, or Studio access | `customer-creation-provisioning-bug` | resolved |
| TD-014 | Print Request broad reads need indexed server-side query hardening before scale | data/performance | medium | `printRequestService`, `firestore.indexes.json` | Phase 6 foundation broad reads were replaced for request, item, summary, and customer paths; residual scale risk remains if per-request summary queries become too costly | Consider denormalized request-level summary fields only after volume requires it, with a planned migration/backfill | `print-request-query-index-hardening` | narrowed |
| TD-015 | Long Firebase index error URLs can stretch operational error panels horizontally | ui/polish | low | `ErrorState`, shared error message styling | Missing-index errors include very long Firebase Console URLs that can break Print Requests page width during dev/test failures | Add shared error text wrapping such as `overflow-wrap: anywhere` without changing error content | `error-state-long-url-wrapping` | open |
| TD-019 | Print Request item thumbnails crop artwork previews | ui/polish | low | `PrintRequestItemCard` thumbnail display | Item cards should keep the same footprint but show the full artwork so staff can inspect selected request items without misleading crop | Use contained fit inside the existing thumbnail footprint | `print-request-item-thumbnail-polish` | open |
| TD-020 | Print Request item thumbnails are not openable in a lightbox | ui/polish | low | `PrintRequestItemCard` / preview modal pattern | Staff need a quick full preview of request item artwork without leaving request detail | Make item thumbnails clickable and reuse or add a lightbox preview pattern | `print-request-item-thumbnail-polish` | open |
| TD-021 | Oversized requested items show `0 DPI` instead of accurate DPI | ui/validation | low | `assessPrintRequestItemSize`, `PrintRequestItemCard` DPI display | Over-22 requested sizes should still display the calculated DPI while showing the oversized error and warning styling | Separate DPI calculation from save eligibility so oversized dimensions can report accurate DPI | `print-request-item-dpi-display-polish` | open |
| TD-026 | Create My Design with AI deferred after Phase 9A | feature gap | medium | Portal Custom Designs cards | Coming-soon card only in 9A | Separate managed phase after 9A signoff | `phase-9b-create-with-ai` | open |
| TD-027 | Fresh Prints Assisted Creation deferred after Phase 9A | feature gap | medium | Portal Custom Designs cards | MVP implemented (Phase 9C); awaiting `fresh-prints-dev` deploy + manual QA | Close after 9C signoff | `phase-9c-assisted-creation` | in_progress |
| TD-028 | `functions/.gitignore` previously matched any `lib/` and hid `functions/src/lib` from git | deployment | **high** | `functions/.gitignore` | Source helpers were local-only / not on origin | Changed to `/lib/`; commit `functions/src/lib` (exclude archived orphans) | `phase-9a-etsy-recommendations-foundation` | in progress |
| TD-029 | Portal username HTML `pattern` invalid in browser | ui/validation | low | `CompleteProfileForm.tsx`, `RegisterForm.tsx` `pattern="[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]"` | Browser reports invalid character class; may disable native constraint validation (server-side still enforces). Noted in loading-ownership owner QA PASS WITH NOTES | Put `-` at start/end of class or escape; align with server username rules; add regression | `portal-username-html-pattern-fix` | open |
| TD-030 | Design Details modal / shared-design page keep “Add to Request” after add instead of quantity control | ui/polish | low | Portal Design Details modal; shared-design page | Discover/catalog cards already switch to Working Request quantity control; details/share stay on Add button after add — UX parity gap (Stage 1b-C owner PASS WITH NOTES) | Reuse catalog card quantity control after add; reflect/control Working Request qty | `portal-details-share-add-to-request-quantity-parity` | open |

---

## Resolved Items

| ID | Issue | Resolved | Resolution notes |
|----|-------|----------|------------------|
| TD-R01 | ROADMAP showed Phase 1 Active | 2026-06-24 | Intake updated to Phase 3D |
| TD-R02 | AGENTS.md/ARCHITECTURE.md wrong Electron paths | 2026-06-24 | Updated to `electron/` layout |
| TD-R03 | AppForge doc migration incomplete | 2026-06-24 | Prior managed phase `fresh-prints-appforge-migration` |
| TD-R04 | Generated build artifacts tracked in git | 2026-06-24 | Repository stabilization: untracked 84 files; `.gitignore` updated |
| TD-R05 | Customer creation/provisioning unavailable from User Management | 2026-06-29 | `/users` now supports customer record create/edit flows, duplicate email prevention, and registered customer Print Request QA without customer Auth or Studio access |
| TD-R06 | Native number spinners remain visible on Print Request item numeric inputs | 2026-07-04 | `print-request-detail-autosave-and-name-locking` hides native quantity/width/height spinners while preserving numeric inputs |
| TD-R07 | Print Request item edits still use explicit save/alert refresh flow | 2026-07-04 | `print-request-detail-autosave-and-name-locking` replaces normal item save buttons/success alerts with autosave, dynamic duplicate/remove updates, and stable item ordering |
| TD-R08 | Print Request generated names, sequences, and status need stronger edit locks and revised naming format | 2026-07-04 | `print-request-detail-autosave-and-name-locking` locks customer names/sequences/status on the detail page and uses `username-CR001` / `baseName-IR001` names |

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-08-08 | TD-031 added — Discover New This Week View All badge shows 40 vs membership 45 after readyAt backfill (owner PASS WITH NOTES) |
| 2026-07-04 | TD-019, TD-020, and TD-021 added from `print-request-oversized-selection-unblock` PASS WITH FOLLOW-UP NOTES manual QA |
| 2026-07-04 | TD-016, TD-017, and TD-018 resolved by `print-request-detail-autosave-and-name-locking`; TD-015 remains open |
| 2026-07-04 | TD-016, TD-017, and TD-018 added from `print-request-item-sizing-and-username-naming` manual QA follow-up notes |
| 2026-07-04 | `print-request-item-sizing-and-username-naming` removed the request-naming list-scan guardrail by moving customer/internal request names to transaction-safe counters |
| 2026-07-03 | TD-015 added after dev QA hit a long Firebase missing-index URL that stretched the Print Requests page horizontally |
| 2026-06-29 | Manual QA rejected inline Print Request customer creation UX; implementation corrected to move customer record creation into Users |
| 2026-07-03 | TD-014 narrowed after `print-request-query-index-hardening`: request/item/customer reads now use server-side query paths and index definitions were added; future denormalized summaries remain deferred |
| 2026-06-29 | TD-014 added during wrap-up audit; Print Request indexes deferred to scale hardening and do not block Phase 6 closeout |
| 2026-06-29 | TD-013 resolved after authenticated manual QA passed and final checks completed |
| 2026-06-29 | TD-013 implementation completed with automated checks passing; authenticated manual QA pending |
| 2026-06-29 | TD-013 implementation started as owner/admin customer-record creation from Print Requests |
| 2026-06-29 | TD-013 moved to planned with managed bug plan `docs/workflow/plans/2026-06-29-customer-creation-provisioning-bug-plan.md` |
| 2026-06-29 | TD-013 added after Phase 6 PASS WITH NOTES signoff |
| 2026-06-24 | TD-001 resolved in repository stabilization |
| 2026-06-24 | Populated from Existing Project Intake |
