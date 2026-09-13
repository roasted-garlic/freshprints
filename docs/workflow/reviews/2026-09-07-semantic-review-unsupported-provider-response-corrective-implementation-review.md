# Implementation Review — Semantic Review Provider-Response Reliability Corrective

| Field | Result |
| --- | --- |
| Date | 2026-09-07 |
| Plan | `docs/workflow/plans/2026-09-07-semantic-review-unsupported-provider-response-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-07-semantic-review-unsupported-provider-response-corrective-review.md` — approved |
| Environment | local source validation only |
| Production | untouched |
| Deployment | not performed |
| Commit / push | not performed |

## Implementation result

The approved Option A corrective is complete. Semantic Review now sends the
provider-neutral strict `catalog_semantic_review_v4` response contract to both
existing provider targets. The provider-facing mutation form is the existing
patch map, keyed only by approved Smart Profile dimensions. The observed
`{ field, value }` patch-array dialect remains unsupported and fail-closed.

### Exact corrective files

- `functions/src/ai/semanticReviewSchema.ts` — new strict v4 schema and
  response-format builder.
- `functions/src/ai/semanticReviewSchema.test.ts` — schema restrictions and
  patch-map tests.
- `functions/src/ai/semanticReviewProvider.ts` — sends `response_format` while
  preserving provider/model resolution, text-only messages, and
  `max_completion_tokens: 1200`.
- `functions/src/ai/semanticReviewProvider.test.ts` — Google/OpenAI request
  contract, exact captured failure, and no-retry tests.
- `functions/src/ai/semanticReviewCore.ts` — v4 prompt contract requiring the
  patch map.
- `functions/src/ai/semanticReviewCore.test.ts` — canonical patch-map success
  and exact `{ field, value }` fail-closed fixture.
- `functions/src/ai/semanticReviewPlayground.ts` — response contract exposed in
  the canonical Pass 2 trace and request stage metadata.
- `functions/src/ai/semanticReviewPlayground.test.ts` — trace contract and
  zero-image/one-attempt coverage.
- `packages/shared/src/types/catalog/semanticReview.types.ts` — version
  literal updated to `catalog-semantic-review-v4`.

No additional file was required by the compiler or import graph. Other
uncommitted files in the checkout belong to earlier authorized work and were
not changed as part of this corrective.

## Contract and safety checklist

| Requirement | Result |
| --- | --- |
| Exact schema version | `catalog-semantic-review-v4` |
| `response_format` added | YES |
| `response_format.type` | `json_schema` |
| Strict JSON Schema | YES (`json_schema.strict = true`) |
| Schema root | object, `additionalProperties: false` |
| Required fields | `decision`, `reason`, `blockersResolved`, `blockersUnresolved` |
| Decision enum | `APPROVE`, `APPROVE_WITH_PATCH`, `NEEDS_REVIEW` |
| Non-empty reason | YES (`minLength: 1`) |
| Patch representation | object/map only |
| Patch keys | existing `SEMANTIC_REVIEW_PATCHABLE_FIELDS` only |
| Patch values | string arrays |
| `{ field, value }` parser support added | NO |
| Captured failure fixture remains fail-closed | PASS |
| Parser acceptance broadened | NO |
| Automatic structural retry added | NO |
| Maximum additional provider calls | `0` |
| Maximum additional retry cost | `$0` |
| Pass 2 text-only preserved | PASS |
| `imageCount = 0` contract | PASS |
| Protected/staff-owned authority | PASS |
| Objective-blocker authority | PASS |
| Deterministic blocker authority | PASS |
| Final deterministic WAA authority | PASS |
| Original Smart Profile immutable | PASS |
| Provider output validated before mutation | PASS |
| Reviewer blocker arrays remain audit-only | PASS |

The exact captured fenced response reaches semantic patch validation and is
rejected as `patch_validation_failure` / `patch_validation_failed` with no
mutation and no fallback normalization. The canonical patch-map fixture derives
`from` from the current immutable profile before the existing validation rules
run.

## Provider and trace verification

