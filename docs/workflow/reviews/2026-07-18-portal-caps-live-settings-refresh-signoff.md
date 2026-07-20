# Signoff: Portal caps live Settings refresh

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-portal-caps-live-settings-refresh-plan.md |
| Review | docs/workflow/reviews/2026-07-18-portal-caps-live-settings-refresh-review.md |
| Test report | docs/workflow/reviews/2026-07-18-portal-caps-live-settings-refresh-test-report.md |
| Status | **approved_with_notes** |

---

## Summary

**Yes** — Portal can pick up new Studio limits without redeploy.

**How it works now**

- Customers cannot read Settings docs (`printRequestLimits`, `customerUploadQuotas` are owner-only).
- Portal loads Cap A and upload quotas via callables that already read **live** Settings on every call (no forever cache).
- Gap was UI refresh: Portal now refetches on focus/visibility, when drawer/upload UI is open, after local request changes, and every **~45s** while the tab is visible.

**Owner tip:** Save limits in Studio Settings → click/focus the Portal tab (or wait up to ~45 seconds) → Cap A banner and upload quota text update. No Functions deploy; no production.

---

## Mechanism chosen

Keep callables + Portal `useLiveQuotaRefresh` (focus / visibility / 45s poll). Do not expose Settings to customers.

---

## Files

| Path | Change |
|------|--------|
| `apps/portal/features/shared/hooks/useLiveQuotaRefresh.ts` | **Added** |
| `apps/portal/features/print-requests/components/PortalPrintRequestDailyQuotaBanner.tsx` | Wired refresh |
| `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx` | Wired refresh while open |
| `apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx` | Wired refresh |

---

## Deploy

- **None** (Functions already live-read Settings)
- Portal soft-reload via running `dev:portal` HMR
- No production

---

## Tests

- Portal typecheck: PASS
- Optional owner smoke: Save → focus Portal / wait ≤45s

---

## Notes / follow-ups

- Prior Cap A print-count manual QA remains a separate open checkpoint if not yet PASS’d.
- Cap B enforcement already uses live Settings on queue callables; no separate Portal Settings banner for Cap B.
- **Coordination:** This change only rewires Cap A/upload **data refresh** in `PortalPrintRequestDailyQuotaBanner` (and drawer/upload panel). Help-modal widen + Cap B copy is left to the parallel agent. Cap A help lines already use live `limit` from the refreshed callable. If Cap B is added to the quota payload later, the same `useLiveQuotaRefresh` path will pick it up.
