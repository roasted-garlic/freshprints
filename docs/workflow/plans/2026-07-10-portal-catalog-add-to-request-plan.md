# Plan: Portal catalog “Add to request” from browse / design details

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-10-portal-catalog-add-to-request-review.md |

---

## Goal

Make the Portal catalog feel request-first: from browse mode (design details modal, and optionally design cards), customers can add a specific design to a print request in one gesture, then land in existing request-selection mode to keep building the request. Branch correctly for **0 / 1 / 2+** continuable (`draft` / `editing`) requests.

## Background

Phase 8 Portal MVP already supports:

- Browse catalog + design details (read-only)
- Top-bar **Start / Continue request** → selection mode
- Selection mode (`/catalog?mode=request-selection&requestId=…`) with `CatalogSelectionCard` “Add to request”
- Request detail **Add designs** → selection mode

Gap: browse and design details have **no design-level CTA**. Customers can scroll the catalog without realizing designs are requestable. Multi-request continue today dumps to the Working tab (no picker), which is a poor fit when the user already chose a design.

This phase is a Portal UX/product polish on top of existing request APIs — no new callables or rules expected.

---

## Scope

### In Scope

- **Design details modal CTA**: “Add to request” on the same row as the “Design details” eyebrow, right-aligned
- **Design card CTA** (recommended): compact secondary “Add” control on browse cards (does not replace opening details)
- Shared **add-design-to-request** flow with branches:
  - **0 continuable** → create draft request → add design → enter selection mode
  - **1 continuable** → add design to that request → enter selection mode
  - **2+ continuable** → request picker modal → add to chosen request (or start new) → enter selection mode
- New **request picker modal** (list continuable requests by name + relative updated time; include “Start new request”)
- Idempotent add: if the design is already on the target request, skip creating a duplicate item and still enter selection mode
- Loading / error states on the CTA while create/add runs
- Close design-details modal before navigating to selection mode
- Docs: brief ADR or DECISIONS note; STYLE_GUIDE / ARCHITECTURE touch only if behavior warrants

### Out of Scope

- Changing Studio Design Library selection UX
- Changing selection-mode card UI (already has Add to request)
- Changing top-bar Start/Continue or FAB flows (except optional reuse of shared helpers)
- Queuing to show, pricing, guest checkout
- Deep-link scroll-to-design polish beyond optional `designId` query param (nice-to-have if cheap)
- Toast system (none exists; do not add a toast framework this phase)

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx`
- `apps/portal/features/catalog/components/CatalogDesignCard.tsx`
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx`
- `apps/portal/styles/catalog.css` (eyebrow row + card CTA)
- `apps/portal/features/print-requests/hooks/` — new hook e.g. `useAddDesignToRequestFlow.ts` (or extend creation flow carefully)
- `apps/portal/features/print-requests/utils/catalogSelectionNavigation.ts` — optional `designId` query
- `apps/portal/features/shared/components/` — new `PortalPickContinuableRequestModal.tsx` (or similar)
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` — expose flow if needed globally
- `docs/project/DECISIONS.md` — short ADR for browse→request entry

### Architecture Impact

- [x] Details: New Portal orchestration hook + picker modal. Reuses `createPrintRequest`, `savePrintRequestDesignSelections` / item add, `buildCatalogSelectionHref`, `continuableRequests`. No layer violations (UI → hooks → services).

### Security Impact

- [x] Details: None new. Continues customer-only client writes already allowed for own `draft`/`editing` requests and items. No rules/callable changes expected. Validate design is ready via existing service paths.

### Data Model Impact

- [ ] None (uses existing `printRequests` / `printRequestItems`)

### Backend Impact

- [ ] None (reuse `createPortalPrintRequest` + existing Firestore item writes)

### UI / UX Impact

- [x] Details: Browse catalog CTAs; new picker modal; design-details header row layout. Manual mobile QA required.

### Migration Impact

- [ ] None

---

## Recommended product decisions (defaults)

These are the agent’s recommended defaults. **Confirm or override before implement.**

### 1. Persist immediately, then open selection mode (recommended)

When the user taps **Add to request**:

1. Resolve target request (create / single / picker)
2. **Persist** the design onto that request at quantity **1** using the existing selection-save path (`savePrintRequestDesignSelections`) so duplicate designs are **not** double-added
3. Navigate to `/catalog?mode=request-selection&requestId=…` so they can keep adding and adjust qty
4. Selection mode hydrates from server items → design already selected; Save only needed for further changes

**Why not staged-only (local until Save)?** A browse CTA that says “Add” should mean the design is on the request even if they leave. Staged-only risks “I thought I added it.” Immediate persist matches request-detail add semantics more closely.

### 2. Skip confirm when creating from a design CTA (recommended)

Top-bar **Start request** keeps its confirm (ambiguous intent).  
Design-level **Add to request** is explicit → create draft + add + selection **without** the “Start a new print request?” confirm.

### 3. Details modal + compact card CTA (recommended)

| Surface | Control |
|---------|---------|
| Design details | Primary button “Add to request” on the eyebrow row, right-aligned |
| Design card | Compact secondary “Add” (or “Add to request” on wider layouts) that `stopPropagation` so the card still opens details |

Card CTA makes the grid feel actionable without forcing every add through the modal.

### 4. Multi-request: real picker, not Working tab (recommended)

Do **not** send users to `/requests?tab=working` when they already chose a design. Show a modal listing each continuable request + **Start new request**. Selecting a row adds the design and enters selection mode for that request.

### 5. Button label

Use **Add to request** everywhere (details + card). Behavior branches underneath; no need for “Request this design” vs “Add…” variants.

### 6. Already on request

If the design is already an item on the target request → do not create another item; close modal (if open) and enter selection mode for that request.

---

## Approach

1. **Shared flow hook** `useAddDesignToRequestFlow` (or equivalent):
   - Inputs: `continuableRequests`, `createPrintRequest`, auth user id, router
   - `startAddDesign(design: CatalogDesign)`:
     - 0 → `createPrintRequest` → persist design → `router.replace(selectionHref)`
     - 1 → persist → navigate
     - 2+ → open picker with pending `design` in state
   - `confirmPickRequest(requestId)` / `confirmStartNewFromPicker()`
   - Loading + error state for UI buttons
   - Idempotent persist helper wrapping `savePrintRequestDesignSelections` with one selection

2. **Picker modal** `PortalPickContinuableRequestModal`:
   - List `continuableRequests` (name, optional status/updated hint)
   - Actions: select request, Start new, Cancel
   - Disable while creating/adding

3. **Wire CatalogPageContent**:
   - Own the flow hook (or context)
   - Pass `onAddToRequest` into details modal and cards
   - Render picker (+ reuse existing confirm only if product overrides default #2)

4. **CatalogDesignDetailsModal**:
   - Header row: eyebrow left, button right
   - Button disabled/busy while flow runs; close modal on successful navigate kickoff

5. **CatalogDesignCard**:
   - Restructure so card is not a single full-surface `<button>` (or nest a real button carefully for a11y)
   - Thumbnail/title open details; Add control triggers flow with `stopPropagation`

6. **Navigation helper** (optional):
   - `buildCatalogSelectionHref(requestId, { designId? })` for future scroll/highlight; implement highlight only if low cost

7. **Tests / docs**:
   - Unit-test pure branch helper if extracted (0/1/2+, already-on-request)
   - Manual QA checklist below
   - ADR in `DECISIONS.md`

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck -w @fresh-prints/portal` (or project equivalent) | yes |
| Lint | `npm run lint` | yes |
| Unit tests | Targeted tests for branch helper / navigation builder if extracted | yes if helper extracted |
| Build | Portal build | yes |
| Integration | — | no |
| E2E | — | no |
| Backend/rules | — | no (no rules change) |

