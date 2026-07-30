# Owner Sample-Review Checkpoint: Catalog Image Derivative Storage Consolidation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Goal | `catalog-image-derivative-storage-consolidation` (Goal #12) |
| Plan | `docs/workflow/plans/2026-07-30-catalog-image-derivative-storage-consolidation-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-review.md` (approved_with_changes) |
| Phase | Implement, Human Checkpoint 1 (stop here — no migration, backfill, deployment, or deletion) |

---

## Formal Review Conditions — Disposition

1. **Interaction with Archive-Purge.** Satisfied structurally by design: this checkpoint never
   writes `displayPath` to any real design record (see "No Backfill Occurred" below), so the
   orphaning gap the Plan names cannot occur yet. The gap remains correctly deferred to the future
   goal that will reconcile `purgeArchivedDesignAssets` with `displayPath` — not touched here.
2. **Pure-function extraction for the Storage inventory classification logic.** Satisfied:
   `packages/shared/src/utils/catalogImageStorageInventory.ts`'s
   `buildCatalogImageStorageInventoryReport` operates entirely on already-fetched plain-object
   arrays, has zero Storage/Firestore calls inside it, and is covered by 14 synthetic-fixture unit
   tests with no emulator. The `onCall` shell (`functions/src/inventoryCatalogImageStorage.ts`)
   stays thin — it only lists Storage metadata and Firestore docs, then calls the pure function.
3. **Cache-Control transitional inconsistency.** Not yet applicable in this checkpoint — no
   `display` object has been written anywhere (sample WebP bytes were generated and written only
   to a local, isolated review-output directory, never to Storage), so there is no live
   inconsistency to observe yet. Recorded as an explicit item for the future Implement pass that
   actually wires `displayPath` into the generation pipeline.
