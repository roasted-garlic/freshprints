# Implementation Review — Explicit Stale State and Smart Profile Terms Corrective

| Field | Value |
|---|---|
| Plan | `docs/workflow/plans/2026-09-08-explicit-content-stale-state-and-smart-profile-terms-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-08-explicit-content-stale-state-and-smart-profile-terms-corrective-review.md` |
| Implementation | Complete locally |
| DEV deployment | **Complete in `fresh-prints-dev`; post-deploy audit found follow-up defect** |
| Provider calls / settings mutations | **0 / 0** |
| Commit / push / production | **No / No / No** |

## Root causes addressed

- Precision-first classification correctly returns no match for `1559` and `1565`, but prior automation-owned root fields were left untouched on a later no-match.
- Smart Profile displayed detected terms only from the nested preview, hiding durable `censoredTerms` on older/pre-preview records.

## Changes

- Added a settings-successful no-match reconciliation decision to the Explicit candidate path.
- Pipeline deletes `isExplicitContent`, `censoredTerms`, and `explicitContentSource` only when the prior source is `automation` and the deliberate automation lock is not active.
- Settings failures, locked records, staff-source records, and unknown-source legacy records are not cleared.
- Smart Profile uses current preview terms when available and falls back to persisted terms only when no preview exists. A current no-match preview cannot resurrect stale terms.

## Files changed

- `packages/shared/src/utils/explicitContentAutomation.ts`
- `packages/shared/src/utils/explicitContentAutomation.test.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/explicitContentAutomation.contract.test.ts`
- `apps/studio/src/renderer/src/features/ai-review/components/AiReviewSmartProfileSection.tsx`
- `apps/studio/src/renderer/src/features/ai-review/utils/explicitAutomationPreviewDisplay.ts`
- `apps/studio/src/renderer/src/features/ai-review/utils/explicitAutomationPreviewDisplay.test.ts`

## Validation

| Check | Result |
|---|---|
| Shared Explicit, Smart Profile display, and Functions contract tests | **60 pass / 0 fail** |
| Functions TypeScript build | **PASS** |
| Targeted ESLint | **PASS** |
| `git diff --check` | **PASS** |
| Post-deploy read-only audit contract suite | **120 pass / 0 fail** |

No live AI/provider test was run. The existing `1559`/`1565` classifier regressions remain covered by automated tests.

## Post-deploy successful-reprocess stale-state audit — 2026-09-08

The deployed Explicit corrective satisfies the reviewed transitions only when a successful current result reaches the structured Smart Profile path. The broader successful-reprocess invariant is **not fully satisfied**.

### Mechanically proven findings

1. Several reprocess entry points delete prior AI output before the provider/pipeline succeeds. A later failure therefore cannot preserve the previous output:
   - `functions/src/resetAiEnrichmentForProcessing.ts:74-90` deletes `aiSuggestions`, `aiAnalysis`, `smartProfile`, review notes, and confidence before `enqueueAiEnrichment` starts.
   - `functions/src/enqueueAiEnrichment.ts:153-202` deletes `aiSuggestions` and `aiAnalysis` before the direct pipeline call.
   - `functions/src/ai/reprocessReadyDesignWithAiCore.ts:53-77` deletes `aiSuggestions` and `aiAnalysis` before Ready reprocess.
   - `functions/src/catalogReprocess/catalogReprocessAiClear.ts:12-29` deletes the AI blobs, including `smartProfile`, before the AI Review Queue worker calls the pipeline.
   - `functions/src/catalogReprocess/catalogReprocessAiClear.ts:36-46` deletes `aiSuggestions`, `aiAnalysis`, and confidence before Ready Catalog backfill.
   - `functions/src/ai/aiEnrichmentPipeline.ts:59-94` marks failure but does not restore any pre-cleared output.
