# Plan: Symmetric Apps Monorepo — Studio → `apps/studio`

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Goal ID | `studio-apps-folder-monorepo-normalization` |
| Related | `docs/workflow/reviews/2026-07-08-symmetric-apps-monorepo-review.md` (pending) |

---

## Goal

Normalize the repository into a **symmetric apps monorepo**: move Fresh Prints Studio from the repo root (`electron/`, `src/renderer/`, root Vite/Electron config) into `apps/studio/` as workspace package `@fresh-prints/studio`, while keeping `apps/portal`, `packages/*`, and `functions/` in their current roles.

**Mechanical-only rule:** `git mv` + config/script/doc path updates. **Zero product logic changes.**

**Exit criteria:** All verification gate checks pass; Studio and Portal dev/build unchanged in behavior; `ARCHITECTURE.md` documents the symmetric layout.

---

## Background

- Phase 8 introduced an **incremental monorepo** (`apps/portal`, `packages/shared`) with Studio deliberately left at root (`docs/workflow/plans/2026-07-07-phase-8-portal-foundation-plan.md`).
- Phase 8 Portal MVP is now closed out in dev. User approved a dedicated refactor phase before Phase 9.
- This is **not** a “perfect monorepo” — scope is intentionally bounded.

---

## Scope

### In Scope

| Slice | Work |
|-------|------|
| **0 — Inventory** | Enumerate every config/doc/script referencing `electron/`, `src/renderer/`, root `vite.config.ts`, `dist/`, `dist-electron/`, `release/` |
| **1 — Scaffold `apps/studio`** | `apps/studio/package.json` (`@fresh-prints/studio`); `git mv` Studio sources |
| **2 — Build tooling** | Vite, electron-plugin, electron-builder, output dirs, `firebase.json` apphosting ignore paths |
| **3 — TypeScript & ESLint** | Root + Studio tsconfig, ESLint globs/overrides |
| **4 — Scripts & docs** | Root scripts → workspaces; `ARCHITECTURE.md`, `TESTING.md`, `CODING_STANDARDS.md`, handoff repo map |
| **5 — Verify & signoff** | Full verification gate (below) |

**Moves (expected):**

```txt
electron/              → apps/studio/electron/
src/renderer/          → apps/studio/src/renderer/
index.html             → apps/studio/index.html
vite.config.ts         → apps/studio/vite.config.ts
tsconfig.node.json     → apps/studio/tsconfig.node.json (or merged into studio tsconfig)
electron-builder.json5 → apps/studio/electron-builder.json5
icon.ico, icon.png     → apps/studio/ (or apps/studio/build/) — update builder paths
```

**Target layout:**

```txt
fresh-prints/
├── apps/
│   ├── portal/          # @fresh-prints/portal (unchanged role)
│   └── studio/          # @fresh-prints/studio (NEW location)
├── packages/
│   ├── shared/
│   └── show-picker/
├── functions/           # unchanged location
├── firebase.json        # root (unchanged)
├── package.json         # thin orchestrator + workspaces
└── tsconfig.json        # root solution / references (optional thin root)
```

### Out of Scope (explicit)

