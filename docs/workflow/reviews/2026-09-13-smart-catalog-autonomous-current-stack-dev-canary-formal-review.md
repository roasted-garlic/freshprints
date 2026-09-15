# Formal Review — Current-stack Autonomous DEV canary and production enablement preflight

| Field | Value |
|---|---|
| Date | 2026-09-13 |
| Plan | `docs/workflow/plans/2026-09-13-smart-catalog-autonomous-current-stack-dev-canary-plan.md` |
| Review type | Plan + Formal Review |
| Checkout | `development`; pre-existing worktree preserved |
| Verdict | **approved_with_changes** — bounded execution may continue automatically under the attached authorization |
| Implementation | **Not authorized**; this phase is validation/ops evidence only |

## Review boundary

The reviewed action is a small DEV canary against the already deployed pipeline, followed only
by a read-only production preflight if the canary passes. It authorizes neither production
configuration changes nor code/configuration/deployment work.

## Findings

1. The dual Autonomous gate and owner/phrase guard are present in the shared mode contract and
   `updateCatalogWorkflowMode`; the non-Autonomous rollback path is explicit.
2. The current source target is Pass 1 `catalog-enrich-v39` with Smart Profile normalizer v7;
   older WS5 v34/v6 evidence must not be presented as current-stack proof.
3. The pipeline merges staff/import authority before recomputing the automation decision and only
   writes `system:catalog-autonomy` approval when the decision permits publication.
4. The existing historical WS5 runner creates disposable DEV state and has cleanup obligations;
   execution must use it only if its current deployed Function behavior and cleanup can be
   verified. A runner that assumes obsolete versions or leaves a fixture is not acceptable without
   a bounded, documented cleanup pass.
5. Pass 2 is explicitly parked/manual-only; any observed enablement is a hard stop.

## Required changes accepted under this review

- Treat historical WS5 as context only; record current v39/v7 provenance in every canary result.
- Prefer an established small fixture/sample and avoid a new fixture. If an explicit fixture is
  required, capture its ID and prove Firestore, Storage, Auth, and Algolia cleanup.
- Do not mutate DEV settings until the initial gate, active-job, and rollback checks pass.
- Restore the exact safe prior DEV gate and verify it after every success or failure.
- Do not run production preflight unless DEV acceptance passes; preflight is read-only and stops
  on any missing/stale production Function or source requirement.

## Acceptance matrix

| Case | Required result |
|---|---|
| Clean eligible design | `ready` + `approved`, `system:catalog-autonomy`, current Smart Profile, publication/search present |
| Genuine hard blocker | remains `imported` + `needs_review`; never system-approved or published |
| Explicit-content/safety fixture (if available) | explicit classification follows the reviewed safeguard; no safety blocker bypass |
| Human/staff/import authority | preserved through enrichment; automation cannot overwrite protected values |
| Final state | original safe DEV mode/live state restored; Pass 2 OFF; no unrelated lifecycle changes |

## Decision

**Approved with bounded changes.** Continue to DEV validation and, only on a mechanical PASS, the
read-only production preflight. Stop before the owner action phrase:

`OWNER AUTHORIZE PRODUCTION AUTONOMOUS ENABLEMENT`

No application, Rules/indexes, secret, migration, deployment, production, or customer-facing
change is authorized by this review.
