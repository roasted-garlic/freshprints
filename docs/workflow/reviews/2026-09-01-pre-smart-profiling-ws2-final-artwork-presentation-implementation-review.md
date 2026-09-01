# WS2 Final Artwork Presentation — Implementation Review

**Date:** 2026-09-01  
**Goal:** `pre-smart-profiling-print-request-and-gang-sheet-polish`  
**Verdict:** **approved_with_notes** — ready for scoped DEV deploy + owner re-test

---

## Root causes

| Issue | Root cause |
|-------|------------|
| Studio no pre-upload preview | Final artwork picker set `pendingFinalFile` only; proof path already used `URL.createObjectURL` preview |
| Studio/Portal history missing Final Artwork | Lists rendered from `proofs[]` only; `finalSource` never composed into history read model |
| Download opened approved proof | `downloadApprovedProof` used shared resolver default/auto; proof modal + overview did not pass explicit `final_artwork` target; cross-origin signed URL navigation displayed in-tab |

## Corrective

- Shared `buildAssistedCreationArtworkHistoryNewestFirst` composes proofs + `finalSource`
- Explicit download targets: `final_artwork` vs `approved_proof`
- Portal `downloadFinalArtwork()` / `downloadApprovedProof()` separation
- Signed URL download fetches blob for attachment behavior
- Studio pre-upload preview + history row for `finalSource`
- Attach path unchanged (`downloadTarget: auto` → prefers `finalSource`)

## Deploy scope (pending approval)

| Surface | Functions |
|---------|-----------|
| `customerGetAssistedCreationApprovedProofDownloadUrl` | **update** |
| `customerGetAssistedCreationApprovedProofFile` | **update** (fallback) |
| `customerAddAssistedApprovedProofToPrintRequest` | **no change required** (attach already correct) |

Portal + Studio: **restart local dev** — no Hosting deploy.

## Migration

**None.**
