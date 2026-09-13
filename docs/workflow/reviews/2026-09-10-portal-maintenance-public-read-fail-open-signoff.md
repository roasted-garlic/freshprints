# Signoff: Portal maintenance public-read fail-open

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Plan | `docs/workflow/plans/2026-09-10-portal-maintenance-public-read-fail-open-plan.md` |
| Verdict | **approved** |

---

## Summary

Guest homepage no longer shows the maintenance wall while maintenance is OFF. Gen2 public invoker on `getPortalMaintenanceState` plus fail-open Portal shell. DEV Function redeployed. Owner guest QA **PASS**.

## Tests

- Automated contracts: pass
- Owner hosted DEV guest homepage: **PASS** (2026-09-10)

## Follow-ups

`customer-upload-follow-up-catalog-permission` Formal Review remains waiting on owner acceptance. Production untouched.
