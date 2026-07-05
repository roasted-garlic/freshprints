# Print Request Query Index Hardening Plan

Date: 2026-07-03
Mode: Managed Phase
Goal: `print-request-query-index-hardening`
Roadmap Area: Phase 6 - Customers And Print Requests

## Workflow Gate

Status: plan drafted. Implementation is blocked until review approval.

Required flow:

1. Plan
2. Review
3. Implement
4. Test
5. Signoff

## Problem

Phase 6 intentionally shipped Print Requests with several broad Firestore reads while the feature surface was still small. That now needs to be hardened before scale.

Current broad-read surfaces:

- `printRequestService.listPrintRequests` reads the full `printRequests` collection and sorts in memory.
- `printRequestService.listPrintRequestItemSummaries` reads the full `printRequestItems` collection to summarize cards.
- `printRequestService.listPrintRequestItems` reads all `printRequestItems`, filters by `printRequestId` in memory, and sorts in memory.
- `printRequestService.listCustomers` reads all `customers` and sorts in memory.
- `firestore.indexes.json` has no Print Request, Print Request Item, or Customer query indexes for this feature.

Related documented debt:

- `docs/project/TECH_DEBT.md` TD-014.
- `docs/workflow/reviews/2026-06-29-phase-6-print-requests-catch-up-test-report.md` Section 7.
- `docs/architecture/DATA_MODEL.md` indexing considerations.

## Goals

- Replace Print Request feature broad reads with explicit query paths backed by Firestore indexes where composite indexes are required.
- Preserve the current Print Requests UI behavior: list, create, request naming, item summaries, detail view, ready-design selection, item update/remove, and customer labels.
- Add focused tests for query planning and summary behavior so later filter/pagination work has guardrails.
- Update durable docs to match implemented query/index behavior.

## Non-Goals

- No Firebase deploy or index deploy in this phase.
- No Firestore data migration or backfill.
- No new dependencies.
- No Firestore rules relaxation.
- No design lifecycle status changes.
- No Print Runs implementation.
- No customer portal work.
- No new visible filter UI unless needed to preserve existing behavior.
- No denormalized aggregate migration for `totalQuantity` or `uniqueDesignCount`.

## Proposed Implementation

### 1. Add explicit query option types and query builders

Update `src/renderer/src/features/print-requests/services/printRequestService.ts` to use server-side query constraints instead of collection-wide reads.

Planned request query options:

- `status?: PrintRequest["status"]`
- `customerId?: string`
- `isInternal?: boolean`

Planned item query options:

- `printRequestId: string`
- `status?: PrintRequestItemStatus`

Planned customer query options:

- `isGuest?: boolean`

Default methods should preserve current callers. Optional filters can be added without changing UI behavior immediately.

### 2. Harden request list reads

Change `listPrintRequests(caller, options?)` to build a Firestore query with:

- optional `where("status", "==", options.status)`
- optional `where("customerId", "==", options.customerId)`
- optional `where("isInternal", "==", options.isInternal)`
- `orderBy("updatedAt", "desc")`

The current Print Requests page can continue calling the unfiltered form so request naming logic still has the same data shape as today. If implementation introduces a page limit later, request-name sequencing must first move to an indexed customer-specific query so numbering does not silently become incomplete.

### 3. Harden item detail and item summary reads

Change `listPrintRequestItems(caller, printRequestId, options?)` to query:

- `where("printRequestId", "==", printRequestId)`
- optional `where("status", "==", options.status)`
- `orderBy("updatedAt", "desc")`

Replace global item summary loading with request-scoped summary loading for the current request list:

- Add `listPrintRequestItemSummariesForRequests(caller, printRequestIds)` or update the existing method to require request IDs.
- For each loaded request ID, query that request's items by `printRequestId`.
- Reuse the existing `buildPrintRequestItemSummaries` behavior after the request-scoped reads.

This removes the global item scan without introducing a denormalized summary migration. If the request list grows enough that per-request summary queries become costly, a future phase should add denormalized request-level summary fields plus a planned migration/backfill.

