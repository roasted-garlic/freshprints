# Print Request Sizing And Duplicate Items Plan

Date: 2026-07-03
Mode: Managed Phase
Goal: `print-request-sizing-and-duplicate-items-planning`
Roadmap Area: Phase 6 - Customers And Print Requests follow-up

## Workflow Gate

Status: planning document only. Implementation is not approved.

The active managed phase remains `print-request-query-index-hardening` with its own plan at
`docs/workflow/plans/2026-07-03-print-request-query-index-hardening-plan.md`.
This plan is a separate future Phase 6 follow-up and must not replace, expand, or block the
query/index hardening plan.

Required flow before any implementation:

1. Plan
2. Review
3. Implement
4. Test
5. Signoff

## 1. Goal

Add standard Print Request item sizing, allow the same catalog design to appear multiple times with different requested sizes, and move request naming to transaction-safe internal and per-customer counters.

## 2. Phase Alignment

This is a Phase 6 follow-up after the signed-off Customers and Print Requests foundation. It belongs
after the active `print-request-query-index-hardening` phase because request naming must not depend
on broad, paginated, filtered, or truncated request-list reads.

This phase remains separate from:

- Phase 7 Print Runs / Upcoming Shows.
- Phase 8 Fresh Prints Portal implementation.
- Phase 9 Custom Requests.

The implementation should prepare shared service/data-model seams that Portal can reuse later, but
must not implement customer-created Portal requests in this phase.

## 3. Current State

Repo paths inspected:

- `shared/types/printRequest/printRequest.types.ts`
- `src/renderer/src/features/print-requests/services/printRequestService.ts`
- `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
- `src/renderer/src/features/print-requests/hooks/usePrintRequestSelectionMode.ts`
- `src/renderer/src/features/designs/`
- `src/renderer/src/features/users/`
- `src/renderer/src/features/firebase/constants/firestoreCollections.ts`
- `firestore.rules`
- `firestore.indexes.json`

Findings:

- `PrintRequestItem` already has optional `printWidthInches` and `printHeightInches`.
- Firestore rules already allow optional `printWidthInches` and `printHeightInches` on
  `printRequestItems`.
- `printRequestService.addPrintRequestItem` currently snapshots `design.printWidthInches` and
  `design.printHeightInches` when a design is added.
- Request item size is not currently user-editable in `PrintRequestItemCard`; the item edit form
  only edits quantity, item notes, and production status.
- `PrintRequestItemCard` does not currently display the persisted size label or dynamic DPI
  feedback.
- `usePrintRequestSelectionMode` stores selected designs in a `Record<string, ...>` keyed by
  `designId`; this prevents more than one selected row per design.
- `printRequestService.savePrintRequestDesignSelections` builds `currentItemsByDesignId`, so saving
  selections updates an existing item for the same design instead of preserving duplicate rows.
- Customer request naming is generated in `PrintRequestsPage.buildCustomerRequestName` from the
  currently loaded `requests` array and uses a lowercased slug format like `sarah-001`.
- Internal request names are manually entered in the create modal.
- `PrintRequest` currently stores `name`, `customerId`, `isInternal`, `status`, `itemCount`,
  optional `notes`, and audit timestamps/users. It does not store a request sequence number or a
  customer display-name snapshot.
- `Customer` currently stores `totalPrintRequests`, but no dedicated next request sequence field.
- `firestore.indexes.json` has no Print Request indexes yet; those are planned by the separate
  query/index hardening phase.

## 4. Product Decisions

Confirmed decisions for this phase:

- No customer notes on standard Print Requests.
- No size presets.
- Requested item sizing uses width and height entry only.
- Aspect ratio remains locked: editing width recalculates height; editing height recalculates width.
- Dynamic DPI or quality feedback is shown while requested size changes.
- The same design with different sizes becomes separate `printRequestItems` rows.
- Duplicate same-design rows must not overwrite each other.
- Customer request naming uses a customer display name snapshot, not username.
- Internal request names use `Internal Request #0001`, `Internal Request #0002`, etc.
- Customer request names use `Sarah Request #0001`, `Sarah Request #0002`, etc.
- Request sequence numbers are transaction-based counters, not derived from list scanning.
- Request naming must not depend on paginated, filtered, or truncated request lists.
- Designs remain catalog records only; request/production status must not be written to
  `designs.status`.

