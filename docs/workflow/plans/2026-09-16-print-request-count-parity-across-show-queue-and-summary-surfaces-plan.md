# Plan: Print Request count parity across Show Queue and summary surfaces

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Author | Planning Agent |
| Status | accepted_with_changes — implementation complete; Owner DEV QA pending |
| Workflow | managed-phase (Plan → Formal Review → Implement → Test → Owner DEV QA → Signoff) |
| Goal | `print-request-count-parity-across-show-queue-and-summary-surfaces` |
| Related | `printRequestItems`, `showAllocations`, Studio Show Queue, Portal request summaries, Portal Admin Show Queue, Staff Inbox |

---

## Goal

Eliminate Print Request count drift by defining and applying one source-aware count contract to every request-content and selected-show allocation summary surface. The immediate production symptom is the Show Queue row for `sassymommasam-CR002` displaying `34 Designs | 46 Items | Reg Full 19 · Reg Oversize 6 | $56` while the live Print Request contents are `19 designs / 25 items`.

This plan was investigation-complete before implementation. The Formal Review accepted it with
changes, and the owner subsequently authorized continuous implementation, testing, and Owner DEV QA
preparation under the repository workflow. Production promotion remains separately unauthorized.

## Evidence-backed finding

The production request was resolved with the repository's existing Firebase Admin/Application Default Credentials using bounded read-only reads. No callable, console write, Firestore write, backfill, repair, deploy, or credential change was performed.

| Production fact | Observed value | Meaning |
|---|---:|---|
| Request document | `SrfbxvRhr3vS00exO3kN` (`sassymommasam-CR002`) | Actual ID resolved from the production request name |
| Current `printRequestItems` rows | 20 | Persisted `PrintRequest.itemCount` is also 20; this is row/line count, not source-aware logical design count |
| Current item quantity | 25 | Full request print quantity |
| Source-aware item identities | 19 | Five catalog design identities plus customer-upload identities; one upload ID is represented by two rows |
| All request allocation rows | 34 / quantity 46 | Includes 14 canceled historical rows totaling quantity 21 |
| Non-canceled allocation rows | 20 / quantity 25 | Current allocation to the selected show |
| Non-canceled allocation identities | 19 | No active duplicate `printRequestItemId` in this fixture |
| Active tier quantities | Reg Full 19; Reg Oversize 6 | Same active quantity of 25 used by tier display |
| Active price | `$56` | Existing width-tier pricing: `19 × $2 + 6 × $3`; configured production fields were absent, so repository defaults applied |
| Allocation lineage fields | No `movedFromAllocationId` or `requeuedFromAllocationId` | No explicit move/requeue lineage is stored for this fixture |

The exact Show Queue drift is in `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`: the row uses `group.allocations.length` and a reduction across all allocation rows for its top `Design(s)` and `Item(s)` labels. `group.allocations` is intentionally history-inclusive. The tier helper and `calculateShowAllocationGroupPriceUsd` exclude canceled rows when an active allocation exists. Therefore the current code combines history-inclusive row/quantity counters with active-only tier and price counters, exactly producing `34 / 46 / 19+6 / $56` from the production data.

The production canceled rows were canceled by the request's customer ID and the later active rows were created afterward. This is strongly consistent with Portal remove-from-show followed by re-add, but the data does not contain an operation ID proving the exact user gesture. The code also confirms that move and Did Not Print requeue clone allocation rows, cancel the source, and retain lineage/history; those flows can produce the same inflation if a history-inclusive group is counted as current contents.

The observed `19 / 25` Print Request result is consistent with Studio's live item summary helper. Portal currently has an independent defect: its list card and detail header render persisted `request.itemCount` as “designs,” so the same production request can render as `20 designs / 25 prints` there. Studio's local helper and the shared Portal helper also have different source-identity behavior, especially for Staff Artwork and cross-source ID collisions.

## Count contract to implement

### Full Print Request contents

This is the contract for Print Request list/detail/history and allocation-planning entry points that describe the request itself.

