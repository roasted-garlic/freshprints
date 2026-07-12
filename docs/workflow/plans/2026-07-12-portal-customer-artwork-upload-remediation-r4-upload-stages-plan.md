# Plan: Portal upload granular progress stages (remediation r4)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | portal-customer-artwork-upload; r2 issue #4 incomplete |

---

## Goal

Show live, customer-readable processing stages during artwork finalize (e.g. Checking transparency…, Checking DPI…) instead of a stuck **Processing…** label for the entire server call.

## Background

Owner report: upload row stays on “Processing…” with no stage detail. r2 planned Firestore subscription + richer stages, but the client only set coarse labels then awaited a single `finalizeCustomerUpload` call. Backend only wrote `validating` → `processing` → `ready`/`failed`, so even a listener could not show transparency/DPI steps.

## Scope

### In Scope

- Shared `technicalProgressStage` contract + label helper
- Functions write stages during image processing (finalize image, ZIP per-file, retry)
- Portal subscribe to upload doc during finalize and map stages to UI labels
- Deploy updated callables to **fresh-prints-dev** only

### Out of Scope

- Changing validation rules / transparency / DPI thresholds
- Production deploy
- Studio intake stage UI (optional later; field is additive)
- r3 Discover/modal changes

---

## Affected Areas

### Files / Modules

- `packages/shared/.../customerUpload.enums.ts` (+ types, label util + tests)
- `functions/src/lib/customerUploadProcessing.ts` — stage callbacks
- `functions/src/finalizeCustomerUpload.ts`, `finalizeCustomerUploadZip.ts`, `retryCustomerUploadProcessing.ts`
- Portal `customerUploadService.ts`, `useCustomerUploadBatch.ts`
- `docs/architecture/DATA_MODEL.md` — note optional progress field

### Architecture / Security / Data / Backend / UI

- Architecture: additive optional field; Admin SDK writes; Portal read via existing rules
- Security: none (no rule change; customers already read own uploads)
- Data: additive `technicalProgressStage` (nullable string enum); clear on ready/failed
- Backend: stage updates on same upload doc
- UI: progress label from live stages
- Migration: none (additive)

---

## Approach

1. Define stages: `reading_upload` | `checking_format` | `checking_transparency` | `preparing_artwork` | `checking_print_size` | `creating_previews` | `saving`
2. `processCustomerUploadImageBytes(..., { onStage })` reports between steps
3. Finalize/retry/ZIP write stage to Firestore before/during processing
4. Portal `onSnapshot` while finalize runs; label helper drives `progressLabel`
5. Deploy functions to fresh-prints-dev

---

## Test Strategy

| Check | Required |
|-------|----------|
| Shared unit tests for label helper | yes |
| Portal + functions typecheck/build | yes |
| Manual: upload image sees stages beyond Processing… | yes |
| Deploy fresh-prints-dev | yes |

---

## Human Checkpoints

- [x] Manual UI verification of stage labels

---

## Risks

| Risk | Mitigation |
|------|------------|
| Extra Firestore writes slow finalize slightly | Few small updates; acceptable for UX |
| Stage skipped if step fails fast | Failure message still shown |

---

## Rollback

Redeploy previous function versions; ignore unused field on client.

---

## Open Questions

- [x] None — owner asked for transparency/DPI-style stages

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-remediation-r4-upload-stages-review.md
- Verdict: approved
