# Formal Review: User Info Print Request lifecycle activity ordering

| Field | Value |
|---|---|
| Date | 2026-09-09 |
| Plan | `docs/workflow/plans/2026-09-09-user-info-print-request-lifecycle-activity-ordering-plan.md` |
| Managed goal | `user-info-print-request-lifecycle-activity-ordering` |
| Review boundary | Plan + Formal Review only |
| Verdict | **approved_with_changes** |
| Implementation | **not authorized** |
| DEV deployment / backfill | **not authorized** |
| Production | **not authorized** |

---

## Decision

The plan is approved as the correct bounded corrective direction, subject to the required
implementation controls below. A source-only User Info renderer cannot satisfy the requested
truthful remove → Editing → re-add lifecycle: the Studio removal callable deletes allocation
documents, so the source show and removal evidence disappear from the present domain state.
`customerActivityEvents` is also not sufficient; its immutable, server-authored event union is
limited to `account.*` identity activity and must remain a separate Account Activity surface.

The selected additive design is therefore:

1. immutable request-scoped `printRequestLifecycleEvents` written only by tightly scoped
   server triggers;
2. server-maintained `printRequests.lastLifecycleActivityAt` (plus stable tie-break mirror) as
   the bounded card-query read model;
3. lazy request-scoped Details that merge forward events with conservative surviving-domain
   fallback; and
4. a separately authorized, non-destructive historical ordering backfill before the new card
   query is enabled.

This is observability for Print Request lifecycle, not broad event sourcing and not a replacement
for account auditing.

## Review findings

| # | Challenge | Verdict | Required implementation condition |
|---|---|---|---|
| 1 | Current-sort diagnosis | **pass** | Diagnose the current comparator precisely: it sorts request `updatedAt` descending, then `createdAt` and id. It does not literally sort by scheduled show date. Scheduled show time is display context only. |
| 2 | Why `updatedAt` is unsafe | **pass** | Merge reassignment and queue-tab/mirror work can advance `updatedAt` without lifecycle activity; some allocation re-additions can occur without advancing it. It must not be used as an activity-clock fallback. |
| 3 | Source-only feasibility | **fail — corrective required** | Studio `unqueueStudioCustomerPrintRequestFromShow` deletes allocations. Existing rows cannot reconstruct the deleted source, so new forward server evidence is required. |
| 4 | Account Activity separation | **pass** | Preserve `customerActivityEvents` as immutable identity/account evidence; it neither writes nor orders Print Request lifecycle. |
| 5 | Event authority | **pass_with_changes** | The two server triggers may observe domain mutations post-commit, but clients/React/services must never create or alter lifecycle events. Persist source/change identity and derivation metadata. |
| 6 | Delete-event timestamp semantics | **pass_with_changes** | For Studio deletion, record that the lifecycle writer observed a Firestore delete at its trusted event time; do not claim a missing `canceledAt` existed or fabricate a precise historical timestamp. Retain an explicit source marker for this narrower evidence. |
| 7 | Editing narrative correctness | **pass_with_changes** | Show `Removed from show for editing` only when the same request has the causally paired removal and `editing_started` evidence. Otherwise render separate truthful `Removed from show` and `Editing started` rows. |
| 8 | Trigger ordering / retries | **pass_with_changes** | Trigger delivery is asynchronous and may reorder same-transaction changes. Deterministic event ids must make retries safe; timeline tie precedence must put source removal before Editing and source move/requeue before destination addition when timestamps tie. Mirror updates must be monotonic and must not recurse. |
| 9 | Card pagination | **pass_with_changes** | Replace `Number.MAX_SAFE_INTEGER` full-history loading with a cursor/buffer for each logical customer id and a k-way merge. Test page boundaries, merges still in progress, duplicate request ids, and exact stable ties. |
| 10 | Details order | **amended** | Owner follow-up changes the Details modal contract to newest → oldest by occurrence time, explicit lifecycle tie precedence, then stable event id. The implementation and focused test now enforce that direction. |
| 11 | Current-show presentation | **pass** | Cards may show only active/non-canceled destination context. Canceled source context belongs only to Details; schedule time is shown separately from occurrence time. |
| 12 | DNP / normal moves | **pass_with_changes** | Preserve `requeuedFromAllocationId`, `movedFromAllocationId`, source cancellation, and `needsStaffRequeueAt` as one logical request, without duplicate cards or invented events. |
| 13 | Schema / permissions | **pass_with_changes** | Add only the server mirror and immutable event collection. Rules must allow the existing authorized staff read path and deny all client lifecycle-event creates, updates, and deletes. Existing allocation/request mutation authority must not broaden. |
| 14 | Indexes | **pass_with_changes** | Add the reviewed card and Details composites, then verify exact Firebase index directions against the actual cursor queries in DEV before deploying. |
| 15 | Historical data | **pass_with_changes** | Backfill only the order mirror from supported domain timestamps. It must not create pretend past granular events, delete rows, or overwrite a newer forward activity. Do not enable `orderBy(lastLifecycleActivityAt)` until eligible historical requests have the field, because Firestore omits missing ordered fields. |
| 16 | Scope / environment | **pass** | No app implementation, data change, Function/Rules/index deploy, commit, push, Studio/Portal publish, or production action is authorized by this review. |

