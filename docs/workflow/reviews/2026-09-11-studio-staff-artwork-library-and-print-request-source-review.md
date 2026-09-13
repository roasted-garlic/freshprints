# Formal Review: Studio Staff Artwork Library and Print Request Source

| Field | Value |
|---|---|
| Date | 2026-09-11 |
| Workflow | FreshForge managed phase |
| Goal | `studio-staff-artwork-library-and-print-request-source` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Plan | `docs/workflow/plans/2026-09-11-studio-staff-artwork-library-and-print-request-source-plan.md` |
| Verdict | **`approved_with_changes` — conditional on explicit owner decisions; implementation not authorized** |

## Review boundary

This is the requested Plan + Formal Review gate only. It is not an implementation approval. No
application, Functions, Rules, Storage, index, migration, deployment, Studio publication, commit,
push, candidate freeze, or production action occurred for this goal. The parent M0/candidate work
must remain paused.

## Executive assessment

The proposed design is architecturally sound if it remains a distinct `staffArtworks` entity and
uses a third `staff_artwork` request-item source. It reuses the current customer-upload technical
image processing without inheriting customer-specific consent, quota, intake, ownership, or
retention semantics. It also reuses Design Library selection primitives and the existing source-aware
production/export/gang-sheet path rather than introducing parallel renderers.

The plan is approved with changes because four product/security choices cannot be inferred safely:
the Portal representation of an attached Staff Artwork item, helper selection permission, exact
collection/path names, and merged-customer association behavior. Those choices are recorded as
explicit owner checkpoints below.

## Evidence checked

- FreshForge rules: `docs/AI_RULES.md`, `.cursor/workflow/state.md`, and the required architecture,
  Firebase, data-model, security, roadmap, and workflow documents.
- Handoff/current-state and the recent Print Request direct-export/gang-sheet/copy, sizing,
  enhancement, customer-upload processing, promotion, exclusion/deletion, and parent release
  readiness artifacts.
- `Sidebar.tsx`, `AppRoutes.tsx`, Design Library selection-mode files, Print Request service/hooks/UI,
  show/gang-sheet services, shared source/resolver utilities, customer picker/search services,
  processing/finalization/deletion helpers, permission service/types, `firestore.rules`,
  `storage.rules`, and `firestore.indexes.json`.

## Formal checklist

| Area | Verdict | Review finding |
|---|---|---|
| Scope and phase gate | pass | Persistent Studio-only library and request source are bounded; Portal library, public catalog, automatic AI, retention cleanup, and production actions remain excluded. |
| Architecture | pass with condition | A distinct entity and Component → Hook → Service → Firebase/Callable path preserves the repository layers. Neutral processing extraction must keep the customer-upload adapter behavior unchanged. |
| Data model | pass with condition | Typed `StaffArtwork`, canonical manifest, status, processing metadata, customer ID/snapshots, archive, and promotion linkage are appropriate. Names require owner confirmation. |
| Processing | pass | `processCustomerUploadImageBytes` and `saveCustomerUploadProcessedOutputs` are the correct reuse boundary; customer consent/quota/retention must stay in the adapter. |
| Print Request source | pass with condition | `staff_artwork` plus `staffArtworkId` is a coherent third source, but every current catalog/upload branch and Rules identity check must be updated before implementation signoff. |
| Production/export/gang sheets | pass | The plan covers request assets, Show Queue, Internal Gang Sheet, Standard/grouped/per-customer sheets, ZIPs, enhancement, history, and allocation readers. Missing branch coverage is a release blocker. |
| Permissions | pass with owner choice | Owner/admin management is required. Helper selection is a deliberate choice, not an accidental reuse of broad `isStaff`. |
| Security/Rules/Storage | pass with condition | Staff-only library reads, callable/Admin writes, canonical source create, derivative Admin writes, no Portal library read, and fail-closed deletion are correct. Emulator tests are mandatory. |
| Customer association | pass with owner choice | Actual `customerId` plus display snapshots meets the requirement. Historical and merged behavior must be accepted explicitly. |
| Portal boundary | pass with owner choice | A neutral no-image row preserves request truth without exposing the library; hiding the row would require a separate aggregate/projection design. |
| Search/indexes | pass | Bounded private browse and exact customer filtering are sufficient initially. Add only concrete composite indexes after profiling; no public Algolia. |
| Promotion | pass | Explicit owner/admin, idempotent linkage, independent catalog-owned copy, existing AI enqueue, and private-field stripping preserve catalog boundaries. |
| Deletion | pass with condition | Separate Staff Artwork manifest/blocker helper is required; customer-upload deletion code must not be called with Staff Artwork data. |
| Readiness | pass | The parent must rerun M0 and regenerate all closure, Rules/Storage, index, Portal/Studio, config/data, and exclusion manifests after child signoff. |
| Test/QA | pass | The proposed focused tests, emulator suite, builds/lint, and Owner DEV QA cover the material risks. No tests are claimed in this Plan/Review-only phase. |

