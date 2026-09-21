# Managed Phase Plan: Studio / Portal Print Request, Inbox, and AI Queue Batch

- **Goal:** `studio-portal-print-request-inbox-ai-queue-batch`
- **Status:** Amended after formal review feedback; awaiting re-review; planning only
- **Date:** 2026-09-20
- **Owner checkpoint:** Required before implementation
- **Implementation authorization:** Not granted by this plan

The first formal review was a deliberate blocking review. This amendment incorporates its required path corrections, privacy boundary, pagination algorithm, pricing contract, lifecycle matrix, accessibility coverage, and cache/selection safeguards. The plan remains subject to the owner checkpoint below.

## Goal

Plan a bounded implementation phase for five related Fresh Prints improvements without changing application code in this phase:

1. Keep Print Request and customer names inside gang-sheet width.
2. Add pagination or incremental loading to long Staff Inbox lists.
3. Improve the Portal Admin Print Requests surface with search, dollar totals, and customer grouping.
4. Generate a partial gang sheet from selected items in one Print Request while preserving saved quantities and without mutating request lifecycle data.
5. Correct the AI enqueue eligibility mismatch and allow AI Processing to advance past the apparent 100-item UI page ceiling.

The implementation phase must remain within the file surface and acceptance criteria below. Any request to build a new all-requests Portal manager, introduce a durable AI worker, change pricing policy, or edit Firestore data is out of scope and requires a new plan or explicit plan amendment.

## Background and current findings

The repository uses the FreshForge workflow and the required architecture boundaries: React component → hook → service → Firebase/callable, and React component → hook → Electron API → IPC → main-process service for Studio export work.

The current code has five bounded gaps:

- Gang-sheet label SVG builders emit raw, centered `<text>` without measuring, wrapping, truncation, or a width constraint. Standard Print Request export uses the request name; grouped show exports use Print Request headings. Label-band height and artwork offsets are computed separately in export and preview/layout helpers, so an adaptive label must be shared to preserve parity.
- Staff Inbox source subscriptions use hard limits (currently 200 Print Requests, 400 allocations, 100 upcoming shows, and 100 open design reports) with no cursor, `startAfter`, `hasMore`, or Load More path. Derived alerts can also split across raw allocation pages, and current ordering lacks a stable ID tie-breaker.
- Portal Admin currently exposes the selected-show `/admin/show-queue` dashboard through the role-gated callable `getPortalAdminUpcomingShowQueueDashboard`. It groups cards by Print Request but has no search, customer grouping, or totals. It exposes only a display customer label, which is not a safe grouping key. Pricing data is already snapshot-based on show allocations but the request-total and show-total meanings must remain separate.
- Direct Print Request gang-sheet generation receives the entire live item list. Asset resolution already accepts subsets and preserves saved item quantity/dimensions, but there is no export-only selection contract. Existing request selection mode mutates request contents and supports only catalog items, so it must not be reused.
- The AI callable intentionally accepts persisted designs in `imported` status. Staff Artwork re-send can return an already linked non-imported design, after which the renderer unconditionally calls the plain enqueue path and receives the eligibility error. Separately, AI Processing auto-queue iterates only the currently loaded design page and does not request another cursor page, so the apparent 100-item ceiling is a renderer pagination problem, not backend queue exhaustion.

The working tree already contains unrelated user changes. This phase must preserve them and must not reset, reformat, or fold them into this batch.

## Scope and acceptance criteria

### A. Adaptive gang-sheet names

In scope:

- Add one shared, pure adaptive text-layout contract around `packages/shared/src/utils/gangSheetLabelRendering.ts`.
- Compute against the actual usable artwork width: sheet width minus the two side margins used by the export/layout path.
- Apply the required order: use the current/default label size, shrink until the existing validated 20 px minimum, then wrap into additional lines when needed. Do not add a second font-size setting.
- Return enough layout information for both SVG rendering and band-height/artwork-offset calculation: resolved font size, line array, line height/band height, and any needed line spacing.
- Measure with the same font-family/weight assumptions used by the SVG output; break long unbroken tokens deterministically when a token itself exceeds usable width. Keep the label text content unchanged apart from whitespace/line splitting.
- Apply the same contract to direct Print Request export and grouped-by-customer/composed show sections. Keep the standard Show Queue path, which has no Print Request/customer heading, regression-safe.
- Keep preview/layout helpers and exported PNG output in parity. Do not add a second compositor.
- Include label text and resolved layout inputs in the existing export/cache fingerprint wherever the current fingerprint captures layout-affecting settings, so a changed wrapped label cannot reuse a stale raster.
- Add a layout-algorithm/font version to `packages/shared/src/utils/gangSheetCacheFingerprint.ts` so old rasters cannot survive a change to adaptive measurement or line geometry.

Acceptance criteria:

- Long Print Request names and grouped Print Request/customer headings do not render beyond the usable gang-sheet width.
- The layout is deterministic, readable at the configured minimum, and increases the label band rather than overlapping artwork when wrapping.
- Existing short-label output and the standard no-Print-Request-name Show Queue mode remain equivalent except for intentional shared-layout metadata.

Out of scope: the separate persisted Manual Gang Sheet Builder workflow.

### B. Staff Inbox pagination / incremental loading

In scope:

- Bounded decision: paginate the Open Inbox sources in this phase; keep Done acknowledgement records unbounded because they are already a canonical per-user collection, and paginate only the existing resolved design-report history if the current Done view is required to remain reachable beyond its history cap. Do not turn acknowledgements into a paged derived source.
- Replace hard-limit-only source loading in `staffInboxSubscriptionService.ts` with a feature-local page/cursor abstraction for the actual derived Open sources: Portal allocations, upcoming shows, and open design reports. Print Request documents remain enrichment data and are loaded by the existing bounded source contract only when required by derivation.
- Use these authoritative cursor tuples: allocations `updatedAt desc, __name__ desc`; upcoming shows `updatedAt desc, __name__ desc`; open design reports `createdAt desc, __name__ desc`; resolved reports `resolvedAt desc, __name__ desc`. The tuple is also the query page boundary; derived alert `occurredAt` ordering remains a presentation concern.
- Fetch `limit(pageSize + 1)`, retain the last consumed document snapshot as that source's cursor, and accumulate raw documents in maps keyed by source document ID. A live update to a record already in the map merges by ID; it does not reset an in-progress older cursor. A newly observed document newer than the current page is merged into the map and marked as a live insert. If Firestore changes the query's filter/order inputs or the provider restarts, increment a pagination generation, clear source maps/cursors, and restart once; do not reset on every ordinary document update.
- Deduplicate by source ID before derivation. A live listener's `removed` change deletes a document from its source map when it no longer matches the source filter; a paged read reconciles the consumed page's IDs and schedules a generation refresh when a record moves out of the query, so canceled/resolved/deleted records do not remain as stale alerts. Derive alerts from all accumulated raw source maps, then sort with the existing occurred-at priority plus a stable alert ID tie-breaker. A source reports `hasMore` only when its page returned the extra sentinel; the provider exposes aggregate `hasMore` and per-source loading state.
- When an older allocation page references a Print Request outside the existing request-enrichment cap, hydrate those referenced request IDs directly or in bounded `in` chunks and merge them by ID. Do not rely on the capped request page for context; test that an older queued alert still has its request name/customer context.
- Preserve current alert derivation and acknowledgement behavior. Add a stable alert-ID tie-breaker to visible ordering so page boundaries cannot reorder equal timestamps.
- Add a clear, labeled Load More/incremental-loading affordance to the Staff Inbox Open view. If resolved-report history remains paged in Done, give it its own accessible Load More control. Expose `hasMore` so capped Open counts are labeled as loaded counts rather than exact totals.

Acceptance criteria:

- A Staff Inbox user can reach records beyond every current source cap.
- Repeated loads do not duplicate alerts; loading newer records does not cause the next older page to be skipped.
- Acknowledgement, restore, suppression, show-full, queued, and design-report behavior remains unchanged.
- Existing loaded-count badge semantics are either documented in the UI or replaced with an explicitly verified exact-count implementation; this plan does not assume a costly count query.

