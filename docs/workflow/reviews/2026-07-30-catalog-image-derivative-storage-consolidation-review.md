# Review: Catalog Image Derivative Storage Consolidation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Reviewer | Independent FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-07-30-catalog-image-derivative-storage-consolidation-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan's investigation is thorough and its central factual claims independently re-verified as
accurate against source: the exact Storage path helpers, the identical shared-constants-driven
generation logic for both derivatives (confirmed to be literally the same constants file consumed
by two different runtimes — Studio Electron and Cloud Functions), the exclusive-original-usage
claim for Show Queue export/gang-sheet generation, and — most importantly for this Plan's core
recommendation — the consistent `thumbnailPath`-for-grids /
`previewPath ?? thumbnailPath`-for-detail pattern across every consumer found, with zero
exceptions to the fallback convention. This last finding is the single fact that makes the
proposed additive/fallback migration strategy low-risk: every consumer already tolerates a missing
`previewPath`, so extending that same tolerance to a missing `displayPath` is not a new failure
mode, it's the same one, one field wider.

The Plan correctly declines to invent exact final dimensions/quality for the shared derivative
(flagging that as a Human Checkpoint instead), correctly identifies and does not disturb the
`purgeArchivedDesignAssets`/ADR-FP-084/ADR-FP-086 "keep thumbnail" retention policies (deferring
their eventual reconciliation with `displayPath` to a future goal rather than silently assuming an
answer), and correctly distinguishes ADR-FP-120 (the generated catalog/Portal manifest
architecture, unaffected) from ADR-FP-121 (the abandoned print-request read-model, unrelated) —
directly satisfying the resume prompt's explicit warning not to conflate the two. Approval is
conditional on four required changes below, all closing real gaps rather than expanding scope.

---

## Independent Verification

- `packages/shared/src/constants/design/designStoragePaths.ts:12-22` — confirmed
  `getOriginalStoragePath`/`getThumbnailStoragePath`/`getPreviewStoragePath` produce exactly
  `/originals/{id}.png`, `/thumbnails/{id}.webp`, `/previews/{id}.webp`, matching the Plan's
  citation exactly.
- `storage.rules:72-105` — confirmed `/originals/`, `/thumbnails/`, `/previews/` blocks exist with
  the exact validation functions the Plan describes (`isCanonicalOriginalFileName`,
  `isCanonicalDerivativeFileName`, `isValidOriginalUpload`, `isValidDerivativeUpload`,
  `isReadyDesignDerivative`). Confirmed thumbnails and previews share byte-identical rule logic
  (both `< 10 MB`, both `image/webp`, both gated by the same `isReadyDesignDerivative` public-read
  function) — directly supports the Plan's claim that a new `/display/` block can mirror this
  structure with no novel rule pattern required.
