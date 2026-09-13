# Two-Pass AI Enrichment Playground — Integrated Pass 2 UX Corrective Plan

**Date:** 2026-09-06  
**Parent workstream:** `two-pass-ai-enrichment-context-and-semantic-verification-implementation`  
**Parent goal:** `smart-catalog-intelligence-completion-and-legacy-tag-retirement`  
**Environment:** DEV/local Studio planning only  
**Status:** Implemented and validated under separate owner authorization; stopped before DEV deployment  
**Production:** Not authorized

## Goal

Rework the existing AI Enrichment Playground into one continuous two-stage owner workflow:

```text
Pass 1 setup → successful Pass 1 result → optional Semantic Review → effective result
```

Pass 2 must use the exact successful Pass 1 context already held and displayed by the Playground. The owner must not copy/paste JSON, resend the image, edit the semantic-review payload, or use a competing manual tester.

This is the previously deferred Playground UX corrective. It does not change Pass 1 v39 prompt/schema behavior, semantic authority, eligibility policy, Processing automation, or production behavior.

## Explicit boundaries

This plan does not authorize:

- implementation before a subsequent owner authorization;
- provider calls, Y2, reprocessing, Gate C, or real-image verification;
- `semanticReviewerEnabled=true`, Autonomous, or automatic Processing Pass 2;
- Pass 1 prompt/schema/category/VCP changes;
- VCP truncation or cost-model changes;
- force-running ineligible Pass 2;
- production, Rules, Storage, indexes, migrations, or destructive cleanup;
- a second Playground surface or a new UI framework;
- removal of the existing semantic-review callable/core.

## Repository investigation

### 1. Existing Playground modal

The owner Playground is rendered inline in:

`apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx`

It is the existing `settings-playground-modal` opened by **Open AI Playground**. Pass 1 controls are already present for model selection, prompt editing/insertion, optional image attachment, and `runPlayground()`.

The current result is a separate `settings-playground-result-modal`, also inline in `SettingsPage.tsx`. It shows provider/model, elapsed time, input/output tokens, estimated cost, and formatted canonical output.

### 2. Successful Pass 1 state

`apps/studio/src/renderer/src/features/settings/hooks/useAiEnrichmentPlayground.ts` owns:

- selected vision model;
- prompt;
- selected image;
- running/error state;
- the latest `AiEnrichmentPlaygroundResponse`.

`SettingsPage.tsx` derives `playgroundResultOutputText` from `result.outputText` with `formatAiPlaygroundOutput()` and opens the result modal when `playground.result` becomes non-null.

### 3. Current client-visible Pass 1 response fields

`packages/shared/src/types/ai/aiEnrichmentPlayground.types.ts` currently exposes:

- `elapsedMs`;
- canonical JSON `outputText`;
- `provider`;
- `visionModelId`;
- `version`;
- `promptTokens`;
- `completionTokens`;
- `estimatedCostUsd`;
- optional `traceId`.

The current client does not receive typed title, description, category, `visibleText`, Smart Profile, VCP, blockers, eligibility, or WAA fields. The client must not parse `outputText` to recreate production semantics.

### 4. Existing server-side Pass 1 information

`functions/src/ai/aiEnrichmentPlayground.ts` already has the normalized provider parse in `parsed` and returns canonical output through `toCanonicalSimpleCatalogEnrichmentJson(parsed)`. It also already loads active categories and the Smart Profile vocabulary snapshot.

It does not currently build the production candidate/Smart Profile or automation decision for the Playground response. Those are the smallest missing server-side projections needed for this UX.

### 5. Objective blockers and semantic blockers

They are not currently returned by the Playground callable.

The production-equivalent deterministic decision machinery already exists in:

- `functions/src/ai/smartProfileBuilder.ts`;
- `packages/shared/src/utils/catalogAutomationDecision.ts`, re-exported through `functions/src/ai/automationDecisionShadow.ts`;
- `packages/shared/src/utils/semanticReviewPolicy.ts`;
- `functions/src/ai/aiEnrichmentCandidateCore.ts`.

The production candidate path computes `automationDecision.hardBlockers` and derives eligible semantic blockers from `automationDecision.reasonCodes` using `getSemanticReviewEligibleBlockers()`.

### 6. Existing Pass 2 eligibility

The Playground does not return Pass 2 eligibility.

