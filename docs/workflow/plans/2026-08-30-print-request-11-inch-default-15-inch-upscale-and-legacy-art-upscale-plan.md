# Plan: Print Request 11″ Default + 15″ Upscale + Legacy Art Upscale

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Related | *(Formal Review pending)* |

---

## Goal

Change Fresh Prints production sizing so:

1. **New Print Request items default to 11″ width** (aspect-locked height) when quality policy allows — optimizing two-up gang-sheet packing on the standard 23″ roll.
2. **New import/upload processing targets ~15″ production width** at 300 DPI (forward-only for newly processed art), within existing safe upscale limits.
3. **Authorized staff can trigger on-demand upscale** from Print Request workflows for legacy lower-resolution catalog/upload assets without manual re-import.

Preserve ADR-FP-075 / ADR-FP-080 quality floors (200 DPI save minimum, 22″ cap, aspect lock). **No Smart Profiling work. No production deploy in this goal.**

---

## Background

Owner product direction (informal planning, 2026-08-29/30):

- Gang sheet geometry: 23″ width, 0.25″ side margins, 0.5″ gutter → **two 11″ prints fit exactly** (0.25 + 11 + 0.5 + 11 + 0.25 = 23″). **12″ two-up does not fit.**
- 15″ upscale target aligns with existing **15″ approved-max width envelope** (`MAX_APPROVED_PRINT_WIDTH_INCHES`) while leaving headroom above the 11″ request default.
- Legacy catalog art normalized under 12″ import policy needs a staff path to enhance resolution when printing larger.

**Roadmap sequencing (owner):** This goal runs **before** remaining Smart Profiling / tag-retirement completion.

---

## Current Implementation (repo-verified)

### Print Request default width

| Constant / API | Current value | Path |
|----------------|---------------|------|
| `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` | **10** | `packages/shared/src/utils/printRequestItemSizing.ts` |
| `PREFERRED_PRINT_WIDTH_INCHES` / `DEFAULT_PRINT_REQUEST_WIDTH_INCHES` | **10** | `packages/shared/src/constants/printSize.constants.ts` |
| Initial size resolver | `resolveInitialPrintRequestItemSize()` | `packages/shared/src/utils/printRequestItemSizing.ts` |

**Selection logic today:**

```ts
const sourceWidth = design.printWidthInches ?? pixelWidth / TARGET_PRINT_DPI;
const printWidthInches = Math.min(
  sourceWidth,
  STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES, // 10
  MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES,        // 22
  maxWidthForStandardHeight,
  maxWidthForMinDpi,
  approvedMaxWidth,
);
```

**Bug/behavior gap:** Changing only the constant to 11 does **not** move typical ~10″ normalized catalog art (3000px @ 300 DPI) to 11″ because `sourceWidth === 10` wins `Math.min`. Plan must adjust baseline logic (see Approach).

**Call sites (non-exhaustive):**

- Portal: `useAddDesignToRequestFlow.ts`, `portalPrintRequestService.ts`
- Studio: `printRequestService.ts` (`resolveDefaultRequestedSize`)
- Functions: `addPortalCatalogDesignToPrintRequest.ts`, `confirmCustomerUploadsAndAttachToRequest.ts`, `customerAddAssistedApprovedProofToPrintRequest.ts`

### Upscale / quality policy

| Constant | Current | Path |
|----------|---------|------|
| `AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES` | **12** | `packages/shared/src/constants/printSize.constants.ts` |
| `MAX_APPROVED_PRINT_WIDTH_INCHES` | **15** | same |
| `MAX_APPROVED_PRINT_HEIGHT_INCHES` | **16.5** | same |
| `MAX_UPSCALE_FACTOR` | **6** | same |
| `MAX_UPSCALE_PASSES` (import) | **1** | same |
| `TARGET_PRINT_DPI` | **300** | same |
| Policy version | `image-quality-v2` | `IMAGE_QUALITY_SIZING_POLICY_VERSION` |

**Import upscale:** `resolveControlledUpscale()` → `apps/studio/electron/services/import/upscaleImportImage.ts`; customer uploads: `functions/src/lib/customerUploadProcessing.ts` (`upscaleIfNeeded`).

