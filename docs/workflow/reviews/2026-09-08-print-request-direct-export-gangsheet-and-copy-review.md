# Review: Print Request Direct Export, Gangsheet, and Copy

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Reviewer | Formal Review (managed-phase) |
| Plan | `docs/workflow/plans/2026-09-08-print-request-direct-export-gangsheet-and-copy-plan.md` |
| Verdict | **approved** |

---

## Summary

The plan is bounded to request-scoped Studio operational work and follows the current production architecture: request items flow through the same source-aware production resolver and fixed-300-DPI Electron export/gang-sheet primitives that Show Queue already uses. It correctly treats copying as a new, trusted creation operation—not as conversion, document cloning, or allocation cloning—and preserves the private customer-upload boundary.

This approval authorizes no implementation by itself. The owner explicitly limited this managed phase to investigation, plan, and formal review; implementation remains a required human checkpoint.

---

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | Direct request export, Standard gang sheet, new Copy Request only; Portal, lifecycle, allocations, production, publish excluded. |
| Architecture alignment | pass | Reuses shared resolver and Electron production pipeline; Show Queue stays an adapter. |
| Security impact addressed | pass | Staff-only controls/callable, IPC URL validation, and cross-customer upload privacy are explicit. |
| Data model impact addressed | pass | No schema/migration/cache artifact persistence planned; normal new request/item documents only. |
| Backend impact addressed | pass | New staff Copy Request callable is justified; direct export/generation remain local Electron work. |
| Test strategy adequate | pass | Covers source type/variant, quantity/size, cache, historical assets, destination combinations, source immutability, and private asset boundary. |
| Human checkpoints identified | pass | Explicit owner implementation authorization; later DEV deployment, Studio publish, and production separately gated. |
| Roadmap alignment | pass | Owner explicitly selected an independent Studio / Print Request operational goal; no WS6, Autonomous, Pass 2, or promotion attachment. |
| Documentation plan | pass | Architecture, backend, workflow, test, and decision updates are identified for the implementation phase. |
| No silent scope expansion | pass | No allocation mutations, new sizing/upscale policy, manual builder, Portal features, migration, or production work. |

---

## Formal Review Questions