Production `canRunSemanticReview()` requires an enabled semantic reviewer, no objective blockers, eligible semantic blockers, and a complete VCP. The integrated manual Playground action will preserve the same blocker/VCP/authority gates while remaining an explicit owner-triggered test path. It will not mutate or enable the automatic `semanticReviewerEnabled` setting. The global setting remains visible in the server-side diagnostic projection but does not silently turn on automatic Processing.

The UI states will be:

- **Semantic Review eligible** — eligible semantic blockers exist and VCP is complete; show `Run Semantic Review`.
- **Semantic Review not needed** — no eligible semantic blockers exist; do not show an unexplained disabled action.
- **Semantic Review blocked by objective issue** — objective blockers exist; show the blockers and no force-run action.
- **Semantic Review unavailable** — required VCP/context is absent; fail closed and do not invent a review payload.

### 7. Current `testAiEnrichmentSemanticReviewPlayground` request

The existing shared request is:

```ts
{
  visualContextProfile,
  title,
  description,
  categoryName?,
  originalSmartProfile,
  effectiveSmartProfile,
  blockers,
  visionModelId,
}
```

The callable is exported from `functions/src/index.ts` through `functions/src/testAiEnrichmentSemanticReviewPlayground.ts`, which delegates to `functions/src/ai/semanticReviewPlayground.ts`.

`semanticReviewPlayground.ts` selects the provider from `visionModelId`, builds the existing text-only prompt with `buildSemanticReviewPrompt()`, and calls `callSemanticReviewer()`. The request has no image field and the provider request contains text only.

### 8. Lossless payload construction

The current response cannot construct the request losslessly on the client because the structured parse and production context are discarded before the response is returned. A bounded response DTO extension is required.

The client will receive a server-built immutable `pass1Context` derived from the same normalized `parsed` object that produced `outputText`. The client will map that context to the existing Pass 2 request without reparsing, reconstructing, or using Settings prompt text.

### 9. Smallest bounded Pass 1 response extension

Extend the shared Playground response with a typed `pass1Context` containing only the data required for display and the existing Pass 2 contract:

```ts
pass1Context: {
  normalizedResult: {
    title: string;
    description: string;
    category: string;
    centralSubject: string;
    subjects: string[];
    objects: string[];
    styles: string[];
    themes: string[];
    interests: string[];
    professionsGroups: string[];
    occasions: string[];
    places: string[];
    colors: string[];
    visibleText: string[];
    searchConcepts: string[];
    categoryAlternatives: Array<{ name: string; reason?: string }>;
    categoryGapNote: string;
    visualContextProfile?: VisualContextProfile;
  };
  originalSmartProfile: Record<string, string[]>;
  visualContextProfile?: VisualContextProfile;
  categoryId?: string;
  categoryName?: string;
  blockers: string[];
  objectiveBlockers: string[];
  semanticBlockers: string[];
  pass2Eligibility: "eligible" | "not_needed" | "blocked_by_objective" | "unavailable";
  automationDecision: {
    decision: string;
    reasonCodes: string[];
    hardBlockers: string[];
    softConcerns: string[];
    wouldAutoApprove: boolean;
    shouldPublishReady: boolean;
  };
  semanticReviewerEnabled: boolean;
}
```

Exact property names may be normalized during implementation, but the response must remain bounded, omit image bytes and secrets, and be generated from the server’s canonical normalized parse and deterministic decision functions.

The response must not expose retired Tag Rerank/Suggestion Author fields or costs.

### 10. Current standalone model behavior

`apps/studio/src/renderer/src/features/settings/components/SemanticReviewPlaygroundPanel.tsx` has no visible provider/model selector. It accepts raw JSON and passes the caller-supplied `visionModelId` to the callable. The current UI therefore does not provide safe model selection.

The integrated flow will use the established `semanticReviewerModelId` setting path. The client-side settings snapshot currently drops that Firestore field, so the read-only settings service/hook projection will be extended to expose the already-existing allowed model value. No Settings control or mutation is added. The Pass 1 model selector remains independent from the configured Semantic Reviewer model.

### 11. Current Pass 2 token/cost fields

`AiEnrichmentSemanticReviewPlaygroundResponse` already returns:

- `promptTokens`;
- `completionTokens`;
- `estimatedCostUsd`;
- `provider`;
- `model`;
- `promptVersion`;
- parsed `result` with decision, reason, resolved/unresolved blockers, and validated patches.

No new provider pricing logic is required.

