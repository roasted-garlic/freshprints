# Corrective Plan — Integrated Playground Pass 2 QA Runtime Correctness

**Date:** 2026-09-06  
**FreshForge command:** Continue Workflow  
**Parent workstream:** `smart-catalog-intelligence-completion-and-legacy-tag-retirement`  
**Workstream:** `two-pass-ai-enrichment-context-and-semantic-verification-implementation`  
**Corrective:** Integrated Playground Pass 2 owner-QA runtime correctness and reliability  
**Phase:** Evidence Investigation → Corrective Plan → Formal Review → Implementation → Test → Implementation Review  
**Environment:** `fresh-prints-dev`  
**Production:** not authorized or touched  
**Implementation authorization:** granted by owner on 2026-09-06 with `AUTHORIZE IMPLEMENTATION OF REVIEWED PASS 2 QA CORRECTIVES`

## 1. Purpose and disposition

Owner QA is recorded as:

> **FAIL WITH STRONG POSITIVE RESULTS**

The integrated Playground is materially usable: the Pass 2 UI is present, the retired standalone manual workflow is gone, Pass 1 structured output and Visual Context Profile are strong, eligible reviews can be started without copy/paste, successful reviews return the expected decision/profile/WAA/cost fields, and deterministic WAA remains authoritative.

Three blocking defects remain:

1. the `structured_evidence_gap:objects:cowboy hat` result conflicts with the displayed Visual Context Profile and can accept a literal no-op patch;
2. at least two Pass 2 attempts fail as `Malformed semantic review response.` while successful attempts prove the callable/provider path is not universally broken; and
3. the Playground can show a broad “unavailable” message even when the deployed callable is ACTIVE.

This document is an investigation-backed implementation plan only. It authorizes no code change, provider request, Firebase callable invocation, setting mutation, deployment, Y2/reprocessing, Semantic Reviewer or Autonomous enablement, commit, push, or production action.

## 2. Guardrails

The corrective must preserve the already approved contracts:

- Pass 2 is conditional and at most one call is allowed per Pass 1 result.
- `approve_with_patch` is not final approval.
- Objective blockers cannot be overridden by semantic review.
- Final deterministic WAA is recomputed after any accepted patch and remains authoritative.
- Unresolved semantic blockers, failed calls, malformed output, and unsafe patches fail closed to Needs Review.
- Staff-owned/protected fields remain unpatchable.
- No change to the v39 Pass 1 prompt, schema, provider/model selection, Visual Context Profile dimensions, or VCP distillation.
- No image is resent in Pass 2.
- No additional AI call may be made for diagnostics or trace collection.
- No raw secret, authorization header, API key, Firebase credential, or unsafe provider payload may be logged or persisted.
- No broad speculative provider-response shape expansion is permitted without a captured fixture proving that shape is a real response.

## 3. Evidence collected without invoking AI

### 3.1 Owner QA evidence retained

The owner supplied the following exact observation for one successful Pass 1 followed by Pass 2:

```text
Smart Profile.objects = ["Suede jacket", "Cowboy hat"]
decision preview = structured_evidence_gap:objects:cowboy hat
Pass 2 patch = { field: "objects", from: ["Suede jacket", "Cowboy hat"], to: ["Suede jacket", "Cowboy hat"] }
post Pass 2 blocker = structured_evidence_gap:objects:cowboy hat
WAA = needs_review
```

The owner also reported that successful Pass 2 calls return decision, patches, effective profile, final WAA, and cost, while at least two other attempts display `Malformed semantic review response.`

The QA disposition is therefore not “all functionality failed”; it is **FAIL WITH STRONG POSITIVE RESULTS**, with the three defects evaluated independently.

### 3.2 Checked-in source evidence

The audit inspected these current source paths and symbols:

