# Plan: Studio Staff Artwork → AI Review corrective

| Field | Value |
|---|---|
| Date | 2026-09-19 |
| Managed goal | `studio-staff-artwork-ai-review-corrective` |
| Branch/alignment | `development`; preserve unrelated working-tree changes |
| Workflow | Plan → Review → Implement → Test → Owner DEV QA → Signoff |
| Status | **Runtime root-cause amendment — proven; awaiting Formal Review then Implement** |
| Production | Untouched; no deployment, Studio publication, migration, backfill, or data mutation |

## Goal

Correct the existing Studio Staff Artwork → AI Review handoff so that:

1. the canonical AI title-authority path can replace an import/default Staff Artwork title when AI
   owns the title, while an explicitly staff-authored title remains authoritative;
2. Staff Artwork actions say **Send to AI** without renaming the **AI Review** workspace;
3. the private Staff Artwork library loads bounded, ordered pages using the established Studio
   Firestore cursor pattern; and
4. the existing Staff Artwork preview and thumbnail derivatives remain available through the
   independent catalog Design record used by AI Review.

The canonical lifecycle remains unchanged:

```text
Staff Artwork → Send to AI → designs imported/pending → AI Review → Approve → ready/approved → Design Library
```

Formal Review approved the original plan with conditions before implementation. Automated
verification for that original scope is complete. The corrective is amended below before Owner
DEV QA; the owner has now clarified that all Staff-Library-originated histories share one canonical
title invariant. The clarification requires a bounded Formal Review amendment and focused Test
evidence before the workflow returns to the owner checkpoint.

## Amendment — persistent AI sort, Auto advance preference, and legacy compatibility

Reported 2026-09-19 while the original corrective was awaiting Owner DEV QA:

1. The Studio AI Processing workspace sort toggle must persist its selected direction through
   reloads, pagination, navigation, remounts, and Studio restart.
2. Newly uploaded Staff Artwork still leaves the short generated Staff Library ID in the
   canonical `designs.title` after queued AI enrichment. The prior provenance fix corrects the
   authority classification but does not by itself persist the AI candidate in the normal manual
   queue path.
3. Valid Staff Artwork records created before the corrective must remain promotable, including
   records that lack the additive provenance field. Already-promoted records need a read-only
   reconciliation path for the old Design shape and any missing canonical derivatives.

### Investigation result and persisted-shape comparison

The pre-corrective `functions/src/staffArtwork.ts` create path persisted the following relevant
Staff Artwork shape: `title` (often a generated ten-character hex ID), `sourceFileName`,
`sourceStoragePath`, nullable derivative paths, `productionStoragePath` after finalization,
processing metadata, customer snapshots, and promotion linkage. It did not persist
`catalogTitleSource`. The post-corrective shape is additive: it retains those fields and adds
`catalogTitleSource: "staff"` only for an explicitly supplied/edited title, otherwise
`"import_filename"`.

The pre-corrective promotion already wrote canonical Design `originalPath`, `previewPath`, and
`thumbnailPath`, copied the available Staff Artwork production/preview/thumbnail objects, and
removed the private source record after the copy. It did not write `importSourceFileName` and
incorrectly stamped every promoted title as `catalogTitleSource: "staff"`. The post-corrective
Design shape adds `importSourceFileName` and derives the title source for legacy Staff Artwork at
promotion time. Therefore the reproducible new-record failure is not a missing derivative handoff:
the queued/manual AI pipeline persists `aiSuggestions.title` but does not update the root
`designs.title`, so the short Staff Artwork ID remains authoritative in the Design document and
queue label. The bounded fix will persist an AI title only for Staff Artwork-originated Designs
whose root title is import-derived/legacy-unknown, while preserving `staff`, `trusted_import`, and
already `ai_generated` authority and leaving normal Imports/Ready Design reprocessing unchanged.

For already-promoted pre-corrective Designs, `sourceStaffArtworkId` is the reliable scope marker;
the private Staff Artwork document and source filename are commonly gone because successful
promotion deletes them. A Design with that marker and no `importSourceFileName` is a reconciliation
candidate, but it is not automatically repairable. A short generated hex title or a recoverable
AI suggestion can be classified deterministically; an ambiguous human-looking title, absent AI
title, or missing canonical asset with no surviving source must be reported and skipped. The
reconciliation tool is DEV-only, read-only by default, hard-pinned to `fresh-prints-dev`, and no
apply mode is authorized in this phase.

