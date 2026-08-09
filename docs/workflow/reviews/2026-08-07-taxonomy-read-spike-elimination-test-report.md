# Test Report — Taxonomy read-spike elimination (source Implement)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Follow-up | `taxonomy-read-spike-elimination` |
| Status | **passed** (targeted suite + typecheck + lint + diff-check) |

## Commands run

```bash
npx tsx --test \
  packages/shared/src/utils/taxonomyMaterializationBuilder.test.ts \
  packages/shared/src/constants/taxonomyMaterializationRulesAlignment.test.ts \
  functions/src/taxonomy/taxonomyMaterializationContainment.test.ts \
  functions/src/taxonomy/taxonomyMaterializationBuilder.test.ts \
  functions/src/ai/aiTaxonomyCache.test.ts \
  apps/studio/src/renderer/src/features/designs/hooks/taxonomyMaterializationShortCircuit.test.ts \
  apps/studio/src/renderer/src/features/designs/hooks/taxonomyArchiveCacheInvalidation.test.ts

npx tsc --noEmit -p functions
npx tsc --noEmit -p apps/studio
npx eslint <changed taxonomy paths> --max-warnings 0
git diff --check
```

## Results

| Check | Result |
|-------|--------|
| Targeted unit/containment | **37/37 pass** |
| Functions `tsc` | **pass** (exit 0) |
| Studio `tsc` | **pass** (exit 0) |
| ESLint (changed taxonomy paths) | **pass** (exit 0) |
| `git diff --check` | **pass** (CRLF warnings only) |
| Emulator Rules (`catalogSnapshot.rules.test` taxonomyMaterialization cases) | **not run this pass** — source alignment + seeded emulator cases added; run with `npm run test:rules` before Rules deploy gate |

## Coverage map

- Builder deterministic / chunk soft-max / contentHash / fence validation
- Scale projection: 1121→1, 5K→2, 10K→3 chunks @ ~268 B/tag
- Resolver parity
- Writer registry + design/Algolia/enqueue non-rebuild containment
- Stage 5 negative path (no generated catalog Rules revival)
- AI revision-keyed process cache + single-flight joins
- Studio short-circuit order + disk cache clear wiring
- Rules source alignment (`isStaff` read / client write deny)
