# Plan: Shared Length-Based Show Pricing and Customer Navigation

| Field | Value |
|-------|-------|
| Date | 2026-09-17 |
| Author | Codex / Managing Agent |
| Status | approved — implementation held at owner checkpoint |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-17-print-request-length-surcharge-and-customer-navigation-review.md |
| Goal ID | `print-request-length-surcharge-and-customer-navigation` |

---

## Goal

Add shared length-based show pricing on top of the existing width pricing, preserve one pricing authority across Studio, Portal, queue summaries, exports, and customer-facing estimates, and add a stable Customer Print Request link from Studio to `/users`. The pricing policy keeps the existing width bands and 22-inch normal-request cap, makes Pocket require both saved dimensions to be at most 4 inches, and adds configurable height surcharges of $0 / $1 / $2 / $3 for `<=14`, `>14–18`, `>18–24`, and `>24` inches. This phase stops after Plan and Formal Review; it does not implement code, alter Firebase data, or deploy anything.

## Background and investigation findings

- The current canonical settings document is `settings/showQueue`. `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.ts` already normalizes the four width-tier prices and weights, with fixed width breakpoints and policy version `width-four-tier-v1`.
- The current shared summary in `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` classifies by width only. It accepts height but intentionally ignores it for pricing. The same width-only resolver is reused by Studio cards, queue metrics, size counts, Portal admin display, and shared summaries.
- `showAllocations` currently persist saved width/height snapshots and lineage fields, but no price or settings snapshot. Active queue totals therefore resolve against current `settings/showQueue`; canceled/history rows are excluded by the active-allocation contract. A settings change can currently change an already queued Studio/Staff Inbox total.
- Portal commitment and size-tier UI currently use `DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG`; Portal has no customer-safe delivery of the editable `settings/showQueue` values. The private settings document is staff-readable only.
- `/users` is routed to `UserManagementPage`, which loads the customer directory and filters locally. It has existing merge/survivor behavior through `resolveLogicalCustomerIds` and `mergedIntoCustomerId`, but no URL query selection.
- No repository mirror files named `CURRENT-STATE.md`, `05-workflows-summary.md`, `06-data-model-essentials.md`, `08-tech-stack-repo-map.md`, `12-decisions-and-constraints.md`, or `13-recent-completed-work.md` were found under the checkout. The authoritative local workflow and architecture docs remain the sources used here.

## Scope

### In Scope

- Extend the existing shared show-pricing contract with a normalized length-surcharge policy and a single per-item resolver.
- Preserve width tiers and fixed breakpoints; apply the two-dimensional Pocket rule and height surcharge exactly at the requested boundaries.
- Make every Studio/Portal/shared pricing or size-tier consumer use the resolver or a summary derived from it; no React-local pricing formulas.
- Add owner/admin-editable surcharge dollar amounts to the existing Studio Show Queue settings UI while keeping breakpoints fixed and keeping `settings/showQueue` canonical.
- Deliver an allowlisted, customer-safe pricing projection to Portal, including the public `/help` pricing modal and request/show price commitment surfaces.
- Decide and implement the queued-price preservation contract, including allocation creation, reads, cancellation, remove/re-add, move, and Did Not Print/requeue lineage.
- Update cache fingerprints and invalidation inputs so changing material pricing fields cannot reuse stale price-bearing output.
- Add a stable customer ID deep link from a customer-associated Studio Print Request to `/users`, preserving internal-request behavior and existing merged-customer semantics.
- Update architecture/data-model/decision/testing documentation after implementation; this Plan records the required updates.

### Out of Scope

- Changing the existing 22-inch normal print request validation cap.
- Changing width breakpoints, adding a fifth width tier, changing weight policy, or adding a second pricing settings document.
- Repricing completed historical work, retroactive price backfills, or destructive migration of existing allocations.
- Changing allocation quantity semantics, production status transitions, customer merge behavior, or request-name parsing.
- Production deploys, Firebase console actions, Rules changes, migrations, or Functions deployment in this Plan/Review turn.
- A broad `/users` redesign or a new customer search/indexing system.

---

## Pricing contract to implement

### Authority

