# DEV Deploy Record — WS-TOGGLE Interactive Storage Access Corrective

**Date:** 2026-08-31  
**Goal:** `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale`  
**Owner authorization:** DEV Storage rules + `setPrintRequestItemArtworkEnhanceMode` deploy approved

---

## Git Preflight

| Field | Value |
|-------|-------|
| Corrective SHA | `9c9f7f0eb4e41bdd20802c42337c7179f94dfc90` |
| `git rev-parse HEAD` | `9c9f7f0eb4e41bdd20802c42337c7179f94dfc90` |
| `git rev-parse origin/development` | `9c9f7f0eb4e41bdd20802c42337c7179f94dfc90` |
| Ancestor check | **PASS** |

Prior export-parity SHA: `c84ec449a688f1ffac53cc22a75525a9315ec8c3`

---

## Pre-Deploy Verification

| Check | Result |
|-------|-------|
| Focused regression tests | **49/49 PASS** |
| Functions build | **PASS** |
| Storage rules scope | **Narrow** — interactive catalog original read/delete only; baseline unchanged; no new customer/cross-customer access |

---

## Firebase Deploy — `fresh-prints-dev`

### 1. Storage Rules

| Field | Value |
|-------|-------|
| Command | `firebase deploy --only storage --project fresh-prints-dev` |
| Exit code | **0** |
| Result | `storage: released rules storage.rules to firebase.storage` |

### 2. Cloud Function

| Field | Value |
|-------|-------|
| Command | `firebase deploy --only functions:setPrintRequestItemArtworkEnhanceMode --project fresh-prints-dev` |
| Env | `FUNCTIONS_DISCOVERY_TIMEOUT=120` |
| Exit code | **0** |
| Result | `setPrintRequestItemArtworkEnhanceMode(us-central1) Successful update operation` |

### Not deployed

- Firestore rules
- Firestore indexes
- Hosting
- Other Functions
- Production (`fresh-prints`)

---

## Owner Re-Test Target

- Design: `ltn0gzs2YGXPADqCejr8`
- Allocation: `d3MNZand4pj7P1pprcbA`
- Batch: ~10" baseline + ~17" Upscale ON

Tests A–F per workflow state. Reply `PASS` / `PASS WITH NOTES` / `FAIL`.

---

## Workflow

**Owner DEV QA production export parity re-test** — pending. Signoff not authorized.
