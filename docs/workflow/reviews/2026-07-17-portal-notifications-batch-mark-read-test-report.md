# Test Report: Portal notifications — batch mark-read

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-17-portal-notifications-batch-mark-read-plan.md |
| Implementation | local session (uncommitted) |
| Overall | **passed_with_notes** (owner manual QA **PASS** 2026-07-17; web-push A5/B3 still open separately) |

---

## Summary

Batch mark-read by `requestId` + `kind` and Mark all read are implemented. Portal typecheck and selector unit tests passed. Owner manual QA **PASS** 2026-07-17 (includes residual Alerts chrome E and same-session Messages bubble residuals).

**Residual chrome (same session):** Alerts panel close moved to header **X**; footer labels shortened to **Mark all read** | **History**; push CTA **Enable alerts**.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck | `npm run typecheck` in `apps/portal` | 0 | pass | |
| Unit tests | `npx tsx --test apps/portal/features/notifications/utils/selectUnreadPeerNotificationIds.test.ts apps/portal/features/notifications/utils/locationMatchesNotificationHref.test.ts` | 0 | pass | 5 tests |
| Lint | — | — | skip | No portal lint script |
| Build | — | — | skip | Residual UX; not required |
| Integration | — | — | skip | N/A |
| E2E | — | — | skip | Manual QA covers |
| Backend/rules | — | — | skip | No rules/Functions changes |

---

## Failures (if any)

None.

---

## Skipped Checks

- Lint / build / E2E — not required for this residual per plan.

---

## Manual Testing

See `docs/workflow/reviews/2026-07-17-portal-notifications-batch-mark-read-manual-qa.md`.

Status: **PASS** — owner 2026-07-17 (“Now, PASS this.”).

---

## Notes

- Web-push A5/B3 remains a separate parked checkpoint; this report does not close it.
