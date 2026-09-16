# Formal Review — Smart Catalog title-authority over-preservation corrective

Date: 2026-09-14  
Plan: `docs/workflow/plans/2026-09-14-smart-catalog-autonomous-title-authority-overpreservation-corrective-plan.md`  
Environment: `fresh-prints-dev` only

## Verdict

**APPROVED WITH CHANGES — implement the explicit-provenance-only title gate.**

The addendum and the second DEV soak establish a downstream authority defect, not a provider
failure. The named rows had valid v39 candidate titles/descriptions/categories and healthy Smart
Profiles, but all had `catalogTitleSource=legacy_unknown`, no source filename or staff-artwork
marker, and `createdBy == updatedBy`. The current resolver treats their non-empty roots as
authoritative, so the root title is reused for both the automation decision and the atomic Ready
write. This deterministically preserves the low-quality titles into publication and Algolia.

## Required changes before Implement

1. Use an explicit trust matrix: only `staff`, `trusted_import`, and `ai_generated` protect an
   existing root title. `import_filename` and `legacy_unknown` must never select the root title;
   when the candidate title is valid, select and persist it as `ai_generated`.
2. Remove the `createdBy != updatedBy` staff inference and the filename-mismatch → `staff`
   promotion. A generic metadata edit, approval, or title relationship is not positive title
   authority. Leave legacy records untrusted unless they have an explicit trusted source.
3. Define the no-candidate path explicitly: an untrusted root may not be returned as a final title.
   Return a missing/invalid title reason and keep the design Needs Review. Candidate-only validation
   remains authoritative for malformed or placeholder candidate output, even when a trusted root
   exists.
4. Keep the change backend-only for this corrective. Preserve the already-reviewed client and
   Rules allowlists: client create/import/title-edit paths may write only `staff`,
   `trusted_import`, or `import_filename`; Functions own `ai_generated` and `legacy_unknown`.
   No migration, backfill, provider/prompt change, index, Algolia, or production action.

## Required regression matrix

- Exact second-soak roots: `a large group 2`, `and this ios why I wanted 2`, `Be a nice human`,
  `chucky`, `DR pepper png 1-11`, and `drinks coffee black 2`; each must select its valid AI
  candidate and return `catalogTitleSource=ai_generated`.
- Prior filename-like fixtures (`PNG 4`, `PNG 6`, `ProjectWhite`, `M4170303i1mimi`, numeric and
  underscore basenames) must still select a valid candidate.
- Explicit `staff`, `trusted_import`, and `ai_generated` roots remain unchanged, including when
  candidate copy is valid; candidate hard blockers still prevent Autonomous Ready.
- `legacy_unknown`/`import_filename` with no candidate, malformed candidate, blank description, or
  sentinel/missing category must fail closed and must not fall back to the root title.
- Differing `createdBy`/`updatedBy` without explicit provenance remains untrusted.
- Queue, callable reprocess, and durable `onCatalogReprocessJobWritten` paths must persist the
  exact selected title/source atomically; Shadow and Needs Review paths must not write a new root
  title/source.
- Verify description/category/Smart Profile/publication/Algolia/stale-attempt behavior is unchanged,
  with zero malformed Autonomous Ready rows in the bounded DEV soak.

## Deployment and owner gates

The narrow DEV closure remains the five already-reviewed Functions (`enqueueAiEnrichment`,
`reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`, `promoteCustomerUploadToAiReview`,
`promoteStaffArtworkToAiReview`) plus Firestore Rules. Re-verify deployed source parity after the
corrective. Restore DEV to `shadow` / live `false` / Pass 2 OFF before deployment or testing. Stop
before Owner QA; production settings, Functions, Rules, data repair, reprocessing, and Algolia
remain unauthorized.

