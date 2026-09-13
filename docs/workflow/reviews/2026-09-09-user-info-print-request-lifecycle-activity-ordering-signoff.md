# Signoff: User Info Print Request lifecycle activity ordering

| Field | Value |
|-------|-------|
| Date | 2026-09-09 |
| Signoff by | Codex / FreshForge Signoff |
| Managed goal | `user-info-print-request-lifecycle-activity-ordering` |
| Plan | `docs/workflow/plans/2026-09-09-user-info-print-request-lifecycle-activity-ordering-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-test-report.md` |
| Indexed-reader DEV activation | `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-indexed-reader-dev-activation.md` |
| Owner DEV QA | **PASS** (2026-09-09) |
| Final DEV disposition | **approved_with_notes** |
| Goal status | **CLOSED** |

---

## Verdict

**CLOSED — approved_with_notes.** The owner completed DEV QA for the `PRINT REQUEST LIFECYCLE
INDEXED HISTORY READER` and accepted the final behavior. The lifecycle ordering implementation,
the Studio Editing → re-add corrective, the mirror-only trigger corrective, the authorized
historical mirror backfill, and the indexed-reader DEV activation are complete. No active
corrective remains for this managed goal.

This signoff closes `user-info-print-request-lifecycle-activity-ordering`. It does not authorize
commit, push, Studio publish, Portal deployment, production promotion, another backfill, event
cleanup, or a new managed implementation.

## Owner DEV QA — PASS

The owner verified the following against the enabled DEV indexed reader:

- Print Request History loads correctly.
- New lifecycle activity on an older request moves that request to the top.
- Ordering follows business lifecycle activity, not scheduled-show date or raw `updatedAt`.
- Created and Last Updated display correctly; Last Updated follows the lifecycle ordering clock.
- Exactly one logical card remains per Print Request.
- Current show context is correct, while prior show/removal history remains historical.
- Details lifecycle history is accepted **newest → oldest**.
- Remove → Editing → re-add succeeds without a permission error, partial queue, or stuck Editing
  state, and Studio reconciles correctly.
- No duplicate visible conversion entry was observed.

## Delivered DEV evidence

- `onPrintRequestLifecycleRequestWritten` and `onPrintRequestLifecycleAllocationWritten` are
  active in `fresh-prints-dev` and write immutable request-scoped lifecycle events plus the
  monotonic `lastLifecycleActivityAt` mirror tuple.
- The trusted `allocateStudioPrintRequestToShow` callable and associated Firestore Rules
  corrective are deployed in DEV and passed Owner DEV re-QA.
- The corrected, bounded mirror backfill APPLY ran once and wrote only the three mirror fields on
  8 requests. The post-apply dry-run proposed **0** writes; monotonic mirror preservation and
  idempotency passed.
- The request-trigger mirror-only equality corrective is deployed. No lifecycle events were
  observed after that corrective from mirror-only updates.
- The indexed reader is enabled in local Studio source at
  `apps/studio/src/renderer/src/features/users/types/customerPrintRequestHistory.types.ts` by
  setting `PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED` to `true`.
- The compatibility reader and fallback utilities remain available as the rollback path.

## Reader and index verification

| Measure | Result |
|---------|--------|
| Reader-eligible mirror coverage | **8/8 (100%)** |
| Missing eligible mirrors | **0** |
| Ordering index | `CICAgNir940K` — READY (`customerId ASC`, `lastLifecycleActivityAt DESC`, `__name__ DESC`) |
| Details index | `CICAgPiB5pcK` — READY (`printRequestId ASC`, `occurredAt ASC`, `__name__ ASC`) |
| Indexed request query | PASS; no missing-index or permission error |
| Indexed Details query | PASS; sample request returned 15 events |
| Duplicate request IDs across streams | **0** |
| Per-stream ordering failures | **0** |

## Historical duplicate-event note

Two conversion lifecycle events were emitted during the historical mirror APPLY before the
mirror-only trigger corrective was deployed:

- `JG1M6fuUroOGLHCJElYx` — `090_52f6e3ac3c4394fb619eec65a0c84b92c0d9e3f9`
- `eu5m2Ew3ffFtQLrQ3qpD` — `090_872fda0d79de8f3948e60c134044540abd5657a9`

They are classified **`SAFE_TO_LEAVE_AS_HISTORICAL_DUPLICATE`**. They did not alter mirror
ordering; existing Details deduplication prevents a duplicate visible conversion row; no cleanup,
deletion, or event repair is required for this DEV goal.

## Details ordering reconciliation

The final owner-tested contract is **newest → oldest**, ordered by occurrence time, lifecycle tie
precedence, and stable event ID. Any older Plan/Review wording that says oldest → newest remains
historical evidence of an earlier proposal and is superseded by the accepted final behavior; the
implementation is not being changed in this signoff.

## Validation

- Indexed-reader and lifecycle-focused Studio/Functions command: **24/24 PASS**.
- Request-trigger/allocation/backfill corrective suite: **14/14 PASS**.
- Latest full Firestore Rules validation: **174/174 PASS** across 22 suites; earlier lifecycle
  checkpoint validation was **170/170 PASS**.
- Functions build: **PASS**.
- Targeted ESLint: **PASS**.
- `git diff --check`: **PASS**.
- Read-only DEV indexed request and Details REST smoke: **PASS** with 0 missing-index,
  permission, duplicate-request, or per-stream ordering errors.
- Studio full typecheck retains only documented unrelated baseline errors (PNG validation,
  Firestore trace metadata, staff inbox, and shared test fixtures); no indexed-reader source error
  was reported.

## Scope boundaries

| Action | This signoff turn |
|--------|------------------|
| Firebase deployment | **NO** |
| Firestore Rules/index changes | **NO** |
| Lifecycle backfill rerun | **NO** — the authorized APPLY is complete and was not rerun |
| Mirror/event alteration or data repair | **NO** |
| Studio publish | **NO** |
| Portal deployment | **NO** |
| Production touched | **NO** |
| Commit | **NO** |
| Push | **NO** |

## Workflow completion

- Plan: complete.
- Formal Review: approved_with_changes.
- Implementation and corrective deployments: complete in the previously authorized DEV scopes.
- Tests and DEV evidence: recorded above and in the linked artifacts.
- Owner DEV QA: **PASS**.
- Signoff: **approved_with_notes**.
- FreshForge: **IDLE**, with no active managed goal; ready for the owner to select the next goal.
- The owner-authorized commit `6bf7a25d` was pushed to `origin/development`; no force push occurred.
- Studio publish, Portal deployment, and production promotion remain separately gated.

## Post-signoff commit/push record

On 2026-09-10, the owner-authorized closed-goal commit was created and pushed normally:

`6bf7a25d feat(studio): add print request lifecycle ordering`

Next checkpoint:

`[READY FOR OWNER TO SELECT NEXT MANAGED GOAL]`
