# Test Report: Portal Donate Designs

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Goal | portal-donate-designs |
| Status | **passed_with_notes** (automated partial; manual pending) |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Purpose utils | `npx tsx --test packages/shared/src/utils/customerUploadPurpose.test.ts` | pass |
| Donate confirm validation | `npx tsx --test functions/src/lib/confirmCustomerUploadDonateValidation.test.ts` | pass |
| Functions build | `npm --prefix functions run build` | pass |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | pass |
| Studio typecheck | `npx tsc --noEmit -p apps/studio` | **pre-existing errors** unrelated to donate (print-request selection, staff inbox, audit trail); no errors in donate/intake/sidebar/AppRoutes paths |

---

## Manual (owner)

See checkpoint below. Deploy Functions + Firestore indexes before production QA against live backends.

---

## Notes

- Missing `purpose` on legacy uploads is treated as `print_request`.
- Donate requires both ownership and catalog listing consent server-side.
