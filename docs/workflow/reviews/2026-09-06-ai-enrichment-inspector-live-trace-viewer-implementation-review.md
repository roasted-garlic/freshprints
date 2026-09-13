# AI Enrichment Inspector / Live Trace Viewer — Final Implementation Review

Date: 2026-09-06. Environment: DEV-only source implementation; no deployment.

## Implemented

The canonical model is `packages/shared/src/types/ai/aiEnrichmentTrace.types.ts`. Shared redaction, bounded serialization, validation, comparison, and the ordinary in-memory sink are in `packages/shared/src/utils/aiEnrichmentTrace.ts`. Trace records use `aiEnrichmentTraces/{traceId}` for bounded live data and `aiEnrichmentTraceFull/{traceId}` for owner-only full captures. Admin SDK writes are fail-soft; client writes are denied.

Functions now provide:

- Playground trace creation before provider execution and completion capture using the actual prompt, response contract, response/normalization, usage, cost, and stage data.
- Normal Processing attempt lifecycle trace creation/completion without altering provider, parser, retry, or persistence behavior.
- Owner/admin `getAiEnrichmentTrace` and bounded `listAiEnrichmentTraces` callables.
- Owner-only full capture enforcement; admins receive bounded/redacted data.
- Provider error sanitizer retaining only status, code, type, message, field/path, request ID, retryability, and classification.
- Optional `AI_ENRICHMENT_TRACE_LIVE_DEV=1` sink using existing Application Default Credentials; no embedded credentials.
- `.tmp/ai-enrichment-traces/` artifact serializer, already Git-ignored.

Studio now includes an AI Settings trace browser with automatic bounded Firestore discovery, live single-document subscription, import validation, local import, copy/export through the callable serializer, focused Compare Traces, and the reusable Inspector. AI Review includes a `View AI Trace` action for the selected design. Mock/fixture and live-provider labels remain immutable and distinct.

## Security

Owner/admin bounded reads are allowed only through the reviewed trace surface. Helpers, customers, and Portal users are denied. Client writes are denied. Full prompt/raw response storage and retrieval are owner-only in the separate full collection. Redaction strips authorization, API-key, secret, token, password, raw image, image bytes, and similar fields. No extra AI calls were added.

## Automated test live mode

Ordinary tests remain local/in-memory and Firestore-independent. Deliberately trace-enabled tests may use `AI_ENRICHMENT_TRACE_LIVE_DEV=1` with existing Application Default Credentials; the test itself must emit canonical events to `LiveDevAiEnrichmentTraceSink`. The Inspector discovers bounded active/recent traces automatically and subscribes to stage updates. The command is repository-test-command-specific, for example:

`$env:AI_ENRICHMENT_TRACE_LIVE_DEV='1'; npx tsx --test <trace-enabled-test-file>`

No live provider test was run. No provider call is created for tracing.

## Retention and deployment

Trace records are bounded and intended for the reviewed seven-day DEV retention target. No new TTL/index/scheduler deployment was introduced. Automatic expiry still requires the existing project cleanup convention or a separately authorized TTL/configuration action: `[NEEDS OWNER DECISION: TRACE TTL DEPLOYMENT]` if automatic TTL is required. The exact DEV deployment inventory is intentionally not guessed before deployment review.

## Validation

- Shared trace and provider sanitizer tests: 3 passed.
- Functions TypeScript build: PASS.
- Studio targeted typecheck: no Inspector/trace errors.
- Studio full typecheck/build: `ACCEPTED PRE-EXISTING VALIDATION EXCEPTION` for existing artwork-upscale, export, print-request, explicit-content, timestamp, and shared legacy test/type errors; no Inspector-specific error was reported.
- `git diff --check`: PASS apart from normal line-ending warnings.
- Java: Eclipse Temurin/OpenJDK 21.0.11 at `C:\Users\Roasted Garlic\.local-jdk\jdk-21.0.11+10`, configured only in the test shell.
- Inspector Rules tests: PASS, 3/3 under `npx firebase emulators:exec --only firestore "npx tsx --test tests/firebase/aiEnrichmentTrace.rules.test.ts"`.
- Existing Rules regression: PASS, `npm run test:rules`, 169/169 tests passed, 0 failed.

