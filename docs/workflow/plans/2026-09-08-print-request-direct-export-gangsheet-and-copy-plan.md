# Plan: Print Request Direct Export, Gangsheet, and Copy

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Author | Managing / Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal | `print-request-direct-export-gangsheet-and-copy` |
| Related | `docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-review.md` |

---

## Goal

Give Studio staff request-scoped production utilities for a single Customer or Internal Print Request: export its printable artwork as a 300-DPI ZIP, generate and download its gang sheet, and create a genuinely new Customer or Internal request containing the reusable print intent. The work must reuse the Show Queue production resolver, Electron export/compositor pipeline, request naming/creation contracts, and lifecycle safeguards without creating show allocations, altering source requests, or broadening Portal access.

## Investigation Record

### Existing Show Queue production path

| Concern | Existing path / contract |
|---|---|
| Item gathering and historical allocation eligibility | `apps/studio/src/renderer/src/features/upcoming-shows/utils/buildShowExportAllocationAssets.ts`; `showExportEligibility.ts` |
| Source-aware production resolver | `packages/shared/src/utils/resolveShowExportProductionAsset.ts` → `printAssetResolution.ts` |
| Baseline/enhanced source selection | `resolvePrintAssetPaths` and `resolveActiveArtworkPixelDimensions`; enhanced derivative missing is fail-closed |
| Requested-size and 300-DPI target pixels | `resolveQueuedPrintInches` and `computeExportTargetPixelSize` in `packages/shared/src/utils/showExportFilename.ts` |
| ZIP request / filenames | `useExportShowZip.ts`, `showExportIpc.types.ts`, `showExportFilename.ts` |
| Gang-sheet request / planner | `useExportGangSheetPng.ts`; `gangSheetEfficiencyLayout.ts` (Standard); the grouped planners are `gangSheetGroupedLayout.ts` and `gangSheetContinuousCustomerGroupedLayout.ts` |
| Compositors | `apps/studio/electron/services/export/exportGangSheetPng.ts`, `composeGroupedGangSheetSheets.ts`, `composeContinuousCustomerGroupedGangSheetSheets.ts` |
| Electron IPC and validation | `apps/studio/electron/preload.ts`, `apps/studio/electron/ipc/export/exportIpcChannels.ts`, `exportIpcHandlers.ts`, `exportRequestValidation.ts` |
| Local cache / fingerprint | `apps/studio/electron/services/export/gangSheetCache.ts`; `packages/shared/src/utils/gangSheetCacheFingerprint.ts` |
| Existing Show Queue UI conventions | `UpcomingShowsPage.tsx`, `ExportShowConfirmModal.tsx`, `ExportGangSheetConfirmModal.tsx`, `GangSheetLayoutModeMenu.tsx` |

The Show Queue builder is allocation-specific only at its outer gathering layer. Its asset resolution, fixed-300-DPI target sizing, ZIP main-process work, planner/compositor, warnings, and cache mechanics are reusable once given request-scoped production assets.

### Existing Print Request creation and copy-relevant path

| Concern | Existing path / contract |
|---|---|
| Studio Create Customer / Internal Request UI | `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` |
| Studio names/sequences and create transactions | `printRequestService.ts`; `packages/shared/src/utils/printRequestNaming.ts` |
| Customer continuable create guard | `printRequestService.ts` (`assertCustomerHasNoContinuablePrintRequest`); current UI filters the customer picker with `listCustomerIdsWithContinuableCustomerRequests` |
| Portal canonical one-working guard | `functions/src/createPortalPrintRequest.ts`, `functions/src/lib/portalWorkingPrintRequest.ts`, `packages/shared/src/utils/portalPrintRequestEditability.ts`, ADR-FP-071 |
| Existing copy only for Show transfer | `printRequestService.ts` (`duplicatePrintRequestForShowTransferCopy`) |
| Single item duplication | `printRequestService.ts` (`duplicatePrintRequestItem`) |
| Customer-to-Internal conversion (not reusable as Copy) | `functions/src/convertCustomerPrintRequestToInternal.ts`; ADR-FP-141 |
| Item/source shape | `packages/shared/src/types/printRequest/printRequest.types.ts`; `printRequestItemSource.ts` |
| Rules / source isolation | `firestore.rules`; `storage.rules`; `docs/standards/SECURITY.md` |

The existing Show-transfer copy is useful evidence but is not safe to expose as this feature: it copies only to the original request kind, has a separate write batch after parent creation, does not retain `artworkEnhanceMode` / pre-enhance fields, and does not make the new cross-kind or private-upload policy explicit. Customer-to-Internal conversion is deliberately excluded: it archives the original, records conversion lineage, and may cancel allocations.

---

## Scope

### In Scope

- A shared request-scoped production-asset builder which reuses the current source-aware resolver and 300-DPI target sizing.
- Request-detail actions for eligible Customer and Internal Requests: **Export Images**, **Generate Gangsheet**, and **Copy Request**.
- Request-scoped ZIP export with the same ordinary and `x(Qty)` semantics as Show Queue.
- Request-scoped Standard gang-sheet generation and normal local preview/download/export behavior.
- A staff-only, transactional Copy Request callable and Studio UX for Customer → Customer, Customer → Internal, Internal → Internal, and supported Internal → Customer copies.
- Exact request-item source, quantity, requested dimensions, size/preset metadata, ordering/notes, and `artworkEnhanceMode` / pre-enhance intent preservation.
- Focused automated tests and owner DEV QA plan.
- Documentation updates for the finalized behavior and any ADR-worthy cache/copy boundary.