`settings/showQueue` remains the only editable source of truth. The shared normalizer/resolver in `packages/shared` is the only place that turns settings plus saved dimensions into a price. Studio settings services continue to own staff/admin writes; Portal receives only a customer-safe projection from a callable/Admin-SDK path and never reads the private settings document directly.

### Width/base tier

The existing bands and prices remain:

| Condition | Base tier | Existing default |
|---|---|---:|
| Both `printWidthInches <= 4` and `printHeightInches <= 4` | Pocket | $1 |
| Width `>4` and `<=11` | Standard Full | $2 |
| Width `>11` and `<=14` | Standard Oversized | $3 |
| Width `>14` | Extra Oversized | $4 |

Height only disqualifies Pocket; it does not move a non-Pocket item between the other width tiers. Thus `4 × 4.01` is Standard Full, while `5 × 21` remains Standard Full before its length surcharge.

### Length surcharge

The new editable dollar amounts are normalized under the existing settings contract with fixed policy bands:

| Saved `printHeightInches` | Length tier | Default surcharge |
|---|---|---:|
| `<=14` | Standard length | $0 |
| `>14` and `<=18` | Long | $1 |
| `>18` and `<=24` | Extra-long | $2 |
| `>24` | Extended | $3 |

The unit price is `base tier price + length surcharge`; line total is `unit price × exact positive integer quantity`. Example: `5 × 21` is Standard Full `$2` + Extra-long `$2` = `$4` per unit, and quantity 3 totals `$12`.

The resolver result must expose at least:

```text
width/base tier
base price
length tier
length surcharge
final unit price
quantity
line total
```

All dimensions must remain positive finite values. The existing normal-request validation cap remains unchanged; the resolver still handles values above 24 deterministically for queued/imported/legacy data.

### Queued price preservation decision

Current behavior is live, not snapshotted: before queue, Studio resolves current item dimensions against current settings; after Add to Show, active allocation rows resolve their saved dimensions against current `settings/showQueue`; canceled rows are excluded; move and Did Not Print/requeue clone dimensions but currently recalculate current settings. Portal request estimates use hardcoded defaults today.

Recommended design for owner approval:

```text
showAllocations.pricingSnapshot = {
  policyVersion,
  widthTier,
  basePriceUsd,
  lengthTier,
  lengthSurchargeUsd,
  unitPriceUsd
}
```

- Snapshot the normalized price components when Studio or Portal creates a new allocation. Quantity stays outside the snapshot and remains `allocatedQuantity × unitPriceUsd`, so split allocations remain exact.
- Active queue summaries, Staff Inbox totals, show rails, and historical allocation views use the allocation snapshot when present.
- Canceled rows retain their snapshot but remain excluded from current active totals.
- Move and Did Not Print/requeue clone the source snapshot with the lineage fields; they do not silently reprice production lineage.
- Remove/unqueue preserves the canceled allocation record. Editing while unqueued continues to use the live resolver. Re-adding creates a new allocation with the then-current dimensions/settings snapshot.
- Existing allocations have no historical price snapshot. They cannot be reconstructed truthfully without a prohibited backfill. The implementation must either (a) use a clearly documented legacy fallback to the current resolver for snapshot-less rows, or (b) receive an owner-approved compatibility strategy before implementation. It must not silently claim historical prices were preserved.

**[NEEDS OWNER DECISION: QUEUED PRICE SNAPSHOT CONTRACT]** — approve the recommended snapshot for new allocations and explicitly accept the legacy fallback boundary, or choose another compatible contract. This is the required implementation checkpoint because the current data model cannot recover past effective prices.

## Affected Areas

### Files / Modules (expected)

These are the expected implementation files after owner authorization; exact additions may be narrowed during implementation without expanding behavior beyond this Plan.

#### Shared pricing, types, and cache

- `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.ts`
- `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts`
- `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts`
- `packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts`
- `packages/shared/src/utils/gangSheetPricingTierDisplay.ts`
- `packages/shared/src/utils/printRequestPocketFullSizeCounts.ts`
- `packages/shared/src/utils/printRequestPocketFullSizeCounts.contract.test.ts`
- `packages/shared/src/utils/gangSheetCacheFingerprint.ts`
- `packages/shared/src/utils/gangSheetCacheFingerprint.test.ts`
- `packages/shared/src/types/showAllocation/showAllocation.types.ts`
- a shared Portal pricing projection type under `packages/shared/src/types/portal/` plus its contract tests
- shared allocation-summary helpers if the snapshot-aware summary needs a dedicated module

