# Review: Cross-App Lightbox Previous / Next Navigation

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-02-cross-app-lightbox-previous-next-navigation-plan.md |
| Verdict | **approved_with_changes** |
| Baseline HEAD | `1e6005b7f6f2ddcdfce696a9e9832f246b8ed2de` (= `origin/development`) |
| Production | **NOT AUTHORIZED** |

---

## Summary

Prerequisite parking goal is fully landed. Source audit confirms Studio `DesignPreviewLightbox` and Portal `CatalogPreviewLightbox` are single-image overlays with no collection navigation; owner-named surfaces map cleanly to routes/components. Plan scope is client-side only and correctly excludes backend. Verdict **approved_with_changes**: implement must follow the locked surface matrix, sync patterns, and Design Library browse wiring via Details+`filteredDesigns` (not inventing a second grid lightbox).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Preview navigation only; Explicit outs |
| Architecture alignment | pass | Shared model + per-app UI wrappers |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Functions/Rules/indexes/migration NO |
| Test strategy adequate | pass | Shared unit + contracts + Owner QA |
| Human checkpoints identified | pass | Owner QA; production forbidden |
| Roadmap alignment | pass | Queued next goal |
| Documentation plan | pass | State/ROADMAP on later phases |
| No silent scope expansion | pass | Donate batch without lightbox stays out |

---

## 1. Previous goal prerequisite status

| Check | Result |
|-------|--------|
| Goal | `portal-editing-request-parks-current-draft` |
| Signoff | approved_with_notes |
| DONE | yes |
| FreshForge | IDLE before this start |
| Committed + pushed | yes — `1e6005b7` docs signoff; `fd3682fa` feat |
| HEAD == origin/development | **yes** `1e6005b7f6f2ddcdfce696a9e9832f246b8ed2de` |
| Working tree | clean except intentional `?? .worktrees/` |

**PASS** — lightbox goal may proceed.

---

## 2–3. Lightbox components

### Studio

| Component | Path |
|-----------|------|
| `DesignPreviewLightbox` | `apps/studio/src/renderer/src/features/designs/components/DesignPreviewLightbox.tsx` |
| `ImportPreviewLightbox` | `apps/studio/src/renderer/src/features/imports/components/ImportPreviewLightbox.tsx` |

### Portal

| Component | Path |
|-----------|------|
| `CatalogPreviewLightbox` | `apps/portal/features/catalog/components/CatalogPreviewLightbox.tsx` |

No other production lightbox primitives under `apps/` (excluding `.worktrees/`).

---

## 4. Complete caller / surface matrix

| App | Route / workspace | Caller | Lightbox | Collection source | Stable id | Order / filters | Pagination | Nav? | Reason if excluded |
|-----|-------------------|--------|----------|-------------------|-----------|-----------------|------------|------|--------------------|
| Studio | `/designs` browse | `DesignDetailsModal` (+ page) | DesignPreview | `filteredDesigns` | `design.id` | search/category/tags/smart/archive/sort | Load more | **YES** | — |
| Studio | `/designs?mode=request-selection` | `DesignSelectionCard` | DesignPreview | `filteredDesigns` | `design.id` | same; archive forced off | Load more | **YES** | — |
| Studio | `/designs` Companion modal | `CompanionSetPanel` | DesignPreview | companion `members` | `member.id` | anchor + neighbors | No | **YES** | — |
| Studio | `/customer-uploads` | `CustomerUploadIntakeSection` | DesignPreview | `intake.rows` | `row.id` | Pending/Excluded; `purpose=print_request` | limit 50 | **YES** | — |
| Studio | `/donated-designs` | same intake | DesignPreview | `intake.rows` | `row.id` | Pending/Excluded; `purpose=catalog_donation` | limit 50 | **YES** | — |
| Studio | `/ai-review` | `AiReviewWorkspace` | DesignPreview | `visibleDesigns` | `design.id` | tab + sort + Needs Review search | hasMore | **YES** | — |
| Studio | `/print-requests` | `PrintRequestItemCard` (+ page) | DesignPreview | `requestItems` | **`item.id`** | request item display order | No | **YES** | — |
| Studio | `/imports` batch validated | `BatchImportFileList` | ImportPreview | validated files | `filePath` | manifest; exclude toggles | No | **YES** | discovered collection |
| Studio | `/imports` single file | `ImportResultPanel` | ImportPreview | none | n/a | n/a | n/a | **NO** | not a collection |
| Portal | `/`, `/catalog`, `/favorites`, `/shows/[showId]`, dashboard reusable | `CatalogDesignDetailsModal` | CatalogPreview | host displayed list | `design.id` | page filters/search | Library load-more | **YES** | shared details layer |
| Portal | `/requests/[id]` | `PortalPrintRequestItemCard` | CatalogPreview | request items | **`item.id`** | detail item order | No | **YES** | — |
| Portal | `/dashboard` past artwork | `AccountArtworkGallery` | CatalogPreview | past tiles / filtered modal | upload `id` | All/Uploaded/Donated; createdAt desc | soft cap 150 | **YES** | — |
| Portal | `/custom-designs/...` | `AssistedCreationMediaThumbs` | CatalogPreview | reference `items` | `item.id` | request order | No | **YES** if length>1 | — |
| Portal | `/share/design/[id]` | `ShareDesignPortalPageContent` | CatalogPreview | singleton | `design.id` | n/a | n/a | **NO** | no siblings |
| Portal | assisted status | `AssistedCreationStatusPanel` | CatalogPreview | single `proofUrl` | n/a | n/a | n/a | **NO** | singleton as wired |
| Portal | `/donate`, `/requests/artwork` | `CustomerUploadPanel` | **none** | batch thumbs | n/a | n/a | n/a | **NO** | no existing lightbox |

