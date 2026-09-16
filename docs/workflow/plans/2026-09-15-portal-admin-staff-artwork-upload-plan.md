# Plan: Portal Admin Staff Artwork upload

| Field | Value |
|---|---|
| Date | 2026-09-15 |
| Managed goal | `portal-admin-staff-artwork-upload` |
| Repository baseline | `b7a14e709c2e4fdc9d9648495b085be1881ddbe6` |
| Branch/alignment | `development`; local `development` = `origin/development` |
| Working tree | Clean before this documentation change |
| Workflow boundary | Corrective Implement → Test → exact DEV Function deploy → Owner DEV QA; no Signoff, production, commit, push, or data mutation |
| Amendment | 2026-09-15 — Owner DEV QA FAIL: Staff bulk 400, canonical lifecycle correction, and full-card Multiple Select addendum |
| Status | **Owner DEV QA PASS; Signoff and durable documentation closeout in progress** |

## Goal and scope

This managed goal now contains two separate workstreams:

- **Workstream A — Portal Admin Staff Artwork Upload + Admin navigation:** add a small,
  upload-only Portal Admin page for active owners/admins. It accepts PNG files from a normal browser
  file picker and sends each file through the existing Staff Artwork create → Storage source upload
  → finalize pipeline. A ready result must be the same private `staffArtworks` record and canonical
  derivatives that Studio uses.
- **Workstream B — Studio Design Library + Staff Artwork Multiple Select → Send to AI Review:**
  add a normal, temporary multiple-selection mode to both Studio libraries. The action is only
  orchestration around the existing trusted per-item AI enqueue/reprocess/promotion boundaries;
  it must not create a second AI pipeline or override the current AI processing settings.

For Workstream A, the existing isolated Portal Admin shell gains two compact destinations, in this
order:

1. `Show Queue` → `/admin/show-queue`
2. `Staff Artwork Upload` → `/admin/staff-artwork`

The page does not browse or manage the library. Customer association, metadata editing,
archive/restore, delete, AI Review, promotion, request attachment, and all customer-facing behavior
remain in Studio or their existing boundaries.

Workstream B does not add customer-facing behavior, a new AI Review workspace, bulk metadata or
archive/delete actions, new AI models/prompts/settings, a new batch collection/job architecture,
mass Ready Catalog reprocessing, Portal AI controls, or any production action. The two Staff Artwork
touchpoints remain separate: Portal creates private Staff Artwork records; Studio promotes existing
Staff Artwork records through the established catalog handoff.

## Gate and prior-state checks

- `docs/AI_RULES.md`, `.cursor/workflow/state.md`, `references/project-chatgpt-handoff/CURRENT-STATE.md`,
  required architecture/security/testing/deployment docs, and the listed handoff summaries were
  read before planning.
- The prior goal `historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening`
  is closed, signed off, and IDLE. No production authorization carries forward.
- The checkout is on `development` at `b7a14e709c2e4fdc9d9648495b085be1881ddbe6`, equal to local
  `development` and `origin/development`, with no pre-existing working-tree changes.
- The cumulative manifest remains authoritative at
  `docs/workflow/reviews/2026-09-pre-production-promotion-manifest.md`; this goal does not replace
  or rewrite prior entries.

## Repository findings and answers to the required investigation

### Existing Studio upload path

The current path is:

`StaffArtworkPage` → `staffArtworkService.createAndUpload` →
`createStaffArtworkUpload` → browser Firebase Storage resumable upload to the returned canonical
source path → `finalizeStaffArtwork` → shared technical processor/output writer → `staffArtworks`
ready record and derivatives → Studio `getById` refresh.

Exact inspected files:

- `apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx`
- `apps/studio/src/renderer/src/features/staff-artwork/services/staffArtworkService.ts`
- `functions/src/staffArtwork.ts`
- `functions/src/lib/customerUploadProcessing.ts`
- `packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.ts`
- `firestore.rules`
- `storage.rules`

`staffArtworkService.createAndUpload` first checks `canManageStaffArtwork`, accepts only PNG,
calls `createStaffArtworkUpload` with the source filename/content type, uploads with
`uploadBytesResumable`, then calls `finalizeStaffArtwork`. It reports upload/process phases and does
not read the private library from Portal.

### Existing Functions and whether Portal can call them unchanged

Portal can call the existing Functions unchanged:

- `createStaffArtworkUpload`: fresh callable auth/profile/active-role check, owner/admin check,
  canonical processing record creation, source path return, and server defaults.
- `finalizeStaffArtwork`: fresh callable auth/profile/active-role check, canonical source and
  Storage metadata validation, image processing, derivative writes, auto-background resolution,
  and `ready`/`failed` response.

No new callable, batch collection, status watcher, or alternate backend API is planned.

`finalizeStaffArtwork` already safely handles a ready record as idempotent and can retry a failed
record after re-reading its source. The Portal adapter will retain the created ID in in-memory item
state and retry using that same ID. To prevent duplicate records when the initial create response is
lost, the adapter should generate a valid client request ID, pass it as the existing optional
`staffArtworkId`, and use this safe recovery sequence before creating again: attempt finalize by ID;
if the record is absent, create/reuse that same ID, upload the canonical source, then finalize. It
must never blindly re-create an ID after a ready response. If the browser loses the create response
and the recovery call cannot establish the record state, the UI reports a retryable failure rather
than silently claiming ready or auto-starting an unbounded duplicate.

The current Staff Artwork backend has no separate retry callable or watchdog. This plan uses the
existing retryable create/finalize behavior only; it does not invent a watchdog or background batch
model. Formal Review must confirm this bounded behavior is sufficient for v1.

### Storage and processing

