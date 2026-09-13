# Plan — Pass 1 semantic authority, parked Pass 2, and AI tag retirement release

| Field | Value |
|---|---|
| Date | 2026-09-07 |
| Workflow | Continue Workflow |
| Workstream | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Phase | Plan + Formal Review |
| Environment | DEV first; production promotion is a later managed goal |
| Authorization in this document | **Plan and Formal Review only** |
| Implementation in this pass | **No** |
| Provider / Firebase calls | **None** |
| Deployment / setting mutation | **None** |
| Commit / push | **None** |
| Autonomous | Must remain OFF |
| Semantic Reviewer | Must remain OFF |

## Goal

Release a simpler, safer active catalog enrichment workflow in which:

1. Pass 1 is the only AI enrichment pass used by Processing, ready-design
   reprocess, background catalog reprocess, and Autonomous processing.
2. Pass 1's canonical title, description, exact category resolution, visible
   text, Visual Context Profile, and Smart Profile are the active AI output.
3. Pass 2 Semantic Review is parked from the active approval workflow, not
   deleted. Its provider, v4 response contract, v5 prompt work, Playground,
   Inspector, traces, and valid tests remain available behind a separate
   owner-controlled experimental gate.
4. The experimental gate is OFF by default and cannot call Pass 2 from any
   automatic Processing path, regardless of the historical
   `semanticReviewerEnabled` value.
5. AI tag generation, tag rerank, Suggestion Author, suggested-new-tag
   approval, and matched-tag category influence are removed from the active
   enrichment path. Existing staff-owned tags and general catalog taxonomy
   remain intact for compatibility and ordinary catalog/search behavior.
6. Objective authority and fail-closed lifecycle protections remain intact;
   semantic lexical uncertainty is retained as a visible diagnostic but does
   not veto Ready by itself or silently obtain a second AI decision.

This is an operational release boundary, not a destructive data migration and
not authorization to enable Pass 2, Autonomous, or production.

## Source audit and decision

### Existing `semanticReviewerEnabled` is not safe to reuse

The current repository behavior is unambiguous:

| Source | Current behavior | Release consequence |
|---|---|---|
| `functions/src/ai/loadAiEnrichmentSettings.ts` | Missing/invalid value resolves to `false`; literal `true` resolves to `true`. | The default is safe, but the field's semantics are not isolated. |
| `functions/src/updateAiEnrichmentSettings.ts` | `semanticReviewerEnabled` is accepted by the shared AI-settings callable, whose caller guard allows active owners **and admins**. | It is not an owner-only experimental control. |
| `functions/src/ai/aiEnrichmentCandidateCore.ts` | `canRunSemanticReview` receives that field and can call `callSemanticReviewer` after Pass 1 during candidate generation. | It can create an automatic second provider call, cost, latency, profile patch, and recomputed WAA/Ready result. |
| `functions/src/ai/semanticReviewPlayground.ts` | Manual Pass 2 loads the reviewer model but does not gate execution on `semanticReviewerEnabled`. | The same field does not consistently control manual experimentation. |
| `apps/studio/.../SettingsPage.tsx` | Pass 1 context currently displays the historical field as a status label; it is not a complete isolated manual toggle. | UI state cannot be treated as runtime authority. |

Therefore the existing field **cannot** satisfy the required behavior. It must
not be repurposed or used as the manual toggle.

### Proposed experimental setting

Add a separate persisted boolean with the exact proposed name
`semanticReviewPlaygroundEnabled` under `settings/aiEnrichment`.

Required semantics:

- absent, malformed, or unreadable: `false`;
- persisted default after release: `false`;
- only the active owner may turn it on or off through a server-enforced
  owner-only settings operation;
- it is read only by the manual Semantic Review Playground gate;
- it is never passed into candidate-core, Processing, ready reprocess,
  background workers, or Autonomous decision code;
