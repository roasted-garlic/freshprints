# Test report: Print-request quota help modal (wider + Cap B)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-print-request-quota-help-modal-plan.md |
| Environment | local + fresh-prints-dev |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit (help copy + Cap B) | `npx tsx --test packages/shared/src/utils/printRequestDailyDesignLimit.test.ts` | 0 | **7/7 PASS** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | **PASS** |
| Functions build | `npm run build` (functions) | 0 | **PASS** |
| Deploy | `firebase deploy --only functions:getPrintRequestDailyDesignQuota --project fresh-prints-dev` | 0 | **PASS** |

---

## Soft-reload

- Portal `dev:portal` restarted on port 3100 after CSS/UI changes.

---

## Sample help copy (limits 20 daily / 18 per show)

1. You can add up to 20 prints to your print requests each day.
2. A print is one copy. Example: 2 sizes with 2 copies each uses 4 prints.
3. Adding more copies uses more of today's limit. Lowering the number or removing a design gives those prints back for today.
4. The count resets at midnight Central Time.
5. Separately, when you queue a request to a show, you can have up to 18 prints on that show in total.

Banner remains short (e.g. `15 of 20 prints left today`).

---

## Manual (optional owner smoke)

- Open Portal → banner ? → modal wider; per-show line matches Studio Cap B setting.
- Change Cap B in Studio → focus Portal / wait ≤45s → reopen ? → number updates.
