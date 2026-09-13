# Formal Review — Integrated Playground Large-Image + Pass 2 Effectiveness Corrective

| Field | Value |
| --- | --- |
| Date | 2026-09-06 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-06-integrated-playground-pass2-large-image-and-effectiveness-corrective-plan.md` |
| QA checkpoint | `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-dev-deployment-qa-checkpoint.md` |
| Environment | `fresh-prints-dev` |
| Production | untouched / not authorized |
| Verdict | **approved_with_changes** |

---

## Summary

Evidence-backed Plan correctly identifies four independent defects from owner post-diagnostics QA. Slice C’s deterministic blocker-diff authority fix is mandatory and well proven by live DEV traces. Slice A’s base64-over-32 MB root cause is mechanically proven. Slice B must harden diagnostics without speculative parser broadening. Slice D is a bounded CSS/markup reuse fix. Implementation is **not** authorized by this review alone — owner must supply the implementation authorization marker.

## Verdict

**approved_with_changes**

Required changes before/during implementation (binding):

1. **Slice B:** Do not accept any new provider response shape until a captured extracted-JSON fixture from a failing run exists. Diagnostics granularity + sanitized excerpt first.
2. **Slice C:** Implement deterministic `resolved = initialEligible − finalEligible` / `unresolved = finalEligible` as final authority for Playground UI and final WAA gating; demote model blocker arrays to audit-only.
3. **Slice C production path:** Apply the same always-recompute + derived-blocker authority in `aiEnrichmentCandidateCore.ts` in the same corrective (authority consistency). Live Processing outcome remains unchanged while `semanticReviewerEnabled` is false; document that enabling SR later will use the corrected authority.
4. **Slice A:** Prefer client AI-analysis derivative aligned with `prepareAiAnalysisImage` (1024 WebP analysis canvas); never mutate originals; never “fix” payload size by raising Function memory alone.
5. **Out of scope retained:** no v39, no VCP schema/`detailedDescription` edits, no SR/Autonomous/Y2/Gate C/WS6 enablement, no production.

## Checklist

| Area | Status | Notes |
| --- | --- | --- |
| Scope clear and bounded | pass | Four slices; VCP study excluded |
| Architecture alignment | pass | Deterministic WAA authority restored; Playground derivative matches production AI input pattern |
| Security impact addressed | pass | Redacted diagnostics; no secrets; no new public endpoints |
| Data Model impact addressed | pass | No catalog schema migration |
| Backend impact addressed | pass | DEV Function inventory explicit |
| Test strategy adequate | pass | Strong regression matrix including Frankenstein + 26 MB |
| Human checkpoints identified | pass | Implement auth → DEV deploy → owner QA |
| Roadmap alignment | pass | Continues two-pass enrichment workstream |
| Documentation plan | pass | QA amendment + state/handoff |
| No silent scope expansion | pass | Speculative parser broaden forbidden |

---

## Architecture Review

**Findings:**

- Pass 2’s post-patch merge of reviewer `blockersUnresolved` into final reasonCodes contradicts the architecture intent that final deterministic WAA is authoritative after patch application. Trace `2e7e8047-…` proves hardBlockers cleared while reviewer-injected codes survived.
- Production candidate core skipping recompute when unresolved is non-empty is a latent Processing bug when SR is enabled; fixing it now is correct and scoped.
- Large-image failure is a transport/client encoding boundary, not a vision-model quality issue. Production already analyzes derivatives; Playground should too.
- Layout fix correctly reuses existing playground profile-card scroll pattern.

**Required changes:**

- [x] Binding items listed in Verdict (Slice B/C/A)

---

## Security Review

**Findings:**

- Sanitized validation excerpts must be length-capped and scrubbed through existing trace redaction.
- Full raw provider capture remains owner-gated (`captureFullTrace`).
- No credential/logging expansion beyond current redaction rules.

**Required changes:**

- [ ] None beyond plan’s redaction constraints

**Human approval needed before production:**

- [x] Entire corrective is DEV-only; production not authorized

---

## Data Model Review

**Findings:**

- No persisted catalog field changes.
- Trace diagnostic metadata may gain granular rejection fields (ephemeral).

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- Slice A may touch `testAiEnrichmentPlayground` only if server constants/messages change; primary fix is Studio client.
- Slice B/C require `testAiEnrichmentSemanticReviewPlayground`.
- Candidate-core changes live under Processing Functions; deploying them needs explicit owner inventory approval even though SR is OFF.
- Gen2 32 MB HTTP limit is the binding transport ceiling for callable base64 payloads.

**Required changes:**

- [x] Implementation/deploy notes must list exact Functions per owner authorization; default Playground QA path can deploy only the two Playground callables if candidate-core deploy is deferred — but code fix for candidate-core must still land in repo with the corrective.

---

## Testing Review

**Findings:**

- Plan regression matrix covers Frankenstein, stale carry-forward, cosmetic non-resolution, zero-resolved non-Ready, encoded-size, layout contract, and fail-closed malformed.
- Issue B cannot yet include the exact live failing provider body; synthetic per-throw-site fixtures are required until a captured body exists.

**Required changes:**

- [x] Record honest gap: live unsupported body still missing; do not claim parser-variant classification beyond `semantic_result_validation_failure`

---

## Documentation Review

**Findings:**

- QA checkpoint amendment records **OWNER QA: FAIL** while preserving **FAIL WITH STRONG POSITIVE RESULTS**.
- VCP detailedDescription study correctly remains queued.

---

## Required Changes (approved_with_changes)

1. No speculative Semantic Review parser broadening without captured response fixture.
2. Deterministic blocker set difference is final authority; reviewer arrays are audit-only.
3. Align Playground and `aiEnrichmentCandidateCore` post-patch authority in the same corrective.
4. Large-image fix via preflight + analysis derivative; not Function memory alone.
5. Preserve Pass 1 quality on normal images; no v39/VCP schema changes.

---

## Blockers

None for planning. Implementation remains blocked on owner authorization:

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT POST-QA PASS 2 + LARGE-IMAGE CORRECTIVES]`