4. **Open Question sequencing.** Followed exactly as classified in the Plan: final dimensions/
   quality are NOT decided in this checkpoint (that's what this artifact asks the owner to
   decide); the promotion-time-vs-backfill-time generation question and the archive-purge
   retention question remain untouched, per their stated sequencing (first resolved during a
   future Implement's own first step; second explicitly deferred to a separate future goal).

---

## Files Changed This Checkpoint

| File | Change |
|---|---|
| `packages/shared/src/constants/import/derivativeGeneration.constants.ts` | Added `DISPLAY_CANDIDATE_DIMENSIONS_PX = [512, 640, 800]`, `DISPLAY_CANDIDATE_QUALITY = 82` — explicitly marked not-yet-approved, used only by the sample script and its tests |
| `packages/shared/src/constants/design/designStoragePaths.ts` | Added `DESIGN_STORAGE_ROOTS.display` and `getDisplayStoragePath(designId)` — additive, not yet written by any production code path |
| `packages/shared/src/constants/design/designStoragePaths.test.ts` (new) | 6 tests for the new path helper |
| `packages/shared/src/utils/catalogImageStorageInventory.ts` (new) | Pure Storage-object classification logic |
| `packages/shared/src/utils/catalogImageStorageInventory.test.ts` (new) | 14 tests |
| `packages/shared/src/catalog-snapshots/catalogSnapshot.types.ts` | Added optional `displayPath?: string` to `PortalCatalogCard` |
| `functions/src/inventoryCatalogImageStorage.ts` (new) | Dry-run-only `onCall` inventory callable |
| `functions/src/index.ts` | Registered `inventoryCatalogImageStorage` export |
| `functions/src/catalogSnapshots/snapshotBuilders.ts` | `mapPortalCatalogCard` now additively includes `displayPath` when present |
| `functions/src/catalogSnapshots/snapshotBuilders.test.ts` | Added 5-test `mapPortalCatalogCard` suite |
| `apps/studio/src/renderer/src/features/designs/types/design.types.ts` | Added optional `displayPath?: string` to `Design`, `CreateDesignInput`, `UpdateDesignInput` |
| `apps/portal/features/catalog/types/catalog.types.ts` | Added optional `displayPath?: string` to `CatalogDesign` |
| `apps/studio/src/renderer/src/features/upcoming-shows/hooks/originalPathProductionProtection.test.ts` (new) | 4 static-source regression tests |
| `apps/studio/electron/services/import/displayDerivativeCandidate.test.ts` (new) | 18 tests (6 properties × 3 candidates) against the real production `encodeWebpDerivative` pipeline |

**No consumer component was modified.** No design, Firestore document, or Storage object outside
an isolated local scratch directory was touched.

---

## Environment Limitation — No Real Dev-Catalog Data Access

This environment has no Google Application Default Credentials configured (confirmed by a direct
`firebase-admin` connection attempt against `fresh-prints-dev`, which failed with "Could not load
the default credentials"). **All samples below are synthetic, programmatically generated
fixtures — not real catalog artwork.** This is disclosed explicitly rather than worked around
silently; the owner may wish to independently spot-check final candidate settings against real
catalog art before backfill, since synthetic fixtures (especially the halftone/noise sample) can
behave differently than real compressed photographic or hand-drawn artwork under WebP encoding.

Consequently, the **current Storage inventory totals and current per-design object/byte
averages** cannot be reported from real data in this checkpoint — the `inventoryCatalogImageStorage`
callable is built and unit-tested (14 passing tests on its pure classification logic) but has
**not been invoked against the live `fresh-prints-dev` Storage/Firestore**, since doing so would
require either owner-supplied credentials or an owner/admin-authenticated call from within the
running Studio/Portal app. **Running it live is a natural, low-risk next action the owner can take
independently** (it is dry-run-only and read-only) — see "Suggested Owner Action" below.

---

## Measured UI Image Requirements (real source, not synthetic)

Full detail traced directly from the actual Portal/Studio source (exact files/lines available on
request; summarized here):

| Surface | Rendered px (approx) | Field used today | Layout |
|---|---|---|---|
| Portal Discover carousel card | ~192–240 × 192–240 (1:1) | `thumbnailPath` | Horizontal scroll rail |
| Portal Design Library / search / category / tag grid | ~270 × 200 (4:3) | `thumbnailPath` | CSS Grid `auto-fill, minmax(16rem,1fr)`, ~8 cards visible @1440×900 |
| Portal design detail modal hero | up to 576 × 224–288 | `previewPath ?? thumbnailPath` | Single |
| Portal / Studio shared preview lightbox (**largest single consumer in either app**) | up to ~1152 × ~896 (`min(96vw,72rem)` × `min(90vh,56rem)`) | `previewPath` (no upscale — today's 1280px preview already has headroom here) | Single, lightbox |
| Portal Current Request drawer thumb | fixed 80 × 80 | fallback chain, thumbnail-first in practice | Fixed box |
| Portal request-detail item grid | ~270 × 200 (4:3) | fallback chain | Grid `repeat(4,1fr)` desktop, ~8 visible |
| Studio AI Review queue row | ~68 × 68 (1:1) | `thumbnailPath` only | Single-column list |
| Studio AI Review workspace preview | up to 448 × 448 (capped 28rem), lightbox up to ~1152×896 | `previewPath ?? thumbnailPath` | Single + lightbox |
| Studio Design Library grid | ~270 × 200 (4:3) | `thumbnailPath` (grid), `previewPath ?? thumbnailPath` (lightbox) | Grid, same values as Portal's, ~8 visible |
| Studio design detail modal header | 140 × 105 (4:3) | `previewPath` (falls back to thumbnail only if assets purged) | Single + lightbox |
| Studio picker rows (Assisted catalog picker, split picker) | ~56–72 px | thumbnail-only or reversed-order fallback | List rows |

**Key findings informing candidate selection:**
- **No surface anywhere requests more than ~1152×896 CSS px** — the shared lightbox is the ceiling
  in both apps, and it's already served by today's 1280px preview with headroom to spare (no
  upscale observed).
- **No DPR/retina handling exists anywhere** (`devicePixelRatio`, `srcset`, `sizes` — zero matches
  in either app) — a physical-pixel argument for a larger derivative does not apply today; the
  CSS-pixel values above are also the effective served-resolution ceiling in practice.
- **Grid cards render at ~256–380px**, well above the current 320px thumbnail's own box and
  comfortably inside a 512–800px candidate with 2×-equivalent headroom for future DPR support.
- **Every consumer without exception already has a fallback chain** — a design missing the new
  field degrades exactly like a missing `previewPath` does today (already a supported state).

---

## Sample Design List

Seven synthetic, programmatically generated fixtures (no real/PII data), covering every requested
visual category:

1. `flat-color-square-light` — 1600×1600, large flat-color shape, transparent margin, square
2. `fine-text-landscape` — 2000×1200, small multi-line text, transparent background, landscape
3. `thin-lines-portrait` — 1200×1800, 24 evenly-spaced 1px horizontal lines, portrait
4. `halftone-distressed-square` — 1600×1600, procedural dot-pattern + noise texture, square
5. `multicolor-detailed-landscape` — 2400×1600, 8×8 multicolor grid (opaque), landscape
6. `dark-design-square` — 1600×1600, dark palette on transparent, square
7. `light-design-portrait` — 1200×1600, light palette on transparent, portrait

All generated via `sharp` (SVG rasterization / raw-pixel synthesis), matching this repository's
existing established test-fixture pattern (e.g. Goal #11's `customerUploadProcessing.test.ts`
fixtures) — no binary files committed to the repository.

---

## Candidate Derivative Settings Tested

Three candidates, all Q82, run through the **real production** `encodeWebpDerivative` pipeline
(the same function `derivativeGenerationService.ts` calls today for thumbnails/previews):

| Candidate | Max bounding box | Quality |
|---|---|---|
| A | 512×512 | 82 |
| B (Plan's original starting hypothesis) | 640×640 | 82 |
| C | 800×800 | 82 |

---

## Side-by-Side Review Location

All original fixtures, current thumbnail/preview outputs, and all three candidate outputs are
written locally (never uploaded to Storage) at:

```
<session scratchpad>/catalog-display-derivative-samples/<sample-name>/
  original.png
  current-thumbnail-320x320-q80.webp
  current-preview-1280x1280-q85.webp
  candidate-512x512-q82.webp
  candidate-640x640-q82.webp
  candidate-800x800-q82.webp
```

plus a machine-readable `results.json` summary at the directory root. This directory is local to
the current session's scratchpad and is not part of the repository or any deployed environment.
If the owner wants to view these images directly, they should be regenerated on demand (the
generator script is fully deterministic and can be re-run) or the session scratchpad path shared
directly — no permanent artifact was added to the repo for this purpose, per the explicit
restriction against adding a production path family merely for testing.

---

## Candidate Byte Sizes and Savings (full results)

All figures in bytes. "vs preview" / "vs thumbnail" are relative to that sample's own current
1280px/320px output.

| Sample | Thumbnail (320) | Preview (1280) | 512×512 Q82 | 640×640 Q82 | 800×800 Q82 |
|---|---|---|---|---|---|
| flat-color-square-light | 952 | 5,560 | 1,462 (−73.7% vs preview) | 2,020 (−63.7%) | 2,888 (−48.1%) |
| fine-text-landscape | 4,912 | 32,152 | 9,312 (−71.0%) | 12,314 (−61.7%) | 16,222 (−49.5%) |
| thin-lines-portrait | 1,182 | 4,854 | 1,402 (−71.1%) | 1,730 (−64.4%) | 2,532 (−47.8%) |
| halftone-distressed-square | 84,418 | 1,214,186 | 218,470 (−82.0%) | 323,182 (−73.4%) | 481,578 (−60.3%) |
| multicolor-detailed-landscape | 484 | 3,180 | 900 (−71.7%) | 1,200 (−62.3%) | 1,434 (−54.9%) |
| dark-design-square | 5,524 | 25,186 | 9,688 (−61.5%) | 11,996 (−52.4%) | 15,082 (−40.1%) |
| light-design-portrait | 4,228 | 20,132 | 7,032 (−65.1%) | 8,856 (−56.0%) | 11,310 (−43.8%) |

**Every candidate at every size, for every sample, is smaller than today's preview** (40–82%
reduction) while being larger than today's thumbnail alone (expected — a shared derivative
replacing both must be bigger than the smaller of the two it replaces).

The halftone/noise sample is a clear outlier (dominates absolute-byte totals due to its
noise-heavy content, which compresses far worse than the vector/flat-color/text samples more
representative of typical catalog art). Excluding it, across the other 6 samples:

| Metric | Thumbnail (320) avg | 512×512 avg | 640×640 avg | Preview (1280) avg |
|---|---|---|---|---|
| Average bytes | 2,880 | 4,966 | 6,353 | 15,177 |
| Typical 8-card grid load | 23 KB | 39 KB | 50 KB | 121 KB |

---

## Transparency and Visual-Quality Findings

- **Transparency preserved at every candidate size**, confirmed both by automated test
  (`hasAlpha === true` on every transparent-source output) and by direct metadata inspection of
  generated sample files.
- **Aspect ratio preserved exactly** — automated test confirms output width/height ratio matches
  source ratio within floating-point tolerance for both portrait (2:3) and square sources.
- **No crop or distortion** — `fit: "inside"` bounding-box resize is used identically to today's
  thumbnail/preview pipeline; automated test confirms output never exceeds the candidate's box on
  either axis.
- **Downscale-only confirmed** — a 100×100 source run through every candidate box (512/640/800)
  stays at 100×100 in every case; `withoutEnlargement: true` behavior is unchanged from today.
- **Decode/render observations**: all candidates encode successfully as valid WebP via the same
  sharp pipeline in well under 150ms per image in this environment (18 automated tests across 3
  candidates × 6 properties completed in ~2.5s total) — no decode/encode performance concern at
  this catalog scale (~80 designs).
- **Visual differences at actual rendered size**: not owner-verifiable from this text report —
  the side-by-side WebP files at the scratchpad location above are the actual evidence; a direct
  visual comparison by the owner is the appropriate next step before final approval.
- **Visual differences at the largest approved preview size** (the shared lightbox, ~1152×896):
  every candidate (512/640/800) is smaller than that box, meaning the lightbox will show a
  slightly softer image than today's 1280px preview does at that same box size — this is the
  central quality trade-off the owner is being asked to approve, not a hidden cost.

---

## Whether One Derivative Can Serve Both Grids and Previews

**Yes, technically confirmed feasible for the grid case; the lightbox case is the one genuine
trade-off.** Every grid surface (270-380px cards) is comfortably served by any of the three
candidates with headroom. The shared lightbox (~1152×896, the largest consumer in either app) is
the only surface where a smaller derivative measurably reduces quality versus today's 1280px
preview, since it's the one place today's preview is scaled down to fit rather than fill exactly.
This is a real, disclosed trade-off — not a technical limitation the candidates fail to meet, but
a genuine quality-vs-size choice for the owner to weigh directly against the visual samples.

---

## Whether a Separate Tiny Thumbnail Is Justified

**No separate tiny thumbnail recommended, based on available evidence** — consistent with the
Plan's default and the owner's explicit instruction not to preserve one merely because it exists.

Reasoning:
- No grid surface renders below ~56px (the smallest, Studio's Assisted catalog picker row), and
  even that is well served by any candidate at typical WebP compression — a 512-800px source
  downscaled by the browser to 56-72px CSS pixels is a routine, cheap browser-side operation, not
  a meaningful decode/memory cost at this catalog's scale (~80 designs, confirmed via the
  investigation phase).
- The "typical 8-card grid load" delta between today's thumbnail-only approach and a shared
  512-640px derivative is on the order of tens of KB (23→39-50 KB, excluding the noise outlier) —
  not a magnitude that plausibly causes a material regression in initial catalog load, bandwidth,
  memory, or Electron rendering at this catalog size.
- No lazy-loading/virtualization infrastructure exists today that a larger shared derivative would
  meaningfully strain (Portal uses native `loading="lazy"` + "Load more" pagination; Studio has no
  virtualization at all currently, meaning it already renders all visible-tab designs' thumbnails
  regardless of derivative size).
- This conclusion should be re-verified once the catalog grows meaningfully beyond ~80 designs, or
  if the owner's independent live-inventory run (below) reveals a materially different real-asset
  byte profile than these synthetic fixtures suggest.

---

## Recommended Final Dimensions and Quality

**Recommendation: 640×640 @ Q82** (the Plan's original starting hypothesis), pending the owner's
own visual review of the side-by-side samples. Rationale:
- Sits at the midpoint of the three tested candidates — meaningfully smaller than today's preview
  (52-73% reduction across all samples) while giving more headroom than 512×512 for the shared
  lightbox's larger rendering context and any future DPR/retina support.
- 512×512 is the most bandwidth-efficient but gives the least quality headroom at the lightbox
  size; 800×800 gives the most headroom but the smallest byte-size win (40-60% vs preview instead
  of 52-73%).
- This is a recommendation, not a decision this checkpoint is authorized to finalize — the owner's
  own visual comparison against the generated samples is the actual required approval step.

---

## Recommendation on Tiny Thumbnail Retention

**Do not retain a separate tiny thumbnail** — see "Whether a Separate Tiny Thumbnail Is Justified"
above. Revisit only if the owner's live inventory run (once credentials/an authenticated call are
available) shows real catalog assets behave materially differently than these synthetic fixtures.

---

## Exact Additive Schema Change Proposed

- `designs/{designId}.displayPath?: string` — optional, additive, mirrors `previewPath`'s existing
  optionality exactly. No existing field's meaning changes. No design record has this field
  populated yet (confirmed — no backfill occurred this checkpoint).
- `PortalCatalogCard.displayPath?: string` in the generated Portal catalog manifest shape —
  additive, flows into the existing `contentVersion` hash automatically (proven by a dedicated
  test: adding `displayPath` to an otherwise-identical card changes its computed content version).
- No Firestore Rules change is required for an additive optional field on an existing document
  shape already covered by existing rules.

---

## Exact Next Implementation Scope After Owner Approval

Once the owner approves final dimensions/quality (or selects a different candidate/value) and
reviews the visual samples:

1. Wire the approved dimensions/quality into `derivativeGenerationService.ts` (Studio import) and
   the customer-upload/donation-promotion processing path (Functions), generating `displayPath`
   alongside (not instead of) `thumbnailPath`/`previewPath` for **newly imported/promoted**
   designs only — no backfill of the existing ~80 designs yet.
2. Run the owner's independently-invoked live `inventoryCatalogImageStorage` dry-run (see
   "Suggested Owner Action" below) to get real Storage totals before committing to a bounded-
   concurrency backfill plan for existing designs.
3. Bounded-concurrency backfill of existing designs (separate Human Checkpoint — migration/backfill
   execution, per the Plan).
4. Migrate consumers one group at a time with fallback chains (separate Human Checkpoint groups,
   per the Plan's staged migration design).
5. Only after full migration is verified and an observation window passes: a separate, future goal
   to actually delete superseded `thumbnails`/`previews` objects (separate Human Checkpoint —
   deletion manifest approval, per the Plan).

None of steps 1-5 are authorized by this checkpoint.

---

## Suggested Owner Action (not required to close this checkpoint)

Since this environment lacks credentials to query the real `fresh-prints-dev` Storage/Firestore,
the owner (or a session with proper credentials) can invoke the already-built, already-tested
`inventoryCatalogImageStorage` callable directly (it is `owner`/`admin`-only, dry-run-only, and
read-only — no risk to any data) to get real Storage totals before the next checkpoint. This is
optional for closing this pass but would materially improve the evidence base for the next one.

---

## Confirmations

- **No migration, backfill, deletion, or deployment occurred.** No design Firestore document was
  written to. No Storage object (dev or otherwise) was created, modified, or deleted. All sample
  WebP bytes exist only in a local, isolated scratchpad directory outside the repository.
- **Production remains completely untouched.** No command in this checkpoint targeted anything
  other than local source files and local test execution; no `firebase deploy`, `firebase use
  fresh-prints-prod`, or equivalent command was run at any point.
- **No consumer was migrated.** Every existing component continues reading exactly the fields it
  read before this checkpoint (`thumbnailPath`/`previewPath` fallback chains, unchanged).
- **No new permanent production Storage path family was added merely for testing** — the new
  `/display/` prefix exists only as a path-generation helper and Firestore/manifest type
  addition; no object has ever been written there.
