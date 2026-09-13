# Plan Amendment (Revised): Per-Asset Interactive Upscale Toggle

| Field | Value |
|-------|-------|
| Date | 2026-08-30 (revised same day — owner correction) |
| Parent plan | `docs/workflow/plans/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-plan.md` |
| Goal id | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Status | **ready_for_review** |
| Supersedes | Prior amendment draft (daily quota, catalog-only, destructive canonical enhance, one-way button UX) |

---

## Owner correction (binding)

The following are **explicitly NOT approved** and must not be implemented:

- Per-customer daily/weekly/monthly enhancement quotas (e.g. 5/day, 10 attempts/day)
- Customer enhancement credits or allowance UI
- Studio-only interactive enhancement
- `catalog_design`-only interactive enhancement
- Destructive replacement of the baseline canonical production asset
- One-way “Upscale artwork” button as the final UX

**Approved model:**

| Principle | Rule |
|-----------|------|
| Customer usage | **No count limit** on how many *different* eligible assets a customer may enhance |
| Per-asset limit | **One** successful interactive enhanced derivative per artwork lineage (shared across Studio + Portal) |
| Toggle | Per **Print Request item** — OFF = baseline asset + restored pre-enhance size; ON = enhanced derivative (generate once, reuse forever) |
| Sources | **`catalog_design` + `customer_upload`** in V1 |
| Automated processing | **Unchanged** — 15″ / ~4500px @ 300 DPI forward-only on new imports/uploads |
| Safety ceiling | **Cumulative ≤6×** from preserved **native/original** source — authoritative; not `wasUpscaled` alone |
| Interactive target | **Request-driven** toward ~300 effective DPI at selected print size — **not** fixed 15″ |

---

## Owner DEV QA status (unchanged)

**FAIL** — signoff blocked.

| # | Finding | Track |
|---|---------|-------|
| 1 | Portal catalog-add persists 10″ (stale `addPortalCatalogDesignToPrintRequest` deploy) | **Corrective** — already reviewed; deploy checkpoint |
| 2 | Studio interactive upscale not discoverable under old eligibility | **Toggle redesign** — this amendment |
| 3 | Portal + Studio + both source types required | **This amendment** |

**Passed (do not reimplement):** Studio 11″ default; 15″ automated import/upload; DPI floors/warnings; Standard Size; gang-sheet 11″ two-up; cumulative safety tests.

---

## WS-CONFIG-DEFAULT — Runtime-configurable Print Request default width (2026-08-30)

**Binding:** Initial/default width for **new** Print Request items is a **persisted global operational setting** (Studio-controlled), snapshot at item create. **No retroactive resize.** `11″` is the **default setting value**, not a permanent compile-time-only constant.

### Settings architecture (repo-verified)

| Item | Path / value |
|------|----------------|
| Firestore collection | `settings` |
| Document id | `standardPrintSizes` (`STANDARD_PRINT_SIZES_SETTINGS_DOC_ID`) |
| Existing schema | `StandardPrintSizesSettings` in `packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.ts` |
| Studio read/write service | `apps/studio/.../settings/services/standardPrintSizesSettingsService.ts` — `onSnapshot` + `updateStandardPrintSizesSettings` callable |
| Portal read service | `apps/portal/.../services/portalStandardPrintSizesService.ts` — `onSnapshot` on same doc (signed-in read) |
| Server update callable | `functions/src/updateStandardPrintSizesSettings.ts` — **owner-only** (`caller.role === "owner"`) |
| Server load pattern (new) | `functions/src/lib/loadStandardPrintSizesSettings.ts` — mirror `loadPrintRequestLimitSettings.ts` |
| Firestore Rules | `settings/standardPrintSizes` — `read: if isSignedIn()`; `write: if false` (callable-only) |

**Proposed persisted field (additive on same document):**

```ts
defaultPrintRequestWidthInches?: number; // on StandardPrintSizesSettings
```

**Resolver:** `resolvePrintRequestDefaultWidthInches(settings)` → valid finite value in `[STANDARD_PRINT_SIZE_WIDTH_MIN_INCHES, 22]` or fallback **`STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` (11)**.

**Why same doc (not new):** Portal already subscribes for Standard Size presets; one Firestore read gives presets + default width; Settings UI already has **Standard Print Sizes** tab; avoids a second settings document/service.

**`STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES = 11`:** remains **fallback only** when setting absent/invalid/unavailable — not runtime source of truth after implementation.

### Settings UI (repo-verified location)

