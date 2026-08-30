# Test Report: Customer Account Identity WS4 — Customer Activity + Deep Linking

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Goal | `customer-account-identity-management-ws4-customer-activity-and-deep-linking` |
| Test status | **passed** |
| Production | **NOT AUTHORIZED** |

---

## Automated tests

| Command | Exit | Result |
|---------|------|--------|
| `npx tsx --test apps/studio/src/renderer/src/features/users/utils/buildPrintRequestHistoryCard.test.ts apps/studio/src/renderer/src/features/users/utils/resolveLogicalCustomerIds.test.ts apps/studio/src/renderer/src/features/users/utils/customerIdentityActivityAudit.test.ts` | 0 | **16/16 pass** |

Coverage highlights:

- PR history card grouping, conversion lineage, deep links
- Merged customer id resolution (`resolveLogicalCustomerIds`)
- Show context prefers active destination allocation after Did Not Print requeue (canceled source ignored)
- Requeue timeline in detail events (missed source + moved destination)
- Account activity audit mapping (merge completed)

## Typecheck

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` (from `apps/studio/`) | **Pre-existing failures** in unrelated modules; **no new WS4-specific errors** documented at implementation review |

## Firestore Rules

| Suite | Result |
|-------|--------|
| WS4-scoped / Show Queue requeue compatibility | **Not re-run this session** — compatibility covered by unit tests on `buildShowContextForRequest` |
| Full `npm run test:rules` | **Not claimed globally passing** — unrelated suites have documented Firestore Rules expression-budget failures (non-blocking note retained) |

## Manual tests

| Test | Result | Approved by |
|------|--------|-------------|
| Owner WS4 DEV QA checklist (9 fixture scenarios incl. Did Not Print → requeue) | **PASS** | Owner (2026-08-30) |

---

## Verdict

**passed** — scoped automated tests green; owner DEV QA PASS recorded.
