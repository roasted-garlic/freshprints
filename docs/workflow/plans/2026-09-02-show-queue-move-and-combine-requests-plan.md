# Plan: Show Queue Move / Combine Print Requests Between Shows

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | approved (owner decisions 2026-09-02 incorporated) |
| Workflow | managed-phase |
| Goal id | `show-queue-move-and-combine-requests` |
| Related | `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-review.md` |
| Production | **NOT AUTHORIZED** — DEV (`fresh-prints-dev`) only |
| FreshForge impact | None (application product work, not starter surface) |

---

## Goal

Give Studio staff a reliable **Move to Another Show** / **Move All Requests** workflow that relocates eligible **show allocations** between Whatnot show queues, **combines correctly** when the destination already holds the same Print Request, never doubles or loses quantity, and does **not** apply Did Not Print incident semantics to ordinary pre-production moves.

---

## Background

Staff already need to correct wrong-show queueing, consolidate shows, and empty a queue into another. Fresh Prints already has:

1. **Per-request transfer** — `TransferPrintRequestToShowModal` + `upcomingShowService.transferPrintRequestBetweenShows` (Show Queue row ⋯ and Print Request detail show-group ⋯).
2. **Did Not Print recovery requeue** — Functions `previewShowProductionRecovery` / `applyShowProductionRecovery` action `requeue_unfulfilled` (Needs Attention → Did Not Print).

This phase **hardens and generalizes allocation MOVE mechanics**, adds **whole-queue move with preview/apply**, and **separates** allocation movement from DNP recovery. It must **not** rebuild DNP from scratch and must **not** leak DNP show-completion / `needsStaffRequeue*` semantics into normal moves.

---

## Scope

### In Scope

- Feature A: Move one PR from Show Queue card (harden existing transfer).
- Feature B: Move one PR from Print Request detail (harden existing transfer; explicit source-show when split).
- Feature C: Move entire eligible Show Queue → another show (new UI + trusted bulk operation).
- Server-authoritative preview/apply for bulk (and preferably for hardened individual move).
- Movable-status fail-closed rules; capacity policy reuse; combine semantics per authoritative model.
- Shared helpers extracted from DNP **mechanics only**.
- Docs: DATA_MODEL / DECISIONS / TESTING updates for move contract.
- Automated tests + Owner QA on `fresh-prints-dev`.

### Out of Scope

- Production deploy.
- Changing Did Not Print recovery product behavior (except ensuring it remains intact / unshared recovery-only fields).
- Automatic source-show archive / cancel / Did Not Print / complete after empty queue.
- Cloning Print Requests for ordinary move (existing **copy** mode for past/locked sources remains separate; not expanded).
- Design `status` / catalog mutations.
- Portal UI redesign (verify read-path only).
- Smart Profiling; `show-queue-batch-allocation-performance`.
- Merging multiple allocation **documents** into one doc (not current contract — see Formal Review).
- Cross-surface moves unless owner explicitly approves (see Open Questions).

---

## Audit answers (owner checklist 1–36)

### 1. Show Queue request-card action path

**No separate RequestCard component.** Rows live in:

- `apps/studio/.../upcoming-shows/pages/UpcomingShowsPage.tsx` — `show-allocation-row` + `DangerOverflowMenu`
- Items: `id: "transfer"` → `formatPrintRequestShowTransferActionLabel` (“Move to another show” / “Copy…”); `id: "remove"` → “Remove from show”
- Opens `TransferPrintRequestToShowModal` via `transferRequestContext`

**Plan:** Keep this entry; enhance modal/service contract (preview, blockers, combine messaging). Do not add a second primary button.

### 2. Print Request detail action path

- `apps/studio/.../print-requests/pages/PrintRequestsPage.tsx`
- Per-show group: `renderSelectedRequestShowQueueLinks` → ⋯ `id: "transfer"` → `transferShowContext` → same `TransferPrintRequestToShowModal`
- Source is already the **selected show group** (split requests: staff pick which show pill/group’s ⋯ to open)

**Plan:** Keep per-group source semantics (do not guess). Optionally tighten empty/multi-show UX copy; share modal with Feature A.

### 3. Show-level bulk action path

- `UpcomingShowsPage` → `showDetailOverflowMenuItems` (~L778) → `DangerOverflowMenu` “Show actions”
- Today: Edit show…, Delete show… / Delete internal sheet…
- Needs Attention / Did Not Print stay on `NeedsAttentionShowPanel` (not this menu)

