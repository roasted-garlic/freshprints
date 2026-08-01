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
| Portal verification | **PENDING — no authenticated browser backend available** |
| Overall verdict | **PENDING** |

## Studio evidence supplied by owner

- Exact success message: `Print request limits saved.`
- Navigate away and reopen: `30/30`, linkage checked.
- Restart Studio and reopen: `30/30`, linkage checked.
- Visible errors: none.

The owner intentionally selected linked 30/30 as the production target. This supersedes the earlier proposed 25/25 target. No further settings write was performed by the coding agent.

## Portal verification status

Authenticated hosted-Portal verification could not be performed in this session because neither the in-app browser nor Chrome backend was available. No Portal result is claimed for request limit, customer-show limit, usage/capacity copy, warning attribution, stale-session refresh, or retired daily-limit behavior.

The settings write changes the two configured limits and linkage preference only at the product level; no show-capacity edit was requested or reported. Direct Portal confirmation that overall capacity remains independent is still required before this checkpoint can be marked PASS and Stage 2 can resume.

## Non-actions

- No Functions, Rules, indexes, App Hosting, or Studio deployment/build occurred.
- No DNS/domain, Auth, secrets, analytics, Search Console, release-tag, migration, or Stage 2 action occurred.
- No request, allocation, or show-capacity mutation was performed by the coding agent.
