# Plan: Shared Print Request Sizing and Queue Integrity Fix

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `print-request-shared-sizing-and-queue-integrity` |
| Related | docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-review.md; Amendment 1: docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-plan.md |

---

> **Amendment 1 (owner-requested, same managed goal):** Show Queue Past + Printing auto-completion and manual Mark Complete. Plan + Formal Review: `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-plan.md` and `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-review.md`. Do not implement either scope until the owner approves the combined Plan/Review set.

---

## Goal

Fix standard Print Request sizing in **both Portal and Studio** so a customer or staff member can manually request any physical size that stays at or above **200 effective DPI** and under the existing **22″** absolute cap. Stop ADR-FP-080 `image-quality-v2` processing/default envelopes from acting as a second hard manual-size ceiling. Ensure the dimensions visible on the item card are the dimensions that persist, queue, display in Show Queue, and drive export/gang-sheet placement.

This is a corrective bug fix spanning Phase 6 (Print Requests), Phase 7 (Show Queue), and Phase 8 (Portal Print Request workflow). It is not a new product feature.

---

## Background

Checkout confirmed at plan time:

| Item | Value |
|------|-------|
| Checkout | `C:\coding\fresh-prints` |
| Branch | `development` |
| HEAD | `1b967fd610300904dcfe0a390ed9766d012f22ca` |
| Prior workflow | IDLE (PR #83 Portal goals CLOSED/LIVE) |

Owner reproduction (Portal card, catalog design “Judas Priest Painkiller”):

- Requested size: **14″ × 21.1″**
- Effective DPI badge: **~308 DPI** (optimal)
- UI error: `Maximum print size for this artwork is 10.95" × 16.5". Larger sizes are disabled because they would require stretching the image beyond its approved quality limit.`
- Same incorrect ceiling exists in Studio
- After Add to Show, Studio Show Queue can show approximately **0.94″ × 1.00″** instead of 14″ × 21.1″

Binding product rule (already in ADR-FP-075; current code constants match the floor/cap, but not the approved-max mixing):

- Below 200 effective DPI → **block**
- 200–299 → **allow + warning**
- 300+ → **allow, no quality warning**
- Absolute standard cap → **22″** on either axis (`MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES`)

ADR-FP-080 (`image-quality-v2`) remains the processing/default-size policy. It must not hard-block manual Print Request sizing.

---

## Scope

### In Scope

- Portal and Studio Print Request item sizing (catalog + customer upload + duplicates)
- Shared effective-DPI / manual size validation
- Save / autosave / failed-save / dirty-state integrity
- Portal Add Request to Show eligibility and Studio attach/queue eligibility
- Persisted `printRequestItems` width/height
- `showAllocations` dimension snapshotting
- Studio Show Queue mapping/display
- Export ZIP, 300-DPI render, and gang-sheet physical placement dimension resolution
- Server-side queue defense-in-depth using the same shared validator
- Regression tests listed below
- Doc/ADR clarification of ADR-FP-075 vs ADR-FP-080

### Out of Scope

- Catalog design lifecycle, AI processing, categories/tags
- Customer-upload processing / import image-quality-v2 preparation (except not using its envelope as a manual ceiling)
- Show capacity, Portal cutoff, one-working-request, request naming
- Production timer, Whatnot integration unrelated to item sizing
- Original artwork mutation, checkout/payment, Phase 9 Custom Requests
- Production deploys, Firestore Rules, indexes, schema migrations, historical data repair
- Creating branches/worktrees (ADR-FP-137)

---

## Investigation Findings (required plan-phase return)

### 1–3. Checkout

- HEAD: `1b967fd610300904dcfe0a390ed9766d012f22ca`
- Checkout: `C:\coding\fresh-prints`
- Branch: `development`

### 4. Authoritative 200 DPI rule

| Layer | Source | Value |
|-------|--------|-------|
| Constant | `packages/shared/src/constants/printSize.constants.ts` `MIN_PRINT_REQUEST_EFFECTIVE_DPI` = `EFFECTIVE_DPI_BAD_MIN` | **200** |
| Quality tiers | `resolvePrintRequestItemDpiQualityLevel` in `printRequestItemSizing.ts` | `<200` below_minimum (block); `200–299` good (warn); `≥300` optimal |
| Formula | `calculateEffectiveDpi` in `printSizeMath.ts` | aspect-locked: `round(pixelWidth / printWidthInches)` |
| ADR | ADR-FP-075 | matches current constant |

Stale docs still say 72 DPI (`DATA_MODEL.md`, `WORKFLOWS.md`). Code and ADR-FP-075 are 200. This plan updates those durable docs.

### 5. Absolute physical Print Request size cap

| Item | Value |
|------|-------|
| Constant | `MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES = 22` |
| Defined in | `packages/shared/src/utils/printRequestItemSizing.ts` (not `printSize.constants.ts`) |
| Message | “Requested standard print sizes cannot exceed 22 inches. Use a Custom Request for this item.” |
| Consumers | `assessPrintRequestItemSize`; Portal `portalPrintRequestService.updatePrintRequestItem`; Studio `printRequestService.resolveRequestedItemSize` (via assess); initial-size clamp |

ADR-FP-080’s **15″ × 16.5″** envelope (`MAX_APPROVED_PRINT_WIDTH_INCHES` / `MAX_APPROVED_PRINT_HEIGHT_INCHES` in `printSize.constants.ts`) is a **processing/default** envelope, not the standard Print Request cap.

### 6–10. Root cause A/B — incorrect maximum size (Portal and Studio share it)

**Yes: Portal and Studio share the same root cause.**

Exact function producing `10.95″ × 16.5″`:

1. `calculateApprovedMaxPrintSize` in `packages/shared/src/utils/imageQualitySizingPolicy.ts`
   - `approvedMaxWidth = min(pixelWidth/300, 15, 16.5 / aspect)`
   - For a 14:21.1 portrait, height envelope **16.5″** forces width **10.95″**
2. `deriveApprovedMaxPrintSizeFromPixels` / `resolveApprovedMaxWidthInches` in `printRequestItemSizing.ts`
3. `assessPrintRequestItemSize` **hard-blocks** when `printWidthInches > approvedMaxWidth`
4. `formatApprovedMaxPrintSizeMessage` builds the exact owner-visible copy

Owner math reconstruction (308 DPI at 14″):

- `pixelWidth ≈ 14 × 308 = 4312`
- `pixelHeight ≈ 21.1 × 308 = 6499`
- `qualityWidth = 4312/300 ≈ 14.37`
- `maxWidthByHeight = 16.5 / (6499/4312) ≈ 10.95`
- `approvedMax = min(14.37, 15, 10.95) = 10.95 × 16.50`

That value is treated as a hard manual ceiling because `assessPrintRequestItemSize` runs **after** effective DPI is computed (so the badge can show 308) and then rejects `canSave` for the ADR-FP-080 envelope.

Inputs are **not disabled**. Portal and Studio size fields remain editable. Save is skipped (`canSave === false`). Copy saying “disabled” is false.

Same validator is used by:

| Surface | Path |
|---------|------|
| Portal card | `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` |
| Studio card | `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx` |
| Studio service | `printRequestService.resolveRequestedItemSize` |
| Stash attention | `packages/shared/src/utils/currentRequestAggregates.ts` |
| Initial defaults | `resolveInitialPrintRequestItemSize` (clamp, not the error message) |

Catalog vs upload:

- Portal catalog cards **omit** persisted `approvedMaxPrint*` and still hit the ceiling because `resolveApprovedMaxWidthInches` **derives it from production pixels**.
- Portal upload cards pass `upload.approvedMaxPrintWidthInches`.
- Studio cards pass upload **or** `design.approvedMaxPrintWidthInches`.
- Result: both source types hard-block; catalog does not need persisted policy fields.

### 11–12. Root cause C — 0.94″ × 1.00″ Show Queue result

**Separate defect from the 10.95″ × 16.5″ calculation, but triggered by it.**

The approved-max block is why **14″ × 21.1″ never becomes the persisted item size**. Queue/export then use a different source.

Proven source mechanisms:

1. **Draft vs persisted mismatch (primary).** Typed 14″ × 21.1″ updates React state immediately. `saveDraft` returns without writing when `!canSave`. Autosave status stays `idle` (not `failed`). Firestore keeps the **initial** requested size (typically `min(10″, 22″, 200-DPI width, approved-max)` ≈ **10″ × ~15.07″** for this aspect, **not** 14×21.1).
2. **Add to Show is not gated.** Portal `canQueueToShow = isEditable && items.length > 0 && unallocatedQuantity > 0`. Studio Add to Show only checks `requestItems.length === 0`. Neither checks dirty/invalid/pending/failed item size.
3. **Queue copies persisted item fields only.** `functions/src/queuePortalPrintRequestToShow.ts` copies `printWidthInches` / `printHeightInches` if they are numbers; otherwise `undefined`. No DPI check, no 22″ check, no “must be present” check. `withoutUndefinedFields` then **omits** missing dimensions from the allocation.
4. **Display/export fallbacks reconstruct tiny native-at-300 sizes.** When item/allocation inches are missing:
   - Cards: `item.printWidthInches ?? design.printWidthInches ?? upload.printWidthInches ?? 1`
   - Export ZIP / gang PNG: `allocation.printWidthInches ?? design/upload.printWidthInches ?? DEFAULT_EXPORT_WIDTH_INCHES` (**3″**)
   - Gang-sheet placement: allocation → upload → `DEFAULT_PLACED_WIDTH_INCHES` (**3″**)
   - `design.printWidthInches` is **import-normalized native size at assessment DPI** (`pixelWidth / 300` for normal assets), **not** the Print Request requested size.
5. **0.94″ × 1.00″ matches** `calculatePrintSizeAtTargetDpi(~282, 300, 300)` **or** width ≈ 0.94 with the card’s **`?? 1` height fallback**. It does **not** match the 10.95×16.5 approved-max function. Live Painkiller Firestore values were not inspected in this plan; source proves these fallbacks can produce sub-1″ results independent of the typed 14×21.1.

Conclusion: **two defects**. A/B is the shared ADR-FP-080 hard ceiling. C is save/queue integrity plus unsafe native-size / `?? 1` / default-3″ fallbacks. Fixing only the ceiling still leaves a race: type 14×21.1, click Add to Show before blur/save, queue stale inches.

### 13. Portal draft → persisted flow

```
CatalogDesign.width/height (production px)
  → addPortalCatalogDesignToPrintRequest / resolveInitialPrintRequestItemSize
  → printRequestItems.printWidthInches/Height (inches, typically ≤10″)
PortalPrintRequestItemCard local inputs (immediate)
  → assessPrintRequestItemSize (shared)
  → saveDraft only if canSave (300ms debounce on qty; size on blur)
  → portalPrintRequestService.updatePrintRequestItem
      (client Firestore item write for size; quantity via callable)
      NOTE: Portal service does NOT re-run assessPrintRequestItemSize
            (only positive inches + 22″ cap)
```

Customer upload: `confirmCustomerUploadsAndAttachToRequest` initializes via the same `resolveInitialPrintRequestItemSize` using `upload.widthPx/heightPx` and persisted approved-max fields. Card DPI uses `upload.widthPx/heightPx`.

### 14. Studio draft → persisted flow

Same shared assess on the card. Studio **service** re-runs `assessPrintRequestItemSize` in `resolveRequestedItemSize` and throws on `!canSave`. Stronger save guarantee than Portal, but the card still skips blur-save when `!canSave`, leaving visible size ≠ persisted size. Add to Show is not blocked on that mismatch.

### 15. Persisted item → show allocation

Portal: `queuePortalPrintRequestToShow` copies item inches into `showAllocations` (and `buildShowAllocationSourceFields` for source identity only — it does **not** carry size).

Studio: `upcomingShowService.allocatePrintRequestItem` same copy.

Neither recomputes size. Missing values are stripped, not defaulted at write time.

### 16. Show allocation → Studio Show Queue

Show Queue list groups allocations by request (`groupAllocationsByRequest`) and does not render per-item inches on the show row. Staff then open the Print Request. Read-only `PrintRequestItemCard` displays `formatPrintRequestItemSizeLabel` from `item.printWidthInches ?? design.printWidthInches ?? 1`. If the item has the initial 10″ size, Show Queue request detail shows ~10″, not 14×21.1. If inches are missing, the design-native / `?? 1` path can show ~0.94×1.00.

### 17. Show Queue → export / gang sheet

| Stage | Resolver | Fallback if allocation inches missing |
|-------|----------|----------------------------------------|
| ZIP export | `useExportShowZip.ts` | design/upload `printWidthInches` then **3″** |
| Gang PNG | `useExportGangSheetPng.ts` | same |
| Gang placement | `useGangSheetBuilder.ts` | upload inches then **3″**; height from pixel aspect |
| Filename | `showExportFilename.ts` | uses whatever inches the export resolver passed |

A correct allocation snapshot is currently passed through. The integrity hole is **missing/stale snapshot + native/default fallback**, not a later rescale of a correct 14×21.1 value.

### 18–20. Autosave race / failed-save / Add to Show bypass

| Question | Answer |
|----------|--------|
| Debounced autosave race? | **Yes.** Qty save is 300ms debounced. Size saves on blur. Add to Show does not await in-flight or pending saves. |
| Failed-save / local mismatch? | **Yes.** Invalid size never calls `onAutosaveStateChange('failed')`; local 14×21.1 remains; Firestore unchanged. True save exceptions do set `failed`, but CTA stays enabled. |
| Can Add to Show bypass pending/failed? | **Yes, today, in both apps.** |

### 21–22. Authoritative pixel sources

| Source type | Pixel fields | Must not use |
|-------------|--------------|--------------|
| `catalog_design` | `designs.width` / `designs.height` (production pixels after import processing) | thumbnail/preview pixel size; `design.printWidthInches` as pixels |
| `customer_upload` | `customerUploads.widthPx` / `heightPx` (production) | preview/thumbnail; `printWidthInches` as pixels |

Portal `resolveAspectPixels` has a **unit-confusion fallback**: if upload `widthPx` is missing, it uses `upload.printWidthInches` as “pixels”. That path is in scope to stop using inches as pixels.

### 23–24. Shared vs divergent implementations

**Shared (authoritative math):** `packages/shared/src/utils/printRequestItemSizing.ts` + `printSizeMath.ts`.

**Divergent:**

- Portal size save does not re-assess DPI/approved-max; Studio service does.
- Portal catalog card does not pass design `approvedMax*`; Studio does (both still derive it).
- Studio Add to Show / Portal queue CTA gating differ; neither is sufficient.
- Export fallbacks exist only in Studio production path.

### 25. Proposed smallest architecture-aligned fix

Keep one shared manual policy in `assessPrintRequestItemSize`:

1. Positive finite inches
2. Production pixels required
3. Effective DPI via existing `calculateEffectiveDpi`
4. **22″ cap** (unchanged)
5. **200 DPI floor / 200–299 warn / 300+ optimal** (unchanged)
6. **Remove the approved-max hard block and its error message from manual assessment**

Keep ADR-FP-080 approved-max **only** for:

- import/upload processing
- `resolveInitialPrintRequestItemSize` default clamp (`min(10″, approved max, 22″, 200-DPI width)`)

Do **not** create Portal- or Studio-specific policy constants.

**Save integrity (hybrid A+B, reuse existing autosave):**

- Extend item-card persistence reporting so the parent knows: clean / dirty-valid / dirty-invalid / saving / failed / optimistic.
- Disable Portal Add Request to Show and Studio Add to Show / staff gang-sheet attach while any item is dirty-invalid, saving, failed, or optimistic.
- If all remaining dirty items are **valid**, flush/await those saves before opening the queue/attach modal (do not silently revert visible size).
- Portal size writes must call the same `assessPrintRequestItemSize` as Studio (close the client-only hole).

**Server (callable-safe reuse):**

- `queuePortalPrintRequestToShow` must reject items missing positive inches, over 22″, or below 200 DPI using **the same** `assessPrintRequestItemSize`.
- Load catalog `width/height` and upload `widthPx/heightPx` for that check (uploads already loaded for filename). No second hardcoded DPI formula.
- Studio `allocatePrintRequestItem` must apply the same shared check before snapshotting.

**Downstream:**

- Show Queue / export / gang placement must use **allocation requested inches**, then **print request item requested inches**, and must **not** substitute `design.printWidthInches`, `?? 1`, or the 3″ export default for a queued production item. Fail closed with a staff-visible error if requested inches are missing.

No artwork mutation. No schema change. No Rules/index change. No historical allocation rewrite in this goal (flag existing bad queue rows for optional later repair).

### 26. Exact files to change

**Shared**

- `packages/shared/src/utils/printRequestItemSizing.ts`
- `packages/shared/src/utils/printRequestItemSizing.test.ts` *(new)*
- `packages/shared/src/utils/currentRequestAggregates.ts` (attention must follow new `canSave`)
- `packages/shared/src/utils/currentRequestAggregates.test.ts`

**Portal**

- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` and/or a small persistence-barrier helper next to existing autosave
- Focused Portal tests under `apps/portal/features/print-requests/`

**Studio**

- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts` (only if needed after shared assess change)
- `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useExportShowZip.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useExportGangSheetPng.ts`
- `apps/studio/src/renderer/src/features/gang-sheets/hooks/useGangSheetBuilder.ts`
- Existing Studio sizing tests + new persistence/export tests

**Functions**

- `functions/src/queuePortalPrintRequestToShow.ts`
- `functions/src/lib/queuePortalPrintRequestToShowValidation.ts` and/or a small shared-call helper + tests

**Docs**

- `docs/project/DECISIONS.md` (ADR-FP-075 amendment + ADR-FP-080 item 6 clarification)
- `docs/architecture/DATA_MODEL.md` (replace stale 72 DPI band; state approved-max is not a manual ceiling)
- `docs/WORKFLOWS.md` (same 72 → 200 correction)
- `.cursor/workflow/state.md` and `references/project-chatgpt-handoff/CURRENT-STATE.md` at phase transitions / signoff

**Do not change** `imageQualitySizingPolicy.ts` processing math except via comments if needed. Do not change `MAX_APPROVED_PRINT_*` constants.

### 27. Tests to add or modify

See Test Strategy below. Must update `currentRequestAggregates.test.ts` case “oversized vs approved max” (4″ at 1000px is 250 DPI and must **remain saveable** after this fix). Studio `printRequestItemSizingAndNaming.test.ts` / oversized-init tests stay valid for 22″ and 200 DPI; add Painkiller fixture.

### 28. ADR / doc clarification

Amend ADR-FP-080 decision item 6: approved max and 10″ default apply to **processing and initial requested size**, not to later manual sizing.

Amend ADR-FP-075: manual sizing is valid at ≥200 DPI and ≤22″; image-quality-v2 envelopes are not an additional save ceiling.

Fix stale 72 DPI wording in `DATA_MODEL.md` and `WORKFLOWS.md` to match ADR-FP-075 (already accepted 2026-07-12).

### 29–32. Artifacts and gates

| Item | Path / value |
|------|----------------|
| Plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-review.md` |
| Formal Review verdict | pending at plan write; Review Agent fills |
| Human checkpoint now | **Yes — owner approval to Implement** (explicit STOP after Plan → Review). No production, Rules, migration, or secret work in this phase. |

---

## Affected Areas

### Files / Modules (expected)

Listed in finding 26.

### Architecture Impact

- [x] Details: Policy stays in `packages/shared`. UI cards remain presentation + local draft. Services/callables persist and enforce. No component-level Firebase added. No new layers.

### Security Impact

- [x] Details: Stronger server validation of persisted size before queue. No auth/rules/secrets changes. Fail closed on missing production pixels or missing requested inches at queue/export.

### Data Model Impact

- [x] Details: **No schema change.** Same optional `printWidthInches` / `printHeightInches` on items and allocations. Behavior change: those fields must be present and policy-valid before queue. Docs currently understate the 200 DPI floor.

### Backend Impact

- [x] Details: `queuePortalPrintRequestToShow` gains shared size assessment (extra design reads for catalog lines). Studio allocate path same check. DEV Functions deploy is a **later** human checkpoint, not this plan/review step. No env vars.

### UI / UX Impact

- [x] Details: Manual sizes ≥200 DPI and ≤22″ save in both apps. Approved-max error copy goes away for those cases. 200–299 warning unchanged. Add to Show disabled with actionable copy while size is invalid, saving, or failed. Manual owner QA required.

### Migration Impact

- [x] None for schema.
- [x] Forward: new saves/queues use corrected policy. Already-queued wrong-size allocations are **not** auto-rewritten.
- [x] Rollback: revert the `development` commit(s). No Firestore migration to roll back.
- [x] Compatibility: older clients that still send 14×21.1 will succeed once Functions are deployed; older clients that still block locally remain a Portal/Studio deploy concern.

If Implement discovers a Rules, index, or production data-repair need: **STOP** and report before continuing.

---

## Approach

1. Split shared policy: `assessPrintRequestItemSize` = ADR-FP-075 + 22″ only; keep approved-max in `resolveInitialPrintRequestItemSize` only.
2. Add shared unit tests (DPI lattice, Painkiller 14×21.1 @ ~308, processing-envelope regression, 22″ cap, catalog vs upload pixel inputs).
3. Portal + Studio cards: report persistence health; stop treating invalid as silent no-op.
4. Gate Portal queue CTA and Studio Add to Show / attach on aggregated item persistence health; flush dirty-valid saves first.
5. Portal `updatePrintRequestItem` must assess via shared helper (Studio parity).
6. Queue callable + Studio allocate: require inches; run shared assess with production pixels; copy those inches onto allocations.
7. Export/gang resolvers: requested inches only; no native-design / `?? 1` / 3″ substitution for queued items.
8. Update attention aggregates tests; duplicate-item tests keep independent sizes.
9. Docs/ADR clarification. No production actions.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared sizing tests | `npx tsx --test packages/shared/src/utils/printRequestItemSizing.test.ts packages/shared/src/utils/currentRequestAggregates.test.ts` | yes |
| Studio sizing / persist tests | `npx tsx --test apps/studio/src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts apps/studio/src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts` + new persist/export tests | yes |
| Portal persist/queue tests | `npx tsx --test` on new/updated files under `apps/portal/features/print-requests/` | yes |
| Functions queue tests | `npx tsx --test functions/src/lib/queuePortalPrintRequestToShowValidation.test.ts` + new size-integrity tests | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes if Studio source changes |
| Functions build | `npm --prefix functions run build` | yes |
| Portal build | `npm run build:portal` | yes |
| Studio Vite build | `npx vite build` from `apps/studio/` | yes if Studio source changes |
| Lint | `npm run lint` and/or changed-file eslint | yes |
| Diff check | `git diff --check` | yes |
| E2E | none configured for this flow | no |
| Rules tests | none expected | no unless Implement finds a Rules need |

Required shared cases:

- 199.99 DPI block; 200 / 201 / 250 / 299 / 299.99 warn-allow; 300+ optimal
- Painkiller fixture: 4312×6499 px → 14 × 21.1 saveable, ~308 DPI, **no** 10.95×16.5 error
- Same pixels at a size the old envelope would cap, still ≥200 DPI → allow
- 22.1″ at 400 DPI → block on cap
- 199 DPI at 5″ → block on DPI
- Catalog and upload pixel sources
- Duplicate items keep independent inches
- Aspect lock width-only / height-only without cumulative drift
- Queue rejects missing/stale/below-200/over-22 inches
- Export/gang resolver refuses design-native fallback when allocation inches exist; refuses silent 0.94/1.00 substitution

### Manual

- [x] Details: owner QA checklist in this plan (Portal, Studio, warning, hard-block, absolute-cap). Automated tests cannot prove live Firestore round-trip or visual card copy.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — owner Portal + Studio QA after Test
- [x] Other: **owner approval to start Implement** (this STOP)
- [ ] Production deploy — later, separate
- [ ] DEV Functions deploy — later, only if Functions change
- [ ] DEV Portal / Studio QA builds — later
- [ ] Database migration — none expected
- [ ] Auth / secrets — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Removing approved-max allows sizes staff previously thought “quality-capped” | Medium | Owner-confirmed ADR-FP-075 rule; 200 DPI + 22″ remain; 200–299 still warns |
| Queue callable extra design reads | Low | Batch-get only items’ design ids; fail closed if pixels missing |
| Existing queued 0.94″ rows remain wrong | Medium | No silent prod repair this goal; document follow-up if owner wants a repair phase |
| Export fail-closed vs 3″ default | Medium | Prefer fail-closed for queued items; do not invent inches |
| Attention chrome currently flags approved-max as `dpi_below_minimum` | Low | Update aggregate tests so 200–299 over old envelope is not Stash-blocking |
| Portal service currently weaker than UI | High | Add shared assess on Portal size write |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the `development` commit(s) for this goal. Redeploy Portal/Studio/Functions only if those commits were deployed. No Firestore migration. Already-queued allocations keep whatever inches they have.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [x] ARCHITECTURE.md — only if a short cross-link is needed; prefer DATA_MODEL + ADRs
- [x] DATA_MODEL.md — 200 DPI floor; approved-max not a manual ceiling
- [ ] BACKEND.md — only if queue validation behavior is documented there (add a sentence if the callable section lists validations)
- [ ] TESTING.md — only if a reusable command contract changes
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — ADR-FP-075 / ADR-FP-080 clarification
- [x] Other: `docs/WORKFLOWS.md` stale 72 DPI band; workflow artifacts; `CURRENT-STATE.md` at signoff

---

## Open Questions

- [x] None blocking Implement after owner approval of this plan/review.
- Existing bad Show Queue rows: **out of scope** unless the owner later requests a repair goal.

---

## Owner QA checklist (after Implement + automated Test)

### Portal

1. Open the reproduction design.
2. Add it to Current Request.
3. Set width to 14″.
4. Confirm height ≈ 21.1″.
5. Confirm DPI ≈ 308.
6. Confirm no maximum-quality blocker.
7. Navigate away and return; confirm 14″ × 21.1″ persisted.
8. Add the request to a Whatnot show.
9. Open Studio Show Queue / request detail; confirm 14″ × 21.1″.
10. Verify export / gang-sheet uses 14″ × 21.1″.

Also: type a valid larger size and click Add to Show before save completes → must not queue stale inches. Force a failed save → Add to Show stays blocked.

### Studio

Same sizing/persist/attach/Show Queue/export checks for a staff Print Request.

### Warning / hard-block / cap

- ~250 DPI: save allowed, warning shown (both apps)
- Enlarge until <200 DPI: save blocked (both apps)
- Enough pixels to exceed 22″ while still ≥300 DPI: physical cap blocks (both apps)

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-review.md
- Verdict: **approved**