The source upload is already browser-compatible. Studio uses Firebase browser `uploadBytesResumable`
with the returned path; Portal already has the same Firebase client, Storage SDK, and upload pattern
in `customerUploadService`. The Studio Staff Artwork service has no Electron/local-filesystem
dependency in its upload transport.

The Portal service will use the existing shared path helper for recovery and the returned callable
path for the normal flow. It will not copy image-processing code. `finalizeStaffArtwork` continues
to call `processCustomerUploadImageBytes` with Staff Artwork’s reviewed
`skipCustomerQualityGates: true` adapter behavior and writes through
`saveCustomerUploadProcessedOutputs`.

Existing source contract:

- browser picker: `accept="image/png,.png"`, with MIME-or-extension validation for browsers that
  provide an empty `File.type`;
- upload metadata normalized to `image/png`;
- server and Storage Rules enforce exact `image/png` and the existing 80 MB ceiling;
- canonical paths are `/staff-artwork/{staffArtworkId}/source`, `production.png`,
  `production.interactive.png`, `preview.webp`, and `thumbnail.webp`.

No Firestore Rules change is required. `staffArtworks` client reads/writes remain private/staff-only
and denied for Portal use; the new page does not list or get `staffArtworks`. No Storage Rules
change is required. The existing owner/admin source create rule is already the required boundary,
and derivative writes remain trusted backend writes. No index change is required.

### Defaults and parity

Portal will submit the same operational defaults as a simple Studio upload:

- title: omit the optional title so the existing server `generateDefaultStaffArtworkTitle` creates
  the reviewed 10-character title; this avoids a second filename/title rule;
- source filename: pass the browser `File.name` unchanged through the existing bounded field;
- description: omitted;
- customer: `null` / unassigned;
- background: `artworkBackgroundChoice: "auto"`; no Portal Auto/Light/Dark control is added because
  the current Studio default is Auto and finalization reruns server-side detection;
- AI Review, catalog intake, notifications, customer consent, and retention: unchanged and absent.

### Single versus multiple files

The current Studio page already accepts multiple PNGs and processes them independently in a
sequential loop; there is no Staff Artwork batch backend. Portal v1 will therefore support the same
native multi-file selection and process items sequentially. Each item has independent queued,
uploading, processing, ready, or failed state. No batch collection, concurrent finalization policy,
or new Function is introduced. The UI can select one file just as naturally as several and can add
another selection after completion.

## Proposed implementation

### Route and isolated shell

Create the App Router entry:

- `apps/portal/app/(admin)/admin/staff-artwork/page.tsx`

This resolves publicly to `/admin/staff-artwork` and inherits the existing `(admin)/layout.tsx`
with `PortalAdminAuthGate` and `PortalAdminShell`.

Update the existing shell in place rather than creating another shell:

- add a compact `nav` with the two links and `aria-current`/active styling;
- make the displayed admin title route-aware (`Admin · Show Queue` or
  `Admin · Staff Artwork Upload`);
- preserve logo, staff identity, theme toggle, sign out, and the existing Show Queue picker;
- keep the Show Queue picker context scoped to its existing use, so the upload route does not gain
  unnecessary Show Queue data/UI behavior;
- keep the navigation outside the customer Portal sidebar/providers and retain the current admin
  mobile layout/touch-target tokens.

Update admin auth return handling so both `/admin/show-queue` and `/admin/staff-artwork` are valid
admin destinations after login. Guests retain the existing `returnTo` flow; helpers, customers, and
inactive/unknown users remain denied by the existing gate and fresh callable checks. Denial copy may
be made route-neutral, but authorization semantics must not change.

### Page, hook, and service

Add a new Portal feature folder:

`apps/portal/features/admin-staff-artwork/`

Planned pieces:

- `pages/PortalAdminStaffArtworkPage.tsx`: composition only; no Firebase calls;
- `components/PortalAdminStaffArtworkUploadForm.tsx`: accessible file input, selection list,
  upload action, per-file progress/status, bounded errors, ready confirmation, and “upload more”;
- `hooks/usePortalAdminStaffArtworkUpload.ts`: selection, sequential orchestration, local item
  state, object URL cleanup if previews are used, cancellation/unmount guards, and retry transitions;
- `services/portalAdminStaffArtworkService.ts`: callable/storage adapter using Portal Firebase
  clients, `callTracedFunction`/the existing traced callable wrapper, `uploadBytesResumable`, and the
  existing shared Staff Artwork source-path helper;
- `types/portalAdminStaffArtwork.types.ts`: narrow transport/UI types only, matching the current
  callable response/status contract; this is not a second Staff Artwork entity;
- `adminStaffArtworkUpload.contract.test.ts`: service/page contract coverage and no-private-library-
  read assertions.

Service behavior:

1. Validate file name/type and existing 80 MB limit before a callable request.
2. Generate one valid per-item recovery ID and call `createStaffArtworkUpload` with that ID,
   `sourceFileName`, `contentType: "image/png"`, `customerId: null`, and background `auto`.
3. Save the returned ID/path before starting Storage upload.
4. Upload only the canonical `source` object with resumable progress and `image/png` metadata.
5. Call `finalizeStaffArtwork` with the existing 540-second timeout used for image processing.
6. Treat callable `status: "ready"` as success and `status: "failed"` as a visible bounded failure;
   never infer readiness from upload completion alone.
7. Retry a known item by reusing its ID: finalize existing source first where appropriate, or
   create/reuse the processing record, re-upload source, and finalize. Do not read private
   Firestore documents or expose source/production paths to the UI.

The page will show the selected filename as local transient UI only. It will not show derivative
URLs or add a Portal Staff Artwork preview path.

