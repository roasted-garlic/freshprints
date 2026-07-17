# Plan: Phase 9C — Customer additions while submitted

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Planning Agent |
| Status | ready_for_review → **approved** (implemented 2026-07-16) |
| Workflow | managed-phase (narrow amendment under phase-9c-assisted-creation) |
| Parent | docs/workflow/plans/2026-07-16-phase-9c-assisted-creation-plan.md |
| Target | `fresh-prints-dev` only |

---

## Goal

Until an Assisted Creation request is marked **in progress**, the customer can **make additions** to it (edit brief / details and add or adjust references). After `in_progress` (and later statuses), additions are blocked in UI and on the server.

---

## Product interpretation

| Status | Customer additions |
|--------|--------------------|
| `submitted` | Allowed |
| `in_progress`, `proof_ready`, `revision_requested`, terminal | Not allowed |

“Additions” = update the submitted `answers` bag and `referenceImages` (same validation as submit). Optional short update note recorded in `revisionHistory`. No fee, no AI Design, no multi-route `customRequests` revival.

---

## Scope

### In scope

1. Shared helper: `canCustomerUpdateAssistedCreation(status)` → true only for `submitted`
2. Callable `customerUpdateAssistedCreationRequest` — owner customer only; status must be `submitted`; validate answers; merge/replace references (keep existing paths already on the doc + new pending uploads); append revision history; status stays `submitted`
3. Portal: “Update request” on status panel + past-request modal when `submitted`; modal to edit brief (description + key text fields), keep/add references, optional note; hide/disable after staff starts work with clear copy
4. Docs: DATA_MODEL + BACKEND note; unit tests for gate / validation path
5. Deploy note: new callable must be deployed to `fresh-prints-dev` (with any pending 9C callables) before QA of this slice

### Out of scope

- Fee / payment / AI Design
- Editing after `in_progress` (including during revision)
- Full wizard restart / resume-draft of a submitted request
- Production deploy

---

## Approach

- Prefer one callable that accepts full validated `answers` + optional full `referenceImages` list + optional `updateNote`
- Reference list: each entry must be either already on the request (id + storagePath match) or a new pending path under the caller’s prefix
- UI: compact update modal matching Assisted Creation portal patterns (not a second wizard)

---

## Test strategy

| Check | Required |
|-------|----------|
| Shared unit tests for amend gate | yes |
| Functions typecheck/build | yes |
| Portal typecheck | yes |
| Manual: update while submitted; blocked after start work | yes (with deploy) |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Race: staff starts work while customer updates | Transaction re-reads status; reject if not `submitted` |
| Reference path spoofing | Only pending prefix for new files; existing must match doc |

---

## Documentation

- `DATA_MODEL.md` — customer may update answers/refs while `submitted`
- `BACKEND.md` — new callable row

---

## Approval

- Review: docs/workflow/reviews/2026-07-16-phase-9c-customer-additions-while-submitted-review.md
