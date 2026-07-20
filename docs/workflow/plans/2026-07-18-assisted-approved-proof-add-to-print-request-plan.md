# Plan: Assisted approved proof → Current Request / Stash

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-assisted-approved-proof-add-to-print-request-review.md |
| Roadmap | Small Managed Items Backlog #1 |

---

## Goal

After a Portal customer **approves** an Assisted Creation proof, they can add that approved artwork into their **Current Request (Your Stash)** as a printable line item — without re-uploading the file, and without losing the artwork when the 14-day assisted proof purge runs.

## Background

Today, approve → status `approved`, `approvedProofId` / `approvedAt` set, sibling proofs purged. Portal CTAs are **Download** (14 days) and **Start new request** (new assisted request only). There is **no** path into print requests.

Approved proofs live only on `assistedCreationRequests` under Storage `assisted-creation/.../proofs/...`. They are **not** `designs` or `customerUploads`. Print request items support only `catalog_design` | `customer_upload`.

Closest reuse: `confirmCustomerUploadsAndAttachToRequest` (upload-backed stash items + lazy working request).

Roadmap: Small Managed Items Backlog #1.

---

## Scope

### In Scope

- Portal CTA on approved Assisted Creation Overview / approved-proof surfaces: **Add to request** (or equivalent Stash wording)
- New Portal-customer callable that:
  1. Verifies ownership + `status === approved` + approved proof still has a full-res Storage object (or already ingested)
  2. Copies proof bytes into the customer-upload Storage layout (or equivalent private upload record)
  3. Creates a `customerUploads` doc (print_request purpose) linked for audit to the assisted request/proof
  4. Attaches a `printRequestItems` row (`sourceType: customer_upload`) to the working Current Request (create if needed), qty default **1**, size from image pixels via existing `resolveInitialPrintRequestItemSize`
- Idempotency: if this assisted request was already attached to the **current working** request, do not duplicate; return success with existing item
- Portal UX: success feedback; open Stash / navigate to Current Request; keep Download available while eligible
- Docs: DATA_MODEL, BACKEND, DECISIONS (short ADR), TESTING if new commands
- Unit tests for validation / eligibility / idempotency helpers

### Out of Scope

