# Plan: Studio staff show-capacity allocation override

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Author | Planning Agent |
| Status | ready_for_review → **accepted; Implement→Test complete; awaiting Owner DEV QA** |
| Workflow | managed-phase |
| Managed goal | `studio-staff-show-capacity-allocation-override` |
| Parent program | Phase 7 / Show Queue operational refinement |
| Related | Formal Review (pending); coexists with ADR-FP-160 |

---

## Goal

Allow authorized Studio staff to explicitly override a show’s configured `upcomingShows.maxTotalQuantity` ceiling when allocating a Print Request, so an intentional over-capacity allocation can succeed after confirmation. Portal customers must never receive this ability. The configured max must remain unchanged; UI may truthfully show e.g. `29 / 25`.

---

## Background

Staff expect to force an allocation when a show is near/at capacity. Repo evidence shows:

- Shared helpers already understand **over-capacity** display (`isOverCapacity`, “N over max”).
- `AddToShowModal` / split flow already *mentions* a staff override path.
- Trusted callable `allocateStudioPrintRequestToShow` **hard-rejects** when `currentAllocated + requested > maxTotalQuantity`.
- Legacy client method documents `overrideCapacity` but **does not implement** it; UI no longer calls that method (callable is the live path).

This is **show capacity**, not customer print limits / ADR-FP-159 / `settings/printRequestLimits`.

---

## Investigation answers (required)

### 1. Where is Studio show-capacity enforcement performed?

| Layer | Location | Behavior |
|-------|----------|----------|
| **Authoritative (live)** | `functions/src/allocateStudioPrintRequestToShow.ts` | After eligibility, rejects with `failedPrecondition("This show does not have enough remaining capacity.")` when `showCapacity !== undefined && currentAllocated + requestedOnShow > showCapacity` |
| Shared eligibility | `packages/shared/src/utils/showAllocationEligibility.ts` → `getShowAllocationBlockReason` | Blocks Past; terminal production; **`capacity.isFull`** (`allocated >= max`); productionStatus `full` |
| Shared capacity math | `packages/shared/src/utils/showCapacity.ts` → `assessShowCapacity` / `planAllocationSplit` | Already computes `isOverCapacity` when allocated &gt; max |
| UI gate | `AddToShowModal.tsx` | `planAllocationSplit`; when overflow → split decision; when `fittingQuantity === 0` → “choose a different show” (no working override) |
| Dormant client path | `upcomingShowService.allocatePrintRequestItem` | Docs claim `overrideCapacity`; code always throws `SHOW_QUEUE_FULL_MESSAGE` — **not used by current UI** |
| Portal | `functions/src/queuePortalPrintRequestToShow.ts` | Separate capacity enforcement; no override input |

### 2. Which callable/service owns staff allocation?

| Role | Path |
|------|------|
| UI | `apps/studio/.../print-requests/components/AddToShowModal.tsx` (also Show Queue “Add request” via same modal) |
| Service | `upcomingShowService.allocateStudioPrintRequestToShow` → `callTracedFunction("allocateStudioPrintRequestToShow")` |
| Backend | `functions/src/allocateStudioPrintRequestToShow.ts` — `assertStaffCaller` (owner/admin/helper) |

Related but **out of primary scope** unless Formal Review expands: `transferPrintRequestBetweenShows` / move flows also check destination capacity client-side.

### 3. Does an override mechanism already exist?

**Partially / dormant — not operational end-to-end.**

- Type/comment: `AllocatePrintRequestItemInput.overrideCapacity` + service JSDoc.
- Split picker copy: “use the staff override on the previous step…”
- UI **does not** present Allocate Anyway that sets an override flag on the callable.
- Callable **has no** override parameter and always enforces the ceiling.
- `maxQuantityOverridden` on the **show** is unrelated (danger confirm when **lowering** max below allocated).

### 4. Which Studio roles should receive override authority?

**Same as current Studio allocation:** active staff via `assertStaffCaller` / `canManageUpcomingShows` → **owner, admin, helper**.

Do **not** broaden. Do **not** restrict to owner/admin only unless owner product-decides otherwise (would shrink today’s allocators’ ability). Formal Review default: **all roles that can allocate today**.

Portal customers: never.

