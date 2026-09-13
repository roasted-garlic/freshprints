# Formal Review Amendment (Revised): Toggle Model + Owner QA

| Field | Value |
|-------|-------|
| Date | 2026-08-30 (revised — owner correction) |
| Parent review | `docs/workflow/reviews/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-review.md` |
| Plan amendment | `docs/workflow/plans/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-plan-amendment-portal-enhance.md` |
| Verdict | **approved_with_changes** (toggle architecture — implement after review; Portal 11″ redeploy separate checkpoint) |
| Production | **NOT AUTHORIZED** |

---

## Owner correction recorded

| Removed (not approved) | Replaced with |
|------------------------|---------------|
| 5/day success quota | **No customer usage quota** |
| 10/day attempt throttle as customer policy | Per-asset idempotency + in-flight lock only |
| Studio-only / catalog-only | **Studio + Portal**, `catalog_design` + `customer_upload` |
| Destructive canonical replace | **Non-destructive** baseline + one interactive derivative |
| One-way button + DPI&lt;300 discoverability | **Persisted per-item toggle** + size/capacity-driven states |

---

## WS-CONFIG-DEFAULT — Formal Review (18 challenges)

| # | Challenge | Finding |
|---|-----------|---------|
| 1 | Owner change 10.5 → 11.5 without code deploy? | **Yes** — persisted `settings/standardPrintSizes.defaultPrintRequestWidthInches`; Functions load at runtime |
| 2 | Next Studio item uses 11.5? | **Yes** — `resolveDefaultRequestedSize` passes current setting from `onSnapshot` |
| 3 | Next Portal item uses 11.5? | **Yes** — callable `loadStandardPrintSizesSettings()` at create; client batch path uses same doc snapshot |
| 4 | Existing items unchanged? | **Yes** — snapshot-at-create; persisted inches authoritative |
| 5 | Same Working request mixed widths? | **Yes** — per-item create time |
| 6 | Customer-upload new items covered? | **Yes** — `confirmCustomerUploadsAndAttachToRequest`, assisted proof attach |
| 7 | Explicit-size paths protected? | **Yes** — callable requested width; Standard Size preset; design `printWidthInches` source width logic |
| 8 | Duplicate preserves dimensions? | **Yes** — `duplicatePortalPrintRequestItem` copies `printWidthInches`/`printHeightInches` from source |
| 9 | 11″ fallback not second truth? | **Yes** — `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` only when setting absent/invalid |
| 10 | Portal server runtime read? | **Yes** — `loadStandardPrintSizesSettings()` per generic-init callable invocation |
| 11 | Cache invalidated on save? | **Yes** — Studio/Portal `onSnapshot` on same doc; Functions uncached read |
| 12 | No private Settings leak? | **Yes** — only adds one numeric field to doc Portal already reads for presets |
| 13 | Permission consistent? | **Yes** — `canManageStandardPrintSizes` / `updateStandardPrintSizesSettings` → **owner only** |
| 14 | No historical migration? | **Yes** — optional field; absent → 11″ fallback |
| 15 | 200 DPI floor authoritative? | **Yes** — setting is target input to `resolveInitialPrintRequestItemSize` clamps |
| 16 | 22″ cap authoritative? | **Yes** — unchanged |
| 17 | Standard Size independent? | **Yes** — preset table separate; explicit preset overrides default |
| 18 | Interactive upscale independent? | **Yes** — toggle affects pixel variant, not default-width setting |

**Verdict (WS-CONFIG-DEFAULT):** **approved_with_changes** — implement **before** WS-TOGGLE; extend `updateStandardPrintSizesSettings` parse + shared resolver.

### Configurable-default automated tests (30)

Plan tests 1–30 from owner brief — modules: `standardPrintSizesSettings.constants.test.ts`, `printRequestItemSizing.test.ts`, `addPortalCatalogDesignToPrintRequest.test.ts`, `portalCatalogAddInitialSizing.test.ts`, Studio `printRequestOversizedSelection.test.ts`.

### Configurable-default manual QA (owner Tests 1–5)

Documented in plan amendment WS-CONFIG-DEFAULT section.

---

## Formal Review answers (30) — WS-TOGGLE

### Asset provenance