## Required changes before implementation

1. Record the owner’s four decisions in the child state and Plan/Review. Do not silently choose a
   Portal projection, helper capability, collection/path naming, or merge behavior in code.
2. Add a typed third source and update all source-aware resolvers/mappers/Rules before enabling any
   UI. A compiler-green Studio page is not evidence that export, allocation, gang-sheet, history, or
   Portal branches are covered.
3. Extract a neutral technical processor/storage writer with customer-upload parity tests. Do not
   import customer quota, acknowledgment, catalog status, or retention fields into Staff Artwork.
4. Make all Staff Artwork writes trusted callables/Admin SDK writes; Storage client upload, if used,
   must be limited to the canonical `source` object and owner/admin role. Finalization must re-read
   the document and object metadata before setting `ready`.
5. Implement deletion as a fresh preview + atomic recheck over all request/allocation/gang-sheet/
   history references and an allowlisted canonical manifest. Partial/unexpected path failures retain
   the document and leave archive available.
6. Keep customer-created Portal callables unable to create or select `staff_artwork`; only a staff
   attachment can introduce it, and then only with the accepted customer-safe projection.
7. Prove the neutral Portal projection does not load Staff Artwork Storage URLs or private metadata.
   If the owner rejects the neutral row, stop and produce the separately reviewed hidden-row design.

## Owner decision checkpoints

### 1. Portal request truth

Existing Portal request detail/cart paths read request items directly and use them for item counts,
quantities, sizing, totals, and request state. Silently filtering a Staff Artwork item can make the
customer’s request disagree with Studio and production. The recommended safe projection is a row on
the customer’s own request only, labelled “Staff-added artwork”, with quantity and requested size but
no image, title/description, Staff Artwork ID/path, customer association, library route, or other
private metadata. Portal must not browse/search/read `staffArtworks`.

**Owner must approve this projection or explicitly require a separate hidden-row/aggregate contract.**

### 2. Helper selection

Helpers currently have Print Request item-editing permissions. The recommended narrow extension lets
them select existing ready/non-archived Staff Artwork but not upload, edit, associate, archive,
restore, delete, or promote. Direct Print Request upload remains owner/admin-only.

**Owner must approve or reject helper selection.**

### 3. Collection and Storage names

The plan proposes `staffArtworks/{staffArtworkId}` and
`/staff-artwork/{staffArtworkId}/{source|production.png|production.interactive.png|preview.webp|thumbnail.webp}`.
These are distinct from `designs` and `customerUploads`, simplify manifest validation, and avoid
customer-ownership path assumptions.

**Owner must approve these names or provide replacements before implementation.**

### 4. Disabled/closed/merged customers

The plan retains historical `customerId` and snapshots, includes logical merged IDs in lookup, and
blocks new association to merged sources in favor of the survivor. It does not mass-rewrite artwork
on merge. This preserves audit/history and avoids a broad data mutation in this child.

**Owner must approve alias-based retention or request a separately reviewed survivor-propagation worker.**

## Architecture review

### Reuse and extraction

The current customer-upload processor is the correct technical source because it already implements
format/transparency validation, trim, oversized-canvas normalization, approved upscale limits,
production PNG, preview/thumbnail WebP, effective DPI, background detection, timings, and bounded
warnings. The safe seam is a neutral typed image-byte result plus a path-agnostic derivative writer;
customer finalization remains responsible for customer-only quota/consent/status/retention fields.

The Design Library request-selection flow is also structurally reusable: route filters, tray state,
delta writes, return navigation, preview, and no default-size replay. Staff Artwork needs a separate
selection hook/source key so catalog selection cannot accidentally write the wrong identity.