### C. Portal Admin Print Request search, totals, and customer grouping

Proposed bounded scope: extend the existing selected-show `/admin/show-queue` dashboard. A new all-shows/all-requests manager is not included without owner confirmation because it changes callable shape, loading scope, and product surface.

In scope:

- Extend the dashboard DTO and callable builder with a response-scoped, non-reversible customer grouping token, searchable request identity fields allowed by the existing customer-safe contract, and two separate totals:
  - Print Request total across the request items represented by the request.
  - Selected-show allocation total across active, non-canceled allocations for that show.
- Do not return raw `customerId`, email, username, or any stable cross-response customer identifier. The callable assigns `customerGroupKey` values only within the current response (for example, `group-1`), using the internal customer identity solely to assign equal keys inside that response. Requests without a customer ID receive a unique per-request key and never merge with another unknown customer. Search exposes only the existing display-safe `customerIdentityLabel`, request ID, and request name; `notes` is not currently part of the customer-safe Portal DTO and is intentionally excluded unless a separate security/data-model approval adds an allowlisted display-safe field.
- Load `printRequestItems` server-side for the selected request IDs using the existing `where("printRequestId", "in", chunk)` pattern in chunks within Firestore's `in` limit. Compute the request total from each saved item width/height and saved quantity with `calculateGangSheetCustomerSectionSummary` and the canonical pricing settings; preserve existing `designQty`, `printQty`, and `prQty` metrics unchanged. Round to two decimal USD cents using the shared pricing utility. If any included item has invalid/missing dimensions, return `requestTotalPriceUsd: null` with an explicit unpriceable state rather than a partial total.
- Compute the selected-show total from active, non-canceled allocations only. Use `pricingSnapshot.unitPriceUsd * allocatedQuantity` when a valid snapshot exists; otherwise use saved item dimensions plus the current canonical pricing settings as the legacy fallback. Return `showAllocationTotalPriceUsd: null` for an active allocation set that cannot be priced. Do not include canceled allocations, and do not silently treat an unpriceable row as zero.
- Reuse the canonical snapshot-first pricing policy and extract shared calculation logic where necessary rather than duplicating Studio formulas in Portal. Keep the callable bounded to the selected show's request IDs and the existing show/customer reads; no all-requests scan or unbounded per-request reads.
- Add client-side search over the already-loaded selected-show DTO using request ID, request name, and the existing display-safe customer identity label. Clearing search restores the full list; do not search raw notes or customer identifiers.
- Add deterministic customer-grouped rendering while preserving independent request cards/details within each customer group. A customer search should expand to the complete matching customer group.
- Keep the existing Portal Admin role gate and customer-safe data boundary. Do not add substring Firestore queries.

Acceptance criteria:

- Admin can search by supported request/customer fields and clear the search.
- Admin can see separate, correctly labeled request and selected-show totals; canceled allocations are excluded and immutable pricing snapshots take precedence.
- Same-customer requests group deterministically without merging two customers who merely share a display name.
- Existing selected-show allocation/design details continue to work.

### D. Partial gang sheet from selected Print Request items

In scope:

- Add export-only local selection to `GeneratePrintRequestGangSheetModal`, keyed by `PrintRequestItem.id`, defaulting to all loaded items.
- Support catalog designs, customer uploads, and Staff Artwork in the same selection. Pass the selected subset into the existing `useGeneratePrintRequestGangSheet`/`buildPrintRequestExportAssets` path.
- Treat selection as whole Print Request items; keep saved dimensions and production-asset resolution unchanged.
- Show per-item preview thumbnails in the modal so staff can identify designs while selecting.
- Allow **export-only quantity overrides** per selected item (default = saved request quantity). Overrides apply only to the Generate snapshot and must never write Firestore or mutate request item quantities, allocations, lifecycle status, or generated-record state.
- Keep a single selection surface (no separate “full vs selected” tabs): full-request generation is “all selected at saved qtys”; reprints are deselect + lower export qty.
- Make the selection + export-qty snapshot explicit at Generate time, handle empty selection / invalid qty safely.