---

## 5–6. Owner term mapping

### OWNER TERM: Donated images

**CURRENT REPO SURFACE(S):**

| App | Surface |
|-----|---------|
| Studio | Route `/donated-designs` → `DonatedDesignsPage` → `CustomerUploadIntakeSection` with `purposeScope="catalog_donation"` |
| Portal create | `/donate` → `DonateDesignsPage` → `CustomerUploadPanel` `purpose="catalog_donation"` (**no lightbox today — exclude nav**) |
| Portal view | `/dashboard` → `AccountArtworkGallery` past tiles / modal tab **Donated** (`kind: 'donation'`) |

### OWNER TERM: Uploaded images

**CURRENT REPO SURFACE(S):**

| App | Surface |
|-----|---------|
| Studio | Route `/customer-uploads` → `CustomerUploadsPage` → `CustomerUploadIntakeSection` with `purposeScope="print_request"` (page title “Uploaded Designs”) |
| Portal create | `/requests/artwork` → `CustomerUploadPanel` `purpose="print_request"` (**no lightbox today — exclude**) |
| Portal view | `/dashboard` → `AccountArtworkGallery` tab **Uploaded** (`kind: 'upload'`); also PR line items with `customerUploadId` on `/requests/[id]` |

---

## 7. Design Library implementation

- **Browse:** `DesignCard` opens `DesignDetailsModal` (`selectedDesign`). Lightbox is **inside** details — not on the grid card. **Implement by** passing ordered previewable `filteredDesigns` into details/lightbox and continuously updating `selectedDesign` on Prev/Next. On details close, reuse `pendingScrollDesignIdRef` + `[data-design-id]` `scrollIntoView({ block: "nearest" })` for **final** id.
- **Request-selection:** `DesignSelectionCard` has per-card lightbox. Lift sibling ids from `DesignGrid`/`filteredDesigns`. Nav must **not** toggle `selectedDesigns` membership/qty. Close → scroll final card into view.
- Archive / search / category / tags / smart filters: collection = post-filter loaded list only.

---

## 8. AI Review implementation

- Path: `/ai-review` → `AiReviewPage` → `AiReviewWorkspace`.
- Tabs: `processing` | `needs_review` | `rejected`. Collection = `visibleDesigns` for active tab (+ Needs Review search).
- Wire lightbox Prev/Next to existing list selection (`selectRelative` / `requestSelectDesign` equivalents) — **continuous**.
- **Do not** couple to Processing `autoAdvance` / queue Start-Stop.
- Approve/reject/skip remain workflow actions; lightbox is visual browsing only.

---

## 9. Customer Uploads implementation