2. A successful development fallback result is valid but does not include `analysis.smartProfileEnrichmentParse` (`functions/src/ai/providers/developmentAiEnrichmentProvider.ts`). `aiEnrichmentCandidateCore.ts:159-188` consequently returns no `smartProfile`, and `markAiSuccess` only writes `smartProfile` / `smartProfileAiSnapshot` when those values are present (`functions/src/ai/aiEnrichmentPipeline.ts:166-208, 297-348`). An old Smart Profile, category evidence, provenance, Explicit preview, and snapshot can therefore survive a successful run that omits the profile. Because Explicit classification is currently inside the same `smartProfile && automationDecision` guard (`aiEnrichmentCandidateCore.ts:257-321`), old automation-owned Explicit root fields can also survive that successful path.
3. `aiReviewConfidence` is conditionally written only when the new suggestions contain confidence (`aiEnrichmentPipeline.ts:334-336`). The current structured response does not set confidence (`simpleCatalogEnrichmentResponse.ts:398-408`), so direct pipeline success without a pre-clear can retain an older confidence value. Current entry-point pre-clears mask this on success but worsen the failure-loss problem.

The existing 120 passing tests confirm the current contracts and authority merges, but do not simulate provider/pipeline failure after the pre-clear or a successful candidate with no Smart Profile. No provider was invoked.

### Required ownership and reconciliation table

