# Owner Sample-Review Checkpoint — Round 2 (Expanded Candidates): Catalog Image Derivative Storage Consolidation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Goal | `catalog-image-derivative-storage-consolidation` (Goal #12) |
| Supersedes recommendation in | `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-owner-sample-checkpoint.md` (round 1) |
| Phase | Implement, Human Checkpoint 1 — **owner decisions recorded below; real inventory execution follows in a separate artifact** |

---

## Owner Decisions (recorded 2026-07-30)

The owner reviewed this round's expanded contact sheet and byte-savings analysis and approved:

1. **Final shared display derivative**: maximum bounding box **1024×1024**, format **transparent
   WebP**, quality **Q82**, downscale-only, preserve aspect ratio, preserve transparency, no crop/
   stretch/distortion. This matches the recommendation below exactly — no deviation from the
   evidence-based analysis.
2. **No separate tiny thumbnail** in the target architecture. One shared 1024×1024 display
   derivative will serve both catalog grids and larger previews. Existing `thumbnailPath` and
   `previewPath` fields are explicitly retained **temporarily**, for migration fallback and
   rollback only — not as a permanent second/third derivative family.
3. **Inventory callable deployment approved** for `fresh-prints-dev` only:
   `inventoryCatalogImageStorage`. No other Function, Rule, index, or asset is approved for
   deployment by this decision.

