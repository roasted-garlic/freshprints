# Review: Symmetric Apps Monorepo — Studio → `apps/studio`

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Reviewer | Review Agent (Claude) |
| Plan | `docs/workflow/plans/2026-07-08-symmetric-apps-monorepo-plan.md` |
| Goal ID | `studio-apps-folder-monorepo-normalization` |
| Verdict | **Approved** |

---

## Method

Verified the plan against actual repo state rather than reviewing it in isolation: read root `package.json`, `vite.config.ts`, `electron/main.ts`, `electron-builder.json5`, `tsconfig.json`/`tsconfig.node.json`, `.eslintrc.cjs`, `firebase.json`, `functions/tsconfig.json`, `apps/portal/tsconfig.json`, both `scripts/*.mjs` migration helpers, `.gitignore`, and current `git status`.

## Findings (round 1) — all resolved in this revision

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 1 | `scripts/migrate-shared-imports.mjs` and `scripts/fix-studio-ui-imports.mjs` have hardcoded root-relative path anchors and skip-dir lists; neither was in the original inventory list | Medium | Added to Slice 0 inventory table (line 102–103) and as explicit Slice 0 step 4 |
| 2 | `electron/main.ts:37` `APP_ROOT` computation and the icon path derived from it (`electron/main.ts:211`) were covered only by a generic risk bullet, not a concrete before/after resolution | High | Slice 2 now has a locked decision + worked-example path trace showing before/after `__dirname` resolution |
| 3 | `package-lock.json` regeneration wasn't mentioned; workspace `packages` map has no `apps/studio` entry today | Medium | Added to Slice 0 inventory and as Slice 2 step 5 |
| 4 | `functions/tsconfig.json` includes `../packages/shared/src` directly — plan's out-of-scope note could be misread as ignoring this coupling | Low | Added explanatory note in Out of Scope section clarifying why it stays correct |
| 5 | Uncommitted working-tree changes (Portal show-selection feature) exist right now; no precondition to isolate the move from them | High | Added as Slice 0 step 0 precondition and as a new High-severity risk row |
| 6 | Two open questions (output dir location, full build vs smoke) were left undecided at review time, to be resolved during execution | Low | Both resolved and locked in the plan text (Slice 2, Slice 5 check #6); Open Questions section now empty |

All six were addressed directly in the plan document — see `docs/workflow/plans/2026-07-08-symmetric-apps-monorepo-plan.md` slices 0, 2, and the Risks/Open Questions sections.

## What the plan gets right

- Mechanical-only framing with a hard "zero product logic changes" rule.
- Explicit, appropriately conservative out-of-scope list (no Turborepo/Nx/pnpm, no `functions/` workspace conversion, no shared-folder rename).
- Full verification gate with concrete, runnable commands per slice rather than vague "test everything."
- Rollback is a single revert — appropriate for a pure `git mv` + config change with no data migration.
- Relative imports inside `src/renderer/` are self-contained (not root-anchored), so `git mv` alone correctly preserves them — plan doesn't need to touch these, and correctly doesn't.

## Conditions of approval

None outstanding — all round-1 findings are addressed in the current plan revision. Proceed to implementation with the following execution notes carried forward from the plan itself:

1. Confirm clean `git status` before starting (Slice 0 step 0).
2. Treat the `apps/studio/dist*` and `apps/studio/release/` output-dir decision and the full-installer-build decision as locked — do not re-open at implementation time.
3. Run the Slice 5 gate in full, including the full electron-builder installer build (check #6), before signoff.

---

## Approval

- Plan: `docs/workflow/plans/2026-07-08-symmetric-apps-monorepo-plan.md`
- Verdict: **Approved** — proceed to implementation (Slice 0).