Acceptance criteria:

- A user can generate a gang sheet containing only selected items from one Print Request.
- Selected items show identifiable artwork previews.
- Export quantity can be set independently of the saved request quantity without mutating the Print Request.
- Saved dimensions remain unchanged (no width/height editors in this modal).
- Mixed source types resolve through the existing source-aware chain.
- Generating a partial sheet makes no Firestore write and no request lifecycle mutation.

Out of scope: persisting quantity edits to the Print Request, partial selection across multiple Print Requests, width/height editors in this modal, and the Manual Gang Sheet Builder.

**Owner QA amendment (2026-09-21):** export-only qty + thumbnails in one view (replaces prior “no quantity edit” out-of-scope line).

### E. AI enqueue eligibility and apparent 100-item ceiling

In scope:

- Preserve the backend imported-only enqueue guard. Fix the Staff Artwork existing-link/re-send handoff so the renderer receives or derives explicit lifecycle eligibility and does not call the plain enqueue path for an already-ready, rejected, or otherwise non-imported design. Existing dedicated reprocess/reset paths remain the route for those states.
- Lifecycle routing is explicit: new Staff Artwork promotion that creates `imported`/`pending` → plain enqueue; existing linked `imported`/`pending` → plain enqueue idempotently; existing `ready`/`approved` → `reprocessReadyDesignWithAi`; existing `rejected` → `resetAiEnrichmentForProcessing` with the rejected rerun option; any other non-imported/terminal state → no plain enqueue, surface a safe no-op or existing dedicated action and record the reason. The server remains authoritative; renderer eligibility only avoids known-invalid calls. Reconcile the implementation with ADR-FP-190 and existing validation helpers.
- Coordinate `useAiProcessingQueue` with `useAiReviewInbox` pagination so the sequential auto-processing loop requests the next cursor page when the loaded page is exhausted, without unbounded `loadAll`, concurrent claims, duplicate attempts, or bypassing stop/pause, retry, stale-recovery, terminal-ledger, and attempt-ID safeguards. The loop must await page acquisition before deciding exhaustion, prevent overlapping `loadMore` calls, and re-check the current run token/filter after each page and enqueue result.
- Keep the separate catalog reprocess worker out of this change.

Acceptance criteria:

- Staff Artwork re-send no longer produces the imported-status eligibility error for an already linked non-imported design.
- Normal imports and supported review/reprocess transitions still enqueue correctly.
- Auto Processing can continue past the initial 100-design page until the filtered queue is exhausted or the user stops it; it remains sequential and paginated.
- No new durable ordinary AI queue or worker is introduced.

## Affected areas and expected change surface

The following is the expected implementation surface, subject to normal plan-review refinement. Paths marked “new or extracted” are intentionally not created during this planning phase.

### Shared and Studio gang-sheet export (A/D)

