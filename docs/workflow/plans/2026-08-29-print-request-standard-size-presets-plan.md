# Plan — Print Request Standard Size Presets

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Author | Planning Agent |
| Status | **approved — owner decisions recorded 2026-08-29** |
| Workflow | managed-phase |
| Goal slug | `print-request-standard-size-presets` |
| Branch | `development` (no separate branch) |
| Related | `docs/workflow/reviews/2026-08-29-print-request-standard-size-presets-review.md` |
| Amendments | 2026-08-29 — Studio Print Request title truncation parity (Portal reference) |

---

## Goal

Add configurable **Standard Size** presets to Fresh Prints Studio and Fresh Prints Portal Print Request item cards so staff and customers can quickly choose common garment/placement print widths while preserving artwork aspect ratio and all existing DPI/save rules (ADR-FP-075, ADR-FP-080). Presets define **target width only**; height is derived through the same aspect-locked sizing path as manual width edits. Owner-configurable preset widths live in Studio Settings and are consumed authoritatively by both apps.

---

## Background

- Phase 6 established manual Print Request item sizing (width/height inputs, aspect lock, 200 DPI floor, 22″ cap). The 2026-07-04 sizing plan explicitly excluded size presets.
- Phase 8 Portal fast-follow now calls for a compact **Standard Size** picker on item cards without replacing manual controls.
- Shared sizing was hardened in `2026-08-20-print-request-shared-sizing-and-queue-integrity` — manual saves use `assessPrintRequestItemSize` (≥200 DPI, ≤22″) only; ADR-FP-080 approved-max applies to initial/processing size, not manual saves.
- Owner-approved default preset table and product decisions recorded **2026-08-29** (see § Owner-approved default preset table). Implement authorized.

**FreshForge impact classification**

| Area | Impact |
|------|--------|
| Starter Surface | None |
| Development Tooling | None |
| Distribution/Installer | None |
| Documentation | `DATA_MODEL.md`, `BACKEND.md`, `WORKFLOWS.md`, optional `STYLE_GUIDE.md` modal notes |
| Development History | N/A |

---

## Scope

### In Scope

- **Standard Sizes modal** on Studio and Portal item cards (placement tabs, grouped tiles, Apply/Cancel, current + preview dimensions).
- **Standard Size** thin control on item cards between title and Width/Height row.
- **Studio title truncation parity** — match Portal Print Request item title display (CSS-only; see § Studio title parity) so long titles cannot shift card controls before Standard Size is added.
- **Shared preset model**, resolution, apply helper, and validation wiring through existing `printRequestItemSizing` utilities.
- **Studio Settings → Standard Print Sizes** section: edit width, enable/disable preset, save to Firestore, expose to Portal.
- **Focused unit/contract tests** for preset apply, settings parse/resolve, and manual-size regression guards.
- **Owner manual DEV QA checkpoint** before Signoff.
- **Documentation** updates for settings doc, optional item field, and workflow behavior.

### Out of Scope

- Drag-and-drop ordering, user-created placements, arbitrary nesting, per-customer/per-design presets.
- Automatic garment detection, AI sizing, fixed width×height bounding boxes, silent clamping.
- Retroactive resize of existing items when settings change.
- Changing manual Width/Height UX, quantity, duplicate/remove, queue validation, show allocation, gang sheet, or design lifecycle.
- Redesigning Portal title presentation (Portal is the reference; leave unchanged).
- Mutating persisted design titles, catalog metadata, print-request naming, search, or Smart Profile data.
- New npm dependencies (unless review discovers a blocking gap — none identified).

---

## Repo discovery — exact files (verified 2026-08-29)

### Print Request item cards

| App | Component | Page / wiring | Service |
|-----|-----------|---------------|---------|
| Studio | `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx` | `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` | `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts` |
| Portal | `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` | `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` | `apps/portal/features/print-requests/services/portalPrintRequestService.ts` |

Supporting Portal card behavior: `resolveSavedDraftReconciliation.ts`, `itemPropSyncGuard.ts`, `usePrintRequestDetail.ts`.