**Plan:** Add **Move All Requests** (or Studio-conventional wording) to `showDetailOverflowMenuItems` when source is eligible for pre-production move. New shared bulk modal (pattern from `DidNotPrintRecoveryDialog` + transfer modal).

### 4. Current allocation uniqueness semantics

**Authoritative model: multiple documents allowed.**

- Collection: `showAllocations/{autoId}`
- **No** unique composite key on `(upcomingShowId, printRequestId, printRequestItemId)`
- Effective show quantity for an item = **sum** of non-`canceled` `allocatedQuantity` for that triple
- UI: `groupAllocationsByRequest` → **one card per Print Request** (sums allocations in group)
- Export/gang sheet: one asset **per allocation doc** (sums quantities; duplicate docs are additive, not merged)

### 5. Proposed combine semantics

**Do not invent single-doc merge for V1.**

When destination already has the same PR/item:

- Cancel/delete source rows (per approved history model)
- **Create** new pending destination rows for moved quantities (same as Add / current transfer / DNP requeue)
- Effective destination qty = prior non-canceled sum + moved qty (e.g. 3 + 5 = **8**)
- One Show Queue card via grouping; gang-sheet export sees **8** total across docs

Optional later: merge into one doc — **out of scope** (would change export identity / gang-sheet placement keys keyed by `showAllocationId`).

### 6. Current Did Not Print move implementation

| Piece | Path |
|-------|------|
| Callables | `functions/src/previewShowProductionRecovery.ts` → `previewShowProductionRecovery`, `applyShowProductionRecovery` |
| Orchestration | `functions/src/lib/showProductionRecovery.ts` |
| Requeue apply | `functions/src/lib/showProductionRecoveryRequeue.ts` (`applyRequeueUnfulfilledRecovery`, `cloneAllocationForRequeue`) |
| Shared | `packages/shared/src/utils/showProductionRecovery*.ts`, `showProductionRecoveryRequeue.ts` |
| UI | `DidNotPrintRecoveryDialog.tsx`, `NeedsAttentionShowPanel.tsx` |
| Action | `requeue_unfulfilled` → resolution `unfulfilled_requeue` |

Behavior: cancel eligible source → create new pending dest with `requeuedFromAllocationId` → complete source show as Did Not Print → clear `needsStaffRequeue*` → recompute both shows’ `allocatedQuantity` in one Admin transaction. Cap: `SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS = 150`. Idempotency: `showProductionRecoveryApplications/{previewChecksum}`.

### 7. DNP mechanics reusable for general move

- Cancel-source + create-dest pattern (if cancel model chosen)
- `computeShowAllocatedQuantityFromAllocations` / authoritative recompute of both shows
- Destination eligibility: `isPrintRequestShowTransferDestination` / `canAcceptNewShowAllocations` / capacity projection helpers
- Preview checksum + TOCTOU revalidation pattern
- Transaction / write-budget ceiling (~150 allocation pairs)
- Finishable vs terminal status helpers (adapt set for general move)

### 8. Recovery-only mechanics to exclude

- Setting source `productionStatus: "completed"` / `productionResolutionKind: "unfulfilled_*"`
- `needsStaffRequeue*` set/clear as DNP policy (general move must not mark staff-requeue; clearing only if product later requires — default **do not touch** unless PR already has marker and destination receive is intentional — prefer leave DNP clear path alone; existing transfer clears marker on destination PR — Formal Review decides)
- `showProductionRecoveryApplications` collection / action literals
- Past-show / Needs Attention eligibility gates for *opening* DNP
- Auto status reset quirks tied to recovery
- Release-only path / mark fulfilled

### 9. Normal Remove-from-Show

- Studio: `upcomingShowService.removeShowAllocationsForRequest` → **hard `deleteDoc`** of non-canceled rows → `recalculateShowAllocatedQuantity` → maybe `editing` + `queueTab` sync
- Gate: `canRemoveRequestFromShow` — blocked when production is `printing` | `fully_printed` | `completed` | `archived`
- Portal unqueue callable: **cancel** (not delete), statuses `pending`|`queued` only

### 10. Exact movable allocation statuses (proposed)

| Status | General MOVE V1 | DNP requeue | Portal unqueue | Current client transfer |
|--------|-----------------|-------------|----------------|-------------------------|
| `pending` | ✅ | ✅ | ✅ | ✅ (all non-canceled) |
| `queued` | ✅ | ✅ | ✅ | ✅ |
| `in_progress` | ❌ block | ✅ | ❌ | ⚠️ currently moved |
| `printed` / `done` | ❌ block | ❌ | ❌ | ⚠️ currently moved |
| `canceled` | ignored | ignored | ignored | ignored |

