# Plan: Diagnose and Correct the Remaining Pass 1 VCP Runtime Boundary

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Scope | Normal DEV Processing VCP production/mapping gap |
| Status | Proposed for Formal Review; implementation not authorized |
| Governing contract | ADR-FP-182 / `visual-context-v1` |

## Objective

Determine the first runtime boundary at which the approved VCP disappears, then apply the
smallest machine-enforced corrective. Do not retry Y2 or process any other design in this phase.

## Evidence-based diagnosis

The one authorized post-deployment Y2 run completed successfully on
`enqueueaienrichment-00106-gig`, source hash `c994dbe6d898490a8090eaa7815209c231eb6c7b`, with
Gemini `gemini-2.5-flash-lite`, prompt version `catalog-enrich-v38`, 4,573 prompt tokens, 407
completion tokens, and no persisted VCP.

Source proves:

- Normal Processing calls `buildSimpleCatalogEnrichmentUserPrompt` through
  `geminiVisionEnrichmentProvider.callVision`.
- The shared builder now invokes `ensureVisualContextPromptContract`.
- Gemini request construction sends the same text/image chat shape as Playground, with
  `max_completion_tokens: 2500`, `detail: high`, and no `response_format` or `responseSchema`.
- `normalizeSimpleCatalogEnrichment` declares and validates `visualContextProfile`.
- `buildSimpleCatalogEnrichmentResult`, candidate cleanup, and `markAiSuccess` preserve a valid
  VCP; no source evidence shows a valid parsed VCP being deleted.
- Cloud Logging recorded a non-empty completion and no `vision.empty_content` event. The runtime
  log records usage but does not record finish reason, raw VCP presence, parsed VCP presence, or
  persistence VCP presence.

Consequently the previous prompt-only diagnosis is disproven as complete. The first currently
proven gap is **Boundary B/C observability**: the available runtime evidence cannot distinguish
these remaining causes:

1. Gemini omitted `visualContextProfile` despite receiving the contract (category C).
2. Gemini returned a malformed or differently named VCP that normalization rejected (category D).
3. The response ended at a non-empty provider finish condition before VCP (category C/H).

No structured-output schema exists in the current adapter, so category B is not currently
proven. The 407 completion tokens do not prove truncation because finish reason is not recorded
for non-empty completions. Persistence categories E/F remain unproven and are contradicted by the
checked-in mapping trace for a valid VCP.

## Playground versus Processing

| Boundary | Playground | Normal Processing |
|---|---|---|
| Builder | `buildSimpleCatalogEnrichmentUserPrompt` | Same shared builder |
| Contract helper | Executed | Executed |
| Provider | `resolveVisionProviderCredentials` | `resolveAiEnrichmentProvider` |
| Model | Request-selected model | Settings-selected `gemini-2.5-flash-lite` |
| System prompt | `buildSimpleCatalogEnrichmentSystemPrompt` | Same system prompt |
| User content | Text plus image when supplied | Text plus image, image `detail: high` |
| Response config | No `response_format` / schema | No `response_format` / schema |
| Max output | `2500` | `2500` |
| Parser | `extractJsonObject` → `normalizeSimpleCatalogEnrichment` | Same parser path |
| Persistence | None; returns canonical text | `buildSimpleCatalogEnrichmentResult` → candidate → `markAiSuccess` |

The known Playground success establishes that the parser can accept VCP, but does not establish
that the Y2 normal Processing raw response contained one. The first meaningful remaining
divergence is the provider/model response itself, but exact classification requires telemetry.

## Narrow diagnostic implementation

Before changing model behavior, add temporary DEV-only, non-sensitive boundary telemetry:

- `effectivePromptSha256` and booleans for `visualContextProfile` and `visual-context-v1` in the
  normal provider request event;
- provider `finishReason`, raw content length, and raw `visualContextProfile` key presence;
- parsed VCP presence and validation result after normalization;
- candidate VCP presence immediately before return;
- persistence VCP presence immediately before `markAiSuccess` writes.

Do not log full prompts, images, raw model content, API keys, tokens, or customer PII. Keep the
telemetry DEV-gated and bounded to the Y2 diagnostic path or an owner/admin diagnostic context.
Remove it after the boundary is proven, or retain only an approved minimal production-safe metric.

## Corrective decision tree

After the diagnostic evidence identifies the boundary:

- If raw VCP is absent with a clean stop, make VCP a machine-enforced response contract using the
  existing provider mechanism supported by the Gemini-compatible endpoint; preserve the approved
  VCP schema and one image call.
- If the raw response is truncated, make the smallest measured output-budget correction; do not
  increase limits speculatively.
- If raw VCP exists but normalization rejects it, correct the parser compatibility for the exact
  observed shape without weakening validation or fabricating fields.
- If parsed/candidate VCP exists but persistence telemetry is false, correct that exact mapping;
  otherwise do not touch persistence.

The final corrective must require a valid model-produced VCP, preserve `visual-context-v1`, keep
Pass 2 fail-closed, and never synthesize VCP from Smart Profile/title/description.

## Required tests after diagnosis

- Effective normal Processing prompt contract and SHA/marker telemetry.
- Provider request snapshot proving no accidental schema omission once a schema is selected.
- Finish-reason and output-budget regression.
- Representative valid VCP response acceptance and exact observed malformed-shape behavior.
- Missing/invalid VCP fail-closed behavior.
- Candidate and both persistence write-shape assertions.
- Playground/Processing parity.
- Pass 2 text/context-only input, authority ordering, lifecycle, and tag-AI absence.
- Functions build and scoped tests; retain documented unrelated baseline exceptions.

## Deployment and data boundary

No implementation or deployment is authorized by this artifact. Once separately authorized, the
expected DEV allowlist is `functions:enqueueAiEnrichment` and
`functions:testAiEnrichmentSemanticReviewPlayground` if the shared provider/diagnostic modules
remain bundled by both. Re-evaluate exact bundling in the Implementation Review.

Rules: NO. Indexes: NO. Migration/backfill: NO. Data mutation: NONE during diagnosis. A later
single Y2 verification is required only after implementation and deployment authorization.

## Stop boundary

Stop after this Plan and Formal Review. Do not implement, deploy, retry Y2, process another
fixture, mutate Settings, enable Semantic Reviewer, execute Gate C, start WS6, or touch production.
