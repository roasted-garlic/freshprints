# Formal Review — Pass 1 semantic authority, parked Pass 2, and AI tag retirement release

| Field | Value |
|---|---|
| Date | 2026-09-07 |
| Plan | `docs/workflow/plans/2026-09-07-pass1-semantic-authority-pass2-parking-and-tag-retirement-release-plan.md` |
| Workstream | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Review type | Plan + Formal Review only |
| Checkout | `development`, inspected HEAD `1aeadf3106593404c3a7036265d8bb004ff8ffbf` |
| Environment | DEV source audit; no external calls |
| Verdict | **APPROVED AS A NARROW IMPLEMENTATION PROPOSAL; OWNER IMPLEMENTATION AUTHORIZATION REQUIRED** |

## Review boundary

This review approves the proposed shape and sequencing for a later
implementation. It does not itself authorize application code changes,
provider calls, Firebase callable invocation, settings mutation, deployment,
Autonomous, production, commit, or push.

The working tree already contains intentional prior AI enrichment/Inspector
work. That work is preserved and was not cleaned, reset, or reinterpreted by
this review. The current task adds only the Plan, this Review, and the required
workflow handoff amendment.

## Executive finding

The release should be Pass 1 only for all active catalog Processing and
approval paths. Pass 2 should remain present but parked behind a separate
owner-controlled experimental setting that defaults OFF. The current
`semanticReviewerEnabled` field cannot safely serve that purpose because it is
currently an automatic candidate-core runtime gate, is writable through an
owner/admin settings callable, and is not consulted by the manual Playground.

The reviewed proposal therefore does three important things:

1. removes automatic Pass 2 from candidate generation and all Processing
   callers;
2. introduces a separate `semanticReviewPlaygroundEnabled` manual experiment
   gate with server-enforced owner-only mutation and default false;
3. retires AI tag authority and dead tag-AI execution while preserving staff
   tags, historical fields, taxonomy, and ordinary catalog discovery.

This is the smallest safe release boundary that removes the second-pass and
AI-tag dependencies without deleting valuable Pass 2 diagnostics or making an
unreviewed customer-search/data migration part of the release. The owner has
also clarified that lexical semantic detectors must not be treated as
objective authority: they remain observable diagnostics and do not independently
veto Ready.

## Evidence reviewed

### Current setting/runtime evidence

| Question | Source evidence | Finding |
|---|---|---|
| Default | `loadAiEnrichmentSettings.ts` resolves absent/invalid `semanticReviewerEnabled` to false. | Default false is true today, but not sufficient for the required separation. |
| Automatic behavior | `aiEnrichmentCandidateCore.ts` passes the setting to `canRunSemanticReview`; when eligible it calls `callSemanticReviewer`, applies patches, recomputes the decision, and may publish Ready. | The field controls an automatic second provider call, cost, latency, profile mutation, and WAA result. |
| Manual behavior | `semanticReviewPlayground.ts` loads `semanticReviewerModelId` and evaluates manual eligibility without checking `semanticReviewerEnabled`. | The field is not a manual experiment gate. |
| Mutation authority | `updateAiEnrichmentSettings.ts` uses `assertOwnerAdminCaller`; both active owners and admins may update the existing field. | It is not owner-only. |
| Manual callable identity | `testAiEnrichmentSemanticReviewPlayground.ts` accepts active owner/admin callers; full capture is owner-only. | Existing testing access can remain, but the new enabling setting must be owner-only. |

### Current Pass 1/tag evidence

- `simpleCatalogEnrichmentSchema.ts` has no `tags` property in the active v39
  response schema.
- `simpleCatalogEnrichmentResponse.ts` accepts deprecated historical tag keys
  in its type surface but the active normalizer and canonical projection do
  not emit them.
- `buildSimpleCatalogEnrichmentResult` creates `DesignAiSuggestions` without
  AI tags, tag-rerank results, or Suggestion Author results.
