# Plan: AI Review Stuck Processing Recovery

| Field | Value |
|-------|-------|
| Date | 2026-09-01 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal ID | `ai-review-stuck-processing-recovery` |
| Prerequisite | `pre-smart-profiling-print-request-and-gang-sheet-polish` **final signoff DONE** + FreshForge **IDLE** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |

---

## Goal

Prevent AI Review designs from remaining indefinitely at **Processing → Sending to AI** when the backend attempt has died or timed out, by exposing **staff-controlled stale recovery** that reuses the existing `enqueueAiEnrichment` stale-requeue path. No second AI system, no scheduled jobs, no concurrency changes, no new lifecycle status.

---

## Background

Prior audit (2026-09-01) classified this as **PARTIALLY DONE**:

- Pipeline failures normally land on `aiProcessingStage: failed` with **Retry AI Processing** in Studio.
- Hard function timeout/crash can leave an active stage (`sending_to_ai`, etc.) with `aiReviewStatus: pending`.
- Server `enqueueAiEnrichment` already treats active stages as stale when `updatedAt` is older than **10 minutes** and re-queues (`enqueue.stale_requeued`).
- Studio never calls enqueue for `waiting` designs and exposes no stale retry — staff may need Firestore/console recovery.

Owner product decision (binding for V1):

- Use existing enqueue stale-requeue only.
- **Studio-only** UX if source confirms no backend behavior change required.
- Do **not** broaden `resetAiEnrichmentForProcessing`.
- Do **not** add scheduled recovery or concurrency.
- Preserve ADR-FP-014 sequential processing.

---

## Scope

### In Scope

- Shared constant for stale threshold (10 min) aligned with server
- Studio stale detection for active/waiting AI stages using `design.updatedAt`
- Processing tab UI: **Processing appears stuck** + **Retry Processing** (only when stale)
- Handler reusing `aiEnrichmentEnqueueService.enqueueForProcessing` (same path as Start AI / failed retry)
- Friendly handling when server returns `already_processing` on manual retry (edge race)
- Focused unit tests (stale detection, eligibility, enqueue wiring, queue semantics)
- Owner DEV QA checklist (simulated stale timestamps in DEV; no production data changes)
- Workflow review + signoff artifacts

### Out of Scope

- `resetAiEnrichmentForProcessing` eligibility expansion
- `recoverStaleAiJobs` scheduled function
- Auto-queue behavior changes for `already_processing` halting the full queue (documented follow-up)
- Production recovery of the current stuck production design (separate owner procedure after signoff)
- Smart Profiling, Functions deploy, Firestore Rules/indexes, migrations
- Changing the 10-minute server threshold

---

## Affected Areas

### Files / Modules (expected)

| Area | Path |
|------|------|
| Shared stale constant | `packages/shared/src/constants/aiEnrichment.constants.ts` (+ test) |
| Functions import alignment | `functions/src/ai/aiEnrichmentConfig.ts` (import/re-export from shared — no behavior change) |
| Stale detection + copy | `apps/studio/.../utils/aiProcessingOutput.ts` (or new `aiProcessingStaleRecovery.ts`) |
| Eligibility | `apps/studio/.../utils/aiReviewInboxEligibility.ts` |
| Inbox hook (retry handler) | `apps/studio/.../hooks/useAiReviewInbox.ts` |
| Workspace actions | `apps/studio/.../components/AiReviewWorkspace.tsx` |
| Status section copy | `apps/studio/.../components/AiReviewProcessingStatusSection.tsx` |
| Tests | `apps/studio/.../utils/aiProcessingOutput.test.ts` (new or extend), `aiReviewInboxEligibility.test.ts`, `aiProcessingQueue.test.ts` / contract tests as needed |

### Architecture Impact

- [x] Details: Studio presentation + shared constant only. Reuses existing `aiEnrichmentEnqueueService` → `enqueueAiEnrichment` callable. No new services or backend pipeline.

### Security Impact

- [x] None — same staff-only callable and permissions as existing Start AI / Retry failed.

### Data Model Impact

- [x] None — reads existing `aiProcessingStage`, `aiReviewStatus`, `updatedAt`. No new fields.

### Backend Impact

- [x] Details: **Optional source-only alignment** — move `AI_ENRICHMENT_STALE_STAGE_MS` to `packages/shared` and import in `aiEnrichmentConfig.ts`. **No deploy required** for V1 DEV validation (constant value unchanged). **No runtime behavior change.**

### UI / UX Impact

- [x] Details: Stale waiting designs show stuck copy + **Retry Processing** warning button. Non-stale waiting unchanged. Failed state **Retry AI Processing** unchanged.

### Migration Impact

- [x] None

---

## Approach

### 1. Centralize stale threshold (shared)

Add to `packages/shared/src/constants/aiEnrichment.constants.ts`:

```ts
/** Must match server stale gate in enqueueAiEnrichment (isStaleAiProcessing). */
export const AI_ENRICHMENT_STALE_STAGE_MS = 10 * 60 * 1000;
```

Update `functions/src/ai/aiEnrichmentConfig.ts` to import from shared (remove duplicate literal). Add shared test asserting value = 600_000 and optional static contract that functions config re-exports same symbol.

