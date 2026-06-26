# Review: Staff-controlled sequential AI processing queue

**Date:** 2026-06-24  
**Plan:** `docs/workflow/plans/2026-06-24-staff-ai-processing-queue-plan.md`  
**Status:** approved

## Architecture

Approved. Client-side sequential orchestration over existing callable + Firestore subscription; trigger retained; concurrency capped at 1 instance.

## Security

Approved. No new public endpoints; staff auth unchanged on `enqueueAiEnrichment`. OpenAI key remains server-only.

## Notes

- `retryAllFailedProcessing` defaults to concurrency 1.
- Auto-advance preference stored in `sessionStorage`.