- The default prompt still contains a legacy `tags: up to 12 searchable tag
  candidates` instruction. This is unnecessary and must be removed or
  superseded by an explicit no-tags contract in the implementation slice.
- No active non-test caller of `resolveAiCatalogTags` was found in the current
  Functions source audit. No active tag-rerank or Suggestion Author provider
  source was found.
- `aiReviewFormState.ts` still reads historical `suggestions.tags` to seed a
  human form, and `aiProcessingOutput.ts` still recognizes tags as AI output.
  These are remaining active compatibility/UI consumers to retire.
- `catalogThemeCategoryResolver.ts` still has a `matchedTags` input and imports
  a generic normalizer from the legacy tag resolver, but no active caller was
  found. The implementation must prove the import graph before deleting or
  extracting anything.

General staff tag fields, taxonomy documents, Algolia tag materialization,
Portal tag filters, and tag management have separate product consumers. They
are not evidence that AI tag authority must remain active, and they are not
destructively removed by this narrow release.

### Existing behavior evidence

| Case | Existing record | Review finding |
|---|---|---|
| Beatles / musicians | `c54ecf3b-d262-4dcc-ac61-f614519a1fe1` and Pass 2 `8486f631-c988-44c4-8da2-aa1a95deb76b` | The current value was present and the provider returned an ineffective target. The no-op rejection was correct; a second semantic call is not a safe authority. |
| Frankenstein / generic monster | `2e7e8047-18f1-439e-b1ca-0cba99816b3a` | A patch could remove a generic value, while reviewer unresolved data still demonstrated why reviewer arrays cannot be final authority. |
| Dandelion / dandelion seeds | Pass 1 `c571db16-bb35-41e7-9840-2f718264500c` and Pass 2 `bfdbd59e-f515-47b8-91f9-a35d6d459165` | VCP projection changed lexical-gap results; the signal is semantic/diagnostic and should not cause another automatic provider call. |
| Flowers / Nature | Full-capture Pass 2 `a32ae4d0-5f55-45b4-8efe-43ddff3bc64e`, parent `df5712e1-f3d2-45f0-81f6-6cf83a5e0589` | Gemini saw `['Flowers', 'Nature']` and proposed the same target. This proves blocker-semantics misunderstanding, not a parser or no-op defect. |
| Cucumber / woman | Known DEV design `Y2IQuCgAPgnqrBIeJuap`, historical Inspector trace `6373e41f-1489-422b-b87d-09d82f8872cf` | Pass 1 copy/category/VCP behavior was useful and remains a regression control. It does not justify activating Pass 2. |
| Collar | No exact current trace/test artifact with a collar blocker was located. | No live claim is made; add a deterministic fixture only if implementation coverage requires it. |

## Required formal answers

### 1. Does an existing setting already safely provide the required manual experimental toggle?

**No.** `semanticReviewerEnabled` is an automatic Processing gate, not a
manual-only gate; it is admin-writable as well as owner-writable; and the
manual Playground currently does not consult it.

### 2. If the existing setting is not safe, what exactly does it control today?

When true, it can allow eligible semantic blockers from Pass 1 to enter the
automatic candidate-core Semantic Review call. A successful response can be
patched and recomputed before persistence, including changing the final WAA
and Ready outcome. When false, the candidate-core call is skipped, but manual
Playground execution is still separately eligible. Its current default is
false, but its semantics are not isolated.

### 3. What new setting is required?

The proposed field is `semanticReviewPlaygroundEnabled` in
`settings/aiEnrichment`, with absent/malformed/unreadable values resolving to
false. It must have a server-enforced owner-only mutation path. The exact
callable name can follow the repository's naming convention during
implementation; it must be a narrow operation, not an accidental reuse of an
admin-capable general settings write.

### 4. Can turning on the experimental toggle trigger automatic Processing Pass 2?

