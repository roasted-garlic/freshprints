# Implementation Review — Post-QA Pass 2 + Large-Image Correctives

**Date:** 2026-09-06  
**Plan:** `docs/workflow/plans/2026-09-06-integrated-playground-pass2-large-image-and-effectiveness-corrective-plan.md`  
**Formal Review:** `docs/workflow/reviews/2026-09-06-integrated-playground-pass2-large-image-and-effectiveness-corrective-review.md`  
**Owner authorization:** `OWNER IMPLEMENTATION AUTHORIZATION: Proceed with the reviewed post-QA Pass 2 + large-image correctives.`  
**Environment:** local / DEV source only  
**Production:** untouched  
**Deployment:** **NOT performed**

## Verdict

**IMPLEMENTATION COMPLETE — SCOPED VALIDATION COMPLETE — AWAITING OWNER PLAYGROUND DEV DEPLOY + RETEST**

Slices A–D are implemented per Formal Review `approved_with_changes`. No provider/callable invocation, deployment, Settings mutation, Semantic Reviewer enablement, Autonomous, Y2, Gate C, WS6, commit, or push occurred.

`UNSUPPORTED SEMANTIC REVIEW RESPONSE ROOT CAUSE REMAINS UNCLASSIFIED PENDING EVIDENCE-BEARING QA`

Exact provider JSON for failure `b5189149-…` remains unknown (`captureFullTrace: false` at capture time). Parser acceptance was **not** broadened. Diagnostics now record granular `validationFault`, sanitized excerpts, and top-level JSON keys on validation failure.

Required next marker:

`[NEEDS OWNER AUTHORIZATION: DEPLOY POST-QA PLAYGROUND CORRECTIVES + OWNER RETEST]`

## 1. Implemented behavior

### A — Large-image Playground request handling

- Shared encoded-size math: `estimateBase64EncodedByteLength` + Gen2-safe ceiling constants (`32 MiB` HTTP − `2 MiB` JSON headroom).
- Studio prepares callable images via `preparePlaygroundCallableImage`:
  - small sources send original bytes unchanged;
  - oversized sources build a temporary 1024 AI-analysis canvas derivative (contain/pad/flatten `#808080`, WebP Q≈0.82 with JPEG fallback) **without mutating** the selected `File`;
  - if the derivative still exceeds the encoded ceiling, a specific pre-callable error is thrown (not the unexpected Playground copy).
- Ordinary smaller images retain the prior encode-and-send path.

### B — Unsupported Pass 2 diagnostics

- `parseSemanticReviewResult` emits granular `validationFault` codes (`invalid_decision`, `missing_or_empty_reason`, `invalid_patch_map`, etc.).
- Provider failures attach `sanitizedExtractedExcerpt` + optional `topLevelJsonKeys`.
- Fail-closed behavior retained; **no speculative parser broaden**.

### C — Deterministic Pass 2 blocker authority

- Shared `deriveSemanticReviewBlockerResolution`:
  - `resolved = initialEligible − finalEligible`
  - `unresolved = finalEligible`
- Playground projection **always** recomputes WAA after patches; **no longer** merges reviewer `blockersUnresolved` / `semantic_review_needs_review`.
- Response exposes `deterministicBlockersResolved` / `deterministicBlockersUnresolved` plus `reviewerReportedBlockers` (audit only).
- Studio Decision card displays deterministic blockers; reviewer arrays labeled audit.
- Prompt bumped to `catalog-semantic-review-v3` with blocker-resolution-focused instruction.
- Apostrophe specificity false-positive reduced via compact alphanumeric phrase/subject match.
- Dormant `aiEnrichmentCandidateCore` always recomputes after patches, derives blockers, and passes VCP into decisions. **Semantic Reviewer remains OFF** — live Processing outcome unchanged today.

### D — Layout

- `.settings-playground-context-grid { align-items: start; }`
- Validated patches card uses existing `settings-playground-profile-card` scroll bound.

## 2. Exact files changed

### Functions

- `functions/src/ai/semanticReviewPlayground.ts`
- `functions/src/ai/semanticReviewPlayground.test.ts`
- `functions/src/ai/semanticReviewCore.ts`
- `functions/src/ai/semanticReviewCore.test.ts`
- `functions/src/ai/semanticReviewProvider.ts`
- `functions/src/ai/semanticReviewErrors.ts`
- `functions/src/ai/semanticReviewErrors.test.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts`

### Shared

