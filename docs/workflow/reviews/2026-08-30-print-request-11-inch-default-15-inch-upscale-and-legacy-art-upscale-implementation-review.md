# Implementation Review: Print Request 11″ / 15″ / Legacy Enhance

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Verdict | **approved_with_notes** |
| Production | **NOT AUTHORIZED** |
| DEV Firebase deploy | **COMPLETE** on `fresh-prints-dev` (2026-08-30) |
| Owner DEV QA | **pending** |

## Checklist (26)

| # | Criterion | Result |
|---|-----------|--------|
| 1 | 11″ actual target in init paths | **pass** |
| 2 | No unrelated 10″ constants changed incorrectly | **pass** — `PREFERRED_PRINT_WIDTH_INCHES` / `DEFAULT_PRINT_REQUEST_WIDTH_INCHES` remain 10″ |
| 3 | Legacy normalization no longer caps eligible 11″ default | **pass** — stale approved-max bypass when DPI allows |
| 4 | 200 DPI floor intact | **pass** |
| 5 | 200–299 warning intact | **pass** |
| 6 | 15″ automated target → pixels | **pass** — 4500px @ 300 DPI |
| 7 | Automated path one pass only | **pass** — `MAX_UPSCALE_PASSES` unchanged |
| 8 | Manual staff one additional pass | **pass** — max `upscalePassCount` 2 |
| 9 | Cumulative scale ≤6× from native | **pass** — `resolveManualArtworkEnhanceDecision` |
| 10 | No chained 36× scenario | **pass** |
| 11 | Original preserved (pre-manual dimensions recorded) | **pass** — `preManualEnhance*`, `nativeProduction*` |
| 12 | Canonical catalog enhancement | **pass** — updates design + Storage originals/derivatives |
| 13 | Customer upload ownership unchanged | **pass** — callable rejects `customer_upload` V1 |
| 14 | Studio-only server enforcement | **pass** — `assertStaffCaller` |
| 15 | Portal cannot invoke enhance | **pass** — no Portal UI/callable client |
| 16 | Duplicate processing prevented | **pass** — `artworkEnhanceLockUntil` |
| 17 | Failures non-corrupting | **pass** — lock cleared on error; no partial Firestore success fields |
| 18 | Physical width stable | **pass** — callable does not mutate PR item inches |
| 19 | Effective DPI from enhanced pixels | **pass** — Studio reloads design after enhance |
| 20 | Standard Size intact | **pass** — no preset table changes |
| 21 | Two 11″ nesting works | **pass** — gang sheet test |
| 22 | Two 12″ not same row | **pass** |
| 23 | Transparency | **pass_with_notes** — PNG pipeline; no new alpha regression image fixture |
| 24 | Provenance truthful | **pass** |
| 25 | No Smart Profiling changes | **pass** |
| 26 | Production untouched | **pass** |

## DEV Firebase deploy scope (required before callable + 15″ server QA)

