# Formal Review — Integrated Playground Pass 2 Semantic Review UX Corrective

**Date:** 2026-09-06  
**Plan:** `docs/workflow/plans/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-ux-corrective-plan.md`  
**Workstream:** `two-pass-ai-enrichment-context-and-semantic-verification-implementation`  
**Environment:** DEV/local Studio planning only  
**Review phase:** Plan → Formal Review only  
**Implementation status:** Not started  
**Production:** Not authorized

## Verdict

**APPROVED PLAN — READY FOR A SEPARATE OWNER IMPLEMENTATION AUTHORIZATION.**

This review approves the narrow design for integrating the existing text-only Semantic Review callable into the existing AI Enrichment Playground after successful Pass 1. It does not authorize implementation, provider calls, deployment, Settings mutation, Y2, Gate C, Autonomous, or production action.

## Review basis

The review inspected the checked-in Playground hook/service/types, inline Settings Playground/result modals, normalized Pass 1 parser, Smart Profile builder, deterministic catalog automation decision, semantic-review policy/core/provider/callable, client settings mapping, and existing test conventions.

The key finding is that the current Pass 1 response exposes only canonical output text and usage metadata. The server already has the structured parse but discards the typed context before returning. The approved design therefore adds a bounded server-built Pass 1 context DTO and a bounded Pass 2 effective-result/WAA DTO. It does not ask the client to reverse-engineer production behavior from JSON text.

## Required review answers

### 1. Can Playground start with Pass 1 only?

Yes. The existing Playground modal remains the only entry point. Pass 2 controls are rendered only after `playground.result` is a successful result containing a complete `pass1Context`.

### 2. Is the owner copy/paste workflow removed?

Yes. The standalone `Manual Pass 2 Semantic Review` component, raw JSON textarea, paste instructions, and independent Run Pass 2 button are removed from the normal Settings surface. The integrated action maps typed immutable state directly to the existing service/callable.

### 3. Is the exact displayed Pass 1 context used?

Yes. The response DTO is built from the same normalized `parsed` object used by `toCanonicalSimpleCatalogEnrichmentJson(parsed)`. The UI displays that DTO and uses it directly for the Pass 2 request. It does not reparse displayed text, reread Settings prompt text, rerun image analysis, or build a second image payload.

### 4. Does Pass 2 send an image?

No. The existing `AiEnrichmentSemanticReviewPlaygroundRequest` has no image field, `buildSemanticReviewPrompt()` is text-only, and the focused contract test must assert that the outgoing request contains zero image fields/parts.

### 5. How are eligibility and objective blockers represented?

The server computes:

- `objectiveBlockers` from deterministic `automationDecision.hardBlockers`;
- `semanticBlockers` from eligible prefixes in `automationDecision.reasonCodes`;
- VCP completeness from required summary and detailed description;
- a bounded `pass2Eligibility` state.

The integrated manual action is allowed only when there are eligible semantic blockers, no objective blockers, and a complete VCP. No force-run path is added. If automatic `semanticReviewerEnabled` is false, automatic Processing remains off; an explicit owner-triggered Playground review does not mutate that setting.

### 6. Is the existing semantic-review callable/core reused?

Yes. The integrated UI reuses `aiEnrichmentSemanticReviewPlaygroundService`, `testAiEnrichmentSemanticReviewPlayground`, `runAiEnrichmentSemanticReviewPlayground`, `buildSemanticReviewPrompt`, `callSemanticReviewer`, `parseSemanticReviewResult`, and `validateSemanticReviewPatches`. No duplicate provider/core is introduced.

### 7. Does the current model-selection behavior remain safe?

The current standalone UI has no safe visible model selector; it only accepts a raw request field. The reviewed design uses the existing configured `semanticReviewerModelId` read-only path for the integrated action. The client settings projection must expose that existing setting without adding a control or write. Pass 1’s selected vision model remains separate.

### 8. Are original and effective Smart Profiles distinct?

Yes. The Pass 1 response supplies an immutable original profile. Pass 2 starts from a copy, applies only validated approved patches, and returns the resulting effective profile. The UI displays both. The server recomputes the final deterministic automation/WAA preview from the effective profile.

### 9. Can Pass 2 override objective blockers or protected fields?

No. Objective blockers remain in the final deterministic decision. Existing patch validation remains the authority and only allows the current semantic patchable dimensions. Title, description, category, visible text, colors, and staff-owned values remain protected.

### 10. Is one-call behavior defined?