- Shared `CustomerUploadIntakeSection` for both purposes.
- Tabs: Pending (`pending_staff_review`), Excluded (`excluded_from_catalog`).
- Continuous sync of `selectedId` while navigating rows with preview URLs.
- Promotion/exclusion mutations unchanged; if current row leaves list, close or select nearest remaining per existing clear-selection behavior.

---

## 10–11. Print Requests (Studio / Portal)

- Studio: `PrintRequestItemCard` + `PrintRequestsPage` `requestItems`. Identity = **`item.id`**. Support `catalog_design` and `customer_upload` via existing preview resolution. Duplicate designs = distinct items.
- Portal: `PortalPrintRequestItemCard` + `PrintRequestDetailView`. Same identity rules.
- **Preserve** `portal-editing-request-parks-current-draft` (Editing banner, parked overlay, ownership). Preview-only.
- Lift collection to parent or pass ordered siblings; close → scroll final card into view. No qty/size/DPI changes.

---

## 12. Portal catalog / list implementation

- Live grids use `CatalogSelectionCard` → `CatalogDesignDetailsModal` → lightbox (Discover, Design Library `/catalog`, Favorites, Our Shows gallery, dashboard reusable).
- Prefer **one** enhancement at `CatalogDesignDetailsModal` / `CatalogPreviewLightbox` with host-provided `displayedDesigns` (or equivalent), not five page forks.
- `CatalogDesignCard` is not used by live pages — do not build against it.

---

## 13. Other included / excluded

**Included discovered:** Companion set; Studio batch validated import; Portal Account past artwork; AssistedCreationMediaThumbs (length > 1).

**Excluded:** ImportResultPanel single-file; Share design page; AssistedCreationStatusPanel proof singleton; Donate/artwork upload panel thumbs (no lightbox); Matching designs section (opens details, not lightbox index).

---

## 14–18. Identity, order, filters, pagination, non-previewable

- Stable ids per matrix above; **never** designId alone for PR items.
- Order = currently visible/loaded UI order after filters/search/tabs/sort.
- Pagination V1: **loaded only**; Next disabled at last loaded even if Load more exists. Auto-extend **OUT OF SCOPE**.
- Non-previewable: omit from nav collection; do not land on empty lightbox.

---

## 19–20. Final-item-on-close + scroll/focus

- Closing lightbox (and/or details when that is the browse shell) leaves parent on **final** `activeItemId`.
- Scroll: `scrollIntoView({ behavior: "smooth", block: "nearest" })` using existing Design Library / Print Request patterns; no jump-to-top; no restore of original open id.
- Focus: return to final card/control where practical; keep focus on Prev/Next during nav.

---

## 21. Shared vs per-app architecture

**Recommend:**

1. Pure helper in `packages/shared` (navigation math only).
2. Enhance Studio `DesignPreviewLightbox` and Portal `CatalogPreviewLightbox` separately (Portal keeps censor/reveal props).
3. Optionally enhance `ImportPreviewLightbox` for batch only, or reuse DesignPreview pattern if simpler — implementer choice within Studio imports feature; do not force Portal/Studio merge.

---

## 22–24. Boundaries, keyboard, mobile

- First: Previous disabled; Last: Next disabled; **no wraparound** (no existing wrap convention found).
- Escape closes (preserve). ArrowLeft/Right navigate when lightbox open and focus not in text input/number field (critical for request-selection qty inputs and AI forms).
- Portal mobile: always-visible tappable chevrons; no hover requirement; swipe **not** required.

---

## 25. Position indicator

**YES** — subtle `n / total` when `total > 1`, placed so it does not obscure Close or artwork (e.g. near bottom of shell or under close cluster). Required controls remain Prev/Next/Close; counter is secondary.

---

## 26–28. Mutations / AI / request-selection

- Mutation-during-open: note AI approve/reject, intake promote/exclude, PR remove, companion unlink — keep actions as-is; nav state must tolerate item disappearance (close or nearest).
- AI auto-advance: **keep distinct**.
- Request-selection: preview active id ≠ checkbox/qty membership.

---

## 29–32. Backend / Rules / indexes / migration

| Area | Impact |
|------|--------|
| Functions | **NO** |
| Firestore Rules | **NO** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration | **NO** |
| Firebase deploy | **NO** |