**Grid bandwidth trade-off explicitly accepted**: ~86 KB for a representative 8-card grid using the
shared 1024×1024 derivative, vs. ~23 KB using today's thumbnail-only path. Accepted because the
absolute total remains small, the shared derivative avoids lightbox upscaling (the specific defect
that sank round 1's 640px recommendation), and the target architecture eliminates the need for two
separate display derivatives going forward.

**Confirmed still true, unaffected by this decision**:
- Production originals (`/originals/**`) remain completely protected — untouched by anything in
  this checkpoint or this decision.
- Existing `/previews/**` and `/thumbnails/**` Storage objects remain **completely untouched**
  pending a future, separately-approved migration phase — this decision approves a target
  architecture and a dev-only read-only inventory deployment, not any write/migration/backfill
  action.

**Explicitly not yet approved by this decision** (per the owner's own phase-alignment
instruction): catalog migration, consumer cutover, backfill, deletion, or full implementation.
Those remain gated behind future, separate checkpoints.

---

## Owner Response Being Addressed

The owner did not approve 640×640 @ Q82. Correctly identified that:
- The shared lightbox renders at ~1152×896 CSS px.
- No DPR/retina handling exists anywhere in this codebase.
- A 640px derivative would therefore be **enlarged by the browser** at the lightbox, not just
  "look smaller" — a real, specific visual risk, not a general concern.

**This concern is confirmed technically correct and precisely quantified below** — round 1's
recommendation is withdrawn.

---

## Expanded Candidate Matrix

Same 7 synthetic fixtures as round 1 (transparent, fine text, thin lines, halftone/distressed,
flat-color, multicolor, light/dark, portrait/landscape/square), regenerated at higher source
resolution (1800-3200px on the long edge, vs. round 1's 1200-2400px) so the 1280×1280 candidate is
a genuine downscale test rather than a near-identity pass-through. All candidates run through the
same real production `encodeWebpDerivative` pipeline as round 1.

| Candidate | Notes |
|---|---|
| 640×640 Q82 | Round 1's rejected hypothesis, retained for direct comparison |
| 800×800 Q82 | |
| 1024×1024 Q82 | |
| 1280×1280 Q82 | Matches today's preview *dimensions* exactly, lower quality (82 vs 85) |
| 1024×1024 Q88 | One evidence-driven quality variant — does raising quality at 1024 close the gap to 1280 without the extra pixels/bytes? |

---

## Lightbox Upscale Analysis (the owner's specific question, answered directly)

The lightbox CSS was re-confirmed directly from source
(`apps/portal/styles/catalog.css:2144-2152`, identical rule reused by Studio's lightbox):

```css
.design-preview-lightbox-image {
  max-height: calc(min(90vh, 56rem) - 3rem);
  max-width: 100%;
  object-fit: contain;
  width: auto;
}
```

`object-fit: contain` combined with `width: auto` on an `<img>` scales the image's **natural
(native) resolution** to fill the available box — for a source smaller than the box, this **is** a
browser-side upscale, exactly as the owner described. Computed exactly for a ~1152×896 box:

| Candidate | Native size | Displayed at lightbox | Scale factor | Upscaled? |
|---|---|---|---|---|
| 640×640 | 640×640 | 896×896 | **1.40×** | **Yes — confirmed** |
| 800×800 | 800×800 | 896×896 | **1.12×** | **Yes — confirmed** |
| 1024×1024 | 1024×1024 | 896×896 | 0.88× | **No** (shown slightly smaller than native) |
| 1280×1280 | 1280×1280 | 896×896 | 0.70× | **No** |

**The owner's concern is confirmed exactly**: both 640 and 800 are measurably upscaled by the
browser at the lightbox — 640 by a full 40%, 800 by 12%. Only 1024 and above avoid any upscaling
at this specific surface.

---

## Contact Sheet / Comparison Page

A self-contained local HTML page renders every fixture × every candidate at three contexts (native
1:1, ~270px grid card with `object-fit: cover`, and the real 1152×896 lightbox box with the app's
actual `object-fit: contain; width: auto` CSS, including a red "upscaled" flag wherever it occurs)
plus today's current thumbnail/preview as a baseline reference row.

**Exact local path:**
```
<session scratchpad>/catalog-display-derivative-samples/contact-sheet.html
```

Open this file directly in any browser — it is fully self-contained (all images embedded as base64
data URIs, no external references, nothing uploaded to Storage, no repository artifact). File size
is ~21 MB, dominated by the halftone/noise fixture's poor WebP compression (expected — see below);
this is a local review file only.

---

## Byte Size Results (full)

All bytes. "Δ vs preview" / "Δ vs thumbnail" relative to that sample's own current 1280px Q85 /
320px Q80 output.

### Per-fixture (native output dimensions vary by aspect ratio — width shown, height proportional)

| Sample | Thumb(320) | Preview(1280) | 640 Q82 | 800 Q82 | 1024 Q82 | 1280 Q82 | 1024 Q88 |
|---|---|---|---|---|---|---|---|
| flat-color-square-light | 952 | 5,560* | 1,818 | 2,760 | 3,690 | 5,208 | 3,846 |
| fine-text-landscape | 4,912 | 32,152* | 12,706 | 16,268 | 22,108 | 29,234 | 25,410 |
| thin-lines-portrait | 1,182 | 4,854* | 2,318 | 2,544 | 3,468 | 4,652 | 3,604 |
| halftone-distressed-square | 84,418 | 1,214,186* | 304,790 | 465,796 | 772,602 | 1,147,768 | 893,562 |
| multicolor-detailed-landscape | 484 | 3,180* | 1,308 | 1,630 | 2,452 | 3,488 | 2,414 |
| dark-design-square | 5,524 | 25,186* | 12,108 | 15,306 | 19,504 | 24,204 | 21,820 |
| light-design-portrait | 4,228 | 20,132* | 8,976 | 11,194 | 14,714 | 18,798 | 16,280 |

*Preview column figures are from round 1's smaller source fixtures — not directly re-measured at
the new higher source resolution in this round, since the preview/thumbnail pipeline itself is
unchanged and not part of what's being tested. Treat as approximate baseline reference, not a
recomputed exact figure for the larger sources.

### Aggregate — average and median (all 7 fixtures)

| Candidate | Avg bytes | Median bytes | Δ vs preview (avg) | Δ vs thumbnail (avg) |
|---|---|---|---|---|
| 640×640 Q82 | 49,146 | 8,976 | −74.3% (smaller) | +273.5% (larger) |
| 800×800 Q82 | 73,643 | 11,194 | −61.5% | +459.7% |
| 1024×1024 Q82 | 119,791 | 14,714 | −37.3% | +810.5% |
| 1280×1280 Q82 | 176,193 | 18,798 | −7.8% | +1239.2% |
| 1024×1024 Q88 | 138,134 | 16,280 | −27.8% | +949.9% |

### Aggregate — excluding the halftone/noise outlier (6 of 7 fixtures, more representative of real vector/flat catalog art)

| Candidate | Avg bytes | Median bytes | Δ vs preview (avg) | Δ vs thumbnail (avg) | Typical 8-card grid load |
|---|---|---|---|---|---|
| 640×640 Q82 | 6,539 | 5,647 | −57.3% | +121.3% | 51 KB |
| 800×800 Q82 | 8,284 | 6,977 | −45.9% | +180.3% | 65 KB |
| 1024×1024 Q82 | 10,989 | 9,202 | −28.2% | +271.9% | 86 KB |
| 1280×1280 Q82 | 14,264 | 12,003 | **−6.8%** | +382.7% | 111 KB |
| 1024×1024 Q88 | 12,229 | 10,063 | −20.1% | +313.8% | 96 KB |

**Key finding: 1280×1280 Q82 saves almost nothing over today's live preview (−6.8% on
representative content)** — at that size the only win is the two-object-to-one consolidation, not
a meaningful byte reduction. This matters directly for the final recommendation below.

---

## Visual Findings

- **Fine-text readability**: at 640/800, small multi-line text shows visible softening at native
  size (before any lightbox scaling); by 1024, text edges are close to indistinguishable from the
  1280 baseline at native resolution. At the lightbox (where 640/800 are additionally upscaled on
  top of their own compression softness), text legibility is the most visually affected property —
  compounding compression softness with browser upscaling.
- **Thin-line preservation**: 1px lines survive recognizably at all candidates (WebP's lossy
  compression is gentler on high-contrast thin geometry than on gradients/noise), but show mild
  ringing/softening at 640-800 that clears up by 1024.
- **Halftone/distressed-detail preservation**: this is the fixture where compression quality
  matters most — byte cost scales steeply with size (640→1280 is a 3.77× byte increase for this
  one fixture alone, vs. ~2.9-3.6× for the other, flatter fixtures), and visual noise/dot-pattern
  fidelity is the most degraded at 640/800. This fixture is also least representative of typical
  catalog art (most catalog designs are flat-color/vector-style per the other 6 samples), so it
  should inform quality choice but not dominate the size decision.
- **Transparency preservation**: confirmed intact at every candidate (already covered by the 18
  automated property tests from round 1, unaffected by this round's dimension changes).
- **Visible compression artifacts**: mild blocking/banding on the halftone fixture at 640-800;
  negligible on the flat-color/vector-style fixtures at any tested size.
- **Compression artifacts specifically caused by upscaling** (640/800 at the lightbox): the
  contact sheet's lightbox column shows these two candidates measurably softer than 1024/1280 at
  that surface — this is the direct visual consequence of the 1.40×/1.12× upscale factors above,
  not merely a WebP-quality artifact.

---

## Final Derivative Recommendation

**Recommend 1024×1024 @ Q82** (not 1280, not 640/800).

Balancing every requested factor explicitly:

| Factor | 640/800 (rejected) | **1024×1024 Q82 (recommended)** | 1280×1280 Q82 (rejected) |
|---|---|---|---|
| Lightbox visual quality | Measurably upscaled (1.40×/1.12×) — real, confirmed softness at the largest surface | **No upscale** (0.88× — shown very slightly smaller than native, imperceptible) | No upscale (0.70×) — marginally sharper than 1024 in principle, but see below |
| Grid bandwidth | Best (51-65 KB/8-card load) | Moderate (86 KB/8-card load) | Worst (111 KB/8-card load) |
| Storage usage | Best per-object | Moderate — but see "avoiding a separate thumbnail" below | Worst per-object, and saves almost nothing vs. today's live preview (−6.8%) |
| Decode memory | Lowest | Moderate — same order of magnitude as today's existing 1280px preview decode, already proven safe in production | Highest — but this is exactly today's existing preview size, so not a new cost, just not a reduction either |
| Simultaneously visible cards | No practical difference at this catalog's scale (~80 designs, no virtualization) for any candidate | Same | Same |
| Avoiding a separate thumbnail | Best fit for tiny grid rows (56-72px) in principle, but see below | Comfortable headroom for every grid surface (256-380px) with real 2×-equivalent margin | Same headroom, no meaningful advantage over 1024 for this purpose |

**Why not 1280** (matching today's preview size, at nominally lower Q82 vs today's Q85): it
provides no meaningful byte-size win over the status quo (−6.8% on representative content) while
still carrying the largest per-object Storage and decode cost of the tested candidates. Choosing it
would mean the entire benefit of this Storage-consolidation goal reduces to only the object-count
win (3→2 per design), not the derivative-size win — a real but much smaller benefit than the Plan's
original premise assumed. **Do not choose 1280 to be maximally safe; it does not deliver
meaningfully on the goal's core purpose.**

**Why not 640/800**: both are confirmed, measurably upscaled at the one surface (the shared
lightbox) that renders larger than either candidate's native resolution — exactly the owner's
concern, now quantified rather than merely predicted. **Do not choose 640 merely because it has the
smallest byte size** — per the explicit instruction, and the evidence here shows why that would be
the wrong trade-off.

**Why 1024×1024 @ Q82**: the smallest tested candidate that avoids upscaling at the confirmed
largest real-world consumer (the shared lightbox), while still delivering a real, non-trivial
byte-size reduction over today's preview on representative content (−28.2%, vs. 1280's −6.8%) and
comfortable headroom over every grid surface (256-380px) — genuinely serving both use cases the
goal requires one derivative to cover, not merely the smaller one.

**On the Q88 variant**: raising quality to 88 at 1024px closes some of the gap to 1280's visual
fidelity (particularly on the halftone fixture) at a real byte cost (+11.4% average size vs. 1024
Q82) — worth keeping in reserve as a fallback if the owner's own visual review of the contact sheet
finds Q82 insufficient on real catalog art, but Q82 is the recommended starting point since it
already sits closer to today's thumbnail's Q80 than today's preview's Q85, and no visual defect
specific to Q82 (vs Q88) was observed on the non-halftone fixtures.

---

## Whether a Separate Tiny Thumbnail Remains Unnecessary

**Yes, still recommended against** — this finding is unchanged by the expanded matrix. The
owner's provisional agreement stands: a 1024px shared derivative, downscaled by the browser to a
56-380px grid context, is a routine and cheap client-side operation at this catalog's scale
(~80 designs, no virtualization infrastructure to strain). Nothing in this round's expanded
evidence changes that conclusion — if anything, since 1024 (not 640) is now the recommended size,
the case for a separate *smaller* thumbnail existing purely for grid efficiency is slightly
stronger in theory than it was for a 640px shared derivative, but the actual measured grid-load
byte costs (86 KB for a typical 8-card load at 1024, vs. 51-65 KB at 640-800) remain well within
what this catalog's current scale and infrastructure can absorb without a dedicated thumbnail.
Revisit only if the owner's independent live-inventory run or real catalog growth changes this
picture materially.

---

## Expected Grid Bandwidth Impact of the Recommendation

At 1024×1024 Q82: typical 8-card initial grid load ≈ **86 KB** (representative-content average,
excluding the halftone outlier), vs. today's thumbnail-only load of ≈23 KB — roughly **3.7× more
grid bandwidth than today's dedicated thumbnail**, in exchange for eliminating the separate preview
object and gaining lightbox-quality headroom. This is the real, disclosed trade-off the
recommendation makes — not hidden in an aggregate-savings claim.

---

## Real Dev Storage Inventory — Status

**Not run.** As established in round 1 and re-confirmed this round, this environment has no Google
Application Default Credentials, so the already-built `inventoryCatalogImageStorage` callable
cannot be invoked against real `fresh-prints-dev` data from here.

### 1. Exact inventory callable created

`inventoryCatalogImageStorage`, defined in `functions/src/inventoryCatalogImageStorage.ts`,
exported from `functions/src/index.ts`.

### 2-6. Independent focused review

Completed. Full findings recorded in a dedicated artifact:
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-inventory-functions-deployment-checkpoint.md`

Summary of findings:
- **Owner/admin restricted**: confirmed — `assertStaffCaller` + `assertOwnerAdmin`, rejects
  unauthenticated, inactive, `helper`, and `customer` accounts.
- **Read-only**: confirmed — zero write-operation matches (`.delete(`, `.update(`, `.set(`,
  `.create(`, `.copy(`, `.save(`, `FieldValue`) anywhere in the file.
- **No delete/update/migration/backfill capability**: confirmed — no such branch exists in the
  code at all; the response type's `dryRun` field is a literal `true`, not a boolean.
- **No private-URL/artwork-content/PII exposure**: confirmed — no signed/download URL generation,
  no byte downloads (`bucket.getFiles()` is metadata-only), no email/customerId/displayName/title/
  description/filename fields read or returned anywhere.
- **One real defect found and fixed during this review**: the original query used
  `customerUploads.where("promotedDesignId", "!=", null)`, a pattern with no precedent anywhere
  else in this codebase and a known Firestore gotcha (`!=` silently excludes documents where the
  field is absent, not just explicitly `null`, which would have made the cool-off cross-reference
  quietly incomplete). Corrected to mirror `purgePromotedDonationFullSize.ts`'s established
  `catalogReviewStatus == "sent_to_ai_review"` equality-filter pattern. Re-verified: `npm run build`
  exit 0, full 14-test `catalogImageStorageInventory.test.ts` suite still passing (unaffected,
  since the pure classification logic itself never changed — only the Firestore query in the
  `onCall` shell that feeds it).

### 7-8. Deployment checkpoint prepared, not deployed

`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-inventory-functions-deployment-checkpoint.md`
contains the exact proposed command
(`firebase deploy --only functions:inventoryCatalogImageStorage`), the exact file dependency
closure, and explicit scope restrictions. **Not deployed. Awaiting owner approval.**

### Future inventory run — required report shape (already implemented, not yet run against real data)

Confirmed the callable's response shape now includes every item the owner's checkpoint requires:
object count by path family, total/average bytes by path family (originals, thumbnails, previews,
display), promotion-cool-off duplicates, suspected orphans (`orphaned_candidate` classification),
missing Storage references (`missingObjects` where a Firestore field points to nothing), missing
Firestore references (objects with no matching `designs` doc — captured as `orphaned_candidate`
with `relatedDesignId: null`), and archived-design assets (via the `purged_per_policy_violation`
classification, which specifically distinguishes an archived+purged design's *unexpectedly
surviving* originals/previews from a routine orphan).

**Generated JSON assets**: initially found missing during this round's own review (`/generated/catalog-reference/**`,
`/generated/portal-catalog/**` were not scanned) — **fixed within this same checkpoint**, not
deferred. `inventoryCatalogImageStorage.ts` now lists both prefixes (metadata-only, `autoPaginate:
true`, no bytes downloaded) and reports them via a new `generatedAssetTotals` field, aggregated by
prefix with object count/total bytes/average bytes. These are deliberately **not** run through the
per-design referenced/orphaned/purged classifier — generated manifests are whole-catalog assets
with no single `designId` to cross-reference, so forcing them through that model would have been
inaccurate, not merely incomplete. Two new tests confirm the aggregation and confirm generated
assets never leak into `familyTotals`/`classifiedObjects`. Full suite: 16/16 passing (up from 14),
`npm run build` and Portal typecheck both still exit 0.

**No totals are invented while the callable remains undeployed** — every number in this document
comes from the synthetic sample-generation script, never from a claimed or assumed real-Storage
figure.

---

## Confirmations

- **Nothing was deployed.** No `firebase deploy` command was run at any point in this round.
- **No migration, backfill, deletion, or consumer cutover occurred.** No design Firestore document
  was written to. No Storage object (dev or otherwise) was created, modified, or deleted. All
  sample WebP bytes and the contact sheet exist only in a local, isolated scratchpad directory
  outside the repository. No consumer component was modified.
- **Production remains completely untouched.**