### Portal Print Request title truncation (verified reference — 2026-08-29)

Portal item titles are **not** truncated in TSX. The card renders the full string unchanged:

```tsx
// apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx
<h2>{title}</h2>
```

Truncation is **CSS-only** in `apps/portal/styles/requests.css`:

| Selector | Mechanism |
|----------|-----------|
| `.portal-request-item-editor-body` | `min-height: 2.6rem`, `min-width: 0`, grid layout — bounds title region height |
| `.portal-request-item-editor-body h2` | **Single-line ellipsis:** `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`, `line-height: var(--line-height-tight, 1.3)`, `font-size: var(--font-size-md)` |

**Not used on Portal item cards:** `-webkit-line-clamp`, multi-line clamp, JS truncation, shared typography helper.

**Full title access (Portal today):**

- The truncated `<h2>` has **no** native `title` attribute and **no** tooltip on the title text itself.
- Full title remains available via existing workflows: preview **lightbox** on thumbnail click (`CatalogPreviewLightbox`), button **`aria-label`** strings that embed `{title}`, and alt text on preview images.
- Do **not** invent a new tooltip on Studio titles during this work; mirror Portal's existing access paths (Studio already uses `DesignPreviewLightbox` on the same card).

**Portal changes:** none required for this amendment.

### Studio Print Request title truncation (current — mismatch)

Studio renders the full title string unchanged:

```tsx
// apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx
<strong className="print-requests-item-card-title">{title}</strong>
```

Truncation CSS lives in `apps/studio/src/renderer/src/styles/components/print-requests.css`:

| Selector | Current mechanism | Parity gap |
|----------|-------------------|------------|
| `.print-requests-item-card-copy` | grid, `min-width: 0` — **no min-height** | Missing bounded title region |
| `.print-requests-item-card-title` | **Two-line clamp:** `-webkit-line-clamp: 2`, `-webkit-box`, `overflow: hidden` | Allows up to **two** lines → taller cards than Portal |

**Studio files to change (Implement):**