| Field / group | Ownership class | New-run write behavior | Empty/omitted new result behavior | Stale-state risk? | Evidence/path |
|---|---|---|---|---|---|
| `aiSuggestions.title`, `description`, provider/model/version/cost metadata | REPLACE ON SUCCESS | New `aiSuggestions` map replaces the prior map after success; retired nested tag fields are stripped. | Omitted optional fields disappear on a successful map replacement. | **YES — failure path** because entry points delete the map before processing. | `aiEnrichmentPipeline.ts:157-162, 340`; `enqueueAiEnrichment.ts:153-202`; `markAiFailure` |
| `aiSuggestions.categoryId/categoryName` | REPLACE ON SUCCESS | Candidate exact-resolves against the active category snapshot, then writes the new suggestions map. | Undefined exact resolution is removed on successful map replacement. | **YES — failure path**; no successful-map omission defect found. | `aiEnrichmentCandidateCore.ts:157-169`; `aiEnrichmentPipeline.ts:157-162, 340` |
| Root `design.categoryId` / approved catalog category | HUMAN AUTHORITATIVE / catalog state | Reprocess entry points preserve the root field; Pass 1 does not overwrite it. | Not an AI omission field in this pipeline. | **NO stale AI replacement risk found.** | `reprocessReadyDesignWithAiCore.ts:80-112`; catalog preservation contract |
| Smart Profile dimensions: subjects, objects, styles, themes, interests, professionsGroups, occasions, places, colors, visibleText, searchConcepts | MERGE WITH AUTHORITY | Current AI profile is merged with import presets and marked staff-edited dimensions; the full effective profile replaces the prior map. | If a current profile exists, omitted AI dimensions are removed while staff/import values remain. If the profile itself is omitted, the old map remains untouched. | **YES** — omitted-profile success and queue/reset pre-clear. | `smartProfileEnrichmentWrite.ts:27-47`; `smartProfileStaffEdit.ts`; `aiEnrichmentPipeline.ts:170-208, 342-347` |
| Smart Profile category, alternatives, category-gap evidence | REPLACE ON SUCCESS within MERGE WITH AUTHORITY | Current profile rebuilds exact category and current alternatives/gap evidence; whole map replacement removes omitted fields. | Omitted fields clear only when a current profile is written. | **YES** when `smartProfile` is omitted; otherwise no stale omission risk found. | `smartProfileBuilder.ts:91-116, 149-184`; `aiEnrichmentPipeline.ts:342-347` |
| Smart Profile provenance, automation decision, Explicit preview | MERGE WITH AUTHORITY / PROVENANCE | Current profile writes current provenance and preview, then applies lock/staff authority. | Omitted profile leaves old provenance/preview in place. | **YES** on omitted-profile success; explicit root transition also skips classification on that path. | `aiEnrichmentCandidateCore.ts:236-254, 257-321`; `aiEnrichmentPipeline.ts:217-228` |
| `smartProfileAiSnapshot` | REPLACE ON SUCCESS / staff-reset baseline | Rebuilt from the current AI profile during the effective merge. | New result without a profile does not write or delete the prior snapshot. | **YES** — old AI snapshot can survive omitted-profile success. | `smartProfileEnrichmentWrite.ts:45-47`; `aiEnrichmentPipeline.ts:166-208, 300-301, 347` |
| `aiAnalysis.visibleText`, VCP, and other current analysis metadata | REPLACE ON SUCCESS | Entire sanitized `aiAnalysis` map is written after transient fields are removed. | Omitted fields clear on successful map replacement. | **YES — failure path** because maps are pre-cleared; no successful-map omission defect found. | `simpleCatalogEnrichmentResponse.ts:410-435`; `aiEnrichmentPipeline.ts:137-144, 160-162, 341` |
| `centralSubject` | TRANSIENT / compatibility input | Used during current response/profile normalization; not persisted as a standalone design field. | No persisted field to become stale. | **NO.** | `simpleCatalogEnrichmentResponse.ts:24-26`; `smartProfileBuilder.ts:213-221` |
| Explicit root fields and detected terms | MERGE WITH AUTHORITY | Positive match replaces automation terms; successful no-match deletes only prior automation-owned fields; lock/staff/unknown/settings-failure boundaries are preserved. | Normal structured-profile no-match clears stale automation fields. Omitted-profile success skips classification and can leave them stale. | **YES — remaining Explicit transition on successful omitted-profile path.** | `aiEnrichmentCandidateCore.ts:257-321`; `aiEnrichmentPipeline.ts:256-279` |
| Explicit preview terms in Smart Profile | MERGE WITH AUTHORITY / PROVENANCE | Preview follows the current classifier and human lock authority. | No current profile means old preview can remain. | **YES**, same omitted-profile path. | `smartProfile.types.ts`; `aiEnrichmentPipeline.ts:217-228` |
| Retired `aiSuggestions.tags`, `suggestedNewTags`, tag-rerank, and Suggestion Author fields | RETIRED / COMPATIBILITY ONLY | Successful suggestions map removes retired fields; `design.tags` is not rewritten by active Pass 1. | Successful map replacement removes stale nested retired AI fields; failed attempts lose the whole AI suggestions map after pre-clear. | **NO active authority leak; YES failure-loss risk for the containing map.** | `aiEnrichmentPipeline.ts:115-135, 157-162`; `aiProcessing.types.ts:34-37, 49-74` |
| `aiReviewConfidence` / `aiReviewVersion` | REPLACE ON SUCCESS / review metadata | Confidence/version are conditionally written after success; entry-point staging deletes them first. | Confidence omitted by the current structured response; a direct success can leave prior confidence unless pre-cleared. | **YES** — confidence omission plus destructive pre-clear. | `design.types.ts:165-170`; `simpleCatalogEnrichmentResponse.ts:398-408`; `aiEnrichmentPipeline.ts:334-338` |
| `aiReviewStatus`, approval actor/timestamps, `aiReviewNotes` | HUMAN AUTHORITATIVE / LIFECYCLE | Reprocess staging intentionally changes lifecycle; Ready backfill preserves approval lifecycle. | Failure after queue/reset staging leaves the changed lifecycle and may lose notes. | **NEEDS OWNER DECISION** whether review notes are intentionally disposable; this is a failure-destructiveness risk, not an AI stale-value merge. | `resetAiEnrichmentForProcessing.ts:74-90`; `catalogReprocessAiClear.ts:12-46`; `design.types.ts:159-170` |

### Explicit transition result

