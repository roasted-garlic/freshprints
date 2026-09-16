# Fresh Prints Studio pre-release refinements — Plan

| Field | Value |
|-------|-------|
| Date | 2026-09-14 |
| Author | FreshForge Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase — Plan → Formal Review → Implement → Test → Owner DEV QA → Signoff |
| Goal | `studio-pre-release-design-navigation-and-print-request-list-refinements` |
| Baseline HEAD | `17f826f9af07de7e6ded2cb9764f6c0f98e4480a` (= `origin/development`) |
| Branch / worktree | `development`; clean at investigation time |
| Current-work guard | Prior managed goal is complete; this artifact is queued planning only. FreshForge state and handoff state are intentionally unchanged. |
| Production / publication | **NOT AUTHORIZED** |

## Outcome

Plan four bounded refinements for the next Fresh Prints Studio release:

1. Add Previous / Next controls directly to the Studio Design Library Design Details modal.
2. Let the owning Portal customer and staff remove/re-add a customer-owned, non-internal
   `studio_customer` Print Request to eligible shows without making it generally Portal-editable.
3. Let Studio isolate one show’s loaded Print Requests so the existing search operates within that
   show.
4. On Studio Customer Requests → Queued, Printing, and Printed, render
   **Show → Customer → Print Requests** with the combined per-customer, per-show total.

No implementation, deployment, release publication, migration, console action, or production
operation is authorized by this Plan.

## Guard and repository findings

The requested goal was checked against `.cursor/workflow/state.md`, the clean `development` tree,
and the current managed work. The state file reports the preceding corrective goal complete and
requires a separately authorized production promotion; it does not contain active implementation
work for this goal. The repository checkout is clean and is already on `development`. Therefore
this turn creates only the next queued Plan and Formal Review artifacts; it does not take over the
FreshForge state machine or alter `references/project-chatgpt-handoff/CURRENT-STATE.md`.

The architecture and handoff documents confirm a Studio internal staff surface, a customer-facing
Portal, shared Firebase-backed data, trusted callable writes for sensitive lifecycle transitions,
and customer/staff authorization gates. Existing plans and reviews establish the accepted
lightbox navigation contract and the remove → Editing → re-add lifecycle. The implementation below
reuses those contracts rather than introducing replacement workflows.

## Scope

### In scope

- Studio Design Details modal navigation using the existing ordered, previewable `filteredDesigns`
  collection and `design.id` identity.
- A narrow `Portal show-management eligible` predicate for customer-owned ordinary requests with
  origin `portal_customer` or `studio_customer`, with canonical ownership and all existing server
  guards retained.
- Portal UI exposure of show-management controls for qualifying `studio_customer` requests while
  keeping request-content editing and Current Request selection Portal-only.
- Local, derived Studio show isolation over the already-loaded bounded request page.
- Reusable show-scoped customer grouping for Queued, Printing, and Printed, with existing show
  relationships, search corpus, request actions, pricing, and scroll containment preserved.
- Focused unit/contract tests and later Owner DEV QA.

### Out of scope

- General Portal content editability for `studio_customer` requests.
- Request item, quantity, size, DPI, upload, catalog-design, Staff Artwork, metadata, or customer
  ownership mutation from the new Portal controls.
- A new remove/re-add lifecycle, new persisted fields, client-side allocation writes, or direct
  customer writes to show allocations.
- Changes to existing Studio staff allocation/removal behavior, lifecycle ordering authority,
  queue-tab semantics, show capacity/cutoff/limits, maintenance guards, or production locks.
- Automatic pagination/load-more while navigating or isolating; Studio list behavior remains loaded
  page only.
- Production deploy, Portal publication, Firebase console actions, migrations, indexes, secrets,
  billing, or release promotion.

## Workstream A — Design Details modal Previous / Next

### Current repo behavior

`DesignDetailsModal.tsx` already receives `previewNavigationDesigns` and `onPreviewNavigate` from
`DesignLibraryPage.tsx`. The page supplies the loaded, filtered, non-purged, previewable
collection, updates `selectedDesign` continuously through `handlePreviewNavigate`, and stores the
final design id in `pendingScrollDesignIdRef` before close. The modal’s embedded
`DesignPreviewLightbox` already has collection navigation.

