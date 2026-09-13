# Plan: Portal Editing request parks current draft

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal | `portal-editing-request-parks-current-draft` |
| Baseline | `development @ 868b7ecd40e263b94fc1376b982c37bf4d87474d` |
| Related | `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-review.md` |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| Deferred | `show-queue-batch-allocation-performance` — do not start |
| Queued after | cross-app lightbox Previous/Next — do not start |

---

## Goal

When a customer Print Request enters `status === "editing"` (Portal unqueue or Studio remove-from-show), that Editing request becomes the **single ACTIVE editable Portal Continuable**. Any pre-existing meaningful Portal draft is **parked** (status stays `draft`) so it cannot receive Add/mutations/queue until the Editing request successfully leaves Editing (typically re-queued to a show). Preserve ADR-FP-158 Portal Editing tab. Amend ADR-FP-071 so Continuable lifecycle status is distinct from **active editable ownership**.

Invariant: **one active editable request at a time** — not two simultaneous editable carts.

---

## Background

ADR-FP-071 blocks `active → editing` / Portal unqueue when another Continuable (`draft`|`editing`) exists (`continuable_request_conflict`). Customers with a Working draft cannot revise a show-pulled request. ADR-FP-158 already shows Editing as its own Portal list tab; Editing Continuables already use the same editable detail UI as drafts. Missing piece: park the draft while Editing owns Current Request.

---

## Scope

### In Scope

- Server-authoritative park + restore helpers (shared + Functions TX)
- Amend Portal unqueue TX: park instead of conflict when meaningful draft exists
- Studio customer remove-from-show path: **trusted TX** for editing + park (see Formal Review)
- Active-editable resolver used by create/resolve, catalog Add, upload attach, item mutations, queue
- Portal banner when Editing owns the slot
- Parked-draft locked UX (detail + Working list treatment per Formal Review)
- ADR-FP-071 amendment; preserve ADR-FP-158
- DATA_MODEL + Rules allowlist for parking fields (server-only writes)
- Unit/integration tests per matrix; Owner QA on DEV

### Out of Scope

- New lifecycle status `paused` / `parked`
- Removing or folding Portal Editing tab into Working
- Continuable parking for Internal Requests
- Show MOVE / DNP requeue behavior changes (unless a path truly sets `editing`)
- Production deploy / production backfill
- Lightbox, Smart Profiling, batch-allocation goals
- Customer Upload workflow redesign

---

## Affected Areas

### Files / Modules (expected)

**Shared**

- `packages/shared/src/types/printRequest/printRequest.types.ts`
- `packages/shared/src/utils/portalPrintRequestEditability.ts` (+ tests)
- `packages/shared/src/utils/portalOneWorkingPrintRequest.ts` (+ tests)
- `packages/shared/src/utils/portalPrintRequestUnqueue.ts` (+ tests)
- `packages/shared/src/utils/showProductionRecovery.ts` (`shouldTransitionActiveRequestToEditing` + park awareness)
- New helper module e.g. `portalActiveEditablePrintRequest.ts` (park/restore/assert predicates)

**Functions**