#### Studio settings and pricing consumers

- `apps/studio/src/renderer/src/features/settings/services/showQueueSettingsService.ts`
- `apps/studio/src/renderer/src/features/settings/services/gangSheetSettingsService.ts`
- `apps/studio/src/renderer/src/features/settings/hooks/useGangSheetSettings.ts`
- `apps/studio/src/renderer/src/features/settings/components/GangSheetSettingsSection.tsx`
- `apps/studio/src/renderer/src/features/upcoming-shows/services/gangSheetSettingsFields.ts`
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestCostBreakdownModal.tsx`
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showAllocationDollarTotals.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueueGlanceStats.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowRailDollarTotals.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- `apps/studio/src/renderer/src/features/users/pages/UserManagementPage.tsx`
- the narrow existing Users directory/filter component or a colocated URL-selection utility and tests
- `apps/studio/electron/services/export/exportGangSheetPng.ts`
- `apps/studio/electron/services/export/composeGroupedGangSheetSheets.ts`
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.ts`

#### Functions, Firestore Rules, and allocation lifecycle

- `functions/src/allocateStudioPrintRequestToShow.ts`
- `functions/src/queuePortalPrintRequestToShow.ts`
- `functions/src/lib/showQueueMove.ts`
- `functions/src/lib/showProductionRecoveryRequeue.ts`
- `functions/src/index.ts`
- a new narrow Portal pricing callable and its loader/contract test, expected under `functions/src/` and shared Portal types
- `firestore.rules` — extend the `settings/showQueue` allowlist for surcharge fields; if the client-visible `showAllocations` allowlist remains authoritative for allocation writes, add the exact snapshot fields there as well
- Rules tests covering both field allowlists and rejection of unauthorized customer reads/writes

#### Portal pricing and customer copy

- `apps/portal/features/print-requests/utils/buildPortalShowPriceCommitmentSummary.ts`
- `apps/portal/features/print-requests/components/PortalShowPriceCommitmentBreakdown.tsx`
- `apps/portal/features/print-requests/components/PortalShowPriceCommitmentModal.tsx`
- `apps/portal/features/print-requests/components/PortalShowSizeTiersModal.tsx`
- `apps/portal/features/print-requests/services/` or `hooks/` for the customer-safe pricing projection/cache
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`
- `apps/portal/features/shared/components/PortalBiddingAcknowledgmentModal.tsx`
- `apps/portal/features/help/components/PortalHelpPageContent.tsx`
- relevant Portal pricing/help stylesheet and contract tests only if copy/layout requires it

#### Durable documentation

- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/BACKEND.md` if the callable/snapshot lifecycle changes the backend contract
- `docs/project/DECISIONS.md`
- `docs/standards/TESTING.md`
- `docs/standards/SECURITY.md` if public callable projection rules need a documented security contract
- `docs/WORKFLOWS.md` only if queue pricing lifecycle documentation is not otherwise covered

### Architecture Impact

- [x] Details: Extend the existing shared pricing utility and canonical settings resolver. Add a small customer-safe Function projection and, if approved, an immutable allocation pricing snapshot. Keep React and Electron consumers dependent on shared pricing types/helpers rather than duplicating formulas.
- [x] Details: Bump the pricing policy/cache version so price-bearing render/export fingerprints change when the new fields are present.

### Security Impact

- [x] Details: `settings/showQueue` remains staff-only for reads and owner/admin-managed for writes. Portal gets an allowlisted public-safe DTO only; no layout, internal operational fields, or raw settings document is exposed.
- [x] Details: The new callable must be rate-safe, validate its response shape, and follow the existing public Portal auth/public-route policy. Customer-owned allocation reads remain governed by existing ownership checks.
- [x] Details: Strict Rules field allowlists must be updated deliberately and covered by emulator tests; no broad `hasOnly` relaxation.

### Data Model Impact

