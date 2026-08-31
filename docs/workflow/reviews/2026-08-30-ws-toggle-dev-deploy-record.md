# DEV Deploy Record — WS-TOGGLE

**Date:** 2026-08-30  
**Project:** `fresh-prints-dev`  
**Goal:** `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale`  
**Workstream:** WS-TOGGLE (+ bundled WS-CONFIG fallback + attach callables)

---

## Owner approval

**APPROVE DEPLOY** recorded 2026-08-30.

---

## Deploy command

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
firebase deploy --only functions:setPrintRequestItemArtworkEnhanceMode,functions:enhancePrintRequestArtwork,functions:updateStandardPrintSizesSettings,functions:addPortalCatalogDesignToPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev
```

**Exit code:** 0  
**Deploy complete** confirmed.

---

## Functions updated

| Function | Region | Result |
|----------|--------|--------|
| `setPrintRequestItemArtworkEnhanceMode` | us-central1 | **Successful create operation** (new) |
| `enhancePrintRequestArtwork` | us-central1 | Successful update operation |
| `updateStandardPrintSizesSettings` | us-central1 | Successful update operation |
| `addPortalCatalogDesignToPrintRequest` | us-central1 | Successful update operation |
| `confirmCustomerUploadsAndAttachToRequest` | us-central1 | Successful update operation |
| `customerAddAssistedApprovedProofToPrintRequest` | us-central1 | Successful update operation |

No Rules, Storage Rules, indexes, Hosting, or production resources deployed.

---

## Post-deploy status

- **Production:** NOT touched
- **Owner DEV QA:** WS-TOGGLE pending (retest upscale confirm on dev)
- **Signoff:** Not authorized until WS-TOGGLE QA PASS
- **Studio local:** Upscale overlay + callable timeout + clearer error messages added post-deploy

---

## Owner DEV QA checklist (WS-TOGGLE)

1. Open a print request with a library design in Studio (dev Firebase).
2. Confirm DPI shows a real value (not `0 DPI`).
3. Turn **Upscale** on → confirm dialog → **Confirm upscale** — expect magic overlay on preview while processing, then enhanced DPI.
4. Toggle **Upscale** off — baseline DPI returns; print inches unchanged.
5. Repeat on a customer-upload item if available.

**Reply:** `PASS` · `FAIL: …` · `PASS WITH NOTES: …`
