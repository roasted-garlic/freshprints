# Test Report: Portal customer notification history modal

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Goal | portal-notification-history-modal |
| Plan | docs/workflow/plans/2026-07-17-portal-notification-history-modal-plan.md |
| Status | **passed_with_notes** |

---

## Automated checks

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Typecheck | `npx tsc --noEmit` (cwd `apps/portal`) | 0 | pass (initial + residual filter fix) |
| Lint | not required for this UI slice | — | skipped |
| Unit | `npx tsx --test packages/shared/src/utils/customerNotifications.test.ts` | 0 | pass (4/4) — residual alert copy |
| Build | not required | — | skipped |
| Rules deploy | not required — existing owner read covers history | — | N/A |

---

## Rules / query notes

- `firestore.rules` `match /customerNotifications`: `allow read` when `resource.data.customerUid == request.auth.uid` — **no `readAt` filter**. History does not need a rules deploy.
- Client query: `where customerUid == uid`, `orderBy createdAt desc`, `limit 50` via `CUSTOMER_NOTIFICATIONS_QUERY_LIMIT`.
- Composite index already in `firestore.indexes.json` (`customerUid` ASC + `createdAt` DESC).
- `markRead` only updates `readAt` / `updatedAt` — docs remain for history.

---

## Deploy needs

| Item | Needed? |
|------|---------|
| Firestore rules | **No** (unless prod rules somehow lag local — verify live if history fails to load) |
| Indexes | **No** (same query shape as before; limit 40→50 only) |
| Functions | **Yes (residual copy)** — redeploy `staffSendAssistedCreationMessage` + `staffAddAssistedCreationProof` so *new* alerts get updated titles/bodies. Existing docs keep old copy. |
| Hosting / Portal | Client-only for history UI; alert strings come from Firestore (no Portal hardcode) |

---

## Manual testing

Required — see `docs/workflow/reviews/2026-07-17-portal-notification-history-modal-manual-qa.md`.

---

## Residual fix (owner QA feedback)

| Change | Detail |
|--------|--------|
| Dropdown | Was falling back to all `items` when unread empty — now **unread-only** always; empty → “You’re all caught up” |
| History | Was listing all recent (read+unread) — now **`readItems` only** (`readAt != null`) |
| Pin-on-open | Still pins unread snapshot at panel open; no longer pins/shows read items |

Re-run Portal typecheck after residual; await updated manual QA.

---

## Manual result

| Test | Result | Approved by |
|------|--------|-------------|
| Unread-only Alerts + history modal + deep-links (+ absorbed click-vanish/badge) | **PASS** | Owner (2026-07-17) |

**Note:** Residual alert copy (“New message” / “New proof”) still needs Functions redeploy before that criterion can be verified live — deferred, not a FAIL for this UI PASS.

---

## Summary

Automated typecheck passed (initial + residual). Owner manual QA **PASS**. Residual Functions redeploy for alert copy remains open (not marked PASS for web-push).