| Source | Relevant evidence |
| --- | --- |
| `packages/shared/src/utils/smartCanonicalKey.ts` | `smartCanonicalKey` lowercases, folds punctuation/separators, and applies only bounded obvious plural folding. |
| `packages/shared/src/utils/smartProfileNormalization.ts` | `normalizeSmartProfileStringList` deduplicates using the canonical key; `normalizeDesignSmartProfile` applies the dimension normalizer and records the normalizer version. |
| `packages/shared/src/utils/catalogAutomationEvidence.ts` | `normalizeEvidenceCorpus` lowercases; `findStructuredEvidenceGaps` checks title, description, central subject, and visible text, but has no VCP input. The object reason code lowercases the token. |
| `packages/shared/src/utils/catalogAutomationDecision.ts` | The decision calls `findStructuredEvidenceGaps` without VCP or `centralSubject`. |
| `functions/src/ai/aiEnrichmentPlayground.ts` | Pass 1 builds `originalSmartProfile` from the normalized Pass 1 result and computes the initial decision from title, description, and visible text. The response carries `pass1Context`, but the persisted Playground trace does not currently copy that context into a top-level profile/decision field. |
| `functions/src/ai/semanticReviewPlayground.ts` | Pass 2 eligibility recomputes from the request’s `originalSmartProfile`; post-patch WAA recomputes from the effective profile and the same textual evidence inputs. VCP is present for reviewer input but is not supplied to the deterministic evidence check. |
| `functions/src/ai/semanticReviewCore.ts` | Parser accepts canonical patch arrays and a bounded field-map shorthand, but no-op `from`/`to` equality is not rejected. Application blindly assigns `patch.to` before deterministic recomputation. |
| `functions/src/ai/semanticReviewProvider.ts` | Provider request is text-only. Response extraction accepts a string or an array of `{type: "text", text}` parts, then parses JSON and applies the strict semantic result parser. No trace or parser-stage diagnostic is emitted. |
| `functions/src/testAiEnrichmentSemanticReviewPlayground.ts` | All thrown errors from the Pass 2 runner are wrapped as `invalidArgument(error.message)`, losing a stable distinction between provider, parser, transport, and business precondition failures. |
| `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentPlaygroundService.ts` | `functions/unavailable`, `functions/internal`, and `functions/not-found`, plus several network-like strings, are mapped to the same deployment/unavailability copy. |
| `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentSemanticReviewPlaygroundService.ts` | The Pass 2 service currently delegates directly to `callTracedFunction` and has no semantic-review-specific error classification. |
| `packages/shared/src/types/ai/aiEnrichmentTrace.types.ts` | The canonical trace model already has `pass2`, `providerError`, normalized/profile/VCP/decision/persistence fields, and the `PLAYGROUND` source. |
| `functions/src/ai/aiEnrichmentTraceStore.ts` | Existing bounded/full Firestore trace writes are fail-soft and use the shared redacting serializer. |
| `functions/src/ai/aiEnrichmentTraceArtifacts.ts` | Existing test artifact destination is `.tmp/ai-enrichment-traces`; it is repo-local and must remain uncommitted. |

### 3.3 DEV evidence

Read-only DEV checks confirmed:

- `testAiEnrichmentPlayground` was ACTIVE at revision `testaienrichmentplayground-00070-mil`.
- `testAiEnrichmentSemanticReviewPlayground` was ACTIVE at revision `testaienrichmentsemanticreviewplayground-00011-xap`.
- Both were in `fresh-prints-dev` / `us-central1`, with source hash `303f6cd59782680602bcb04b81c683b199caba73`.
- Cloud Run logs showed callable verification and normal Playground start/completion events, but no `Malformed semantic review response.` entries, semantic parser rejection events, or the exact UI unavailable copy.
- The bounded trace collection contained Pass 1 Playground traces only. The inspected complete trace for the observed artwork contained the normalized object list and VCP, but no Pass 2 trace, `pass1Context` snapshot, or Pass 2 parser/error record.
- The current semantic-review callable source contains no `writeAiEnrichmentTrace` call and no provider/parser diagnostic logger.

