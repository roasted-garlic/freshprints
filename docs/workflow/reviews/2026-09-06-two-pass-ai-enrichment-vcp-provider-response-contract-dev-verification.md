# DEV Verification Checkpoint: Machine-Enforced Pass 1 VCP Contract

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Environment | `fresh-prints-dev` / `us-central1` |
| Deployment | Exactly the two authorized Functions |
| Y2 invocation count | Exactly 1 authenticated normal Processing invocation |
| Design | `Y2IQuCgAPgnqrBIeJuap` |
| Verdict | **VCP PROVIDER CONTRACT RUNTIME VERIFICATION: FAIL** |
| Classification | **FAIL — PROVIDER CONTRACT** |

## Deployment

### `enqueueAiEnrichment`

- State: **ACTIVE**
- Revision: `enqueueaienrichment-00108-zob`
- Firebase source hash: `23185a9fdef4e3381e26367ed338f340fc9ea4bc`
- Source generation: `1788705669881957`
- Project/region: `fresh-prints-dev` / `us-central1`

### `testAiEnrichmentSemanticReviewPlayground`

- State: **ACTIVE**
- Revision: `testaienrichmentsemanticreviewplayground-00008-teh`
- Firebase source hash: `23185a9fdef4e3381e26367ed338f340fc9ea4bc`
- Source generation: `1788705728435617`
- Project/region: `fresh-prints-dev` / `us-central1`

Only the two reviewed Functions were deployed. No Rules, indexes, Storage Rules,
Studio, Portal, or production target was touched.

## Y2 result

The exact authorized call completed with HTTP 200 at the callable boundary, but the
Processing result was:

- `queued=true`
- `completed=true`
- `aiProcessingStage=failed`
- `aiReviewStatus=pending`
- `status=imported`
- pipeline terminal reason: `VisionRequestError`
- safe provider error classification: `vision_invalid_request`
- provider response status: HTTP `400`

The existing transport retry loop emitted four `vision.request.failed` events for the
same single Processing invocation. This was existing transport behavior; no second Y2
invocation or response-quality retry was issued by this checkpoint.

The deployed safe telemetry does not retain the upstream provider error body: the
pipeline log envelope uses its reserved `message` field, so the exact upstream 400
message is unavailable from DEV logs. The exact observable provider failure is HTTP
400 → `VisionRequestError` → `vision_invalid_request` → truthful failed Processing
state. No schema loosening or corrective change was made after the failure.

## VCP trace

### Boundary A — prompt

- Effective prompt SHA-256:
  `f0d8361382c86d376a4fde70b4f87f6abe006af1a2d7b5aed3e7ea4a99fc179c`
- `promptContainsVisualContextProfile=true`
- `promptContainsVisualContextV1=true`
- provider/model selected before request: Google / `gemini-2.5-flash-lite`

### Boundary B — provider response

- Provider response received: **NO**
- HTTP status: `400`
- Finish reason: **N/A**
- Raw content length: **N/A**
- Raw VCP key: **N/A**

### Boundaries C–E

- Parsed VCP: **N/A**; no provider response existed
- Candidate VCP: **false / not constructed**
- Persistence VCP: **false / no successful write**
- Firestore `aiAnalysis.visualContextProfile`: **absent**
- VCP version: **N/A**
- Summary/detail: **N/A**

## Cost and semantic observation

- Prompt tokens: unavailable
- Completion tokens: unavailable
- Pass 1 cost: `$0` recorded
- Pass 2 calls: `0`
- Pass 2 cost: `$0`
- Smart Profile subjects readback: `woman`, `cucumber` (pre-existing data)
- Semantic blockers: not evaluated for this failed run
- Objective blockers: not evaluated for this failed run
- Automation readback: `shadow`; reason code `shadow_would_auto_approve`
- WAA: not newly evaluated
- Gate C Role 1 qualification: **not qualified / not evaluated because Processing failed**

## Safety readback

- `semanticReviewerEnabled=false`
- `catalogAutonomousLiveEnabled=false`
- `catalogWorkflowMode="shadow"`
- Autonomous: OFF
- Other designs processed: NO
- Settings mutation: NO
- Authority mutation: NO
- Tag Rerank: not run; no new tag-AI execution
- Suggestion Author: not run
- Ready/publication transition: NO; failed state remained `readyAt` absent
- Production: untouched
- Gate C: not executed
- WS6: not started

## Diagnosis and stop boundary

The provider contract failed at request acceptance before any provider response was
available. The expected trace therefore stopped after Boundary A:

`prompt contract present` → **HTTP 400 provider contract rejection**

This checkpoint does not loosen the schema, change the provider, change the parser,
raise the token limit, add a second model call, or rerun Y2.

`[NEXT: AI ENRICHMENT INSPECTOR / TRACE VIEWER PLAN BEFORE FURTHER PIPELINE CHANGES]`

No second Y2 run is authorized by this checkpoint.
