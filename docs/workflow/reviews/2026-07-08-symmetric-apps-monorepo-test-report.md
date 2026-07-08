# Test Report: Symmetric Apps Monorepo — Studio → `apps/studio`

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Plan | `docs/workflow/plans/2026-07-08-symmetric-apps-monorepo-plan.md` |
| Review | `docs/workflow/reviews/2026-07-08-symmetric-apps-monorepo-review.md` |
| Goal ID | `studio-apps-folder-monorepo-normalization` |

---

## Verification Gate Results

All 8 required checks run. All pass.

| # | Check | Command | Result | Notes |
|---|-------|---------|--------|-------|
| 1 | Full unit test sweep | `npx tsx --test packages/shared/src/**/*.test.ts apps/studio/src/**/*.test.ts apps/studio/electron/**/*.test.ts apps/portal/**/*.test.ts` | **PASS** | 598 tests, 137 suites, 0 fail, 0 cancelled, exit 0 |
| 2 | Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | **PASS** | exit 0 |
| 2b | Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **PASS** | exit 0 |
| 2c | Functions build | `npm --prefix functions run build` | **PASS** | exit 0; confirms `../packages/shared/src` include still resolves |
| 3 | Lint | `npm run lint` | **PASS** | exit 0, zero warnings/errors (`--max-warnings 0`) |
| 4 | Studio Vite build | (part of `build:studio`) | **PASS** | 2132 modules transformed, output under `apps/studio/dist/` and `apps/studio/dist-electron/` |
| 5 | Portal build | `npm run build:portal` | **PASS** | `next build` — 9 routes generated, exit 0 |
| 6 | Studio full installer | `npm run build:studio` | **PASS** | Full NSIS installer built at `apps/studio/release/0.0.0/Fresh Prints-Windows-0.0.0-Setup.exe` (103.7 MB) after two build-tooling fixes (see below) |
| 7 | Functions build | (duplicate of 2c per plan numbering) | **PASS** | — |
| 8 | Manual: Studio dev smoke | `npm run dev:studio` | **PASS** | Electron launched (4 processes: main/renderer/GPU/utility), `[Phase 3C] Derivative verification passed` (sharp loaded, all self-tests green), ran clean 10+s with no errors |
| 8b | Manual: Portal dev smoke | `npm run dev:portal` | **PASS** | `next dev` on :3000, `GET / 200`, compiled clean in 666ms |

---

## Two Build-Tooling Fixes Required (Beyond Plan's Literal Text)

