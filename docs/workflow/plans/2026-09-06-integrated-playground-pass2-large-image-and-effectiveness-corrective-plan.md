# Corrective Plan — Integrated Playground Large-Image + Pass 2 Effectiveness

| Field | Value |
| --- | --- |
| Date | 2026-09-06 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Parent program | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | `two-pass-ai-enrichment-context-and-semantic-verification-implementation` |
| Corrective | Post-deployment evidence-bearing Playground QA corrective |
| Environment | `fresh-prints-dev` |
| Production | NOT AUTHORIZED |
| Related Formal Review | `docs/workflow/reviews/2026-09-06-integrated-playground-pass2-large-image-and-effectiveness-corrective-review.md` |
| QA checkpoint | `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-dev-deployment-qa-checkpoint.md` |

---

## Goal

Correct four independently testable defects found during owner evidence-bearing QA after the Pass 2 diagnostics deployment, without destabilizing the strong repeated Pass 1 quality observed on normal-sized artwork, and without changing Pass 1 v39, VCP schema, or enabling Semantic Reviewer / Autonomous / Y2 / Gate C / WS6.

## Background

Owner retest disposition:

> **OWNER QA: FAIL** — Strong repeated Pass 1 quality; actionable runtime and Pass 2 effectiveness defects remain.

Historical disposition **FAIL WITH STRONG POSITIVE RESULTS** is preserved. Prior diagnostics corrective is deployed at:

- `testAiEnrichmentPlayground` → `testaienrichmentplayground-00071-xey`
- `testAiEnrichmentSemanticReviewPlayground` → `testaienrichmentsemanticreviewplayground-00012-tiy`

## Guardrails

- No Pass 1 v39 prompt/schema change.
- No VCP schema change; do not remove/shorten `detailedDescription`.
- No automatic Semantic Reviewer enablement; Autonomous remains OFF.
- No production deploy; DEV only after separate owner authorization.
- Original production artwork must never be mutated by Playground analysis derivatives.
- Do not solve callable payload overflow solely by increasing Function memory.
- Do not broaden Semantic Review parser acceptance without an exact captured response shape proving the variant is legitimate.
- Pass 2 remains text-only, one attempt per Pass 1 result, fail-closed.
- `APPROVE_WITH_PATCH` remains intermediate reviewer output, never final catalog authority.

## Scope

### In Scope

| Slice | Title |
| --- | --- |
| A | Large-image Pass 1 request handling (preflight + AI-analysis derivative) |
| B | Unsupported Pass 2 response classification / diagnostic fidelity (no speculative parser broaden) |
| C | Pass 2 blocker-resolution effectiveness (deterministic blocker diff authority) |
| D | Semantic Review Decision / Validated Patches result-card layout |

### Out of Scope

- VCP `detailedDescription` redundancy study
- Pass 1 v39 changes
- Automatic Semantic Reviewer enablement, Autonomous, Y2, Gate C, WS6
- Production deploy, Rules/indexes/migrations, Settings mutation
- Commit / push unless separately requested

---

## Evidence summary (read-only; no provider/callable invocation)

### Pass 1 quality retained

Designs 1, 2, and 5: Shadow Approve ×5 each, owner-judged accurate. Design 4 (~26 MB) is the primary Pass 1 failure case.

### Issue A — encoding / size

