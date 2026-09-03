# Implementation Review: Interactive Upscale DPI rehydration + `<250` eligibility

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Implementation + Review Agent |
| Corrective | `interactive-upscale-dpi-rehydration-and-eligibility` |
| Plan | `docs/workflow/plans/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-review.md` (**approved**) |
| Parent goal | `firestore-rules-print-request-item-resize-expression-budget` (Signoff still blocked) |
| Tech debt | **TD-033** |
| Verdict | **approved_with_notes** |

---

## Verdict

**approved_with_notes**

Source-of-truth hydration and `<250` initiation eligibility are implemented per Formal Review. Focused shared/Portal/Studio tests pass; Portal typecheck pass; touched-file lint pass; Functions `tsc` build pass (shared gate bundled). Firestore Rules and schema untouched. Owner DEV deploy + runtime QA still required before parent Signoff.

**Notes:**

1. Eligibility uses the same **rounded** effective DPI as the badge (`Math.round(px/inches)`). Displayed 249 → allow; displayed 250 → deny. Raw 249.5 rounds to 250 and is denied.
2. H10 intermediate: Upscale ON without hydrated enhanced dims shows **DPI unavailable** (not baseline DPI).
3. Studio still calls `reloadReadyDesigns` after enhance (existing); immediate correctness now comes from local design/upload summary patches.

---

## IR checklist answers

| ID | Answer |
|----|--------|
| IR1 Shared files | `packages/shared/src/utils/interactiveArtworkEnhance.ts`; `.test.ts`; `resolveShowExportProductionAsset.ts` + `.test.ts`; `printRequestItemArtworkEnhanceFields.test.ts` (null-safe asserts) |
| IR2 Portal files | `PortalPrintRequestItemCard.tsx`; `usePrintRequestDetail.ts`; `usePrintRequestDetail.interactiveUpscaleHydration.test.ts` (new); `portalPrintRequestService.ts` (null active pixels); `catalogService.ts` (`DesignDocumentData` enhance fields for typecheck) |
| IR3 Studio files | `PrintRequestItemCard.tsx`; `PrintRequestsPage.tsx`; `usePrintRequestDetails.ts`; `useReadyDesignsForSelection.ts`; `printRequestService.ts` (null active pixels); `usePrintRequestDetails.interactiveUpscaleHydration.test.ts` (new) |
| IR4 Functions files | **None** (source). Behavior change via shared `resolveInteractiveEnhanceTargetPixels` / offer gate already imported by `setPrintRequestItemArtworkEnhanceModeCore.ts`. Local `functions` `npm run build` **PASS**. |
| IR5 Firestore Rules | **NO** |
| IR6 Schema | **NO** |
| IR7 Old hydration | Callable `widthPx`/`heightPx` → card-local `enhanceResultPixels` → `resolveActiveArtworkPixelDimensions`. Remount: mode from item; pixels from design/upload props (often baseline / stale cache) → wrong DPI. |
| IR8 New hydration | Callable result → patch item mode **and** design/upload summary enhanced dims (+ Portal invalidate design cache) → `resolveActiveArtworkPixelDimensions` → `assessPrintRequestItemSize`. Local pixels only optimistic bridge until parent patch. |
| IR9 Parent-summary patch | `mergeInteractiveEnhanceResultIntoAssetSummary`: on `enhanced`, set `interactiveEnhancedWidthPx/HeightPx` + ensure `interactiveEnhanceGeneratedAt`; on `baseline`, leave enhanced metadata intact. |
| IR10 Portal cache | `catalogService.invalidateReadyDesignById(designId)` on enhance success for that design only; summaries patched in-memory. |
| IR11 Studio parent-state | `patchDesignFromEnhanceResult` + `patchUploadSummaryFromEnhanceResult`; upload card props now include `interactiveEnhanced*`. |
| IR12 Canonical after reload | Persisted `interactiveEnhancedWidthPx/HeightPx` on design/upload docs, loaded by existing mappers. |
| IR13 Why OFF→ON repaired | Callable returned active pixels → `setEnhanceResultPixels` restored DPI without fixing parent summaries. |
| IR14 Why no longer needed | Parent summaries/cache receive enhanced dims on success; remount reads them. |
| IR15 Library hydration | Automated H1–H6/H9 PASS (shared + Portal tests). |
| IR16 Customer-upload hydration | Automated H7 + Studio upload prop/wiring PASS. |
| IR17 Multi-item | Automated H5/H6 independent patches PASS; live multi-item matrix → Owner QA. |
| IR18 Reload/remount | Automated: parent patch sufficient without local pixels. Live reload → Owner QA. |
| IR19 Eligibility predicate | `effectiveDpi < INTERACTIVE_UPSCALE_OFFER_MIN_DPI` (250), via `isInteractiveUpscaleGenerationOfferedAtPrintSize` / target helper. |
| IR20 249.x | **Eligible** when rounded DPI is 249 (e.g. 2490–2494 px @ 10″). |
| IR21 250 | **Not eligible** (exact / rounded 250). |
| IR22 >250 | **Not eligible** (251, 299, 300+). |
| IR23 Existing ON | Remains ON / selectable when enhanced DPI ≥250; no auto-OFF. |
| IR24 200 save floor | **YES** unchanged (tests E8). |
| IR25 300 optimal | **YES** unchanged (tests E9; target still `TARGET_PRINT_DPI`). |
| IR26 Shared tests | **PASS** (`interactiveArtworkEnhance` + related). |
| IR27 Portal tests | **PASS** (hydration suite). |
| IR28 Studio tests | **PASS** (hydration suite). |
| IR29 Functions | Source unchanged; **`cd functions && npm run build` PASS**. Deploy **not** done. |
| IR30 Lint/typecheck/build | Portal `typecheck` PASS; touched-file eslint PASS; Functions build PASS. Full Studio `tsc` has pre-existing unrelated errors. |
| IR31 Rules regression | `firestore.rules` **not modified** by this corrective. Prior record stands: focused 22/22; full 169/169. Full Rules rerun not required. |
| IR32 Security | No permission broadening; enhance remains callable-gated; fail-closed when enhanced mode lacks dims (export/size validation). |
| IR33 DEV deploy inventory | Portal **YES**; Studio **YES**; Functions **YES** (shared eligibility gate in functions bundle); Rules **NO**; Storage/indexes/migration **NO**. |
| IR34 Production | **NOT AUTHORIZED** |
| IR35 Rollback | Revert shared threshold + client hydrate patches; redeploy Portal/Studio/(Functions if deployed). Rules unchanged. |
| IR36 TD-033 | **Implemented pending owner DEV QA** (not closed until runtime PASS). |
| IR37 NEEDS OWNER DECISION | **None** for implement. Next: authorize DEV deploy + QA. |

