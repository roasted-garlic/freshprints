# Test Report: Portal maintenance public-read fail-open

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Plan | `docs/workflow/plans/2026-09-10-portal-maintenance-public-read-fail-open-plan.md` |
| Status | **passed** — contracts pass; DEV Function redeployed; owner guest homepage **PASS** |

---

## Commands run

```bash
npx tsx --test tests/portalMaintenance.contract.test.ts functions/src/updateSemanticReviewPlaygroundSetting.test.ts
```

**Result:** 7/7 pass (exit 0)

## Notes

- Hosted `myprintrequest.dev` still needs `getPortalMaintenanceState` redeployed with `invoker: "public"`.
- Portal Hosting picks up the fail-open shell only after the next DEV App Hosting deploy/commit.
- Production untouched.