| Fact | Evidence |
| --- | --- |
| Callable field is raw base64 `imageBase64` | `useAiEnrichmentPlayground.encodeFileToBase64` → `AiEnrichmentPlaygroundRequest.imageBase64` |
| Client preflight allows 50 MB; no dimension check; no client resize | `AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES = 50 * 1024 * 1024`; `resolveSelectedImageError` |
| Server resize (`prepareAiAnalysisImage` → 1024 WebP) runs only after receipt | `functions/src/ai/aiEnrichmentPlayground.ts`, `prepareAiAnalysisImage.ts` |
| ~26 MB raw → ~34.7 MiB base64 alone | `4 * ceil(n/3)` with n = 26 × 1024² |
| Gen2 HTTP uncompressed request max | 32 MB (Firebase docs) |
| UI copy | `functions/internal` / `unknown_internal` → `The Playground request failed unexpectedly. No changes were applied.` |
| DEV log support | Pass 1 Cloud Run ERROR `Invalid request, unable to process.` (Firebase HTTPS layer) contemporaneous with oversized attempts; Function application code never reached for those rejects |
| Production AI already uses derivatives | Catalog path uses preview ≤1280 WebP / 10 MB then `prepareAiAnalysisImage`; originals untouched |

### Issue B — unsupported response

Captured failed Pass 2 trace:

| Field | Value |
| --- | --- |
| Pass 2 trace ID | `b5189149-ef31-4912-b806-cd996a32b5a3` |
| Pass 1 parent | `49355c93-33a1-4fa5-8b94-d21575e7b6b4` |
| Timestamp | `2026-09-07T03:24:48.982Z` → `03:24:49.760Z` |
| Provider / model | `google` / `gemini-2.5-flash-lite` |
| Prompt version | `catalog-semantic-review-v2` |
| Lifecycle | `created` → `prompt_ready` → `request_sent` → `provider_response` → `failed` |
| HTTP / finish | `200` / `stop` |
| Content shape | `string` (`responseChoiceCount: 1`, `responseHasMessage: true`) |
| Tokens | prompt 1332 / completion 158 |
| Category / stage | `semantic_result_validation_failure` / `semantic_result_validation` |
| Rejection | `Malformed semantic review response.` |
| Full capture | `captureFullTrace: false` — **no raw body / extracted JSON in bounded trace** |

Second failure (related, not the owner “unsupported” copy alone): `f2d277ef-…` = `patch_validation_failure` / canonical no-op (diagnostics working as designed).

Successful comparison: `2e7e8047-18f1-439e-b1ca-0cba99816b3a` (same model/revision family) reached `complete` with parseable `APPROVE_WITH_PATCH`.

**Classification:** Provider returned a non-empty HTTP 200 string that passed extraction into the semantic-result validator and failed there. Exact subclass among A/D/F (invalid output vs schema conflict vs parser bug on a legitimate variant) **cannot** be assigned without the extracted JSON/decision shape. Diagnostics are **stage-sufficient**, **body-insufficient**.

### Issue C — blocker effectiveness

Frankenstein success-path evidence (`2e7e8047-…`):

- Input subjects: `Frankenstein's monster`, `monster`, `dandelion`
- Effective subjects after patch: `Frankenstein's monster`, `dandelion`
- Reviewer: `APPROVE_WITH_PATCH`, `blockersResolved: []`, `blockersUnresolved: ["subject_specificity_risk:monster"]`
- Post-patch deterministic `hardBlockers`: **`[]`**
- Final reasonCodes still include `subject_specificity_risk:monster` + `semantic_review_needs_review` via merge of reviewer unresolved

Dandelion-clock evidence (`d1f1c44f-…`):

- Objects patched `dandelion clock`/`seeds` → `dandelion`/`dandelion seeds`; themes also changed
- Subjects still contained bare `monster`
- Reviewer left both `structured_evidence_gap:objects:dandelion clock` and `subject_specificity_risk:monster` unresolved
- Final `hardBlockers` retained only `subject_specificity_risk:monster` (deterministic); `structured_evidence_gap:objects:dandelion clock` appears in reasonCodes via reviewer merge despite objects no longer containing that token

Root authority bug (Playground):

```ts
// semanticReviewPlayground.ts — after computeCatalogAutomationDecision(effective…)
if (decision === "NEEDS_REVIEW" || blockersUnresolved.length > 0) {
  // merges reviewer unresolved into reasonCodes and forces needs_review
}
```