| # | Question | Answer |
|---|---|---|
| 1 | Are Show Queue export/generation primitives reused rather than duplicated? | **Yes.** Reuse `resolveShowExportProductionAsset`, target-pixel sizing, ZIP/Sharp services, Standard planner/compositor, cache mechanism, existing native save actions, and progress/warnings. Only allocation gathering is replaced by request-item gathering. |
| 2 | Does request-level export resolve exactly the same production artwork as Show Queue? | **Yes.** Both routes call `resolveShowExportProductionAsset` → `resolvePrintAssetPaths`; request actions differ only in source item gathering and item dimensions/quantity. |
| 3 | Does `artworkEnhanceMode` remain consistent? | **Yes.** It is passed unchanged into the resolver and copied as reusable item intent; absent remains baseline. Missing enhanced derivatives/pixel metadata fail closed. |
| 4 | Are quantities/sizes identical to the source request? | **Yes.** Direct actions use the selected item's saved `quantity`, `printWidthInches`, and `printHeightInches`; no allocation quantity/snapshot/default size is read. |
| 5 | Can historical Printed requests export/regenerate safely? | **Yes,** if exact current request items and every active production asset resolve. They remain read-only; the implementation must preserve a read-only access route for archived/converted records now hidden/redirected by current detail UX. |
| 6 | Is current show allocation NOT required? | **Correct.** Neither direct operation queries or writes an allocation; Show Queue's allocation eligibility helper is not used for request operations. |
| 7 | Are show-level gang-sheet caches isolated from request-level generation? | **Yes.** The approved design uses a distinct local request cache namespace/key such as `print-request:<requestId>` plus request-content fingerprint; it makes no `upcomingShows` telemetry/cache write. |
| 8 | What gang-sheet mode(s) should a single-request Generate expose? | **Standard only.** The two grouped modes are for separating/mixing multiple customer/request groups. With a single request they consume space for redundant section/pricing headings without a meaningful grouping choice. |
| 9 | How is the request name represented in the generated sheet/artifact? | Add request-specific shared naming helpers so the safe export name and rendered sheet label visibly carry the normal immutable request name (`username-CR###` / `baseName-IR###`), not `whatnot_<date>`. |
| 10 | Does copying create a genuinely new request? | **Yes.** A server transaction creates a fresh request ID, normal CR/IR sequence/name, and fresh item IDs; its parent/item state begins clean Working/pending. |
| 11 | Are show allocations and lifecycle history excluded from copies? | **Yes.** The allowlist excludes allocations, queue/completion/printing statuses, timer state, cache/artifacts, audit timestamps/actors, closure/conversion/requeue/parking lineage, and snapshots. |
| 12 | Are customer duplicate-continuable guards preserved? | **Yes.** The existing picker filter remains UX guidance and the new staff callable rechecks the destination customer's continuable state before creation. |
| 13 | How does Internal → Customer copy choose the target customer? | It uses the existing Create Customer Request active/non-guest customer picker, username validation, and continuable exclusions. The caller receives the selected `customerId`; no customer is inferred from an Internal Request. |
| 14 | How does Customer → Customer copy behave when the customer already has a working continuable request? | It fails with the existing continuable-request block and creates nothing. Staff must queue/resolve the open request first; Copy does not create a second continuable request or bypass Portal editability rules. |
| 15 | How is Internal Request naming handled? | Use `requireValidInternalBaseName` and normal `baseName-IR###` sequencing. Prefill an Internal source's base name or a Customer source's username snapshot, falling back to `internal`; staff can edit before confirm. |
| 16 | Are catalog designs and customer uploads both supported? | **Yes** for catalog items and for upload destinations that retain the original customer's private-art access (same Customer or Internal). A foreign private upload is not silently shared to a different Customer; that case fails atomically. |
| 17 | Are missing historical assets handled truthfully? | **Yes.** Preflight fails a specific request operation with a clear source/derivative/size/Storage error. No thumbnail, preview, baseline fallback, or partial incorrect request set is substituted. |
| 18 | Are Portal/customer permissions unchanged? | **Yes.** No Portal UI or Rule expansion is in scope. The foreign-upload rejection is required specifically to retain this boundary. |
| 19 | Is any new Firestore schema required? | **No.** New copies use current request/item fields; cache remains local Electron filesystem data. |
| 20 | Is any Function required? | **Yes: one new staff-only Copy Request callable is recommended.** Export/generation require no Function. The callable gives atomic, server-revalidated cross-kind/cross-customer copy behavior. |
| 21 | Is any Rule/index change required? | **No expected change.** The callable uses Admin SDK; existing user-facing Rules and current query indexes remain sufficient. Re-evaluate only if implementation proves a narrow concrete need. |
| 22 | Is Electron IPC/main-process work required? | **Yes.** Existing IPC/main-process services are reused, with narrow neutral request-item/cache-scope adaptations required for request-specific payload/identity/cache handling. No new arbitrary-file or arbitrary-URL channel is approved. |
| 23 | Is Studio publish eventually required? | **Yes** to distribute a completed Studio build, but it is a separate post-test owner authorization—not part of this goal's current phase. |
| 24 | Are production changes separately gated? | **Yes.** Production remains untouched. Any future DEV Function deploy, Studio publish, PR promotion, and production action require their own documented owner approval. |

---

## Architecture Review

**Findings:**

- `buildShowExportAllocationAssets.ts` combines allocation gathering with otherwise reusable production resolution. Refactoring only the reusable lower layer into a request-item builder is appropriate; duplicating it would risk diverging enhanced/customer-upload behavior.
- Existing local gang-sheet cache is content-fingerprint based and local to Electron. A namespaced request cache key is compatible with ADR-FP-070 and protects the Show Queue scope without Firestore persistence.
- `duplicatePrintRequestForShowTransferCopy` is intentionally insufficient as the Copy Request engine: it preserves a different workflow's semantics, uses a parent transaction plus later batch, and omits enhancement fields. Conversion is also non-reusable because it closes/links the source.

**Required changes:**

- [x] None before implementation. The implementation review must verify that the extracted Show Queue adapter has unchanged allocation behavior and filenames.

---

## Security Review

**Findings:**

- `storage.rules` and `firestore.rules` limit private upload reads to the upload's original customer or staff. Retaining a foreign `customerUploadId` in a target Customer Request would either break that customer's UI or motivate an impermissible privacy expansion.
- The IPC validator already limits downloads to Firebase Storage HTTPS URLs. Request actions must use the same validation and not add renderer filesystem work.
- Copy's authoritative validation cannot rely on a stale picker result. The new staff callable must recheck active customer state, continuable status, source item validity, and private upload ownership before its transaction writes.

