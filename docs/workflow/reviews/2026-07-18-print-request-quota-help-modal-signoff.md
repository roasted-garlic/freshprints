# Signoff: Print-request quota help modal (wider + Cap B)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-print-request-quota-help-modal-plan.md |
| Review | docs/workflow/reviews/2026-07-18-print-request-quota-help-modal-review.md |
| Test report | docs/workflow/reviews/2026-07-18-print-request-quota-help-modal-test-report.md |
| Status | **approved** |

---

## Summary

Portal print-limits help modal is wider (`32rem`) and includes the live per-show print max from Settings via `getPrintRequestDailyDesignQuota.maxPerShow`. Banner copy stays short.

---

## Deliverable sample (Settings Cap A 20 / Cap B 20)

**Banner:** `15 of 20 prints left today` (example)

**Modal title:** Print limits

**Modal body:**
- You can add up to 20 prints to your print requests each day.
- A print is one copy. Example: 2 sizes with 2 copies each uses 4 prints.
- Adding more copies uses more of today's limit. Lowering the number or removing a design gives those prints back for today.
- The count resets at midnight Central Time.
- Separately, when you queue a request to a show, you can have up to 20 prints on that show in total.

---

## Deploy

- `getPrintRequestDailyDesignQuota` → **fresh-prints-dev** (includes `maxPerShow`)
- Portal soft-reloaded
- No production

---

## Files

| Path | Change |
|------|--------|
| `packages/shared/.../printRequestDailyDesignQuota.types.ts` | Added `maxPerShow` |
| `packages/shared/.../printRequestDailyDesignLimit.ts` | Help copy takes daily + per-show |
| `packages/shared/.../printRequestDailyDesignLimit.test.ts` | Cap B copy tests |
| `functions/src/lib/printRequestDailyDesignLimit.ts` | Return live Cap B |
| `apps/portal/.../PortalPrintRequestDailyQuotaBanner.tsx` | Wire `maxPerShow`; title Print limits |
| `apps/portal/styles/shell.css` | Modal `max-width` 24rem → 32rem |
| `docs/architecture/BACKEND.md` | Callable note |