| Check | Result |
| --- | --- |
| Google request schema test | PASS |
| OpenAI request schema test | PASS |
| Google/OpenAI schema equality | PASS |
| `max_completion_tokens` | unchanged at `1200` |
| Text-only request / image content | preserved / absent |
| v4 response contract in canonical trace | PASS |
| Provider/model/version trace metadata | PASS |
| Bounded diagnostics and redaction | preserved |
| Secrets/auth headers/image bytes in trace | not exposed |
| No trace-induced AI calls | PASS |

The corrected source still compiles through the dormant candidate-core import,
but no Processing Function is deployed or enabled by this corrective.

## Validation

### Approved semantic scope

| Command / check | Result |
| --- | --- |
| `npx tsx --test functions/src/ai/semanticReviewSchema.test.ts` | PASS — 3/3 |
| `npx tsx --test functions/src/ai/semanticReviewCore.test.ts` | PASS — 14/14 |
| `npx tsx --test functions/src/ai/semanticReviewProvider.test.ts` | PASS — 6/6 |
| `npx tsx --test functions/src/ai/semanticReviewPlayground.test.ts` | PASS — 8/8 |
| Combined focused Semantic Review command | PASS — 31/31, 4 suites |
| Functions AI suite, 51 test files / 73 suites | PASS — 410/410 |
| Relevant shared Semantic Review/policy/trace tests | PASS — 58/58, 3 files |
| Studio Settings scoped tests | PASS — 29/29, 9 files |
| Functions build/typecheck (`npm run build` in `functions`) | PASS — exit 0 |
| Studio Vite build (`npx vite build` in `apps/studio`) | PASS — exit 0 |
| Targeted ESLint, 14 corrective/shared files | PASS — 0 errors, 0 warnings |

The full shared test set was also attempted in seven Windows-safe batches:
203 files, 1,659 passing and 4 failing tests. The four failures are the two
unrelated existing suites listed below. The broad Studio TypeScript check was
also run and remains non-green for the documented unrelated exceptions below.

### `ACCEPTED PRE-EXISTING VALIDATION EXCEPTION`

The owner-selected exception is accepted for unrelated work. These failures
were mechanically compared with checkpoint
`5712b51d0f0b867652e7f3e5ea0f22c620cebc1e` and are not caused by any v4
corrective file.

#### Full shared test failures

| File / test | Exact result | Checkpoint evidence |
| --- | --- | --- |
| `packages/shared/src/constants/firestoreRulesPublicCatalogAlignment.test.ts` — `firestore.rules public catalog browse (#13)` | FAIL: `upcomingShows must not allow public read: if true` | Test file unchanged; the same forbidden-regex match is `True` against both baseline and current `firestore.rules`. Current rules only add trace read rules in the Inspector change area. |
| `packages/shared/src/utils/printSizeMath.test.ts` — `resolveImportUpscaleTargetPx` | FAIL: 3 assertions; expected null/`{ widthPx: 3600, heightPx: 4800 }`, received `{ widthPx: 4500, heightPx: 4500 }` and `{ widthPx: 3713, heightPx: 4950 }` | Test and implementation files are byte-identical to checkpoint. |

#### Studio `tsc --noEmit` failures

Command: `npx tsc --noEmit` from `apps/studio`; exit `2`, 33 error lines.

