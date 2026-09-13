# Slice 6 Smart Profile Visibility/Editing — DEV Deploy Record

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Authorization | Owner authorized corrective DEV deploy only |

## Repo-verified deploy allowlist

| Function | Why required |
|----------|--------------|
| `updateDesignSmartProfileDimensions` | **New** owner/admin Smart Profile dimension patch callable |
| `resetDesignSmartProfileDimension` | **New** per-dimension Reset to AI callable |
| `onCatalogReprocessJobWritten` | Bundles `catalogReprocessWorker` (`ready_backfill` staff merge + `readyApprovalAuditUnchanged` semantic Timestamp compare) and `runAiEnrichmentPipeline` for Ready reprocess path |
| `enqueueAiEnrichment` | Sole index export calling `runAiEnrichmentPipeline` for normal queue enrichment; carries `smartProfileAiSnapshot` write in `markAiSuccess` |

**Wiring verified:** `functions/src/index.ts` exports all four; compiled `functions/lib/functions/src/index.js` includes all four; `runAiEnrichmentPipeline` imported only from `enqueueAiEnrichment.ts` and `catalogReprocessWorker.ts` (bundled via `onCatalogReprocessJobWritten`).

## Deploy command

```bash
firebase deploy --project fresh-prints-dev --only functions:updateDesignSmartProfileDimensions,functions:resetDesignSmartProfileDimension,functions:onCatalogReprocessJobWritten,functions:enqueueAiEnrichment
```

**Result:** Deploy complete (exit 0).

## Deployed revisions

| Function | State | updateTime (UTC) | Revision |
|----------|-------|------------------|----------|
| `updateDesignSmartProfileDimensions` | ACTIVE | 2026-08-26T20:23:35Z | `updatedesignsmartprofiledimensions-00001-buq` |
| `resetDesignSmartProfileDimension` | ACTIVE | 2026-08-26T20:23:43Z | `resetdesignsmartprofiledimension-00001-zih` |
| `onCatalogReprocessJobWritten` | ACTIVE | 2026-08-26T20:23:23Z | `oncatalogreprocessjobwritten-00005-bom` |
| `enqueueAiEnrichment` | ACTIVE | 2026-08-26T20:23:37Z | `enqueueaienrichment-00083-ret` |

## Pre/post runtime safety

| Check | Result |
|-------|--------|
| Branch `development` | PASS |
| Firebase target `fresh-prints-dev` | PASS |
| Ready gate (source) | `CATALOG_REPROCESS_READY_CATALOG_ENABLED = true` |
| `catalogWorkflowMode` | `shadow` |
| `catalogAutonomousLiveEnabled` | `false` |
| Active reprocess jobs | `0` |
| Production targeted | NO |
| Full Ready Start invoked | NO |

## Canary design state (post-deploy read-only)

All three canary designs are **Current v30/v4** with Smart Profile present:

| Design ID | prompt/normalizer | automation | `smartProfileAiSnapshot` |
|-----------|-------------------|------------|--------------------------|
| `07ZCzmp7OFdSYKZ6hTg5` | v30 / v4 | shadow / would auto-approve | **false** (canary ran pre-snapshot deploy) |
| `6x2LyTvG3ewIePeWHanV` | v30 / v4 | needs_review / verifier_unresolved / hard-block signals | **false** |
| `0MpiuK4ERPawPEsUoZLn` | v30 / v4 | shadow / would auto-approve | **false** |

**Reset to AI limitation:** Reset buttons require `smartProfileAiSnapshot` on the design document. Existing canaries lack this field because they were processed before snapshot code was deployed. **Edit Smart Profile** (dimension patch) works; **Reset to AI** will fail with failed-precondition until a future enrichment/backfill writes snapshot (requires separate owner authorization — no reprocess in this deploy).

## Not deployed

Firestore rules, indexes, Storage, App Hosting, Studio release, production, unrelated Functions.

## Recommendation

**READY FOR OWNER SMART PROFILE QA** — with Reset to AI unavailable on existing canaries until snapshot exists.