### Out of Scope

- Portal export, Portal copy, customer-facing request changes, or any Portal permission expansion.
- Show allocation creation, cancellation, reservation, transfer, or lifecycle change.
- Customer-to-Internal conversion behavior.
- Any new print sizing, DPI, upscaling, or production lifecycle policy.
- Persistent generated PNG artifacts, Firebase Storage/Firestore gang-sheet cache, manual canvas work, Autonomous, Pass 2, tag work, Studio publish, production promotion, deployment, commit, or push.

---

## Eligibility and Production Contracts

### Request-level action eligibility

An action is shown to active Studio staff whenever the loaded request has at least one item. It is not conditioned on Working, Queued, Printing, Printed, a current Show Allocation, or a current upcoming show. The execution preflight requires every selected item to have:

1. a valid catalog-design or customer-upload source identity;
2. a positive saved quantity and saved requested width and height;
3. a source-aware resolvable active production asset and valid pixel dimensions; and
4. a Firebase Storage download URL obtainable by Studio.

An item with a missing/deleted design/upload, absent requested dimensions, missing enhanced derivative, missing active dimensions, or unreadable Storage object fails the request action clearly before Electron runs. It must never substitute a thumbnail, preview, baseline variant for an enhanced request, catalog default size, allocation quantity, or unrelated artwork. Electron's existing post-preflight per-download warning behavior remains truthful and is surfaced in its existing result UI.

Printed requests are explicitly eligible. Archived/converted records are still valid source data for the callable and production resolver when their items/assets remain valid. Because the current list hides archived requests and auto-navigates a converted original to its successor, implementation must preserve a clearly labeled read-only historical access path before advertising these actions for an archived/converted original; no lifecycle state may be reopened to achieve access.

### Request-level Export Images contract

- Build assets from exactly `printRequestItems` belonging to the selected request, using each item's own `quantity`, `printWidthInches`, and `printHeightInches`.
- Reuse `resolveShowExportProductionAsset`, `computeExportTargetPixelSize`, the existing ZIP IPC, `downloadAndResizeExportImage`, `exportShowZip`, and native save dialog.
- Keep Show Queue's two export forms: standard emits one 300-DPI file per line item with quantity in its filename; **Export x(Qty)** emits one copy per requested unit. Both preserve the exact requested quantity without creating an allocation.
- Add request-specific shared filename builders instead of mislabeling `printRequestItem.id` as an allocation or using Show Queue's `whatnot_<date>` filename. The filename and ZIP name must be derived from the request's normal generated `name`, with a safe filename segment and an item identifier labelled as an item, not an allocation.
- The source request, items, allocations, counters, request status, and production history remain read-only during export.

### Request-level Generate Gangsheet contract

- Use the same request-scoped production assets, Standard efficiency nesting planner, `exportGangSheetPng.ts` compositor, 300-DPI image metadata, progress events, warnings, and native download/export interactions as Show Queue.
- **Recommendation: expose Standard only.** The other two modes exist to divide/mix *multiple* customer/request groups. For one request, `Grouped by Customer` and `Sheet per Customer` add a section/pricing band and consume sheet space but do not provide a distinct grouping decision; the latter also has no second customer set to separate. Standard avoids redundant outputs while retaining the established planner/compositor.
- The generated base filename and rendered heading must visibly use the exact request name (`username-CR###` or `baseName-IR###`) rather than a Whatnot date/name. A shared request-specific naming utility must generate safe filenames and pass the human-readable request name into the sheet label contract.
- **Recommendation: retain existing cache-first desktop behavior**, not a persistent artifact: a request uses a local cache scope prefixed from its request ID (for example `print-request:<id>`), while a Show remains in its show scope. The request scope and its fingerprint must include the base name, layout settings, item identity, active production path, target size, and quantity. No request cache can read, replace, clear, or be discovered as a Show Queue cache, and no Firebase schema is added.
- Generating must not call `recordGangSheetGenerated`, mutate `upcomingShows.gangSheetGenerated*`, or attach any artifact to a show.

### Copy Request contract

Copy creates a new independent request and new item IDs. It uses normal Customer CR / Internal IR sequence allocation and creation defaults; it does not clone a Firestore document.

Copy only:

- source type and source ID (`designId` or `customerUploadId`, never both);
- upload `titleSnapshot` where present;
- quantity, requested width and height, persisted size label / `standardSizePresetKey`, item sort order, and item notes;
- `artworkEnhanceMode`, `preEnhancePrintWidthInches`, and `preEnhancePrintHeightInches`;
- optionally request notes, subject to the destination creation form's explicit decision.

Copy never carries:

- request/item IDs, request name, sequence, parent/item timestamps, `createdBy`, `updatedBy`, `addedBy`, or item request-count markers;
- request/item lifecycle state, `printedAt`, `printedBy`, `completedAt`, production timer/status, or queue tab;
- show allocations, allocation IDs, show snapshots, requeue/move lineage, or generated gang-sheet caches/artifacts;
- conversion, closure, parking, requeue, bidding-acknowledgement, completion, or other historical audit fields.

