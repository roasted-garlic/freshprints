# Plan: Portal Customer Artwork Upload — Sub-phase E (Studio Imports Intake)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | ready_for_review → **revised after review round 1** |
| Workflow | managed-phase |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` |
| Related review | `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-e-review.md` |
| Depends on | Sub-phase D signed off on `fresh-prints-dev` |
| ADR | ADR-FP-073 |

---

## Goal

Ship Studio **customer-upload intake inside existing `/imports`** (section on `ImportsPage` — **not** a fourth design workspace): staff can view pending uploads with required metadata, open the linked request, retry eligible technical processing, send to AI Review (promote), and exclude from catalog — without removing artwork from the request or deleting production assets.

Promotion **creates** the catalog design + enqueues AI once (idempotent). Full AI approval/rejection verification is Sub-phase F; E must implement promote/exclude/retry callables and intake UI so F can verify outcomes.

---

## Background

A–D delivered Portal upload, attach, and source-aware show/gang/export. Uploads sit at `catalogReviewStatus: pending_staff_review` after attach. Studio `/imports` is staff PNG/batch import only today. Parent plan places intake as a section on `ImportsPage`.

---

## Scope

### In Scope

1. **Studio UI section** on `ImportsPage` under existing single/batch cards: Customer uploads intake list + detail/actions
2. Display fields (parent checklist): preview, original filename, customer, linked request, request status, show assignment where applicable, upload date, source format, source/production dimensions, print size, effective DPI, transparency, technical status, catalog review status, ownership + catalog acknowledgements, failure details
3. Staff actions: Open linked request; Retry eligible technical processing; Send to AI Review; Do not add to catalog; Reverse catalog exclusion when permitted
4. Callables (Admin/trusted):
   - `promoteCustomerUploadToAiReview` (idempotent transaction + enqueue once)
   - `excludeCustomerUploadFromCatalog`
   - `retryCustomerUploadProcessing` (eligible technical failures only)
   - `restoreCustomerUploadCatalogEligibility` (reverse exclusion → `pending_staff_review` when no `promotedDesignId`)
5. Centralized permission helpers on `permissionService` (no scattered role compares)
6. Firestore indexes if intake queries need them
7. Docs + deploy to `fresh-prints-dev` + smoke harness
8. Minimal shared types for promote/exclude DTOs if missing

### Out of Scope

- Verifying AI Review approval → Design Library visibility (F)
- Verifying AI rejection preserves request item (F — E must not break assets)
- Cleanup schedules / wipe (G)
- Production deploy
- New sidebar route / fourth workspace
- AI prompt changes
- Changing locked upload limits
- Unparking wipe

### Permissions (binding)

| Capability | Helper | Who |
|------------|--------|-----|
| View intake | `canViewCustomerUploadIntake` | Staff with `canImportDesigns` |
| Exclude / reverse exclusion | `canExcludeCustomerUploadFromCatalog` | Staff with `canImportDesigns` |
| Promote (Send to AI Review) | `canPromoteCustomerUploadToAiReview` | Owner/admin via existing `canApproveDesignForCatalog` |
| Retry technical processing | `canRetryCustomerUploadProcessing` | Owner/admin via existing `canApproveDesignForCatalog` |

Do not scatter `role ===` checks in components — use these helpers only.

### Intake query (binding)

- **Default list:** `catalogReviewStatus == "pending_staff_review"` ordered by `createdAt` DESC
- **Excluded:** secondary filter/tab only (`excluded_from_catalog`) for restore actions — not mixed into the default pending queue without an explicit filter control

### Promote asset copy (binding)

- Copy upload **production PNG** → canonical design `originalPath` via **Admin Storage** in the promote callable (or trusted Function helper)
- Generate/preserve design thumbnail/preview using **existing** design derivative helpers/pipeline — do not invent Electron import orchestration for portal uploads
- Then enqueue `enqueueAiEnrichment` once (existing `catalog-enrich-v21` path; no prompt changes)

---

## Affected Areas

### New

| Path | Role |
|------|------|
| `functions/src/promoteCustomerUploadToAiReview.ts` (+ validation/lib) | Promote callable |
| `functions/src/excludeCustomerUploadFromCatalog.ts` | Exclude callable |
| `functions/src/retryCustomerUploadProcessing.ts` | Retry technical |
| `functions/src/restoreCustomerUploadCatalogEligibility.ts` | Reverse exclusion |
| `apps/studio/.../imports/components/CustomerUploadIntake*` | UI |
| `apps/studio/.../imports/hooks/useCustomerUploadIntake.ts` | Hook |
| `apps/studio/.../imports/services/customerUploadIntakeService.ts` | List + callables |
| `functions/scripts/smoke-customer-upload-subphase-e.mjs` | Smoke |

### Modified

| Path | Change |
|------|--------|
| `ImportsPage.tsx` | Mount intake section |
| `permissionService.ts` (+ types if needed) | Explicit customer-upload helpers |
| `functions/src/index.ts` | Export callables |
| `firestore.indexes.json` | Intake query indexes |
| Docs | BACKEND, DATA_MODEL, TESTING, ROADMAP |

### Reuse

- `customerUploadReadService`, `aiEnrichmentEnqueueService`, design storage path helpers, `getPrintRequestsPath`
- Existing AI pipeline `catalog-enrich-v21` via `enqueueAiEnrichment` — **no prompt changes**

---

## Architecture Impact

- [x] Intake lives under Imports feature folder; services own callables; components render
- [x] No Electron import IPC for portal uploads
- [x] Promote is trusted Admin transaction; client cannot create ready designs

---

## Security Impact

- [x] Callables require staff auth + permission checks
- [x] Cross-customer data visible to staff only (existing staff read rules)
- [x] Exclude/promote must not delete Storage production assets
- [x] No Portal customer access to Studio intake

---

## Data Model Impact

### Promote (idempotent)

1. Require `technicalStatus === ready`, both confirmations, `catalogReviewStatus === pending_staff_review` (or already `sent_to_ai_review` with `promotedDesignId` → return existing)
2. Transaction: create exactly one `designs` doc `status: imported`, `sourceCustomerUploadId`; set upload `promotedDesignId`, `catalogReviewStatus: sent_to_ai_review`
3. Copy production PNG to canonical design original path; ensure design derivatives exist (generate or copy)
4. After commit: enqueue AI once; if enqueue fails, design already exists — retry enqueue without duplicate design

### Exclude

- Set `catalogReviewStatus: excluded_from_catalog`
- Do **not** remove from request; do **not** delete production assets; do **not** enqueue AI

### Reverse exclusion

- Only if `excluded_from_catalog` and `promotedDesignId` is null → back to `pending_staff_review`

### Retry technical

- Only for failed technical statuses eligible for re-finalize; reuse finalize processing path; do not attach/confirm again

### Migration

- Additive; no backfill

---

## Backend Impact

Deploy (`fresh-prints-dev`):

```bash
firebase deploy --only functions:promoteCustomerUploadToAiReview,functions:excludeCustomerUploadFromCatalog,functions:retryCustomerUploadProcessing,functions:restoreCustomerUploadCatalogEligibility,firestore:indexes --project fresh-prints-dev
```

(Include rules only if staff write rules change — prefer Admin-only writes.)

---

## UI / UX Impact

- Section title e.g. “Customer uploads” on `/imports`
- List of `pending_staff_review` (+ optionally show excluded with restore action)
- Detail row/panel with required fields + action buttons
- After promote: toast + link to AI Processing (`/ai-review`)
- Exclusion confirmation copy: artwork stays on the print request

---

## Approach

1. Permission helpers + intake list service/query
2. Callables + unit tests (validation + idempotent promote logic)
3. Studio UI section + wire actions
4. Indexes + docs
5. Deploy + smoke
6. Signoff E → plan F

---

## Test Strategy

| Check | Required |
|-------|----------|
| Unit: promote/exclude/retry validation | yes |
| Functions build | yes |
| Studio typecheck on E-touched files | yes |
| Smoke E on `fresh-prints-dev` | yes |

Smoke:

- [ ] List shows pending upload after C attach (default pending filter)
- [ ] Exclude → status excluded; **production Storage object still exists**; `printRequestItems` still has `customerUploadId`
- [ ] Restore → pending again
- [ ] Promote → one design + `sent_to_ai_review` + enqueue attempted; original path populated
- [ ] Re-promote → same `promotedDesignId` (no duplicate design)
- [ ] Non-owner cannot promote (permission denied)
- [ ] Retry eligible failure path (or document if fixture-limited)

---

## Human Checkpoints Anticipated

- None expected (no new npm deps; no production; standing fresh-prints-dev deploy auth)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Duplicate designs on promote race | Transaction + `promotedDesignId` gate |
| Enqueue fails after design create | Idempotent re-promote / retry enqueue only |
| Scope into F AI verification | Stop at promote+enqueue evidence |

---

## Acceptance Criteria

- [ ] Intake on `/imports` shows required fields
- [ ] Staff actions work per permissions
- [ ] Exclusion does not remove request artwork or production assets or enqueue AI
- [ ] Promotion idempotent; one design; AI enqueued once when successful
- [ ] No fourth Studio workspace
- [ ] E smoke PASS on `fresh-prints-dev`

---

## FreshForge Impact Classification

Documentation only for project docs; no starter surface.

---

## Open Questions

None blocking — parent ADR-FP-073 § promote/exclude is authoritative.
