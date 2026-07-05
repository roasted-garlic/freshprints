# Print Request Detail Autosave And Name Locking Plan

Date: 2026-07-04
Mode: Managed Phase
Goal: `print-request-detail-autosave-and-name-locking`
Roadmap Area: Phase 6 - Customers And Print Requests follow-up

## Workflow Gate

Status: signed off PASS after implementation, automated verification, dev Firestore rules deploy,
and user-run authenticated manual QA.

QA correction on 2026-07-04: Request Detail fields are not autosaved. Item quantity/width/height
still autosave, but the expanded Request Detail section uses a manual save button. While staff type
an internal base name, the generated request-name field previews the derived `baseName-IR###`
value. Nothing in Request Detail is persisted until staff clicks the Request Detail save button.

Required workflow:

1. Plan
2. Review
3. Implement
4. Test
5. Signoff

This plan follows the signed-off `print-request-item-sizing-and-username-naming` phase and captures
the QA follow-up notes for autosave, stable item ordering, generated-name locking, and the revised
request naming format.

## 1. Goal

Make Print Request detail editing feel stable and quiet by autosaving normal item edits, preserving
item order, removing noisy controls/alerts, locking generated request fields, and updating request
name formats to `username-CR001` and `baseName-IR001`.

## 2. Phase Alignment

This is a Phase 6 follow-up for the staff Print Request workflow in Fresh Prints Studio.

It remains separate from:

- Phase 7 Print Runs / Upcoming Shows.
- Phase 8 Fresh Prints Portal and customer-created Portal requests.
- Phase 9 Custom Requests and custom-design intake.

The implementation should keep shared utilities and types reusable for future Portal work, but must
not implement Portal behavior, Print Runs, show capacity, or Custom Requests.

## 3. Current State

Docs and repo paths inspected:

- `project-chatgpt-handoff/CURRENT-STATE.md`
- `.cursor/workflow/state.md`
- `docs/workflow/plans/2026-07-04-print-request-item-sizing-and-username-naming-plan.md`
- `docs/project/ROADMAP.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/project/DECISIONS.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/standards/CODING_STANDARDS.md`
- `docs/standards/SECURITY.md`
- `shared/types/printRequest/printRequest.types.ts`
- `src/renderer/src/features/print-requests/`
- `src/renderer/src/features/customers/`
- `src/renderer/src/features/users/`
- `src/renderer/src/features/firebase/constants/firestoreCollections.ts`
- `firestore.rules`
- `firestore.indexes.json`

No requested path differed. `project-chatgpt-handoff/CURRENT-STATE.md` exists but is stale relative
to `.cursor/workflow/state.md`; workflow state is authoritative.

Current behavior discovered from the repo:

- `PrintRequestsPage.tsx` owns page-level `successMessage`, `actionError`, and `reloadAll()`.
- Request item success alerts are triggered in `handleUpdateItem`, `handleDuplicateItem`, and
  `handleRemoveItem` by setting page-level success messages such as `Print request item updated.`
  and rendering `DismissibleSuccessAlert`.
- Request item save buttons are rendered in `PrintRequestItemCard.tsx` inside each item form as
  `Save item`.
- The normal item fields currently saved manually are `quantity`, `printWidthInches`, and
  `printHeightInches`.
- `PrintRequestItemCard.tsx` already keeps local state for quantity, width, height, locked aspect
  ratio recalculation, DPI/quality feedback, duplicate, and remove confirmation.
- Quantity, width, and height controls use native `type="number"` inputs, so browser spinner
  controls remain visible.
- `handleUpdateItem` submits a form, calls `printRequestService.updatePrintRequestItem`, shows a
  success alert, and calls `reloadAll()`, which reloads request lists, customers, ready designs,
  and the selected request details.
- `handleDuplicateItem` calls `printRequestService.duplicatePrintRequestItem`, shows a success
  alert, and calls `reloadAll()`. The service itself creates a new item document; the disruptive
  behavior comes from the page-wide reload path rather than a browser page refresh.
- `usePrintRequestDetails` loads the selected request and items through
  `printRequestService.getPrintRequestById` and `listPrintRequestItems`.