- `packages/shared/src/utils/gangSheetLabelRendering.ts` — adaptive text-layout contract and SVG line rendering.
- `packages/shared/src/utils/gangSheetGroupedLayout.ts` — grouped layout band-height parity.
- `packages/shared/src/utils/gangSheetContinuousCustomerGroupedLayout.ts` — continuous grouped layout parity.
- `packages/shared/src/utils/gangSheetNesting.ts` — only if the shared usable-width contract requires a narrow, pure helper adjustment; no algorithm rewrite.
- `apps/studio/electron/services/export/exportGangSheetPng.ts` — consume shared label layout and use the resolved band height/offset.
- `apps/studio/electron/services/export/composeGroupedGangSheetSheets.ts` — consume shared grouped heading layout.
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.ts` — consume shared continued-section heading layout.
- `packages/shared/src/utils/gangSheetCacheFingerprint.ts` — include adaptive-layout algorithm/font version and selected label/layout inputs in cache identity.
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueueGlanceStats.ts` — preview/stat parity where label-band dimensions are represented.
- `apps/studio/src/renderer/src/features/print-requests/hooks/useGeneratePrintRequestGangSheet.ts` — preserve direct-export contract while passing selected assets for D.
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` — modal state wiring if needed.
- `apps/studio/src/renderer/src/features/print-requests/components/GeneratePrintRequestGangSheetModal.tsx` — local export-only item selection for D.
- `apps/studio/src/renderer/src/features/print-requests/utils/buildPrintRequestExportAssets.ts` — accept the selected item subset without changing asset-resolution semantics.
- `packages/shared/src/types/export/gangSheetExportIpc.types.ts`, `apps/studio/electron/preload.ts`, `apps/studio/electron/ipc/export/exportIpcHandlers.ts`, and `apps/studio/electron/ipc/export/exportRequestValidation.ts` — change only if the existing IPC contract needs an explicit selection/layout field; prefer no new IPC field if the subset can stay in the existing asset payload.
- `apps/studio/src/renderer/src/features/settings/services/gangSheetSettingsService.ts` and `apps/studio/src/renderer/src/features/upcoming-shows/services/showQueueSettingsService.ts` — verify minimum/font setting conventions; no new setting unless review finds the current contract insufficient.

### Staff Inbox (B)

- `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSubscriptionService.ts` — page/cursor query and cumulative source state.
- `apps/studio/src/renderer/src/features/staff-inbox/components/StaffInboxProvider.tsx` — page state, deduplication, generation reset, `hasMore`, and loading state.
- `apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx` — Load More/incremental-loading UI and loaded-count semantics.
- `packages/shared/src/staffInbox/staffInboxAlertOrdering.ts` — stable ID tie-breaker.
- `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSubscriptionService.ts` — direct-ID/batched hydration for Print Requests referenced by older allocation pages, beyond the bounded request-enrichment page.
- `apps/studio/src/renderer/src/features/staff-inbox/services/designIssueReportService.ts` and `apps/studio/src/renderer/src/features/staff-inbox/hooks/useResolvedDesignIssueReports.ts` — only for the resolved-history page path if it remains in the bounded batch.
- `packages/shared/src/staffInbox/deriveStaffInboxItems.ts` — only if the page abstraction needs a narrowly typed source contract; preserve derivation semantics.
- `firestore.indexes.json` — additive index entries only if the verified timestamp-plus-`__name__` queries require them.

### Portal Admin (C)

- `apps/portal/app/(admin)/admin/show-queue/page.tsx` and `apps/portal/features/admin-show-queue/pages/PortalAdminShowQueuePage.tsx` — search, totals, grouping, and empty/loading states.
- `apps/portal/features/admin-show-queue/utils/` — new or extracted pure search/grouping utilities, modeled on existing Studio behavior.
- `apps/portal/features/admin-show-queue/hooks/usePortalAdminShowQueue.ts` and `apps/portal/features/admin-show-queue/services/portalAdminShowQueueService.ts` — DTO consumption only as needed.
- Any scoped Portal/Admin or Staff Inbox stylesheet/module required for responsive grouped cards, search controls, checkboxes, and Load More states — only if the existing styles cannot support the UI; no unrelated visual restyle.
- `packages/shared/src/types/portal/getPortalAdminUpcomingShowQueueDashboard.types.ts` — customer grouping identity and separate totals.
- `functions/src/lib/portalAdminUpcomingShowQueueDashboard.ts` and the callable entry/contract around `functions/src/getPortalAdminUpcomingShowQueueDashboard.ts` — server-side DTO assembly and role-safe data loading.
- `packages/shared/src/utils/showAllocationDollarTotals.ts` — new/extracted shared snapshot-first allocation-total utility; the existing Studio utility delegates to or re-exports it so Portal and Studio cannot diverge.
- `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` and `packages/shared/src/utils/gangSheetPricingSnapshot.ts` — canonical request-item fallback pricing and snapshot projection used by the Functions DTO; return monetary values only, not customer identity.
- `packages/shared/src/utils/portalAdminShowQueueMetrics.test.ts`, Portal contract tests, and Functions dashboard tests.
- `apps/portal/features/admin-show-queue/components/PortalAdminViewDesignsModal.tsx` / its callable types only if the new totals are deliberately shown in the detail modal; card totals are the default bounded choice.

### AI queue (E)

- `functions/src/staffArtwork.ts` and the shared/service return type used by the Staff Artwork promotion/re-send call — expose explicit existing-link lifecycle/enqueue eligibility where needed.
- `apps/studio/src/renderer/src/features/staff-artwork/services/staffArtworkService.ts` — carry the explicit lifecycle/enqueue eligibility result to the page.
- `apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx` — branch on the explicit eligibility result rather than blindly enqueueing.
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts` — request next pages during sequential auto-processing.
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` and `apps/studio/src/renderer/src/features/ai-review/services/aiReviewInboxService.ts` — expose the existing cursor/load-more contract to the auto loop without duplicating query logic.
- `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` — awaitable cursor acquisition/load-more coordination, including pages with no client-filter matches while `hasMore` remains true.
- `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts` — likely no behavior change; add a regression assertion only if needed to document its sequential contract.
- Existing validation and AI review contract/unit tests listed in the test strategy below.

## Architecture, security, data, and release impact

### Functions and callable code

Expected: **yes**, for Portal dashboard DTO/pricing assembly and likely the Staff Artwork eligibility response. Build and contract-test Functions; do not deploy during this phase. Do not widen the AI enqueue guard.

### Firestore Rules

Expected: **no**. Existing role gates and read/write boundaries remain. Any proposed Rules change must stop for a separate security review and owner checkpoint.

### Firestore indexes

Expected: **possibly additive for B**, after query validation against `firestore.indexes.json`. The likely additions are timestamp plus `__name__` variants for the paged Staff Inbox source queries, including resolved reports if paged. C should filter the already loaded selected-show DTO client-side and should not add substring indexes; its `printRequestItems` equality/in queries must be checked against current single-field/composite coverage. No index deployment is authorized in this phase.

### Schema, migrations, and data repair

Expected: **no schema migration, backfill, or data repair**. D is local export state only. B stores no new acknowledgement records. C adds response fields, not persisted fields. E reuses existing design lifecycle fields and does not create an ordinary AI job collection.

### Portal App Hosting and Studio release

Expected later: **Portal App Hosting release for C** and **Studio release for A, B, D, and E** after implementation, testing, visual QA, and the required human approval. No release, deployment, console action, or production smoke test is authorized by this plan.

### Security and privacy

- Keep Portal Admin access behind `assertPortalAdminQueueCaller` and preserve the customer-safe DTO boundary.
- Do not return raw `customerId`, email, username, or a stable cross-response customer identifier. `customerGroupKey` is response-scoped, non-reversible, and used only to group the already-authorized DTO rows in that response; unknown-customer rows get unique non-merging keys. Search is limited to request ID/name and the current display-safe customer label; raw notes are excluded.
- Do not use client-side search as a substitute for authorization.
- Keep AI lifecycle eligibility enforced server-side; renderer checks are for avoiding known-invalid calls, not for security.

## Approach and sequencing

1. **Plan/review only:** approve this bounded surface and confirm the bounded decisions below.
2. **A/D shared contract first:** define adaptive label geometry and export-only item selection contracts, then update export/preview consumers together so dimensions and assets stay coherent.
3. **B pagination:** implement source-page state and deterministic ordering before changing the page UI; test page-boundary cases including new records and split allocation groups.
4. **C server DTO then Portal UI:** make totals and stable grouping identity authoritative in the callable response, then add client-side search/grouping using pure utilities.
5. **E lifecycle then queue pagination:** fix the Staff Artwork existing-link handoff while preserving server validation, then connect AI Processing auto-loop exhaustion to the existing cursor API.
6. **Test and visual verification:** run focused tests, type/build checks, and Studio/Portal visual QA; record failures honestly.
7. **Signoff only after owner approval:** update workflow state and handoff state in the same pass; release actions remain separately gated.

## Test strategy and exit criteria

No application tests are run as part of this plan artifact. Implementation must run and record at least:

### A/D focused tests

- `packages/shared/src/utils/gangSheetLabelRendering.test.ts`
- `packages/shared/src/utils/gangSheetGroupedLayout.test.ts`
- `packages/shared/src/utils/gangSheetContinuousCustomerGroupedLayout.test.ts`
- `packages/shared/src/utils/gangSheetEfficiencyLayout.test.ts`
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts`
- `packages/shared/src/utils/gangSheetNesting.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts`
- New tests for adaptive measure/shrink/wrap, preview/export parity, all/none/partial selection, mixed sources, saved quantities, and no request mutation.
- Include cache-fingerprint invalidation when label text/layout, algorithm/font version, or selected item IDs change, selection reset when the modal opens for another request, stale-selection validation at Generate time, unbreakable-token behavior, and accessible label/line semantics.

