# Plan: User Info Print Request lifecycle activity ordering

| Field | Value |
|-------|-------|
| Date | 2026-09-09 |
| Author | Codex / FreshForge Planning |
| Status | **reviewed — approved_with_changes** |
| Workflow | managed-phase — **Plan + Formal Review only** |
| Managed goal | `user-info-print-request-lifecycle-activity-ordering` |
| Related | `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-review.md` |
| Parent context | Customer Identity WS4 lifecycle-history corrective |

---

## Goal

Correct Studio **User Info → Print Request History** so one card represents one logical Print
Request and cards are globally ordered by their most recent **business-significant Print Request
lifecycle activity**, not a show schedule or arbitrary document write. The lazy Details view must
tell the truthful request-scoped lifecycle, including removal for editing, entry to Editing, and
later re-addition to a show when those transitions are actually persisted. Account Activity remains
the separate account/identity audit surface.

## Background and mechanical findings

WS4 intended compact request cards, lazy request details, chronological request history, merged
customer support, and reconstructed historical allocations. The current implementation partially
delivers that contract but has no canonical lifecycle clock or durable lifecycle stream:

| Finding | Current repository evidence | Consequence |
|---------|-----------------------------|-------------|
| Card ordering | `buildPrintRequestHistoryCard.ts` compares `updatedAt`, then `createdAt`, then id. | A non-lifecycle update can move a card; an allocation lifecycle change is not itself the sort key. |
| Show schedule | `scheduledStartAt` is displayed in `showContext` but is not in the card comparator. | The observed “old show keeps request low” result is an indirect symptom of missing lifecycle ordering, not a literal scheduled-date comparator. |
| Current reads | `useCustomerUserInfo` asks for `Number.MAX_SAFE_INTEGER`; service loads all logical-customer requests and all their allocations, then slices client-side. | It happens to re-sort the full currently loaded set, but is an unbounded lifetime read and is not a pageable globally ordered read model. |
| Details | Created + raw “Last updated” + grouped allocation-created events + conversion are sorted newest-first. | Removal, Editing, and re-add are either absent, misleadingly inferred, or ordered in reverse of the requested narrative. |
| Account audit | `customerActivityEvents` is append-only, Admin-SDK-written identity evidence. Its type union contains only `account.*` values. | It must not become the Print Request lifecycle authority. |
| Studio remove for Editing | `unqueueStudioCustomerPrintRequestFromShow` deletes active allocation documents, then sets the request to `editing` and parks another continuable request when required. | Once deleted, the source allocation/show and removal timestamp cannot be reconstructed from current domain rows. |
| Portal remove for Editing | `unqueuePortalPrintRequestFromShow` cancels pending/queued rows with `canceledAt` and sets `editing` if no active allocation remains. | Some removal evidence survives, but it is not a complete cross-path history contract. |
| Studio add/re-add | `upcomingShowService.allocatePrintRequestItem` directly creates allocation rows; it changes request status only for `draft`/`editing` and later best-effort recomputes `queueTab`. | Direct staff allocation has no trusted lifecycle-audit writer; re-addition of an already-active request may not update `printRequests.updatedAt`. |
| Portal add/re-add | `queuePortalPrintRequestToShow` creates pending allocations and writes `status: "active"` in one trusted transaction. | Allocation creation is authoritative but no request-lifecycle event is written. |
| Did Not Print | `showProductionRecoveryRequeue` cancels source rows (`canceledAt`), creates target rows with `requeuedFromAllocationId`, and writes `needsStaffRequeueAt` for release-only recovery. | Valuable source/destination lineage exists but the WS4 builder currently underuses cancellation/activity timestamps. |
| Normal move | `showQueueMove` cancels source rows and creates target rows with `movedFromAllocationId`. | The same logical request can be shown once, but its history needs explicit source cancellation and destination-add activity. |
| Merge | `customerAccountMergeReassignment` updates historical `customerId` and `updatedAt` during reassignment; `resolveLogicalCustomerIds` remains a compatibility union. | `updatedAt` is provably unsafe as the lifecycle sort key; merged history needs a bounded union paginator. |

### Exact current User Info flow

`CustomerUserInfo modal → useCustomerUserInfo → customerPrintRequestHistoryService →
printRequestService / upcomingShowService → Firestore`.

1. The hook fetches the entire history page and the separate Account Activity page in parallel.
2. The history service resolves `customer.id + mergedSourceCustomerIds`, queries every matching
   `printRequests` document, then queries allocations by request id in chunks of ten.