### 12. Current final WAA/effective profile fields

The standalone Pass 2 response does not return an effective Smart Profile or final deterministic WAA preview. `semanticReviewPlayground.ts` currently returns the provider result only.

The smallest bounded Pass 2 response extension will add:

- `originalSmartProfile` echo or client-held original context reference;
- `effectiveSmartProfile` after validated allowed patches;
- final deterministic automation/WAA preview from `computeCatalogAutomationDecision()`;
- final objective/semantic blocker projection used for display.

The server will load current catalog workflow settings for a read-only preview. It will not persist designs or change the settings flag. Objective blockers and protected fields remain authoritative.

### 13. Pass 1 state invalidation

The Pass 2 state will be bound to the current successful Pass 1 `traceId`/run identity and cleared before any new Pass 1 attempt. It will also be cleared when the owner changes:

- image;
- Pass 1 prompt;
- Pass 1 provider/model;
- any other locally represented Pass 1 input.

The displayed Pass 1 result and Pass 2 result will not survive a new input fingerprint. A new successful Pass 1 response creates a new immutable context. External category/settings changes are represented by the next server-run context; the client never applies an old Pass 2 result to a new trace.

### 14. Implementation and deployment inventory

Expected implementation files:

- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx` — remove standalone panel and integrate staged result/action UI into the existing Playground result surface.
- `apps/studio/src/renderer/src/features/settings/hooks/useAiEnrichmentPlayground.ts` — invalidate result state on input changes and bind Pass 2 state to the current Pass 1 run.
- **New:** `apps/studio/src/renderer/src/features/settings/hooks/useAiEnrichmentSemanticReviewPlayground.ts` — own one-attempt Pass 2 state and service invocation.
- `apps/studio/src/renderer/src/features/settings/components/SemanticReviewPlaygroundPanel.tsx` — remove the incorrect normal-owner raw textarea surface after its use is removed.
- `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentSemanticReviewPlaygroundService.ts` — reuse; only adjust the typed request if the bounded contract extension requires it.
- `apps/studio/src/renderer/src/features/settings/hooks/useAiEnrichmentSettings.ts` — expose the existing semantic-review model read-only.
- `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentSettingsService.ts` — map the existing semantic-review model field read-only.
- `packages/shared/src/types/ai/aiEnrichmentPlayground.types.ts` — add bounded Pass 1/Pass 2 DTO fields.
- `functions/src/ai/aiEnrichmentPlayground.ts` — build Pass 1 context from the normalized parse, Smart Profile builder, and deterministic decision.
- `functions/src/ai/semanticReviewPlayground.ts` — apply only validated patches to a copy and return effective profile/final WAA preview.
- `functions/src/testAiEnrichmentPlayground.ts` and `functions/src/testAiEnrichmentSemanticReviewPlayground.ts` — retain callable auth boundaries and validate the extended DTOs if needed.
- `apps/studio/src/renderer/src/styles/components/settings.css` — add integrated staged-result styling using existing Studio tokens.

Expected focused tests:

- `functions/src/ai/aiEnrichmentPlayground.test.ts` — Pass 1 context projection, required fields, blocker/eligibility projection, and no image bytes in returned DTO.
- **New:** `functions/src/ai/semanticReviewPlayground.test.ts` — exact request mapping, text-only behavior, patch application, protected-field rejection, objective-blocker authority, and final WAA projection.
- `functions/src/ai/semanticReviewCore.test.ts` — retain and extend only where the DTO mapping needs coverage.
- **New:** `apps/studio/src/renderer/src/features/settings/utils/aiPlaygroundPass2Flow.test.ts` — pure client state/payload mapping, hidden-before-success, eligibility states, one-call guard, cost arithmetic, and invalidation.
- **New or source-contract test:** `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.playgroundPass2.contract.test.ts` — no standalone textarea/panel, staged action labels, no image in Pass 2 mapping, and result sections.
- Existing `apps/studio/src/renderer/src/features/settings/utils/aiPlaygroundOutputFormatter.test.ts` remains unchanged unless the result renderer needs a pure formatting helper.

The repository has no React Testing Library/jsdom harness. UI behavior tests should therefore use pure flow helpers and source-contract assertions consistent with existing Studio tests; no new test framework is introduced.

Future DEV deployment inventory, after a separate owner authorization, is limited to:

- `testAiEnrichmentPlayground`;
- `testAiEnrichmentSemanticReviewPlayground`;
- the reviewed DEV/local Studio build or package containing the integrated UI.

`enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, Rules, Storage, indexes, Settings mutation, migrations, and production are not in this corrective’s deployment inventory.

