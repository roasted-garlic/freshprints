# Plan: Portal Notification Center + Web Push

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-portal-notifications-web-push-review.md |

---

## Goal

Give Portal customers an in-app **notification center** (header bell + dropdown) for waiting proofs and staff messages, plus optional **browser Web Push** (Chrome / Firefox / Opera) when they allow notifications—so they are not dependent on email alone.

## Background

Studio Messages inbox is owner-accepted. Owner order: Portal notifications + Web Push → then Brevo. No Portal notification center or push exists today; proof-ready email opt-in already lives on Account Settings.

## Scope

### In Scope

1. **In-app notifications**
   - Firestore `customerNotifications` written by Admin SDK when:
     - Staff adds a proof (`staffAddAssistedCreationProof` → proof ready)
     - Staff sends a Messages chat note (`staffSendAssistedCreationMessage`)
   - Portal header bell + unread badge + dropdown (truncated body, time, deep link to Assisted status / Messages)
   - Customer mark-read (`readAt` on own notification docs)
   - Rules: customer read own; update only `readAt`/`updatedAt`; no client create/delete

2. **Web Push (FCM web)**
   - Service worker + `firebase/messaging` getToken
   - Store tokens under `customers/{id}/webPushSubscriptions/{id}`
   - Callable to register/unregister subscription
   - After creating a notification, attempt FCM multicast to that customer’s tokens
   - Account Settings: enable browser alerts + permission prompt; separate from email opt-in (`assistedBrowserPushOptIn`)

3. **Docs / deploy notes**
   - DATA_MODEL, BACKEND, SECURITY, manual QA
   - Human: Firebase Cloud Messaging Web Push certificates (VAPID) + secret/env for Functions

### Out of Scope

- Brevo
- Push for non-Assisted events (print requests, marketing)
- Native mobile apps / iOS APNs beyond web
- Replacing proof-ready email (email stays; push + in-app are additive)
- Studio customer-facing UI

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/assistedCreationRequests.ts` (emit notifications + push)
- `functions/src/lib/customerNotifications/` (create + push helpers)
- `functions/src/index.ts` (register callable if needed)
- `firestore.rules`
- `apps/portal/features/notifications/` (provider, bell, services)
- `PortalAppHeader.tsx`, `PortalAppShell.tsx`, `shell.css`
- `AccountNotificationsModal.tsx` + prefs service
- `apps/portal/public/firebase-messaging-sw.js`
- `packages/shared` types/constants for notification kinds
- Docs as above

### Architecture Impact

- [x] Portal UI → services → Firestore listen; server emitters in Functions; FCM Admin for push

### Security Impact

- [x] Ownership on notifications + subscriptions; least-privilege rules; validate token register callable; no secrets in client beyond public VAPID

### Data Model Impact

- [x] New `customerNotifications`; subcollection `webPushSubscriptions`; optional `assistedBrowserPushOptIn` on customer

### Backend Impact

- [x] Emit from existing staff callables; FCM send; optional `registerWebPushSubscription` callable
- Env: `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (client); Functions use Admin SDK (no VAPID secret if using FCM web config in console)

### UI / UX Impact

- [x] Header bell; Account notifications modal extended; permission UX

### Migration Impact

- [x] Forward: empty collections; no backfill required
- [x] Rollback: disable emitters / remove bell; leave docs

---

## Approach

1. Shared types: `CustomerNotificationKind`, payload shape, href builders.
2. `createCustomerNotification` Admin helper (idempotent IDs where possible).
3. Call from proof add + staff message (after successful write).
4. Firestore rules for notifications + push subscriptions.
5. Portal provider: subscribe unread/recent notifications for current customer.
6. Bell UI (Studio Messages pattern, Portal tokens).
7. Mark read on open / explicit.
8. Web Push: SW, getToken, register callable, send on notify if `assistedBrowserPushOptIn !== false` and permission granted tokens exist.
9. Settings modal: browser push toggle + “Enable in this browser” button.
10. Tests + manual QA; deploy commands for Functions + rules.

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Shared unit for href/kind helpers | yes |
| Functions build | yes |
| Portal typecheck | yes |

### Manual

- Staff proof → customer sees bell item → open → status/proofs
- Staff message → bell → Messages tab
- Mark read clears badge
- Enable browser notifications → receive push while Portal backgrounded (dev HTTPS or localhost)

---

## Human Checkpoints Anticipated

- Firebase Console: enable Cloud Messaging + Web Push certificates; provide VAPID key for Portal env
- `APPROVE DEV DEPLOY` for Functions + `firestore:rules`
- Visual QA of Portal bell + Settings

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Push flaky without HTTPS | Document localhost OK for Chrome; production needs HTTPS |
| Token churn | Upsert by endpoint/token; prune on FCM errors |
| Notification spam | One notify per proof; one per staff message; no customer self-notify |

---

## Open Questions

None blocking — kinds limited to proof_ready + staff_message for MVP.

---

## Next after this

**Brevo** (owner queue). Parked: any undeployed Assisted message/notes Functions, invite continue URL.
