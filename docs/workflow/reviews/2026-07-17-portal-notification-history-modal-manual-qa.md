# Manual QA: Portal customer notification history modal

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Workflow | managed-phase / portal-notification-history-modal |
| Reason | UI/UX verification — unread dropdown + read-only history + residual Alerts polish |
| Status | **PASS** |
| Resolution | Owner PASS 2026-07-17 (unread-only Alerts, history modal, deep-links; absorbed click-vanish/badge) |

---

## What We Need From You

Run the Portal Alerts checks below locally and reply **PASS**, **FAIL: …**, or **PASS WITH NOTES: …**.

---

## Context

**Notification history** from the Alerts dropdown opens a scrollable modal of **cleared / read** alerts (from the last 50). The live Alerts dropdown shows **unread only**. Also smoke-checks residual pin-on-open + circular badge. Web-push deploy remains parked. Ctrl+Enter and Studio deep-link QA stay parked separately.

**Owner correction:** Dropdown must not list older/read messages; history is for scroll-back of cleared alerts.

**Residual alert copy (after Functions redeploy):** New staff message → title **New message**, body = truncated message text. New proof → title **New proof**, body **Review the latest proof for your request.** Existing older docs may still show prior titles until cleared into history.

**Plan:** `docs/workflow/plans/2026-07-17-portal-notification-history-modal-plan.md`

---

## Manual Test Required

**Feature / area:** Portal header Alerts — unread dropdown + read history + residual UX  
**Environment:** local Portal (logged-in customer with at least one past alert preferred)  
**Prerequisites:**
- Portal running against an environment with `customerNotifications` readable by the signed-in customer
- Ideally 1+ unread and 1+ previously read notifications (or mark one read, then check both surfaces)

### Steps

1. With **unread** alerts present: open Portal header **Alerts** → **Expected:** only unread rows (no already-read/older cleared items); footer shows **Notification history** and **Close**.
2. With **no unread** (all caught up): open Alerts → **Expected:** “You’re all caught up.” (or equivalent); **no** list of old read alerts; **Notification history** link still available.
3. Click **Notification history** → **Expected:** dropdown closes; modal opens titled “Notification history”; list shows **read / cleared** alerts only (no unread rows); list scrolls if many items.
4. Press **Escape** → **Expected:** modal closes. Re-open history; click overlay outside panel → **Expected:** modal closes.
5. Open history; click a row → **Expected:** navigates to that alert’s deep link (request/proof/messages path).
6. With an unread alert: open Alerts, click the unread row → **Expected:** row does **not** vanish/flash empty before navigate; panel closes and route changes; badge unread count updates; **re-open Alerts** → that item is **gone** from the dropdown (appears under history instead).
7. With unread count `1` (or low single digit) → **Expected:** red badge looks near-**circular**, not a wide oval; `9+` still readable if applicable.
8. **After Functions redeploy:** staff sends a message → **Expected:** Alerts title **New message**, body shows the message (truncated if long). Staff attaches a proof → **Expected:** title **New proof**, body **Review the latest proof for your request.**

### Pass criteria
- [x] Dropdown never lists read notifications
- [x] Empty unread shows caught-up empty state with history link still available
- [x] History modal lists read (cleared) notifications only
- [x] Click unread → navigate; badge updates; item moves to history on reopen
- [x] Click unread does not empty/vanish awkwardly before navigate (pin-on-open)
- [x] Badge looks circular for single digits
- [x] Escape/overlay close work on history modal
- [ ] (After Functions redeploy) New message/proof alerts use updated title/body copy — **deferred** until Functions redeploy (`APPROVE DEV DEPLOY`)

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS** (owner, 2026-07-17) — Portal notification history QA (unread-only Alerts, history modal, deep-links). Absorbed click-vanish/badge included. Residual “New message” / “New proof” copy still needs Functions redeploy (not part of this PASS).

---

## Files changed (this phase)

- `apps/portal/features/notifications/components/PortalNotificationHistoryModal.tsx` (new)
- `apps/portal/features/notifications/components/PortalNotificationsBell.tsx`
- `apps/portal/features/notifications/context/PortalNotificationsProvider.tsx`
- `apps/portal/features/notifications/services/customerNotificationsService.ts`
- `apps/portal/styles/shell.css`
- `packages/shared/src/utils/customerNotifications.ts` (residual alert copy)
- `packages/shared/src/utils/customerNotifications.test.ts`
- `functions/src/assistedCreationRequests.ts` (residual alert copy emit)
- `docs/workflow/plans/2026-07-17-portal-notification-history-modal-plan.md`
- `docs/workflow/reviews/2026-07-17-portal-notification-history-modal-review.md`
- `docs/workflow/reviews/2026-07-17-portal-notification-history-modal-test-report.md`
- `docs/workflow/reviews/2026-07-17-portal-notification-history-modal-manual-qa.md`
- `.cursor/workflow/state.md`

### Functions redeploy (residual copy — not yet approved)

```bash
firebase deploy --only functions:staffSendAssistedCreationMessage,functions:staffAddAssistedCreationProof --project fresh-prints-dev
```