| Item | Path |
|------|------|
| Page | `apps/studio/.../settings/pages/SettingsPage.tsx` — tab `standardPrintSizes` |
| Section component | `apps/studio/.../settings/components/StandardPrintSizesSettingsSection.tsx` |
| Hook | `useStandardPrintSizesSettings.ts` |
| Permission (UI gate) | `permissionService.canManageStandardPrintSizes(user)` → **`isOwner(user)`** |
| Callable permission (write) | `updateStandardPrintSizesSettings` → **active owner only** |

**UI addition:** Numeric **Default Print Request Width** (inches) at top of Standard Print Sizes section.

- Label: **Default Print Request Width**
- Helper: *Used for new items added to Print Requests. Existing items are not resized when this value changes.*
- Step: **0.25″** (matches `STANDARD_PRINT_SIZE_WIDTH_STEP_INCHES` in preset editor)
- Min/max: `STANDARD_PRINT_SIZE_WIDTH_MIN_INCHES` (0.01) … `STANDARD_PRINT_SIZE_WIDTH_MAX_INCHES` (22)
- Decimal support: 10.5, 11, 11.5 required valid
- Save via existing section Save → `standardPrintSizesSettingsService.update` → callable; **no Studio restart**

### Snapshot-at-create contract

- Setting read **at item creation time** only
- Persisted `printWidthInches` / `printHeightInches` on item remain authoritative forever
- Same open Working request: Item A (old setting) unchanged; Item B (new setting) uses new default
- Queued/printing/printed items: **zero effect** from setting change

### Shared initializer change

Extend `resolveInitialPrintRequestItemSize` input:

```ts
printRequestDefaultWidthInches?: number; // runtime setting; fallback 11
```

Replace hardcoded `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` in baseline branch with resolved setting value. Setting is a **target**, not a DPI bypass — existing clamp/floor logic unchanged.

### Initialization path inventory

| Path | App | Uses generic default? | Action |
|------|-----|----------------------|--------|
| `printRequestService.resolveDefaultRequestedSize` → `addPrintRequestItem` | Studio | **Yes** | Pass current setting |
| Design Library request-selection (`usePrintRequestSelectionMode` → `addPrintRequestItem`) | Studio | **Yes** | Same |
| Customer / Internal request flows | Studio | **Yes** (via `addPrintRequestItem`) | Same |
| `portalPrintRequestService.addOrIncrementCatalogDesign` → callable | Portal | **Yes** (server) | Server loads setting at create |
| `portalPrintRequestService.savePrintRequestDesignSelections` (batch create) | Portal | **Yes** (client) | Client reads setting from `portalStandardPrintSizesService` snapshot |
| `useAddDesignToRequestFlow.resolveOptimisticPrintSize` | Portal | **Yes** (optimistic UI) | Same snapshot |
| `confirmCustomerUploadsAndAttachToRequest` | Functions | **Yes** | Server loads setting |
| `customerAddAssistedApprovedProofToPrintRequest` | Functions | **Yes** | Server loads setting |
| `duplicatePortalPrintRequestItem` | Portal/Functions | **No** — copies source item dimensions | **Preserve** — no change |
| Quantity update / item save / reload | Both | **No** | **No reapply** |
| Standard Size preset selection | Both | **Explicit override** | Preset wins; independent of default setting |
| Client-passed `printWidthInches` to callable | Portal | **Explicit override** | Requested dimensions win (`resolvePortalCatalogAddLineSize`) |

### Server authority (no compile-time default in Functions)

`addPortalCatalogDesignToPrintRequest` final shape:

```
loadStandardPrintSizesSettings()
→ resolvePrintRequestDefaultWidthInches()
→ resolvePortalCatalogAddLineSize({ ..., printRequestDefaultWidthInches })
→ resolveInitialPrintRequestItemSize(...)
→ persist item dimensions
```

**Do not** bake 11/10.5/11.5 into deployed Function bundles. Owner changes setting in Studio → next Portal catalog add uses new value **without** Function redeploy.

### Cache / invalidation

| Surface | Pattern |
|---------|---------|
| Studio | Existing `onSnapshot` on `settings/standardPrintSizes` — immediate after save |
| Portal | Existing `portalStandardPrintSizesService.subscribe` — immediate on doc update |
| Functions | **No cache** — `loadStandardPrintSizesSettings()` per create attach (acceptable; same pattern as `loadPrintRequestLimitSettings` in catalog add today) |

### Portal security

- Customers: **read** signed-in doc (already allowed for Standard Sizes presets) — only non-sensitive numeric default added
- Customers: **cannot write** setting (Rules `write: false`; callable owner-only)
- No new customer preference surface

