# Print Request Item Sizing And Username Naming Plan

Date: 2026-07-04
Mode: Managed Phase
Goal: `print-request-item-sizing-and-username-naming`
Roadmap Area: Phase 6 - Customers And Print Requests follow-up

## Workflow Gate

Status: planning document only. Implementation is not approved.

`print-request-query-index-hardening` is complete and signed off. This plan is a new Phase 6
follow-up and must not reopen query/index hardening unless implementation later finds a regression.

Required flow before any implementation:

1. Plan
2. Review
3. Implement
4. Test
5. Signoff

## 1. Goal

Add standard Print Request item sizing/editing, duplicate same-design item rows, unique customer
usernames, and transaction-safe username-based request naming without adding Print Runs, Portal, or
Custom Request behavior.

## 2. Phase Alignment

This is a Phase 6 follow-up to the signed-off Customers and Print Requests foundation.

It remains separate from:

- Phase 7 Print Runs / Upcoming Shows.
- Phase 8 Fresh Prints Portal and customer-created Portal requests.
- Phase 9 Custom Requests and special-instruction/custom-art intake.

The implementation should prepare shared types, validation, and service-owned transaction paths that
the future Portal can reuse, but this phase must not implement Portal account linking, Portal
screens, customer Auth behavior, Print Runs, show capacity, or Custom Requests.

## 3. Current State

Docs and repo paths inspected:

- `project-chatgpt-handoff/CURRENT-STATE.md`
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/project/DECISIONS.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/standards/CODING_STANDARDS.md`
- `docs/standards/SECURITY.md`
- `docs/workflow/plans/2026-07-03-print-request-sizing-and-duplicate-items-plan.md`
- `shared/types/printRequest/printRequest.types.ts`
- `shared/types/customer/customer.types.ts`
- `src/renderer/src/features/print-requests/`
- `src/renderer/src/features/designs/`
- `src/renderer/src/features/customers/services/customerService.ts`
- `src/renderer/src/features/users/`
- `src/renderer/src/features/firebase/constants/firestoreCollections.ts`
- `firestore.rules`
- `firestore.indexes.json`

Findings:

- An attached behavior-reference image for future Print Request item controls shows the intended interaction pattern more clearly than the current Studio UI: thumbnail, width/height inputs, locked aspect ratio, DPI quality labels, quantity stepper, duplicate button, and remove button. It also shows `Remove Background` and `Upscale` toggles, but those remain out of scope for standard Print Requests in this phase.
- Customer creation is handled from `/users` through `src/renderer/src/features/users/components/AddUserModal.tsx`, `useCreateCustomerRecord`, and `src/renderer/src/features/customers/services/customerService.ts`.
- Customer edit is handled by `src/renderer/src/features/users/components/EditCustomerModal.tsx` and `useUpdateCustomerRecord`.
- The shared `Customer` type has no username or handle field. Current fields are `displayName`, optional `email`, optional `notes`, `isGuest`, `totalPrintRequests`, deprecated counters, and audit timestamps.
- Current customer uniqueness logic checks email by loading team users and customers; it does not enforce username uniqueness.
- Current customer request naming is generated in `src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.ts` via `buildCustomerRequestName`.
- `PrintRequestsPage.tsx` calls that helper with the currently loaded `customers` and `requests` arrays. The helper scans loaded requests for names like `sarah_smith-004`, so current naming relies on full loaded request lists.
- `PrintRequest` has no request sequence number, customer username snapshot, display-name snapshot, or counter metadata.
- `PrintRequestItem` already supports optional `printWidthInches`, `printHeightInches`, and `sizeLabel`.
- `printRequestService.addPrintRequestItem` currently snapshots `design.printWidthInches`, `design.printHeightInches`, and a derived size label when the item is created.
- `PrintRequestItemCard.tsx` currently displays item production status as a badge and exposes quantity, production status dropdown, item notes, and immediate delete in the expanded form.
- Notes and production status can be hidden from the standard Print Request UI without removing the persisted fields yet, because `printRequestItems` already stores them and `updatePrintRequestItem` can preserve current values when standard item edits update only quantity and size.
- Design Library request-selection quantity controls live in `src/renderer/src/features/designs/components/DesignSelectionCard.tsx`, using minus/input/plus buttons with minimum quantity handling.
- Those controls should be factored into a reusable request quantity control or closely reused for request item editing.
- Design print size math lives in shared utilities: `shared/utils/printSizeMath.ts`, `shared/utils/effectiveDpiQuality.ts`, and `shared/constants/printSize.constants.ts`.
- The current Design Edit form fields do not own the reusable size math; request item sizing should reuse the shared print-size utilities directly.
- `savePrintRequestDesignSelections` dedupes by `designId` using `currentItemsByDesignId`, so same-design rows currently overwrite/update instead of remaining separate.
- `usePrintRequestSelectionMode` stores selected designs by `designId`, so the Design Library selection state also prevents multiple selected rows for the same design.
- Firestore rules allow `printWidthInches`, `printHeightInches`, and `sizeLabel` on `printRequestItems`, but customer rules do not allow username fields and print request rules do not allow sequence/snapshot fields.
- `firestore.indexes.json` contains the signed-off query hardening indexes, but no username or counter-specific indexes.
- The prior `2026-07-03-print-request-sizing-and-duplicate-items-plan.md` is compatible on sizing/duplicate rows, but its display-name request naming recommendation is superseded here by the product decision to use customer usernames.

## 4. Product Decisions

Confirmed decisions for this phase:

- Customer requests use a unique customer username plus a per-customer transaction sequence.
- Username is required when creating a customer.
- Username is required when editing and saving a customer record.
- No customer username migration or backfill is needed in this phase because there are no real existing customers.
- Dev/test customer records without usernames may remain readable for compatibility, but creating a new print request for them must be blocked until a username is added.
- Do not create an automatic username backfill.
- Customer display name is not unique and must not be the request-name base.
- Usernames are lowercase, contain no spaces, and use only letters, numbers, underscores, and hyphens.
- Usernames must be 3-32 characters long.
- Usernames must start and end with a letter or number.
- Duplicate usernames are blocked.
- Request naming must not scan loaded, paginated, filtered, or truncated request lists.
- Internal request sequencing uses a transaction-safe global internal counter.
- Customer request sequencing uses a transaction-safe per-customer counter.
- Request item quantity editing uses the same minus/input/plus pattern as Design Library request-selection cards.
- Request item delete requires a confirmation step before removal.
- Standard Print Request item UI does not show customer notes or a production status dropdown.
- Standard Print Requests handle design, quantity, requested width, requested height, and calculated DPI/quality feedback.
- Requested width/height are edited in inches.
- Aspect ratio remains locked; width changes recalculate height and height changes recalculate width.
- DPI/quality feedback updates dynamically.
- Existing print-size/DPI utilities should be reused where practical.
- No size presets.
- No aspect-ratio unlock.
- Same-design items with different requested sizes are separate `printRequestItems` documents.
- Duplicate item creates a separate item document and must not overwrite an existing same-design row.
- The duplicate-item behavior should be planned as shared request-item behavior that can later serve both staff in Studio and customers in Portal, without implementing Portal in this phase.
- Duplicate item behavior is implemented in the request detail item UI first.
- Design Library request-selection mode may remain one selected row per design for now.
- Production status and custom work belong to later production/Print Run or Phase 9 Custom Request workflows, not the standard Print Request item editing surface.
- Design lifecycle status remains catalog-only; this phase must not write request or production state to `designs.status`.
- Existing persisted `notes` and `status` fields may remain for compatibility.
- Standard Print Request item UI hides notes.
- Standard Print Request item UI hides the production status dropdown and status badge.
- Normal quantity/size edits preserve existing hidden `notes`/`status` values and must not write production status changes.
- DPI/quality labels use:
  - `Optimal`: 300 DPI or higher.
  - `Good`: 200-299 DPI.
  - `Minimum`: 72-199 DPI.
  - `Below Minimum`: under 72 DPI.
- Live calculated DPI is shown as width/height changes.
- Saving requested sizes below 72 DPI is blocked.
- Requested sizes from 72 DPI through 299 DPI warn but are allowed.
- Requested sizes at 300 DPI or higher save without warning.
- Standard Print Requests allow requested print sizes up to 22 inches on the longest side.
- If either requested width or requested height is greater than 22 inches, saving as a standard Print Request item is blocked.
- When blocked by the 22-inch size cap, the UI should tell the user that this needs to be handled as a Custom Request.
- Custom Requests remain Phase 9 work and must not be implemented in this phase.
- The 22-inch size cap is separate from DPI quality rules.

Recommended final customer request name format:

```txt
{username}-{sequence}
```

Examples:

```txt
sarahsmith-0001
sarahsmith-0002
```

Rationale: the compact slug-style format matches the current request list naming style better than
`@sarahsmith Request #0001`, is easier to scan in dense operational lists, remains URL/file/export
friendly, and avoids coupling persisted request names to display copy. The UI can still show the
customer display name or username separately where helpful.

