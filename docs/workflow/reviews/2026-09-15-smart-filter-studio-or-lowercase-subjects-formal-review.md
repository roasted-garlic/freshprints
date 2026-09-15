# Formal Review — Studio same-dimension OR + lowercase Subjects

> **Superseded:** The owner’s subsequent contextual-narrowing authorization replaces same-dimension
> OR with cumulative AND. See `2026-09-15-contextual-smart-filter-narrowing-formal-review.md`.

## Verdict

**APPROVED WITH CHANGES** for the bounded DEV corrective described in
`docs/workflow/plans/2026-09-15-smart-filter-studio-or-lowercase-subjects-corrective-plan.md`.

## Review findings

1. The Studio query builder currently emits one singleton `facetFilters` group per selected value.
   For Subjects `cow` + `highland cow`, the exact current shape is
   `[["subjects:cow"],["subjects:highland cow"]]`, which is an AND intersection. The hydrated
   Studio matcher independently uses `every`, producing the same defect after Firestore hydration.
2. The reviewed replacement groups values by dimension:
   `[["subjects:cow","subjects:highland cow"]]`; outer groups remain AND across dimensions.
   Category and search remain separate AND constraints. This is the supported Algolia exact-token
   representation.
3. The owner reports Portal subject filtering already works. The checked-in Portal source was
   nevertheless emitting singleton groups; aligning it with the explicitly approved grouped
   contract prevents Studio/Portal source drift. No remote Portal runtime mutation is claimed;
   contracts cover the required parity semantics.
4. `normalizeDesignSmartProfile` and staff updates share `normalizeSmartProfileDimensions`, but
   import-preset and staff-preservation merges can reintroduce mixed casing after AI normalization.
   A Subject-only lowercase/whitespace/dedupe helper must therefore be applied at each shared merge
   boundary and to durable seeds. It must not alter semantic subject derivative-collapse logic.
5. `normalizePortalCatalogAlgoliaStringList` deduplicates case-insensitively but preserves the
   first casing. The shared public record builder needs a Subject-specific lowercase projection;
   the projected index classifier must use the same canonical form.
6. Facet distributions must be requested with the grouped filters. Counts are contextual counts
   under the active query/category/other-dimension constraints; they must not be presented as
   invented intersection counts. Existing category disjunctive narrowing remains selected-category
   independent.

## Required changes before implementation is accepted

- Keep the change narrow to Studio semantics plus shared Subject canonicalization and defense in
  depth. Do not change AI prompts, category resolution, legacy tags, or indexed records.
- Update Studio’s `buildStudioAlgoliaSmartFacetFilters` and `designMatchesSmartFilters` to OR within
  each dimension. Add explicit all-eight-dimension and cross-dimension tests.
- Use a shared canonical Subject helper for AI, staff, import, preservation/reset/seed, and shared
  Algolia record/projection paths. Preserve atomic compounds, specificity, derivative suppression,
  and novel terms; introduce no allowlist.
- Normalize Studio and Portal selected Subject values before exact facet construction and render
  lowercase Subject facet labels. Preserve all other dimension casing behavior.
- Update modal copy in both surfaces to state ANY within a dimension and ALL across dimensions.
- Add regression contracts proving no `tagIds`/`tagFacetKeys`, category/search/Halftone/Needs
  Companion/reset behavior, and Portal owner-observed parity.
- Run focused shared/Functions/Studio/Portal tests, TypeScript, targeted ESLint, applicable builds,
  and `git diff --check`.
- Capture read-only DEV and production mixed-case inventories. Do not repair Firestore or Algolia in
- this phase; include a deterministic DEV repair proposal and production promotion/repair plan.
- Keep selected-filter normalization unbounded within the UI/provider limit (record projection caps
  must not truncate a user's 13th+ selected value); preserve managed Smart + Halftone semantics and
  fail closed for exact-ID fallback when Smart Filters are active.

## Security/operations decision

No new authority, callable, secret, Rules change, production setting, production deployment, data
write, reprocessing, or Algolia mutation is approved. DEV QA remains a later owner checkpoint.

The read-only DEV inventory found 145 mixed-case Subject-bearing designs and 94 mixed-case/whitespace
facet values in the current DEV index. The deployed DEV Functions still predate this canonicalization
change, so historical lowercase convergence is explicitly not claimed by this local phase.