## Required implementation design controls

Before implementation is approved, preserve these constraints in code and tests:

- New Function exports are exactly:
  - `onPrintRequestLifecycleRequestWritten` — observes `printRequests/{printRequestId}`;
  - `onPrintRequestLifecycleAllocationWritten` — observes `showAllocations/{allocationId}`.
- The request trigger emits only a create, meaningful status transition, conversion, or
  release-only marker; it ignores its own read-mirror-only writes and non-lifecycle metadata.
- The allocation trigger emits only meaningful create/status/cancel/delete transitions. It
  snapshots minimum display-safe source/destination show context while the source is present.
- Both writers use deterministic source-change ids, immutable create-only event writes, and a
  transaction that advances `lastLifecycleActivityAt` only if the candidate is newer (with stable
  tie handling). An older delayed trigger cannot regress the mirror.
- The explicit same-time ordering is:
  `created → added → removed/moved-from/DNP-source → editing-started →
  moved-to/requeued-to → production-started → printed/completed → request-completed →
  converted/archived`. The final implementation may refine labels but not the causal ordering.
- A historical backfill is an owner-authorized, checkpointed Admin script, not a public or callable
  endpoint. It runs dry-run and small DEV batches first, records outcomes, and remains reversible
  by reader rollback rather than deleting evidence.

## Required change inventory

| Surface | Change required? | Review disposition |
|---|---:|---|
| Studio User Info history service/hook/types/builder/tests | yes | Implement only after owner authorization |
| Cloud Functions | **yes** | Add only the two named Firestore trigger exports above |
| Shared Print Request lifecycle types | yes | Add minimal app-neutral event/mirror contracts |
| Firestore Rules | **yes** | Staff read, all client lifecycle-event writes denied |
| Firestore indexes | **yes** | `printRequests(customerId ASC, lastLifecycleActivityAt DESC, __name__ DESC)` and `printRequestLifecycleEvents(printRequestId ASC, occurredAt ASC, __name__ ASC)`, subject to DEV query confirmation |
| Schema | **yes, additive** | Mirror fields + immutable lifecycle-event collection |
| Data/backfill | **yes, later** | Non-destructive ordering-mirror backfill only; separately authorized |
| ADR / durable documentation | **yes** | Amend WS4 lifecycle-history decision to establish source boundaries and backfill rules |
| Account Activity | no | Remains a separate identity/audit surface |

## Test and deployment gates

Implementation must add focused tests for lifecycle timestamps and precedence, Studio-delete
removal, portal cancellation, Editing/re-add, DNP release/requeue, normal moves, production,
conversion/archive, merge union, global cursor pagination, Rules denial, trigger idempotency, and
historical fallback. It must run the documented focused Studio tests, Functions tests/build,
typecheck/lint, and Rules suite if Rules change. No tests were run for this Plan/Formal Review.

A future DEV deployment may contain only:

```text
functions:onPrintRequestLifecycleRequestWritten,
functions:onPrintRequestLifecycleAllocationWritten,
firestore:rules,
firestore:indexes
```

The exact final allowlist must be rechecked in Implementation Review. Backfill execution is a
separate owner checkpoint after deploy readiness; it is not implied by deployment authorization.
Production promotion remains a separate explicit owner decision.

## Verdict and next checkpoint

**approved_with_changes** — the Plan may proceed only to the owner authorization gate. The
corrective is intentionally larger than a UI-only sort because a truthful, globally pageable
lifecycle requires forward server evidence and a read mirror.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PRINT REQUEST LIFECYCLE HISTORY CORRECTIVE]`

Owner authorization must explicitly cover implementation of the additive schema, the two named
Functions, Rules/index updates, documentation/ADR amendment, and later separately checkpointed
DEV backfill. It does not authorize deployment, data backfill, commit/push, Studio/Portal publish,
or production promotion.