**Required changes:**

- [x] None before implementation. Cross-customer private-upload copying is a hard fail-closed rule within the approved scope, not a candidate for a silent partial copy.

**Human approval needed before production:**

- [x] Any DEV Function deployment and any later production promotion remain separate approvals.

---

## Data Model Review

**Findings:**

- Existing `PrintRequest` / `PrintRequestItem` types already distinguish lifecycle history from reusable print intent and model catalog vs customer-upload sources.
- New item writes must explicitly include `artworkEnhanceMode` and pre-enhance dimensions when present, while omitting status/audit/completion markers. This is essential because the existing Show-transfer copy does not include all of them.
- No persistent cache, schema migration, status value, Rules field, or allocation field is justified.

**Required changes:**

- [x] None before implementation.

---

## Backend Review

**Findings:**

- A single `copyStudioPrintRequest` callable is the narrow trusted boundary for atomic source/destination validation and normal sequence creation. It must share normal naming utilities but must not absorb unrelated Create or Conversion behavior.
- Direct export/generate stay entirely in staff Studio + Electron; no Function is needed for image export/composition.

**Required changes:**

- [x] None before implementation.

---

## Testing Review

**Findings:**

- The plan covers the material correctness boundaries: dual source type, active derivative, dimensions/quantity, cache isolation, lifecycle eligibility, all destination combinations, source immutability, and continuation/private-upload blocks.
- Manual DEV QA is essential for native save dialogs, actual PNG/ZIP output, generated labels, and UI action availability on both Customer and Internal request detail states.

**Required changes:**

- [x] None before implementation.

---

## Documentation Review

The plan correctly schedules architecture, backend, workflow, testing, and ADR updates after approved behavior is implemented. This formal-review-only pass adds no product documentation claims.

---

## Verdict Rationale

**Approved.** The plan resolves the owner requirements with existing, mechanically verified primitives and preserves core product invariants: no design production status, no allocation requirement/mutation, exact saved print intent, source-aware enhanced artwork, local-only gang-sheet artifacts, normal request sequences, one-continuable Customer Request protection, and unchanged Portal privacy.

The approved treatment of customer uploads is intentionally conservative and directly follows existing Rules: a foreign customer cannot inherit a private upload reference. Any desired cross-customer asset transfer/sharing workflow would be a separate security/product phase, not an exception to Copy Request.

## Next Step

Human checkpoint — await explicit owner authorization to implement the reviewed scope. No implementation, test execution, deployment, Studio publish, commit, push, or production action is authorized in the current goal.

---

## Formal Review Amendment — Global Gang Sheet Settings and Four-Tier Pricing (2026-09-08)

This section is an additive amendment to the approved review above. The original verdict and
its implementation boundaries remain historical truth. This amendment reviews the owner's
new pricing, request-output, and global-settings scope. It authorizes no implementation in
this turn.

### Investigation findings

