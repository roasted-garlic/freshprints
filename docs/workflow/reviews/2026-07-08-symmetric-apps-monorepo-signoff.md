# Signoff: Symmetric Apps Monorepo — Studio → `apps/studio`

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Plan | `docs/workflow/plans/2026-07-08-symmetric-apps-monorepo-plan.md` — approved |
| Review | `docs/workflow/reviews/2026-07-08-symmetric-apps-monorepo-review.md` — approved |
| Test report | `docs/workflow/reviews/2026-07-08-symmetric-apps-monorepo-test-report.md` — all checks pass |
| Goal ID | `studio-apps-folder-monorepo-normalization` |
| Verdict | **Signed off — DONE** |

---

## Summary

Fresh Prints Studio moved from the repository root to `apps/studio/` as npm workspace package `@fresh-prints/studio`, completing the symmetric apps monorepo layout alongside `apps/portal`. All moves were mechanical (`git mv`, rename-tracked in git history); zero product logic was changed.

## What Changed

- **Moved** (`git mv`, 446 files rename-tracked): `electron/`, `src/renderer/`, `index.html`, `vite.config.ts`, `tsconfig.node.json`, `electron-builder.json5` → `apps/studio/`
- **Created:** `apps/studio/package.json` (`@fresh-prints/studio`), `apps/studio/tsconfig.json`
- **Removed:** root `tsconfig.json` (superseded — nothing left at root to typecheck)
- **Thinned:** root `package.json` to a workspace orchestrator (no more `main`, Studio-only deps moved to `apps/studio/package.json`)
- **Updated:** `apps/studio/vite.config.ts` (shared/show-picker aliases → `../../packages/*`), `apps/studio/electron-builder.json5` (`electronVersion` pinned, `npmRebuild: false` — both needed for the build to work under npm workspaces; see test report), `package-lock.json` (regenerated, `apps/studio` now in workspace map), `.eslintrc.cjs` (extended ignorePatterns), `scripts/migrate-shared-imports.mjs` and `scripts/fix-studio-ui-imports.mjs` (root anchors fixed)
- **Docs updated:** `ARCHITECTURE.md`, `DATA_MODEL.md`, `FIREBASE.md`, `TESTING.md`, `DEPLOYMENT.md`, `SECURITY.md`, `STYLE_GUIDE.md`, `TECH_DEBT.md` (one live-pointer cell), `docs/workflow/setup/electron-security-setup.md`, `docs/workflow/setup/firebase-project-setup.md`, and all three `project-chatgpt-handoff/` files that referenced Studio paths
- **`references/` reorg (follow-up, user-requested):** `gang-sheet-builder-reference/` and `project-chatgpt-handoff/` both `git mv`'d into `references/` for a cleaner repo root. Live references updated in `CLAUDE.md`, `.eslintrc.cjs`, `.gitignore`, `scripts/migrate-shared-imports.mjs`, `.cursor/skills/documentation-update/SKILL.md`, `.cursor/skills/signoff-phase/SKILL.md`, `.cursor/workflow/signoff-template.md`, and 3 self-references inside `project-chatgpt-handoff/`'s own docs. Historical `docs/workflow/plans/*` and `docs/workflow/reviews/*` archives left untouched per existing convention. Both folders remain tracked from git history at their new path — `.gitignore` now has a single `references/` entry (simplified from two folder-specific entries) so future changes aren't tracked; existing history isn't removed (would require explicit `git rm --cached` if wanted).
- **`.env` fix (follow-up, user-caught gap):** `.env.local` and `.env.example` were left at repo root during the initial move — a real miss, since both contained Studio-only `VITE_FIREBASE_*` vars and Vite loads `.env*` relative to `vite.config.ts`'s location (now `apps/studio/`). Both moved to `apps/studio/`; `.env.example` trimmed to remove redundant Portal vars (Portal already has its own `apps/portal/.env.example`). Verified via clean `dev:studio` smoke.

## What Did Not Change

- No product/business logic touched anywhere.
- `packages/shared/`, `packages/show-picker/`, `apps/portal/`, `functions/`, `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json` — all untouched, per plan's explicit out-of-scope list.

## Verification

All 8 required gate checks pass (598 unit tests, both typechecks, lint, both builds, full Studio installer, both dev-server manual smokes). Full detail in the test report. Two electron-builder config fixes were required beyond the plan's literal text (`electronVersion`, `npmRebuild: false`) — both mechanical, both confirmed with the user before applying, both documented in the test report with root-cause explanation.

**Incident disclosure:** during the follow-up round, `scripts/migrate-shared-imports.mjs` was accidentally executed (rather than just read) while verifying its skip-dir logic, mutating 80 source files by incorrectly rewriting local `../shared/` imports into cross-package `@fresh-prints/shared` aliases. All 80 files were identified and reverted via `git checkout --` immediately; full re-verification (598/598 tests, both typechecks, lint, full Studio installer build) confirmed a clean recovery matching pre-incident results. Full detail in the test report.

## Rollback

Per plan: `git revert` the merge/squash commit for this phase restores the prior root-level layout. No Firestore/data rollback needed (no backend changes).

## Workflow State

`.cursor/workflow/state.md` updated to reflect `DONE: yes` for this sub-goal.

---

## Approval

**Signed off.** All plan exit criteria met:
- ✅ All verification gate checks pass
- ✅ Studio and Portal dev/build unchanged in behavior (confirmed via manual smoke + automated builds)
- ✅ `ARCHITECTURE.md` documents the symmetric layout