**Must be no, and the implementation design makes this structural.** The new
field is not passed to candidate-core or the pipeline. The automatic
`callSemanticReviewer` branch is removed from active candidate generation.
`enqueueAiEnrichment`, ready reprocess, background reprocess, and Autonomous
therefore cannot use either the old or new flag to run Pass 2.

### 5. What is the required default after the production release?

**OFF.** The field is absent or explicitly false on release. Deploying the
release must not mutate the Firestore setting to true. A production deploy
must not enable Semantic Review.

### 6. Does Pass 2 affect Ready or Needs Review while the toggle is OFF?

**No.** With the toggle off, the manual callable stops before provider
dispatch, and active Processing has no Pass 2 branch at all. Pass 1's
objective gates and the amended non-blocking semantic diagnostics determine
the active result. No Pass 2 response, patch, reviewer array, or cost can
alter it.

### 7. Can the owner resume manual Pass 2 testing after release without another product rebuild?

**Yes.** The release ships the gate and manual UI/callable. The owner can
change the persisted experimental setting through the owner-only control,
run a controlled Playground case, inspect the existing traces, then turn the
setting back off. This does not authorize automatic Processing or production
authority.

### 8. Does the toggle itself authorize production semantic review?

**No.** It authorizes only the owner-controlled manual experiment. Future
automatic Semantic Review requires a separate Plan, Review, implementation,
tests, and owner authorization.

### 9. Does manual Pass 2 become production authority when ON?

**No.** Manual output remains a diagnostic/experimental result. It must not
write a design's Smart Profile, title, description, category, Ready state, or
Needs Review state, and reviewer blocker arrays remain audit-only.

### 10. Are Pass 2 assets deleted or disabled destructively?

**No.** Provider/core, v5 prompt, v4 schema, manual Playground, Inspector,
trace infrastructure, and valid tests remain. Only the active automatic
entry point is removed, and the manual entry point is gated.

### 11. What is the active AI pass after this release?

Pass 1: one shared vision request, existing transient network retry behavior,
existing parser/schema/normalizer, exact active category trust, canonical
title/description, visibleText, VCP, Smart Profile, and existing objective /
authority persistence rules. There is no automatic semantic second request.

### 12. Which blockers remain objective hard gates?

Provider/transport and parser/schema failures; structural Smart Profile
validation errors; missing or overlong title; missing description; unresolved
exact approved category; settings-read fail-closed state; explicit-content
safety; staff/import/lifecycle/persistence authority and immutable write
invariants. These remain conservative and cannot be overridden by AI output.

### 13. Which blockers remain semantic judgments?

`structured_evidence_gap:subjects:*`,
`structured_evidence_gap:objects:*`, `subject_specificity_risk:*`,
`category_dominant_intent_conflict`, and `category_gap_suggested` are semantic
or semantic-proxy signals, but they do not all have the same authority. The
structured-evidence and subject-specificity prefixes are **NON-BLOCKING
SEMANTIC DIAGNOSTICS**: they remain in `reasonCodes`, traces, Inspector output,
and metrics, but do not independently add to `hardBlockers` or veto Ready.
They never trigger Pass 2 and cannot override objective, staff, or import
authority. The category signals retain their existing category-policy
treatment and are unchanged by this amendment.

### 14. Which signals are non-blocking diagnostics?

`structured_evidence_gap:subjects:*`, `structured_evidence_gap:objects:*`,
`subject_specificity_risk:*`, `category_alternatives_present`, the existing
missing-generated-at warning, `shadow_would_auto_approve`, manual-review
labels, provider/model metadata, trace stage/timing, and cost metadata remain
visible and auditable but are not independent Ready authority. The first three
are the newly clarified non-blocking semantic diagnostics.

### 15. Which behaviors are retired?

Automatic candidate-core Semantic Review; automatic verifier/reviewer-array
authority; AI tag generation/resolution; Tag Rerank; Suggestion Author;
suggested-new-tag approval and inbox display; tag-based AI output indicators;
and `matchedTags` as a category authority input. Historical values may remain
readable during compatibility handling but are not written or trusted by the
new active path.