**Proposed authoritative general MOVE set:** `pending` | `queued` only (align Portal + owner safety). Fail closed if any selected source allocation is non-movable.

### 11. Source show eligibility (proposed)

| Context | Move one / Move All |
|---------|---------------------|
| Upcoming Whatnot, production removable (`open` / `full` / `canceled` per `canRemoveRequestFromShow`) | ✅ primary |
| `printing` / terminal | ❌ use recovery/admin paths; existing transfer **copy** mode stays separate (out of MOVE hardening except do not expand) |
| Needs Attention / past / Did Not Print incident | ❌ do **not** bypass DNP; keep `DidNotPrintRecoveryDialog` |
| Empty queue | hide/disable Move All |

### 12–13. Destination show eligibility / printing

Reuse `isPrintRequestShowTransferDestination`:

- Whatnot / `dev_fixture` only (not `staff_gang_sheet`)
- Not past schedule
- `productionStatus` not in `{ completed, fully_printed, archived, canceled, full }`
- Capacity not already full (`isFull`)
- **`printing` is currently allowed** as destination (not in done/closed set)

**Plan:** Keep allowing `printing` destination unless Formal Review / owner rejects — matches Add-to-Show / transfer today.

### 14. Capacity / override

- Current allocate + transfer + DNP requeue: **hard block** when projected > max (exact fill OK)
- DATA_MODEL documents `overrideCapacity` but **`allocatePrintRequestItem` does not read it** — no second policy
- **Plan:** Reuse hard-block; preview shows `current → projected` and capacity blocker; no new override UI

### 15. Split-request behavior

Move only allocations on **selected source show**. Other shows untouched. Existing Feature A/B already scope by `sourceShowId`.

### 16. Same-PR-already-in-destination

Create additional dest docs; group by `printRequestId`; effective sum combines. Preview must call out “already in destination — quantities will combine.”

### 17. Source allocation history / cancellation

**Conflict today:**

- Studio Remove + existing transfer **move**: **delete**
- Portal unqueue + DNP: **cancel** (+ DNP lineage)

**Proposed default for Formal Review (subject to owner):**

- **V1 general MOVE:** keep **delete** for source rows to match existing Studio transfer + Remove (no false “Did not print” history via `requeuedFromAllocationId` — see §18)
- Document history gap (deleted legs disappear from reconstruction)
- Optional follow-up: cancel + `movedFromAllocationId` with history resolver update

**[NEEDS OWNER DECISION]** if owner requires cancel+lineage in V1.

### 18. Lineage / audit model

- **Do not** set `requeuedFromAllocationId` on general moves without history changes — canceled sources referenced by that field are classified as **missed / Did not print** in `buildPrintRequestHistoryCard`
- V1 delete model: no new lineage field
- If cancel chosen: add `movedFromAllocationId` (or equivalent) + update history kinds so dest = “Moved to another show”, source ≠ DNP missed unless `productionResolutionKind` says so
- No giant event log; optional staff activity only if existing infra fits (today: reconstruction from allocations)

### 19. Print Request derived status

- `derivePrintRequestListTab` / `queueTab`: any non-canceled allocation → Queued
- Atomic create-dest **before** remove-source in same batch/TX avoids Working flash
- Existing transfer batch: create then delete — good
- Do not flip to Working when destination allocations exist
- Designs untouched; PR identity unchanged on move (copy mode separate)

### 20–21. Whole-queue atomicity / Firestore limits

- Firestore TX ~500 writes; DNP uses **150** finishable allocs (cancel+create ≈ 2 writes each + shows + PRs)
- **Plan:** Server single transaction for bulk when eligible count ≤ 150; if over → preview blocks (`too_many_allocations`) with clear message (same as DNP). No client `for await` loop as authority.
- All-or-nothing: if any blocker in requested set → **block entire Apply** (preferred V1)

### 22. Idempotency / concurrency

- Preview checksum over source allocation ids/status/qty + dest allocatedQuantity/max + show ids
- Idempotency doc collection e.g. `showAllocationMoveApplications/{checksum}` (separate from DNP recovery applications)
- In-TX revalidate; duplicate apply returns prior success without doubling
- UI disable double-submit

### 23. Preview / apply architecture

| Op | Individual (hardened) | Whole queue |
|----|----------------------|-------------|
| Preview | callable read-only impact | callable read-only |
| Apply | callable revalidate + TX | callable revalidate + TX |