The destination parent begins as a normal clean Working request and every destination item starts `pending`; copy leaves the source unmodified.

#### Destination semantics and private uploads

- **Customer → Customer:** default target is the source customer. If that customer has a current `draft` or `editing` Customer Request, Copy is blocked by the same continuable-customer guard used by Create; staff must resolve/queue that request first. No second continuable request is created.
- **Internal → Customer:** use the existing active, non-guest customer picker and the same absent-username / continuable-request exclusions as Create Customer Request. There is no inherited customer identity from an Internal Request.
- **Customer → Internal / Internal → Internal:** use the existing internal sequence and base-name validation. Prefill an Internal source's own `internalBaseName`; for a Customer source prefill `customerUsernameSnapshot`, falling back to `internal`. Staff may edit it in the normal base-name field before confirmation.
- **Private upload boundary:** an upload can be copied to an Internal destination or back to its owning Customer because staff retain production access and the owner retains Portal access. A request containing a customer upload cannot be copied to a *different* Customer by merely retaining the foreign `customerUploadId`: Firestore and Storage deliberately allow only the original customer to read that private artwork. The callable must fail atomically with a clear per-item message rather than omit the item, leak it, or broaden Rules. Catalog-only cross-customer copies remain supported. Creating a new customer-owned physical copy/share of an upload is out of scope and would require a separately approved consent, storage, and security design.

### Trusted business-logic recommendation

Introduce one staff-only callable for Copy Request rather than extending the renderer-only Show-transfer duplicate. It will use an Admin SDK transaction for source/destination revalidation, normal sequence allocation, customer eligibility/active-account check, cross-customer upload protection, source-item validation, new parent creation, and all new item writes. This is justified by the security-sensitive cross-kind destination decision and the need for all-or-nothing copies; it does not replace ordinary Studio request creation.

The callable will use the same shared naming/validation utilities as existing creation. It must recheck all eligibility immediately before writing; UI picker filtering is convenience only.

---

## Workstreams and Approach

### Workstream A — Shared request-scoped production item resolution / export reuse

1. Extract the source-aware asset-resolution portion of `buildShowExportAllocationAssets` into a request-item-capable builder; keep Show allocation gathering/filtering as its thin adapter.
2. The new builder loads one request's exact items plus required catalog designs/customer uploads, applies `resolveShowExportProductionAsset`, obtains Studio download URLs, verifies saved request dimensions, and computes 300-DPI target pixels.
3. Give every returned production asset a neutral stable item/source identity. Do not reuse an allocation ID for a request operation.
4. Add request-specific safe ZIP/image/gang-sheet naming helpers next to the existing Show filename utilities, preserving existing Show filenames unchanged.

### Workstream B — Request-level Export Images UI + execution

1. Add a request-detail Export Images action which remains available in read-only Printed/historical detail states when items are present.
2. Reuse/generalize the current export hook/modal wording so it accepts a neutral production subject (request name) and request assets, while Show Queue retains its current behavior and labels.
3. Reuse `EXPORT_SHOW_ZIP` and existing main-process resize/zip code; widen only neutral type/name assumptions needed for request-item IDs. Maintain Firebase Storage URL allowlisting at the IPC boundary.
4. Provide the current standard and `x(Qty)` choices, then display existing progress/result/warning behavior.

### Workstream C — Request-level Generate Gangsheet UI + execution

1. Add a single **Generate Gangsheet** request action (Standard only); do not show the Show Queue three-mode dropdown or mode picker.
2. Build one Standard `ExportGangSheetPngRequest` from request assets and current gang-sheet settings, with request-specific name/label.
3. Generalize local cache identifier terminology or add a request-specific wrapper so `print-request:<id>` is isolated from `showId` cache folders; preserve all current Show Queue cache compatibility and sibling layout behavior.
4. Reuse `GENERATE_GANG_SHEET_PNG`, `EXPORT_CACHED_GANG_SHEETS`, `DOWNLOAD_CACHED_GANG_SHEET`, main-process progress, and existing preview/download result UI after making it accept a request display label and a Standard-only option set.
5. Omit Show Queue telemetry and any `upcomingShows` writes for request generation.

### Workstream D — Copy Request trusted business logic

1. Add shared typed callable request/response contracts and a staff-only `copyStudioPrintRequest` Function export.
2. In one server transaction, load/revalidate the source, normalize a selected destination type/customer/base name, enforce source items and private-upload rules, allocate the destination CR/IR sequence, create the new parent and new `pending` items, and update only the normal existing sequence counter/customer totals.
3. Use an explicit allowlist builder for source items and destination parent fields. Never spread source documents.
4. Fail before writes for empty source requests, missing/invalid source identity or required dimensions, invalid/inactive target customer, target continuable-request conflict, cross-customer private upload, or an over-limit atomic write set. Do not query/create allocations.
5. Keep conversion callable and Show-transfer copy isolated; optionally refactor only small shared allowlist/name helpers after parity tests prove unchanged behavior.

### Workstream E — Copy Request Studio UX