The plan anticipated general risk in this area ("electron-builder cannot find icons/dist" — Medium severity) but not these two specific failure modes, both surfaced only when actually running the full installer build (check #6) with `apps/studio/` as electron-builder's `appDir` instead of repo root. Both are config-only, mechanical, zero product-logic changes, applied to `apps/studio/electron-builder.json5`:

1. **`electronVersion: "30.5.1"` pinned explicitly.** electron-builder's built-in version auto-detection (`getElectronVersionFromInstalled` in `app-builder-lib`) does a literal `path.join(projectDir, "node_modules", "electron", ...)` — it does not walk up for hoisted npm-workspace dependencies. With `electron` correctly hoisted to the repo root (not `apps/studio/node_modules/`, which doesn't exist), this lookup failed with `Cannot compute electron version from installed node modules`. Pinning the version explicitly bypasses the broken lookup entirely (this is the config's own documented precedence path).

2. **`npmRebuild: false` set explicitly.** electron-builder's default `npmRebuild: true` step runs `npm install --production` scoped to `appDir` (`apps/studio/`) before packaging. In an npm-workspaces layout where `apps/studio` has no local `node_modules` of its own, this step was pruning/corrupting the **root** `node_modules` tree instead — it deleted `7zip-bin`'s platform binary (`node_modules/7zip-bin/win/x64/7za.exe`) twice during testing, breaking the NSIS installer step with `ENOENT`. Since `sharp` (the only native dependency) is already externalized from the Vite bundle (`external: ['sharp']` in `vite.config.ts`, loaded from `node_modules` at runtime, not rebuilt at package time), no native rebuild is actually needed here. Disabling the step is the standard, documented electron-builder fix for Lerna/Yarn/npm-workspace monorepos.

Both fixes were confirmed with the user before applying (see conversation) since they went beyond the plan's literal scope, even though both are mechanical config-only changes with no product-logic impact.

## Environment Artifacts Encountered (Not Caused By This Move)

Two unrelated pre-existing issues were hit and resolved during verification — neither was caused by the Studio move, both predate this session:

- A stray `esbuild.exe` process (PID 14952) held a file lock that caused an `EBUSY` error during the first `build:studio` attempt. Confirmed unrelated (leftover from an earlier session) and resolved when the process exited.
- A stale `node.exe` process (PID 8600) was already listening on port 3000, serving a broken/stale Next.js build (`Cannot find module './835.js'`, HTTP 500) predating this session. Killed and `dev:portal` restarted clean (HTTP 200).
- `ELECTRON_RUN_AS_NODE=1` was set in the Bash tool's shell environment, which forces the Electron binary to run as plain Node (a documented Electron feature). This caused the first `dev:studio` smoke attempt to fail with `SyntaxError: The requested module 'electron' does not provide an export named 'BrowserWindow'`. Confirmed via isolated repro that this is a shell-environment artifact unrelated to the path move — unsetting it for the smoke-test command resolved it immediately.

## Locked Decisions — Verified

| Decision | Verified how |
|----------|---------------|
| `dist/`, `dist-electron/`, `release/` all live under `apps/studio/` | Confirmed via `ls` after full build: no stray `dist`/`dist-electron`/`release` at repo root; all present under `apps/studio/` |
| Icons move with `electron-builder.json5` into `apps/studio/` | N/A in practice — `icon.ico`/`icon.png` were never tracked in git (confirmed via `git log --all`); electron-builder logs `default Electron icon is used, reason=application icon is not set`, consistent with pre-move behavior. Config still points at `apps/studio/icon.ico`/`icon.png` for if/when custom icons are added. |
| Slice 5 check #6 uses full installer, not smoke-only | Full NSIS `.exe` built and confirmed present on disk |
| `APP_ROOT` in `electron/main.ts` resolves to `apps/studio/` | Indirectly confirmed: `dev:studio` smoke showed `[Phase 3C] Derivative verification passed` (sharp/main-process self-test, which depends on correct `APP_ROOT`-relative resolution), and the full installer packaged correctly from `apps/studio/dist` + `apps/studio/dist-electron` |

---

## Scope Notes

- Two documentation files judged out of scope for this pass and left unedited, with rationale: `docs/project/PROJECT_HEALTH.md` and `docs/intake/INTAKE_FINDINGS.md` are point-in-time intake snapshots (already stale on unrelated facts — e.g. "13 unit test files" vs. today's 598 tests across 82 files — editing only the Studio path in isolation would be inconsistent with the rest of the frozen snapshot). `docs/handoffs/firebase-auth-storage/` is an explicitly portable pattern-documentation package (meant to bootstrap a *different* application), not a live pointer into this repo's file tree. `docs/project/DECISIONS.md`'s ADR entries and `docs/_migration-backup/` are historical records describing decisions/state as they existed at the time — consistent with the plan's own exclusion of historical workflow archives from path rewrites.
- `docs/project/TECH_DEBT.md`: only TD-005's "Location" column (a live pointer, not narrative history) was updated; TD-001 and TD-R02 are resolved historical entries and were left as-is.
- No product logic was changed anywhere in this phase. All 469 changed paths are `git mv` renames, config edits, or doc path updates.

---

## Follow-Up Round: `.env` Fix + `references/` Reorg (User-Requested, Same Session)

After initial signoff, the user flagged two gaps and one additional cleanup request:

1. **`.env.local` / `.env.example` were left at repo root** instead of moving with Studio. Root gap: root `.env.local` only contained `VITE_FIREBASE_*` vars (Studio-only — Vite loads `.env*` from the directory containing `vite.config.ts`, which is now `apps/studio/`). Fixed: both files moved to `apps/studio/` (`.env.local` via plain filesystem move since it's gitignored/untracked; `.env.example` via `git mv`). `apps/studio/.env.example` trimmed to Studio-only vars (Portal's `NEXT_PUBLIC_*` half was redundant with `apps/portal/.env.example`, which already existed independently). Verified via `dev:studio` smoke — `apps/studio/src/renderer/src/config/env.ts` validates required `VITE_FIREBASE_*` keys at startup and would throw if missing; app launched clean.

2. **`gang-sheet-builder-reference/` and `project-chatgpt-handoff/` consolidated into `references/`** at the user's request, aiming for a cleaner repo root. Real reference-count check before proceeding: `gang-sheet-builder-reference/` had 3 live references (`. eslintrc.cjs`, `.cursor/workflow/state.md`, `scripts/migrate-shared-imports.mjs`); `project-chatgpt-handoff/` had ~10 live references (`CLAUDE.md`, `.eslintrc.cjs`, 3 `.cursor/` skill/template files, `state.md`, `migrate-shared-imports.mjs`, 3 self-references inside its own docs) plus ~40 historical workflow-archive hits left untouched per this project's existing convention. Both folders `git mv`'d into `references/`; all live references updated; `.gitignore` and `.eslintrc.cjs` ignore patterns simplified from two folder-specific entries to a single `references` entry.

3. **Process incident, disclosed in full:** while verifying the `references/` move's `skipDirs` logic in `scripts/migrate-shared-imports.mjs`, the script was executed directly (`node scripts/migrate-shared-imports.mjs`) instead of only being read — this was a mistake; the intent was to inspect the skip-dir set, not run the migration. The script mutated 80 source files across `apps/portal/` and `apps/studio/src/`, incorrectly rewriting **local** `../shared/` relative imports (e.g. Studio's own `src/renderer/src/shared/components/Button`, Portal's own `features/shared/components/PortalIcons` — each app's own UI-only shared folder) into `@fresh-prints/shared/...` package aliases, which resolve to the wrong location (`packages/shared/src`, not the local UI folder). This is precisely the ambiguity `scripts/fix-studio-ui-imports.mjs` exists to reverse for Studio — the regex in `migrate-shared-imports.mjs` cannot distinguish "relative path to an app's own local `shared/` folder" from "relative path to the cross-app `packages/shared/`". All 80 files were identified via `git diff --name-only` and reverted with `git checkout --` immediately upon discovery. Confirmed clean via full re-run of the unit test sweep (598/598 pass), both typechecks, lint, and the full Studio installer build — all green, matching pre-incident results exactly. No corrupted state was committed or left in the working tree.

### Re-verification after follow-up round

All checks re-run and confirmed passing after the `.env` fix, `references/` move, and incident recovery:

| Check | Result |
|-------|--------|
| Unit test sweep | **PASS** — 598/598, 0 fail |
| Studio typecheck | **PASS** |
| Portal typecheck | **PASS** |
| Lint | **PASS** — 0 warnings/errors |
| Portal build | **PASS** |
| Studio full installer build | **PASS** — NSIS `.exe` built successfully with `electronVersion`/`npmRebuild: false` fixes still in place |
| Studio dev smoke (env vars) | **PASS** — clean launch, sharp/derivative self-test green, no Firebase config errors |

---

## Result

**All required checks pass, including after the follow-up `.env` fix and `references/` reorg. Zero product-logic changes remain in the final state (the accidental import-rewrite mutation was fully reverted and re-verified). Both locked decisions honored and verified. Ready for signoff.**