The shared pure helper in `packages/shared/src/utils/previewLightboxNavigation.ts` provides stable
id navigation, first/last disabled state, position information, no wraparound, and safe handling
of a missing active id. Its tests already cover the navigation math.

### Planned change

- Enhance `apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx` with
  modal-level Previous / Next controls and, where the existing modal layout permits, the same
  secondary position indicator used by the lightbox convention.
- Derive modal controls from the same previewable `previewNavigationDesigns` collection using
  `getPreviewLightboxNavigationState`; do not create a second navigation model.
- Use `design.id` for every navigation callback. `onPreviewNavigate` must update the entire
  `selectedDesign`, so title, metadata, artwork, actions, and the embedded preview all change
  together.
- Hide or disable controls for a one-item/empty collection; disable Previous at index 0 and Next
  at the last loaded index. Do not wrap and do not request another page.
- Preserve `DesignLibraryPage.tsx` filter, sort, Smart Filter, search, selection-mode, and final
  scroll behavior. The existing page wiring is expected to require no behavior change; it will be
  covered by a regression contract.
- Update the existing Design Details stylesheet in
  `apps/studio/src/renderer/src/styles/components/design-library.css` only for modal control
  placement, disabled state, keyboard/touch target sizing, and responsive layout.
- Do not change `DesignPreviewLightbox` navigation or its collection semantics.

### Affected files

- `apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx`
- `apps/studio/src/renderer/src/styles/components/design-library.css`
- Existing caller contract coverage in
  `apps/studio/src/renderer/src/features/designs/utils/previewLightboxNavigation.contract.test.ts`
  (or a focused adjacent Design Details contract if that file’s current scope is too narrow).
- `packages/shared/src/utils/previewLightboxNavigation.ts` and its unit test are regression inputs,
  not planned behavior changes.

### A acceptance checks

- Opening a Design Details modal and pressing Next changes the complete modal to the next
  `filteredDesigns` entry.
- First/last controls are disabled at the correct boundaries, with no wrap or load-more request.
- Existing filters/sort remain unchanged while navigating.
- Closing after several moves leaves the final design selected and restores the existing final-card
  scroll behavior.
- Existing embedded lightbox navigation remains unchanged.

## Workstream B — Customer show-management parity for `studio_customer`

### B1. Why `studio_customer` is currently blocked

The block is intentional for normal Portal editability but is currently reused too broadly for show
management:

1. `packages/shared/src/utils/portalPrintRequestEditability.ts` defines
   `isPortalCustomerOriginPrintRequest` as origin `portal_customer` and non-internal, and
   `isPortalEditablePrintRequest` additionally requires `draft` or `editing` status. Thus a
   `studio_customer` request is not a normal Portal-editable request.
2. `packages/shared/src/utils/portalPrintRequestUnqueue.ts` uses the Portal-origin predicate as
   its first eligibility gate, so customer removal evaluates as not eligible before the normal
   show/allocation checks.
3. `functions/src/queuePortalPrintRequestToShow.ts` calls
   `assertPortalActiveEditableRequestData`, checks canonical customer ownership, then explicitly
   rejects every origin other than `portal_customer` or any internal request. This blocks customer
   re-add after a request is returned to Editing.
4. `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` derives `effectiveIsEditable`
   from `isPortalActiveEditablePrintRequest`, and `canShowQueueCta` currently requires that value.
   The existing remove CTA also depends on `evaluatePortalPrintRequestUnqueue`. Consequently the
   Portal UI does not expose the appropriate show controls for `studio_customer`.
5. Staff already uses trusted staff-only paths: Studio’s customer removal routes through
   `unqueueStudioCustomerPrintRequestFromShow`, and re-add routes through
   `allocateStudioPrintRequestToShow`. Those paths are not the customer block and must remain
   behaviorally unchanged.

### B2. Narrow authorization design