Production candidate core is worse when unresolved is non-empty: it **skips** post-patch recompute and keeps pre-patch reasonCodes + unresolved.

Prompt/contract gaps: `catalog-semantic-review-v2` does not require blocker partition, patch relevance, or forbid cosmetic dimension edits on `APPROVE_WITH_PATCH`.

Secondary specificity false-positive: apostrophe tokenization (`frankenstein's` → `frankensteins`) can emit `subject_specificity_risk:monster` even when `Frankenstein's monster` is already present — contributes to initial emission; not the post-patch carry-forward.

### Issue D — layout

- Markup: `SettingsPage.tsx` Decision + Validated patches inside `.settings-playground-context-grid`
- CSS: grid default `align-items: stretch`; Validated `<pre>` lacks `.settings-playground-profile-card` max-height/overflow rules already used by Original/Effective/Final WAA cards

---

## Slice A — Large-image request handling

### Exact root cause

Client sends full-file raw base64 in the Gen2 callable JSON. A ~26 MB source encodes to ~34.7 MB base64 alone, exceeding the 32 MB uncompressed HTTP request limit before `runAiEnrichmentPlayground` / `prepareAiAnalysisImage`. Client 50 MB preflight is above the transport ceiling.

### Implementation boundary

1. **Deterministic client preflight** accounting for base64 overhead before callable:
   - Safe raw ceiling ≈ `floor(32 MiB * 3/4)` minus JSON wrapper headroom (plan constant; do not invent provider limits).
   - Reject with a clear oversized-image message when a derivative cannot be produced safely.
2. **Automatic AI-analysis derivative** before callable for oversized (and optionally always for consistency with production):
   - Prefer matching the existing analysis canvas contract: contain/extend/flatten → **1024 WebP ~Q82** (`prepareAiAnalysisImage` semantics).
   - Reuse Electron/import derivative helpers via IPC where Studio already has Sharp/WebP encode (`encodeWebpDerivative`, derivative constants), or a bounded renderer canvas path if IPC is unnecessary for Playground-only.
   - Original `File` / production artwork remains untouched; only the ephemeral Playground request payload uses the derivative.
3. Align `AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES` / messaging with the encoded transport ceiling **or** keep a higher selection cap only if derivative path always reduces below ceiling.
4. Map remaining true transport rejects to a size-specific Studio message where detectable; keep unexpected copy for genuine unknowns.
5. Do **not** raise Function memory as the fix.

### Exact files (expected)

- `apps/studio/src/renderer/src/features/settings/hooks/useAiEnrichmentPlayground.ts`
- Possibly Electron IPC + `apps/studio/electron/services/import/encodeWebpDerivative.ts` / derivative constants
- `packages/shared/src/constants/aiEnrichment.constants.ts`
- `apps/studio/src/renderer/src/features/settings/utils/aiEnrichmentCallableError.ts` (+ tests)
- `functions/src/ai/aiEnrichmentPlayground.ts` (validation/docs parity only if needed; server `prepareAiAnalysisImage` remains)
- Tests under Studio Settings + shared constants

### Tests

- 26 MB-style fixture / encoded-size preflight
- Encoded-size accounting math
- Derivative does not mutate original bytes/path
- Derivative fidelity constraints (format WebP/PNG/JPEG as chosen from existing helpers; transparency flattened per `prepareAiAnalysisImage`)
- Request under proven transport ceiling
- Ordinary small images unchanged
- Clear user-facing oversized error/fallback

### Deployment inventory (future DEV)

- Studio local DEV rebuild/restart for client derivative path
- `testAiEnrichmentPlayground` **only if** server validation constants/messages change
- Not required: Semantic Review callable, Processing Functions, Rules, indexes

### Safety / authority

- Playground-only analysis derivative; no catalog write; no original mutation
- Active Processing already uses Storage preview + `prepareAiAnalysisImage` — **unchanged** if Slice A stays Playground client-side

