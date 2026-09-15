# Independent adversarial review — Contextual Smart Filter narrowing

## Verdict

**PASS.** The owner recorded `OWNER QA: CONTEXTUAL SMART FILTER NARROWING — PASS`. The shared query contract now cumulatively ANDs every
selected Smart Filter value, while contextual facet distributions retain all active filters.

## Evidence

- DEV `portal_catalog_ready_dev` proof: cow=14, highland cow=12, exact intersection=12, union=14;
  all 12 Highland-cow records contain `cow`, and the two remaining records are cow-only.
- Grouped OR query returns 14; singleton query returns 12. Exact-token partial `highland` returns 0.
- Portal and Studio search/facet params emit identical singleton groups and retain category/search
  constraints. Category facet narrowing omits only the selected category filter.
- Studio hydration matching now requires every selected value. Selected zero-count options remain
  visible so an empty intersection can be cleared.
- Lowercase Subject normalization and no-legacy-tag protections remain covered.

## Validation

Contextual focused suites: **152 tests pass** across the affected shared, Studio, and Portal paths.
Studio and Portal typechecks, Functions build, Studio packaged build, targeted ESLint, and
`git diff --check` pass. Portal Next build remains limited by the existing Windows `.next/trace`
EPERM environment condition.

## Production boundary

No production settings, data, Algolia, Functions, or releases were changed. Historical lowercase
convergence remains a separate owner-authorized deployment/reindex decision.
