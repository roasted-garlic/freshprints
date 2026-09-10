# Plan: Studio Editing → Re-add Show Queue permissions / partial-queue corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-09 |
| Author | FreshForge Planning |
| Status | ready_for_review |
| Workflow | managed-phase — corrective amendment |
| Managed goal | `user-info-print-request-lifecycle-activity-ordering` (owner DEV re-QA FAIL follow-up) |
| Parent Plan | `docs/workflow/plans/2026-09-09-user-info-print-request-lifecycle-activity-ordering-plan.md` |
| Related | Rules corrective deploy `3c7788f8-c023-44cb-8b75-6e9cd9f137df`; owner re-QA FAIL 2026-09-09 |
| FreshForge impact | Application only — not Starter Surface |

---

## Goal

Make Studio **Remove from show → Edit → Add back to show** succeed end-to-end: no Firestore
`Missing or insufficient permissions` toast, full request queued (not `PARTIALLY QUEUED`), status
leaves `editing` for `active`, Add to Show hides immediately, request lands on the Queue tab, and
Portal exits edit mode. Confirm Portal’s trusted queue path does not share the Studio client-write
failure mode; fix Portal only if a separate bug is found.

## Background — owner FAIL evidence

Owner DEV re-QA of the lifecycle Rules corrective still fails on Studio re-add after remove-for-edit:

| Observed | Desired |
|----------|---------|
| Toast: `Missing or insufficient permissions.` | No permission error |
| Add to Show remains visible until hard refresh | Hide Add to Show after successful add |
| After refresh: `EDITING` + `PARTIALLY QUEUED` (e.g. `1 qty` of multi-item request) | Fully queued; not partially queued; not Editing |
| Portal still shows edit mode | Portal not editable once re-queued |
| Retry Add to Show repeats the same error | First attempt completes cleanly |

### Mechanical root-cause chain (repo evidence)

Studio `AddToShowModal` loops `upcomingShowService.allocatePrintRequestItem` **per item**. Each call:

1. Client `setDoc` `showAllocations/{id}` — **can succeed**
2. Client `updateDoc` show `allocatedQuantity` — **can succeed**
3. If request `status` is `draft`/`editing`, client `printRequestService.updatePrintRequest({ status: "active" })` — **Rules-gated**
4. Best-effort queueTab callable + optional requeue-marker clear

If step 3 is denied, the loop throws after the first item’s allocation is already committed. That
matches the screenshots: one allocation exists, status stays `editing`, queue-state pill becomes
`partially_queued`, Portal `isEditable` stays true because it keys off `draft|editing`.

Add to Show visibility uses `allocationTotalsByRequestId` (`isSelectedRequestQueueLocked`). On
error the modal does **not** force a totals/request reload, so the button stays until refresh.

Portal `queuePortalPrintRequestToShow` already creates **all** allocations and sets `status:
"active"` (and clears `parksDraftPrintRequestId`) in one **Admin SDK** transaction — it bypasses
client Rules. Portal “still editing” after this Studio failure is a **downstream symptom** of the
stuck `editing` status, not proof Portal shares the same write path. Portal unqueue→requeue must
still be spot-checked.

A prior Rules allowlist fix for `lastLifecycleActivityAt` / `EventId` / `Precedence` was deployed to
`fresh-prints-dev`. Owner FAIL after that deploy means either (a) another after-image Rules gap
remains on real post-unqueue documents, and/or (b) the non-atomic Studio client sequence is unsafe
even when Rules are correct (partial commit + stale UI). This corrective addresses both.

## Scope

### In Scope

1. **Prove or close remaining Rules gaps** for real post-unqueue documents (lifecycle mirror,
   `queueTab: "editing"`, parking fields, bidding acknowledgment, identity snapshots) under the
   exact Studio activation payload shape.
2. **Harden Studio allocate/re-add** so a multi-item add cannot leave `editing` + partial
   allocations as the steady state:
   - Prefer a **trusted staff callable** that atomically allocates remaining quantity and activates
     the request (Admin SDK), mirroring Portal’s contract for the staff path; **or**, if review
     prefers a narrower client fix, activate with a status-only client write after all allocations
     succeed and add an explicit repair path for stuck `editing`+allocations rows.
3. **UI reconcile on allocate failure/success**: reload request + allocation totals so Add to Show /
   Remove-from-queue / badges reflect server truth without requiring a full page refresh.
4. **Portal verification**: confirm Portal unqueue→requeue still flips Continuable/edit mode off;
   fix only if a distinct Portal bug is found.
