# Second DEV soak failure — evidence capture

Environment: `fresh-prints-dev` only. Read-only capture at `2026-09-14T22:40:15.786Z`.
The second soak generated six new `catalog-enrich-v39` results after the fixed baseline and then
stopped. No repair, reprocess, queue, Algolia, or production mutation was performed.

## Runtime containment readback

At `2026-09-14T22:41:03.992Z`, active AI stages were `0`, but the owner-gated setting still read
`catalogWorkflowMode=autonomous`, `catalogAutonomousLiveEnabled=true`, Pass 2 `false`. The owner
must restore Shadow/live-off through Studio before any corrective deployment or reprocessing.

## Affected Ready cohort

All six rows were `status=ready`, `aiReviewStatus=approved`, `aiReviewedBy=system:catalog-autonomy`,
`portalCatalogPublicationStatus=synced`, with populated descriptions and resolved categories.
Every row had `catalogTitleSource=legacy_unknown`, `createdBy == updatedBy`, no
`sourceCustomerUploadId`, `sourceStaffArtworkId`, `importSourceFileName`, `importBatchId`, or
`importRelativePath`, and `printSizeSource=import_normalized`.

| Design | Existing/persisted title | AI candidate title | Candidate selected? |
|---|---|---|---|
| `C6PfairGikfu8rnAgN10` | `a large group 2` | `Skeleton Relaxing with Coffee, Saying "No Thanks"` | No |
| `n8blr9N0x3XvYC6PtTD8` | `and this ios why I wanted 2` | `Skull Butterfly Roses Stay Home Saying` | No |
| `dWwoLJKNpILrfgM3ol9Z` | `Be a nice human` | `Be A Nice Human Script Design` | No |
| `q8Maf62AVoqoUX8P5VDQ` | `chucky` | `Chucky Relaxing on Duck Float with Skull Cup` | No |
| `SVfEMEgAYzXLA3fmrtKf` | `DR pepper png 1-11` | `Dr Pepper Est. 1885 Logo` | No |
| `YmvqBf81wvAmLYQIBacd` | `drinks coffee black 2` | `Skull Flowers Butterflies Coffee Black Cat Lady` | No |

The strongest owner fixture is `YmvqBf81wvAmLYQIBacd`: the valid AI candidate
`Skull Flowers Butterflies Coffee Black Cat Lady` was generated and persisted alongside healthy
description/category/Smart Profile data, but the root title `drinks coffee black 2` survived into
Firestore and Algolia.

## Proven transition

Provider result and normalized `aiSuggestions.title` were valid. `resolveFinalCatalogCopy` inferred
`legacy_unknown` because the legacy rows had no positive title-authority metadata, then considered
the non-empty, structurally valid root title usable because it was not one of the narrow placeholder
shapes. The resolver therefore returned `titleSource=root`; `markAiSuccess` used that same value in
the atomic Ready write. No later persistence or publication overwrite occurred; Algolia mirrored
the malformed root title. This is an authority-resolution defect, not a provider/prompt,
description/category, Smart Profile, publication, or Algolia defect.

The implementation also currently infers `staff` from `createdBy != updatedBy`, which is not
positive evidence that the title itself was intentionally authored. That inference must be removed.
Explicit `staff`/`trusted_import`/`ai_generated` provenance remains the only protected path; raw
`import_filename` and `legacy_unknown` must yield to a valid AI candidate.