- `buildPrintRequestItemsQueryPlan` orders request items by `updatedAt desc`, so editing an item
  updates `updatedAt` and can move that item to the top of the visual list.
- Current required index definitions include `printRequestItems.printRequestId ASC, updatedAt DESC`
  and `printRequestItems.printRequestId ASC, status ASC, updatedAt DESC`.
- `PrintRequestsPage.tsx` currently renders request status editing in the expanded request detail
  form through a `Select` named `requestStatus`.
- `PrintRequestsPage.tsx` currently renders request name editing in the expanded request detail
  form through a `TextInput` named `requestName`.
- `printRequestService.updatePrintRequest` currently accepts and writes `name` and `status`.
- `PrintRequest` currently has `name`, optional `requestSequenceNumber`,
  `customerUsernameSnapshot`, and `customerDisplayNameSnapshot`, but no `internalBaseName` field.
- `formatCustomerPrintRequestName` currently emits `username-0001`; `formatInternalPrintRequestName`
  currently emits `internal-0001`.
- `createCustomerPrintRequest` assigns names transaction-safely from the customer username snapshot
  and per-customer sequence counter.
- `createInternalPrintRequest` assigns names transaction-safely from `counters/printRequests`.
- `firestore.rules` allows `name`, `status`, `requestSequenceNumber`, and customer snapshot fields
  on `printRequests`; it does not currently validate internal base-name fields.

Planning question answers:

1. Request item success alerts are triggered in `PrintRequestsPage.tsx` in `handleUpdateItem`,
   `handleDuplicateItem`, and `handleRemoveItem`.
2. Request item save buttons are rendered in `PrintRequestItemCard.tsx` as the form submit button.
3. Manual item saves currently write `quantity`, `printWidthInches`, and `printHeightInches`.
4. Autosave should cover item quantity, item requested width, and item requested height. Request
   Detail fields use manual save.
5. Recommended debounce timing: 600 ms after the last valid local edit.
6. Autosave failures should show a bottom-right `Save failed` state with a short error detail and
   a retry action, without page-wide success alerts.
7. Duplicate currently does not force a true browser reload, but it calls `reloadAll()`, which
   refetches more data than needed and feels disruptive.
8. Duplicate can update state dynamically by appending the returned created item into the selected
   request item state, then refreshing only summaries/request metadata as needed.
9. Saved items move because item detail queries sort by `updatedAt desc` and saves mutate
   `updatedAt`.
10. Use stable item ordering by request-scoped reads plus client-side ordering:
    `sortOrder` when present, then `createdAt`, then document ID, rather than visual ordering by
    `updatedAt`.
11. A new `sortOrder` field is recommended. Existing `createdAt` could reduce jumping for simple
    cases, but `sortOrder` is better for future explicit reorder, duplicate insertion, and
    migration/backfill clarity.
12. Stable ordering does not need new indexes if the first implementation keeps the Firestore read
    scoped by `printRequestId` and sorts client-side. Add `sortOrder` indexes only if the final
    implementation truly uses server-side `orderBy(sortOrder)`.
13. Request status is edited today in the expanded request detail form in `PrintRequestsPage.tsx`.
14. Request status should be hidden from this page for now, not disabled as a visible editable
    field, because no status workflow is approved here.
15. Request name is edited today in the expanded request detail form in `PrintRequestsPage.tsx`.
16. Customer request names should be displayed read-only and service-generated only.
17. Internal base-name editing should preview the derived `name` from `internalBaseName` + locked
    `IR` sequence while staff type, then update the separate `internalBaseName` field and persisted
    `name` only when Request Detail is manually saved.
18. Needed fields: `requestSequenceNumber`, customer snapshots already exist; add
    `internalBaseName` and likely `nameFormatVersion`.
19. Keep existing `name` as the persisted display value for query/list simplicity, but derive and
    rewrite it from `internalBaseName` and `requestSequenceNumber` when the internal base name
    changes. Do not let UI write arbitrary `name`.
20. Tests are needed for naming helpers, stable item query planning, autosave debounce/state
    reducers or hooks, item ordering, and service-level update restrictions.
21. Docs needing updates after implementation: `DATA_MODEL.md`, `WORKFLOWS.md`, `ROADMAP.md`,
    `DECISIONS.md`, `SECURITY.md`, and `TECH_DEBT.md`.

