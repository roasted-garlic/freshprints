# Plan: Customer cancel reason (assisted creation)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-assisted-customer-cancel-reason-review.md |

---

## Goal

When a Portal customer cancels an assisted creation request, require a non-empty cancel reason, persist it on the request (server-validated), and surface it in Studio Overview for cancelled requests.

## Background

Owner: browser push QA PASS, then require cancel reason, then Brevo. Staff cancel/reject/restore already require a reason via `staffUpdateAssistedCreationStatus`. Customer cancel (`cancelAssistedCreationRequest`) only writes a fixed history note `"Cancelled by customer"` with no reason field.

## Scope

### In Scope

1. Require `reason` on `cancelAssistedCreationRequest` (trim, non-empty, max `ASSISTED_CREATION_FIELD_LIMITS.revisionNote`).
2. Persist `customerCancelReason` on the request document; include reason text in revision history note.
3. Portal cancel confirm UI: required textarea; confirm disabled until non-empty (Status panel + Past Requests).
4. Studio Overview: show customer cancel reason when status is `cancelled` and field is present.
5. Docs: `DATA_MODEL.md`; manual QA steps for owner.
6. Deploy `cancelAssistedCreationRequest` to **`fresh-prints-dev` only** so local QA works.

### Out of Scope

- Changing staff cancel/reject UX (already has reason)
- Production deploy
- Brevo / email / web-push changes
- Backfill of historical cancels
- New Firestore indexes or rules (callables + Admin SDK only)

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/.../assistedCreationActions.types.ts` — request payload
- `packages/shared/.../assistedCreation.types.ts` — `customerCancelReason?`
- `functions/src/assistedCreationRequests.ts` — validate + persist
- `apps/portal/.../assistedCreationService.ts` — pass reason
- `apps/portal/.../AssistedCreationStatusPanel.tsx`, `AssistedCreationPastRequests.tsx`
- `apps/portal/.../PortalConfirmModal.tsx` — optional `confirmDisabled`
- `apps/studio/.../assistedCreationRequestsService.ts` + Overview UI
- `docs/architecture/DATA_MODEL.md`

### Architecture Impact

- [x] Details: Portal UI → service → callable; Studio read via existing Firestore listen. No layer violation.

### Security Impact

- [x] Details: Server-side required reason; ownership already enforced; do not trust client-only disable.

### Data Model Impact

- [x] Details: Additive optional `customerCancelReason: string` on `assistedCreationRequests`. No migration/backfill.

### Backend Impact

- [x] Details: Callable contract change — clients must send `reason`. Redeploy function to `fresh-prints-dev`.

### UI / UX Impact

- [x] Details: Cancel confirm gains required reason field; Studio shows reason on cancelled Overview.

### Migration Impact

- [x] None (additive field). Old cancelled docs lack the field; Studio hides empty.

---

## Approach

1. Extend shared types.
2. Validate with existing `asRequiredReason` in `cancelAssistedCreationRequest`; write field + history note.
3. Portal: collect reason; disable confirm when empty; pass to service.
4. Studio: map field; render under status/Overview when cancelled.
5. Typecheck/build; deploy function to `fresh-prints-dev`; manual QA doc.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck Portal | `npm --prefix apps/portal run typecheck` | yes |
| Build Functions | `npm --prefix functions run build` | yes |
| Lint | — | no (skip unless quick) |
| Unit | — | no (narrow; validation reuses helpers) |

### Manual

- [x] Details: Cancel with empty reason blocked; with reason succeeds; Studio shows reason; staff cancel unchanged.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (owner QA after implement)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env
- [x] Other: Dev Functions deploy to `fresh-prints-dev` (session standing for small callable updates)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Old Portal clients omit reason | low | Server rejects; owner uses refreshed Portal |
| Function not deployed | medium | Deploy to `fresh-prints-dev` in implement |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Redeploy previous `cancelAssistedCreationRequest` or make `reason` optional again; field remains harmless on docs.

---

## Documentation Updates Required

- [x] DATA_MODEL.md
- [ ] Other: plan/review/test/manual QA / state

---

## Open Questions

- [x] None

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-assisted-customer-cancel-reason-review.md
- Verdict: approved
