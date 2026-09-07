# Implementation Review — Integrated Playground Pass 2 QA Runtime Corrective

**Date:** 2026-09-06  
**Plan:** `docs/workflow/plans/2026-09-06-integrated-playground-pass2-qa-runtime-corrective-plan.md`  
**Formal Review:** this document supersedes the plan-only disposition after owner authorization  
**Parent workstream:** `two-pass-ai-enrichment-context-and-semantic-verification-implementation`  
**Environment:** `fresh-prints-dev`  
**Production:** untouched  
**Owner authorization:** `AUTHORIZE IMPLEMENTATION OF REVIEWED PASS 2 QA CORRECTIVES`  
**Deployment:** authorized DEV deployment completed; owner evidence-bearing QA pending

## Verdict

**IMPLEMENTATION COMPLETE — SCOPED VALIDATION COMPLETE — DEV DEPLOYMENT COMPLETE — OWNER QA PENDING**

The three approved corrective slices are implemented and validated locally:

1. optional bounded VCP evidence parity and stale/no-op semantic patch rejection;
2. correlated Pass 2 trace lifecycle and sanitized provider/parser diagnostics; and
3. distinct Playground/semantic-review callable and Studio error classification.

The prior owner QA disposition remains **FAIL WITH STRONG POSITIVE RESULTS** until an evidence-bearing DEV retest is completed. The authorized DEV deployment is recorded in Section 7. No provider or Firebase callable was invoked by Codex, and no Y2, Gate C, WS6, Semantic Reviewer, Autonomous, or production action was performed.

Required next marker:

`[NEEDS OWNER QA: PASS 2 CORRECTIVES + EVIDENCE-BEARING RETEST]`

## 1. Implemented behavior

### A — VCP evidence parity and patch authority

- `StructuredVisualEvidence` is an optional, bounded input to the shared evidence helper and decision path.
- Only structured VCP lists are added to the relevant evidence corpus: people/characters and animals for subject support, and objects for object support. Free-form VCP prose is not treated as a keyword corpus.
- Omitting VCP preserves the prior text-only behavior. Active Processing callers do not receive an implicit new default.
- Integrated Playground eligibility and post-Pass-2 deterministic recomputation use the same VCP input.
- `validateSemanticReviewPatches` now rejects malformed objects, unsupported/protected fields, non-string values, missing current fields, stale `from` values, and canonical no-ops. List comparison is case/order/punctuation/plural tolerant through the existing Smart Profile canonicalization utilities.
- Accepted patches are normalized before application. The original Smart Profile remains immutable, the effective profile is separate, and final deterministic WAA/automation authority is recomputed after patching.
- Objective blockers remain non-overridable. `NEEDS_REVIEW` and unresolved semantic blockers remain fail-closed.

### B — Pass 2 trace and provider/parser diagnostics

- Pass 2 accepts the Pass 1 trace ID and writes a new `PLAYGROUND` trace with `parentTraceId` and `pass1TraceId` correlation.
- Existing trace storage and redaction are reused. Stages include the applicable `created`, `prompt_ready`, `request_sent`, `provider_response`, `provider_error`, `parsed`, `semantic_review`, `complete`, and `failed` lifecycle events.
- Pass 2 trace metadata records provider, model, semantic prompt version, text-only request metadata, zero image count, response shape, finish reason, token usage, cost, input/output profiles, decisions, and final authority results.
- Provider and parser failures are categorized as `provider_upstream_failure`, `response_extraction_failure`, `malformed_json`, `semantic_result_validation_failure`, `patch_validation_failure`, `business_precondition`, `timeout_network`, or `unknown_internal`.
- Successful provider diagnostics are labeled `success`; they are not mislabeled as a validation failure.
- Provider-error stages are emitted only for provider/transport failures. Parser and business-precondition failures remain visibly classified in the failed trace without falsely claiming that a provider request failed.
- Full raw provider payload capture is owner-gated at the callable and still passes through the existing redacting serializer. The callable response exposes only the typed public result; internal raw provider payloads and diagnostics are not spread to the client.
- Pass 2 remains text-only, makes no additional diagnostic AI call, sends no image URL/bytes/content, uses the existing provider/model/retry contract, and preserves fail-closed behavior.