### 5. How will the backend distinguish explicit capacity override?

Extend the callable request (illustrative name aligned to existing dormancy):

```ts
{
  printRequestId: string;
  legs: AllocateStudioPrintRequestToShowLeg[];
  /** Explicit staff confirm to exceed show maxTotalQuantity only. Default false/absent. */
  overrideShowCapacity?: boolean;
}
```

Parse: only `true` counts; omit/false = current behavior.

When `overrideShowCapacity === true`:

1. Still run auth, PR integrity, item totals, origin/source rules, Past schedule, terminal production (`completed` / `fully_printed` / `archived` / `canceled`), staff artwork readiness, etc.
2. **Bypass only:**
   - numeric ceiling `currentAllocated + requested > maxTotalQuantity`
   - eligibility blockReason `"full"` when caused by **capacity fill** and/or productionStatus `"full"` (capacity-operational full — not terminal finished)
3. Do **not** set or raise `maxTotalQuantity`.
4. Do **not** set `maxQuantityOverridden` (different semantic).

### 6. How will Portal spoofing be prevented?

- Portal uses `queuePortalPrintRequestToShow` only — **do not add** override to that callable.
- Studio override exists only on `allocateStudioPrintRequestToShow`, which already `assertStaffCaller`.
- Customer/anonymous callers cannot invoke staff callables successfully.
- No client-only bypass: Studio UI confirmation must send `overrideShowCapacity: true` and server re-checks staff + flag.

### 7. Does `maxQuantityOverridden` relate to allocation override?

**No.** Per DATA_MODEL / `setShowMaxQuantity`: true when staff lowers configured max **below** current allocated quantity. Allocation override must **not** flip this field. Keep concepts separate.

### 8. Can existing UI safely display allocated &gt; max?

**Yes.** Shared display already supports over-capacity:

- `assessShowCapacity.isOverCapacity`
- `formatShowCapacitySlotLabel` → `"N over max · taken of max"`
- CSS `is-over-capacity` on capacity cards
- Tests explicitly cover allocated &gt; max

Preferred model: configured max unchanged; UI shows truthful overage (e.g. 29 of 25 / “4 over max”).

### 9. Should configured max remain unchanged after override?

**Yes** (owner preferred + Formal Review default). Do not auto-raise `maxTotalQuantity`. Makes the override visible and preserves ADR-FP-160 Apply-to-existing skip-when-new-max-below-allocated behavior.

### 10. How will audit/lifecycle evidence remain truthful?

**v1 (minimal, no new collection):**

- Existing `showAllocations.addedBy` / timestamps remain.
- Resulting `allocatedQuantity > maxTotalQuantity` is observable evidence.
- Optional additive metadata on **new** allocation docs only if cheap and Rules-compatible, e.g. `showCapacityOverride: true` + snapshots (`maxTotalQuantitySnapshot`, `allocatedBefore`). Prefer **optional** fields without Rules change if allocation create is Admin SDK (callable already uses Admin — Rules do not constrain Admin writes).

No new analytics schema required for v1. Prefer optional allocation fields written by Admin callable for audit clarity.

### 11. Exact files expected to change

**Functions**

- `functions/src/allocateStudioPrintRequestToShow.ts` (+ tests)
- Shared eligibility helper tweak or local override-aware wrapper (prefer small shared helper so Portal still uses strict path)

**Shared**

- `packages/shared/src/utils/showAllocationEligibility.ts` (+ tests) — e.g. `getShowAllocationBlockReason(..., { allowCapacityFullOverride?: boolean })` or separate `getShowAllocationBlockReasonForStaffCapacityOverride`
- Possibly tiny types next to allocate request if shared

**Studio**

- `AddToShowModal.tsx` — confirmation when allocation would exceed capacity; Cancel / Allocate Anyway; pass flag to service
- `upcomingShowService.allocateStudioPrintRequestToShow` — plumb `overrideShowCapacity`
- `SplitDesignPickerModal.tsx` — align copy with real override (optional polish)
- Focused Studio contracts

**Docs**

- DATA_MODEL note; short ADR; ROADMAP if needed

**Explicitly unchanged unless review expands**

- Portal queue callable, ADR-FP-159, printRequestLimits, ADR-FP-160 apply callable, Rules (Admin path), indexes

