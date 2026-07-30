# Portal Print Request Pre-Launch Stability — Amendment 7 Formal Review

- **Date:** 2026-07-27
- **Scope:** Plan Section 25 only — owner post-deploy timer failure and missing ADR-FP-122 callable deployment
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`

## Verdict

**`approved_with_changes`**

Section 25 is bounded to the two remaining owner-reported failures and is consistent with the
repository's architecture, security model, data model, testing requirements, and human deployment
checkpoints. Workstream A is supported by the checked-in callable: it is exported from
`functions/src/index.ts`, retains same-request re-queue denial, removes both former
per-customer/per-show uniqueness gates, and still applies the cumulative per-customer cap before and
inside the transaction. The recorded absence of a post-ADR-FP-122 Functions deployment plus live
pre-ADR behavior is sufficient to require the one-function dev deployment checkpoint; platform
metadata must not be described as a source-hash proof.

Workstream B identifies a real, reproducible Rules defect class. `mapShowAllocationData` ignores
unknown fields after validating the fields it consumes, `startShowPrinting` updates only `status`,
`updatedBy`, and `updatedAt`, and the normal `showAllocations` update rule revalidates the entire
post-update document through `showAllocationRequiredFieldsValid`. Consequently, a startable,
otherwise parseable allocation retaining an unknown legacy field is denied even though that field is
preserved unchanged. A narrowly diff-scoped compatibility branch is an appropriate correction only
after a failing-before emulator fixture proves this behavior.

The live historical documents are no longer available, however, so the specific unknown field and
the identities of the two batch allocations are not recoverable. The Plan correctly observes that
the two parser warnings are not necessarily the two allocations written by the batch. Implementation
and later workflow records must preserve that evidence boundary.

## Required changes and constraints

1. Treat the legacy-allocation fixture as a source-backed reproduction of the defect class, not as
   the recovered live document shape. Do not claim that its synthetic field name, the truncated
   warning ID, or either warning document was one of the three denied operations. Record these as
   unknown unless new direct evidence establishes them.
2. The expanded manifest must contain exactly one row per operation actually added to the batch:
   one selected-show update followed by one row for each parsed, startable allocation. Every such
   allocation's parser status is necessarily `valid`; skipped parser failures are diagnostics, not
   batch operations, and must not be merged into the operation list. Preserve deterministic
   operation ordering and verify the owner-observed three-operation case as one show plus two
   allocation updates.
3. Derive missing-field and unexpected-field names at the existing read/mapping boundary without a
   second query, unbounded read, new listener, or document-body logging. Keep the manifest
   development-only. Log field names and operational document IDs only; never values, customer
   identity, request content, artwork metadata, notes, tokens, or credentials. If raw diagnostic
   metadata cannot safely follow a valid parsed record to batch construction, report an empty/unknown
   classification rather than widening access.
4. Any allocation compatibility rule must be an alternative only to the normal full-schema update
   branch and must require active staff, an existing status of `pending` or `queued`, a requested
   status of `in_progress`, requested `updatedBy` equal to `request.auth.uid`, timestamp-typed
   `updatedAt`, and an affected-key set containing no fields outside `status`, `updatedBy`, and
   `updatedAt`. This diff restriction is the immutable-preservation guarantee: legacy and identity
   fields may be retained but never added, removed, or changed through the branch.
5. The failing-before/passing-after proof must exercise an atomic one-show/two-allocation batch with
   the legacy extra field on only one allocation, and must also isolate the allocation operation so
   the denied path is attributable rather than inferred solely from batch atomicity. Retain explicit
   active owner/admin/helper success and customer, inactive staff, unrelated-field, added/changed
   legacy-field, and invalid-transition denials.
6. If the failing-before fixture does not fail under the pre-correction Rules, no allocation Rules
   change is approved. Return to investigation as Section 25 requires.
7. Workstream A and Workstream B deployments remain separately gated. This review authorizes
   implementation and verification only. It does not authorize the Function deployment, Rules
   deployment, any broad Functions deployment, any data migration, or any production action.
8. The independent Implementation Review must inspect the final diff rather than inherit this
   Formal Review's conclusion. It must confirm the callable boundaries, exact operation manifest,
   no added reads/listeners, failing-before attribution, least-privilege Rules behavior, and exact
   deployment selectors before either approval request is presented.

## Architecture and security assessment

- **Architecture:** Approved. Diagnostics and writes remain in the service layer; no component-level
  Firebase access is introduced.
- **Authorization:** Approved with constraint 4. `isStaff()` already requires an active
  owner/admin/helper, so customer and inactive-user denial remain mandatory.
- **Data model:** No schema migration is approved. The compatibility path preserves historical data
  without blessing legacy fields for create or general update.
- **Read behavior:** No new Firestore query or listener is necessary or approved.
- **Deployment:** Dev-only, narrow selectors, each behind its explicit human checkpoint. Production
  remains out of scope.
- **Regression scope:** Existing passing Portal reconciliation, show-switch, Show Queue live update,
  debug, copy, navigation, and elapsed-clock behaviors remain constraints.

## Blocking findings

None after applying the required constraints above.

## Handoff

Implementation may proceed within Section 25 and the constraints in this review. Stop after
verification and independent Implementation Review at the applicable explicit dev deployment
checkpoint(s). Owner QA remains paused until the required dev deployments have completed.