- turning it on does not mutate a design, status, WAA, or Ready state;
- the manual callable still requires its existing privileged testing identity;
  the owner-controlled toggle is the release authority for enabling the
  experiment. A later security review may narrow callable invocation to owner
  only if required, but that is not needed to establish the toggle boundary;
- the existing `semanticReviewerEnabled` field becomes a deprecated
  compatibility/read field and has no active runtime effect. Its historical
  value must not be copied into the new field.

The implementation should use a narrow owner-only setting operation rather
than making the existing owner/admin AI-settings save path the authority for
this one field. The exact callable name is intentionally left to the
implementation pass after checking the existing callable naming conventions;
the persisted field name above is the proposed contract.

This preserves a no-rebuild resume path: after the Pass 1-only release ships,
the owner can use the shipped Settings/Playground control to set the new field
to true for a controlled manual run. No production deploy may set it to true.

## Release contract

### Pass 1-only active workflow

The shared pipeline must perform exactly one Pass 1 provider request per
attempt, subject only to the already-approved transient network retry policy
for that one request. The following paths must remain Pass 1 only:

- `enqueueAiEnrichment`;
- `runAiEnrichmentPipeline` queue mode;
- `reprocessReadyDesignWithAi`;
- `catalogReprocessWorker` AI Review queue mode;
- `catalogReprocessWorker` Ready backfill mode;
- background Processing and Autonomous processing;
- any shared candidate-core caller.

The candidate-core automatic `canRunSemanticReview` / `callSemanticReviewer`
branch must be removed from active execution or be made structurally
unreachable by a named Pass 1-only policy. The preferred implementation is to
remove the automatic branch and its setting dependency, while retaining the
Pass 2 modules for the manual experiment. There must be no hidden fallback
from the new manual flag into Processing.

### Pass 2 experimental workflow

When `semanticReviewPlaygroundEnabled` is false:

- the manual callable must stop before a provider request;
- no Pass 2 provider cost, retry, or provider latency is incurred;
- the UI must show that the experiment is OFF;
- the active catalog workflow is unaffected and remains Pass 1 only;
- Pass 2 cannot affect Ready, Needs Review, or any persisted catalog field.

When it is true:

- the owner may run Pass 2 manually from the reviewed Playground/testing
  surface;
- existing Pass 2 Inspector and trace observability remains available;
- the response is labeled experimental/manual;
- the result is not persisted into the design's approval authority and cannot
  promote a design to Ready merely because the toggle is on;
- Pass 2 cost and result are reported separately from Pass 1 cost.

The manual route may continue to accept the existing owner/admin testing
identity, but only the owner can change the enabling setting. No manual result
may be fed back into Processing without a future separately reviewed design.

## Blocker and WAA classification

The following table is the release policy. “Objective Hard Gate” means the
condition may prevent automatic Ready. A semantic lexical diagnostic remains
visible in `reasonCodes`, traces, Inspector output, and metrics, but it is not
an independent WAA veto and does not authorize another AI pass. Objective
authority still wins over every semantic signal.