### Visual and device behavior

Extend the existing common Admin stylesheet:

- `apps/portal/styles/admin-show-queue.css`

Use semantic existing Portal tokens, borders/cards, responsive wrapping, and the established touch
target minimums. The file picker is authoritative on desktop, laptop, phone, and tablet. Drag/drop
is not required. There is no camera auto-capture, Electron API, Windows path assumption, customer
navigation, or library grid.

## Exact planned file set

### Application files

- `apps/portal/app/(admin)/admin/staff-artwork/page.tsx` — new route entry.
- `apps/portal/features/admin-show-queue/components/PortalAdminShell.tsx` — common two-link nav,
  active state, route-aware title, and existing picker scoping.
- `apps/portal/features/admin-show-queue/components/PortalAdminAuthGate.tsx` — route-neutral admin
  denial/loading copy only if required; no auth broadening.
- `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts` — Show Queue/nav/shell
  regression and no-customer-provider assertions.
- `apps/portal/features/admin-staff-artwork/pages/PortalAdminStaffArtworkPage.tsx` — new page.
- `apps/portal/features/admin-staff-artwork/components/PortalAdminStaffArtworkUploadForm.tsx` —
  new upload UI.
- `apps/portal/features/admin-staff-artwork/hooks/usePortalAdminStaffArtworkUpload.ts` — new local
  upload state/orchestration.
- `apps/portal/features/admin-staff-artwork/services/portalAdminStaffArtworkService.ts` — new
  Portal adapter around existing callable/Storage contracts.
- `apps/portal/features/admin-staff-artwork/types/portalAdminStaffArtwork.types.ts` — narrow local
  transport/UI types.
- `apps/portal/features/admin-staff-artwork/adminStaffArtworkUpload.contract.test.ts` — new
  focused contract tests.
- `apps/portal/features/auth/utils/portalReturnUrl.ts` — allow the new admin path for admin
  post-auth routing.
- `apps/portal/features/auth/utils/portalReturnUrl.admin.test.ts` — new-route returnTo and fallback
  regression cases.
- `apps/portal/styles/admin-show-queue.css` — shared Admin nav/upload responsive styles.

### Explicitly unchanged runtime boundaries

- `functions/src/staffArtwork.ts` — use existing `createStaffArtworkUpload` and
  `finalizeStaffArtwork`; no new Function.
- `functions/src/lib/customerUploadProcessing.ts` — reuse only; no processing fork.
- `firestore.rules` — no change.
- `storage.rules` — no change.
- `firestore.indexes.json` — no change.
- Studio Staff Artwork components/service — no redesign or Portal-specific branch.
- Customer Portal providers, navigation, upload behavior, and Staff Artwork privacy — unchanged.

### Documentation and signoff reconciliation files

If implementation changes behavior exactly as planned, update the relevant durable documentation in
the same implementation/signoff pass, narrowly:

- `docs/project/DECISIONS.md` — amend ADR-FP-187 to record the owner/admin upload-only exception
  and the no-library-read boundary.
- `docs/architecture/BACKEND.md` — document Portal’s use of the existing Staff Artwork callables.
- `docs/architecture/FIREBASE.md` — document the Portal source-upload boundary and unchanged rules.
- `docs/standards/SECURITY.md` — record the admin-only route plus callable/Storage enforcement.
- `docs/standards/TESTING.md` — record focused Portal upload and parity coverage.
- `.cursor/workflow/state.md` — update phase/gates at Plan, Review, Test, and Signoff transitions.
- `references/project-chatgpt-handoff/CURRENT-STATE.md` — keep the handoff state synchronized at
  Signoff as required by FreshForge.

No implementation or signoff documentation should claim DEV QA, deployment, or production release
until those actions actually occur.

## Acceptance and security gates for implementation

- Owner/admin can navigate to both admin pages; active link is obvious and usable on mobile.
- Helpers, customers, guests, and inactive users cannot use the route or either callable.
- One or more PNGs can be selected from a normal browser file picker and processed independently.
- Every successful item is finalized by the existing Staff Artwork Function and appears in Studio’s
  existing Staff Artwork library with production/preview/thumbnail derivatives.
- Portal submits unassigned/Auto/default metadata and creates no customer-side effects.
- Upload, processing, and finalization failures remain visible, bounded, and retryable according to
  the known-ID existing create/finalize behavior; no fake `ready` state or unbounded duplicate retry.
- No Portal Firestore read of `staffArtworks`, no raw private path/derivative URL exposure, no public
  or customer access expansion, and no Rules/index/migration/data mutation.
- Existing Show Queue, Studio Staff Artwork, Admin View Designs Staff Artwork previews, and customer
  uploads regress unchanged.

## Exact test plan

### Focused automated tests

Add or update tests for:

- route `/admin/staff-artwork` and App Router entry;
- Admin shell link order, active state, route-aware title, mobile/semantic nav contract, and
  preservation of Show Queue behavior;
- owner/admin access, helper/customer/guest denial, and admin login `returnTo` for both routes;
- absence of `PortalAppShell`, customer navigation, customer providers, and `staffArtworks` reads;
- PNG MIME/extension validation, empty-MIME browser behavior, 80 MB client ceiling, and source path;
- exact callable names/payload defaults: unassigned customer, omitted description/title, Auto;
- resumable source upload metadata/progress and finalize timeout;
- ready versus failed response handling, bounded errors, known-ID retry, ready idempotency, and no
  duplicate auto-retry;
- multi-file sequential state transitions and upload-more behavior;
- no customer consent/quota/notification/catalog/retention side effects;
- use of the existing shared canonical Staff Artwork path helper rather than a Portal path fork.