| # | Question | Finding |
|---|----------|---------|
| 1 | Catalog native/original dimensions | **`nativeProductionWidthPx` / `nativeProductionHeightPx`** when set; else `resolveNativeProductionSourcePixels({ current: design.width/height, upscalePassCount, upscaleFactor })` |
| 2 | Upload native/original dimensions | **`sourceWidthPx` / `sourceHeightPx`** on `customerUploads` (raw source before processing); fallback to production if missing (legacy) |
| 3 | Baseline production — catalog | **`originalPath`** (`/originals/{id}.png`); pixels = **`design.width` / `design.height`** |
| 4 | Baseline production — upload | **`productionStoragePath`** (`.../production.png`); pixels = **`widthPx` / `heightPx`** |
| 5 | Current provenance fields | `wasUpscaled`, `upscaleFactor`, `upscalePassCount`, `sizingPolicyVersion`, `approvedMax*`, `preManualEnhanceWidthPx` (destructive manual only), `manualEnhanceAt/By`, `artworkEnhanceLockUntil/By` |
| 6 | Cumulative ≤6× derivation | `maxAllowedWidthPx = round(native.widthPx * MAX_UPSCALE_FACTOR)`; compare **baseline production** width (not enhanced) to max; use aspect-safe limiting dimension for effective DPI |
| 7 | Already at MAX | `baselineLimitingPx >= maxAllowedLimitingPx * (1 - NEAR_TARGET_TOLERANCE_RATIO)` — **not** `wasUpscaled` alone |
| 8 | Interactive derivative exists | **New field required:** `interactiveEnhanceGeneratedAt` (+ path fields). **Do not** infer from `upscalePassCount` alone. Current impl has no separate derivative marker. |
| 9 | Enhanced derivative Storage — catalog | **Proposed:** `interactiveEnhancedOriginalPath` → `/originals/{designId}.interactive.png` (repo convention; Formal Review verifies collision/ownership) |
| 10 | Design-level reuse across requests | **Yes** — one derivative per design; any request item toggling ON reuses; does not count as another upscale |
| 11 | Upload derivative scoping | Path under `/customer-uploads/{ownerUid}/{uploadId}/...`; Portal auth verifies upload ownership via request linkage; never exposed to other customers |
| 12 | Request-item toggle fields | **`artworkEnhanceMode`**: `'baseline' \| 'enhanced'`; **`preEnhancePrintWidthInches` / `preEnhancePrintHeightInches`** |
| 13 | Pre-toggle size restore | Capture width/height on **first successful ON**; restore on OFF (owner-preferred V1) |
| 14 | Legacy item default | Absent `artworkEnhanceMode` → **baseline OFF** |
| 15 | Firestore Rules | **Yes — likely** — toggle mode + pre-enhance fields should be **callable-only** (same pattern as sensitive item mutations) |
| 16 | Storage Rules | **Yes — likely** — new enhanced objects; **server write only**; clients read via signed URLs |
| 17 | Indexes | **No** new composite indexes anticipated |
| 18 | Migration | **None** — additive optional fields; lazy derivative creation |

### Callables / authorization

| # | Question | Finding |
|---|----------|---------|
| 16 | Toggle ON generation | **Amend** staff `enhancePrintRequestArtwork` → non-destructive + request-driven target; **new** Portal customer callable (e.g. `setPrintRequestItemArtworkEnhance`) |
| 17 | Toggle OFF persistence | Same callable with `mode: 'baseline'` or dedicated OFF handler — **server authoritative** (recommended single callable with enum) |
| 18 | Studio vs Portal auth | Studio: `assertStaffCaller` + PR access; Portal: `requirePortalCustomer` + request ownership + ADR-FP-071 editability |
| 19 | Export/gang-sheet resolver | Amend **`resolvePrintAssetPaths`** + **`useExportGangSheetPng`**, **`useExportShowZip`**, **`useGangSheetBuilder`** to honor `artworkEnhanceMode` |
| 20 | Preview/DPI paths | PR item UI must resolve **active variant pixels** for `assessPrintRequestItemSize`; preview URL from active Storage path |
| 21 | Concurrent catalog first ON | Per-asset `artworkEnhanceLockUntil` (existing pattern); second caller gets `in_progress` / waits; first success writes derivative; others reuse |
| 22 | Deduplication | Transactional check `interactiveEnhanceGeneratedAt` before processing; lock during generation |
| 23 | Failed attempt | Clear lock; **do not** set `interactiveEnhanceGeneratedAt`; toggle OFF |
| 24 | Interactive target from physical size | `idealPx = f(printWidthInches, printHeightInches, TARGET_PRINT_DPI)` aspect-safe; cap by native×6 |
| 25 | 300 DPI bounded by capacity | `targetPx = min(idealFor300Dpi, maxAllowedFromNative)` |
| 26 | Cannot reach 200 DPI at requested size | Enhancement does not bypass floor — item remains **blocked** at that size; toggle may generate max safe derivative but save assessment still fails until size reduced |
| 27 | 22″ cap | Unchanged — interactive target does not authorize &gt;22″ physical size |
| 28 | Standard Sizes | Preset sets inches; toggle selects variant; OFF restores pre-enhance inches |
| 29 | Generate when current size already ≥300 DPI? | **Only if** request-driven target &gt; baseline pixels and capacity remains; else State 4 (optional visible toggle + helper). **Do not** auto-run. |
| 30 | Discoverability before size increase | Show toggle in sizing/quality area; disabled/enabled with helper text; user enlarges size → State 2 activates |

---

## Revised product contract (summary)

```
Per asset lineage:
  native source
  → automated production (15" target, 1 pass)
  → optional ONE interactive enhanced derivative (request-driven target, cumulative ≤6× from native)

Per Print Request item:
  artworkEnhanceMode OFF → baseline asset + pre-enhance size (or current if never enhanced)
  artworkEnhanceMode ON  → enhanced derivative (generate once, reuse forever)

No customer image-count quota.
Studio + Portal + catalog_design + customer_upload.
```

