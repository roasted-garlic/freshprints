# Plan: Cap B overflow = remove-first (rip choose-prints split)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-19-cap-b-remove-first-no-split-review.md |

---

## Goal

Replace Portal Cap B / show-capacity **partial queue (Choose prints split)** with **remove-first**: if the full request does not fit the selected show, block Add to show with clear copy; customer edits quantities (or starts another request later). Server queues **full remaining only** and rejects when over Cap B or capacity.

## Background

Owner product decision (authoritative): Option A — remove-first is best for elderly customers and easiest to maintain. Prior Cap B split allotment bug phase is **superseded** by this behavior change (no partial allotment UI or server path).

## Scope

### In Scope

- Portal `PortalQueueToShowModal`: overflow callout + Cancel / Go edit request; no Choose prints / no Add until fit
- Delete `PortalQueueSplitSelectionModal` and Portal selection-builder helpers for Cap B split
- Shared overflow copy helpers + help modal line (no “split between multiple shows”)
- `queuePortalPrintRequestToShow`: reject `selections`; full-request queue only; Cap B / capacity hard reject with matching copy
- Light docs (`DATA_MODEL` Cap B note), workflow state
- Deploy Functions to `fresh-prints-dev` only; soft-reload Portal guidance

### Out of Scope

- Studio staff split (`SplitDesignPickerModal` / `printRequestSplitAllocation` for Studio)
- Cap A daily quota logic changes
- Production deploy
- Auto-create Request 2 / choose-prints allotment math

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx`
- `apps/portal/features/print-requests/components/PortalQueueSplitSelectionModal.tsx` (delete)
- `apps/portal/features/print-requests/utils/buildPortalQueueToShowSelections.ts` (+ test) (delete)
- `apps/portal/styles/requests.css` (drop unused split-modal rules; keep callout)
- `packages/shared/src/utils/portalShowQueueFit.ts` (+ tests)
- `packages/shared/src/utils/printRequestDailyDesignLimit.ts` (+ tests)
- `packages/shared/src/utils/printRequestPerShowCustomerCap.ts` (+ tests)
- `packages/shared/src/utils/portalShowQueueCapacity.ts` (+ tests)
- `packages/shared/src/types/portal/queuePortalPrintRequestToShow.types.ts`
- `functions/src/queuePortalPrintRequestToShow.ts`
- `functions/src/lib/queuePortalPrintRequestToShowValidation.ts` (+ tests)
- `docs/architecture/DATA_MODEL.md` (Cap B note)

### Architecture Impact

- [x] Details: Remove Portal partial-queue path; callable is full-request-only for Cap B gate.

### Security Impact

- [x] Details: Server remains authoritative; reject over-cap and reject client `selections` (no silent partial).

### Data Model Impact

- [x] Details: Doc-only — Portal no longer documents partial Cap B queue leaving draft remainder via selections.

### Backend Impact

- [x] Details: `queuePortalPrintRequestToShow` behavior change on `fresh-prints-dev`.

### UI / UX Impact

- [x] Details: Remove-first callout; manual QA required.

### Migration Impact

- [x] None (no schema migration). Old clients sending `selections` get validation reject.

---

## Approach

1. Shared copy: remove-first overflow title/body; update help modal + server Cap B/capacity messages.
2. Portal modal: treat non-fit as gate (not split step); primary = Go edit request when overflow; Add only when `fitsEntirely`.
3. Delete split modal + Portal selection builder.
4. Callable: reject `selections`; always queue full remaining; Cap B/capacity reject; log marker `cap-b-remove-first-v1`.
5. Update DATA_MODEL Cap B note; deploy to `fresh-prints-dev`; manual QA checklist.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit | `npm test` (portalShowQueueFit, daily limit help, Cap B messages, validation) | yes |
| Portal unit | delete obsolete selection builder tests | yes |

### Manual

| Scenario | Expected |
|----------|----------|
| Request 50, Cap B 25 | Remove-first callout; cannot Add to show |
| Lower to 25 | Can Add + bidding ack |
| Second request for rest | Works under daily allotment |

---

## Human Checkpoints

- [ ] Manual QA after soft-reload (dev only)
- [ ] No production deploy

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Stale Portal still opens split UI | Soft-reload after deploy |
| Stale Functions still accept selections | Deploy callable; reject selections |

Rollback: Redeploy prior callable revision; restore split UI from git (not preferred — product wants remove-first).

---

## Open Questions

None — owner decision is authoritative.