Reuse DNP-style pattern; **new** callables (do not overload recovery action enum).

Suggested names: `previewShowAllocationMove` / `applyShowAllocationMove` with `scope: "print_request" | "show_queue"`.

### 24. allocatedQuantity recomputation

- **Always recompute** both source and destination from non-canceled allocations after mutation (DATA_MODEL / ADR-FP-051)
- Fix existing transfer’s destination **incremental** update as part of hardening

### 25. Portal impact

- Portal reads allocations / show association — **no Portal source change expected** if APIs remain allocation-derived
- ADR-FP-071 one-working-request: move must not create a second customer Working PR (identity preserved)
- Verify Portal progress/show label follows destination after move

### 26–27. Internal Gang Sheet / cross-surface

- Destinations today: **Whatnot only** (`isPrintRequestWhatnotShow`)
- Origin gates: Internal PRs ↔ IGS; customer ↔ Whatnot (`canAllocateOriginToShowSource`)
- Cross-surface Whatnot ↔ IGS: **blocked** by product helpers
- Internal → Internal: **not** available via current transfer destination filter

**Default plan:** Whatnot Show → Whatnot Show only for Move / Move All.  
**[NEEDS OWNER DECISION]** whether Internal ↔ Internal should be enabled later.

### 28. Functions impact

**YES** — new preview/apply callables + shared move lib; register in `functions/src/index.ts`; deploy to **dev** only when implementing.

### 29. Firestore Rules

**Likely NO change** if mutations are Admin SDK in Functions. Staff client path today writes allocations; migrating move to Functions narrows client writes (good). Rules already allow staff create/delete.

### 30. Storage Rules

**NO**

### 31. Indexes

**Probably NO** — queries by `upcomingShowId` / `printRequestId` already indexed.

### 32. Migration / backfill

**NO**

### 33. Exact files expected to change (implement phase)

**Functions**

- `functions/src/previewShowAllocationMove.ts` (new) / `applyShowAllocationMove.ts` (or single module)
- `functions/src/lib/showAllocationMove*.ts` (new — mechanics extracted/adapted from requeue)
- `functions/src/index.ts`
- Contract/unit tests under `functions/src/`

**Shared**

- `packages/shared/src/types/showAllocationMove/` (new types)
- `packages/shared/src/utils/showAllocationMove*.ts` (eligibility, preview builders, movable statuses)
- Possibly thin exports from existing `printRequestShowTransfer.ts`, `showCapacity.ts`, `showAllocationEligibility.ts`
- Tests alongside

**Studio**

- `TransferPrintRequestToShowModal.tsx` — preview impact, combine copy, call new service
- New `MoveShowQueueRequestsModal.tsx` (or similar)
- `UpcomingShowsPage.tsx` — Move All menu item; wire modal
- `PrintRequestsPage.tsx` — only if wiring/service signature changes
- `upcomingShowService.ts` — deprecate/redirect client `transferPrintRequestBetweenShows` move path to callable (or keep thin wrapper)
- New `showAllocationMoveService.ts`
- CSS as needed (`show-queue.css` / modal)

**Docs**

- `docs/architecture/DATA_MODEL.md` — move contract
- `docs/project/DECISIONS.md` — ADR for general move vs DNP
- `docs/standards/TESTING.md` — commands if new scripts

**Portal / Rules / Storage**

- None expected (verify only)

### 34. Tests planned

See Test Strategy below (matrix items 1–35).

### 35. DEV deploy scope

- Firebase project: **`fresh-prints-dev`**
- Deploy: Cloud Functions (new callables) only when entering implement/test; Studio local against dev
- **Production NOT AUTHORIZED**

### 36. Owner QA plan

Two DEV Whatnot shows (A source, B destination):

| Fixture | Intent |
|---------|--------|
| PR1 | Only on A |
| PR2 | Split / partly on B already |
| PR3 | Multi-item qty totals |

Verify A–J in owner brief (card move, detail move, combine, whole A→B, empties, capacity, Queued, blockers, Add/Remove regression). No production testing.

---

## Approach (implementation strategy — after review approval)