- Catalog promote / AI Review / public catalog listing of assisted art
- Auto-attach on approve without an explicit customer action
- New `sourceType` on print request items (reuse `customer_upload`)
- Changing the 14-day assisted proof download retention policy
- Donation flow, show-queue quantity caps, upload daily caps (#2–#3)
- Production deploy
- Staff Studio “add proof to print request” UI (customer Portal only unless review expands)

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/` — new callable e.g. `customerAddAssistedApprovedProofToPrintRequest.ts` (+ shared lib for copy/ingest)
- `functions/src/index.ts` — export
- `packages/shared/src/types/` — request/response types; optional fields on `CustomerUpload` for `assistedCreationRequestId` / `assistedProofId`
- `apps/portal/features/assisted-creation/` — status panel / approved card CTA + service method
- `apps/portal/features/print-requests/` — refresh working request / open drawer after success (reuse context)
- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `docs/project/DECISIONS.md`

### Architecture Impact

- [x] Details: New orchestration callable in Functions; Portal UI calls service → callable only (no client Storage copy). Reuses working-request + customer_upload item patterns.

### Security Impact

- [x] Details: AuthZ = Portal customer owner of assisted request only. Validate status, proof id, Storage presence. Do not expose other customers’ proofs. No secrets. Idempotent attach.

### Data Model Impact

- [x] Details: New optional audit fields on `customerUploads` (`assistedCreationRequestId`, `assistedProofId`). Optional denormalized `printRequestItemId` / flag on assisted request for “already added” UX. No new top-level collection. No new print-request `sourceType`.

### Backend Impact

- [x] Details: One new callable; Admin Storage copy + Firestore writes in a transaction where possible. Dev deploy of that callable required before manual QA. No env/secrets changes.

### UI / UX Impact

- [x] Details: Portal approved Assisted surfaces gain **Add to request**; disabled/hidden when purged and never ingested, or already on working request (show “Already in request”). Manual UI checkpoint required.

### Migration Impact

- [x] None (forward-compatible optional fields)
- [x] Forward steps: deploy callable to `fresh-prints-dev` before QA
- [x] Rollback: hide CTA / undeploy callable; orphan upload docs are wipeable via existing ops tools

---

## Approach

### Recommended product defaults (awaiting human confirm)

| Decision | Recommendation | Rationale |
|----------|-----------------|-----------|
| Destination | Always **Current Request / Stash** (lazy create) | Matches catalog + upload attach |
| Item kind | **`customer_upload`** (private), not catalog design | Staff already print uploads; no AI Review delay |
| Qty / size | Qty **1**; size from proof pixels via existing sizing util | Same as upload attach |
| Storage | **Server copy** into customer-upload paths | Survives 14-day assisted purge |
| Timing | CTA while full-res exists **or** already ingested; hide if purged & never added | Honest UX |
| Catalog | Not listed / not donated | Private print-only |
| Idempotency | One line on working request per assisted request | Avoid duplicates |

### Implementation steps

1. Shared types + eligibility helper (approved, owner, file present or prior ingest).
2. Callable: resolve proof → download Admin Storage → write customer upload storage + doc → `resolveOrCreateWorkingPrintRequestInTransaction` → create item (mirror confirm-attach sizing).
3. Portal service method + CTA on `AssistedApprovedDesignCard` / approved status panel.
4. Wire Stash refresh / open drawer after success.
5. Unit tests for helpers; typecheck/lint; document callables.
6. Manual QA on `fresh-prints-dev` after callable deploy.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck` (or workspace equivalent for touched packages) | yes |
| Lint | project lint for touched packages | yes |
| Unit tests | helpers for eligibility / idempotency | yes |
| Build | Portal build if UI touched | yes if UI |
| Integration | none unless emulator harness exists | no |
| E2E | none | no |
| Backend/rules | callable unit/validation tests; rules only if Storage path rules need update | as needed |

### Manual

- [x] Details: Approve assisted proof → Add to request → item appears in Stash with preview; qty/size editable; queue-to-show still works for upload-backed items; Download still works; second Add is idempotent; after 14d purge simulation, already-added item remains printable.

---

## Human Checkpoints Anticipated

- [x] Business logic decision — **confirm recommended defaults above before implement**
- [x] Manual UI/UX review — after implement
- [ ] Design approval
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: **APPROVE DEV DEPLOY** of new callable before manual QA

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Product path wrong (catalog vs stash) | High | Human confirm defaults first |
| Proof lacks width/height metadata | Medium | Probe image dimensions on ingest (upload pipeline pattern) |
| Duplicate stash lines | Medium | Idempotency key = assisted request id on working request |
| Purge races add | Medium | Copy first; fail closed if object missing |
| Large PNG memory in callable | Medium | Stream/copy with size caps aligned to proof max bytes |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Remove Portal CTA; stop exporting callable. Existing attached upload items remain valid print lines. No production impact if never deployed outside `fresh-prints-dev`.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md
- [x] BACKEND.md
- [x] TESTING.md (if new test commands)
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md (short ADR)
- [x] Other: ROADMAP small-items row status on complete

---

## Open Questions

- [x] **Confirm recommended defaults table** — owner **APPROVE DEFAULTS** 2026-07-18 (see human checkpoint)
- [x] CTA label: **Add to Request** (beside Download PNG)
- [x] Chrome pill: **Current Request** (header + FAB/drawer chrome)
- [x] Allow add to a **past** request? **No** — working request only
- [x] Skip customer upload PNG / transparency / quality gates for staff-provided proofs

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-18-assisted-approved-proof-add-to-print-request-review.md
- Verdict: approved_with_changes (defaults confirmed)
- Human checkpoint: docs/workflow/reviews/2026-07-18-assisted-approved-proof-add-to-print-request-human-checkpoint.md
