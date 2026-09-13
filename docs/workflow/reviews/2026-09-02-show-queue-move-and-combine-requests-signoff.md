# Signoff: Show Queue Move / Combine Requests

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Signoff by | Signoff Agent |
| Goal | `show-queue-move-and-combine-requests` |
| Plan | `docs/workflow/plans/2026-09-02-show-queue-move-and-combine-requests-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-test-report.md` |
| Owner QA | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-owner-qa.md` |
| Final status | **APPROVED** |
| DONE | **yes** |

---

## Summary

Staff can move Print Request allocations between Whatnot show queues (individual card, Print Request detail per-show group, and whole-show Move All) using authoritative Cloud Functions `previewShowQueueMove` / `applyShowQueueMove`. Source allocations are canceled with history retained; destination allocations are created with generic lineage `movedFromAllocationId`. Same-PR destination combine uses multi-document sum (e.g. 3+5→8). DNP recovery, Remove from Show, and past/locked Copy remain separate. Owner QA **PASS** on DEV. Production **NOT AUTHORIZED**.

---

## Contract confirmation (final audit)

| Guarantee | Status |
|-----------|--------|
| One authoritative move backend (preview/apply) | YES |
| Individual + bulk use same callables | YES |
| Source canceled (not deleted); history retained | YES |
| `movedFromAllocationId` used | YES |
| `requeuedFromAllocationId` NOT used for normal move | YES |
| Destination multi-doc sum semantics | YES |
| No derived duplicate / merged single allocation doc | YES |
| Movable statuses: `pending` \| `queued` only | YES |
| Printing / terminal destinations blocked | YES |
| Whatnot → Whatnot only; IGS excluded | YES |
| Over-capacity blocked; source==destination invalid | YES |
| Whole-show all-or-nothing; ≤150 source allocations | YES |
| Idempotency `showQueueMoveApplications/{previewChecksum}` | YES |
| Checksum / TOCTOU validation | YES |
| Both show `allocatedQuantity` recomputed | YES |
| PR identity unchanged; queueTab/state correct | YES |
| DNP / Remove / Copy unchanged | YES |
| No production deployment | YES |

---

## Changes Delivered

### Behavior

- Three entry points: Show Queue card, PR detail per-show group, Show-level Move All Requests
- Preview/apply callables with capacity, eligibility, status, checksum, idempotency
- Canceled source rows show “Moved to [destination]” with historical Pocket/Full Size when fully canceled
- Transfer modal uses searchable destination Select and move-specific eligibility

### Files Created (representative)

- `packages/shared/src/types/showQueueMove/`
- `packages/shared/src/utils/showQueueMove.ts` (+ tests)
- `functions/src/lib/showQueueMove.ts`
- `functions/src/previewShowQueueMove.ts` (exports preview + apply)
- `functions/src/showQueueMove.contract.test.ts`
- `apps/studio/.../showQueueMoveService.ts`
- `apps/studio/.../MoveShowQueueAllRequestsModal.tsx`
- `apps/studio/.../buildMovedDestinationByPrintRequestId.ts` (+ test)
- Workflow plan / reviews / owner QA / test report / this signoff

### Files Modified (representative)

- `functions/src/index.ts`
- `firestore.rules` (additive `movedFromAllocationId`)
- Studio transfer modal, UpcomingShowsPage, upcomingShowService, history card, show-queue.css
- `packages/shared/.../showAllocation.types.ts`
- `docs/architecture/DATA_MODEL.md`, `docs/project/DECISIONS.md` (ADR-FP-157)

### Documentation Updated

- DATA_MODEL, DECISIONS (ADR-FP-157), ROADMAP banner, workflow artifacts

---

## Tests

### Automated

- Combined focused suite: **77/77 PASS**
- showQueueMove shared: **11/11**
- printRequestShowTransfer: **4/4**
- Functions + Studio move contracts: **6/6**
- DNP requeue regression: **32/32**
- History card: **13/13**
- Functions build: **PASS**
- Studio `tsc`: **25 pre-existing unrelated errors**; **0** move-path errors

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner QA A–L on DEV | PASS | owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | **not authorized** | 2026-09-02 | Explicit owner instruction |
| Database migration | N/A | | None |
| Design / UX | PASS (Owner QA) | 2026-09-02 | Including post-deploy UX polish |
| Business / policy | PASS | 2026-09-02 | Move vs DNP / combine semantics |
| Secrets / env | N/A | | None |
| DEV Functions + Rules deploy | obtained / completed | 2026-09-02 | `fresh-prints-dev` only |
| Commit + push `development` | authorized | 2026-09-02 | Closeout instruction |

---

## Deploy inventory (DEV completed)

| Item | Status |
|------|--------|
| DEV Functions deployed | **YES** — `previewShowQueueMove`, `applyShowQueueMove` |
| DEV Firestore Rules deployed | **YES** — additive `movedFromAllocationId` |
| Studio DEV QA | **PASS** |
| Portal source | **NO CHANGE** |
| Storage Rules | **NO CHANGE** |
| Indexes | **NONE** |
| Migration | **NONE** |
| Production | **NOT AUTHORIZED** |

---

## Production inventory (future coordinated promotion — DO NOT RUN NOW)

Preserve for later promotion:

### Functions

- `previewShowQueueMove`
- `applyShowQueueMove`

### Firestore Rules

- Additive `movedFromAllocationId` allowlist/schema support

### Studio

- Shared move service/UI
- Hardened `TransferPrintRequestToShowModal`
- `MoveShowQueueAllRequestsModal` / Show Queue action
- Show Queue + Print Request entry points
- Moved-destination display helper / CSS

### Shared

- `showQueueMove` types/helpers

### Not expected

- Storage Rules
- Firestore indexes
- Migration
- Portal hosting

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Production not yet promoted | Info | Coordinated promotion when owner authorizes |
| Studio project-wide tsc pre-existing failures | Low | Unrelated; track separately |
| Whole-show move capped at 150 allocations | Info | Documented product/limit; block when exceeded |

---

## Deferred Items (Roadmap)

- Smart Profiling — **PARKED**
- `show-queue-batch-allocation-performance` — **DEFERRED**
- Production promotion of this goal — future inventory only

---

## Open Blockers

- [x] None for DEV closeout

---

## Verdict

**APPROVED** — Owner QA PASS; final regression green; DEV Functions + Rules already deployed; production not authorized.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes` / IDLE
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` — N/A (handoff package not present)
- [x] Signoff recorded

**Recommended next action for user:** When ready, authorize a separate coordinated production promotion using the inventory above. Do not start Smart Profiling or batch-allocation unless explicitly requested.
