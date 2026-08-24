# Plan: Studio workflow organization and grouped gang sheet export

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `studio-workflow-organization-and-grouped-gang-sheet` |
| Baseline commit | `7dfd7ee` (`development`, clean working tree verified) |
| Related | docs/workflow/reviews/2026-08-23-studio-workflow-organization-and-grouped-gang-sheet-review.md |

---

## Goal

Improve five existing Fresh Prints **Studio** workflows without changing Portal, Firebase deployment scope, or Print Request lifecycle rules:

1. **WS1** — Visually organize Print Requests by show inside the existing Customer/Internal × lifecycle structure.
2. **WS2** — Condense the Normalized Files modal with viewport-safe internal scrolling.
3. **WS3** — Add search on **AI Review → Needs Review** only, with shared catalog search normalization.
4. **WS4** — Preserve Design Library scroll position and list state after metadata save.
5. **WS5** — Add a **second** gang sheet generation mode grouped by customer/user/request, leaving the existing efficiency-first auto-nested generator unchanged.

**FreshForge impact:** Documentation (DECISIONS ADR), Studio renderer + Electron main-process export, shared pure utilities. No Starter Surface change.

**Explicitly excluded from this goal:** Portal show-browsing Functions deployment, production Firebase deploy, Phase 9, manual Gang Sheet Builder canvas, replacing/removing the existing gang sheet button.

---

## Background

Staff workflows are scaling: Print Requests are hard to scan across shows, import normalization modals overflow the viewport, AI Review Needs Review lacks quick lookup, Design Library editing resets scroll, and post-print physical sorting would benefit from a request-grouped gang sheet export alongside the existing nesting-efficient export.

Roadmap alignment: Phase 2/4 (Design Library), Phase 3 (Imports), Phase 5 (AI Review), Phase 6 (Print Requests), Phase 7 (Show Queue / gang sheet export).

---

## Scope

### In Scope

| WS | Summary |
|----|---------|
| WS1 | Compact show section headers in Print Requests rail; hydrate show allocation rows for current page |
| WS2 | Max-height + internal scroll on Normalized Files modal; tighter card spacing |
| WS3 | Needs Review search UI + filter; auto-hydrate additional pages while searching |
| WS4 | Patch-first save path; preserve scroll container position |
| WS5 | Second Generate button + grouped layout mode; shared label renderer extraction; regression tests for existing mode |

### Out of Scope

- Portal changes
- Firebase Functions / Rules / indexes deploy (including prior Portal show callables)
- Production or DEV Firebase deployment
- Firestore schema migration
- Print Request lifecycle / sizing / completion changes
- Replacing or altering default gang sheet algorithm behavior
- Manual Gang Sheet Builder canvas
- Phase 9
- Studio version bump / publish / release

---

## Repo findings — answers to required plan questions

### 1. What causes Print Requests to lack show grouping?

**Root cause:** `PrintRequestsPage` renders a flat `visibleRequests.map()` after search/triage filters. `usePrintRequests.hydratePage()` loads **aggregated** allocation totals via `listAllocationTotalsForRequests` only — no `upcomingShowId` join. Show metadata appears only in the **selected request detail** via `listShowAllocationsForPrintRequest` + `groupAllocationsByShow`.

**Files:** `PrintRequestsPage.tsx`, `usePrintRequests.ts`, `printRequestService.ts` (`listAllocationTotalsForRequests`).

### 2. Multi-show / multi-allocation representation without duplication

**Current data:** A request may have multiple non-canceled `showAllocations` across different `upcomingShowId` values (Studio split via `AddToShowModal`). Canceled allocations are excluded from totals and detail pills.

**Plan decision (owner confirmation recommended):**

| Case | Treatment |
|------|-----------|
| No active allocation | Section **“Not queued to a show”** (Working tab primary value) |
| One show | Section under that show’s title + scheduled date |
| Multiple shows | Card appears **once** under **primary show** = earliest `scheduledStartAt` among active allocations; compact subtitle badge **“+N more shows”** (reuse detail pill date style) |
| Internal Gang Sheets | Same grouping using `formatUpcomingShowTitle` / `formatStaffGangSheetTitle` |

**No card duplication.** Search/filter runs before grouping; empty sections omitted.

**New util:** `packages/shared/src/utils/groupPrintRequestsByShow.ts` (+ tests).

### 3. Normalized Files modal owner

**Component:** `BatchImportDiscoverySummary.tsx` → local `BatchDetailModal` titled **“Normalized files”**.

