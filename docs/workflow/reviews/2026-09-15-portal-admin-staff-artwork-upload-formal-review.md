# Formal Review: Portal Admin Staff Artwork upload

| Field | Value |
|---|---|
| Date | 2026-09-15 |
| Managed goal | `portal-admin-staff-artwork-upload` |
| Plan | `docs/workflow/plans/2026-09-15-portal-admin-staff-artwork-upload-plan.md` |
| Baseline | `b7a14e709c2e4fdc9d9648495b085be1881ddbe6` |
| Review boundary | Corrective review amendment → implementation/test and exact DEV Function deployment; no Signoff or production authorization |
| Amendment | Workstream B Owner DEV QA FAIL: Staff bulk 400, canonical lifecycle, Retry-failed accounting, and full-card Multiple Select |
| Verdict | **`approved_with_changes` — implementation/test complete; Owner DEV QA PASS; Signoff approved_with_notes** |

## Executive assessment

The amended Plan remains one bounded managed goal with two separate workstreams. Workstream A is a
small extension of the existing isolated Portal Admin area and does not create a second Staff
Artwork library, artwork type, processing pipeline, or customer-facing access path. The lowest safe
reuse seam remains available: Portal can call the existing owner/admin-only
`createStaffArtworkUpload` and `finalizeStaffArtwork` callables, and can upload the returned source
object with the same browser Firebase Storage resumable transport already used by Studio and Portal.

Workstream B is appropriately framed as UI orchestration around existing per-item Studio
boundaries. The repository proves the Staff Artwork promotion callable is idempotent and the
existing background enqueue helper is sequential. The original implementation then introduced a
material lifecycle mismatch: a Ready-preserving `aiReprocessState` seam kept raw `ready` +
`approved` records visible in the Design Library while they also appeared in AI Review. Owner DEV QA
rejected that dual authority. The active corrective restores the canonical `ready` + `approved` →
`imported` + `pending` → normal approval → Ready lifecycle; the existing ready-safe Catalog
Reprocessing worker remains a separate durable backfill flow, not normal AI Review.

The design is approved with implementation conditions because the failure/retry boundary needs to be
implemented carefully. The current backend has no Staff Artwork watchdog or dedicated retry Function,
and the create callable can overwrite a record if a ready ID is blindly submitted again. The Plan’s
same-ID recovery sequence is acceptable only if it first probes state through the existing finalize
callable, treats a ready response as terminal success, and never blindly auto-creates after an
unknown result.

The amended Plan therefore has a hard pre-implementation lifecycle condition: the owner must choose
and approve a ready-preserving per-design AI Review contract, or explicitly accept the current
demotion as an exception. No speculative backend lifecycle change is authorized by this review.

This review does not authorize application code, Functions, Rules, Storage, indexes, deployment,
Studio release, commit, push, or data mutation.

## Evidence checked

- FreshForge gate/state: `docs/AI_RULES.md`, `.cursor/workflow/state.md`, and
  `references/project-chatgpt-handoff/CURRENT-STATE.md`.
- Architecture and controls: `docs/architecture/ARCHITECTURE.md`, `DATA_MODEL.md`, `BACKEND.md`,
  `FIREBASE.md`, `docs/project/DECISIONS.md`, `ROADMAP.md`, `docs/standards/SECURITY.md`,
  `TESTING.md`, and `DEPLOYMENT.md`.
- Existing Portal Admin route/layout/auth/shell/provider files and Admin contract tests.
- Existing Studio Staff Artwork page/service and browser upload behavior.
- Existing Studio Design Library page/grid/card, Design Details Ready reprocess service/callable,
  ready-catalog reprocess worker, and AI Enrichment queue/pipeline.
- Existing AI Review multi-select state/range-selection helpers and sequential bulk reprocess helper.
- Existing Studio Auto-process preference, background FIFO queue, persisted AI Enrichment settings,
  and catalog automation decision points.
- `functions/src/staffArtwork.ts` and `functions/src/lib/customerUploadProcessing.ts`.
- Shared Staff Artwork storage-path helpers, `firestore.rules`, `storage.rules`, and
  `firestore.indexes.json`.
- Prior `portal-admin-daily-show-queue`, `studio-staff-artwork-library-and-print-request-source`,
  and historical reconciliation Admin artifacts.
- Current branch/commit/alignment and cumulative promotion manifest.

## Formal checklist