| Current signal / condition | Classification | Pass 1-only release treatment |
|---|---|---|
| Provider transport failure, empty/malformed structured response, parser failure, schema contract failure | **Objective Hard Gate** | Fail closed to Processing failure / Needs Review; no candidate or Ready write. |
| `validation:smart_profile_missing_version` and other structural Smart Profile validation errors, except the existing generated-at warning | **Objective Hard Gate** | Retain fail-closed validation. |
| `title:title_missing`, `title:title_exceeds_max_characters` | **Objective Hard Gate** | Enforce before any automatic Ready result; add regression coverage for both. |
| `description_missing` | **Objective Hard Gate** | Retain. |
| `category_unresolved` | **Objective Hard Gate** | Retain exact active-category ID/name trust; never fall back to an arbitrary raw category. |
| Settings read failure when a result would otherwise auto-approve | **Objective Hard Gate** | Retain `explicit_automation_settings_unavailable` fail-closed behavior. |
| Explicit-content safety classification and protected staff explicit-content authority | **Objective Hard Gate** | Retain deterministic vocabulary and staff-over-automation rules; never let Pass 2 alter them. |
| Staff-edited Smart Profile dimensions, import presets, title/description/category, halftone/background, companion/lifecycle/status fields, and immutable persistence invariants | **Objective Hard Gate** | Retain staff/import/lifecycle authority ordering and write-time rechecks. |
| `structured_evidence_gap:subjects:*` / `objects:*` | **NON-BLOCKING SEMANTIC DIAGNOSTIC** | Retain in `reasonCodes`, traces, Inspector output, and metrics, but exclude from `hardBlockers` and `shouldPublishReady` authority. It may not trigger Pass 2, override an objective blocker, or mutate output. |
| `subject_specificity_risk:*` | **NON-BLOCKING SEMANTIC DIAGNOSTIC** | Retain in `reasonCodes`, traces, Inspector output, and metrics, but do not independently prevent Ready when objective gates are clear. It may not trigger Pass 2, override staff/import authority, or mutate output. |
| `category_dominant_intent_conflict` | **Semantic AI Judgment** | Keep as a diagnostic and conservative review gate until a separate category-policy review proves a safe downgrade. It must not invoke Pass 2. |
| `category_gap_suggested` | **Semantic AI Judgment** | Keep as a review reason when the model reports category uncertainty; exact `category_unresolved` remains the objective gate. No Pass 2 attempt. |
| `category_alternatives_present` | **Non-blocking Diagnostic** | Preserve in reason/Inspector output without making it a separate hard gate when the exact primary category is otherwise valid. |
| `validation:smart_profile_missing_generated_at` | **Non-blocking Diagnostic** | Preserve warning and provenance visibility; do not block solely on timestamp absence. |
| `shadow_would_auto_approve`, `manual_review_required`, provider/model/timing/cost metadata | **Non-blocking Diagnostic** | Preserve telemetry and UI meaning; these are not approval authority. |
| `automation_policy_uncertainty` targeted verifier path | **Retire from active release path** | No current production generator emits it. Remove active verifier invocation/health dependence, retain historical trace compatibility, and fail closed on any future unknown objective policy signal rather than silently approving. |
| `verifier_unresolved` / `verifier_confirmed` as an automatic decision dependency | **Retire from active release path** | No automatic verifier or reviewer arrays may alter Pass 1 WAA. Historical fields remain readable/auditable. |
| Pass 2 reviewer `decision`, `blockersResolved`, `blockersUnresolved`, and patches | **Retire as production authority** | Manual traces may display them; they cannot write Ready, Needs Review, or final Smart Profile authority. |

This preserves safe handling of unsupported subject and category ambiguity
without pretending a parked semantic reviewer can resolve them.

## Evidence matrix from existing traces and tests

No provider or Firebase request is authorized for this Plan + Review. The
matrix uses only existing repository evidence and explicitly marks missing
evidence.

