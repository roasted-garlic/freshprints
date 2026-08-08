# Test Report: Optional Algolia secret discovery corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `functions-optional-algolia-secret-deployment-discovery-corrective` |
| Plan | `docs/workflow/plans/2026-08-08-functions-optional-algolia-secret-deployment-discovery-corrective-plan.md` |
| Status | **passed** |

---

## Commands and results

| Check | Command | Exit | Result |
|-------|---------|-----:|--------|
| Functions build | `npm run build` (in `functions/`) | **0** | `tsc` OK |
| Discovery regression | `npx tsx --test functions/src/optionalAlgoliaSecretDiscovery.test.ts` | **0** | **4/4** |
| Algolia unit | `npx tsx --test` `buildPortalCatalogAlgoliaRecord` + `portalCatalogChangeClassifier` | **0** | **12/12** |
| Taxonomy + AI taxonomy | materialization builder/containment + trigger coalesce + `aiTaxonomyCache` | **0** | **30/30** |
| Open Graph | `npx tsx --test functions/src/getPortalGlobalOpenGraph.test.ts` | **0** | **6/6** |
| Scoped eslint | eslint on touched Functions sources | **0** | clean |
| `git diff --check` (scoped to this corrective) | touched Functions + ADR/BACKEND/DEPLOYMENT | **0** | clean |

Note: repo-wide `git diff --check` reports unrelated pre-existing whitespace in other workflow docs; out of scope.

---

## Discovery proof (before → after)

| Entry load | Before (investigation) | After (this Implement) |
|------------|------------------------|-------------------------|
| `enqueueAiEnrichment` | **includes** `ALGOLIA_ADMIN_API_KEY` | **excludes** |
| default `index` | **includes** `ALGOLIA_ADMIN_API_KEY` | **excludes** |
| Algolia sync module | includes | **includes** (expected) |
| shared `lib/secrets` | includes | **excludes** |

Manual node proof after build (exit 0):

- enqueue / index: `has ALGOLIA false`
- `algolia/syncPortalCatalogDesignToAlgolia`: `has ALGOLIA true`

---

## Production mutation

| Check | Result |
|-------|--------|
| Functions deploy | **NOT RUN** |
| `ALGOLIA_ADMIN_API_KEY` on prod | still **NOT FOUND** (metadata only) |
| Wave A CREATE trio | unchanged this pass |

---

## Prepared Wave A command (NOT EXECUTED)

```bash
firebase deploy --only functions:onTagTaxonomySourceWritten,functions:onCategoryTaxonomySourceWritten,functions:rebuildTaxonomyMaterializationCallable,functions:enqueueAiEnrichment,functions:getPortalGlobalOpenGraph --project fresh-prints-prod --non-interactive
```

Prerequisite: this corrective must be on the `production` tip used for deploy (commit/promote as owned separately if still local-only).