### B focused tests

- Existing Staff Inbox derivation and ordering tests, plus new service/provider tests for cursor progression, deduplication, live inserts, split allocation groups, `hasMore`, and acknowledgement preservation.
- Include source-specific timestamp/order assertions, live updates while an older page is loading, removal/filter-exit/delete reconciliation, no cursor reset on ordinary updates, generation reset only on query/filter restart, older allocation-page request-context hydration beyond the request cap, accessible Load More busy/disabled state, and loaded-count copy.
- Design-report history tests if resolved history is paged.
- Studio typecheck and the relevant focused `tsx --test` suites.

### C focused tests

- `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts`
- `functions/src/lib/portalAdminUpcomingShowQueueDashboard.test.ts`
- `functions/src/getPortalAdminUpcomingShowQueueDashboard.contract.test.ts`
- `packages/shared/src/utils/portalAdminShowQueueMetrics.test.ts`
- New search/grouping tests for request ID/name/customer/clear-search, deterministic response-scoped customer keys, independent request cards, separate totals, snapshot precedence, surcharge fallback, canceled exclusion, and unpriceable data.
- Include DTO privacy assertions (no raw customer ID/email/username), exact allowed searchable fields (request ID/name/display-safe customer label; no notes), selected request-item chunk loading, saved quantity/dimension pricing, two-decimal USD rounding, legacy fallback, null totals, and preservation of existing quantity metrics.