**Export upscale (ephemeral):** `apps/studio/electron/services/export/downloadAndResizeExportImage.ts` upscales in memory at export time without mutating Storage originals.

### Gang sheet constants (verified)

| Constant | Value | Path |
|----------|-------|------|
| `DEFAULT_GANG_SHEET_WIDTH_INCHES` | **23** | `apps/studio/.../showQueueSettingsService.ts` |
| `DEFAULT_GANG_SHEET_SIDE_MARGIN_INCHES` | **0.25** | same |
| `DEFAULT_GANG_SHEET_GUTTER_INCHES` | **0.5** | same |
| `DEFAULT_GANG_SHEET_TOP_BOTTOM_MARGIN_INCHES` | **0.5** | same |
| Nesting usable width | `sheetWidthPx - 2 * sideMarginPx` | `packages/shared/src/utils/gangSheetNesting.ts` |

**Two-up math:** usable width = 23 − 0.5 = **22.5″**; two 11″ + gutter = 11 + 0.5 + 11 = **22.5″** ✓

### Standard Size presets

Adult Full Front **M = 11″** (`packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.ts`). Presets remain user-selected overrides; default width is separate.

### Legacy art limitation today

- Stored production pixels in `/originals/{designId}.png` and upload production paths are **post-import** (already upscaled once per ADR-FP-080).
- ADR-FP-080: **no migration** for historical assets unless separately approved; approved max derived lazily from pixels when fields missing.
- No existing “upscale design from Print Request” callable.

---

## Scope

### In Scope

1. Raise `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` to **11** and fix initialization so eligible art defaults to 11″ (not stuck at 10″ from source width).
2. Raise `AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES` to **15** for **forward-only** new import/upload processing.
3. Studio staff-only **Enhance resolution** action on Print Request item cards (catalog + customer upload sources).
4. Shared eligibility math, provenance fields, Cloud Function + derivative regen path.
5. Unit tests: init sizing, 15″ upscale policy, gang-sheet two-up 11″ / fail 12″, legacy upscale idempotency.
6. ADR amendment for manual second upscale pass (staff-triggered).
7. DEV QA checklist; **no production deploy**.

### Out of Scope

- Smart Profiling / autonomous approval / tag retirement
- Bulk catalog backfill / mass re-upscale job
- Gang-sheet algorithm redesign
- Changing 200 DPI floor or 22″ cap
- Portal customer-triggered upscale (V1 recommendation: **Studio staff only** — see Product Decisions)
- Production promotion
- Changing Standard Size preset tables wholesale

---

## Product Decisions (Plan recommendations)

### A vs B vs C — upscale data ownership

| Model | Recommendation |
|-------|----------------|
| **A. Upscale canonical design/upload asset** | **Recommended for V1** — reuses export/gang-sheet/DPI paths; matches “enhance artwork” intent |
| B. Request-item-only enhanced derivative | Defer — requires export path fork + cleanup lifecycle |
| C. Existing pipeline only | Insufficient for legacy art already at 12″ target |

**V1 rules:**

- **Customer upload items:** enhance `customerUploads` production asset + Storage; scoped to that upload.
- **Catalog design items:** enhance `designs` + `/originals/{id}.png` with **explicit confirmation modal** (“Updates catalog for all future uses”).
- Never delete original bytes without separate approval; persist pre-enhance dimensions in provenance fields.
- If already at/above target pixels for policy, **no-op** with clear UI message.

### Studio vs Portal trigger

**Recommend V1: Studio staff only** (`importDesigns` / print-request staff permissions). Rationale: cost, abuse, catalog-wide impact, sharp processing on trusted backend.

`[NEEDS OWNER DECISION]` — confirm Studio-only V1 vs Portal staff-assisted vs customer self-serve.

### Automatic upscale at init?

**No.** Default width change only; enhancement remains **explicit user-triggered** for legacy art.

---

## Approach

### Phase 1 — Shared constants + initialization (11″ default)

1. Set `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES = 11`.
2. Replace naive `Math.min(sourceWidth, cap, …)` baseline with:
   - If `sourceWidth <= STANDARD_PRINT_WIDTH_INCHES` (8″ small-format threshold): keep `sourceWidth`.
   - Else: baseline = `11`, then apply existing quality mins (approved max, 200 DPI floor width, 22″ height cap).