**Not** per-file rows — aggregated `PRINT_SIZE_NORMALIZED` warning summaries in `.batch-import-normalized-card-grid`.

### 4. Modal height problem: outer height, list layout, or both?

**Both:**

- Modal shell lacks `max-height` / scrollable body (unlike Design Library modal shell).
- Normalized card grid has no `max-height` / `overflow-y` (warning grid in same CSS file uses `max-height: 24rem`).

### 5. How is Needs Review loaded/paginated?

`useAiReviewInbox` → `useDesigns(buildAiReviewInboxListQuery({ tab: "needs_review" }))`.

- Firestore filter: `status: imported`, `aiReviewStatus: needs_review`, `updatedAt desc`
- Page size: `DEFAULT_LIST_LIMIT = 100` (`designService.ts`)
- `hasMore` + **Load more** button in `AiReviewQueueList`
- Tab counts from `useAiReviewTabCounts` (full `countDesigns`, not page-limited)
- Deprecated `AI_REVIEW_SEARCH_QUERY_PARAM` exists but is stripped — no active search

### 6. Can Needs Review search be complete with local filtering only?

**Not with first page alone.** Local filter over hydrated rows is correct **after** the inbox is sufficiently loaded.

**Plan approach:** When `searchQuery` is non-empty on Needs Review:

1. Filter loaded designs with `filterDesignsBySearch` (`designLibrarySearch.ts` → `catalogSearchNormalization`).
2. **Auto-load additional pages** sequentially until `hasMore === false` or a safety cap (default **500** designs) is reached.
3. Show inline status: “Searching N designs…” / “Load more to search additional designs” if cap hit.
4. No Algolia, no new Firestore indexes, no server-side title query in v1.

### 7. What causes Design Library scroll reset?

`DesignLibraryPage.handleDesignUpdated` calls `applyDesignPatch` then **`refreshCatalog()`** → `reloadDesigns()` clears list + `isLoading: true` → `DesignGrid` swaps grid for `PageLoadingState` → `.design-library-catalog-scroll` position lost.

Managed search path also calls `reloadManagedSearch()` which clears designs.

### 8. Deterministic scroll-preservation approach

1. **Primary:** On metadata-only save success, keep `applyDesignPatch` (+ `applyManagedSearchPatch` when active) and **skip** `refreshCatalog()` / `reloadManagedSearch()` unless taxonomy/tags materially changed (not the case for title/category/tag edits in `EditDesignModal`).
2. **Secondary:** Add `reloadDesigns({ preserveList: true })` silent refresh option for cases that still need server reconciliation without full-page loading swap.
3. **Scroll anchor:** Store `scrollTop` on `.design-library-catalog-scroll` before modal open; restore after patch render if sort moves the edited card, scroll edited card into view via `data-design-id` ref (prefer over blind `scrollTop` when `updatedAt` sort changes).
4. Update `designLibraryAuthoritativeSource.test.ts` expectations.

### 9. Files/functions for today’s auto-nested gang sheet

| Layer | Path | Key symbols |
|-------|------|-------------|
| UI | `UpcomingShowsPage.tsx` | `handleGenerateGangSheet`, Generate/Export toggle |
| Modal | `ExportGangSheetConfirmModal.tsx` | Confirm generate/regenerate |
| Hook | `useExportGangSheetPng.ts` | `buildImageRequests`, `generateGangSheet` |
| Main | `electron/services/export/exportGangSheetPng.ts` | `generateGangSheetPng`, `buildSheetLabelSvg` |
| Nesting | `packages/shared/src/utils/gangSheetNesting.ts` | `interleaveGroups`, `nestBoxesIntoShelvesWithHeightCap` |
| Labels/filenames | `packages/shared/src/utils/showExportFilename.ts` | `buildGangSheetBaseFileName`, `buildGangSheetSheetLabel` |
| Cache | `gangSheetCacheFingerprint.ts`, `gangSheetCache.ts` | fingerprint includes layout inputs |

Show Queue and Internal Gang Sheets share the same page (`UpcomingShowsPage`) and export hook.

### 10. Top gang sheet title/name renderer

- **Show-level sheet label:** `buildGangSheetSheetLabel(base, index, total)` + private `buildSheetLabelSvg` in `exportGangSheetPng.ts`
- **Base name:** `buildGangSheetBaseFileName(scheduledStartAt)` → `whatnot_MM-DD-YYYY_gang-sheet`
- Label band height: `computeLabelBandHeightPx(labelFontSizePx)` with `LABEL_TOP_PADDING_PX`, `LABEL_CLEARANCE_PX`