Run the existing Staff Artwork Storage/Firestore focused regression tests even though Rules are not
changing, to prove the current owner/admin source boundary remains the one used by Portal:

```text
firebase emulators:exec --only firestore,storage "npx tsx --test tests/firebase/staffArtwork.rules.contract.test.ts tests/firebase/staffArtwork.storage.rules.test.ts"
```

### Commands at implementation/test gates

Run the focused Portal tests with the repository’s existing `tsx --test` convention, then:

```text
npx tsx --test apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts apps/portal/features/auth/utils/portalReturnUrl.admin.test.ts apps/portal/features/admin-staff-artwork/adminStaffArtworkUpload.contract.test.ts
npm --workspace @fresh-prints/portal run typecheck
npx eslint apps/portal/app apps/portal/features/admin-show-queue apps/portal/features/admin-staff-artwork apps/portal/features/auth apps/portal/styles --ext .ts,.tsx --report-unused-disable-directives --max-warnings 0
npm run build:portal
git diff --check
```

Functions build is not required for a Portal-only change, but must be run if implementation touches
any Functions/shared backend file. No test may be reported as passed unless it was actually run;
known Windows Next `.next/trace` EPERM or existing Studio baseline failures must be documented rather
than hidden.

### Owner DEV QA after implementation

After automated Test, Owner DEV QA must exercise: desktop Admin navigation; one PNG to Ready; Studio
Staff Artwork library confirmation; one phone/mobile browser upload through the DEV tunnel; helper/
customer denial; and unchanged Show Queue. Production deployment, Portal production publication,
Studio release, Rules deployment, Storage Rules deployment, and data mutation remain separate human
checkpoints.

## Promotion Manifest delta at Signoff

Append one compact dated section to
`docs/workflow/reviews/2026-09-pre-production-promotion-manifest.md`, preserving all prior entries:

The original table below is the Workstream A expectation. The amended combined Workstream A + B
expectation is recorded in the later “Workstream B Promotion Manifest delta at Signoff” section and
supersedes this table for the eventual combined Signoff.

| Kind | Intended entry |
|---|---|
| Portal App Hosting | **Required when promoting to production**; no DEV App Hosting step |
| Functions | **NONE** — existing `createStaffArtworkUpload` and `finalizeStaffArtwork` reused unchanged |
| Firestore Rules | **NONE** |
| Storage Rules | **NONE** — existing owner/admin canonical source rule is sufficient |
| Studio release | **NONE** unless implementation unexpectedly changes shared/Studio runtime bytes |
| Indexes/migrations/backfills | **NONE** |
| Minimal production smoke | Admin nav; one Portal Admin PNG upload; confirm it appears in Studio Staff Artwork; existing Show Queue smoke |

The final manifest entry must reflect actual implementation bytes and test/deployment evidence, not
this plan’s expectation. No promotion or publication is authorized by this Plan.

## Amendment: Workstream B — Studio multi-select → Send to AI Review

This section amends the current Plan in place. Workstream A above remains in scope and is not
replaced. The combined goal has one eventual Implement → Test → Owner DEV QA → Signoff cycle.

### Revised architecture and lifecycle decision

The intended Studio flow is:

`multiple-selection UI → bounded per-item hook/service orchestration → existing trusted
promotion/enqueue/reprocess boundary → existing AI Processing / AI Review workspace`

The UI will hold a stable selected-ID set, use the loaded cards as the selection surface, and keep
selection state separate from Print Request quantity selection. Submission will be serial (bounded
concurrency of one), with a small accepted/progress state and per-item outcomes. There will be no
new batch collection, AI worker, bulk-specific Staff Artwork lifecycle, or setting snapshot.

There is one blocking lifecycle finding that must be resolved before implementation. The current
single Design Library action is `reprocessReadyDesignWithAi`: it is owner-only and intentionally
updates a `ready` + `approved` design to `status: "imported"`, `aiReviewStatus: "pending"` before
running or waiting for AI. `DesignLibraryPage` then removes that card from the Ready browse. The
existing `ready_backfill` Catalog Reprocessing worker preserves `ready` + `approved`, but it is a
separate durable owner-only catalog backfill control plane and does not route the design through
the normal AI Review Processing/Needs Review lifecycle.

Therefore the requested Workstream B behavior cannot safely be implemented by blindly reusing the
current Ready action. Before code, the owner must approve the exact lifecycle contract:

1. **Preferred:** extend the existing canonical per-design Ready reprocess boundary (or add a
   narrowly reviewed seam at that boundary) so selected designs enter the established AI workflow
   while preserving approved-catalog visibility and preventing a temporary Ready → imported
   disappearance. The existing single-item action and bulk action must then share that contract.
2. **Explicit exception:** accept the current Ready → imported demotion semantics for both single
   and bulk reprocessing. This is not the preferred product behavior and is not considered approved
   merely by accepting this Plan; it requires an explicit owner decision because it conflicts with
   the amendment’s lifecycle-safety requirement.

No speculative backend lifecycle change is authorized by this documentation pass. If option 1 is
chosen, the exact Functions contract, callable payload/return shape, pipeline mode, and manifest
entry must be confirmed in the implementation plan before application code is edited. The existing
`ready_backfill` job must not be repurposed silently.

### Required repository investigation — explicit answers

1. **Reusable Design Library generic multi-select:** No. Design Library currently has local
   `selectedPurgeIds` for archived image deletion and a separate Print Request mode backed by
   `usePrintRequestSelectionMode`; it has no general AI multi-select state.
2. **Separation from Print Request selection:** Keep a new local AI selection mode in
   `DesignLibraryPage`/`DesignGrid`, independent of the URL-driven `mode=request-selection`
   state, quantity map, request save, and `DesignSelectionCard`. The same pure toggle/range
   primitives may be shared, but action state and exit behavior remain separate.