| Area | Verdict | Finding |
|---|---|---|
| Scope | pass | Upload-only Portal Admin convenience page; Studio remains the management surface. |
| Route | pass | Exact App Router path is `apps/portal/app/(admin)/admin/staff-artwork/page.tsx`, resolving to `/admin/staff-artwork`. |
| Admin shell | pass with condition | Extend `PortalAdminShell` with two compact links and active state; do not create a second shell or mount customer navigation/providers. |
| Auth | pass | Existing Admin gate denies helpers/customers/guests; both callables independently require active owner/admin. Return-to allowlist must include both Admin paths. |
| Upload transport | pass | Existing browser `uploadBytesResumable` contract is sufficient; no Electron dependency is needed. |
| Callable reuse | pass | Existing `createStaffArtworkUpload` and `finalizeStaffArtwork` can be called unchanged. |
| Processing | pass | Finalization reuses `processCustomerUploadImageBytes` and `saveCustomerUploadProcessedOutputs` with the established Staff Artwork adapter. |
| Defaults | pass | PNG-only, server-generated 10-character title, source filename, omitted description, unassigned customer, Auto background. |
| Multi-file | pass | Studio already performs independent sequential uploads; no batch backend is introduced. |
| Retry/idempotency | pass with condition | Known IDs can be retried through existing finalize/create behavior, but ready state must be established before any create retry. Unknown create results must not trigger unbounded duplicate attempts. |
| Firestore Rules | pass | No Rules change; the Portal page does not read `staffArtworks`. |
| Storage Rules | pass | Existing owner/admin canonical PNG source rule already protects the direct upload; derivative writes remain trusted. |
| Privacy | pass | No customer access, public indexing, raw path/URL exposure, metadata management, or customer side effect is added. |
| Studio parity | pass with condition | Portal must send the same defaults and use the same callable/processor/storage contracts; no Portal-specific record branch. |
| Promotion boundary | pass with condition | Combined expected delta is Portal production App Hosting plus Studio release; Functions is conditional on the approved Ready-preserving lifecycle; Rules/Storage/indexes remain none. |
| Testing | pass with condition | Original Portal coverage remains intact and the amendment adds selection, lifecycle, idempotency, authorization, settings inheritance, partial-failure, and single-item regression coverage. |

### Workstream B checklist

| Area | Verdict | Finding |
|---|---|---|
| Combined scope | pass with condition | Workstream B is added to the same managed goal and eventual Implement → Test → Owner DEV QA cycle; no unrelated bulk editing or new workspace is included. |
| Design Library selection | pass with condition | No generic multi-select exists today. A new local mode may reuse neutralized AI Review toggle/range primitives while remaining separate from Print Request selection and archived purge selection. |
| Design Library single-item reuse | pass with condition | The exact service/callable is proven, but its current Ready → imported demotion conflicts with the amendment’s approved-catalog visibility requirement. |
| Ready lifecycle | **blocking condition** | `reprocessReadyDesignWithAi` demotes and removes the card from Ready browse. `ready_backfill` preserves Ready but does not provide the requested normal AI Review queue semantics. Owner must approve the final per-design lifecycle contract before implementation. |
| Design Library authority | pass | Individual Ready reprocess is active-owner-only in both Studio permission service and callable. Bulk must not broaden it. |
| Staff Artwork selection | pass with condition | Add a separate normal-library mode; do not reuse Print Request quantity/save semantics. Select only ready, non-archived cards and defer race-time truth to the existing callable. |
| Staff Artwork promotion | pass | `staffArtworkService.promote` → `promoteStaffArtworkToAiReview` is the canonical per-item boundary; it creates/links one catalog design and returns `alreadyPromoted` without duplicating. |
| Staff Artwork authority | pass | Active owner/admin only; callable enforcement remains canonical and helpers remain denied. |
| AI queue/settings | pass with correction | Auto/manual start is governed by Studio localStorage `fresh-prints.ai-processing.auto-process`; server `catalogWorkflowMode`/`catalogAutonomousLiveEnabled` govern downstream automation. Bulk must reuse the existing helper without force. Current Staff Artwork single-item `{ force: true }` must be corrected and regression-tested. |
| Bulk execution | pass | Per-item calls, dedupe, concurrency one, independent outcomes, no automatic retry of unknown results, and compact result reporting match existing FIFO/AI Review patterns. |
| Failure/refresh safety | pass with condition | Disable submission while accepted, preserve server idempotency, refresh after handoff, and retain only failed IDs for retry. |
| Backend boundary | pass with condition | No new batch entity or AI pipeline. A Functions change is conditional only if required to implement the approved Ready-preserving Design Library contract. |
| Rules/schema/indexes | pass | No Rules, index, schema, migration, or backfill change is planned. |
| Deployment impact | pass with condition | Portal App Hosting and Studio release are expected; Functions is conditional on the lifecycle contract; Rules/Storage/indexes remain none. |
| Test coverage | pass with condition | The amended Plan adds lifecycle, selection, idempotency, authority, settings inheritance, partial-failure, and single-item regression coverage. |

