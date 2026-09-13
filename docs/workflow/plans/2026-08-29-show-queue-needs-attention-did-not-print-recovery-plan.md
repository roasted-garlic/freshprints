# Plan: Show Queue Needs Attention — Did Not Print Re-queue Recovery

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `show-queue-needs-attention-did-not-print-recovery` |
| Prerequisite | `show-queue-dev-override-and-allocation-permission-repair` — **DONE** (owner QA PASS) |
| Related ADRs | ADR-FP-149, ADR-FP-071, ADR-FP-155; planned **ADR-FP-156** (this slice) |
| Production | **NOT AUTHORIZED** |
| WS4 | **PAUSED** (unchanged) |

---

## Goal

Improve Show Queue → Needs Attention → Did Not Print so staff can **move all unprinted work** from a missed show to one eligible upcoming destination show in a single trusted recovery operation, with **Release only** retained as a secondary fallback that marks requests **Needs Re-queue** for later staff allocation.

---

## Binding product direction (not open for replanning)

| Decision | Binding answer |
|----------|----------------|
| Primary action | Move unprinted requests to another show |
| Secondary action | Release only |
| Release-only unresolved state | Needs Re-queue |
| New Released tab | No |
| Working Needs Re-queue filter | Yes |
| Force all released CRs to editing | No |
| Preserve one Portal continuable request | Yes (ADR-FP-071) |
| Merge released CR into existing draft | No — out of scope |
| Bulk behavior | All applicable unprinted work → one target show |
| Quantity moved | Exact unfulfilled quantity only |
| Source history | Preserve canceled source allocations |
| Source show terminal state | DID NOT PRINT (existing semantics) |

---

## Current problem (repo-confirmed)

`release_unfulfilled` (`functions/src/lib/showProductionRecovery.ts`) cancels all non-canceled source allocations and completes the show with `productionResolutionKind: "unfulfilled_release"`. `reconcileRequestAfterRelease` may transition `active → editing` when ADR-FP-071 allows, then `recomputeAndPersistQueueTab` often lands the request in **Working**.

When the customer already has another `draft`/`editing` request, the released request cannot become editing but still appears as an ordinary Working cart — staff lose visibility that scheduling recovery is required.

---

## Exact current source paths

### Studio UI

| Path | Role |
|------|------|
| `apps/studio/src/renderer/src/features/upcoming-shows/components/NeedsAttentionShowPanel.tsx` | Needs Attention actions; currently `mark_fulfilled` / `release_unfulfilled` / `close_empty` |
| `apps/studio/src/renderer/src/features/upcoming-shows/components/ShowProductionRecoveryDialog.tsx` | Preview + apply dialog |
| `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` | Wires panel + dialogs |
| `apps/studio/src/renderer/src/features/upcoming-shows/services/showProductionRecoveryService.ts` | Callable client |
| `apps/studio/src/renderer/src/features/print-requests/components/TransferPrintRequestToShowModal.tsx` | Per-request move/copy pattern + destination list |
| `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` | Working triage filters |

### Shared domain

| Path | Role |
|------|------|
| `packages/shared/src/types/showProductionRecovery/showProductionRecovery.types.ts` | Actions, preview/apply types |
| `packages/shared/src/utils/showProductionRecovery.ts` | Tab classification, preview outcome gates |
| `packages/shared/src/utils/showProductionRecoveryPlanners.ts` | Mutation plans |
| `packages/shared/src/utils/showFinishAllocationStatuses.ts` | Finishable = `pending`, `queued`, `in_progress` |
| `packages/shared/src/utils/showAllocationEligibility.ts` | Capacity + production locks |
| `packages/shared/src/utils/printRequestShowTransfer.ts` | Destination eligibility |
| `packages/shared/src/utils/printRequestWorkingTriage.ts` | Working sub-filters |
| `packages/shared/src/utils/printRequestQueueTabRecompute.ts` | Queue tab derivation |
| `packages/shared/src/types/showAllocation/showAllocation.types.ts` | Allocation model |
| `packages/shared/src/types/printRequest/printRequest.types.ts` | Request model + conversion fields |