### Manual

- [ ] **0 open requests**: Add from details → creates request, design present in selection, qty 1
- [ ] **1 open request**: Add from details → design on that request, selection mode for it
- [ ] **2+ open requests**: Picker appears; choose A → design on A; choose Start new → new request + design
- [ ] Design already on request → no duplicate item; still enters selection
- [ ] Card Add works without opening details; card body still opens details
- [ ] Errors surface if create/add fails; user can retry
- [ ] Mobile layout: eyebrow + button row, card Add tap targets

---

## Human Checkpoints Anticipated

- [x] Business logic decision — confirm recommended defaults (persist timing, skip confirm, card CTA, picker)
- [x] Manual UI/UX review after implement
- [ ] Design approval — light; follow existing Portal button/modal patterns
- [ ] Production deploy — not required for this phase (Portal App Hosting when ready)
- [ ] Database migration — no
- [ ] Auth / external service setup — no
- [ ] Secrets / env vars — no

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Duplicate items if using raw `addPrintRequestItem` | Medium | Use `savePrintRequestDesignSelections` (dedupes by design + size) or explicit exists-check |
| Nested buttons / a11y on design card | Medium | Restructure card: article/div + separate controls; keyboard focus |
| Double-tap creates two requests | Medium | Disable CTA while `isAdding`; single-flight guard |
| Picker vs existing Working-tab habit | Low | Picker only for design-scoped add; top-bar Continue can stay as today |
| Scope creep into toast/highlight polish | Low | Keep optional; ship CTA + branches first |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the Portal UI/hook/modal commits. No data migration; any requests/items created during testing remain valid customer drafts.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md — optional one-line if catalog “request from browse” is called out
- [ ] ARCHITECTURE.md — only if Portal catalog flows section exists and needs update
- [ ] DATA_MODEL.md — no
- [ ] BACKEND.md — no
- [ ] TESTING.md — manual checklist note if Portal manual section exists
- [ ] DEPLOYMENT.md — no
- [ ] STYLE_GUIDE.md — only if new component pattern is non-obvious
- [x] DECISIONS.md — ADR for browse→add-to-request entry
- [ ] Other: plan/review/signoff artifacts

---

## Open Questions

- [x] None — human confirmed all recommended defaults on 2026-07-10:
  1. Immediate persist then selection
  2. Skip create-confirm for design CTA
  3. Details + compact card Add
  4. Multi-request picker modal

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-10-portal-catalog-add-to-request-review.md`
- Verdict: **approved**
