# Formal Review — Studio pre-release design/navigation and Print Request refinements

| Field | Value |
|-------|-------|
| Date | 2026-09-14 |
| Reviewer | FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-09-14-studio-pre-release-design-navigation-and-print-request-list-refinements-plan.md` |
| Goal | `studio-pre-release-design-navigation-and-print-request-list-refinements` |
| Verdict | **approved_with_changes** |
| Baseline HEAD | `17f826f9af07de7e6ded2cb9764f6c0f98e4480a` (= `origin/development`) |
| Production / publication | **NOT AUTHORIZED** |
| Implementation authorization | **Not granted by this review; owner approval is still required.** |

## Review outcome

The Plan is sufficiently bounded and maps all four requested workstreams to existing repository
seams. It is approved with the constraints below. Implementation may begin only after the owner
explicitly approves this reviewed Plan. This review pass intentionally created no app, backend, Rules,
data, or state-machine changes beyond the Plan and this review artifact.

## Gate checklist

| Area | Result | Review note |
|------|--------|-------------|
| Current-work guard | pass | `development` is clean; preceding managed goal is complete; state/handoff were not taken over. |
| Scope | pass | A–D are one bounded pre-release goal; production, publication, migration, and console work are excluded. |
| Workstream A architecture | pass with conditions | Reuses the existing shared navigation helper and page callback; outer modal arrows must not fork lightbox navigation. |
| Workstream B authorization | pass with conditions | Separate show-management eligibility is required; normal Portal editability must remain unchanged. |
| Firestore Rules | pass | No Rules change is justified; customer mutations remain callable/Admin-backed and allocation writes remain staff-only. |
| Lifecycle / parking | pass with conditions | Existing remove → Editing → re-add and one-working-request invariants remain authoritative. |
| Workstream C state | pass | Local derived show scope over the bounded loaded page is sufficient; no persisted filter or read expansion. |
| Workstream D grouping | pass with conditions | Show partition precedes customer grouping; canonical customer id is primary; no cross-show merge. |
| Totals | pass | Existing per-request summary/pricing helper is the only price authority. |
| Layout / accessibility | pass with conditions | Preserve rail-only scrolling and avoid nested interactive elements. |
| Test strategy | pass | Focused tests plus Studio, Portal, Functions, lint, diff, and Owner DEV QA gates are identified. |

## Findings locked for implementation

### A — Design Details modal

1. `DesignDetailsModal.tsx` already owns the details shell and receives
   `previewNavigationDesigns` / `onPreviewNavigate`; `DesignLibraryPage.tsx` already supplies the
   loaded filtered collection, continuous `selectedDesign` update, and final-id scroll restoration.
2. `getPreviewLightboxNavigationState` in `packages/shared/src/utils/previewLightboxNavigation.ts`
   fits unchanged: stable ids, no wrap, first/last boundaries, and loaded-only navigation.
3. The implementation must derive modal arrows from the same previewable collection used by the
   embedded lightbox. It must call the existing page callback with `design.id`; it must not navigate
   only the image or change filter/sort/search/Smart Filter state.
4. The existing embedded lightbox behavior is a regression boundary. No change to its keyboard,
   collection, or close behavior is part of this workstream.
5. Position indicator and controls are secondary UI; they must not obscure the modal close control,
   artwork, or meaningful details and must have usable disabled/touch states.

### B — `studio_customer` show-management parity

1. The repo evidence confirms two concepts are currently conflated: `portal_customer` origin is
   used by `isPortalEditablePrintRequest`, `portalPrintRequestUnqueue.ts`, the queue callable’s
   origin gate, and the detail CTA. `studio_customer` is therefore blocked from customer removal
   and re-add even though it is customer-owned and staff-manageable.
2. The approved design is a separate helper such as
   `isPortalShowManagementEligiblePrintRequest`, accepting only non-internal
   `portal_customer | studio_customer` origin. It is not a replacement for
   `isPortalCustomerOriginPrintRequest` and does not change `isPortalEditablePrintRequest`.
3. The helper may be used only in the narrow show-management eligibility path. The authenticated
   customer ownership check remains canonical and server-side. Do not trust Portal UI state.
4. `queuePortalPrintRequestToShow` must retain `assertPortalActiveEditableRequestData` for
   continuable status and parked-draft safety, all item/source/size/DPI checks, show eligibility,
   cutoff, capacity, customer cap, maintenance, and the atomic Admin transaction. Its origin gate
   may accept `studio_customer` through the new helper only after ownership and non-internal checks.
5. The queue transaction must preserve the actual request origin in
   `requestOriginSnapshot`. Existing `portal_customer` behavior must remain byte/semantically
   equivalent; `studio_customer` must not be relabeled as Portal-created.
6. `evaluatePortalPrintRequestUnqueue` may accept qualifying `studio_customer` records through the
   narrow helper, but pending/queued allocation, show production, terminal status, converted-to-
   internal, ownership, maintenance, and other-active-Editing conflict checks remain mandatory.
   Any renamed internal reject reason must map to the existing safe Portal error behavior.
7. `PrintRequestDetailView.tsx` must separate `canShowShowManagement` from `effectiveIsEditable`.
   A qualifying Studio-created customer request may see Add/Remove show controls when all existing
   show/item/quantity/persistence conditions pass, but must not receive content editors, upload or
   design mutation, quantity/size controls, Current Request promotion, or a parked-draft bypass.
8. Existing staff paths are already trusted and must stay unchanged: staff removal uses
   `unqueueStudioCustomerPrintRequestFromShow`; staff add/re-add uses
   `allocateStudioPrintRequestToShow`. Add regression coverage rather than replacing them.
9. `firestore.rules`, `portalPrintRequestEditability.ts`,
   `portalActiveEditablePrintRequest.ts`, and `portalContinuableParking.ts` are protected boundaries.
   Do not broaden their semantics to make the feature work. If a Rules change appears necessary,
   stop and request a new owner decision.
10. Preserve the existing lifecycle evidence and queue-tab recomputation. The expected history is
    original show assignment → show removal / Editing transition → later destination show
    assignment, with allocation integrity maintained by the existing transactions.

### C — show isolation

1. The existing pipeline is confirmed as active lifecycle/request-kind/Working-triage filtering,
   `filterPrintRequestsByListSearch`, then `groupPrintRequestsByShow`; the request page and rail
   already use bounded loaded state.
2. Isolation identity is the active allocation’s `upcomingShowId`, resolved to the existing show
   record/section key. This is also the authority for Printed historical records. A display title,
   request name, date label, or array position is not an identity.
3. On isolation, filter by active allocation membership and clip the grouping allocation view to
   the selected show before calling the existing show grouping helper. This prevents a request
   allocated to multiple shows from being rendered under an unrelated primary show while the user
   is isolating the selected one.
4. Implement one local derived-state path for Printed, Queued, and Printing. Do not create separate
   tab implementations. Clear isolation leaves the lifecycle tab and request-kind selection
   unchanged; changing lifecycle or request-kind context must clear stale scope rather than hiding
   rows from a new bounded page.
5. The show header control must not nest a button inside the existing `Link`. Use a sibling/action
   structure or a non-link header variant, with an obvious active scope and Show all/Clear action.
   Unassigned is not isolatable.

### D — customer grouping and combined totals

1. The grouping boundary is each already-resolved show section. Customer groups must be created
   inside that boundary, never globally before show grouping and never across `sectionKey` /
   `upcomingShowId`.
2. Use `resolveGangSheetProductionGroupKey` or a thin adapter so canonical `customerId` wins;
   use only its established normalized username/request-id fallbacks for malformed legacy data.
   Request-name parsing and username-only grouping where an id exists are expressly rejected.
3. Apply this extra level only to customer requests on Queued, Printing, and Printed. Preserve the
   existing Internal and Working/Editing presentation unless a shared pure seam is behaviorally
   neutral.
4. Customer headers must be non-interactive containers; each existing request remains an individual
   selectable button with its id, selected state, badges, and actions intact. No button-in-button or
   link-in-button markup is permitted.
5. Combined quantity and price must be computed from the current per-request summary output. Sum
   `summary.totalQuantity` and the result of `calculatePrintRequestSummaryPriceUsd` for each member,
   which delegates to `calculateGangSheetCustomerSectionSummary`. No duplicate width-tier or
   pricing formula is allowed. Invalid/no-price behavior must match the individual card behavior.
6. Preserve existing request updated-at order and show ordering, including Printed staff-history
   authority where applicable. Customer bundle ordering must be deterministic and stable.
7. Search must run only within show scope. A request-specific match retains that request; a supported
   customer identity match retains that customer’s requests in the current show. Empty customer and
   show groups must not render.

## Required focused test matrix

The following are required at the Implement/Test gates and are not claimed as run here:

### A

- Shared helper: empty/missing active id, ordered previous/next ids, first/last disabled, no wrap.
- Design Details source contract: shared helper use, `design.id`, full selection callback, existing
  lightbox wiring, and final page selection/scroll callback.
- Manual: filtered/sorted/loaded collection, one-item boundaries, modal content swap, keyboard and
  responsive control usability, embedded lightbox regression.

### B

- Narrow predicate matrix for both customer origins, internal rejection, unsupported/malformed
  origin rejection, and proof it does not imply `isPortalEditablePrintRequest`.
- Unqueue matrix for canonical owner/non-owner, studio customer/portal customer, internal,
  converted, closed, production-started, pending/queued, canceled-only, and active-editing conflict.
- Queue callable contracts for studio customer acceptance only after ownership/non-internal checks,
  status/park validation, actual origin snapshot, source/size/DPI, cutoff/capacity/customer cap,
  maintenance, and atomic full-request allocation.
- Portal detail contract for show CTA separation: Studio-created customer show management visible
  when eligible; content editing, Current Request, parking, and uploads remain blocked.
- Staff callable/service regression for existing remove/re-add path.
- Owner DEV negative cases: other customer, internal, terminal, production-started, cutoff,
  capacity, per-show limit, invalid item/size/DPI, and maintenance.

### C/D

- Active versus canceled allocation membership and missing-show behavior.
- Multi-show request included only when it has active allocation on the selected show; clipped
  grouping renders it under the selected show.
- Printed historical show id and existing show ordering authority.
- Customer id precedence, normalized legacy fallback, malformed request-id fallback, no request-name
  parsing, no cross-show merge, stable customer/request ordering.
- Request-name/id/notes search remains request-specific; supported customer identity search retains
  that customer’s in-show requests; clear search preserves isolation; clear isolation restores the
  full current tab; tab/kind change clears stale scope.
- Combined quantity/price uses existing helpers; individual request selection/actions continue to
  work.
- Extend `printRequestLifecycleTabLayout.contract.test.ts` and
  `printRequestPocketFullSizeCounts.contract.test.ts` so the added hierarchy preserves bounded
  `.print-requests-rail-list` scrolling, main-pane behavior, narrow layout, and no outer-page
  scroll.

## Implementation constraints / changes required by this review

The implementer must follow these locked changes to the Plan:

1. Keep the new show-management helper separate from normal Portal editability and do not change
   the four protected editability/parking modules listed above.
2. Preserve `studio_customer` in `requestOriginSnapshot`; do not relabel it as `portal_customer`.
3. Scope first, clip allocation relationships for the selected show, then search, then group. Do not
   filter a fully grouped multi-show result by its display section after the fact.
4. Keep customer grouping only within show sections and preserve request-level controls.
5. Keep all new grouping/isolation state local and derived; no persisted/UI-only writes.
6. If implementation reveals an actual Firestore Rules or schema requirement, stop at the boundary
   and obtain a new owner-approved plan/review rather than silently expanding this goal.

## Final gate decision

**Approved with changes for owner review.** The Plan is ready for explicit owner approval. Until that
approval is received, the only permitted next action for this goal is clarification or plan/review
maintenance. Do not implement A, B, C, or D; do not run deployment/publication; do not update
FreshForge workflow state as though implementation has started.

## Owner DEV QA bounded correction amendment — 2026-09-15

Owner DEV QA result: A PASS, B FAIL, C PASS, D PASS. This amendment authorizes corrective
implementation and testing for B and the bounded E/F additions only; it does not authorize
Signoff, deployment, publication, or release.

### B corrective authorization

Repository investigation traced the Portal block to the repeated `requestOrigin ===
"portal_customer"` checks in Portal item mutation callables and the shared editability predicate.
Portal reads already use canonical customer ownership and `draft|editing` status, Firestore Rules
already enforce ownership/status/parking and do not require an origin change, and the unqueue
transaction already changes a fully removed request to `editing`. Therefore the narrow approved
contract is:

- `portal_customer` remains editable in `draft|editing` when non-internal and unparked;
- `studio_customer` becomes editable only in `editing` when non-internal and owned by the caller;
- all other origins, internal requests, parked drafts, terminal/printing states, cross-customer
  access, and existing validation/maintenance/capacity/one-working-request protections remain
  denied;
- `requestOrigin` and lifecycle history remain unchanged, and no schema or Rules change is
  authorized or required;
- all Portal item mutation callables must use the same narrow contract, while show-management
  queue/unqueue and existing Staff paths remain intact.

### E/F bounded authorization

- E may add only a parameterized descending `scheduledStartAt` ordering to the existing show
  grouping helper and select it for Customer Printing/Printed. Ties must remain deterministic;
  other lifecycle tabs preserve their current order.
- F may add only local filtering over the already loaded eligible customer directory by display
  name, username, or email, plus clear behavior. Eligibility exclusions remain upstream and
  authoritative; no backend/schema/Rules changes or per-keystroke queries are permitted.

### Corrective gate

Targeted B/E/F coverage plus all A-D regression tests, required typechecks/build/lint checks, and
`git diff --check` are required. After Test, stop at Owner DEV QA. Do not Signoff.

## Owner DEV QA F-only UI placement correction — 2026-09-15

Owner DEV QA marked the F behavior functional PASS but required the search control to be part of
the open customer dropdown rather than a field above it. This is approved as a placement-only
correction using the existing shared portaled `Select` searchable-menu architecture. The
implementation may add the minimal shared option search metadata and clear affordance needed to
preserve display-name/username/email matching, X reset, focus, and upstream eligibility behavior.

No changes to customer eligibility, request creation, data loading, backend logic, schema, Rules,
authorization, deployment, publication, Studio release, or unrelated behavior are approved. After
the focused tests/checks, return to Owner DEV QA for F only; do not Signoff.