### 11. Reuse title renderer for section headings?

**Yes, with extraction:**

- Extract `buildSheetLabelSvg` + `escapeXmlText` + band height helpers to `packages/shared/src/utils/gangSheetLabelRendering.ts` (or `apps/studio/electron/services/export/gangSheetLabelRendering.ts` if Sharp coupling required — prefer shared SVG string builder).
- Grouped mode uses **section label font** = `Math.round(labelFontSizePx * 0.85)` (documented; owner may tune in QA).
- Section labels are separate layout bands **above** each user/request block — never part of artwork pixel dimensions.

### 12. Authoritative field for same-user grouping

| Request kind | Group key (stable) | Block heading |
|--------------|-------------------|---------------|
| Customer (`customerId` present) | `customerId` | Combined `printRequest.name` values sorted: `name1, name2 combined` |
| Customer without `customerId` (legacy) | `customerUsernameSnapshot` normalized, else `printRequestId` | Actual `printRequest.name` |
| Internal (`isInternal`) | `internalBaseName` when set, else `printRequestId` | Combined internal request names per group |

**Source at export time:** Join allocations → `printRequestId` → batch-load `printRequests` in renderer (`printRequestService`). Use `requestNameSnapshot` on allocation only as display fallback if request doc missing.

**Do not parse usernames from request name strings when `customerId` / `internalBaseName` exists.**

### 13. Internal requests without customer identity

Group by `internalBaseName` (e.g. `roasted_garlic` → combines `roasted_garlic-IR001`, `IR002`). If `internalBaseName` absent (legacy), **one block per `printRequestId`** using `printRequest.name`.

### 14. Same-user multi-request packing and multi-sheet continuation

**Algorithm (new shared planner `planGroupedGangSheetSections.ts`):**

1. Build export image requests per allocation (existing `buildImageRequests` logic).
2. Partition into **production groups** by group key; within each group, sort requests by `printRequest.name`, allocations stable by existing show order.
3. For each group in key order:
   - Insert **section label band** (reserved vertical space, same mechanism as sheet title band).
   - Nest **only that group’s boxes** with existing `nestBoxesIntoShelvesWithHeightCap`.
   - If group spans multiple sheets, repeat section label on continuation sheets: `"{heading} (continued)"` via `buildGangSheetSheetLabel` pattern.
4. Append sheets sequentially; do not interleave users across sheets.
5. Existing **efficiency** mode keeps current path: `interleaveGroups` → single top label → nest all boxes together.

**Quantities / allocation IDs:** unchanged per copy; grouping is layout-only.

### 15. Existing generator regression protection

- `layoutMode: "efficiency"` remains default; existing button/modal path unchanged.
- Extract current body of `generateGangSheetPng` nesting into `buildEfficiencyGangSheetSheets()` without behavior change.
- Golden/unit tests:
  - `gangSheetNesting.test.ts` — unchanged inputs → unchanged outputs
  - New `planGroupedGangSheetSections.test.ts` — ordering, headings, continuation labels
  - New `gangSheetLayoutMode.efficiency.contract.test.ts` — fingerprint + interleave order snapshot
- `gangSheetCacheFingerprint` adds `layoutMode` so caches do not cross-contaminate.

### 16. Schema / Rules / indexes / Functions required?

| Area | Required? | Notes |
|------|-----------|-------|
| Firestore schema | **No** | Read existing allocations + print requests |
| Firestore Rules | **No** | Studio staff reads unchanged |
| Firestore indexes | **No** | Existing `showAllocations` by `printRequestId` queries |
| Cloud Functions | **No** | |
| Portal | **No** | |
| Electron IPC types | **Yes** | Add `layoutMode` + grouping metadata on export request |
| Shared pure utils | **Yes** | Grouping + layout planning |

### 17. Exact files to touch (expected)

**WS1**

- `packages/shared/src/utils/groupPrintRequestsByShow.ts` (new + test)
- `apps/studio/.../print-requests/services/printRequestService.ts`
- `apps/studio/.../print-requests/hooks/usePrintRequests.ts`
- `apps/studio/.../print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/.../styles/components/print-requests.css`
- `apps/studio/.../print-requests/utils/printRequestsPageReadCache.ts` (if caching new hydration)

**WS2**