If implement somehow discovers a backend need for Prev/Next alone → **STOP** with `[NEEDS OWNER DECISION]`. None expected.

---

## 33. Exact files expected to change

See Plan “Affected Areas”. Core: shared nav util+test; both lightbox components + CSS; listed callers/pages. Do not touch parking/editing ownership modules except PR item preview wiring.

---

## 34. Tests planned

Shared matrix 1–11; Design Library 12–18; AI 19–24; uploads/donations 25–30; Studio PR 31–36; Portal 37–44; a11y 45–49. Prefer deterministic unit/contract tests; Owner QA for visual/mobile.

---

## 35–36. Restart scope

- Studio: HMR likely sufficient; full Studio restart only if CSS/Electron shell oddities.
- Portal: HMR / local Next restart likely; no App Hosting production deploy.

---

## 37. Owner QA checklist

A Studio Design Library · B AI Review · C Customer Uploads/Donated · D Studio PR · E Portal catalog (+ narrow viewport) · F Portal PR · G Filtered list · H Boundaries — as specified in owner request. Add parked-draft smoke on Portal Editing.

---

## 38. Production status

**NOT AUTHORIZED.**

---

## 39. `[NEEDS OWNER DECISION]`

**None** for Plan → Implement.

Non-blocking recommendations already decided by Review:

- Include batch import validated list and assisted multi-ref thumbs.
- Exclude donate/artwork batch thumbs until a lightbox exists.
- Position indicator YES.
- Design Library browse navigates via Details selection + lightbox, not a new grid-only overlay.

---

## Architecture Review

**Findings:**

- Correct app boundary: Studio Electron/Vite vs Portal Next.js; shared math only.
- Design Library browse must not be mistaken for per-card lightbox (only request-selection cards open lightbox directly).
- Continuous sync for detail-driven surfaces; local+close for overlay-only membership-sensitive grids.

**Required changes:**

- [x] Implementer must pass host-visible collection into Details/lightbox for Studio browse and Portal catalog (document in implement notes).
- [x] PR surfaces must use `item.id` and lift sibling collection out of per-card isolation.

---

## Security Review

**Findings:** UI-only; preserve Portal censor/reveal single-gate behavior on `CatalogPreviewLightbox`.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] Production remain unauthorized (entire goal)

---

## Data Model / Backend Review

**Findings:** No persisted field changes.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:** Plan coverage matches owner matrix; manual QA essential for scroll/focus and mobile.

**Required changes:**

- [x] Add at least one contract asserting request-selection membership unchanged across nav+close.
- [x] Add contract asserting Studio/Portal PR navigation keys on `item.id` not `designId`.

---

## Documentation Review

**Findings:** Update workflow state now; ROADMAP/CURRENT-STATE on implement/signoff; optional STYLE_GUIDE note.

---

## Required Changes (approved_with_changes)

1. Lock surface matrix include/exclude from this review (do not expand to new lightboxes on donate/artwork thumbs).
2. Studio Design Library **browse** = Details + `filteredDesigns` continuous selection; request-selection = overlay nav without membership mutation.
3. Parent sync: continuous when selection/detail already authoritative; local+close for overlay-only grids; PR use `item.id` + scroll final card.
4. Shared pure helper + per-app lightbox UI; no shared React lightbox forced into `packages/shared`.
5. V1: no wraparound; loaded-only pagination; position indicator YES; Arrow keys with input-guard; preserve Escape and censor/reveal.
6. Do not disturb parked draft / Editing / AI auto-advance / qty-size mutations.
7. Automated contracts for membership isolation + PR item identity; Owner QA A–H before signoff.

---

## Blockers

None.

---

## Verdict Rationale

Plan is sound, prerequisite met, source matrix complete, backend impact correctly zero. Conditional approval encodes the browse-vs-selection Design Library distinction and include/exclude edges so implementation does not invent lightboxes or couple to AI/request workflows.

---

## Next Step

Implement approved scope with required changes above. **Do not deploy. Do not start until Owner explicitly continues to Implement** if Managing Agent is stopped after Plan+Review per owner request.

Owner this session requested: **Plan → Formal Review → STOP** (no implementation yet).