| Case | Existing evidence | Finding | Release classification |
|---|---|---|---|
| Beatles / musicians | Pass 1 `c54ecf3b-d262-4dcc-ac61-f614519a1fe1`; Pass 2 `8486f631-c988-44c4-8da2-aa1a95deb76b`; the provider saw a current `musicians` value and returned an ineffective/no-op target. | The semantic evidence-gap meaning was easy for Pass 2 to misunderstand; no-op rejection was correct. | Retain the semantic diagnostic for traceability; do not invoke Pass 2 and do not let the lexical signal alone veto Ready. |
| Frankenstein / generic monster | Successful Pass 2 trace `2e7e8047-18f1-439e-b1ca-0cba99816b3a`; patch removed a generic value, but historical reviewer unresolved data was able to remain in the decision projection. | Reviewer arrays are not safe authority. Deterministic post-patch authority must remain isolated; in this release no patch path runs automatically. | Retain the specificity diagnostic for observability; objective blockers still gate and Pass 2 remains parked. |
| Dandelion / dandelion seeds | Pass 1/Pass 2 traces `c571db16-bb35-41e7-9840-2f718264500c` and `bfdbd59e-f515-47b8-91f9-a35d6d459165`; VCP evidence changed the lexical gap result and historical runs produced category variation. | Structured lexical gaps can be artifacts of which evidence projection is supplied; category variation is a separate ambiguity follow-up. | Retain the lexical diagnostic; category ambiguity remains governed by its unchanged category signals, with no automatic Pass 2. |
| Flowers / Nature | Full-capture Pass 2 `a32ae4d0-5f55-45b4-8efe-43ddff3bc64e`, parent `df5712e1-f3d2-45f0-81f6-6cf83a5e0589`; current `['Flowers', 'Nature']` was sent, Gemini proposed the same target, and canonical no-op rejection was correct. | Proven model-facing semantic misunderstanding, not payload skew or parser/no-op defect. | Keep the diagnostic and no-op evidence; no automatic second pass and no independent lexical Ready veto. |
| Cucumber / woman historical case | Known DEV design `Y2IQuCgAPgnqrBIeJuap`; historical Playground/Inspector trace family includes `6373e41f-1489-422b-b87d-09d82f8872cf`; earlier Gate A evidence recorded exact category/copy and VCP behavior. | Pass 1 output was useful and category/title/visible-text behavior was independently reviewed; this is a quality control, not permission to enable Pass 2. | Pass 1 regression control; manual Pass 2 remains separately gated. |
| Collar evidence gap | No exact current trace or test fixture with a `collar` blocker was located in the inspected repository evidence. | Do not claim a live result. Add a deterministic fixture/test only if the implementation needs coverage; do not create provider evidence in this planning pass. | `[NEEDS TEST FIXTURE]`; not a release acceptance claim. |

The evidence supports parking Pass 2. It does not justify deleting the Pass 2
subsystem, weakening objective authority, or treating a semantic reviewer as a
production approver.

## AI tag retirement boundary

### Active AI dependencies found

The audit found no active non-test caller of `resolveAiCatalogTags`, no active
tag-rerank provider source, and no active Suggestion Author provider source.
The remaining operational residue is:

- the default prompt still asks for `tags`;
- `SimpleCatalogEnrichmentParsed` accepts deprecated historical tag keys, but
  the active v39 normalizer/canonical projection does not emit them;
- `DesignAiSuggestions` still has optional historical `tags`,
  `suggestedNewTags`, tag-rerank, and Suggestion Author fields;
- `aiReviewFormState.ts` still reads old `suggestions.tags` to seed a human
  form, and `aiProcessingOutput.ts` still treats tags as AI output;
- `settings/aiEnrichment` types and save plumbing retain old tag settings and
  `additionalTagExclusions` compatibility fields;
- `catalogTagResolver.ts`, `suggestedNewTagsPolicy.ts`, tag-exclusion helpers,
  and related constants remain in the checkout even though the active v39
  candidate path does not call them;
- `catalogThemeCategoryResolver.ts` still has a `matchedTags` input and imports
  a generic normalizer from the legacy resolver, although no active caller was
  found in the inspected source;
- staff-owned `design.tags`, tag taxonomy, Algolia tag fields, Portal tag
  filters, and general tag management are separate product behavior and still
  have consumers.

### Release treatment

The implementation must:

1. remove the legacy tag instruction from the shipped Pass 1 prompt and add a
   clear no-tags contract for custom prompt compatibility;
2. retain the current schema/normalizer behavior that omits tag fields from
   the v39 active response and persistence projection;
3. remove tag-rerank, Suggestion Author, suggested-new-tag, and AI tag
   approval/read paths from active Settings, Playground, AI Review, and
   Processing surfaces;
4. keep old Firestore fields readable only where needed to display historical
   records or safely ignore them; no new run may write those operational fields;
5. remove dead AI tag modules after extracting any still-needed generic text
   normalization into a neutral utility and proving the import graph is clear;