3. **Existing single-design Ready AI path:** `DesignDetailsModal` reads the existing Auto-process
   preference, calls `designReprocessWithAiService.reprocessReadyDesignWithAi`, which invokes the
   traced `reprocessReadyDesignWithAi` callable with `autoStart: false`; when Auto process is on,
   the client then calls `aiEnrichmentEnqueueService.enqueueForProcessing`. The callable performs
   the canonical Ready eligibility check and demotion.
4. **Queue/lifecycle behavior:** The canonical Ready Catalog eligibility predicate is
   `status: "ready"` plus `aiReviewStatus: "approved"`, with non-archived/non-purged valid catalog
   derivatives. The current path does not preserve Ready visibility: the callable
   demotes `ready` + `approved` to `imported` + `pending`, and the Design Library removes it from
   the Ready browse. The existing `catalogReprocessWorker` `ready_backfill` path does preserve
   `ready` + `approved`, but it is not the normal AI Review queue contract. This mismatch is the
   hard pre-implementation condition described above.
5. **Duplicate active AI jobs:** `reprocessReadyDesignWithAi` rejects active non-stale processing;
   `enqueueAiEnrichment` checks active stage/staleness and returns idempotent reasons such as
   `already_processing` or `already_terminal`; `runAiEnrichmentPipeline` claims the attempt ID
   before work and guarded reconciliation prevents stale attempts from committing.
6. **Existing Staff Artwork single-item path:** `StaffArtworkPage` calls
   `staffArtworkService.promote(user, staffArtworkId)`, which invokes the
   `promoteStaffArtworkToAiReview` callable, then submits the returned catalog design ID to the
   shared background enqueue helper.
7. **Staff Artwork catalog link:** The callable transaction creates one `designs` document with
   `status: "imported"`, `aiReviewStatus: "pending"`, `sourceStaffArtworkId`, copied canonical
   derivatives/production paths, and promotion metadata on the Staff Artwork record. It then
   copies the canonical derivatives and removes the promoted private Staff Artwork record after a
   successful handoff.
8. **Already-promoted handling:** The callable checks `promotedDesignId` plus
   `promotionStatus: "promoted"` and returns the existing design with `alreadyPromoted: true`
   instead of creating a duplicate. The bulk flow will treat that result as an idempotent no-op,
   remove any stale source card after refresh, and report it separately from a new promotion.
9. **Staff Artwork eligibility:** UI selection will be limited to `status: "ready"` and
   non-archived records visible in the current library. The callable remains the authority for
   production-path validity, deletion blockers, existing promotion state, and all race-time
   revalidation; a selection becoming stale is skipped or failed truthfully per its callable result.
10. **Design Library permission:** The existing single Ready reprocess permission is owner-only
    (`permissionService.canReprocessReadyDesignWithAi` and the callable’s active `role ===
    "owner"` assertion). Bulk Design Library AI action must reuse that authority; admins and helpers
    do not gain access.
11. **Staff Artwork permission:** Existing promotion authority is active owner/admin through
    `permissionService.canManageStaffArtwork` and the callable’s `requireOwnerAdmin` check. Helpers
    remain denied at the backend even if a UI request is forged.
12. **Setting for automatic vs manual start:** There is no persisted Firestore setting that gates
    whether the client starts a newly queued design. Studio uses the existing per-user
    localStorage key `fresh-prints.ai-processing.auto-process`, read by
    `readAiProcessingAutoProcessPreference`, defaulting to on. Separately persisted server fields
    `/settings/aiEnrichment.catalogWorkflowMode` (`manual`, `shadow`, or `autonomous`) and
    `catalogAutonomousLiveEnabled` govern downstream automation/approval decisions, not whether
    the client starts the queue.
13. **Where the decision is made:** The Studio background queue checks the local Auto-process
    preference before calling `enqueueAiEnrichment`; the AI Review header owns that setting. Once a
    callable runs, `enqueueAiEnrichment` loads current server AI settings through
    `runAiEnrichmentPipeline`, which evaluates the persisted catalog automation decision at worker
    time. It is not a Design Library or Staff Artwork setting.
14. **How bulk inherits settings:** Bulk must call the existing queue helper without `force: true`
    and must not add an Auto/Manual control or pass an invented mode. Auto-on uses the current
    FIFO enqueue path; Auto-off leaves the imported/pending design for the existing Start AI/manual
    flow; server-side automation remains controlled by the current pipeline settings. The current
    Staff Artwork single-item call uses `{ force: true }`, which bypasses this contract; the narrow
    implementation correction is to remove that force override and make single and bulk Staff
    Artwork use the same non-forced helper.
15. **Per-item versus batch seam:** Use existing per-item `promoteStaffArtworkToAiReview`,
    `enqueueAiEnrichment`, and the reviewed Design Library Ready reprocess seam per item. Reuse the
    existing sequential `enqueueImportedDesignsForBackgroundAi` FIFO and the deterministic
    `runAiReviewBulkReprocess` orchestration pattern where applicable. Do not create a batch
    collection or second AI worker.
16. **Bounded execution/retry model:** Concurrency is one because the existing import queue is
    deliberately FIFO and never runs concurrent enqueue callables. Each item is independently
    attempted; duplicate IDs are deduped, the primary action is disabled during submission, no
    automatic retry occurs after an unknown transport result, and only failed items remain retryable.
    A compact result reports sent/queued, already-current or skipped, and failed counts.
