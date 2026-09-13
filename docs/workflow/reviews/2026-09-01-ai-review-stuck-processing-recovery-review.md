# Review: AI Review Stuck Processing Recovery

| Field | Value |
|-------|-------|
| Date | 2026-09-01 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-01-ai-review-stuck-processing-recovery-plan.md` |
| Verdict | **approved** |

---

## Summary

V1 can safely be **Studio-only** for owner DEV validation: expose **Retry Processing** when a design is in a **waiting** AI stage and `updatedAt` is at or past the existing server stale window (**10 minutes**), calling the same `enqueueForProcessing` → `enqueueAiEnrichment` path that already performs `enqueue.stale_requeued`. Optional monorepo change moves the stale constant to `packages/shared` with no runtime backend change and **no Functions deploy** required for QA.

Implementation remains **gated** until `pre-smart-profiling-print-request-and-gang-sheet-polish` final signoff and FreshForge IDLE.

---

## Formal Review Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Can V1 be Studio-only? | **Yes** — UX + shared constant alignment; no new server behavior |
| 2 | Is any Functions change actually required? | **No** for behavior. **Optional:** import `AI_ENRICHMENT_STALE_STAGE_MS` from shared in `aiEnrichmentConfig.ts` (DRY only) |
| 3 | How is the 10-minute stale threshold represented? | **Authoritative:** `AI_ENRICHMENT_STALE_STAGE_MS` in `functions/src/ai/aiEnrichmentConfig.ts` today (`10 * 60 * 1000`). **Proposed:** move to `packages/shared/src/constants/aiEnrichment.constants.ts` + functions re-import |
| 4 | How does Studio determine stale? | `resolveAiProcessingOutputStatus === "waiting"` AND `Date.now() - design.updatedAt.toMillis() >= AI_ENRICHMENT_STALE_STAGE_MS` |
| 5 | What enqueue path is reused? | `aiEnrichmentEnqueueService.enqueueForProcessing` → callable `enqueueAiEnrichment` (same as Start AI and `retryFailedProcessing`) |
| 6 | How is `already_processing` handled? | Manual retry: surface user-safe message; no Firestore edits. Server should not return this after true stale window; edge race documented. Auto-queue halt on `already_processing` **out of V1 scope** |
| 7 | ADR-FP-014 preserved? | **Yes** — manual single-design retry; auto-queue unchanged |
| 8 | Rules required? | **No** |
| 9 | Indexes required? | **No** |
| 10 | Migration/backfill? | **No** |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio stale UX only; no reset expansion |
| Architecture alignment | pass | Reuses enqueue service; no layer violation |
| Security impact addressed | pass | Existing staff callable auth |
| Data model impact addressed | pass | Read-only use of existing fields |
| Backend impact addressed | pass | No deploy for V1; optional constant import |
| Test strategy adequate | pass | 9 focused cases + typecheck |
| Human checkpoints identified | pass | Prior signoff gate + DEV QA |
| Roadmap alignment | pass | Small bug fix after polish goal |
| Documentation plan | pass | Minimal; optional DATA_MODEL note |
| No silent scope expansion | pass | Auto-queue fix explicitly deferred |

---

## Architecture Review

**Findings:**

- Stale recovery belongs in Studio eligibility + inbox hook, not new pipeline code.
- `design.updatedAt` is already on Studio `Design` type (`Timestamp`).
- Server `isStaleAiProcessing` in `enqueueAiEnrichment.ts` mirrors proposed client gate.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Retry uses existing staff-only `enqueueAiEnrichment`; no new public surface.
- No client-side Firestore writes for recovery.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] None for plan approval; production deploy remains unauthorized

---

## Data Model Review

**Findings:** No schema changes.

**Required changes:** [x] None

---

## Backend Review

**Findings:**

- Stale re-queue already implemented (`enqueue.stale_requeued` when `isStaleAiProcessing` true).
- `resetAiEnrichmentForProcessing` correctly excluded from V1.

**Required changes:** [x] None for runtime. Implement may align constant import only.

---

## Testing Review

**Findings:**

- Plan covers stale/non-stale, failed path regression, terminal states, enqueue contract.
- DEV QA may simulate stale via Firestore `updatedAt` on DEV project.

**Required changes:** [x] None

---

## Documentation Review

**Findings:** Optional brief note in `docs/architecture/DATA_MODEL.md` AI processing section after implement — not blocking.

---

## Required Changes

None.

---

## Blockers

None for **plan approval**. **Implementation blocked** until prior managed goal signoff.

---

## Verdict Rationale

Owner constraints match existing server capabilities. No duplicate AI system. Shared constant is the correct cross-layer alignment. Formal review confirms enqueue path is sufficient without expanding `resetAiEnrichmentForProcessing`.

---

## Next Step

1. Complete `pre-smart-profiling-print-request-and-gang-sheet-polish` signoff (including Bucket 7 resolution).
2. Set FreshForge IDLE.
3. Begin **Implement** phase for this goal only.