6. replace any `matchedTags` category scoring dependency with durable Pass 1
   Smart Profile/copy/VCP inputs, or delete the unused resolver after the
   category parity tests prove there is no active dependency;
7. preserve staff `design.tags`, taxonomy documents, customer search, and
   Algolia tag fields in this release unless a separate parity and deployment
   review authorizes their removal. “No tags” here means no AI-produced tag
   authority, not destructive removal of staff data or ordinary catalog
   discovery.

The last point avoids turning a narrow enrichment release into an unreviewed
customer search or destructive data migration. Broader Portal/Algolia tag
operational retirement remains a parked follow-up with its own parity gate.

## Implementation slices (after owner authorization)

### Slice 1 — Settings contract and hard boundary

- Add `semanticReviewPlaygroundEnabled` to the Functions loader, shared
  settings contract, and Studio read model with default false.
- Add a server-enforced owner-only update operation or equivalent narrow field
  authorization.
- Keep `semanticReviewerEnabled` as a deprecated compatibility read only; do
  not migrate a true value into the new field.
- Add tests for absent/invalid/true/false values, owner success, admin denial
  for this field, and no settings mutation during deployment.

### Slice 2 — Remove automatic Pass 2 from Processing

- Remove the candidate-core automatic `canRunSemanticReview` branch and its
  `semanticReviewerEnabled` dependency.
- Keep Pass 1 decision computation, exact category trust, VCP, Smart Profile,
  explicit-content automation, staff/import merge, and persistence behavior.
- Retire automatic verifier/reviewer-array influence and add one-provider-call
  / one-Pass-2-impossible Processing tests.
- Verify queue, ready reprocess, background worker, and Autonomous paths all
  call only the shared Pass 1 candidate generator.

### Slice 3 — Manual Playground gate and truthful UI

- Gate `testAiEnrichmentSemanticReviewPlayground` on the new field before
  provider construction/dispatch.
- When off, return a clear experimental-disabled result with zero provider
  calls and no design mutation.
- When on, preserve the reviewed manual request, v4 schema, v5 prompt,
  Inspector/trace lifecycle, one-call boundary, and manual-only semantics.
- Replace the misleading historical `semanticReviewerEnabled` display with
  `Pass 2 experimental: OFF/ON` and an explicit note that it cannot alter
  Processing authority.

### Slice 4 — Pass 1 no-tags contract

- Remove the default prompt's legacy `tags` instruction, update prompt
  provenance/version as required by the actual prompt change, and add custom
  prompt compatibility guidance.
- Keep the v39 structured schema's no-tag shape and canonical projection.
- Stop new `aiSuggestions.tags`, `suggestedNewTags`, tag-rerank, and Suggestion
  Author writes. Preserve historical reads only where they are necessary to
  render old records during the compatibility window.
- Remove tag seeding from AI Review and tag-based AI output indicators from
  active Processing/Playground displays.

### Slice 5 — Dead AI tag execution cleanup

- Remove obsolete tag-rerank/Suggestion Author settings controls, hooks,
  service payloads, and page JSX.
- Remove obsolete suggested-tag inbox handlers/displays and active approval
  affordances.
- Delete or quarantine dead tag resolver/policy/exclusion execution modules
  after import-graph proof; extract only neutral helpers that have a current
  non-tag caller.
- Preserve staff tag editing, historical fields, taxonomy, and customer
  discovery consumers as explicitly out of the active AI authority path.

### Slice 6 — Decision-policy cleanup and authority tests

- Keep objective hard gates as documented above; classify structured evidence
  gaps and subject-specificity risk as non-blocking semantic diagnostics when
  no objective blocker exists.
- Remove Pass 2 eligibility from active Processing; semantic blocker reason
  codes remain observable but never invoke an AI reviewer.
- Retire active verifier health/decision semantics and update Automation Health
  labels so they do not imply a second pass ran.
