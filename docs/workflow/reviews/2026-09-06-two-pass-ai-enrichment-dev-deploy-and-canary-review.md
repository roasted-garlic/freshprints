# DEV Deploy and Canary Formal Review — Two-Pass AI Enrichment

Verdict: approved for owner review. Deployment authorization: NO pending explicit owner authorization.

Frozen SHA: `74d7b2edb43f89906f4b7449db004747b6ea0c22`.

Function allowlist: `enqueueAiEnrichment`, `resetAiEnrichmentForProcessing`, `reprocessReadyDesignWithAi`, `testAiEnrichmentPlayground`, `testAiEnrichmentSemanticReviewPlayground`, `updateAiEnrichmentSettings`.

Exact command:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "60"
firebase deploy --only "functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing,functions:reprocessReadyDesignWithAi,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentSemanticReviewPlayground,functions:updateAiEnrichmentSettings" --project fresh-prints-dev --non-interactive
```

Studio is local build/run only. Shared code is bundled into Functions/Studio. Rules, indexes, storage rules, migrations, and backfills: NO.

Gate A: Semantic Reviewer OFF, Autonomous OFF; verify versions, Pass 1 behavior, authority, tag-inert behavior, and Pass 1 cost.

Gate B: manual text-only Pass 2; verify semantic cases, objective/patch/authority guards, one-call maximum, Pass 2 cost, combined cost, and no Tag Rerank cost.

Gate C requires a separate owner authorization to temporarily enable `semanticReviewerEnabled=true`; process a small sample, verify provenance/WAA, then disable immediately. This review does not authorize Gate C.

Record Function revisions, deployment success, frozen SHA, Studio SHA, exact AI tokens/costs, and canary outputs. Roll back by disabling the setting or redeploying the prior SHA; do not restore retired Tag Rerank.

No deploy, production, Autonomous, Semantic Reviewer enablement, or WS6 action is authorized by this review.

## DEV Gate A/B checkpoint — 2026-09-06

Deployment command exit code: `0`.

Frozen implementation SHA: `74d7b2edb43f89906f4b7449db004747b6ea0c22`.

Local development/origin source verification: local `development` and `origin/development` both point to `84bc40f636189e23a3846c74381de9d19d986f6f`; the frozen implementation SHA is its source ancestor and the working tree is clean. The later commit contains only the reviewed deployment documentation.

Deployed Functions and revisions:

| Function | Revision | State | Firebase source hash |
|---|---|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00105-mat` | ACTIVE | `2be34e6a7367fb8b14891e294856d5f77e8b6ff9` |
| `resetAiEnrichmentForProcessing` | `resetaienrichmentforprocessing-00043-geq` | ACTIVE | `6e21bbe6ad47455a7aefab838730b4f26debd381` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00016-xom` | ACTIVE | `2be34e6a7367fb8b14891e294856d5f77e8b6ff9` |
| `testAiEnrichmentPlayground` | `testaienrichmentplayground-00064-bum` | ACTIVE | `2be34e6a7367fb8b14891e294856d5f77e8b6ff9` |
| `testAiEnrichmentSemanticReviewPlayground` | `testaienrichmentsemanticreviewplayground-00001-tac` | ACTIVE | `2be34e6a7367fb8b14891e294856d5f77e8b6ff9` |
| `updateAiEnrichmentSettings` | `updateaienrichmentsettings-00052-gaw` | ACTIVE | `6e21bbe6ad47455a7aefab838730b4f26debd381` |

No unrelated Functions or Firebase resources were targeted. Production was not touched.

Studio verification: Vite DEV renderer started successfully at `http://127.0.0.1:5173`. The packaged Electron build did not complete because of the documented pre-existing unrelated type errors in PNG validation, export fixtures, companion sets, print requests, staff inbox, and shared legacy fixtures. No AI-enrichment Studio error was reported.

