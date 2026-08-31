# DEV Deploy Record — Pre-Smart-Profiling Print Request and Gang-Sheet Polish

**Date:** 2026-08-31  
**Goal:** `pre-smart-profiling-print-request-and-gang-sheet-polish`  
**Owner authorization:** DEV Functions deploy approved for WS1 / WS2 / WS3 manual QA (production NOT authorized)

---

## Git Checkpoint

| Field | Value |
|-------|-------|
| Implementation SHA | `01df254c2a519669dd202e465efd3f34a09df62e` |
| `git rev-parse HEAD` | `01df254c2a519669dd202e465efd3f34a09df62e` |
| `git rev-parse origin/development` | `01df254c2a519669dd202e465efd3f34a09df62e` |
| Local == origin | **PASS** |
| Prior base SHA | `90a0b98e` |

Unrelated working-tree changes preserved (not committed): Portal show-designs rails/cache/discovery, Studio imports/AI Review, `portalShowCatalogDesigns.ts`, `listPortalShowCatalogDesigns.types.ts`, local `firestore.rules` tweak.

---

## Function Exports Verified (`functions/src/index.ts`)

| Workstream | Export name |
|------------|-------------|
| WS1 | `unqueuePortalPrintRequestFromShow` |
| WS2 | `staffAddAssistedCreationFinalSource` |
| WS2 | `customerAddAssistedApprovedProofToPrintRequest` |

---

## Rules Preflight

**A. NO RULES CHANGE REQUIRED**

- Approved implementation review: no Firestore Rules, Storage Rules, or index changes.
- Optional local `firestore.rules` `showAllocations` `customerId` read path is **not** required; client per-request equality queries fix Portal permissions within existing rules.
- **No Rules deployed.**

---

## Pre-Deploy Verification (against `01df254c`)

| Check | Result |
|-------|--------|
| WS1 — `portalPrintRequestUnqueue.test.ts` | **10/10 PASS** |
| WS2 — `assistedCreationApprovedProofAddToRequest.test.ts` | **5/5 PASS** |
| WS2 — `customerUploadProcessing.test.ts` (incl. `probeAssistedFinalSourceImageBytes`) | **25/25 PASS** |
| WS3 — `gangSheetCustomerSectionSummary.test.ts` | **6/6 PASS** |
| WS3 — `gangSheetCacheFingerprint.test.ts` | **11/11 PASS** |
| Hook-order — `PrintRequestDetailView.hooks.contract.test.ts` | **2/2 PASS** |
| Hook-order — `printRequestDetailUnqueueUi.test.ts` | **4/4 PASS** |
| Functions build (`npm --prefix functions run build`) | **PASS** (exit 0) |
| Portal full typecheck | **Not run** — unrelated pre-existing failures preserved as notes |

Command: `npx tsx --test` on goal-scoped test files — **63/63 PASS**, exit 0.

---

## Firebase Deploy — `fresh-prints-dev`

| Field | Value |
|-------|-------|
| Project | `fresh-prints-dev` |
| Env | `FUNCTIONS_DISCOVERY_TIMEOUT=120` |
| Command | `firebase deploy --only functions:unqueuePortalPrintRequestFromShow,functions:staffAddAssistedCreationFinalSource,functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev` |
| Exit code | **0** |
| Result | **Deploy complete** |

### Functions deployed

| Function | Operation |
|----------|-----------|
| `unqueuePortalPrintRequestFromShow` (us-central1) | **create** |
| `staffAddAssistedCreationFinalSource` (us-central1) | **update** |
| `customerAddAssistedApprovedProofToPrintRequest` (us-central1) | **update** |

### Not deployed

- Firestore Rules
- Storage Rules
- Firestore indexes
- Hosting / App Hosting
- Other Functions
- Production (`fresh-prints`)

---

## DEV QA Environment Requirements

### Portal (WS1 + WS2)

- **Mode:** local dev server (`npm run dev:portal` → port **3100**)
- **Requirement:** stop and restart dev server (or `git pull` + restart) so committed Portal client changes load
- **App Hosting:** not deployed — not authorized

### Studio (WS3)

- **Mode:** local Electron dev (`npm run dev:studio`)
- **Requirement:** stop and restart Studio dev so Electron main-process gang-sheet export changes load; no Studio release or installer

---

## Owner DEV QA

Pending manual QA on WS1, WS2, WS3 per plan. Hook-order corrective QA: **PASS** (pre-deploy). Signoff **not** authorized.

---

## Production

**Untouched.**
