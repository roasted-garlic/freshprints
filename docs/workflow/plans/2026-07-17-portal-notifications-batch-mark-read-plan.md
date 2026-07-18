# Plan: Portal notifications — batch mark-read by request + kind

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase (narrow residual under portal-notifications) |
| Related | docs/workflow/reviews/2026-07-17-portal-notifications-batch-mark-read-review.md |

---

## Goal

When a customer opens an assisted deep-link from a Portal Alerts / history notification, mark **all unread** `customerNotifications` for the same `requestId` and same `kind` (messages vs proofs surface) as read once the destination loads — not only the clicked notification id. Optionally add **Mark all as read** in the Alerts dropdown footer. Do **not** add a Studio-style per-item Read link on Portal.

## Background

Owner report: two unread Portal notifications for the same request/message surface; clicking one leaves the sibling unread. Current behavior in `PortalNotificationsProvider` queues a single `pendingMarkRead.id` and calls `customerNotificationsService.markRead(id)` after `locationMatchesNotificationHref`.

Confirmed product facts from code:
- **Portal** Alerts / history: navigate-on-click + deferred mark-read only. No per-item **Read** control.
- **Studio** Messages inbox: per-row **Read** + reply ack via `assistedCreationUpdateAckService.markReadThrough` — staff-side unread model, not Portal Alerts.

Preferred default (owner-aligned): batch clear same request + same kind/surface on successful deep-link load.

Parked / do not wipe: `portal-notifications-web-push` owner A5/B3 OS toast QA remains open separately.

## Scope

### In Scope
- Batch mark-read: on destination match after opening an unread notification, mark all currently loaded unread items with matching `requestId` + `kind`.
- Service helper: `markReadMany` (Firestore `writeBatch`) reusing existing per-doc update fields (`readAt`, `updatedAt`).
- Pure selector helper + unit test for peer id selection.
- Optional **Mark all as read** control in Alerts panel footer when `unreadCount > 0`.
- Document rule in plan + manual QA steps for owner.
- Update workflow state; preserve web-push human checkpoint as parked prior.

### Out of Scope
- Studio Messages Read link changes.
- Per-item Read link on Portal.
- Changing notification hrefs / adding `requestId` to deep links.
- Functions emitters, FCM / web-push, Firestore rules changes.
- Production deploy or git commit.
- Closing web-push A5/B3 without owner result.

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/notifications/services/customerNotificationsService.ts` — `markReadMany`
- `apps/portal/features/notifications/utils/selectUnreadPeerNotificationIds.ts` (+ test)
- `apps/portal/features/notifications/context/PortalNotificationsProvider.tsx` — pending payload includes `requestId`/`kind`; flush peers; `markAllRead`
- `apps/portal/features/notifications/components/PortalNotificationsBell.tsx` — footer Mark all as read
- `apps/portal/styles/shell.css` — footer layout tweak if needed
- `docs/workflow/reviews/2026-07-17-portal-notifications-batch-mark-read-manual-qa.md`

### Architecture Impact
- [x] Details: Stay in notifications feature layer (provider + service). No UI→Firestore shortcuts beyond existing service pattern.

### Security Impact
- [x] Details: Same owner update rule (customer may only set `readAt`/`updatedAt` on own docs). Batch writes are N independent updates under existing rules. No rules change.

### Data Model Impact
- [x] None (still set `readAt`; history docs remain)

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Opening one unread alert for a request/kind clears peer unread of that kind. Optional Mark all as read. No Read link.

### Migration Impact
- [x] None

---

## Approach

1. Add `selectUnreadPeerNotificationIds(items, { requestId, kind })` → unread ids with same request + kind.
2. Add `customerNotificationsService.markReadMany(ids)` via `writeBatch` (no-op if empty; cap safe under query limit 50).
3. Extend `PendingMarkRead` with `requestId` + `kind`. On destination match, select peers from live `items` (union clicked id), mark many, track flushed ids to avoid double-writes.
4. Expose `markAllRead()` on context: mark all current `unreadItems`, close panel (pinned preview would otherwise stale).
5. Alerts footer: show **Mark all as read** when unread exist.
6. Manual QA doc for owner.

**Product rule (canonical):**
> When a customer opens an assisted notification deep-link (messages or proofs tab) and the destination URL matches, mark **all unread** `customerNotifications` in the loaded recent set with the same `requestId` and same `kind` as read. History items stay history; only unread → read. No Portal per-item Read link required. **Mark all as read** covers cross-request leftover unread.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `node --import tsx --test apps/portal/features/notifications/utils/selectUnreadPeerNotificationIds.test.ts` (or portal package test script if present) | yes |
| Typecheck | Portal `tsc --noEmit` (or workspace portal typecheck script) | yes |
| Lint | if configured for touched files | no |
| Build | no | no |
| Integration | no | no |
| E2E | no | no |
| Backend/rules | no (rules unchanged) | no |

### Manual
- [x] Details: see manual QA doc — two unread same request/kind; click one; both clear. Different kind sibling stays. Mark all as read. History still lists cleared items.

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (owner re-test)
- [ ] Design approval
- [ ] Business logic decision — product default accepted in this plan
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: web-push A5/B3 remains parked separately

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Peer outside query limit 50 not cleared | low | Accept; rare; Mark all as read covers |
| Marking wrong kind (message vs proof) | med | Match `kind` explicitly |
| Pinned Alerts preview stale after Mark all | low | Close panel after mark-all |
| Partial batch failure | low | Log errors; remove flushed ids on failure for retry |

---

## Rollback Plan

Revert provider/service/UI changes; behavior returns to single-id mark-read. No data migration.

---

## Documentation Updates Required
- [ ] Permanent product docs (behavior already implied by Alerts UX; rule captured in plan + QA)
- [x] Other: plan, review, manual QA, workflow state

---

## Open Questions
- [x] None — product default specified by owner brief

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-17-portal-notifications-batch-mark-read-review.md
- Verdict: approved