Recommended internal request name format:

```txt
internal-0001
internal-0002
```

Rationale: this keeps internal request names consistent with the customer slug-style format and
avoids list scanning or manual name entry.

## 5. Proposed Data Model

### Customer Username

Add fields to `Customer`:

```ts
interface Customer {
  // existing fields...
  username: string;
  usernameUpdatedAt?: Timestamp;
  nextPrintRequestSequence: number;
}
```

Username normalization and validation:

- Trim whitespace.
- Lowercase.
- Reject spaces instead of silently replacing them.
- Allow only `a-z`, `0-9`, `_`, and `-`.
- Required length: 3-32 characters.
- Required pattern: `^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$`.
- Reserved usernames:
  - `internal`
  - `admin`
  - `owner`
  - `support`
  - `portal`
  - `print`
  - `prints`
  - `customer`
  - `customers`
  - `staff`
  - `team`
  - `freshprints`
  - `funkyfreshprints`

Username uniqueness:

- Do not enforce uniqueness by query-only checking; concurrent writes can race.
- Add a reservation collection keyed by normalized username:

```txt
customerUsernames/{username}
  customerId: string
  createdAt: Timestamp
  updatedAt: Timestamp
```

- Create/update customer username and the reservation document in one Firestore transaction.
- On create, the reservation doc must not already exist.
- On update, the old reservation should be deleted or marked released in the same transaction after the new reservation is secured.
- This path needs shared constants, service support, and Firestore rules. It should not be deployed without a separate rules/deploy checkpoint.

### Print Request

Add fields to `PrintRequest`:

```ts
interface PrintRequest {
  // existing fields...
  requestSequenceNumber: number;
  customerUsernameSnapshot?: string;
  customerDisplayNameSnapshot?: string;
}
```

Notes:

- `name` remains the persisted visible/stable request name, e.g. `sarahsmith-0001` or `internal-0001`.
- `requestSequenceNumber` stores the assigned integer.
- `customerUsernameSnapshot` preserves the username used at creation time so existing request names do not change after a username edit.
- `customerDisplayNameSnapshot` preserves the display label at creation time for future list/detail display resilience.
- Internal requests omit customer snapshots and use the global internal counter.
- Existing requests without these fields need read compatibility until a human-approved migration/backfill exists.

### Customer Counter

Store customer request counters on the customer document:

```txt
customers/{customerId}
  nextPrintRequestSequence: number
```

Customer request creation transaction:

1. Read `customers/{customerId}`.
2. Validate customer has a normalized `username`.
3. Read `nextPrintRequestSequence`, defaulting to `1` for compatibility if missing.
4. Create `printRequests/{id}` with `requestSequenceNumber`, `customerUsernameSnapshot`, `customerDisplayNameSnapshot`, and `name: "{username}-{sequence.padStart(4, "0")}"`.
5. Increment `customers/{customerId}.nextPrintRequestSequence`.
6. Increment or maintain `totalPrintRequests` if the current counter remains useful.

This model works for Studio now and can be reused by Portal later, either directly through carefully
scoped customer rules or via a callable Cloud Function in Phase 8.

### Internal Counter

Store the internal sequence in a dedicated counter document:

```txt
counters/printRequests
  nextInternalRequestSequence: number
```

Internal request creation transaction:

1. Read `counters/printRequests`.
2. Read `nextInternalRequestSequence`, defaulting to `1` if the doc is missing.
3. Create `printRequests/{id}` with `name: "internal-0001"` and `requestSequenceNumber: 1`.
4. Increment `nextInternalRequestSequence`.

Add `counters` to `FIRESTORE_COLLECTIONS` only when implementation is approved.

### Print Request Item Requested Size

Existing fields should be used:

```ts
interface PrintRequestItem {
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
}
```

