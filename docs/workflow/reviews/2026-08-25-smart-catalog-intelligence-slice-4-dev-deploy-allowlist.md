# DEV Deploy Allowlist — Smart Catalog Intelligence Slice 4

**Status:** Owner-authorized 2026-08-25 — deploy to `fresh-prints-dev` only.

**Target:** `fresh-prints-dev` only.  
**Not included:** production project, Algolia prod index, live Autonomous enablement, Slice 5/6 Start unlock.

---

## Preflight (2026-08-25)

| Check | Result |
|-------|--------|
| `npm run lint` | pass (fixed prefer-const + unrelated portal hook warnings blocking max-warnings 0) |
| `git diff --check` | pass (fixed trailing whitespace in handoff CURRENT-STATE) |
| `npm --prefix functions run build` | pass |
| Studio `npx tsc --noEmit` | pass |
| `firebase use` | **fresh-prints-dev** (current) |
| Production targeted? | **No** |

## Enrichment entrypoint resolution (repo source)

| Finding | Path |
|---------|------|
| Pipeline implementation | `functions/src/ai/aiEnrichmentPipeline.ts` → `runAiEnrichmentPipeline` |
| Sole caller of `runAiEnrichmentPipeline` | `functions/src/enqueueAiEnrichment.ts` → export `enqueueAiEnrichment` |
| Other AI callables | `resetAiEnrichmentForProcessing`, playground/rerank/settings — do **not** invoke the changed pipeline decision path |

## Final Functions allowlist (exact)

1. `updateCatalogWorkflowMode`
2. `previewCatalogReprocessJob`
3. `startCatalogReprocessJob`
4. `pauseCatalogReprocessJob`
5. `resumeCatalogReprocessJob`
6. `retryCatalogReprocessJobFailures`
7. `onCatalogReprocessJobWritten`
8. `enqueueAiEnrichment` — required to ship Catalog Processing Mode + autonomy decision/verifier in the live enrichment path

## Firestore Rules

- `settings/{settingId}` read includes `catalogAutomationHealth`
- `catalogReprocessJobs/{jobId}` owner read; write deny

## Firestore Indexes

Composite for active job query:

- Collection `catalogReprocessJobs`: `projectId` ASC, `targetType` ASC, `status` ASC  
  (added to `firestore.indexes.json` for this deploy)

## Studio

Not a Firebase Hosting deploy. Studio Electron build against **fresh-prints-dev** local config for manual QA.

## Explicitly exclude

- `fresh-prints-prod`
- Enabling `catalogAutonomousLiveEnabled`
- Setting `CATALOG_REPROCESS_*_ENABLED` true
- Tag retirement / index field removal
- Production Algolia mutations

## Post-deploy smoke (owner)

See owner manual QA checklist in workflow state / chat after deploy verification.