3. It loads referenced shows one id at a time, reads related converted request names, builds one
   summary per request id, sorts summaries by `updatedAt` descending, and returns a client slice.
4. The Details action repeats the complete context load, then builds a request detail from the
   current request, current/all surviving allocations, and conversion fields.

No component directly queries Firestore; this corrective preserves the Component → Hook → Service
→ Firebase boundary.

### Current Details event sources and ordering

`buildPrintRequestHistoryDetailEvents` currently emits:

1. `Print request created` from `printRequests.createdAt`;
2. `Last updated` from `printRequests.updatedAt` when later than creation;
3. one grouped allocation event per show/kind, timestamped at allocation `createdAt`;
4. `Converted to Internal Request` from `convertedAt` or the unsafe `updatedAt` fallback;
5. merged-account attribution at request creation time.

It sorts those events **newest → oldest**. The Detail modal displays the value as-is. That is the
opposite of the owner’s requested natural lifecycle reading order and exposes a raw update as a
lifecycle milestone.

## Scope

### In scope

- Studio User Info Print Request History card ordering, cursor pagination, and card current-show context.
- Lazy Print Request Details lifecycle stream and deterministic historical reconstruction.
- A narrow, server-authored forward lifecycle-event contract needed for truthful Editing/remove/re-add history.
- Additive `lastLifecycleActivityAt` read-model maintenance, indexes, Rules, tests, DEV deployment
  inventory, and documentation/ADR amendment required by the reviewed implementation.

### Out of scope

- User Info redesign, customer Portal history, production workflow semantics, or Account Activity redesign.
- Client-written audit history, broad event sourcing, analytics, destructive data changes, or a retroactive destructive migration.
- Executing a backfill, Rules/index deployment, Function deployment, commit, push, Studio publish, Portal hosting, or production action.

## Authoritative lifecycle activity definition

A lifecycle activity is an occurrence that changes the request’s operational journey or
production outcome. It is **not** every `updatedAt` write.

| Activity | Authoritative source/time | Forward event | Historical fallback |
|----------|---------------------------|---------------|---------------------|
| Request created | `printRequests.createdAt` | `created` | same |
| Added/re-added to a show | allocation create `createdAt` | `added_to_show`; distinguishes `requeuedFromAllocationId` / `movedFromAllocationId` where present | surviving allocation `createdAt` |
| Removed from a show | allocation `canceledAt`, or Firestore delete event time for Studio’s delete path | `removed_from_show` | canceled allocation `canceledAt`; deleted source is unavailable pre-forward-event |
| Editing started | `printRequests.status` transition to `editing` with the source mutation timestamp | `editing_started` | only a status-compatible timestamp when preserved; otherwise omit rather than invent |
| Normal move | source cancellation + destination create | `moved_from_show` + `moved_to_show` | `canceledAt` + destination `createdAt`/`movedFromAllocationId` |
| Did Not Print → requeue | source cancellation + destination `requeuedFromAllocationId` | `did_not_print_requeued` plus source context | existing lineage and timestamps |
| Did Not Print release-only | `needsStaffRequeueAt` | `released_for_requeue` | same |
| Production starts | allocation `in_progress` transition / show `printStartedAt` when request-scoped attribution exists | `production_started` (coalesced per request/show) | supported allocation timestamp only |
| Production allocation completes | allocation `printedAt` / `completedAt` | `allocation_printed` / `allocation_completed` (coalesced) | same |
| Request completed | request `status → completed` | `request_completed` | status transition timestamp if persistently supported; otherwise completion allocations |
| Customer → Internal conversion | `convertedAt` | `converted_to_internal` | same |
| Archive/closure | `status → archived` or `closureKind` | `archived` / `converted_to_internal` | persisted closure fields only |

Excluded: customer-merge reassignment, `queueTab` recomputation, denormalized snapshots,
identity propagation, harmless metadata edits, hydrated fields, and unrelated request item edits.

### Event/timestamp precedence

For a card with a forward lifecycle event, `lastLifecycleActivityAt` is the maximum event
occurrence timestamp. For a historical card with no forward events, use the maximum supported
domain timestamp in this order of evidence (not a blind `updatedAt` fallback):

1. `convertedAt`, `needsStaffRequeueAt`;
2. allocation `completedAt`, `printedAt`, `canceledAt`, `queuedAt`, `createdAt`;
3. request `createdAt`.

