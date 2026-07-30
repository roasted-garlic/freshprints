# Review: Firestore Read Efficiency Wave C

## 2026-07-27 — FINAL SIGNOFF: PASS WITH NOTES

Wave C is closed. Full signoff artifact:
`docs/workflow/reviews/2026-07-27-firestore-usage-efficiency-wave-c-signoff.md` — contains the
complete problem statement, root causes, retained/abandoned architecture, dev resources changed,
preserved resources, automated test results, both final owner QA results (Studio PASS, Portal
PASS), cost/read interpretation, notes, production-untouched confirmation, and monitoring
recommendation. All reviews below (pass 5's bounded-hydration review and pass 6's private
read-model reviews) remain preserved as accurate historical record.

## 2026-07-26 — Pass 6 (private print-request read model) ABANDONED and REMOVED after owner review of real runtime evidence

The pass-6 private read-model reviews below (independent architecture review, security correction
review, backfill-defect review, and the final removal review) are preserved as accurate historical
record. The architecture they reviewed was subsequently abandoned by explicit owner decision — not
because any review found it broken, but because a controlled real-publication runtime test showed
the measured benefit did not justify the complexity (see ADR-FP-121 in `docs/project/DECISIONS.md`
for the full record). All pass-6 source has been removed; pass 5 (below) is the current, permanent
architecture. A separate, final non-authoring review of the REMOVAL itself (not the original
implementation) returned **APPROVED WITH CONCERNS** — zero issues with the removal's completeness or
correctness; the only concern noted was 5 pre-existing, unrelated DPI/print-size test failures that
predate and are unaffected by this work.

## 2026-07-25 independent formal review — Print Requests bounded hydration (pass 5)

**Verdict: approved_with_changes → all four required findings resolved.**

A non-authoring reviewer audited the full bounded-hydration redesign (maintained `queueTab` field +
two new triggers, bounded/chunked/direct-ID service methods, the auth-scoped remount cache, the
rewritten `usePrintRequests` hook, and the heavily-rewritten `PrintRequestsPage.tsx`). Confirmed
correct: no circular import in the new `queueTab` type; `computePrintRequestQueueTab` exactly
replicates the existing allocation-totals aggregation (no double-counting); no trigger recursion
risk (nothing listens on `printRequests` writes); delete-event handling on the two new triggers is
correct (recompute always runs on delete, since the operational-only skip requires both before AND
after); every per-event read is `printRequestId`-scoped, genuinely O(1); the backfill callable
checks owner authorization before any data read, is idempotent, and has zero non-export callers
(never auto-run); the pagination cursor matches the query's `orderBy`; `countPrintRequests` counts
the same filter the list page uses; the "requestedTab always equals activeListTab" claim was traced
and confirmed structurally guaranteed; mutation handlers correctly splice into item snapshots
rather than relying on stale closures.

Four findings, all resolved:

1. **`reconcileDeletedOrArchivedRequest` didn't decrement `countsByTab`** — a real exact-count
   violation (the tab badge would drift stale after every delete/archive until a full reload).
   **Resolved**: the util now takes the active tab and decrements that tab's count by 1 on both
   outcomes (floored at 0); the caller in `usePrintRequests.ts` passes `activeTab`. 4 new tests.
2. **`insertCreatedRequestLocally` had no internal guard** against being called from a non-Working
   tab, relying entirely on the caller remembering to check. **Resolved**: the guard now lives
   inside the hook function itself (no-op unless `activeTab === "working"`), so a future call site
   cannot silently corrupt another tab's exact count.
3. **`listAllPrintRequestsForBackfillOnly` was dead code** — the actual backfill Cloud Function
   reads Firestore directly via `adminDb`, never calling this client-SDK method, and its doc
   comment was misleading. **Resolved**: removed.
4. **`useCustomers.ts` (the old full-scan hook) had zero remaining callers** post-rewrite.
   **Resolved**: deleted (a different, unrelated `useCustomersDirectory` hook remains in active use
   elsewhere, untouched).

Re-verified after fixes: 46/46 focused tests (was 42; +4 new count-decrement tests), Studio 3-target
build, functions build, changed-file lint, diff-check — all clean.

## 2026-07-25 independent formal review — 249-read Studio spike remediation (pass 4)

**Verdict: approved_with_changes → both required changes resolved.**

A non-authoring reviewer verified the log-based attribution (server proven clean and constant-cost: 4
`onPrintRequestItemCreated` executions at exactly 1 read/2 writes/1 transaction each, 4
`onPortalCatalogSnapshotSourceWritten` executions all operational-skip at 0 reads, no other function in or
adjacent to the window) and the `addPrintRequestItem`/read-tracing changes. Findings:

1. **Required — orphan-item risk from the removed parent existence check.** The removed
   `getPrintRequestById` call only ever checked doc existence; nothing else was lost. But writing the item
   before the parent `updateDoc` could leave an orphaned item doc if the parent truly doesn't exist.
   **Resolved**: `addPrintRequestItem` now accepts an optional `existingItems` hint;
   `savePrintRequestDesignSelections` (the actual caller behind the owner's multi-design workflow) already
   calls `getPrintRequestById` once up front — proving existence — before its add loop, and now passes its
   already-loaded items through the hint (appending each created item locally to keep sortOrder correct
   across the loop). This closes the existence-check gap for the tested workflow without adding a read, and
   documents the tradeoff in a code comment for callers that don't preload.
2. **Required — accurate accounting.** The reviewer correctly found that `savePrintRequestDesignSelections`
   (not the two `duplicatePrintRequestItem` call sites, which already pass explicit `sortOrder`) still ran
   a per-add growing items query. **Resolved by the same fix above**: the hint eliminates that query
   entirely for this caller, so the write-up's budget claim is now accurate rather than needing a caveat.

Re-verified after resolution: Studio 3-target build, changed-file lint, 12/12 focused tests, diff-check —
all clean.

## 2026-07-25 independent formal review — Live cost-test remediation (pass 3)

**Verdict: approved. No required changes.**

A non-authoring reviewer verified all six pass-3 changes against source: (1) the seven queue validation-stage
labels sit inside their existing `if` blocks with zero logic/ordering change, the central `failureStage`
details attachment serializes correctly (confirmed against firebase-functions' `HttpsError` source — plain
instance property read at `toJSON()` time), stage strings carry no customer data, and Portal's error readers
ignore unknown detail keys; (2) deletion accounting counts are correct, dev-gated, and behavior-neutral;
(3) the Clear Request reconciliation is safe end-to-end — tab grouping tolerates the dropped summary,
epoch-discard correctly strands pre-clear in-flight loads, dashboard counts are unaffected, and the open
detail page empties through the existing cart-signature sync without a reload; (4/5) both asset services'
in-flight maps preserve manifest no-cache semantics and trace exactly once per logical caller; (6) the AI
Review taxonomy swap is display-only — `approveSuggestedTag`'s archived-name collision validation runs its
own independent corpus check server-side, draft-add uses the callable's returned name, and the generated
hook is null-safe pre-auth. Quota was confirmed working-as-designed (per-purpose server counters; the two
live calls were different purposes) — documented, no change. Non-blocking note: the 3x→2x preview comment in
`deleteEligiblePrintRequest.ts` documents the previously-reviewed pass-1 change, not this diff — scope
boundary confirmed correct.

## 2026-07-25 independent formal review — Comprehensive eradication passes 1+2

**Verdict: approved_with_changes — both required changes resolved; proceeding authorized.**

An isolated reviewer context that did not author the changes audited all eight changes across both passes
(pass 1: AI Review taxonomy swap, delete/archive local reconciliation, `refreshCustomer` removal, trigger
idempotency guards, `deleteEligiblePrintRequest` preview dedup; pass 2: queue-success effect suppression,
wipe reset no-op skips, chunked item summaries). All root-cause, cost, atomicity, rules-interaction, and
mapper-compatibility claims were verified against source. Findings and resolutions:

1. **Required — AI Review silent taxonomy failure** (`AiReviewPage.tsx`): the page ignored the generated
   hook's `failed` status, leaving a silently-empty category dropdown on snapshot failure. **Resolved**: the
   page now surfaces "Category filters are temporarily unavailable." (`role="alert"`) when
   `taxonomyStatus === "failed"`; fail-closed behavior (no Firestore fallback) is unchanged and now visible.
2. **Required — unattributed `statsRefreshKey`/`wasInboxLoadingRef` removal in the same file's diff**:
   investigated and **attributed as pre-existing dirty-worktree work from an earlier Wave C pass** — the
   session-start `git status` snapshot (recorded before this pass's first edit) already listed
   `AiReviewPage.tsx` as modified, and this pass's edits touched only the taxonomy import/call/notice lines.
   Not scope expansion by this pass; noted for the earlier pass's record.

Non-blocking verifications recorded by the reviewer: trigger idempotency markers are atomic with their
increments and invisible to all client mappers; Admin SDK writes are unaffected by rules; the deletion
dialog has exactly one call site and derived tab state stays live; React 18 batching guarantees the
queue-success suppression consumes exactly one effect run; wipe no-op field checks are safe
(`serverTimestamp()`/`FieldValue.delete()` only, never `null`); wipe pagination advances correctly on
all-skipped pages; the wipe response-count semantic change matches the Studio labels' existing meaning;
chunked summaries return identical results for >10 requests and zero-item requests.

The steady-state cost of the idempotency guards (+1 transactional read, +1 marker write per real
catalog-add/show-allocation event) was reviewed and accepted: bounded, no new collection, no growth, and it
removes a real double-count risk on at-least-once event delivery.

## 2026-07-24 formal review — Comprehensive Firestore spike eradication (narrowed scope)

**Verdict: approved_with_changes.**

Reviewed against `docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-pre-implementation-report.md`
and the Plan amendment of the same date. The narrowing from the requested 12-task/40-test scope to five specific,
evidence-cited defects is correct: the pre-implementation report shows the remaining 12-task items either
re-audit already-implemented, owner-approved architecture with no new regression evidence, or require additional
unread source (e.g. the catalog snapshot change-classifier) that is not yet available. Proceeding on the full
scope now would violate this goal's own "do not reopen a signed-off issue without new evidence" rule. Approved
with the following required changes before implementation is considered complete:

- **Item 1 (AI Review categories)**: confirmed scope is correct — `useCategories()` in `AiReviewPage.tsx` is
  read-only display data (a filter dropdown), not a management flow. Required: verify at implementation time
  that `useGeneratedDesignLibraryTaxonomy`'s `isActive`-filtered category set is a strict match for what the
  dropdown already filters to (`category.isActive`) — no silent behavior change (e.g. inactive categories
  becoming visible/invisible incorrectly).
- **Item 2 (Studio delete-reload)**: required — do not remove the full-list reload capability entirely; only the
  automatic reload immediately following a single delete/archive changes to local reconciliation. Any explicit
  "Refresh" action a user can still trigger must remain a full authoritative reload. Required: a bounded
  `limit()` value must reuse an existing named constant in the codebase, not introduce a new arbitrary number
  without evidence of the right size.
- **Item 3 (Portal refreshCustomer)**: required — before removing the call, confirm (as this Review now records,
  based on the Functions research pass) that `createPortalPrintRequest`'s transaction genuinely writes only to
  `printRequests` and the customer sequence counter, never to any customer-profile display/plan/quota field a UI
  reads. If any such field is touched, this item must be re-scoped to a targeted local-state patch instead of
  outright removal.
- **Item 4 (idempotency guard)**: **approved with a narrower implementation than the Plan amendment's initial
  proposal.** Given `onPrintRequestItemCreated`/`onShowAllocationCreated` do not set `{retry: true}`, the
  redelivery window is the platform's baseline at-least-once guarantee, not an amplified retry loop — real but
  low-probability. Adding a new persisted marker field plus a `runTransaction` on every catalog-add/show-allocate
  is a nontrivial steady-state cost increase (one transactional read+write added to a hot path) to guard a rare
  event. Review requires the simplest correct guard: reuse the CloudEvent's own delivery-identifying data (event
  ID) if the trigger context exposes one suitable for a cheap existence check, or, if no such lightweight
  mechanism exists, defer this item to a separate follow-up amendment rather than accept a steady-state cost
  increase on the hot catalog-add path without a narrower option being tried first. Implementation must record
  which path was taken and why.
- **Item 5 (triple buildPreview)**: approved as scoped. Required: the removed `buildPreview()` call must not
  remove any authorization check — `assertOwnerCaller`/`loadCallerProfile` must still run before the recheck, so
  the fix must only remove the *preview-shape* computation, not any guard.
- **Boundary confirmation**: no schema/rules/migration change is approved beyond whatever item 4's final
  implementation requires (and that must be justified in the test report if used). No deployment of any kind is
  approved by this review — implementation, local tests, and builds only.

Proceed to implementation under these constraints.

## 2026-07-24 formal review — Portal show-queue amendment

**Verdict: approved_with_changes.**

The amendment is approved because it preserves server authority and confines deduplication to an
in-memory client Promise keyed by authenticated request/show identity. Review requires:

- no claim that historical failed-precondition stages are known; revision `00028-ruk` did not log
  them;
- the transaction must repeat request/show/allocation/capacity checks before writes;
- accounting must contain aggregate counts/stages only, never IDs or business data;
- catalog-add response fields must be an explicit allowlist and must not expose Firestore document
  contents wholesale;
- quota freshness must reuse the existing 45-second policy and mutation invalidation;
- local queue reconciliation must not replace authoritative refresh behavior in later sessions;
- no persisted idempotency contract, rules/index change, or production action.

With those constraints, implementation and focused verification may proceed. Deployment remains a
human checkpoint.

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md` |
| Verdict | **approved_with_changes** |

---

## 1. Verdict

**approved_with_changes**

The amended Plan is approved to begin **Phase 0 diagnostics and evidence-backed containment only**.
Reference snapshots, Portal catalog snapshots, generated search assets, and their consumption remain
blocked until the Phase 0 containment record proves that idle/repeating reads are identified and
contained. No production deployment is approved.

## 2. Summary

The Plan correctly treats this as a continuation goal without reopening the signed-off prior phase,
identifies concrete code-level read amplifiers, and keeps all owner-requested workstreams under
`firestore-usage-efficiency-wave-c`. Review found material ambiguities in delivery boundaries,
publication coordination, Studio ordering/page size, search strategy, checkpoints, rules testing,
and numeric budgets. Those items have been resolved directly in the Plan.

## 3. Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass with changes | All required workstreams remain in one goal; internal gates prevent unsafe sequencing |
| Architecture alignment | pass with changes | Firestore canonical; derived Storage read models; service/Function ownership preserved |
| Security impact addressed | pass with changes | AI/private and public-safe assets separated; field-allowlist and rules tests mandatory |
| Data model impact addressed | pass with changes | Two Admin-only publication-state documents now specified |
| Backend impact addressed | pass with changes | Trigger/worker/callable resources and lease/fencing behavior now explicit |
| Test strategy adequate | pass with changes | Numeric budgets and official Firebase rules-test harness added |
| Human checkpoints identified | pass with changes | Future checkpoints now distinguish pending/completed/not applicable |
| Roadmap alignment | pass | Infrastructure hardening; no product-phase expansion |
| Documentation plan | pass | ADR plus architecture/backend/data/security/testing/deployment records required |
| No silent scope expansion | pass | No required workstream deferred; no external search provider |

## 4. Required Changes and Amendments Made

The Review required and the Plan now includes:

1. Correct future checkpoint statuses; anticipated checkpoints are no longer marked completed.
2. Private Admin-only AI snapshot delivery.
3. Narrowly public, read-only Firebase Storage delivery for client-safe taxonomy and Portal catalog
   assets, with immutable caching and no normal-path callable.
4. Exact coordination documents:
   `snapshotPublicationState/catalog-reference` and
   `snapshotPublicationState/portal-catalog`.
5. Lease fields, 10-minute expiry, owner format, fencing epoch, generation-match manifest writes,
   collision-safe versions, bounded two-pass workers, bounded wake behavior, crash recovery, and
   previous-version retention.
6. Generated search/tag shards now (Option A), with payload, parsed-memory, page, and LRU budgets.
7. Studio Design Library’s repository-proven `updatedAt DESC`, document-ID `DESC`, page size 100,
   existing-index verification, archived/category/tag/selection-mode requirements, and no `loadAll`.
8. Exact AI snapshot field parity and continued separation of AI settings/secrets.
9. Numeric read budgets for closed, idle, import, catalog, Discover, search, and cached-return states.
10. Exact implementation sequence with a hard containment review between Phase 0 and long-term work.
11. Separate deployable resource list and owner checkpoints.
12. Official dev-only `@firebase/rules-unit-testing` approval because no emulator rules harness exists.
13. Rollback prohibition against silently restoring `loadAll`, full hydration, or four-query Discover.

No app or Functions code was implemented during Review.

## 5. Confirmed Architecture Decisions

### Phase 0 gate

Diagnostics and containment run first. The long-term architecture cannot begin until the containment
record establishes:

- fully closed client behavior
- deployed Function/queued/retry/other-device/reporting-delay attribution
- listener/query lifecycle by route
- AI reference cache hit/miss/fallback/concurrency behavior
- termination behavior for completed jobs

Unexplained repeating reads block the next wave.

### Asset delivery

| Asset | Delivery | Access |
|-------|----------|--------|
| AI reference snapshot | Cloud Storage through Firebase Admin SDK | private server-only |
| Client-safe taxonomy | Firebase Storage client download from generated prefix | narrowly public read-only |
| Portal Discover/search/tag/card assets | Firebase Storage client download from generated prefix | narrowly public read-only |

This boundary fits public Portal browsing and cacheability. A callable is not used for normal asset
delivery because it would add invocation cost and weaken standard immutable HTTP caching. Firebase
access remains in services, not React components.

### Publication

- Canonical editable source: Firestore.
- Derived immutable artifacts: Cloud Storage.
- Coordination: two Admin-only Firestore state documents.
- Concurrency control: transactional generation/lease epoch plus Storage generation-match precondition.
- Lease: 10 minutes; reclaimable after expiry.
- Worker: 15-second bounded debounce, maximum two builds per invocation.
- Recovery: previous manifest remains valid; next relevant mutation or owner/admin rebuild callable.
- Polling: no scheduled one-minute worker.
- Cost: approximately one small coordination transaction per relevant mutation and at most two
  coalesced full builds per worker invocation. Test reporting must compare publication reads/writes and
  Storage costs against removed amplification.

### Search and multi-tag

Option A is selected now: generated customer-safe search/tag shards and bounded generated card
retrieval. This is necessary to preserve arbitrary text and AND-style multi-tag semantics without
catalog-size-dependent Firestore hydration. Normal Portal browse remains 40-card Firestore cursor pages.

### Studio Design Library

The existing product order is `updatedAt DESC`; `createdAt` would be a behavior regression. Retain page
size 100 and `__name__ DESC` tiebreaker. Existing composite indexes cover the current ready/archived,
category, tag, and combined filter shapes and must be verified before changes. No index is deployed
during Review.

### AI reference behavior

Snapshot-backed and direct Firestore loaders must produce identical resolver inputs. Tags require
ID/name/aliases/`preferredWhen`/approved status; categories require ID/name/optional description plus
derived name/index maps. Effective exclusions and other non-secret AI settings stay in the settings
loader. Secrets remain in Secret Manager.

## 6. Rejected Alternatives

- Proceeding to snapshots before idle attribution: rejected because it can mask a leak/retry loop.
- Authenticated callable for normal client assets: rejected due guest browse, invocation cost, and
  weaker immutable HTTP caching.
- Firebase Hosting as a second asset publication surface: rejected as unnecessary operational scope.
- Bounded Firestore-only arbitrary search/multi-tag: rejected because correct behavior cannot remain
  catalog-size independent.
- `createdAt` Studio pagination: rejected; repository behavior is `updatedAt DESC`.
- One rebuild per mutation: rejected; bulk approval/reorder would create new amplification.
- One-minute scheduled publication polling: rejected; it creates perpetual background reads/invocations.
- A single full-catalog JSON file: rejected for mobile payload/memory scaling.
- Restoring old unbounded paths as routine rollback: rejected.
- New external search provider: rejected and out of scope.

## 7. Security Assessment

Status: **pass with required controls**

- Public assets must use explicit field allowlists and schema validators.
- AI guidance, raw AI output, processing metadata, owner-only fields, notes, secrets, and sensitive data
  are prohibited from public objects.
- AI objects remain outside all public Storage rule matches.
- `snapshotPublicationState` is denied to clients; Admin SDK only.
- `rebuildCatalogSnapshots` is owner/admin only with validated input and bounded work.
- Diagnostics are default-off and count/signature/reason only; no bodies, prompts, artwork, PII, tokens,
  or snapshot contents.
- Storage and Firestore emulator rule tests are mandatory before any rule deployment.
- Public-read rule changes require explicit dev approval; production remains out of scope.

## 8. Data-Model Assessment

Status: **pass with documented additions**

Two coordination documents are added under `snapshotPublicationState`. They contain only operational
publication metadata, no customer data. No design lifecycle, print-request, show-allocation, taxonomy
business semantics, or canonical ownership changes occur. Snapshot schemas and state fields must be
documented in `DATA_MODEL.md`; durable publication/search choices require an ADR.

## 9. Deployment Impact

Expected deployable resources, each separately named at the future checkpoint:

1. changed AI/reference-loading Functions
2. tag/category/design invalidation triggers
3. publication-state worker trigger
4. owner/admin rebuild callable
5. Storage rules
6. Firestore rules
7. only indexes proven missing during implementation
8. first reference/catalog snapshot initialization
9. coordination document initialization/reconciliation

Implementation must stop before deploying any item. The owner must approve the exact
`fresh-prints-dev` resources and commands. Production deployment is not permitted by this goal.

## 10. Migration and Initialization Impact

No destructive migration or canonical data backfill is planned. Before a valid manifest exists,
consumers use the new bounded Firestore fallback. Initializing the two coordination documents and
publishing the first snapshots are explicit owner-approved dev actions. Generated objects are
replaceable derived data and remain temporarily retained during rollback/diagnosis.

## 11. Quantitative Read Budgets

| State/workflow | Budget |
|----------------|--------|
| Everything closed | 0 client reads; 0 unexplained repeating server reads |
| Studio dashboard 30 min, no writes/reconnect | 0 taxonomy/design queries, reattachments, or emissions |
| Portal non-catalog 30 min, no writes/reconnect | 0 taxonomy/catalog queries and 0 repeated user/request loop |
| Navigation ×5 | Final active-listener count equals cycle 1 |
| 10–20 design import, valid snapshot | 0 Firestore tag/category reads and 0 fallback loads |
| AI reference Storage | ≤1 manifest + 1 AI snapshot per warm instance/content version |
| Direct design reads in import | ≤2 per job plus bounded route pages and documented listener transition deliveries; reconcile within 10% |
| Completed import idle 30 min | 0 reference reads and 0 completed-job retries |
| Studio first page | ≤101 returned docs plus optional aggregate count |
| Portal first page | ≤41 returned docs plus optional aggregate count |
| Discover valid snapshot | 0 Firestore design reads; ≤1 manifest + 1 Discover asset cold |
| Search/multi-tag page | 40 cards max; no full hydration; ≤2 MiB transfer and 8 MiB parsed working set |
| Cached return before TTL | 0 Firestore reads and 0 immutable-object redownloads |

Any reconnect or real matching document mutation is reported separately, not counted as idle.

## 12. Tracing Assessment

Diagnostics are approved only if:

- default off and harmless in production builds
- no Firestore read/write is performed for logging
- listener attach, detach, and emission are separate events
- one-time reads and aggregate counts are distinct
- stable query constraints/signatures and route/service owner are recorded
- focus/visibility/reconnect causes are labeled
- cache hit/miss, in-flight reuse, manifest version, fallback, and retry reason are recorded
- Functions use structured counts/reasons and never log entire snapshots

The tracer itself must have focused tests proving counters do not recursively instrument logging.

## 13. Test Assessment

Exact command and exit-code reporting is mandatory:

- `npm run lint`
- `npm run typecheck --workspace @fresh-prints/portal`
- `npm run build:portal`
- `npm run build:studio`
- `npm run build --prefix functions`
- explicit `npx tsx --test ...` changed-test list
- the newly documented Firebase emulator rules-test command if rules change

The known Studio TS5103 failure is recorded separately from new regressions. A command not run is
reported as skipped, never passed. Focused tests cover schemas, projection, manifest preconditions,
coalescing, lease expiry/fencing/crash recovery, in-flight Promise reuse, fallback, AI parity,
reference counting/Strict Mode, pagination, search/multi-tag, cache invalidation, and rules.

## 14. Exact Implementation Sequence

1. Implement default-off diagnostics only.
2. Run Phase 0 fully-closed and route baseline with owner process/tab/tunnel action.
3. Implement only evidence-backed containment.
4. Test and formally record the containment result.
5. Stop if any repeating source remains unexplained.
6. Implement shared contracts/coordinator after containment passes.
7. Implement reference publication and AI/client consumption with parity/fallback.
8. Implement Studio pagination and design lookup/subscription deduplication.
9. Implement Portal Discover and generated search/tag/card assets.
10. Remove full-hydration execution paths.
11. Run automated tests and the same before/after matrix.
12. Stop for exact dev deployment/initialization approval.
13. After approved dev deployment, perform delayed Usage Insights verification.
14. Request owner PASS/FAIL/PASS WITH NOTES and proceed to Signoff.

All steps remain within this managed goal.

## 15. Human Checkpoints

| Checkpoint | Current status |
|------------|----------------|
| Formal Plan Review | completed |
| Fully close apps/dev servers/tunnel and verify process list | pending owner action |
| Phase 0 containment result | pending internal gate |
| Dev Functions/rules/index deployment | pending explicit owner approval |
| Coordination/snapshot initialization | pending explicit owner approval |
| Manual workflow/read-budget verification | pending owner action |
| Production deployment | forbidden/out of scope |

## 16. Remaining Owner Decisions

No product/architecture choice blocks Phase 0 diagnostics. Owner action will be required to close all
clients/processes for isolation and later to approve exact dev resources. If Phase 0 evidence suggests
Staff Inbox bounds would omit a legitimate alert state, the containment record must present that exact
tradeoff before changing behavior.

## 17. Rollback Assessment

Rollback is operationally adequate after amendment:

- centralized snapshot-consumption switch
- bounded Firestore fallback
- previous manifest/version selection
- commit reversion for listeners/queries
- approved deploy required to disable Functions or change rules
- canonical taxonomy/design data untouched
- generated objects retained for diagnosis
- deployed rule/index additions may remain safely unused until separately removed
- no routine return to Studio `loadAll`, Portal full hydration, or four-query Discover

## 18. Implementation Authorization

**Yes, Phase 0 diagnostics and evidence-backed containment are approved to begin.**

**No, reference snapshots, Portal catalog snapshots, generated search, rules/index changes,
initialization, migration, or Firebase deployment are not yet approved to begin or perform.** Long-term
implementation unlocks only after the Phase 0 containment record passes its internal review gate.

## Next Step

Enter Implement for Phase 0 diagnostics and containment only. Stop for the owner’s fully-closed
isolation action when the diagnostics are ready.

---

## Amendment 2026-07-23 — AI-private reference snapshot budget raised to 512 KiB (R-013)

**Verdict on this narrow amendment: approved.**

### Trigger

The first real `fresh-prints-dev` `rebuildCatalogSnapshots` invocation failed twice with a proven,
deterministic `snapshot-asset-budget-exceeded` error on the AI-private reference snapshot at Fresh
Prints Dev's actual ~1,122-tag corpus (measured 295,152 bytes / ~288.2 KB, over the original 256 KiB
ceiling). Full diagnosis is in
`docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-dev-deployment-checkpoint.md`
("Incident" section). The owner explicitly approved raising only the AI-private snapshot's ceiling to
512 KiB (524,288 bytes), with no sharding and no other budget change.

### Review verification

| Check | Result |
|-------|--------|
| Change remains bounded | **Pass.** Only `AI_CATALOG_REFERENCE_MAX_BYTES` (new, 512 KiB) is introduced and applied to exactly one `saveJson` call (the AI asset in `publishReference`). `PUBLIC_ASSET_MAX_BYTES` (256 KiB, renamed from an inline literal for clarity, value unchanged) governs the client-safe reference asset and manifest as before. All `publishPortal` literals (Discover 512 KiB, filters/shards 256 KiB, card buckets 32 KiB, browse pages 2 MiB) are untouched. |
| Private asset remains server-only | **Pass.** No change to `storage.rules` (`generated/catalog-reference/ai/{fileName}` still `allow read, write: if false`); confirmed by the unmodified, still-passing 6/6 rules suite. |
| New ceiling not applied globally | **Pass.** `AI_CATALOG_REFERENCE_MAX_BYTES` is a distinct constant from `PUBLIC_ASSET_MAX_BYTES`; a dedicated test (`publishCatalogSnapshots.test.ts` → "Portal catalog asset budgets remain untouched by the AI-private budget change") asserts they are not equal and that Portal's own literals are unaffected. |
| Memory/network impact acceptable | **Pass.** 512 KiB uncompressed is a single small Storage object, loaded once per warm Functions instance/content-version change through the existing bounded module cache; no new consumer, no new object, no new network round trip. |
| Rollback unchanged | **Pass.** No manifest field, coordination document, or generated path changed; the existing Portal/AI feature-flag and previous-version rollback in the dev-deployment checkpoint applies unmodified. |
| Tests enforce the private/public distinction | **Pass.** New tests assert: the dev-scale (~1,122-tag) fixture now fits under 512 KiB with the client snapshot unaffected; the 80% warning fires/doesn't fire correctly at the boundary; an intentionally oversized fixture still fails safely past 512 KiB with the stable `snapshot/payload-budget-exceeded` code; and Portal/public budgets are provably distinct constants. |

### Recorded decision

- Original private AI budget: 256 KiB.
- Measured real dev payload: 295,152 bytes (~288.2 KB), confirmed via `firebase functions:log` and
  reproduced in a size-equivalent regression fixture.
- New private AI budget: 512 KiB (524,288 bytes) — **AI-private asset only**.
- Warning threshold: 80% of 512 KiB (409,600 bytes), non-blocking, structured `logger.warn`, no
  taxonomy content in the log payload.
- Public/client-safe taxonomy budget: unchanged (256 KiB).
- Portal catalog asset budgets: unchanged (Discover 512 KiB, filters/shards 256 KiB, card buckets 32
  KiB, browse pages 2 MiB — all pre-existing, separate literals).
- Manifest contract, generated paths, and consumers/parsers: unchanged.
- Security exposure: unchanged (still private/server-only; rules suite still 6/6).
- Sharding: explicitly deferred until the 80% warning signals it is needed, not implemented now.
- Owner explicitly approved this exact decision on 2026-07-23 (see the "Owner Decision" preamble of
  the corresponding Continue Workflow prompt, recorded in the ADR-FP-120 amendment in
  `docs/project/DECISIONS.md`).

### Next Step

Proceed to redeploying only the affected Functions (`rebuildCatalogSnapshots`,
`onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten` — see the dev-deployment checkpoint
for the exact command and reasoning) under a separate explicit owner approval, then retry
initialization once, per the checkpoint's retry procedure.

---

## Amendment 2026-07-24 — Portal tag-facet summary (owner QA regression fix)

**Verdict on this narrow amendment: approved.**

### Trigger

Post-publication owner QA against live generation-4 snapshots found: (1) the Portal tag modal
showing the complete approved taxonomy with no design counts, including zero-result tags; (2) a
search for "BEST" initially showing only one of two matching designs until "Load more" was clicked;
(3) a several-thousand-read Firestore Product Usage increase during the QA session. Full diagnosis
is in `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md` ("Amendment
2026-07-24") and `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-dev-deployment-checkpoint.md`.

### Review verification

| Check | Result |
|-------|--------|
| New asset is bounded and narrow | **Pass.** One new fixed-path asset (`.../filters/tags-facet.json`) per catalog version, not a per-tag enumeration. Measured well under its 256 KiB budget at dev scale, with a dedicated growth-scale test. |
| Asset remains public-safe | **Pass.** Contract is `{ id, name, count }` only — no AI guidance, no descriptions, no private fields. Reuses canonical taxonomy names; never invents data. |
| Manifest change is additive, not breaking | **Pass.** One new fixed field (`filters.tagFacetPath`) added to the existing v2 manifest; `PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION` stays 2 since no deployed consumer of any manifest version exists yet to protect against a breaking change. |
| Security boundary unchanged | **Pass.** New path falls under the existing `generated/portal-catalog/{allPaths=**}` Storage rule; a narrow test proves this rather than assuming it. Rules suite passes 7/7 (was 6/6). |
| Search fix is a pure, testable function | **Pass.** `planPortalCatalogSearchPage` has no I/O; 10 new focused tests cover the exact reported regression, the 40/41-result boundary, deterministic ordering independent of `Set` insertion order, and multi-set AND-intersection before pagination. |
| No unrelated behavior changed | **Pass.** Search token/prefix/case-insensitive semantics, AND-style multi-tag semantics, 40-card page cap, Discover ranking, manifest-last publication, and previous-version rollback are all unchanged and covered by existing/new tests. |
| Firestore fallback path is also bounded | **Pass.** The non-generated fallback for `listApprovedTags()` was rebounded from an unbounded `tags` collection query to a scan of `status == "ready"` designs, matching the "zero Firestore tag/category reads" tag-modal budget's intent for the fallback path too. |

### Recorded decision

- New generated asset: `generated/portal-catalog/v{catalogVersion}/filters/tags-facet.json`
  (`PortalCatalogTagFacetSummary`), 256 KiB budget, public-read/client-write-denied under the
  existing wildcard rule.
- Manifest: `filters.tagFacetPath` added (additive; schema version unchanged at 2).
- Search: `listMatchingDesigns` now assembles the complete, deterministically-ordered matching ID set
  before pagination via `planPortalCatalogSearchPage`; `Load more` only appears when more than the
  current page remains.
- No product/architecture decision beyond this narrow correction was required; no budget for any
  other asset changed; no field removed from any existing contract.
- Owner regression (`BEST` → 2 matches, both on page 1, no Load more) is covered by a dedicated
  regression test reproducing the exact scenario.

### Next Step

Determine and return the exact redeployment scope (publisher functions whose output changed:
`rebuildCatalogSnapshots`, `onPortalCatalogSnapshotSourceWritten`), require a fresh
`rebuildCatalogSnapshots` republish to produce the new tag-facet asset and manifest field, and
require local Portal retest against the republished snapshot before further owner QA.

---

## Amendment Review — Studio Design Library generated-catalog assets (2026-07-24)

**Verdict: approved_with_changes**

Implementation may begin only after the required changes below are folded into the Plan amendment
and the two remaining owner decisions (Electron transport; normal-browse failure fallback) are
answered. Do not implement against the amendment as currently drafted.

### 1. Scope and framing

The amendment correctly identifies that this is a narrower problem than Portal's: Studio's
search/category/tag/multi-tag/dynamic-narrowing logic is already 100% client-side and already
correct (confirmed by direct code citation, not assumption) — the actual defect being fixed is the
**data-loading cost** underneath that logic (~1,122-doc tag read + ~200-doc category read + ~100-doc
design page on every cold entry), not a search-correctness defect the way Portal had. Review agrees
this justifies a materially smaller architecture (Option B) than either wholesale Option A reuse or a
fully separate Option C asset family, and agrees Option A alone is insufficient (archived-design
security boundary; search-semantic risk from Portal's token-shard reuse) and Option C is
over-engineered (Studio does not need a generated *search index* or *tag facet* asset — only a
generated *card set* to filter over, which already exists in Portal's card buckets).

**Approved as scoped**, with the required changes below.

### 2. Security boundary — approved, this is the correct call

The amendment's finding that archived designs must never enter the existing public
`generated/portal-catalog/**` prefix is correct and non-negotiable — that prefix is `allow read: if
true`, and archived-design existence/metadata is staff-only per `SECURITY.md`. Keeping archived-mode
browsing on its existing Firestore path unchanged is the right, narrow answer; do not attempt to
solve this by adding a role check inside a public-read Storage path (Storage Rules have no
per-object-conditional-on-caller-role mechanism cheap enough here, and Review does not approve
inventing one for this amendment). Confirmed also correct: `originalPath` exclusion from any new
asset, and reuse of the existing ready-only card buckets/client taxonomy rather than inventing new
ones that could accidentally diverge on field allowlisting.

### 3. Required change — resolve the Electron transport question before implementation, do not defer to Test phase

The amendment correctly identifies this as unresolved but defers the actual choice to "Formal
Review must pick one." Review is picking now, since deferring further would let implementation start
against an ambiguous transport and risk building the wrong one:

**Required: Option 2 (Electron main-process IPC bridge), not Option 1 (browser CORS extension).**

Rationale:
- Packaged Electron's `file://` origin is not just "unresolved," it is very likely **unsafe or
  non-functional** to allow-list directly — `file://` pages in Chromium typically send no `Origin`
  header at all (or `Origin: null`) on cross-origin fetches, and allow-listing a `null` origin in
  bucket CORS is a materially broader, harder-to-audit trust boundary than a fixed hostname (it would
  also match certain other `null`-origin contexts, like sandboxed iframes, not just this app). This
  is exactly the kind of transport-security tradeoff `SECURITY.md`'s "when uncertain, choose the more
  secure option" principle resolves in favor of the IPC bridge.
- The IPC bridge requires zero bucket CORS change at all (removes one of the two "Storage Rules or
  CORS change" review burdens the amendment itself flags), works identically in dev and packaged
  builds (no dev-vs-packaged branching logic needed in the renderer), and reuses an already-proven,
  already-security-reviewed pattern (`contextBridge`/`ipcMain.handle`, `contextIsolation: true`)
  rather than introducing a new one.
- The new IPC channel's main-process handler must: (a) accept only a known-shape request (an asset
  path string matching an allowlisted prefix pattern, `generated/portal-catalog/**` /
  `generated/catalog-reference/**` only — reject anything else, mirroring the "IPC handlers must
  validate input" rule in `SECURITY.md`), (b) resolve the download URL and fetch server-side using
  the same Firebase Storage client SDK already used elsewhere in Studio (no new dependency), (c)
  return parsed JSON or a structured error, never a raw Node error object or stack trace to the
  renderer.

This must be folded into the Plan amendment as a firm decision, not left as an open option, before
implementation starts.

### 4. Required change — normal-browse failure fallback is approved as recommended, but must be explicit in the Plan, not just a recommendation

Review agrees with the amendment's own recommendation: **reuse the existing, already-correct,
already-bounded 100-document Firestore first page as the fallback** when the generated ready-index
fails to load. This is safe specifically because it is Studio's *existing production behavior today*
(not a new fallback being invented, unlike the Portal tag-count fallback that was rejected earlier in
this goal for being unbounded) — it already has a real `limit(101)` ceiling, existing 15s cache,
existing trace instrumentation. Fold this into the Plan as the decided behavior, not an open
question, and require: the fallback must log a structured "generated ready-index unavailable, used
bounded Firestore fallback" reason (dev-only), must never itself attempt to page-to-completion or
loop, and returning to the Design Library after a successful generated-asset recovery must not get
stuck on the fallback path (i.e., a later successful fetch must supersede a prior fallback state, not
be ignored because the page already "recovered" via fallback).

### 5. Required change — dynamic-narrowing scope-widening must be owner-decided, not shipped by default

Making tag-narrowing counts accurate catalog-wide (instead of today's loaded-pages-only scope) is a
**visible behavior change**, even though it is strictly an improvement. Per this Plan's own "UI/UX"
section ("Significant visible behavior changes return to Review/owner approval") and per the original
task's explicit instruction that "Existing Studio dynamic tag narrowing" must be preserved unchanged,
Review requires this be surfaced to the owner as an explicit yes/no, not silently shipped because it
falls out naturally from the new data source. If the owner does not explicitly confirm they want
catalog-wide-accurate counts, the safer default is to preserve exact current scope semantics (compute
narrowing only over whatever the user has "loaded" — which, once the full generated set is fetched up
front, has no natural analogue anymore, since there's no more incremental "Load more" fetch to gate on
— so in practice, once implemented, the counts will always become catalog-wide; the real owner
decision is simply "is that acceptable," not "how do we suppress it"). Ask the owner directly before
implementing.

### 6. Required change — exact new asset path, manifest field name, and payload budget must be fixed before implementation, not left as `[NEEDS REPO CHECK]`

The amendment correctly flags these as placeholders pending this Review. Review sets:

- **Path**: `generated/portal-catalog/v{contentVersion}/studio/ready-index.json` (as proposed).
- **Manifest field**: `studio.readyIndexPath` (as proposed) — a single fixed path, following the
  existing `filters.tagFacetPath` precedent (additive field, `PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION`
  unchanged, no dual-parser fallback required since no deployed consumer of the old shape needs to
  keep working through this change — Studio doesn't exist as a consumer yet).
- **Payload budget**: 512 KiB uncompressed ceiling, **provisional** — Test phase must measure the
  real dev-corpus size (ready-design count × average tag-array size + IDs) before this is treated as
  final; if measured size exceeds 80% of the ceiling, apply the same non-blocking diagnostic-warning
  pattern already used for the AI reference snapshot (R-013), not a silent pass.
- **Content shape**: `{ schemaVersion: 1, catalogVersion, generatedAt, designs: [{ id, tags:
  string[], updatedAtMs }] }` — order in the array **is** the canonical `updatedAt DESC, id DESC`
  order (no separate ordering metadata field needed; the array order **is** the order, exactly like
  every other Portal ID-list asset). Do not add fields beyond `id`/`tags`/`updatedAtMs` to this
  index asset — everything else (title, description, thumbnailPath, etc.) is already available from
  the existing card buckets, keyed by the same `id`; keeping this new asset minimal keeps its budget
  small and avoids duplicating card data across two assets.

### 7. Confirmed acceptable without further changes

- Reuse of existing card buckets and client taxonomy snapshot for card fields and categories — no
  new asset needed for either.
- No new Function, no new trigger, no new coordination document — only `publishPortal()` gains one
  build step, consistent with the existing `rebuildCatalogSnapshots` /
  `onPortalCatalogSnapshotSourceWritten` redeployment scope already tracked in this goal.
- No Storage Rules change for the new asset (existing `generated/portal-catalog/{allPaths=**}`
  wildcard already covers it) — but this must still be **proven** with a rules test, exactly as the
  tag-facet path was, not assumed.
- Reuse of the existing pure-function pattern (`intersectDesignIdLists`,
  `computeNarrowedTagFacets`-equivalent logic) at the shared-utility layer rather than
  reimplementing Studio-specific versions from scratch, provided Studio's own ordering/search
  semantics are preserved exactly as specified (Studio's functions must not silently become Portal's
  functions with different tiebreakers).

### 8. Owner decision — resolved

**Owner approved (2026-07-24):** dynamic tag narrowing becoming catalog-wide-accurate (rather than
today's loaded-pages-only scope) is acceptable, an intentional approved improvement.

Every gate identified by this amendment Review is now closed: Electron transport (IPC bridge),
normal-browse fallback (existing bounded Firestore page), asset path/manifest field/provisional
budget, and the one owner-only decision. **Implementation may begin.**

### Next Step

Implement per the amended Plan: shared/pure Studio ordering-and-narrowing utilities, the new
`generated/portal-catalog/v{contentVersion}/studio/ready-index.json` publisher step, the Electron
main-process IPC bridge for generated-asset fetches, a Studio-side consumer service mirroring
`portalCatalogAssetService.ts`'s cache/TTL/in-flight-dedup pattern, and the bounded Firestore
fallback. Run the full required test/verification suite and report per the task's required Final
Response format before requesting any deployment/republish/CORS/rules action (all remain gated
behind the existing, separate owner checkpoint).

---

## Amendment Review — Studio ordering correction and read attribution (2026-07-24)

**Verdict: approved**

Owner QA on generation 38 found the Studio ready catalog reshuffled on unrelated activity
(print-request/show/edit) and observed ~1,300 Firestore reads during the session. Both are addressed
below; the ordering fix is approved as scoped, no changes required.

### 1. Ordering root cause and fix — approved

Confirmed by direct inspection: `studioCatalogReadyOrder` sorted by `updatedAtMs`, which is bumped by
`requestCount`/`lastRequestedAt`/`lastAddedToShowAt`/edit writes — exactly matching the owner's
reported symptom. This mirrored Studio's own pre-existing Firestore-backed default sort field
(`updatedAt`), so the defect predates the generated-catalog work but was carried forward rather than
corrected. The owner's `createdAt DESC, id DESC` decision is approved: `createdAt` is proven
immutable after creation (Firestore rules enforce this on every `designs/{designId}` update; no code
path writes to it post-creation), so ordering by it structurally guarantees the exact invariant the
owner wants — a design's position never changes except when a newer design is created.

Approved without changes: field rename (`updatedAtMs` → `createdAtMs`) within the same schema
version (no deployed old-shape consumer to preserve compatibility for), no Portal impact (Portal's
own ordering was never touched), no backfill/migration (no evidence `createdAt` is ever missing, and
none is required even if a stray legacy document lacked it — the `?? 0` fallback is a safe default,
not a silent misuse of a different field).

### 2. Read attribution — approved, no further action required this pass

The ~1,300 reads reconcile almost exactly to `useCatalogTags({ includeArchived: true })`'s full
tag-collection pagination (~1,122 reads at the real dev-scale corpus, `TAG_LIST_PAGE_SIZE = 500`) plus
`useCategories()`'s bounded category load (≤200 reads) — both cached 12h, both **unconditional on
every Design Library mount**, and both **unchanged since before the Studio generated-catalog work
began**. This is not a regression introduced by this goal's Studio work; the design-card/browse path
itself is independently confirmed at zero Firestore reads.

**Noted but not actioned this pass:** the original Plan text already said categories should reuse the
generated client-safe taxonomy snapshot (`generated/catalog-reference/client/**`) rather than
`categoryService.listCategories`, but `DesignLibraryPage.tsx` still calls the Firestore-backed
`useCategories()` — an implementation gap against the already-approved Plan, not a new decision to
make. Converting it would remove up to 200 of the ~1,300 reads. The tag list
(`useCatalogTags`) legitimately needs Firestore today for `EditDesignModal`'s full approved-tag
picker and `computeFacetedTagsForDraftSelection`'s alias lookup — the Plan explicitly scoped
tag-taxonomy/alias data as out of scope (`aliases`/`preferredWhen` needed only by tag-management,
which keeps its Firestore path). Fixing the categories gap is **not required to close this specific
ordering-correction task** (it is a separate, already-implied cleanup) — Review recommends it as a
narrow, low-risk follow-up but does not block this amendment on it, since the current task's explicit
scope is the ordering defect and read attribution, not new implementation work.

### Next Step

Implement the ordering correction per the Plan amendment (already done in this pass — verified via
the full test suite and builds). Report the read attribution honestly (structural/code-based, since
no live Studio session or automation tooling is available in this environment to capture a real
trace). Surface the categories-conversion gap as an owner-visible finding, not a unilateral fix. Stop
at the owner checkpoint before any redeploy/republish.

---

## Amendment Review — Studio taxonomy read-gap closure (2026-07-24)

**Verdict: approved**

Owner directed closing the previously-surfaced (not yet fixed) gap: `useCategories()`/
`useCatalogTags()` unconditionally querying Firestore on every normal Design Library mount.

### Scope check — approved as implemented

Confirmed by direct inspection before any change: the Design Library's own `categories`/`catalogTags`
variables only ever feed read-only filter/dropdown/tag-picker logic (`buildCategoryFilterOptions`,
`computeFacetedTagsForDraftSelection`, `buildCatalogTagSuggestions`, `resolveCatalogTagCandidate`) —
never a management flow. `CategoryManagementModal`/`TagManagementModal` are the only consumers that
create/edit/archive/restore/reorder taxonomy records, and both are confirmed to still receive/use
full Firestore-backed data (`CategoryManagementModal` explicitly repointed at `firestoreCategories`;
`TagManagementModal` already called its own independent `useCatalogTags` with no prop dependency on
the page's variable at all). This is the correct scope boundary — Review would have required this
distinction if it had not already been drawn correctly.

### Reused asset — approved, no new generated contract

Correctly reuses the existing `generated/catalog-reference/**` snapshot Portal already publishes,
with no manifest/publisher change and therefore no Functions redeploy/republish requirement for this
specific fix — a materially smaller footprint than a new asset would have required, and consistent
with this goal's general principle of reusing existing generated data over minting new assets when
the existing shape already covers what's needed.

### `preferredWhen` search-matching removal — approved (already owner-confirmed via AskUserQuestion)

The one real behavior narrowing (tag-modal search no longer matches guidance text, only name/alias)
was correctly identified as a genuine tradeoff before implementation, and resolved by asking the
owner directly rather than assuming either "keep the Firestore read" or "silently drop the behavior."
Approved as scoped.

### Active-only category convention — approved, not a new risk

Correctly identified as matching Portal's own pre-existing, already-accepted limitation (same
snapshot, same active-only scope) rather than a new tradeoff invented for this fix. No further
action required.

### Next Step

Documentation and final combined deployment instructions (createdAt-ordering fix + this taxonomy
read-gap fix) are the only remaining items before the owner checkpoint. No further implementation
required. Stop before any deploy/redeploy/republish.

---

## Amendment Review — Separate Studio Firebase Debug Window (2026-07-24)

**Verdict: approved_with_changes**

A separate Electron renderer cannot observe the existing renderer-owned trace memory without an
explicit transport. Keeping the main Studio renderer authoritative and using Electron main only as a
sanitized snapshot/control broker is narrower than moving Firebase tracing into main and preserves
the approved service-layer instrumentation.

Implementation may proceed with these mandatory conditions:

1. Main validates that open/publish traffic originates from the retained main Studio window.
2. Creation independently requires unpackaged/development Electron and exact project ID
   `fresh-prints-dev`; renderer UI gating alone is insufficient.
3. IPC reuses the sanitized trace snapshot contract. No generic payload forwarding, raw Firebase
   errors, signed URLs, document contents, callable payloads, tokens, or customer data.
4. The debug renderer does not mount normal Studio routes or overwrite main route/action context.
5. Reset and tracing-toggle execute in the main renderer. Close never resets or disables tracing.
6. One debug window only; minimized windows restore; closed references clear; app shutdown closes it.
7. Portal's in-page panel and shared tracer/report behavior remain compatible.

No deployment, publication, `rebuildCatalogSnapshots`, production action, or diagnosis/fix of the
three owner-reported Studio issues is approved by this amendment.

---

## Amendment Review — Session Overrides and Targeted Card Publication (2026-07-24)

**Verdict: approved_with_changes**

The amendment is materially narrower than rebuilding or mutating existing bucket assets. An
optional immutable override asset preserves the established generated architecture while allowing
one event-carried public card to publish without rereading designs or taxonomy.

Implementation may proceed only with these conditions:

1. The override registry is service-owned and scoped to the authenticated Studio session; React
   route state is not authoritative.
2. Generated values clear an override only after all saved public card fields match. A merely newer
   unrelated version is insufficient.
3. Targeted assets are immutable/content-addressed. Existing card buckets are never overwritten.
4. Manifest swaps use Storage generation preconditions and bounded merge/retry so concurrent edits
   cannot silently discard one another.
5. Index/filter changes continue through the existing leased full publisher. Operational-only
   changes do not publish. Card-only changes must execute zero Firestore corpus queries.
6. A full publication folds current Firestore truth into base assets and drops obsolete overrides.
7. Accounting is development-only, sanitized, and contains counts/classification only.
8. Existing rollback remains valid: failure before manifest swap leaves the prior manifest active;
   previous content remains available.
9. Parser compatibility is additive and both Portal and Studio consumers must tolerate a manifest
   without an override reference.
10. No deployment, manual rebuild, republish, rules/index change, or production action is authorized.

Proceed to implementation and focused verification, then stop with exact development Functions
deployment and rollback instructions.

---

## Amendment Review — Remaining Targeted-Publication Attribution (2026-07-24)

**Verdict: approved**

The live accounting entry is sufficient to reject a speculative Firestore rewrite: the single
card-only execution already performed zero measurable Firestore reads. Expanding dev-only,
sanitized Storage/retry accounting is within the previously approved observability boundary.
Short-circuiting an identical existing override is safe and improves duplicate-delivery
idempotency without changing the manifest contract, immutable assets, or concurrency mechanism.
Using the CloudEvent timestamp makes duplicate delivery deterministic.

Implementation must retain the three-attempt maximum and generation-precondition merge, must not
query Firestore before classification, and must report Storage operations separately from Firestore
document reads. No deploy, rebuild, republish, rules/index change, or production action is approved.

---

## Amendment Review — Separate Portal Firebase Debug Window (2026-07-24)

**Verdict: approved_with_changes**

The main-tab ownership and same-origin `BroadcastChannel` design preserves the existing in-memory
tracer boundary and is narrower than moving trace ownership into a worker or backend. Implementation
may proceed with these conditions:

1. Only the app-wide eligible owner tab may initialize and publish a Portal trace session.
2. The debug route requires a live owner-token handshake and fails closed on direct access.
3. Channel messages use a strict discriminated schema and carry only sanitized snapshots or fixed
   commands; unknown/malformed messages are ignored.
4. Enable/disable and Reset execute in the owner tab without making the debug window authoritative.
5. One named popup is reused/focused; popup blocking is reported safely.
6. Owner refresh replaces the owner/session identity and stale snapshots are visibly rejected.
7. Inactive reports explicitly say inactive and cannot masquerade as completed zero-activity tests.
8. Existing development and exact-project gates remain independent in both owner and debug windows.

No Portal query change, Firebase deployment, republish, rebuild, rules change, production action, or
attribution of the observed idle spikes is approved.
# Formal Review Amendment — residual Portal mutation activity (2026-07-24)

Verdict: **APPROVED**

The amendment is evidence-bounded and preserves authorization, transactions, request integrity,
analytics counters, and generated-publication classification. Per-request client serialization
removes avoidable same-client transaction contention without weakening server enforcement. Direct
`update()` in the create trigger is safe because the originating callable has already validated the
ready design; a missing/deleted target fails rather than creating data. Empty-clear no-op behavior
is equivalent to the requested state and safely avoids an allocations query, parent timestamp
write, and empty batch. Allocatable-show behavior is accounting-only pending measured counts.

Required verification: pure queue/accounting/no-op tests, existing targeted-publication idempotency
tests, Portal typecheck/build, Functions build, changed-file lint, and diff check. Deployment,
Query Insights comparison, and live reconciliation remain owner checkpoints.