## 4. Product Decisions

Confirmed decisions:

- No native number spinners on quantity, width, or height inputs.
- Normal item edits autosave.
- Autosave uses a subtle bottom-right indicator.
- Normal autosaves do not show noisy success alerts.
- Normal autosaved item fields do not use item-level save buttons.
- Duplicate should update dynamically without a disruptive full detail/page refresh.
- Item order should not change just because an item was saved.
- Request status should not be editable from the Print Request detail page.
- Customer request names should not be editable.
- Customer request format should be `username-CR001`.
- Internal request format should be `baseName-IR001`.
- Internal request create UX uses an `Internal base name` input.
- The `Internal base name` input starts blank.
- If staff leaves internal base name blank, normalize it to `internal`.
- Internal base name may be edited.
- Internal sequence remains locked and not editable.
- Request Detail fields do not autosave. Existing visible request notes and internal base-name edits
  persist only through the Request Detail manual save button.
- Request-level notes should not be newly added. If existing request notes remain visible on this
  page, they should use the same Request Detail manual save flow; if they are not needed here, do
  not add notes behavior.
- Existing legacy internal requests remain readable. No migration or backfill is approved.
- If a legacy internal request has a usable `requestSequenceNumber` and staff edits its internal
  base name, upgrade only that request to `baseName-IR###` using the locked existing sequence.
- If a legacy internal request lacks a usable sequence number, leave its legacy name readable and
  do not guess or rewrite it.
- Existing design lifecycle status remains catalog-only and must not be changed by Print Request
  detail edits.

## 5. Proposed Data Model

### Print Request Naming Fields

Extend `PrintRequest` with:

```ts
interface PrintRequest {
  // existing fields...
  requestSequenceNumber?: number;
  customerUsernameSnapshot?: string;
  customerDisplayNameSnapshot?: string;
  internalBaseName?: string;
  nameFormatVersion?: "legacy-v1" | "cr-ir-v1";
}
```

Recommendations:

- Keep `name` as the persisted display/list value for now.
- Customer request `name` is generated only by service logic as
  `{customerUsernameSnapshot}-CR{sequence.padStart(3, "0")}`.
- Internal request `name` is generated only by service logic as
  `{internalBaseName}-IR{sequence.padStart(3, "0")}`.
- `requestSequenceNumber` remains the locked integer sequence.
- `customerUsernameSnapshot` remains locked after creation and is the source for customer request
  display names.
- `internalBaseName` may be edited for internal requests only.
- `nameFormatVersion` lets runtime distinguish legacy `username-0001` / `internal-0001` records
  from new `CR/IR` records without guessing.

Migration/backfill:

- No migration or backfill in this phase unless separately approved.
- Existing requests without `nameFormatVersion` should remain readable and may display current
  persisted `name`.
- New internal requests use an `Internal base name` input that starts blank; blank input is
  normalized to `internal`.
- Existing legacy internal requests such as `internal-0001` remain readable.
- If a legacy internal request has a usable positive integer `requestSequenceNumber` and staff
  edits the internal base name, upgrade only that request to `baseName-IR###` using the locked
  existing sequence.
- If a legacy internal request lacks a usable sequence number, leave its legacy name readable and
  do not guess or rewrite it.

### Print Request Item Ordering

Extend `PrintRequestItem` with:

```ts
interface PrintRequestItem {
  // existing fields...
  sortOrder?: number;
}
```

Recommendations:

- New items get a monotonic numeric `sortOrder` within the request.
- Duplicate items should be inserted directly after the source item if practical:
  - source item `sortOrder + 0.5` as a short-term gap strategy, or
  - normalize/resequence sibling item orders in a transaction when no gap exists.
- If simpler for first implementation, append duplicates to the end using `max(sortOrder) + 1`,
  but this is a weaker UX than inserting after the source.
- Existing items without `sortOrder` must remain visible. Stable ordering must not make existing
  request items disappear.
- Preferred first implementation keeps the Firestore read request-scoped by `printRequestId` and
  sorts items client-side using:
  1. `sortOrder` when present.
  2. `createdAt` as fallback.
  3. document ID as final tie-breaker.