## 5. Proposed Data Model

### Print Request

Recommended `PrintRequest` fields:

```ts
interface PrintRequest {
  id: string;
  name: string;
  customerId?: string;
  isInternal: boolean;
  status: PrintRequestStatus;
  itemCount: number;
  requestSequenceNumber: number;
  displayNameSnapshot: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Notes:

- Keep `name` as the full visible request name, e.g. `Internal Request #0001` or
  `Sarah Request #0001`.
- `requestSequenceNumber` stores the assigned numeric sequence.
- `displayNameSnapshot` stores `Internal Request` for internal requests and the customer display
  name at creation time for customer requests. Existing request names should not change when a
  customer display name changes later.
- Do not expose customer notes for standard Print Requests. If internal-only notes are retained for
  staff before Portal, they need an explicit security/product decision and should not be customer
  visible.

### Print Request Item

Recommended `PrintRequestItem` fields:

```ts
interface PrintRequestItem {
  id: string;
  printRequestId: string;
  designId: string;
  quantity: number;
  printWidthInches: number;
  printHeightInches: number;
  sizeLabel?: string;
  status: PrintRequestItemStatus;
  addedBy: string;
  printedAt?: Timestamp;
  printedBy?: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Notes:

- `printWidthInches` and `printHeightInches` already exist as optional fields. This phase should
  make them required for newly created standard request items if product-approved validation rules
  are settled.
- Dynamic DPI does not need to be persisted if it can be derived from the catalog design pixel
  dimensions and requested item size. Persisting `effectiveDpi` on items is optional and should be
  avoided unless a later reporting/export workflow needs a frozen value.
- Keep duplicate same-design items as separate documents. The identity is the item document ID, not
  `designId`.
- Keep production/request item status on `printRequestItems`, never on `designs`.

### Customer Counter

Recommended customer counter model:

```ts
interface Customer {
  // existing fields...
  nextPrintRequestSequence?: number;
}
```

Use a Firestore transaction to:

1. Read `customers/{customerId}`.
2. Resolve the current `nextPrintRequestSequence` or default to `1`.
3. Snapshot `customer.displayName`.
4. Create `printRequests/{id}` with `requestSequenceNumber`, `displayNameSnapshot`, and `name`.
5. Increment `customers/{customerId}.nextPrintRequestSequence`.
6. Increment or maintain `totalPrintRequests` if that counter remains useful.

This is the simplest model that works for Studio now and Portal later, because both surfaces can
share the same service/callable pattern. If Portal rules cannot safely allow this transaction
directly in Phase 8, expose the same behavior through a callable Cloud Function then.

### Internal Counter

Recommended internal counter model:

```txt
counters/printRequests
  nextInternalRequestSequence: number