### E focused tests

- `functions/src/ai/enqueueAiEnrichmentValidation.test.ts`
- `apps/studio/src/renderer/src/features/staff-artwork/pages/staffArtworkAiReview.contract.test.ts`
- `apps/studio/src/renderer/src/features/ai-review/utils/aiProcessingQueue.test.ts`
- Existing stale-recovery, background-queue reconciliation, and reprocess contract tests.
- New tests for linked ready/rejected/non-imported Staff Artwork and auto-processing crossing the first cursor page without concurrent enqueue.
- Include the complete lifecycle matrix, no plain enqueue for invalid states, explicit dedicated reprocess/reset routing, auto-queue crossing with pause/stop/retry/terminal/stale/duplicate safeguards, active client-filter pages with no matches but `hasMore`, and accessible queue status if the UI changes.

### Whole-scope verification

- `npm run build:studio`
- `npm run build:portal`
- `npm run build --workspace fresh-prints-functions`
- `npm run lint` or the scoped lint command if the repository lint command is not currently clean for unrelated files.
- `npm run test:rules` if Rules/index changes are proposed.
- `git diff --check` and a manual diff audit proving unrelated working-tree changes remain untouched.
- Visual QA in Studio for long labels, grouped labels, partial selection, Staff Inbox Load More, and AI Processing pagination; Portal Admin QA for search, totals, and customer grouping.
- Accessibility QA: labeled search and clear controls, keyboard/focus behavior, checkbox/select-all semantics, responsive grouped rendering, and a screen-reader-visible Load More status.

Exit requires all acceptance criteria to pass, or a review artifact documenting each failure and its disposition. No test pass may be claimed without execution.

## Human checkpoints