3. Optionally align `PREFERRED_PRINT_WIDTH_INCHES` messaging only if needed for import copy — **do not** conflate with upscale target.
4. Update `printRequestOversizedSelection.test.ts` and related contract tests.

### Phase 2 — Forward-only 15″ import/upload target

1. Set `AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES = 15`.
2. Update `imageQualitySizingPolicy.test.ts`, `upscaleImportImage.test.ts`, import/upload processing tests.
3. Document ADR-FP-080 amendment: automated target 12″ → 15″; request default 11″; manual second pass allowed (Phase 3).
4. **No retroactive mutation** of existing Storage originals.

### Phase 3 — Staff legacy upscale from Print Request

1. **Shared service** `resolveManualEnhanceTargetPx(currentPx, targetWidthInches?)` — target = min(15″ policy, requested width @ 300 DPI if higher benefit), capped by `MAX_UPSCALE_FACTOR` from **current** production pixels.
2. **Callable** `enhancePrintRequestArtwork` (name TBD):
   - Input: `printRequestItemId` or (`printRequestId`, `itemId`)
   - Auth: staff with print-request + design/upload read; catalog enhance requires elevated permission (e.g. `importDesigns` or owner)
   - Load source from Storage; run sharp resize (reuse `customerUploadProcessing` patterns)
   - Write production asset; update `width`/`height`, `approvedMax*`, `wasUpscaled`, `upscaleFactor`, `upscalePassCount`, new `manualEnhanceAt` / `manualEnhanceBy` / `preEnhanceWidthPx` fields (exact names in data model section)
   - Regenerate derivatives (design or upload pipeline)
   - Idempotent: if pixels already satisfy target, return `already_sufficient`
3. **Studio UI** on `PrintRequestItemCard.tsx`:
   - Button: “Enhance resolution” when effective DPI at current size < 300 OR below owner threshold
   - Progress / error toast; refresh item hydration
4. **No Portal UI in V1** unless owner overrides.

### Phase 4 — Tests + manual QA

See Test Strategy.

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|-------|
| Shared sizing | `packages/shared/src/utils/printRequestItemSizing.ts`, `printSize.constants.ts`, `imageQualitySizingPolicy.ts`, `printSizeMath.ts` |
| Tests | `printRequestOversizedSelection.test.ts`, `imageQualitySizingPolicy.test.ts`, `gangSheetNesting.test.ts` (new two-up cases) |
| Studio import | `upscaleImportImage.ts`, `pngValidator.ts` |
| Functions | `customerUploadProcessing.ts`, new `enhancePrintRequestArtwork.ts` |
| Studio PR UI | `PrintRequestItemCard.tsx`, `printRequestService.ts` |
| Portal PR | `PortalPrintRequestItemCard.tsx` (read-only DPI messaging only in V1) |
| Docs | `DATA_MODEL.md`, `DECISIONS.md`, handoff sizing notes |

### Architecture Impact

- New callable for trusted image enhancement; UI → service → callable → Storage/Firestore
- No client-side sharp; no direct Storage writes from Portal for enhance

### Security Impact

- Staff-only callable; server validates item ownership/show access
- Rate limit / idempotency key per item+target to prevent duplicate expensive jobs
- Catalog-wide enhance requires confirmation + permission gate

### Data Model Impact

**New optional fields (designs + customerUploads)** — exact names at implement; plan proposes:

| Field | Purpose |
|-------|---------|
| `manualEnhanceAt` | Timestamp of staff-triggered enhance |
| `manualEnhanceBy` | Staff uid |
| `preEnhanceWidthPx` / `preEnhanceHeightPx` | Provenance before manual pass |
| `manualEnhanceFactor` | Applied scale factor |
| `upscalePassCount` | Extend semantics: import pass + optional manual pass (max 2 total?) — **needs ADR lock** |

`[NEEDS OWNER DECISION]` — allow `upscalePassCount: 2` for manual enhance vs separate `manualEnhancePassCount`.

### Backend Impact

- New Cloud Function callable
- Possible Storage rules unchanged (staff write paths exist)
- Derivative regen triggers (existing design derivative / upload preview pipeline)

### UI / UX Impact