The exact live malformed-response root cause cannot be assigned from the previously supplied evidence because no failing provider response body or correlating trace was available. It remains explicitly unresolved:

`MALFORMED RESPONSE ROOT CAUSE: STILL UNCLASSIFIED PENDING EVIDENCE-BEARING OWNER QA`

No speculative provider-response variant was added.

### C — Callable and Studio error boundaries

- Playground provider, timeout/network, empty-output, validation, and unknown errors now cross the callable boundary through bounded categories rather than a blanket raw wrapper.
- Semantic Review provider, extraction, malformed JSON, semantic-result validation, patch-validation, business-precondition, timeout/network, and unknown-internal failures map to distinct callable codes/details and safe messages.
- The Studio mapper reserves deployment-unavailable copy for actual `functions/unavailable` and `functions/not-found` errors.
- An ACTIVE callable with an upstream/provider/parser failure no longer presents the deployment-unavailable message.
- Provider internals, raw response text, credentials, and secrets are not exposed in the Studio error surface.

## 2. Source inventory

### Functions

- `functions/src/ai/aiEnrichmentPlayground.ts`
- `functions/src/ai/playgroundErrorMapping.ts`
- `functions/src/ai/semanticReviewCore.ts`
- `functions/src/ai/semanticReviewErrors.ts`
- `functions/src/ai/semanticReviewErrorMapping.ts`
- `functions/src/ai/semanticReviewPlayground.ts`
- `functions/src/ai/semanticReviewProvider.ts`
- `functions/src/lib/errors.ts`
- `functions/src/testAiEnrichmentPlayground.ts`
- `functions/src/testAiEnrichmentSemanticReviewPlayground.ts`

### Shared

- `packages/shared/src/types/ai/aiEnrichmentPlayground.types.ts`
- `packages/shared/src/types/ai/aiEnrichmentTrace.types.ts`
- `packages/shared/src/utils/aiEnrichmentTrace.ts`
- `packages/shared/src/utils/catalogAutomationDecision.ts`
- `packages/shared/src/utils/catalogAutomationEvidence.ts`
- `packages/shared/src/utils/semanticReviewPolicy.ts`

### Studio

- `apps/studio/src/renderer/src/features/settings/hooks/useAiEnrichmentSemanticReviewPlayground.ts`
- `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentPlaygroundService.ts`
- `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentSemanticReviewPlaygroundService.ts`
- `apps/studio/src/renderer/src/features/settings/utils/aiEnrichmentCallableError.ts`
- `apps/studio/src/renderer/src/features/settings/utils/aiPlaygroundPass2Flow.ts`

### Added/updated tests

- `functions/src/ai/semanticReviewCore.test.ts`
- `functions/src/ai/semanticReviewErrorMapping.test.ts`
- `functions/src/ai/semanticReviewErrors.test.ts`
- `functions/src/ai/semanticReviewPlayground.test.ts`
- `functions/src/ai/semanticReviewProvider.test.ts`
- `packages/shared/src/utils/aiEnrichmentTrace.test.ts`
- `packages/shared/src/utils/catalogAutomationDecision.test.ts`
- `packages/shared/src/utils/semanticReviewPolicy.test.ts`
- `apps/studio/src/renderer/src/features/settings/utils/aiEnrichmentCallableError.test.ts`
- `apps/studio/src/renderer/src/features/settings/utils/aiPlaygroundPass2Flow.test.ts`

## 3. Required contract verification

| Contract | Result |
| --- | --- |
| Optional VCP evidence parity | PASS — bounded structured VCP lists are used identically before and after Pass 2; omitted VCP retains text-only behavior |
| Unsupported-object evidence remains blocked | PASS |
| Stale `from` patch rejection | PASS |
| Canonical no-op patch rejection, including order-insensitive lists | PASS |
| Meaningful patch application and immutable original profile | PASS |
| Protected/staff-owned field rejection | PASS |
| Objective blocker non-override | PASS |
| Pass 2 one-call/text-only contract coverage | PASS in focused contract tests; no runtime provider invocation performed here |
| Pass 2 trace correlation/lifecycle/cost contract | PASS |
| Malformed/provider/parser fail-closed trace contract | PASS in provider/trace unit fixtures; live malformed root cause remains unclassified pending owner QA |
| Callable unavailable/provider/parser distinction | PASS |
| Raw provider/secrets excluded from callable response and bounded traces | PASS |

