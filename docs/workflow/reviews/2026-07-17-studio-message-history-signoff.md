# Signoff: Studio Message history modal

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-17-studio-message-history-plan.md |
| Review | docs/workflow/reviews/2026-07-17-studio-message-history-review.md |
| Test report | docs/workflow/reviews/2026-07-17-studio-message-history-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-17-studio-message-history-manual-qa.md |
| Final status | **approved_with_notes** |

---

## Summary

Studio header **Messages** now mirrors Portal Alerts: live dropdown shows **unread only**; **Message history** opens a modal of acked/cleared customer updates (cap ~50). Shared read/unread helpers + unit tests; owner manual QA **PASS**. No deploy required. Parked Portal/Studio QA checkpoints remain open and were not marked PASS.

---

## Changes Delivered

### Behavior

- Unread Messages dropdown lists only unacked customer updates.
- Empty unread shows clear empty state; history link remains available.
- Message history modal lists acked updates only; Escape/overlay close; row deep-links to Assisted Messages tab.
- Clicking unread navigates, updates badge, and moves item into history on reopen.

### Files Created

- `apps/studio/src/renderer/src/features/customer-requests/components/AssistedMessagesHistoryModal.tsx`
- `packages/shared/src/utils/assistedCreationHistory.ts` (shared helpers; may have existed from Portal phase — extended/used here)
- `packages/shared/src/utils/assistedCreationHistory.test.ts`
- `docs/workflow/plans/2026-07-17-studio-message-history-plan.md`
- `docs/workflow/reviews/2026-07-17-studio-message-history-review.md`
- `docs/workflow/reviews/2026-07-17-studio-message-history-test-report.md`
- `docs/workflow/reviews/2026-07-17-studio-message-history-manual-qa.md`
- `docs/workflow/reviews/2026-07-17-studio-message-history-signoff.md`

### Files Modified

- `apps/studio/src/renderer/src/features/customer-requests/context/assistedMessagesContext.ts`
- `apps/studio/src/renderer/src/features/customer-requests/components/AssistedMessagesProvider.tsx`
- `apps/studio/src/renderer/src/features/customer-requests/components/AssistedMessagesBell.tsx`
- `apps/studio/src/renderer/src/styles/components/staff-inbox.css`
- `docs/project/ROADMAP.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`

### Documentation Updated

- Manual QA, test report, signoff for this phase
- Roadmap Phase 9 follow-up note for Studio Message history
- Handoff CURRENT-STATE + recent completed work

---

## Tests

### Automated

- Unit: 9/9 pass (`assistedCreationHistory.test.ts`)
- Studio typecheck: fail documented (pre-existing `ignoreDeprecations` TS5103); in-scope files clean under override
- Lint / full build: skipped (narrow renderer UX; documented)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Unread dropdown + Message history modal + deep-link | **PASS** | Owner (2026-07-17): “I would call this PASS” |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-17 | Studio renderer + shared util only |
| Database migration | not required | | |
| Design / UX | obtained | 2026-07-17 | Manual QA PASS |
| Business / policy | not required | | |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Studio `tsc` ignoreDeprecations TS5103 | low | Pre-existing tooling debt; separate phase |
| Parked deep-link scroll residual | low | Still open as separate QA; not signed off here |

---

## Deferred Items (Roadmap)

Parked (do not wipe; not PASS for this signoff):

- `portal-duplicate-resize-permissions` manual QA (+ optional firestore.rules dev deploy)
- `portal-notification-history-modal` manual QA
- `assisted-messages-ctrl-enter-send` manual QA
- `studio-messages-deeplink-scroll-read-on-reply` manual QA
- `portal-notifications-web-push` deploy/VAPID
- Brevo (later)

---

## Open Blockers

- [x] None for this goal

---

## Verdict

**approved_with_notes** — automated checks pass or documented; owner manual QA PASS; Studio ignoreDeprecations pre-existing; parked QA remains open separately.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed — N/A (no new risks)
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated**
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files — not required (no schema/backend/ADR change)

**Recommended next action for user:** Run parked Portal duplicate/resize manual QA (next in queue), or pick another parked checkpoint (notification history, Ctrl+Enter, Studio deep-link scroll, web-push).