1. Add **Copy Request** to the existing request action / overflow convention, independent of edit locks and with clear source/destination labels.
2. Reuse the current Create Request customer directory loader, active/non-guest customer filtering, continuable-request filtering, username validation messaging, Internal base-name input, and generated-name explanation.
3. Default Customer → Customer to the source customer. For any Customer destination, the picker is read-only default for same-customer copy or selectable for Internal → Customer; the callable remains authoritative.
4. Prefill the proposed Internal base name as described above. The confirmation explains that no show allocations or production history will be copied and directs staff to Add to Show / Add to Internal Gangsheet afterward.
5. On success, refresh the bounded request list/detail cache and navigate to the new Working request; do not alter the source selection or allocation state.

### Workstream F — Testing, QA, and deployment/publish inventory

1. Add pure/shared resolver, naming, cache-scope, and copy allowlist tests; extend current Show export regression tests so refactoring cannot change allocations, filenames, asset selection, or fingerprints.
2. Add Function unit/contract tests for every destination pair, continuation guard, source immutability, and customer-upload privacy boundary.
3. Add Studio contract/unit tests for action eligibility on Customer/Internal, Printed and historical detail, Standard-only gang mode, and correct Callable/IPC payloads.
4. Run focused shared, Studio, Functions build/typecheck/lint commands; document unrelated baseline failures honestly.
5. After implementation review, request owner DEV QA using both a Customer Request and an Internal Request. Functions deployment, Studio publish, and production promotion remain later separately authorized actions.

---

## Affected Areas

### Existing files likely to change