### 4. Harden customer reads without breaking labels

Change `listCustomers(caller, options?)` to use an ordered query:

- optional `where("isGuest", "==", options.isGuest)`
- `orderBy("displayName", "asc")`

The Print Requests page should continue preserving existing customer label behavior. If only non-guest customers are requested for the create dropdown, the implementation must still ensure existing request cards can resolve labels for any customer IDs they display.

### 5. Add Firestore indexes

Update `firestore.indexes.json` for the implemented composite query paths.

Expected indexes:

- `printRequests.status ASC, updatedAt DESC`
- `printRequests.customerId ASC, updatedAt DESC`
- `printRequests.isInternal ASC, updatedAt DESC`
- `printRequestItems.printRequestId ASC, updatedAt DESC`
- `printRequestItems.printRequestId ASC, status ASC, updatedAt DESC`
- `customers.isGuest ASC, displayName ASC`

Do not deploy these indexes during this phase. Deployment remains a separate human checkpoint.

Important schema note: `docs/architecture/DATA_MODEL.md` and prior workflow notes mention `printRequests.guestCustomerId + updatedAt`, but the current shared `PrintRequest` type and renderer service do not include `guestCustomerId`. Implementation should not add an unused runtime query for that field. Either update docs to reflect the current code model, or add the index only if review decides guest customer IDs are still an intended near-term schema field.

### 6. Add focused tests

Add Print Request service or utility tests using the repo's existing `tsx --test` pattern.

Preferred coverage:

- Query descriptor/helper coverage for request list default ordering and optional `status`, `customerId`, and `isInternal` filters.
- Query descriptor/helper coverage for item list by `printRequestId`, including optional item `status`.
- Query descriptor/helper coverage for customer ordering and optional `isGuest`.
- Summary aggregation coverage for `totalQuantity` and `uniqueDesignCount` from request-scoped items.
- Regression coverage that customer request naming does not become dependent on a truncated or filtered request list.

If Firestore query objects are awkward to inspect directly in unit tests, extract small pure query descriptor builders and keep Firebase constraint conversion thin.

### 7. Update documentation

After implementation and tests:

- Update `docs/architecture/DATA_MODEL.md` indexing considerations to reflect actual implemented indexes and clarify the `guestCustomerId` mismatch.
- Update `docs/project/TECH_DEBT.md` TD-014 as resolved or narrowed to future denormalized summaries if any residual aggregation concern remains.
- Update `docs/project/ROADMAP.md` current status once the phase is tested and signed off.
- Update `docs/WORKFLOWS.md` if it still describes Print Requests as relying on broad reads.

## Acceptance Criteria

- Print Request item details no longer read the full `printRequestItems` collection.
- Print Request card summaries no longer read the full `printRequestItems` collection.
- Customer list reads are explicitly ordered server-side and support the `isGuest` index path without breaking existing labels.
- Request list reads use explicit server-side ordering and supported filter query paths.
- Required composite indexes are present in `firestore.indexes.json`.
- Current Print Requests UI behavior is preserved.
- Dedicated Print Request tests cover query planning and summary behavior.
- No Firebase deploy, data migration, rules relaxation, dependency addition, or production write is performed.

## Verification Plan

Run after implementation:

- `npx tsx --test <new print request test path>`
- `npx tsc --noEmit`
- `npm run lint`
- `npx vite build`
- `git diff --check`

Manual QA recommended before signoff:

- Open Print Requests.
- Confirm request cards load with customer labels and item/quantity counts.
- Create a customer request.
- Open request details and confirm items load.
- Add, update, and remove an item from a request.
- Confirm internal request behavior still works.

## Human Checkpoints

Required before implementation:

- Review approval of this plan.

Required after implementation, outside this phase unless separately approved:

- Deploying Firestore indexes with Firebase.
- Any data migration/backfill for denormalized summaries.
- Any schema decision to add `guestCustomerId` to runtime types and writes.