### Read-only DEV evidence

The new reconciliation command was run against `fresh-prints-dev` with its hard-pinned
read-only mode. It found 21 Staff-Artwork-originated Design records: 20 conservative repairable
candidates and 1 unrecoverable derivative case. All 21 had canonical thumbnails; 20 had canonical
previews; the one missing preview belonged to Design `coiXzQDhJBKBVB1dFVZT`, whose private source
record and preview asset were gone. That Design already had `catalogTitleSource: "ai_generated"`
and an AI title, so no title replacement was proposed; the missing preview is explicitly
unrecoverable without a surviving source.

The inventory also found 8 ready Staff Artwork records missing `catalogTitleSource`. All 8 had
source filenames plus production, preview, and thumbnail paths and were classified as
deterministically normalizable at promotion time; no mutation was performed. Five legacy Designs
had recoverable AI titles in `aiSuggestions` and the remaining generated-ID cases had no AI title,
so their titles were not guessed. The full per-record report is emitted by
`functions/scripts/staff-artwork-promotion-reconciliation-dev.mjs`; it performs no Firestore or
Storage writes and was not run with any apply mode.

### Sort preference scope

Repository inspection found one Studio AI Processing workspace (`/ai-review`) and one shared sort
toggle across its Processing, Needs Review, and Rejected tabs. The existing local preference
pattern is `window.localStorage`; the amendment will use one workspace-level key, with an explicit
URL value taking precedence and the persisted value used when the URL has no sort parameter. The
existing tab-specific default remains the fallback only when no persisted preference exists. No
Firestore setting, dependency, or independent per-tab preference will be introduced.

### Additional amendment — persistent Processing Auto advance preference

Reported 2026-09-19 before Owner DEV QA: the **Auto advance** toggle rendered below the AI
Processing action buttons is still session-scoped. It currently uses the existing key
`fresh-prints.ai-processing.auto-advance` in `window.sessionStorage`, while the established Studio
local UI preference mechanism uses `window.localStorage` (for example, the adjacent Auto process
preference and the approved AI Review sort preference).

Repository inspection found one relevant control: the Processing-tab Auto advance toggle in the
shared `/ai-review` workspace. `useAiProcessingQueue` owns its state and already reads/writes the
existing key; the control is not a separate preference on Needs Review or Rejected, and it is
distinct from the shell-header Auto process toggle. The bounded correction will retain the same key,
default ON behavior, and workspace-wide relationship, but persist it in localStorage. If a legacy
sessionStorage value exists and no localStorage value exists, the first read will migrate that
explicit value to localStorage so an owner’s current choice is not discarded.

This preference remains independent of AI Review sort, filters, pagination, selected design,
processing state, and the Auto process master gate. No Firestore setting, backend field, new
dependency, or queue-state persistence is included.

Acceptance coverage will prove default ON behavior, explicit OFF/ON persistence across subsequent
reads and remount-equivalent reads, one-time session-to-local migration, invalid-value fallback,
and that the queue hook continues to write only when the owner explicitly changes the toggle.
Owner DEV QA must verify reload, navigation away/back, Studio restart, pagination, processing
actions, and an explicit toggle to the opposite direction before any later Signoff.

### Owner clarification — Staff Library origin is the invariant

Clarified by the owner before DEV QA: the title defect is not conditional on Staff Artwork creation
time, promotion time, AI-processing history, or whether the Design has already been processed. The
common condition is `sourceStaffArtworkId` — the canonical Design originated from Staff Library.

The reproduced Staff-Library-originated histories are:

- newly added Staff Artwork;
- pre-corrective Staff Artwork promoted after the corrective;
- an already-promoted Design waiting in AI Processing;
- an already AI-processed Staff-Artwork-originated Design; and
- a Staff-Artwork-originated Design sent through AI again.

Each can have a successful AI candidate while the short generated Staff Library ID remains in the
root `designs.title`, especially on old promoted Designs that were incorrectly stamped
`catalogTitleSource: "staff"`. The current DEV read-only inventory reproduced this condition in
22 of 23 Staff-Artwork-originated Designs: generated short titles plus the old `staff` stamp and no
`importSourceFileName`; one Design already has an AI-owned title. The inventory remains read-only;
no records or Storage objects were changed.