## Required implementation conditions

1. Keep the implementation in the existing `(admin)` route group and `PortalAdminShell`. Admin nav
   must remain separate from the customer Portal shell and providers.
2. Scope the existing Show Queue picker behavior so the Staff Artwork route does not acquire a
   library/read path or unrelated Show Queue UI/data behavior.
3. Use the exact callable names and payload semantics already reviewed. Do not add a Portal-specific
   Function, Firestore write, Staff Artwork collection query, batch entity, or processing helper.
4. Use `getStaffArtworkSourceStoragePath` for same-ID recovery and upload only the canonical source
   object with exact `image/png` metadata. The UI must never expose source/production paths or
   derivative URLs.
5. Preserve the safe retry sequence: a known ID may call existing finalize; a ready response ends
   the flow successfully; only an absent/non-ready record may proceed to create/reuse and source
   upload. Disable overlapping retries per item. Do not auto-repeat after an unknown create result.
6. Treat `finalizeStaffArtwork` response `status: "failed"` and callable transport failures as
   failures, not upload success. Keep bounded server error text and never synthesize `ready`.
7. Keep multi-file processing sequential and independent. One failed file must not hide the status
   of other files or cause a batch-level backend mutation.
8. Preserve the existing Admin return-to security validation and add tests for both Admin paths.
9. If implementation discovers that the existing callable cannot support the specified recovery
   sequence without a backend contract change, stop and amend the Plan/Review before coding that
   backend change.
10. Do not implement Workstream B against the current `reprocessReadyDesignWithAi` behavior without
    owner approval of the resulting lifecycle. The preferred implementation must keep an existing
    approved design visible and `ready` while it enters the reviewed AI workflow, or the owner must
    explicitly accept the current temporary demotion as an exception.
11. Do not repurpose `startCatalogReprocessJob`/`ready_backfill` as if it were the normal AI Review
    queue. Its Ready-preserving semantics are evidence for a possible backend seam, not automatic
    approval to change its control-plane meaning.
12. Keep Design Library bulk authority owner-only and Staff Artwork bulk authority active
    owner/admin-only. UI selection is not an authorization boundary; backend checks and per-item
    revalidation remain mandatory.
13. Use the existing Studio Auto-process preference and queue helper without adding a toggle,
    invented mode, or `force: true` bulk path. Correct the current Staff Artwork individual call’s
    force override so single and bulk behavior obey the same setting contract.
14. Submit selected items through existing per-item boundaries with concurrency one. Dedupe IDs,
    disable duplicate submission, isolate failures, report already-current/ineligible outcomes, and
    retry failed items only after the server result is known.
15. Preserve Print Request selection mode, archive purge selection, search/filter/sort/page/scroll
    behavior, normal Design Details behavior, and all existing AI Review tabs. No metadata/archive/
    delete bulk action may be added under this amendment.
16. Freeze the corrective Functions file set and callable/pipeline contract before DEV deployment:
    the actual changed exports are `promoteStaffArtworkToAiReview`, `reprocessReadyDesignWithAi`,
    and `enqueueAiEnrichment` through shared pipeline bytes; deploy only those exports to DEV.

### Historical owner-authorized contract freeze — revoked by Owner DEV QA

The owner previously accepted the revised Plan and Formal Review, selected the preferred
Ready-preserving lifecycle, and authorized continuous Implement → Test → QA preparation. Owner DEV
QA later revoked that choice after observing dual Design Library/AI Processing visibility and
Retry-failed misclassification. The active contract is documented in the corrective amendment at
the end of this review: normal `imported`/`pending` AI Review lifecycle, no `ready_reprocess` mode,
no obsolete `aiReprocessState` UI/query seam, and the same existing queue/settings/approval
boundaries for single and bulk. Staff Artwork continues to use the existing promotion callable and
non-forced sequential queue helper, with idempotency and failed-ID-only retry.

## Required focused coverage

The implementation must add/update tests for:

- exact route and shell navigation order/active state;
- Show Queue regression and absence of customer shell/providers;
- owner/admin access and helper/customer/guest denial;
- login `returnTo` for both Admin destinations;
- PNG validation, empty browser MIME fallback, source path, `image/png` metadata, and 80 MB limit;
- exact create/finalize names and default payloads;
- resumable progress, 540-second finalize timeout, ready/failed handling, known-ID recovery,
  ready idempotency, and no unbounded duplicate retry;