17. **Selection pattern reused:** Reuse the completed AI Review queue’s pure conventions from
    `aiReviewQueueMultiSelect.ts`: toggle selection, highlighted cards, optional Shift+click
    inclusive range using the rendered loaded-ID order, Cancel, and selected count. Extract only
    neutral primitives if needed; do not couple either library to AI Review page state or merge
    Print Request selection.
18. **Exact affected files:** Workstream A’s original file set remains unchanged. Workstream B’s
    planned Studio set is:

    - `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`
    - `apps/studio/src/renderer/src/features/designs/components/DesignGrid.tsx`
    - `apps/studio/src/renderer/src/features/designs/components/DesignCard.tsx`
    - `apps/studio/src/renderer/src/features/designs/services/designReprocessWithAiService.ts`
    - `apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx`
    - `apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx` — keep
      the single-item action on the same reviewed lifecycle and settings contract
    - `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewQueueMultiSelect.ts` — extract
      neutral toggle/range primitives while preserving its current exports and behavior
    - `apps/studio/src/renderer/src/shared/utils/multiSelect.ts` — new neutral selection primitives
    - `apps/studio/src/renderer/src/styles/components/design-library.css`
    - `apps/studio/src/renderer/src/styles/components/staff-artwork.css`
    - `apps/studio/src/renderer/src/shared/utils/multiSelect.test.ts` — new primitive tests
    - `apps/studio/src/renderer/src/features/designs/pages/designLibraryAiMultiSelect.contract.test.ts`
    - `apps/studio/src/renderer/src/features/designs/components/reprocessReadyDesignWithAi.contract.test.ts`
      — preserve the single-item lifecycle/permission contract
    - `apps/studio/src/renderer/src/features/staff-artwork/pages/staffArtworkAiMultiSelect.contract.test.ts`
    - `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueueSequencing.test.ts`
      — preserve strict FIFO behavior while the existing helper is reused without force
    - `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewQueueMultiSelect.test.ts` —
      preserve existing AI Review selection behavior after primitive extraction

    If the preferred Ready-preserving contract is selected, the conditional backend set is the
    existing seam files that must be amended and reviewed together:
    `functions/src/reprocessReadyDesignWithAi.ts`,
    `functions/src/ai/reprocessReadyDesignWithAiCore.ts`,
    `functions/src/enqueueAiEnrichment.ts` if the canonical enqueue boundary is extended, and
    `functions/src/ai/aiEnrichmentPipeline.ts` if a lifecycle-preserving mode is required. No new
    Function name or new pipeline is presumed. The exact conditional set must be frozen before
    implementation; the current documentation pass does not authorize guessing at it.
    The existing `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts`
    and `apps/studio/src/renderer/src/features/ai-review/utils/aiProcessingAutoProcessPreference.ts`
    remain the shared settings/queue sources of truth; the bulk feature does not create a parallel
    queue or preference.
19. **Functions changes:** Workstream A requires none. Staff Artwork bulk orchestration requires
    none because it reuses the existing promotion/enqueue callables. Design Library requires a
    Functions change only if it is to satisfy the preferred Ready-preserving AI Review lifecycle;
    the current callable cannot satisfy that requirement unchanged. If the owner explicitly accepts
    current demotion semantics, no Functions change is required for the bulk wrapper, but the
    lifecycle exception must be recorded and approved first.
20. **Rules/index/schema changes:** None are expected. No Firestore Rules, Storage Rules,
    `firestore.indexes.json`, Smart Profile schema, catalog schema, migration, or backfill is in
    scope. Existing backend revalidation and security rules remain canonical.

### Workstream B implementation shape

Design Library will add a `Multiple Select` entry point only in its normal approved-catalog view.
In that mode, eligible cards toggle selected/highlighted state, the toolbar shows `X selected`,
`Send to AI Review`, and `Cancel`, and normal card details are restored on exit. Search, category,
Smart Profile, Halftone, archive filter, sort, loaded-page boundaries, and scroll container remain
owned by the existing page. Selection IDs are not silently discarded when more cards load; any
submission revalidates against the trusted per-item boundary. Archived, malformed, non-ready, and
active-processing designs are not submitted.

Staff Artwork will add a separate normal-library Multiple Select mode, unavailable in the existing
Print Request `mode=request-selection` route. Only ready, non-archived cards can be selected by
owner/admin. Submission calls the existing `promote` service once per selected ID, then uses the
shared non-forced enqueue helper for each returned design ID. Already-promoted results are
idempotent no-ops and are reported; no duplicate catalog design is created. The source card is
removed only after the existing promotion result/refresh establishes the handoff.

The bulk action will show only compact progress and truthful aggregate/per-item results. It will
not display a fake AI completion percentage. Completion, Needs Review, Rejected, autonomous
approval, and Processing-tab visibility remain determined by the existing AI Review system.

### Workstream B security and regression boundary

The UI may hide unavailable actions, but callable authorization remains canonical. Design Library
bulk action uses the current owner-only Ready reprocess authority; Staff Artwork bulk promotion
uses active owner/admin authority; helpers, customers, guests, and inactive accounts remain
denied. No client Firestore read/write authority is broadened. Existing active-attempt, stale-job,
promotion-idempotency, and pipeline-claim guards remain in force. Bulk retry must never convert a
transport ambiguity into a second promotion or active AI job.

The current Staff Artwork single-item path’s `{ force: true }` is a required narrow correction
because it bypasses the established Auto-process setting. The correction must preserve its existing
promotion callable and user-visible handoff while allowing Auto-off to wait for the current manual
Start AI flow. This is a behavioral fix within Workstream B and requires a single-item regression
test.

### Workstream B exact focused tests

Add focused Studio/Functions tests, as applicable to the final lifecycle choice, for:

- Design Library entry/cancel, card toggle/deselect, highlighted state, selected count, optional
  Shift+click range, filtered/loaded-page behavior, and preserved normal Design Details behavior;
- strict separation from Print Request selection mode, including no quantity/save-to-request
  action leakage and no AI action in that route;
- Ready/non-archived/valid-catalog eligibility, archived/ineligible/active-state exclusion, backend
  revalidation, and the approved-catalog lifecycle contract chosen by the owner;
- Design Library per-item enqueue/reprocess calls, duplicate/double-submit protection, no duplicate
  active AI job, selection cleanup, partial failure, and retry of failed IDs only;
- Staff Artwork multiple selection, owner/admin success, helper denial, ready/non-archived
  eligibility, existing single-item promotion regression, already-promoted idempotency, no
  duplicate catalog design, source-card reconciliation, and partial failure;
- shared queue use, strict sequential invocation, Auto-process on behavior, Auto-process off/manual
  waiting behavior, no bulk `force` override, and no duplicated setting interpretation;
- unchanged AI Review Processing/Needs Review/Rejected visibility and unchanged autonomous approval
  behavior;
- Studio typecheck, targeted lint, focused Design Library/Staff Artwork/AI queue/Functions tests if
  Functions are touched, and `git diff --check`. Rules tests run only if a Rules file unexpectedly
  changes.

No application test has been run or claimed in this Plan/Formal Review-only amendment phase.

### Workstream B Owner DEV QA

After the one combined implementation/test cycle, Owner DEV QA must exercise: Design Library enter
and cancel Multiple Select; selecting/deselecting eligible Ready cards with search/filter and load
more; sending a partial-success selection and retrying only the failure; confirming an approved
catalog design does not disappear solely because it was queued/reprocessed under the approved
lifecycle contract; Staff Artwork owner and admin bulk promotion; already-promoted/no-duplicate
behavior; helper denial; Auto-process on and off using the existing AI Review setting; Processing
and Needs Review visibility; existing single-item Staff Artwork Send to AI Review; and Workstream A
Portal upload/admin navigation/Show Queue mobile checks. Production release, Portal publication,
Studio release, Functions deployment, Rules deployment, and data mutation remain separate human
checkpoints.

### Workstream B Promotion Manifest delta at Signoff

At Signoff, append one combined dated entry to
`docs/workflow/reviews/2026-09-pre-production-promotion-manifest.md`, based on actual bytes and
tests. Expected entries are:

| Kind | Expected Workstream A + B entry |
|---|---|
| Portal App Hosting | **Required when promoting to production** for Workstream A; no DEV App Hosting step |
| Studio release | **Required** for Workstream B Studio UI/selection bytes |
| Functions | **NONE** for Portal and Staff Artwork orchestration; **conditional required** if the approved Ready-preserving Design Library contract changes existing Functions bytes |
| Firestore Rules / Storage Rules | **NONE** |
| Indexes/schema/migrations/backfills | **NONE** |
| Minimal production smoke | Admin nav + Portal PNG upload; Studio Design Library and Staff Artwork bulk action; AI Review Processing/Needs Review visibility; existing Show Queue smoke |

The manifest must name any actual changed callable/function and its deployed artifact if the
Ready-preserving lifecycle condition is implemented. No promotion or publication is authorized by
this amended Plan.

## Historical owner-authorized Ready-preserving contract freeze — revoked by Owner DEV QA

The owner previously accepted the preferred Ready-preserving lifecycle and authorized implementation.
Owner DEV QA later revoked this contract after observing dual Design Library/AI Processing visibility;
the following is retained only as historical plan context:

- Existing `designs` documents retain raw `status: "ready"` and `aiReviewStatus: "approved"`
  throughout a Design Library reprocess. An additive optional `aiReprocessState` field is the only
  transient marker, with values `"processing"` or `"needs_review"`; it is cleared after approval or
  an autonomous approved result. No new collection, catalog status, lifecycle, migration, index,
  Rules change, or backfill is introduced.
- `reprocessReadyDesignWithAi` keeps its existing `{ designId, autoStart }` payload and owner-only
  boundary. Its result reports `readyPreserved`, raw status/review values, transient state, stage,
  and whether processing started. Repeated active requests are idempotent and do not create a
  second attempt.
- `enqueueAiEnrichment` accepts an additive `readyReprocess: true` path only for a valid Ready,
  approved design marked `aiReprocessState: "processing"`. It uses the existing queue and pipeline
  with a `ready_reprocess` mode; the default imported-design path is unchanged. The existing Auto
  process preference remains the client start gate, and server AI settings remain authoritative for
  downstream automation/approval. No bulk or single path uses `force: true`.
- `ready_reprocess` uses the existing AI enrichment stages, attempt claims, stale-job checks,
  guarded reconciliation, and server automation decision. Success keeps Ready/approved and either
  clears the transient marker for autonomous approval or sets `aiReprocessState: "needs_review"`
  with `ready_for_review`; failure keeps Ready/approved and marks the transient attempt failed for
  retry. It never uses `ready_backfill`, which remains a separate Catalog Reprocessing worker.
- AI Review resolves the transient marker to effective Processing/Needs Review display while raw
  catalog eligibility remains approved. It adds a second same-collection equality-only query for
  Ready transient records, merged with the unchanged imported/rejected inbox queries; no composite
  index is added. Approving a transient Ready result clears the marker while preserving Ready and
  approved; explicit rejection follows the existing rejection boundary and clears the marker.
- Staff Artwork single and bulk promotion call the existing promotion callable and then the shared
  non-forced FIFO enqueue helper sequentially. Already-promoted results remain idempotent, and bulk
  retry is limited to known failed IDs.

