# Plan: Interactive Upscale DPI rehydration + `<250` initiation eligibility

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase **blocking corrective** under `firestore-rules-print-request-item-resize-expression-budget` |
| Related | Formal Review `docs/workflow/reviews/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-review.md`; TD-033 |
| Tech debt | **TD-033** (amended: Portal + Studio; catalog + upload; eligibility) |
| Preferred slug | `interactive-upscale-dpi-rehydration-and-eligibility` |

---

## Goal

Restore correct effective-DPI display for Interactive Upscale **after remount/reload/navigate-away** in **Portal and Studio**, for **catalog and customer-upload** Print Request items, using true enhanced pixel dimensions (not toggle cosmetics). Align OFF→ON **new** upscale initiation with the existing unused constant / owner contract: **baseline effective DPI `< 250` only**. Do **not** change the 200 DPI save floor or 300 DPI optimal target. Do **not** Signoff/commit the Rules goal until this corrective is implemented and owner-approved.

## Background

Parent goal `firestore-rules-print-request-item-resize-expression-budget`:

- Rules implemented; focused **22/22**; full **169/169**; DEV `firestore:rules` deployed
- Owner Rules smoke: resize + Upscale ON persist + no permission error **PASS**
- Final Signoff / commit / push **blocked** by this corrective

Owner evidence:

1. Portal Library: after upscale shows ~300 DPI; after navigate/upload-other/return, Upscale stays ON but badge shows ~225 / ~213; Studio may show ~300 for same item when Studio hydration is fresh
2. Studio uploaded item: already ON, wrong DPI after return/load; **OFF→ON immediately corrects DPI**
3. Portal allows initiating Upscale above 250 DPI (code offers generation below ~**285** DPI today)

TD-033 originally Portal-only; this plan **amends** it to cross-app.

---

## Reproduction (owner + source-backed)

| Case | Result |
|------|--------|
| Library add → enlarge → Upscale ON → immediate badge | Correct (~300+) — local `enhanceResultPixels` |
| Navigate away / upload other / return to item | Upscale ON; badge falls to baseline DPI |
| Studio upload already enhanced → load wrong DPI → OFF→ON | Corrects via callable `widthPx`/`heightPx` → `setEnhanceResultPixels` |
| Full browser reload | Expected fail while Portal `catalogDesignByIdCache` (5 min TTL) or parent summaries lack enhanced dims; **implementation Test phase must confirm** |
| Multi-item A then B | Expected: each card local state independent; **stale shared design cache** can affect all Library items using same design id; **implementation must prove matrix** |

Static audit did not re-run live Portal/Studio in this planning session; owner reproduction is authoritative for symptoms. Root cause is proven from source.

---

## Source audit (exact paths)

### UI (DPI badge + Upscale toggle)

| App | Component |
|-----|-----------|
| Portal | `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` |
| Studio | `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx` |

Both:

- `assessPrintRequestItemSize({ pixelWidth, pixelHeight, printWidth/Height… })` for badge
- `resolveActiveArtworkPixelDimensions({ artworkEnhanceMode, baseline*, enhanced* })` for pixels
- `enhanced*` ← `design?.interactiveEnhancedWidthPx/HeightPx ?? upload?.… ?? enhanceResultPixels`
- Local `enhanceResultPixels` set only after successful callable; cleared on OFF; **lost on remount**
- `resolveInteractiveUpscaleToggleEligibility` for toggle enablement

### Parent patch after enhance (mode only — missing pixel hydrate)

| App | Handler |
|-----|---------|
| Portal | `usePrintRequestDetail.patchArtworkEnhanceMode` — maps **only** `artworkEnhanceMode` |
| Studio | `PrintRequestsPage.handleArtworkEnhanceModeChanged` — `replaceRequestItem` with **only** mode |

Neither updates design/upload summary maps with `result.widthPx` / `result.heightPx`.

### Hydration sources

| Source | Mapper / loader |
|--------|-----------------|
| Catalog design (Portal) | `catalogService.mapCatalogDesign` + `getReadyDesignsByIds` → **`catalogDesignByIdCache` TTL 5 min** (`catalogDesignByIdCache.ts`); `invalidateReadyDesignById` exists but **not called after enhance** |
| Catalog design (Studio) | `designService` maps `interactiveEnhancedWidthPx/HeightPx`; page must re-fetch / refresh prop after enhance |
| Customer upload (Portal) | `customerUploadService` maps enhance fields; `getUploadSummariesForItems` |
| Customer upload (Studio) | `customerUploadReadService` maps enhance fields; `usePrintRequestDetails` upload map |

### Shared DPI / eligibility

