# Plan: Promote Studio Polish to Production

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `promote-studio-updater-design-id-search-tag-picker-polish-to-production` |
| Related | docs/workflow/reviews/2026-08-21-promote-studio-updater-design-id-search-tag-picker-polish-to-production-review.md |

---

## Goal

Promote the already signed-off Studio-only goal `studio-updater-design-id-search-tag-picker-polish` from protected `development` to `production` via a Git PR. Do not reopen Print Request Portal/Function/index work. Do not bump Studio version or publish a Studio release in this first pass.

## Background

Checkout verified 2026-08-21 after `git fetch origin development production`:

| Item | Value |
|------|-------|
| Local branch | `development` |
| Local HEAD | `82acfadb57392c7f56e1f0c3ff4d85c0bb4a85e8` |
| `origin/development` | `82acfadb57392c7f56e1f0c3ff4d85c0bb4a85e8` |
| `origin/production` | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` |
| HEAD == `origin/development` | **yes** |
| `445ab13` ancestor of `origin/development` | **yes** (`445ab1325ea18d306b239034143d2f8284c31b85`) |
| `82acfad` ancestor of `origin/development` | **yes** (tip) |
| Production tip is PR **#84** merge | **yes** (parents `99b2303` + `eaf52e7`) |
| Ahead/behind `origin/production...origin/development` | **2 / 2** |

Working tree: dirty only with this promotion’s workflow state plus **untracked parked Print Request promotion docs**. Those untracked files are **not** on `origin/development` and **must not** be added, committed, deleted, or edited in this goal.

Protected stashes untouched. Phase 9 remains **PARKED**.

DEV signoff for the product goal: **approved** — `docs/workflow/reviews/2026-08-21-studio-updater-design-id-search-tag-picker-polish-signoff.md`. Owner QA `AL PASS`.

Live Portal remains `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a` **100%**. This promotion must not change that.

---

## 1. Exact SHAs

| Side | SHA |
|------|-----|
| `origin/development` | `82acfadb57392c7f56e1f0c3ff4d85c0bb4a85e8` |
| `origin/production` | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` |
| Rollback production (Git) | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` |

Post-merge production SHA is **unknown until Gate B merge**. Record it then. Do not use a guessed SHA for Studio release.

---

## 2. Complete commit range

`origin/production..origin/development` (**2 commits**):

| SHA | Message | Classification |
|-----|---------|----------------|
| `445ab1325ea18d306b239034143d2f8284c31b85` | feat(studio): portal Updates overlay and find designs by full ID | **signed-off product** — `studio-updater-design-id-search-tag-picker-polish` |
| `82acfadb57392c7f56e1f0c3ff4d85c0bb4a85e8` | docs(workflow): record Studio polish commit on development | **documentation only** |

Production-only commits not on `development` (expected merge history, not extra product):

| SHA | Message |
|-----|---------|
| `7716d4a` | Merge pull request **#84** from `development` |
| `99b2303` | Merge pull request **#83** from `development` |

No unsigned-off implementation in the range. **No STOP** on silent bundling.

---

## 3. Complete product scope

The promotion contains only the signed-off Studio polish:

1. Studio Updates modal portals to `document.body`
2. Updater overlay covers page content (scoped z-index above lightbox)
3. Updater-only responsive panel width (does not change `.modal-panel-lg`)
4. Design Library full document-ID search via bounded `getDesignsByIds` (no collection scan, no Algolia `setSettings`)
5. Approved-tag suggestions close after selection
6. **Load more designs** hidden when the last Algolia page is short
7. Tests and workflow/docs for this goal

---

## 4. Exact changed product files

`git diff --name-status origin/production...origin/development` (25 paths):

**Studio product / tests**

| Status | Path |
|--------|------|
| M | `apps/studio/src/renderer/src/features/settings/components/StudioUpdatesModal.tsx` |
| M | `apps/studio/src/renderer/src/styles/components/settings.css` |
| M | `apps/studio/src/renderer/src/features/designs/hooks/useDesignLibraryManagedSearch.ts` |
| M | `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` |
| A | `apps/studio/src/renderer/src/features/designs/utils/designLibraryExactIdSearch.ts` |
| A | `apps/studio/src/renderer/src/features/designs/utils/designLibraryExactIdSearch.test.ts` |
| A | `apps/studio/src/renderer/src/features/designs/utils/deriveManagedCatalogHasMore.ts` |
| A | `apps/studio/src/renderer/src/features/designs/utils/deriveManagedCatalogHasMore.test.ts` |
| M | `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogSearch.containment.test.ts` |
| M | `apps/studio/src/renderer/src/shared/components/TagChipInput.tsx` |
| A | `apps/studio/src/renderer/src/shared/components/TagChipInput.closeAfterSelect.contract.test.ts` |
| M | `apps/studio/src/renderer/src/shared/components/Sidebar.studioUpdatesAccess.contract.test.ts` |

**Docs / workflow (not runtime Portal/backend)**

| Status | Path |
|--------|------|
| M | `.cursor/workflow/state.md` |
| M | `docs/project/ROADMAP.md` |
| M | `docs/standards/STYLE_GUIDE.md` |
| A | `docs/workflow/plans/2026-08-21-studio-updater-design-id-search-tag-picker-polish-plan.md` |
| A | `docs/workflow/reviews/2026-08-21-studio-updater-design-id-search-tag-picker-polish-*.md` (review, test, manual, signoff) |
| M | `references/project-chatgpt-handoff/{CURRENT-STATE,13-recent-completed-work,03-roadmap-and-phases,04-features-inventory,MANIFEST}.md` |

**Absent from the range (required):** `apps/portal/**`, `functions/**`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, Firebase config, `apps/studio/package.json`, `.github/workflows/studio-release.yml`.

---

## 5. Test results (this reconciliation pass)

Run against local HEAD == `origin/development` `82acfad`.

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Focused tests | `npx tsx --test` updater contract, exact-ID helper, `deriveManagedCatalogHasMore`, search tests, tag-close, Algolia containment | 0 | **pass** 51/51 |
| Studio typecheck | `npx tsc --noEmit` from `apps/studio/` | 0 | **pass** |
| Lint | `npm run lint` | 0 | **pass** |
| Studio Vite | `npx vite build` from `apps/studio/` | 0 | **pass** (existing chunk-size warnings) |
| `git diff --check` | `origin/production...origin/development` | 2 | **failed_documented** — 3 trailing-space lines in already-committed manual-checkpoint markdown (hard line breaks). No product TS/CSS. Do **not** rewrite signed-off commits. |
| Portal / Functions / rules | n/a | — | skip (not in range) |
| Studio installer / `build:studio` | n/a | — | skip (later Studio gate) |

Studio `package.json` remains **1.0.7**. `.github/workflows/studio-release.yml` still pins expected version **1.0.7**. This promotion must not change either.

---

## 6. Confirmation: no Portal / backend / Firebase deploy required

| Surface | Required? |
|---------|-----------|
| Git PR `development` → `production` | **yes** (this goal) |
| Firebase deploy | **no** |
| App Hosting rollout | **no** — leave `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a` |
| Cloud Function deploy | **no** |
| Firestore index deploy | **no** |
| Rules deploy | **no** |
| Data migration | **no** |
| Algolia `setSettings` | **no** |
| Studio version bump | **no** this pass |
| Studio release dispatch/publish | **no** this pass |

App Hosting is connected to the `production` live branch. This plan **does not authorize** a Portal rollout. If a connected-codebase auto-build appears after merge, do **not** shift traffic; live Portal stays on `7716d4a`.

---

## 7. Rollback

| Layer | Rollback |
|-------|----------|
| Git `production` | Revert the promotion merge, restoring tip **`7716d4a97f83c2dbe5602fb3e149875d6d7f38c9`** (PR #84). Never force-push `production`. |
| Portal | Unchanged by this goal. Live rollback pin remains `fresh-prints-portal-build-2026-08-19-001` @ `99b2303` if a later Portal incident needs it. |
| Studio users | Unchanged until a later packaged release. Published **1.0.7** does not pick up this source until a new version is built from post-merge `production`. |

---

## 8. Later Studio release dependency

Staff get this polish only after a **separate** Studio release goal:

1. Owner chooses a version **newer than 1.0.7**
2. Version pins (`apps/studio/package.json` and `studio-release.yml` expected-version assert) updated in that later goal
3. Stable `workflow_dispatch` from post-merge `production` SHA (or `production` branch)
4. Owner publish phrase

Do **not** dispatch `studio-release.yml` for 1.0.7 against the new SHA (same version, new source — updater collision).

Parked Print Request Studio list-split is **already in `7716d4a` / production Git** but **not** in published 1.0.7. A future Studio version may include **both** list-split and this polish. That version number is **owner-chosen**, not invented here.

---

## 9. Human approval checkpoints

| Gate | Phrase | Action |
|------|--------|--------|
| A create | `APPROVE CREATE PRODUCTION PR: promote-studio-updater-design-id-search-tag-picker-polish-to-production` | Open protected PR `development` → `production` from `82acfad`. **Do not merge.** |
| B merge | `APPROVE MERGE PRODUCTION PR: promote-studio-updater-design-id-search-tag-picker-polish-to-production` | Merge after owner audit. Re-verify `origin/production` still `7716d4a` and `origin/development` still `82acfad` before merge. |

No Gate for App Hosting, Functions, indexes, Rules, or Studio publish in this goal.

---

## Approach

1. Formal Review of this plan (this pass).
2. **STOP.** Await Gate A create phrase.
3. After create phrase: open PR only; do not merge.
4. **STOP.** Await Gate B merge phrase.
5. After merge: record merge SHA; do not deploy Firebase; do not bump Studio version.

---

## Out of Scope

- Portal, App Hosting, Functions, Rules, indexes, Firebase config, Algolia settings, schema
- Print Request behavior
- Phase 9
- Studio version bump / release workflow pin / `build:studio` / GitHub Release
- Committing or editing parked `promote-print-request-correctives-*` untracked docs
- New branches/worktrees; force-push; direct-push `production`

---

## Affected Areas

### Architecture / Security / Data / Backend / Migration

- [x] None for promotion. Product already signed off. ID lookup still `canViewDesigns` + one-doc `getDesignsByIds`. No new endpoints.

### UI / UX

- [x] Already owner-QA’d on DEV (`AL PASS`). Production Git merge does not ship UI until Studio release.

---

## Test Strategy

See §5. Re-run focused Studio checks before merge if `origin/development` or `origin/production` moves.

### Manual

- [x] DEV QA already **PASS**. No additional production UI checkpoint for this Git-only promotion. Studio packaged smoke belongs to a later release goal.

---

## Human Checkpoints Anticipated

- [x] Production PR create
- [x] Production PR merge
- [ ] Studio version / publish (later separate goal)
- [ ] Production App Hosting / Functions / indexes (not this goal)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| App Hosting auto-build on `production` merge | Medium | Do not authorize traffic shift; live build stays `7716d4a` |
| Trailing whitespace in checkpoint markdown | Low | Documented; do not rewrite signed-off SHAs |
| Publishing 1.0.7 from new SHA | High | Forbidden until owner version + pin update |
| Production moved since this review | High | Re-verify SHAs before create/merge; STOP if range changes |
| Bundling parked Print Request docs | High | Leave untracked files untouched |

---

## Rollback Plan

See §7.

---

## Documentation Updates Required

- [ ] DEPLOYMENT.md — no process change
- [x] Other: this plan + Formal Review; post-merge ROADMAP / CURRENT-STATE / workflow state

---

## Open Questions

- [x] None blocking this Plan → Review → STOP pass.

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-21-promote-studio-updater-design-id-search-tag-picker-polish-to-production-review.md
- Verdict: approved