- **Designs** = distinct source-aware logical identities across all current `printRequestItems` for the request.
  - Catalog design: `design:<trimmed designId>`.
  - Customer upload: `upload:<trimmed customerUploadId>`.
  - Staff Artwork: `staff-artwork:<trimmed staffArtworkId>`.
  - Missing or malformed source identity: `item:<trimmed item.id>`; if the item ID is unusable, use a deterministic item fallback rather than merging unrelated sources.
  - Explicit `sourceType` takes precedence; legacy rows use the existing source-type fallback rules.
  - Two rows for the same catalog design, upload, or Staff Artwork asset count once even when sizes or quantities differ. Prefixes prevent equal IDs in different namespaces from colliding.
- **Items/prints** = the sum of finite current item `quantity` values. Invalid numeric quantities contribute zero. Item status is not used as an allocation-history filter; `printRequestItems` represent current request contents, while cancellation/history is modeled on `showAllocations`.
- The persisted `PrintRequest.itemCount` remains a compatibility/navigation field representing maintained item rows. It is not renamed in the schema, backfilled, or used as the canonical “Designs” display value.

### Selected show allocation contents

This is the contract for a selected Show Queue, Internal Gang Sheet, Staff Inbox queued glance, and Portal Admin Show Queue metrics.

- **Designs** = distinct source-aware identities among allocations for that selected show with `status !== "canceled"`.
- **Items/prints** = the sum of finite non-negative `allocatedQuantity` among those same non-canceled allocations.
- Tier counts, pricing, capacity, status, and the two displayed counters must use the same active allocation set. This is deliberately “allocated to this show,” not “the full Print Request.”
- A canceled-only group may remain visible for history/action context, but its current counters must be zero and its UI must say `History only` or otherwise clearly distinguish historical allocation context. Canceled rows must not be presented as current Designs or Items.
- Historical export/details may continue to include canceled allocations where that is an explicit product requirement. Such output must use historical/allocation-row wording and must not feed active `Designs`, `Items`, tier, price, or capacity counters.

## Answers to the requested investigation questions

1. **Canonical Designs definition:** the source-aware logical identity set above, shared by item summaries and allocation summaries. It is not `PrintRequest.itemCount`, allocation row count, or a raw `printRequestItemId` count without source handling.

2. **Canonical Items definition:** full-request surfaces sum current item quantities; selected-show surfaces sum active allocation quantities. The scope is always visible in the surface's label/contract.

3. **Why 34/46 differs from tier totals of 25:** Show Queue currently counts all 34 allocation rows and all 46 allocated quantity, including 14 canceled rows and 21 historical quantity. Its tier and price paths use only the 20 non-canceled rows and 25 active quantity, yielding Reg Full 19 + Reg Oversize 6 and `$56`.

4. **Accurate current reader/helper:** the live `printRequestItems` query in `printRequestService.listPrintRequestItemSummariesForRequests`, currently consumed by Studio's local `buildPrintRequestItemSummaries`; Portal's `useMyPrintRequests` also reads live item documents and calls the shared helper. The implementation will make the shared source-aware item summary helper the only canonical reader/aggregation path, with the existing live Firestore item reads retained.

5. **Incorrect current reader/helper:** the Show Queue row's `useShowAllocations(selectedShowId)` → `groupAllocationsByRequest` path is history-inclusive, but `UpcomingShowsPage` currently displays `group.allocations.length` and all-row quantity as current Designs/Items. Separately, Portal cards/detail and Studio user-history labels use persisted `itemCount` as “designs,” and Add-to-Show modals use raw item-entry length as “designs.”

6. **Historical/canceled/requeued inflation:** proven for canceled history in production. Move/requeue code retains canceled source rows and creates new destination rows, so raw allocation row count can also double-count those lineage legs. No production move/requeue lineage was observed for this request; the existing data is consistent with remove/re-add and does not prove more than that.

7. **Studio-only or broader:** the exact `34 / 46` visual is Studio Show Queue, but the underlying parity issue is broader. Portal request list/detail, Portal queue-to-show planning, Studio Add-to-Show, Studio user-history copy, Studio selected-show glance, and Staff Inbox each have either persisted-count, raw-row, or independently duplicated identity logic. Portal Admin's live dashboard already uses active distinct identities and active print quantity; it must stay semantically aligned and covered by shared tests.

8. **Complete live-surface inventory:**

