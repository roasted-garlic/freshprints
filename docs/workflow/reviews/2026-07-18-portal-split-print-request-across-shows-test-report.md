# Test Report: Portal split print request across shows (Cap B + capacity)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-portal-split-print-request-across-shows-plan.md |
| Review | docs/workflow/reviews/2026-07-18-portal-split-print-request-across-shows-review.md |
| Result | **passed_with_notes** (unit + deploy; owner manual QA pending) |

---

## Automated

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Unit | `npx tsx --test packages/shared/src/utils/portalShowQueueFit.test.ts packages/shared/src/utils/portalShowQueueCapacity.test.ts functions/src/lib/queuePortalPrintRequestToShowValidation.test.ts` | 0 | 24 tests pass (includes Cap B 50/25 fit case) |
| Functions build | `firebase deploy` predeploy `tsc` | 0 | Via deploy |
| Deploy | `firebase deploy --only functions:queuePortalPrintRequestToShow,functions:listPortalAllocatableShows --project fresh-prints-dev` | 0 | Both updated |
| Lint / full typecheck portal | not run this pass | — | Scope: unit + deploy |

---

## Deploy

- Project: `fresh-prints-dev` only
- Functions: `queuePortalPrintRequestToShow`, `listPortalAllocatableShows`
- Portal soft-reload: `npm run dev:portal` on :3100

---

## Manual QA (owner)

See human checkpoint below. Primary: Cap A 50 / Cap B 25 / request 50 prints.

---

## Notes

- Studio multi-leg clone intentionally not implemented; Portal-first remainder-on-Current-Request UX.
- Capacity exceeded copy updated to remove em dashes.