```

Use a Firestore transaction to:

1. Read `counters/printRequests`.
2. Resolve `nextInternalRequestSequence` or default to `1`.
3. Create `printRequests/{id}` with `requestSequenceNumber`, `displayNameSnapshot: "Internal Request"`,
   and `name: "Internal Request #0001"`.
4. Increment `nextInternalRequestSequence`.

Alternative: `settings/printRequests` could hold the counter, but a dedicated counter document is
clearer and avoids mixing runtime sequencing with admin configuration. Any new collection or
document path must be reflected in shared constants and Firestore rules.

### Migration / Backfill

No migration or backfill is proposed for this phase without a separate human checkpoint.

If existing requests need sequence metadata later, create a separate migration plan with:

- Backfill ordering rule.
- Collision handling.
- Dry run.
- Production approval.
- Rollback notes.

## 6. Proposed Implementation Outline

Plan only. Do not implement without review approval.

### Shared Types And Utilities

- Update `shared/types/printRequest/printRequest.types.ts` with `requestSequenceNumber` and
  `displayNameSnapshot` after review approval.
- Consider making request item `printWidthInches` and `printHeightInches` required for new writes
  while keeping mapper compatibility for old records.
- Add shared request-size utility functions, likely under `shared/utils/`, to:
  - Recalculate height from width and design aspect ratio.
  - Recalculate width from height and design aspect ratio.
  - Calculate effective DPI from catalog pixel dimensions plus requested item size.
  - Resolve DPI quality tier using existing print-size thresholds.
- Reuse existing `shared/utils/printSizeMath.ts` and `shared/constants/printSize.constants.ts`
  where practical.

### Service Logic

- Move request name creation out of `PrintRequestsPage` into `printRequestService` or a small pure
  helper used by the service.
- Replace caller-provided `name` for normal create flows with service-owned transaction naming.
- Add separate transaction paths:
  - `createInternalPrintRequest`.
  - `createCustomerPrintRequest`.
- Remove list-scanning sequence logic.
- Update `CreatePrintRequestInput` so callers pass intent (`isInternal` or `customerId`) rather
  than a computed request name.
- Update `CreatePrintRequestItemInput` to accept requested width and height.
- Validate requested item dimensions in service code before writing.
- Update item create/update methods so width/height edits update `sizeLabel` consistently.
- Change `savePrintRequestDesignSelections` so it no longer uses `designId` as the uniqueness key.
  It should create distinct request items per selection row, or compare by an explicit
  item/selection ID plus requested size.
- Keep `designs.requestCount` and `designs.lastRequestedAt` behavior only if still desired; do not
  mutate `designs.status`.

### Hooks

- Refactor `usePrintRequestSelectionMode` away from `Record<designId, selection>`.
- Use stable client-side selection row IDs so the same design can appear multiple times before
  saving.
- Include requested width, requested height, quantity, and design ID per selection row.
- Keep hooks responsible for UI state orchestration only; sizing math should come from shared
  utilities.

### Components

- Add width and height numeric inputs to item creation/edit surfaces.
- When width changes, update height from aspect ratio; when height changes, update width.
- Show dynamic DPI/quality feedback near the sizing controls.
- Display item size in collapsed request item cards.
- Add `Duplicate item` or `Add another size` action. Recommended approach:
  - Add `Add another size` in request item/detail context for clarity.
  - Optionally add `Duplicate item` as a convenience that copies design, quantity, and size, then
    lets staff edit the new size.
- Remove or hide standard customer-facing notes from Print Request creation/edit surfaces. If
  internal staff notes remain, rename them explicitly and keep them out of future Portal scope.
- Do not add size presets.

### Firestore Rules

- Tighten `printRequests` validation to allow `requestSequenceNumber` and `displayNameSnapshot`.
- If item dimensions become required for new request items, update `printRequestItems` validation
  carefully while preserving read compatibility for legacy records as needed.
- Add validation for any counter document path.
- Do not relax rules.
- Do not grant customer role access in this phase.
- Do not deploy rules during planning; any deploy is a separate checkpoint.

### Tests

Add focused tests using the repo's `npx tsx --test ...` pattern:

- Request-name formatting:
  - `Internal Request #0001`.
  - `Sarah Request #0001`.
  - Display name snapshot handles whitespace and length.
- Transaction/counter helper behavior:
  - Internal counter increments without reading request lists.
  - Customer counter increments per customer without reading request lists.
  - Naming does not depend on filtered/truncated request arrays.
- Request item sizing:
  - Width edit recalculates height.
  - Height edit recalculates width.
  - Effective DPI/quality tier updates from dimensions.
  - Invalid zero/negative/non-finite dimensions are rejected.
- Duplicate same-design items:
  - Same `designId` with different sizes creates separate rows.
  - Saving a new size does not overwrite an existing item.
  - Summaries count unique designs separately from total quantity.
- Service regression:
  - Item status updates still do not mutate `designs.status`.

### Docs

Update after implementation:

- `docs/architecture/DATA_MODEL.md` for new request metadata and counter fields.
- `docs/WORKFLOWS.md` for standard request item sizing and same-design multi-size behavior.
- `docs/project/ROADMAP.md` current status after signoff.
- `docs/project/DECISIONS.md` with an ADR for request naming counters and duplicate-size item
  semantics.
- `docs/project/TECH_DEBT.md` if any current debt is resolved or new debt is intentionally
  deferred.

## 7. Out Of Scope

