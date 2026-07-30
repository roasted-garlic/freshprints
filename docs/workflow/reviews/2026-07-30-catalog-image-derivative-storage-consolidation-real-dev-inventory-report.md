# Real Dev Storage Inventory Report: Catalog Image Derivative Storage Consolidation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Goal | `catalog-image-derivative-storage-consolidation` (Goal #12) |
| Source | Owner-executed `inventoryCatalogImageStorage` callable against `fresh-prints-dev` via the dev-only Studio "Run Catalog Storage Inventory" panel |
| Nature | **Measured, not estimated** — real Storage/Firestore data, read-only, no object modified |

---

## Measured Results (owner-provided, recorded exactly)

### Catalog design image families

| Family | Objects | Bytes | Average bytes |
|---|---|---|---|
| Originals | 81 | 980,807,863 | 12,108,739 |
| Thumbnails | 87 | 2,820,654 | 32,421 |
| Previews | 81 | 20,676,202 | 255,262 |
| Display derivatives | 0 | 0 | — |
| **Catalog-family total** | **249** | **1,004,304,719** | — |

Designs scanned: **87**.

**Note on the object-count discrepancy (thumbnails=87, originals=previews=81):** 6 designs have a
thumbnail but no original/preview. This is the expected signature of ADR-FP-084's archive-purge
policy ("keep thumbnail, delete originals+previews on owner purge of an archived design") — and is
**confirmed not a bug** by the integrity findings below: zero `purged_per_policy_violation`
classifications were found, meaning every one of these 6 designs' missing originals/previews is
correctly accounted for (either legitimately archived+purged, or otherwise expected), not an
unexpected data-integrity gap the inventory tool would have flagged.

### Generated assets

| Prefix | Objects | Bytes |
|---|---|---|
| `generated/catalog-reference/**` | 17 | 3,210,147 |
| `generated/portal-catalog/**` | 1,000 | 2,864,377 |

### Integrity findings

| Classification | Count |
|---|---|
| Referenced | 249 |
| Orphan candidates | 0 |
| Purged-policy violations | 0 |
| Promotion cool-off duplicates | 0 |
| Missing Storage objects | 0 |
| Truncated families | none |

**Every single catalog-family object (249/249) is correctly referenced by a `designs` Firestore
document with a matching path field.** No orphan, no policy violation, no unresolved promotion
duplicate, no dangling Firestore reference to a missing object, and no truncated (incompletely
scanned) family.

---

## Required Interpretation

### Originals dominate catalog Storage

Originals account for **980,807,863 / 1,004,304,719 = 97.66%** of measured catalog-family Storage.
Thumbnails and previews together — the two families this goal's consolidation actually targets —
use only **23,496,856 bytes (2,820,654 + 20,676,202) = ~22.4 MiB combined**, against a
**~980.8 MB** original-asset floor that this goal explicitly, correctly, and by design does **not**
touch (production originals must remain unchanged for print quality).

### Consolidation remains worthwhile, but for architectural reasons, not a dramatic Storage win

This goal's benefit is real but must be stated honestly:
- **Architecture**: one derivative family instead of two, with one generation code path instead of
  two, is simpler to reason about, test, and maintain.
- **Object-count reduction**: 87 thumbnails + 81 previews = 168 derivative objects today; a fully
  migrated-and-cleaned-up future state would have at most 81-87 display objects — roughly a **50%
  reduction in derivative object count**.
- **Consistency**: eliminates the current architecture's two independently-generated,
  independently-sized derivatives with no single "big enough for everything" asset — replaced by
  one asset proven (round-2 checkpoint) to avoid lightbox upscaling while serving grids
  comfortably.
- **What it will NOT do**: meaningfully reduce *total* catalog Storage, because originals — 97.66%
  of the measured total — are untouched by design. **This must not be presented to the owner as a
  large Storage-cost reduction.** The addressable byte pool (thumbnails+previews) is ~22.4 MiB
  against a ~980.8 MB original floor — even eliminating it entirely would reduce total catalog
  Storage by only ~2.3%.

### Sample-based expected net byte reduction — modest, not to be overstated

Using the round-2 checkpoint's representative-content average (1024×1024 Q82 ≈ 11 KB/design,
excluding the synthetic noise-heavy outlier fixture, measured against **synthetic fixtures, not
real catalog art**) as a rough planning estimate only:

- Estimated display-derivative total for 81 designs with real originals: **~81 × 11 KB ≈ 0.85 MB**
  (order-of-magnitude estimate, not a measurement).
- Estimated total *after adding* display derivatives (before any old-object removal):
  ~1,004.3 MB + ~0.85 MB ≈ **~1,005.2 MB** (a net *increase* during the migration window, since old
  thumbnails/previews are explicitly retained per the owner's approved rollback-fallback design).
- Estimated total *after* a hypothetical eventual removal of old thumbnails/previews (a future,
  separately-approved cleanup goal — not built or scheduled by this pass): ~1,004.3 MB − 22.5 MB +
  0.85 MB ≈ **~981.7 MB**, i.e. an estimated eventual net reduction of **~22.6 MB (~2.2% of total
  catalog Storage)** — genuinely small in absolute and relative terms.

**These are estimates from synthetic fixture data, explicitly not measurements of real catalog
art.** Exact post-migration byte figures must be measured by re-running
`inventoryCatalogImageStorage` after the (not-yet-executed) dev backfill actually generates real
display derivatives from the real 81 catalog originals — that is the only way to replace "estimate"
with "measured" for this specific catalog's real content.

### No cleanup work is justified by this inventory

The real inventory found **zero** orphan candidates, **zero** missing Storage objects, **zero**
missing Firestore references, **zero** promotion cool-off duplicates still needing resolution, and
**zero** purge-policy violations. There is no evidence-based justification for building any
deletion or cleanup capability in this goal. None was built. The existing read-only inventory tool
remains available to re-verify this clean state before and after any future migration/backfill
step.

---

## What This Changes About Implementation Scope

- Confirms the additive/fallback/no-cleanup architecture the Plan and both checkpoints already
  committed to is the right scope — nothing here reopens or expands that design.
- Confirms there is no urgent orphan/duplicate problem to solve alongside the derivative rollout —
  the backfill tool being built in this pass can stay narrowly focused on generating
  `displayPath` for existing designs, with no adjacent cleanup logic bundled in.
- Grounds the owner-facing framing of this goal's value in **architecture and consistency**, not
  Storage-cost savings — the combined dev checkpoint and any future owner communication about this
  goal should lead with that framing, not a Storage-reduction percentage.

---

## Confirmations

- No Storage object or Firestore document was created, modified, or deleted to produce this report
  — it reflects the owner's own read-only callable invocation.
- No cleanup, deletion, or destructive tooling was built as a result of these findings.