- `functions/src/lib/portalWorkingPrintRequest.ts`
- `functions/src/unqueuePortalPrintRequestFromShow.ts`
- `functions/src/queuePortalPrintRequestToShow.ts`
- Item mutation callables (qty / add / duplicate / remove / clear)
- `functions/src/confirmCustomerUploadsAndAttachToRequest.ts`
- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`
- `functions/src/lib/showProductionRecovery.ts` (release → editing)
- New Studio-oriented callable **or** shared TX entry used by Studio remove-from-show (Formal Review required)
- Merge Continuable policy: `customerMergeContinuablePrintRequests.ts` (parked = Continuable but inactive)

**Portal**

- `PortalPrintRequestContext.tsx` (active Continuable filter excludes parked)
- `useAddDesignToRequestFlow.ts` / branch resolvers
- `PrintRequestDetailView.tsx` + locked parked state
- `CurrentRequestDrawer.tsx` + banner component
- `/requests` Working list card inactive affordance
- Limit banner sibling / editing mode banner

**Studio**

- `upcomingShowService.removeShowAllocation(s)` + `markPrintRequestEditingIfNoActiveAllocations` → trusted park path
- `PrintRequestsPage` remove-from-show optimistic reconcile

**Rules / docs**

- `firestore.rules` — allowlist + `optionalFieldUnchanged` for parking fields
- `docs/architecture/DATA_MODEL.md`, `docs/project/DECISIONS.md` (ADR-FP-071 + ADR-FP-158 note), `BACKEND.md` if callables change
- ROADMAP / workflow artifacts

### Architecture Impact

- [x] Details: New **active editable Continuable** layer above status Continuable; server owns park/restore; Studio remove-from-show must not remain client-only for the park write.

### Security Impact

- [x] Details: Parking fields Admin SDK / callable only; mutation/queue/Add assert active-editable; same-customer `customerId` checks; no broadened client PR writes.

### Data Model Impact

- [x] Details: Optional relationship fields on `printRequests` (no new status). Exact fields in Formal Review.

### Backend Impact

- [x] Details: Functions TX helpers + Portal unqueue + Studio remove path + queue restore + mutation gates.

### UI / UX Impact

- [x] Details: Editing banner; parked draft locked; Portal Editing tab preserved; Current Request → Editing PR while active.

### Migration Impact

- [x] None expected historically (ADR-FP-071 prevented coexisting Continuables). Verify DEV; **no production migrate**. If conflict pairs found → STOP `[NEEDS OWNER DECISION]`.

---

## Approach

1. **Data model** — Add server-only parking relationship fields (Formal Review exact names). Keep `status: draft|editing`.
2. **Shared predicates** — `isPortalParkedDraft`, `isPortalActiveEditablePrintRequest`, `selectPortalActiveEditablePrintRequest` (priority: Editing → unparked draft).
3. **Park TX helper** — Given customer PR entering editing: if other Portal-editable Continuable is meaningful draft → set parking fields; if empty → archive (recommended); if Editing already exists → fail closed; Internal → no park.
4. **Restore TX helper** — Clear parking fields when Editing leaves via approved exit (queue success first).
5. **Wire entry paths** — Portal `unqueuePortalPrintRequestFromShow`; Studio remove-from-show via trusted TX; recovery release reconcile when it sets editing.
6. **Wire exit paths** — `queuePortalPrintRequestToShow`; Studio allocate that activates editing; archive/delete/convert/clear contracts per Formal Review restore table.
7. **Gate mutations** — All Continuable mutation callables + client size path prechecks reject parked drafts; queue rejects parked.
8. **Portal UX** — Banner when active Continuable is Editing; Working list + detail locked for parked; Editing tab unchanged membership.
9. **Docs + tests + DEV deploy inventory** — Amend ADR-FP-071; preserve ADR-FP-158; Owner QA.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (shared + Portal + Studio contracts) | `npx tsx --test` focused suite from Formal Review matrix | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Studio/Portal typecheck | workspace tsc | yes (goal-scoped clean) |
| Rules unit (if present) | project convention | if exists |

### Manual

- [x] Owner QA checklist in goal prompt (DEV customer PR-A draft + PR-B queued → park → edit → requeue → restore; Studio unqueue repeat)

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Owner QA DEV)
- [x] Business logic — parked draft Working visibility + empty-draft archive recommendation (Formal Review; see Open Questions)
- [ ] Production deploy — **NOT AUTHORIZED**
- [ ] Production migration — **NOT AUTHORIZED**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Studio client-only editing write leaves draft unparked / non-atomic | high | Trusted TX callable for customer remove-from-show |
| Stranded parked draft if exit path omits restore | high | Restore trigger table + tests for every exit |
| Stale tab mutates parked draft | high | Server assert on every mutation/queue |
| Accidental park on Show MOVE | high | MOVE must not call park; regression tests |
| Merge/identity ignores parked Continuable | medium | Update Continuable merge evaluators |
| Empty draft parking creates junk | low | Archive empty instead of park |

---

## Rollback Plan

- Revert Functions + Rules + clients; clear parking fields via one-off Admin if any written on DEV; restore prior Continuable conflict behavior.

---

## Documentation Updates Required

- [x] DATA_MODEL.md
- [x] DECISIONS.md (ADR-FP-071 amend; ADR-FP-158 preservation note)
- [x] BACKEND.md (if new callable)
- [x] ROADMAP.md
- [ ] SECURITY.md only if Rules section needs cross-link

---

## Open Questions

- [x] Parked draft Working-tab visibility — Formal Review **recommends keep visible + locked** (not hide). Owner may override at review.
- [x] Empty draft — Formal Review **recommends archive in park TX** (do not park). Owner may override.
- [ ] None blocking Plan→Review if Formal Review recommendations accepted as `approved_with_changes` defaults.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-02-portal-editing-request-parks-current-draft-review.md`
- Verdict: **approved_with_changes** (2026-09-02)