---

## Slice B — Unsupported Pass 2 response classification / correction

### Exact root cause

Intermittent owner “unsupported Semantic Review response” maps to categories `response_extraction_failure` | `malformed_json` | `semantic_result_validation_failure` | `patch_validation_failure`. The captured post-deploy failure is **`semantic_result_validation_failure`** after a normal HTTP 200 string response. Exact failing JSON/decision/field is **not** in bounded traces (`captureFullTrace: false`; generic rejectionReason).

### Implementation boundary

1. **Do not** broaden `parseSemanticReviewResult` to accept new shapes without a captured fixture proving the shape.
2. Harden diagnostics so the next failure is classifiable:
   - Granular `rejectionReason` / structured validation fault (which check failed: decision, reason, blockers arrays, patch map, etc.)
   - Bounded sanitized excerpt of extracted text or top-level JSON keys/decision string on validation failure (redacted; no secrets; length-capped)
   - Keep full raw provider body owner-gated via existing `captureFullTrace`
3. Add regression fixture from the **known** failure class once a body is captured; until then, unit-test the granular validation fault paths with synthetic fixtures that match each throw site.
4. Retain fail-closed behavior for truly malformed output.
5. Optional secondary: fix stage serialization that stores empty patch `from`/`to` in bounded traces while effective profile shows application (observed `patches: [{}]` / empty arrays) — diagnostics fidelity only.

### Exact files (expected)

- `functions/src/ai/semanticReviewCore.ts`
- `functions/src/ai/semanticReviewProvider.ts`
- `functions/src/ai/semanticReviewPlayground.ts`
- `functions/src/ai/semanticReviewErrors.ts`
- Tests: `semanticReviewCore.test.ts`, `semanticReviewProvider.test.ts`, `semanticReviewPlayground.test.ts`
- Possibly `packages/shared/src/utils/aiEnrichmentTrace.ts` if scrub/serialization empties patch arrays incorrectly

### Tests

- Fixture for each validation fault subclass
- Successful response fixture unchanged
- Fail-closed malformed
- No speculative parser acceptance
- Trace diagnostics include category + granular reason without raw secrets

### Deployment inventory (future DEV)

- `testAiEnrichmentSemanticReviewPlayground`
- Possibly shared types only (no Processing deploy unless shared package forces Functions rebuild of that callable)

### Safety / authority

- Fail-closed retained
- No authority change
- Active Processing unchanged while Semantic Reviewer remains OFF

---

## Slice C — Pass 2 blocker-resolution effectiveness

### Exact root cause

Final WAA / displayed unresolved blockers trust reviewer `blockersUnresolved` (and production may skip post-patch recompute). Validated patches can clear deterministic risks while reviewer self-report re-injects stale codes. Prompt allows `APPROVE_WITH_PATCH` with empty resolved + stale unresolved and unrelated dimension patches.

### Recommended contract (Formal Review must approve)

1. Pass 2 receives exact eligible semantic blockers.
2. Patches focus on resolving those blockers.
3. Unrelated cosmetic changes alone are not sufficient for effective approval-looking outcomes.
4. Validated patches apply; original profile immutable.
5. Deterministic blocker logic **always** reruns on effective Smart Profile + same evidence inputs (including structured VCP when available).
6. Derive:
   - `resolvedBlockers = initialEligibleBlockers − finalEligibleBlockers`
   - `unresolvedBlockers = finalEligibleBlockers`
7. A blocker is resolved only if absent after deterministic recomputation.
8. Zero resolved eligible blockers ⇒ no effective Ready / approval-looking final solely because patches exist.
9. If all eligible semantic blockers clear and no objective blocker remains ⇒ deterministic WAA may produce Ready candidate (shadow rules unchanged).
10. Any required unresolved eligible blocker ⇒ Needs Review.
11. `APPROVE_WITH_PATCH` remains intermediate only.
12. Model `blockersResolved` / `blockersUnresolved` become audit/telemetry only (optional display as “reviewer-reported”), not final authority.