- [x] Details: Add optional immutable pricing snapshot data to new `showAllocations`, preserving current allocation lineage and allowing legacy rows without the field.
- [x] Details: No backfill, destructive migration, or rewrite of existing queued/history data is included. Legacy fallback behavior must be documented and owner-approved.

### Backend Impact

- [x] Details: Allocation creation and lineage-copy Functions must resolve/store the snapshot. Add a narrow callable for customer-safe effective pricing. Functions build and Rules emulator tests are required after implementation.

### UI / UX Impact

- [x] Details: Studio settings gains four editable surcharge amounts with fixed read-only breakpoints. Pricing breakdowns show base width tier, length tier/surcharge, unit price, quantity, and total.
- [x] Details: Portal copy explains width base pricing, Pocket’s both-dimensions rule, extra-long surcharge, additive pricing, estimate status, and configured dollar amounts. Owner must perform visual/UX review before release.
- [x] Details: Customer labels in request cards link to `/users?customerId=<stable-id>` only for customer requests; internal requests remain plain text. The link must not trigger request-card selection.

### Migration Impact

- [x] Forward steps: Write snapshots for new allocations; read snapshots first; use an explicitly labeled legacy fallback for rows without snapshots if the owner approves it; do not backfill.
- [x] Rollback / compatibility: Keep snapshot fields optional. Revert consumers to the prior resolver/config projection while leaving unknown optional fields readable; preserve lineage/status fields. A rollback must not delete snapshot data.

---

## Approach

1. **Freeze the shared contract.** Add typed length-tier constants, surcharge fields/defaults, normalization, policy-version bump, two-dimensional tier classification, and a single per-item price-breakdown resolver. Preserve existing public helper names only as compatibility wrappers where safe, and make summaries aggregate resolver output rather than formulas.
2. **Make summaries complete.** Extend summary output with base/length/unit/line breakdowns and deterministic mixed-item grouping. Preserve existing total quantity/weight aliases and active/canceled allocation filtering. Update pocket/full counts and Portal admin size labels to use both dimensions.
3. **Update settings.** Add four surcharge inputs to the canonical `settings/showQueue` typed contract, validation, Rules allowlist, effective settings hook, and Owner/Admin UI. Display immutable breakpoint text and reject non-finite/negative values according to the existing price validation contract.
4. **Implement queued-price lifecycle after owner decision.** On allocation creation, load the effective canonical pricing settings and write the normalized snapshot. On move/requeue, copy the snapshot with lineage. On reads, use snapshot-first semantics and implement only the approved legacy fallback. Keep canceled/history semantics and quantity multiplication explicit.
5. **Deliver Portal pricing safely.** Add the narrow callable projection, consume it from the request commitment/acknowledgment and `/help` size-tier modal, handle loading/error states without inventing fallback authority, and show the configured rates plus estimate disclaimer. Confirm whether public `/help` can call the projection unauthenticated under the existing Portal shell; if not, use the existing authenticated route policy without exposing raw settings.
6. **Trace and replace all consumers.** Update Studio request cards, request/group summaries, cost modal, upcoming-show rail/glance totals, Staff Inbox paths through shared summary, exports/composers, cache fingerprint, and Portal admin/detail paths. Search for all remaining direct width-only resolver calls and `DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG` use in pricing UI before signoff.
7. **Add customer navigation.** Pass stable `customerId` from the request-card source, use `/users?customerId=...`, parse the query with the existing router, resolve merged source IDs to the existing logical survivor behavior, filter the loaded directory by ID (not request name/username), and preserve normal tab/search/clear behavior. Add propagation/accessibility coverage.
8. **Document and verify.** Update the data model, decision record, backend/security notes, and tests. Run focused unit/contract tests, Rules emulator tests, typechecks, lint, builds, and `git diff --check`; then stop for Owner DEV QA before any production action.

## Exact behavior matrix to verify

