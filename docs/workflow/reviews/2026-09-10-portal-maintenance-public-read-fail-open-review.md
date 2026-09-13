# Review: Portal maintenance public-read fail-open

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Reviewer | FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-09-10-portal-maintenance-public-read-fail-open-plan.md` |
| Verdict | **approved** |

---

## Summary

Narrow corrective. Public read must be CORS-reachable; UI wall only when the server says ON. Customer mutations remain fail-closed in Functions/Rules. DEV Function redeploy required for the hosted guest path; production remains forbidden.

## Security

`invoker: "public"` only lets OPTIONS/unauthenticated traffic reach the callable. The response stays the existing public projection (no tester UID). Fail-open UI does not weaken backend guards.
