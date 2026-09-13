# Implementation Review — Pass 2 Input-State Consistency and Playground Request Observability Corrective

**Date:** 2026-09-07  
**Workstream:** `ai-enrichment-inspector-and-live-trace-viewer`  
**Environment:** Local validation only; no deployment performed  
**Plan:** `docs/workflow/plans/2026-09-07-pass2-input-state-consistency-and-playground-request-observability-corrective-plan.md`  
**Formal Review:** `docs/workflow/reviews/2026-09-07-pass2-input-state-consistency-and-playground-request-observability-corrective-review.md`  
**Owner authorization:** Received for implementation in the owner Pass 2 input-state consistency and Playground request-observability corrective prompt

## Verdict

**IMPLEMENTED AND LOCALLY VALIDATED.** The approved observability-only
corrective is complete. It has not been deployed. The historical
`musicians` no-op root cause remains unclassified; this implementation makes a
subsequent controlled DEV retest evidence-bearing without changing the
business behavior that produced the no-op.

## Approved scope completed

### Canonical Pass 2 diagnostics

The shared `AiEnrichmentTrace` model now supports bounded
`pass2Diagnostics` with four explicit boundary sections:

1. `semanticReviewInput` captures the title, description, category, original
   and effective Smart Profiles, VCP, blocker sets, Pass 2 eligibility, and
   the server eligibility summary.
2. `renderedPrompt` captures the exact prompt version, system message, and
   rendered user message used by the existing prompt builder.
3. `providerRequest` captures the actual request body produced by the shared
   provider request builder immediately before dispatch: model,
   `max_completion_tokens`, response format, and messages.
4. `patchValidationInput` captures the current Smart Profile, raw provider
   patch, parsed patch, canonical `from`/`to`, validation result, and reason.

The Playground runtime records the initial input and prompt before eligibility
short-circuits, snapshots the exact built provider body before the network
call, and records the parser/validator snapshot when validation is reached.
When a failure occurs, downstream parser/VCP/candidate/persistence states stay
truthful and are represented as `NOT REACHED` where applicable.

The provider callback receives a `structuredClone` and is fail-soft. It cannot
mutate the request or change the enrichment result. The existing prompt,
response schema, provider/model selection, parser acceptance, canonical no-op
rejection, retry behavior, authority/WAA behavior, and business decisions were
not changed.

### Boundedness and safety

The explicit diagnostic projection enforces per-section limits of 32,000
characters per string, 100 array items, 256 object keys, and depth 16. It
emits `_diagnostic.bounded` metadata with explicit truncation and redaction
paths. Credential-like keys, authorization data, API keys, tokens,
credentials, cookies, passwords, raw image values, image bytes, image data
URIs, and image URLs are excluded. No provider headers or secrets are stored.

The existing fail-soft Firestore trace store remains in use. Ordinary tests do
not require Firestore and trace collection adds no AI calls. Automated boundary
tests can use the existing in-memory canonical sink; optional bounded JSON
artifacts use the existing ignored `.tmp/ai-enrichment-traces/` location. No
generated trace artifact exists in the worktree.

### Inspector

The Inspector now presents distinct sections for:

- Semantic Review Input
- Rendered Prompt / Messages
- Provider Request / Response Contract
- Provider Response
- Patch Validation
- Deterministic Result / Decision

It retains clear source and pass labels, preserves mock/fixture source
identity, shows expected/actual/result and Pass 2 input/output, and keeps large
diagnostic cards vertically scrollable without horizontal layout breakage.

### Files changed for this corrective

