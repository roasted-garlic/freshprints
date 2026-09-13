# Implementation Review: Show Queue Move / Combine Requests

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Implementation / Review Agent |
| Plan | `docs/workflow/plans/2026-09-02-show-queue-move-and-combine-requests-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-review.md` |
| ADR | ADR-FP-157 |
| Verdict | **approved for DEV deploy checkpoint** |
| Production | **NOT AUTHORIZED** |

---

## Summary

Trusted Functions `previewShowQueueMove` / `applyShowQueueMove` implement cancel + `movedFromAllocationId` MOVE for individual and whole-show scopes. Studio transfer modal and Move All Requests use the same backend. DNP `requeuedFromAllocationId` and Remove-from-Show delete semantics remain separate.

---

## Proof checklist (owner A–N / implement gates)

| Gate | Status | Notes |
|------|--------|-------|
| No quantity duplication | pass | One dest doc per source movable row; idempotency doc by checksum |
| No quantity loss | pass | Exact qty cloned; TX abort on failure |
| Same PR combines via multi-doc sum | pass | 5+3→8 helper test; no derived third total |
| Source canceled + history retained | pass | `status: canceled`; docs kept |
| Generic move lineage | pass | `movedFromAllocationId` only |
| DNP lineage not misused | pass | Contract test asserts no `requeuedFromAllocationId` in move lib |
| pending/queued only | pass | Shared movable set + blockers |
| printing destination blocked | pass | `isShowQueueMoveDestination` |
| Whatnot↔Whatnot only | pass | Source + dest gates |
| Whole move all-or-nothing | pass | Non-movable blockers disable apply |
| TX budget ≤150 | pass | `too_many_allocations` |
| Idempotency | pass | `showQueueMoveApplications/{checksum}` |
| Both show totals recomputed | pass | `recomputeShowAllocatedQuantityAfterMove` in TX |
| PR identity/status preserved | pass | Same `printRequestId`; queueTab recompute after TX |
| Add/Remove/DNP regressions | pass | Copy path unchanged; Remove untouched; DNP requeue tests 32/32 |
| No production changes | pass | DEV checkpoint only |

---

## Audit / history choice

- Lineage field on destination allocation + canceled source docs.
- Idempotency application record stores actor, shows, qty, affected PRs.
- History card treats `movedFromAllocationId` as **Moved to another show**; does **not** treat cancel sources as DNP missed unless `requeuedFrom*` / resolution kinds apply.
- No new audit event subsystem.

---

## Firestore Rules

Additive allowlist: `movedFromAllocationId` on allocation create (Admin SDK apply does not require it; allowlist keeps client schema consistent). **Not** a permission relaxation.

## Storage Rules / Indexes / Migration

None.

---

## Automated test results (this session)

| Suite | Result |
|-------|--------|
| `packages/shared/src/utils/showQueueMove.test.ts` (+ transfer) | **15/15 pass** |
| `functions/src/showQueueMove.contract.test.ts` | **3/3 pass** |
| `apps/studio/.../showQueueMove.contract.test.ts` | run with suite |
| `showProductionRecoveryRequeue.test.ts` | **32/32 pass** |
| `npm run build --prefix functions` | **pass** |

Studio full-project `tsc` has pre-existing unrelated errors; no new errors filtered to move files.

---

## DEV Functions deploy list (do not run yet)

```text
previewShowQueueMove
applyShowQueueMove
```

Optional same deploy if rules ship together:

```text
firestore:rules  (movedFromAllocationId allowlist only)
```

Studio: restart/reload after Functions deploy so callables resolve.

---

## Next step

**Human checkpoint: DEV deploy** — owner/agent deploys listed Functions to `fresh-prints-dev`, then Owner QA checklist. Do **not** signoff, commit, push, or production deploy in this return.
