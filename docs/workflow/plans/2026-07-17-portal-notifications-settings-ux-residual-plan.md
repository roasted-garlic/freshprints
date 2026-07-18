# Plan: Portal Notifications settings UX residual

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase (residual under portal-notifications-web-push) |
| Related | docs/workflow/plans/2026-07-17-portal-notifications-web-push-plan.md |

---

## Goal

Polish Portal notification settings UX from owner QA screenshots: close modal after successful Save/Enable with toasts (not inline success), show enabled state on the Enable button, and add an Alerts dropdown CTA to open settings when browser push is not yet enabled.

## Background

Parent phase `portal-notifications-web-push` is approved and implemented. Owner screenshots show: modal stays open with inline “Notification preferences saved.”; Enable still says Enable after success; empty Alerts dropdown has no path to enable browser alerts.

## Scope

### In Scope

1. Successful **Save** → close modal → success toast
2. Successful **Enable alerts** → close modal → success toast; button reflects enabled when push is active for this browser
3. Alerts dropdown CTA (“Enable browser alerts”) when this browser is not push-enabled → opens Account Notifications modal (lift modal so header Alerts can open it on any page)
4. Keep errors inline in the modal (toast only for success after close)

### Out of Scope

- Brevo, production deploy, commit
- Changing push registration / SW race fix behavior beyond status detection
- Email preference flow changes beyond save close/toast

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/account/components/AccountNotificationsModal.tsx`
- `apps/portal/features/notifications/services/portalWebPushService.ts` (enabled detection helper)
- `apps/portal/features/notifications/context/PortalNotificationsProvider.tsx` (open settings + push status)
- `apps/portal/features/notifications/components/PortalNotificationsBell.tsx`
- `apps/portal/features/navigation/components/PortalAppShell.tsx` (mount modal)
- `apps/portal/app/(app)/dashboard/page.tsx` (use shared open-settings)
- `apps/portal/styles/shell.css` (enabled button / CTA)
- Manual QA + workflow state

### Architecture Impact

- [x] Lift `AccountNotificationsModal` to app shell / notifications provider so Alerts can open settings from any route

### Security Impact

- [x] None (UI + client status detection only; no rules/secrets changes)

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Modal close + toasts; Alerts CTA; enabled button label

### Migration Impact

- [x] None

---

## Approach

1. Add `isPortalBrowserPushEnabled()` — `Notification.permission === 'granted'` plus active push subscription on the messaging SW registration (this browser).
2. Extend notifications context with `openNotificationSettings` / `closeNotificationSettings` / `isNotificationSettingsOpen` and a refreshable `isBrowserPushEnabled` flag.
3. Mount `AccountNotificationsModal` once in shell; dashboard Settings uses context opener.
4. Modal: on save/enable success → `onClose()` then `showSuccess(...)`; remove inline success; disable Enable button when already enabled with “Browser alerts enabled” label.
5. Alerts panel: when not enabled, show “Enable browser alerts” that closes panel and opens settings.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck portal | `npx tsc --noEmit -p apps/portal` (or project script) | yes |

### Manual

- Save prefs → modal closes → toast
- Enable → modal closes → toast; reopen → button shows enabled / disabled
- Alerts empty (or any) → CTA when not enabled → opens settings
- When already enabled → no misleading Enable CTA (or CTA hidden)

---

## Human Checkpoints

- Owner re-test of residual UX + prior push enable QA (still open)

## Risks / Rollback

- Low risk UI-only. Rollback = revert residual files.

## Open Questions

- None — follow owner screenshot requests.
