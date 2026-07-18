# Test Report: Portal Notification Center + Web Push

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Status | passed_with_notes |

## Automated

| Check | Result |
|-------|--------|
| `npx tsx --test packages/shared/src/utils/customerNotifications.test.ts` | pass (3/3) |
| `npm --prefix functions run build` | pass |
| `npm --prefix apps/portal run typecheck` | pass |

## Notes

- Live verification needs Functions + rules + indexes deploy and optional VAPID key for Web Push.
- Next queue after this: **Brevo**.

## Follow-up (same day — alert missing QA)

| Check | Result |
|-------|--------|
| Firestore `customerNotifications` after 22:26Z staff send | **doc exists** (emit OK) |
| Live rules include `customerNotifications` | yes (updated 22:23Z) |
| Index `customerUid`+`createdAt` | READY |
| `npx tsx --test packages/shared/src/utils/customerNotifications.test.ts` (re-run) | pass (3/3) |
| `npm --prefix functions run build` (after log hardening) | pass |
| `npm --prefix apps/portal run typecheck` (after Alerts UX fix) | pass |

See `2026-07-17-portal-notifications-alert-missing-investigation.md`.

## Follow-up (same day — SW race / PushManager)

| Check | Result |
|-------|--------|
| Root cause | `getToken` before `registration.active`; missing explicit `scope: '/'` |
| `GET /api/firebase-messaging-sw` (localhost:3100) | 200; `content-type: application/javascript`; `service-worker-allowed: /` |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `.env.local` | var name **present** (value not logged) |
| `npm --prefix apps/portal run typecheck` (after SW wait fix) | pass |
| Owner browser enable QA | **pending** |

Files: `portalWebPushService.ts`, `app/api/firebase-messaging-sw/route.ts`.

## Follow-up (same day — push enabled but not notifying)

| Check | Result |
|-------|--------|
| Firestore `webPushSubscriptions` for QA customer | **2 docs**, both `enabled:false`, `disabledReason:fcm_invalid_token` |
| FCM dry-run on stored token | HTTP 404 `UNREGISTERED` |
| Portal env vs Console web app | project/sender/apiKey/appId **match** |
| Root cause | Dead FCM tokens + UI stuck on local PushManager + silent no-token skip |
| Fix | Force token refresh; session sync; Refresh button; foreground onMessage; SW return promise; push logging |
| `npm --prefix apps/portal run typecheck` | pass |
| `npm --prefix functions run build` | pass |
| Deploy `staffSendAssistedCreationMessage` + `staffAddAssistedCreationProof` → `fresh-prints-dev` | **success** exit 0 |
| Owner background OS notification QA | **pending** |