### Validation

- Reuse width bounds from Standard Size settings (`0.01` … `22`)
- Reject invalid/non-finite on callable parse
- 10.5 / 11 / 11.5 must pass

### Independence from interactive upscale toggle

| Concern | Controls |
|---------|----------|
| Default width setting | Initial physical size of **new** items |
| Upscale toggle | Baseline vs enhanced **pixel variant** for existing item |

### Tests (30 automated — see Formal Review amendment)

### Manual QA (owner Tests 1–5 — see Formal Review amendment)

### Firebase / Rules / migration

| Area | Impact |
|------|--------|
| Functions | Extend `updateStandardPrintSizesSettings` parse; add `loadStandardPrintSizesSettings`; update all generic-init callables |
| Firestore Rules | **No change** — same doc, still signed-in read / callable write |
| Storage Rules | **None** |
| Indexes | **None** |
| Migration | **None** — absent field → fallback 11″ |

### Implementation order (relative to FAIL 1 + toggle)

1. **WS-CONFIG-DEFAULT** (this workstream) — **first implementation slice**
2. **WS-TOGGLE** — interactive upscale (after review ack)
3. **Single DEV deploy** of `addPortalCatalogDesignToPrintRequest` (+ any other init callables) with **runtime setting** — **not** interim hardcoded-11 deploy

---

## FAIL 1 — Portal 11″ corrective (reconciled)

**Root cause (proven, unchanged):** `addPortalCatalogDesignToPrintRequest` not redeployed on `fresh-prints-dev`; server bundle still uses 10″ initializer.

**Reconciled with WS-CONFIG-DEFAULT:** Do **not** deploy a temporary hardcoded-11″ Function. Final server path loads **runtime** `defaultPrintRequestWidthInches` from `settings/standardPrintSizes` (fallback 11″). Deploy once after WS-CONFIG-DEFAULT implementation.

**Path:** Portal add → `addOrIncrementCatalogDesign` → callable → `resolvePortalCatalogAddLineSize` → Firestore → cart + review.

