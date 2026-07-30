# Portal Print Request Pre-Launch Stability — Implementation Review 8

- **Date:** 2026-07-27
- **Reviewer:** Independent Implementation Review Agent
- **Scope:** Plan Section 25 / Amendment 7 only
- **Formal Review:** `2026-07-27-portal-print-request-prelaunch-stability-amendment-7-review.md`

## Superseding re-review verdict

**`APPROVED`**

This superseding re-review independently inspected the corrections to all three blocking findings,
the Amendment 7 test report, the final Rules and callable wiring, and the exact deployment scopes.
All initial blockers are resolved. Amendment 7 is approved to advance to its two separate explicit
dev-deployment approval checkpoints. This review does not authorize either deployment.

### Re-review evidence

1. **Failing-before allocation Rules proof:** the exact synthetic one-show/two-allocation fixture was
   run against the pre-correction Rules with Temurin Java 21. Result: **exit 1; 12 tests, 11 pass,
   1 fail**. The one failure was the expected active-owner atomic batch carrying the preserved
   legacy field, and the isolated allocation update was also denied. This is correctly recorded as
   a source-backed defect-class reproduction, not a recovered live-document claim.
2. **Passing-after least-privilege proof:** this reviewer independently ran `npm run test:rules`
   against the corrected checkout with Temurin **21.0.11**. Result: **exit 0; 28 tests, 28 pass,
   0 fail, 0 skipped**. The suite now explicitly denies adding an unrelated field, changing the
   preserved legacy field, and removing it. Current-schema and legacy timer starts are forced
   through the same narrow start-transition branch; active owner/admin/helper succeed, while a
   customer, inactive staff member, unrelated write, and invalid transition remain denied.
3. **Callable controlled behavior boundary:** authoritative transaction eligibility is extracted to
   `getPortalQueueTransactionBlockReason`. The callable invokes it with
   `freshRequestHasAllocation`, `freshCustomerOnShowQty`, `batchQuantity`, and `L`, all derived from
   the transaction's fresh reads. Its behavior tests prove 22+3 and 23+2 allow, 22+4 and 23+3 block,
   and re-queuing the same request is denied. The wiring test proves the callable uses this exact
   boundary; the broader cap suite retains all adjacent boundaries and no-double-counting coverage.
4. **Independent focused verification:** this reviewer ran the corrected focused callable,
   capacity, wiring, and timer-diagnostic surface: **exit 0; 37 tests, 37 pass, 0 fail, 0 skipped**.
   The Functions build passed with **exit 0**, and `git diff --check` passed with **exit 0**.

The exact operation manifest, skipped-versus-batched separation, bounded read behavior, sanitized
diagnostics, historical-evidence boundary, least-privilege authorization, and same-request invariant
remain as independently confirmed below.

### Deployment gates

Both deployed surfaces predate their respective Amendment 7 local corrections, so both narrow
dev-only deployments are required before owner QA:

1. Function checkpoint: **`APPROVE DEV FUNCTION DEPLOY`**

   ```text
   firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev
   ```

2. Rules checkpoint: **`APPROVE DEV RULES DEPLOY`**

   ```text
   firebase deploy --only firestore:rules --project fresh-prints-dev
   ```

These are separate human checkpoints and selectors. They do not authorize all Functions, indexes,
Storage Rules, App Hosting, migration, production deployment, or any other action. Owner QA remains
paused until both approved deployments succeed and are verified.

## Initial verdict — superseded by the re-review above

**`REJECTED`**

The initial review found that the implementation direction was narrow and consistent with
ADR-FP-122, but rejected the gate pending three required proofs. Those findings and their original
analysis are retained below for audit history; the superseding re-review above confirms all are now
resolved.

## Independent findings

### 1. Exact timer batch and skipped-versus-batched behavior — pass by source inspection

`upcomingShowService.startShowPrinting` still performs exactly two bounded reads in parallel: one
selected `upcomingShows/{showId}` document read and one `showAllocations` query constrained by
`upcomingShowId == showId`. No second diagnostic query, collection-wide listener, or corpus reload
was added.

Allocation documents are diagnosed at the same mapping boundary and then passed through
`mapShowAllocationData`. Mapping failures emit the existing warning and return no record.
`allocationsToStart` is derived only from successfully mapped records in `pending` or `queued`
status. Therefore skipped/incomplete allocations cannot enter the batch or its operation manifest.

The actual batch and manifest have the same deterministic construction:

1. one `upcomingShows/{upcomingShowId}` update;
2. one `showAllocations/{showAllocationId}` update per parsed startable allocation, in query-result
   order.

For the owner-observed three-operation case, this construction is exactly one show update plus two
allocation updates. Each manifest row contains an operation index, update type, path template,
operational document ID, changed-field names, parser classification, missing-field names, and
legacy-extra-field names. Allocation rows also contain existing and proposed statuses. The manifest
is development-only and contains field names rather than field values or document bodies.

The diagnostic helper test confirms that a mapper-compatible allocation with a preserved unknown
field is classified `valid`, while a source-incomplete allocation reports missing field names only.
The historical live field name and allocation identities remain correctly described as unrecovered;
the synthetic `legacyProductionMarker` fixture is not presented as the recovered live shape.

### 2. Allocation Rules correction — implementation passes, required proof incomplete

`staffCanStartLegacyShowAllocation` is an alternative to the normal full-schema update branch and is
limited to:

- active owner/admin/helper through `isStaff()`;
- existing `pending` or `queued`;
- proposed `in_progress`;
- `updatedBy == request.auth.uid`;
- timestamp-typed `updatedAt`;
- affected keys limited to `status`, `updatedBy`, and `updatedAt`.

The affected-key restriction preserves every identity and legacy field and prevents adding,
removing, or changing unrelated fields through this branch. Customer and inactive-staff denial are
retained. This is a least-privilege compatibility path, not a general relaxation or create policy.

The passing-after test source contains the required one-show/two-allocation atomic fixture, with a
legacy field on only the second allocation, plus isolated allocation attribution, owner/admin/helper
success, customer and inactive-staff denial, unrelated-field addition denial, and invalid-transition
denial.

However, no Amendment 7 record shows the mandatory failing-before run against the pre-correction
Rules. The current workflow state and handoff contain **23/23** from Amendment 6's legacy-show work;
they predate this allocation branch and its additional cases. Java is unavailable in this review
environment, so the reviewer could not independently execute `npm run test:rules`. A Rules change
was conditional on the new fixture failing before the correction. That condition remains unproven.

The Formal Review also explicitly required denial coverage for an **added/changed** legacy field.
The suite covers adding `newlyAddedField`, but does not separately mutate or remove the pre-existing
`legacyProductionMarker`. The Rule appears to deny that operation, but the required executable
regression case is absent.

### 3. ADR-FP-122 callable — source behavior passes, required behavior-level proof incomplete

The callable remains exported from `functions/src/index.ts`. Independent source inspection confirms:

- the old pre-transaction and in-transaction customer/show uniqueness throws are removed;
- different request IDs contribute through the cumulative non-canceled allocation sum;
- `existingOnShowQty` feeds `planPortalShowQueueFit`;
- `freshCustomerOnShowQty` is recomputed inside the transaction and feeds
  `remainingPerShowCustomerCap`;
- quantity equal to 25 is allowed and quantity greater than 25 is rejected;
- request-scoped allocation checks before and inside the transaction still deny re-queuing the same
  request;
- the one-working-request policy was not changed by Amendment 7.

Focused utility/source tests pass all required arithmetic boundaries, including 22+3, 22+4, 23+2,
23+3, 24+1, 24+2, and 25+1, and prove canceled allocations are excluded and simple sums are not
double-counted.

Nevertheless, `functions/src/queuePortalPrintRequestToShow.test.ts` explicitly states that it is a
source-regex test and that no callable behavior harness exists. Utility tests plus regex inspection
do not execute the callable's reads, same-request query, transaction recheck, or writes. They
therefore do not satisfy Section 25's minimum proof that request A queues, different request B queues
to the same show at or below 25, and request A cannot queue again. This is a blocking test gap for
the deployment checkpoint, not evidence that the implementation itself is wrong.

Deployment evidence remains consistent with the Plan: local source implements ADR-FP-122, prior
workflow records say no post-ADR-FP-122 Functions deployment occurred, and owner-observed behavior
matches the old uniqueness rule. Platform hash
`d244654790bfc4a62c765731aa474712ba5d5897` is metadata only, not a local source-hash comparison.
Once the blockers are resolved, the only appropriate Function selector is:

`firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev`

### 4. Regression and architecture safety — pass within executed scope

The timer changes remain Service → Firebase, with Studio authorization through
`permissionService`. No component Firebase access, customer Studio access, unbounded read, or new
listener was introduced by Amendment 7. The allocation compatibility branch does not authorize
unrelated writes. The callable retains bounded request/show reads and show-scoped allocation
queries. No production action, migration, or broad deployment is justified by this review.

Focused command executed:

```text
npx tsx --test functions/src/queuePortalPrintRequestToShow.test.ts functions/src/lib/queuePortalPrintRequestToShowValidation.test.ts packages/shared/src/utils/printRequestPerShowCustomerCap.test.ts packages/shared/src/utils/portalShowQueueFit.test.ts apps/portal/features/print-requests/hooks/useQueuePrintRequestToShow.test.ts apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.timerDiagnostics.test.ts
```

Result: **exit 0; 46 tests, 46 pass, 0 fail, 0 skipped**.

`java -version` could not run because Java is not installed or on `PATH` in this review environment.
Consequently, this review does not claim an emulator result.

## Initial blocking findings — all resolved

1. Run and record the exact legacy-allocation fixture against the pre-correction Rules. It must
   fail the atomic one-show/two-allocation batch and fail the isolated legacy-allocation update.
   Then run the same cases against the corrected Rules and record the complete current Rules-suite
   count and exit code.
2. Add explicit Rules coverage that changing or removing the preserved pre-existing legacy field is
   denied, not only that adding a different unrelated field is denied.
3. Add a behavior-level callable test/harness (Admin SDK emulator or equivalently controlled
   dependency boundary) proving: request A queues; different request B queues to the same show for
   22+3/23+2; 22+4/23+3 fail; request A cannot queue again; and the current request is counted once.
   Source-regex checks may remain supplementary.

## Initial gate decision — superseded

Do **not** request either `APPROVE DEV FUNCTION DEPLOY` or `APPROVE DEV RULES DEPLOY` on the basis of
the initial review. This instruction is superseded by the approved re-review and deployment gates at
the top of this document. Owner QA remains paused until both required dev deployments complete.
