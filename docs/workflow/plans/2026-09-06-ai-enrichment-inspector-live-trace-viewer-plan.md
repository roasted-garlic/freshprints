# Plan: Owner/DEV AI Enrichment Inspector and Live Trace Viewer

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Status | **Proposed for Formal Review; implementation not authorized** |
| Workstream | `ai-enrichment-inspector-and-live-trace-viewer` |
| Environment | DEV first; production not authorized |
| Governing behavior | Observe the existing enrichment pipeline; no behavior change |

## Objective and scope

Add an owner/admin-only Studio Inspector that shows the actual AI enrichment attempt
from effective inputs through provider response, normalization, decisions, candidate,
and persistence. It must support live normal Processing, Playground runs, DEV
integration runs using a real provider, and deliberately trace-enabled automated tests
using mocked/provider-fixture responses.

The Inspector is observability only. It must not fork prompt construction, provider
selection, parsing, Smart Profile normalization, VCP generation, Semantic Reviewer
policy, WAA, Pass 2, or persistence. It must not change the current provider schema
400, prompts, providers, token limit, Semantic Reviewer, Gate C, Autonomous, WS6,
tag-AI, or production behavior.

## Chosen Studio surface

Use one reusable `AiEnrichmentInspector` surface in two existing locations:

1. AI Settings / Playground: `Run with Inspector`, `Open Trace`, and `Import Test
   Trace` for owner/admin users.
2. AI Review: `View AI Trace` on a selected design, opening the latest authorized
   trace for that design.

This is Option C from the request, implemented as one component/model rather than a
new workspace. Exact route/component composition is mechanically verified during
implementation; no fourth workspace is introduced.

## Authorization and server boundary

Access is restricted to active `owner` and `admin` users, matching the existing AI
Playground callable gate. Helpers and Portal users cannot see, retrieve, import, or
export traces. UI hiding is not sufficient: the trace retrieval callable and Firestore
rules must enforce the same role gate server-side.

## Canonical trace model

Add a shared type in `packages/shared/src/types/ai/aiEnrichmentTrace.types.ts`.
One trace has a stable `traceId`, `attemptId`/existing processing correlation when
available, `designId` when applicable, `source`, lifecycle/status, bounded stage
timings, and structured sections:

- `overview`: design/image reference metadata, provider/model, prompt version,
  normalizer version, workflow/autonomous/Semantic Reviewer flags, lifecycle, costs;
- `input`: material categories/descriptions, catalog context, effective settings,
  authority dimensions, and sanitized model selection;
- `prompt`: effective system prompt, rendered user prompt, stored-template hash/label,
  effective prompt hash, and copy-safe metadata;
- `responseContract`: exact `response_format`, schema name, strict flag, JSON Schema,
  token limit, image detail, and provider options;
- `providerRequest`: endpoint family, timestamp, request/transport attempt numbers,
  timeout/retry settings, image count, and redacted request metadata;
- `providerResponse`: raw response text/JSON when explicit full capture is enabled,
  bounded shape metadata otherwise, usage, finish reason, and response timing;
- `providerError`: sanitized status, provider code/type/message/path/request ID,
  retryability, and safe classification;
- `normalized`: raw JSON extraction, normalized canonical response, rejected/omitted
  fields, and focused raw-vs-normalized field diff;
- `smartProfile`: AI-produced profile, effective post-authority profile, provenance,
  staff/import/preset ownership, and normalization changes;
- `vcp`: prompt/raw/parsed-valid/candidate/persisted chain plus profile value;
- `decisions`: category, category gap, objective/semantic blockers, WAA, eligibility,
  automation decision, reason codes, and lifecycle consequence;
- `pass2`: text-only input/output, VCP, blockers, provider/model, raw/parsed result,
  accepted/rejected patches, and before/after recomputation; explicitly `imageCount=0`;
- `candidate` and `persistence`: safe candidate representation versus actual write
  representation;
- `expectedActual`: for test traces, expected result, actual result, and PASS/FAIL;
- `sourceMetadata`: source label, test name/fixture name, and whether provider output
  was live, mocked, or fixture-backed.

Trace source labels are fixed and displayed verbatim:

- `LIVE PROCESSING`
- `PLAYGROUND`
- `DEV INTEGRATION - LIVE PROVIDER`
- `AUTOMATED TEST - MOCK/FIXTURE`

Mock/fixture traces must never be labeled as a Gemini/OpenAI response. Provider fields
for mocked traces must identify the fixture/mock source.

## Trace sink architecture

Define a narrow sink interface around the canonical trace model. Enrichment code emits
one bounded trace shape; the destination varies by context:

`pipeline trace events → trace sink → live DEV sink or automated-test sink`

- Live DEV sink: Firestore-backed, owner/admin-readable, stage updates written without
  changing design lifecycle or waiting on trace writes.
- Automated-test sink: in-memory by default; no Firestore dependency. A deliberate
  test helper can serialize a bounded JSON artifact.
- Playground and DEV integration runs use the same sink model and source labels.
- Sink failures are fail-soft and never alter enrichment success/failure or add AI calls.

The existing `vcpRuntimeDiagnostics` remains useful as a safe event source and is
extended/adapted into this sink; it is not discarded. Existing `AiQueueTraceStore`
remains separate because it traces queue-state transitions, not provider/enrichment
content.

## Trace storage and retention

Proposed DEV-only Firestore path: `aiEnrichmentTraces/{traceId}`. Exact collection
rules and callable wiring are part of implementation verification, but the design is
owner/admin read-only and denies Portal/customer access. A trace is bounded by field
and byte limits; full prompt/raw response capture is explicit and DEV-only. Default
live records retain bounded metadata and stage results; `Capture Full Trace` enables
bounded full prompt/raw response content for a single attempt.

Retention: keep the latest bounded number of traces per design and expire DEV traces
after a short fixed window (proposed 7 days), with an owner-only Clear Trace action.
No production trace collection, migration, backfill, or historical import is included.
If Firestore TTL indexes are required, the implementation review must name them before
deployment; the current Plan assumes no index is needed because reads are by exact
trace ID/design and cleanup is bounded/explicit.

Automated artifacts use the existing ignored `.tmp/` root:

`.tmp/ai-enrichment-traces/`

The directory is not committed, generated artifacts are not committed, and test
helpers clean artifacts by default unless a caller explicitly requests retention.
The Inspector provides `Import Test Trace` using the same canonical JSON shape; import
is local/read-only and does not write Firestore.

## Provider error handling

The current 400 contract failure proved that `vision_invalid_request` alone is
insufficient. The provider request layer will produce a bounded sanitized error
record before the generic error classification is applied. The allowlist retains:
HTTP status, provider error code/type/message, field/path, provider request ID, and
retryability. It strips authorization headers, API keys, query credentials, tokens,
raw image data, unrelated response fields, and unbounded bodies. No arbitrary raw error
body is persisted. This is an observability corrective, not a provider behavior change.

## Inspector experience

Use collapsible sections:

1. Overview and lifecycle
2. Input and authority context
3. Stored Template vs Final Effective Prompt
4. Structured Response Contract / request metadata
5. Provider response or sanitized error
6. Normalized response and focused raw-vs-normalized diff
7. AI vs effective Smart Profile authority merge
8. VCP boundary chain
9. Decision/blocker/WAA pipeline
10. Pass 2 text-only trace, when present
11. Candidate vs Actually Persisted
12. timings and costs

Actions: Copy Full Trace, Copy Schema, Copy Request Metadata, Export Trace JSON, and
Compare Traces. Copy/export always pass through the same redaction/allowlist. Compare
is a focused field-level comparison of effective prompt, response schema, request
options, raw response shape, normalized output, VCP, and blocker/decision result. It
is not a testing analytics product.

## Live updates and correlation

Use Firestore `onSnapshot` on the exact trace document for live stage updates and
completed reload/reopen. No WebSocket or custom server is needed. Reuse an existing
processing attempt/correlation ID if present; otherwise the sink creates one trace ID
and records the relationship without changing design IDs or lifecycle identifiers.

Lifecycle is observability-only:

`created → prompt_ready → request_sent → provider_response → parsed → candidate → semantic_review → persisted → complete`

with `failed` at any stage. Exact enum names are finalized from current pipeline
events during implementation.

## Automated test trace visibility