### 16. Is exact category trust preserved?

**Yes.** Pass 1's raw category must still resolve to an exact active category
ID/name. No tag matching or raw arbitrary category fallback is introduced.
The current category resolver's `matchedTags` dependency must be removed,
replaced with durable Pass 1 Smart Profile/copy/VCP evidence, or proven dead
and deleted after parity tests.

### 17. Are staff/import authority and explicit-content rules affected?

**No.** Staff edits, import presets, title/description/category authority,
halftone/background controls, explicit-content safety, lifecycle/status, and
persistence rechecks remain hard boundaries. Pass 2 cannot override them when
manually enabled.

### 18. Does the release require deleting historical tag data or taxonomy?

**No.** `design.tags`, historical `aiSuggestions` tag fields, tag taxonomy,
and ordinary staff/customer discovery are preserved. Destructive cleanup is a
separate owner decision. The release retires the AI operational dependency,
not data that may still have product consumers.

### 19. Does the release add provider calls or cost when Pass 2 is OFF?

**No.** Normal Processing has exactly the Pass 1 request. The manual Pass 2
call is not made when the experimental setting is false. No trace collection,
policy classification, or Inspector display may add an AI call.

### 20. Can the owner compare or inspect the parked subsystem later?

**Yes.** Existing Pass 2 Inspector/trace infrastructure remains available.
Manual traces must be visibly labeled experimental/manual and retain provider,
model, prompt, schema, response, normalized result, VCP, decision, and cost
sections. The existing trace workflow is preserved for later controlled
comparison against Pass 1/live traces.

## Formal classification decision

The review accepts the following decision doctrine:

| Class | Accepted release behavior |
|---|---|
| Objective Hard Gate | Fail closed or route Needs Review; never overridden by Pass 2 or tags. |
| NON-BLOCKING SEMANTIC DIAGNOSTIC | Structured evidence gaps and subject-specificity risk remain visible in `reasonCodes`, traces, Inspector output, and metrics, but do not independently block Ready or trigger Pass 2. |
| Non-blocking Diagnostic | Visible in trace/health/UI; not a standalone Ready blocker. |
| Retire | Remove from active runtime authority and cost path; historical data/read compatibility may remain. |

The important distinction is that parking Pass 2 does not require granting a
semantic lexical detector objective authority. AI may surface semantic
evidence, while deterministic code enforces objective contracts. The release
retains the diagnostic and trace value of these signals without allowing them
to preserve false-positive Ready vetoes.

## Architecture review

**Approved with implementation conditions:**

- One active AI pass must be enforced in shared candidate generation, not only
  by a UI flag.
- The new manual gate must not be reachable from Processing code.
- The old field must not be mapped to the new field and must not remain an
  automatic provider gate.
- Manual Pass 2 must stop before provider construction/dispatch when disabled.
- Pass 2 results must remain non-persisting and non-authoritative.
- Tag retirement must proceed in the order: stop AI use/write → remove UI
  authority → prove remaining imports/consumers → consider broader search/
  taxonomy retirement separately.
- If deleting the old category resolver requires preserving generic text
  normalization, extract that helper into a neutral module first.

## Security review

The proposal preserves default-deny behavior and the existing privileged
testing boundary. The new toggle must be checked server-side, with owner-only
mutation; a hidden/disabled Studio control is not sufficient. No client writes
to trusted Smart Profile or approval fields are introduced. No secret or
provider configuration changes are required.

## Data and migration review

No schema migration is required. The new boolean is optional and defaults
false. Existing `semanticReviewerEnabled` and old AI tag fields must not be
silently translated or deleted. Any later cleanup of these fields, tag
taxonomy, or Algolia fields requires a separate owner-approved migration and
rollback plan.

## Validation review

The implementation must pass, with exact counts recorded in a later IR:

- shared decision/policy/category/prompt/schema/trace tests;
- Functions candidate/pipeline/Processing/Playground/provider/settings tests,
  build, typecheck, and lint;
- Studio Settings/AI Review/Playground tests, build, typecheck, and lint;
- import-graph and repository searches proving no active tag-rerank,
  Suggestion Author, suggested-new-tag approval, or matched-tag authority;
- setting default/owner-only/disabled-zero-call tests;
- Processing one-provider-call tests with old setting true and new setting true
  and false;
- objective/staff/import/explicit/lifecycle non-override tests;
- exact category, title/description, visibleText/VCP, cost, and semantic
  blocker no-call parity tests.

Broader failures unrelated to this implementation must be recorded in the
later IR with exact file/test/type-error evidence and the label
`ACCEPTED PRE-EXISTING VALIDATION EXCEPTION`; they must not be repaired under
this narrow Plan.

## Proposed later DEV deployment inventory

No deployment is authorized by this Review. After implementation and a fresh
owner deployment authorization, the expected changed inventory is:

- `enqueueAiEnrichment` and its shared pipeline/candidate-core bundle;
- `reprocessReadyDesignWithAi`;
- `onCatalogReprocessJobWritten` / catalog reprocess worker bundle;
- `testAiEnrichmentPlayground` if Pass 1 context/UI labeling changes;
- `testAiEnrichmentSemanticReviewPlayground` with the manual experimental
  gate;
- the narrow owner-only setting operation, or the existing settings callable
  only if its field-level owner enforcement is proven;
- Studio DEV build/publish for the Settings/Playground/AI Review retirement
  and Pass 1/Pass 2 status labels.

The following are not included without a separate review: setting mutation
during deployment; Semantic Reviewer enablement; Autonomous; Firestore or
Storage rules; indexes; migrations; Portal deployment; Algolia settings;
destructive tag deletion; production.

## Owner QA recommendation

After implementation and deployment review:

1. Confirm the new setting is absent/false and the old setting has no
   Processing effect.
2. Run one normal DEV Pass 1 case and verify one provider request, canonical
   copy, exact category, visibleText/VCP, Smart Profile, decision, and Pass 1
   cost.
3. Verify the normal trace contains no Pass 2 request, Pass 2 cost, or Pass 2
   mutation.
4. With the experimental gate OFF, verify manual Pass 2 stops before provider
   dispatch and reports disabled/experimental status.
5. As owner, enable the gate, run one controlled Playground Pass 2 case, and
   verify the Inspector remains available, the trace is clearly manual/
   experimental, cost is separate, and no design/Ready state changes.
6. Disable the gate and verify the next normal Processing run is still Pass 1
   only.
7. Confirm no active Settings, AI Review, Playground, or Processing surface
   offers tag-rerank, Suggestion Author, or suggested-new-tag approval.

## Review conclusion and next marker

