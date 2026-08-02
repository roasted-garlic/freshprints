# Checkpoint: Production linked dual-limit settings save — 30/30

| Field | Value |
|---|---|
| Date | 2026-08-01 |
| Studio UI signoff | `docs/workflow/reviews/2026-08-01-production-studio-dual-limit-settings-ui-signoff.md` |
| Previous values | linked `25/25` |
| Intentionally saved values | linked `30/30` |
| `maxQuantityPerPrintRequest` | `30` |
| `maxQuantityPerShowPerCustomer` | `30` |
| `linkPrintRequestAndCustomerShowLimits` | `true` |
| Studio save/persistence | **PASS** |
| Portal verification | **PASS — owner confirmed checks 1–12** |
| Overall verdict | **PASS** |

## Studio evidence supplied by owner

- Exact success message: `Print request limits saved.`
- Navigate away and reopen: `30/30`, linkage checked.
- Restart Studio and reopen: `30/30`, linkage checked.
- Visible errors: none.

The owner intentionally selected linked 30/30 as the production target. This supersedes the earlier proposed 25/25 target. No further settings write was performed by the coding agent.

## Portal verification

The owner confirmed production hosted Portal checks 1–12 **PASS** after refresh/refocus:

- Working-request maximum, remaining-count copy, quantity controls, and validation use 30 and reject totals above 30.
- Add Request to Show uses the 30-print per-customer-per-show allowance; customer usage displays `X of 30` and remaining uses 30 minus existing customer allocations.
- Overall show usage and capacity remain independent and continue using the selected show's own `maxTotalQuantity`; request quantity is not mislabeled as customer-show usage.
- Limiting warnings correctly distinguish customer allotment, overall capacity, and equal-limit neutral copy.
- No retired daily-limit copy or enforcement appears.
- Refresh/refocus/retry gives stale sessions the current server-authoritative 30/30 behavior.

No show-capacity value was changed. The production linked dual-limit settings checkpoint is **PASS** and is ready for the separate Stage 2 hosted Portal smoke resume checkpoint.

## Non-actions

- No Functions, Rules, indexes, App Hosting, or Studio deployment/build occurred.
- No DNS/domain, Auth, secrets, analytics, Search Console, release-tag, migration, or Stage 2 action occurred.
- No request, allocation, or show-capacity mutation was performed by the coding agent.