**Deploy checkpoint (unchanged — not authorized):**

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
firebase deploy --only functions:addPortalCatalogDesignToPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev
```

(Exact `--only` list finalized at implementation — any Function that generic-initializes item size.)

**STOP** — workflow state requires owner deploy approval. Do not infer authorization.

Tests: extend existing 11″ default-case tests with runtime setting cases (10.5, 11.5).

---

## Product contract — toggle lifecycle

### States (shared policy)

| State | UX | Behavior |
|-------|-----|----------|
| **1 — Derivative exists** | Toggle ON/OFF enabled | OFF → baseline; ON → reuse existing derivative (no processing) |
| **2 — Enhancement available** | Toggle enabled | First ON → server generates one derivative; persist ON |
| **3 — At upscale max** | Toggle disabled | `Maximum resolution reached` — baseline already at cumulative 6× ceiling from native |
| **4 — No benefit at current size** | Toggle may remain visible with helper | e.g. “Increase resolution for larger print sizes” — capacity remains but current size already sufficient |

### Toggle OFF

- Switch active variant to **baseline production** asset
- **Do not** delete enhanced derivative
- **Do not** inverse-process or downscale
- Restore **pre-enhancement** `printWidthInches` / `printHeightInches` captured on first ON

### Toggle ON (first time)

1. Server validates eligibility + computes request-driven target pixels
2. Generate **one** interactive derivative (non-destructive)
3. Persist provenance on asset document
4. Set item to enhanced mode; recalculate DPI from enhanced pixels

### Toggle ON (subsequent)

- Instant reuse — no image processing

### Failed attempt

- Does **not** consume the one-time opportunity
- Toggle stays/returns OFF; baseline intact

---

## Repo-verified asset model `[NEEDS REPO CHECK — completed 2026-08-30]`

### Catalog design (`designs`)

| Role | Field / path (current) |
|------|------------------------|
| Native / original pixels | `nativeProductionWidthPx` / `nativeProductionHeightPx`; else derive via `resolveNativeProductionSourcePixels` from `width`/`height` + `upscaleFactor` / `upscalePassCount` |
| Baseline production file | `originalPath` → `/originals/{designId}.png` (`getOriginalStoragePath`) |
| Baseline production pixels | `width` / `height` on design doc |
| Automated provenance | `wasUpscaled`, `upscaleFactor`, `upscalePassCount` (0\|1 automated; current impl allows 2 after manual — **to be superseded**) |
| Preview / thumb | `previewPath`, `thumbnailPath` |
| In-flight lock | `artworkEnhanceLockUntil`, `artworkEnhanceLockBy` |

**Gap:** No separate interactive derivative path exists today. Current `enhancePrintRequestArtworkCore` **overwrites** `originalPath` — **must be superseded**.

**Proposed additive fields (design doc):**

- `interactiveEnhancedOriginalPath` — Storage path to enhanced PNG (server-computed canonical path)
- `interactiveEnhancedWidthPx`, `interactiveEnhancedHeightPx`
- `interactiveEnhanceGeneratedAt`, `interactiveEnhanceGeneratedBy`
- Optional matching `interactiveEnhancedPreviewPath` / `interactiveEnhancedThumbnailPath` for UI

**Proposed path convention** `[NEEDS OWNER DECISION — recommend default]`:

- `/originals/{designId}.interactive.png` (additive sibling; baseline `/originals/{designId}.png` preserved)

### Customer upload (`customerUploads`)

| Role | Field / path (current) |
|------|------------------------|
| Raw / native source | `sourceStoragePath` → `/customer-uploads/{uid}/{id}/source`; `sourceWidthPx` / `sourceHeightPx` |
| Baseline production | `productionStoragePath` → `.../production.png`; `widthPx` / `heightPx` |
| Automated provenance | `wasUpscaled`, `upscaleFactor`, `upscalePassCount` (0\|1) |

**Proposed additive fields:**

- `interactiveEnhancedProductionStoragePath`
- `interactiveEnhancedWidthPx`, `interactiveEnhancedHeightPx`
- `interactiveEnhanceGeneratedAt`, `interactiveEnhanceGeneratedBy`

**Proposed path:** `/customer-uploads/{uid}/{id}/production.interactive.png` `[NEEDS OWNER DECISION — recommend default]`

---

## Cumulative capacity (authoritative)

Use shared helper (new) `resolveInteractiveUpscaleCapacity`:

```
nativePx = resolveNativeSourcePixels(asset)   // catalog or upload
maxAllowedPx = round(nativePx.width * MAX_UPSCALE_FACTOR)   // MAX_UPSCALE_FACTOR = 6
baselinePx = current baseline production width (not enhanced derivative)
```

**At max (State 3):** `baselinePx >= maxAllowedPx * (1 - NEAR_TARGET_TOLERANCE_RATIO)`

**Not at max merely because:** `wasUpscaled === true` or automated pass ran.

**One-time interactive rule:** If `interactiveEnhanceGeneratedAt` (or equivalent) is set → never generate again; reuse derivative only.

**Do not use** `upscalePassCount === 2` as the primary gate — replace with explicit interactive-generated marker + cumulative capacity.

---

## Request-driven interactive target

New shared function `resolveInteractiveEnhanceTargetPixels`:

**Inputs:** native pixels, baseline production pixels, requested `printWidthInches` / `printHeightInches`, `MAX_UPSCALE_FACTOR`, `TARGET_PRINT_DPI` (300), 22″ cap.

**Algorithm (conceptual):**

1. Compute **effective DPI** at requested size from **baseline** pixels (aspect-safe limiting dimension).
2. Ideal target pixels for ~300 DPI at requested physical size (aspect-locked).
3. Cap by `maxAllowedPx` from native × 6.
4. Cap by technical/processing ceilings if any.
5. If capped target ≤ baseline pixels (+ tolerance) → State 4 or 3 as appropriate.
6. Output target width/height px for `processArtworkEnhancePng`.

**15″ automated target remains import-only** — not used for interactive target.

---

## Print Request item persistence (proposed)

```typescript
/** Absent or 'baseline' = OFF (default for legacy items). */
artworkEnhanceMode?: 'baseline' | 'enhanced';

