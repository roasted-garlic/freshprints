# Plan: Portal halftone checkbox optimistic UI

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-portal-halftone-checkbox-optimistic-review.md |

---

## Goal

Make the Portal upload “This artwork is a halftone design.” checkbox feel instant: toggle paints immediately; persistence (`recordCustomerUploadHalftoneResponse`) runs in the background with rollback + retry on failure.

## Background

Owner reports the checkbox takes forever to fill. Today `respondToHalftone` sets draft + `halftoneResponseSaving: true` and the checkbox is `disabled` while saving (and also while `isBusy` from other files). The callable round-trip can take seconds, so the control feels stuck.

## Scope

### In Scope
- Portal `useCustomerUploadBatch.respondToHalftone` + `CustomerUploadPanel` checkbox UX
- Optimistic draft update; do not disable the checkbox while a save is in flight
- Do not gate this checkbox on batch `isBusy` (other files uploading/processing)
- Latest-wins in-flight saves; on failure revert to last confirmed value and keep Retry
- Keep existing callable/backend unchanged

### Out of Scope
- Studio staff Halftone toggle (separate control; not the reported copy)
- Changing Firestore rules or callable contract
- Prefetch / catalog caching work

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/customer-uploads/hooks/useCustomerUploadBatch.ts`
- `apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx`

### Architecture Impact
- [x] None — hook + panel only; service still owns callable

### Security Impact
- [x] None — same authenticated callable

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: checkbox toggles instantly; errors/retry remain if save fails

### Migration Impact
- [x] None

---

## Approach

1. Track `halftoneResponseConfirmed` (last successfully persisted yes/no) per row.
2. On toggle: immediately set draft; fire callable without disabling the input; bump a generation token so stale responses cannot overwrite newer drafts.
3. On success: update confirmed; clear saving/error.
4. On failure: revert draft to confirmed (or `null`/`no` default); surface error + Retry.
5. Panel: `disabled` only for attach in progress if needed — not for `halftoneResponseSaving` or batch `isBusy`.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Unit tests | n/a for this UX | no |
| Build | no | no |

### Manual
- [x] Toggle halftone on a ready upload — checkmark appears immediately
- [x] Toggle off immediately after — UI follows without waiting
- [x] Offline / force failure — reverts + shows Retry; Retry works

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (quick PASS after implement)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rapid toggles race | low | generation / latest-wins |
| Attach before save completes | low | attach already requires ready rows; server still authoritative; optional note if draft ≠ confirmed (defer unless needed) |

---

## Rollback Plan

Revert the two Portal files; behavior returns to await-disabled checkbox.

---

## Documentation Updates Required
- [ ] None required beyond workflow artifacts (no product behavior doc change beyond UX snappiness)

---

## Open Questions
- [x] None

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-14-portal-halftone-checkbox-optimistic-review.md
- Verdict: approved
