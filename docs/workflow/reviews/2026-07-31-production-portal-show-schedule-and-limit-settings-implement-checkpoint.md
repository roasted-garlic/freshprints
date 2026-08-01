# Implementation Checkpoint: Portal show-schedule + limit settings (source)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Slice | `portal-customer-queued-show-schedule-visibility` + `portal-print-request-and-customer-show-limit-settings` |
| Status | **complete** (source) — no deploys |

---

## Data-access approach (schedule)

1. Customer-readable `showAllocations` (own requests) supply `upcomingShowId` + qty/status.
2. `getPortalShowPrintProgress` extended with `scheduledStartAt` for detail.
3. New `getPortalPrintRequestShowSchedules` batch callable (cap 50) for My Print Requests — server ownership + allocation-derived show IDs + unique show doc fetches.
4. Pure helpers: `portalCustomerShowSchedule.ts` + existing `formatShowDateTimeLabel`.

## Limit settings approach

- Additive fields: `maxQuantityPerPrintRequest`, `linkPrintRequestAndCustomerShowLimits` (default linked).
- Keep `maxQuantityPerShowPerCustomer` as customer-show limit.
- Missing request field → fall back to customer-show limit.
- Request paths use request limit; queue personal usage / customer remaining use customer-show limit; overall show capacity unchanged.

## Later deploy checklist (NOT this pass)

| Deploy | Needed for |
|--------|------------|
| Cloud Functions | `getPortalPrintRequestShowSchedules` (new); `getPortalShowPrintProgress` (`scheduledStartAt`); `updatePrintRequestLimitSettings`; add/qty/duplicate/upload/assisted/queue enforcement split |
| Portal App Hosting | Card/detail schedule UI; dual-limit Portal consumers |
| Studio installer | Settings dual fields + link checkbox |
| Firestore Rules | **Not required** |
| Owner settings save | Persist unlinked values in production after Studio ships |

## Production evidence note (limits)

- Separate customer-show limit field did **not** exist before this change.
- Observed **30** = sole `maxQuantityPerShowPerCustomer` (`L`).
- Observed **25** = current request quantity (not a distinct settings field).
- Observed **200** = show `maxTotalQuantity`.

## Next rollout phrase (after source merge to production)

`APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: CUSTOMER SHOW SCHEDULE VISIBILITY`

Additional later phrases still required for Functions, Studio installer, and settings save.
