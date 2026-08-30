# DEV Deploy Record — Smart Catalog Intelligence Slice 4

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Project | **fresh-prints-dev** only |
| Status | **deployed** — awaiting owner manual QA |
| Console | https://console.firebase.google.com/project/fresh-prints-dev/overview |

---

## Preflight

| Check | Result |
|-------|--------|
| lint | pass |
| git diff --check | pass |
| functions build | pass |
| Studio tsc | pass |
| firebase use | fresh-prints-dev |
| production targeted | no |

## Enrichment entrypoint (resolved)

Sole `runAiEnrichmentPipeline` caller: **`enqueueAiEnrichment`**.

## Functions deployed (all us-central1, listed ACTIVE)

| Function | Op |
|----------|-----|
| updateCatalogWorkflowMode | created |
| previewCatalogReprocessJob | created |
| startCatalogReprocessJob | created |
| pauseCatalogReprocessJob | created |
| resumeCatalogReprocessJob | created |
| retryCatalogReprocessJobFailures | created |
| onCatalogReprocessJobWritten | created |
| enqueueAiEnrichment | updated |

## Firestore

- Rules released (incl. `catalogAutomationHealth` staff read; `catalogReprocessJobs` owner read / write deny)
- Indexes deployed; `catalogReprocessJobs` composite (`projectId`, `targetType`, `status`) present in project

## Hard limits respected

- No fresh-prints-prod
- Live Autonomous not enabled
- Reprocess Start gates remain OFF
- No Slice 5/6 jobs started
- No tag retirement

## Next

**STOP for owner manual QA** (checklist in owner deploy command). Do not sign off Slice 4 yet.