### Functions (trusted boundary)

| Path | Role |
|------|------|
| `functions/src/previewShowProductionRecovery.ts` | Callable entry + auth |
| `functions/src/lib/showProductionRecovery.ts` | Preview build + apply mutations |
| `functions/src/lib/printRequestQueueTab.ts` | Persist `queueTab` |
| `functions/src/lib/staffGangSheetShowFinishReconciliation.ts` | Finish reconciliation helpers |

---

## Current Preview flow

1. Studio opens `ShowProductionRecoveryDialog` with `action` + `upcomingShowId`.
2. `showProductionRecoveryService.preview()` → callable `previewShowProductionRecovery`.
3. `buildShowProductionRecoveryPreview` loads show + allocations; computes `isPast`, `isShowQueueProductionRecoveryEligible`, counts via `countActiveShowAllocations`.
4. `resolveProductionRecoveryPreviewOutcome` gates action.
5. For each affected print request, `predictRequestEffect` loads global allocations + request status; predicts status/tab via `computePrintRequestQueueTab` + `shouldTransitionActiveRequestToEditing` (release path).
6. Response returned to Studio preview body (counts, request effects, blockers, notes).

**Gap:** No target show, no per-request requeue quantities, no checksum, no `requeue_unfulfilled` action.

---

## Current Apply flow

1. Studio calls `showProductionRecoveryService.apply()` → `applyShowProductionRecovery`.
2. Callable builds preview; short-circuits on `already_terminal` / non-`applied`.
3. **Recheck preview** before mutation.
4. `executeShowProductionRecovery` branches on action:
   - `close_empty` — complete show only
   - `mark_fulfilled` — finish allocations + reconcile completion
   - `release_unfulfilled` / `force_completed` — cancel allocations + reconcile release + complete show
5. Updates `productionResolutionKind`, `allocatedQuantity`, request statuses, `recomputeAndPersistQueueTab`.

**Gap:** No bulk requeue; release leaves ambiguous Working presentation.

---

## Authoritative unprinted quantity model

**Definition (server-side only):** For a source show in Needs Attention, **requeue-eligible quantity** = sum of `allocatedQuantity` on allocations where:

- `allocation.upcomingShowId === sourceShowId`
- `allocation.status !== "canceled"`
- `isFinishableShowAllocationStatus(allocation.status)` → `pending`, `queued`, `in_progress`

**Excluded from move:**

- `printed`, `done` on source show (already fulfilled there)
- `canceled` (already inactive)
- Allocations on **other** shows (unchanged; warn in preview like today)

**Split allocations:** Each allocation row is independent. A print request item may have multiple rows across shows; only finishable rows **on the source show** move. Partial item quantity on source show moves as the row's `allocatedQuantity` — no blind whole-request move.

**Implementation location:** New shared pure helper e.g. `collectRequeueEligibleAllocations(allocations, sourceShowId)` in `packages/shared/src/utils/showProductionRecoveryRequeue.ts` (name TBD), used by preview + apply + tests.

---

## Proposed recovery actions and resolution kinds

Extend existing enum (names follow current convention):

| Action | Resolution kind | Behavior |
|--------|-----------------|----------|
| `requeue_unfulfilled` *(new)* | `unfulfilled_requeue` *(new)* | Cancel finishable source allocations; create replacement allocations on target; complete source show DID NOT PRINT; reconcile requests to queued/active |
| `release_unfulfilled` *(existing)* | `unfulfilled_release` | Enhanced: set Needs Re-queue marker when staff scheduling still required |

Keep `close_empty`, `mark_fulfilled`, `force_completed` unchanged.

---

## Proposed requeue Preview contract

Extend `PreviewShowProductionRecoveryRequest`:

```typescript
{
  upcomingShowId: string;
  action: ShowProductionRecoveryAction;
  targetUpcomingShowId?: string;  // required when action === "requeue_unfulfilled"
  overrideReason?: string;
}
```