| # | Required answer | Mechanically verified result |
|---|---|---|
| 1 | Exact current layout settings and paths | Six fields: `gangSheetWidthInches`, `gangSheetSideMarginInches`, `gangSheetTopBottomMarginInches`, `gangSheetGutterInches`, `gangSheetMaxLengthInches`, `gangSheetLabelFontSizePx`. Show Queue service/hook/modal: `apps/studio/src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts`, `useShowQueueSettings.ts`, `UpcomingShowsPage.tsx`; Internal service/hook/modal: `internalGangSheetSettingsService.ts`, `useInternalGangSheetSettings.ts`, `UpcomingShowsPage.tsx`. Electron request fields are `ExportGangSheetPngRequest` in `packages/shared/src/types/export/gangSheetExportIpc.types.ts`. No other editable rotation, nesting tolerance, padding, or layout parameter was found in the current settings contract. |
| 2 | Exact current pricing/weight paths | Five legacy fields in both settings services/documents: `gangSheetSectionPriceCutoffInches`, `gangSheetSmallTierPriceUsd`, `gangSheetSmallTierWeightOz`, `gangSheetLargeTierPriceUsd`, `gangSheetLargeTierWeightOz`. Shared defaults/validation: `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.ts` and `gangSheetSettingsFields.ts`. |
| 3 | Current persistence model | Direct Firestore client reads/merge writes via `runTracedWrite`: `settings/showQueue` and `settings/internalGangSheet`. Rules use separate owner/admin field allowlists. Values are persisted, not local-only. |
| 4 | Do Show Queue and Internal share data? | **No.** They share field names, validation, and compositor types, but `resolveActiveGangSheetSettingsSource.ts` selects two independent documents. `PrintRequestsPage.tsx` also selects one document by request kind. |
| 5 | Current defaults | Layout: 23", 0.25" side, 0.5" top/bottom, 0.5" gutter, 300" max, 120 px label. Legacy pricing: cutoff 5", small $1 / 0.40 oz, large $2 / 0.75 oz. |
| 6 | Current calculation and display | `gangSheetCustomerSectionSummary.ts` is two-tier and classifies large when either saved width or height exceeds the cutoff. Price/weight lines are rendered in grouped Show/Internal compositor section headings. Standard compositor output has no price/weight summary. |
| 7 | Current request Generate behavior | The approved request hook uses saved request assets/dimensions and isolated `print-request:<id>` cache, but sends no `sectionPricing` and remains Standard-only. It therefore needs amended price/weight summary inputs and display. |
| 8 | Current cache/fingerprint | `gangSheetCacheFingerprint.ts` includes physical layout, labels, request/show scope, item identity, dimensions, production path, and quantities. `sectionPricing` is included only for grouped modes; Standard request pricing is currently absent. |
| 9 | Settings UI location | Existing architecture is `/settings` → `SettingsPage.tsx`, owner/admin gated by `permissionService.canManageSettings`. The amended section should follow the current Settings-page tab/component conventions and reuse the existing trusted Firestore settings path. |

### Decision record for the amended architecture

#### One canonical source and backward compatibility

The review recommends reusing the existing `settings/showQueue` Gang Sheet fields as the
canonical persisted source, extending its typed contract and existing Rules allowlist for
the four new price/weight tiers. A normalized resolver may read legacy
`settings/internalGangSheet` only for a missing canonical value during non-destructive
reconciliation; it must never write a second active configuration. Once a global Settings
save supplies a canonical value, every surface reads that value. This is the smallest
backward-compatible evolution because it avoids a third document and a destructive backfill.

This is **not** a migration. If preserving a legacy value requires a Firestore backfill or
an ambiguity cannot be resolved by typed fallback, implementation must stop at
`[NEEDS OWNER AUTHORIZATION: GANG SHEET SETTINGS MIGRATION]`.

#### Global Settings section and modal cleanup

Add a `Gang Sheet Settings` section/tab under `/settings` with logical Layout, Pricing, and
Weight groups. It is owner/admin only under the existing settings permission contract and
must not be exposed to Portal customers. Remove the editable Gang Sheet Layout and
Pricing/Weight tabs from the Show Queue/Internal generation modal. A read-only summary and
link to `/settings` are acceptable. Show Queue General settings remain local to Show Queue.

#### Layout settings versus layout mode

The six physical fields are global configuration. `Standard`, `Grouped by Customer`, and
`Sheet per Customer` remain per-generation Show Queue layout modes. Direct Customer/Internal
Print Request Generate remains Standard-only. Consolidation must not force a single mode or
change grouping semantics.

#### Four-tier resolver and weight mapping

The shared pure contract is:

```text
resolveGangSheetPriceTier(printWidthInches)
  0 < width <= 4   -> pocket
  4 < width <= 11   -> standard_full_size
  11 < width <= 14  -> standard_oversized
  width > 14       -> extra_oversized

unitPrice = effectiveSettings[tier].price
unitWeight = effectiveSettings[tier].weight
linePrice = unitPrice * exact item quantity
lineWeight = unitWeight * exact item quantity
```

The resolver uses width only and rejects non-positive/non-finite values. Defaults are $1,
$2, $3, and $4. The mechanically proven legacy weight mapping is Pocket → existing small
weight (0.40 oz) and each non-Pocket tier → existing large weight (0.75 oz). There is no
distinct legacy Extra Oversized field, but the large-tier value is the current equivalent
for all legacy `> cutoff` output, so **Extra Oversized weight default resolved: YES** without
inventing a number. Implementation must expose four editable weight values even though the
initial Standard Full Size, Standard Oversized, and Extra Oversized defaults are equal.

#### Show Queue/Internal parity and request output