### 12. Focused tests proving capacity-only bypass

1. Under cap, no override → success  
2. Over cap, no override → reject  
3. Over cap, staff + `overrideShowCapacity: true` → success; max unchanged; allocated &gt; max  
4. Non-staff / missing auth + override → reject  
5. Portal callable still rejects over capacity (regression / no override field)  
6. Override still rejects Past / completed / canceled  
7. Override still rejects bad item totals / incomplete plan  
8. `getShowAllocationBlockReason` with override option allows capacity-full but not terminal  
9. Display helpers still format over-capacity  
10. ADR-FP-160 eligibility: show with allocated &gt; candidate new max still **skipped** on Apply  
11. UI planner: Cancel does not call callable; Allocate Anyway sends flag true  

---

## Scope

### In Scope

- Callable request flag + capacity-only bypass
- Studio Add-to-Show confirmation (counts: current / max / adding / new total)
- Keep max unchanged; truthful over-capacity UI (already largely present)
- Optional Admin-written allocation audit fields
- Focused tests + Owner DEV QA

### Out of Scope

- Auto-raising max; Portal override; generic `force`; bypassing lifecycle/terminal/other guards
- Customer quotas; global quota Apply redesign; transfer/move override (follow-up unless trivial)
- Production deploy / Portal publish / Studio release
- Completing dormant `allocatePrintRequestItem.overrideCapacity` beyond note (callable is live path); optional: mark deprecated or wire for consistency if still referenced

---

## Approach

1. Shared: capacity-override-aware eligibility predicate (strict by default).
2. Callable: parse `overrideShowCapacity`; enforce ceiling unless true; never mutate `maxTotalQuantity`.
3. Studio: when planned leg(s) would exceed remaining capacity for a selected show, show confirmation modal with Cancel / Allocate Anyway; on confirm set flag and submit existing plan that places remainder on that show.
4. Preserve split-to-another-show path as alternative (no override).
5. Docs ADR + DATA_MODEL note.
6. Test → Owner DEV QA (4→5 cancel; retry Allocate Anyway → 7/5).

---

## Interaction with ADR-FP-160

Unchanged. After staff override, allocated may exceed configured max; global Apply with lower max continues to **skip** that show via `shouldSkipDefaultMaxApplyForAllocatedQuantity`.

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Shared eligibility + capacity display | yes |
| Functions allocate parse + capacity override core/contracts | yes |
| Studio AddToShow / service contracts | yes |
| Portal queue capacity regression (focused) | yes |
| ADR-FP-160 skip-below-allocated regression | yes |
| Studio typecheck, Functions build, targeted lint, `git diff --check` | yes |
| Rules tests | only if Rules change (not expected) |

### Manual

Owner DEV QA scenario from goal brief (capacity 5 → 4 → add 3 → warn 4/5/+3→7 → Cancel → Allocate Anyway → 7/5; Portal still blocked).

---

## Human Checkpoints Anticipated

- [x] Owner DEV QA
- [x] Formal Review role default (all allocating staff) — confirm or narrow
- [ ] Production — forbidden in this goal

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Confusing with maxQuantityOverridden / customer quotas | medium | Docs + separate flag name |
| productionStatus `full` vs capacity full | medium | Explicit allow list in Plan §5 |
| Split UX vs override UX confusion | low | Keep split; add explicit Allocate Anyway |
| Transfer/move still blocks over capacity | low | Document as follow-up unless in-scope |

---

## Rollback Plan

Revert callable + Studio UI; redeploy prior Function revision on DEV if deployed. No production change in this goal.

---

## Documentation Updates Required

- [x] DATA_MODEL.md — staff allocation capacity override note
- [x] DECISIONS.md — ADR
- [ ] BACKEND.md — callable request field
- [ ] ROADMAP.md — brief

---

## Open Questions

Resolved with recommended defaults for Formal Review:

1. **Roles** — all staff who can allocate (owner/admin/helper).  
2. **Max unchanged** — yes.  
3. **productionStatus `full`** — allow with override (capacity-operational); still block terminal statuses.  
4. **Transfer/move** — out of v1 unless review pulls in.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-15-studio-staff-show-capacity-allocation-override-formal-review.md`
- Verdict: pending