- **Before implementation:** owner must approve this reviewed plan. Required phrase:

  `APPROVE IMPLEMENTATION OF THE REVIEWED PLAN: studio-portal-print-request-inbox-ai-queue-batch`

- **Before any production deploy, index deployment, console action, or release:** separate explicit owner approval is required.
- **Visual/UX approval:** required after Studio and Portal visual QA because this batch changes labels, list reachability, and admin grouping/totals.
- **Pricing-policy approval:** required if implementation proposes changing the canonical pricing policy, not merely reusing existing snapshot/fallback logic.

## Risks and mitigations

- **Adaptive labels change sheet height/cache identity.** Keep one shared geometry function, cover cache fingerprint and preview/export parity, and treat the resulting dimensions as intentional.
- **Live pagination duplicates or skips records.** Use stable source IDs, cursor snapshots, generation resets, and deterministic timestamp/ID ordering; test inserts between page loads.
- **Derived alerts split across raw pages.** Page source records cumulatively and derive from the accumulated source maps; never paginate a truncated derived-alert array.
- **Loaded counts look exact.** Surface `hasMore`/loaded semantics or add a separately approved count strategy.
- **Customer grouping leaks or merges identities.** Group server-authorized opaque IDs, never display labels alone; retain role-gated DTO construction.
- **Request total differs from selected-show total.** Return and label both totals separately; use allocation snapshots and explicit null/unpriceable handling.
- **Partial selection uses stale state.** Take a selection snapshot at Generate time from the current loaded item state, without changing persistence or silently changing saved quantities.
- **AI queue still calls invalid lifecycle paths or loops.** Keep backend guard authoritative, make eligibility explicit, preserve attempt IDs/terminal ledgers, and test terminal/non-imported states plus cursor exhaustion.
- **Dirty worktree contamination.** Do not reset or checkout; inspect every changed file and isolate only the new workflow artifacts in this phase.

## Rollback and operational safety

The implementation should be revertible through the reviewed PR. No migration or backfill means no data rollback is required. If Functions changes are released, revert the callable/trigger version before any client release that depends on new DTO fields. Additive indexes may remain harmlessly or be removed only through a separately reviewed operational change. No production or console action is part of this plan.

## Documentation updates

- Update permanent architecture/data-model/decision docs only if the implemented contracts create durable behavior not already represented; do not rewrite documentation speculatively during implementation.
- For C, update the relevant security/data-model or architecture documentation to state that `customerGroupKey` is response-scoped/non-reversible, no raw customer identifiers are returned, search is limited to request ID/name/display-safe customer label, and monetary totals are server-computed from canonical pricing inputs. This documentation update is part of the implementation/signoff evidence if the DTO changes.
- Add the formal review, test report, and signoff artifacts under `docs/workflow/reviews/`.
- At signoff, update `.cursor/workflow/state.md` and `references/project-chatgpt-handoff/CURRENT-STATE.md` in the same pass.
- Preserve unrelated existing working-tree changes and workflow artifacts.

## Bounded decisions and owner confirmations

The plan makes these implementation defaults explicit so the next phase is not blocked by underspecified behavior:

1. C is limited to the existing selected-show `/admin/show-queue` surface; an all-shows Print Requests manager is out of scope.
2. B paginates Open alerts. Done acknowledgements remain canonical/unbounded; resolved-report history is paged only if that existing Done view would otherwise remain capped.
3. C shows separate request-total and selected-show-total values, with the exact source and null semantics defined above.
4. D selects whole items with optional **export-only** quantity overrides; it does not persist quantity edits or offer width/height editors.
5. A uses the existing validated 20 px minimum and no new font setting.

The owner checkpoint confirms these bounded decisions together with implementation authorization. If the owner wants a different decision, implementation must stop and the plan must be amended and re-reviewed.

## Approval

- **Plan status:** Complete for implementation planning; formal review approved with changes; owner approval pending
- **Review artifact:** `docs/workflow/reviews/2026-09-20-studio-portal-print-request-inbox-ai-queue-batch-formal-review.md`
- **Owner approval:** Pending; do not implement until the exact checkpoint phrase is received.