Extend `PreviewShowProductionRecoveryResponse`:

| Field | Purpose |
|-------|---------|
| `previewChecksum` | SHA-256 of canonical preview payload (see below) |
| `targetShow` | `{ id, title, scheduledStartAtMillis, source, maxTotalQuantity, allocatedQuantity, projectedAllocatedQuantity }` |
| `requeueLines` | Per request: `{ printRequestId, requestNameSnapshot, allocationCount, requeueQuantity, otherShowAllocationQuantity }` |
| `totalRequeueQuantity` | Sum of requeue lines |
| `capacityBlocker` | Optional structured capacity outcome |
| Existing fields | Retained for parity |

**Checksum inputs (server canonical JSON):** `upcomingShowId`, `action`, `targetUpcomingShowId`, sorted allocation ids + statuses + quantities on source, source `productionStatus`, target show capacity snapshot, `predictedResolutionKind`.

Studio must submit `previewChecksum` + `targetUpcomingShowId` on Apply; server recomputes and rejects mismatch (`blocked`, code `preview_stale`).

---

## Proposed requeue Apply contract

Extend `ApplyShowProductionRecoveryRequest`:

```typescript
{
  upcomingShowId: string;
  action: ShowProductionRecoveryAction;
  targetUpcomingShowId?: string;
  previewChecksum?: string;
  overrideReason?: string;
}
```

Apply steps (single transaction when within limits):

1. Re-load source show, target show, all source allocations, affected requests.
2. Verify preview checksum + unresolved source + eligible target + capacity.
3. For each requeue-eligible allocation: **cancel source row** (existing cancel semantics + optional `cancelReason: "did_not_print_requeue"` on allocation if added to DATA_MODEL).
4. **Create new allocation docs** on target (clone fields from canceled row: item id, qty, snapshots, design/upload refs); status `pending` or `queued` per existing allocate defaults.
5. Update source show: `productionStatus: completed`, `productionResolutionKind: unfulfilled_requeue`, `allocatedQuantity: 0` (recalc from remaining non-canceled if any printed/done left — edge case: block if printed+did-not-print mix requires staff review).
6. Update target show `allocatedQuantity` (+denormalized recalc).
7. For each affected request: set `status: active` when appropriate; **clear** any `needsStaffRequeue*` fields; **do not** call `shouldTransitionActiveRequestToEditing`; `recomputeAndPersistQueueTab` → **Queued**.
8. Write idempotency record (see below).

---

## Studio dialog workflow (conceptual)

Replace single-action recovery dialog entry from Needs Attention with **Did Not Print** entry point:

1. Staff clicks primary **Did Not Print…** (or re-label existing release path).
2. Modal step 1 — **Recommended:** Move unprinted requests to another show
   - Target show `<Select>` populated via same filter as `TransferPrintRequestToShowModal` (`isPrintRequestShowTransferDestination`), excluding source show id.
   - Live preview on target change (debounced callable preview).
   - Summary: X requests, Y total qty, capacity before/after.
   - Primary confirm: **Confirm Did Not Print + Move**
3. Secondary collapsible/link: **Release only** → existing release preview/confirm copy; notes Needs Re-queue outcome.
4. Keep separate buttons for Mark Fulfilled / Close Empty / Owner override outside Did Not Print cluster (unchanged).

Reuse `ShowProductionRecoveryDialog` with action branching or extract `DidNotPrintRecoveryDialog.tsx` if cleaner — implementation choice; plan prefers extend existing dialog + panel.

---

## Target eligibility logic

**Authoritative reuse:**

- `isPrintRequestShowTransferDestination(show, now)` from `printRequestShowTransfer.ts`
- `getShowAllocationBlockReason(...)` for capacity/production/past
- `canAllocateOriginToShowSource(...)` for internal vs customer origin
- Exclude `sourceShowId === targetShowId`
- Include `dev_fixture` destinations on DEV (already eligible: not `staff_gang_sheet`)
- Exclude `staff_gang_sheet` as destination (existing transfer rule)

