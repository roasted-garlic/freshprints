# Manual QA: Portal Notification Center + Web Push

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | Portal + Studio against `fresh-prints-dev` |
| Status | pending_retest — FCM success but OS toast missing; display-path fix shipped |

---

## Hard re-diagnosis (2026-07-18 — still no OS toast)

### Live evidence (Functions logs, `fresh-prints-dev`)
After the invalid-token fix + redeploy (~23:58Z), staff sends **did** hit FCM successfully:

| Time (UTC) | Log | Meaning |
|------------|-----|---------|
| 00:06:59 | `registerWebPushSubscription` auth VALID | Fresh token saved after refresh |
| 00:07:21 | `web push send result` `tokenCount:1` `successCount:1` `failureCount:0` | **FCM accepted delivery** |
| 00:08:03 | `web push send result` `tokenCount:2` `successCount:1` `failureCount:1` (`NotRegistered`) | One live token + one stale sibling |

In-app Alerts continued to create (`[customerNotifications] created` + `[staffSendAssistedCreationMessage] notification ok`).

### What this means
**Server send is not the blocker anymore.** Root cause this round is **display path / environment**, not missing tokens:

1. **Code bug (fixed):** Admin send used `webpush.fcmOptions.link` with a **relative** Portal path (`/custom-designs?...`). Firebase docs require **HTTPS** click URLs; relative/http links can suppress Chrome OS toasts while FCM still returns `successCount >= 1`.
2. **Code bug (fixed):** Mixed `notification` + SW `showNotification` left display ambiguous. Switched to **data-only** payload so SW / foreground `onMessage` always call `showNotification`.
3. **Code bug (fixed):** Force-refresh left older `enabled:true` siblings until the next failed send. Register now disables sibling tokens (`replaced_by_newer_token`).
4. **Likely environmental (owner must verify):** Windows Focus Assist / Do Not Disturb, Chrome site quieter notifications, or Windows → System → Notifications → Google Chrome off. Local enable smoke toast (below) separates this from FCM.

### Verified healthy (not the bug)
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` present in Portal `.env.local` (length checked; value not logged)
- Project `fresh-prints-dev`; SW route returns full Firebase config (no empty fields); `Cache-Control: no-store`
- `createCustomerNotification` **awaits** push; push errors are caught inside helper (do not fail in-app write)
- Opt-in defaults on (`assistedBrowserPushOptIn !== false`)

### Fix shipped + deployed (2026-07-18)
1. **Data-only** FCM payload (`title`/`body`/`href`/`notificationId` in `data`) + `Urgency: high`; removed relative `fcmOptions.link`
2. SW + foreground handlers read **data first**, then notification fallback; SW uses `tag`
3. **Local smoke notification** immediately after Enable/Refresh (“Browser alerts are working…”) — no FCM involved
4. Register stores `origin`; clears `disabledReason` on re-enable; disables sibling enabled tokens
5. Deployed to `fresh-prints-dev` (exit 0): `staffSendAssistedCreationMessage`, `staffAddAssistedCreationProof`, `registerWebPushSubscription`
6. Portal typecheck pass

### Owner test checklist (do in order — do not skip)

**A. Prove OS notifications work at all (no staff needed)**
1. Open Portal at `http://localhost:3100` (same browser you use for QA).
2. Hard refresh: `Ctrl+Shift+R` (or DevTools → Application → Service Workers → **Unregister** any `/api/firebase-messaging-sw`, then hard refresh).
3. Confirm DevTools → Application → Service Workers shows an **activated** worker for `/`.
4. Open **Alerts** → **Enable browser alerts** (or Account → Notifications) → click **Enable alerts in this browser** or **Refresh browser alerts**.
5. **Expected immediately:** OS toast titled **“Fresh Prints”** with body about browser alerts working.
   - If **this** toast is missing → stop. Fix OS/Chrome first (section C). Server is fine.
   - If this toast **appears** → continue to B.