- Studio Print Request item card: Enhance button + states
- Catalog enhance: confirmation modal

### Migration Impact

- **Forward-only** for 15″ import target
- **No bulk backfill** in V1
- Existing items keep stored pixels until staff enhances

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared sizing tests | `npx tsx --test packages/shared/src/utils/printRequestItemSizing.test.ts packages/shared/src/utils/printRequestOversizedSelection.test.ts` | yes |
| Image quality policy | `npx tsx --test packages/shared/src/utils/imageQualitySizingPolicy.test.ts` | yes |
| Gang sheet two-up | `npx tsx --test packages/shared/src/utils/gangSheetNesting.test.ts` (+ new cases) | yes |
| Import upscale | `npx tsx --test apps/studio/electron/services/import/upscaleImportImage.test.ts` | yes |
| Enhance callable unit tests | TBD in `functions/` | yes |

**New gang-sheet tests:**

- Two 11″-wide boxes at 300 DPI fit one row on 23″ sheet with default margins/gutter
- Two 12″-wide boxes cannot fit same row (second row or skip policy)

### Manual (DEV)

1. Add catalog design (post-deploy import) → default width **11″** on new PR item
2. Legacy ~10″/3600px design → defaults **11″** after init fix
3. Small-format 8″ design → stays **8″**
4. Standard Size preset M (11″) still applies cleanly
5. Staff Enhance on legacy design → pixels increase toward 15″ cap; DPI badge updates; original provenance preserved
6. Enhance idempotent second click → no-op message
7. Export gang sheet: two 11″ items side-by-side on one row (visual/staff QA)

---

## Human Checkpoints Anticipated

- [x] Owner product direction (informal — this plan formalizes)
- [ ] Formal Review approval before implement
- [ ] Owner decision: Studio-only vs Portal enhance
- [ ] Owner decision: `upscalePassCount` semantics for manual pass
- [ ] Manual DEV QA after implement
- [ ] Production deploy — **explicitly NOT in this goal**

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Over-upscaling soft art | Enforce 6× cap; extended-upscale staff warning >2× |
| Catalog enhance affects all customers | Confirmation modal + staff-only |
| 11″ default on low-DPI legacy art | 200 DPI floor still blocks save |
| Cost abuse on enhance callable | Staff auth + rate limit + idempotency |
| Rollback | Revert constants; forward-only import means new art only affected |

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Documentation | `DATA_MODEL.md`, `DECISIONS.md`, handoff |
| Development Tooling | Tests only |
| Starter Surface | No |
| Distribution | No |

---

## Acceptance Criteria (implementation)

### 11″ default

- [ ] New eligible PR item defaults to 11″ width; height aspect-locked
- [ ] Legacy ~10″ normalized art initializes to 11″ when DPI allows
- [ ] ≤8″ small-format art keeps actual width
- [ ] 200/300 DPI tiers unchanged; 22″ cap unchanged
- [ ] Standard Size presets still override when chosen

### 15″ upscale (forward-only)

- [ ] New imports/uploads target ~15″ @ 300 DPI within 6× policy
- [ ] Alpha/transparency preserved
- [ ] No unnecessary resample when already sufficient

### Legacy enhance (Studio V1)

- [ ] Staff can trigger enhance from PR item card
- [ ] Backend validates; idempotent; progress/error UI
- [ ] Physical width unchanged unless user edits
- [ ] Effective DPI recalculates from new pixels
- [ ] Provenance persisted; failure does not corrupt PR item

### Gang sheet

- [ ] Automated test: two 11″ fit; two 12″ do not two-up

---

## Open Questions

1. `[NEEDS OWNER DECISION]` Studio-only V1 vs Portal exposure for enhance
2. `[NEEDS OWNER DECISION]` `upscalePassCount` vs separate manual enhance counter
3. `[NEEDS OWNER DECISION]` Auto-offer enhance when user selects preset > optimal DPI?

---

## Related ADRs

- **ADR-FP-080** (amend: 15″ target, 11″ default, manual second pass)
- **ADR-FP-075** (unchanged: 200 DPI floor, 22″ cap)
- Roadmap sequencing note (not an ADR): sizing goal before Smart Profiling

---

## Next Step

**Formal Review** → STOP for owner approval before implementation.
