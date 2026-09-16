# Smart Filter Studio same-dimension OR + canonical lowercase Subjects

> **Superseded:** The owner’s subsequent contextual-narrowing authorization replaces same-dimension
> OR with cumulative AND. See `2026-09-15-contextual-smart-filter-narrowing-corrective-plan.md`.

## Goal

Correct the DEV-observed Studio Smart Filter behavior so selected values within one Smart Profile
dimension are disjunctive (OR), while different dimensions, text search, and category remain
conjunctive (AND). Canonicalize Subject values to lowercase at shared persistence, import/staff,
and Algolia boundaries so casing cannot split exact facets.

This is a bounded follow-up after the owner’s `OWNER QA: AUTONOMOUS CATALOG-COPY FAIL-CLOSED
CORRECTIVE — PASS`. The owner reports that Portal subject filtering already behaves correctly.
The checked-in Portal source was still emitting singleton groups, so it is aligned with the
explicitly approved grouped contract through the shared helper. The owner reports the current
Portal experience works; no remote Portal runtime mutation is claimed here, and this keeps the two
source paths from drifting.

## Proven current behavior

Studio `buildStudioAlgoliaSmartFacetFilters({ subjects: ["cow", "highland cow"] })` currently
returns:

```ts
[["subjects:cow"], ["subjects:highland cow"]]
```

Algolia interprets each inner array as an OR group and the outer array as AND, so this requires
both exact facet values. Studio’s hydrated-result guard also currently uses `selected.every(...)`,
which independently requires both values.

The reviewed replacement is:

```ts
[["subjects:cow", "subjects:highland cow"]]
```

For multiple dimensions the shape is, for example:

```ts
[
  ["subjects:cow", "subjects:highland cow"],
  ["styles:watercolor", "styles:whimsical"],
]
```

This yields `(subjects:cow OR subjects:highland cow) AND
(styles:watercolor OR styles:whimsical)` while preserving exact-token matching. Studio and Portal
facet-distribution requests must use the same grouping contract; no client-side filtering or broad
text-search workaround is allowed.

## Scope

In scope:

- Studio Smart Filter construction and hydrated consistency matching.
- Shared canonical Subject normalization: trim, collapse whitespace, lowercase, then dedupe.
- Staff edits, import presets, AI-built profiles, preserved staff/import dimensions, and reset
  paths at their authoritative shared boundaries.
- Shared public Algolia record construction and projected-index comparison for lowercase,
  case-deduplicated `subjects`.
- Studio/Portal selected Subject input normalization and lowercase facet display labels.
- Focused contracts covering all eight Smart Profile dimensions, category/search/Halftone/Needs
  Companion behavior, reset, empty/no-match cases, and no legacy tag fields.
- Read-only DEV and production inventories of mixed-case Smart Profile/Algolia Subject values.

Out of scope:

- AI prompts, Smart Profile semantic subject-collapse rules, allowlists, category logic, or
  indexed-record rebuilds.
- Firestore/Algolia data mutation, historical repair, production deploy/release, or production
  settings changes.
- Portal runtime deployment/release. Checked-in Portal source alignment is in scope only where
  parity evidence contradicts the existing source; the owner-reported runtime remains unmutated.

## Architecture/data/security impact

- `packages/shared` remains the single owner of Subject casing/dedupe primitives and the public
  Algolia record contract.
- Functions continue to persist Firestore Smart Profiles through existing builders/merges; no new
  callable or privilege is introduced.
- Studio and Portal retain search-only Algolia clients and exact facet filters.
- Existing Firestore Rules, authentication, and category authorization are unchanged.
- Algolia remains disposable derived data. Any future DEV repair must be deterministic metadata-only
  and separately owner-authorized; production repair is only proposed, never executed, here.

## Implementation sequence

1. Add shared Subject-only lowercase/dedupe helper without changing semantic derivative collapse.
2. Apply it after AI normalization and at staff/import merge, preservation, reset, and seed paths.
3. Apply defense-in-depth lowercase/dedupe in the shared Algolia record/projector.
4. Change Studio facet groups and hydrated matcher to OR within each dimension; route both Studio
  and Portal through the shared grouped helper so checked-in source cannot drift from the
  owner-observed Portal behavior. Normalize selected Subject inputs/display values.
5. Update Studio and Portal modal copy to explain ANY within a dimension and ALL across dimensions.
6. Add focused tests and run typecheck, lint, applicable builds, and `git diff --check`.
7. Capture read-only DEV/production casing inventories and a bounded DEV repair proposal.

## Verification and acceptance

- `cow` alone, `highland cow` alone, and both selected in Studio return expected exact-token
  matches; both do not collapse to intersection-only results.
- Different dimensions, category, text search, Halftone, Needs Companion, pagination, and clear
  reset remain AND/refinement behavior.
- Portal owner-observed behavior remains passing and source/test parity is documented.
- Smart + Halftone remains on managed search with the staff Halftone post-filter; exact-ID fallback
  fails closed when Smart Filters are selected because the public projection cannot prove profile
  membership.
- All eight dimensions use grouped facet filters; no legacy `tagIds`/`tagFacetKeys` participate.
- New and merged AI/staff/import Subjects, Algolia records, facet labels, and selected values are
  lowercase and case-deduplicated; semantic compound/specificity collapse remains unchanged and
  no curated allowlist is introduced.
- DEV and production mixed-case inventories are read-only. No data or Algolia mutation occurs.
- Existing DEV mixed-case rows and facets require a later owner-authorized Function promotion plus
  deterministic metadata repair/reindex; source-only tests do not claim historical convergence.

## Required gates

Plan → Formal Review → Implement → Test → independent adversarial review → DEV QA preparation.
Stop at `OWNER QA REQUIRED — SMART FILTER SAME-DIMENSION OR CORRECTIVE`.

Production promotion, repair, reprocessing, Algolia mutation, and release remain separate owner
checkpoints and are not part of this phase.