The required invariant is: for every Staff-Library-originated Design, when the root title is a
system-generated/import-derived Staff Library title and AI produces a structurally valid accepted
catalog title, that title must persist to canonical `designs.title`, remain visible in AI Review,
survive the approval transition into Design Library, and be the title exposed to the Portal catalog.
An explicitly authored staff title remains protected. Approval may mark the accepted title as
`catalogTitleSource: "staff"` because the owner/staff approval is an explicit authority event; the
canonical title value itself must remain the accepted AI/reviewed title.

The bounded implementation correction is limited to the AI title-persistence helper: a
Staff-Artwork-originated root carrying the old incorrect `staff` stamp may be treated as
import-derived only when its title matches the existing bounded legacy placeholder detector and
the canonical Design has no carried `importSourceFileName` (the old promotion shape). Human-looking
staff titles, current post-corrective explicit titles, trusted imports, and already AI-owned titles
remain protected. No broad migration or title rewrite is included.

Focused verification must trace and report, for each of the four representative histories, the
canonical title at: pre-AI root, post-AI `aiSuggestions.title`, post-AI `designs.title`, AI Review,
approval draft/write, post-approval `designs.title` and `catalogTitleSource`, Design Library, and
Portal catalog projection. The Portal projection must be built from the persisted ready Design
title, not from `aiSuggestions`.

### Amendment non-goals and gates

- No broad Firestore migration, bulk repair, production backfill, Storage/Firestore Rules change,
  AI prompt/provider change, or Studio release.
- The DEV reconciliation command must default to dry-run and perform no writes; any apply path,
  if retained for later owner review, requires an explicit DEV confirmation and remains unused.
- The amendment must add real pre-corrective Staff Artwork fixtures and prove title provenance,
  canonical derivatives, imported/pending lifecycle, AI Review visibility, idempotency, and
  unchanged normal Import/Ready Design and customer upload behavior.
- The additional Auto advance correction must use the existing local Studio preference pattern,
  preserve the current key/default/shared Processing-tab scope, and remain independent of queue
  data and the shell-header Auto process preference.
- The owner clarification must be implemented as one Staff-Library-origin title-authority invariant,
  not separate creation-history semantics. Old mis-stamped placeholder roots may be normalized at
  AI success only under the bounded legacy rule; human-looking explicit staff titles remain
  protected. The Test gate must prove canonical persistence through approval, Design Library, and
  Portal projection for new, pre-corrective, waiting, and previously processed/reprocessed
  Staff-Artwork-originated fixtures.
- Owner DEV QA remains the next human checkpoint; Signoff is not performed by this amendment.

## Required investigation findings

### Title provenance and persistence

The current title path is:

```text
Staff Artwork create/edit title
  → promoteStaffArtworkToAiReview writes designs.title
  → catalogTitleSource: "staff"
  → enqueueAiEnrichment / aiEnrichmentPipeline writes aiSuggestions.title
  → finalCatalogCopy.resolveFinalCatalogCopy
```

Confirmed files:

- `functions/src/staffArtwork.ts` — promotion currently copies `artwork.title` to the new
  Design and unconditionally stamps `catalogTitleSource: "staff"`.
- `functions/src/ai/finalCatalogCopy.ts` — `staff`, `trusted_import`, and `ai_generated` are
  explicit root-title authorities. A root with one of those values wins over a candidate title.
- `functions/src/ai/aiEnrichmentPipeline.ts` — the pipeline persists `aiSuggestions.title` and
  uses `resolveFinalCatalogCopy` for the final catalog-copy gate; it carries forward the root
  `catalogTitleSource`.
- `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewFormState.ts` — the approval
  draft is correctly seeded from the persisted AI suggestion.
- `apps/studio/src/renderer/src/features/ai-review/services/aiReviewInboxService.ts` — approval
  persists the reviewed draft through `designService.updateDesign` before the normal approval
  transition.
- `apps/studio/src/renderer/src/features/designs/services/designService.ts` — explicit Studio
  title edits stamp `catalogTitleSource: "staff"`.
- `packages/shared/src/types/design/catalogTitleSource.types.ts` — the existing title authority
  vocabulary is `staff`, `trusted_import`, `import_filename`, `ai_generated`, and
  `legacy_unknown`.