### Implementation boundary

1. Shared helper to derive deterministic resolved/unresolved from before/after eligible sets.
2. Playground: always recompute after patch; **remove** merge that ORs reviewer unresolved into final reasonCodes; set response/UI blockers from derived sets.
3. Production `aiEnrichmentCandidateCore`: always recompute after patch; same derivation; pass `visualContextProfile` into decision for parity with Playground when available.
4. Narrow prompt/schema addendum on `catalog-semantic-review-v2` (or additive instruction only — **not** Pass 1 v39):
   - Address supplied eligible blockers
   - Prefer patches that clear those blockers
   - Avoid unrelated cleanup
   - `APPROVE_WITH_PATCH` only when proposing patches intended to clear blockers; else `NEEDS_REVIEW`
5. Optional narrow specificity false-positive fix: compare grounded phrases to subjects with the same canonical fold used for tokens (apostrophe asymmetry) — keep scoped; add Frankenstein regression.
6. Retain: objective non-override, protected fields, text-only Pass 2, one-attempt, stale/no-op patch rejection.

### Exact files (expected)

- `functions/src/ai/semanticReviewPlayground.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts`
- `functions/src/ai/semanticReviewCore.ts` (prompt instruction)
- `packages/shared/src/utils/semanticReviewPolicy.ts` (+ tests)
- `packages/shared/src/utils/catalogAutomationEvidence.ts` (optional specificity fold fix)
- `packages/shared/src/types/catalog/semanticReview.types.ts` (if response DTO adds derived fields)
- Studio display: `SettingsPage.tsx` / Pass 2 result mapping to show derived blockers
- Tests listed below

### Tests

- Frankenstein's-monster regression: meaningful subjects patch clears specificity when deterministic state supports it
- Stale reviewer unresolved cannot survive solely via carry-forward
- Unrelated cosmetic patch cannot count as resolution
- Zero resolved ⇒ no effective Ready
- One/some/all resolution semantics via set difference
- Objective blockers still non-overridable
- Protected fields still protected
- Original profile immutable
- Text-only / one-attempt / no-op / stale rejection retained
- Production candidate-core path unit coverage for always-recompute + derived blockers

### Deployment inventory (future DEV)

- `testAiEnrichmentSemanticReviewPlayground` (required)
- `enqueueAiEnrichment` / Processing path **only if** owner explicitly authorizes deploying candidate-core changes; with `semanticReviewerEnabled: false`, live Processing does not invoke Pass 2 today, but deploying candidate-core still changes dormant code on that Function
- Studio local for UI blocker display

### Safety / authority

- Strengthens deterministic final authority (aligned with ADR-FP-182 intent)
- **Active Processing behavior:** unchanged while Semantic Reviewer remains OFF. If SR is later enabled, final WAA after Pass 2 would follow deterministic blocker diff rather than reviewer self-report — intentional authority fix, requires owner awareness

---

## Slice D — Semantic Review result-card layout

### Exact root cause

`.settings-playground-context-grid` stretches equal-height columns; Validated patches `<pre>` is unbounded while Decision content is short.

### Implementation boundary

1. Add `align-items: start` to `.settings-playground-context-grid`.
2. Apply existing `settings-playground-profile-card` to Validated patches card (reuse `max-height: 34rem; overflow-y: auto`).
3. No new UI dependency/framework; no manual textarea reintroduction.

### Exact files

- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx`
- `apps/studio/src/renderer/src/styles/components/settings.css`
- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.playgroundPass2.contract.test.ts` (extend)

### Tests

- Source-contract asserts profile-card / align-items / bounded scroll presence
- Existing tabs/results remain

### Deployment inventory

- Studio local only (no Functions)

### Safety / authority

- Presentation only

---

## Affected Areas

### Architecture Impact

