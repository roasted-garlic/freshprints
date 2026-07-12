# Plan: Portal Customer Artwork Upload — Sub-phase F (AI Handoff → Design Library)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` |
| Depends on | Sub-phase E signed off on `fresh-prints-dev` |
| ADR | ADR-FP-073 |

---

## Goal

Verify and harden the path: **promote → AI enrich (`catalog-enrich-v21`) → AI Review approve → Design Library / Portal catalog**, and prove **AI rejection does not unlink or delete request artwork** (upload production assets + `printRequestItems.customerUploadId` remain).

Sub-phase E already promotes and enqueues. F is primarily **verification + any narrow fixes** discovered while proving the chain — not a redesign of AI Review.

---

## Scope

### In Scope

1. **Smoke harness** `functions/scripts/smoke-customer-upload-subphase-f.mjs` on `fresh-prints-dev`:
   - Attach → promote → wait until design `aiReviewStatus === needs_review` (or use E-style promote that already enqueues)
   - Owner **approve** via same field updates as `catalogApprovalService` / `applyCatalogApprovalUpdate` (Admin SDK write mirroring client shape) → `status: ready`
   - Assert Portal-readable: design `status === ready` with title + thumbnailPath
   - Second fixture (or sequential): promote → set/reject to `status: rejected` → assert `printRequestItems` still has `customerUploadId`, production Storage still exists, upload `productionStoragePath` unchanged
2. **Gap fixes only if smoke reveals bugs** within:
   - Approve/reject must not mutate `printRequestItems` or delete upload/design originals incorrectly
   - Intake UX: optional link/status clarity for `sent_to_ai_review` rows (Open AI Processing already exists) — only if needed for staff confusion during F
3. Docs: TESTING, ROADMAP, BACKEND notes; DATA_MODEL note that upload stays `sent_to_ai_review` after design approve/reject (linkage via `promotedDesignId` / `sourceCustomerUploadId`)

### Out of Scope

- New AI prompts / model changes
- New catalog review statuses on uploads (`approved`/`rejected` on upload) — ADR keeps `sent_to_ai_review` + `promotedDesignId`
- Sub-phase G cleanup / wipe / full E2E UI / owner visual checkpoint
- Production deploy
- Changing Portal catalog query model
- Unparking wipe

### Binding invariants

| Invariant | Rule |
|-----------|------|
| Request art independence | Approve/reject design must **not** remove `printRequestItems` rows or clear `customerUploadId` |
| Storage | Reject must **not** delete upload `productionStoragePath` or design `originalPath` |
| Catalog visibility | Only `designs.status === ready` appears in Portal catalog / Studio Design Library |
| Upload catalog status | Remains `sent_to_ai_review` after promote; design outcome lives on `designs` |

---

## Affected Areas

### New

| Path | Role |
|------|------|
| `functions/scripts/smoke-customer-upload-subphase-f.mjs` | F verification harness |

### Possibly modified (only if gaps found)

| Path | Change |
|------|--------|
| Studio intake detail copy/actions | Clarify promoted → AI outcome |
| Docs | TESTING, ROADMAP, DATA_MODEL clarification |

### Reuse

- Existing `catalogApprovalService` / `buildAiReviewApprovedFields` / `buildAiReviewRejectedFields`
- E promote callable + smoke auth pattern (separate staff Firebase app)
- Portal `catalogService` query (`status == ready`)

---

## Architecture Impact

- [x] No new workspace; no new AI pipeline
- [x] Verification prefers Admin-mirrored approve/reject field writes in smoke (same fields as Studio client) rather than Electron UI automation

---

## Security Impact

- [x] Smoke uses temporary owner/customer accounts on `fresh-prints-dev` only
- [x] No rules relaxation for catalog reads

---

## Data Model Impact

- Document: after promote, design approve/reject does not change `customerUploads.catalogReviewStatus` (stays `sent_to_ai_review`)
- No schema migration

---

## Backend Impact

- No new callables expected
- Redeploy only if a gap fix requires Function changes

---

## Approach

1. Write F smoke (approve path + reject isolation path)
2. Run on `fresh-prints-dev`; fix only failures in scope
3. Docs + signoff → plan G

---

## Test Strategy

| Check | Required |
|-------|----------|
| F smoke on `fresh-prints-dev` | yes |
| Functions build (if code changed) | if applicable |
| Unit: existing catalog approval field builders | reuse; run if touched |

Smoke checklist:

- [ ] Promote → needs_review (or enrich completes)
- [ ] Approve → `status: ready`; Portal catalog eligibility fields present
- [ ] Reject path → request item + upload production Storage preserved
- [ ] Helper cannot approve (if exercised) or document covered by existing permission tests

---

## Human Checkpoints Anticipated

- None expected for automated F smoke
- Full owner visual E2E remains Sub-phase G

---

## Risks

| Risk | Mitigation |
|------|------------|
| AI enrich slow/flaky in smoke | Poll with timeout; allow promote response that already completed enrich (E pattern) |
| Scope creep into G | Stop after verification + narrow fixes |

---

## Acceptance Criteria

- [ ] F smoke PASS on `fresh-prints-dev`
- [ ] Documented proof: reject does not unlink request artwork
- [ ] Approved design is Portal/Library eligible (`ready`)
- [ ] No fourth workspace; wipe still parked

---

## FreshForge Impact Classification

Documentation + verification tooling for Fresh Prints product; no starter surface.

---

## Open Questions

None blocking — parent Sub-phase F definition is authoritative.