**B. Prove FCM → OS toast (staff message)**
1. Leave that same Portal window **signed in**, then put it in the **background** (switch to another tab **or** minimize the window — do not close the tab).
2. In Studio, send an Assisted **Messages** note to that customer’s request.
3. **Expected within a few seconds:** OS toast **“New message”** (or proof title) near the Windows clock / notification corner; also check Windows Notification Center (`Win+N`) if no floating toast.
4. Optional: bring Portal tab to **foreground** and send again → expect another OS toast (foreground `onMessage` path). Console should log `[portalWebPush] foreground message received`.
5. Success in Functions logs looks like:
   ```
   [customerNotifications] web push send result { … successCount: 1 … payload: 'data_only' … }
   ```
   Fail / skip lines to report if no toast:
   - `web push skip: no enabled tokens`
   - `web push skip: opted out`
   - `successCount: 0` with `messaging/registration-token-not-registered`

**C. If local smoke (A5) fails — check environment**
1. Chrome padlock / site settings for `http://localhost:3100` → Notifications = **Allow** (not quieter).
2. `chrome://settings/content/notifications` → localhost allowed; not blocked.
3. Windows **Settings → System → Notifications** → **On**; **Google Chrome** = On; Focus Assist / Do Not Disturb = **Off**.
4. Try another Chromium profile or Edge only after A5 fails in Chrome.

### Pass criteria
- [ ] Local enable/refresh smoke toast appears (A5)
- [ ] Background staff message produces OS toast (B3)
- [ ] Functions log shows `successCount >= 1` and `payload: 'data_only'`

### Please reply with
- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
- Especially: did step **A5** local smoke toast show? Yes/No

---

## Bug fix (2026-07-17 — browser push enabled but not notifying)

### Evidence
- Customer `clv0GIjfRp1Gf7GO7yqs` had **2** `webPushSubscriptions`, both `enabled: false`, `disabledReason: fcm_invalid_token`.
- FCM dry-run against those tokens → HTTP 404 `UNREGISTERED` / `NotRegistered`.
- Portal Firebase config matches Console web app (project, sender, apiKey, appId).
- `registerWebPushSubscription` succeeded (23:44 / 23:47); staff messages created in-app alerts (23:50+) with **no enabled tokens** → silent push skip.
- UI “enabled” used **local** PushManager subscription only, so Enable stayed locked while server tokens were dead.

### Root cause
FCM rejected stored registration tokens as UNREGISTERED. Server disabled them. Subsequent sends found zero enabled tokens and skipped push with no log. Client still looked “enabled” and could not re-subscribe without force-refresh.

### Fix shipped
1. **Force-refresh** on Enable / once per tab session when permission already granted (`deleteToken` + PushManager unsubscribe → new `getToken` → register).
2. Settings button becomes **Refresh browser alerts** (still clickable) when subscribed.
3. **Foreground** `onMessage` → `showNotification` (FCM does not show OS chrome while the Portal tab is focused).
4. SW `onBackgroundMessage` **returns** `showNotification` promise.
5. Functions push helper logs skip reasons + send success/failure counts.
6. Deployed `staffSendAssistedCreationMessage` + `staffAddAssistedCreationProof` to `fresh-prints-dev` (exit 0).

---

## Residual notes (prior)

Alert click navigate-first, settings UX polish, and “no active Service Worker” fixes remain as previously shipped. See git history / earlier sections in workflow state if needed.

### Deploy / refresh for retest

```bash
# Completed 2026-07-18 (display-path fix):
firebase deploy --only functions:staffSendAssistedCreationMessage,functions:staffAddAssistedCreationProof,functions:registerWebPushSubscription --project fresh-prints-dev
```

Hard-refresh local Portal before re-test (new SW + local smoke toast).

---

## Manual Test Checkpoint

**Feature / area:** Portal Alerts bell + browser Web Push for Assisted proofs/messages  
**Prerequisites:** Portal hard-refresh with latest client; Functions on `fresh-prints-dev`; VAPID set; customer + staff accounts.

### Pass criteria

- [ ] In-app Alerts for staff message + proof
- [ ] Local enable smoke toast (A5) + background FCM toast (B3)
- [ ] Functions log `successCount >= 1` with `payload: 'data_only'`

### Please reply with

- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
- Especially: A5 local smoke toast Yes/No