## Final status

The reviewed source implementation and scoped local validation are complete. No deployment, commit, push, live provider test, Y2 processing, Semantic Reviewer enablement, Autonomous mode, Gate C, WS6, or production action occurred.

## Exact DEV deployment inventory

- Functions: `enqueueAiEnrichment` (Processing bundle/instrumentation), `testAiEnrichmentPlayground` (Playground instrumentation), `getAiEnrichmentTrace`, and `listAiEnrichmentTraces`.
- Firestore Rules: YES; `aiEnrichmentTraces/{traceId}` bounded owner/admin read and `aiEnrichmentTraceFull/{traceId}` owner-only read, with client writes denied.
- Indexes: NO new composite index. Discovery orders by one field (`startedAt`) and limits results; Firestore single-field ordering is sufficient.
- TTL/config: NO for this deployment. Bounded records and manual cleanup remain; automatic seven-day TTL is a separately authorized configuration decision.
- Studio: normal DEV Studio build/reload/package for the Settings Inspector and AI Review action; no production release.

Recommended next authorization phrase after Rules validation:

`Authorize DEV deployment of the reviewed AI Enrichment Inspector Functions, Firestore Rules, and Studio surfaces, followed by owner QA of live Processing, Playground, automated mock-trace streaming, permissions, redaction, import/export, and Compare Traces. Keep Autonomous and Semantic Reviewer OFF; do not touch production.`

## DEV deployment checkpoint — 2026-09-06

Deployment command:

`firebase deploy --project fresh-prints-dev --only "functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:getAiEnrichmentTrace,functions:listAiEnrichmentTraces,firestore:rules"`

All four Functions are ACTIVE in `us-central1`:

| Function | Revision | Firebase source hash |
|---|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00109-tir` | `136044aa4981a065fac8be13329841916b1600fc` |
| `testAiEnrichmentPlayground` | `testaienrichmentplayground-00065-yul` | `136044aa4981a065fac8be13329841916b1600fc` |
| `getAiEnrichmentTrace` | `getaienrichmenttrace-00001-sic` | `d1bf8c05fcaf0e385c3852d7257cc2c0bf315857` |
| `listAiEnrichmentTraces` | `listaienrichmenttraces-00001-hem` | `d1bf8c05fcaf0e385c3852d7257cc2c0bf315857` |

Firestore Rules deployment succeeded. No indexes or TTL/config were deployed. DEV settings readback: `catalogAutonomousLiveEnabled=false`; `semanticReviewerEnabled` absent and resolves false under the existing loader default.

The exact trace-enabled mock test was added at `functions/src/ai/aiEnrichmentTrace.live.test.ts` because no pre-existing live-trace test existed. Command:

`$env:AI_ENRICHMENT_TRACE_LIVE_DEV='1'; $env:GOOGLE_CLOUD_PROJECT='fresh-prints-dev'; npx tsx --test functions/src/ai/aiEnrichmentTrace.live.test.ts`

Result: 1/1 PASS, no real provider call. DEV trace ID `f8310fe0-baba-4028-ae94-81dcff740530`; source `AUTOMATED TEST - MOCK/FIXTURE`; lifecycle `complete`; 6 stages persisted. Automatic Inspector discovery is supported by the bounded trace list and live subscription; visual owner QA remains pending.

The normal Studio package build still stops at unrelated pre-existing type errors; no Inspector-specific error was reported. The source-level Studio DEV surface is ready for owner QA/reload. This checkpoint stops at `[NEEDS OWNER QA: AI ENRICHMENT INSPECTOR DEV EXPERIENCE]`.