Root cause: the promotion boundary misclassifies every Staff Artwork title as explicit staff
authority. That makes the downstream resolver behave as designed and prevents an AI-owned title
from becoming the persisted canonical title on the final-catalog path. The current Staff Artwork
record has no title-authority provenance, so the promotion boundary cannot distinguish the generated
default title from an explicit title entered or edited by staff.

The current Studio uploader generates a short random default title in
`apps/studio/src/renderer/src/features/staff-artwork/utils/generateStaffArtworkTitle.ts`, while
the backend already has the same bounded default-generation behavior. The Portal admin uploader
omits a title and therefore uses the backend default. Existing Staff Artwork records may predate a
new provenance field, so the plan includes a bounded legacy fallback based on the existing
`isImportPlaceholderTitle` rules; no backfill is proposed.

### Preview/thumbnail continuity

The existing promotion path already has the correct architectural shape:

```text
staffArtworks.previewStoragePath / thumbnailStoragePath
  → promoteStaffArtworkToAiReview
  → canonical designs.previewPath / thumbnailPath
  → DesignThumbnailPanel / AiReviewWorkspace
  → designDerivativeUrlService
```

`promoteStaffArtworkToAiReview` copies production to the canonical Design original path and copies
the available Staff Artwork preview and thumbnail to the canonical Design derivative paths before
deleting the private Staff Artwork record. AI Review resolves `selectedDesign.previewPath` with a
thumbnail fallback and the queue resolves `design.thumbnailPath`; it does not read
`/staff-artwork/{id}/...`.

This means preview continuity can reuse the existing canonical derivative model without a new
field, Storage namespace, cross-domain reader, or Rules change. The implementation will add focused
coverage for the copy/path contract and, if needed after the test exposes a missing-derivative
edge, make the smallest canonical-path hardening change. It will not add a permanent AI Review
dependency on private Staff Artwork assets.

### Existing pagination pattern

The closest established Studio pattern is the Design Library / AI Review path:

- `apps/studio/src/renderer/src/features/designs/services/designService.ts` uses deterministic
  `orderBy(sortField, direction)` plus `orderBy("__name__", direction)`, `limit(pageSize + 1)`,
  and a cursor containing the sort timestamp plus document ID.
- `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` owns initial loading,
  append loading, stale-request protection, `hasMore`, `nextCursor`, reload, and local removal.
- `apps/studio/src/renderer/src/features/ai-review/components/AiReviewQueueList.tsx` uses the
  established compact **Load more** interaction and loading state.

The current Staff Artwork service uses a single `limit(100)` query (with a bounded compatibility
fallback) and `StaffArtworkPage` renders the entire returned array. That is the bounded-list gap.

## Proposed implementation

### 1. Title authority correction

Extend the existing Staff Artwork title record with the same optional
`catalogTitleSource` vocabulary used by Design records. This is an additive field, not a new
collection or parallel lifecycle state.

- `createStaffArtworkUpload` writes `catalogTitleSource: "staff"` only when a non-empty title was
  explicitly supplied; otherwise it writes `"import_filename"` while retaining the existing
  generated display title.
- `StaffArtworkPage` stops manufacturing a random title before calling the service, allowing the
  existing backend default path to record that the initial title is not trusted catalog authority.
- `updateStaffArtwork` stamps `catalogTitleSource: "staff"` because an owner/admin editing the
  title is an explicit staff-authority event.
- `promoteStaffArtworkToAiReview` copies the recorded authority to the new Design and carries the
  original `sourceFileName` into the existing `importSourceFileName` field. For legacy records with
  no authority field, use the existing bounded import-placeholder detector to choose
  `import_filename` versus `staff`; do not infer authority from generic staff metadata or title
  text alone.
- The existing `resolveFinalCatalogCopy` and AI pipeline remain the authority for candidate/root
  reconciliation. No Studio-only label override and no global AI prompt or lifecycle change is
  planned.
- Add regression coverage for generated/default Staff Artwork titles being replaceable by a valid
  AI candidate, explicit Staff Artwork titles remaining protected, AI-generated title provenance
  persisting after the final catalog-copy write, and normal Customer Upload/import behavior staying
  unchanged.