Gate A: PASS via the owner-authorized temporary owner/admin Firebase Auth mechanism used by the existing repository QA scripts. The known cucumber design `Y2IQuCgAPgnqrBIeJuap` was read from Storage and sent only to `testAiEnrichmentPlayground`; no design document was mutated. Returned provider/model: `google` / `gemini-2.5-flash-lite`. Prompt version: `ai-playground-v1` (the callable's response envelope); the embedded enrichment payload used `catalog-enrich-v38` behavior and VCP version `visual-context-v1`. VCP summary and detailedDescription were present and visually useful. Title: `Pin-up Girl Holding Cucumber with Sarcastic Phrase`. Description preserved the cucumber/pin-up/sarcastic wording. Category: `Funny & Sarcastic`. Readable text lines: `WHEN LIFE GIVES YOU`, `Cucumbers`, `GO FUCK YOURSELF...`. Smart Profile subjects/objects/styles/themes/interests were returned. Tags and suggestedNewTags were both empty. Pass 1 input tokens: `4610`; completion tokens: `1158`; estimated cost: `$0.0009242`. No Tag Rerank, Suggestion Author, or AI-generated tag path was observed. The call was non-persisting.

Gate B: FAILED on the deployed semantic-review callable. Using the exact returned Pass 1 context and no image, `testAiEnrichmentSemanticReviewPlayground` consistently returned `functions/invalid-argument: Malformed semantic review response.` The failure reproduced with the DEV default Gemini model and with `gpt-5.6-luna`; no semantic result, patches, Pass 2 tokens, Pass 2 cost, or combined cost can be honestly recorded. Required woman/girl, unsupported-subject, specificity, objective-blocker, forbidden-patch, authority, and one-call callable checks are therefore NOT RUN. Existing automated semantic core/policy tests remain the authority evidence for objective blockers, forbidden patches, protected dimensions, and one-call policy; no catalog data was mutated.

Gate C recommendation: DO NOT ENABLE. Gate C remains separately unauthorized, and Gate B evidence is incomplete.

`[NEEDS OWNER DECISION]` — authorize remediation/redeployment of the malformed deployed Pass 2 response path, or provide a reviewed alternative. Do not enable `semanticReviewerEnabled=true` until the deployed Gate B path returns a valid semantic result and Gate C is separately authorized.

## Gate B parser corrective — implemented and pending DEV redeploy

Diagnosis: the shared Pass 2 prompt version `catalog-semantic-review-v1` named the allowed decisions and patchable fields but did not explicitly require the complete result object. The shared parser nevertheless required `blockersResolved` and `blockersUnresolved` arrays. The deployed callable therefore rejected valid-looking provider decisions when those optional arrays were omitted. The same rejection through Gemini and OpenAI identifies the common prompt/parser contract boundary, not provider quality. The deployed callable did not log raw provider content, so no secrets or user data were added to this review; sanitized provider-form fixtures now reproduce both content shapes locally.

Corrective source changes:

- `packages/shared/src/types/catalog/semanticReview.types.ts`: versioned the clarified Pass 2 contract to `catalog-semantic-review-v2`.
- `functions/src/ai/semanticReviewCore.ts`: explicitly requires the result shape in the prompt; conservatively defaults omitted blocker arrays to `[]`, rejects supplied non-arrays, blank reasons, unknown decisions, invalid JSON, and forbidden patches.
- `functions/src/ai/semanticReviewProvider.ts`: accepts plain-string and text-content-array assistant payloads before entering the common parser.
- `functions/src/ai/semanticReviewCore.test.ts`: added Gemini/OpenAI APPROVE, APPROVE_WITH_PATCH, NEEDS_REVIEW, optional-field, forbidden-patch, malformed, and content-shape fixtures.

Safety contract unchanged: no title, description, category, visible text, colors, Visual Context, provenance, staff/import fields, objective-blocker override, eligibility change, or semantic retry was introduced. Semantic Reviewer remains disabled.

Validation: 12 focused semantic core/policy tests passed; Functions TypeScript build passed; `git diff --check` passed. Broader unrelated Studio baseline exceptions remain accepted as documented in the Implementation Review.

Corrective deploy inventory: only `testAiEnrichmentSemanticReviewPlayground` is proven to consume the changed runtime path for Gate B validation. The shared semantic runtime is also bundled by Processing, but automatic Processing is disabled and Gate C is not authorized; no automatic path is to be exercised in this checkpoint. Proposed command, not executed:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:testAiEnrichmentSemanticReviewPlayground" --project fresh-prints-dev --non-interactive
```

Gate B remains **PENDING CORRECTIVE DEV REDEPLOY**. Gate C remains unauthorized. `[NEEDS OWNER DECISION]` — authorize the corrective DEV redeploy and repeat the owner-authenticated Gate B callable canary; do not enable `semanticReviewerEnabled=true`.

## Corrective redeploy and Gate B retest — 2026-09-06

Corrective source was frozen and pushed as `48a84d592507dcde62f54840242677bbc68343ee`; local `development` and `origin/development` matched and the tree was clean before deployment. The source includes the final conservative parser normalization for omitted/null patch sets and case-normalized decision tokens; supplied malformed patch shapes still fail closed.

Exact command:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:testAiEnrichmentSemanticReviewPlayground" --project fresh-prints-dev --non-interactive
```

Exit code: `0`. Exactly one Function deployed; no unrelated Functions or Firebase resources were deployed. Final deployed revision: `testaienrichmentsemanticreviewplayground-00004-cus`. Firebase source hash: `b004fd5c3eab9391ecf0006405ad64e6079941c6`. Prompt version in source: `catalog-semantic-review-v2`. Automatic Semantic Reviewer remained disabled; Autonomous remained OFF; production was untouched.

Gate B retest used the approved temporary owner/admin authentication mechanism and the exact previously successful Pass 1 context for design `Y2IQuCgAPgnqrBIeJuap`; the Pass 2 request contained no image and no catalog mutation. The deployed callable still returned `functions/invalid-argument: Malformed semantic review response.` after the parser corrective. The temporary QA user and user document were deleted. No Pass 2 result, measured Pass 2 cost, combined cost, WAA preview, or semantic-case results can be recorded honestly. Local 12-test semantic core/policy suite and Functions build pass; the remaining live failure is at the deployed provider-response contract boundary and requires further raw-response diagnosis or another approved corrective.

Gate B verdict: **FAILED / BLOCKED AFTER CORRECTIVE RETEST**. Gate A remains PASS. Gate C remains unauthorized. Playground UX corrective was not started.

`[NEEDS OWNER DECISION]` — authorize another narrowly scoped provider-response diagnosis/corrective cycle (with sanitized raw-response capture), or accept Gate B as failed and stop DEV validation. Do not enable `semanticReviewerEnabled=true`.

## Live provider-response diagnosis — 2026-09-06

Owner-authorized diagnostic ran only through the owner/admin-gated DEV Playground callable, with the exact cucumber Pass 1 context and no image. The temporary diagnostic surface was removed after capture.

Gemini (`google` / `gemini-2.5-flash-lite`): HTTP success, one choice, `finish_reason=stop`, plain-string content, usage `prompt_tokens=297`, `completion_tokens=68`. Raw assistant content was a JSON Markdown fence containing:

```json
{"decision":"APPROVE_WITH_PATCH","reason":"The subject 'girl' is too general and could be more specific.","blockersResolved":[],"blockersUnresolved":["subject_specificity_risk:girl"],"patches":{"subjects":["pin-up girl"]}}
```

JSON extraction succeeded after fence removal. The parsed object was structurally intact through `blockersUnresolved`; the first failure was patch validation because `patches` was an object map rather than the required array of `{ field, from, to }` patch records. Normalized result: none; exact first validation error: `Malformed semantic review response.`

OpenAI (`openai` / `gpt-5.6-luna`): HTTP success, one choice, `finish_reason=stop`, plain-string content, no refusal, usage `prompt_tokens=306`, `completion_tokens=243` including `reasoning_tokens=163`. Raw content was canonical JSON with `patches` as an array containing `{ field: "subjects", from: ["girl"], to: ["woman"] }`. JSON extraction succeeded; normalization succeeded; semantic validation succeeded with `APPROVE_WITH_PATCH`, resolved blocker `subject_specificity_risk:girl`, no unresolved blockers. This confirms the common parser is correct for the canonical OpenAI shape and the remaining mismatch is Gemini's patch-map shape.

Live root cause: Gemini emits `patches` as a field-to-values object map, while the approved shared contract requires an array of explicit `{ field, from, to }` records. Previous corrective work did not address this because it had no live raw-response evidence and intentionally did not add speculative patch conversion. Existing fixtures only covered canonical arrays, so they did not reproduce the Gemini map.

No parser semantics were changed during this diagnostic. The temporary diagnostic commit was `c9a9b6889764186d5a822a06d38f955b27bc64ed`; cleanup is being committed separately. Gate B remains pending a narrowly scoped corrective derived from this evidence; Gate C remains unauthorized.

## Evidence-based patch-map corrective and Gate B retest — 2026-09-06

Corrective SHA: `5a4de46ceeaf0aed76cc5298d57a9840621d397a`; local and `origin/development` matched and the working tree was clean before deployment. The corrective converts only plain approved-field patch maps into canonical `{ field, from, to }` records using the exact effective Smart Profile field as `from`, then runs the existing patch validator unchanged. Prompt remains `catalog-semantic-review-v2`; no safety boundary changed.

Exact deployment command:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:testAiEnrichmentSemanticReviewPlayground" --project fresh-prints-dev --non-interactive
```

The command exceeded the local shell timeout while the operation continued server-side; the final runtime state was verified ACTIVE. Exactly one Function was deployed. Final revision: `testaienrichmentsemanticreviewplayground-00006-vic`. Firebase source hash: `1af6dce02bac20066eb5031a21744cef0974a22d`. No unrelated resources were deployed.

Basic Gate B retest used the approved temporary owner/admin authentication mechanism, the exact cucumber Pass 1 context, and no image. Temporary auth data was deleted afterward; no catalog data was mutated.

Gemini result: provider `google`, model `gemini-2.5-flash-lite`, prompt version `catalog-semantic-review-v2`; decision `APPROVE`; blockersResolved `["subject_specificity_risk:girl"]`; blockersUnresolved `[]`; patches `[]`; Pass 2 usage `297` prompt tokens / `79` completion tokens; estimated Pass 2 cost `$0.0000613`.

OpenAI result: provider `openai`, model `gpt-5.6-luna`, prompt version `catalog-semantic-review-v2`; decision `APPROVE_WITH_PATCH`; blockersResolved `["subject_specificity_risk:girl"]`; blockersUnresolved `[]`; canonical patches `[subjects: [girl] -> [woman]]`; usage `306` prompt tokens / `161` completion tokens, including provider reasoning metadata; estimated Pass 2 cost `$0.0002544`.

Pass 1 recorded cost: `$0.0009242` (`4610` prompt / `1158` completion tokens). Combined costs: Gemini `$0.0009855`; OpenAI/Luna `$0.0011786`. No Tag Rerank path or cost was observed.

The captured Gemini fixture, canonical OpenAI fixture, multi-field ordering, invalid-map handling, null/omitted patches, objective-blocker policy, authority protection, one-pass policy, and malformed-output rejection are covered by the focused semantic tests. Final focused suite: 15 passed; Functions build passed; `git diff --check` passed.

Gate B basic verdict: **PASS**. The non-persisting Playground callable does not produce final WAA, so no WAA value is fabricated; deterministic post-patch WAA remains covered by existing Processing tests. Gate C remains unauthorized. Playground UX corrective remains deferred. `[NEEDS OWNER DECISION]` — owner QA/signoff is required before any Gate C authorization or Playground UX corrective.
