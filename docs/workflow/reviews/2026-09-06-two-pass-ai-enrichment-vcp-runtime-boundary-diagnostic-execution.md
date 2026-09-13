# VCP Runtime-Boundary Diagnostic Execution Checkpoint

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Environment | `fresh-prints-dev` |
| Function deployed | `enqueueAiEnrichment` only |
| Revision | `enqueueaienrichment-00107-xit` |
| Firebase source hash | `e24174f404e7a111c55c415e021edf3408c26810` |
| Source generation | `1788703358632179` |
| Region | `us-central1` |
| Invocation count | Exactly 1 authenticated normal Processing invocation |
| Design | `Y2IQuCgAPgnqrBIeJuap` |
| Result | HTTP 200; queued and completed; `ready_for_review` / `needs_review` / `imported` |

## Authorization and safety

This was the single owner-authorized diagnostic run after deployment of the reviewed diagnostic build. No retry, other fixture, Settings mutation, behavioral corrective, Gate C action, WS6 action, Semantic Reviewer enablement, Autonomous enablement, or production action occurred.

Post-run settings readback was unchanged: `semanticReviewerEnabled=false`, `catalogAutonomousLiveEnabled=false`, and `catalogWorkflowMode="shadow"`.

## Boundary evidence

### Boundary A — effective prompt

- Provider: `google`; model: `gemini-2.5-flash-lite`
- Effective prompt SHA-256: `f0d8361382c86d376a4fde70b4f87f6abe006af1a2d7b5aed3e7ea4a99fc179c`
- `promptContainsVisualContextProfile=true`
- `promptContainsVisualContextV1=true`

The required VCP prompt content reached the provider boundary.

### Boundary B — provider/parser

- `finishReason="stop"`
- Raw content length: `1315`
- `rawVisualContextProfileKeyPresent=false`
- `parsedVisualContextProfilePresent=false`
- `parsedVisualContextProfileValid=false`
- `vcpResult="missing"`

The provider returned a non-empty normally terminated response, but the response did not contain the expected VCP key.

### Boundary C — candidate

- `candidateVisualContextProfilePresent=false`

No VCP reached candidate construction because the parsed provider result was missing.

### Boundary D — persistence

- Write branch: `queue`
- `persistenceVisualContextProfilePresent=false`
- Firestore `designs/Y2IQuCgAPgnqrBIeJuap.aiAnalysis.visualContextProfile`: absent

The persisted document also contained no VCP. This is downstream of the missing provider/parser result, not evidence of a persistence-write loss.

## Runtime result and cost

- `aiProcessingStage=ready_for_review`; `aiReviewStatus=needs_review`; `status=imported`
- Canonical title: `Retro Pin-Up Holding Cucumber with Bold Text`
- Category: `Funny & Sarcastic` (`tj0HemRh2RuYLfI7N6nO`)
- `aiAnalysis.visibleText` was present with the expected three strings.
- Smart Profile subjects: `woman`, `cucumber`
- `semanticReviewStatus=ineligible`
- `tagRerankStatus=skipped`; `suggestionAuthorStatus=skipped`; tags empty
- Pass 2: not invoked; Pass 2 cost: `$0`
- Pass 1 usage: `4573` prompt tokens, `417` completion tokens
- Pass 1 estimated cost: `$0.0006241`
- Combined measured cost: `$0.0006241`

## Diagnosis

**First failing boundary: Boundary B, provider/parser response shape.**

The effective prompt contained the VCP instructions and markers, and the provider completed normally with 1,315 characters. The expected VCP key was absent from the raw response, so parsing classified the VCP as missing; candidate construction and persistence consequently received no VCP. The evidence rules out prompt omission, candidate mapping loss, and persistence loss as the first failure for this run.

Root classification: **provider response contract / model-output-shape failure**. This is evidence for a narrow response-contract corrective; it is not authorization to implement one in this checkpoint.

The previous diagnosis was incomplete: the earlier run established only that VCP was absent after persistence. This run localizes the first observed loss to the provider response/parser boundary.

## Next checkpoint

Recommended next action: prepare exactly one evidence-selected, narrow corrective for the provider response contract that preserves the approved VCP schema and existing behavior, then obtain owner authorization for its reviewed implementation/deployment.

`[NEEDS OWNER AUTHORIZATION: EVIDENCE-SELECTED VCP CORRECTIVE PLAN/IMPLEMENTATION]`

No corrective was implemented during this diagnostic execution.
