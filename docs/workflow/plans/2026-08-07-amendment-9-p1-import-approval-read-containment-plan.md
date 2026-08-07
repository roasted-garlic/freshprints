# Plan: Amendment 9 P1 — Import / approval one-shot design-document read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Agent (overnight unattended pass) |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Amendment | 9 P1 — import / approval one-shot read containment |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| After | P3 commit `c3d3c45` (separate; do not modify P3 in this commit) |
| Related | Amendment 9 Plan/Review; P0 Signoff |

---

## Goal

Reduce redundant per-design Firestore oneshot reads in Studio **import** and **AI Review approval** paths by passing/reusing trustworthy in-stack `Design` snapshots through the call chain, while preserving all validation, security, cache invalidation, ready transitions, image derivatives, exactly-once AI enqueue, and P0 no-reload behavior.

---

## Background (investigation at HEAD after P3)

Confirmed Amendment 9 claims against current source:

| Path | Traced `getDesignById` | Untraced write-path `getDoc` | Total / success |
|------|------------------------:|-----------------------------:|----------------:|
| Import + derivatives | 2 | 3 | **5** |
| AI enqueue (client) | 0 | 0 | **0** |
| Approve | 1 | 2 | **3** |

Root pattern: mark/approve helpers re-`getDesignById` after a write that already returned (or could return) a merged `Design`, and `updateDesign` / `applyCatalogApprovalUpdate` immediately re-`getDoc` the same document. DEV tracer only wraps `getDesignById`, so write-path gets are invisible in Debug.

---

## Investigation classification (summary)

### Import success reads

| ID | Op | Classification | Action |
|----|----|----------------|--------|
| I1 | `createDesign` post-`setDoc` `getDoc` | CACHEABLE/REUSABLE | Optional: create-merge; **retain at least one materialize** unless merge proven |
| I2 | `markDesignProcessing` `getDesignById` | **REDUNDANT** vs create return | Skip when `knownDesign` passed |
| I3 | `updateDesign` pre-`getDoc` (from I2) | **REDUNDANT** vs I2/create | Skip when `knownExisting` passed |
| I4 | `markDesignDerivativesComplete` `getDesignById` | **REDUNDANT** vs processing return | Skip when `knownDesign` passed |
| I5 | `updateDesign` pre-`getDoc` (from I4) | **REDUNDANT** vs I4 | Skip when `knownExisting` passed |

### Approve success reads

| ID | Op | Classification | Action |
|----|----|----------------|--------|
| A1 | draft `updateDesign` pre-`getDoc` | **REQUIRED** (unless known Design from inbox passed — **out of minimal slice**; retain A1) | Keep |
| A2 | `approveDesignForCatalog` `getDesignById` | **REDUNDANT** vs A1 merge return | Pass draft-updated Design; skip get |
| A3 | `applyCatalogApprovalUpdate` pre-`getDoc` | **CACHEABLE/REUSABLE** vs A1/A2 | Pass knownExisting from that Design |

### Must retain

- Status/path validation before derivative completion (on whatever Design snapshot is used)
- Approval guards: archived / rejected / already ready
- `applyCatalogApprovalUpdate` **write** (ready + `readyAt` + AI fields)
- Exactly one AI enqueue behavior
- Failure recovery paths / P0 local reconcile
- Server enqueue Admin reads (out of P1)

---

## Scope

### In Scope

1. **Import:** Thread `Design` from `createDesign` → derivative pipeline → mark helpers; optional `knownExisting` on `updateDesign` to collapse same-stack double reads.
2. **Approval:** Use draft `updateDesign` return value in `approveFromInbox` → `approveDesignForCatalog(knownDesign)` → `applyCatalogApprovalUpdate(knownExisting)`.
3. **DEV tracing (authorized):** Sanitized oneshot tracing for write-path `getDoc` in create/update/applyCatalogApprovalUpdate (metadata only — collection/source/path pattern; **no document contents**).
4. Discriminating tests for read-count / no duplicate same-purpose get on happy path; approval guards; enqueue once; P0 regressions; import/ready regressions.
5. Workflow docs; handoff notes. Separate commit from P3.

### Out of Scope

- P3 taxonomy cache changes
- P4 publication rate guard
- Portal behavior
- Stage 1b / search
- New API / schema / dependency
- Passing inbox `selectedDesign` into draft update to eliminate A1 (larger surface; defer)
- Removing AI Review document listener
- Firebase deploy / Studio installer
- Server `enqueueAiEnrichment` Admin gets

### Target budgets