All three Show Queue modes and Internal Gang Sheets must resolve the same normalized global
settings. Grouped section totals must remain correct while changing from the old
width-or-height two-tier rule to the fixed width-only four-tier rule. Direct request
Generate uses the exact request items, saved print width, quantity, and the same resolver;
it must render a visible request-level price/weight summary in Standard output. No allocation
quantity, placement size, Show telemetry, or Portal pricing is involved.

#### Cache invalidation

The implementation must add normalized four-tier pricing/weight and tier-policy/version
inputs to the fingerprint for every output path whose pixels or rendered text depends on
them. All six physical settings, label settings, request/show scope, request name, active
production path, target pixels, and quantities remain fingerprint material. A changed price,
weight, fixed breakpoint policy, or layout value must generate a new fingerprint. Request
cache remains isolated from Show Queue; grouped modes remain isolated from Standard.

#### Permissions, Rules, and Functions

- Settings mutation stays owner/admin through the existing `canManageSettings` /
  `canManageShowQueueSettings` contract; no Portal permission expands.
- **Firestore Rules: expected YES** — the canonical `settings/showQueue` owner/admin allowlist
  must explicitly admit the new four-tier fields while preserving timestamp/updatedBy checks.
  Legacy `settings/internalGangSheet` remains readable for non-destructive fallback; its
  allowlist needs expansion only if implementation proves a compatibility write is necessary
  (not planned). This is a narrow allowlist change, not a broad staff write.
- **Functions/settings backend: expected NO new Function.** Existing direct client
  `getDoc`/merge `setDoc` plus Rules remain the settings path. The already approved
  `copyStudioPrintRequest` callable remains the only Functions change for this goal.
- **Electron: yes** — the existing compositor, IPC validation, and cache need narrow
  request-summary/fingerprint propagation; no arbitrary file/URL channel is added.

### Revised affected-file inventory

Expected implementation touch points (subject to the implementation agent's final diff):

- `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.ts` and tests;
- `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` and tests (new four-tier,
  width-only resolver);
- a shared normalized settings resolver/types under the existing shared/upcoming-shows
  settings architecture;
- `packages/shared/src/types/export/gangSheetExportIpc.types.ts`;
- `packages/shared/src/utils/gangSheetCacheFingerprint.ts` and tests;
- `apps/studio/src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts`,
  `internalGangSheetSettingsService.ts`, `gangSheetSettingsFields.ts`, hooks, and
  `resolveActiveGangSheetSettingsSource.ts`;
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` and
  Settings-link/read-only modal components/styles;
- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx` plus a new reusable
  Gang Sheet Settings section component/hook/service following existing Settings conventions;
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` and
  `useGeneratePrintRequestGangSheet.ts` for canonical settings and request summary;
- `apps/studio/electron/services/export/exportGangSheetPng.ts`, grouped compositors,
  `gangSheetCache.ts`, IPC validation/handlers, and associated tests;
- `firestore.rules` settings allowlists;
- focused shared/Studio/Electron tests and the amended workflow/permanent docs after approved
  implementation.

No Portal, checkout, allocation, sizing, DPI, upscale, Autonomous, Pass 2, index, or
production files are in the amended scope.

### Amended test and Owner DEV QA review

The amended Plan's tier, settings, layout-parity, propagation, UI, render, and cache matrix
is adequate. Owner QA must verify Settings values, widths 10.5/11.5/14.5, all four tiers,
Show Queue Standard/Grouped/Sheet-per-Customer, Internal Gang Sheet, Customer Request, and
Internal Request. It must change a price and a harmless layout value, regenerate, observe new
output/no stale cache, then restore the intended values. Existing request Export/Copy QA remains
required, with direct action buttons still hidden on Working and Editing requests while Add to
Show/Add to Internal remains available.

### Amended verdict and stop boundary

**Amended Formal Review: APPROVED FOR IMPLEMENTATION PLANNING; IMPLEMENTATION NOT AUTHORIZED.**

The architecture is bounded and mechanically grounded. The only existing Extra Oversized
weight equivalent is the legacy large-tier 0.75 oz value, which is reused rather than
invented; no owner decision is currently blocking. Firestore Rules allowlist work is expected,
but no new settings Function or migration is expected. The owner must still authorize the
amended implementation before any application code changes. This turn performed no amended
implementation, deployment, publish, commit, push, or production action.

Next checkpoint marker:

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PRINT REQUEST DIRECT EXPORT, GANGSHEET, COPY, AND GLOBAL GANG SHEET SETTINGS]`
