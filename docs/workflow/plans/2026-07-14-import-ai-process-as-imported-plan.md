# Plan: Bulk import AI process-as-imported

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-import-ai-process-as-imported-review.md |

---

## Goal

During Studio bulk import, each design that finishes import (derivative-ready / `pipelineSuccess`) immediately joins the existing sequential background AI queue, so AI can run while remaining files continue uploading. Staff can open AI Review and approve/reject designs that finished early without waiting for the whole batch.

## Background

Today `ImportsPage` only calls `enqueueImportedDesignsForBackgroundAi` when `batchImport.phase === "completed"`. That was chosen after ADR-FP-014 to avoid N parallel `enqueueAiEnrichment` callables (429 storms). The session-scoped pump already supports mid-session adds and sequential processing; we simply never push IDs until the batch ends. Owner approved process-as-imported.

Single PNG import already enqueues on that one design’s success — no change needed there.

## Scope

### In Scope
- Enqueue each successful batch design into `enqueueImportedDesignsForBackgroundAi` as soon as that file’s pipeline succeeds
- Keep **one-at-a-time** sequential pump (no parallel enqueue storms)
- Dedup remains via existing `seenDesignIds`
- Amend ADR-FP-014 wording: post-import AI starts **as designs become ready**, not only after batch completion
- Update stale WORKFLOWS / import narrative if it still says “wait for batch complete” or “no automatic enqueue”
- Manual smoke of bulk import overlapping with AI Processing visibility

### Out of Scope
- Changing AI model, prompts, or enrichment pipeline internals
- Parallel Cloud Function AI runs / raising concurrency
- Shared global lock between Import background pump and Processing-tab Start AI (document as residual risk; do not redesign unless review requires)
- Changing UploadActivity leave/close behavior
- Production deploy of functions (no function changes expected)
- Portal import (N/A)

---

## Affected Areas

### Files / Modules (expected)
- `apps/studio/.../imports/services/importBatchOrchestrationService.ts` — invoke optional per-file success callback when `pipelineSuccess` + `designId`
- `apps/studio/.../imports/hooks/useBatchImport.ts` — wire callback → `enqueueImportedDesignsForBackgroundAi([id])`
- `apps/studio/.../imports/pages/ImportsPage.tsx` — remove or narrow batch-complete bulk enqueue (prefer remove; dedupe makes keep-as-safety-net optional)
- `apps/studio/.../imports/services/importAiBackgroundQueue.ts` — comment/doc only if needed
- `docs/project/DECISIONS.md` — ADR-FP-014 amendment
- `docs/WORKFLOWS.md` and/or import setup docs — align narrative
- Optional unit test for “callback fired per success” if easy without Electron

### Architecture Impact
- [x] Details: UI/hooks/services stay in Studio imports feature. Orchestration emits readiness; enqueue service remains the sequential gate. No new cross-feature layers.

### Security Impact
- [x] None (same staff-gated callable path as today)

### Data Model Impact
- [x] None

### Backend Impact
- [x] None (reuse existing `enqueueAiEnrichment`)

### UI / UX Impact
- [x] Details: During long bulk uploads, Processing / Needs Review may populate before import UI shows 100%. No new settings control.

### Migration Impact
- [x] None

---

## Approach

1. Add optional `onDesignPipelineSuccess?: (designId: string) => void` (name flexible) to batch upload progress/options in `importBatchOrchestrationService`.
2. After each file maps to a successful `pipelineSuccess` with a non-empty `designId`, call the callback (do not await AI; fire-and-forget into the queue API).
3. In `useBatchImport` upload path, pass callback that calls `enqueueImportedDesignsForBackgroundAi([designId])`.
4. On `ImportsPage`, remove the batch-`completed` bulk enqueue effect (or keep as redundant safety net — prefer remove for clarity since dedupe would hide bugs).
5. Leave single-import effect unchanged.
6. Amend ADR-FP-014: sequential constraint unchanged; timing = per ready design during batch.
7. Manual test: small batch (3+) while watching AI Review / Processing.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | Studio / shared as applicable | yes if touched types break build |
| Unit tests | Existing import/AI unit tests if any; add thin test only if orchestration callback is easily unit-testable | no (optional) |
| Build | `apps/studio` typecheck/build script if practical | yes |
| Backend/rules | N/A | no |

### Manual
- [x] Details: Start a bulk import of several PNGs; confirm AI begins on early successes before batch reaches 100%; confirm no parallel enqueue storm (processing advances roughly one-at-a-time); confirm failed/skipped files never enqueue; cancel mid-batch does not break queue.

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (import + AI overlap smoke)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Accidental parallel enqueue | High | Keep existing sequential pump; never call callable in a fan-out loop |
| Import pump + Processing Start AI overlap | Medium | Out of scope; server `already_processing` skip; note in ADR/signoff |
| Cancel mid-batch leaves AI running for finished designs | Low | Desired — already-imported designs should continue AI |
| Double-enqueue on complete effect if both paths kept | Low | Prefer remove complete-path; pump dedupes if kept |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert Studio imports enqueue wiring to batch-complete-only handoff. No data migration. In-flight AI jobs are harmless.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md (ADR-FP-014)
- [x] Other: WORKFLOWS.md import/AI narrative if stale

---

## Open Questions
- [x] None — owner approved process-as-imported; keep sequential pump.

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-14-import-ai-process-as-imported-review.md
- Verdict: approved