| Path | Current | P1 target |
|------|--------:|----------:|
| Import success client design-doc oneshots | 5 | **≤2** (stretch **1** if create-merge + knownExisting both land) |
| Import traced `getDesignById` on happy path | 2 | **0** when Design threaded |
| Approve success oneshots | 3 | **≤2** (stretch **1** = A1 only) |
| Approve traced `getDesignById` | 1 | **0** when draft Design passed |

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/.../imports/services/importOrchestrationService.ts`
- `apps/studio/.../imports/services/importDerivativeService.ts`
- `apps/studio/.../designs/services/designReadyService.ts`
- `apps/studio/.../designs/services/designService.ts` (`updateDesign`, optionally `createDesign`, `applyCatalogApprovalUpdate`, tracing)
- `apps/studio/.../designs/services/catalogApprovalService.ts`
- `apps/studio/.../ai-review/services/aiReviewInboxService.ts`
- Focused tests under designs / imports / ai-review

### Architecture Impact

- [x] Details: Pass-through Design snapshots; optional knownExisting on write helpers. No new layers. Firestore remains authority; LWW concurrency model unchanged.

### Security Impact

- [x] Details: Permission asserts unchanged. Guards still run on provided snapshots. No Rules changes. Tracing sanitized.

### Data Model / Backend / UI / Migration

- [x] None material (client optimization only)

---

## Approach

1. Extend `markDesignProcessing` / `markDesignDerivativesComplete` with optional `knownDesign?: Design`. When provided and `id` matches, skip `getDesignById`; still validate status/paths on that object.
2. Extend `updateDesign` (and `applyCatalogApprovalUpdate`) with optional `knownExisting` (Design or document data). When provided and id matches, skip pre-write `getDoc`; still run archive/status/`createdBy` guards on that data; still merge-return after write; still invalidate caches.
3. `importOrchestrationService` + `importDerivativeService`: pass create Design through; use mark return values.
4. `approveFromInbox`: `const draftUpdated = await updateDesign(...); return approveDesignForCatalog(..., draftUpdated)`.
5. `approveDesignForCatalog`: accept optional known Design; skip get when present; pass into apply update.
6. Add sanitized write-path oneshot tracing on the getDoc sites that remain (and any still used for non-optimized callers).
7. Do **not** remove guards; do **not** weaken readyAt / Processing 3→2→1→0 / P0 local reconcile.

**If Formal Review challenges any removal as unproven:** retain that read and document why (UNKNOWN → REQUIRED).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Focused service / wiring tests | `npx tsx --test` on touched test files | yes |
| AI Review / import regressions | existing focused suites | yes |
| Studio typecheck | workspace typecheck | yes |
| Studio build | `npm run build:studio` (or workspace build) | yes |
| Lint | `npm run lint` | yes |
| `git diff --check` | yes |

### Discriminating cases

1. One successful import: expected design-doc authority read count after optimization  
2. Many imports: linear cost  
3. No duplicate same-purpose read when Design already trustworthy  
4. Failed create/update recoverable  
5. Derivative metadata correct  
6. Ready transition correct (approval path)  
7. Exactly one AI enqueue  
8. Approval succeeds with expected state  
9. Archived / not-found approval guards intact  
10. Approval does not silently overwrite invalid state  
11. P0 no-reload on successful approve remains  
12. Processing 3→2→1→0 remains  
13. readyAt behavior remains  
14–15. Design Library / large-PNG import regressions as existing tests cover  

### Manual

- [ ] Combined with morning 45-design QA after P3 Functions deploy (Phase 3 checklist)

---

## Human Checkpoints Anticipated

- [ ] Manual batch QA (morning combined checklist) — not overnight
- [ ] No Firebase deploy for P1 (Studio-only)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stale knownDesign across write boundary | High | Only pass snapshots obtained in same sequential stack immediately before use; invalidate caches still |
| Missed concurrent archive between draft and approve | Medium | Accept today’s LWW; guards on A1 merge still apply; optional retain A3 if review insists |
| Tracer noise / PII | Medium | Metadata-only tracing |
| Accidental P3/P4 edits | High | Separate commit; forbid those paths |

---

## Rollback Plan

Revert the P1 commit. No data migration. No deploy required to roll back Studio source on branch.

---

## Documentation Updates Required

- [ ] Other: plan/review/test/impl-review; CURRENT-STATE / recent-completed (local handoff; references may be gitignored)
- [ ] Optional TESTING note if new test commands added

---

## Open Questions

- [x] None blocking — overnight prompt authorizes evidence-based redundant-read removal; Formal Review must challenge each removal.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-07-amendment-9-p1-import-approval-read-containment-review.md`
- Verdict: pending
