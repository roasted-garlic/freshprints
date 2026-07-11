# Plan: Persist staff inbox acks in Firestore

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-10-staff-inbox-firestore-acks-review.md |

---

## Goal

Replace per-device `localStorage` inbox acknowledgments with **Firestore-backed, per-staff-user** acks so Done history syncs across that user’s machines, survives app restarts correctly, and gets cleared by Test Data wipe.

## Locked decisions

- **Ack scope:** per staff user (not team-shared)
- **Toasts/sounds:** unchanged (transition-only while Studio is open)
- **Migration:** one-time import of existing localStorage acks, then clear local keys

## Scope

### In Scope

- Collection `staffInboxAcks` + rules
- Studio Firestore ack service + provider subscription
- Wipe deletes `staffInboxAcks` with print requests / show-queue attachments / upcoming shows
- Docs: DATA_MODEL, SECURITY, DECISIONS (ADR-FP-069), TESTING, DEPLOYMENT

### Out of Scope

- Team-shared Done
- Changing portal-only alert derivation
- Desktop notifications

## Approach

1. Deterministic doc ids `{userId}__{itemIdWithColonsAsUnderscores}`
2. Staff read/create/delete own docs only
3. Provider subscribes by `userId`; prune `show_queue_full` when show no longer full
4. Legacy localStorage migration on mount

## Test strategy

| Check | Required |
|-------|----------|
| Shared unit tests (ack doc id + wipe targets) | yes |
| Functions build | yes |
| Lint touched Studio files | yes |
| Manual QA after rules/wipe deploy | yes |
| Human: deploy rules + wipe callable | yes |

## Human checkpoints

- Deploy `firestore:rules` and `functions:wipeOperationalTestData` to `fresh-prints-dev`
