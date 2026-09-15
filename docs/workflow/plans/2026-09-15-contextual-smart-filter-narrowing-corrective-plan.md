# Contextual Smart Filter narrowing corrective

## Goal

Make Smart Filter selections cumulative: every selected value within a dimension must match,
and dimensions continue to combine with AND. Recompute facet distributions against the fully
selected cohort so displayed counts reflect current results.

## Evidence

Read-only DEV Algolia proof on `portal_catalog_ready_dev`:

- `cow` = 14; `highland cow` = 12; exact intersection = 12; union = 14.
- All 12 `highland cow` hits also contain canonical `cow`; the two remaining cow hits are
  `9EGDdQJbi2q15UBqE5Sf` and `AQANDsOHtzJ94i3QrVYm`.
- Current grouped query `[["subjects:cow","subjects:highland cow"]]` returns 14.
- Current singleton query `[["subjects:cow"],["subjects:highland cow"]]` returns 12.
- Subject matching remains exact-token (partial `subjects:highland` returns 0).

## Reviewed behavior

The shared builder currently emits OR within a dimension. Change it to emit one singleton group
per selected value, preserving outer AND semantics:

```ts
// current
[["subjects:cow", "subjects:highland cow"]]

// proposed
[["subjects:cow"], ["subjects:highland cow"]]
```

The existing facet-distribution search path already applies the active Smart Filter query to all
eight requested dimensions. With cumulative filters, counts therefore represent the narrowed
cohort rather than a disjunctive union. No page-local counting or client-side workaround is added.

## Scope

- Shared Smart Filter query builder used by Studio and Portal.
- Studio hydrated matcher (`every` selected value within each dimension).
- Studio/Portal modal copy and regression contracts.
- Preserve lowercase Subjects, exact tokens, category/search/Halftone/Needs Companion, category
  narrowing, pagination, and no legacy tags.
- Read-only production impact analysis only.

Out of scope: AI enrichment, Smart Profile semantic generation, data repair, Algolia rebuild or
reconcile, production deploy/release, production settings, or production backfill.

## Gates

Plan → Formal Review → Implement → Test → independent adversarial review → DEV runtime verification.
Stop at `OWNER QA REQUIRED — CONTEXTUAL SMART FILTER NARROWING`.