- `packages/shared/src/types/ai/aiEnrichmentTrace.types.ts`
- `packages/shared/src/utils/aiEnrichmentTrace.ts`
- `packages/shared/src/utils/aiEnrichmentTrace.test.ts`
- `functions/src/ai/semanticReviewCore.ts`
- `functions/src/ai/semanticReviewCore.test.ts`
- `functions/src/ai/semanticReviewProvider.ts`
- `functions/src/ai/semanticReviewProvider.test.ts`
- `functions/src/ai/semanticReviewPlayground.ts`
- `functions/src/ai/semanticReviewPlayground.test.ts`
- `functions/src/ai/semanticReviewErrors.ts`
- `functions/src/ai/aiEnrichmentTraceArtifacts.test.ts`
- `apps/studio/src/renderer/src/features/settings/components/AiEnrichmentTraceInspector.tsx`
- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.playgroundPass2.contract.test.ts`
- `apps/studio/src/renderer/src/styles/components/settings.css`
- the approved Plan, Formal Review, QA checkpoint amendment, workflow state,
  and current handoff

The worktree also contains earlier authorized AI-enrichment and Inspector
changes. They were preserved and are not silently reclassified by this IR.

## Validation completed

| Scope | Command/result |
| --- | --- |
| Functions build | `npm run build` from `functions/` — **PASS** |
| Functions focused corrective suite | 45 tests, 45 pass, 0 fail — **PASS** |
| Automated trace artifact contract | 1 test, 1 pass, 0 fail — **PASS** |
| Automated mock/fixture live-trace source contract | 1 test, 1 pass, 0 fail — **PASS** |
| Functions complete `src/ai` sweep | 398 tests, 398 pass, 0 fail — **PASS** |
| Shared focused corrective/policy suite | 61 tests, 61 pass, 0 fail — **PASS** |
| Studio focused settings/Playground suite | 14 tests, 14 pass, 0 fail — **PASS** |
| Targeted ESLint | all corrective source/tests — **PASS** |
| Targeted `git diff --check` | corrective paths — **PASS** |
| Studio Vite/electron build | renderer 2,575 modules; electron 533 modules; preload 10 modules — **PASS** |
| Studio full TypeScript check | Fails only with the unrelated errors listed below — **EXCEPTION** |

The full Functions test sweep was run from the repository root, as required by
the contract tests. All grouped directories passed except the root and `lib`
groups, with the exact failures below:

- root group: 118 tests, 116 pass, 2 fail;
- `functions/src/lib`: 277 tests, 275 pass, 2 fail;
- `functions/src/ai`: 398 tests, 398 pass; all other grouped Functions
  directories exited 0.

The full Shared runtime sweep was run in command-line-safe chunks:

- `packages/shared/src/utils`: 1,411 tests, 1,408 pass, 3 fail;
- `packages/shared/src/constants`: 44 tests, 43 pass, 1 fail;
- all other grouped Shared directories exited 0.

These broader failures are explicitly accepted below and were not repaired in
this workstream.

## ACCEPTED PRE-EXISTING VALIDATION EXCEPTION

The owner selected the documented-exception path. The following failures are
unrelated to the approved Pass 2 observability corrective and were present at
the checkpoint baseline `5712b51d0f0b867652e7f3e5ea0f22c620cebc1e`.

### Runtime test failures

- `functions/src/optionalAlgoliaSecretDiscovery.test.ts:58` — default
  Functions index discovery reports `ALGOLIA_ADMIN_API_KEY`.
- `functions/src/showProductionRecovery.contract.test.ts:52` — the source
  does not match the expected `customerHasOtherContinuableRequest` guard
  contract.
- `functions/src/lib/customerUploadDeletionEligibility.test.ts:59` — the
  authoritative CustomerUpload Storage-path manifest contract fails.
- `functions/src/lib/customerUploadValidation.test.ts:32` — the oversized
  declared ZIP test reports “Missing expected exception.”
- `packages/shared/src/constants/firestoreRulesPublicCatalogAlignment.test.ts:10`
  — the rule alignment test reports `upcomingShows must not allow public
  read: if true`.
- `packages/shared/src/utils/printSizeMath.test.ts:212` — the
  aspect-locked 12-inch target expected `null` but received `4500 × 4500`.
- `packages/shared/src/utils/printSizeMath.test.ts:218` — the narrow-image
  target expected `3600 × 4800` but received `3713 × 4950`.
- `packages/shared/src/utils/printSizeMath.test.ts:225` — the 12-inch image
  expected no further upscale but received `4500 × 4500`.

Baseline proof:

- The failing test files and their relevant source files were unchanged from
  checkpoint `5712b51d0f0b867652e7f3e5ea0f22c620cebc1e`, except for the
  previously authorized `functions/src/index.ts` export file.
- The only current `index.ts` diff adds the semantic-review/trace exports;
  the existing Algolia export block (the source of the secret-discovery
  failure) is unchanged from the baseline.
- The failure tests themselves, `showProductionRecovery`, CustomerUpload
  files, Firestore rules alignment files, and print-size files have no current
  corrective diff.
- None of the corrective files listed above appears in these runtime failure
  locations. The corrective Functions build and all focused AI tests pass.

### Studio full TypeScript errors

`apps/studio` `npx tsc -p tsconfig.json --noEmit` reports the following
pre-existing unrelated errors:

- `electron/ipc/import/pngValidator.ts:289` — `PersistedArtworkUpscalePassCount`
  is not assignable to `0 | 1 | undefined`.
- `electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts:127,143,176,209`
  — fixture maps omit `printWidthInches` and `printHeightInches`.
- `src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts:533,534`
  — `design` is possibly null.
- `src/renderer/src/features/designs/utils/companionSetHelpers.ts:96` —
  `CompanionSetStatusLabel` is missing.
- `src/renderer/src/features/print-requests/services/enhancePrintRequestArtworkService.ts:14`
  and `setPrintRequestItemArtworkEnhanceModeService.ts:17` — unknown
  `feature` property on `FirestoreTraceMetadata`.
- `src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx:160` —
  unused `current`.
- `src/renderer/src/features/staff-inbox/services/staffInboxAlertDeliveryService.ts:2`
  — unused `deleteDoc`.
- `src/renderer/src/features/staff-inbox/services/staffInboxSuppressionService.ts:5`
  — unused `setDoc`.
- `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx:123`
  — unused `formatStaffGangSheetTitle`.
- `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts:7`
  — unused `DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES`.
- `packages/shared/src/utils/customerUploadTransparency.test.ts:8` — unused
  `CUSTOMER_UPLOAD_FULL_BLEED_MAX_OPAQUE_BBOX_RATIO`.
- `packages/shared/src/utils/explicitContentAutomation.test.ts:222,236,246,256,266`
  — readonly fixture tuples are not assignable to mutable result arrays.
- `packages/shared/src/utils/manualArtworkEnhance.test.ts:10` — unused
  `resolveInitialPrintRequestItemSize`.
- `packages/shared/src/utils/printRequestItemSource.test.ts:55` — `designId`
  is not a property of the selected `PrintRequestItem` type.
- `packages/shared/src/utils/showProductionRecovery.test.ts:162` — `null`
  is not assignable to `ShowCapacityResult`.
- `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts:71,287,312,326,330,344,600,650,678`
  — timestamp fixtures omit `seconds`, `nanoseconds`, `isEqual`, and
  `toJSON`.

None of these errors is in the changed Inspector component, Inspector styles,
trace type/utility, or semantic-review provider/core/Playground corrective
files. No unrelated Studio or legacy failure was fixed.

The Studio Vite build passed; its only output was the existing dynamic/static
import warning and the existing large-chunk warning.

## Automated trace and comparison answers

1. **Can automated AI tests emit the canonical Inspector trace format?** Yes.
   Boundary tests can deliberately build the canonical trace and use the
   in-memory sink; live DEV opt-in continues to use the bounded live sink.
2. **Which tests emit traces?** Important pipeline-boundary/integration tests
   opt in on demand. Ordinary unit tests do not persist traces by default.
3. **Where are test traces stored?** In memory by default; optional bounded
   JSON artifacts use `.tmp/ai-enrichment-traces/`.
4. **How are artifacts excluded from Git?** The existing `.gitignore` rule
   `.tmp/` excludes the artifact directory. No generated artifact is present
   or staged.
5. **Can the Inspector open/import a test trace?** Yes. The existing import
   workflow accepts the canonical trace shape, and the Inspector projection
   renders the new boundary sections when present.
6. **How are mocks distinguished?** The source remains
   `AUTOMATED TEST - MOCK/FIXTURE`; fixture provider/model values are not
   relabeled as live Gemini/OpenAI responses.
7. **Can live and test traces be compared?** Yes. The existing comparison
   projection now includes `pass2Diagnostics` alongside prompt, response
   contract, provider response, normalized result, VCP, and decisions.
8. **Does collection alter test behavior?** No. Projection is passive,
   bounded, cloned before callback delivery, and fail-soft.
9. **Does ordinary unit testing require Firestore?** No.
10. **Does trace collection add AI calls?** No. It observes existing calls only.

## Deployment boundary

No callable, provider, Firebase project, Studio deployment, or production
resource was invoked or changed during this implementation/validation pass.
The next reviewed DEV inventory is limited to:

- `testAiEnrichmentSemanticReviewPlayground`, if the owner authorizes its
  deployment;
- the local Studio build containing the Inspector surface, if included in the
  owner-authorized DEV frontend deployment.

Processing, Settings mutation, rules/indexes/migrations, Semantic Reviewer
enablement, Autonomous, Y2, Gate C, WS6, and production are outside this
checkpoint.

`[NEEDS OWNER AUTHORIZATION: DEPLOY PASS 2 REQUEST OBSERVABILITY + OWNER RETEST]`