## 4. Validation evidence

All commands below were run from the checked-in working tree after the corrective implementation, including the final trace-label/type fix.

### Passing scoped checks

- Functions AI test sweep: **400 passed, 0 failed, 72 suites**.
- Functions corrective focus (`semanticReviewErrorMapping`, `semanticReviewProvider`, `semanticReviewCore`, `semanticReviewPlayground`): **24 passed, 0 failed, 4 suites**.
- Functions build/typecheck: **PASS** (`npm run build` from `functions`).
- Shared AI/decision/profile/trace test sweep: **126 passed, 0 failed, 24 suites**.
- Studio Settings test sweep: **27 passed, 0 failed, 8 suites**.
- Targeted ESLint over changed Functions/shared/Studio source and tests: **PASS**.
- `git diff --check`: **PASS**. Only normal Git LF/CRLF working-copy warnings were emitted.

### Broader Studio result

The Studio typecheck and `npm run build` reach TypeScript and fail with **33 diagnostics**. The build therefore is not called PASS, and Vite/electron packaging does not run. The exact diagnostics are:

**ACCEPTED PRE-EXISTING VALIDATION EXCEPTION**

1. `apps/studio/electron/ipc/import/pngValidator.ts:289:5` — TS2322, `PersistedArtworkUpscalePassCount` is not assignable to `0 | 1 | undefined`.
2. `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts:127:7,143:7,176:7,209:7` — TS2322, fixture map entries lack the required `printWidthInches` and `printHeightInches` fields for `GroupedResizedImage`.
3. `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts:533:28,534:43` — TS18047, `design` is possibly `null`.
4. `apps/studio/src/renderer/src/features/designs/utils/companionSetHelpers.ts:96:4` — TS2304, `CompanionSetStatusLabel` cannot be found.
5. `apps/studio/src/renderer/src/features/print-requests/services/enhancePrintRequestArtworkService.ts:14:39` and `setPrintRequestItemArtworkEnhanceModeService.ts:17:50` — TS2353, `feature` is not a property of `FirestoreTraceMetadata`.
6. `apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx:160:30` — TS6133, `current` is declared but never read.
7. `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxAlertDeliveryService.ts:2:3` — TS6133, `deleteDoc` is declared but never read.
8. `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSuppressionService.ts:5:3` — TS6133, `setDoc` is declared but never read.
9. `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx:123:3` — TS6133, `formatStaffGangSheetTitle` is declared but never read.
10. `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts:7:3` — TS6133, `DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES` is declared but never read.
11. `packages/shared/src/utils/customerUploadTransparency.test.ts:8:3` — TS6133, `CUSTOMER_UPLOAD_FULL_BLEED_MAX_OPAQUE_BBOX_RATIO` is declared but never read.
12. `packages/shared/src/utils/explicitContentAutomation.test.ts:222:7,236:9,246:7,256:7,266:9` — TS2322, readonly fixture arrays are incompatible with mutable `string[]` fields in `ExplicitContentAutomationClassifyResult`.
13. `packages/shared/src/utils/manualArtworkEnhance.test.ts:10:1` — TS6133, `resolveInitialPrintRequestItemSize` is declared but never read.
14. `packages/shared/src/utils/printRequestItemSource.test.ts:55:17` — TS2353, `designId` is not a property of the fixture type.
15. `packages/shared/src/utils/showProductionRecovery.test.ts:162:62` — TS2345, `null` is not assignable to `ShowCapacityResult`.
16. `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:71:5,287:9,312:7,326:7,330:7,344:7,600:7,650:9,678:9` — TS2739, partial timestamp fixtures lack `Timestamp.seconds`, `nanoseconds`, `isEqual`, and `toJSON`.