5. **Tests + docs**: Rules regression(s), focused Studio/Portal contract tests, ADR/BACKEND note if
   a new callable is introduced.
6. **DEV-only** deploy of any Rules/Function changes after owner authorization; no production.

### Out of Scope

- Full `show-queue-batch-allocation-performance` deferred plan (may be referenced, not absorbed).
- Lifecycle history backfill / indexed-reader activation (still separately gated).
- Production Rules/Functions/Studio publish.
- Commit/push unless owner later authorizes.
- Broad refactor of all Studio allocation call sites beyond Add to Show / re-add / stuck repair.

---

## Affected Areas

### Files / Modules (expected)

- `firestore.rules` (+ `tests/firebase/showQueueAllocation.rules.test.ts`)
- `apps/studio/.../upcomingShowService.ts` (`allocatePrintRequestItem` / re-add orchestration)
- `apps/studio/.../printRequestService.ts` (`updatePrintRequest` status activation shape)
- `apps/studio/.../AddToShowModal.tsx` / `PrintRequestsPage.tsx` (reconcile on error/success)
- `functions/src/` — new or extended staff queue/allocate callable if Approach A is chosen
- `functions/src/queuePortalPrintRequestToShow.ts` — read-only comparison; change only if Portal bug
- Docs: `BACKEND.md`, `DATA_MODEL.md` / `DECISIONS.md` if callable or repair contract is added

### Architecture Impact

- [x] Details: Prefer trusted backend for staff full-request queue/re-add (align Studio with Portal).
  Client sequential allocate remains a footgun under Rules + async lifecycle mirror writers.

### Security Impact

- [x] Details: Any new callable must enforce staff upcoming-show permissions, validate show/request
  eligibility, and keep lifecycle mirror fields client-immutable. Do not broaden customer Rules.

### Data Model Impact

- [x] Details: No new persisted fields required. May repair stuck rows (`editing` + active
  allocations → `active`, clear parking when leaving Editing) via Admin SDK.

### Backend Impact

- [x] Details: Possible new/extended callable; optional Rules tweak if regression finds a gap.

### UI / UX Impact

- [x] Details: Add to Show / badges / tab routing must update without full refresh; no partial-queue
  success presentation for a failed re-add.

### Migration Impact

- [x] Forward: Optional one-off DEV repair for known stuck requests (e.g. `roasted_garlic-CR003`)
  during QA — non-destructive status/parking fix only.
- [x] Rollback: Redeploy prior Rules/Function revision; client UI reconcile is forward-compatible.

---

## Approach

### Phase 0 — Reproduce with honest fixtures (before choosing A vs B)

1. Extend Rules unit tests to seed a **post-unqueue** request: `status: "editing"`,
   `queueTab: "editing"`, lifecycle mirror fields, `parksDraftPrintRequestId` and/or bidding ack,
   identity snapshots — then run:
   - status-only activation `{ status, updatedBy, updatedAt }`
   - Studio-shaped activation `{ name, customerId, isInternal, status, updatedBy, updatedAt }`
   - full allocate sequence after mirror fields advance (simulate allocation lifecycle write)
2. If any fixture fails, fix Rules allowlist/guards narrowly.
3. If all fixtures pass, treat remaining owner FAIL as **sequence/UI** (and still implement
   atomicity or activate-after-all + reconcile).

### Phase 1 — Choose implementation path

**Approach A (preferred): trusted staff callable**

- New callable e.g. `allocateStudioPrintRequestToShow` (name TBD in implement) that, in one
  transaction (or ordered Admin writes with compensating safety):
  - validates staff + show open/capacity + request not archived/converted
  - creates allocations for requested item quantities (or full remaining)
  - updates show `allocatedQuantity`
  - sets request `status: "active"`, clears `parksDraftPrintRequestId` when leaving Editing
  - relies on existing queueTab triggers / explicit recompute
- Studio Add to Show (at least the editing/re-add and multi-item full-fit paths) calls the callable
  instead of N client allocates.
- Keeps Portal path unchanged.

**Approach B (narrower fallback): client harden only**

- Narrow activation write to status-only fields (match passing Rules tests).
- Allocate all items first while deferring activation until the loop completes; then one activation.
- On any failure after partial allocations: attempt status activation if any allocation exists; reload
  totals; surface a clear recovery message; never leave silent partial success as “still Add to Show”.
- Add staff repair helper/callable for stuck `editing`+allocations.

