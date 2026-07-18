# Plan: Close messaging on terminal Assisted Creation requests

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-assisted-terminal-messaging-closed-review.md |

---

## Goal

Disable sending new chat messages on **terminal** Assisted Creation (custom design) requests in Portal and Studio, and fail closed in the send callables so clients cannot bypass the UI.

## Background

Today `customerSendAssistedCreationMessage` and `staffSendAssistedCreationMessage` accept **every** defined status, including terminal ones (`approved`, `rejected`, `cancelled`). Portal and Studio composers always offer Send when the user may mutate. Owner asked to stop messaging once a request is **completed**.

There is no `completed` status in the Assisted Creation model. Terminal / closed statuses are:

| Status | UI label | Role |
|--------|----------|------|
| `approved` | Approved | Successful completion (owner “completed”) |
| `rejected` | Not approved | Terminal decline |
| `cancelled` | Cancelled | Terminal cancel |

**Product decision (this plan):** Close messaging for **all** `ASSISTED_CREATION_TERMINAL_STATUSES` (`approved` | `rejected` | `cancelled`). That matches Past Requests / closed work and avoids a half-open channel after reject/cancel. Open statuses (`submitted` | `in_progress` | `proof_ready` | `revision_requested`) keep messaging. Staff restore from `cancelled` → `submitted` re-enables send automatically via status check.

## Scope

### In Scope

- Shared helper: `canSendAssistedCreationMessage(status)` (true iff open status)
- Portal Messages composer: hide/disable Send + short closed copy when terminal
- Studio Messages composer: same (still respect helper-only view restriction)
- Backend: both send callables reject terminal with `failed-precondition` and a clear message
- Docs: `DATA_MODEL.md`, `BACKEND.md`, short ADR in `DECISIONS.md`
- Unit tests for the shared helper
- Manual QA steps; deploy send callables to `fresh-prints-dev` only (no production)

### Out of Scope

- Changing status machine or adding a `completed` alias
- Hiding the Messages tab / history thread (read-only history stays)
- Changing unread inbox / notifications for historical messages
- Production Functions deploy
- Commits unless asked
- Unrelated skeleton / Halloween prompt work (parked parallel)

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts` (+ `.test.ts`)
- `functions/src/assistedCreationRequests.ts` (`customerSendAssistedCreationMessage`, `staffSendAssistedCreationMessage`)
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`
- `apps/studio/.../AssistedCreationRequestsSection.tsx` (Messages composer)
- `docs/architecture/DATA_MODEL.md`, `docs/architecture/BACKEND.md`, `docs/project/DECISIONS.md`

### Architecture Impact

- [x] Details: Shared pure helper; UI gates on status; services unchanged except callables already own validation.

### Security Impact

- [x] Details: Fail closed server-side (UI is not the only boundary). No rules/index/secret changes.

### Data Model Impact

- [x] Details: Behavior change only — messaging allowed on open statuses only. No schema/migration.

### Backend Impact

- [x] Details: Update allowed-status lists on both send callables. Deploy to `fresh-prints-dev` after implement.

### UI / UX Impact

- [x] Details: Composer replaced or disabled with: “Messaging is closed for completed requests.” Thread remains visible.

### Migration Impact

- [x] None (no data migration). Old terminal-status messages remain readable.

---

## Approach

1. Add `canSendAssistedCreationMessage(status)` next to `isAssistedCreationOpenStatus` / terminal helpers; unit-test open vs terminal.
2. Callables: allow only `ASSISTED_CREATION_OPEN_STATUSES`; on terminal throw `failed-precondition` e.g. “Messaging is closed for completed requests.”
3. Portal `AssistedCreationMessagesPanel`: if `!canSend…`, do not render active composer; show closed explanation.
4. Studio Messages tab: same when terminal; keep existing “Helpers can view but not send” when `!canMutate`.
5. Update DATA_MODEL / BACKEND / ADR; record deploy in workflow Decision Log.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (shared helper) | `npx tsx --test packages/shared/src/constants/assistedCreation/assistedCreation.constants.test.ts` | yes |
| Typecheck / lint / full suite | Not required for this narrow change | no |
| Functions unit | None existing for these callables | no |

### Manual

- [x] Details: See Manual QA below (Portal + Studio open vs terminal; optional callable probe after deploy).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (local Portal + Studio)
- [ ] Design approval
- [ ] Business logic decision — **resolved in plan:** all terminal statuses
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [x] Other: Deploy Functions to `fresh-prints-dev` after implement (record Decision Log)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Owner meant only `approved`, not reject/cancel | Low | Plan documents all-terminal; easy to narrow to `approved` only |
| Staff need post-approve follow-up chat | Medium | Use restore (cancel path) or new request; document in ADR |
| Dev deploy forgotten → UI closed, server still open | Medium | Explicit deploy command + Decision Log |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert shared helper + UI + callable checks; redeploy previous Functions to `fresh-prints-dev`. No data rollback.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md
- [x] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md (ADR-FP-092)
- [ ] Other:

---

## Open Questions

- [x] None — terminal = closed for messaging (confirmed against status model).

---

## Manual QA (for Test phase)

**Environment:** local Portal + Studio against `fresh-prints-dev` after Functions deploy.

### Steps

1. Open request (`submitted` / `in_progress` / `proof_ready` / `revision_requested`) → Messages → Send works (Portal customer + Studio owner/admin).
2. Terminal request (`approved` / `rejected` / `cancelled`) → Messages thread readable; composer hidden/disabled; copy “Messaging is closed for completed requests.”
3. Studio helper on open request → still view-only (unchanged).
4. Optional: call send callable on terminal request → `failed-precondition` with closed message.
5. Restore cancelled → `submitted` → composer returns.

### Pass criteria

- [ ] Open: send works
- [ ] Terminal: no send UI + server rejects
- [ ] History still readable

---

## Deploy (dev only)

```bash
firebase deploy --only functions:customerSendAssistedCreationMessage,functions:staffSendAssistedCreationMessage --project fresh-prints-dev
```

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-assisted-terminal-messaging-closed-review.md
- Verdict: pending