- `apps/studio/.../imports/components/batch/BatchImportDiscoverySummary.tsx` (optional shell class)
- `apps/studio/.../styles/components/batch-import.css`

**WS3**

- `apps/studio/.../ai-review/types/aiReviewInbox.types.ts`
- `apps/studio/.../ai-review/constants/aiReviewInboxConstants.ts`
- `apps/studio/.../ai-review/hooks/useAiReviewInbox.ts`
- `apps/studio/.../ai-review/pages/AiReviewPage.tsx`
- `apps/studio/.../ai-review/utils/aiReviewNeedsReviewSearch.ts` (new + test, wraps `filterDesignsBySearch`)
- `apps/studio/.../styles/components/ai-review.css`

**WS4**

- `apps/studio/.../designs/pages/DesignLibraryPage.tsx`
- `apps/studio/.../designs/hooks/useDesigns.ts` (optional silent reload)
- `apps/studio/.../designs/components/DesignGrid.tsx` (optional stale-while-revalidate)
- `apps/studio/.../designs/pages/designLibraryAuthoritativeSource.test.ts`

**WS5**

- `packages/shared/src/types/export/gangSheetExportIpc.types.ts`
- `packages/shared/src/utils/gangSheetLabelRendering.ts` (new)
- `packages/shared/src/utils/planGroupedGangSheetSections.ts` (new + test)
- `packages/shared/src/utils/gangSheetCacheFingerprint.ts` (+ test)
- `apps/studio/electron/services/export/exportGangSheetPng.ts`
- `apps/studio/.../upcoming-shows/hooks/useExportGangSheetPng.ts`
- `apps/studio/.../upcoming-shows/pages/UpcomingShowsPage.tsx`
- `apps/studio/.../upcoming-shows/components/ExportGangSheetConfirmModal.tsx`
- `apps/studio/electron/ipc/export/exportRequestValidation.ts`

**Docs**

- `docs/project/DECISIONS.md` — ADR for grouped gang sheet export mode

### 18. Automated and manual test plan

**Automated**

| Check | Command |
|-------|---------|
| Shared unit tests | `npx tsx --test packages/shared/src/utils/groupPrintRequestsByShow.test.ts packages/shared/src/utils/planGroupedGangSheetSections.test.ts packages/shared/src/utils/gangSheetNesting.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts packages/shared/src/utils/showExportFilename.test.ts` |
| Studio renderer tests | `npx tsx --test apps/studio/src/renderer/src/features/ai-review/**/*.test.ts apps/studio/src/renderer/src/features/designs/pages/designLibraryAuthoritativeSource.test.ts` |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) |
| Electron typecheck | `npx tsc --noEmit -p apps/studio/electron` (if separate project) |
| Studio build | `npm run build:studio` |
| Lint | project lint script if configured |
| `git diff --check` | whitespace |

**Manual DEV QA** (owner)

1. Print Requests with ≥2 shows + unassigned requests
2. Normalized Files modal with many normalized size groups
3. Needs Review search finds known title; approve while filtered
4. Design Library deep scroll → edit → save → same viewport
5. Gang sheet: existing mode unchanged; grouped mode with multi-user, multi-request same user, continuation sheet, internal request fallback

### 19. ADR amendment?

**Yes** — add **ADR-FP-0XX: Grouped gang sheet export mode (layout-only)** documenting:

- Second export mode alongside efficiency mode
- Group key rules (customerId / internalBaseName)
- Layout-only; no lifecycle mutation
- Label band reuse

No amendment to Print Request data model.

---

## Workstream implementation approach

### WS1 — Print Requests by show

1. Add `listActiveShowAllocationsForRequests(user, requestIds)` in `printRequestService` (chunked `showAllocations` where `printRequestId in`, filter `status !== canceled`).
2. Extend `hydratePage` to fetch allocations + `getUpcomingShowsByIds` for page show IDs.
3. Implement `groupPrintRequestsByShow` pure util.
4. In `PrintRequestsPage`, replace flat map with section headers + existing cards; add multi-show badge on card meta.
5. CSS: compact `.print-requests-show-section-header` (~0.75rem uppercase secondary or reuse show pill typography scaled down).

### WS2 — Normalized Files modal

1. Add `.batch-import-detail-modal` max-height `min(90vh, 42rem)` + flex column layout.
2. `.modal-body` `overflow-y: auto; flex: 1; min-height: 0`.
3. `.batch-import-normalized-card-grid` → `max-height: 24rem; overflow-y: auto; gap` tightened.
4. Reduce card padding ~15% — preserve all summary fields.