- [x] Details: Playground request path gains client AI-analysis derivative; Pass 2 final authority shifts from reviewer self-report to deterministic blocker set difference; shared Production candidate-core aligned when SR enabled later.

### Security Impact

- [x] Details: Bounded sanitized validation excerpts must not leak secrets/raw credentials; existing redaction serializer retained; no new public endpoints.

### Data Model Impact

- [ ] None for persisted catalog entities. Trace diagnostics fields may gain granular rejection metadata (ephemeral traces).

### Backend Impact

- [x] Details: DEV Functions inventory above; no env/secret changes; no Rules/indexes.

### UI / UX Impact

- [x] Details: Playground oversized-image messaging; Pass 2 blocker display may show derived resolved/unresolved; Decision/Validated cards scroll uniformly. Manual owner QA required after DEV deploy.

### Migration Impact

- [ ] None

---

## Approach

1. Formal Review approval + owner implementation authorization.
2. Implement Slice C first (highest semantic priority), then A, B, D (order may parallelize where files do not conflict).
3. Scoped automated tests per slice.
4. Implementation Review.
5. Owner-authorized DEV deploy of exact Function inventory + local Studio.
6. Owner evidence-bearing QA retest.

## Test Strategy

### Automated

| Check | Command | Required |
| --- | --- | --- |
| Functions AI / semantic tests | `npm test` focused suites under `functions` | yes |
| Shared policy/evidence/decision tests | shared package focused tests | yes |
| Studio Settings / Pass 2 contract | Studio focused tests | yes |
| Functions build | `npm run build` in `functions` | yes |
| Lint on touched files | project ESLint | yes |
| Full Studio typecheck/build | document accepted pre-existing exception if unchanged | yes (honest) |

### Manual

- Owner DEV Playground QA: normal image Pass 1 still strong; ~26 MB (or derivative) succeeds or clear error; Pass 2 clears eligible blockers when patches are meaningful; unsupported path still fail-closed with better diagnostics; layout no longer stretches Decision empty.

## Human Checkpoints Anticipated

- [x] Owner implementation authorization (`[NEEDS OWNER AUTHORIZATION: IMPLEMENT POST-QA PASS 2 + LARGE-IMAGE CORRECTIVES]`)
- [x] Owner DEV deploy authorization (separate, after implementation)
- [x] Owner evidence-bearing QA after deploy
- [ ] Production deploy — not in this corrective
- [ ] Semantic Reviewer / Autonomous enablement — not in this corrective

## Risks & Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Client derivative reduces AI fidelity | Medium | Match production 1024 WebP analysis canvas; owner QA on text/subjects/colors |
| Speculative parser broaden | High | Forbidden without captured body fixture |
| Processing authority surprise if SR enabled later | Medium | Document explicitly; keep SR OFF; align candidate-core intentionally |
| Destabilize normal Pass 1 | High | Leave small-image path unchanged; regression on ordinary sizes |

## Rollback Plan

- Revert Studio client/CSS changes locally.
- Redeploy prior DEV Function revisions for touched callables only.
- No catalog data migration to roll back.

## Documentation Updates Required

- [ ] TESTING.md only if new commands/fixtures are added
- [ ] DECISIONS.md only if Formal Review records a new ADR-worthy authority clarification
- [x] QA checkpoint amendment (this workflow)
- [x] Workflow state / CURRENT-STATE handoff

## Open Questions

- [ ] Owner chooses whether Production Function deploy for candidate-core is authorized with this corrective or deferred while SR remains OFF (Playground-only deploy still unblocks QA).
- [ ] Exact client derivative host (renderer canvas vs Electron Sharp IPC) — implementer selects the existing supported path that preserves transparency/flatten behavior without new dependencies.

## Approval

- Review doc: `docs/workflow/reviews/2026-09-06-integrated-playground-pass2-large-image-and-effectiveness-corrective-review.md`
- Verdict: pending Formal Review