---

## catalog_design behavior

- Baseline `/originals/{id}.png` **never overwritten** by interactive enhance
- Enhanced derivative stored at proposed sibling path; reusable across all requests/customers
- First successful generation consumes the asset's one interactive opportunity
- Subsequent ON = selection only

---

## customer_upload behavior

- Baseline `production.png` preserved
- Enhanced at private upload path; scoped to owning customer
- Native from `sourceWidthPx`/`sourceHeightPx`
- Automated finalize may have consumed partial 6× budget — remaining capacity still computed from native
- **No** catalog promotion; **no** Design creation

---

## Studio UX (recommendation)

- Toggle in Print Request item sizing/quality row (editable mode)
- Labels: **Upscale** with OFF/ON or switch control
- Processing state on first ON; disabled + “Maximum resolution reached” at State 3
- Helper: “Increase resolution for larger print sizes” at State 4
- **Not hidden** when current 11″ is ≥300 DPI if capacity remains

---

## Portal UX (recommendation)

- Same toggle semantics in Current Request item + review item (at least one full control surface)
- Customer copy: **Improve resolution** or **Upscale** (match Portal tone)
- Mobile-friendly switch; no staff terminology
- No quota / allowance messaging

---

## Security

- All paths, native dims, targets, capacity, derivative existence: **server-only**
- Portal customer may only request toggle ON/OFF for **owned** request items
- Failed attempts do not consume one-time slot
- No arbitrary Storage path from client

---

## Current implementation gap (FAIL 2 explained)

| Issue | Cause |
|-------|-------|
| Button not visible | `shouldOfferManualArtworkEnhanceAction` requires `effectiveDpi < 300` + fixed 15″ decision model |
| Wrong architecture | `enhancePrintRequestArtworkCore` overwrites baseline `originalPath` — incompatible with toggle OFF |
| Upload excluded | Explicit `customer_upload` rejection in callable |

**Studio corrective for old button:** superseded by toggle redesign — **do not** patch old eligibility alone.

---

## Portal 11″ deploy checkpoint (reconciled)

| Item | Status |
|------|--------|
| Root cause | Stale `addPortalCatalogDesignToPrintRequest` bundle (hardcoded 10″) |
| Interim hardcoded-11 deploy | **Not recommended (Option B)** — wait for WS-CONFIG-DEFAULT runtime setting |
| Deploy authorized? | **No** |
| When ready | Single deploy of init callables with `loadStandardPrintSizesSettings()` |

---

## Verdict

| Scope | Verdict |
|-------|---------|
| Quota model | **Rejected** |
| WS-CONFIG-DEFAULT | **approved_with_changes** — implement first |
| WS-TOGGLE | **approved_with_changes** — implement after WS-CONFIG-DEFAULT + review ack |
| Portal 11″ deploy | **Hold** — combine with WS-CONFIG-DEFAULT deploy; **STOP until `APPROVE DEPLOY`** |
| State 4 discoverability | **Owner decided YES** |
| Enhanced path naming | **Engineering convention** — `.interactive.png` if collision-safe |
| ADR-FP-080 update | **Required** at WS-TOGGLE implement |

---

## `[NEEDS OWNER DECISION]`

1. **`APPROVE DEPLOY`** when WS-CONFIG-DEFAULT implementation is ready (not interim 11-only bundle)

---

## Revised automated test plan

### WS-CONFIG-DEFAULT (30 tests — owner list)

Tests 1–30 in plan amendment.

### WS-TOGGLE (60 tests — mapping)

| Section | Tests | Primary module |
|---------|-------|----------------|
| Eligibility 1–6 | native×6, at-max, post-automated capacity, reuse, failed attempt | `interactiveArtworkEnhance.test.ts` |
| Target 7–14 | 14″–22″, 300 DPI aim, 6× cap, 200 floor | same |
| Toggle 15–23 | lifecycle, restore size, reload | shared + Portal + Studio component tests |
| Catalog 24–27 | cross-request reuse | callable integration tests |
| Upload 28–34 | ownership, privacy | callable + rules tests |
| Studio 35–39 | visibility, DPI | component tests |
| Portal 40–47 | no quota, cart/review | `portalCatalogAddInitialSizing` + new toggle tests |
| Production 48–53 | ZIP, gang sheet, DPI match | `printAssetResolution.test.ts` + export tests |
| Policy 54–60 | 11″, 15″ auto, DPI, 22″, presets | existing suites — must not regress |

---

## Next step

1. Owner acknowledges revised Formal Review (WS-CONFIG-DEFAULT + WS-TOGGLE)
2. Implement **WS-CONFIG-DEFAULT** first
3. Owner **`APPROVE DEPLOY`** for init callables with runtime setting
4. Re-test Portal 11″ / configurable default (owner manual Tests 1–5)
5. Implement **WS-TOGGLE**
6. Re-run full owner DEV QA

**Do not sign off. Do not deploy without authorization. Do not implement until review acknowledged.**
