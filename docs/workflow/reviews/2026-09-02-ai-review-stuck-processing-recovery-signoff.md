# Signoff: AI Review Stuck Processing Recovery

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Signoff by | Owner (final) + Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-01-ai-review-stuck-processing-recovery-plan.md` |
| Review | `docs/workflow/reviews/2026-09-01-ai-review-stuck-processing-recovery-review.md` |
| Implementation review | `docs/workflow/reviews/2026-09-02-ai-review-stuck-processing-recovery-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-09-02-ai-review-stuck-processing-recovery-test-report.md` |
| Owner QA | `docs/workflow/reviews/2026-09-02-ai-review-stuck-processing-recovery-owner-qa-pass.md` |
| Final status | **APPROVED** |
| Owner final signoff | **APPROVED** (2026-09-02) |
| Production | **NOT AUTHORIZED** |

---

## Summary

Studio-only V1 exposes **Processing appears stuck** and **Retry Processing** when a design is in an active waiting AI stage and persisted `updatedAt` is older than the authoritative **10-minute** server stale window. Retry reuses `enqueueForProcessing` → existing `enqueueAiEnrichment` stale-requeue path. Shared constant `AI_ENRICHMENT_STALE_STAGE_MS` aligned across Studio and Functions (source-only import; no runtime behavior change).

---

## Product contract (verified)

| Contract | Status |
|----------|--------|
| 10-minute authoritative stale threshold (shared + server `>` boundary) | **pass** |
| Fresh waiting — normal processing, no Retry Processing | **pass** |
| Stale waiting — stuck copy + Retry Processing | **pass** (automated; manual stale click not observed) |
| Failed — Retry AI Processing unchanged | **pass** |
| Retry Processing → `enqueueForProcessing` | **pass** |
| Server authoritative for `stale_requeued` | **pass** |
| No client Firestore reset | **pass** |
| No concurrency / lifecycle / Rules / indexes / migration | **pass** |
| Functions runtime unchanged beyond constant import | **pass** |

---

## Tests

### Automated (final regression)

```bash
npx tsx --test \
  apps/studio/src/renderer/src/features/ai-review/utils/aiProcessingStaleRecovery.test.ts \
  apps/studio/src/renderer/src/features/ai-review/utils/aiReviewInboxEligibility.test.ts \
  apps/studio/src/renderer/src/features/ai-review/hooks/aiProcessingStaleRecovery.wiring.test.ts \
  packages/shared/src/constants/aiEnrichment.constants.test.ts \
  apps/studio/src/renderer/src/features/ai-review/utils/aiProcessingQueue.test.ts
```

**24/24 pass** (exit 0)

Functions build: **pass**

Studio `npx tsc --noEmit`: pre-existing debt on `development` (unrelated files). Goal-scoped stale-recovery files introduce **no new typecheck errors**; `useAiReviewInbox.ts:554-555` nullability notes are pre-existing observer code, not introduced by this goal.

### Manual (owner)

| Test | Result |
|------|--------|
| Owner DEV QA — normal processing, no regression | **PASS** |
| Manual stale 10+ min retry click | **Not observed** (processing completed normally) |

---

## Explicit non-actions

- Production stuck design **not** recovered in this task
- Production deploy **not** authorized
- Functions deploy **not** required for DEV validation

---

## Deferred / parked

| Item | Status |
|------|--------|
| Smart Profiling | **PARKED** |
| `show-queue-batch-allocation-performance` | **DEFERRED** |
| Auto-queue halt on `already_processing` | **deferred** post-V1 |

---

## Follow-up

If stuck-processing symptom recurs in production: new incident diagnosis with read-only diagnostics; do not assume this V1 covers all backend failure modes.