Ties use explicit causal precedence — `created → added → removed/moved-from/DNP-source →
editing-started → moved-to/requeued-to → production-started → printed/completed →
request-completed → converted/archived` — and then a stable event/request id, never scheduled
show time. Details sort **newest → oldest** by occurrence time, lifecycle tie precedence, then
stable event id. The card list is also **newest activity → oldest**.

## Proposed implementation strategy — selected Option C

### Options considered

| Option | Correctness / pagination | Historical compatibility | Verdict |
|--------|--------------------------|--------------------------|---------|
| A. Derive from every request + allocation at read time | Can be correct only by loading the full customer history; cannot preserve bounded global pagination. | Good for surviving data only; cannot recover Studio-deleted source allocations. | Rejected. |
| B. Persist only `lastLifecycleActivityAt` without event evidence | Enables global card query but cannot truthfully render remove → Editing → re-add Details. | Historical fallback still incomplete. | Rejected. |
| C. New canonical lifecycle events plus derived `lastLifecycleActivityAt` on `printRequests` | Bounded indexed card queries; lazy request-scoped Detail; durable forward Editing/removal evidence. | Deterministic fallback for old requests; explicit limitation for deleted pre-event allocations. | **Selected.** |

### Additive read model

1. Add server-only `printRequestLifecycleEvents/{eventId}` documents. Each contains:
   `printRequestId`, `customerId` when applicable, type, `occurredAt`, derivation/source,
   optional source/destination allocation and show references, and display-safe show title/schedule
   snapshots. It never stores an authorization grant and remains immutable to clients.
2. Add optional server-maintained `printRequests.lastLifecycleActivityAt` and a stable
   `lastLifecycleActivityEventId` tie-break mirror. It is a read-optimization mirror like
   `queueTab`, not status authority.
3. Implement exactly two idempotent server event-writer exports:
   `onPrintRequestLifecycleRequestWritten` for `printRequests/{printRequestId}` and
   `onPrintRequestLifecycleAllocationWritten` for `showAllocations/{allocationId}`.
   They tightly filter request create/status/conversion/release-only transitions and allocation
   create/update/delete transitions. Use the original source timestamp where present; only the
   delete trigger uses Firestore’s trusted event time because the Studio unqueue path has no
   persistent `canceledAt`.
4. Every writer writes a deterministic idempotency key from the source document/change/event
   identity, then transactionally advances `lastLifecycleActivityAt` only when newer. Trigger
   reactions to their own mirror/event writes are explicitly ignored.
5. Do not write lifecycle events from React, Firestore client services, or `customerActivityEvents`.
   The underlying mutation authority remains unchanged; the trigger is a post-commit,
   server-trusted observation writer.

This is deliberately request-scoped observability, not application-wide event sourcing.

### Exact Editing lifecycle coverage

| Transition | Current mutation | New truthful evidence |
|------------|------------------|-----------------------|
| Studio remove for Editing | `unqueueStudioCustomerPrintRequestFromShow` deletes non-canceled allocation rows, recalculates the show, then updates request to `editing` and runs queue-tab recompute. | Allocation-delete lifecycle event with source show context; request-status `editing_started` event. The former is labeled `Removed from show`; the paired transition may read `Removed from show for editing` only when the tied `editing_started` evidence is present. |
| Portal remove for Editing | `unqueuePortalPrintRequestFromShow` updates rows to `canceled` with `canceledAt` then updates the request to `editing`. | `removed_from_show` at `canceledAt` and `editing_started`. |
| Studio re-add | `allocatePrintRequestItem` creates a new allocation, restores `active` only from draft/editing, recomputes `queueTab`, and clears requeue markers. | `added_to_show` from the new allocation. Copy is `Re-added to show` only when an earlier Editing event exists; otherwise `Added to show`. |
| Portal re-add | `queuePortalPrintRequestToShow` creates pending allocations and restores `active` transactionally. | Same `added_to_show` evidence, coalesced per request/show action. |

The existing data is therefore **not sufficient** to reconstruct all future or historical
remove/edit/re-add sequences. In particular, a Studio-deleted allocation has no existing history
after the delete. The new writers are required for forward completeness; older history is
truthfully partial.

## Read and pagination design

### Cards

Replace the full-history `Number.MAX_SAFE_INTEGER` load with a stateful logical-customer paginator:

1. Query each `resolveLogicalCustomerIds` stream by `customerId`, `lastLifecycleActivityAt DESC`,
   and stable document-id DESC, using a bounded page size of 15 plus an in-memory per-stream
   buffer/cursor.
2. K-way merge the heads, dedupe by `printRequest.id`, and emit the newest 15 globally.
   A stream buffer of at least the requested page size proves no unseen entry in that stream can
   outrank the emitted page.
3. Maintain a cursor/buffer per logical customer id through Load more. Refill only exhausted
   streams. This supports a merge partially in progress while ordinary WS3-completed requests
   already reside under the survivor customer id.
4. Never client-sort a Firestore `updatedAt` page and claim a global activity order.
5. Do not enable the indexed cursor path until the non-destructive backfill has populated
   `lastLifecycleActivityAt` for every eligible historical request; otherwise `orderBy` omits
   documents lacking the field and can hide older history.

### Details

Details remain lazy. For the selected request only:

1. authorize through existing Studio permissions and verify the request belongs to the resolved
   logical customer ids;
2. read the request, related conversion request, its allocations, referenced shows, and bounded
   `printRequestLifecycleEvents` ordered `occurredAt ASC`;
3. coalesce repeated per-item allocation status events into one request/show/milestone row;
4. merge missing historical evidence from request/allocation fields only, with deterministic source
   signatures so forward events are not duplicated;
5. show activity occurrence time separately from `Scheduled <show date/time>`.

No realtime listener, polling loop, direct component Firestore access, or unbounded lifetime read
is introduced.

## Current show vs history presentation

The compact card uses active (non-canceled) destination allocations only. It chooses the active
destination with the newest applicable allocation lifecycle timestamp and preserves existing
status-priority behavior for otherwise equal candidates. A canceled source show is never presented
as current. Details retain source shows as historical rows, including Did Not Print, normal move,
and Editing removal lineage.

Examples of repository-truthful wording:

- `Print request created`;
- `Added to show` / `Re-added to show`;
- `Removed from show` or `Removed from show for editing` only when supported by the paired state;
- `Editing started`;
- `Moved to another show`;
- `Released for re-queue`;
- `Production started` / `Printing completed`;
- `Converted to Internal Request`.

Each row may include `Show title · Scheduled …` and a distinct `Occurred …` timestamp. Raw enum
names are never rendered.

## Data, security, backend, Rules, and index impact

### Expected files / modules

- `apps/studio/src/renderer/src/features/users/services/customerPrintRequestHistoryService.ts`
- `apps/studio/src/renderer/src/features/users/hooks/useCustomerUserInfo.ts`
- `apps/studio/src/renderer/src/features/users/utils/buildPrintRequestHistoryCard.ts` and tests
- `apps/studio/src/renderer/src/features/users/types/customerPrintRequestHistory.types.ts`
- `functions/src/index.ts`, `onPrintRequestLifecycleRequestWritten.ts`, and
  `onPrintRequestLifecycleAllocationWritten.ts`
- `packages/shared/src/types/printRequest/*` and a shared lifecycle-event type/helper where
  genuinely app-neutral
- `firestore.rules`, `firestore.indexes.json`
- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `SECURITY.md`, `TESTING.md`,
  `docs/project/DECISIONS.md` (WS4/ADR amendment), and handoff documentation

### Security

- Existing User Info permissions remain the only read authority:
  `canViewPrintRequests`, `canViewUpcomingShows`, and current Studio user-information gates.
- `printRequestLifecycleEvents` reads are staff-only; direct client create, update, and delete are
  denied. Event logs never authorize a mutation.
- Server writers validate only trusted before/after document fields and store minimum display-safe
  context. No raw role checks in React components and no client-supplied actor/event type.

### Schema and Rules

Schema change: **YES**, additive only:

- `printRequests.lastLifecycleActivityAt` and stable tie-break mirror;
- immutable `printRequestLifecycleEvents` documents.

Rules change: **YES** — add a narrow staff-read / all-client-writes-denied match for the new
collection. Existing print-request and allocation mutation authority is not broadened merely to
write audit fields.

### Indexes

Index change: **YES**, expected:

1. `printRequests(customerId ASC, lastLifecycleActivityAt DESC, __name__ DESC)` for bounded
   logical-customer card streams.
2. `printRequestLifecycleEvents(printRequestId ASC, occurredAt ASC, __name__ ASC)` for Details.

The implementation must verify exact Firebase index requirements on DEV and amend names/directions
only if the executed query proves a different composite is required.

