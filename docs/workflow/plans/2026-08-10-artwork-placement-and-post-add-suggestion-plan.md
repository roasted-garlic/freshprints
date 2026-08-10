# Plan Amendment: Artwork Placement + post-add Matching Designs suppression

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `prelaunch-companion-designs-and-censored-content` |
| Environment | **fresh-prints-dev only** |
| Related | Pairwise companions (ADR-FP-133); portal post-add `CatalogCompanionSuggestionModal` |

---

## Goal

1. Add optional staff-managed **Placement** metadata on each design (artwork garment position), shown/editable in Studio Companion Designs and optionally as a lightweight badge on Portal Matching Designs — **not** a catalog tag, filter, or Algolia facet.
2. Fix redundant post-add Matching Designs modals by excluding companions already in Current Request, suppressing the modal when none remain, and never nesting/replacing suggestions when adding from the open suggestion modal.

---

## Scope

### In Scope

- Persisted optional design field + Rules optional string (+ client allowlist)
- Studio Companion Designs modal: Placement badge + select editor per card (anchor + neighbors)
- Portal Matching Designs / suggestion cards: lightweight Placement badge only
- `useAddDesignToRequestFlow` suggestion filtering + non-announcing add-from-modal path
- Tests; DEV Rules deploy if required

### Out of Scope

- Production / Algolia / App Hosting prod / Studio prod / myprintrequest.com
- Migration/backfill of Placement
- Placement catalog filter or search
- Changing pairwise link model or Needs Companion semantics
- Auto-adding companions

---

## Data model (repo-checked)

**Persisted field:** `artworkPlacement?: string` on `designs/{id}`

| Stored value | Display |
|--------------|---------|
| *(absent)* | Unspecified |
| `front` | Front |
| `back` | Back |
| `front_back` | Front / Back |
| `pocket` | Pocket |
| `sleeve` | Sleeve |

Rationale for name: avoids bare `placement` (gang-sheet / UI collisions) and `companionPlacement` (implies edge field; collides with existing `companionPlacement.test.ts` naming). Display label remains **Placement**.

- Missing → Unspecified (no migration)
- Write via `designService.updateDesign` (not `companionDenormOnlyUpdate`)
- Does not affect pairwise links, catalog `status`, or Needs Companion

**Rules:** add `isOptionalString(data, "artworkPlacement")` under `designRequiredFieldsValid`. Client maps unknown → undefined. Optional Rules whitelist not required if client allowlists (mirror `printSizeSource`); Formal Review may prefer client allowlist only.

---

## Approach

### 1. Placement (Studio + Portal)

1. Shared/Studio constants + type for allowlisted values + display labels
2. `Design` / `UpdateDesignInput` / form mapper optional support (Edit Design may include select; Companion modal is primary edit surface for this phase)
3. `CompanionSetPanel`: badge + `<select>` (existing Studio conventions) per member card including THIS DESIGN; on change → `updateDesign({ artworkPlacement })` → refresh list / parent patch
4. Portal `CatalogDesign.artworkPlacement` via `mapCatalogDesign`; badge in `CatalogMatchingDesignsSection`
5. Docs: DATA_MODEL brief note

### 2. Post-add modal

In `useAddDesignToRequestFlow`:

1. `suggestMatchingCompanions(design)`: after fetching ready direct peers, **exclude** any design id already present in `workingItems` (by design id, ignore qty/size)
2. If zero remain → do **not** `setCompanionSuggestion`
3. Add from modal: `addDesignFromCompanionSuggestion(design)` that adds **without** calling `announceDesignAdded` / `suggestMatchingCompanions`
4. After successful add-from-modal: remove that id from current `companionSuggestion.companions`; if empty → dismiss; else keep modal open with remaining list
5. Home + Library pages wire `onAdd` to the non-announcing path for the suggestion modal only

No extra Firestore reads for “already in request” — use in-memory `workingItems`.

---

## Test strategy

Automated: placement allowlist/Unspecified mapping; Companion panel source wiring; suggest filter exclude-in-request; no suggest when empty; add-from-modal no nested announce; Portal typecheck; Studio typecheck; Rules if Rules change.

Manual: owner DEV QA checklist.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Expression budget on updateDesign with placement | Single optional string; same path as other metadata |
| Nested modal swap | Dedicated add path skips announce |

---

## Human checkpoint

STOP after Implement+Test (+ DEV Rules if needed) for owner QA.