---

## Owner DEV QA matrix (prepare — do not claim pass)

### PORTAL — LIBRARY
P1–P12 per owner prompt (add Library → resize to 249.x → Upscale → navigate/add/reload → DPI stable).

### PORTAL — CUSTOMER UPLOAD
Equivalent flow if supported on request.

### STUDIO — LIBRARY / CUSTOMER UPLOAD
S1–S5: already-upscaled upload shows correct DPI on load; navigate away/back; OFF→ON not required to repair.

### MULTI-ITEM
Two upscaled items; switch repeatedly; independent DPI/assets.

### THRESHOLD
249.x Upscale available; 250 and above not for **new** OFF→ON; existing ON stays ON at ≥250.

### SAVE POLICY
Still cannot save `<200`; warning 200–299; optimal ≥300.

---

## Acceptance gates

| Gate | Met? |
|------|------|
| Persisted enhanced dims are post-hydration DPI source | YES (code + tests) |
| Portal not stuck on stale baseline catalog dims after upscale | YES (invalidate + patch) |
| Studio not requiring OFF→ON to repair DPI | YES (upload props + patches) |
| Library + customer-upload covered | YES |
| Multi-item independence | YES automated; live TBD |
| Eligibility strictly `<250` (rounded) | YES |
| Existing ON valid at ≥250 | YES |
| 200/300 policies unchanged | YES |
| No cosmetic 300 override | YES |
| No schema/Rules change | YES |
| Focused tests / builds | YES |

---

## STOP

No DEV deploy. No parent Signoff. No commit/push. No production.

---

## DEV deploy addendum (2026-09-03)

| Item | Result |
|------|--------|
| Functions deploy required | **YES** — exactly `setPrintRequestItemArtworkEnhanceMode`, `enhancePrintRequestArtwork` |
| Command | `firebase deploy --only "functions:setPrintRequestItemArtworkEnhanceMode,functions:enhancePrintRequestArtwork" --project fresh-prints-dev` |
| Result | **success** |
| Revisions | `setprintrequestitemartworkenhancemode-00008-yob`, `enhanceprintrequestartwork-00003-xut` (100% traffic, ACTIVE, us-central1) |
| Portal | localhost `npm run dev:portal` → `fresh-prints-dev` (App Hosting **not** used on DEV) |
| Studio | localhost `npm run dev:studio` → `fresh-prints-dev` |
| Rules/Storage/indexes/prod | **not** touched |
| Owner QA checkpoint | `docs/workflow/reviews/2026-09-03-interactive-upscale-dpi-rehydration-and-eligibility-dev-qa-checkpoint.md` |
| TD-033 | **IMPLEMENTED ON DEV — OWNER QA PENDING** |