1. Extract **allocation move mechanics** shared module (movable statuses, capacity projection, cancel-or-delete source, create dest pending, recompute both shows, checksum, idempotency) **without** DNP completion / staff-requeue / recovery applications.
2. Implement Functions `preview` + `apply` for `scope=print_request` and `scope=show_queue`.
3. Point Studio transfer modal at preview/apply; preserve copy mode as existing client path or explicitly out-of-scope leave-as-is.
4. Add Move All Requests UI + bulk preview modal.
5. Harden: block non-movable statuses; all-or-nothing bulk; recompute both quantities; combine messaging.
6. Tests + DEV deploy functions + Owner QA.
7. Docs / ADR.
8. Signoff → commit → push `development` (per owner pipeline; not this session).

---

## Architecture Impact

- [x] Details: New Functions boundary for trusted move; Studio UI calls services → callables; shared pure helpers; DNP recovery remains separate module consuming overlapping eligibility helpers only.

## Security Impact

- [x] Details: Staff-only callables (`canManageUpcomingShows`); server revalidation; no client bulk authority; fail closed on non-movable / bad destination; no secrets; designs not writable.

## Data Model Impact

- [x] Details: Document general MOVE contract; optional new lineage field **only if** cancel model approved; no migration. Do not mutate designs. PR identity stable on move.

## Backend Impact

- [x] Details: New Functions; possibly new idempotency collection; Admin TX writes to `showAllocations` + `upcomingShows` (+ queueTab recompute post-tx).

## UI / UX Impact

- [x] Details: Enhance transfer modal; add show ⋯ Move All Requests; dark Studio modals; deliberate confirm; manual Owner QA required.

## Migration Impact

- [x] None (no backfill)

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit | `node`/`npm` test scripts for new `showAllocationMove*` + existing transfer/recovery regression | yes |
| Functions contract | `functions` build + focused contract tests | yes |
| Studio typecheck | `npx tsc --noEmit` in `apps/studio` | yes |
| Lint | `npm run lint` | yes |
| Functions build | `npm run build --prefix functions` | yes |
| Portal typecheck | only if Portal touched (expect skip) | if needed |
| Rules | `npm run test:rules` if rules change (expect skip) | if needed |

### Manual

Owner QA checklist (DEV shows A/B) — see §36 and Formal Review.

### Matrix coverage (plan)

Individual 1–10; blockers 11–16; whole show 17–24; entry points 25–28; regressions 29–35 — implement tests map to shared/functions units + Owner QA for UI.

---

## Human Checkpoints Anticipated

- [x] Business logic decisions — see Open Questions (`[NEEDS OWNER DECISION]`)
- [x] Manual UI / Owner QA on DEV
- [ ] Production deploy — **forbidden**
- [ ] Design approval — n/a beyond Studio convention reuse

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Quantity double on retry | High | Idempotency + TX + checksum |
| Partial bulk move | High | All-or-nothing; no client loop |
| DNP semantics leak | High | Separate callables/modules; recovery-only fields excluded |
| False “Did not print” history | High | Do not reuse `requeuedFromAllocationId` without history fix |
| Existing transfer moves printed work | High | Movable status gate in hardened path |
| Working tab flash | Med | Atomic dest-before-source removal |
| Queue > 150 allocs | Med | Preview block with clear limit (same as DNP) |
| Dest qty drift | Med | Always recompute both shows |

---

## Rollback Plan

- Redeploy prior Functions; Studio feature-flag or revert menu items
- No data migration; failed applies leave prior state if TX aborts
- Production never receives this until separately authorized

---

## Documentation Updates Required

- [x] DATA_MODEL.md — move/combine contract
- [x] DECISIONS.md — ADR general move vs DNP
- [ ] TESTING.md — if new npm scripts
- [ ] ARCHITECTURE.md / BACKEND.md — callables list if maintained there

---

## Open Questions

- [x] Resolved by owner 2026-09-02 (see Owner Decisions below).

---

## Owner Decisions (2026-09-02) — binding for implement

1. **Source history:** cancel source allocations (retain docs); destination new docs; lineage `movedFromAllocationId`. Never `requeuedFromAllocationId` for normal MOVE. Unify individual + whole-show on this contract (replace delete-based transfer move). Remove-from-Show unchanged (delete).
2. **Surfaces:** Whatnot → Whatnot only. No IGS↔IGS or cross-surface in V1.
3. **Movable statuses:** `pending` \| `queued` only. Any non-movable in scope → block entire apply (individual and bulk).
4. **Destination:** exclude `printing` and later/terminal; move-specific eligibility helper if shared Add helper cannot be tightened safely.
5. **Copy mode:** leave past/locked copy unchanged and separate from MOVE / DNP.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-02-show-queue-move-and-combine-requests-review.md`
- Verdict: approved_with_changes + owner decisions incorporated → implement authorized
