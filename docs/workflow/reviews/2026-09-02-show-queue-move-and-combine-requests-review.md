# Formal Review: Show Queue Move / Combine Print Requests Between Shows

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent (+ Architecture / Security / Data Model perspectives) |
| Plan | `docs/workflow/plans/2026-09-02-show-queue-move-and-combine-requests-plan.md` |
| Verdict | **approved_with_changes** → owner decisions recorded; **implement authorized** |
| Production | **NOT AUTHORIZED** |
| Owner decisions | 2026-09-02 — cancel + `movedFromAllocationId`; Whatnot→Whatnot; pending/queued only; no printing destination; copy unchanged |

---

## Summary

The plan correctly audits existing **per-request transfer** and **Did Not Print requeue**, separates allocation MOVE mechanics from recovery semantics, and proposes Functions preview/apply for whole-queue atomicity. Formal Review confirms the authoritative **multi-document combine** model (effective qty = sum of non-canceled rows) and requires implementers to harden movable-status gates, recompute both show totals, and resolve owner decisions on history + Internal sheets before coding those forks.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | A/B harden + C bulk; DNP untouched as product path |
| Architecture alignment | pass | Services/callables; no UI→DB shortcuts for bulk |
| Security impact addressed | pass | Staff callables; TOCTOU; fail closed |
| Data model impact addressed | pass | Documented; optional lineage gated |
| Backend impact addressed | pass | New Functions; separate idempotency from DNP |
| Test strategy adequate | pass | Matrix 1–35 + Owner QA |
| Human checkpoints identified | pass | Owner decisions + DEV QA |
| Roadmap alignment | pass | Operational Studio queue fix; deferred goals untouched |
| Documentation plan | pass | DATA_MODEL + ADR |
| No silent scope expansion | pass | No design mutation; no auto show lifecycle |

---

## Architecture Review

**Findings:**

- Reuse eligibility/capacity/recompute primitives; **new** move callables — do not overload `applyShowProductionRecovery`.
- Existing `transferPrintRequestBetweenShows` is client `writeBatch` (atomic per PR) but unsafe on statuses and uses incremental destination `allocatedQuantity`.
- Bulk **must not** be client `for each await move`.
- Extract shared “allocation move mechanics” without importing DNP completion planners.

**Required changes:**

1. Implement individual + bulk MOVE through trusted Functions preview/apply (Studio thin service wrappers). Client-only transfer for **move** mode is not acceptable for the hardened contract.
2. Leave DNP modules as the only writers of recovery resolution kinds / recovery application docs.

---

## Security Review

**Findings:**

- Staff permission gate required on callables.
- Preview is not authorization; Apply revalidates.
- No Portal elevation; no Storage changes.
- Fail closed on non-movable allocations and bad destinations.

**Required changes:**

- [ ] None beyond plan (enforce staff auth + checksum in TX)

**Human approval needed before production:**

- [x] Entire production deploy — **not authorized this phase**

---

## Data Model Review

### Authoritative uniqueness / combine model

**Verdict: Model B (multi-doc) is authoritative today.**

- No uniqueness on `(destinationShowId, printRequestId, printRequestItemId)`.
- Effective quantity = **sum** of non-`canceled` allocation docs.
- Show Queue UI groups by `printRequestId` → one card.
- Gang sheet/export keys by `showAllocationId` and sums quantities — combined effective output is correct when docs are additive.

**Do not** implement single-doc merge in V1 (would change placement identity and is not current Add/Transfer/DNP behavior).

### Source history

| Path | Behavior |
|------|----------|
| Studio Remove / current transfer move | **delete** |
| Portal unqueue / DNP requeue | **cancel** (+ DNP lineage) |

**Required change:** Owner must confirm V1 history model (plan Open Question 1). Review **recommends default: keep delete** for V1 general MOVE to avoid false DNP “missed” history if `requeuedFromAllocationId` were reused, and to match current Studio transfer. If owner requires cancel: add `movedFromAllocationId` + history resolver update; **never** treat general-move sources as Did Not Print solely via `requeuedFromAllocationId`.

### Designs / PR identity

- Pass: no `design.status` writes; no PR clone on move (copy mode separate).

---

## Backend Review

**Findings:**

- DNP reusable: cancel/create pattern, recompute, capacity projection, checksum, 150-alloc TX budget.
- Recovery-only excluded: show completion, resolution kinds, `needsStaffRequeue*` policy, recovery applications collection, past-show DNP gates.
- Normal remove remains delete + client path (unchanged).
- Capacity: hard block (match allocate/transfer/DNP); do not invent override UI (`overrideCapacity` unwired today).