**Rationale:** Studio cannot import `functions/`; shared is the established cross-app constant location (`ALLOWED_VISION_MODEL_IDS`, etc.).

### 2. Stale detection helper (Studio)

Pure function, e.g. `isAiProcessingStaleForRecovery(design, nowMs?)`:

1. `resolveAiProcessingOutputStatus(design) === "waiting"` (active pipeline stage, not `failed` / `not_generated` / `ready`).
2. `design.updatedAt` resolves to milliseconds (Firestore `Timestamp.toMillis()`).
3. `nowMs - updatedAtMs >= AI_ENRICHMENT_STALE_STAGE_MS`.

Do **not** show retry before threshold. Server remains authoritative (`isStaleAiProcessing` rejects early retry).

### 3. Eligibility + UI

- `isDesignStaleProcessingRetryable(design, tab)` → Processing tab + stale waiting.
- `canRetryStaleProcessing` in `useAiReviewInbox` (parallel to `canRetryProcessing` for failed).
- **Retry Processing** button (warning variant) when stale; hide when not stale.
- Status message: **Processing appears stuck** when stale waiting (stepper may still show last active group).
- Keep **Retry AI Processing** for `failed` only.

### 4. Retry handler

Mirror `retryProcessingSelected` but gate on stale eligibility:

1. `clearTerminalAiProcessingLedgerEntry(designId)` if needed for re-entry.
2. `aiEnrichmentEnqueueService.enqueueForProcessing(designId, { visionModelIdOverride })`.
3. Apply `buildDesignPatchFromEnqueueResult` on success.
4. On `queued: false`:
   - `already_processing` → user-safe message (race before server stale window); **do not** throw unhandled.
   - other reasons → existing error pattern.
5. Reload / `onQueueChanged` as failed retry does.
6. **Do not** edit Firestore from Studio directly.

Server path when stale: `enqueueAiEnrichment` → `isStaleAiProcessing` true → `enqueue.stale_requeued` → reset `queued` + run pipeline.

### 5. Queue / ADR-FP-014

- Manual **Retry Processing** only — does not auto-start concurrent jobs.
- Auto-queue continues to skip `waiting` designs via `findNextAwaitingIndex` / `isDesignAwaitingAiStart`.
- No change to Stop / Start AI sequential loop in V1.

### 6. DEV owner QA simulation

Tests use injected `nowMs`. Manual DEV QA: adjust a test design's `updatedAt` in Firestore (DEV only) to >10 minutes ago with `aiProcessingStage: sending_to_ai` and `aiReviewStatus: pending`, then verify UI + retry. Document steps in test report; **do not** touch production design.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Stale detection + eligibility | `npx tsx --test apps/studio/.../utils/*stale* apps/studio/.../utils/aiReviewInboxEligibility.test.ts` | yes |
| Shared constant contract | `npx tsx --test packages/shared/src/constants/aiEnrichment.constants.test.ts` (extend) | yes |
| Queue regression | `npx tsx --test apps/studio/.../utils/aiProcessingQueue.test.ts` | yes |
| Studio typecheck | `npm --prefix apps/studio run typecheck` if script exists / build | yes |

### Test cases (minimum)

1. Waiting + fresh `updatedAt` → not stale; no Retry Processing.
2. Waiting + stale `updatedAt` → stale; Retry Processing eligible.
3. Retry calls `enqueueForProcessing` (mock/spy or contract read).
4. Successful stale requeue patch reconciles UI (existing patch builder).
5. `already_processing` → surfaced error, no destructive reset.
6. `failed` → existing Retry AI Processing only.
7. `ready` / `not_generated` → no stale retry.
8. Sequential queue selection unchanged (existing tests).
9. Design identity fields untouched by client retry path.

### Manual (owner DEV QA)

See human checkpoint in review doc after implement.

---

## Human Checkpoints

| Checkpoint | When |
|------------|------|
| Prior goal signoff | **Before implement** |
| DEV manual stale retry | After implement, before signoff |
| Production recovery procedure | After signoff (separate doc; not this implementation) |
| Production deploy | **NOT AUTHORIZED** in this goal |

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Studio/server threshold drift | Single shared constant + test |
| Early retry before server stale | UI gate at 10 min; server rejects non-stale active stages |
| Duplicate enqueue | Server `already_processing` / in-flight callable; manual single-design retry |
| Accidental Functions deploy | Implement phase: Studio + shared constant only; flag if behavior change needed |

Rollback: revert Studio UI + shared constant import in functions config (no data migration).

---

## FreshForge Impact

| Area | Impact |
|------|--------|
| Starter Surface | None |
| Development Tooling | None |
| Documentation | Optional one-line in `DATA_MODEL.md` stale recovery note — only if behavior doc gap |

---

## Implementation Gate

**Do not implement until:**

1. `pre-smart-profiling-print-request-and-gang-sheet-polish` signoff **DONE**
2. `.cursor/workflow/state.md` **IDLE** (or explicit owner override)
3. This plan **approved** (review complete)

---

## Open Questions

- [x] Shared constant placement → `packages/shared/src/constants/aiEnrichment.constants.ts`
- [x] Functions change required? → **No** for behavior; optional import alignment only
- [ ] Auto-queue `already_processing` halt → **deferred** post-V1
