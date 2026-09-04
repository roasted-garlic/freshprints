# DEV Deploy Record — Category Dominant-Intent Calibration

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Project | **fresh-prints-dev** |
| Branch | `development` |
| Baseline SHA | `0424653dcfa28475030da2d63d1611e1380bf48b` (uncommitted corrective source) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Corrective | `category-dominant-intent-calibration` |
| Production | **NOT TOUCHED** |
| WS4 | **NOT STARTED** |

---

## Pre-deploy

| Check | Result |
|-------|--------|
| Branch `development` | PASS |
| Target `fresh-prints-dev` | PASS (`firebase use`) |
| IR file set present (resolver/prompt/cache/ADR) | PASS |
| Prompt `catalog-enrich-v33` | PASS |
| Normalizer `smart-profile-normalizer-v6` | PASS |
| Schema `smart-profile-v1` | PASS |
| Prompt max 12000 | PASS |
| Functions build | PASS |
| `.worktrees/` preserved | PASS |
| Rules / Storage / indexes / Algolia settings / migration | Not in deploy |
| Owner auth | DEV deploy + Gate A + four-design canary authorized |

---

## Allowlist (exact)

- `enqueueAiEnrichment`
- `onCatalogReprocessJobWritten`
- `startCatalogReprocessJob`
- `previewCatalogReprocessJob`

## Command

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:enqueueAiEnrichment,functions:onCatalogReprocessJobWritten,functions:startCatalogReprocessJob,functions:previewCatalogReprocessJob" --project fresh-prints-dev --non-interactive
```

| Result | Value |
|--------|-------|
| Exit code | **0** |
| Outcome | Deploy complete — 4 Successful update operations |

---

## Revisions (us-central1, Gen2, Node.js 20, traffic 100% latest)

| Function | Prior | New | ACTIVE | Changed |
|----------|-------|-----|--------|---------|
| enqueueAiEnrichment | `enqueueaienrichment-00087-xum` | `enqueueaienrichment-00088-xoj` | Yes | Yes |
| onCatalogReprocessJobWritten | `oncatalogreprocessjobwritten-00009-qon` | `oncatalogreprocessjobwritten-00010-ton` | Yes | Yes |
| startCatalogReprocessJob | `startcatalogreprocessjob-00008-rup` | `startcatalogreprocessjob-00009-cus` | Yes | Yes |
| previewCatalogReprocessJob | `previewcatalogreprocessjob-00008-yoj` | `previewcatalogreprocessjob-00009-jax` | Yes | Yes |

Unrelated unchanged:

| Function | Revision |
|----------|----------|
| pauseCatalogReprocessJob | `pausecatalogreprocessjob-00002-kom` |
| syncPortalCatalogDesignToAlgolia | `syncportalcatalogdesigntoalgolia-00005-riw` |

---

## Live settings (post-deploy)

| Setting | Value |
|---------|-------|
| `catalogWorkflowMode` | **shadow** |
| `catalogAutonomousLiveEnabled` | **false** |

---

## Explicit non-actions

| Action | Result |
|--------|--------|
| Ready Catalog reprocess | NO |
| Broader AI Review reprocess | NO |
| Autonomous enable | NO |
| Tag retirement | NO |
| Rules / Storage / indexes | NO |
| Algolia settings mutation | NO |
| Migration/backfill | NO |
| Production | NO |
| Commit/push | NO |

---

## Follow-on

- Gate A + canary: `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-canary-result.md`
- Owner checkpoint: `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-owner-canary-checkpoint.md`