- `packages/shared/src/utils/semanticReviewPolicy.ts`
- `packages/shared/src/utils/semanticReviewPolicy.test.ts`
- `packages/shared/src/utils/catalogAutomationEvidence.ts`
- `packages/shared/src/utils/catalogAutomationDecision.test.ts`
- `packages/shared/src/utils/aiEnrichmentPlaygroundImagePayload.ts` **(new)**
- `packages/shared/src/utils/aiEnrichmentPlaygroundImagePayload.test.ts` **(new)**
- `packages/shared/src/constants/aiEnrichment.constants.ts`
- `packages/shared/src/types/catalog/semanticReview.types.ts`
- `packages/shared/src/types/ai/aiEnrichmentPlayground.types.ts`

### Studio

- `apps/studio/src/renderer/src/features/settings/hooks/useAiEnrichmentPlayground.ts`
- `apps/studio/src/renderer/src/features/settings/utils/aiPlaygroundCallableImage.ts` **(new)**
- `apps/studio/src/renderer/src/features/settings/utils/aiPlaygroundCallableImage.contract.test.ts` **(new)**
- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx`
- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.playgroundPass2.contract.test.ts`
- `apps/studio/src/renderer/src/styles/components/settings.css`

### Docs / state

- Workflow state / CURRENT-STATE (this review pass)
- Prior QA checkpoint already amended in the investigation pass

## 3. Contract checklist

| Item | Result |
| --- | --- |
| Large-image derivative/preflight | **YES** |
| Original image unchanged | **PASS** (File not mutated; derivative ephemeral) |
| Encoded request ceiling enforced | **PASS** |
| 26 MB regression (encoded size) | **PASS** |
| Speculative parser broaden | **NO** |
| Exact unsupported JSON known | **NO** |
| Deterministic blocker-diff authority | **YES** |
| Provider blocker arrays audit-only | **YES** |
| Frankenstein regression | **PASS** |
| Dandelion-clock ineffective-patch regression | **PASS** |
| Zero / partial / full resolution semantics | **PASS** (unit) |
| Objective / protected / text-only / one-attempt | **PASS** |
| Dormant candidate-core parity | **YES** |
| Active Semantic Reviewer enabled | **NO** |
| Layout corrective | **YES** |

## 4. Validation evidence

| Suite | Result |
| --- | --- |
| Functions AI (`functions/src/ai/**/*.test.ts`) | **404 passed / 0 failed / 72 suites** |
| Shared AI/decision/profile/trace + payload | **99 passed / 0 failed / 16 suites** |
| Studio Settings | **29 passed / 0 failed / 9 suites** |
| Functions `npm run build` / `tsc` | **PASS** |
| Targeted ESLint (changed TS excl. whole SettingsPage) | **PASS** |
| `git diff --check` | **PASS** (LF/CRLF warnings only) |
| Studio-wide `tsc --noEmit` | **33 diagnostics** — **ACCEPTED PRE-EXISTING VALIDATION EXCEPTION**; not repaired; Studio-wide build **not** claimed PASS |

## 5. Deployment inventory (future — not executed)

### A. Required for Playground DEV retest

1. **Local DEV Studio** (Slices A/D + Pass 2 UI) — restart/reload running `npm run dev:studio` after this source lands.
2. **`testAiEnrichmentSemanticReviewPlayground`** — required (Slices B/C, prompt v3, deterministic authority, diagnostics).

### B. Not required for Playground retest

- **`testAiEnrichmentPlayground`** — server Playground Function code/constants for image transport were **not** changed; client-side derivative/preflight is sufficient. Deploy only if owner wants shared-constant rebuild parity on that Function later.
- Processing Functions hosting `aiEnrichmentCandidateCore` — **dormant parity only**; do **not** deploy with Playground retest unless separately authorized.
- Rules / indexes / migrations / Settings: **NO**

### C. Separate later authorization (dormant Processing parity)

If owner wants DEV Processing to carry the candidate-core authority fix while SR remains OFF:

`[NEEDS OWNER AUTHORIZATION: DEPLOY DORMANT CANDIDATE-CORE PASS 2 AUTHORITY PARITY]`

Inventory would be the Processing Function(s) that include `aiEnrichmentCandidateCore` (exact names to confirm at deploy time from `functions/src/index.ts`). Live behavior still unchanged until Semantic Reviewer is enabled.

## 6. Safety

- Production untouched
- Semantic Reviewer OFF; Autonomous OFF
- No provider calls by Codex
- No deployment performed
- VCP `detailedDescription` study remains **QUEUED / OUT OF SCOPE**

## Next step

Stop for owner Playground deploy + evidence-bearing retest authorization.