## Proposed implementation behavior

### Pass 1

Keep all existing Pass 1 controls and callable behavior. After the server returns successfully:

1. Display the existing canonical response output.
2. Display typed title, description, category, visible text, Smart Profile, VCP, blockers, deterministic automation/WAA preview, provider/model, elapsed time, token counts, and Pass 1 cost from `pass1Context`/response.
3. Keep the exact returned context immutable in Playground state.
4. Do not show Pass 2 controls until this successful result exists.

### Pass 2 action

The integrated section appears after the Pass 1 result and visually follows:

```text
Pass 1 result
↓
Semantic Review eligibility
↓
Run Semantic Review
```

For eligible results, the action maps the exact current context to the existing request shape:

- VCP from the returned Pass 1 context;
- title/description/category from the same normalized Pass 1 context;
- original Smart Profile from the same server-built context;
- effective Smart Profile initialized as a deep copy of the original;
- full Pass 1 blocker/reason-code set;
- configured semantic-review model from the existing settings path;
- no image field and no image bytes.

The client sets `pass2Attempted` before calling the service. After either success or failure, the normal action is not available again for that Pass 1 run. A new Pass 1 result is the only reset path.

### Pass 2 result

Display:

- decision and reason;
- resolved and unresolved blockers;
- canonical validated patches;
- original Smart Profile;
- effective Smart Profile;
- final deterministic blocker/WAA preview;
- provider/model and prompt version;
- Pass 2 input/output tokens and cost;
- `Combined cost = Pass 1 cost + Pass 2 cost`.

If Pass 2 fails, preserve the failure in the current Playground result, show no fabricated effective result, and do not silently retry.

### Standalone UI retirement

Remove the normal-owner `Manual Pass 2 Semantic Review` section, textarea, paste instructions, and standalone button from the Settings page. Reuse the callable/core through the integrated flow. Do not remove the callable or semantic core.

## Security and authority

- Pass 2 remains owner/admin callable-gated by the existing callable.
- No image is accepted by the Pass 2 request or sent to the provider.
- No provider credentials, raw secrets, or image data enter the shared DTO.
- Original Pass 1 context remains immutable in client state and is copied before patch application.
- `validateSemanticReviewPatches()` remains the patch authority.
- Title, description, category, visible text, colors, and staff-owned dimensions remain unpatchable.
- Objective blockers cannot be cleared by a semantic result; final deterministic WAA is recomputed server-side.
- No Firestore design write or catalog mutation occurs in Playground.
- `semanticReviewerEnabled` remains OFF for automatic Processing; this UX does not change it.
- Autonomous remains OFF and production remains untouched.

## Risks and mitigations

| Risk                                                   | Mitigation                                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Client reconstructs a different Pass 2 payload         | Server returns a bounded typed Pass 1 context from the same normalized parse used for output; client maps that context only. |
| Pass 2 result attaches to a newer Pass 1 run           | Bind state to the Pass 1 trace/run identity and clear on every Pass 1 input change or rerun.                                 |
| Repeated button clicks spend multiple calls            | Set one-attempt state before invocation and permanently disable the action for that displayed run.                           |
| Semantic Review appears to override objective blockers | Return/recompute deterministic hard blockers and final WAA server-side; never provide a force-run path.                      |
| Settings model and Pass 1 model are conflated          | Expose the existing semantic-review model setting read-only; keep it separate from the Playground vision model selector.     |
| Large response makes the Playground unreadable         | Use staged cards, existing Studio spacing/tokens, bounded JSON sections, and vertical-only wrapping/scrolling.               |
| Accidental automatic Processing enablement             | No Settings writes, no `semanticReviewerEnabled` changes, and no Processing integration in this corrective.                  |

## Validation contract

Implementation validation must include the focused Functions/shared/Studio tests listed above, Functions build if backend DTOs change, Studio typecheck with existing unrelated baseline exceptions documented, formatting, and `git diff --check`. No provider or Firebase callable invocation is part of implementation validation.

## Human checkpoint

This artifact stops at Plan + Formal Review. A later implementation turn requires the exact owner authorization phrase recorded in the Formal Review and must not deploy until implementation review and DEV deployment authorization are separately complete.
