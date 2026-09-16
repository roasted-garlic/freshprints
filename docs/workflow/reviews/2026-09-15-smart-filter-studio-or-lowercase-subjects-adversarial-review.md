# Independent adversarial review — Smart Filter OR + lowercase Subjects

> **Historical:** This review covers the prior OR phase. The current governing behavior is
> cumulative contextual narrowing documented in `2026-09-15-contextual-smart-filter-narrowing-adversarial-review.md`.

**Review date:** 2026-09-15 UTC

## Verdict

**CODE-LEVEL PASS WITH OWNER-GATED DEV DATA/DEPLOYMENT FOLLOW-UP.** The reviewed source now uses
one Algolia OR group per selected value set within each of the eight Smart Profile dimensions and
ANDs those groups across dimensions. Studio hydration matching uses the same any-within/every-
across rule. No legacy tag fields participate.

## Evidence

- Shared builder: `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts` owns the
  eight-dimension grouped shape and selected-value normalization.
- Studio and Portal search/facet services delegate to that builder; category facet requests omit
  the selected category, preserving disjunctive category narrowing.
- DEV search-only probe on `portal_catalog_ready_dev`: 537 hits; all eight facet keys returned.
  `subjects:cow OR subjects:highland cow` returned 14 hits (singleton intersection returned 12);
  adding `categoryId:Animals` narrowed the grouped result to 10. A cross-dimension grouped query
  confirmed AND behavior.
- Direct all-eight facet probes satisfied the OR invariant (grouped count ≥ each singleton and ≤
  their sum). No legacy `tagIds`/`tagFacetKeys` constraints appear in source or tests.
- Smart + Halftone remains on managed Algolia search with the staff Halftone post-filter. Exact-ID
  Firestore fallback is disabled when Smart Filters are selected because the public projection
  cannot prove Smart Profile membership; this fails closed rather than bypassing a selection.
- Because Halftone is a client post-filter rather than an Algolia facet, the Portal count badge is
  reported as unavailable for the combined Smart + Halftone case instead of overstating raw
  Algolia `nbHits`.
- Selected filters are not truncated at the record projection cap; 13-value selection contracts
  pass. Studio serialization is deterministic after canonical normalization.
- Studio Smart Profile detail/facet display and both modal paths normalize Subject labels to
  lowercase, collapsed whitespace, and case-deduplicated tokens.

## Validation

Expanded focused suites (Portal hook/search, Studio facets, shared Algolia/normalization/import,
and Functions record/enrichment contracts): **150/150 tests, 35 suites PASS**; Functions AI
**441/441** and Functions Algolia **18/18** also pass. Targeted ESLint,
Portal typecheck, Studio TypeScript, Functions build, Studio renderer/electron/preload/electron-
builder build, and `git diff --check` pass. Portal `next build` remains environment-limited by
the existing Windows `.next/trace` EPERM while a dev server holds the generated directory.

## Bounded follow-up (not a code defect)

The deployed DEV Functions/index predate the lowercase change. Read-only inventory found 145 DEV
Firestore designs with noncanonical Subject values and 94 mixed-case/whitespace DEV Algolia facet
values; 143/537 Ready index records currently differ from the new lowercase projection. A future
owner-authorized DEV Function promotion plus deterministic metadata repair and explicit Algolia
reindex/reconcile is required before claiming historical lowercase convergence. No such mutation
was performed here. Production was not touched and remains a separate promotion checkpoint.