The proposed release is narrow, technically grounded in the current source,
preserves the successful Pass 1 contract, and safely parks rather than deletes
Pass 2. The only remaining gate for code work is explicit owner
implementation authorization.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 1 SEMANTIC AUTHORITY + PARK PASS 2 + RETIRE AI TAGS]`

## Formal Review amendment — Pass 1 semantic authority clarification

| Field | Value |
|---|---|
| Amendment date | 2026-09-07 |
| Review status | **APPROVED AS A NARROW PLAN AMENDMENT; OWNER IMPLEMENTATION AUTHORIZATION REQUIRED** |
| Governing doctrine | **AI understands semantics; deterministic code enforces objective contracts.** |
| Implementation status | No application implementation, provider call, settings mutation, or deployment performed. |

### Exact current WAA path and approved narrow correction

The reviewed source path is
`packages/shared/src/utils/catalogAutomationDecision.ts`:
`computeCatalogAutomationDecision` calls `findStructuredEvidenceGaps` and
`detectSubjectSpecificityRisk`, appends their codes to `reasonCodes`, and then
builds `hardBlockers` by filtering through `isHardBlockerCode`. That helper
currently treats `structured_evidence_gap:*` and
`subject_specificity_risk:*` as hard. `policyWouldApprove` is then derived from
`uniqueHard.length === 0`; the hard branch returns `needs_review` with
`shouldPublishReady: false`.

The approved implementation correction is to remove only those two semantic
prefix checks from `isHardBlockerCode`. The detectors, reason codes, trace and
Inspector fields, and metrics remain. This is a classification correction, not
detector deletion or a broad WAA rewrite.

### Required formal answers for this amendment

1. **Are `structured_evidence_gap:subjects:*` and
   `structured_evidence_gap:objects:*` objective blockers?** No. They are
   non-blocking semantic diagnostics.
2. **Is `subject_specificity_risk:*` an objective blocker?** No. It is a
   non-blocking semantic diagnostic.
3. **Can either signal independently veto Ready?** No. When objective gates
   are clear, neither may add to `hardBlockers` or set `shouldPublishReady`
   false by itself.
4. **Are the signals still observable?** Yes. They remain in reason codes,
   traces, Inspector output, and metrics.
5. **Do the signals trigger Pass 2?** No. Pass 2 remains parked and the
   semantic diagnostics never authorize a provider call.
6. **Can this weaken objective authority?** No. Provider, parser/schema,
   Smart Profile, title, description, category, settings, safety, lifecycle,
   and persistence gates remain blocking and fail closed.
7. **Can this weaken explicit-content safety?** No. Deterministic safety and
   protected explicit-content authority remain unchanged.
8. **Can this weaken staff/import authority?** No. Staff edits, import
   presets, and protected fields remain authoritative over AI output.
9. **Does category policy change?** No. `category_dominant_intent_conflict`
   and `category_gap_suggested` retain their current treatment.
10. **Does Pass 2 scope change?** No. Automatic Pass 2 remains parked, and
    manual Pass 2 remains separately gated and non-authoritative.
11. **Does AI-tag scope change?** No. Tag generation, rerank, Suggestion
    Author, suggested-new-tag approval, and matched-tag authority remain
    governed by the existing approved retirement scope.
12. **Which implementation files are affected?** The narrow policy change is
    in `packages/shared/src/utils/catalogAutomationDecision.ts`, with related
    shared policy/type or trace projections only if required by implementation.
    Candidate-core/Processing changes remain required for the separately
    approved Pass 2 parking, and Settings/Playground/AI Review changes remain
    required for the separately approved tag and manual-gate work.
13. **Which tests are required?** Shared decision tests for semantic-only
    non-blocking behavior; Beatles/musicians and subject-specificity fixtures;
    combined objective-plus-semantic blocker precedence; staff/import
    non-override; trace/Inspector reason-code visibility; and semantic no-call
    / one-provider-call parity for Processing. Existing category, Pass 2, and
    tag-inert tests remain required.
14. **What is the next workflow checkpoint?** Owner authorization is required
    before implementation. The exact marker is below.

### Evidence reviewed for the clarification

- Beatles/musicians traces show a current value and ineffective/no-op Pass 2
  target; the diagnostic is useful, but a second model call is not safe
  authority.
- Flowers/Nature traces show `['Flowers', 'Nature']` was already present and
  the provider proposed the same target; canonical no-op rejection was correct
  while the lexical signal should remain diagnostic.
- The Frankenstein trace shows reviewer-provided unresolved arrays are unsafe
  final authority; objective deterministic policy must remain authoritative.

### Review boundaries unchanged

The amendment does not authorize implementation, provider/Firebase calls,
settings mutation, deployment, commit, push, production, Semantic Reviewer
enablement, Autonomous, WS6, migration, or destructive data changes. The
existing Plan and this Formal Review remain the governing artifacts; both now
carry the same semantic-authority clarification.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 1 SEMANTIC AUTHORITY + PARK PASS 2 + RETIRE AI TAGS]`