Add a separate shared helper, planned at
`packages/shared/src/utils/portalPrintRequestShowManagement.ts`, with a name such as
`isPortalShowManagementEligiblePrintRequest`. Its positive contract is only:

- request origin is `portal_customer` or `studio_customer`;
- `isInternal !== true`.

It is an origin/category helper, not an ownership or lifecycle bypass. The callables must still
perform the canonical ownership check against the authenticated Portal customer, and retain every
existing request/show/allocation validation.

Use this helper only for customer show-management eligibility:

- `portalPrintRequestUnqueue.ts` uses it instead of the Portal-content-editability predicate for
  the initial origin gate, then retains converted/internal, terminal status, show production,
  active allocation, and continuable-request conflict checks.
- `queuePortalPrintRequestToShow.ts` uses it at the current origin gate, while retaining the
  active-editable status/parked-draft assertion, canonical ownership, non-archived/non-staff-show
  check, item validation, upload/design/Staff Artwork eligibility, quantity/capacity/customer-cap
  math, cutoff, maintenance, and atomic transaction.
- The queue transaction writes `requestOriginSnapshot` from the request’s validated actual origin
  (`portal_customer` or `studio_customer`) rather than hardcoding `portal_customer`; this preserves
  provenance without changing the existing value for Portal-created requests.

Do not change `isPortalEditablePrintRequest`, `isPortalCustomerOriginPrintRequest`,
`isPortalActiveEditablePrintRequest`, or normal Portal working-request selection to classify
`studio_customer` as content-editable. Existing content mutations remain guarded by the existing
Portal-editability predicate and their callable-specific checks.

### B3. UI separation

In `PrintRequestDetailView.tsx`, introduce a separate derived show-management eligibility value for
the narrow `studio_customer`/`portal_customer` show controls. Use it only to decide whether the
existing Add-to-Show and Remove-from-Show controls can be presented, together with item presence,
unallocated quantity, scheduled-show eligibility, and persistence barriers. Keep:

- `effectiveIsEditable` based on `isPortalActiveEditablePrintRequest`;
- `PrintRequestDetailGuide`, item editors, upload/design/quantity/size controls, and Current
  Request selection Portal-only;
- parked-draft overlay and Editing presentation unchanged;
- existing queue/unqueue reconciliation, router context, and error handling.

Reuse `PortalQueueToShowModal`, `PortalUnqueueFromShowConfirmModal`,
`portalShowSelectionService.ts`, and the existing mutation hooks. No new Portal mutation surface is
needed. If a small UI predicate is required, keep it in the existing
`apps/portal/features/print-requests/utils/printRequestDetailUnqueueUi.ts` or a narrowly named
show-management utility; do not make UI visibility the authority.

### B4. Rules, lifecycle, parking, and integrity

**Firestore Rules:** no change is planned. `firestore.rules` already permits customer reads of
their own `printRequests` and `showAllocations`, while direct allocation create/update/delete is
staff-only. The customer queue/unqueue mutations use Admin SDK callables. No rule broadening is
needed or allowed. If implementation discovers a required Rules change, stop for a new owner
decision rather than expanding this goal.

**One-working-request / parking:** keep `isPortalEditablePrintRequest` as the source for ordinary
Portal Current Request selection and content editing. Keep `customerHasOtherActiveEditingRequest`
and `portalContinuableParking.ts` semantics intact. A `studio_customer` request may use the narrow
show-management path, but it does not become the normal selected working request and does not gain
item mutation authority. Existing conflict/parking behavior remains the callable’s guard; no
second working-request exception is introduced.

**Lifecycle history:** use the existing unqueue transaction and queue transaction. Removal keeps
the existing allocation cancellation/status and Editing transition behavior; re-add keeps the
existing active transition, queue-tab recomputation, and allocation lifecycle. No activity event
is deleted or rewritten, preserving original show assignment → removal/Editing → later destination
show assignment.

**Allocation integrity:** retain the current active-allocation filter, show production cutoff,
pending/queued removal requirement, item-level remaining quantity calculation, size/DPI validation,
show capacity and customer per-show caps, and transaction re-reads. Staff’s
`unqueueStudioCustomerPrintRequestFromShow` and `allocateStudioPrintRequestToShow` remain unchanged
except for regression coverage. A request belonging to another customer, an internal request, a
converted request, a terminal request, a production-started show, and a non-eligible show must
continue to fail server-side.

