# Owner DEV QA Checkpoint — WS2 Custom Request Final Image

**Date:** 2026-08-31  
**Goal:** `pre-smart-profiling-print-request-and-gang-sheet-polish`  
**Workstream:** WS2 — Custom Request Final Image validation + attach hardening  
**Environment:** `fresh-prints-dev` + local Portal (`npm run dev:portal`, port 3100)  
**Status:** **PENDING** — awaiting owner test

---

## Prerequisites

1. **Portal:** stop and restart `npm run dev:portal` so latest client loads.
2. **Functions:** DEV deploy includes `staffAddAssistedCreationFinalSource` and `customerAddAssistedApprovedProofToPrintRequest` (see deploy record).
3. **Test data:** An **approved** Assisted Creation / Custom Request with a staff **Final Image** (`finalSource`). Prefer one where proof imagery may be purged but `finalSource` remains, if available.
4. **Print Request:** Customer has a **current editable** Print Request (Working tab).

---

## Owner reply format

Reply with exactly one of:

- `WS2 PASS`
- `WS2 PASS WITH NOTES: …`
- `WS2 FAIL: …`

---

## Not in scope for this checkpoint

- WS3 gang-sheet price/weight line (separate checkpoint after WS2 PASS)
- Production deploy
- Smart Profiling
- Managed goal signoff
