# Plan: Customer-Upload Oversized-Image Normalization and Processing Performance

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Author | FreshForge Planning Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-review.md` |

---

## Goal

Make customer-upload image processing reliable and fast for large-but-valid files, without changing
accepted formats, quality policy, transparency requirements, or the Print Request 200-effective-DPI
save floor. This Plan also formally scopes — but does **not** implement — the two owner-directed
follow-on goals (reference-image MB-limit increase; catalog derivative-storage consolidation) so the
Goal Order accurately reflects three distinct, evidence-backed pieces of work rather than one
merged effort.

## Background

Owner-directed 2026-07-29, next in the pre-production sequence after
`preproduction-static-analysis-cleanup`. A parallel research pass (this session) traced the full
customer-upload pipeline, the Assisted Creation reference-image pipeline, and the catalog
original/preview/thumbnail system end to end. See **Appendix: Research Findings** for the full
evidence base with exact file/line citations. The findings below are the load-bearing facts this
Plan is built on.

### The concrete bottleneck (Workstream A)

`functions/src/finalizeCustomerUploadZip.ts:282-330` processes every image in an uploaded ZIP
**sequentially** — a `for...of` loop with `await processCustomerUploadImageBytes(...)` inside, not
`Promise.all` or a bounded-concurrency queue. A ZIP may contain up to
`CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES = 100` images
(`packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts:68`), each up to
`CUSTOMER_UPLOAD_MAX_DIMENSION_PX = 15,000`px per side and
`CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS = 100,000,000` px total
(`customerUploadLimits.constants.ts:9,11`), all inside one 540-second, 2 GiB `onCall` invocation
(`finalizeCustomerUploadZip.ts:61-62`).

Per image, `processCustomerUploadImageBytes` (`functions/src/lib/customerUploadProcessing.ts:359-736`)
performs, at full resolution when needed: a sampled transparency check (800px sample), a trim probe
(512px sample), a **full-resolution** `sharp().ensureAlpha().trim().png()` pass
(`customerUploadProcessing.ts:239-293`) when trim is warranted, and — for the ~1-in-N images that
qualify — one upscale pass via `.resize(..., { fit: "fill" })`
(`customerUploadProcessing.ts:296-337`), then two parallel WebP encodes for preview/thumbnail
(`:339-354`). A 100-megapixel PNG run through full-res trim + upscale is real CPU/memory work; doing
that up to 100 times **in series** inside one function invocation is the identified root cause of
slow/oversized-batch processing and the mechanism most likely to produce a timeout on large,
legitimate customer ZIPs. The single-image finalize path
(`functions/src/finalizeCustomerUpload.ts`) does not have this compounding problem — it processes
exactly one image per invocation — but still does the same full-resolution work synchronously inside
the callable, so very large single files remain a secondary (smaller) risk there too.

The `CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE = 8` lease
(`functions/src/lib/customerUploadRateLimit.ts:35,86-116`) bounds *how many finalize callables* a
customer can have in flight, but does nothing for *work done inside* a single ZIP finalize call —
it does not parallelize the loop above.

### Workstream B and C are separately scoped, not merged

Per the owner's explicit instruction, this Plan does **not** blindly fold Workstreams B and C into
Workstream A's implementation. See **Recommendation** below for why they should run as separate
managed goals with their own Plan/Review cycles, sequenced immediately after this one, rather than as
sub-workstreams inside one big Implement phase.

---

## Recommendation: Separate Coordinated Managed Goals (not one merged goal)

**Decision: three separate managed goals, run in Goal Order #9→#10→#11, coordinated but not
merged.** Rationale:

1. **Distinct product/security boundaries already exist in the code.** Workstream A
   (`customer-uploads/`) and Workstream B (`assisted-creation/`) are different features with
   different Storage Rules blocks (`storage.rules:107-140` vs. `:142-184`), different shared-constant
   files, different client components, and — critically — different processing models: A generates
   PNG production + WebP derivatives via `sharp`; B stores reference images **as-is** with no
   processing at all (`functions/src/lib/assistedCreationReferencePromote.ts` is a pure GCS `copy()`).
   Merging their Plans would blur two independently-reviewable security surfaces for no benefit.
2. **Workstream C touches a third, unrelated subsystem** (catalog `Design` originals/previews/
   thumbnails, the ADR-FP-120 generated-snapshot system, and `purgeArchivedDesignAssets.ts`) with its
   own migration/rollback/consumer-inventory concerns spanning ~15+ files in Studio, Portal, and
   Functions. It has no code-level dependency on A or B at all — no shared file is modified by more
   than one workstream's likely implementation.
3. **Different owner-decision types.** A is a pure performance fix (no new limit, no new format). B
   requires an explicit owner MB-limit decision with tradeoffs (no evidence exists yet for a specific
   target value — see Workstream B below). C requires a destructive-cleanup-adjacent migration
   decision (even though this Plan explicitly forbids deletion) and touches the generated-snapshot
   byte budgets from ADR-FP-120. Bundling them under one Formal Review would force one verdict across
   three different risk profiles.
4. **"Coordinated, not concurrent-by-default."** Nothing in A, B, or C's current architecture
   requires sequencing — B and C do not read or write any file this Plan proposes changing in A. They
   *can* be worked in parallel once each has its own approved Plan, if the owner wants that. But they
   should not start implementation in parallel with A inside a single Test/Signoff cycle, because a
   shared Signoff would make it impossible to ship A's timeout fix independently if B or C hits a
   blocking owner decision (e.g., the MB-limit checkpoint in B).

**What "coordinated" means in practice:** the same Goal Order entry range (#9–#11), a shared
Appendix: Research Findings section (this document) that all three future Plans may cite instead of
re-deriving the same repo inventory, and an explicit rule that `production-release` (#12) stays
blocked until all three are individually signed off — matching the owner's instruction. This Plan
implements #9 fully and produces B/C's initial scoping (file inventory, current limits, open
questions) so their own Plans can be written quickly without re-doing this research pass.

---

## Scope (Workstream A — the only workstream this Plan authorizes for Implement)

### In Scope

- Convert `finalizeCustomerUploadZip.ts`'s sequential per-image processing loop
  (`:282-330`) to bounded concurrency, so multiple images in one ZIP process in parallel up to a
  measured/justified concurrency ceiling, while preserving:
  - the existing discovery-phase manifest write (unchanged, stays sequential — it's cheap metadata,
    not image processing);
  - exact per-image error handling, `technicalStatus`/`technicalProgressStage` transitions, and the
    final `readyCount`/`failedCount` batch summary;
  - exact processing outputs (same PNG production bytes, same WebP preview/thumbnail bytes, same
    `effectiveDpi`/print-size metadata) — this is a concurrency change, not a processing-logic
    change.
- Measure and set an evidence-based concurrency ceiling for the in-function image-processing loop,
  bounded by the function's 2 GiB memory allocation and worst-case per-image memory (100-megapixel
  PNG decode + full-res trim buffer + upscale buffer). Do not guess a number without a documented
  worst-case memory calculation.
- Re-examine whether 540 seconds / 2 GiB remain sufficient once processing is parallelized, or
  whether a bounded-concurrency approach alone resolves the timeout risk without a config change. A
  memory/timeout increase is in scope **only if evidence proves the current values are the binding
  constraint after parallelization**, and any such change is a narrow config value, not a rewrite of
  the function's shape.
- Apply the same treatment (if the evidence supports it) to whether `finalizeCustomerUpload.ts`'s
  single-image path needs any change — expected finding is "no, it already processes one image per
  invocation," but this must be confirmed, not assumed.
- Preserve the `CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE` per-customer lease exactly as-is — it is a
  cross-invocation concurrency limiter and is orthogonal to the in-function loop fix.
- Add focused tests proving: (a) processing results are byte-identical/equivalent regardless of
  concurrency (same inputs → same outputs, no shared mutable state races), (b) a partial-batch
  failure (one image fails, others succeed) still produces the correct per-image `technicalStatus`
  and batch `readyCount`/`failedCount`, (c) the chosen concurrency ceiling is enforced (never more
  than N images processing at once within one invocation).
- Preserve every item in **Preserve** below, verified by existing and new tests.
- Update `docs/project/DECISIONS.md` with a new ADR (next available: ADR-FP-123) recording the
  concurrency-ceiling decision and its evidence, since this changes a previously-undocumented
  performance characteristic of a production Cloud Function.

### Out of Scope (this goal)

- Any change to accepted formats, size ceilings, transparency requirements, upscale policy
  (ADR-FP-080), or the 200-effective-DPI Print Request save floor (ADR-FP-075) — Print Request
  sizing is a separate save-time gate, untouched by import/upload processing.
- Any change to `CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES`, `CUSTOMER_UPLOAD_MAX_ZIP_ENTRIES`, or any
  other existing limit constant.
- Workstream B (reference-image MB limit) and Workstream C (catalog derivative consolidation) —
  scoped below for their own future Plans, not implemented here.
- Any Storage Rules change.
- Any new dependency.
- Any change to the `CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE` per-customer lease value or mechanism.
- Client-side (Portal) upload UI/UX changes.
- Production deployment.

---

## Affected Areas (Workstream A)

### Files / Modules (expected)

- `functions/src/finalizeCustomerUploadZip.ts` — convert the processing-phase loop to bounded
  concurrency.
- `functions/src/lib/customerUploadProcessing.ts` — read-only reference; no logic change expected,
  but must be re-verified for hidden shared-mutable-state assumptions (e.g., any module-level cache)
  that would make concurrent invocation unsafe. `[NEEDS REPO CHECK during Implement: confirm no
  module-level mutable state exists in this file or its sharp usage before parallelizing callers]`.
- A new small concurrency-queue helper (`functions/src/lib/` — exact name TBD during Implement,
  e.g. `boundedConcurrencyMap.ts`) **only if** no existing equivalent helper already exists in this
  codebase. `[NEEDS REPO CHECK during Implement: grep functions/src and packages/shared for an
  existing p-limit-style helper before adding one — Studio's
  apps/studio/electron/services/import/derivativeGenerationService.ts references a
  "derivativeConcurrencyQueue" per the research pass; check whether that pattern is reusable or
  Electron-only]`.
- `functions/src/finalizeCustomerUploadZip.test.ts` (new, or extend if it already exists —
  `[NEEDS REPO CHECK]`) — concurrency-equivalence and partial-failure tests.
- `docs/project/DECISIONS.md` — new ADR-FP-123.

### Architecture Impact

- [x] None beyond the stated Function.
- Processing logic (`customerUploadProcessing.ts`) stays a pure, callable-agnostic module. Only the
  *caller's* iteration strategy in `finalizeCustomerUploadZip.ts` changes.
- No change to Component → Hook → Service → Firebase layering; this is entirely within the Functions
  layer.

### Security Impact

- [x] None — no auth, validation, or Rules change. Existing per-file size/dimension/pixel/format
  validation inside `processCustomerUploadImageBytes` runs unchanged for every image, concurrency
  does not skip or weaken any check.
- Must verify concurrent Firestore `uploadRef.update()` calls (one per image, for progress-stage
  writes) do not race incorrectly — each write targets a distinct document (`uploadId`-scoped), so
  cross-image races are not expected, but this must be verified, not assumed, since the doc IDs are
  deterministic (`deterministicZipUploadId`, `finalizeCustomerUploadZip.ts:192`) and re-entrant calls
  must not corrupt state.

### Data Model Impact

- [x] None — no schema/field change. `readyCount`/`failedCount` aggregation logic must produce the
  identical final numbers regardless of completion order.

### Backend Impact

- [x] Cloud Function behavior change (internal loop concurrency), no export/trigger/callable
  signature change.
- Function memory/timeout values may change **only if evidence requires it** (see Approach).

### UI / UX Impact

- [x] None intended. Faster large-ZIP processing is a latency improvement invisible to the existing
  progress-stage UI contract (Portal already polls `technicalStatus`/`technicalProgressStage` per
  upload — concurrent updates to different documents do not change that contract).

### Migration Impact

- [x] None. No data migration; this is a runtime behavior change to a stateless Function.

---

## Approach (Workstream A)

1. **Confirm the worst-case memory budget before choosing a concurrency number.** Compute (do not
   guess): peak per-image memory for a 100-megapixel source (decode buffer + `ensureAlpha` alpha
   channel + full-res trim output buffer + potential upscale target buffer, per `sharp`'s documented
   memory model) against the function's `memory: "2GiB"` ceiling
   (`finalizeCustomerUploadZip.ts:62`). Derive a concurrency ceiling with headroom (e.g., target
   ≤60–70% of 2 GiB under the worst-case scenario of N images at max size processing simultaneously).
   Record the calculation and its inputs in the ADR, not just the resulting number.
2. **Check for an existing bounded-concurrency helper** before writing a new one (see Files /
   Modules above) — reuse over reinvention per project conventions.
3. Replace `finalizeCustomerUploadZip.ts:282-330`'s sequential `for...of` with the bounded-concurrency
   helper, preserving: per-image `technicalStatus`/`technicalProgressStage` writes, per-image
   try/catch → `failedCount`/`fileResults` accumulation, and the final aggregate write — all outputs
   must be order-independent (use `Promise.allSettled`-equivalent semantics inside the bounded queue,
   not fail-fast, since one bad image must not abort the batch, matching current sequential
   behavior).
4. Re-run the memory/timeout analysis with the chosen concurrency applied — if 2 GiB / 540s is
   insufficient even with the bounded ceiling for the documented worst case, propose the narrowest
   sufficient increase with evidence, flagged as a **Human Checkpoint** (Cloud Function memory/timeout
   changes affect billing and cold-start behavior) before Implement applies it.
5. Verify `finalizeCustomerUpload.ts` (single-image path) needs no change — confirm via the same
   memory calculation that a single worst-case image fits comfortably within its existing 2 GiB.
6. Add the focused tests listed in Scope. Prefer testing the bounded-concurrency helper as a pure
   function (inputs: list of async tasks with controllable resolve/reject timing; outputs: all
   results collected, concurrency ceiling never exceeded) plus one integration-shaped test against
   `finalizeCustomerUploadZip`'s aggregation logic if the existing test harness supports mocking the
   Storage/Firestore calls it makes. `[NEEDS REPO CHECK during Implement: read
   functions/src/finalizeCustomerUploadZip.test.ts if it exists, to reuse its existing mock/harness
   pattern rather than building a new one]`.
7. Run the full verification matrix (below), inspect the diff for unrelated changes, and produce the
   ADR.

---

## Preserve (binding, all workstreams' eventual implementations)

- Server-authoritative validation — every size/format/dimension/transparency check in
  `processCustomerUploadImageBytes` continues to run for every image, unconditionally.
- Current transparency requirements (`assessMeaningfulTransparency`,
  `packages/shared/src/utils/customerUploadTransparency.ts` — `CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX
  = 250`, `CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO = 0.005`,
  `CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO = 0.01`) — unchanged values, unchanged pass/fail logic.
- ADR-FP-080 image-quality behavior (production pixel-basis quality, single-pass ≤6× upscale,
  12″-width aspect-locked target, no automatic halftone detection) — unchanged.
- ADR-FP-075's 200-effective-DPI Print Request save floor — this Plan's Workstream A does not touch
  Print Request save-time validation at all; it is a separate gate in Portal/Studio request sizing,
  not in upload/import processing.
- Production-quality output — no output format, resolution, or quality value changes.
- Existing customer-upload and print-request workflows — no client-visible behavior change beyond
  latency.

---

## Workstream B (scoped for a future Plan, not implemented here): Reference-image MB-limit increase

### Current state (evidence, not proposal)

| Item | Value | Source |
|---|---|---|
| Per-file limit | `ASSISTED_CREATION_MAX_REFERENCE_BYTES = 15 MB` | `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts:12` |
| File count limit | `ASSISTED_CREATION_MAX_REFERENCE_IMAGES = 8` | same file, line 11 |
| Accepted formats | JPEG, PNG, WebP | `assistedCreation.constants.ts:16-20`; client `accept` attr `AssistedCreationReferenceUpload.tsx:50` |
| Total-request limit | None found beyond the implicit `8 × 15 MB = 120 MB` ceiling | `[NEEDS REPO CHECK confirmed: no explicit aggregate constant exists]` |
| Storage Rules | `size < 15 * 1024 * 1024 && contentType in [jpeg,png,webp]` | `storage.rules:150-153` (`isValidAssistedCreationImage`) |
| Server validation | Re-validates count/type/size against the same constants | `packages/shared/src/utils/assistedCreationValidation.ts:400-539` |
| Image processing | **None** — stored as-is via GCS `copy()`, no `sharp` involvement | `functions/src/lib/assistedCreationReferencePromote.ts` |
| Customer error copy | `` `Each reference image must be ${N} MB or smaller.` `` | `assistedCreationValidation.ts:468,531` |
| Existing ADR setting a target value | **None found** | grep of `docs/project/DECISIONS.md` for "reference image"/MB/assisted creation |

**No evidence exists anywhere in the repository for what the new limit should be.** No ADR, plan, or
review records an intended target MB value. This is exactly the case the owner's brief anticipated:
**a mandatory owner decision checkpoint is required before this workstream's own Plan can set a
number.**

### Why this stays a separate goal

Reference images are architecturally simple (no processing pipeline at all — Workstream A and C's
`sharp`/derivative concerns do not apply here), so its own Plan will be short. But it needs an
explicit owner MB-limit decision, a `storage.rules` change (which always warrants its own Formal
Review given the security-sensitivity of Storage Rules edits), and a manually-synced-constant risk
identical to the one flagged in Workstream A (`storage.rules:142-143` comment: "Sync limits with
`assistedCreation.constants.ts`" — a manual, not shared-code, sync). Bundling it into this Plan would
force this Plan's Review to carry a Rules-change verdict it doesn't currently need.

### Recommended next step

Before Workstream B's own Plan is written, the owner must choose a target limit. Framing options for
that future checkpoint (not a decision made here):

- **Conservative bump** (e.g., 15 MB → 25 MB, matching the existing `ASSISTED_CREATION_MAX_PROOF_BYTES`
  ceiling already used elsewhere in the same feature for staff proof uploads) — smallest change,
  reuses an already-approved precedent value.
- **Match customer-upload's per-file ceiling** (15 MB → 80 MB, matching
  `CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES`) — consistent cross-feature ceiling, but reference images
  are unprocessed pass-through storage (no `sharp` cost), so the risk profile differs from customer
  uploads and this number may be unnecessarily generous.
- **Owner-specified explicit value** — if there's a known real-world file size customers are hitting
  (e.g., high-res phone photos, certain scanner output), that should drive the number directly.

Workstream B's own Plan must also decide whether a total-request aggregate cap is needed (currently
absent) once the per-file ceiling changes, since raising the per-file limit alone raises the implicit
worst case (`8 × new limit`) proportionally.

---

## Workstream C (scoped for a future Plan, not implemented here): Catalog derivative-storage consolidation

### Current state (evidence, not proposal)

- **Storage layout** (`packages/shared/src/constants/design/designStoragePaths.ts`):
  `/originals/{designId}.png` (production, always kept), `/thumbnails/{designId}.webp` (320×320,
  quality 80), `/previews/{designId}.webp` (1280×1280, quality 85) — both derivatives generated by
  the *same* shared constants file
  (`packages/shared/src/constants/import/derivativeGeneration.constants.ts`) used by both the Studio
  import pipeline (`apps/studio/electron/services/import/derivativeGenerationService.ts`) and the
  customer-upload pipeline (`functions/src/lib/customerUploadProcessing.ts`). **WebP is already the
  standing derivative format across the entire codebase** — this workstream is about *consolidating
  two derivatives into one*, not introducing WebP.
- **Consumer inventory** (partial — see Appendix for the full table): most UI surfaces already fall
  back `previewPath ?? thumbnailPath` (Portal `CatalogDesignDetailsModal.tsx:65`, Functions
  `getPortalDesignShareOpenGraph.ts:104-105`, `getPortalOgShareImage.ts:68-69`) or use thumbnail-only
  for small cards (Studio/Portal grid cards). **No consumer was found falling back to `originalPath`
  for display** — the production PNG is reserved for print-ready output only, confirming the owner's
  "production exports must always use the original" constraint is already the codebase's existing
  behavior, not a new rule to introduce.
- **Asymmetric fallback found**: Studio's Show Queue / gang-sheet export
  (`apps/studio/src/renderer/src/features/gang-sheets/hooks/useGangSheetShowAssets.ts:72-89`) uses a
  full preview→thumbnail fallback for customer-upload-backed items but thumbnail-only for
  catalog-design-backed items — this inconsistency is relevant to Workstream C's "one display
  derivative" design and should be resolved as part of that goal, not this one.
- **Generated-snapshot coupling**: the ADR-FP-120 catalog snapshot builder
  (`functions/src/catalogSnapshots/snapshotBuilders.ts:117,140-141`) requires `thumbnailPath` and
  optionally includes `previewPath` in its output schema, under documented byte budgets (card buckets
  32 KiB, Discover 512 KiB — `DECISIONS.md:112-118`). Changing the derivative schema requires
  re-checking these budgets, not just the Storage layer.
- **Existing purge/retention precedent**: `functions/src/purgeArchivedDesignAssets.ts` already
  deliberately keeps `/thumbnails/` while deleting `/originals/` and `/previews/` on archived-design
  purge (`:41-56`, comment: "Keep /thumbnails/ for print-request / show-queue history reference") —
  this is a **relevant existing precedent Workstream C's Plan must reconcile**: if thumbnail and
  preview become one derivative, this purge function's two-tier delete/keep logic needs an explicit
  redesign decision, not a silent behavior change.
- **No generic orphan/reconciliation audit tool exists** in the codebase today (confirmed via grep,
  not merely unread) — Workstream C's own Plan must design this measurement tooling from scratch as
  part of its "audit orphaned/duplicate/abandoned assets before attributing Storage usage"
  requirement.

### Why this stays a separate goal

This workstream's blast radius (Studio, Portal, Functions, the ADR-FP-120 snapshot schema, and the
`purgeArchivedDesignAssets` retention policy) is architecturally unrelated to Workstream A's Function
concurrency fix and Workstream B's Storage Rules/limit change — no file any of the three would
plausibly touch overlaps with another. It also carries this Plan's explicitly required migration
posture (originals always preserved, no deletion without a separate owner checkpoint, rollback
available, every consumer migrated first) which is a materially heavier Review than A or B and
deserves its own dedicated Formal Review pass.

### Recommended next step

Workstream C's own Plan must, at minimum: (1) complete the full consumer inventory (this pass found
~20 confirmed + several `[NEEDS REPO CHECK]` consumers — see Appendix), (2) design the Storage-usage
measurement strategy referenced in scope (no tooling exists yet), (3) propose the migration
compatibility shape (e.g., does a design need a new `displayPath` field alongside legacy
`previewPath`/`thumbnailPath` during transition, or does a fallback chain suffice), (4) explicitly
resolve the `purgeArchivedDesignAssets.ts` two-tier keep/delete policy under the new one-derivative
model, and (5) get separate owner approval for the destructive cleanup phase — none of that work
belongs in this Plan.

---

## Test Strategy (Workstream A only)

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Toolchain record | `npx tsc -v` | yes |
| Functions build | `npm run build --prefix functions` | yes; exit 0 |
| Repository lint | `npm run lint` | yes; exit 0 |
| Focused unit tests (bounded-concurrency helper) | `npx tsx --test <new helper test file>` | yes |
| Focused unit tests (existing customer-upload processing, unchanged) | `npx tsx --test functions/src/lib/customerUploadProcessing.test.ts` | yes — must still pass unmodified, proving no processing-logic drift |
| Focused unit/integration tests (`finalizeCustomerUploadZip`) | `npx tsx --test functions/src/finalizeCustomerUploadZip.test.ts` (new or extended) | yes |
| Changed-file lint | `npx eslint <exact changed files> --report-unused-disable-directives --max-warnings 0` | yes |
| Diff whitespace/integrity | `git diff --check` | yes |

### Manual

- [x] Conditional.
- If the memory/timeout analysis in Approach step 4 concludes a config change is needed, that is a
  **Human Checkpoint** (see below) before Implement applies it — not something Implement decides
  unilaterally.
- No dev/production deployment or live Storage/Firestore data test is authorized in this goal; if the
  Test phase determines a real large-ZIP timing measurement against a dev Function is the only way to
  validate the concurrency ceiling, that specific narrow action requires its own owner approval before
  it happens (Cloud Function invocation against `fresh-prints-dev` is a live-environment action).

## Human Checkpoints Anticipated

- [ ] Manual UI/UX review — not expected (no UI change)
- [ ] Design approval — not expected
- [ ] Business logic decision — not expected for Workstream A
- [ ] Production deploy — not in this goal
- [ ] Database migration — not in this goal
- [ ] Auth / external service setup — not in this goal
- [ ] Secrets / env vars — not in this goal
- [x] Other: **conditional** — only if the memory/timeout evidence in Approach step 4 concludes the
  current `finalizeCustomerUploadZip` config (2 GiB / 540s) must change; and **only if** validating
  the chosen concurrency ceiling requires invoking a real dev-environment Cloud Function rather than
  a local/mocked test.
- [x] Workstream B's own future Plan requires an owner MB-limit decision checkpoint before it can be
  written with a concrete target value (see Workstream B above) — flagged here so it is not
  overlooked when that goal starts.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Chosen concurrency ceiling exceeds the 2 GiB memory budget under worst-case image sizes, causing OOM instead of fixing timeouts | High | Compute the worst-case per-image memory budget from `sharp`'s documented model before choosing a number; require headroom; test with synthetic max-size fixtures |
| Parallelizing the loop introduces a race in Firestore progress-stage writes or the final `readyCount`/`failedCount` aggregation | High | Each image's writes target a distinct, deterministic document ID; aggregate counters must be computed from `Promise.allSettled`-style results after all tasks complete, not accumulated via a shared mutable counter across concurrent callbacks — verify this in code review before Implement, not just in tests |
| A hidden module-level mutable state in `customerUploadProcessing.ts` or its `sharp` usage makes concurrent calls unsafe | Medium | Explicit `[NEEDS REPO CHECK]` verification step before Implement begins; must be confirmed stateless (or made so) before parallelizing |
| Scope creep — Workstream A's Implement pass accidentally touches B or C's files | Medium | Files/Modules list above is exhaustive for A; anything outside it requires the `[NEEDS REPO CHECK]` justification the workflow already mandates |
| B's future Plan invents an MB limit without owner input | Medium | This Plan explicitly withholds a target value and defers it to a required owner checkpoint in B's own Plan |
| C's future Plan underestimates consumer count and misses a display surface during migration | Medium | This Plan's Appendix provides a partial inventory with explicit `[NEEDS REPO CHECK]` gaps C's own Plan must close before proposing migration |

See `.cursor/workflow/risk-checklist.md`.

## Rollback Plan

Workstream A: revert the loop-concurrency change and any config value change; no data migration
exists to roll back. Workstreams B/C: not implemented in this goal, no rollback needed yet.

## Documentation Updates Required

- [x] `docs/project/DECISIONS.md` — new ADR-FP-123 (Workstream A concurrency-ceiling decision and
  evidence).
- [ ] `ARCHITECTURE.md` / `DATA_MODEL.md` / `BACKEND.md` — not expected to change (internal Function
  behavior only).
- [x] `docs/project/ROADMAP.md` and `.cursor/workflow/state.md` — already updated this pass with the
  owner's Goal Order decision (#9–#12).
- [x] Workflow Plan, Formal Review, test report, Implementation Review, signoff/state, and handoff
  records per FreshForge, for Workstream A only.

## Acceptance Criteria

- [ ] Goal Order in `ROADMAP.md` and `.cursor/workflow/state.md` includes both owner-directed items
  before `production-release` — **done in this pass, see above**.
- [ ] `finalizeCustomerUploadZip.ts`'s image-processing loop runs with evidence-based bounded
  concurrency instead of full serialization.
- [ ] The concurrency ceiling is derived from a documented worst-case memory calculation, not
  guessed.
- [ ] No accepted format, size limit, transparency rule, upscale policy, or DPI floor changes.
- [ ] Per-image error handling and batch `readyCount`/`failedCount` aggregation remain correct under
  concurrent execution, proven by tests including a partial-failure case.
- [ ] `customerUploadProcessing.ts`'s existing tests pass completely unmodified.
- [ ] Functions build, repository lint, changed-file lint, and `git diff --check` all exit 0.
- [ ] A new ADR records the concurrency decision and its evidence.
- [ ] Workstreams B and C are scoped (current-state evidence, open questions, recommended next step)
  but not implemented, deployed, or given a specific limit/migration decision in this goal.
- [ ] No Storage Rules, dependency, schema, or production change occurs.

## Open Questions

- [ ] **Owner checkpoint (Workstream B, future goal):** what MB limit should replace the current
  15 MB reference-image ceiling? No target value exists in any repository record; this Plan
  intentionally defers the decision (see Workstream B, Recommended next step) rather than guessing.
- [x] Workstream A has no open owner-decision blocker unless the memory/timeout evidence in Approach
  step 4 concludes a config change is required (conditional Human Checkpoint above).

---

## Appendix: Research Findings

The complete evidence base — every file/line citation for Workstreams A, B, and C, plus the explicit
list of items marked `[NEEDS REPO CHECK]` during the research pass — is preserved verbatim in the
Formal Review's Independent Verification section
(`docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-review.md`)
so both documents share one citation set rather than duplicating it inline here. Future Plans for
Workstream B and C should cite this Appendix instead of re-running the same repository inventory.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-review.md`
- Verdict: **approved_with_changes** (2026-07-29) — three binding required changes carried into
  Implement (see Review's "Required Changes"): (1) aggregate batch counters from post-settlement
  results, not concurrent-callback mutation; (2) evaluate reusing/relocating the existing
  `DerivativeConcurrencyQueue` pattern before writing a new helper; (3) ADR-FP-123 must show explicit
  worst-case memory arithmetic.