Implementation recommendation:

- Keep these optional in shared read types for legacy compatibility.
- Require finite positive width/height for newly created or edited standard request items.
- Block standard request item saves when either requested dimension exceeds 22 inches.
- Continue deriving `sizeLabel` from requested width/height for compact display.
- Do not persist item-level DPI quality unless a later reporting/export workflow needs a frozen value.
- Derive DPI/quality in the UI or service layer from the design pixel dimensions plus requested item dimensions using existing shared utilities.

### Migration / Backfill

No migration or automatic backfill is part of this phase.

Compatibility direction:

- Existing dev/test customer records without usernames may remain readable.
- Creating a new customer print request for a customer without a username must be blocked until the username is added.
- Existing requests without new sequence/snapshot fields need read compatibility until they are replaced organically or handled by a separately approved migration later.

## 6. Proposed Implementation Outline

Plan only. Do not implement without review approval.

### Shared Types And Utilities

- Update `shared/types/customer/customer.types.ts` with `username`, optional `usernameUpdatedAt`, and `nextPrintRequestSequence`.
- Add a pure username utility, likely under `shared/utils/`, for normalization, validation, reserved-name checking, and display error messages.
- Update `shared/types/printRequest/printRequest.types.ts` with `requestSequenceNumber`, optional `customerUsernameSnapshot`, and optional `customerDisplayNameSnapshot`.
- Add pure request naming helpers:
  - `formatCustomerPrintRequestName(username, sequence)`.
  - `formatInternalPrintRequestName(sequence)`.
  - zero-pad sequences to 4 digits.
- Add or reuse pure request item size helpers:
  - calculate height from width and design aspect ratio.
  - calculate width from height and design aspect ratio.
  - calculate effective DPI for requested item size.
  - resolve quality label/class from existing quality thresholds.
- Reuse `shared/utils/printSizeMath.ts`, `shared/utils/effectiveDpiQuality.ts`, and `shared/constants/printSize.constants.ts` rather than duplicating DPI logic in components.

### Service Logic

- Move request naming ownership out of `PrintRequestsPage`.
- Replace caller-provided customer request names with service-owned transaction creation.
- Add service methods such as:
  - `createCustomerPrintRequest(caller, { customerId })`.
  - `createInternalPrintRequest(caller)`.
- Use Firestore transactions for customer and internal counters.
- Preserve compatibility for existing manual/internal request records until they are replaced or a later migration is approved.
- Add customer create/update transaction paths that reserve normalized usernames in `customerUsernames/{username}`.
- Require username in the customer create flow.
- Require username in the customer edit/save flow.
- Update customer mappers in both `customerService` and `printRequestService` to read username fields.
- Update `CreatePrintRequestItemInput` and `UpdatePrintRequestItemInput` to accept requested width and height.
- Ensure item updates for standard UI preserve existing hidden `status` and `notes` values unless explicitly changed by a future production workflow.
- Add a duplicate item service method or reuse add-item with an explicit source item:
  - Read existing item.
  - Read ready design.
  - Create a new item document with the same `designId`, quantity, width, height, and default/preserved standard fields.
  - Increment parent request `itemCount`.
- Keep Design Library request-selection mode one-row-per-design for now.
- Change `savePrintRequestDesignSelections` only as needed so later duplicate-size rows created in request detail are not merged away by `designId`.
- Add-design behavior from Design Library may continue to create one default-size row per selected design for now.
- Continue incrementing `designs.requestCount` and `designs.lastRequestedAt` only as lightweight request metadata if still desired; never write `designs.status`.

### Hooks

- Keep hooks as UI orchestration, not Firebase or business-rule owners.
- Refactor request item edit state to support quantity, width, height, DPI quality, delete confirm state, duplicate action state, and save state.
- Refactor Design Library request-selection mode away from `Record<designId, selection>` if implementation expands selection mode to multiple same-design rows before save.
- If duplicate same-design row creation is limited to request detail first, keep selection mode one-row-per-design initially and document that duplicate-size rows are created from the request detail item UI.

### Components

- Replace the current `PrintRequestItemCard` expanded form with standard item controls:
  - thumbnail.
  - title.
  - quantity minus/input/plus.
  - duplicate button.
  - delete button with confirmation state.
  - requested width input in inches.
  - requested height input in inches.
  - locked aspect ratio behavior.
  - dynamic DPI/quality indicator, using the attached reference as a behavior model rather than a strict visual design.
