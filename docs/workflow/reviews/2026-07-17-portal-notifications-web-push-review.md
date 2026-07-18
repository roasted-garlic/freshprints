# Review: Portal Notification Center + Web Push

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Managing Agent |
| Plan | `docs/workflow/plans/2026-07-17-portal-notifications-web-push-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Scope is the right customer complement to Studio’s Messages inbox. Server-written `customerNotifications` plus FCM web push matches existing outbox/ack patterns. Keeping email opt-in separate from browser push is correct.

## Required changes (implement during phase)

1. Prefer **FCM web** (Firebase Messaging) over raw Web Push crypto in Functions — Admin SDK already available.
2. Emit notifications in the **same success path** as proof/message writes (not only email worker).
3. Deep links: proof → status (Proofs awareness); staff message → status with Messages tab if URL supports it (add `detailTab=messages` query if missing).
4. Human VAPID/console setup is a hard gate before live push QA — implement registration UI even if send is no-op until key present.

## Checklist

| Area | Status |
|------|--------|
| Scope | pass |
| Security | pass (with rules + callable ownership) |
| Data model | pass |
| Backend | pass |
| Test / human gates | pass |

## Approval

`approved_with_changes` — proceed to implement.
