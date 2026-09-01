## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| Phase | **TEST / SIGNOFF PENDING** |
| Current goal | `pre-smart-profiling-print-request-and-gang-sheet-polish` — Bucket 7 reconciled; final signoff **NOT DONE** |
| Queued goal | `ai-review-stuck-processing-recovery` — plan + review approved; **implement BLOCKED** |
| Plan (queued) | `docs/workflow/plans/2026-09-01-ai-review-stuck-processing-recovery-plan.md` |
| Review (queued) | **approved** — `docs/workflow/reviews/2026-09-01-ai-review-stuck-processing-recovery-review.md` |
| Deferred follow-up | `show-queue-batch-allocation-performance` — `docs/workflow/plans/2026-09-01-show-queue-batch-allocation-performance-deferred-plan.md` |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| Last updated | 2026-09-01 |

## Prerequisite gate (hard)

**Do not implement** `ai-review-stuck-processing-recovery` until:

1. `pre-smart-profiling-print-request-and-gang-sheet-polish` final signoff **DONE**
2. Bucket 7 uncommitted source resolved per owner decision
3. Workflow state returns to **IDLE** or explicit owner override to start implement

## Prior goal status (unchanged)

| WS | Owner DEV QA |
|----|--------------|
| WS1 | **PASS** |
| WS2 | **PASS** |
| WS3 | **PASS** |

Signoff blockers for prior goal:

1. ~~Uncommitted Bucket 7 managed-goal source~~ — **reconciled 2026-09-01** (commits `f1989cf9`, `68db625d`, `3873ab4f`)
2. Final regression test pass + signoff documentation on reconciled stack

## Next goal summary

Expose **Retry Processing** on Processing tab when AI stage is **waiting** and `updatedAt` ≥ **10 min** stale threshold; reuse `enqueueForProcessing` → server `enqueue.stale_requeued`. Studio-only V1; no Functions deploy for QA.

## Allowed actions

- Read docs / workflow state
- Close prior goal signoff (when blockers cleared)
- **Implement** stuck-processing recovery (after prerequisite gate only)

## Forbidden actions

- Implement stuck-processing recovery **before** prior signoff
- Production deploy
- Smart Profiling
- Touch production stuck design
- Broaden `resetAiEnrichmentForProcessing` in V1

## Decision log

| Date | Decision |
|------|----------|
| 2026-09-01 | Bucket 7 reconciled: WS3 drift removed; Internal Gang Sheet committed; batch allocation deferred |
| 2026-09-01 | New goal `ai-review-stuck-processing-recovery` plan + review **approved**; implement queued after prior signoff |
| 2026-09-01 | V1: Studio-only stale retry via existing enqueue path; 10 min threshold; no scheduled recovery |