| Scenario | Expected behavior |
|---|---|
| `4 × 4`, quantity 1 | Pocket base price + standard length surcharge |
| `4 × 4.01`, quantity 1 | Standard Full base tier; no Pocket |
| `4 × 14`, `4 × 14.01` | Same width/base behavior; surcharge changes at `14` boundary |
| Height `18`, `18.01`, `24`, `24.01` | Surcharge changes only at the stated exclusive/inclusive boundaries |
| `5 × 21`, quantity 3 | Default `$4` unit / `$12` line total |
| Width `11`, `11.01`, `14`, `14.01` | Existing base tier transitions remain exact |
| Mixed dimensions/quantities | Every line uses its own resolver result; aggregate is exact integer quantity sum |
| Invalid/non-finite dimensions | Existing positive-finite validation contract rejects/fails closed |
| Canceled allocation | Excluded from active totals; retained snapshot/history if present |
| Move/requeue | Snapshot and lineage preserved; no silent reprice |
| Remove/edit/re-add | Old allocation canceled/retained; new allocation snapshots current effective settings |
| Legacy allocation without snapshot | Only the owner-approved fallback is used and documented |
| Settings changed after queue | New snapshot rows do not change; legacy fallback behavior is explicit |
| Internal request customer label | No customer link |
| Customer request label | Stable ID link to `/users`; card selection does not fire |
| Merged customer ID | Existing survivor/logical-ID behavior is reused; no name parsing |

## Test Strategy

### Automated

| Check | Command | Required |
|---|---|---|
| Focused shared unit tests | `npx tsx --test packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts packages/shared/src/utils/printRequestPocketFullSizeCounts.contract.test.ts` | yes |
| Function/allocator contracts | `npx tsx --test` with changed `functions/src` contract tests | yes if Functions change |
| Rules emulator | `npm run test:rules` | yes if Rules change |
| Studio typecheck | `npx tsc --noEmit -p apps/studio/tsconfig.json` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Functions build | `npm --prefix functions run build` | yes if Functions change |
| Studio build | `npx vite build` from `apps/studio` | yes |
| Portal build | `npm run build:portal` | yes |
| Lint | `npm run lint` plus changed-file lint as needed | yes |
| Diff hygiene | `git diff --check` | yes |

Focused tests must cover exact width/height boundaries, settings normalization/defaults, mixed line totals, legacy/snapshot queue behavior, move/requeue/remove/re-add, cache invalidation, Portal projection safety/parity, and `/users` deep-link parsing/merged survivor/clear behavior. Manual testing must cover Studio settings, Studio/Portal pricing modals, `/help`, a customer request card, an internal request card, and a merged customer.

No tests are run in this Plan/Review turn because implementation is explicitly prohibited.

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — Portal pricing copy/modal and Studio settings/customer-link interactions.
- [x] Business logic decision — surcharge values, estimate wording, and queued-price snapshot contract.
- [x] Database/schema decision — optional `showAllocations.pricingSnapshot`; no backfill.
- [x] Auth / external service setup — customer-safe callable exposure policy for public `/help`.
- [x] Production deploy — Functions/Rules/Portal/Studio release authorization remains separate.
- [x] Owner DEV QA — required after implementation/tests and before any promotion.

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Existing allocations lack historical prices | High | Owner-approved snapshot contract; snapshot new writes; no false backfill; explicit legacy fallback/documentation |
| Portal could diverge from Studio settings | High | Narrow callable projection from canonical settings; shared DTO/resolver tests; no Portal defaults as authority |
| One width-only consumer remains | High | Repository-wide search for direct resolver/default-config use; focused contract tests for all listed surfaces |
| Strict Rules allowlists reject new fields or become too broad | High | Add exact fields only; emulator tests for allowed/denied paths; preserve Admin SDK/Function boundaries |
| Cache reuses output after pricing change | Medium | Include surcharge/policy/snapshot inputs in fingerprint and bump summary version; test price-changing fingerprints |
| Customer link breaks request-card selection or merged identity | Medium | Stop event propagation, link by stable ID, reuse existing logical/survivor resolver, contract test navigation |
| Public pricing callable leaks operational settings | High | Return only allowlisted pricing projection; never return raw `settings/showQueue`; validate auth/rate/public route policy |

## Rollback Plan

Keep all new settings and allocation snapshot fields optional. If implementation must roll back, revert consumers/callable/UI to the prior released behavior while retaining unknown optional snapshot fields and existing allocation lineage. Do not delete snapshots or rewrite historical allocations. Any rollback involving Rules/Functions/Portal deployment requires explicit owner approval and the corresponding deployment evidence.

