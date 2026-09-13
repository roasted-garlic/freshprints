# DEV Deploy Record — WS-CONFIG-DEFAULT

**Date:** 2026-08-30  
**Project:** `fresh-prints-dev`  
**Goal:** `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale`  
**Workstream:** WS-CONFIG-DEFAULT only

---

## Implementation checkpoint

| Field | Value |
|-------|-------|
| Branch | `development` |
| Implementation commit | `c2461238328873c281aea67b97e8a96f8c44d6de` |
| Commit subject | `feat: make print request default width configurable` |
| Local SHA | `c2461238328873c281aea67b97e8a96f8c44d6de` |
| `origin/development` SHA | `c2461238328873c281aea67b97e8a96f8c44d6de` |
| Push | Success (`c039f71..c246123`) |

### Pre-commit scope classification

**Committed (WS-CONFIG-DEFAULT + workflow docs):** 25 files — shared settings/sizing, Studio Settings UI + init paths, Portal client init paths, 4 Functions + loader, tests, plan/review artifacts, workflow state.

**Left unstaged (unrelated — not in checkpoint commit):**

| File | Classification |
|------|----------------|
| `aiReviewInboxConstants.ts` | AI Review inbox default tab — unrelated |
| `ImportValidationWarningsTrigger.tsx` | Import validation UI — prior 15″ goal |
| `importPrintSizeDisplay.ts` | Import display — prior goal |
| `importValidationWarningDisplay.ts` | Import warnings — prior goal |
| `layout.css`, `utilities.css` | Import validation modal styles — prior goal |
| `firestore.rules` | `artworkBackgroundSource` fast-path — unrelated |
| Parent goal implementation-review / test-report (modified, unstaged) | Mixed prior-goal updates — not in WS-CONFIG checkpoint |

**Not in commit:** WS-TOGGLE, Smart Profiling, production promotion, secrets.

---

## Pre-deploy verification

### Behavior (committed source)

- `defaultPrintRequestWidthInches` on `settings/standardPrintSizes`
- 11″ fallback via `resolvePrintRequestDefaultWidthInches`
- Snapshot-at-create; no migration
- Runtime Firestore read per callable (`loadStandardPrintSizesSettings`) — no TTL cache

### Tests (pre-deploy)

| Check | Result |
|-------|--------|
| Focused WS-CONFIG tests | **58/58 pass** |
| `functions` build | **pass** |
| `git diff --check` | **pass** |
| Studio/Portal typecheck | Pre-existing failures; **no WS-CONFIG-DEFAULT changed files implicated** |

---

## Assisted proof 15″ bundle determination

**Answer: A — YES**

Redeploying `customerAddAssistedApprovedProofToPrintRequest` bundles the current shared processing code. That Function calls `processCustomerUploadImageBytes` (with `skipCustomerQualityGates: true`), which runs the standard trim → `resolveImportUpscaleTargetPx` → `upscaleIfNeeded` path. That path uses `resolveControlledUpscale` / `imageQualitySizingPolicy` with **`AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES = 15`** from the current shared bundle.

**Owner acceptance recorded:** Bringing this Function onto the current reviewed 15″ automated processing target is acceptable as part of this deploy — same image-quality policy, no new Assisted Creation workflow semantics, no additional Firebase resources.

**WS-CONFIG-DEFAULT change in same Function:** generic Print Request item width now uses `loadStandardPrintSizesSettings()` → `printRequestDefaultWidthInches` at attach time (separate from automated upscale target).

---

## Deploy command

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
firebase deploy --only functions:updateStandardPrintSizesSettings,functions:addPortalCatalogDesignToPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev
```

**Exit code:** 0  
**Deploy complete** message confirmed.

---

## Functions updated

| Function | Region | Result |
|----------|--------|--------|
| `updateStandardPrintSizesSettings` | us-central1 | Successful update operation |
| `addPortalCatalogDesignToPrintRequest` | us-central1 | Successful update operation |
| `confirmCustomerUploadsAndAttachToRequest` | us-central1 | Successful update operation |
| `customerAddAssistedApprovedProofToPrintRequest` | us-central1 | Successful update operation |

All four targeted Functions updated. No Rules, Storage Rules, indexes, Hosting, or production resources deployed.

---

## Post-deploy status

- **Production:** NOT touched
- **Owner DEV QA:** Pending (FAIL until retest PASS)
- **Signoff:** Not authorized
- **WS-TOGGLE:** Not implemented
