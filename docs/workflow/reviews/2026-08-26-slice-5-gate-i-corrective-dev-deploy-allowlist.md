# DEV Deploy Allowlist — Slice 5 Gate I Corrective (v30 / normalizer-v4)

| Field | Value |
|-------|--------|
| Date | 2026-08-26 |
| Project | **fresh-prints-dev only** |
| Purpose | Ship Gate I corrective: `catalog-enrich-v30` + `smart-profile-normalizer-v4` + subject anti-glue + `category_dominant_intent_conflict` |
| Owner auth | DEV deploy authorized this session |

---

## Dependency inspection

| Export | Runs enrichment pipeline? | Uses v30/v4 / snapshot constants? | Deploy? |
|--------|---------------------------|-------------------------------------|---------|
| `enqueueAiEnrichment` | **Yes** (`runAiEnrichmentPipeline`) | Prompt + normalizer + decision | **Yes** |
| `onCatalogReprocessJobWritten` | **Yes** (worker → pipeline) | Prompt + normalizer + decision | **Yes** |
| `startCatalogReprocessJob` | No (starts job doc only) | Stamps `CATALOG_REPROCESS_*_SNAPSHOT` (v30/v4) on job | **Yes** — version-label consistency |
| `previewCatalogReprocessJob` | No | Eligibility notes use prompt snapshot | **Yes** — preview consistency |
| `resetAiEnrichmentForProcessing` | No (clears fields only; client re-enqueues) | No | No |
| `pause` / `resume` / `retry` callables | No enrichment | No snapshot stamp on Start | No |
| Playground / settings / Algolia | Out of path | — | No |

`catalogThemeCategoryResolver.ts` unchanged (decision-layer only).

---

## Exact command

```bash
firebase deploy --project fresh-prints-dev --only functions:enqueueAiEnrichment,functions:onCatalogReprocessJobWritten,functions:startCatalogReprocessJob,functions:previewCatalogReprocessJob
```

## Pre-deploy safety (recorded)

| Check | Result |
|-------|--------|
| Firebase current project | `fresh-prints-dev` |
| Branch | `development` |
| `catalogWorkflowMode` | `shadow` |
| `catalogAutonomousLiveEnabled` | `false` |
| Ready Catalog enabled constant | `false` |
| Active reprocess jobs | none |
| Production | not selected |
| Working tree | **WARN** — ambient uncommitted Slice 3–5 / Studio / Portal work present; Functions allowlist only ships Functions bundles from current `functions/` + shared imports |

## Hard stops honored

- No rules/indexes/App Hosting/Studio/production
- No full 204 reprocess
- No mini QA in this pass