- `functions/src/catalogSnapshots/snapshotBuilders.ts:110-160` — confirmed `mapPortalCatalogCard`
  returns `null` when `data.thumbnailPath` is not a string (line 114-119) and only spreads
  `previewPath` when present (line 141) — the Plan's "thumbnailPath required, previewPath optional"
  claim is exactly right, not an approximation.
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx:546` — confirmed
  `design?.thumbnailPath ?? design?.previewPath`, matching the Plan's consumer table exactly.
- `apps/studio/src/renderer/src/features/designs/components/DesignSelectionCard.tsx:31,47` —
  confirmed the internal inconsistency the Plan flags (a `previewPath ?? thumbnailPath` resolver
  hook at line 31 alongside a `thumbnailPath`-only `catalogPath` prop at line 47) is real, not
  invented, and the Plan correctly treats it as a minor normalization note rather than a blocker.
- `functions/src/promoteCustomerUploadToAiReview.ts:38-63,141-158` — confirmed promotion **copies**
  bytes via `bucket.file(...).copy(...)` into new catalog-canonical paths, rather than linking to
  the customer-upload's own objects — the Plan's "temporary duplication window" claim is
  structurally correct, and its cross-reference to ADR-FP-086 §4's 14-day cool-off purge
  (`DECISIONS.md:1986`) for the counterpart cleanup is accurate.
- `functions/src/purgeArchivedDesignAssets.ts:41-56` — confirmed `deleteLargeDesignAssets` only
  ever targets `getOriginalStoragePath`/`getPreviewStoragePath`, never
  `getThumbnailStoragePath` — independently confirms ADR-FP-084's "keep thumbnail" policy is live
  in code today, not just documented, which is exactly the fact the Plan uses to justify deferring
  the retention-policy reconciliation question rather than resolving it unilaterally.
- `functions/src/purgeIdleCustomerUploadFullSize.ts` (referenced, not independently re-read in full
  this pass, but the Plan's characterization of its `dryRun` request/response shape as the
  precedent for the new inventory callable is consistent with the general dry-run pattern already
  established across this codebase's other purge callables cited elsewhere in
  `docs/project/DECISIONS.md`).
- ADR-FP-121 (`DECISIONS.md:373-428`) — confirmed line 414's explicit statement that ADR-FP-120 is
  "entirely unaffected" by the abandoned print-request read-model — the Plan's "Existing Generated
  Asset Architecture — Preservation" section correctly cites this distinction rather than glossing
  over it.

No citation in the Plan was found inaccurate in this Review's independent re-verification pass.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicitly excludes deletion, migration execution, deployment, and reopening Goals #9–#11; in-scope/out-of-scope lists are unambiguous |
| Architecture alignment | pass | Additive/fallback design preserves Component→Hook→Service→Callable boundary; no new architectural layer |
| Security impact addressed | pass | New `/display/` Storage Rules block mirrors existing public-read-gate pattern exactly; no privilege expansion |
| Data model impact addressed | pass with condition | Additive-only `displayPath` is sound; see Required Change 1 on retention-policy interaction clarity |
| Backend impact addressed | pass | Correctly declines to modify Function memory/timeout without evidence; correctly proposes reusing `boundedConcurrencyQueue.ts` rather than inventing new concurrency logic |
| Test strategy adequate | pass with condition | 30-item table is thorough; see Required Change 2 on the inventory-tool test seam |
| Human checkpoints identified | pass | 9-item list covers dimensions/quality, schema, sample review, migration, both deployment types, deletion manifest, destructive cleanup, and production — matches the owner's brief exactly |
| Roadmap alignment | pass | Correctly positioned as Goal #12, does not touch #9–#11 |
| Documentation plan | pass | New ADR correctly deferred to Implement, not written speculatively now |
| No silent scope expansion | pass | Explicitly declines to resolve final dimensions, resolve the archive-purge retention question, or attempt content-hash duplicate detection — all correctly deferred rather than silently decided |

---

## Architecture Review

**Findings:**
- The decision to introduce `/display/{designId}.webp` as a new, separate top-level prefix (rather
  than reusing `/previews/` with a different naming convention) is architecturally sound — it
  avoids any regex ambiguity in Storage Rules during the migration window when old and new paths
  must coexist, and it makes the additive nature of the migration structurally obvious (a new path
  family, not a mutated one).
- The reuse of `design.updatedAtMs` as the cache-invalidation trigger for the new field, rather
  than inventing a new versioning mechanism, is the correct minimal-footprint choice — confirmed by
  this Review that `catalogStorageService.ts`'s `getDownloadUrlForCatalogPath(path, contentVersion)`
  already accepts exactly this shape.

**Required changes:**
- [x] **Required change 1 (binding):** The Plan's Risks table names the
  `purgeArchivedDesignAssets`/"keep thumbnail" retention-policy interaction as a "future-goal
  question," which is the right scope boundary, but the Plan should state **explicitly and
  up-front** (not only buried in the Risks table) that until that future goal runs,
  `purgeArchivedDesignAssets` will continue to delete `originals`+`previews` and keep
  `thumbnails` **only** — meaning an archived-and-purged design that has a `displayPath` will
  **lose its display derivative on purge** (since the purge callable has no knowledge of the new
  field) while its now-orphaned `thumbnailPath` survives. This is not a defect in the Plan's
  design, but it is a real, near-term behavioral gap the moment `displayPath` exists in production
  data, and it must be called out as an explicit, named consequence in the Plan's Consequences/Risk
  section, not left implicit in a cross-reference to a future goal. Add one paragraph to the Plan's
  Risks table (or a new "Interaction with archive-purge" subsection) stating this exactly, so
  Implement does not discover it mid-build.

---

## Testing Review

**Findings:**
- The 30-item regression table is comprehensive and well-mapped to the owner's original list.
- Item 30 (object-count/byte-usage reports reconcile with Storage inventory) correctly flags that
  this repository has no existing precedent for testing `bucket.getFiles()`-based enumeration, but
  the Plan does not commit to how that test seam will actually work (emulator vs. mock vs.
  something else) — it names the ambiguity but doesn't resolve enough of it for Implement to start
  confidently.

**Required changes:**
- [x] **Required change 2 (binding):** Before Implement writes the inventory-tool test, it must
  decide and document (in Implement's own first-step report, mirroring the pattern already
  established in Goal #11's binding-condition-3 resolution) whether the classification logic
  (referenced / orphaned / purged-per-policy / promotion-cool-off-duplicate) is extracted as a
  **pure function operating on already-fetched metadata arrays** (directly unit-testable with
  synthetic fixtures, no emulator needed) versus requiring a live Storage/Firestore emulator. Given
  this repository's consistent existing pattern of extracting pure, directly-testable logic away
  from the `onCall` I/O shell (`withTimeout.ts`, `withCustomerUploadFinalizeWatchdog.ts`,
  `boundedConcurrencyQueue.ts`, `evaluateCustomerUploadFullSizeRetention` all cited or implied
  across this session's own prior goals), the strong expectation is a pure-function extraction, not
  an emulator-based test — but the Plan should say so explicitly rather than leaving it as an open
  question for Implement to rediscover the same lesson Goal #11 already learned.

---

## Data Model Review

**Findings:**
- Additive-only `displayPath?: string` is sound and matches this codebase's own established
  precedent for schema evolution without backfill/migration risk (the same pattern Goal #11 used
  for `wasNormalizedForDimensions`).
- The Plan correctly identifies that `mapPortalCatalogCard`'s existing `contentVersion` hash will
  automatically pick up a new `displayPath` field without any special-case propagation code — this
  is accurate given `contentVersion`'s implementation (a hash over the full card object).

**Required changes:**
- [x] None beyond Required Change 1 (categorized under Architecture above, but equally a Data Model
  concern since it's about `displayPath`'s lifecycle interaction with an existing deletion
  callable).

---

## Backend Review

**Findings:**
- Declining to change Function memory/timeout configuration, and instead reusing the
  `boundedConcurrencyQueue.ts` precedent for the backfill callable, is consistent with this
  repository's established practice (Goal #9's ADR-FP-123 memory-arithmetic discipline) and
  appropriately scaled down given the Plan's own observation that ~80 designs is a small backfill
  target.
- The decision to make the Storage inventory callable dry-run-only in its *first* implementation
  (not just this Plan/Review phase) is a reasonable, conservative interpretation of "no deletion
  without a separate owner checkpoint" — it means Implement doesn't need to build (and this Review
  doesn't need to evaluate) any actual-delete code path at all in the coming Implement pass.

**Required changes:**
- [x] **Required change 3 (binding, minor):** The Plan's Cache-Control finding (Technical Analysis
  item 11) is presented as "a genuine improvement opportunity uncovered by this investigation," but
  the Plan should be explicit that setting `Cache-Control` on the **new** `display` objects while
  leaving the **existing** `thumbnails`/`previews` objects without one (as they are today) creates
  an inconsistency during the migration window — a design with only `thumbnailPath`/`previewPath`
  (not yet backfilled) still serves uncached-header objects, while a migrated design serves
  cached-header ones. This isn't wrong, but the Plan should state it's an intentional, accepted
  transitional inconsistency (resolved once migration completes) rather than leave it unaddressed,
  since a future reader could otherwise read it as an oversight.

---

## Documentation Review

**Findings:**
- Correctly defers the new ADR's actual recording to Implement, consistent with this repository's
  established Plan-drafts/Implement-records pattern (Goal #11 followed the identical sequence for
  ADR-FP-125).
- Correctly identifies which handoff docs will need updates without attempting to write those
  updates now.

**Required changes:**
- [x] **Required change 4 (binding, minor):** The Plan's Open Questions section lists three
  deferred decisions (final dimensions, promotion-time vs. backfill-time `displayPath` generation,
  and the archive-purge retention interaction) but does not state which of these, if any, block
  Implement from *starting* versus which can be resolved *during* Implement's own first steps
  (mirroring how Goal #11's Formal Review explicitly separated "must resolve before writing tests"
  from "resolve during Implement's first step and report explicitly"). Add one sentence per open
  question in the Plan classifying it this way, so Implement has an unambiguous starting order.

---

## Required Changes (approved_with_changes)

1. **(Architecture/Data Model, binding)** Add an explicit "Interaction with archive-purge" note
   stating that `displayPath` will be silently orphaned (not deleted, not retained-with-intent) by
   `purgeArchivedDesignAssets` until a future goal reconciles the two, so this is a known, named
   transitional gap rather than an implicit one.
2. **(Testing, binding)** Explicitly commit the Plan to a pure-function-extraction approach for the
   Storage inventory classification logic (referenced/orphaned/purged/cool-off-duplicate),
   mirroring this repository's own repeatedly-proven pattern, rather than leaving the test-seam
   question fully open for Implement to rediscover.
3. **(Backend, binding, minor)** State explicitly that the Cache-Control gap between new `display`
   objects and not-yet-migrated `thumbnails`/`previews` objects is an accepted, intentional
   transitional inconsistency, not an oversight.
4. **(Documentation, binding, minor)** Classify each of the three Open Questions as either
   "Implement must resolve before starting" or "Implement resolves during its first step and
   reports explicitly," matching Goal #11's own binding-condition precedent for this exact
   situation.

None of these require re-scoping the Plan, changing its recommended architecture, or revisiting
its Storage-measurement design — all four are precision/completeness tightenings within the
already-approved investigation and design.

---

## Blockers

None. Implementation may proceed once the four required changes above are treated as binding and
incorporated (either as Plan amendments before Implement starts, or as Implement's own first-step
resolutions, per Required Change 4's own classification requirement).

---

## Verdict Rationale

**approved_with_changes.** The investigation is exceptionally well-cited for a Plan/Review-only
phase with no code changes to point to — every load-bearing claim in this Review's independent
re-verification pass matched the Plan's citation exactly, including several structurally
significant findings the Plan surfaces honestly rather than glossing over (the
`DesignSelectionCard.tsx` internal inconsistency, the missing Cache-Control headers on today's
derivatives, the archive-purge retention-policy interaction gap). The Plan correctly resists the
temptation to invent final dimensions/quality without measurement evidence, correctly distinguishes
the two generated-catalog-architecture ADRs the resume prompt specifically warned about conflating,
and correctly scopes the Storage inventory tool as dry-run-only rather than building any delete
path prematurely. The four required changes close real precision gaps in how three already-correct
findings (archive-purge interaction, test-seam design, Cache-Control transition) are documented and
sequenced — none require revisiting the Plan's core recommendation (one shared, additive,
fallback-safe `display` derivative) or its investigation methodology.

---

## Next Step

Treat all four required changes as binding, either via a Plan amendment or as Implement's own
first-step resolutions per Required Change 4's classification. Begin a future Implement phase only
after those changes are incorporated and this Review's approval is recorded. Do not deploy,
migrate, backfill, or delete anything — this phase (Plan + Formal Review) authorizes none of those
actions. Do not start Goal #13 (`production-release`, already blocked pending #12's signoff). Do
not reopen Goals #9, #10, or #11.