Each Cloud Function bundles its own copy of `packages/shared` at build time. Deploying only `enhancePrintRequestArtwork` enables **legacy manual enhance (#3)** but does **not** update customer-upload processing still running the old **12″** bundle.

### Runtime matrix

| Workflow | Runtime owner | Code path | Consumes `AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES` / `imageQualitySizingPolicy`? | Firebase redeploy? | Exported Function(s) |
|----------|---------------|-----------|-------------------------------------------------------------------------------|--------------------|----------------------|
| **New catalog import** | Studio/Electron (local main) | `pngValidator.ts` / `readSelectedPngFileBytes.ts` → `upscaleImportImageIfNeeded` → `printSizeMath` → `imageQualitySizingPolicy` | **Yes** | **No** | — (Studio reload only) |
| **New customer upload finalize** | Cloud Functions | `finalizeCustomerUpload` → `processCustomerUploadImageBytes` → `customerUploadProcessing` → `printSizeMath` | **Yes** | **Yes** | `finalizeCustomerUpload` |
| **Customer upload ZIP finalize** | Cloud Functions | `finalizeCustomerUploadZip` → `processCustomerUploadImageBytes` | **Yes** | **Yes** | `finalizeCustomerUploadZip` |
| **Customer upload retry** | Cloud Functions | `retryCustomerUploadProcessing` → `processCustomerUploadImageBytes` | **Yes** | **Yes** | `retryCustomerUploadProcessing` |
| **Legacy Print Request manual enhance** | Cloud Functions | `enhancePrintRequestArtwork` → `enhancePrintRequestArtworkCore` → `manualArtworkEnhance` + `artworkEnhanceProcessing` | **Yes** | **Yes** | `enhancePrintRequestArtwork` |

**Portal/client:** uses `printRequestItemSizing` for sizing/DPI display only — **no** automated upscale path. **11″ default** applies after Portal dev reload; no Firebase deploy needed for Portal sizing UX.

**Assisted-creation proof attach** (`customerAddAssistedApprovedProofToPrintRequest`) also calls `processCustomerUploadImageBytes` — **intentionally excluded** from this goal's DEV deploy; may retain prior bundle until a future checkpoint. **Not a blocker** for this goal.

### Studio reload only (no Firebase)

- Catalog PNG import upscale (Electron main process)
- Print Request 11″ initializer + contextual **Upscale artwork** UI (renderer; hot reload / restart `dev:studio`)

### Corrected scoped DEV deploy command

```bash
firebase deploy --only functions:enhancePrintRequestArtwork,functions:finalizeCustomerUpload,functions:finalizeCustomerUploadZip,functions:retryCustomerUploadProcessing --project fresh-prints-dev
```

Optional fifth function if assisted-creation proof processing must match 15″ on DEV: append `,functions:customerAddAssistedApprovedProofToPrintRequest` to the `--only` list. **Owner declined for this goal.**

**Firestore Rules:** not required  
**Storage Rules:** not required  
**Indexes:** not required  

## DEV deploy evidence (2026-08-30)

| Item | Result |
|------|--------|
| Project | `fresh-prints-dev` |
| Source | `c039f71` |
| Attempt 1 | Exit **1** — discovery timeout (10s default); no remote change |
| Attempt 2 | Exit **0** — `FUNCTIONS_DISCOVERY_TIMEOUT=120` |
| `enhancePrintRequestArtwork` | **Successful create** |
| `finalizeCustomerUpload` | **Successful update** |
| `finalizeCustomerUploadZip` | **Successful update** |
| `retryCustomerUploadProcessing` | **Successful update** |
| Rules / indexes / hosting | **not deployed** |
| Production | **untouched** |

Record: `docs/workflow/reviews/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-dev-deploy-record.md`

**STOP:** await owner DEV QA.

---

## Owner DEV QA corrective (2026-08-30) — FAIL

| # | Finding | Root cause | Corrective |
|---|---------|------------|------------|
| 1 | Portal catalog add ~10″ not 11″ | `addPortalCatalogDesignToPrintRequest` **not redeployed** on DEV; stale shared bundle | Redeploy callable; tests added |
| 2 | Studio Upscale not visible | **Not unwired** — `shouldOfferManualArtworkEnhanceAction` requires `effectiveDpi < 300`; `already_sufficient` hides action | No wiring fix; discoverability in review amendment |
| 3 | Portal + Studio toggle enhancement | **Toggle model amendment** — per-asset one-time derivative; catalog + upload; **no customer quota** |

### FAIL 1 — proven runtime path

```
Portal catalog add
  → portalPrintRequestService.addOrIncrementCatalogDesign
  → addPortalCatalogDesignToPrintRequest (Cloud Function — stale bundle on DEV)
  → resolvePortalCatalogAddLineSize
  → Firestore printRequestItems
  → Current Request drawer + review page
```

**Files changed (corrective):**

- `functions/src/addPortalCatalogDesignToPrintRequest.ts` — `resolvePortalCatalogAddLineSize` helper
- `functions/src/addPortalCatalogDesignToPrintRequest.test.ts` — regression tests
- `apps/portal/features/print-requests/utils/portalCatalogAddInitialSizing.test.ts` — cart/review parity tests

**DEV redeploy required:** **Yes**

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
firebase deploy --only functions:addPortalCatalogDesignToPrintRequest --project fresh-prints-dev
```

**STOP** — await owner approval before deploy.

### FAIL 2 — superseded by toggle redesign (2026-08-30 owner correction)

- Current one-way button gated by `effectiveDpi < 300` — explains QA invisibility
- `enhancePrintRequestArtworkCore` **destructively overwrites** baseline `originalPath` — **incompatible** with toggle OFF
- **Do not** patch old eligibility; implement per-item toggle + non-destructive derivative after Formal Review ack

### Amendments (revised 2026-08-30 — quota model removed)

- Plan: `docs/workflow/plans/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-plan-amendment-portal-enhance.md`
- Review: `docs/workflow/reviews/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-review-amendment-corrective-and-portal-enhance.md`

## Owner DEV QA checklist

See plan manual QA section A–G.
