# DEV Deploy Record — Smart Catalog Intelligence Slice 6 (Ready Preservation)

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Project | **fresh-prints-dev** only |
| Status | **deployed** — gate still locked; await gate-unlock checkpoint |
| Console | https://console.firebase.google.com/project/fresh-prints-dev/overview |

---

## Preflight

| Check | Result |
|-------|--------|
| Branch | `development` |
| firebase use | fresh-prints-dev |
| `CATALOG_REPROCESS_READY_CATALOG_ENABLED` (source) | **false** |
| `catalogWorkflowMode` (DEV Firestore) | **shadow** |
| `catalogAutonomousLiveEnabled` (DEV Firestore) | **false** |
| Active `ready_catalog` jobs | **0** |
| Active `ai_review_queue` jobs | **0** |
| Production targeted | **no** |
| Rules / indexes / Studio deploy | **not required** (Functions only) |
| functions build (predeploy) | pass |

## Allowlist verification

Repo inspection confirms four exports cover Slice 6 backend:

| Function | Why required |
|----------|--------------|
| `onCatalogReprocessJobWritten` | Durable worker; `ready_catalog` branch; `buildReadyCatalogReprocessAiStageUpdate`; `ready_backfill` pipeline; lifecycle assertions; canary `boundedDesignIds` |
| `startCatalogReprocessJob` | Ready Start preflight (Shadow + Autonomous OFF + gate + phrase); `canaryDesignIds` → `boundedDesignIds` |
| `previewCatalogReprocessJob` | Ready Preview inventory (`buildReadyCatalogInventory`) when gate enabled |
| `enqueueAiEnrichment` | Bundles updated `aiEnrichmentPipeline` (`ready_backfill` mode co-deployed with queue path) |

No additional Function exports required for Slice 6 Ready-preservation path.

## Deploy command

```bash
firebase deploy --project fresh-prints-dev --only functions:enqueueAiEnrichment,functions:onCatalogReprocessJobWritten,functions:startCatalogReprocessJob,functions:previewCatalogReprocessJob
```

## Deployment result

**Deploy complete** — all four Functions updated successfully.

| Function | State | updateTime (UTC) |
|----------|-------|------------------|
| `enqueueAiEnrichment` | ACTIVE | 2026-08-26T16:55:24.670696837Z |
| `onCatalogReprocessJobWritten` | ACTIVE | 2026-08-26T16:55:18.809900022Z |
| `previewCatalogReprocessJob` | ACTIVE | 2026-08-26T16:55:25.288612063Z |
| `startCatalogReprocessJob` | ACTIVE | 2026-08-26T16:56:07.406049854Z |

Region: **us-central1** · Runtime: **nodejs20** (2nd Gen)

## Post-deploy build verification (compiled bundle)

- `buildReadyCatalogReprocessAiStageUpdate`: queues AI; clears `aiSuggestions`/`aiAnalysis` only; no `smartProfile` delete; no `status`/`aiReviewStatus` writes
- `ready_backfill` pipeline: accepts ready+approved+queued; `publishReady: false` on success path
- Worker: `ready_lifecycle_violation` → soft-pause + `preservationViolations`
- Callables: `boundedDesignIds` from `canaryDesignIds` (max 50)
- Start preflight: Shadow + Autonomous OFF for `ready_catalog`

## Gate / runtime (unchanged)

| Setting | Value |
|---------|-------|
| `CATALOG_REPROCESS_READY_CATALOG_ENABLED` | **false** (source + deployed bundle) |
| `catalogWorkflowMode` | shadow |
| `catalogAutonomousLiveEnabled` | false |
| Ready Preview / Start on live DEV | **not invoked** (gate locked) |

## Warnings

- Node.js 20 runtime deprecation notice (2026-10-30) — track for future upgrade
- `firebase-functions` package upgrade suggested by CLI — out of Slice 6 scope

## Next

**STOP** — await owner **Ready gate unlock checkpoint** before Preview, canary, or full Ready Start.
