## FreshForge State

| Field | Value |
|-------|-------|
| Status | **IDLE** |
| DONE | **yes** |
| Current Mode | managed-phase (closed) |
| Last completed goal | `show-queue-move-and-combine-requests` |
| Current Phase | **DONE** |
| Plan Status | **complete** |
| Implementation Status | **complete** |
| Test Status | **passed_with_notes** |
| Signoff Status | **approved** |
| Owner QA | **PASS** |
| DEV deploy | **complete** — Functions + Firestore Rules → `fresh-prints-dev` |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| `show-queue-batch-allocation-performance` | **DEFERRED** |
| Last updated | 2026-09-02 |
| Last Completed Step | Signoff + commit + push `development` complete (`8bca82f6`) |

## Artifacts

| Artifact | Path |
|----------|------|
| Plan | `docs/workflow/plans/2026-09-02-show-queue-move-and-combine-requests-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-test-report.md` |
| Owner QA | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-owner-qa.md` |
| Signoff | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-signoff.md` |
| ADR | ADR-FP-157 in `docs/project/DECISIONS.md` |

## Human checkpoint

**Human Checkpoint Required: no**

**Allowed Actions:**

- Idle / await next owner goal

**Forbidden Actions:**

- Production deploy unless newly authorized
- Starting Smart Profiling or batch-allocation without explicit owner start

## Next Required Step

None — FreshForge **IDLE**. Await owner for next goal or production promotion authorization.

## Decision log

| Date | Decision |
|------|----------|
| 2026-09-02 | DEV deploy: `previewShowQueueMove`, `applyShowQueueMove`, firestore:rules (`movedFromAllocationId`) → `fresh-prints-dev` |
| 2026-09-02 | Owner QA **PASS** |
| 2026-09-02 | Final regression 77/77; Functions build PASS; Studio tsc pre-existing-only |
| 2026-09-02 | Signoff **APPROVED**; production **NOT AUTHORIZED**; Smart Profiling **PARKED**; batch-allocation **DEFERRED** |
| 2026-09-02 | Owner authorized commit + non-force push to `development` |