- Add authority tests covering exact category trust, title/description,
  visibleText, VCP, staff/import presets, explicit content, lifecycle writes,
  objective blocker non-override, semantic blocker no-call, tag inertness,
  and cost accounting.

### Slice 7 — Documentation and permanent contract updates

Update, where behavior changes require it:

- `docs/project/DECISIONS.md` with the Pass 2 parked/experimental ADR note;
- `docs/architecture/DATA_MODEL.md` for dormant historical AI tag fields and
  the new optional setting;
- `docs/WORKFLOWS.md` for Pass 1-only Processing and manual Pass 2;
- `docs/architecture/BACKEND.md` and deployment documentation for the
  no-automatic-Pass-2 boundary;
- the existing Pass 2 QA checkpoint by amendment, never by erasure;
- `.cursor/workflow/state.md` and
  `references/project-chatgpt-handoff/CURRENT-STATE.md` at signoff.

## Proposed implementation file inventory

This is a proposed inventory, not an authorization to edit these files.
Actual files must be rechecked after each slice and the final IR must record
the exact diff.

| Area | Expected files |
|---|---|
| Settings/runtime | `functions/src/ai/loadAiEnrichmentSettings.ts`, `functions/src/updateAiEnrichmentSettings.ts` or a narrow new owner-only setting callable, `packages/shared/src/types/ai/aiEnrichmentSettings.types.ts`, Studio settings service/hook/page |
| Processing boundary | `functions/src/ai/aiEnrichmentCandidateCore.ts`, `functions/src/ai/aiEnrichmentPipeline.ts`, `functions/src/reprocessReadyDesignWithAi.ts`, `functions/src/catalogReprocess/catalogReprocessWorker.ts`, relevant callable/index exports |
| Playground | `functions/src/ai/semanticReviewPlayground.ts`, `functions/src/testAiEnrichmentSemanticReviewPlayground.ts`, `functions/src/ai/aiEnrichmentPlayground.ts`, Studio Playground hook/service/page |
| Decision policy | `packages/shared/src/utils/catalogAutomationDecision.ts`, `packages/shared/src/utils/semanticReviewPolicy.ts`, related shared types and health projections |
| Pass 1 contract | `functions/src/ai/simpleCatalogEnrichmentPrompt.ts`, `functions/src/ai/simpleCatalogEnrichmentResponse.ts`, `functions/src/ai/simpleCatalogEnrichmentSchema.ts`, `packages/shared/src/constants/aiEnrichment.constants.ts` |
| Tag retirement | `functions/src/ai/catalogTagResolver.ts`, `functions/src/ai/aiTagExclusions.ts`, `packages/shared/src/utils/suggestedNewTagsPolicy.ts`, old settings/type fields, `apps/studio/.../aiReviewFormState.ts`, `apps/studio/.../aiProcessingOutput.ts`, any mechanically found active handlers |
| Category parity | `functions/src/ai/catalogThemeCategoryResolver.ts` and its callers/tests, only if the import/call graph proves it is still relevant |
| Tests | Existing shared decision/policy tests, Functions candidate/pipeline/Playground tests, Studio Settings/AI Review/Playground contract tests, plus new Pass 1-only, setting-gate, cost, authority, and tag-inert tests |

## Validation plan

Required after implementation, with exact final counts recorded in the IR:

- scoped shared automation decision, semantic policy, Smart Profile, category,
  prompt/schema, AI trace, and typecheck suites;
- scoped Functions AI/provider/candidate/pipeline/Playground/settings tests,
  Functions typecheck/build, and targeted lint;
- scoped Studio Settings/AI Review/Playground tests, renderer/electron/preload
  build, typecheck, and targeted lint;
- no-tag import-graph/search audit across Functions, shared, and Studio;
- one-provider-call and zero-Pass2-call assertions for Processing;
- manual-toggle OFF/ON contract tests without invoking a live provider;
- broader repository validation where feasible, with unrelated baseline
  failures recorded exactly as `ACCEPTED PRE-EXISTING VALIDATION EXCEPTION`.