| Path | Role |
|------|------|
| `packages/shared/src/utils/interactiveArtworkEnhance.ts` | Active pixels; toggle eligibility; generation offer |
| `packages/shared/src/utils/printRequestItemSizing.ts` | `assessPrintRequestItemSize` |
| `packages/shared/src/constants/printSize.constants.ts` | `INTERACTIVE_UPSCALE_OFFER_MIN_DPI = 250` (**defined, unused**); `TARGET_PRINT_DPI = 300`; save floor 200 |

### Persistence (authoritative — already written by Functions)

On first enhance, `functions/src/lib/setPrintRequestItemArtworkEnhanceModeCore.ts` writes to **design** or **customerUploads**:

- `interactiveEnhancedWidthPx` / `interactiveEnhancedHeightPx`
- path + `interactiveEnhanceGeneratedAt`

Print Request **item** stores `artworkEnhanceMode` (+ preEnhance inches), **not** pixel dims.

Callable response always returns `widthPx` / `heightPx` for active mode (including reuse OFF→ON).

### Supported Interactive Upscale sources

1. `catalog_design` / Design Library  
2. `customer_upload` / request artwork  

Donation intake / Assisted Creation are **not** separate Print Request upscale sources unless attached as `customer_upload` items.

---

## Root-cause analysis

### DPI rehydration (R1–R18, S1–S12)

**Immediate after upscale:** card uses local `enhanceResultPixels` from callable → correct enhanced ÷ print size DPI.

**After remount / navigate-back:** `enhanceResultPixels` is gone. Card relies on `design`/`upload` props. Parents never merged callable pixels into those props. Portal often serves **stale** designs from `catalogDesignByIdCache` (cached when item was first added, before enhance fields existed). Result: `resolveActiveArtworkPixelDimensions` falls back to **baseline** `width`/`height` while `artworkEnhanceMode === "enhanced"` → original/pre-enhance DPI (~213–225).

**Why OFF→ON fixes Studio/Portal:** `switchToEnhancedReuse` / generate returns active `widthPx`/`heightPx`; card `setEnhanceResultPixels` again — still does not fix parent cache, so leaving again can regress.

**Why Studio can look correct for some catalog cases:** fresh `getDesignById` after reload may include enhance fields; Portal cache makes Library failures more visible. Upload path fails in Studio when upload summary map is stale the same way.

**Most-recent-item feel:** newest upscale has local pixels until remount; older cards already remounted without enhanced props; adding another item remounts/re-renders siblings and clears local state.

**Not Rules-caused:** Rules only protect item fields; persistence of enhance metadata is Functions → design/upload. Owner confirmed Upscale ON persists.

### Eligibility (U1–U6)

Current generation offer:

```ts
effectiveDpi < TARGET_PRINT_DPI * (1 - NEAR_TARGET_TOLERANCE_RATIO)
// i.e. < 300 * 0.95 = 285
```

Constant `INTERACTIVE_UPSCALE_OFFER_MIN_DPI` (= 250) exists but is **never referenced**. Tests explicitly encode “not at 250-only gate.”

Owner / intended contract:

| Baseline effective DPI | OFF→ON new upscale |
|------------------------|--------------------|
| `< 250` | allowed (if capacity / target allow) |
| `≥ 250` | not allowed |
| Exact 249.x | allowed |
| Exact 250 | denied |

Existing ON (`artworkEnhanceMode === "enhanced"`) or derivative present: keep selection toggle semantics — **do not force OFF** when enhanced DPI ≥ 250. Source already enables toggle when `mode === "enhanced"` even if baseline is “sufficient.”

Save policy unchanged: `<200` block save; `200–299` warning; `≥300` optimal.

---

## Chosen fix strategy

1. **Canonical DPI path (both apps):**  
   `persisted design/upload interactiveEnhanced* + item.artworkEnhanceMode` → `resolveActiveArtworkPixelDimensions` → `assessPrintRequestItemSize`.  
   Local `enhanceResultPixels` may remain as optimistic bridge **only until** parent summaries are patched.

2. **After successful enhance callable (both apps):**  
   - Patch item mode (existing)  
   - **Patch design or upload summary** with `result.widthPx` / `result.heightPx` (and marker if available)  
   - Portal: `catalogService.invalidateReadyDesignById(designId)` before/after refresh  
   - Prefer re-fetch design/upload when cheap; otherwise merge response pixels into map

3. **Shared eligibility:** Change `isInteractiveUpscaleGenerationOfferedAtPrintSize` to  
   `effectiveDpi < INTERACTIVE_UPSCALE_OFFER_MIN_DPI` (250).  
   Align generation target gate in `resolveInteractiveEnhanceTargetPixels` so Functions cannot generate when baseline DPI ≥ 250. Update shared tests that assert ~285 behavior.

4. **Do not:** hardcode 300; derive DPI from toggle alone; call OFF→ON on mount; change Rules; change 200/300 policies.

---

## Scope

### In scope