No Pass 1, Pass 2, Gemini, OpenAI, Firebase callable, settings mutation, deployment, or production operation was performed for this investigation.

## 4. Root-cause findings

### Issue A — VCP/profile evidence mismatch and literal no-op patch

#### Confirmed findings

1. `Cowboy hat` and `cowboy hat` compare equal under the current evidence implementation. The corpus and reason code both lowercase, and the Smart Profile canonical key also folds case. **Case sensitivity is not the cause.**
2. No stale-display or separate import/staff merge is shown by the checked-in Pass 2 path. The callable accepts a typed `originalSmartProfile`, uses it for eligibility, and clones it for projection. The owner’s displayed profile matches the exact profile values quoted above.
3. The deterministic evidence corpus does not include the VCP. The observed Pass 1 VCP does contain `Cowboy hat`, while the title, description, and visible text supplied to the evidence helper do not.
4. The blocker is therefore deterministic under the current textual-evidence policy, but inconsistent with the owner-visible VCP expectation. The precise defect is an **evidence-source contract mismatch**, not a case or normalization bug.
5. The persisted trace lacks the exact `pass1Context.originalSmartProfile`, initial eligibility decision, and semantic request snapshot, so the current Inspector cannot independently prove the displayed-vs-requested profile identity. This is an observability gap, not evidence of a second profile being used.

#### No-op patch cause

`validateSemanticReviewPatches` currently validates field allowlisting, array shape, and string values. It does not compare a normalized `from` value with a normalized `to` value or verify that `from` matches the effective field. `applySemanticReviewPatches` then assigns `to`, and deterministic recomputation sees the same object list and leaves the blocker in place. Thus `APPROVE_WITH_PATCH` can be returned for a patch with no semantic effect.

#### Planned correction

Use one explicit evidence-source contract for integrated Playground eligibility and post-patch recomputation. The corrective implementation must decide and test the bounded VCP contribution: VCP fields that explicitly describe visible objects may be supplied as additional visual evidence for eligible semantic structured-evidence blockers, while objective blockers and the deterministic authority sequence remain unchanged. The initial and final decisions must consume the same evidence inputs.

The patch validator must canonicalize both sides with the same Smart Profile dimension equivalence, reject a `from` mismatch, and reject a `from`/`to` pair that is equal after canonicalization (including order-insensitive dimension-list equality). A no-op cannot produce effective `APPROVE_WITH_PATCH`; the result must fail closed to a review-needed outcome.

### Issue B — malformed Pass 2 responses

#### Confirmed findings

- The provider path is not universally unavailable: owner QA reported successful Pass 2 responses, and the callable is ACTIVE.
- The current extraction/parser chain has bounded accepted forms: `choices[0].message.content` must be a string or a nonempty array of text parts; JSON extraction must produce an object; `decision` and nonempty `reason` are required; optional blocker arrays must be arrays; patch arrays/maps must satisfy the patch validator.
- Invalid content can collapse to `{}` in `extractJsonObject`, after which the parser emits only `Malformed semantic review response.`
- The callable converts every runner error to `invalid-argument` with only the message. There is no stable error class, parser stage, provider HTTP status, finish reason, response shape, or bounded trace record.
- No current DEV trace or Cloud log record contains the two failing response bodies or enough metadata to correlate them. Therefore the underlying live response cannot be honestly classified from current evidence as provider-invalid, a supported-but-unhandled variant, schema/prompt mismatch, parser bug, transport/truncation, or another class.

#### Required classification during authorized implementation

For each already-observed failure that can be correlated from available owner/DEV records, capture only sanitized metadata and classify it as one of:

- **A — invalid provider output, fail closed**;
- **B — valid bounded variant not currently normalized**;
- **C — schema/prompt mismatch**;
- **D — parser/normalizer defect**;
- **E — transport/truncation**; or
- **Other — documented with evidence.**