No test may add an AI call merely for trace capture. Ordinary unit tests must
not require Firestore or provider credentials.

## Later DEV deployment inventory (not authorized by this document)

After implementation, IR, and separate owner deployment authorization, the
expected DEV inventory is:

- Functions: the changed `enqueueAiEnrichment`,
  `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`,
  `testAiEnrichmentPlayground`, `testAiEnrichmentSemanticReviewPlayground`,
  and the owner-only setting operation if introduced;
- the changed shared Functions bundle used by those targets;
- Studio DEV build/publish containing the Pass 1-only status and manual Pass 2
  gate UI;
- no provider setting mutation during deploy; `semanticReviewPlaygroundEnabled`
  must remain absent or false;
- no Firestore rules/indexes, Storage rules, migration, Algolia index-setting,
  Portal deployment, or production deployment in this narrow release unless a
  separate review expands the inventory.

If removing a previously deployed legacy callable requires an explicit
Firebase deletion operation, that is a separate human checkpoint and must not
be inferred from source cleanup.

## Owner QA procedure after implementation

The owner QA checkpoint should verify, in this order:

1. Read the deployed setting and confirm `semanticReviewPlaygroundEnabled` is
   absent/false; confirm the historical `semanticReviewerEnabled` value has
   no Processing effect.
2. Run a normal DEV Pass 1/Processing case and inspect one provider request,
   Pass 1 cost, canonical copy, exact category, visibleText/VCP, Smart Profile,
   and final objective/semantic decision.
3. Confirm no Pass 2 provider request, Pass 2 tokens, Pass 2 cost, or Pass 2
   status appears in the normal Processing trace.
4. With the experimental toggle OFF, click/manual-call Pass 2 only if the UI
   exposes the disabled state; verify it stops before provider dispatch and
   explains why.
5. As owner, turn the experimental toggle ON, run one controlled Playground
   Pass 2 case, and verify the Inspector labels it manual/experimental,
   preserves the v4/v5 trace sections, records separate cost, and cannot write
   Ready or alter the design.
6. Turn the experimental toggle OFF again and verify a subsequent normal
   Processing run remains Pass 1 only.
7. Verify staff/import/explicit/lifecycle authority and objective blockers
   remain non-overridable, and that no active Settings or AI Review surface
   offers tag-rerank, Suggestion Author, or suggested-new-tag approval.

The QA must not enable Autonomous, run production, perform destructive tag
cleanup, or treat manual Pass 2 output as a release approval.

## Release blockers and parked work

Release is blocked until:

- the automatic candidate-core Pass 2 branch is removed or mechanically
  proven unreachable;
- the new setting is server-enforced owner-only and defaults false;
- Processing cannot call Pass 2 when either setting is true or false;
- objective authority tests, semantic non-blocking/no-call tests, and
  semantic-diagnostic trace tests pass;
- no active AI tag generation/resolution/rerank/author/approval path remains;
- the scoped Functions/shared/Studio validation is green or exceptions are
  documented honestly in the IR;
- the owner authorizes implementation and later DEV deployment separately.

Parked, not deleted:

- Semantic Review provider/core, v5 prompt, v4 schema, Playground manual path,
  Inspector, trace infrastructure, and valid tests;
- future automatic Semantic Review, which requires a separately reviewed
  setting/authority design and is not authorized by this release;
- broader Portal/Algolia/staff-tag operational retirement and any destructive
  historical data cleanup;
- category stability/ambiguity follow-up beyond the existing exact-category
  and unchanged category signals;
- Autonomous canary and WS6.

## Rollback

- Keep the previous Functions revision available for reviewed rollback.
- Set the new experimental flag false; do not use it as a rollback substitute
  for the Pass 1 runtime.
- Keep historical tag fields, taxonomy, and search/index fields unchanged.
- If Pass 1 regression appears, return the active workflow to Manual/Shadow,
  pause reprocess jobs, and redeploy the prior reviewed Pass 1 revision after
  owner authorization.