Review may approve A, B, or A with B as interim. **Do not implement both full callables and a
duplicate long-term client path without an explicit primary.**

### Phase 2 — UI reconcile

- On Add to Show error **and** success: refresh selected request + `allocationTotalsByRequestId` +
  detail allocations (reuse existing reload helpers).
- Ensure Queue tab routing still runs when status/queueTab become queued after successful re-add.

### Phase 3 — Portal parity check

- Trace Portal unqueue→queue: confirm Admin transaction still exits Editing Continuable.
- Manual checklist item for Portal re-add on DEV after Studio fix.
- Code change only if Continuable/parking restore is broken independently.

### Phase 4 — DEV deploy + owner re-QA (gated)

- Deploy only authorized Rules and/or Function(s).
- Owner re-QA checklist below. No production.

---

## Test Strategy

### Automated

| Check | Command / artifact | Required |
|-------|--------------------|----------|
| Rules regression (post-unqueue + Studio payload) | `npm run test:rules` (or focused show-queue allocation suite) | yes |
| Focused unit/contract | Studio allocate/modal reconcile; callable validation if added | yes |
| Functions build | `npm --prefix functions run build` | yes if Functions change |
| Portal Continuable contract | existing parking/editing tests if touched | if Portal touched |
| Studio typecheck | record baseline vs new errors | yes (honest) |

### Manual

- [ ] Studio: Remove from show → edit (optional) → Add to Show → **no** permission toast; fully
      queued; Add to Show gone; Queue tab; not `PARTIALLY QUEUED`; not `EDITING`.
- [ ] Studio: retry path after intentional mid-failure (if still client-loop) does not strand
      Editing+partial without reconcile.
- [ ] Portal: same request no longer Continuable/edit mode after Studio re-queue.
- [ ] Portal: customer unqueue→requeue still works.
- [ ] Spot-check first-time Working → Add to Show (non-editing).

---

## Human Checkpoints Anticipated

- [x] Owner chooses Approach A vs B if review does not hard-pick (default recommendation: **A**)
- [x] Owner DEV re-QA after corrective deploy
- [ ] DEV deploy authorization (exact allowlist)
- [ ] Production deploy — **not** in this corrective
- [ ] Lifecycle backfill / indexed reader — **still separate**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rules look fixed in tests but DEV docs still deny | high | Fixture real post-unqueue shapes; optional read-only DEV doc inspection during implement |
| Callable scope creeps into batch-performance project | medium | Limit to full-request allocate+activate; defer multi-show split performance work |
| Partial allocations already exist on DEV | medium | Repair path sets `active` / clears parking; owner may clear orphan qty during QA |
| Portal mistakenly changed | low | Portal code out of scope unless Continuable bug proven |
| Lifecycle mirror race with client status write | medium | Approach A avoids client status write; Approach B uses status-only + activate-after-all |

---

## Rollback Plan

- Redeploy previous Firestore Rules release on `fresh-prints-dev` if Rules change regresses.
- Delete/disable new Function revision if callable regresses; Studio can temporarily fall back only
  if a reviewed fallback remains — otherwise leave feature broken rather than reintroduce silent
  partial queue.
- UI reconcile changes are safe to keep.

---

## Documentation Updates Required

- [ ] `docs/architecture/BACKEND.md` — staff allocate/re-add callable if added
- [ ] `docs/project/DECISIONS.md` — short ADR if Approach A becomes the staff queue authority
- [ ] `docs/architecture/DATA_MODEL.md` — only if repair/activation contract needs a note
- [ ] Workflow review + test report + deploy record under `docs/workflow/reviews/`

---

## Open Questions

- [x] Default recommendation: **Approach A (trusted staff callable)** unless review blocks on size —
      then Approach B interim with explicit follow-up to A.
- [ ] Owner: any already-stuck DEV requests to repair during QA besides the reported CR003 case?

---

## Owner DEV re-QA checklist (after corrective deploy)

1. Remove attached request from show → confirm Editing.
2. Re-add to a show → **no** `Missing or insufficient permissions`.
3. Confirm fully queued (not partially queued); Add to Show hidden without manual refresh.
4. Confirm Queue tab / queued list membership.
5. Confirm Portal no longer treats the request as Continuable/edit mode.
6. Spot-check Portal customer unqueue→requeue.
7. Spot-check normal Working → Add to Show.

## Next step

Formal Review of this corrective plan → owner authorization to implement → Test → DEV deploy
checkpoint → Owner re-QA.