If no exact raw response or fixture exists, the result must remain “unclassified due to missing evidence,” not a speculative shape expansion. The implementation may add diagnostics and fixture coverage, but may not invoke another provider as part of this plan-only task.

#### Planned correction

Instrument the existing Pass 2 trace path and provider boundary with sanitized, bounded diagnostics: trace/run identity, timestamp, provider/model, prompt version, HTTP status, usage/finish reason, response shape, extraction stage, parser/normalizer stage, and a safe rejection classification. The actual raw provider body is allowed only under the existing owner-controlled full-trace redaction rules; bounded traces retain shape and reason, not secrets or unsafe content.

Use the exact observed failure fixture to correct only a proven parser/normalizer gap. Preserve fail-closed behavior for malformed, truncated, null, omitted, JSON-as-text, invalid decision, invalid blocker array, invalid patch, and unsupported response shapes. Add no AI call for trace collection.

### Issue C — misleading Playground-unavailable message

#### Confirmed findings

- The two reviewed Functions were ACTIVE in DEV at the recorded revisions.
- The Pass 1 Studio service maps `functions/unavailable`, `functions/internal`, `functions/not-found`, and several network-looking errors to the same “Confirm Cloud Functions are deployed” message.
- The Pass 2 service has no equivalent user-facing classifier, while the backend wraps all runner errors as `functions/invalid-argument`.
- No exact client error object, request timestamp, matching Cloud log, or UI trace was captured for the unavailable observation. The specific triggering category is therefore unresolved.

#### Root cause

The proven application defect is overly broad client-side mapping in the Playground error surface and an undifferentiated backend error boundary. The evidence does not prove that the observed event was a function outage. It could have been a transport/runtime/provider/parser or callable error that was presented as deployment unavailability. The corrective must distinguish the categories without exposing unsafe provider details.

#### Planned correction

Introduce bounded, stable classification at the semantic-review callable/service boundary and map only true Function-unavailable/not-found, auth/permission, timeout/network, upstream provider failure, malformed provider response, business precondition, and unknown internal errors to separate Studio messages. Keep diagnostic detail in sanitized trace/log fields and preserve user-safe copy in the UI. A callable being ACTIVE must not be presented as proof that every upstream/provider request succeeded.

## 5. Implementation slices after owner authorization

The following slices are intentionally sequenced so each can be tested without changing the approved product boundaries:

1. **Trace and correlation contract:** carry the Pass 1 trace identity/context into the integrated Pass 2 call and persist bounded Pass 2 lifecycle/diagnostic stages in the existing `PLAYGROUND` trace shape. Add full-trace fields only through the existing redacting serializer.
2. **Evidence-source parity:** introduce the narrow optional VCP evidence input needed by Playground initial eligibility and final WAA recomputation. Keep the textual corpus behavior unchanged when the optional input is absent; do not alter Processing behavior by deployment or implicit defaults.
3. **No-op/authority validation:** normalize patch `from`/`to`, reject stale `from` values and canonical no-ops, keep protected-field rejection, apply only meaningful patches, and recompute deterministic WAA. Ensure objective blockers and unresolved semantic blockers remain authoritative.
4. **Provider/parser diagnosis:** add structured sanitized failure classification around extraction, JSON parsing, schema/result validation, and provider transport. Correct only response variants supported by captured evidence; keep all unsupported forms fail-closed.
5. **Callable/UI error mapping:** preserve stable safe error categories from the callable and give Pass 2 its own mapping so provider/parser failures are not labeled as an unavailable deployment.
6. **Focused regression tests:** add the tests in Section 6, then run the complete scoped validation contract in Section 7.

## 6. Required tests

### Shared decision and profile tests

- `Cowboy hat`/`cowboy hat` canonical equivalence.
- A VCP-supported object does not remain a semantic evidence blocker when the same VCP evidence contract is supplied to initial and final Playground decisions.
- An object absent from all accepted evidence remains blocked.
- Initial and final decisions use identical evidence inputs.
- VCP evidence cannot clear objective blockers, title/description/category blockers, or protected-field constraints.

