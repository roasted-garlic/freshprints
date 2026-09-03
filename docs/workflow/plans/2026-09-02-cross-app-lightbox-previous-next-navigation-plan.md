# Plan: Cross-App Lightbox Previous / Next Navigation

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal | `cross-app-lightbox-previous-next-navigation` |
| Baseline HEAD | `1e6005b7f6f2ddcdfce696a9e9832f246b8ed2de` (= `origin/development`) |
| Prerequisite | `portal-editing-request-parks-current-draft` signed off, DONE, committed, pushed; tree clean except `.worktrees/` |
| Related | docs/workflow/reviews/2026-09-02-cross-app-lightbox-previous-next-navigation-review.md |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| Batch allocation | **DEFERRED** |

---

## Goal

Anywhere Fresh Prints already opens an image lightbox/preview from a list/grid/collection, users can move through the **currently visible sibling collection** with **Previous / Next / Close** without closing the lightbox. Navigation uses a **stable item id**. When the lightbox closes, the parent surface synchronizes to the **final** lightbox item (selection, detail, scroll/focus) — not the originally opened item.

---

## Background

Owner request after parking goal closeout. Today `DesignPreviewLightbox` (Studio) and `CatalogPreviewLightbox` (Portal) are single-image overlays (Escape + Close only). Per-card local open state means closing always returns to the card that opened the overlay. Staff and customers repeatedly open → close → next thumb → open.

Source authority (verified 2026-09-02): Studio routes in `apps/studio/src/renderer/src/routes/AppRoutes.tsx`; Portal catalog grids open **Details then lightbox**, not direct grid lightbox.

---

## Scope

### In Scope

1. Shared **pure navigation model/helper** (stable id + ordered previewable ids; no React UI forced into shared).
2. Enhance **Studio** `DesignPreviewLightbox` and **Portal** `CatalogPreviewLightbox` with optional Previous/Next (+ optional position indicator) using existing icons (`lucide-react` ChevronLeft/ChevronRight in Studio; `ChevronLeftIcon` / `ChevronRightIcon` in Portal).
3. Wire **included** collection callers (surface matrix in Formal Review).
4. **Final-item-on-close** contract + scroll/focus restoration where the surface has a card/list anchor.
5. Keyboard: preserve Escape; add ArrowLeft/ArrowRight when focus is not in a text field.
6. V1 boundaries: **no wraparound**; navigate **currently loaded** collection only; skip non-previewable siblings.
7. Automated unit/contract tests for shared helper + critical caller contracts; Owner QA checklist.
8. Docs: ROADMAP banner + CURRENT-STATE / workflow state on implement/signoff (not this Plan-only pass beyond workflow state).

### Out of Scope

- Production deploy / Firebase deploy / Functions / Rules / indexes / migrations / Storage path changes.
- Image mutation, derivative regeneration, DPI, metadata, AI approve/reject/skip/auto-advance, request qty/size/add/remove.
- New lightbox on surfaces that only show static thumbs today (`CustomerUploadPanel` on `/donate` and `/requests/artwork`).
- Swipe gesture library; forced single React component in `packages/shared`.
- Auto load-more while navigating (V1).
- Smart Profiling; `show-queue-batch-allocation-performance`.
- Native mobile app.

---

## Affected Areas

### Files / Modules (expected)

**Shared (likely)**

- `packages/shared/src/utils/previewLightboxNavigation.ts` (new)
- `packages/shared/src/utils/previewLightboxNavigation.test.ts` (new)

**Studio lightbox + CSS**

- `apps/studio/src/renderer/src/features/designs/components/DesignPreviewLightbox.tsx`
- Studio lightbox CSS (existing `design-preview-lightbox*` styles — exact stylesheet under Studio styles; verify at implement)
- Callers:
  - `DesignSelectionCard.tsx` (+ lift/collection wiring via `DesignGrid` / `DesignLibraryPage` as needed)
  - `DesignDetailsModal.tsx` + `DesignLibraryPage.tsx` (browse: navigate `selectedDesign` through `filteredDesigns`)
  - `CompanionSetPanel.tsx`
  - `CustomerUploadIntakeSection.tsx` (+ intake selection API)
  - `AiReviewWorkspace.tsx` (+ `selectRelative` / selection API from inbox)
  - `PrintRequestItemCard.tsx` + `PrintRequestsPage.tsx` (lift collection or parent-owned lightbox)
  - `BatchImportFileList.tsx` (validated list)