This freeze authorizes implementation and testing within the approved scope. It does not authorize
production deployment, Portal publication, Studio release, Rules/Storage Rules deployment, data
mutation, or unrelated changes.

## Owner DEV QA FAIL amendment — 2026-09-15 Workstream B

Owner DEV QA recorded **FAIL** for two Workstream B behaviors. This amendment supersedes the
Ready-preserving lifecycle freeze above for the current implementation while retaining it as
historical review context. The owner-directed continuation is: investigate the actual diff and DEV
state → correct → test → deploy only exact changed DEV Functions → stop for Owner DEV QA. No new
managed goal is created and no Signoff is authorized.

### Staff Artwork bulk 400 — evidence and bounded corrective

- The actual bulk path is `StaffArtworkPage` → `runAiReviewBulkReprocess` →
  `staffArtworkService.promote` → `promoteStaffArtworkToAiReview`.
- The existing working single-item path and bulk path both call the same client service and send
  exactly `{ staffArtworkId }`. The investigation therefore found no bulk-only payload mismatch.
- Historic DEV Cloud Logging proves authenticated requests (`VALID`) returned HTTP 400, but did not
  retain request bodies or an application-level error record. It cannot tie the historic requests to
  a particular selected ID. Source inspection maps the safe server errors to the callable's
  `failed-precondition` branches: active deletion blockers, or a non-Ready/missing production path.
- Read-only DEV inspection found five current `ready`/`not_promoted` records with active references,
  so they are concrete blocker candidates and must remain protected. The referenced IDs are
  `DzgUSAYAB3ZxtsPky82P` (1 item, 1 allocation), `FzXAsMbOzcPL2v6E0543` (2 items, 3 allocations),
  `Zgzl4m6tTbxfdgus3XdD` (1 item, 1 allocation), `lacXDABhICoKJvSyEUxJ` (1 item, 1 allocation),
  and `nVcdReBfRZFLP1JOP4US` (1 item, 1 allocation). No DEV data was mutated.
- The smallest safe corrective adds bounded server diagnostics (`reason`, blocker list, and safe
  record lifecycle state) and preserves the existing deletion safety, owner/admin boundary,
  idempotency, no-duplicate behavior, sequential execution, partial-failure isolation, and Auto
  preference. The client now retains callable code/message/details in each bulk failure so a safe
  `failed-precondition` is actionable rather than only `400 Bad Request`.

### Design Library lifecycle — revoked decision and canonical replacement

The owner revoked the previous hybrid `ready + approved + aiReprocessState` decision. The required
contract is now the canonical lifecycle:

`ready + approved` → accepted reprocess → `imported + pending` normal AI Processing/AI Review →
`ready + approved` only after the existing approval transition.

Accordingly, the corrective removes the obsolete `aiReprocessState` type/query/display/eligibility
special cases and the `ready_reprocess` pipeline mode. `reprocessReadyDesignWithAi` writes the
normal imported/pending demotion, honors Auto-process by using the existing queue contract, and
waits for manual Start AI when Auto is off. Single and bulk Design Library actions share this
contract; accepted handoff removes the item from the normal Ready browse and patches managed search
state to imported/pending. Retry classification now treats successful/already-terminal outcomes as
success and reports only actual failed status/stage as failure.

Before any data mutation, read-only DEV inspection found five archived designs retaining obsolete
`aiReprocessState: needs_review` metadata (`I4p1ofbZVGpxobhtLKNj`, `coiXzQDhJBKBVB1dFVZT`,
`xGgooPj8OwbNl8oqLwEU`, `xiE3wLJxHg4Og96i1p2Z`, and `ztufMLhDcMGE0w5kFBoi`). They are archived,
not normal visible dual-state records; they are reported only and will not be restored, deleted, or
otherwise mutated in this goal.

### Full-card Multiple Select addendum

In both Studio Design Library and Studio Staff Artwork, active Multiple Select makes the full card
the selection target. Image, title, background, and normal card content toggle eligible selection;
the normal details/preview action is suppressed while the mode is active; selected state is exposed
with `aria-pressed` where supported and visible selected styling; Enter/Space toggles keyboard-
interactive cards. Exiting Multiple Select removes the selection callback/interaction mode so normal
card details behavior returns immediately. Neither library currently has Shift+click range logic,
so there is no existing range behavior to regress; any existing Print Request and archive/purge
selection modes remain separate.

### Corrective implementation/deployment gate

The actual runtime diff changes the exported Functions `promoteStaffArtworkToAiReview`,
`reprocessReadyDesignWithAi`, and `enqueueAiEnrichment` (including their shared AI pipeline bytes).
After focused tests and Functions build pass, only those three exports may be deployed to
`fresh-prints-dev`, with ACTIVE verification and safe unauthenticated/read-only post-deploy checks.
No unrelated DEV Function, DEV App Hosting, production service, Rules, Storage Rules, production
data, commit, or push is authorized.

## Implementation gate

The amended Plan and Formal Review confirmed the combined Portal and Studio scope, route, existing
callable reuse, browser upload adapter, no-Rules-change boundary, multi-file scope, Staff Artwork
idempotency, AI settings inheritance, bounded per-item orchestration, the canonical demotion/re-entry
lifecycle, safe diagnostics, and full-card Multiple Select. The owner has explicitly authorized the
corrective Implement → Test continuation with:

> **Accept revised Plan + Formal Review; authorize Implement → Test.**

Implementation and Test are complete, exact changed DEV Functions are deployed and ACTIVE, and Owner
DEV QA has passed. Signoff and durable documentation closeout are authorized; production publication,
Rules/Storage Rules, data mutation, and unrelated changes remain separately gated.
