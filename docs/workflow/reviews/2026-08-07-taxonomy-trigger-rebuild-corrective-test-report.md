# Test Report — Taxonomy trigger rebuild corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Follow-up | `taxonomy-trigger-rebuild-corrective` |
| Scope | Option A awaited coalesce + containment |
| Deploy | **Not run** |

---

## Commands and results

| Check | Command | Exit | Result |
|-------|---------|-----:|--------|
| Coalesce + containment + builder | `npx tsx --test functions/src/taxonomy/taxonomyTriggerCoalesce.test.ts functions/src/taxonomy/taxonomyMaterializationContainment.test.ts functions/src/taxonomy/taxonomyMaterializationBuilder.test.ts` | 0 | **18/18 pass** |
| Coalesce + containment (recheck) | same without builder | 0 | **15/15 pass** |
| Functions build / tsc | `npm run build --prefix functions` | 0 | **PASS** |
| ESLint (touched taxonomy files) | `npx eslint functions/src/taxonomy/{onTaxonomySourceWritten,taxonomyTriggerCoalesce,taxonomyTriggerCoalesce.test,taxonomyMaterializationContainment.test}.ts` | 0 | **PASS** |
| `git diff --check` (touched paths) | scoped | 0 | **PASS** |

---

## Coverage mapping

| Case | Test | Result |
|------|------|--------|
| A single write | coalesce A | PASS |
| B coalesced writes | coalesce B | PASS |
| C mid-rebuild trailing | coalesce C | PASS |
| D post-settle new cycle | coalesce D | PASS |
| E failure + reset + retry | coalesce E | PASS |
| F category reason | coalesce F | PASS |
| G independent instances | coalesce G | PASS |
| H await + no detached timer | containment RC-R1 / H | PASS |
| I fence/builder | builder suite | PASS |

---

## Confirmations

- NO deploy
- NO taxonomy mutation
- Alias `taxonomy-smoke-20260807` not touched