If Formal Review determines that the current production mode requires root-title persistence at
the `needs_review` enrichment write rather than at approval/final-catalog persistence, that would be
a separate AI pipeline behavior decision. It is not silently included here because the documented
workflow is “AI suggests; staff approves” and the request explicitly excludes unrelated AI
enrichment changes.

### 2. Staff Artwork action copy

Update only Staff Artwork action copy in the confirmed Studio files:

- `SendStaffArtworkToAiReviewConfirmDialog.tsx` — dialog title, confirmation button, and related
  sentence where the action is named.
- `StaffArtworkPage.tsx` — single-item button, multiple-select submit/retry button, selection
  accessibility labels/help text, success messages, and bounded error copy where it names this
  action.
- Existing `AI Review` workspace labels, route, sidebar destination, and lifecycle terminology
  remain unchanged.

Update the existing Staff Artwork contract test so it asserts the new copy and rejects the old
action wording in the scoped surface.

### 3. Cursor pagination

Add a Staff Artwork page contract patterned after `useDesigns` and `designService`:

- Add Staff Artwork list cursor/page types under the Staff Artwork feature.
- Add a service method that queries the existing `staffArtworks` collection with the current status
  scope, optional customer filter, `createdAt desc` plus `__name__ desc`, `limit(pageSize + 1)`,
  and `startAfter` from the cursor.
- Keep the current newest-first ordering. Preserve `fromServer` refresh behavior.
- Add the additive `__name__` tie-breaker index variants required by the exact query shape if the
  repository index definition does not already cover them. This is an index-definition change only;
  no data migration/backfill is included.
- Move list loading/cursor/append/reload/removal state behind a focused Staff Artwork hook so the
  page remains composition/UI code and does not contain Firestore query logic.
- Render the loaded page(s), an established **Load more** control, initial/append loading states,
  empty state, and existing error state. Search and customer filtering continue to operate on the
  loaded rows; loading more reveals additional ordered rows without changing the current filter
  model.
- Preserve Print Request selection state across page loads. AI Multiple Select operates on loaded
  eligible cards, retains selected IDs while pages append, and removes promoted/failed IDs from
  selection using the existing result semantics.
- After promotion or deletion, clear stale cursors and reload the first page so the result set
  closes gaps predictably. Do not leave the UI on a cursor from a result set that has changed.
- Keep preview URL resolution bounded to the loaded rows; clear URL/cache entries for removed
  rows as the current page already does.

The current compatibility behavior for a temporarily unavailable composite index must remain
bounded and must not silently revert to an unbounded collection read. If it cannot support a safe
cursor, the smallest safe behavior is an explicit retryable list error until the established index
is available; this decision will be confirmed in Formal Review.

### 4. Preview continuity hardening and tests

Keep the canonical independent Design asset model:

- source/production remains private Staff Artwork input;
- promotion copies production, preview, and thumbnail into canonical Design paths;
- AI Review resolves only `designs.previewPath` / `designs.thumbnailPath` through the existing
  Design derivative URL service;
- Staff Artwork Storage Rules and Portal projections remain unchanged.

Add focused regression coverage that proves:

- the promotion writes canonical Design derivative paths;
- available Staff Artwork preview/thumbnail paths are copied to those canonical targets;
- AI Review detail/queue components resolve catalog Design paths only;
- missing preview safely falls back to the canonical thumbnail when represented by the existing
  model; and
- no `staff-artwork` Storage path or `staffArtworks` document reader is introduced into AI Review
  or Portal code.

If repository inspection during implementation disproves safe continuity for a specific legacy
record shape, stop that subpart at **[NEEDS REPO CHECK]** and document the exact missing derivative
or security boundary plus the smallest safe alternative. Do not weaken Rules or keep private source
links as a shortcut.

## Scope and explicit non-goals

In scope:

- Studio Staff Artwork list/pagination, selection, promotion, and copy.
- Promotion title provenance and canonical AI title persistence involved in this path.
- Existing canonical Design derivative copy and AI Review resolution tests.
- Focused Studio, Functions, shared, and title-authority regression coverage.
- Narrow durable documentation updates for the additive Staff Artwork provenance field and index/query
  contract if implementation matches this plan.

Out of scope:

- New lifecycle statuses, collections, batch jobs, or AI Review redesign.
- Portal Staff Artwork upload redesign or Portal customer behavior.
- Global prompt/model/provider changes or unrelated AI enrichment semantics.
- Firestore/Storage Rules changes unless a separately reviewed security defect proves they are
  necessary.
- Data migration, backfill, mass reprocessing, production deployment, or Studio release.

## Expected implementation files

Exact source files confirmed during repository inspection:

- `functions/src/staffArtwork.ts`
- `functions/src/ai/finalCatalogCopy.ts`
- `functions/src/ai/finalCatalogCopy.test.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts` — Staff Artwork-originated queue title persistence
- `functions/src/ai/catalogTitleAuthority.contract.test.ts`
- `functions/src/ai/staffArtworkCanonicalTitleLifecycle.test.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts` (tests/contract only unless review authorizes a
  persistence change)
- `apps/studio/src/renderer/src/features/staff-artwork/pages/StaffArtworkPage.tsx`
- `apps/studio/src/renderer/src/features/staff-artwork/services/staffArtworkService.ts`
- `apps/studio/src/renderer/src/features/staff-artwork/components/SendStaffArtworkToAiReviewConfirmDialog.tsx`
- `apps/studio/src/renderer/src/features/staff-artwork/pages/staffArtworkAiReview.contract.test.ts`
- `apps/studio/src/renderer/src/features/staff-artwork/utils/generateStaffArtworkTitle.ts` (likely
  removal or test adjustment after server-default ownership is confirmed)
- `packages/shared/src/types/staffArtwork/staffArtwork.types.ts`
- `apps/studio/src/renderer/src/features/designs/services/designDerivativeUrlService.ts` and/or
  existing AI Review preview tests only if a focused resolver regression requires it
- `firestore.indexes.json` only if the exact cursor query requires the additive tie-breaker entries
- `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx`
- `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewInboxSortPreference.ts`
- `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewInboxSortPreference.test.ts`
- `apps/studio/src/renderer/src/features/ai-review/pages/aiReviewSortPreference.contract.test.ts`
- `apps/studio/src/renderer/src/features/ai-review/pages/staffArtworkCanonicalTitlePersistence.contract.test.ts`
- `apps/studio/src/renderer/src/features/ai-review/utils/staffArtworkAiReviewTitle.test.ts`
- `apps/studio/src/renderer/src/features/ai-review/utils/aiProcessingQueuePreferences.ts`
- `apps/studio/src/renderer/src/features/ai-review/utils/aiProcessingAutoAdvancePreference.test.ts`
- `apps/studio/src/renderer/src/features/ai-review/pages/aiProcessingAutoAdvancePreference.contract.test.ts`
- `functions/src/staffArtworkPromotion.ts` and its legacy-schema tests
- `functions/scripts/staff-artwork-promotion-reconciliation-dev.mjs`
- `functions/scripts/lib/staffArtworkPromotionReconciliationGuard.mjs` and its tests
- New Staff Artwork hook/page/cursor test files under the confirmed feature folders as needed

Durable documentation candidates, updated only if behavior changes:

- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/FIREBASE.md`
- `docs/standards/SECURITY.md`
- `docs/standards/TESTING.md`
- `docs/project/DECISIONS.md` only if the additive title-authority interpretation needs an ADR
  amendment
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md` at Signoff

## Acceptance and test plan

Focused automated coverage must include:

- Staff Artwork title authority: generated/default/import-like title yields to a valid AI candidate;
  explicit Staff title remains authoritative; legacy no-field fallback is bounded; persisted
  `catalogTitleSource` and `title` agree after final catalog-copy resolution.
- Promotion contract: canonical imported + pending Design lifecycle, source filename provenance,
  idempotency, existing active-reference blockers, and preview/thumbnail copy paths.
- Action copy: scoped Staff Artwork buttons, dialog, progress/success/error text use **Send to AI**;
  **AI Review** workspace naming remains intact.
- Pagination: pageSize+1 behavior, stable newest-first order, cursor advancement, optional customer
  filter, empty/error/initial/append states, reload after removal, and no unbounded list query.
- Selection: Print Request selection remains independent; selected IDs survive append; promoted or
  deleted rows are removed safely; current-page multiple select and retry-failed behavior remain.
- Preview: AI Review uses canonical Design paths, preview-first/thumbnail-fallback resolution, and
  no private Staff Artwork reads.
