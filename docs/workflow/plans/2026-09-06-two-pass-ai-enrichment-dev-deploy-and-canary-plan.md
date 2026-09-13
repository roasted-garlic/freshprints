# DEV Deploy and Canary Plan — Two-Pass AI Enrichment

Frozen source SHA: `74d7b2edb43f89906f4b7449db004747b6ea0c22`

## Exact Function inventory

Redeploy only:

```text
functions:enqueueAiEnrichment
functions:resetAiEnrichmentForProcessing
functions:reprocessReadyDesignWithAi
functions:testAiEnrichmentPlayground
functions:testAiEnrichmentSemanticReviewPlayground
functions:updateAiEnrichmentSettings
```

`testAiEnrichmentTagRerank` is removed and must not be deployed. No other Function export changed or consumes the modified candidate/runtime path.

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "60"
firebase deploy --only "functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing,functions:reprocessReadyDesignWithAi,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentSemanticReviewPlayground,functions:updateAiEnrichmentSettings" --project fresh-prints-dev --non-interactive
```

## Studio

Studio has no Firebase-hosted deployment surface. DEV Studio is the local Electron build/run from the frozen SHA:

```powershell
npm --prefix apps/studio run build
npm --prefix apps/studio run dev
```

No installer publishing or update-channel action is included.

## Shared and data inventory

Changed shared code is bundled by Functions and Studio builds; it has no independent deployment. Firestore Rules: NO. Storage Rules: NO. Indexes: NO. Migration/backfill: NO. These are proven by the absence of `firestore.rules`, `storage.rules`, `firestore.indexes.json`, and migration/backfill diffs.

## Ordered canary

Gate A deploys with `semanticReviewerEnabled=false`, Autonomous OFF, and shadow/live false. Verify `catalog-enrich-v38`, `visual-context-v1`, `catalog-semantic-review-v1`, retired Tag Rerank/Suggestion Author paths, VCP, canonical copy, exact category behavior, category gaps, visibleText, staff/import authority, inert tags, and Pass 1 tokens/cost.

Gate B uses the visible manual Playground Pass 2 flow with the exact displayed Pass 1 payload. Verify text-only operation, woman/girl equivalence, unsupported subject, specificity, objective-blocker refusal, forbidden patch rejection, protected staff/preset dimensions, one-call maximum, Pass 2 cost, combined cost, and zero Tag Rerank cost.

Gate C is a separate owner checkpoint. If authorized, set `semanticReviewerEnabled=true` through `updateAiEnrichmentSettings` for a small targeted sample, verify provenance/patches/effective-authority WAA, then immediately set it false. Autonomous remains OFF.

Record each Function revision from Firebase output/listing, the frozen SHA, Studio SHA, measured tokens/costs, and canary results. Rollback is disablement, prior-SHA Function redeploy, or prior-SHA Studio restart; never restore Tag Rerank.

Deployment authorization: NO pending owner authorization.