### Request and production source propagation

The third source must be represented in:

- shared request/gang-sheet types and source validators;
- Studio create/read/hydration, sizing, duplicate/remove, enhancement, preview, and export builders;
- show allocation and Internal Gang Sheet mappers/builders;
- production asset resolution and interactive derivative choice;
- Functions allocation/queue/copy/convert/enhancement and lifecycle readers;
- Portal customer callables (reject creation) and the approved attached-row projection; and
- Firestore Rules identity immutability and gang-sheet/allocation source validation.

The implementation review must show a source-branch inventory or tests for every file in the Plan’s
explicit allowlist. A partial source addition is not shippable.

## Security review

- Firestore `staffArtworks` reads are staff-only; client writes are denied or limited to the reviewed
  callable contract. Customer IDs/snapshots remain private.
- Storage Staff Artwork reads are staff-only. Client create, if needed, is canonical `source` only,
  owner/admin only, with content-type/size/path validation; derivatives and deletion use Admin SDK.
- Every callable revalidates auth role, record status, request parent, source identity, and current
  references immediately before writing. UI permission gates are not security boundaries.
- No Staff Artwork collection is exposed to Portal or Algolia. Portal can only read its own request
  item and must not resolve a Staff Artwork Storage path.
- Promotion strips private association fields from the Design, AI prompt, and public search payload.
- No customer notification or permission side effect is emitted by association, attachment, archive,
  restore, or promotion.
- Hard delete is fail-closed on active/historical request, allocation, gang-sheet, production/history,
  shared-path, or unexpected-manifest references. Archive is always the fallback.

## Backend and operational review

New create/finalize, promotion, and safe-delete callables are justified for trusted processing and
atomic reference checks. A dedicated Staff Artwork read/update service may use callable/Admin-backed
operations rather than broad collection reads. No scheduled purge is allowed.

The child changes the Functions export closure, shared package closure, Studio renderer, possibly the
Portal renderer, Rules/Storage, and possibly indexes. It therefore invalidates the parent’s prior
candidate snapshot. After child Signoff, M0 must be rerun from a new clean development candidate;
the eventual deployment must enumerate reviewed Function names and additive index changes only.

## UX and accessibility review

The proposed page reuses existing card/grid/modal/selection primitives, keeps the sidebar placement
stable, exposes archive as the reversible default, and uses a real searchable Customer picker with
an Unassigned option. Loading, processing, retry, attach-race, empty, archived, and delete-blocked
states must be explicit and keyboard/screen-reader accessible in both Studio themes. Customer-facing
Portal copy must remain neutral and must not imply customer ownership or consent.

## Testing and DEV QA review

The implementation gate is adequate only when it includes processing parity and failure/retry,
metadata/picker/history/merge, permission matrix, selection delta, direct upload attach, third-source
resolution/sizing/enhance/duplicate/remove, CR + IR, exports and all gang-sheet modes, show/internal
allocation, archive/restore/delete blockers, promotion idempotency/privacy, Rules/Storage emulator,
Portal non-access/projection, and no-retention assertions. Required repository checks are Functions
build, Studio build/typecheck, Portal typecheck/build, changed-source lint, targeted tests, Rules
suite, and `git diff --check`.

Owner DEV QA must exercise both upload entry points, active/historical/merged Customer search,
helper-selection denial/allowance, archive/restore/delete safety, request reconciliation, production
exports/gang sheets, manual promotion, Portal privacy, and absence of notifications/public indexing.

No test pass is claimed here because this phase is documentation-only.

## Verdict and next step

**Verdict: `approved_with_changes`, conditional.** The technical direction is accepted for planning,
subject to the four explicit owner choices and the required source-branch, privacy, and fail-closed
implementation conditions above. This verdict does not authorize implementation.

The exact next owner decision is:

> **Accept Plan + Formal Review; approve the Portal projection, helper selection policy, proposed
> collection/Storage names, and merged-customer policy; authorize Implement.**

If any checkpoint is rejected or changed, amend this Plan and Review first. After implementation,
testing, Owner DEV QA, and Signoff, return to the parent for a fresh M0 reconciliation and candidate
assembly. STOP here.