- Shared interactive upscale offer threshold → `< 250`
- Portal + Studio Print Request item enhance success hydration (summaries + Portal design cache invalidate)
- Focused unit/component tests for DPI active pixels + eligibility boundaries + remount/hydration
- TD-033 status update; block Rules Signoff until owner accepts this corrective

### Out of scope

- Firestore Rules changes  
- Schema migration / new fields  
- Production deploy  
- Signoff/commit of Rules goal in this Plan phase  
- Unrelated sizing UI polish (TD-021, etc.)

---

## Affected files (expected)

| File | Change |
|------|--------|
| `packages/shared/src/utils/interactiveArtworkEnhance.ts` | Offer threshold `< INTERACTIVE_UPSCALE_OFFER_MIN_DPI` |
| `packages/shared/src/utils/interactiveArtworkEnhance.test.ts` | Rewrite offer/eligibility cases for 249/250/251/299/300 |
| `apps/portal/.../PortalPrintRequestItemCard.tsx` | Ensure active pixels prefer hydrated enhanced dims; optional clear local after parent patch |
| `apps/portal/.../usePrintRequestDetail.ts` | Patch design/upload summaries on enhance; invalidate catalog cache |
| `apps/portal/.../PrintRequestDetailView.tsx` | Wire richer `onArtworkEnhanceModeChanged` if needed |
| `apps/studio/.../PrintRequestItemCard.tsx` | Same pixel hydrate discipline; clear local when upload/design enhanced dims arrive |
| `apps/studio/.../PrintRequestsPage.tsx` | Patch design/upload maps + item mode from callable result |
| `apps/studio/.../usePrintRequestDetails.ts` | Refresh or merge upload/design after enhance if owned there |
| Focused tests adjacent to above | T1–T16 matrix as unit tests where feasible |

Functions: **only if** Formal Review requires server-side offer gate via shared helper already imported — prefer shared helper change so Functions pick it up through existing `resolveInteractiveEnhanceTargetPixels` usage. No new Functions deploy inventory beyond that if shared package is bundled into functions build.

---

## Architecture / security / data / backend / UI

- **Architecture:** Fix at shared eligibility + client hydration of already-persisted asset metadata; no new persistence.  
- **Security:** No permission broadening; enhance remains callable-gated.  
- **Data model:** No new fields.  
- **Backend:** Shared offer math may tighten Functions generation; no Storage/Rules/index/migration.  
- **UI:** Upscale toggle stays visible when disabled with existing helper text pattern (`sufficient_capacity_remains` / disabled toggle) — **do not invent new modal**.

---

## Test strategy

### Automated

| Check | Command / focus | Required |
|-------|-----------------|----------|
| Shared unit | `npx tsx --test packages/shared/src/utils/interactiveArtworkEnhance*.test.ts` (+ sizing if touched) | yes |
| Portal focused | card/hook hydration + eligibility tests | yes |
| Studio focused | card/page hydration tests | yes |
| Rules | no Rules change expected — do not require full `test:rules` unless Rules touched | no unless touched |
| Lint | touched TS | yes |

### Manual (after implement — owner)

Portal + Studio × catalog + upload × remount/navigate/reload × multi-item; OFF→ON eligibility at 249 vs 250; existing ON hydrate at ≥250; save floor still 200.

---

## Human checkpoints

- [x] Owner already authorized Plan+Review for this blocker  
- [ ] Owner DEV QA after implementation (Portal + Studio)  
- [ ] Rules goal Signoff only after this corrective accepted  
- [ ] Production not authorized  

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Cache invalidate incomplete | High | Invalidate + merge response pixels; tests for remount |
| Eligibility too strict for selection-only | Medium | Keep `mode === enhanced` / derivative selection path |
| Functions still generate 250–285 until shared gate deployed | Medium | Shared helper used by Functions; deploy Functions if needed |
| Scope creep into Rules | High | Forbidden |

## Rollback

Revert shared threshold + client hydrate patches; redeploy Portal/Studio (and Functions if deployed). Rules unchanged.

## Deployment inventory (later implement)

| Surface | Likely |
|---------|--------|
| Portal App Hosting (DEV) | YES after implement |
| Studio (DEV build/use) | YES |
| Shared (bundled) | YES |
| Functions | YES **if** shared offer gate ships in functions bundle |
| Firestore Rules | **NO** |
| Indexes / migration | **NO** |
| Production | **NO** |

## No product-behavior-change (except owner-authorized eligibility)

Sizing save floor and optimal badge bands unchanged. Initiation threshold corrected to match documented `INTERACTIVE_UPSCALE_OFFER_MIN_DPI` / owner decision.

## Open questions

- [x] None blocking Plan/Review. Live multi-item matrix confirmation deferred to Test phase after implement.

## Approval

- Review doc: `docs/workflow/reviews/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-review.md`
- Verdict: **approved**