### Migration/backfill

Backfill: **YES, non-destructive and separately authorized.**

The backfill populates only `lastLifecycleActivityAt` from the deterministic historical precedence
above. It does not delete, rewrite, fabricate, or bulk-create fine-grained past lifecycle events.
Run dry-run/limited DEV evidence first, use checkpointed/idempotent batches, record skipped or
ambiguous documents, and keep the existing full-history reader as rollback until verification is
accepted. No backfill is run in this phase.

## Test strategy

### Automated implementation tests to add

| Coverage | Required proof |
|----------|----------------|
| Card identity | one card per request through split allocations, moves, requeues, and merged identity union |
| Global sorting | latest lifecycle activity wins across streams/pages; show scheduled time never controls ordering; deterministic tie-break |
| Editing | Studio delete/remove → Editing → re-add event sequence; Portal canceled remove equivalent; current card moves after mirror update |
| Current context | active destination shown; canceled source historical only |
| Did Not Print | move/requeue and release-only `needsStaffRequeueAt` remain one card and truthful timeline |
| Normal move | canceled source plus `movedFromAllocationId` destination produces no duplicate card/event |
| Production | start, printed/done, request completion; no duplicate per-item timeline spam |
| Conversion/archive | CR→IR lifecycle/card linkage and closure remain visible without separate customer card duplication |
| Historical fallback | missing forward events retain created/allocation/conversion evidence; no invented Studio-deleted removal timestamp |
| Pagination | per-logical-id cursors/buffers produce global latest-first pages without all-history read |
| Merge | source/survivor union dedupes request/event evidence and uses stable attribution |
| Account separation | `customerActivityEvents` stay in Account Activity and cannot order/duplicate PR lifecycle |
| Permissions | staff allow, non-staff deny lifecycle-event reads/writes; existing User Info gates unchanged |
| Trigger idempotency | retry/replayed event does not duplicate rows or regress `lastLifecycleActivityAt` |
| Rules | all lifecycle-event match cases plus existing allocation/PR regression suite |

### Planned commands (implementation phase only)

| Check | Command | Required |
|-------|---------|----------|
| Focused Studio tests | repository targeted `node --test` / workspace test command for touched history suites | yes |
| Functions tests/build | `npm --prefix functions run build` plus focused trigger tests | yes |
| Studio typecheck/lint | established workspace typecheck and targeted ESLint | yes |
| Rules | `npm run test:rules` if Rules change | yes |
| DEV QA | owner Studio User Info lifecycle checklist | yes |

No tests are claimed as run by this Plan.

### Planned Owner DEV QA

Use a request on a past show, remove it for editing, edit, and re-add it to a current/upcoming
show. Verify newest card placement, current destination, newest-first Details sequence,
separate occurrence/schedule times, Did Not Print/move/conversion/merged samples, Account Activity
separation, and no permission regression.

## Deployment inventory and rollback

Future DEV deployment is expected to require:

- exactly `functions:onPrintRequestLifecycleRequestWritten` and
  `functions:onPrintRequestLifecycleAllocationWritten`;
- `firestore:rules`;
- `firestore:indexes` after exact index confirmation.

No Portal App Hosting, Studio publish, data mutation, or production deploy is part of this plan.
The historical backfill is a separately authorized, checkpointed Admin script rather than a
public/callable Function. The final deploy allowlist must be confirmed in Implementation Review
before any owner deployment authorization. Rollback disables the new reader behind the existing history
service, leaves immutable evidence intact, and stops using the new index/mirror; it never deletes
history. A post-deploy Function rollback requires a separate approved command.

## Documentation / ADR impact

Amend the WS4 lifecycle-history decision record (or add a focused ADR amendment) to establish:

- request lifecycle evidence is distinct from `customerActivityEvents`;
- server-maintained `lastLifecycleActivityAt` is a read mirror;
- immutable request-scoped lifecycle events and historical fallback boundaries;
- indexed global pagination and merged-customer k-way merge;
- the future runtime/index/backfill deployment inventory.

## Open questions

- [x] No blocking product decision. The owner’s activity-order rule, Details direction, account
  separation, and Plan + Review-only boundary are explicit.
- [ ] Implementation authorization is required after Formal Review, including approval of the
  additive schema, Rules/index changes, Functions, and separately checkpointed DEV backfill.

## Approval

- Formal Review: `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-activity-ordering-review.md`
- Verdict: **approved_with_changes** — implementation remains owner-gated
