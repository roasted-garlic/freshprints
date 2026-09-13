# Implementation Review: AI Review Stuck Processing Recovery

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Plan | `docs/workflow/plans/2026-09-01-ai-review-stuck-processing-recovery-plan.md` |
| Formal review | `docs/workflow/reviews/2026-09-01-ai-review-stuck-processing-recovery-review.md` (**approved**) |
| Verdict | **approved** |
| Production | **NOT AUTHORIZED** |

---

## Confirmation checklist

| Requirement | Status |
|-------------|--------|
| Reuses existing server stale-requeue path (`enqueueForProcessing` → `enqueueAiEnrichment`) | **pass** |
| No direct Firestore reset from Studio | **pass** |
| No new lifecycle status | **pass** |
| No concurrency changes | **pass** |
| 10-minute threshold aligns with server (`>` boundary) | **pass** |
| Failed **Retry AI Processing** unchanged | **pass** |
| No Firestore Rules changes | **pass** |
| No index changes | **pass** |
| No migration/backfill | **pass** |
| No unrelated AI work | **pass** |

---

## Scope delivered

| Requirement | Status |
|-------------|--------|
| Shared `AI_ENRICHMENT_STALE_STAGE_MS` constant | **pass** |
| Studio stale detection from persisted `updatedAt` | **pass** |
| **Processing appears stuck** copy when stale waiting | **pass** |
| **Retry Processing** action (distinct from failed retry) | **pass** |
| `already_processing` → non-destructive message | **pass** |
| ADR-FP-014 sequential queue preserved | **pass** |
| Focused unit + wiring tests | **pass** |

---

## Files changed

| File | Change |
|------|--------|
| `packages/shared/src/constants/aiEnrichment.constants.ts` | Added `AI_ENRICHMENT_STALE_STAGE_MS` |
| `packages/shared/src/constants/aiEnrichment.constants.test.ts` | New — constant contract |
| `functions/src/ai/aiEnrichmentConfig.ts` | Re-import stale constant from shared |
| `apps/studio/.../utils/aiProcessingStaleRecovery.ts` | New — stale detection + copy |
| `apps/studio/.../utils/aiProcessingStaleRecovery.test.ts` | New |
| `apps/studio/.../utils/aiReviewInboxEligibility.ts` | `isDesignStaleProcessingRetryable` |
| `apps/studio/.../utils/aiReviewInboxEligibility.test.ts` | Stale vs failed eligibility |
| `apps/studio/.../hooks/useAiReviewInbox.ts` | `retryStaleProcessingSelected` |
| `apps/studio/.../hooks/aiProcessingStaleRecovery.wiring.test.ts` | New — enqueue wiring |
| `apps/studio/.../components/AiReviewProcessingStatusSection.tsx` | Stuck status copy |
| `apps/studio/.../components/AiReviewWorkspace.tsx` | Retry Processing button |
| `apps/studio/.../pages/AiReviewPage.tsx` | Wire stale retry props |

---

## Functions runtime impact

**Source-only:** `aiEnrichmentConfig.ts` now imports `AI_ENRICHMENT_STALE_STAGE_MS` from shared. Value unchanged (`600_000` ms). **No DEV deploy required** for owner QA; **no production deploy authorized.**

---

## DEV restart scope

| Step | Required |
|------|----------|
| Restart `npm run dev:studio` | **Yes** — Studio renderer changes only |
| Functions deploy | **No** |
| Rules / indexes / hosting | **No** |
| Production | **NOT AUTHORIZED** |

---

## Owner DEV QA checklist

### Simulate stale state (DEV only)

Pick a test design in AI Review → Processing with active stage (e.g. `sending_to_ai`) and `aiReviewStatus: pending`. In Firestore **DEV**, set `updatedAt` to more than 10 minutes ago (e.g. 11 minutes). Do **not** change production data.

### Verify

1. Fresh processing (< 10 min) — normal stepper, no stuck copy, no **Retry Processing**
2. Stale processing (≥ 10 min + 1 ms per server boundary) — **Processing appears stuck**, **Retry Processing** visible
3. Click **Retry Processing** — AI resumes via enqueue; no duplicate concurrent job
4. Failed design — **Retry AI Processing** still works (unchanged)
5. Auto-queue **Start AI** / sequential behavior unchanged when not stale

Reply: `PASS` / `PASS WITH NOTES` / `FAIL: [description]`

---

## Test report

See `docs/workflow/reviews/2026-09-02-ai-review-stuck-processing-recovery-test-report.md`.
