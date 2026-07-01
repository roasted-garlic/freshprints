# Plan: Direct AI Processing Execution

## Goal

Remove the unnecessary enqueue plus Firestore-trigger hop from staff-started AI Processing and run the existing enrichment pipeline immediately from the callable request path.

This should make manual AI Processing feel closer to the Settings AI Playground while preserving:

* the current OpenAI/development provider behavior
* model override behavior for re-runs
* existing review eligibility rules
* one-at-a-time processing
* persisted AI suggestions, analysis, and review states

## Scope

In scope:

* change the existing `enqueueAiEnrichment` callable to execute the pipeline immediately
* stop relying on the Firestore `onDocumentUpdated` trigger for normal staff-started AI Processing
* simplify renderer AI Processing flow so it no longer waits on a separate queued stage transition
* keep sequential AI Review processing behavior
* keep current role/permission checks and design eligibility rules
* update workflow docs where behavior materially changes
* run targeted tests and repo checks

Out of scope:

* changing prompts, categories, tags, OCR, or AI output parsing
* changing model allowlists or reasoning-effort behavior
* production deploy without explicit human approval
* Phase 6 or Phase 7 work
* Portal, checkout, shipping, payment, Whatnot, or ecommerce work

## Current Problem

Current staff-started AI Processing does:

1. renderer calls `enqueueAiEnrichment`
2. callable writes `aiProcessingStage: queued`
3. Firestore trigger wakes up
4. trigger calls `runAiEnrichmentPipeline`
5. renderer separately waits for terminal status

Because the system only processes one design at a time (`AI_ENRICHMENT_MAX_INSTANCES = 1`), the queue hop adds latency and complexity without meaningful throughput gain for manual processing.

## Planned Change

### Functions

Keep the existing callable name `enqueueAiEnrichment` for compatibility, but change its behavior:

1. validate caller and design eligibility as today
2. reset the design into a fresh pending AI state
3. call `runAiEnrichmentPipeline(designId, secret)` immediately
4. return the resulting terminal stage metadata to the caller

This preserves the external callable surface while changing the execution model from:

```txt
enqueue now, process later
```

to:

```txt
start now, finish this request when AI processing is done
```

### Renderer

Renderer AI Processing actions should:

* await the callable directly
* reload the design list after completion
* stop waiting on the old queue subscription helper for terminal status

The queue UI can remain as a sequential processing control surface, but it should now be a sequential **run-now** surface rather than a sequential **enqueue** surface.

## Risks

* Callable duration is longer than before because the request now includes the OpenAI round-trip.
* Firestore trigger removal changes operational behavior and must not break reruns or failure handling.
* Existing AI Review loading state must reset correctly after direct completion.

## Mitigations

* Reuse existing pipeline code instead of duplicating provider logic.
* Keep failure handling in `runAiEnrichmentPipeline`.
* Keep sequential processing (`AI_ENRICHMENT_MAX_INSTANCES = 1`) unchanged.
* Preserve current design status and review eligibility checks.
* Add targeted tests where practical and rerun repo checks.

## Approval

Human approval granted in chat on 2026-06-29 to implement this behavior change.
