# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-02

---

## FreshForge workflow

| Item | Value |
|------|-------|
| Status | **IDLE** |
| DONE | **yes** |
| Last closed goal | `customer-specific-temporary-print-request-and-show-quota-override` |
| Signoff | **approved** (DEV) |
| Owner QA | **PASS** |
| Final DEV status | **APPROVED** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| Batch allocation | **DEFERRED** (`show-queue-batch-allocation-performance`) |
| Next queued | *(none auto-started)* — Owner chooses next goal |
| Signoff doc | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-signoff.md` |
| Working tree | Expected dirty/uncommitted until Owner authorizes commit/push |

---

## Notes

Customer-specific temporary PR/Show quota override closed on DEV (`fresh-prints-dev`). ADR-FP-159. Future production promote: Shared + Studio + Portal + Functions (include **post-corrective** `updateCustomerPrintRequestQuotaOverride`) + Firestore Rules. Storage/indexes/migration **NO**. Do not auto-start Smart Profiling or batch-allocation.