---

## Root-cause confirmations (review)

| # | Question | Answer |
| --- | --- | --- |
| 1 | 26 MB root cause | Raw base64 callable payload (~34.7 MiB) exceeds Gen2 32 MB HTTP limit before Function code |
| 2 | Encoding evidence | `imageBase64` raw base64; no data URL on callable; no client resize; 50 MB preflight |
| 3 | Unsupported Pass 2 shape/cause | Stage-proven `semantic_result_validation_failure` after HTTP 200 string; exact JSON shape **unknown** (`captureFullTrace: false`) |
| 4 | Diagnostics sufficient? | **Stage yes / body no** — category/stage/tokens/finishReason present; extracted content absent |
| 5 | Frankenstein remaining blocker | Reviewer `blockersUnresolved` re-injected after deterministic hardBlockers cleared |
| 6 | Who controls final outcome today? | Reviewer unresolved (when non-empty) overrides / pollutes final WAA |
| 7 | Dandelion-clock ineffective patch | Objects gap cleared deterministically but re-injected via unresolved; subjects still had `monster`; themes edit unrelated |
| 8 | UI layout root cause | Grid equal-height stretch + unbounded Validated `<pre>` |

---

## Active Processing impact

| Slice | Changes Active Processing today (SR OFF)? |
| --- | --- |
| A | No (Playground client path) |
| B | No behavioral accept/reject change; diagnostics only |
| C | Code path in candidate-core changes in repo; **live outcome unchanged while SR OFF**. When SR is enabled later, Pass 2 finals follow deterministic blocker diff |
| D | No |

---

## Future DEV deployment inventory (exact)

Minimum for owner Playground retest after implementation:

1. Local DEV Studio (Slices A/D + any Studio error/blocker display)
2. `testAiEnrichmentPlayground` — if server validation/constants/messages change
3. `testAiEnrichmentSemanticReviewPlayground` — required for B/C

Optional / separate owner authorization:

4. Processing Function(s) hosting `aiEnrichmentCandidateCore` — only if owner wants the dormant SR path deployed to DEV immediately

Never in this corrective without new authorization: production, Rules, indexes, migrations, Settings mutation, SR/Autonomous enablement.

---

## Proposed implementation files (exact)

### Slice A

- `apps/studio/src/renderer/src/features/settings/hooks/useAiEnrichmentPlayground.ts`
- `packages/shared/src/constants/aiEnrichment.constants.ts`
- `apps/studio/src/renderer/src/features/settings/utils/aiEnrichmentCallableError.ts`
- `apps/studio/src/renderer/src/features/settings/utils/aiEnrichmentCallableError.test.ts`
- Possibly Electron IPC + `apps/studio/electron/services/import/encodeWebpDerivative.ts` / derivative constants
- `functions/src/ai/aiEnrichmentPlayground.ts` (only if server parity needed)
- `functions/src/ai/prepareAiAnalysisImage.ts` (reuse contract; avoid unnecessary edits)

### Slice B

- `functions/src/ai/semanticReviewCore.ts`
- `functions/src/ai/semanticReviewProvider.ts`
- `functions/src/ai/semanticReviewPlayground.ts`
- `functions/src/ai/semanticReviewErrors.ts`
- Related `*.test.ts`
- Possibly `packages/shared/src/utils/aiEnrichmentTrace.ts` if patch scrubbing empties stage payloads

### Slice C

- `functions/src/ai/semanticReviewPlayground.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts`
- `functions/src/ai/semanticReviewCore.ts`
- `packages/shared/src/utils/semanticReviewPolicy.ts`
- `packages/shared/src/utils/semanticReviewPolicy.test.ts`
- Optionally `packages/shared/src/utils/catalogAutomationEvidence.ts` (+ tests) for apostrophe specificity fold
- `packages/shared/src/types/catalog/semanticReview.types.ts` if DTO adds derived fields
- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx` (display derived blockers)
- Pass 2 flow/hook/service mapping files if response fields change

### Slice D

- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx`
- `apps/studio/src/renderer/src/styles/components/settings.css`
- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.playgroundPass2.contract.test.ts`

---

## Verdict Rationale

The Plan is evidence-complete for A/C/D and correctly marks B’s remaining body gap. The recommended Pass 2 effectiveness contract matches product intent and ADR-FP-182 deterministic final authority. Conditional approval binds the non-negotiable authority and anti-speculation rules without blocking planning closure.

## Next Step

Stop for owner implementation authorization. Do **not** implement, deploy, invoke providers/callables, or mutate Settings until:

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT POST-QA PASS 2 + LARGE-IMAGE CORRECTIVES]`