### B5. Affected files

Planned implementation files:

- `[new] packages/shared/src/utils/portalPrintRequestShowManagement.ts`
- `[new] packages/shared/src/utils/portalPrintRequestShowManagement.test.ts`
- `packages/shared/src/utils/portalPrintRequestUnqueue.ts`
- `packages/shared/src/utils/portalPrintRequestUnqueue.test.ts`
- `functions/src/queuePortalPrintRequestToShow.ts`
- `functions/src/unqueuePortalPrintRequestFromShow.ts` only if its error mapping or shared helper
  import needs the narrowed reject reason; its transaction behavior is not to be redesigned.
- `functions/src/queuePortalPrintRequestToShow.test.ts` and a focused callable contract test for
  unqueue/origin/ownership if existing source-contract coverage is insufficient.
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/features/print-requests/utils/printRequestDetailUnqueueUi.ts` and its test only if
  the separate UI predicate belongs there.

Explicitly not planned for behavior changes: `portalPrintRequestEditability.ts`,
`portalActiveEditablePrintRequest.ts`, `portalContinuableParking.ts`, Firestore Rules,
`PortalQueueToShowModal.tsx`, the staff allocation/removal callables, and the Portal list grouping
hook. They receive regression checks where relevant.

## Workstream C — Studio show isolation

### Current repo behavior

`apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` receives the
active bounded lifecycle page from `usePrintRequests`, applies request-kind and lifecycle safety
filters, applies the existing Working triage filter, runs `filterPrintRequestsByListSearch`, and
then calls the shared `groupPrintRequestsByShow` helper. The rail is
`.print-requests-rail-list` with its own vertical overflow; existing CSS contracts protect the
bounded rail/main-pane layout.

`groupPrintRequestsByShow` ignores canceled allocations and uses allocation
`upcomingShowId` plus the loaded show record. For requests on multiple shows it selects the current
primary show by the existing scheduled-start rule and records extra-show count. This is the
existing display architecture, including Printed historical sections.

### Planned change

- Add local `isolatedShowId: string | null` state in `PrintRequestsPage.tsx`.
- Add one pure utility, planned at
  `apps/studio/src/renderer/src/features/print-requests/utils/printRequestShowCustomerGrouping.ts`,
  for active-allocation show membership and show-scoped customer grouping. It must ignore canceled
  allocations and never mutate requests, allocations, or shows.
- When isolation is active, include a request only when one of its active allocations has
  `upcomingShowId === isolatedShowId`. Pass clipped allocations for that selected show into the
  existing show-grouping helper so a multi-show request is rendered under the isolated show rather
  than being reassigned to an unrelated primary section. This makes the selected show id—not a
  request name, timestamp, or inferred label—the identity authority, including Printed history.
- Keep the existing search helper and search fields. Compose the pipeline as current lifecycle and
  request-kind/triage filtering → optional show scope → existing search → show grouping → optional
  customer grouping. Clearing search leaves `isolatedShowId` intact; clearing isolation restores
  the full current lifecycle tab. Reset isolation when lifecycle tab or request-kind context
  changes, so a show id from a prior bounded page cannot silently hide a new tab’s rows. Preserve
  the active lifecycle tab and request-kind choice.
- Add an obvious isolate/show-only control to the existing show header where the header is not
  already a link; for linked headers, use a sibling control or header action that does not nest an
  interactive button inside the `Link`. Show the active isolated show and provide a clear
  `Show all`/Clear action in the rail/header. Unassigned has no show-isolation action.
- Make the control available on Printed and, because the same grouping path is already shared,
  Queued and Printing without creating tab-specific implementations.
- Keep all derived state local; no Firestore query, allocation write, persisted filter, or URL
  contract is added.

### Search contract

The current `printRequestListSearch.ts` supports request id, request name, canonical customer id,
stored customer username/display snapshots, notes, and live customer username/display name from
`customersByIdMap`. The implementation must preserve this corpus and run it against only the
show-scoped rows.

Search composition is explicit:

- request-name/id/notes-only matches retain only matching request cards inside the selected show;
- a customer identity match (canonical customer id, username, or display name already in the
  supported corpus) retains that customer’s requests within the selected show, so the customer
  bundle does not collapse to an arbitrary single request;
- no match produces the existing empty state, with wording that identifies the current show scope;
- no empty customer or show groups are rendered;
- clearing text search does not clear show isolation.

The identity match may extend the existing search utility with a customer-only predicate, but it
must reuse its normalization and fields rather than duplicate or broaden the corpus.

### C affected files

- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `[new] apps/studio/src/renderer/src/features/print-requests/utils/printRequestShowCustomerGrouping.ts`
- `[new] apps/studio/src/renderer/src/features/print-requests/utils/printRequestShowCustomerGrouping.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestListSearch.ts` and its
  test only if the customer-only composition helper is added there.
- `apps/studio/src/renderer/src/styles/components/print-requests.css`
- Existing `groupPrintRequestsByShow.ts` and test are regression inputs; change only if a small
  exported pure membership seam is needed, without changing lifecycle ordering.

## Workstream D — Show → Customer → Print Requests grouping and totals

### Current repo behavior and authority

The page currently renders `visibleRequestSections` from `groupPrintRequestsByShow`, then each
request as an individual button card. Individual card actions select the request and drive the
existing detail pane. `resolveGangSheetProductionGroupKey` in
`packages/shared/src/utils/groupPrintRequestsByShow.ts` is the existing ADR-FP-143-compatible
identity helper: canonical `customerId` first, then the established normalized username fallback,
then request id for malformed legacy records. It does not parse request names.

The current per-request displayed price is calculated by
`calculatePrintRequestSummaryPriceUsd` in `PrintRequestsPage.tsx`, which delegates to the
authoritative `calculateGangSheetCustomerSectionSummary` tier/pricing helper using
`summary.sizeClassRows`. It already drives the request card price. Quantity and design counts come
from `summariesByRequestId` / `PrintRequestItemSummary`.

### Planned change

- Apply the additional customer grouping only for customer requests on Queued, Printing, and
  Printed. Leave Internal grouping and Working/Editing presentation unchanged unless a shared pure
  seam is required with no behavior drift.
- Group only within each already resolved show section (and within the active isolated show when
  Workstream C is active). Never group the complete request list before show partitioning and
  never merge requests across `section.sectionKey`/`upcomingShowId` boundaries.
- Resolve the customer grouping key with `customerId` first; use only the established fallback
  helper rules for malformed legacy rows; never parse request names and never use username alone
  where a canonical id exists.
- Render each customer bundle as a non-button customer header followed by the existing individual
  request selection buttons. Preserve every request id, selected state, badges, overflow/show
  indicators, and action path. Do not nest buttons inside buttons or change the selected-request
  route/deep-link behavior.
- Display the customer label using existing customer/snapshot label resolution. Display the
  combined total by summing the exact existing per-request summary outputs: total quantity from
  `PrintRequestItemSummary`, and the displayed dollar amount from
  `calculatePrintRequestSummaryPriceUsd` for each member. If no member has a valid price under the
  current helper, omit the dollar metric as the individual card does; do not invent a second tier
  calculation. Do not display a cross-show total in a show-local header.
- Keep request ordering from the existing show section (updated-at descending) and retain existing
  show ordering, including the staff history ordering where it applies. Customer bundle ordering
  must be deterministic by first member’s existing request order, with a stable key tie-breaker.
- Keep the rail’s bounded overflow and main-pane layout. The additional header level must not add
  an outer page scroller or change existing responsive behavior.

### D affected files

- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestShowCustomerGrouping.ts`
  (same pure seam as Workstream C)
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestShowCustomerGrouping.test.ts`
- `apps/studio/src/renderer/src/styles/components/print-requests.css`
- `packages/shared/src/utils/groupPrintRequestsByShow.ts` only if exporting a narrowly reusable
  customer identity adapter is cleaner; do not alter its show/lifecycle ordering authority.
- `packages/shared/src/utils/groupPrintRequestsByShow.test.ts` for regression cases if that helper
  is touched.

## Explicit answers to required Plan questions

1. **Why is `studio_customer` blocked?** `portalPrintRequestEditability.ts` treats only a
   non-internal `portal_customer` request as Portal-origin, and both customer show callables and
   the current Portal CTA reuse that content-editability distinction.
2. **Which checks/callables/UI gates cause it?** The shared unqueue eligibility first rejects the
   origin; `queuePortalPrintRequestToShow` explicitly rejects non-`portal_customer` origins after
   its active/parked and ownership checks; `PrintRequestDetailView` gates Add on
   `isPortalActiveEditablePrintRequest`; Remove depends on the same unqueue eligibility.
3. **How allow show management without general editability?** Add and use a separate
   non-internal `portal_customer | studio_customer` show-management predicate only in the queue /
   unqueue eligibility and corresponding CTA visibility. Keep content mutation, Current Request,
   parking, and item validation on the existing Portal-editable predicate.
4. **Do Firestore Rules change?** No. Customer show mutations already go through trusted callable
   Admin SDK transactions; direct allocation writes remain staff-only.
5. **Does `portalPrintRequestEditability.ts` change?** No planned behavior change. Its distinction
   remains the normal Portal content-editability authority.
6. **How is one-working-request / Editing parking safe?** Show management does not add a request to
   Portal’s editable/current-request set. Existing active-editing conflict and parking helpers stay
   authoritative and are not broadened.
7. **How preserve lifecycle and allocation integrity?** Reuse existing trusted unqueue/queue
   transactions, activity writes, queue-tab recomputation, ownership, status, show lifecycle,
   cutoff, capacity, per-show cap, item, size/DPI, maintenance, and production guards. Preserve
   actual `requestOriginSnapshot` and never rewrite history.
8. **Exactly which files change?** The planned set is the A, B, C, and D affected-file lists
   above: Design Details + CSS + contract; the new narrow show-management helper/tests, Portal
   callable/UI seams/tests; the Studio page, one show/customer grouping utility/tests, search seam
   if needed, and print-request CSS. No Rules or normal editability module changes.
9. **Exact focused tests?** See the Test Strategy below; it includes shared predicate/unqueue,
   queue/unqueue origin and ownership contracts, Portal CTA separation, Design Details navigation,
   show membership/search composition, customer identity, totals, actions, and scroll/layout CSS.
10. **Can Design Details reuse the shared helper unchanged?** Yes. The existing helper’s ordered
    id model, boundary state, no-wrap behavior, and safe active-id handling fit the modal. Only the
    modal UI consumes it; the helper itself is not changed.
11. **What builds show sections?** `PrintRequestsPage.tsx` calls
    `groupPrintRequestsByShow` after lifecycle/kind/triage/search filtering, using active
    allocations and loaded `showsById`; the same path serves Queued, Printing, and Printed.
12. **What show identity is authoritative?** Active allocation `upcomingShowId`, resolved to the
    show document id and existing `section.sectionKey`; this remains valid for Printed historical
    records. Labels are presentation only.
13. **Can isolation be local derived state?** Yes. The current page already has bounded requests,
    active allocations, and show records; filter and clip those in `useMemo` without reads/writes.
14. **What search fields exist?** Request id/name, canonical customer id, stored customer username
    and display snapshots, notes, plus live customer username/display name from the loaded customer
    map.
15. **What stable customer identity is used?** `customerId` first; established normalized username
    fallback only for legacy/malformed rows; final request id fallback for an unidentifiable row.
16. **Can ADR-FP-143 grouping be reused?** Yes. Reuse
    `resolveGangSheetProductionGroupKey` or a thin adapter around it for customer rows. Its
    customer-id-first and legacy fallback behavior is safe; its internal-base branch is not used
    for customer grouping.
17. **What calculates the Studio per-request total?**
    `calculatePrintRequestSummaryPriceUsd` in `PrintRequestsPage.tsx`, delegating to
    `calculateGangSheetCustomerSectionSummary` over `summary.sizeClassRows`.
18. **How aggregate without duplicate pricing?** Sum each member’s output from that existing
    helper, alongside existing summary quantities. Do not recompute width tiers or raw item prices.
19. **How does search distinguish request vs customer match?** Request-only fields retain matching
    request cards; customer identity matches retain all requests for that customer within the
    current show. Both are bounded by the selected show and current lifecycle/kind tab.
20. **How do isolation, grouping, and search compose?** Scope by active allocation first, clip
    allocations to the selected show, apply existing search, remove empty results, then group by
    show and customer. Reset scope on lifecycle/kind changes and preserve it when search clears.
21. **Which scroll/layout tests need coverage?** Extend or pair
    `printRequestLifecycleTabLayout.contract.test.ts` and
    `printRequestPocketFullSizeCounts.contract.test.ts` for the unchanged bounded rail/main pane;
    add the new utility tests for scope/group/search composition and page contracts for clear/show
    controls, individual actions, selection, and no nested interactive controls.

## Test Strategy

Tests are planned for the later Implement/Test gates; no implementation tests are claimed in this
Plan-only pass.

### Focused automated tests

| Area | Focused coverage | Command / gate |
|------|------------------|----------------|
| A shared navigation | Existing helper regression: ordered ids, missing id, first/last, no wrap | `npx tsx --test packages/shared/src/utils/previewLightboxNavigation.test.ts` |
| A Design Details | Modal consumes shared state; `design.id`; full selected-design callback; controls do not alter filters; existing lightbox remains wired | `npx tsx --test apps/studio/src/renderer/src/features/designs/utils/previewLightboxNavigation.contract.test.ts` (plus any new focused contract) |
| B shared show predicate | portal/studio customer origins accepted; internal, unsupported, and malformed origins rejected; no implication of content editability | `npx tsx --test packages/shared/src/utils/portalPrintRequestShowManagement.test.ts` |
| B unqueue | ownership/origin/internal/converted/closed/show production/allocation/conflict matrix; `studio_customer` eligible only through narrow path | `npx tsx --test packages/shared/src/utils/portalPrintRequestUnqueue.test.ts` |
| B queue/unqueue callables | Origin gate, canonical ownership, Admin transaction, actual origin snapshot, cutoff/capacity/customer cap/item/DPI/maintenance/production guards; staff paths remain referenced | `npx tsx --test functions/src/queuePortalPrintRequestToShow.test.ts` plus focused callable contract tests |
| B Portal UI | show CTA can appear for qualifying `studio_customer`; content editor/Current Request/parked behavior remains Portal-editable-only; reconciliation and route context remain | `npx tsx --test apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.hooks.contract.test.ts` plus focused UI utility test |
| C isolation | active versus canceled allocation membership; multi-show clip; Printed historical show id; clear/preserve/reset state contract; no mutations | `npx tsx --test apps/studio/src/renderer/src/features/print-requests/utils/printRequestShowCustomerGrouping.test.ts` |
| C search | existing id/name/customer/notes corpus; show scope first; customer identity expands only within show; no empty groups | Existing `printRequestListSearch.test.ts` plus new grouping composition cases |
| D grouping | customerId-first, legacy fallback, no request-name parsing, no cross-show merge, stable order, single/multiple requests | Same new grouping test plus `groupPrintRequestsByShow.test.ts` regression if touched |
| D totals/actions | quantity and per-request price sum via existing helper; invalid-price omission; individual request buttons retain selection/action identity | New pure totals cases and Studio page contract coverage |
| Layout/scroll | rail remains bounded; no outer-page scroll; narrow layout and lifecycle tabs remain valid; no nested buttons/links | `printRequestLifecycleTabLayout.contract.test.ts` and `printRequestPocketFullSizeCounts.contract.test.ts` |

### Required broader verification after implementation

- `npm run lint`
- `npm --prefix apps/studio exec tsc -- --noEmit`
- `npm run typecheck --workspace @fresh-prints/portal`
- `npm --prefix functions run build` when Functions/shared callable code is touched
- applicable focused `npx tsx --test` commands above
- `git diff --check`
- Firestore Rules tests are **not expected** because Rules do not change; if implementation
  changes Rules, stop and obtain a new owner decision before proceeding.

### Owner DEV QA required after Test

- Studio Design Library: modal arrows, boundaries, filtered ordering, final close/scroll, embedded
  lightbox regression.
- Portal: owning customer can remove and re-add an eligible Studio-created customer request;
  another customer/internal/terminal/printing/cutoff/capacity/limit cases remain blocked; no
  content-edit controls or Current Request promotion appear.
- Staff: existing remove/re-add remains unchanged and fully queued.
- Studio Print Requests: Printed plus Queued/Printing isolation, clear/show-all, search within
  scope, multi-show records, customer bundles, combined quantity/price, individual selection and
  actions, narrow viewport, and bounded rail scrolling.

## Human checkpoints

- Formal Review of this Plan: required before implementation.
- Owner explicit approval after Formal Review: required before implementation.
- Visual/UX approval during Owner DEV QA: required for modal controls and nested list headers.
- Production/release promotion: not authorized; requires a later human checkpoint.
- Rules/secrets/external-service/data-migration checkpoint: not expected; any discovery stops scope.

## Rollback

Revert the bounded Studio/Portal/shared code and CSS changes. No persisted schema or migration is
planned. Existing server-side lifecycle and allocation data remain authoritative.

## Documentation follow-up

Implementation/signoff may update durable architecture/decision docs only if the new show-management
predicate or grouping contract warrants it. Signoff must update `.cursor/workflow/state.md` and
`references/project-chatgpt-handoff/CURRENT-STATE.md` in the same pass, but this Plan-only queued
pass intentionally does not modify either state file.

## Owner DEV QA bounded correction amendment — 2026-09-15

Owner DEV QA passed A, C, and D and required bounded corrections to B plus additions E and F.
This amendment supersedes the original B editability exclusion and adds only the following:

- B: preserve `requestOrigin: studio_customer`, but make an eligible, customer-owned,
  non-internal Studio-created request Portal-editable only while it is in the server-authored
  `editing` state reached after show removal. Align the shared editability predicate, Portal
  context/detail selection, item mutation callables, and existing parking/count logic. Keep
  ownership, parked-draft, lifecycle, validation, production, maintenance, allocation, and
  one-working-request guards unchanged. Do not change schema or Firestore Rules unless repo
  investigation proves it unavoidable; investigation found neither necessary.
- E: parameterize the existing `groupPrintRequestsByShow` section ordering with a deterministic
  scheduled-start descending mode and use it only for Customer Requests → Printing and Printed.
  Working/Editing/Queued and Internal history behavior remain unchanged.
- F: add local case-insensitive name/username/email filtering to the loaded eligible customer
  list in the Studio Create Customer Request modal, with the existing input clear-control
  convention. Keep all existing guest, inactive/closed, and continuable-request exclusions
  applied before search; preserve the trusted creation path and avoid per-keystroke reads.

Focused coverage is added for staff-created customer editability/status boundaries and ownership,
re-add/lifecycle safety, descending show order/ties, and picker search/clear/eligibility behavior.

## Owner DEV QA F-only UI placement correction — 2026-09-15

Owner DEV QA passed B, E, and the F search behavior/regression coverage, but found the F search
control rendered outside the customer selector. This bounded correction changes placement only:

- remove the separate customer search `TextInput` from the closed Create Customer Request form;
- opt the existing shared `Select` customer control into its portaled searchable-menu presentation;
- keep identity-only, case-insensitive, partial matching over display name, username, and email;
- keep eligible-customer filtering before search, transient clear/reset behavior, natural focus, and
  the existing customer selection/creation path unchanged;
- add only the shared Select search metadata/clear affordance required to preserve those behaviors.

No customer eligibility, backend, schema, Rules, authorization, deployment, publication, release,
or unrelated refactor is authorized. Re-run F-focused coverage and the applicable Studio checks,
then return to Owner DEV QA for F only.