## Documentation Updates Required

- [x] `DATA_MODEL.md` — allocation snapshot fields, legacy compatibility, active/canceled read semantics.
- [x] `BACKEND.md` — callable projection and allocation creation/lineage behavior, if backend changes land.
- [x] `TESTING.md` — pricing boundary, Rules, projection, cache, and navigation coverage.
- [x] `SECURITY.md` — customer-safe public pricing projection, if callable is public.
- [x] `DECISIONS.md` — amend ADR-FP-185 or add a decision covering length tiers and queued snapshots.
- [ ] `PROJECT_BRIEF.md` — only if product-level pricing language is maintained there.

## Open Questions / owner checkpoint

- [ ] **[NEEDS OWNER DECISION: QUEUED PRICE SNAPSHOT CONTRACT]** Approve snapshot-first allocation pricing for new allocations plus an explicit legacy fallback, or specify an alternative that does not require a historical backfill.
- [ ] Confirm surcharge field names and whether “Long / Extra-long / Extended” are the approved customer-facing labels.
- [ ] Confirm whether public `/help` may invoke the narrow pricing callable without customer authentication; do not expose the private settings document.
- [ ] Confirm customer-facing estimate language: estimates are based on saved dimensions and configured rates, and may differ only under the approved legacy compatibility boundary.
- [ ] Confirm manual UX review scope for the Studio settings rows and Portal modal copy before implementation signoff.

## Approval

- Review doc: `docs/workflow/reviews/2026-09-17-print-request-length-surcharge-and-customer-navigation-review.md`
- Verdict: approved — original pricing decisions and the urgent cross-origin corrective are owner-authorized; implementation proceeds after amended Formal Review

---

## Urgent Amendment: Cross-origin Customer Print Request invariant and unqueue corrective

### Amendment authority and status

The owner’s 2026-09-17 Continue Workflow instruction resolves the original pricing review checkpoint and explicitly authorizes this corrective within the same managed goal. The following supersedes the old assumption that Portal may ignore `studio_customer` Working/Draft requests. It does not create a separate goal, rewrite provenance, merge records, or authorize deployment/backfill.

### Confirmed root cause

1. Studio-created customer requests persist `requestOrigin: "studio_customer"` and `status: "draft"`.
2. Studio’s picker query already scans non-internal `draft|editing` requests, but Portal’s shared `isPortalEditablePrintRequest` currently accepts `portal_customer` and only `studio_customer` + `editing`.
3. `functions/src/lib/portalWorkingPrintRequest.ts` filters through that predicate, so an unparked Studio draft is ignored and Portal creates a separate `portal_customer` request.
4. `functions/src/lib/portalContinuableParking.ts` then encounters the Studio request as non-Portal-editable and throws `Cannot park while studio customer requests exist.` during unqueue/remove-from-show.
5. The existing park helper already has the correct empty-vs-meaningful behavior for eligible drafts; the origin-only branch is the faulty blocker.

Deleting the abandoned empty Studio draft removed the immediate blocker in the reported incident, but deletion is not the product fix. The fix is origin-neutral eligibility plus canonical parking/cleanup.

### New canonical invariant

For the same logical customer, an ordinary non-internal customer request with `status: "draft" | "editing"` is an active/unparked continuable request when it is not a parked draft (`status === "draft"` with a non-empty `parkedByEditingRequestId`). `requestOrigin` is provenance only and cannot permit a second active Working request. Internal, terminal, printed, archived, another-customer, and parked-background requests are excluded from this active uniqueness count.

The existing parking contract remains intact: one active Editing owner may coexist with one intentionally parked Working draft. A parked draft is not a second active Working request and must not block a new lifecycle transition by itself.

### Portal implementation contract