- sequential multi-file state and upload-more behavior;
- no `staffArtworks` Portal read and no customer-only quota/consent/notification/catalog/retention
  side effects;
- existing Staff Artwork Firestore/Storage focused regressions;
- Portal typecheck, targeted lint, Portal build where feasible, and `git diff --check`.

Workstream B must additionally cover:

- Design Library Multiple Select entry/cancel, card toggle/deselect/highlighting, selected count,
  optional Shift+click range, filtered and loaded-page behavior, preserved scroll, and normal
  Design Details behavior;
- no conflict with Print Request selection or archived purge selection;
- exact Ready/non-archived/catalog-valid eligibility, active-job exclusion, backend revalidation,
  approved-catalog lifecycle preservation under the owner-approved contract, duplicate/double-submit
  safety, selection cleanup, partial failures, and failed-item-only retry;
- Staff Artwork multiple selection, owner/admin success, helper denial, ready/non-archived
  eligibility, existing single-item promotion regression, already-promoted idempotency, no
  duplicate catalog design, source-card reconciliation, and partial failures;
- reuse of the existing AI queue, strict sequential invocation, Auto-process on and off/manual
  waiting behavior, no bulk force override, and no duplicated setting interpretation;
- unchanged AI Review Processing/Needs Review/Rejected visibility and autonomous approval behavior;
- Studio typecheck, focused Design Library/Staff Artwork/AI queue tests, targeted lint, and
  Functions build/tests if the lifecycle contract changes Functions.

No application test has been run or claimed in this Plan/Review-only phase.

## Amendment answer audit

The amended Plan contains the required explicit answers. Formal Review confirms their dispositions:

| # | Reviewed answer | Disposition |
|---:|---|---|
| 1 | Design Library has no reusable generic AI multi-select; only purge and Print Request selection exist. | Confirmed |
| 2 | AI mode stays separate from Print Request URL/quantity/save state; only neutral primitives may be shared. | Required |
| 3 | Reuse `designReprocessWithAiService` → `reprocessReadyDesignWithAi`, with the existing Auto-process enqueue step. | Confirmed with lifecycle condition |
| 4 | Current path demotes/removes Ready; `ready_backfill` preserves Ready but is not normal AI Review. | Blocking finding |
| 5 | Active-stage/staleness checks, attempt-ID claims, and guarded reconciliation prevent duplicate active jobs. | Confirmed |
| 6 | Reuse `staffArtworkService.promote` → `promoteStaffArtworkToAiReview`. | Confirmed |
| 7 | Existing promotion links one catalog design, copies canonical derivatives, and removes the private source record after handoff. | Confirmed |
| 8 | Existing callable returns `alreadyPromoted` and existing design ID; bulk treats it as an idempotent no-op. | Confirmed |
| 9 | Staff Artwork selection is ready + non-archived; callable revalidates technical/promotion eligibility. | Required |
| 10 | Design Library authority is active owner only. | Confirmed |
| 11 | Staff Artwork promotion authority is active owner/admin; helpers remain denied. | Confirmed |
| 12 | Client start gate is localStorage `fresh-prints.ai-processing.auto-process`; server catalog settings govern downstream automation, not start. | Confirmed |
| 13 | Client queue checks Auto process; server pipeline evaluates current persisted settings at worker time. | Confirmed |
| 14 | Bulk inherits settings by calling the existing non-forced FIFO queue; current Staff Artwork `force: true` needs correction. | Required |
| 15 | Per-item existing boundaries are used; no new batch seam is introduced. | Required |
| 16 | Concurrency one, dedupe, no unknown-result auto-retry, and failed-item-only retry. | Required |
| 17 | Reuse AI Review toggle/highlight/optional range/Cancel/count conventions without merging domain state. | Required |
| 18 | Exact Studio files and conditional existing Functions seam files are listed in the amended Plan. | Confirmed with lifecycle condition |
| 19 | Portal and Staff Artwork orchestration require no Functions change; Ready-preserving Design Library behavior may require one. | Confirmed with lifecycle condition |
| 20 | Portal App Hosting + Studio release are expected; Functions is conditional; Rules/Storage/index/schema remain none. | Confirmed with lifecycle condition |

## Promotion and operational review

The cumulative manifest must receive one combined new entry only at Signoff, based on actual
implementation bytes and evidence. The amended expected entry is:

- Portal production App Hosting publication: required when promoting to production;
- Studio release: required for Workstream B UI bytes;
- Functions: none for Portal/Staff Artwork orchestration, but required if the approved
  Ready-preserving Design Library contract changes existing Functions bytes;
