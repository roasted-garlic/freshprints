# Investigation: Portal Alerts missing after staff message

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Goal | portal-notifications-web-push |
| Environment | `fresh-prints-dev` |
| Status | root_cause_found + client hardening |

## Evidence

### Staff send (22:26Z)

- `staffSendAssistedCreationMessage` callable auth valid at `2026-07-17T22:26:12Z`
- Functions + rules + indexes redeployed ~`22:23–22:24Z` (before the send)
- No `notification failed` log (write succeeded)

### Firestore doc **does exist**

| Field | Value |
|-------|-------|
| id | `msg_CJ5H20V4taoDo27BjQxV_1784327173703` |
| customerUid | `XLhapfCG9DZ6k7R17Hy9K5IjpOP2` |
| customerId | `clv0GIjfRp1Gf7GO7yqs` |
| kind | `assisted_staff_message` |
| title | New message from Fresh Prints |
| body | This is a test of the emergency broadcast system. |
| createdAt | `2026-07-17T22:26:13.917Z` |
| href | `/custom-designs?flow=assisted&step=status&detailTab=messages` |

### Customer linkage OK

- `users/{uid}.role` = `customer`, `isActive` = true
- `customers/{id}.userId` matches `customerUid` on the notification + assisted request

### Rules / index OK (live)

- Live Firestore rules include `match /customerNotifications` (release update `22:23:20Z`)
- Composite index `customerUid ASC + createdAt DESC` state **READY**

### Browser push not expected to work yet

- Portal `.env.local`: `NEXT_PUBLIC_FIREBASE_VAPID_KEY` **not set**
- In-app Alerts must still work without VAPID

## Root cause (ranked)

1. **Primary (ops / session):** Emit path worked. Customer likely checked Alerts while:
   - Portal listen failed earlier (rules/indexes not live yet, or transient permission error), and the `onSnapshot` error handler cleared the list and **never resubscribed** until hard refresh; and/or
   - Expected **browser push** (VAPID unset → no push) and treated that as “no alert”
2. **UX bug (fixed in code):** Subscription errors looked like “You’re all caught up” (empty list + error only inside open panel). Listener did not retry on focus / panel reopen.
3. **Ruled out:** Wrong `customerUid`, missing write, missing index, Studio/Portal project mismatch (both `fresh-prints-dev`), silent `createCustomerNotification` failure on this send

## Code fixes (this investigation)

- Portal subscribe uses Auth `firebaseUser.uid`
- Do not clear items on snapshot error; show `!` on Alerts + retry
- Resubscribe on window focus / panel open when errored / Try again
- Functions: structured `notification ok` / `created` logs

## Redeploy needed

| Surface | Needed? |
|---------|---------|
| Portal (local refresh / App Hosting) | **Yes** — client hardening |
| `staffSendAssistedCreationMessage` (+ proof) | Optional — logging only; emit already live |
| Rules / indexes | No — already live |

## Re-test (owner)

### In-app Alerts (must pass without VAPID)

1. Hard-refresh Portal as customer `owner@example.com` (or matching uid above)
2. Open **Alerts** — existing test message should appear unread (doc already in Firestore)
3. From Studio, send a new staff message → badge increments; open → Messages tab
4. If Alerts shows `!`, open panel → **Try again** (or refocus window)

### Browser push (optional)

1. Set `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, restart Portal
2. Account → Notifications → enable browser alerts in this browser
3. Background Portal, send staff message → OS/browser notification