**Not selectable:** Past schedule, terminal production, full capacity (unless override path exists), source show itself.

No parallel eligibility system.

---

## Capacity handling

- Preview: compute `projectedAllocatedQuantity = target.allocatedQuantity + totalRequeueQuantity`; compare to `maxTotalQuantity` when set.
- Apply: revalidate inside transaction; if insufficient and `maxQuantityOverridden` policy does not apply, block with `capacity_exceeded`.
- Reuse existing staff capacity override modal pattern from Show Queue if destination would exceed max — only if `upcomingShowService` already supports override on allocate; do not invent new permission.

---

## Source allocation history strategy

- **Never** re-point existing source allocation `upcomingShowId`.
- Cancel source finishable rows with `status: canceled`, `canceledAt`, `canceledBy` (existing release path).
- Create **new** allocation documents on target with fresh ids.
- Optional audit field on new allocation: `requeuedFromAllocationId` (optional, recommended for WS4/history compatibility) — Formal Review to confirm minimal field set in DATA_MODEL.

Printed/done rows on source remain unchanged as historical evidence.

---

## Destination allocation strategy

- Clone allocation payload from each canceled source row (item id, qty, snapshots, design/upload metadata).
- Set `upcomingShowId` to target; `status` initial value matches normal staff allocate path (`pending`/`queued`).
- Recompute target show `allocatedQuantity` via `computeShowAllocatedQuantityFromAllocations` (existing).

---

## Bulk atomicity strategy

**Expected volume:** Show Queue shows typically have tens of allocations, not thousands. Each requeue line = 1 cancel update + 1 create ≈ 2 writes + show updates + request updates.

**Primary path:** Single Firestore transaction when total writes ≤ **400** (conservative under 500 limit).

**Edge case:** If allocation count exceeds safe transaction size:

- Block preview with `too_many_allocations` **or**
- Implement idempotent multi-phase job doc `showProductionRecoveryJobs/{previewChecksum}` with resumable steps (Formal Review must approve if needed)

**V1 assumption:** Single-transaction sufficient for normal show sizes; preview returns blocker `too_many_allocations` when finishable allocation count exceeds **`SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS` (default 150)**.

**Mixed fulfillment edge case:** If source show has printed/done rows plus finishable rows, requeue moves **only finishable** rows; printed/done remain historical on source; source still completes DID NOT PRINT. If finishable count = 0 but non-canceled printed/done exist, preview blocks requeue (`no_finishable_allocations`) — staff should use Mark Fulfilled instead.

**No silent partial completion:** Transaction failure rolls back all changes; Apply returns `blocked` with message.

---

## Idempotency / retry design

Follow patterns from `previewDuplicateAccountResolution` / `hardDeleteCustomerAccount`:

1. **`previewChecksum`** required on Apply for `requeue_unfulfilled`.
2. Source show terminal check prevents double-complete (`already_terminal`).
3. Optional collection `showProductionRecoveryApplications/{previewChecksum}` written on success with `{ upcomingShowId, action, targetUpcomingShowId, appliedAt, appliedBy }` — Apply returns success without duplicate mutations if doc exists (idempotent retry).

Release-only idempotency unchanged (terminal show guard).

---

## Concurrency design

Apply transaction must revalidate:

- Source still `isUnresolvedPastWhatnotShow` equivalent (queue surface + past + non-terminal)
- Finishable allocation set matches checksum (ids + qty + status)
- Target still `isPrintRequestShowTransferDestination`
- Target capacity still sufficient
- Affected print requests exist; not archived; converted CR blocked (see below)
- No concurrent terminal resolution on source

---

## Print Request lifecycle matrix

| Scenario | After requeue move | After release only |
|----------|-------------------|-------------------|
| Customer CR, no other continuable | `active` + Queued tab; clear Needs Re-queue | ADR-FP-071 may → `editing`; **set Needs Re-queue** until allocated |
| Customer CR, other draft/editing exists | `active` + Queued; **no** forced editing | Stay `active` or current; **Needs Re-queue** set |
| Internal request | `active` + Queued; no continuability gate | Internal lifecycle preserved + Needs Re-queue if unallocated |
| Converted CR (`convertedToInternalRequestId`) | **Block** in preview | **Block** or skip with warning |
| Request with allocations on other shows | Move source rows only; global tab from recompute | Existing release behavior + Needs Re-queue |