- Old automation match → new no-match: **PASS only when the current candidate builds Smart Profile + automation decision**; otherwise **remaining defect** as described above.
- Old automation match A → new automation match B: **PASS**; positive `censoredTerms` replace the prior array.
- No prior state → new match: **PASS**.
- Staff-owned, locked, unknown-source, and settings-failure preservation: **PASS for the current Explicit root write contract**.
- Failed run non-destructive behavior: **FAIL for pre-cleared AI blobs**; Explicit root fields are not pre-cleared, but the surrounding automation output is.
- Smart Profile no-match display and persisted fallback: **PASS for a current profile**; omitted-profile success remains defective.

### Smallest safe corrective checkpoint

Do not deploy or patch this audit finding. The next corrective should first establish an atomic successful-reconciliation contract: preserve prior automation output through attempt staging and failure, then replace/delete omitted automation-owned fields only after a successful candidate is available, while merging staff/import authority and preserving deliberate Explicit locks. The corrective must cover the development fallback/no-Smart-Profile path and add failure + omitted-profile regression tests before any DEV deployment.

## Exact DEV deployment inventory audit

The changed Functions runtime path is:

`entrypoint → runAiEnrichmentPipeline → generateAiEnrichmentCandidateForDesign → explicitContentAutomation.ts`

The persistence reconciliation continues through `aiEnrichmentPipeline.ts` and `markAiSuccess`.

| Function candidate | Deploy? | Dependency reason | Changed candidate/pipeline behavior in path? |
|---|---|---|---|
| `enqueueAiEnrichment` | **YES** | Exported by `functions/src/index.ts`; imports and invokes `runAiEnrichmentPipeline` for normal AI Processing / AI Review queue work. | **YES** |
| `reprocessReadyDesignWithAi` | **YES** | Exported by `functions/src/index.ts`; owner Ready-design reprocess invokes `runAiEnrichmentPipeline`. | **YES** |
| `onCatalogReprocessJobWritten` | **YES** | Exported by `functions/src/index.ts`; imports `catalogReprocessWorker`, which imports and invokes `runAiEnrichmentPipeline` for AI Review queue and Ready Catalog backfill modes. | **YES** |
| `testAiEnrichmentPlayground` | **NO** | Exported, but imports only `runAiEnrichmentPlayground` from `aiEnrichmentPlayground.ts`; it does not import the candidate core or persistence pipeline. | **NO** — no stale-root reconciliation |
| `testAiEnrichmentSemanticReviewPlayground` | **NO** | Exported, but imports only `runAiEnrichmentSemanticReviewPlayground` from `semanticReviewPlayground.ts`; it does not import the candidate core or persistence pipeline. | **NO** — manual Pass 2 playground only |

Additional source consumer audit: `aiEnrichmentObserve.ts` imports the candidate core, but `functions/src/index.ts` does not export it and the contract test requires it remain unexported. It is not a deployed Function and is not included in the inventory. No other exported Function imports `aiEnrichmentCandidateCore.ts` or `aiEnrichmentPipeline.ts` beyond the three YES entries above.

### Runtime coverage

- Normal AI Processing: `enqueueAiEnrichment` → queue pipeline → candidate core → reconciliation.
- Owner Ready-design reprocess: `reprocessReadyDesignWithAi` → queue pipeline → candidate core → reconciliation.
- Catalog reprocess worker / Ready backfill: `onCatalogReprocessJobWritten` → `catalogReprocessWorker` → pipeline with `queue` or `ready_backfill` mode → reconciliation.
- Playground paths: **NO**. They produce isolated playground responses and do not call `markAiSuccess`, so they cannot exercise stale persisted-root-field cleanup.

### Exact proposed DEV command

`firebase deploy --project fresh-prints-dev --only functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten`

No shell-local Firebase discovery workaround was required. The exact command was executed after owner authorization and completed successfully:

- 3 Functions deployed
- 0 Functions errored
- 0 Function deployments aborted
- No deletion prompt or deletion was reported

Independent post-deployment verification confirmed the exact deployed inventory:

| Function | Revision | Source hash | State | Project / region | Runtime | Latest traffic |
|---|---|---|---|---|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00117-wad` | `69d69b89d233720474e58e6d14ab00f141d51840` | ACTIVE | `fresh-prints-dev` / `us-central1` | `nodejs20` | 100% |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00023-seq` | `69d69b89d233720474e58e6d14ab00f141d51840` | ACTIVE | `fresh-prints-dev` / `us-central1` | `nodejs20` | 100% |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00029-wit` | `69d69b89d233720474e58e6d14ab00f141d51840` | ACTIVE | `fresh-prints-dev` / `us-central1` | `nodejs20` | 100% |

Unauthorized Functions deployed: **NO**. The two Playground Functions were not included. Function deletions: **NO**.

Firebase emitted a non-blocking deployment warning that Node.js 20 is deprecated and will be decommissioned for new deployments on 2026-10-30; it also flagged the existing `firebase-functions` dependency as outdated. No runtime upgrade was authorized in this corrective.

## Local Studio QA disposition

The Smart Profile UI change is local Studio renderer code. The local Studio renderer was restarted with `npm run dev:studio` after clearing the inherited `ELECTRON_RUN_AS_NODE=1` flag that otherwise launches Electron as plain Node. The renderer/Vite session is running. No local production build, installer, publish, or version bump is required.

## Firebase and product-surface disposition

| Surface | Required? | Reason |
|---|---|---|
| Functions | **YES** | Deploy the three runtime consumers above. |
| Firestore Rules | **NO** | No Rules diff. |
| Storage Rules | **NO** | No Storage Rules diff. |
| Indexes | **NO** | No index diff. |
| Migrations | **NO** | No migration or bulk data operation. |
| Settings mutation | **NO** | Runtime reads existing settings only. |
| Explicit vocabulary mutation | **NO** | No vocabulary change. |
| Secrets | **NO** | Existing Function secret bindings are reused; no secret change. |
| Algolia | **NO** | No Algolia source or index operation. |
| Portal | **NO** | No Portal source or deployment change. |

## Owner DEV QA sequence after later deployment

### A — Pensacola/St. Augustine stale-state regression

Reprocess the exact existing design that previously stored automation-owned `isExplicitContent`, `censoredTerms: 1559, 1565`, and `explicitContentSource: automation`.

Expected: stale automation-owned root fields are cleared after the successful current no-match; `1559` and `1565` are absent; the current preview shows no Explicit match; Smart Profile does not resurrect those terms; and category outcome remains independently truthful.

### B — Genuine profanity

Reprocess or use a safe DEV design containing an actually configured Explicit term. Confirm the genuine term remains detected, Smart Profile detected-term pills are visible, and preview/persisted terms agree.

### C — Authority preservation

Verify, using automated evidence where live fixtures are destructive or awkward, that staff-owned Explicit state is not automatically cleared, deliberate automation lock state is not cleared, unknown-source legacy state is not silently cleared, and settings failure cannot clear prior Explicit state.

### D — Architecture

Confirm Autonomous remains OFF, automatic Pass 2 remains parked, category policy is unchanged, and AI tag-retirement behavior is unchanged.

Provider/live-AI QA remains owner-only and is not performed by Codex in this inventory phase.

## Deployment boundary

The exact three-Function corrective deployment is complete in DEV. Codex stopped before live AI/provider QA. Owner QA is now required: reprocess the Pensacola/St. Augustine design to verify the old automation-owned Explicit state is cleared and the Smart Profile terms display is restored for genuine matches.

Rules/indexes/migrations changed: **NO**. Settings mutated: **NO**. Explicit vocabulary changed: **NO**. Provider calls by Codex: **0**. Commit/push: **NO**. Production touched: **NO**. Autonomous remains **OFF** and automatic Pass 2 remains **parked**.

`[NEEDS OWNER QA: EXPLICIT STALE STATE + SMART PROFILE TERMS CORRECTIVE]`