- Existing normal import and Ready Design reprocess title/lifecycle behavior remains unchanged.
- AI Review sort preference: localStorage read/write, URL/tab/filter stability, and no backend
  persistence.
- AI Processing Auto advance preference: localStorage read/write, valid legacy session migration,
  invalid-value fallback, explicit-toggle authority, and no reset from queue data, filters,
  pagination, selections, processing actions, navigation, remounts, or Studio restart.
- Staff Library canonical title invariant: four origin-history fixtures converge on the same
  Staff-Artwork-origin rule; persisted `designs.title` and `catalogTitleSource` are checked before
  and after approval; Design Library and Portal consume the canonical title; old mis-stamped
  placeholders can be replaced while human-looking explicit titles cannot.
- Legacy compatibility: actual pre-corrective fixture normalization, fallback derivative paths,
  existing-Design lookup by `sourceStaffArtworkId`, no duplicate Design creation, and read-only DEV
  reconciliation classification.

Run at Test gate, adjusted only for exact files created by the approved implementation:

```text
npx tsx --test \
  functions/src/ai/finalCatalogCopy.test.ts \
  functions/src/ai/catalogTitleAuthority.contract.test.ts \
  functions/src/ai/canonicalCatalogCopyPersistence.contract.test.ts \
  apps/studio/src/renderer/src/features/staff-artwork/pages/staffArtworkAiReview.contract.test.ts \
  apps/studio/src/renderer/src/features/designs/services/designDerivativeUrlService.test.ts \
  packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.test.ts \
  packages/shared/src/utils/staffArtworkSource.test.ts

npm --workspace @fresh-prints/functions run build
npx tsc --noEmit -p apps/studio/tsconfig.json
npm --workspace @fresh-prints/studio run build
npx eslint <approved changed Studio/Functions/shared files> --max-warnings 0
git diff --check
```

Run the focused Staff Artwork Firestore/Storage emulator suite if implementation touches its
contracts. No Rules or Storage deployment is implied by this plan.

## Risks and gates

- **Title authority risk:** a default title must not be classified as explicit staff authority, but
  an explicitly entered/edited title must not be overwritten by AI. The additive provenance field
  plus legacy bounded fallback is the control; Formal Review must approve the exact default-vs-
  explicit semantics.
- **Pagination/index risk:** adding `__name__` as a tie-breaker may require additive indexes. No
  production index deployment is authorized in this phase.
- **Selection risk:** removal can invalidate a cursor and leave selected IDs stale. Reload/reset and
  explicit selection reconciliation are required regressions.
- **Privacy risk:** preview continuity must copy into catalog-owned paths and must never teach AI
  Review or Portal to resolve private Staff Artwork paths.
- **Workflow risk:** no parallel AI state or direct approval shortcut may be introduced.

Required next gate: Formal Review of the runtime root-cause amendment, then Implement → Test →
bounded DEV Functions deploy (owner-authorized) → Owner DEV QA. Signoff, production deployment,
release, backfill, and reconciliation writes remain unauthorized.

---

## Amendment — proven runtime root cause (Owner DEV QA failure)

Recorded 2026-09-19 after Owner DEV QA failed despite **119/119** focused automated tests.

### Proven answers (required before any further implementation)