| File | Lines / exact TypeScript error |
| --- | --- |
| `electron/ipc/import/pngValidator.ts` | 289 — TS2322: `PersistedArtworkUpscalePassCount` is not assignable to `0 \| 1 \| undefined`. |
| `electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts` | 127, 143, 176, 209 — TS2322: fixture `Map` values are missing `printWidthInches` and `printHeightInches` required by `GroupedResizedImage`. |
| `src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` | 533, 534 — TS18047: `design` is possibly `null`. The callback/service contract and failing lines are unchanged; surrounding tag-retirement edits are unrelated to this v4 corrective. |
| `src/renderer/src/features/designs/utils/companionSetHelpers.ts` | 96 — TS2304: cannot find name `CompanionSetStatusLabel`. |
| `src/renderer/src/features/print-requests/services/enhancePrintRequestArtworkService.ts` | 14 — TS2353: `feature` is not a property of `FirestoreTraceMetadata`. |
| `src/renderer/src/features/print-requests/services/setPrintRequestItemArtworkEnhanceModeService.ts` | 17 — TS2353: `feature` is not a property of `FirestoreTraceMetadata`. |
| `src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx` | 160 — TS6133: `current` is declared but never read. |
| `src/renderer/src/features/staff-inbox/services/staffInboxAlertDeliveryService.ts` | 2 — TS6133: `deleteDoc` is declared but never read. |
| `src/renderer/src/features/staff-inbox/services/staffInboxSuppressionService.ts` | 5 — TS6133: `setDoc` is declared but never read. |
| `src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` | 123 — TS6133: `formatStaffGangSheetTitle` is declared but never read; this is from separate uncommitted non-v4 work. |
| `packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts` | 7 — TS6133: `DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES` is declared but never read. |
| `packages/shared/src/utils/customerUploadTransparency.test.ts` | 8 — TS6133: `CUSTOMER_UPLOAD_FULL_BLEED_MAX_OPAQUE_BBOX_RATIO` is declared but never read. |
| `packages/shared/src/utils/explicitContentAutomation.test.ts` | 222, 236, 246, 256, 266 — TS2322: readonly fixture values are not assignable to mutable `ExplicitContentAutomationClassifyResult` arrays. |
| `packages/shared/src/utils/manualArtworkEnhance.test.ts` | 10 — TS6133: `resolveInitialPrintRequestItemSize` is declared but never read. |
| `packages/shared/src/utils/printRequestItemSource.test.ts` | 55 — TS2353: `designId` does not exist in the selected `PrintRequestItem` type. |
| `packages/shared/src/utils/showProductionRecovery.test.ts` | 162 — TS2345: `null` is not assignable to `ShowCapacityResult`. |
| `packages/shared/src/utils/showProductionRecoveryRequeue.test.ts` | 71, 287, 312, 326, 330, 344, 600, 650, 678 — TS2739: timestamp fixtures are missing `Timestamp` members `seconds`, `nanoseconds`, `isEqual`, and `toJSON`. |

The unchanged files above were byte-compared with the checkpoint and therefore
already failed at the baseline. The two current error locations in changed
unrelated Studio files are outside the corrective inventory and were not
modified here; they remain covered by the owner's accepted unrelated Studio
validation exception. No v4 file appears in the list.

### Formatting / diff checks

- Targeted corrective ESLint: PASS, 14 files, zero warnings.
- Scoped `git diff --check` for the corrective source, tests, Plan, Review,
  state, and handoff files: PASS.
- Workspace `git diff --check`: exit `2` solely for eight trailing-whitespace
  diagnostics in earlier amendments of
  `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-dev-deployment-qa-checkpoint.md`
  at lines 266-268, 331, 391, and 404-406. No corrective source or new v4
  review text is implicated.

The full suite is therefore not marked PASS; the scoped approved corrective
validation is PASS with the explicit accepted pre-existing exceptions above.

## Deployment and safety disposition

| Item | Result |
| --- | --- |
| Exact later DEV deployment inventory | `testAiEnrichmentSemanticReviewPlayground` only |
| Processing deployment required for Playground QA | NO |
| Rules required | NO |
| Indexes required | NO |
| Migration required | NO |
| Settings mutation required | NO |
| Provider/callable invoked during this work | NO |
| Deployment performed | NO |
| Semantic Reviewer enabled | NO |
| Autonomous enabled | NO |
| Y2 / Gate C / WS6 started | NO |
| Production touched | NO |
| Commit / push | NO |

The separate category-stability/ambiguity follow-up and VCP
`detailedDescription` study remain parked as required by the approved review.

## Checkpoint

Implementation, automated/source validation, and this Implementation Review are
complete. The next action requires separate owner authorization for the exact
manual Playground DEV deployment and retest:

`[NEEDS OWNER AUTHORIZATION: DEPLOY SEMANTIC REVIEW V4 RESPONSE CONTRACT + OWNER RETEST]`
