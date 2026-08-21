# Plan: Studio Updater, Design ID Search, and Tag Picker Polish

| Field | Value |
|-------|-------|
| Date | 2026-08-21 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `studio-updater-design-id-search-tag-picker-polish` |
| Related | docs/workflow/reviews/2026-08-21-studio-updater-design-id-search-tag-picker-polish-review.md |

---

## Goal

Three narrow Studio-only UX corrections before the next Studio release: (1) Studio Updates must be a true application-level modal (layering + responsive width), (2) Design Library search must find a catalog design by its full persisted ID, (3) approved-tag search must close after a tag is selected, matching the category selector on the same edit surface.

## Background

### Git identity (verified 2026-08-21 after `git fetch origin development production`)

| Item | Value |
|------|--------|
| Checkout | `C:\coding\fresh-prints` |
| Branch | **`development`** |
| Local HEAD | `eaf52e7265c9dbc3f1a82782380f9b899ebbe9a7` |
| `origin/development` | `eaf52e7265c9dbc3f1a82782380f9b899ebbe9a7` |
| `origin/production` | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` (PR **#84** merge) |
| HEAD == `origin/development` | **yes** |
| New branch/worktree | **not created** |
| Protected stashes | preserved (`stash@{0}` reconciliation dirty checkout; `stash@{1}` `td030-wip-leave-unrelated`; others untouched) |

Working tree is **dirty only with promotion-workflow docs** from the parked goal `promote-print-request-correctives-to-production` (state + plan/review/rollout records). Those files are not this goal’s product source. Do not revert them. Do not bump Studio version in this goal.

Phase 9 remains **PARKED**. Print Request production promotion is **paused** at Gate D LIVE awaiting owner Portal QA / Studio version; this goal does not reopen it.

### Product context

Studio Updates landed in 1.0.7 as a sidebar-footer modal (`studio-1.0.7-helper-update-access`). Owner reproduction: opening it on Show Queue paints page content over the dialog, and the dialog is too narrow. Design Library text search already matches `design.id` **on the currently loaded page**, but ready-catalog search goes through Algolia whose `searchableAttributes` do **not** include `objectID`. Tag chips on the design edit form keep the suggestion list open after pick; the sibling Category `Select` closes.

---

## Scope

### In Scope

- Portal Studio Updates overlay to `document.body` and size the updater dialog only
- Bounded full-design-ID lookup in Design Library search (ready + archived + request-selection modes as they exist today)
- Close approved-tag suggestions after selecting a suggestion in `TagChipInput`
- Focused tests + Studio typecheck/lint/Vite; owner manual overlay check on Show Queue

### Out of Scope

- Portal, Functions, Rules, indexes, schema, Algolia index settings / `setSettings`
- Print Request behavior, Show Queue behavior (except being covered by the overlay)
- Updater permissions, IPC, auto-update mechanics, Mac signing, Windows updater logic
- Tag Management, AI tagging, aliases, reranking, Portal tags, taxonomy data
- Studio version bump / publish / production PR
- Phase 9

---

## Affected Areas

### Files / Modules (repo-verified)

| Concern | Existing file(s) | Why touched |
|---------|------------------|-------------|
| Updates modal trigger | `apps/studio/src/renderer/src/shared/components/Sidebar.tsx` | Footer **Studio Updates** button; currently mounts modal **inside** `<aside class="sidebar">` (line ~521) |
| Updates modal | `apps/studio/src/renderer/src/features/settings/components/StudioUpdatesModal.tsx` | Portal overlay to `document.body`; updater-only width/height/scroll class; keep `StudioUpdatesSettingsSection` unchanged |
| Modal primitive | `apps/studio/src/renderer/src/shared/components/Modal.tsx` | **Read-only** — presentational panel only; no portal |
| Existing portal pattern | `apps/studio/src/renderer/src/shared/components/Select.tsx`, `DangerOverflowMenu.tsx` | **Read-only reference** — `createPortal(..., document.body)` |
| Modal / overlay CSS | `apps/studio/src/renderer/src/styles/components/modals.css`, `tokens.css` | **Read-only** for `--z-modal` / `--panel-width-lg`; do **not** globally widen `.modal-panel-lg` |
| Sidebar stacking | `apps/studio/src/renderer/src/styles/components/navigation.css` | **Read-only root cause** — `.sidebar { isolation: isolate; overflow-x: hidden; overflow-y: auto; }` |
| Updater-only styles | `apps/studio/src/renderer/src/styles/components/settings.css` | Scoped overlay z-index + responsive panel width/max-height/overflow for this modal only |
| Updater body | `apps/studio/src/renderer/src/features/settings/components/StudioUpdatesSettingsSection.tsx` | **No product edits** (1.0.7 contract) |
| Design search matcher | `apps/studio/src/renderer/src/features/designs/utils/designLibrarySearch.ts` | Already matches `design.id` substring on **loaded** rows; keep; add tests if needed |
| Managed search | `apps/studio/src/renderer/src/features/designs/hooks/useDesignLibraryManagedSearch.ts` | Merge bounded exact-ID hydrate when query is a full ID candidate |
| Algolia list | `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogSearchService.ts` | Optional merge point; **no** `setSettings` / searchableAttributes change |
| ID hydrate | `apps/studio/src/renderer/src/features/designs/services/designService.ts` | **Reuse** `getDesignById` / `getDesignsByIds` (already one-doc, no collection scan) |
| Library page | `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` | Wire exact-ID merge for archived / non-managed browse; keep filters |
| Exact-ID helper (new beside existing) | `apps/studio/src/renderer/src/features/designs/utils/designLibraryExactIdSearch.ts` (+ `.test.ts`) | Heuristic + merge + archived/ready visibility; not a new feature folder |
| Search tests | `apps/studio/src/renderer/src/features/designs/utils/designLibrarySearch.test.ts`; `studioAlgoliaCatalogSearch.containment.test.ts` | ID regression + no `loadAll` / `getDocs` scan |
| Tag picker | `apps/studio/src/renderer/src/shared/components/TagChipInput.tsx` | `selectSuggestion` must close the list and clear typed text (already clears text) |
| Category reference | `apps/studio/src/renderer/src/shared/components/Select.tsx` used from `DesignFormFields.tsx` (`searchable` Category) | **Read-only** — `selectOption` calls `closeMenu()` |
| Edit surface | `apps/studio/src/renderer/src/features/designs/components/DesignFormFields.tsx` | **Read-only wiring** unless a one-line prop is required (not expected) |
| Tag picker tests | new `TagChipInput.closeAfterSelect.contract.test.ts` beside the component | Source contract that `selectSuggestion` closes suggestions |
| Updater tests | `apps/studio/src/renderer/src/shared/components/Sidebar.studioUpdatesAccess.contract.test.ts` | Assert portal-to-`document.body`; permissions unchanged |

**No** `apps/portal/**`, `functions/**`, `packages/shared/**`, Rules, Storage Rules, `firestore.indexes.json`, or Firebase config.

### Architecture Impact

- [x] Details: Stay Page/Sidebar → component. Overlay uses the **existing** `createPortal(document.body)` pattern. No new ModalHost unless review later requires it. Search stays matcher + existing `designService` one-doc reads. Tag close is local UI state in `TagChipInput`.

### Security Impact

- [x] Details: Updater permission gating unchanged (`canAccessDesktopApp`). Design ID lookup uses existing `canViewDesigns` via `getDesignById`. No new public endpoints, no Algolia admin, no secrets.

### Data Model Impact

- [x] None — no schema, status, or field changes.

### Backend Impact

- [x] None — no Functions/Rules/indexes/App Hosting.

### UI / UX Impact

- [x] Details: Application-level updater overlay; Design Library ID find; tag dropdown closes after pick. Manual UI checkpoint for Show Queue overlay + Design Library ID + tag close.

### Migration Impact

- [x] None.

---

## Approach

### 1. Updater layering (root cause)

`StudioUpdatesModal` is a child of `<aside class="sidebar">`.

`.sidebar` in `navigation.css` sets:

- `isolation: isolate` — new stacking context; `--z-modal` (30) cannot compete with main-pane stacking (Show Queue `z-index: 20`, Design Library sticky `--z-sticky`, print-request autosave `z-index: 40` / `--z-lightbox: 40`)
- `overflow-x: hidden` and `overflow-y: auto` — clips the “fixed” overlay to the sidebar box, which also explains the squeezed width

`Modal.tsx` is **not** a portal. There is **no** shared `ModalHost`. Established escape hatch: `createPortal(..., document.body)` in `Select.tsx` and `DangerOverflowMenu.tsx`.

**Fix:** In `StudioUpdatesModal`, portal the overlay to `document.body`. Do **not** raise z-index inside the sidebar. After portal, give **this overlay only** a class such as `studio-updates-modal-overlay` with `z-index: calc(var(--z-lightbox) + 10)` so it sits above lightbox/autosave (40) without changing global `--z-modal` or other modals.

Keep trigger, close-on-overlay-click, close button, and `StudioUpdatesSettingsSection` as-is.

### 2. Updater width

`.modal-panel` uses `--panel-width-lg: 28rem`. `.modal-panel-lg` later sets `max-width: 42rem; width: 100%`, but while the overlay is clipped to the sidebar (~15.5rem / collapsed ~4.75rem) that never matters.

**Fix (updater-only class, e.g. `studio-updates-modal-panel`):**

- `width: min(42rem, calc(100vw - 2 * var(--space-6)))`
- `max-height: min(90vh, calc(100vh - 2 * var(--space-6)))`
- `overflow-x: hidden` on the panel; `overflow-y: auto` on `.modal-body` / panel so tall release notes scroll vertically
- Must remain inside the viewport at ~1366×768
- **Do not** change global `.modal-panel-lg` (Design Library, Users, Add to Show, etc.)

Do not redesign updater copy, buttons, or states.

### 3. Design ID search

**Current searchable fields (client matcher `designMatchesSearchQuery`):** `id`, `title`, `description`, tag names; with `catalogTags`, tag aliases too. Test already: “matches design ids” on **in-memory** rows.

**Ready catalog path:** `managedSearchActive` → Algolia `listMatchingDesigns`. Live `searchableAttributes`: `title`, `searchText`, `categoryName`, `unordered(tagFacetKeys)` — **not** `objectID`. `searchText` is title/description/category/tags/aliases, **not** the document ID. Pasting a full ID therefore returns no Algolia hits.

**Archived / page-local path:** `filterDesignsBySearch` on the current Firestore page only — ID of a design not on that page is missed.

**Smallest bounded change:**

1. New helper: treat a trimmed query as a **full document-ID candidate** only when it has no whitespace and matches a conservative Firestore-id pattern (alphanumeric + `_`/`-`, typical auto-id length ~20; do **not** `getDoc` on every title keystroke).
2. One `designService.getDesignsByIds(caller, [id])` (existing; no `getDocs` collection scan).
3. Merge into the current result list (dedupe by id), then apply **existing** visibility: ready library vs archived toggle, category, tags, needs-companion, request-selection. A nonexistent ID adds nothing (no false row).
4. Keep substring ID matching on already-loaded rows (no new partial-ID query system).
5. Do **not** change Algolia index settings (would affect Portal). Do **not** `loadAll`.

Wire in `useDesignLibraryManagedSearch` (ready/search/filter path) and `DesignLibraryPage` for the archived/non-managed search path so both modes get a full-ID hit.

### 4. Tag picker close

**Tag picker:** `TagChipInput` (`approvedTags` mode) on `DesignFormFields` (Design Library create/edit modal) and `AiReviewFormPanel` (same approved-tag control).

**Category reference:** `Select` `searchable` on `DesignFormFields` (`label="Category"`). `selectOption` → `emitChange` + `closeMenu()`.

**Why tags stay open:** `selectSuggestion` adds the tag and `setInputValue("")` but **never** `setIsSuggestionsOpen(false)`. Empty query still yields remaining suggestions (`buildCatalogTagSuggestions`), so `showSuggestions` stays true.

**Consumers (not a STOP):**

| Consumer | `approvedTags`? | Effect of close-after-select |
|----------|-----------------|------------------------------|
| `DesignFormFields` Tags | yes | **Intended** — catalog edit surface |
| `AiReviewFormPanel` Tags | yes | Same approved-tag combobox; closing is correct |
| `DesignFormFields` / AI Review censored terms | no | No suggestion list |
| `SettingsPage` additional exclusions | no | No suggestion list |
| `TagManagementModal` | n/a | **Untouched** |

**Fix:** In `selectSuggestion`, after a successful add: `setIsSuggestionsOpen(false)`, keep `setInputValue("")`. Parent design modal stays open. Focused input can reopen via type/focus to add another tag. Multi-tag unchanged.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Focused tests | `npx tsx --test` on updater contract, exact-ID helper, search tests, tag-close contract, Algolia containment | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Lint | `npm run lint` | yes |
| Studio Vite | `npx vite build` from `apps/studio` | yes |
| `git diff --check` | scoped | yes |
| Portal / Functions / rules | n/a | no |
| Studio installer | no (dev updater fallback is enough for layout) | no |

### Manual

- [x] Details: Open Studio Updates from **Show Queue**, Design Library, and one other route. Confirm full-viewport backdrop, no page chrome above the dialog, no click-through, close works, content not clipped at ~1366×768. Packaged update actions remain gated to installed builds. Paste a real design ID in Design Library; nonexistent ID empty; title/filters/archived/selection unchanged. Tag search: type, select, list closes, chip remains, add a second tag, parent modal stays open.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Show Queue overlay + ID search + tag close)
- [ ] Production deploy (later separate promotion; not this goal)
- [ ] Studio version / publish (explicitly **not** this goal)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Portal overlay still under a `z-index: 40` surface | Medium | Scoped overlay z-index above `--z-lightbox`; do not change global token |
| Extra `getDoc` on ordinary title search | Medium | ID-candidate heuristic only; no collection scan |
| Exact ID of archived design appears in ready library | Medium | Apply existing archived/ready visibility after hydrate |
| Closing tags in AI Review surprises staff | Low | Same combobox as Design Form; category already closes |
| Shared `.modal-panel-lg` widening | High | Updater-only class |

---

## Rollback Plan

Revert the Studio renderer/CSS/test commits on `development`. No production, Functions, or index rollback. Updater IPC unchanged.

---

## Documentation Updates Required

- [ ] DECISIONS.md — only if review asks for an ADR (not expected)
- [x] Other: workflow plan/review/test/signoff; CURRENT-STATE at Signoff. No DEPLOYMENT/Algolia/Portal docs.

---

## Open Questions

- [x] None blocking. Studio version remains owner-chosen in a later release workflow.

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-21-studio-updater-design-id-search-tag-picker-polish-review.md
- Verdict: approved (Formal Review + Signoff). Owner implement phrase received; owner `AL PASS`.

## Implement authorization phrase

```text
APPROVE IMPLEMENT: studio-updater-design-id-search-tag-picker-polish
```
