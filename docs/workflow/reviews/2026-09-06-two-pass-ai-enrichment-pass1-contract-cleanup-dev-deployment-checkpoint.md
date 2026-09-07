# `catalog-enrich-v39` DEV Deployment Checkpoint

**Date:** 2026-09-06 15:34 CDT  
**Environment:** `fresh-prints-dev` only  
**Project:** `fresh-prints-dev`  
**Region:** `us-central1`  
**Branch:** `development`  
**Source checkout:** `C:\coding\fresh-prints`

## Authorization and reviewed inventory

Deployment was authorized against:

- `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-pass1-contract-cleanup-implementation-review.md`
- Owner instruction: `AUTHORIZE DEV DEPLOYMENT + ONE REAL-IMAGE PLAYGROUND V39 VERIFICATION`

Exact deployment command:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'
firebase deploy --project fresh-prints-dev --only functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:reprocessReadyDesignWithAi
```

Firebase reported **3 Functions Deployed**, **0 Functions Errored**, and **0 Function Deployments Aborted**.

## Deployed Functions

| Function | State | Revision | Firebase source hash | Source object generation |
|---|---|---|---|---:|
| `enqueueAiEnrichment` | `ACTIVE` | `enqueueaienrichment-00113-waw` | `0a3dc09c6b987d91b5332fed5037cad1118d7bf5` | `1788726796084722` |
| `testAiEnrichmentPlayground` | `ACTIVE` | `testaienrichmentplayground-00068-zun` | `0a3dc09c6b987d91b5332fed5037cad1118d7bf5` | `1788726854699915` |
| `reprocessReadyDesignWithAi` | `ACTIVE` | `reprocessreadydesignwithai-00019-yah` | `0a3dc09c6b987d91b5332fed5037cad1118d7bf5` | `1788726854556286` |

The source objects were the per-function `function-source.zip` objects in the managed `gcf-v2-sources-695546728466-us-central1` bucket. All three functions report project `fresh-prints-dev`, region `us-central1`, and state `ACTIVE`.

The explicit `--only` inventory and Firebase deployment result show that no other Function was deployed or modified by this command.

## Deployment boundary verification

| Surface | Result |
|---|---|
| Firestore Rules | **NOT deployed** |
| Storage Rules | **NOT deployed** |
| Firestore indexes | **NOT deployed** |
| Settings mutation | **NOT performed** |
| Migrations | **NONE** |
| Production | **NOT touched** |
| Autonomous | **OFF** |
| Semantic Reviewer | **OFF** |
| Pass 2 | **NOT invoked** |
| Y2/reprocessing | **NOT invoked** |
| Commit/push | **NOT performed** |

## Real-image verification status

The authorized Playground invocation was **not started**. Repository inspection found no mechanically safe checked-in real artwork source. The only image files available in the repository are branding assets and a documentation preview; the existing `aiEnrichmentPlayground.test.ts` image is a tiny test fixture and is not a real artwork verification image. No text-only request, fixture substitution, invented image payload, catalog mutation, upload, or provider call was performed.

Therefore:

- Real image used: **NO — owner image selection required**
- Image count sent: **0** (no Playground invocation)
- Playground invocation count: **0**
- Trace ID: **none**
- Provider/model call: **none**
- v39 response, VCP, visibleText, category, cost, and quality fields: **not yet measured**

## Owner procedure for the one authorized verification

After opening the deployed Fresh Prints Studio DEV build:

1. Open **Settings → AI Enrichment → Playground**.
2. Select the Gemini model `gemini-2.5-flash-lite`.
3. Enter the current v39 enrichment prompt or use the current saved v39 prompt shown by the Playground.
4. Attach exactly one real PNG, JPEG, or WebP artwork image from a safe DEV/local source. Do not use a production asset, customer upload, or the repository test fixture.
5. Confirm the Playground shows one selected image before running.
6. Run the Playground exactly once.
7. In the Inspector, record the generated trace and verify `hasImage=true`, `imageCount=1`, v39 prompt/category expansion, provider success, parsed structured output, VCP `visual-context-v1`, canonical `visibleText`, and no Tag AI/AI-halftone fields.

Do not retry, run text-only, run Pass 2, enable Semantic Reviewer or Autonomous, run Y2, reprocess a design, change Settings, or use production. If the one run fails, preserve the trace and stop for evidence review.

## Owner-requested Studio UI polish

The local Studio source now places the **Inspector** sub-tab last in the AI Enrichment tab list. This source-only UI change is in `SettingsPage.tsx`; the current deployment authorization covered only the three Functions above, so no Studio package/hosting deployment was performed.

## Post-deployment corrective discovered before real-image QA

Owner QA identified that the Playground's existing **Use prompt** button could insert a persisted pre-v39 stock prompt variant. The exact source path is:

`SettingsPage.tsx` → `useAiEnrichmentSettings()` → `aiEnrichmentSettingsService.mapSettingsSnapshot()` → shared `resolveAiEnrichmentPromptTemplate()` → `playground.setPrompt(selectedPromptTemplate)`.

The stale value was not recognized by the prior historical-stock list, so it was preserved as if it were a custom prompt. The corrective adds the exact observed legacy stock variant to the shared read-only reconciliation list. Genuine custom prompts remain unchanged and the blank-before-button UX remains unchanged.

Focused validation passed after the corrective:

- 23 shared/Studio/Functions prompt-settings tests passed.
- 16 Functions prompt-contract/parity tests passed.
- Functions build passed.
- Changed-file Prettier check passed.
- `git diff --check` passed.
- Studio typecheck still reports exactly the previously documented 33 unrelated baseline errors; no error references the changed prompt constants or Settings path.

Because the corrective changes shared source used by the Functions runtime, the current deployed Functions are not yet at this corrective source. The exact redeployment inventory required before the real-image gate is:

- `enqueueAiEnrichment`
- `testAiEnrichmentPlayground`
- `reprocessReadyDesignWithAi`

No redeployment was performed under this corrective. The real-image Playground invocation count remains `0`, and no provider call was made.

## Checkpoint status

**DEPLOYMENT CHECKPOINT PRESERVED; SHARED PROMPT CORRECTIVE VALIDATED LOCALLY; DEV REDEPLOYMENT REQUIRED BEFORE REAL-IMAGE PLAYGROUND VERIFICATION.**

The prior authorization-pending marker is superseded by the completed corrective redeployment recorded below.

## Corrective DEV redeployment completed

Owner authorization was received for the exact three-Function redeployment. The deployment command used the approved inventory only:

```text
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'; firebase deploy --project fresh-prints-dev --only functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:reprocessReadyDesignWithAi
```

Read-only post-deployment verification confirmed the rollout completed in `fresh-prints-dev`, region `us-central1`:

| Function | State | Revision | Firebase source hash |
|---|---|---|---|
| `enqueueAiEnrichment` | `ACTIVE` | `enqueueaienrichment-00114-xab` | `e65080ba30b00bdd18ce99cc9ed052691fe5d057` |
| `testAiEnrichmentPlayground` | `ACTIVE` | `testaienrichmentplayground-00069-jep` | `e65080ba30b00bdd18ce99cc9ed052691fe5d057` |
| `reprocessReadyDesignWithAi` | `ACTIVE` | `reprocessreadydesignwithai-00020-cax` | `e65080ba30b00bdd18ce99cc9ed052691fe5d057` |

The local deployment command reached the tool timeout before Firebase printed its final summary; no second deployment was started. The three remote `gcloud functions describe` results above are the authoritative completion evidence.

Deployment boundary remains unchanged: no Rules, Storage Rules, indexes, Settings mutation, migration, production surface, or other Function was deployed. No Function was invoked; no Playground request, provider call, Y2/reprocessing run, Pass 2 run, Semantic Reviewer, or Autonomous execution occurred. No commit or push was performed. Real-image invocation count remains `0`.

## Owner manual verification gate

Before any real-image Playground run, the owner must open DEV Studio → **Settings → AI Enrichment → Playground**, leave the prompt blank initially, and click the existing **Use prompt** button. Confirm the inserted prompt:

- begins with `Analyze the attached artwork as printable graphic artwork for our DTF design catalog.`
- contains `Approved categories:` followed by `{{approved_categories}}`
- contains the current visualContextProfile guidance
- does not contain `Return tags as []`, `"tags":[]`, `suggestedNewTags`, `preferredWhen`, `readableTextLines`, `halftoneShadowLikelihood`, `halftoneShadowEvidence`, or `Return exactly this JSON and nothing else`

Do not run the provider if any stale text appears. The real-image Playground gate remains pending owner review.

**Checkpoint status:** Corrective DEV redeployment complete; all three reviewed Functions are ACTIVE; owner button verification pending.

`[NEEDS OWNER REVIEW: CLICK USE PROMPT AND CONFIRM V39 BEFORE REAL-IMAGE PLAYGROUND RUN]`