- `packages/shared/src/utils/resolveShowExportProductionAsset.ts`
- `packages/shared/src/utils/showExportFilename.ts`
- `packages/shared/src/types/export/showExportIpc.types.ts`
- `packages/shared/src/types/export/gangSheetExportIpc.types.ts`
- `packages/shared/src/utils/gangSheetCacheFingerprint.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/buildShowExportAllocationAssets.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useExportShowZip.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useExportGangSheetPng.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/components/ExportShowConfirmModal.tsx`
- `apps/studio/src/renderer/src/features/upcoming-shows/components/ExportGangSheetConfirmModal.tsx`
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts`
- `apps/studio/electron/preload.ts`
- `apps/studio/electron/ipc/export/exportIpcChannels.ts`
- `apps/studio/electron/ipc/export/exportIpcHandlers.ts`
- `apps/studio/electron/ipc/export/exportRequestValidation.ts`
- `apps/studio/electron/services/export/exportShowZip.ts`
- `apps/studio/electron/services/export/exportGangSheetPng.ts`
- `apps/studio/electron/services/export/gangSheetCache.ts`
- `functions/src/index.ts`
- `firestore.rules` only if the formal implementation review proves a callable contract needs a client-visible rule adjustment; no such change is expected.

### Planned new files (names proposed; no existing file is being claimed)

- `functions/src/copyStudioPrintRequest.ts`
- `functions/src/lib/copyStudioPrintRequestCore.ts`
- `functions/src/lib/copyStudioPrintRequestCore.test.ts`
- `packages/shared/src/types/printRequest/copyStudioPrintRequest.types.ts`
- Request-export/generation hooks, helpers, modal tests, and copy service under the existing `apps/studio/src/renderer/src/features/print-requests/` feature folder; final filenames must be selected during approved implementation to avoid duplicating an existing abstraction.

### Architecture impact

- [x] Details: request items → shared production-item builder → existing Electron ZIP or gang-sheet pipeline. Show Queue keeps allocation gathering as an adapter. Renderer never writes filesystem content; Electron main retains download/Sharp/ZIP/composition/native-dialog responsibilities.

### Security impact

- [x] Details: active staff-only actions; IPC continues to accept Firebase Storage HTTPS URLs only; no customer/Portal read broadening; cross-customer private uploads fail closed; copy callable revalidates caller role and all destination eligibility server-side.

### Data model impact

- [x] Details: no new persistent production artifact, cache document, request status, allocation, or Firestore schema is planned. New requests/items are normal existing documents with fresh IDs and normal sequence fields. The local Electron cache scope is filesystem-only.

### Backend impact

- [x] Details: one new staff-only Copy Request Function is recommended. Export and generation are renderer/Electron work and do not require a Function.

### UI / UX impact

- [x] Details: request-detail production actions and a small destination-oriented Copy dialog reuse the existing Studio action/modal patterns. Owner DEV QA is required after implementation because Electron output, generated imagery, and state/lifecycle visibility need manual confirmation.

### Migration impact

- [x] None. No backfill or destructive data operation. Existing request/item/source data remain compatible; old unresolved assets produce explicit errors.

---

## Acceptance Criteria

### Export

- [ ] Available on eligible Customer and Internal Requests, including Printed/historical requests with resolvable items.
- [ ] Requires no Show Allocation and exports only the selected request's items.
- [ ] Preserves request quantities, requested sizes, 300-DPI target output, catalog/upload source selection, and enhanced/baseline selection.
- [ ] Shows clear errors for a missing source asset; no fallback artwork or lifecycle/allocation mutation.
- [ ] Retains Show Queue export behavior as a regression-safe adapter.

### Generate

- [ ] Available on eligible Customer and Internal Requests without a Show Allocation.
- [ ] Uses existing Standard planner/compositor and 300-DPI production processing.
- [ ] Uses the request name in safe output filenames and visibly on the generated sheet.
- [ ] Preserves quantities, saved sizes, catalog/upload sources, and enhanced/baseline selection.
- [ ] Supports historical/Printed requests with resolvable items.
- [ ] Uses a request-only local cache scope/fingerprint and cannot mutate or reuse Show Queue cache/telemetry.
- [ ] Exposes Standard only, with no redundant Show Queue grouped-mode UI.

### Copy

- [ ] Customer and Internal sources can start a copy; Customer and Internal destinations are supported under their rules.
- [ ] New parent and item IDs, normal CR/IR names/sequences, clean Working/pending state, and source intent are created.
- [ ] Quantities, dimensions, label/preset metadata, source identity, and enhancement intent are preserved.
- [ ] No allocation, generated artifact, lifecycle, completion, closure, requeue, conversion, timer, historical audit, or source mutation is copied.
- [ ] The existing Customer continuable-request guard remains authoritative and blocks a duplicate Customer destination.
- [ ] Cross-customer private-upload copies fail atomically and do not change Portal/customer permissions.

### Safety

- [ ] Designs never receive production statuses.
- [ ] No Portal flow, Rules permission expansion, migration, deployment, publish, commit, or push occurs without separate authorization.

---

## Test Strategy

### Automated

| Check | Command / focus | Required |
|---|---|---|
| Shared resolver and naming | `npx tsx --test packages/shared/src/utils/resolveShowExportProductionAsset.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts` plus new request-scope/naming tests | yes |
| Shared item-source / quality regression | Focused `packages/shared/src/utils/printAssetResolution*.test.ts`, `printRequestItemSizing*.test.ts`, and request-production tests | yes |
| Studio export/generation | Focused `apps/studio/src/renderer/src/features/{upcoming-shows,print-requests}/**/*.test.ts` for request payload, eligibility, modal, and Show regression | yes |
| Electron IPC | Focused `apps/studio/electron/ipc/export/exportRequestValidation.test.ts` and new cache-scope/export tests | yes |
| Functions copy | `npx tsx --test functions/src/lib/copyStudioPrintRequestCore.test.ts` plus callable contract tests | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Studio typecheck | `npm run typecheck --workspace @fresh-prints/studio` (or the current documented Studio TypeScript command) | yes |
| Studio build | `npm run build:studio` when baseline permits; otherwise record the exact unrelated failure | yes |
| Lint / diff check | targeted lint and `git diff --check` | yes |
| Rules/index tests | Existing rule suite only if Rules change becomes necessary; no Rules/index change is expected | conditional |

Focused cases must cover:

- catalog and customer-upload assets, baseline/enhanced variants, missing enhanced derivative, and missing historical source;
- exact quantity and target dimensions for direct request export/generation;
- request-only asset set (no allocations required), request name output, Standard-only mode, and cache isolation/fingerprint changes;
- Customer → Customer, Customer → Internal, Internal → Internal, Internal → Customer catalog copies;
- same-customer and target-customer continuable guard, inactive/invalid customer rejection, fresh IDs/state/audit, allocation exclusion, source immutability;
- customer-upload copy to owner/Internal allowed and cross-customer customer-upload copy rejected atomically;
- historical/Printed request eligibility and Show Queue regressions.

### Manual Owner DEV QA (after implementation authorization only)

1. Create/select a Customer Request with catalog and upload-backed items, distinct sizes/quantities, and an enhanced item. From its request detail, export standard and x(Qty) ZIPs. **Expected:** only its artifacts appear at the saved dimensions/quantities; enhanced output matches Show Queue; no show allocation changes.
2. Generate its gang sheet. **Expected:** Standard-only UI, request name in filename/on-sheet label, correct sizes/quantity, local preview/download works, and Show Queue cache for a separate show remains intact.
3. Repeat export/generate from an Internal Request and from a Printed historical request with valid assets. **Expected:** identical request-scoped behavior without re-opening/re-queuing it.
4. Copy Customer → Customer with no open destination request. **Expected:** new CR name/ID and pending items; source untouched; no allocation copied.
5. Attempt Customer → Customer while the destination has a continuable request. **Expected:** clear block and no writes.
6. Copy Customer → Internal and Internal → Internal with editable base-name defaults. **Expected:** next normal IR sequence and no lifecycle/allocation history.
7. Copy Internal → Customer using a selected eligible customer. **Expected:** catalog-only copy succeeds; a foreign private customer-upload source is clearly rejected atomically and Portal access has not changed.

---

## Deployment / Publish Inventory

| Surface | Expected change | Later authorization needed |
|---|---|---|
| Studio renderer + Electron | Yes | Studio build/package/publish is separately owner-gated |
| Cloud Functions | Yes: `copyStudioPrintRequest` only | DEV deploy separately owner-gated; production separately gated |
| Firestore Rules | No expected | Only if formal implementation review identifies a real need |
| Storage Rules | No | N/A |
| Firestore indexes | No expected | N/A |
| Data migration/backfill | No | N/A |
| Production | No | Never part of this goal without a separate checkpoint |

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Direct request path drifts from Show Queue asset selection | High | Extract/reuse the current shared resolver; parity tests for catalog/upload/baseline/enhanced/missing assets. |
| Request action accidentally derives from allocations | High | Build from request items only; tests assert no allocation query or mutation is required. |
| Cross-customer copy leaks private upload artwork | Critical | Server-side destination/asset-owner check; atomic rejection; no Portal/Rules broadening. |
| Duplicate continuable Customer Request | High | Reuse existing UI filter and authoritative transaction/callable recheck; test concurrent/stale selection outcome. |
| Request cache pollutes Show Queue cache | High | Explicit prefix namespace + fingerprint coverage; no show telemetry writes. |
| Historical asset cannot resolve | Medium | Fail preflight truthfully per item; never substitute previews/defaults. |
| Broad Electron export rewrite | Medium | Reuse existing IPC/main services; make only neutral identity/cache-scope generalizations. |
| Large copy exceeds transaction bounds | Medium | Validate bounded source item count before writes; fail safely and document the limit if one is required. |

## Rollback Plan

Revert the Studio renderer/Electron and Function changes together. No migration, Rules change, generated Firebase artifact, or source-request mutation requires data rollback. Local request cache folders are disposable and can be cleared independently without changing Firestore or Show Queue caches.

## Documentation Updates Required

- [x] `docs/architecture/ARCHITECTURE.md` — request-scoped production exports/caches after implementation.
- [x] `docs/architecture/DATA_MODEL.md` — copy semantics (no new schema) and source-private boundary if behavior changes.
- [x] `docs/architecture/BACKEND.md` — new staff copy callable.
- [x] `docs/WORKFLOWS.md` — request-detail export/generate/copy workflow.
- [x] `docs/standards/TESTING.md` — focused test command(s) if they are durable.
- [x] `docs/project/DECISIONS.md` — request generation/cache and copy-boundary ADR if review/owner approves the behavior.

## Open Questions

- [ ] No unresolved architecture decision prevents planning. The explicit security outcome is that foreign private uploads cannot be copied to another Portal customer without a separately approved sharing/copy design.
- [ ] Owner must explicitly authorize implementation after Formal Review; this managed-goal request permits investigation, plan, and review only.

## Approval

- Review doc: `docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-review.md`
- Verdict: pending

---

## Owner Amendment — Global Gang Sheet Settings and Four-Tier Pricing (2026-09-08)

This is an additive amendment to the approved request Export/Generate/Copy plan. The
historical plan and its original approval record above remain unchanged as historical
truth. This amendment is the current planning scope for any subsequent implementation;
it does not authorize implementation, deployment, publish, commit, push, or production
activity in this turn.

### Amendment status and investigation boundary

- Original request Export Images, Standard Generate Gangsheet, and Copy Request work was
  already implemented locally in the earlier approved scope and is retained.
- The new four-tier pricing, global settings consolidation, request pricing display, and
  local-editor retirement are **not implemented by this amendment**.
- This turn is limited to repository investigation, plan amendment, formal-review amendment,
  and workflow checkpoint updates.

### Mechanically verified current implementation

| Concern | Current implementation and persistence |
|---|---|
| Show Queue layout settings | `apps/studio/src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts`, `useShowQueueSettings.ts`, and the `UpcomingShowsPage.tsx` Settings modal. Fields are `gangSheetWidthInches`, `gangSheetSideMarginInches`, `gangSheetTopBottomMarginInches`, `gangSheetGutterInches`, `gangSheetMaxLengthInches`, and `gangSheetLabelFontSizePx`. Persisted in Firestore `settings/showQueue`. |
| Internal Gang Sheet layout settings | `internalGangSheetSettingsService.ts`, `useInternalGangSheetSettings.ts`, and the same `UpcomingShowsPage.tsx` modal opened for the `staff_gang_sheets` surface. The same six fields are persisted in Firestore `settings/internalGangSheet`. |
| Current price/weight settings | Both documents also carry `gangSheetSectionPriceCutoffInches`, `gangSheetSmallTierPriceUsd`, `gangSheetSmallTierWeightOz`, `gangSheetLargeTierPriceUsd`, and `gangSheetLargeTierWeightOz`. They are independently editable today. |
| Defaults | `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.ts`: cutoff 5 inches, small $1 / 0.40 oz, large $2 / 0.75 oz. Layout defaults in `showQueueSettingsService.ts`: width 23, side margin 0.25, top/bottom margin 0.5, gutter 0.5, max length 300, label font 120 px. |
| Resolver selection | `resolveActiveGangSheetSettingsSource.ts` selects the Show Queue document for Whatnot shows and the Internal document for Staff Gang Sheets. `PrintRequestsPage.tsx` currently selects the same two documents by request kind. They are not a shared persisted source. |
| Calculation/rendering | `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` performs the existing two-tier calculation. `isLargeTier` uses either print width or print height above the configurable cutoff. `composeGroupedGangSheetSheets.ts` and `composeContinuousCustomerGroupedGangSheetSheets.ts` render the price/weight summary. Standard `exportGangSheetPng.ts` does not currently render a price/weight summary. |
| Request Generate gap | `useGeneratePrintRequestGangSheet.ts` sends Standard output with request cache scope and saved dimensions, but currently does not send `sectionPricing`; therefore request Standard output has no global price/weight display. |
| Cache | `packages/shared/src/utils/gangSheetCacheFingerprint.ts` fingerprints all current physical layout inputs and `cacheScope`; `sectionPricing` is included only for grouped modes. Request scope is `print-request:<requestId>` and remains separate from Show Queue scope. Standard request pricing must be added to the material fingerprint when rendered. |
| Settings UI convention | `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx` is the existing `/settings` owner/admin surface. `permissionService.canManageSettings` is owner/admin; current gang-sheet modal writes use `canManageShowQueueSettings` (also owner/admin). |
| Rules/backend | `firestore.rules` has separate owner/admin allowlists for `settings/showQueue` and `settings/internalGangSheet`. Existing settings use direct client Firestore `getDoc`/`setDoc` with `runTracedWrite`; no Gang Sheet settings Function exists. New four-tier fields will require an allowlist update; no new callable is required for settings. |

### Amended product contract

#### Four continuous width tiers

The shared pure resolver must classify the saved **print width** only:

| Tier | Width | Default unit price | Default weight mapping |
|---|---:|---:|---|
| Pocket | `0 < width <= 4.0` | $1 | Legacy small-tier default, 0.40 oz |
| Standard Full Size | `4.0 < width <= 11.0` | $2 | Legacy large-tier default, 0.75 oz |
| Standard Oversized | `11.0 < width <= 14.0` | $3 | Legacy large-tier default, 0.75 oz |
| Extra Oversized | `width > 14.0` | $4 | Legacy large-tier default, 0.75 oz |

The legacy configuration has no distinct Extra Oversized weight. Reusing the existing
large-tier value for every non-Pocket tier is a direct compatibility mapping, not a new
invented value; the global Settings UI must nevertheless expose four independently
editable weight values after the new contract is implemented. The Formal Review records
this as **Extra Oversized weight default resolved: YES (legacy large-tier equivalent;
0.75 oz)**. If implementation discovers that the legacy large-tier value is not accepted
as the applicable equivalent, stop and raise `[NEEDS OWNER DECISION: EXTRA OVERSIZED
WEIGHT DEFAULT]` before coding further.

Price is `settings[tier].price * exact item quantity`; mixed request/show totals sum line
totals. Widths 4.0, 4.5, 10.5, 11.0, 11.5, 12.0, 14.0, 14.5, and 15.0 must classify
deterministically as specified by the owner. Height, area, source dimensions, rendered
pixel size, placement, and allocation quantity are never classification inputs.

The old configurable cutoff and two-tier classifier are retired from the effective
contract. Breakpoints 4/11/14 are fixed product policy in this amendment; prices and
weights remain editable global settings. The layout mode enum is not changed.

#### One global settings source

The implementation must expose one **Gang Sheet Settings** section in Studio Settings
(`/settings`) covering all mechanically proven gang-sheet configuration:

- the six current physical/layout fields listed above;
- four fixed width tiers with editable price and weight values; and
- any additional renderer/planner input discovered during implementation that is already
  an editable persisted setting (no new speculative rotation, nesting, or tolerance
  controls).

The recommended persistence evolution is to make the existing `settings/showQueue` Gang
Sheet fields the canonical source, extend that typed contract for four tiers, and use a
non-destructive read fallback from legacy `settings/internalGangSheet` only when a
canonical value is absent. After a global save, all four generation surfaces read the
canonical effective settings. Do not write new independent Show, Internal, or request
pricing documents. This preserves existing values without a destructive migration and
avoids adding a third settings document. If implementation proves that this fallback
cannot preserve values safely, stop for `[NEEDS OWNER AUTHORIZATION: GANG SHEET SETTINGS
MIGRATION]` rather than backfilling automatically.

All of the following consume one normalized typed resolver output:

1. Show Queue Standard;
2. Show Queue Grouped by Customer;
3. Show Queue Sheet per Customer;
4. Internal Gang Sheets;
5. Customer Print Request direct Generate; and
6. Internal Print Request direct Generate.

Show Queue mode selection remains per-generation (`Standard`, `Grouped by Customer`, and
`Sheet per Customer`); the global configuration is not a mode switch. Direct Print Request
Generate remains Standard-only, request-scoped, and free of Show telemetry mutations.

#### Local editor disposition

Retire the editable Gang Sheet layout/pricing/weight controls from the Show Queue and
Internal generation modals in `UpcomingShowsPage.tsx`. Keep unrelated Show Queue General
settings in that page. The local generation surfaces may show a read-only “Configured in
Studio Settings” summary and a link/deep-link to `/settings` (or the existing Settings
route convention), but they must not write independent copies. Internal and Show generation
continue using the same effective settings resolver.

#### Request output and pricing display

Request direct Generate uses request items, saved print width, exact quantity, and the
global layout/pricing/weight resolver. It must visibly include the request-level price and
weight calculation using the existing gang-sheet visual language. Grouped Show/Internal
compositors retain their existing section summary style; the Standard compositor needs a
request-compatible summary treatment (for example a second summary line in its existing
label band) without changing the approved Standard layout mode. The summary must not use
Show Allocation quantity or placement dimensions.

### Amended workstreams

The implementation work is now ordered as follows; the original workstreams remain above
as historical context and are expanded by these requirements.

**A — Shared request-scoped production asset resolution.** Preserve the already approved
source-aware resolver, saved dimensions, quantity, and 300-DPI contract.

**B — Global Gang Sheet Settings architecture and persistence.** Define one typed normalized
contract for six layout inputs plus four price/weight tiers, deterministic defaults, legacy
fallback/reconciliation, owner/admin permission, Firestore field allowlists, and a resolver
version used by fingerprints. Fixed breakpoints are policy constants.

**C — Global Gang Sheet Settings Studio UI.** Add a Settings-page section following existing
Settings components, loading/saving through the trusted existing settings path. Expose layout,
pricing, and four weight rows; make invalid/partial values follow the existing validation and
defaulting contract.

**D — Show Queue/Internal reconciliation and modal cleanup.** Route all modes through the
global resolver, preserve current layout defaults and mode semantics, remove duplicate local
editors, preserve legacy values via safe fallback, and verify grouped totals.

**E — Request-level Export Images.** Preserve the already approved request-only ZIP and
quantity behavior.

**F — Request-level Generate Gangsheet.** Pass normalized global settings and tier summary
inputs into the Standard request compositor, render request price/weight, and preserve
request cache isolation and no-telemetry behavior.

**G — Copy Request trusted backend.** Preserve the already approved transactional callable,
source immutability, sequence, and private-upload rules.

**H — Copy Request Studio UX.** Preserve the already approved destination and lifecycle UX.

**I — Testing, QA, cache validation, and deployment inventory.** Add the amended matrix below;
  Rules allowlist changes are deployment-scoped, while Functions remain `copyStudioPrintRequest`
  only.

### Cache/fingerprint amendment

`buildGangSheetCacheFingerprint` must include every material normalized global setting:
physical layout values, label settings, fixed tier-policy/version, all four prices and
weights when they affect rendered text/placement, request/show cache scope, request name,
active production paths, target sizes, and quantities. Standard request output currently
omits `sectionPricing`; this must be corrected before implementation is considered complete.
Changing any rendered price, weight, breakpoint policy, or layout value must not reuse stale
PNG output. Request cache folders remain namespace-isolated from Show Queue and grouped mode
fingerprints remain mode-isolated.

### Amended automated test matrix

- Tier classifier: positive widths through 4, 4.5, 10.5, 11, 11.5, 12, 14, 14.5, and 15;
  zero, negative, NaN, and non-finite values fail appropriately.
- Calculation: default $1/$2/$3/$4 unit prices, exact quantity multiplication, mixed-tier
  totals, four weight resolutions, and formatted price/weight lines.
- Settings: defaults, complete and partial persisted overrides, invalid values, legacy
  two-document fallback, owner/admin write path, canonical refresh, and identical effective
  config across every consumer.
- Layout parity: Show Standard, Grouped by Customer, Sheet per Customer, Internal Gang Sheet,
  Customer Request Standard, and Internal Request Standard retain current defaults and receive
  changed global layout values.
- UI: Settings section load/save, four pricing/weight rows, layout fields, local modal removal
  or read-only summary, and no independent local mutation path.
- Render/cache: grouped totals remain correct; Standard request price/weight is visible;
  each material price/weight/layout change changes the fingerprint; request/Show and grouped
  modes stay isolated; stale prior pricing cannot be served.
- Existing approved Export/Copy tests: retain all source, quantity, historical, private-upload,
  callable, action-gate, IPC, and no-allocation coverage.

### Amended Owner DEV QA

After implementation and the separate DEV deployment checkpoint is authorized:

1. Open Studio Settings → Gang Sheet Settings. Verify six current layout controls and four
   price rows: Pocket $1, Standard Full Size $2, Standard Oversized $3, Extra Oversized $4.
2. Verify the four weight values use the resolved legacy-compatible defaults (Pocket 0.40 oz;
   other tiers 0.75 oz) unless the owner changes them.
3. Test widths 10.5", 11.5", and 14.5" plus at least one item in every tier.
4. Generate from Show Queue Standard, Grouped by Customer, Sheet per Customer, Internal Gang
   Sheet, Customer Print Request, and Internal Print Request. Confirm one current settings
   source drives all outputs and request Standard visibly shows its calculated total.
5. Change one price and one harmless layout value in Settings; regenerate every applicable
   surface; confirm the new values render and stale cache is not reused. Restore intended
   production values after QA.
6. Confirm local Show Queue/Internal generation modals no longer offer editable duplicate
   controls and that their Settings link/read-only summary works.

### Amended deployment inventory and checkpoint

| Surface | Expected amended change | Authorization |
|---|---|---|
| Studio renderer/settings UI and existing gang-sheet/request hooks | Yes | Owner authorization required before implementation; Studio publish separately gated |
| Electron compositor/cache/IPC | Yes | Owner authorization required before implementation |
| Cloud Functions | Existing `copyStudioPrintRequest` only; no new settings Function | DEV deploy separately gated |
| Firestore Rules | **Expected yes**: extend the existing owner/admin `settings/showQueue` allowlist for the canonical four-tier fields. Keep legacy `settings/internalGangSheet` read/fallback access; extend its allowlist only if implementation proves a compatibility write is necessary (not planned). | Rules deploy separately gated; no production Rules action now |
| Firestore indexes | No expected change | N/A unless implementation proves otherwise |
| Data migration/backfill | No planned migration; legacy read fallback only | Stop for owner authorization if a real backfill is required |
| Portal/customer checkout/production | No | Out of scope and untouched |

### Revised owner checkpoint

The amended Plan is ready for the Formal Review amendment. No amended implementation has
been performed in this turn. If the amended Formal Review remains approved, the next marker is:

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PRINT REQUEST DIRECT EXPORT, GANGSHEET, COPY, AND GLOBAL GANG SHEET SETTINGS]`
