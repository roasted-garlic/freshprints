# Plan: Portal/Studio UX polish — lightbox cursor, category filter, upload warning modal

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `portal-studio-ux-polish-cursor-categories-upload-modal` |
| Related | Owner UX notes after image-quality signoff |

---

## Goal

Polish three customer/staff UX friction points: magnifying-glass cursor on print-request lightbox thumbnails, readable category filter labels on desktop, and a wider artwork-quality warning modal with optional 24-hour dismiss.

---

## Background

Owner feedback (2026-07-13):

- **(a)** Print request details images open a lightbox but show a finger/pointer cursor.
- **(b)** Category filter menu truncates long names (e.g. “Pop Culture & Ch…”); owner asked for best fix (modal considered).
- **(c)** Artwork upload warning modal should support “don’t show for 24 hours” and be wider.
- Sidebar expand/collapse redesign: **scrubbed / cancelled** — do not implement.

Prior goal `image-quality-sizing-and-halftone-safeguards` is already signed off.

---

## Scope

### In Scope

1. **Lightbox cursor:** Portal interactive thumbnails that open lightbox use `cursor: zoom-in` (Studio already does). Prefer global interactive rule so print-request + catalog stay consistent; hero already zoom-in.
2. **Category filter:** Recommended fix = **wider dropdown + menu can exceed trigger width + no option ellipsis** (Studio + Portal). Not a category modal (Tags already owns modal multi-select; category is single-select).
3. **Artwork quality modal:** Checkbox “Don’t show again for 24 hours”; persist snooze in `localStorage`; widen modal (and related Portal confirm modal panel) for readable copy.

### Out of Scope

- Desktop sidebar collapse/expand edge-tab redesign (scrubbed)
- New category picker modal
- Studio batch-import warning strings (not this Portal modal)
- Production deploy
- Changing filter semantics / tag modal behavior

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/styles/catalog.css` — zoom-in cursor; category width/menu; artwork modal width
- `apps/portal/styles/shell.css` — widen `.portal-confirm-modal` baseline
- `apps/studio/.../design-library.css` + `inputs.css` — category min-width / menu growth
- `apps/portal/features/customer-uploads/components/ArtworkQualityNotice.tsx`
- New small helper e.g. `apps/portal/features/customer-uploads/utils/artworkQualityModalSnooze.ts` (+ unit test)

### Architecture Impact
- [x] Details: UI + thin Portal preference util (localStorage). No Firebase. Layers preserved.

### Security Impact
- [x] Details: Client-only preference; no secrets; no auth change. Fail open (show modal if storage unreadable).

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Cursor affordance; category readability; modal width + snooze checkbox. Manual visual check recommended.

### Migration Impact
- [x] None — new localStorage key only.

---

## Approach

### a — Cursor

1. Change `.design-thumbnail-panel-image--interactive` in Portal `catalog.css` from `cursor: pointer` → `cursor: zoom-in`.
2. Confirm Studio remains `zoom-in`. No TSX change.

### b — Categories (recommended: expandable dropdown)

1. Portal: raise desktop category control from fixed `11rem` to ~`16rem`–`18rem` (`min-width` + flexible width).
2. Portal + Studio: category menu `min-width: 100%; width: max-content; max-width: min(24rem, 90vw)`; unpin `right: 0` when expanding.
3. Portal: remove ellipsis on category option labels (keep trigger ellipsis if needed).
4. Do **not** build a category modal.

### c — Artwork quality modal

1. Helper: key `fresh-prints-portal-artwork-quality-modal-snooze-until` (ISO); optional purpose suffix if print vs donate should snooze independently — **default one shared snooze** (same guidance both pages).
2. On mount: open modal only if snooze expired/missing.
3. Checkbox in footer; on confirm, if checked write `now + 24h`. Overlay/Escape dismiss without writing snooze unless checkbox checked and user confirmed — **only primary button applies snooze** (clearer intent).
4. Widen `.artwork-quality-modal` to ~`42rem`; widen `.portal-confirm-modal` to ~`34rem` so confirm dialogs feel less cramped.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Portal unit (snooze helper) | `npx tsx --test apps/portal/features/customer-uploads/**/*.test.ts` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal lint (touched paths) | eslint portal paths | yes |

### Manual

- Print request detail: thumbnail hover shows magnifying glass; click opens lightbox.
- Design Library / Catalog: open category menu — long names fully visible.
- Upload Designs / Donate: first visit shows wide modal; check snooze → confirm → reload within 24h → no modal; after expiry or cleared storage → modal returns.

---

## Human Checkpoints Anticipated

- [x] Light manual UI check (can PASS WITH NOTES at signoff)
- [ ] Production deploy — out of scope

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Menu overflows viewport on small desktop | low | `max-width: min(24rem, 90vw)` |
| Shared snooze hides donate thank-you too | low | Acceptable — same requirements; split later if needed |
| localStorage blocked | low | Fail open — show modal |

---

## Rollback Plan

Revert CSS + `ArtworkQualityNotice` + snooze helper.

---

## Documentation Updates Required

- [ ] None required beyond workflow artifacts (preference is client UX only)

---

## Open Questions

- [x] Category UX: **wider expandable dropdown** (not modal)
- [x] Sidebar collapse idea: **scrubbed**
- [x] Snooze: shared across print + donate

---

## Acceptance Criteria

- [ ] Print-request (Portal) lightbox thumbs use `zoom-in` cursor
- [ ] Category option text not truncated on desktop for typical long names
- [ ] Artwork quality modal wider; optional 24h snooze via checkbox + confirm
- [ ] No sidebar collapse redesign shipped
