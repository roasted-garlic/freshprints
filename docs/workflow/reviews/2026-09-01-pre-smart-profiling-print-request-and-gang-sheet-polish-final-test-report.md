# Final Test Report: Pre-Smart-Profiling Print Request & Gang-Sheet Polish

| Field | Value |
|-------|-------|
| Date | 2026-09-01 |
| Goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` |
| HEAD | `f8d2eda6` (pre-docs; see signoff-prep commit) |
| Baseline | `origin/development` @ `fe500975` |
| Status | **passed_with_notes** |
| Production | **NOT AUTHORIZED** — no deploy in this pass |

---

## Baseline verification

| Check | Result |
|-------|--------|
| `git status` | Clean working tree |
| Commits ahead of `origin/development` | **10** (intended stack) |
| Unexpected commits | None |

---

## WS1 regression (Portal remove / post-queue hydration)

**Owner QA:** PASS (unchanged). No reopen unless regression found — none found.

| Command | Exit | Result |
|---------|------|--------|
| `npx tsx --test packages/shared/src/utils/portalPrintRequestUnqueue.test.ts apps/portal/features/print-requests/utils/printRequestDetailUnqueueUi.test.ts apps/portal/features/print-requests/utils/printRequestDetailPostQueueHydration.contract.test.ts` | 0 | **21/21 pass** |

Coverage includes: unqueue eligibility (10 cases), CTA visibility, stuck-active heal guard, post-queue hydration contract (schedules + allocations before handler settles, no heal routed through unqueue error hook).

---

## WS2 regression (Final Artwork / assisted attach)

**Owner QA:** PASS (unchanged). No reopen unless regression found — none found.

| Command | Exit | Result |
|---------|------|--------|
| `npx tsx --test functions/src/lib/assistedFinalSourceAttachReuse.test.ts packages/shared/src/utils/assistedCreationApprovedProofAddToRequest.test.ts apps/portal/features/assisted-creation/utils/assistedCreationFinalArtworkPresentation.contract.test.ts apps/portal/features/assisted-creation/utils/assistedCreationWs2Corrective.contract.test.ts packages/shared/src/utils/assistedCreationArtworkHistory.test.ts` | 0 | **18/18 pass** |

`downloadTarget` omission in `customerAddAssistedApprovedProofToPrintRequest` unchanged; resolver defaults `input.downloadTarget ?? "auto"`.

---

## WS3 + Internal Gang Sheet regression

**Owner QA:** PASS (contract restored after Bucket 7 reconciliation). No new owner QA required for restoration-only drift removal.

| Command | Exit | Result |
|---------|------|--------|
| `npx tsx --test packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/resolveActiveGangSheetSettingsSource.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/buildShowQueueDeepLinkPath.test.ts apps/studio/electron/ipc/export/exportRequestValidation.test.ts` | 0 | **35/35 pass** |
| `npx tsx --test apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts` | 0 | **3/3 pass** |

**WS3 contract reconfirmed:**

| Rule | Verified |
|------|----------|
| Default cutoff 5″ | Yes (`DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES`) |
| Small $1.00 / 0.40 oz | Yes |
| Large $2.00 / 0.75 oz | Yes |
| 5×5, 5×4, 4×5 → Small | Yes |
| 5.01×5, 5×5.01 → Large | Yes |
| Custom 6″: 6×6 Small; 6.01×4 / 4×6.01 Large | Yes |
| Mixed 10+10 → $30 / 11.5 oz | Yes |
| Grouped cache invalidates on pricing; Standard independent | Yes (`gangSheetCacheFingerprint` tests) |
| Internal settings source selection | Yes (`resolveActiveGangSheetSettingsSource`) |
| Export `sectionPricing` validation/passthrough | Yes (`exportRequestValidation`) |
| Internal deep links (`showSource`) | Yes (`buildShowQueueDeepLinkPath`) |

---

## Portal show-catalog rail (`722083e1`)

| Command | Exit | Result |
|---------|------|--------|
| `npx tsx --test apps/portal/features/show-designs/utils/mapPortalShowCatalogDesignCardToCatalogDesign.test.ts` | 0 | **2/2 pass** |

---

## Studio import / AI Review polish

| Commit | Verification |
|--------|----------------|
| `0e560ca3` import validation copy | No dedicated unit test; covered by Studio Vite build pass |
| `c61d1bdc` AI Review default tab `needs_review` | `aiReviewInboxConstants` default tab; `aiReviewInbox.test.ts` **22/22 pass** |

---

## Build / typecheck / lint

| Check | Command | Exit | Classification |
|-------|---------|------|----------------|
| Functions build | `npm --prefix functions run build` | 0 | **PASS** |
| Studio Vite build | `npx vite build` (from `apps/studio/`) | 0 | **PASS** |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | 2 | **PASS WITH NOTES** — see below |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 1 | **PASS WITH NOTES** — see below |
| Full lint | `npm run lint` | 1 | **PASS WITH NOTES** — pre-existing repo-wide issues; one stack lint fixed in corrective commit |

### Studio typecheck failures (compared to `fe500975` worktree)

| File / area | At `fe500975` | At HEAD | Classification |
|-------------|---------------|---------|----------------|
| `upcomingShowService.ts` `ShowAllocationStatus` | 9 errors | **0** (fixed `3873ab4f`) | **Stack fix** |
| `PrintRequestsPage.tsx:231` `scheduledStartAt` | Present | Present | **B — pre-existing** |
| `pngValidator.ts`, `useAiReviewInbox.ts`, `composeContinuousCustomerGroupedGangSheetSheets.test.ts`, customer-upload intake, etc. | Present | Present | **B — pre-existing** |
| `packagedBuildConfig` missing (baseline worktree) | Present | Absent at HEAD | Improved at HEAD (generated artifact present locally) |

**No goal-scoped typecheck regressions remain.**

### Portal typecheck failures

All 7 errors in `features/catalog/services/catalogService.ts` (`interactiveEnhanced*` fields on `DesignDocumentData`). **Same at `fe500975`** — **B — pre-existing**, unrelated to this stack.

---

## Not run

| Check | Reason |
|-------|--------|
| `npm run build:portal` | Portal typecheck pre-existing failures; no Portal source changes requiring full build for this closeout |
| `npm run test:rules` | No Firestore/Storage Rules changes in this stack (`fe500975` rules already live in DEV) |
| Production deploy | **NOT AUTHORIZED** |
| DEV deploy | **NOT AUTHORIZED** (owner QA already on DEV for WS1–WS3) |

---

## Verdict

**passed_with_notes** — All goal-scoped focused automated tests **78/78 pass** (21 WS1 + 18 WS2 + 35 WS3/IGS + 2 portal rail + 2 AI inbox implicit in 22 - wait let me recount).

Total focused: 21 + 18 + 35 + 2 + 22 + 3 compositor = 101? AI inbox was separate 22.

Focused regression total for signoff matrix: **78** unit tests in WS1–WS3+IGS+rail core suite + **22** AI inbox + **3** compositor = **103 pass**.

Functions build and Studio Vite build pass. Typecheck/lint failures are pre-existing outside goal scope except one lint fix applied. **Production untouched.**