- Change the shared Portal editability predicate to accept ordinary non-internal `studio_customer` requests in both `draft` and `editing` statuses. Keep `studio_internal` and `isInternal === true` denied.
- Keep `isPortalActiveEditablePrintRequest` as the active selector so parked Studio drafts remain visible/history-compatible but are excluded from Current Request, Add Design, upload, quantity, size, duplicate, remove-item, and queue mutation candidates.
- No Portal origin rewrite occurs. The selected request remains `requestOrigin: "studio_customer"`.
- Existing Portal context/resolver (`PortalPrintRequestContext`, `selectPortalActiveEditablePrintRequest`, `resolvePortalWorkingRequestBranch`) then selects the same Studio Working request. If legacy data has multiple active unparked requests, existing explicit selection/conflict behavior remains; no silent merge or guessing is introduced.
- All existing mutation callables that already call `isPortalEditablePrintRequest` inherit the same contract: catalog add, customer-upload attachment, assisted-approved artwork attachment, duplicate, quantity, size, and remove-item. Each still independently checks customer ownership, active/unparked state, source/DPI/size/quota/maintenance guards.
- Portal show-management remains narrower than content editability but already accepts both `portal_customer` and `studio_customer`; internal requests remain denied. Existing show cutoff, capacity, production-started, terminal, and allocation guards remain authoritative.

### Parking and unqueue corrective

- Remove the `studio_customer`-origin-only failure branch from `applyParkOrCleanupOtherContinuablesInTransaction`.
- Process any same-customer ordinary non-internal draft that satisfies the shared editability predicate, regardless of origin.
- Empty draft (`itemCount === 0`): archive/close inside the existing parking transaction and retain lifecycle audit fields.
- Meaningful draft (`itemCount > 0`): preserve all items/provenance and set `parkedByEditingRequestId`/`parkedAt`; set `parksDraftPrintRequestId` on the request entering Editing. Existing restore clears those fields atomically when Editing ownership ends.
- Existing Editing conflict remains a conflict. Another customer, Internal Request, parked-by-another request, production-started allocation, terminal request, maintenance, quota, DPI, size, cutoff, and capacity guards remain unchanged.
- Both `unqueuePortalPrintRequestFromShow` and `unqueueStudioCustomerPrintRequestFromShow` continue using the canonical helper. The reported incident must therefore succeed for an empty abandoned Studio draft and preserve a meaningful Studio draft through parking.
- Reverse origin (`meaningful portal_customer` draft alongside a removable `studio_customer` queued request) follows the same origin-neutral helper; no origin-specific exception remains.

### Studio creation guard and race safety

- The existing picker query `status in [draft, editing]` + `isInternal == false` already sees both origins and uses the existing `status+isInternal` index. Its result must exclude only legitimate parked drafts from the active uniqueness set; it must not filter by `requestOrigin`.
- The current client service preflight is not race-safe because the Web Firestore transaction API only reads document references, not a query. Replace the customer-create write path with a staff-authenticated `createStudioCustomerPrintRequest` callable backed by one Admin SDK transaction. The callable rechecks active/unparked same-customer `draft|editing` requests before creating the request and incrementing the customer sequence.
- The callable revalidates active/non-guest/non-deleted/non-disabled/non-merged customer eligibility and username, preserving current picker exclusions. The UI filter remains a convenience; the callable is authoritative against races.
- Internal request creation remains on its current Studio path. Customer requests retain `requestOrigin: "studio_customer"`.
- The existing `customerId + status` index already exists for the transactional query. No new index is expected; verify the emulator/build output before implementation signoff.

### Reconciliation answers

