# DEV live soak — title-specific failure evidence

Date: 2026-09-14  
Environment: `fresh-prints-dev`  
Disposition: **FAIL / INCOMPLETE — do not advance to Owner QA**

## Evidence captured before further mutation

The owner-authorized DEV Processing queue was running with
`catalogWorkflowMode=autonomous`, `catalogAutonomousLiveEnabled=true`, and Pass 2 OFF. The
read-only queue baseline was captured at `2026-09-14T18:27:25.648Z` using the Studio Processing
predicate `designs.aiReviewStatus == "pending"` (158 pending imported designs). The queue began
draining during capture; no queue, design, setting, publication, or Algolia write was made by this
shell.

## Field-by-field comparison

All rows below were read from the same post-deploy v39/v7 Autonomous run. Every row had a populated
description, active category, current Smart Profile, `automationDecision=auto_approved`,
`aiReviewedBy=system:catalog-autonomy`, and `portalCatalogPublicationStatus=synced`.

| Group | Design | Original/source evidence | Root title persisted | Provider/normalized candidate title | Root desc/category | Authority markers | Result |
|---|---|---|---|---|---|---|---|
| Affected | `1scpUhx0KriTBC1IfFIW` | `/originals/1scpUhx0KriTBC1IfFIW.png`; no `importSourceFileName`; `createdBy=updatedBy` | `PNG 4` | `Skeleton Taking Toaster Bath` | 305 chars / `tj0HemRh2RuYLfI7N6nO` | no explicit title authority | Ready + synced, **filename title survived** |
| Affected | `hUehR7cqoy6ZG60ccyEM` | `/originals/hUehR7cqoy6ZG60ccyEM.png`; no `importSourceFileName`; `createdBy=updatedBy` | `PNG 6` | `Skeleton Takes a Toaster Bath` | 391 chars / `tj0HemRh2RuYLfI7N6nO` | no explicit title authority | Ready + synced, **filename title survived** |
| Affected | `VFYeWkq8UxWcND5W1ecz` | `/originals/VFYeWkq8UxWcND5W1ecz.png`; no `importSourceFileName`; `createdBy=updatedBy` | `ProjectWhite` | `Project Keeping Jesus Busy Christian Faith Heart` | 320 chars / `3KUsuaV9qIh88kIPF38T` | no explicit title authority | Ready + synced, **filename title survived** |
| Affected | `Dlxn6VyUpv0p6nzVmLLe` | `/originals/Dlxn6VyUpv0p6nzVmLLe.png`; no `importSourceFileName`; `createdBy=updatedBy` | `M4170303i1mimi` | `Floral Mimi Typography Graphic` | 222 chars / `PjYcGaa61ai2EIB2O8LK` | no explicit title authority | Ready + synced, **filename-like title survived** |
| Good | `03cbj1cIFH7Bavt38XBX` | same legacy source-less shape; no `importSourceFileName` | `Dynamic Dancer in Watercolor Splash` | `Dynamic Dancer in Watercolor Splash` | 331 chars / `Sn9nmGJvFlIRO4DnFnIB` | no explicit title authority | Ready + synced, **AI title accepted** |
| Good | `C0uXswrfcDkX51jbcYAj` | same legacy source-less shape; no `importSourceFileName` | `Michael Jackson Mosaic Portrait with Iconic Imagery` | same | 330 chars / `Sn9nmGJvFlIRO4DnFnIB` | no explicit title authority | Ready + synced, **AI title accepted** |
| Good | `CgYvglyExTMkdISqVgKl` | same legacy source-less shape; no `importSourceFileName` | `Iconic Performer in Hat and Glove` | same | 373 chars / `Sn9nmGJvFlIRO4DnFnIB` | no explicit title authority | Ready + synced, **AI title accepted** |
| Good | `YcTmSvPpg9IkK7uKfH9c` | same legacy source-less shape; no `importSourceFileName` | `Tom and Jerry Road Trip Fun` | same | 306 chars / `Sn9nmGJvFlIRO4DnFnIB` | no explicit title authority | Ready + synced, **AI title accepted** |

## Proven transition

The difference is deterministic in the deployed source. `resolveFinalCatalogCopy` considers a
non-empty root title authoritative when it is structurally valid and
`isImportPlaceholderTitle(...)` returns false. For these legacy rows, description/category were
missing before the run, so the resolver filled those fields from the candidate; the title patterns
`PNG 4`, `PNG 6`, `ProjectWhite`, and `M4170303i1mimi` are not recognized by the narrow placeholder
heuristic. The final automation decision therefore evaluated the preserved root title, and the
same title was written by `finalCatalogFields` immediately before Ready persistence. No later
authority merge or Algolia rewrite changed it. The good rows differ only because their existing root
titles are retained under the same root-authority rule; their root titles happen to match the
generated candidates.

This proves a title-specific authority/placeholder gap, not a description, category, Smart Profile,
publication, or Algolia persistence loss. The current live soak is failed/incomplete: filename-like
Ready titles are non-zero even though canonical fields are otherwise complete.

## Required next action

Owner must restore DEV through the authenticated Studio control to `shadow` / `live=false` with
Pass 2 OFF before any new deployment or rerun. The corrective must add deterministic title-authority
semantics (not only more literal regexes), preserve explicitly trusted staff/import titles, replace
untrusted legacy filename/basename titles with the valid candidate, and add the requested title-only
regressions before a second DEV Processing-queue soak.