Yes for the owner Playground workflow. The hook sets `pass2Attempted` before invocation and disables the action after either success or failure. The state is keyed to the current Pass 1 trace/run identity. Changing image, prompt, model, or rerunning Pass 1 clears the old result and one-attempt state. No automatic retry or API-spam button is introduced.

The current callable is an owner/admin test callable without a Firestore-backed per-session lock. This corrective does not add new infrastructure; the acceptance boundary is the integrated owner UI’s one-attempt behavior, covered by pure flow tests. If a future requirement demands server-enforced cross-client quota semantics, that must be a separately reviewed scope change.

### 11. Are costs visible without changing pricing?

Yes. Existing Pass 1 and Pass 2 token/cost fields are displayed separately. The UI computes and displays `Combined cost = Pass 1 estimated cost + Pass 2 estimated cost`, treating unavailable values as `N/A` rather than inventing zero. No Tag Rerank, Suggestion Author, or retired AI cost fields are shown. Provider pricing helpers remain unchanged.

### 12. Does the result show enough semantic-review evidence?

Yes. The integrated result includes decision, reason, resolved/unresolved blockers, canonical patches, original Smart Profile, effective Smart Profile, final blockers/WAA preview, provider/model, prompt version, token usage, Pass 2 cost, and combined cost. A failed call remains visible as a failure and is not converted into a fabricated effective result.

### 13. Does this change automatic Processing or production authority?

No. The implementation is Playground-only. It does not set `semanticReviewerEnabled`, does not modify Processing invocation, does not write designs, does not enable Autonomous, does not start Gate C or WS6, and does not touch production.

### 14. Is the bounded DTO extension justified?

Yes. Without it, the client cannot losslessly obtain the normalized VCP, Smart Profile, category authority, blockers, eligibility, or WAA inputs that already exist or can be deterministically derived on the server. Reconstructing those values from `outputText` would risk divergence from production. The extension is read-only, bounded, excludes image bytes/secrets, and is used only for the displayed Playground experiment.

## Acceptance mapping

| Acceptance requirement   | Reviewed design evidence                                                 |
| ------------------------ | ------------------------------------------------------------------------ |
| Pass 1 only at start     | Existing modal; Pass 2 conditional on successful result                  |
| Pass 1 remains visible   | Existing output retained; staged sections added below                    |
| Eligibility is clear     | Server-projected eligible/not-needed/objective-blocked/unavailable state |
| No copy/paste            | No textarea; typed context mapping                                       |
| Exact context            | Same server normalized parse as displayed output                         |
| Zero images in Pass 2    | Existing text-only request/core and contract test                        |
| One call                 | Pre-call attempt guard, run identity, no retry button                    |
| Immutable original       | Client-held original copy and server-side patch copy                     |
| Authority protection     | Existing patch validation plus deterministic final WAA recomputation     |
| Cost visibility          | Existing token/cost fields plus combined arithmetic                      |
| State invalidation       | Input setters/rerun clear result and Pass 2 state                        |
| Standalone UI retired    | Remove `SemanticReviewPlaygroundPanel` rendering/file                    |
| Existing callable reused | Service/core/callable unchanged in role                                  |
| No automatic Processing  | No Settings write and no Processing integration                          |
| No production action     | Plan explicitly excludes it                                              |

## Validation review

The implementation phase must run the focused Functions/shared/Studio checks from the Plan, including DTO mapping, exact Pass 2 payload, no-image behavior, eligibility, one-call guard, state reset, cost arithmetic, result rendering contracts, semantic authority regressions, Functions build if backend code changes, formatting, and `git diff --check`.

The repository has no React Testing Library/jsdom harness. Pure flow utilities and source-contract assertions are the appropriate existing validation pattern; introducing a new UI test framework is not approved by this review.

No provider invocation or Firebase callable invocation is allowed during Plan/Review or ordinary implementation validation.

## Reviewed deployment inventory for a future separately authorized DEV deployment

Only after implementation review and separate DEV authorization:

- `testAiEnrichmentPlayground`;
- `testAiEnrichmentSemanticReviewPlayground`;
- the reviewed DEV/local Studio application build or package.

No `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, Rules, Storage, indexes, migrations, Settings mutation, Autonomous, Gate C, WS6, or production deployment is part of this corrective.

## Owner authorization phrase for the next phase

`OWNER IMPLEMENTATION AUTHORIZATION: Proceed with the reviewed integrated Playground Pass 2 semantic-review UX corrective.`

Until that phrase is explicitly authorized in a later workflow turn, stop at this Plan/Formal Review checkpoint.