- **Not changing behavior for:** single-file `ImportResultPanel` (exclude)

**Portal lightbox + CSS**

- `apps/portal/features/catalog/components/CatalogPreviewLightbox.tsx`
- `apps/portal/styles/catalog.css` (and assisted lightbox z-index rules if touched)
- Callers:
  - `CatalogDesignDetailsModal.tsx` + host pages that pass visible design list (`CatalogPageContent`, `CatalogHomePageContent`, favorites, show gallery, dashboard reusable path)
  - `PortalPrintRequestItemCard.tsx` + `PrintRequestDetailView.tsx` (collection lift)
  - `AccountArtworkGallery.tsx` (+ modal filtered past items)
  - `AssistedCreationMediaThumbs.tsx` (when `items.length > 1`)
- **Exclude:** `ShareDesignPortalPageContent`, `AssistedCreationStatusPanel` proof singleton, donate/artwork upload panel thumbs (no lightbox today)

### Architecture Impact

- [x] Details: Shared **model** only; **per-app lightbox wrappers** remain. Callers own collection + stable ids + parent sync. No backend.

### Security Impact

- [x] None (UI navigation only; no new data access, no rule changes).

### Data Model Impact

- [x] None.

### Backend Impact

- [x] None — Functions / Firestore Rules / Storage Rules / indexes / migration / Firebase deploy: **NO**.

### UI / UX Impact

- [x] Details: Previous/Next controls on lightboxes; final-item sync; Owner manual QA required across Studio + Portal (incl. mobile Portal widths).

### Migration Impact

- [x] None.

---

## Approach

### 1. Navigation contract (shared helper)

Pure functions over `{ id: string }[]` (or `string[]` ids) + `activeItemId`:

- `getPreviewNavigationState(items, activeItemId)` → `{ index, canGoPrevious, canGoNext, previousId, nextId, positionLabel }`
- Wraparound: **false** (V1)
- Collection = **caller-supplied ordered previewable siblings** (already filtered/searched/tabbed/loaded)

### 2. Lightbox UI props (per app; names illustrative)

Optional when collection length ≤ 1: hide nav.

```
items: { id: string; previewUrl: string | null; alt: string; ...surfacePreviewFields }[]
activeItemId: string
onActiveItemChange: (id: string) => void
onClose: (finalItemId: string) => void  // or onClose() + parent already continuous
```

Display image/alt from active item via **existing** resolvers at the caller (do not bypass `useDesignDerivativeUrl`, upload preview paths, PR source-aware preview).

Controls: vertically centered left/right; `aria-label="Previous image"` / `"Next image"`; disabled at ends; visible on mobile (no hover-only).

### 3. Parent sync strategy (canonical)

| Pattern | When | Behavior |
|---------|------|----------|
| **A. Continuous** | Parent already has authoritative selection/detail (`selectedDesign`, AI `selectedDesignId`, intake `selectedId`, Portal details `design`, Companion `lightboxMember`) | `onActiveItemChange` updates parent immediately while lightbox open; close inherits final id |
| **B. Local + commit on close** | Overlay-only grids without detail selection driving data fetch (request-selection card nav visual; PR item cards if parent has no selected-item concept) | Keep active id in lightbox/parent local state; on close scroll/focus final card; **do not** mutate request-selection membership / qty |

**Recommendation:** Prefer **A** whenever selection already drives the workspace; use **B** only for overlay-only grids. Avoid mixed accidental inconsistency — Formal Review locks this.

### 4. Surface wiring summary