1. `apps/studio/src/renderer/src/styles/components/print-requests.css` — primary: replace 2-line clamp with Portal-equivalent single-line ellipsis + bounded copy/title region (`min-height` aligned to Portal's `2.6rem` intent, accounting for Studio `font-size-sm` if needed).
2. `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx` — **CSS-only expected**; no title string mutation. Change markup only if needed for semantic parity (optional; not required if CSS targets `.print-requests-item-card-title`).

**Out of scope for title parity:** `design.title`, Firestore fields, `titleSnapshot`, print-request naming, search indexing.

### Shared sizing (authoritative — do not duplicate)

| File | Key exports |
|------|-------------|
| `packages/shared/src/utils/printRequestItemSizing.ts` | `calculateLockedHeightFromWidth`, `calculateLockedWidthFromHeight`, `assessPrintRequestItemSize`, `requireSavablePrintRequestItemSize`, `formatPrintRequestItemSizeLabel`, `resolveInitialPrintRequestItemSize`, `MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES` (22) |
| `packages/shared/src/utils/printSizeMath.ts` | `calculateEffectiveDpi` |
| `packages/shared/src/constants/printSize.constants.ts` | `MIN_PRINT_REQUEST_EFFECTIVE_DPI` (200), `TARGET_PRINT_DPI` (300), `DEFAULT_PRINT_REQUEST_WIDTH_INCHES` (10) |

Server queue guard: `functions/src/lib/assertQueuePrintRequestItemSize.ts`.

### Item model

| File | Notes |
|------|-------|
| `packages/shared/src/types/printRequest/printRequest.types.ts` | `PrintRequestItem`: `printWidthInches?`, `printHeightInches?`, `sizeLabel?` |
| `sizeLabel` today | Always `"W.ww x H.ww in"` via `formatPrintRequestItemSizeLabel` on save — **not** a semantic preset label |

### ADR / prior sizing work

| Doc | Topic |
|-----|-------|
| `docs/project/DECISIONS.md` — ADR-FP-075 | ≥200 effective DPI save floor; ≤22″ cap |
| `docs/project/DECISIONS.md` — ADR-FP-080 | Approved-max for initial/processing only |
| `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md` | Shared manual sizing policy |
| `docs/workflow/plans/2026-07-04-print-request-item-sizing-and-username-naming-plan.md` | Original manual sizing; explicitly no presets |

### Studio Settings (pattern to extend)

| File | Role |
|------|------|
| `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx` | Settings tabs |
| `apps/studio/src/renderer/src/features/settings/components/PrintRequestLimitSettingsSection.tsx` | Numeric policy UI pattern |
| `apps/studio/src/renderer/src/features/settings/components/PortalHelpSettingsSection.tsx` | List/edit settings UI pattern |
| `apps/studio/src/renderer/src/features/settings/hooks/usePrintRequestLimitSettings.ts` | subscribe + save hook pattern |
| `packages/shared/src/constants/printRequest/printRequestLimitSettings.constants.ts` | Shared doc id, types, `resolve*` / `parse*Input` |
| `functions/src/updatePrintRequestLimitSettings.ts` | Callable write pattern (owner-only) |
| `apps/portal/features/print-requests/services/portalPrintRequestLimitService.ts` | Portal `onSnapshot` read pattern |
| `firestore.rules` | `settings/printRequestLimits`: read signed-in, write false |

### Modal / UI conventions

| App | Pattern |
|-----|---------|
| Studio | `apps/studio/src/renderer/src/shared/components/Modal.tsx` — used by `AddToShowModal.tsx` |
| Portal | `modal-overlay` / `modal-panel` classes — e.g. `PortalQueueToShowModal.tsx`, `CatalogSmartFilterModal.tsx` |
| Styles | Studio: `apps/studio/src/renderer/src/features/print-requests/` CSS; Portal: request item styles alongside print-requests feature |

There is **no** shared UI package (`packages/shared` only). Modal markup will be **parallel** in Studio and Portal with **shared logic/types** in `packages/shared`.

### Existing sizing tests (must keep passing)

- `packages/shared/src/utils/printRequestItemSizing.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts`
- `functions/src/lib/assertQueuePrintRequestItemSize.test.ts`
- `tests/firebase/printRequestItemResize.rules.test.ts`

---

## Plan questions — answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Components rendering item cards? | See § Repo discovery |
| 2 | Shared aspect-locked sizing? | `calculateLockedHeightFromWidth` / `calculateLockedWidthFromHeight` in `printRequestItemSizing.ts` |
| 3 | Effective DPI + 22″ validation? | `assessPrintRequestItemSize` + `requireSavablePrintRequestItemSize`; DPI math in `calculateEffectiveDpi` |
| 4 | How Settings persist / Portal reads? | Firestore `settings/{docId}`; Studio subscribe + callable write; Portal per-doc `onSnapshot` services |
| 5 | Settings document for presets? | **Proposed:** `settings/standardPrintSizes` — see § Settings schema |
| 6 | Can `sizeLabel` represent preset selection? | **No.** It stores formatted inches (`"10.00 x 5.00 in"`). Use optional `standardSizePresetKey` on `PrintRequestItem` plus derived display label (see § Data model) |
| 7 | Default widths? | **Not in repo.** Full table in § Default preset table — all widths `[NEEDS OWNER INPUT]` |
| 8 | Firestore Rules changes? | **Yes** — new `settings/standardPrintSizes` rule block; extend `printRequestItems` client-update field allowlist for `standardSizePresetKey`; rules alignment tests |
| 9 | Shared modal vs shared model? | **Shared model/calculation/hooks only**; separate modal components per app |
| 10 | Regression tests for manual sizing? | Extend existing `printRequestItemSizing.test.ts`; add preset-apply tests; card contract tests; settings parse tests; run full sizing test list in § Test strategy |

---

## Settings schema (proposed)

**Document:** `settings/standardPrintSizes`  
**Constant:** `STANDARD_PRINT_SIZES_SETTINGS_DOC_ID = "standardPrintSizes"`  
**New shared module:** `packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.ts`

### Types

```typescript
/** Stable placement tab id — not the design `artworkPlacement` field. */
export type StandardPrintSizePlacementId =
  | "full_front"
  | "full_back"
  | "back_collar"
  | "left_chest"
  | "sleeve"
  | "hat";

export type StandardPrintSizeGroupId =
  | "adult"
  | "youth"
  | "toddler"
  | "infant"
  | "front_panel"
  | "side_panel";

/** Stable key persisted on printRequestItems, e.g. "full_front.adult.l" */
export type StandardPrintSizePresetKey = string;

export interface StandardPrintSizePreset {
  key: StandardPrintSizePresetKey;
  label: string;           // e.g. "L", "Toddler"
  widthInches: number;     // target width only
  enabled: boolean;
  order: number;           // fixed seed order; no drag-and-drop in V1
}

export interface StandardPrintSizePlacementConfig {
  id: StandardPrintSizePlacementId;
  label: string;           // e.g. "Full Front"
  enabled: boolean;
  groups: StandardPrintSizeGroupConfig[];
}

export interface StandardPrintSizeGroupConfig {
  id: StandardPrintSizeGroupId;
  label: string;           // e.g. "Adult"
  presets: StandardPrintSizePreset[];
}

export interface StandardPrintSizesSettings {
  version: 1;
  placements: StandardPrintSizePlacementConfig[];
  updatedAt?: unknown;
  updatedBy?: string;
}
```

### Shared helpers (same file)

- `DEFAULT_STANDARD_PRINT_SIZES_SETTINGS` — seeded from owner-approved default table (Implement blocked until approved).
- `resolveStandardPrintSizesSettings(raw)` — lenient read; missing doc → defaults; unknown keys ignored; disabled presets filtered at resolve time for consumers.
- `parseStandardPrintSizesSettingsInput(raw)` — strict callable validation (positive widths, bounded max e.g. ≤22, valid keys, at least one enabled preset per placement optional).
- `findStandardPrintSizePreset(settings, key)` — lookup for UI + apply.
- `formatStandardPrintSizeSelectionLabel(settings, key)` — e.g. `"Full Front · Adult · L"`.
- `standardPrintSizesSettingsRulesAlignment.test.ts` — mirror `printRequestLimitSettingsRulesAlignment.test.ts`.

### Write / read pattern

| Layer | File (new) | Pattern |
|-------|------------|---------|
| Callable | `functions/src/updateStandardPrintSizesSettings.ts` | Owner-only (match `updatePrintRequestLimitSettings`) |
| Studio service | `apps/studio/.../settings/services/standardPrintSizesSettingsService.ts` | subscribe + callable |
| Studio hook | `apps/studio/.../settings/hooks/useStandardPrintSizesSettings.ts` | |
| Studio UI | `apps/studio/.../settings/components/StandardPrintSizesSettingsSection.tsx` | Placement accordion; per-preset width input + enabled checkbox |
| Settings tab | `SettingsPage.tsx` | New tab under `canViewAdministrativeSettings` or owner-only — **recommend owner-only** (align with print limits) |
| Portal service | `apps/portal/features/print-requests/services/portalStandardPrintSizesService.ts` | `onSnapshot` + resolve defaults |
| Portal hook | `apps/portal/features/print-requests/hooks/usePortalStandardPrintSizes.ts` | |

### Firestore rules

```javascript
match /settings/standardPrintSizes {
  allow read: if isSignedIn();
  allow write: if false;
}
```

Callable-only writes; no client `setDoc` (consistent with `printRequestLimits`).

---

## Default preset table

**Status: `[NEEDS OWNER INPUT]` for every `widthInches` value and for group membership on placements other than the Full Front example.**

Repo constants that exist but are **not placement-specific presets**:

| Constant | Value | File |
|----------|-------|------|
| `STANDARD_PRINT_WIDTH_INCHES` | 8 | `printSize.constants.ts` |
| `DEFAULT_PRINT_REQUEST_WIDTH_INCHES` | 10 | `printSize.constants.ts` |
| `AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES` | 12 | `printSize.constants.ts` |
| `MAX_APPROVED_PRINT_WIDTH_INCHES` | 15 | `printSize.constants.ts` |

These must **not** be silently mapped to preset rows without owner confirmation.

### Seed hierarchy (structure only)

| Placement | Groups / preset labels | Width (in) |
|-----------|------------------------|------------|
| **Full Front** | Adult: M, L, XL, 2XL, 3XL, 4XL | `[NEEDS OWNER INPUT]` × 6 |
| | Child: M, L, XL | `[NEEDS OWNER INPUT]` × 3 |
| | Toddler: Toddler | `[NEEDS OWNER INPUT]` |
| | Infant: Infant | `[NEEDS OWNER INPUT]` |
| **Full Back** | Adult / Child / Toddler / Infant — **which groups apply?** | `[NEEDS OWNER INPUT]` |
| **Back Collar** | **Which groups apply?** | `[NEEDS OWNER INPUT]` |
| **Left Chest** | **Which groups apply?** | `[NEEDS OWNER INPUT]` |
| **Sleeve** | **Which groups apply?** | `[NEEDS OWNER INPUT]` |
| **Hat** | **Which groups apply?** | `[NEEDS OWNER INPUT]` |

**Stable preset keys (proposed naming):** `{placementId}.{groupId}.{slug}` — e.g. `full_front.adult.l`, `full_front.toddler.toddler`.

**Human checkpoint before Implement:** Owner fills the width column and confirms group membership for all six placements. Planning Agent records approved values in this plan (or an attached owner-approved table) and only then may Implement begin.

---

## Data model impact

### `PrintRequestItem` — optional preset key

Add optional field:

```typescript
/** When set, item width was last applied from this Standard Size preset. Cleared when manual width diverges. */
standardSizePresetKey?: StandardPrintSizePresetKey;
```

**Why not `sizeLabel`:** `sizeLabel` remains the dimension display string (`formatPrintRequestItemSizeLabel`). Overloading it would break drawer/meta fallbacks (`formatCurrentRequestDrawerItemMeta.ts`) and queue/export consumers expecting inch formatting.

**Behavior:**

- On preset Apply: set `printWidthInches`, derived `printHeightInches`, recompute `sizeLabel`, set `standardSizePresetKey`.
- On manual width edit: if new width ≠ preset's configured width (compare at `PRINT_INCHES_DECIMAL_PLACES` precision), clear `standardSizePresetKey` → UI shows **Custom** / generic **Standard Size** trigger.
- On duplicate: copy `standardSizePresetKey` with existing duplicate field copy behavior in services.
- Settings change: **never** mutate existing items; stale keys may point at disabled presets → UI treats as Custom if key not found or disabled.

**Migration:** None required; absent field = no preset selected. Rules tests extended in `printRequestItemResize.rules.test.ts`.

---

## Architecture & approach

### Layering

```
Item card (Studio/Portal)
  → useStandardPrintSizeSelection hook (per app, thin)
  → StandardPrintSizesModal (per app UI)
  → shared: resolveStandardPrintSizesSettings, applyStandardPrintSizePreset, assessPrintRequestItemSize
  → existing card saveDraft → service updatePrintRequestItem (width/height + optional preset key)
```

### Shared apply helper (new)

**File:** `packages/shared/src/utils/applyStandardPrintSizePreset.ts`

```typescript
export function applyStandardPrintSizePreset(input: {
  presetWidthInches: number;
  pixelWidth: number;
  pixelHeight: number;
  approvedMaxPrintWidthInches?: number;
  approvedMaxPrintHeightInches?: number;
  wasUpscaled?: boolean;
}): {
  printWidthInches: number;
  printHeightInches: number;
  assessment: PrintRequestItemSizeAssessment;
}
```

Implementation: `printHeightInches = calculateLockedHeightFromWidth(...)` then `assessPrintRequestItemSize(...)`. **No parallel validation.**

Modal Apply button:

- Disabled until preset selected.
- If `!assessment.canSave`, show `assessment.errorMessage` (same strings as manual save — no clamping).
- On success, card reuses existing `updateWidth` / `saveDraft` path with computed inches + preset key.

### Studio title parity (required before / with Standard Size card work)

Studio Print Request item cards must adopt the **same truncation mechanism as Portal** (single-line ellipsis + bounded title region), not an independent Studio rule.

**Target card layout (Studio editable cards):**

```
Artwork (+ source badge)
↓
Design title (bounded / single-line ellipsis — Portal parity)
↓
Standard Size
↓
Width | Height
↓
DPI | Quantity
↓
Duplicate | Remove
```

**Implement steps:**

1. Update Studio CSS to match Portal's `.portal-request-item-editor-body` + `h2` behavior (see § Portal title truncation).
2. Reuse vertical space recovered from bounding titles; keep Standard Size control thin.
3. Verify at normal and narrow Studio window widths; catalog- and upload-backed items share the same title path (`design?.title ?? upload?.title ?? item.titleSnapshot`).

**Portal:** no title redesign; reference only.

**Responsive / overlap guards:** truncated title must not overlap Standard Size, Width/Height, artwork badges, DPI badge, or card actions.

### UI — item card

Insert between title (`print-requests-item-card-title` / Portal `h2`) and `*-item-size-row`:

- Text button or link-styled control: **Standard Size** or contextual **Standard Size · Full Front · Adult · L**.
- Minimal vertical padding; no new card section wrapper that increases height materially.
- `readOnly` / historical views: hide control (match width/height hiding).

### UI — Standard Sizes modal

| Element | Spec |
|---------|------|
| Title | `Standard Sizes` |
| Tabs | Full Front \| Full Back \| Back Collar \| Left Chest \| Sleeve \| Hat |
| Helper | `Select a standard print width. Height will adjust automatically to preserve the artwork's proportions.` |
| Body | Group headings Adult / Child / Toddler / Infant; compact bordered tiles with preset name + width |
| Footer | Current `W" × H"`; when preset selected, preview resulting `W" × H"`; Cancel; Apply (disabled until valid selection) |
| A11y | Focus trap, Escape to close — match Studio `Modal` and Portal modal conventions |
| Mobile | Portal: single-column tabs (scroll or wrap), full-width tiles, no horizontal page overflow |

### Studio Settings UI (V1)

- One section per placement (collapsible).
- List presets with: label (read-only seed), width number input, enabled checkbox.
- Save validates via `parseStandardPrintSizesSettingsInput`; show callable errors inline.
- Reset-to-defaults button restores **owner-approved** `DEFAULT_STANDARD_PRINT_SIZES_SETTINGS` (not hardcoded in UI).

---

## Security impact

- Preset widths validated server-side in callable (positive, ≤22, finite).
- Portal read requires signed-in user (same exposure class as `printRequestLimits`).
- No new public endpoints; no secrets.
- Client cannot write settings doc directly (`write: if false`).
- Item preset key is display metadata + UX state; authoritative size remains `printWidthInches` / `printHeightInches` with existing save validation.

---

## Backend impact

| Change | Detail |
|--------|--------|
| Callable | `updateStandardPrintSizesSettings` exported from `functions/src/index.ts` |
| Studio service | `callTracedFunction("updateStandardPrintSizesSettings", ...)` |
| Optional loader | `functions/src/lib/loadStandardPrintSizesSettings.ts` if server paths need presets later (not required for V1 client apply) |
| Deploy | DEV first; production requires human checkpoint per `DEPLOYMENT.md` |

Update `printRequestService.ts` / `portalPrintRequestService.ts` / relevant Cloud Functions item mappers to accept optional `standardSizePresetKey` on update/create/duplicate.

---

## Test strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| git diff hygiene | `git diff --check` | yes |
| Shared preset apply | `npx tsx --test packages/shared/src/utils/applyStandardPrintSizePreset.test.ts` (new) | yes |
| Settings resolve/parse | `npx tsx --test packages/shared/src/constants/printSize/standardPrintSizesSettings*.test.ts` (new) | yes |
| Manual sizing regression | `npx tsx --test packages/shared/src/utils/printRequestItemSizing.test.ts apps/studio/src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts functions/src/lib/assertQueuePrintRequestItemSize.test.ts` | yes |
| Rules alignment | `npx tsx --test packages/shared/src/constants/printSize/standardPrintSizesSettingsRulesAlignment.test.ts` (new) | yes |
| Rules emulator | Extend `tests/firebase/printRequestItemResize.rules.test.ts` for `standardSizePresetKey` | yes |
| Card contracts | Extend or add Portal/Studio card source contract tests for Standard Size control wiring | yes |

### Manual (owner DEV QA — required before Signoff)

See review doc checkpoint template: Studio + Portal, catalog + upload items, preset apply, DPI block/warn, 22″ block, manual override → Custom, disabled preset hidden, settings width change affects future selections only, mobile Portal modal, **Studio title layout parity** (below).

#### Studio title layout (amendment)

Create or use a Print Request containing at least:

1. A very short design title
2. A medium-length design title
3. A very long design title that currently wraps onto multiple lines in Studio

Verify in **Studio**:

- Title truncation matches Portal (single-line ellipsis, consistent title region height)
- `Standard Size`, Width/Height, DPI, quantity, Duplicate, and Remove stay vertically aligned across cards in the same grid
- No clipping or text overlap with badges or controls
- Full design title value unchanged in Firestore / design record

Compare one equivalent item on **Portal** to confirm visual parity.

Also verify: narrow Studio window width; customer-upload-backed and catalog-backed items.

---

## Human checkpoints anticipated

1. **Owner approves default width table** — **blocking for Implement** (this plan § Default preset table).
2. **Owner manual DEV QA** — before Signoff.
3. **DEV Firebase deploy** — callable + rules for `standardPrintSizes` and item field allowlist.
4. **Production** — not authorized in this phase.

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Invented default widths wrong for production | High | All widths `[NEEDS OWNER INPUT]`; Implement gate |
| Drift between Studio and Portal modals | Medium | Shared types, apply helper, settings resolve |
| `sizeLabel` misuse | Medium | Separate `standardSizePresetKey`; document in DATA_MODEL |
| Stale preset key after settings edit | Low | UI falls back to Custom; key optional |
| Card height regression | Medium | Studio title parity first; thin Standard Size control; QA checkpoint |
| Studio 2-line clamp vs Portal 1-line ellipsis | Medium | Copy Portal CSS mechanism exactly; verify in QA |
| Rules miss on new item field | Medium | Extend emulator tests |
| Parallel sizing logic | High | Single apply helper calling existing assess/lock functions |

---

## Rollback plan

- Disable all presets in Settings (all `enabled: false`) → cards show empty/disabled Standard Size; manual sizing unchanged.
- Revert callable + rules deploy; clients fall back to `DEFAULT_STANDARD_PRINT_SIZES_SETTINGS` or hardcoded defaults in shared resolve.
- Optional item field ignored if clients rolled back; no data migration needed.

---

## Documentation updates required

- [ ] `docs/architecture/DATA_MODEL.md` — `settings/standardPrintSizes`, `PrintRequestItem.standardSizePresetKey`
- [ ] `docs/architecture/BACKEND.md` — callable, env N/A
- [ ] `docs/WORKFLOWS.md` — Standard Size picker behavior
- [ ] `docs/standards/TESTING.md` — new test file paths if added
- [ ] `docs/project/ROADMAP.md` — note fast-follow completion when signed off

---

## Open questions

- [ ] **Owner:** Complete default width table for all placements and groups.
- [ ] **Owner:** Confirm group membership for Full Back, Back Collar, Left Chest, Sleeve, Hat.
- [ ] **Owner:** Settings tab permission — owner-only vs owner/admin (recommend owner-only).
- [ ] **Owner:** Approve optional `standardSizePresetKey` persisted field vs session-only label (recommend persisted field for reload/duplicate clarity).

---

## Implementation order (post-review)

1. Shared constants + defaults (after owner fills table) + apply helper + tests.
2. Callable + Firestore rules + rules tests.
3. Studio Settings section + hook + service.
4. Portal settings read service + hook.
5. **Studio title truncation parity** (`print-requests.css`; verify before Standard Size placement).
6. Shared selection hook logic; Studio modal + Standard Size card wiring.
7. Portal modal + card wiring + CSS.
8. Service updates for preset key on save/duplicate.
9. Docs + manual QA checkpoint + test phase + signoff.

---

## Acceptance criteria

### Standard Size presets (original)

- [ ] Studio Print Request item cards expose Standard Size.
- [ ] Portal Print Request item cards expose Standard Size.
- [ ] Existing card layout preserved with no major card-height/layout regression.
- [ ] Standard Sizes modal uses placement tabs.
- [ ] Relevant presets grouped by Adult / Child / Toddler / Infant.
- [ ] Selecting a preset changes width; height recalculates from aspect ratio; artwork never stretched.
- [ ] Current and preview resulting dimensions visible in modal before Apply.
- [ ] Apply updates same item-sizing state as manual sizing.
- [ ] &lt;200 DPI blocked; 200–299 DPI warning; ≥300 DPI normal; &gt;22″ blocked.
- [ ] Catalog- and customer-upload-backed items work.
- [ ] Studio Settings exposes Standard Print Sizes; widths configurable; presets enable/disable.
- [ ] Disabled presets unavailable in Studio and Portal selectors.
- [ ] Settings changes do not resize existing request items.
- [ ] Missing settings use approved defaults safely.
- [ ] Studio and Portal consume same authoritative preset configuration.
- [ ] Manual sizing, duplicate/item identity, queue validation unchanged.
- [ ] Mobile Portal modal usable; keyboard/focus/escape follow modal conventions.
- [ ] Focused tests added; existing sizing tests pass; lint/typecheck/build pass.

### Studio title truncation parity (amendment)

- [ ] Studio Print Request design titles use the same truncation behavior as Portal Print Request design titles.
- [ ] Long Studio titles no longer increase the title region enough to shift sizing controls between cards.
- [ ] Short Studio titles continue to display normally.
- [ ] Mixed short and long titles in the same grid keep Standard Size, Width, Height, DPI, quantity, Duplicate, and Remove controls vertically aligned.
- [ ] The underlying design title value is never modified or truncated in persistence.
- [ ] Portal title behavior remains unchanged unless a verified shared implementation requires a narrow refactor (none expected).
- [ ] Any existing Portal mechanism for exposing the complete title is preserved/mirrored where appropriate (lightbox + control aria-labels; no new title tooltip).
- [ ] Studio card behavior remains usable at narrow application widths.
- [ ] Existing Print Request card actions and sizing behavior remain unchanged.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-29-print-request-standard-size-presets-review.md`
- Verdict: pending

---

## Corrective amendment — Fresh Prints Standard Size Defaults v1 (2026-08-29)

**Authorization:** `CONTINUE WORKFLOW: STANDARD SIZE DEFAULTS + SUB-TAB CORRECTIVE`

**Prior QA:** Owner manual QA recorded **PASS WITH NOTES** — feature behavior passed; signoff deferred for catalog + modal hierarchy corrective.

### Scope

1. Replace provisional grouped preset catalog with **Fresh Prints Standard Size Defaults v1** (individual garment sizes, Pocket placement, updated Hat widths).
2. Add strongly typed **`pocket`** placement and **`pocket`** group.
3. Standard Sizes modal: **Placement → Group sub-tabs → preset tiles** (one group visible at a time).
4. Forward-compatible **`resolveStandardPrintSizesSettings`** — canonical defaults + overlay saved keys; expose new presets; ignore retired keys; **no silent Firestore overwrite**.
5. Owner applies v1 table via explicit **Reset to Defaults → Save** (existing DEV `settings/standardPrintSizes` document).

### Out of scope (unchanged)

- Height-only placement max warnings
- Production deploy
- Automatic background migration of saved settings

### DEV Firebase

Callable **`updateStandardPrintSizesSettings`** must be redeployed after shared catalog expansion so Save accepts 7-placement / v1 structure. Firestore rules unchanged.

### Focused re-QA

See `docs/workflow/reviews/2026-08-29-print-request-standard-size-presets-focused-reqa-checkpoint.md`.

