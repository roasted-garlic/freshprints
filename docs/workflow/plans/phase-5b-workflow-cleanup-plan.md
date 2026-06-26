# Phase 5B QA Workflow Cleanup Plan

**Date:** 2026-06-24  
**Goal:** Tab-specific AI Processing behavior and rejected re-run flow.

## Scope

| Tab | Workspace | Actions |
|-----|-----------|---------|
| Processing | Preview, pipeline status, optional read-only suggestions | Retry AI (failed only); no edit/approve |
| Needs Review | Preview, suggestions, editable form | Approve, Reject, Skip, nav, auto-advance |
| Rejected | Preview, read-only suggestions, rejection status | Reopen, Re-run AI, nav |

## Re-run AI (rejected only)

- Extend `enqueueAiEnrichment` with `rerunRejected: true` (owner/admin)
- Sets `status: imported`, `aiReviewStatus: pending`, `aiProcessingStage: queued`
- Deletes `aiSuggestions` / `aiAnalysis` (replace, no versioning in 5B)
- Does not apply to new imports (automatic enqueue unchanged)

## Out of scope

Phase 5C, customer requests, print runs, full page redesign.
