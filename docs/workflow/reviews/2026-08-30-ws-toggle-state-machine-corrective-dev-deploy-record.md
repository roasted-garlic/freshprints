# DEV Deploy Record — WS-TOGGLE State-Machine Corrective

**Date:** 2026-08-31  
**Project:** `fresh-prints-dev`  
**Goal:** `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale`  
**Workstream:** WS-TOGGLE state-machine corrective (selection-only reuse)

---

## Owner approval

**APPROVE WS-TOGGLE STATE-MACHINE CORRECTIVE DEV DEPLOY** recorded 2026-08-31.

---

## Git checkpoint

| Field | Value |
|-------|-------|
| Branch | `development` |
| Commit | `c71e8392e64ac5d34363b8b8261c2321b8b19d9c` |
| Subject | `fix: reuse existing interactive upscale derivative` |
| Local SHA | `c71e8392e64ac5d34363b8b8261c2321b8b19d9c` |
| `origin/development` SHA | `c71e8392e64ac5d34363b8b8261c2321b8b19d9c` |
| Push | Success (`c2461238..c71e8392`) |

### Pre-commit scope classification

**Committed (WS-TOGGLE state-machine corrective):** 45 files — shared policy/callable, Studio + Portal toggle reconciliation, Firestore rules (upscale fields only; `artworkBackgroundSource` fast-path excluded), tests, workflow docs, ADR-FP-080 amendment.

**Left unstaged (unrelated — preserved separately):**

| File | Classification |
|------|----------------|
| `aiReviewInboxConstants.ts` | AI Review inbox — unrelated |
| `ImportValidationWarningsTrigger.tsx`, `importPrintSizeDisplay.ts`, `importValidationWarningDisplay.ts` | Import validation — prior goal |
| `layout.css`, `utilities.css`, `settings.css`, `StandardPrintSizesSettingsSection.tsx` | WS-CONFIG / import UI — unrelated |
| `PortalPrintRequestContext.tsx` | Clear-all-items — unrelated |
| `standardPrintSizesSettings.constants.ts` (+ test) | WS-CONFIG validation — already in `c246123` |
| `addPortalCatalogDesignToPrintRequest.test.ts` | WS-CONFIG bundle — unrelated to this checkpoint |
| `ws-config-default-*` docs | WS-CONFIG workstream |

---

## Pre-deploy verification (committed source)

| Check | Result |
|-------|--------|
| Focused state-machine/sizing tests | **43/43 PASS** |
| Functions build | **PASS** |
| `git diff --check` | **PASS** |

### State-machine proofs (code review)

| # | Requirement | Verified |
|---|-------------|----------|
| 1 | Derivative exists + ON → `switchToEnhancedReuse` | `executeSetPrintRequestItemArtworkEnhanceMode` lines 684–688 |
| 2 | Derivative exists → `generateInteractiveDerivative` not reachable | Guard at 684–691; `generateInteractiveDerivative` throws if `hasDerivative` |
| 3 | 227 DPI + derivative → selection only | `resolveInteractiveUpscaleToggleEligibility` STATE B/C |
| 4 | Reset → mode OFF + default size; derivative preserved | Modal handlers; no asset metadata delete |
| 5 | Enlarge + ON → reuse | Same as #1 |
| 6 | No auto-baseline effect | Removed from `PrintRequestItemCard.tsx` |
| 7 | Callable does not overwrite print inches | Client + `switchToBaseline` omit size restore |
| 8 | `customer_upload` parity | Callable upload path + Portal upload fields |
| 9 | Portal parity | `PortalPrintRequestItemCard` toggle + service |
| 10 | No `regenerated_enhanced` | Removed from types and core |

---

## Firestore Rules live-version determination

**Answer: B — RULES NOT LIVE**

Evidence:

- `docs/workflow/reviews/2026-08-30-ws-toggle-dev-deploy-record.md` (2026-08-30): **No Rules** deployed with initial WS-TOGGLE Function create.
- `docs/workflow/reviews/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-dev-deploy-record.md` (WS-CONFIG): **No Rules** deployed.
- Required live behavior (`artworkEnhanceMode`, `preEnhance*`, legacy `updatedBy` tolerance on `printRequestItems`) exists only in commit `c71e8392` — not previously released to `fresh-prints-dev`.

**Authorization:** Firestore rules deploy included in this checkpoint.

---

## Deploy commands

### Function

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
firebase deploy --only functions:setPrintRequestItemArtworkEnhanceMode --project fresh-prints-dev
```

**Exit code:** 0  
**Result:** `setPrintRequestItemArtworkEnhanceMode(us-central1)` — **Successful update operation**

### Firestore Rules

```powershell
firebase deploy --only firestore:rules --project fresh-prints-dev
```

**Exit code:** 0  
**Result:** `firestore.rules` released to `cloud.firestore`

---

## Resources NOT deployed

- Storage Rules
- Firestore indexes
- App Hosting
- Other Functions
- Production (`fresh-prints-prod`)

---

## Post-deploy status

- **Production:** NOT touched
- **Owner DEV QA:** **Re-test pending** (QA A–F checklist)
- **Signoff:** Not authorized until QA PASS
- **Smart Profiling:** NOT STARTED

---

## Owner DEV QA checklist (critical regression)

1. Enhance at ~17″ (first generation) → processing overlay, derivative created, toggle ON.
2. Reset to Default → mode OFF, default width, derivative preserved.
3. Enlarge to ~17″ → Upscale ON → **no processing**, reuse derivative, toggle stays ON, DPI from enhanced pixels.
4. ON/OFF/ON repeatedly → no reprocessing.
5. Larger size (17″→18″) with derivative → reuse only; DPI policy applies; no second derivative.
6. Portal hard refresh → size save works; Improve resolution reuses derivative.

**Reply:** `PASS` · `FAIL: …` · `PASS WITH NOTES: …`