| Surface | Intended scope | Current source/math | Plan disposition |
|---|---|---|---|
| Studio Print Requests list rail | Full request | Live item summary query; local helper shows source-aware 19/25 | Rewire to shared canonical item summary; retain live read |
| Studio Print Request detail metrics and item grid | Full request | Live `requestItems`; cost/weight and item actions derive from those rows | Keep item source; expose canonical summary where count copy is shown |
| Studio Add-to-Show/Internal Gang Sheet modal | Full request plus allocation plan | `items.length` is passed as “designs”; quantity is summed | Use canonical full-request Designs/Items for request summary; keep per-leg allocation quantities separate |
| Studio selected-show Show Queue row | This-show current allocation | All allocation rows/quantity for top counters; active rows for tiers/price | Use one active allocation summary for counters, tiers, price, and capacity; retain separate history context |
| Studio selected-show glance | This-show allocation | `buildShowQueueGlanceStats`; upcoming filters canceled, past export can include history; identity logic is separate | Reuse source-aware allocation identity/quantity helper; preserve explicit historical export mode |
| Studio Staff Inbox queued glance | Active request + show allocation | Active `pending/queued/in_progress`; local identity helper | Reuse shared allocation summary semantics, including Staff Artwork and namespaced fallbacks |
| Studio customer User Info request-history card/detail event copy | Full request/history summary | `summary.itemCount` is rendered as “designs”; history context currently loads requests/allocations, not items | Add bounded live item summaries through existing staff print-request service or make the wording explicitly “request lines”; preferred implementation is canonical Designs plus Items where the card displays request counts |
| Studio audit-trail request activity text | Historical event narrative | Request `itemCount` is embedded in generated detail text | Keep as historical event text unless the history summary read is extended; never let it masquerade as a live allocation count |
| Portal Print Requests list card | Full request | Hook already loads live summaries, but card renders persisted `itemCount` only | Pass/use canonical `uniqueDesignCount` and `totalQuantity` |
| Portal Print Request detail header | Full request | Live item sum for prints, persisted `itemCount` for designs | Use the same canonical summary for both labels |
| Portal Current Request drawer | Full working request | `buildCurrentRequestAggregates` already uses source-aware identity and live rows | Preserve behavior; make it consume the shared identity primitive and test parity |
| Portal Queue-to-Show modal | Remaining full-request quantity to allocation plan | Raw `remainingEntries.length` is labeled designs | Count remaining source-aware identities; keep remaining quantity and per-show legs distinct |
| Portal Admin upcoming Show Queue page/function | This-show current allocation | Existing DTO metrics skip canceled and distinct source identities | Preserve active allocation scope; refactor/adapt to shared helper if needed; no DTO shape change expected |
| Portal Admin View Designs modal | Item/design listing, not a numeric summary | Separate lazy request-design read | No count contract change; verify no numeric count is derived from allocation history |
| Legacy Portal Admin daily dashboard function | No current live route | Older callable remains exported but current Portal contract test excludes it | Do not modify in this goal; document as legacy/out of live parity scope |
| Catalog/design-library counts and general upload statistics | Catalog/account scope, not PR contents | Independent domain aggregates | Out of scope; do not flatten unlike metrics into the PR contract |

9. **Smallest canonical architecture:** add one source-aware identity primitive to `packages/shared/src/utils/printRequestItemSource.ts`, make `packages/shared/src/utils/printRequestItemSummaries.ts` the shared full-request aggregator, and add a shared active-allocation summary adapter used by Studio, Staff Inbox, Portal Admin, and Functions. Keep Firestore readers at their existing permission boundaries. The shared summaries should expose the minimal common fields (`uniqueDesignCount`, `totalQuantity`, active/allocation counts as appropriate) plus pricing/tier units only where an existing consumer needs them; no new persisted aggregate field is required.

10. **Server Function/DTO needs:** no new callable, DTO, Firestore query, rule, index, schema field, or trigger is required. Studio and Portal already read the source data needed. The existing `getPortalAdminUpcomingShowQueueDashboard` callable can keep its current DTO (`designQty`, `printQty`, `prQty`, capacity, status summary); if its shared metric implementation is refactored, the existing Function must be redeployed as part of promotion. The history card's additional item summary can use the existing authorized Studio service read; if bounded history performance proves unacceptable during implementation, the owner must approve a separate server summary/DTO phase rather than silently expanding scope.