Only important boundary tests emit traces by default or on demand; ordinary unit tests
remain silent. Initial trace-enabled coverage should include provider request-contract
tests, provider error sanitization, parser/schema parity, VCP boundary tests,
candidate/persistence contracts, semantic blocker eligibility, and one representative
Pass 2 no-image test.

Each trace-enabled test can capture test name, source label, provider/model, effective
prompts, response schema/options, bounded raw provider/fixture result, sanitized error,
normalized output, Smart Profile, VCP, blockers/WAA, Pass 2, persistence, expected vs
actual, PASS/FAIL, and meaningful timings. Mock/fixture traces are explicitly marked
`AUTOMATED TEST - MOCK/FIXTURE`.

Tests use the in-memory sink and may write bounded JSON to `.tmp/ai-enrichment-traces/`.
No test trace writes Firestore unless a separately named DEV integration test opts into
the live sink. Trace collection does not change requests, responses, retries, or
assertions and adds no AI calls.

## Proposed implementation files

- New shared canonical trace types under `packages/shared/src/types/ai/`.
- New shared trace redaction/serialization utilities under `packages/shared/src/utils/`.
- New Functions trace sink/context and provider-error sanitizer adjacent to
  `functions/src/ai/`.
- Existing Functions provider, pipeline, candidate, persistence, and semantic-review
  modules only at instrumentation boundaries; no behavior fork.
- New owner/admin trace callable and DEV-only Firestore rules section.
- New Studio trace service/hook/component under existing Settings and AI Review feature
  areas, with local JSON import/export/compare.
- Existing `apps/studio/src/renderer/src/config/aiQueueTraceClient.ts` is not replaced;
  it remains the separate queue-state trace.
- Trace-enabled provider/parser/pipeline tests and test artifact helper.
- `.gitignore` already ignores `.tmp/`; implementation must verify no generated trace
  path is added outside that ignore rule.

Exact filenames/routes are `[NEEDS REPO CHECK]` until implementation confirms current
service, callable export, Settings tab, and AI Review action topology.

## Testing and QA

Tests must cover permission gating, redaction/secrets, exact effective prompt/schema,
provider-error sanitizer, raw/normalized capture and diff, VCP chain, authority merge,
blocker/WAA trace, Pass 2 image absence, persistence truth, live updates/reload,
retention/cleanup, Copy Full Trace, import/compare, no behavior change, no extra AI
calls, Functions tests/build, and Studio tests/typecheck/build as applicable.

Owner QA is DEV-only and uses no production data: open a live Processing trace, open a
Playground trace, import a mocked test trace, compare mocked vs live failure, verify all
source labels, copy/export redaction, provider 400 details, VCP chain, persistence
distinction, permissions, retention, and that Semantic Reviewer/Autonomous remain OFF.

## Deployment and data disposition

Expected future DEV Functions inventory is `[NEEDS REPO CHECK]`: include only the
existing Processing/Playground callables and any new trace retrieval callable that
mechanically bundles this work. Studio requires its normal DEV build/reload. No
production deployment, Rules/indexes outside the trace authorization, migration,
backfill, Gate C, WS6, or Settings mutation is in this Plan.

Prompt simplification is recorded as a separate follow-up: **AI enrichment prompt
simplification audit**. It is not part of Inspector implementation.

## Addendum — optional live automated-test feed

Trace-enabled DEV tests may opt into a live Firestore sink using existing
Application Default Credentials and `AI_ENRICHMENT_TRACE_LIVE_DEV=1`. Ordinary
tests remain in-memory, local, Firestore-independent, and silent. Mock traces
retain the immutable `AUTOMATED TEST - MOCK/FIXTURE` label; real-provider tests
use `DEV INTEGRATION - LIVE PROVIDER`. The same bounded serializer is used for
live updates and `.tmp/ai-enrichment-traces/` artifacts. No credentials are
stored, no additional AI calls are made, and no new authentication mechanism is
introduced.

## Stop boundary

This Plan authorizes planning and Formal Review only. It does not authorize code,
Firestore rules, trace persistence, deployment, test processing, Y2 retry, Settings
mutation, Semantic Reviewer, Gate C, Autonomous, WS6, or production action.
