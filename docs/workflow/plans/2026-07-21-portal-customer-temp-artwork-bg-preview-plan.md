# Plan: Portal customer temporary artwork background preview

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Agent |
| Status | approved (UX amend 2026-07-21: compact swatch button → nested picker dialog) |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-21-portal-customer-temp-artwork-bg-preview-review.md |

---

## Goal

Let Portal customers preview a catalog design on different mat/shirt background colors inside the **design details modal**, using temporary local UI state only. Closing the modal resets the preview; nothing is written to Firestore, staff `artworkBackgroundHex`, or OG.

---

## Background

Staff can persist `artworkBackgroundHex` (grey / light black / custom) for mats and OG letterbox. Customers need a **try-on preview** against common garment colors plus optional custom hex, without changing the saved design or share images.

Prior phases (library OG rotation + per-design bg; Studio UI fixes) signed off **PASS** 2026-07-21.

---

## Scope

### In Scope

1. **Shirt-color palette** (~8–16 swatches) as a shared constant list `{ id, label, hex }` — practical DTF/print mock colors (not neon spam). Include staff defaults **App grey** `#e5e7eb` and **Light black** `#2c2d2d` plus popular garment neutrals/basics.
2. **Custom hex** input in the modal; validate with existing `normalizeArtworkBackgroundHex` / `resolveArtworkBackgroundHex`.
3. **Temporary only:** React state in `CatalogDesignDetailsModal` (and lightbox while modal session open). Reset on close / reopen to design’s saved `artworkBackgroundHex` or grey fallback.
4. **Layout (owner UX amend):** Do **not** put the full palette or custom hex inline in the design details body (avoids crowding/reflow). Instead:
   - Compact **color button** (swatch of current temporary preview) in the design details toolbar.
   - Click opens a **separate small modal/dialog** with palette + custom hex.
   - Confirm / cancel / click-outside closes the picker; color changes update only the temporary preview mat.
   - Closing design details still discards temporary preview.
5. Unit tests for palette constant shape (unique ids/hexes; valid hexes).

### Out of Scope

- Persisting customer preference or any Firestore write
- Studio changes
- Production deploy / Functions soft-deploy
- `fb:app_id`
- Changing catalog card thumbs outside the details modal
- Full color picker / eyedropper

---

## Palette choices (v1)

Practical garment-style mats for DTF mock (readable, not neon):

| id | Label | Hex | Rationale |
|----|-------|-----|-----------|
| app-grey | App grey | `#e5e7eb` | Staff/default Portal mat |
| light-black | Light black | `#2c2d2d` | Staff dark preset |
| white | White | `#ffffff` | Classic light tee |
| soft-black | Soft black | `#1a1a1a` | Near-black tee (not pure #000 glare) |
| heather | Heather grey | `#9ca3af` | Common heather |
| charcoal | Charcoal | `#4b5563` | Mid dark grey |
| cream | Cream | `#f5f0e6` | Natural / unbleached |
| navy | Navy | `#1e3a5f` | Classic dark blue |
| royal | Royal blue | `#2f5aa8` | Saturated but printable blue |
| forest | Forest | `#1f4d3a` | Deep green |
| burgundy | Burgundy | `#7f1d1d` | Deep red |
| red | Red | `#b91c1c` | Standard red tee |
| soft-pink | Soft pink | `#f5c6d0` | Soft pastel |
| mustard | Mustard | `#c4a035` | Warm accent |
| olive | Olive | `#556b2f` | Muted green |
| sand | Sand | `#d6c3a8` | Warm neutral |

**Count:** 16 swatches. Custom hex remains available beyond the list.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/design/portalArtworkPreviewShirtColors.constants.ts` (+ test)
- `apps/portal/features/catalog/components/CatalogArtworkBackgroundPreviewPicker.tsx` (new)
- `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx`
- `apps/portal/styles/catalog.css` (swatch/picker styles)
- Optional tiny helper for “design default hex” if useful

### Architecture Impact

- [x] Details: UI + shared constants only; no service/Firestore writes. Preview hex stays in modal state.

### Security Impact

- [x] Details: Client-only hex validation via shared normalize; no persistence; no new public data exposure.

### Data Model Impact

- [x] None (no writes)

### Backend Impact

- [x] None — Portal-only; soft-deploy not needed

### UI / UX Impact

- [x] Details: Design details modal gains “Preview background” swatches + custom hex; lightbox follows modal preview while open. Manual UI checkpoint required.

### Migration Impact

- [x] None

---

## Approach

1. Add shared `PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS` constant + unit test.
2. Build compact toolbar **color button** + nested **picker dialog** (palette + custom hex + Reset/Cancel/Done).
3. In `CatalogDesignDetailsModal`: seed preview state from `resolveArtworkBackgroundHex(design.artworkBackgroundHex)` when open/design changes; pass preview hex to hero `CatalogThumbnailPanel` and `CatalogPreviewLightbox`; clear/reset on close via effect; Escape closes picker first if open.
4. Style button + dialog accessibly (aria-expanded / aria-label; keyboard focus).
5. Manual checkpoint for visual QA.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit | `npx tsx --test packages/shared/src/constants/design/portalArtworkPreviewShirtColors.constants.test.ts` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | skip unless touched files lint-clean easily | no |
| Soft-deploy | n/a | no |

### Manual

- [x] Details: Open design details → default mat matches saved design → pick shirt colors → custom hex → reopen resets → no staff field change. See checkpoint doc after implement.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Design approval (palette is agent-chosen practical set; owner can request tweaks after PASS WITH NOTES)
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Customers think preview saves | Low | Copy: temporary preview only / resets when closed |
| Invalid custom hex | Low | Shared normalize; keep last valid or show invalid hint |
| Palette taste mismatch | Low | Easy constant edit; owner notes on checkpoint |

---

## Rollback Plan

Revert Portal modal/picker/CSS + shared palette constant. No data migration.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] Other: workflow plan/review/test/checkpoint; handoff CURRENT-STATE on signoff

---

## Open Questions

- [x] None — palette v1 documented above; owner can tweak after manual QA

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-portal-customer-temp-artwork-bg-preview-review.md
- Verdict: pending