11. **Repair/backfill:** no repair, migration, backfill, allocation deletion, or `itemCount` rewrite is planned. Existing canceled/history rows naturally stop contributing to current selected-show counters after the reader fix. Existing request item rows naturally produce the canonical 19/25 summary. The stored `itemCount=20` remains for compatibility and is not treated as current logical design count.

12. **Exact production-shaped fixture:** create a deterministic test fixture representing the resolved request: 20 current item rows totaling 25; five catalog identities plus 15 upload rows with one upload identity repeated in two rows, giving 19 logical Designs; 34 allocation rows on one show, 14 canceled totaling 21, 20 done totaling 25, 19 active source identities; active widths classify as Reg Full 19 and Reg Oversize 6; default pricing computes `$56`. The fixture must be reusable by shared, Studio, Portal, and Function metric tests without production reads.

13. **Expected implementation files:**

   - Shared identity/summary: `packages/shared/src/utils/printRequestItemSource.ts`, `packages/shared/src/utils/printRequestItemSource.test.ts`, `packages/shared/src/utils/printRequestItemSummaries.ts`, `packages/shared/src/utils/printRequestItemSummaries.test.ts`, and a new shared allocation-summary utility/test (exact filename to follow repository naming, expected `packages/shared/src/utils/showAllocationSummaries.ts` and `.test.ts`).
   - Studio full-request surfaces: `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.ts` and its tests, `PrintRequestsPage.tsx`, `AddToShowModal.tsx`, and the existing user-history types/service/util/component/test files if the preferred history-card live summary is accepted.
   - Studio allocation surfaces: `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`, `showQueueGlanceStats.ts` and tests, and any narrow allocation display helper tests; `groupAllocationsByRequest` remains history grouping, not the count authority.
   - Staff Inbox: `packages/shared/src/staffInbox/staffInboxQueuedGlanceMetrics.ts` and its tests, with Studio row rendering unchanged except for consuming corrected metrics.
   - Portal full-request surfaces: `apps/portal/app/(app)/requests/page.tsx`, `apps/portal/features/print-requests/components/PrintRequestCard.tsx`, `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`, `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx`, and focused component/contract tests.
   - Portal Admin parity: `packages/shared/src/utils/portalAdminShowQueueMetrics.ts` and tests plus `functions/src/lib/portalAdminUpcomingShowQueueDashboard.ts` tests/source only if the common allocation helper is adopted there. DTO files should remain unchanged unless implementation discovers a real contract gap.
   - Durable documentation: update the relevant count semantics in `docs/architecture/DATA_MODEL.md`, `docs/WORKFLOWS.md`, and `docs/standards/TESTING.md`; add a decision entry only if the repository convention requires a new durable ADR. No starter-surface or development-history distribution change is intended.

14. **Production promotion delta:** after implementation, automated tests, owner DEV QA, reviewed PR, and the separately required production checkpoint, promotion consists of the Studio application release/build, Portal App Hosting deployment for the changed request surfaces, and deployment of `getPortalAdminUpcomingShowQueueDashboard` only if its Function/shared metric bundle changes. There is no Firestore Rules/Storage Rules deployment, schema/index migration, data repair/backfill, settings change, or production data mutation. The legacy daily dashboard callable is not promoted or modified. Production promotion remains unauthorized in this plan.

## Implementation sequence after approval

1. Extract and test the shared source-aware item identity primitive; update the shared full-request summary and Studio duplicate helper to use it. Add the production-shaped item fixture and verify 19/25, mixed catalog/upload/Staff Artwork, duplicate sizes, and malformed fallback behavior.
2. Extract/test the active allocation summary. Update Show Queue row counters so row count, item quantity, tiers, pricing, and capacity use the same non-canceled allocation set. Keep history grouping and explicit canceled-only history display intact.
3. Rewire selected-show glance, Staff Inbox, and Portal Admin adapters to the same allocation semantics. Preserve historical export behavior as a separately named/covered mode.
4. Rewire Portal and Studio full-request labels/cards/modals/history summaries away from raw `itemCount`/array length. Preserve `itemCount` in persistence, navigation, queue-tab compatibility, and mutation bookkeeping.
5. Update durable semantics documentation only after code behavior is verified. Do not change rules, schema, indexes, production settings, or data.