- No implementation in this planning task.
- No migration or backfill.
- No Firebase deploy.
- No Firestore index deploy.
- No Firestore rules relaxation.
- No Portal account creation.
- No customer-created Portal requests.
- No Print Runs.
- No show selection.
- No show capacity.
- No reduce/move/split behavior.
- No Custom Request implementation.
- No customer notes on standard Print Requests.
- No size presets.
- No production or request lifecycle status writes to `designs.status`.
- No change to category or tag resolver behavior.
- No new dependencies unless separately approved during implementation review.

## 8. Risks And Product Decisions Needed

- `[NEEDS PRODUCT DECISION]` Confirm whether request item DPI feedback should use the existing
  catalog quality tiers exactly: Optimal >= 300, Good 250-299, Bad 200-249, Terrible 72-199, and
  below 72 rejected.
- `[NEEDS PRODUCT DECISION]` Confirm whether standard request item sizing should block save below
  72 DPI or only warn. Current catalog import rejects below 72 DPI, but request sizing may need
  explicit standard-request rules.
- `[NEEDS PRODUCT DECISION]` Confirm maximum allowed standard request size in inches. Existing
  `MAX_REASONABLE_PRINT_WIDTH_INCHES` is 72 as a sanity cap, not necessarily a product limit.
- `[NEEDS PRODUCT DECISION]` Confirm whether item-level `notes` should be removed now, renamed
  internal-only, or left untouched until Portal planning. Standard customer notes are explicitly
  out of scope.
- `[NEEDS PRODUCT DECISION]` Confirm whether existing manual request-name editing should remain
  available after auto-generated names are introduced. If editable, sequence metadata must remain
  immutable.
- Risk: Direct client transactions for counters are acceptable for staff in Studio, but future
  Portal customer writes may require callable Functions so customers cannot mutate counters beyond
  their own records.
- Risk: Existing requests without sequence fields will need compatibility handling until a
  human-approved migration/backfill exists.
- Risk: Selection-mode refactor must preserve current Design Library request-selection ergonomics
  while changing its state identity from design ID to row ID.

## 9. Acceptance Criteria

- A request item can store requested width and height.
- Editing width updates height by aspect ratio.
- Editing height updates width by aspect ratio.
- DPI or quality feedback updates dynamically as requested size changes.
- The same design can appear multiple times on one request when sizes differ.
- Duplicate same-design items do not overwrite each other.
- Internal request names use transaction-based sequence.
- Customer request names use transaction-based per-customer sequence.
- Customer request names use display name snapshot, not username.
- Request naming does not depend on loaded request list contents.
- Existing request names do not change if a customer display name changes.
- Standard Print Requests do not expose customer notes.
- Size presets are not added.
- Design lifecycle status remains catalog-only; no request or production status is written to
  `designs.status`.
- No Portal, Print Run, show capacity, or Custom Request behavior is added.

## 10. Verification Plan

Automated checks after implementation:

- `npx tsx --test <new print request test path>`
- `npx tsc --noEmit`
- `npm run lint`
- `npx vite build`
- `git diff --check`

Manual QA after implementation:

- Create an internal request and confirm name format increments as `Internal Request #0001`,
  `Internal Request #0002`, etc.
- Create a customer request and confirm name format uses customer display name snapshot, e.g.
  `Sarah Request #0001`.
- Create another request for the same customer and confirm sequence increments.
- Add one design to a request with default requested width/height.
- Edit width and confirm height updates by aspect ratio.
- Edit height and confirm width updates by aspect ratio.
- Confirm DPI or quality feedback updates as dimensions change.
- Duplicate the same design with a different size.
- Confirm both same-design items persist as separate rows.
- Reload/revisit the request and confirm duplicate same-design items remain separate.
- Confirm request summaries still show correct total quantity and unique design count.
- Confirm no standard customer notes or size presets appear.
- Confirm no design document status changes when request items are created or edited.

## 11. Human Checkpoints

Required before implementation:

- Review approval of this plan or a revised version.
- Product decisions for DPI thresholds, blocking behavior, standard size limits, and item-note
  treatment.

Required separately if proposed later:

- Any migration or backfill.
- Any Firestore rules deploy.
- Any Firebase Functions deploy.
- Any Firestore index deploy.
- Any rules relaxation.
- Any Portal behavior.
- Any customer-created request behavior.
- Any Print Run behavior.
- Any show capacity or reduce/move/split behavior.
- Any Custom Request behavior.
