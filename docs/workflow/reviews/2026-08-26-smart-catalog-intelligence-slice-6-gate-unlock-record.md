# Ready Gate Unlock Record — Smart Catalog Intelligence Slice 6 (DEV)

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Project | **fresh-prints-dev** only |
| Status | **gate unlocked** — Preview authorized next; no Preview invoked |
| Prior deploy | `docs/workflow/reviews/2026-08-26-smart-catalog-intelligence-slice-6-dev-deploy-record.md` |

---

## Pre-check

| Check | Result |
|-------|--------|
| Branch | `development` |
| Firebase target | fresh-prints-dev |
| `catalogWorkflowMode` | shadow |
| `catalogAutonomousLiveEnabled` | false |
| Active `ready_catalog` jobs | 0 |
| Active `ai_review_queue` jobs | 0 |
| Slice 6 preservation Functions deployed | yes (prior pass) |
| Production targeted | no |

## Constant change

`packages/shared/src/constants/catalogReprocess.constants.ts`:

```diff
- export const CATALOG_REPROCESS_READY_CATALOG_ENABLED = false;
+ export const CATALOG_REPROCESS_READY_CATALOG_ENABLED = true;
```

## Consumer analysis (deploy allowlist)

Repo wiring: only `catalogReprocessCallables.ts` imports `isCatalogReprocessTargetEnabled`.

| Function | Gate consumer? | Redeploy required? |
|----------|----------------|-------------------|
| `previewCatalogReprocessJob` | yes | **yes** |
| `startCatalogReprocessJob` | yes | **yes** |
| `onCatalogReprocessJobWritten` | no (collection constant only) | no |
| `enqueueAiEnrichment` | no | no |

## Tests (pre-deploy)

**31/31 PASS** — shared gates, preservation, slice5/6 contracts, Studio contracts.

Functions build + Studio tsc: **PASS**. `git diff --check`: **PASS**.

## Deploy command

```bash
firebase deploy --project fresh-prints-dev --only functions:startCatalogReprocessJob,functions:previewCatalogReprocessJob
```

## Deployment result

**Deploy complete**

| Function | State | updateTime (UTC) |
|----------|-------|------------------|
| `previewCatalogReprocessJob` | ACTIVE | 2026-08-26T17:18:43Z |
| `startCatalogReprocessJob` | ACTIVE | 2026-08-26T17:18:42Z |

Deployed bundle: `CATALOG_REPROCESS_READY_CATALOG_ENABLED = true`.

## Post-deploy runtime

| Setting | Value |
|---------|-------|
| Ready gate (deployed) | **true** |
| `catalogWorkflowMode` | shadow |
| `catalogAutonomousLiveEnabled` | false |
| Active jobs | 0 |
| Preview invoked | **no** |
| Start/canary invoked | **no** |

## Studio

Local `npm run dev:studio` resolves `@fresh-prints/shared` from source — Ready Preview/Start controls available when Shadow + Autonomous OFF preconditions met. **No Studio release required** for this checkpoint.

## Next

Owner authorizes **Ready Catalog Preview** on fresh-prints-dev.