/** Captured on first successful ON; restored on OFF. */
preEnhancePrintWidthInches?: number;
preEnhancePrintHeightInches?: number;
```

- Legacy items: mode absent → OFF; safe.
- No mass backfill; lazy derivative creation on first ON.
- Do not duplicate Storage paths on item — reference asset doc fields.

---

## Production asset resolution (must amend)

Current `resolvePrintAssetPaths` always uses `design.originalPath` / `upload.productionStoragePath`.

**Required:** Accept `artworkEnhanceMode` (or item) and return enhanced path when ON.

**Impact surfaces (repo-verified):**

| Surface | File |
|---------|------|
| Shared resolver | `packages/shared/src/utils/printAssetResolution.ts` |
| Gang sheet export | `apps/studio/.../useExportGangSheetPng.ts` (direct `originalPath` / `productionStoragePath`) |
| Show ZIP export | `apps/studio/.../useExportShowZip.ts` |
| Gang sheet builder | `apps/studio/.../useGangSheetBuilder.ts` (`originalPathSnapshot`) |
| Studio PR preview/DPI | `PrintRequestItemCard` — must use active variant pixels |
| Portal cart/review | item fields + design/upload fetch |

Regression tests required (see test plan § Production resolver).

---

## Callable / authorization architecture

| Action | Studio | Portal |
|--------|--------|--------|
| Toggle ON (generate or reuse) | Staff callable (amend `enhancePrintRequestArtwork` or rename) | **New** customer-trusted callable |
| Toggle OFF | Callable (preferred) or trusted service write | Same customer callable |

**Portal minimum server checks:** auth customer; active profile; request ownership; ADR-FP-071 editability; item belongs to request; server-resolved source; no client paths/dimensions; cumulative capacity; one-time derivative; in-flight lock.

**No customer usage quota.** Security only: auth, idempotency, per-asset lock, server-computed targets.

**Studio:** retain `assertStaffCaller`; catalog + upload.

---

## Implementation reconciliation (current `878439e` local)

| Component | Classification |
|-----------|----------------|
| `resolveNativeProductionSourcePixels`, `MAX_UPSCALE_FACTOR`, `imageQualitySizingPolicy` | **A — reusable** |
| `processArtworkEnhancePng`, `artworkEnhanceProcessing` | **A — reusable** (write to new path, not overwrite) |
| `artworkEnhanceLockUntil` pattern | **A — reusable** (per asset) |
| 15″ automated import/upload | **A — keep** |
| `enhancePrintRequestArtworkCore` destructive overwrite | **C — supersede** |
| `resolveManualArtworkEnhanceDecision` fixed 15″ target | **B — amend** → request-driven interactive policy |
| `shouldOfferManualArtworkEnhanceAction` (DPI < 300) | **C — supersede** → toggle state resolver |
| `PrintRequestItemCard` one-way button | **B — amend** → toggle UI |
| `customer_upload` rejection in callable | **B — amend** |
| Portal absence | **B — implement** after review |
| Daily quota amendment draft | **C — delete / supersede** |

---

## Firebase / Rules / indexes

| Area | Impact |
|------|--------|
| **Functions** | Amend staff callable; add Portal toggle callable(s); non-destructive Storage writes |
| **Firestore Rules** | **Likely** — new item fields should be callable-only writes for `artworkEnhanceMode` / pre-enhance size capture |
| **Storage Rules** | **Likely** — new enhanced object paths; server-only write |
| **Indexes** | **Unlikely** — no new query patterns anticipated |
| **Migration** | **None** — additive optional fields; default OFF |

---

## Automated test plan (60 cases — owner list)

Organized in Formal Review amendment. Minimum new shared test module: `interactiveArtworkEnhance.test.ts` covering eligibility, target math, toggle lifecycle, resolver variant selection.

**Portal 11″ corrective tests** remain separate (already passing).

---

## Manual QA plan (additions)

After toggle implementation:

1. Catalog item: toggle ON at 16″ → DPI refresh; export ZIP uses enhanced file
2. Toggle OFF → size restores; export uses baseline
3. Toggle ON again → instant, no reprocess
4. Upload item: same flow; other customer cannot access
5. Asset at 6× native → disabled with explanation
6. Change 11″ → 16″ → toggle becomes available
7. Portal mobile toggle + cart/review consistency
8. Portal 11″ catalog add after approved Function redeploy

---

## Out of scope (unchanged)

- Production deploy
- Smart Profiling
- Customer image-count quotas
- **WS-TOGGLE** implementation until Formal Review acknowledged
- **WS-CONFIG-DEFAULT** implementation until Formal Review acknowledged

---

## Resolved owner decisions (2026-08-30)

| Item | Decision |
|------|----------|
| Enhanced Storage path naming | **Not a product decision** — use repo derivative conventions; `.interactive.png` acceptable if collision-safe |
| State 4 discoverability | **YES** — toggle visible with helper when capacity remains |
| Portal 11″ interim deploy | **Hold (Option B)** — single deploy with runtime setting, not hardcoded-11 corrective |

## `[NEEDS OWNER DECISION]`

Explicit **`APPROVE DEPLOY`** when WS-CONFIG-DEFAULT (+ init callables) implementation is ready — not for interim 11-only bundle.