## Test strategy and required cases

### Unit and contract coverage

- Basic two-row item fixture: 19 + 6 quantity must produce 2 Designs and 25 Items.
- Production-shaped item fixture: 20 rows, one duplicate upload identity, must produce 19 Designs and 25 Items.
- Historical/multi-allocation fixture: canceled rows and split allocations must not inflate active selected-show counts.
- Remove → Editing → re-add: canceled source rows plus fresh active rows must count only fresh active allocation contents.
- Move/requeue: cloned destination plus canceled source must count once in the destination/current active set; lineage remains available to history.
- Multi-show split: full request remains 19/25 while each selected show reports only its own active allocation scope.
- Mixed catalog, customer upload, Staff Artwork, and legacy/malformed source fields: identities are namespaced and deterministic.
- Duplicate same design in different rows/sizes: one Design, summed Items.
- Tier invariant: displayed tier quantities sum to the same active Items count.
- Pricing scope: active quantity only; canceled-only groups do not contribute money.
- All surfaces use the canonical helper/DTO contract; no visible “Designs” label reads raw `itemCount`, allocation row length, or raw remaining-entry length.
- Dollar regression: retain and extend `showAllocationDollarTotals` tests so the production-shaped active set remains `$56` and canceled history does not change it.

### Verification commands after implementation

- Focused shared, Studio, Portal, and Functions tests using the repository's existing test scripts.
- Relevant typechecks and targeted lint for changed packages.
- `npm run build:studio` if Studio source is changed; the existing non-fatal bundler/electron-builder warning baseline must be documented honestly.
- Portal build/typecheck if Portal source is changed.
- `git diff --check`.
- Owner DEV QA on DEV data: inspect the target-shaped request, a canceled/re-added request, a split multi-show request, a Staff Artwork request, and a canceled-only history group. No test may be claimed as passed unless run.

## Human checkpoints and stop conditions

- **Before implementation:** Formal Review approval plus explicit owner implementation authorization are required.
- **Before production:** owner approval for production promotion is required; production data and console actions remain forbidden without a separate checkpoint.
- If required read access, new credentials, a new Function/DTO, or a schema/data change becomes necessary, stop and request owner direction; do not expand this plan silently.

## Risks and rollback

| Risk | Mitigation |
|---|---|
| Different source namespaces share an ID | Prefix identity keys by resolved source type and test mixed-source collisions |
| History-only rows disappear from an operational view | Preserve grouping/actions and show explicit history-only context; only active counters become zero |
| Portal/Admin/Studio use different allocation scopes | Centralize active allocation summary and test all adapters against the same fixture |
| Adding item reads to user history increases reads | Reuse bounded existing authorized service reads; measure during implementation and split scope only with owner approval |
| Persisted `itemCount` is changed accidentally | Keep it as compatibility state; change only display aggregation and tests |

Rollback is a code revert of the shared helper/adapters and UI consumers. No data rollback is needed because this plan performs no writes or migrations.

## FreshForge impact classification

| Area | Impact |
|---|---|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Permanent Documentation | Yes — count semantics and test contract |
| Workflow Artifacts | Yes — this Plan, Formal Review, Test Report, and Signoff after implementation |
| Production/Data | No writes planned; promotion separately gated |

## Acceptance criteria

- All full-request summary surfaces display source-aware Designs and quantity from live `printRequestItems`.
- All selected-show operational surfaces display source-aware active allocation Designs and quantity from non-canceled allocations.
- The production-shaped request renders `19 Designs | 25 Items | Reg Full 19 · Reg Oversize 6 | $56` on the Show Queue row, with no canceled-history inflation.
- Portal Admin remains active-allocation scoped and numerically agrees with Studio for the same selected show.
- Historical export/detail behavior remains explicit and is not silently converted to active counts.
- Required tests and owner DEV QA pass, with failures documented honestly.
- No implementation, deployment, migration, backfill, repair, or production write occurs without the required approvals.