### Baseline and non-causality proof

The owner-authorized baseline for this exception decision is:

`5712b51d0f0b867652e7f3e5ea0f22c620cebc1e`

The prior validation-exception record already documented the same unrelated Studio/print-request/export/companion-set/shared legacy diagnostics at that checkpoint. A mechanical source comparison was also performed:

- none of the corrective implementation source or test files listed in Section 2 is one of the exception files above;
- the `useAiReviewInbox` nullable-design diagnostic remains in its prior unrelated feature and only moved line numbers after earlier tag-retirement work;
- the `UpcomingShowsPage` unused-import diagnostic is unrelated and the current import usage changed after the recorded checkpoint due earlier non-corrective work, so it is not falsely claimed as byte-identical at `5712b51`. It remains accepted under the owner’s Option 1 decision and was not repaired in this workstream;
- the remaining listed diagnostics are in files outside the corrective source inventory and match the previously recorded baseline exception set.

No current corrective file can cause these diagnostics through its imports or changed declarations. The changed-file Studio typecheck review produced no AI-enrichment errors. These exceptions are therefore accepted as pre-existing/out-of-scope and are not a full-suite PASS.

## 5. Safety and deployment disposition

- No Gemini, OpenAI, Luna, or other live provider was invoked.
- No Firebase callable was invoked.
- No test was run with live DEV trace streaming or Firestore as part of this implementation validation.
- No provider/model/schema/prompt/retry contract was changed.
- No v39 Pass 1 prompt/schema/VCP dimension/Smart Profile dimension was changed.
- Semantic Reviewer automatic execution remains OFF.
- Autonomous remains OFF/shadow.
- No unapproved deployment, Y2, Gate C, WS6, production, settings mutation, catalog mutation, commit, or push was performed.

The authorized DEV deployment is complete for the exact two reviewed callable targets. The next owner-controlled action is evidence-bearing QA of the three corrected defects; this document does not authorize any additional deployment or production action.

## 6. Final checkpoint

Implementation, scoped validation, and the authorized two-function DEV deployment are complete. Owner QA must retest the real DEV provider path before this corrective can be considered behaviorally signed off. In particular, the malformed-response cause is intentionally not claimed resolved without a captured failing response/trace.

`[NEEDS OWNER QA: PASS 2 CORRECTIVES + EVIDENCE-BEARING RETEST]`

## 7. DEV deployment amendment

**Authorization:** `OWNER AUTHORIZATION: DEPLOY PASS 2 QA CORRECTIVES + EVIDENCE-BEARING QA`

**Command:** `firebase deploy --only functions:testAiEnrichmentPlayground,functions:testAiEnrichmentSemanticReviewPlayground --project fresh-prints-dev`

The deployment command exceeded the local shell timeout, but read-only post-deployment metadata confirmed that both requested targets advanced and are ACTIVE:

| Function | State | Revision | Firebase source hash | Project | Region | Runtime | Latest traffic |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `testAiEnrichmentPlayground` | ACTIVE | `testaienrichmentplayground-00071-xey` | `ce2ff1e1a61dcdab282b67fd0f460e1c4c3def8b` | `fresh-prints-dev` | `us-central1` | `GEN_2 / nodejs20` | 100% latest |
| `testAiEnrichmentSemanticReviewPlayground` | ACTIVE | `testaienrichmentsemanticreviewplayground-00012-tiy` | `ce2ff1e1a61dcdab282b67fd0f460e1c4c3def8b` | `fresh-prints-dev` | `us-central1` | `GEN_2 / nodejs20` | 100% latest |

The excluded `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, and `testAiEnrichmentTagRerank` Functions remained at their pre-deployment revisions. Firestore/Storage Rules, indexes, migrations, settings, production, and other Functions were not touched. Local DEV Studio was already running from `C:\coding\fresh-prints` at `localhost:5173`; no restart was necessary. No live provider or Firebase callable was invoked by Codex.

Owner evidence-bearing QA remains pending:

`[NEEDS OWNER QA: PASS 2 CORRECTIVES + EVIDENCE-BEARING RETEST]`