| # | Question | Proven answer |
|---|---|---|
| 1 | Exact field with the correct AI title | `designs.aiSuggestions.title` |
| 2 | Exact field with the wrong Staff Library title | Canonical `designs.title` (10-char hex / Staff Library title) |
| 3 | When should canonical title change? | On AI enrichment success in `markAiSuccess` (Needs Review via `resolveStaffArtworkAiGeneratedTitle`; autonomous Ready via `finalCatalogFields` from `resolveFinalCatalogCopy`), and again on human Approve via `draft.title` → `designService.updateDesign` |
| 4 | Does it change there today on DEV? | **No.** Live DEV documents with usable `aiSuggestions.title` still keep the short root title. |
| 5 | If yes, what later overwrites it? | N/A for undeployed helper. **Additionally**, once both writers exist under DEV autonomy, `...finalCatalogFields` is spread **after** `...staffArtworkTitleFields` and can restore a staff-trusted short ID. |
| 6 | If no, which branch skips/fails? | (A) Live `enqueueAiEnrichment` on `fresh-prints-dev` does not serve this corrective (local-only). (B) DEV `settings/aiEnrichment` has `catalogWorkflowMode: "autonomous"` and `catalogAutonomousLiveEnabled: true`, so Ready is published through `resolveFinalCatalogCopy`, which treats `catalogTitleSource: "staff"` as absolute authority — including mis-stamped hex IDs. (C) The prior helper also skipped `staff` + placeholder when `importSourceFileName` was present. |
| 7 | Why did Codex tests pass while DEV failed? | Tests exercised local helpers/fixtures and **simulated** approval/Portal writes. They never required a deployed Cloud Function, never asserted live Firestore after `enqueueAiEnrichment`, and never modeled DEV autonomy overwriting a Staff-stamped placeholder. |
| 8 | Specific test gap | No autonomous Staff-origin overwrite regression; lifecycle fixtures omitted `importSourceFileName` on legacy `staff` rows; one unit test **encoded** the wrong skip (`staff` + hex + filename → undefined); no deploy/runtime gate. |

### DEV runtime evidence (read-only; zero writes)

- Re-ran `functions/scripts/staff-artwork-promotion-reconciliation-dev.mjs` and a one-off Admin read against `fresh-prints-dev`.
- **25** Staff-originated Designs; **0** currently `status: "ready"`.
- **10** Designs have `aiSuggestions.title` while `designs.title !== aiSuggestions.title` (example: `5vdXERTMMudoOzQvySfy` — root `f70a4b2f0a`, AI `Red Farmall Tractor Sunset Field Roots`, `catalogTitleSource: "staff"`, no `importSourceFileName`, `readyAt` present, demoted to `imported`/`pending` for reprocess).
- `settings/aiEnrichment`: `catalogWorkflowMode: "autonomous"`, `catalogAutonomousLiveEnabled: true`.
- `firebase functions:list --project fresh-prints-dev`: `enqueueAiEnrichment` / `promoteStaffArtworkToAiReview` ACTIVE but last sourced **before** this Sep 19 corrective; workflow state correctly said implementation was local-only.

### Display path (not the bug, but explains the symptom)

- AI Review queue/form: `aiSuggestions.title` / `draft.title` (`aiProcessingOutput.getQueueDesignLabel`, `aiReviewFormState`).
- Design Library card: `design.title` (`DesignCard.tsx`).
- Portal/Algolia: Firestore `designs.title` only (`buildPortalCatalogAlgoliaRecord`).

### Bounded implementation correction (this amendment only)

1. **`resolveFinalCatalogCopy`:** when `sourceStaffArtworkId` is present and the root title matches the bounded placeholder detector, do **not** treat `catalogTitleSource: "staff"` (or other explicit stamps on that placeholder shape) as protecting the root — prefer a structurally valid AI candidate and stamp `ai_generated`. Human-looking staff titles remain protected.
2. **`resolveStaffArtworkAiGeneratedTitle`:** treat Staff-origin placeholder roots stamped `staff` as repairable **even when** `importSourceFileName` is present (post-corrective promotion always copies the filename). Remove the false “explicit” protection for hex IDs that only looked protected because a filename existed.
3. **`aiEnrichmentPipeline.markAiSuccess`:** spread `staffArtworkTitleFields` **after** `finalCatalogFields` so a Staff-origin AI title cannot be overwritten by a residual trusted-root final-catalog write under autonomy.
4. **Tests:** add autonomous Staff-origin overwrite regression; add `staff` + hex + `importSourceFileName` persistence; extend lifecycle fixture; keep human-looking staff titles protected; keep Import/customer-upload/Ready-reprocess unchanged.
5. **DEV verification gate:** after automated Test, request owner authorization for a **bounded** DEV Functions deploy of the AI enrichment/promotion closures only, then prove one real Staff-origin Design’s Firestore title equals the accepted AI title after AI (and after Approve → Design Library → Portal). No production deploy, no reconciliation apply, no Studio release, no Signoff in this amendment.

### Explicit non-goals (unchanged)

- No UI workaround reading `aiSuggestions.title` in Design Library/Portal.
- No private Staff Artwork dependency downstream.
- No legacy reconciliation writes.
- No production/Rules/index/secrets/console actions unless separately authorized.
