# DEV Deploy Record — Explicit Content Standard Enrichment (ADR-FP-172)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Project | `fresh-prints-dev` |
| Branch | `development` |
| IR | `docs/workflow/reviews/2026-09-05-explicit-content-standard-enrichment-classification-implementation-review.md` |
| Result | **DEV DEPLOYED** — Functions allowlist + Firestore Rules |

## Pre-deploy

| Check | Result |
|---|---|
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Mode | `shadow` |
| Live gate | `false` |
| Source drift since IR | **NO** (ADR-FP-172 markers present; `mayWriteExplicit` not Ready-gated) |
| In-flight catalog reprocess | **none observed** |
| Terms count | **43**; `damn` present |
| Functions build | **PASS** |
| Rules scope | **additive only** (`explicitContentSource` allowlist + validator) |

## Deploy command

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,firestore:rules" --project fresh-prints-dev --non-interactive
```

| Item | Value |
|---|---|
| Exit code | **0** |
| Timestamp (UTC) | ~2026-09-05T19:00:38Z → ~19:03:35Z |
| Unrelated resources deployed | **NO** |

## Function revisions (us-central1, 100% traffic)

| Function | New revision |
|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00097-tib` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00008-dis` |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00019-tah` |

## Firestore Rules

| Item | Value |
|---|---|
| Deploy log | `+ firestore: released rules firestore.rules to cloud.firestore` |
| Additive markers (local source released) | `isOptionalExplicitContentSource`, `explicitContentSource` in `catalogMetadataOnlyUpdate` hasOnly + validators |
| Customer/role broadening | **NO** |

## Post-deploy gate

| Item | Value |
|---|---|
| `catalogWorkflowMode` | `shadow` |
| `catalogAutonomousLiveEnabled` | `false` |
| Autonomous enabled | **NO** |
