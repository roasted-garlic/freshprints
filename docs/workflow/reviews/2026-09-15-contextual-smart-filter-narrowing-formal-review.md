# Formal Review — Contextual Smart Filter narrowing

## Verdict

**APPROVED WITH CHANGES** for the bounded DEV corrective.

## Findings

1. DEV set math proves `|cow|=14`, `|highland cow|=12`, `|intersection|=12`, and `|union|=14`;
   all Highland-cow hits contain `cow`. No semantic subject repair is warranted.
2. The current shared builder emits one OR group for same-dimension values, producing the union.
   The approved replacement emits singleton groups, producing cumulative intersection.
3. Studio hydration currently uses `some`; it must require every selected value within a
   dimension to match, while dimensions remain ANDed.
4. Facet distributions must retain all active filters, including the active dimension, so counts
   are contextual to the narrowed cohort. Category distribution remains disjunctive only for the
   selected category.
5. Lowercase Subject canonicalization, exact-token semantics, and the owner-observed passing Portal
   runtime must remain intact. No production mutation or AI backfill is approved.

## Required changes

- Update the shared builder and both client contracts to cumulative singleton groups.
- Update Studio matcher and modal explanatory copy on both surfaces.
- Add explicit cow/highland-cow count and intersection contracts, multi-value/multi-dimension,
  category/search/Halftone/Needs Companion, reset, pagination, lowercase, and parity coverage.
- Run focused and broader tests, typechecks, lint, builds, and adversarial review.

No production deploy, reindex, reconcile, data repair, or settings change is authorized.

Owner QA subsequently passed the implemented corrective; signoff is recorded in
`2026-09-15-contextual-smart-filter-narrowing-signoff.md`.