- `functions/` as npm workspace package or bundling `@fresh-prints/shared` differently for deploy. **Note:** `functions/tsconfig.json` already includes `../packages/shared/src` directly (not via npm alias) — this stays correct *specifically because* `packages/shared` is not moving in this phase. No change needed, but Slice 5 typecheck (`npm --prefix functions run build`) confirms it.
- Turborepo, Nx, pnpm migration
- Renaming `apps/studio/src/renderer/src/shared/` (Studio-only UI folder — confusing name but separate concern)
- Moving `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- Moving `gang-sheet-builder-reference/`
- Any feature work, dependency upgrades, or refactors “while we’re here”
- FreshForge `.cursor/` structure changes unless path examples require it

---

## Affected Areas

### Files / Modules (expected)

**Slice 0 — inventory targets (config & tooling):**

| Path | Why |
|------|-----|
| `package.json` | `main`, scripts, Studio devDependencies |
| `vite.config.ts` | `__dirname`, electron entries, aliases, `dist-electron` plugin |
| `tsconfig.json` | `include`, `paths`, baseUrl |
| `tsconfig.node.json` | Vite config compile |
| `electron-builder.json5` | `files`, icons, output |
| `electron/main.ts`, `electron/preload.ts` | relative paths to dist |
| `firebase.json` | apphosting `ignore` list (`electron`, `dist`, `dist-electron`) |
| `.eslintrc.cjs` | ignorePatterns, overrides |
| `.gitignore` | `dist/`, `dist-electron/`, `release/` paths |
| `scripts/migrate-shared-imports.mjs` | hardcoded `path.resolve(import.meta.dirname, '..')` root anchor + `skipDirs` set (`dist-electron`, `release`, etc.) — will silently walk the wrong tree post-move unless updated |
| `scripts/fix-studio-ui-imports.mjs` | hardcoded `path.join(root, 'src', 'renderer', 'src', 'shared')` — breaks once `src/renderer` moves to `apps/studio/src/renderer` |
| `package-lock.json` | workspace `packages` map currently has no `apps/studio` entry (Studio *is* root today) — needs regeneration |
| `index.html` | Vite entry |

**Slice 0 — inventory targets (docs — update in Slice 4, not product code):**

- `docs/architecture/ARCHITECTURE.md`, `docs/standards/CODING_STANDARDS.md`, `docs/standards/STYLE_GUIDE.md`
- `docs/standards/TESTING.md`, `docs/standards/DEPLOYMENT.md`
- `project-chatgpt-handoff/08-tech-stack-repo-map.md`
- `AGENTS.md` path examples (if present)

**Not in scope for path rewrites:** historical `docs/workflow/plans/*` and `docs/workflow/reviews/*` archives.

### Architecture Impact

- [x] Repository layout only. Runtime layers unchanged.

### Security Impact

- [x] None

### Data Model / Backend / UI Impact

- [x] None

### Migration Impact

- [x] Forward: `git mv` preserves history; update imports only if any relative cross-root paths exist (unlikely — Studio uses `@fresh-prints/shared`).
- [x] Rollback: revert merge commit; restore root layout.

---

## Approach

### Slice 0 — Inventory

0. **Precondition:** commit or stash all pending working-tree changes before starting (`git status` must be clean). This move must land as its own isolated commit/PR — mixing it with unrelated in-flight feature work makes both harder to review and turns a single-revert rollback into a rollback that also destroys unrelated work.
1. Run ripgrep across repo (exclude `docs/workflow/`, `gang-sheet-builder-reference/`, `.freshforge/backups/`):
   - `src/renderer/`, `electron/`, `dist-electron`, `vite.config`, `release/`
2. Produce inventory table in implementation notes (file → required change).
3. Confirm no hidden coupling (e.g. `firebase.json`, CI, hooks).
4. Confirm `scripts/migrate-shared-imports.mjs` and `scripts/fix-studio-ui-imports.mjs` are updated (root anchors, skip-dir lists) or explicitly archived if their one-time purpose is already served — do not leave them silently pointing at stale paths.

### Slice 1 — Scaffold `apps/studio`

1. Create `apps/studio/package.json`:
   - `name`: `@fresh-prints/studio`
   - Move Studio runtime + build `devDependencies` from root `package.json`
   - Scripts: `dev`, `build`, `preview` (vite + electron-builder)
2. `git mv` directories and config files listed above.
3. Root `package.json` retains workspaces orchestration:
   - `dev:studio` → `npm run dev --workspace @fresh-prints/studio`
   - `build:studio` → workspace build

### Slice 2 — Build tooling

**Decision (locked, not open at review):** `dist`, `dist-electron`, and `release/` all move under `apps/studio/` for symmetry. This is not optional — it is required for `electron/main.ts:37`'s `APP_ROOT` computation to stay correct (see worked example below).

1. Update `apps/studio/vite.config.ts`:
   - All `path.join(__dirname, ...)` paths relative to new location
   - `@fresh-prints/shared` alias → `../../packages/shared/src`
   - `dist` / `dist-electron` output under `apps/studio/`; update `.gitignore`
2. Update `electron-builder.json5`:
   - `files`: `dist`, `dist-electron` relative to studio package
   - `directories.output`: `apps/studio/release/${version}`
   - `win.icon` (`icon.ico`) / `linux.icon` (`icon.png`) — move icons alongside `electron-builder.json5` into `apps/studio/`; electron-builder resolves these relative to the config file, so if the config moves and the icons don't, packaging breaks silently (no build-time error — just a missing/default icon).
3. Update `package.json` `main` field → `apps/studio/dist-electron/main.js` or workspace package main.
4. Update `firebase.json` apphosting ignore paths if outputs move.
5. Regenerate `package-lock.json`: run `npm install` at root after Slice 1 scaffolding so the workspace `packages` map picks up `apps/studio` and drops the root-as-Studio deps; commit the updated lockfile as part of this slice, not deferred to Slice 5 verification.

**Worked example — `APP_ROOT` / icon path (`electron/main.ts:37,211`):**

```txt
Before: dist-electron/main.js  →  __dirname = <root>/dist-electron
        APP_ROOT = path.join(__dirname, '..')      = <root>
        VITE_PUBLIC fallback   = <root>/dist        (RENDERER_DIST)
        icon path              = <root>/dist/fresh-prints-logo.svg

After:  apps/studio/dist-electron/main.js  →  __dirname = <root>/apps/studio/dist-electron
        APP_ROOT = path.join(__dirname, '..')      = <root>/apps/studio      ✓ (dist/dist-electron under apps/studio/)
        VITE_PUBLIC fallback   = <root>/apps/studio/dist
        icon path              = <root>/apps/studio/dist/fresh-prints-logo.svg
```

This only resolves correctly if `dist`/`dist-electron` output under `apps/studio/` (per the locked decision above) — if any output dir is left at repo root while `electron/` moves, `APP_ROOT` silently points at the wrong place and the packaged app fails to find its icon/assets. Verify by inspecting the resolved `APP_ROOT` value at runtime during the Slice 5 manual smoke test, not just by reading the config.

### Slice 3 — TypeScript & ESLint

1. `apps/studio/tsconfig.json` — include `electron`, `src`, reference to `packages/shared`
2. Root `tsconfig.json` — project references or slim shared config; remove Studio sources from root include
3. `.eslintrc.cjs` — lint `apps/studio/**/*`; update ignorePatterns for new dist paths
4. Verify `npm run lint` still covers Portal + Studio + shared tests in packages

### Slice 4 — Scripts & docs

1. Root scripts table in `TESTING.md` / `DEPLOYMENT.md`
2. `ARCHITECTURE.md` — replace “incremental monorepo; Studio at root” with symmetric layout
3. `CODING_STANDARDS.md` / `STYLE_GUIDE.md` — path examples under `apps/studio/`
4. Handoff `08-tech-stack-repo-map.md`
5. Optional ADR-FP-067 in `DECISIONS.md` (symmetric apps layout)

### Slice 5 — Verify & signoff

Run **full verification gate** (all required):

| # | Check | Command |
|---|-------|---------|
| 1 | Full unit test sweep | `npx tsx --test` over all `*.test.ts` in `packages/shared`, `apps/studio`, `electron` paths post-move |
| 2 | Typecheck | `npx tsc --noEmit` (root/studio), `npm run typecheck --workspace @fresh-prints/portal`, `npm --prefix functions run build` |
| 3 | Lint | `npm run lint` |
| 4 | Studio Vite build | `npx vite build` from `apps/studio` or `npm run build --workspace @fresh-prints/studio` (vite step) |
| 5 | Portal build | `npm run build:portal` |
| 6 | Studio packaging | `npm run build:studio` (full electron-builder installer — **decision locked**: run full build, not smoke-only, since packaging is exactly where root-relative path bugs from this move would surface) |
| 7 | Functions build | `npm --prefix functions run build` |
| 8 | Manual smoke | Studio launches (`dev:studio`); Portal dev works (`dev:portal`) |

**Rollback:** single revert of merge commit restores prior layout.

---

## Test Strategy

### Automated

All rows in Slice 5 gate — **required**.

### Manual

| Test | Expected |
|------|----------|
| `npm run dev:studio` | Electron window opens, login works |
| `npm run dev:portal` | Portal loads at :3000 |
| Design Library smoke | One navigation in Studio |

---

## Human Checkpoints Anticipated

- [ ] None for dev refactor — no production deploy

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Broken `__dirname` in Vite/Electron plugins | High | Slice 2 dedicated pass; manual Studio launch |
| electron-builder cannot find icons/dist | Medium | Move icons with studio; verify builder paths |
| ESLint misses Studio files | Medium | Explicit `apps/studio/**` override |
| Test glob misses moved tests | Medium | Update sweep command in TESTING.md; run full sweep |
| Scope creep (rename shared folder, Turbo) | Medium | Explicit out-of-scope list; review gate |
| `migrate-shared-imports.mjs` / `fix-studio-ui-imports.mjs` silently walk stale root-relative paths | Medium | Slice 0 step 4: update or archive explicitly before move |
| Move commit tangles with uncommitted Portal show-selection work in working tree | High | Slice 0 step 0 precondition: clean `git status` before starting; move lands as isolated commit |

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No (Fresh Prints app repo) |
| Development Tooling | Yes — root `package.json`, scripts |
| Documentation | Yes — ARCHITECTURE, TESTING, DEPLOYMENT |
| Distribution/Installer | Yes — electron-builder paths |

---

## Rollback Plan

1. `git revert` the merge commit for this phase.
2. Confirm `npm run dev:studio` at pre-migration layout.
3. No Firestore/data rollback.

---

## Documentation Updates Required

- [x] ARCHITECTURE.md
- [x] TESTING.md
- [x] DEPLOYMENT.md
- [x] CODING_STANDARDS.md (path examples)
- [x] STYLE_GUIDE.md (path examples if needed)
- [x] DECISIONS.md (ADR-FP-067 optional)
- [x] project-chatgpt-handoff/08-tech-stack-repo-map.md

---

## Open Questions

- [x] ~~Output dirs under `apps/studio/` vs repo root~~ — **RESOLVED: `apps/studio/dist*` and `apps/studio/release/`**, locked in Slice 2 (required for `APP_ROOT` correctness, not just symmetry — see worked example).
- [x] ~~Full `build:studio` installer vs vite-only smoke~~ — **RESOLVED: full installer build required** in Slice 5 check #6, since packaging is where path-resolution bugs from this move would actually surface.

No open questions remain — both prior open items are locked decisions as of this revision.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-08-symmetric-apps-monorepo-review.md`
- Verdict: **approved**