| Surface | Collection | Stable id | Sync |
|---------|------------|-----------|------|
| Studio Design Library **browse** | `filteredDesigns` (previewable) | `design.id` | Continuous → `setSelectedDesign`; on details close scroll via existing `pendingScrollDesignIdRef` / `[data-design-id]` |
| Studio Design Library **request-selection** | same `filteredDesigns` | `design.id` | Local lightbox nav; close → scroll to final card; **no** add/remove/qty change |
| Studio Companion set | `members` | `member.id` | Continuous `lightboxMember` |
| Studio Customer Uploads `/customer-uploads` | `intake.rows` with preview | `row.id` | Continuous `setSelectedId` |
| Studio Donated Designs `/donated-designs` | same component, `purposeScope=catalog_donation` | `row.id` | Continuous |
| Studio AI Review | `visibleDesigns` for active tab/search | `design.id` | Continuous via existing selection API / `selectRelative`; **not** `autoAdvance` |
| Studio Print Requests | `requestItems` | **`item.id`** | Lift lightbox to page or pass siblings; close → scroll final card; no qty/size mutation |
| Studio Batch import validated list | validated files w/ preview | `filePath` | Local + close anchor |
| Portal catalog Details lightbox | host `displayedDesigns` / rail / favorites / show list | `design.id` | Continuous details design swap |
| Portal PR items | request items | **`item.id`** | Lift/siblings; scroll final; preserve Editing/parking |
| Portal Account past artwork | filtered past tiles | upload `item.id` | Continuous within gallery lightbox state + close stay on final tile |
| Portal Assisted media thumbs | `items` when length > 1 | `item.id` | Local + close |

### 5. Pagination / non-previewable / mutations

- Navigate **loaded** set only; disable Next at last loaded item even if Load more exists.
- Filter nav collection to items that can open existing lightbox (resolvable preview URL).
- If active item removed while open (promote/exclude/approve): prefer close or snap to nearest remaining — implement using existing surface removal behavior; do not redesign actions.
- AI auto-advance / Design Library request-selection membership remain **separate**.

### 6. Implementation order

1. Shared helper + tests  
2. Studio `DesignPreviewLightbox` UI + keyboard  
3. Studio owner-named surfaces  
4. Portal `CatalogPreviewLightbox` UI + keyboard  
5. Portal owner-named + included discovered surfaces  
6. Contract tests + Owner QA  

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared nav unit tests | `npx tsx --test packages/shared/src/utils/previewLightboxNavigation.test.ts` | yes |
| Studio contract/unit (touched) | `npx tsx --test` on new/updated Studio test files | yes |
| Portal contract/unit (touched) | `npx tsx --test` on new/updated Portal test files | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes (touched scope) |
| Functions / rules | N/A | no |
| E2E | N/A this goal | no |

Coverage targets: owner test matrix items 1–11 (shared), plus surface contracts for Design Library, AI Review, uploads/donations, Studio/Portal PR ids, Portal catalog continuous sync, a11y labels/disabled/Escape/arrows.

### Manual

Owner QA A–H (Design Library, AI Review, Customer Uploads/Donated, Studio PR, Portal catalog, Portal PR, filtered list, boundaries) + mobile Portal widths + parked-draft regression smoke on Portal Editing PR.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Owner QA)
- [ ] Design approval (not a redesign — controls only)
- [ ] Business logic decision — none expected if Formal Review has no `[NEEDS OWNER DECISION]`
- [ ] Production deploy — **forbidden**
- [ ] Database migration — none
- [ ] Auth / external service — none
- [ ] Secrets / env — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Continuous selection triggers expensive refetch | Med | Prefer selection APIs that already swap local list members; avoid refetch-by-id on every Next unless existing path requires it |
| Per-card lightbox cannot see siblings | Med | Lift collection to parent or pass ordered ids into card |
| Design Library browse has no direct card lightbox | Med | Navigate via Details + lightbox against `filteredDesigns` |
| Break parked draft / Editing | High | Portal PR changes preview-only; no parking/ownership edits |
| Request-selection membership toggled by nav | High | Explicitly separate preview active id from selection map |
| AI lightbox coupled to autoAdvance | High | Wire only to `selectRelative` / list selection |
| Pagination surprise | Low | V1 loaded-only; document in QA |

---

## Rollback Plan

Revert Studio/Portal lightbox + caller commits on `development`. No data migration. No Firebase rollback needed.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md (only if shared helper location needs note — optional)
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md (if new test file patterns need listing)
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md (optional lightbox control note)
- [x] ROADMAP.md (phase banner on implement/signoff)
- [ ] DECISIONS.md (only if sync strategy ADR needed — optional ADR-lite in review)
- [x] `.cursor/workflow/state.md` + `references/project-chatgpt-handoff/CURRENT-STATE.md`

---

## Open Questions

- [x] None blocking — Formal Review documents include/exclude and architecture without requiring owner product fork. Optional later: swipe gestures; auto load-more; position-counter polish.

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-02-cross-app-lightbox-previous-next-navigation-review.md
- Verdict: pending