Migration/backfill:

- No required migration if the query stays request-scoped and the UI sorts legacy items
  client-side after fetch.
- A future optional backfill could assign `sortOrder` by `createdAt asc` for existing dev/test
  items. Any backfill requires a separate human checkpoint.

Indexes:

- Do not switch to a Firestore query that orders by `sortOrder` unless the implementation has a
  safe compatibility path for existing items without `sortOrder`.
- Only add Firestore `sortOrder` indexes if the final implementation truly requires
  server-side `orderBy(sortOrder)`.
- If server-side `sortOrder` ordering is required, proposed indexes are:

```txt
printRequestItems.printRequestId ASC, sortOrder ASC
```

- If status-filtered item queries still need server-side stable order, also add:

```txt
printRequestItems.printRequestId ASC, status ASC, sortOrder ASC
```

- Do not deploy indexes without a separate human checkpoint.

### Autosave Metadata

No persisted autosave metadata is recommended.

Autosave state should stay client-side:

```ts
type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "failed";
```

The item document should continue to use normal `updatedAt` audit metadata, but visual ordering
must not depend on `updatedAt`.

## 6. Proposed Implementation Outline

Plan only. Do not implement without review approval.

### Shared Types And Utilities

- Update `shared/types/printRequest/printRequest.types.ts`:
  - add optional `internalBaseName`.
  - add optional `nameFormatVersion`.
  - add optional `sortOrder` on `PrintRequestItem`.
- Update `shared/utils/printRequestNaming.ts`:
  - change customer formatter to `username-CR001`.
  - add internal formatter accepting `internalBaseName` and sequence to return `baseName-IR001`.
  - validate/sanitize internal base names with a predictable slug rule.
- Add tests for:
  - `sarahsmith-CR001`.
  - `sarahsmith-CR012`.
  - `whatnot-IR001`.
  - invalid sequence rejection.
  - internal base-name normalization.

### Service Logic

- Keep Firestore writes service-owned.
- Change `createCustomerPrintRequest` to assign `nameFormatVersion: "cr-ir-v1"` and
  `name: formatCustomerPrintRequestName(username, sequence)`.
- Change `createInternalPrintRequest` to accept `internalBaseName` from the create modal:
  - input label: `Internal base name`.
  - initial value: blank.
  - blank input normalizes to `internal`.
  - create `name: formatInternalPrintRequestName(internalBaseName, sequence)`.
  - the `IR` sequence remains transaction-generated and locked.
- Split request update logic:
  - standard detail page can update internal base name for internal requests.
  - if request-level notes remain visible, they autosave through the same autosave path.
  - do not add new request notes behavior if request notes are not needed on this page.
  - customer request `name`, customer snapshot, and sequence are never directly writable from UI.
  - status is not updated from this page.
- Consider a dedicated service method:

```ts
updatePrintRequestDetail(caller, requestId, { notes?, internalBaseName? })
```

- Keep `updatePrintRequest` only for lower-level compatibility or future workflow services, but
  avoid using it from this page for `name` and `status`.
- Assign `sortOrder` when adding and duplicating items.
- Keep item reads request-scoped by `printRequestId`; avoid broad reads.
- Prefer client-side stable ordering using `sortOrder`, then `createdAt`, then document ID so
  existing items without `sortOrder` do not disappear.
- Add server-side `orderBy(sortOrder)` only if implementation confirms a safe compatibility path.
- For duplicate:
  - create and return the new item.
  - avoid page-wide reloads in the caller.
  - update request item count and summaries without disrupting the selected detail view.
- For item autosave:
  - expose an update method for standard item edits that accepts only `quantity`,
    `printWidthInches`, and `printHeightInches`.
  - preserve hidden `notes` and `status`.
  - do not write design lifecycle status.

### Hooks

- Extend `usePrintRequestDetails` so the page can update local detail state after mutations:
  - `replaceItem(updatedItem)`.
  - `appendOrInsertItem(createdItem, afterItemId?)`.
  - `removeItem(itemId)`.
  - optionally `refreshRequestHeader()`.
