# Review: Studio Staff Operations Inbox

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Plan | `docs/workflow/plans/2026-07-08-studio-staff-operations-inbox-plan.md` |
| Verdict | **approved** |

## Summary

User confirmed MVP: realtime portal listeners, sidebar badges + toast, header inbox with check-off (local ack), Print Requests tab helper. No schema changes; staff read-only Firestore subscriptions; acks in localStorage.

## Security

- No new attack surface; uses existing staff permissions.
- Acks are local-only (acceptable for single-operator MVP).

## Architecture

- Follows existing inbox pattern (AI Review) at app-shell level.
- Shared derivation keeps Studio UI thin.

## Required changes before implement

None.

## Approval

Approved to implement per user request 2026-07-08.