After successful move: **never** `active → editing` solely because source show missed.

---

## Portal continuability analysis (ADR-FP-071)

- **Requeue path:** Requests gain destination allocations → `hasActiveAllocationsGlobally === true` → must not transition to editing.
- **Release path:** Retain `shouldTransitionActiveRequestToEditing` only when no other continuable request; **additionally** persist Needs Re-queue marker regardless so Working triage surfaces recovery need even when status is `editing`.

---

## Needs Re-queue persistence model

**Proposed minimal fields on `printRequests`:**

| Field | Type | Purpose |
|-------|------|---------|
| `needsStaffRequeueAt` | Timestamp | When release-only marked recovery required |
| `needsStaffRequeueSourceShowId` | string | Missed show id |
| `needsStaffRequeueSourceShowTitleSnapshot` | string | Display in Working badge |
| `needsStaffRequeueReleasedQuantity` | number | Unfulfilled qty released |

**Why explicit fields:** Derivation from canceled allocations alone is fragile after future allocations, partial fulfillment, or history changes. Explicit marker supports deterministic filter + clearing.

**Rules:** Staff/functions write only; customers cannot set.

**Formal Review** must confirm no slimmer existing field suffices.

---

## Needs Re-queue clearing rules

Clear `needsStaffRequeue*` when:

1. Successful allocation to any eligible upcoming show (normal Add to Show or requeue move) — authoritative: new non-canceled allocation exists globally.
2. Owner hard-delete / archive where already supported.
3. Request fulfilled through normal completion paths (zero unfulfilled qty).

Do **not** clear on: open detail, edit items, failed preview, canceled allocation without replacement.

---

## Working filter / badge design

Extend `PrintRequestWorkingTriageFilter`:

```typescript
"needs_requeue" | "active" | "stale" | "empty" | "all"
```

- `resolvePrintRequestWorkingTriageBucket` gains precedence: if `needsStaffRequeueAt != null` → bucket `needs_requeue` (even if also stale).
- `PrintRequestsPage.tsx` — add chip **Needs Re-queue** before Active.
- Badge on cards: **NEEDS RE-QUEUE** via new helper in `printRequestQueueBadge.ts` or dedicated `printRequestRequeueBadge.ts`.
- Compact context: missed show title + scheduled date from snapshots.

No new top-level tab.

---

## Internal Request behavior

- Requeue + release follow same allocation mechanics.
- Skip Portal continuability checks for editing transition.
- Needs Re-queue still applies when release-only leaves no allocations.

---

## CR → IR behavior

- Preview/apply **block** if `printRequest.convertedToInternalRequestId` is set (customer request already converted).
- Do not mutate converted customer request or linked internal request closure fields.
- Eligibility helper checks `closureKind === "converted_to_internal"`.

---

## Audit / history strategy

- Source show: existing `productionResolutionKind`, `productionResolvedAt`, `productionResolvedBy`.
- Canceled allocations retain audit timestamps.
- New allocations link optional `requeuedFromAllocationId`.
- Compatible with future WS4 Customer Activity (paused) — no parallel audit system.

---

## Security / trusted boundary

- Extend existing callables only; staff auth via `assertStaffRecoveryCaller`; owner override unchanged.
- No Portal/customer callable surface.
- Firestore rules: allow new optional print request requeue fields on staff writes; deny client manipulation.
- Client never supplies allocation quantities for apply — server derives from preview/checksum.

---

## Proposed file changes