- Firestore Rules: none;
- Storage Rules: none;
- indexes/migrations/backfills: none;
- production smoke: Admin nav + one Portal PNG upload; Design Library and Staff Artwork bulk
  actions; AI Review Processing/Needs Review visibility; and existing Show Queue smoke.

No DEV App Hosting, production App Hosting, Functions deployment, Rules deployment, Storage Rules
deployment, Studio release, IAM action, or production smoke is authorized by this review.

## Verdict and next step

**Verdict: `approved_with_changes`.** The combined Plan is suitable for implementation after the
implementer honors the Portal retry/idempotency conditions, the Studio authorization/settings/queue
boundaries, and the owner-authorized Ready-preserving contract freeze above. The verdict remains
subject to the required Test gate and Owner DEV QA; it is not production authorization.

The owner has supplied the explicit instruction and lifecycle choice:

> **Accept revised Plan + Formal Review; authorize Implement → Test.**

Proceed through implementation and Test, then stop for Owner DEV QA. No production deployment,
publication, Studio release, Rules/Storage Rules deployment, data mutation, commit, or push is
authorized. The final manifest delta must be based on actual changed bytes and test evidence.

## Corrective formal-review amendment — Owner DEV QA FAIL — 2026-09-15

Owner DEV QA rejected the Ready-preserving dual-visibility outcome and reported two Workstream B
failures. This amendment keeps the original review and owner-selected Ready-preserving decision as
history, but revokes that decision for the active corrective implementation. The owner authorized
continuous investigation → correction → test → exact DEV deployment where required, then a stop at
Owner DEV QA. It does not authorize Signoff, production action, commit, or push.

### Reviewed Staff Artwork finding

The review of actual code and DEV evidence found that bulk and single promotion converge on
`staffArtworkService.promote`, with the same `promoteStaffArtworkToAiReview` callable and exact
`{ staffArtworkId }` payload. The historic DEV 400 traces were authenticated but did not capture the
request body or an app-level error, so an exact historic selected ID cannot be proven from logs.
The callable's actual failure branches are `failed-precondition` for deletion blockers or an
invalid Ready/production-path lifecycle. Current read-only DEV inspection supplies concrete active
reference blockers on five ready records; no bypass is acceptable.

The approved smallest correction is safe diagnostics: server logs/details include a bounded reason,
blockers, and safe record state; the client preserves callable code/message/details in bulk failure
reporting. Promotion safety remains unchanged: owner/admin only, helper denied, existing
idempotency/no duplicate design, sequential per-item execution, partial failure isolation, and
existing Auto-process preference.

### Reviewed lifecycle replacement

The active lifecycle acceptance criterion is:

`ready + approved` → normal `imported + pending` AI Processing/AI Review → normal approval →
`ready + approved`.

Design Library must remove an accepted design from the normal Ready browse while it is processing;
there must be no simultaneous Ready Catalog and AI Review authority. The corrective removes the
obsolete `aiReprocessState` dual-visibility seam and `ready_reprocess` mode, restores normal retry,
reprocess, delete/archive, and AI Review multi-select semantics, and makes single/bulk use the same
canonical transition. Auto on starts through the existing enqueue contract; Auto off leaves the
normal manual Start AI waiting state. The bulk result records accepted/already-terminal outcomes as
success and reports only actual failed status/stage as failure.

Read-only DEV inspection found five archived records with obsolete `aiReprocessState` metadata;
they are reported as historical cleanup candidates only and were not mutated.

### Reviewed full-card interaction addendum

In both Design Library and Staff Artwork, Multiple Select is reviewed as a mode-level interaction
contract: the full eligible card toggles selection, selected cards toggle off, image/title/content
do not open the normal details/preview behavior, selected state is visible and exposed to assistive
technology, and Enter/Space toggles where the card is keyboard-interactive. Exiting the mode
restores normal card behavior. No Shift+click range implementation exists in either current
library, so no range behavior is removed or altered.

### Corrective gate and verdict

The actual implementation diff changes exactly these deployed exports: `promoteStaffArtworkToAiReview`,
`reprocessReadyDesignWithAi`, and `enqueueAiEnrichment`. Test/build evidence must precede deployment
of only those exports to `fresh-prints-dev`; ACTIVE status and safe post-deploy checks are required.
No DEV App Hosting, unrelated DEV Function, production deploy, Rules/Storage Rules change, data
mutation, commit, or push is in scope.

**Corrective review disposition: `approved_with_changes` for implementation/test and Owner DEV QA
retest.** The goal remains open and must stop at Owner DEV QA; this amendment is not Signoff.
