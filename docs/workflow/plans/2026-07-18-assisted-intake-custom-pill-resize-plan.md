# Plan: Assisted intake Custom pill + Approved max resize

**Date:** 2026-07-18  
**Goal:** Fix Studio Customer Upload Intake for assisted → library path: show purple Custom pill; Approved max matches normal upload finalize/upscale.

## Root causes

### A) Custom pill missing
- Field `assistedCreationRequestId` **is written** on create by `customerAddAssistedApprovedProofToPrintRequest`.
- Live Studio hook `useCustomerUploadIntake` mapped snapshot docs **without** `assistedCreationRequestId` / `assistedProofId`, so UI always saw falsy → no pill.
- Soft-reload alone could not help until the hook maps the field.

### B) Wrong Approved max (~2.22" × 2.67" vs ~12" × 15.17")
- Assisted ingest called `processCustomerUploadImageBytes(..., { assistedProofFastIngest: true })`, which **skips trim + upscale** and computes approved max from native proof pixels.
- Normal `finalizeCustomerUpload` runs full upscale toward 12" width at 300 DPI.

## Scope

**In**
- Map assisted origin fields in `useCustomerUploadIntake`.
- Switch assisted library ingest to `skipCustomerQualityGates: true` (same trim/upscale as finalize; still skip transparency rejection).
- Backfill `assistedCreationRequestId` on re-attach if missing.
- Unit test proving skipQualityGates upscales vs fast ingest.
- Deploy `customerAddAssistedApprovedProofToPrintRequest` to `fresh-prints-dev` only.

**Out**
- Production deploy.
- Grey artwork preview bg (already fixed).
- Migrating persisted inches on existing bad upload docs (require re-add).

## Existing docs

| Issue | Soft-reload enough? | Need re-add? |
|-------|---------------------|--------------|
| Custom pill (field already on doc) | Yes, after Studio picks up hook fix | No |
| Wrong Approved max | No (sizes persisted) | **Yes** — clear sticky ingest / delete bad upload, then Add approved proof again after Function deploy |

## Test strategy

- Automated: `customerUploadProcessing` test (fast vs full path).
- Manual: owner re-test steps in workflow state / deliverable.