| Area | Files |
|------|-------|
| Types | `showProductionRecovery.types.ts`, `printRequest.types.ts`, `showAllocation.types.ts` (optional cancel reason) |
| Shared logic | `showProductionRecovery.ts`, `showProductionRecoveryPlanners.ts`, new `showProductionRecoveryRequeue.ts`, `printRequestWorkingTriage.ts`, `printRequestRequeue.ts` |
| Functions | `lib/showProductionRecovery.ts`, `previewShowProductionRecovery.ts`, `lib/printRequestQueueTab.ts` |
| Rules | `firestore.rules` — printRequests requeue fields; showAllocations optional audit field |
| Studio | `NeedsAttentionShowPanel.tsx`, `ShowProductionRecoveryDialog.tsx` (or new Did Not Print dialog), `PrintRequestsPage.tsx`, badge utils, CSS |
| Tests | `showProductionRecovery.test.ts`, new requeue tests, rules tests, Working triage tests, contract tests |
| Docs | `DATA_MODEL.md`, `DECISIONS.md` (ADR-FP-156), `WORKFLOWS.md` Show Queue section |

---

## Firebase impact

| Resource | Change |
|----------|--------|
| Functions | **Yes** — extend `previewShowProductionRecovery`, `applyShowProductionRecovery` |
| Firestore rules | **Yes** — new optional print request + allocation fields |
| Indexes | **Likely no** — Working filter uses client-side triage on Working tab query unless we add persisted filter field (prefer client triage on loaded Working set initially; evaluate if performance requires index) |
| Storage | No |
| Production | **NOT AUTHORIZED** until separate approval |

---

## Automated test strategy

1. **Unprinted quantity** — split allocations, printed/done excluded, multi-show warnings.
2. **Requeue preview** — target capacity projection, blockers, checksum stability.
3. **Requeue apply** — integration/emulator: cancel source + create target + terminal source + request Queued.
4. **Idempotency** — double apply same checksum → no duplicate allocations.
5. **Concurrency** — stale checksum blocked.
6. **Release + Needs Re-queue** — marker set; editing transition respects ADR-FP-071.
7. **Clearing** — Add to Show clears marker.
8. **Converted CR** — blocked.
9. **dev_fixture** — source + target on DEV eligibility.
10. **Regression** — existing `mark_fulfilled`, `close_empty`, `force_completed`, Whatnot paths.

---

## Manual DEV QA strategy

Use `DEV-OVERRIDE` fixtures (ADR-FP-155):

1. Missed show with 2+ requests, split qty → Needs Attention → Did Not Print → Move to second upcoming DEV fixture.
2. Verify source Past DID NOT PRINT; target capacity; requests in Queued not Working.
3. Release-only path → Needs Re-queue filter + badge; Add to Show clears.
4. Customer with CR004 active + CR005 draft → release CR004 → stays non-editing, Needs Re-queue visible.
5. Regression: real Whatnot show release unchanged.

---

## Human checkpoints anticipated

- Formal Review approval before implement.
- DEV deploy approval (Functions + rules scope).
- Owner QA PASS before signoff.
- Production explicitly out of scope.

---

## Risks and rollback

| Risk | Mitigation |
|------|------------|
| Transaction size | Preview blocker + documented limit |
| Duplicate allocations on retry | Checksum + idempotency doc |
| Needs Re-queue false positives | Explicit clearing on allocate |
| Rules drift | Emulator tests for new fields |
| Rollback | Redeploy prior Functions; new fields optional/nullable |

---

## Out of scope (this phase)

- Merge released request into customer draft
- New Released tab
- WS4 Customer Activity resume
- Smart Profiling / production deploy
- Broad Show Queue redesign

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | None expected |
| Documentation | `DATA_MODEL.md`, `DECISIONS.md`, `WORKFLOWS.md` |
| Development History | Plan/review/signoff artifacts only |

---

## Open questions for Formal Review only

No product questions — only architecture safety items marked `[NEEDS OWNER DECISION]` if review finds blocking gaps:

- ~~Exact transaction allocation count threshold before job-based apply.~~ **Resolved:** default 150; preview blocker.
- **`requeuedFromAllocationId`:** Recommended for v1 audit (implement unless owner opts out during implement checkpoint).