- Hide item notes and production status dropdown from the standard Print Request item UI.
- Hide the item production status badge from the standard item card unless a separate production workflow view is introduced later.
- Display requested size in the collapsed/summary state.
- Display quality feedback in the approved operational format:
  - `Optimal` for 300+ DPI.
  - `Good` for 200-299 DPI.
  - `Minimum` for 72-199 DPI.
  - `Below Minimum` for under 72 DPI.
- Show the live calculated DPI as width/height changes.
- Block save when requested width or height exceeds 22 inches and explain that oversize work belongs in Custom Requests.
- Block save when requested size falls below 72 DPI.
- Warn but allow save from 72 DPI through 299 DPI.
- Consider extracting a reusable `QuantityStepper` from `DesignSelectionCard.tsx` so Design Library selection and Print Request item editing share behavior.
- Use existing button/icon patterns (`Minus`, `Plus`, `Copy` or `CopyPlus`, `Trash2`) and accessible labels.
- Do not add size presets, customer notes, custom instructions, status workflows, `Remove Background`, `Upscale`, reduce/move/split controls, or show capacity.

### Firestore Rules

- Allow and validate new customer fields:
  - `username`.
  - `usernameUpdatedAt`.
  - `nextPrintRequestSequence`.
- Add validation for `customerUsernames/{username}` reservation docs.
- Add validation for `counters/printRequests`.
- Allow and validate new print request fields:
  - `requestSequenceNumber`.
  - `customerUsernameSnapshot`.
  - `customerDisplayNameSnapshot`.
- Keep item status fields valid for persistence but do not expose status editing in standard UI.
- Tighten requested-size validation for new standard writes if legacy compatibility can be maintained.
- Do not grant customer role access or Portal writes in this phase.
- Do not relax Firestore rules.
- Do not deploy rules without a separate human checkpoint, even if manual QA later requires a dev rules deploy.

### Tests

Add focused tests using the repo's `npx tsx --test ...` pattern:

- Username utility tests:
  - lowercases and trims.
  - rejects spaces.
  - rejects unsupported characters.
  - rejects reserved usernames.
  - enforces 3-32 characters.
  - enforces alphanumeric start/end.
  - accepts letters, numbers, underscore, and hyphen.
- Request naming tests:
  - `sarahsmith-0001`.
  - `sarahsmith-0012`.
  - `internal-0001`.
  - naming does not depend on loaded request arrays.
- Counter planning/service tests:
  - customer counter increments per customer.
  - internal counter increments globally.
  - missing counter defaults are handled.
- Request item sizing tests:
  - width edit recalculates height.
  - height edit recalculates width.
  - invalid zero/negative/non-finite sizes are rejected.
  - DPI quality updates from requested dimensions.
  - requested sizes above 22 inches on either axis are blocked.
  - oversize validation message points users to Custom Requests.
  - below-72 DPI saves are blocked.
  - 72-299 DPI saves warn but are allowed.
  - 300+ DPI saves succeed without warning.
- Duplicate item tests:
  - same `designId` with different sizes creates separate rows.
  - duplicate action creates a new item ID.
  - existing item is not overwritten by duplicate.
  - summaries count total quantity and unique design count correctly.
- UI-oriented tests where practical:
  - quantity stepper minimum.
  - delete confirm state.
  - notes/status controls are not rendered in the standard item card.
- Regression tests:
  - standard item edits do not write production state to `designs.status`.

### Docs

Update after implementation:

- `docs/architecture/DATA_MODEL.md` for customer usernames, username reservations, counters, request snapshots, and item requested sizing.
- `docs/WORKFLOWS.md` for standard Print Request item controls, username-based naming, and duplicate same-design rows.
- `docs/project/ROADMAP.md` after signoff.
- `docs/project/DECISIONS.md` with an ADR for username uniqueness, request counters, final naming format, and duplicate item identity.
- `docs/standards/SECURITY.md` for customer username reservation and counter write boundaries.
- `docs/project/TECH_DEBT.md` if this resolves the request-naming list-scan guardrail or introduces a tracked migration/backfill follow-up.

## 7. Out Of Scope

