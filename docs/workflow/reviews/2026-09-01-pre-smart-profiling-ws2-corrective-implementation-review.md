# WS2 Corrective — Implementation Review

**Date:** 2026-09-01  
**Goal:** `pre-smart-profiling-print-request-and-gang-sheet-polish`  
**Workstream:** WS2 corrective (owner QA FAIL)  
**Verdict:** **approved_with_notes** — ready for focused DEV deploy + owner re-test

---

## Root causes confirmed

| Issue | Root cause | Corrective |
|-------|------------|------------|
| Attach latency | Every first attach runs full `processCustomerUploadImageBytes` (trim/upscale/derivatives) plus redundant Storage read (server copy + download) | Single Storage read; safe reuse of ready `customerUploads` for same `assistedFinalSourceId` / proof lineage; lineage validation on sticky `printRequestIngest` |
| Large download fail | Portal used `customerGetAssistedCreationApprovedProofFile` base64 callable with hard `MAX_DOWNLOAD_BYTES = 8MB` | Portal now prefers `customerGetAssistedCreationApprovedProofDownloadUrl` (signed URL + attachment disposition); bytes callable retained as small-file fallback only |

---

## Architecture boundary

- **No** move of production pipeline to staff Final Image upload (option D not required).
- Attach-time processing remains for first ingest of a new Final Image version.
- Reuse is idempotent and lineage-keyed (`assistedFinalSourceId` or `assistedProofId`).

---

## Security

- Download still server-authZ via `resolveAssistedCreationApprovedProofDownload`.
- Signed URL is short-lived; Storage objects remain private.
- Reuse query scoped to same `customerUid` + `assistedCreationRequestId`.

---

## Migration

**None.**

---

## Deploy scope (DEV — owner approval required)

| Surface | Change |
|---------|--------|
| Functions | `customerAddAssistedApprovedProofToPrintRequest` |
| Portal | client-only — restart `npm run dev:portal` |
| Rules | none |

`customerGetAssistedCreationApprovedProofDownloadUrl` already exists on DEV from prior deploys; no Function deploy required for download fix if that export is live.

---

## Notes

- First attach of a new large Final Image will still require attach-time processing (expected per approved WS2 V1).
- Re-attach / remove-and-re-add after prior successful ingest should be near-instant via reuse.
- Functions logs emit `[customerAddAssistedApprovedProofToPrintRequest] attach timings` for owner timing verification.