**Required changes:**

1. Both source and destination `allocatedQuantity` **recomputed** from allocations (fix transfer’s dest incremental write).
2. Separate idempotency collection from `showProductionRecoveryApplications`.
3. Bulk all-or-nothing when any requested allocation is non-movable / state changed.

---

## Testing Review

**Findings:** Matrix covers combine, split, blockers, bulk atomicity, entry points, regressions. Adequate.

**Required changes:**

- [ ] Add explicit unit proving 5+3→8 across multi-doc destination
- [ ] Add regression that DNP requeue still sets `requeuedFromAllocationId` and completes source show

---

## Documentation Review

- DATA_MODEL move contract + ADR separating MOVE vs DNP required in implement phase.

---

## Formal proofs (owner A–N)

| # | Claim | Verdict | Evidence / implement requirement |
|---|--------|---------|----------------------------------|
| **A** | No quantity duplication | **Pass with implement gate** | Create dest qty = exact source movable qty once; idempotent Apply; never double-create same source ids |
| **B** | No quantity loss | **Pass with implement gate** | All movable source qty appear on dest; TX abort on failure |
| **C** | Same PR in dest combines safely | **Pass** | Multi-doc sum; UI groups by PR; preview discloses combine |
| **D** | Split only moves selected source | **Pass** | Scope by `sourceShowId`; other shows untouched |
| **E** | Whole-show cannot silently half-apply | **Pass with implement gate** | Single TX; blockers fail entire Apply; no client loop |
| **F** | Printed/in_progress not moved incorrectly | **Pass with implement gate** | Movable = `pending`\|`queued` only (owner default); harden vs current transfer gap |
| **G** | Capacity matches existing behavior | **Pass** | Hard block over max; exact fill OK; no new override |
| **H** | Source totals recalculated | **Pass with implement gate** | `computeShowAllocatedQuantityFromAllocations` / equivalent after move |
| **I** | Destination totals recalculated | **Pass with implement gate** | Same; ban incremental-only dest update |
| **J** | Request status remains correct | **Pass with implement gate** | Atomic dest-before-source-remove; sync `queueTab`; stay Queued when dest has allocs |
| **K** | Portal one-working-request intact | **Pass** | Same `printRequestId`; no clone on move |
| **L** | Designs untouched | **Pass** | Out of scope; no design writes |
| **M** | DNP recovery not broken | **Pass with implement gate** | Separate callables; regression tests |
| **N** | No automatic source-show status mutation | **Pass** | Explicit out of scope; empty queue OK |

---

## Required Changes (approved_with_changes)

1. **Functions-owned Apply** for individual move and whole-queue move (preview + apply + checksum + idempotency).
2. **Movable statuses** = `pending` | `queued` unless owner overrides Open Question 3.
3. **Recompute** source and destination `allocatedQuantity` authoritatively.
4. **All-or-nothing** bulk; block if any non-movable in scope or count > 150.
5. **Do not** set DNP recovery fields / complete source show / misuse `requeuedFromAllocationId` without history fix.
6. **Whatnot↔Whatnot only** unless owner approves Internal↔Internal (Open Question 2).
7. Resolve Open Question 1 (delete vs cancel+`movedFromAllocationId`) **before** implementing source history branch.
8. Preserve existing **copy** mode behavior for past/locked sources (do not expand in this goal).
9. Feature C menu label: prefer **Move All Requests** in show ⋯ menu; confirm wording against Studio voice in UI pass.
10. Clear `needsStaffRequeue*` only if existing transfer already does for dest PR — do not invent new DNP marker writes.

---

## Blockers

None that stop review approval. Implementation of history/IGS forks waits on owner answers (human checkpoint).

---

## Verdict Rationale

**approved_with_changes** — Scope is sound, audits are accurate, combine model is correctly identified as multi-doc sum, and DNP separation is clear. Changes above are mandatory implement constraints, not a plan rewrite. Owner product forks are recorded as checkpoints, not silent agent guesses.

---

## Next Step

1. Owner confirms Open Questions (or accepts plan defaults).
2. Then **Implement** approved scope on `development` against `fresh-prints-dev` only.
3. Do **not** implement/deploy/commit in this session after review publish.

---

## Return snapshot (for Managing Agent)

See Managing Agent user return list populated from this review + plan.