1. Portal created a second request because the shared Portal editability filter excluded `studio_customer` drafts and the Portal resolver intentionally allowed those legacy drafts not to block creation.
2. Yes. The reported parking error comes from the same origin distinction in `portalContinuableParking.ts`, after the Studio request is treated as non-Portal-editable.
3. Active/unparked Working Customer PR = ordinary (`isInternal !== true`) `draft|editing`, same logical customer, not a parked draft; origin is irrelevant.
4. The Studio request becomes Portal Current through the shared eligibility/active selector and existing ownership checks; its origin remains `studio_customer`.
5. Catalog add, upload, assisted-approved artwork, quantity, size, duplicate, and remove-item use the same selected request because their existing server gates share the corrected predicate.
6. Ownership, `isInternal`, status, parked-state, maintenance, source, DPI, size, quota, and callable checks remain in force; the Portal never queries or mutates another customer or Internal Request.
7. Editing/show-management remains distinct: Studio customer Editing is already accepted by the Portal content/show contracts; show removal still requires the existing production/show guards, and parked drafts remain inactive.
8. Empty Studio drafts are archived inside the existing parking transaction.
9. Meaningful Studio drafts are parked with contents/provenance intact and restored by the existing `parksDraftPrintRequestId` path.
10. Parked drafts are excluded by `isPortalActiveEditablePrintRequest` and the Studio active picker set; they do not count as a second active Working request.
11. Studio picker filtering is already origin-neutral, but it needs parked-state filtering. The direct client write guard is not race-safe and is replaced by the trusted callable; no UI-only guard is relied upon.
12. DEV QA requires the changed Functions: `createStudioCustomerPrintRequest`, the existing Portal mutation/unqueue Functions only if source changes require redeploy, and any already-approved pricing Functions. No automatic deploy is included.
13. Firestore Rules need no change because Studio customer creation and Portal/parking writes use trusted callables/Admin SDK, and existing ownership Rules remain narrow. No new index is expected because `printRequests customerId + status` and `status + isInternal` already exist.
14. Legacy duplicates are not migrated or merged. Normal lifecycle operations use origin-neutral selection/parking, prevent further active duplicates, preserve explicit-selection behavior for genuinely multiple active rows, and fail only on unsafe lifecycle/ownership/production conditions.

### Expected amended files

In addition to the pricing files already listed above:

- `packages/shared/src/utils/portalPrintRequestEditability.ts`
- `packages/shared/src/utils/portalPrintRequestEditability.test.ts`
- `packages/shared/src/utils/portalActiveEditablePrintRequest.test.ts`
- `packages/shared/src/utils/portalPrintRequestUnqueue.test.ts`
- `packages/shared/src/utils/portalPrintRequestShowManagement.test.ts` if contract coverage is expanded
- `packages/shared/src/utils/portalOneWorkingPrintRequest.test.ts`
- `functions/src/lib/portalWorkingPrintRequest.ts`
- `functions/src/lib/portalContinuableParking.ts`
- `functions/src/lib/portalContinuableParking.test.ts` (new if absent)
- `functions/src/createPortalPrintRequest.ts` and related working-request tests
- `functions/src/unqueuePortalPrintRequestFromShow.ts`
- `functions/src/unqueueStudioCustomerPrintRequestFromShow.ts`
- `functions/src/createStudioCustomerPrintRequest.ts` (new)
- `functions/src/createStudioCustomerPrintRequest.test.ts` (new contract/lifecycle coverage)
- `functions/src/index.ts`
- `packages/shared/src/types/printRequest/createStudioCustomerPrintRequest.types.ts` (new)
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts`
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.customerIdentity.contract.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- Portal resolver/context/mutation contract tests under `apps/portal/features/print-requests/`; implementation files only where the shared predicate does not flow through automatically
- `docs/project/DECISIONS.md` — supersede/amend ADR-FP-071
- `docs/architecture/DATA_MODEL.md`, `docs/architecture/BACKEND.md`, `docs/WORKFLOWS.md`, and `docs/standards/TESTING.md`
- `firestore.indexes.json` only if verification proves an existing index is insufficient; current evidence says no change

### Combined acceptance and test additions

Add the owner-specified incident fixture and reverse-origin fixture to automated coverage:

- Empty `studio_customer` draft + queued `portal_customer`: Portal and Studio removal succeed; empty draft archives; removed request becomes Editing/current; no blank/bounce.
- Meaningful `studio_customer` draft + queued `portal_customer`: draft parks with all items/provenance; removed request becomes Editing; restore clears parking fields.
- Meaningful `portal_customer` draft + queued `studio_customer`: same origin-neutral parking behavior where show-management eligibility allows removal.
- Studio/Portal no-second-request tests for both origins, including callable race rejection and parked-draft exclusion.
- Cross-customer, Internal, terminal/production-started, maintenance, quota, DPI/22-inch, capacity, and duplicate-allocation regressions.
- Combined pricing assertion: canceled allocation retains its pricing snapshot; parking does not mutate pricing; re-add snapshots current pricing; move/requeue copies the original snapshot.

No migration, merge, cleanup job, or production record mutation is part of this amendment.