- Do not delete historical data as part of rollback.

## Next checkpoint

This document does not authorize implementation. The matching Formal Review
must be read and approved, then the owner must explicitly authorize the
implementation slices.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 1 SEMANTIC AUTHORITY + PARK PASS 2 + RETIRE AI TAGS]`

## Plan amendment — owner intent clarification: semantic diagnostics do not veto Ready

| Field | Value |
|---|---|
| Amendment date | 2026-09-07 |
| Amendment type | Plan clarification; implementation has not started |
| Governing doctrine | **AI understands semantics; deterministic code enforces objective contracts.** |
| Scope effect | Narrow WAA classification correction only; Pass 2 parking, category policy, and AI-tag retirement are unchanged. |

### Exact current WAA path

The current shared path is mechanically verified in
`packages/shared/src/utils/catalogAutomationDecision.ts`:

1. `computeCatalogAutomationDecision` calls `findStructuredEvidenceGaps` and
   `detectSubjectSpecificityRisk`, then appends their reason codes to
   `reasonCodes`.
2. `isHardBlockerCode` currently classifies both
   `structured_evidence_gap:*` and `subject_specificity_risk:*` as hard.
3. `hardBlockers` is built by filtering `reasonCodes` through that helper.
4. `policyWouldApprove` is `uniqueHard.length === 0`.
5. Any hard blocker returns `decision: "needs_review"` and
   `shouldPublishReady: false`; the clear path can return
   `shouldPublishReady: true` when the existing publication dual gate is live.

### Narrow policy change required in implementation

Remove only the two semantic-prefix classifications from
`isHardBlockerCode`. Retain both detectors, their `reasonCodes`, trace fields,
Inspector visibility, and metrics. Do not delete the detectors or broadly
rewrite WAA. The implementation must ensure that the signals are recorded as
`NON-BLOCKING SEMANTIC DIAGNOSTIC` and objective evaluation continues. Any
objective hard blocker still produces Needs Review/fail-closed behavior, and a
semantic diagnostic cannot weaken staff/import, explicit-content, lifecycle,
settings, title, description, category, parser, schema, or structural Smart
Profile authority.

### Evidence and required fixtures

Existing Beatles/musicians, Flowers/Nature, and Frankenstein evidence supports
the clarification: the first two show semantic evidence interpretation or a
canonical no-op, while the Frankenstein trace shows that reviewer-provided
arrays are unsafe authority. Later implementation tests must add or retain:

- a Beatles/musicians semantic diagnostic that does not independently veto
  Ready;
- a subject-specificity diagnostic that does not independently veto Ready;
- a combined objective blocker plus semantic diagnostic where the objective
  blocker still wins;
- staff/import authority cases where semantic diagnostics cannot override the
  protected value or decision.

### Explicitly unchanged

- `category_dominant_intent_conflict` and `category_gap_suggested` retain their
  current category-policy treatment;
- no automatic Pass 2 trigger is introduced, and Pass 2 remains parked;
- no tag generation, rerank, Suggestion Author, suggested-new-tag, or
  matched-tag authority behavior is changed by this amendment;
- no provider call, settings mutation, deployment, migration, commit, push,
  production action, Semantic Reviewer enablement, Autonomous action, or WS6
  action occurs in this Plan + Formal Review amendment.

### Amendment acceptance criteria

- Semantic lexical signals remain observable but are absent from
  `hardBlockers` when no objective blocker exists.
- Objective blockers remain in `hardBlockers` and continue to prevent Ready.
- Semantic diagnostics never invoke Pass 2 or mutate candidate output.
- Required authority and non-override tests are added during the authorized
  implementation pass.

The matching Formal Review is amended with the same exact path, evidence,
acceptance criteria, and owner checkpoint.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 1 SEMANTIC AUTHORITY + PARK PASS 2 + RETIRE AI TAGS]`