### WS3 — Needs Review search

1. Extend `AiReviewInboxFilters` with `searchQuery?: string` (component state; optional URL param later).
2. Render `GlobalSearchField` only when `filters.tab === "needs_review"`.
3. Filter in `useAiReviewInbox` designs memo via `filterDesignsBySearch`.
4. `useNeedsReviewSearchHydration` effect: while `searchQuery.trim()` and `hasMore` and under cap, call `loadMoreDesigns`.
5. Empty states: distinguish tab-empty vs search-no-match.
6. Approve/reject: existing local reconciliation unchanged; filtered list reconciles via existing `aiReviewLocalReconciliation`.

### WS4 — Design Library scroll

1. Change `handleDesignUpdated` to patch-only path.
2. Track `libraryScrollRef` on `.design-library-catalog-scroll`.
3. After save, `requestAnimationFrame` → restore scroll or `scrollIntoView` edited card.
4. Keep `refreshCatalog` for archive/create flows.

### WS5 — Grouped gang sheet

1. Add `GangSheetLayoutMode = "efficiency" | "grouped_by_customer"`.
2. UI: secondary button **“Generate Grouped Gang Sheet”** next to existing Generate; separate confirm copy in modal or mode prop.
3. Extend `buildImageRequests` to attach `printRequestId`, group key, `requestName` per allocation.
4. Implement `planGroupedGangSheetSections` (pure).
5. Refactor `exportGangSheetPng` to branch on `layoutMode`; extract label SVG builder.
6. Update cache fingerprint.

---

## Architecture impact

- **Studio renderer:** WS1–WS4 UI/hooks; WS5 export hook + page buttons.
- **Electron main:** WS5 `exportGangSheetPng.ts` layout branch only.
- **Shared:** WS1 grouping util; WS5 layout planner + label helpers; IPC types.
- **No layer violations:** Components → hooks → services → Firestore (existing paths).

---

## Security impact

- **None.** Staff-authenticated reads unchanged; export still uses validated Firebase Storage URLs; no new public surfaces.

---

## Data model impact

- **None.** No new persisted fields; grouping uses existing `showAllocations`, `upcomingShows`, `printRequests`.

---

## Backend impact

- **None** (no Cloud Functions, Rules, or indexes).

---

## UI / UX impact

- All five workstreams are staff-facing Studio UX improvements.
- **Manual UI QA required** before signoff (see checklist above).

---

## Migration impact

- **None.**

---

## Human checkpoints anticipated

- [x] Manual UI/UX review (all workstreams)
- [ ] Business logic decision: multi-show primary section vs badge copy (default proposed above)
- [ ] Grouped gang sheet section label size tuning
- [ ] Production deploy — **not in this goal**
- [ ] Firebase deploy — **explicitly forbidden in this prompt**

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| WS1 extra Firestore reads per page | Medium | Chunked queries; cache in page read cache; only active allocations |
| WS3 search cap hides matches beyond 500 | Low | Document cap; show “still loading/searching”; raise cap if queue grows |
| WS4 patch-only save drifts from server | Low | Patch merges server response from `updateDesign`; silent reload on mismatch errors |
| WS5 regression in efficiency export | High | Default mode unchanged; contract tests; separate cache fingerprint |
| WS5 grouped mode sheet length explosion | Medium | Same max length cap; continuation labels; QA with large user groups |
| WS5 performance (many sequential nests) | Medium | Accept for v1; group-local nesting still uses existing shelf algorithm |

---

## Rollback plan

- Revert Studio + shared commits; no data migration to undo.
- Cached gang sheets invalidated by fingerprint change automatically.

---

## Documentation updates required

- [x] `docs/project/DECISIONS.md` — ADR for grouped gang sheet mode
- [ ] `docs/standards/TESTING.md` — only if new test commands become canonical
- [ ] Other permanent docs — not required unless behavior is user-visible outside Studio staff docs

---

## Open questions / owner decisions

1. **Multi-show badge copy** — default `+N more shows`; confirm or prefer full pill list in card subtitle.
2. **Needs Review search cap** — default 500 hydrated designs; confirm.
3. **Grouped section label font scale** — default 85% of sheet label font size.
4. **Prior managed goal** (`our-shows-page-ux`) still has open manual QA/signoff — does not block this plan but should be closed separately.

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-23-studio-workflow-organization-and-grouped-gang-sheet-review.md
- Verdict: pending