- No implementation in this planning task.
- No migration or backfill.
- No Firebase deploy.
- No Firestore index deploy.
- No Firestore rules deploy.
- No Firestore rules relaxation.
- No production writes.
- No customer Auth or Portal account linking.
- No customer-created Portal requests.
- No Portal UI.
- No Print Runs.
- No show selection.
- No show capacity.
- No reduce, move, or split behavior.
- No Custom Request implementation.
- No customer notes on standard Print Requests.
- No size presets.
- No aspect-ratio unlock.
- No `Remove Background` or `Upscale` controls.
- No production status workflow in the standard Print Request item UI.
- No production status writes to `designs`.
- No design lifecycle status changes.
- No category/tag resolver changes.
- No new dependencies unless separately approved during implementation review.

## 8. Risks And Product Decisions Needed

- Risk: Firestore client-side uniqueness and counters require careful transaction and rules design; future Portal may need callable Functions instead of direct customer writes.
- Risk: Making username required for all customer writes means any dev/test customer records edited or used for new request creation must first be updated with a valid username.
- Risk: Refactoring selection state away from design ID can affect current Design Library request-selection ergonomics.
- Risk: Existing request items without width/height need display and edit fallback behavior until migrated or edited.

## 9. Acceptance Criteria

- Customer create form requires username.
- Customer edit flow validates username.
- Customer edit/save requires username.
- Duplicate customer usernames are blocked transaction-safely.
- Customer request names use username sequence, e.g. `sarahsmith-0001`.
- Internal request names use internal sequence, e.g. `internal-0001`.
- Request naming does not depend on loaded request list contents.
- Request item quantity uses minus/input/plus controls.
- Quantity validates minimum value.
- Delete requires confirmation before removal.
- Standard Print Request item UI does not show notes.
- Standard Print Request item UI does not show production status dropdown.
- Standard Print Request item UI does not show a production status badge.
- Standard Print Request item UI does not write production status as part of normal quantity/size edits.
- Width and height can be edited in inches.
- Requested sizes above 22 inches on either axis are blocked for standard Print Requests.
- Oversize validation tells the user the work belongs in a Custom Request.
- Aspect ratio remains locked.
- Updating width recalculates height.
- Updating height recalculates width.
- DPI/quality feedback updates dynamically.
- Same design can appear multiple times with different requested sizes.
- Duplicate button creates a separate item, not an overwrite.
- The duplicate-item behavior is modeled so the same service/data rules can later support both staff and customer request editing surfaces.
- Request summaries still show correct total quantity and unique design count.
- Design lifecycle status remains unchanged.

## 10. Verification Plan

Automated checks after implementation:

- `npx tsx --test <new print request test path>`
- `npx tsc --noEmit`
- `npm run lint`
- `npx vite build`
- `git diff --check`

Manual QA after implementation:

- Create a customer with username.
- Edit a customer username.
- Confirm duplicate username is blocked.
- Create a customer request and confirm username-based name.
- Create another request for the same customer and confirm sequence increments.
- Create an internal request and confirm internal sequence name.
- Add a design to a request.
- Duplicate that design.
- Change size on the duplicate.
- Confirm both items persist separately after reload/revisit.
- Adjust width and confirm height recalculates.
- Adjust height and confirm width recalculates.
- Try a requested width above 22 inches and confirm save is blocked with Custom Request guidance.
- Try a requested height above 22 inches and confirm save is blocked with Custom Request guidance.
- Confirm DPI feedback changes as dimensions change.
- Confirm the 22-inch max rule is enforced independently from DPI warnings.
- Increase and decrease quantity with buttons.
- Type quantity directly and confirm validation.
- Confirm delete requires confirmation before the item is removed.
- Confirm notes and production status dropdown are not shown.
- Confirm no design lifecycle status changes occurred.
- Confirm a customer without a username cannot be used to create a new print request until the username is added.

## 11. Human Checkpoints

Required before implementation:

- Review approval of this plan or a revised version.

Required separately if proposed later:

- Any migration or backfill.
- Any Firestore rules deploy.
- Any Firebase Functions deploy.
- Any Firestore index deploy.
- Any rules relaxation.
- Any production write.
- Any Portal behavior or customer-created request behavior.
- Any Print Run behavior.
- Any show capacity or reduce/move/split behavior.
- Any Custom Request behavior.