### Semantic parser and patch tests

- canonical array response, Gemini text-part response, and the exact captured failure fixture(s);
- null/omitted/malformed content, malformed JSON, JSON wrapped as text, truncation, invalid decision/reason, invalid blocker arrays, invalid patch arrays, invalid map shorthand;
- canonical no-op arrays and map shorthand are rejected or downgraded to fail-closed review-needed behavior;
- stale/mismatched `from` values are rejected;
- meaningful patches apply once, preserve the original profile, and recompute WAA;
- protected/staff-owned fields and objective blockers remain non-overridable.

### Integrated Playground and trace tests

- one Pass 2 maximum per Pass 1 trace/run identity;
- no image URL, image bytes, or image content in the Pass 2 request;
- Pass 2 trace stages show request, provider response/error, parse result, decision, cost, and terminal state;
- malformed output reaches a visible fail-closed trace state and never produces an effective approval;
- trace source remains `PLAYGROUND`, provider/model/prompt version are recorded, and secrets are absent;
- successful and failed Pass 2 traces remain inspectable and correlated to Pass 1.

### Callable and Studio error tests

- true unavailable/not-found, auth/permission, timeout/network, upstream provider, malformed provider response, precondition, and unknown internal cases map to distinct safe UI messages;
- an ACTIVE callable plus an upstream/parser failure does not display the deployment-unavailable message;
- no raw provider error or secret reaches the UI or logs.

## 7. Validation contract after authorization

Run, from the repository root, the repository-valid Functions/shared/Studio checks relevant to changed files, including the focused suites above, Functions build/typecheck, shared AI/decision tests, Studio Settings/Playground contract tests, and Studio typecheck/build where available. Run the broader suite where feasible.

The previously recorded unrelated Studio, print-request, export, companion-set, and shared legacy failures remain out of scope. If they recur, record each exact file/test/type error as:

> **ACCEPTED PRE-EXISTING VALIDATION EXCEPTION**

and compare them against checkpoint baseline `5712b51d0f0b867652e7f3e5ea0f22c620cebc1e`. Do not claim the broader suite passes while an exception remains, and do not repair those unrelated failures in this corrective.

No validation result is claimed by this plan-only artifact beyond the read-only source/DEV checks listed in Section 3.

## 8. Proposed files and deployment boundary

### Proposed implementation files

The exact checked-in paths below are the reviewed starting inventory; implementation may add a narrowly necessary test file adjacent to an approved module but may not expand product scope silently:

- `packages/shared/src/utils/catalogAutomationEvidence.ts`
- `packages/shared/src/utils/catalogAutomationDecision.ts`
- `packages/shared/src/utils/semanticReviewPolicy.ts`
- `packages/shared/src/utils/aiEnrichmentTrace.ts` only if projection/comparison needs the existing trace fields
- `packages/shared/src/types/ai/aiEnrichmentTrace.types.ts` only if an existing field needs a backward-compatible type refinement
- `functions/src/ai/aiEnrichmentPlayground.ts`
- `functions/src/ai/semanticReviewPlayground.ts`
- `functions/src/ai/semanticReviewCore.ts`
- `functions/src/ai/semanticReviewProvider.ts`
- `functions/src/testAiEnrichmentSemanticReviewPlayground.ts`
- `functions/src/ai/aiEnrichmentTraceStore.ts` only for the existing bounded/full sink integration
- `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentPlaygroundService.ts`
- `apps/studio/src/renderer/src/features/settings/services/aiEnrichmentSemanticReviewPlaygroundService.ts`
- adjacent existing test files for the modules changed above.

### Future DEV deployment inventory

After separate owner implementation authorization and a new implementation review, the narrow expected DEV inventory is:

- `testAiEnrichmentPlayground`;
- `testAiEnrichmentSemanticReviewPlayground`; and
- the Studio DEV package/build containing the corresponding Playground error/trace UI changes, if client files are changed.

