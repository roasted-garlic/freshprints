# DEV Deploy and Canary Formal Review — Two-Pass AI Enrichment

Verdict: approved for owner review. Deployment authorization: NO pending explicit owner authorization.

Frozen SHA: to be recorded after the authorized checkpoint commit/push.

Function allowlist: `enqueueAiEnrichment`, `resetAiEnrichmentForProcessing`, `reprocessReadyDesignWithAi`, `testAiEnrichmentPlayground`, `testAiEnrichmentSemanticReviewPlayground`, `updateAiEnrichmentSettings`.

Exact command:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "60"
firebase deploy --only "functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing,functions:reprocessReadyDesignWithAi,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentSemanticReviewPlayground,functions:updateAiEnrichmentSettings" --project fresh-prints-dev --non-interactive
```

Studio is local build/run only. Shared code is bundled into Functions/Studio. Rules, indexes, storage rules, migrations, and backfills: NO.

Gate A: Semantic Reviewer OFF, Autonomous OFF; verify versions, Pass 1 behavior, authority, tag-inert behavior, and Pass 1 cost.

Gate B: manual text-only Pass 2; verify semantic cases, objective/patch/authority guards, one-call maximum, Pass 2 cost, combined cost, and no Tag Rerank cost.

Gate C requires a separate owner authorization to temporarily enable `semanticReviewerEnabled=true`; process a small sample, verify provenance/WAA, then disable immediately. This review does not authorize Gate C.

Record Function revisions, deployment success, frozen SHA, Studio SHA, exact AI tokens/costs, and canary outputs. Roll back by disabling the setting or redeploying the prior SHA; do not restore retired Tag Rerank.

No deploy, production, Autonomous, Semantic Reviewer enablement, or WS6 action is authorized by this review.
