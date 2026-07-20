# Test Report: Cap A quota UI latency (optimistic remaining)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Plan | docs/workflow/plans/2026-07-19-cap-a-quota-ui-latency-plan.md |
| Status | **passed** |
| Owner manual QA | **PASS** (2026-07-19) |
| Signoff | docs/workflow/reviews/2026-07-19-cap-a-quota-ui-latency-signoff.md |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit | `npx tsx --test src/utils/printRequestDailyDesignLimit.test.ts` (packages/shared) | 0 | pass (8 tests, incl. optimistic Cap A helpers) |
| Typecheck | `npm run typecheck` (apps/portal) | 0 | pass |

## Manual (owner)

### Steps
1. Soft-reload Portal.
2. Ensure Cap A daily limit is known (e.g. 50).
3. Add two designs to Current Request; open the working request detail page.
4. Type qty `25` on the first design, Tab to the second, type `25`, blur/Tab away.
5. Watch header/bottom cart print count **and** the daily print limit banner / exhausted UI (“Daily print limit reached” + “Add your Current Request to a show.” + ?).

### Expected
- Cart and Cap A banner/exhausted state update together within ~autosave debounce (300ms) + one frame after each qty commit — not ~10 seconds later.
- Over-limit saves still fail on the server; UI may show exhausted early when local totals exhaust remaining.

### Result
**PASS** — owner (2026-07-19). This PASS covers Cap A optimistic quota UI only; Cap B allotment and Review Request nav race remain open.

---

## Notes
- Catalog/drawer optimistic `workingItems` patches also benefit from the same Cap A remaining derivation (no extra catalog changes).
- Server Cap A charge/refund unchanged; `notifyCapAQuotaChanged` still reconciles after successful detail save.
