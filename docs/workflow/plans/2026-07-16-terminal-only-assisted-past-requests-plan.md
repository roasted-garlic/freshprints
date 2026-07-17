# Plan: Terminal-Only Assisted Creation Past Requests

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-16-terminal-only-assisted-past-requests-review.md |
| Parent context | Phase 9C follow-up bug after `phase-9c-assisted-creation` signoff |

---

## Goal

Portal **Past Requests** must list and count only terminal Assisted Creation requests (`approved`, `rejected`, `cancelled`). Open statuses must never appear in that control. When the customer has zero terminal requests, hide the Past Requests link entirely. The current/open request status card stays unchanged.

## Background

Phase 9C Assisted Creation was signed off with owner manual QA `PASS`. Immediately after signoff, Past Requests was observed counting/listing non-terminal (open) requests, which confuses the open-request status experience. This is a narrow client/shared follow-up; production and Firebase deploys are not required.

---

## Scope

### In Scope

- Add typed `isAssistedCreationTerminalStatus` (and a small pure filter helper) based on `ASSISTED_CREATION_TERMINAL_STATUSES` in shared constants.
- Filter Past Requests count, label, drawer list, and selected-record refresh to terminal-only.
- Hide the entire Past Requests control when filtered count is zero.
- Focused unit tests for the terminal helper (and filter helper if extracted).

### Out of Scope

- Changing the open-request status card / current request UX.
- Changing Firestore queries, indexes, or Cloud Functions.
- Changing cancel/update server rules (terminal statuses already disallow those actions).
- Email phase work / provider-agnostic proof-ready email implementation.
- Production or Firebase deploy.
- Broad UI test harnesses or E2E.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts`
- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.test.ts` (or adjacent focused test)
- `apps/portal/features/assisted-creation/components/AssistedCreationPastRequests.tsx`

### Architecture Impact

- [x] Details: Shared status helpers remain the source of truth; Portal UI filters presentation only. No new layers.

### Security Impact

- [x] None — client presentation filter only; server permissions unchanged.

### Data Model Impact

- [x] None — uses existing terminal status set; no schema change.

### Backend Impact

- [x] None — no Functions, rules, or env changes.

### UI / UX Impact

- [x] Details: Past Requests link/drawer shows terminal history only; link hidden when empty. Open status card unchanged.

### Migration Impact

- [x] None

---

## Approach

1. Export `isAssistedCreationTerminalStatus(status)` mirroring `isAssistedCreationOpenStatus`, keyed off `ASSISTED_CREATION_TERMINAL_STATUSES`.
2. Export a pure helper such as `filterAssistedCreationTerminalRequests(requests)` that returns only items with terminal status (typed over `{ status: AssistedCreationStatus }`).
3. In `AssistedCreationPastRequests.tsx`:
   - Derive `terminalRequests` from the subscription payload via the shared filter.
   - Use `terminalRequests` for count, link label, empty state, drawer list, and selected-item refresh lookup.
   - Return `null` (hide control) when `terminalRequests.length === 0` and not loading an error that still needs surfacing — prefer hide when count is zero after successful load; if load error with zero items, hiding is acceptable (no past history to show) or keep a minimal error path only if already visible — **decision:** hide when filtered length is zero; load errors with zero terminal items still hide the control (errors are rare and status card has its own path).
4. Keep actions menu wired to existing `isAssistedCreationOpenStatus` / `canCustomerUpdateAssistedCreation` so terminal detail naturally has no cancel/update.
5. Add unit tests covering all open statuses → false; approved/rejected/cancelled → true; filter keeps only terminal items.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npx tsx --test packages/shared/src/constants/assistedCreation/assistedCreation.constants.test.ts` | yes |
| Portal typecheck | `npm --prefix apps/portal exec tsc -- --noEmit` (or workspace equivalent) | yes; document pre-existing failures if unrelated |
| Targeted lint | ESLint on changed files | yes |
| Full lint | `npm run lint` | document existing unrelated failures |
| Build | not required (client/shared presentation) | no |
| Integration / E2E / backend | N/A | no |

### Manual

- [x] Details: Optional owner smoke after ship — with only an open request, Past Requests link absent; after approve/reject/cancel, link appears with terminal-only list. Not a blocking checkpoint for this narrow logic fix (covered by unit tests).

---

## Human Checkpoints Anticipated

- [ ] Manual UI/UX review — optional smoke only; not required to signoff automated gate
- [ ] Design approval
- [ ] Business logic decision — product rule already specified by owner
- [ ] Production deploy — excluded
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Recent query `limit(10)` may omit older terminals when many opens exist | low | Pre-existing query; out of scope; client filter still correct for returned docs |
| Accidentally hide Past Requests during load flash | low | Hide only when filtered length is zero; subscription starts empty then updates |
| Scope creep into status card | medium | Explicit out of scope; status card unchanged |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the shared helper additions and Past Requests filter/hide changes; reopen link behavior returns to prior (incorrect) listing.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [ ] Other: workflow plan/review/test/signoff only; no product doc change required for this presentation filter

---

## Open Questions

- [x] None

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-16-terminal-only-assisted-past-requests-review.md
- Verdict: pending
