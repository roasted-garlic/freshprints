# Plan: Portal customer notification history modal

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | absorbs residual `portal-alerts-click-vanish-badge`; parked `portal-notifications-web-push` |

---

## Goal

Give Portal customers a **notification history** they can reopen after clearing live Alerts: a link in the header Alerts dropdown opens a scrollable modal of **read / cleared** notifications, with the same deep-link navigation as the live panel.

**Owner QA correction (2026-07-17):** Alerts dropdown = **unread only** (`readAt == null`). History modal = **read only** (`readAt != null`). Empty unread still shows “You’re all caught up” with the history link available.

## Background

Owner request: history after clearing/missing alerts. Firestore `customerNotifications` already persists docs; `markRead` only sets `readAt` (no delete). Live dropdown correctly stays short/actionable; history must not dump infinite rows into that panel.

**Coordination:** Narrow residual `portal-alerts-click-vanish-badge` (pin-on-open list + circular badge) is already present in Portal bell/provider/`shell.css`. This phase **absorbs** that residual into one coherent Portal Alerts UX goal — verify residual behavior in manual QA; do not wipe parked Ctrl+Enter or Studio deep-link checkpoints. Web-push deploy remains parked.

## Scope

### In Scope
- Alerts dropdown footer link: “Notification history” (or “View history”)
- Alerts dropdown list: **unread only**; empty → “You’re all caught up” (history link still shown)
- Modal listing **read / cleared** notifications only, newest-first, scrollable
- Cap query at **50**; note pagination/“load more” as future if needed
- History item click: same deep-link + mark-read behavior as live Alerts
- Reuse existing Portal modal pattern (`modal-overlay` + Escape close)
- Confirm rules already allow customer read of own docs (including read); adjust only if a gap is found
- Bump live `subscribeRecent` limit to 50 (or dedicated history fetch) so history and panel share one source
- Manual QA doc for owner; typecheck Portal
- Preserve parked QA checkpoints in workflow state

### Out of Scope
- Web push / VAPID / Functions deploy (except residual alert copy redeploy noted below)
- Brevo
- Infinite scroll / cursor pagination beyond 50
- Permanent delete / purge of notifications
- Studio Messages bell changes
- Commits / production deploy
- Changing mark-read semantics (still mark read on open)
- Backfilling existing `customerNotifications` docs (old titles remain until new alerts)

### Residual (2026-07-17): alert title/body copy
Owner: drop “New message from Fresh Prints”. Emit:
- Message → title `New message`, body = truncated staff message
- Proof → title `New proof`, body = `Review the latest proof for your request.`
Shared helpers in `packages/shared/src/utils/customerNotifications.ts`; emit in `staffSendAssistedCreationMessage` / `staffAddAssistedCreationProof`. **Functions redeploy required** for new alerts.

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/notifications/components/PortalNotificationsBell.tsx`
- `apps/portal/features/notifications/components/PortalNotificationHistoryModal.tsx` (new)
- `apps/portal/features/notifications/context/PortalNotificationsProvider.tsx` (history open state if needed)
- `apps/portal/features/notifications/services/customerNotificationsService.ts` (limit 50)
- `apps/portal/styles/shell.css` (history modal scroll list)
- `firestore.rules` — verify only; change only if read gap found
- Workflow plan / review / manual QA docs

### Architecture Impact
- [x] Details: UI + notifications feature layer only; service owns query; no UI→Firestore bypass

### Security Impact
- [x] Details: Customer read remains `customerUid == auth.uid`; updates still `readAt`/`updatedAt` only. No staff/admin expansion. No new public endpoints.

### Data Model Impact
- [x] None — reuse `customerNotifications`; no schema change

### Backend Impact
- [x] None expected — existing composite index `customerUid` + `createdAt`; no Functions changes. Rules deploy only if a rules gap is fixed (unlikely).

### UI / UX Impact
- [x] Details: Alerts dropdown link + history modal; residual pin/badge already in tree — include in QA

### Migration Impact
- [x] None

---

## Approach

1. **Confirm persistence:** `markRead` updates `readAt` only; `subscribeRecent` does not filter `readAt` — provider loads recent docs once; UI filters. Prefer **reuse provider `items`** to avoid a second listener; raise `limit` from 40 → **50**.
2. **Dropdown:** Pin **unread-only** preview at open (residual pin-on-open). Never fall back to read items when unread is empty. Footer: Close + **Notification history**.
3. **Modal:** Match `AccountNotificationsModal` / `PortalConfirmModal`: `role="dialog"`, `aria-modal`, overlay click + **Escape** to close, scrollable body of **readItems** only. Empty state when no cleared history.
4. **Open item from history:** Call existing `openItem` (close panels → `router.push(href)` → `markRead`).
5. **Rules:** Inspect `match /customerNotifications` — already `allow read` for owner with no `readAt` restriction. Document “no rules deploy needed” unless a gap appears.
6. **CSS:** Max-height scroll region for history list; do not put 50 rows in the small dropdown.
7. **Docs/QA:** Manual steps covering history + residual click-vanish + badge circle.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit` in `apps/portal` | yes |
| Lint | optional | no |
| Unit tests | none for this UI | no |
| Build | no | no |
| Backend/rules | rules review in plan/report; no deploy unless gap | yes (review) |

### Manual
- [x] Details: dropdown unread-only + empty caught-up; history modal read-only scroll-back; click navigates; Escape/overlay close; residual pin + circular badge smoke-check

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (local Portal)
- [ ] Design approval
- [ ] Production deploy (rules only if changed)
- [ ] Other: keep Ctrl+Enter + Studio deep-link QA parked

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Missing composite index after limit change | Low | Same query shape as today; index already exists |
| History shows stale pin from dropdown | Low | Modal uses live `items`, not pinned preview |
| User expects infinite history | Low | Cap 50 + footer note “Showing last 50” |
| Wipe parked QA state | Medium | Explicit park in workflow state |

---

## Rollback Plan

Revert Portal notifications UI/service/CSS changes. No data migration. Rules unchanged unless a temporary rules edit was made — revert that too.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md (optional one-liner that clients may show history of read+unread — skip unless behavior doc gap)
- [ ] BACKEND.md
- [x] Other: workflow plan/review/manual QA

---

## Open Questions
- [x] None

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-17-portal-notification-history-modal-review.md
- Verdict: approved

---

## Absorbed residual (`portal-alerts-click-vanish-badge`)

Already in tree at plan time:
- Pin preview on panel open (`useState` snapshot)
- `openItem`: close → navigate → markRead
- Circular badge CSS (`height`/`min-width`/`padding`)

This phase does not re-implement those; manual QA verifies them alongside history.