- Add a focused autosave path for Print Request item edit state:
  - debounce valid dirty changes by 600 ms.
  - cancel in-flight save on unmount or item change as much as React allows.
  - avoid duplicate saves when values equal persisted item values.
  - expose `idle`, `dirty`, `saving`, `saved`, and `failed`.
  - provide retry for failed saves.
  - cover item quantity, item width, and item height.
- Keep hook logic as orchestration; validation and persistence remain in shared utilities/services.

### Components

- Update `PrintRequestItemCard`:
  - remove the `Save item` button for quantity/width/height.
  - remove the item form submit path for normal fields.
  - trigger autosave from controlled quantity/width/height state.
  - keep validation messages for invalid size/DPI.
  - hide native number spinners with CSS while preserving keyboard input.
  - consider using `type="text"` with `inputMode` for width/height if browser spinner removal is
    inconsistent, but keep numeric parsing strict.
- Add a page-level bottom-right autosave indicator:
  - `Saving...`
  - `Saved`
  - `Save failed`
  - retry action or focused error affordance for failed saves.
- Update duplicate handling:
  - no success alert for normal duplicate completion unless a failure occurs.
  - add the created item to current local item state.
  - update summary/request metadata without resetting the whole detail page.
- Update request detail card:
  - display customer request name read-only.
  - hide request status editing.
  - for internal requests, show editable base name and locked sequence display.
  - update the generated request-name preview while staff type the internal base name.
  - for customer requests, show locked sequence/name as read-only display.
  - persist internal base-name edits and visible request notes only through a Request Detail manual
    save button.
  - do not add new request notes behavior; if existing request notes remain visible, save them
    through the same Request Detail manual save button.

### Firestore Rules

- Allow and validate new optional `printRequests.internalBaseName`.
- Allow and validate optional `printRequests.nameFormatVersion`.
- Allow and validate optional `printRequestItems.sortOrder`.
- Keep status field valid for compatibility, but do not add new client-facing status edit behavior.
- Rules should not grant Portal/customer access in this phase.
- Do not deploy rules without a separate human checkpoint.

### Indexes

- Preferred first implementation should not require new item stable-order indexes because it keeps
  the read scoped by `printRequestId` and sorts client-side.
- Add item stable-order indexes in `firestore.indexes.json` only if implementation requires
  server-side `orderBy(sortOrder)`:
  - `printRequestItems.printRequestId ASC, sortOrder ASC`.
  - `printRequestItems.printRequestId ASC, status ASC, sortOrder ASC` if status-filtered item
    queries remain supported.
- Keep existing `updatedAt` item indexes until no runtime path uses them or until a separate
  index cleanup is approved.
- Do not deploy indexes without a separate human checkpoint.

### Tests

Add focused tests using the repo's `npx tsx --test ...` pattern:

- Request naming utility tests for `CR/IR` formats.
- Query-planning tests for stable item ordering.
- Item-order summary tests ensuring saved items do not reorder by `updatedAt`.
- Autosave hook/reducer tests if the autosave logic is factored into pure state helpers.
- Service/update tests where practical:
  - standard item update preserves hidden `status` and `notes`.
  - duplicate returns a new item and does not overwrite the original.
  - duplicate receives stable order.
  - customer request names cannot be rewritten through the standard detail path.
  - internal sequence remains locked while base name can change.
- Component tests where practical:
  - no normal item save button.
  - no request status select in detail.
  - locked customer name display.
  - internal sequence disabled/read-only display.

### Docs

Update after implementation:

- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/project/ROADMAP.md`
- `docs/project/DECISIONS.md`
- `docs/standards/SECURITY.md`
- `docs/project/TECH_DEBT.md`

Expected debt updates:

- Resolve TD-016 if spinner polish is implemented.
- Resolve or narrow TD-017 if autosave/dynamic duplicate/stable ordering are implemented.
- Resolve or narrow TD-018 if naming locks and `CR/IR` formats are implemented.

## 7. Out Of Scope

- No implementation in this planning task.
- No Firebase deploy.
- No Firestore rules deploy.
- No Firestore index deploy.
- No migration or backfill unless separately approved.
- No Portal behavior.
- No customer-created Portal requests.
- No Print Runs.
- No show selection or show capacity.
- No Custom Requests.
- No customer notes on standard Print Requests.
- No production status workflow.
- No Remove Background.
- No Upscale.
- No design lifecycle status changes.
- No ecommerce, checkout, shipping, payment, or fulfillment.
- No new dependencies unless separately approved during implementation review.

## 8. Risks And Product Decisions Needed

- Product decisions are complete for this plan based on 2026-07-04 user confirmation.
- Risk: Stable item ordering must not make existing items without `sortOrder` disappear; keep the
  first implementation request-scoped and client-sorted unless a safe server-order compatibility
  path is proven.
- Risk: Server-side `sortOrder` ordering would require index definitions and likely a dev index
  deploy before manual QA can pass, so do not add/deploy those indexes unless final implementation
  truly needs them.
- Risk: Firestore rules changes for `sortOrder`, `internalBaseName`, and `nameFormatVersion` will
  require a dev rules deploy before manual QA can pass.
- Risk: Item autosave can create excessive writes if debounce/equality checks are weak.
- Risk: Failed autosaves need clear recovery so staff do not assume values persisted.
- Risk: Removing item-level save buttons changes operator muscle memory; the autosave indicator
  must be visible enough without being noisy.

## 9. Acceptance Criteria

- Native number spinners are not visible on quantity, width, or height inputs.
- Editing quantity autosaves.
- Editing width autosaves.
- Editing height autosaves.
- Autosave shows a subtle bottom-right indicator.
- Success alerts are not shown for normal autosaves.
- Save buttons are removed for normal autosaved item fields.
- Autosave failures are visible and recoverable.
- Duplicate item updates the page dynamically without disruptive full refresh.
- Saving an item does not move it up the list.
- Request status cannot be edited from this page.
- Customer request name cannot be edited.
- Customer request names use `username-CR001`.
- Internal request names use `baseName-IR001`.
- Internal request create form has an `Internal base name` input.
- Blank internal base name normalizes to `internal`.
- Internal base name can be edited.
- Internal sequence cannot be edited.
- Editing internal base name updates the generated request-name preview while typing.
- Internal base name is persisted only by manually saving the Request Detail section.
- Existing legacy internal requests remain readable.
- Legacy internal requests with usable locked sequence upgrade only when staff edits internal base
  name.
- Legacy internal requests without usable sequence are not guessed or rewritten.
- Existing request items without `sortOrder` remain visible.
- Existing design lifecycle status remains unchanged.

## 10. Verification Plan

Automated checks after implementation:

- `npx tsx --test <new print request test path>`
- `npx tsc --noEmit`
- `npm run lint`
- `npx vite build`
- `git diff --check`

Manual QA after implementation:

- Edit quantity and confirm it autosaves.
- Edit width and confirm it autosaves.
- Edit height and confirm it autosaves.
- Confirm no success alert appears for normal autosave.
- Confirm the autosave indicator appears.
- Confirm failed save is visible and recoverable if reproducible.
- Duplicate an item and confirm no disruptive reload.
- Save/autosave an item and confirm it stays in place.
- Confirm request status is not editable.
- Confirm customer request name is not editable.
- Create a customer request and confirm `username-CR001`.
- Create another customer request and confirm `username-CR002`.
- Create an internal request with a base name and confirm `baseName-IR001`.
- Create an internal request with blank base name and confirm `internal-IR###`.
- Edit internal base name and confirm the generated request-name field updates while typing.
- Confirm internal base-name edits do not persist until the Request Detail save button is clicked.
- Save Request Detail and confirm the sequence remains locked.
- Confirm legacy internal requests remain readable.
- Confirm existing request items without `sortOrder`, if present, remain visible.
- Reload/revisit and confirm item order, names, locked fields, and saved item values persist.
- Confirm no design lifecycle status changes occurred.

## 11. Human Checkpoints

Implementation requires review approval after this plan is created.

The following require separate explicit approval:

- Any migration or backfill.
- Any Firestore rules deploy.
- Any Firestore index deploy.
- Any Firebase Functions deploy.
- Any Hosting or Storage deploy.
- Any rules relaxation.
- Any production write.
- Any Portal behavior.
- Any Print Run behavior.
- Any show capacity behavior.
- Any Custom Request behavior.
