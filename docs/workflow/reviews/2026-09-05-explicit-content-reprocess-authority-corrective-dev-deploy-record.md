# DEV Deploy Record — Explicit Content Reprocess Authority (ADR-FP-173)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Project | `fresh-prints-dev` |
| Branch | `development` |
| IR | `docs/workflow/reviews/2026-09-05-explicit-content-reprocess-authority-corrective-implementation-review.md` |
| Result | **DEV DEPLOYED** |

## Pre-deploy

| Check | Result |
|---|---|
| Mode | `shadow` |
| Live gate | `false` |
| Source drift since IR | **NO** |
| In-flight reprocess jobs | **none** |
| Rules scope | additive `explicitContentAutomationLocked` |

## Deploy

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,firestore:rules" --project fresh-prints-dev --non-interactive
```

| Item | Value |
|---|---|
| Exit | **0** |
| Unrelated resources | **NO** |
| Rules | `+ firestore: released rules firestore.rules to cloud.firestore` |

## Revisions (100% traffic)

| Function | Revision |
|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00098-wiw` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00009-liw` |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00020-feh` |

## Post-deploy gate

`shadow` / `false` · Autonomous **OFF**