No Processing callable, Settings mutation, Firestore Rules/Indexes, Storage Rules, production surface, Semantic Reviewer setting, Autonomous setting, Y2/reprocessing, or WS6 action is in this corrective inventory. If implementation proves that a shared change changes an active Processing default, it must stop for a new scope review instead of silently deploying Processing.

## 9. Test trace artifact decision

`[NEEDS REPO CHECK]` was required before choosing a generated-test artifact path. The repository audit found the existing `AI_ENRICHMENT_TRACE_ARTIFACT_DIR = ".tmp/ai-enrichment-traces"` in `functions/src/ai/aiEnrichmentTraceArtifacts.ts`; this is the safest repo-local temporary destination currently available.

The implementation must ensure:

- generated JSON is written only when a trace-enabled test opts in;
- `.tmp/ai-enrichment-traces` is ignored or otherwise excluded from Git without changing ignore policy solely for this corrective;
- tests clean up artifacts in teardown or use a test-run-specific child directory;
- the Inspector can import the canonical trace JSON;
- mocked/fixture traces are labeled `AUTOMATED TEST - MOCK/FIXTURE` and never presented as live Gemini/OpenAI output;
- no Firestore dependency is required for ordinary unit tests;
- trace capture makes no AI calls and does not alter assertions or provider behavior.

## 10. Acceptance criteria

The corrective is complete only when all of the following are demonstrated:

1. the owner-observed VCP-supported object case no longer presents a stale-looking unresolved blocker under the reviewed evidence contract;
2. the no-op patch cannot produce effective `APPROVE_WITH_PATCH` or an approved-looking final result;
3. each reproducible malformed response has an exact sanitized classification or remains explicitly fail-closed with an evidence-backed unresolved cause;
4. provider/parser/runtime errors are not mislabeled as Function deployment unavailability;
5. Pass 2 remains text-only, single-attempt, bounded, fail-closed, and deterministic-WAA-authoritative;
6. Inspector traces expose the relevant Pass 1/Pass 2 inputs, outputs, decisions, costs, and failure stages without secrets;
7. required scoped validation passes, with unrelated baseline failures documented exactly and not repaired; and
8. a new Implementation Review records the final source inventory, tests, exceptions, and owner DEV checkpoint.

## 11. Authorization history

The original plan-only checkpoint required:

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 2 QA CORRECTIVES]`

The owner subsequently authorized that exact corrective scope on 2026-09-06. No scope expansion was made. The implementation and final validation disposition are recorded in:

`docs/workflow/reviews/2026-09-06-integrated-playground-pass2-qa-runtime-corrective-review.md`

## 12. Implementation disposition

- Optional bounded VCP evidence parity, stale/no-op patch rejection, Pass 2 trace correlation/diagnostics, and callable/Studio error classification are implemented.
- The implementation preserves v39 Pass 1 prompt/schema/model behavior, text-only Pass 2, objective/protected authority, fail-closed handling, and existing trace redaction.
- Scoped Functions/shared/Studio tests, Functions build, targeted ESLint, and diff checks passed. Studio-wide typecheck/build retain the exact unrelated 33-diagnostic exception set documented in the Implementation Review and are not called a full-suite PASS.
- The owner’s prior QA disposition remains **FAIL WITH STRONG POSITIVE RESULTS** pending evidence-bearing DEV retest. The live malformed-response cause is intentionally still unclassified pending that evidence.
- The authorized DEV deployment completed for exactly `testAiEnrichmentPlayground` and `testAiEnrichmentSemanticReviewPlayground`; no provider or Firebase callable was invoked by Codex. No unapproved deployment, commit, push, Semantic Reviewer enablement, Autonomous enablement, Y2, Gate C, WS6, settings mutation, catalog mutation, or production action occurred.

The next checkpoint is owner evidence-bearing DEV QA:

`[NEEDS OWNER QA: PASS 2 CORRECTIVES + EVIDENCE-BEARING RETEST]`
