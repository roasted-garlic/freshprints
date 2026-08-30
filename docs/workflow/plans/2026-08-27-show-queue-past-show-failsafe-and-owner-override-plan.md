# Plan: Show Queue Past-Show Failsafe, Needs Attention, and Owner Override

| Field | Value |
|-------|-------|
| Date | 2026-08-27 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `show-queue-past-show-failsafe-and-owner-override` |
| Phase alignment | Phase 7 — Show Queue / production workflow corrective |
| Related | ADR-FP-139, ADR-FP-071, ADR-FP-143 |

---

## Goal

Add a resilient Show Queue failsafe when Whatnot shows pass into **Past** without truthful production completion: surface unresolved shows in a **Needs Attention** workflow, resolve empty shows without fabricating print work, release or complete shows with attached Print Requests via trusted reconciliation, and provide an **owner-only** audited override for exceptional recovery—without treating calendar Past as automatic Printed/Completed.

---

## Background

### Root cause (repo-confirmed)

1. **Schedule vs production are decoupled.** `getShowScheduleTab` (`packages/shared/src/utils/showScheduleGrouping.ts`) classifies Upcoming/Past from `scheduledStartAt` only. It never mutates `productionStatus`.

2. **ADR-FP-139 fixes only one defect class:** Past + `productionStatus === "printing"` auto/manual finish via `markShowPrintingFinished`. It explicitly does **not** address Past + `open`/`full` with queued allocations.

3. **Past + open/full + allocations is currently unrecoverable via Finish.** `resolveShowFinishMutationPlan` rejects non-`printing` shows. Firestore rules allow Whatnot `open|full → printing` and `printing → completed`, but **not** Whatnot `open|full → completed` (staff gang sheet only). Past shows cannot Start (`canStartShowPrinting` blocks). Staff cannot Mark Complete.

4. **Print Requests can remain Queued in UI** when allocations exist on a Past show that never finished (`derivePrintRequestListTab` → `queued` when `totalAllocatedQuantity > 0`).

5. **Empty Past shows** have owner **hard delete** (`deleteEligibleUpcomingShow`) but no truthful “close without delete” path. They linger in Past as `open` with zero allocations.

**Product principle:** Past ≠ completed ≠ printed. Unresolved Past must become **visible and recoverable**, not silently terminal.

---

## Scope

### In scope

- New **Needs Attention** tab (Whatnot Show Queue surface only; Staff Gang Sheets unchanged).
- Shared predicates + reason labels for unresolved Past shows.
- **Case A — Nothing to print:** close empty Past show without touching requests/allocations.
- **Case B — Past with PRs:** staff remediation actions (fulfilled vs not fulfilled) with allocation + request reconciliation.
- Multi-show allocation safety; ADR-FP-071 one-working-request edge case.
- Owner-only **preview + apply** override for exceptional recovery (semantic actions, not raw enum picker).
- Read-only **stuck-data preview** using the same remediation primitives (no separate migration).
- Tests, docs, ADR (ADR-FP-149 + ADR-FP-139 cross-reference).
- Functions callables + Firestore rules updates as required for trusted mutations.

### Out of scope

- Portal changes.
- Automatic mark-Printed without fulfillment evidence.
- New `productionStatus` enum value (reuse `completed` + optional audit metadata).
- Staff Gang Sheet Current/History lifecycle changes.
- Production deploy / Studio publish.
- Tag retirement, Smart Catalog, gang-sheet layout modes.
- Scheduled Cloud Function auto-repair (align with ADR-FP-139: recovery on Show Queue load + explicit staff actions).

---

## Current state machines (repo truth)

### Show `productionStatus` (`ShowProductionStatus`)

`open` | `full` | `printing` | `fully_printed` | `completed` | `archived` | `canceled`

- UI **FULL** badge is derived (`showCapacityDisplay.ts`); not persisted today.
- Client timer writes: `upcomingShowService.startShowPrinting` / `pause` / `resume` / `markShowPrintingFinished`.
- Rules transitions (`firestore.rules`): `open|full→printing`, `printing→completed`, staff_gang_sheet `open|full→completed`.
- `archived` / `canceled` on productionStatus: enum + rules validation; **no Studio write paths** found.

### Show schedule tab (display only)

`upcoming` if no schedule or `scheduledStartAt > now`; else `past`.

### `showAllocations.status`

`pending` | `queued` | `in_progress` | `printed` | `done` | `canceled`

- Finishable: `pending`, `queued`, `in_progress` (`showFinishAllocationStatuses.ts`).
- Printed-or-done: `printed`, `done` (`isPrintedAllocationStatus`).
- Removal: `removeShowAllocation` (delete doc). Cancellation: `updateShowAllocationStatus(..., "canceled")` (service exists; no Studio UI).

### Print Request lifecycle

- Persisted `status`: `draft` | `active` | `editing` | `completed` | `archived`.
- **List tab derivation** (`derivePrintRequestListTab`): allocation-quantity truth → `working` | `queued` | `printing` | `printed`.
- **Completion eligibility** (`evaluatePrintRequestCompletionEligibility`): all non-canceled items fully printed/done across **all shows**.
- **Queue tab persistence:** Functions `recomputeAndPersistQueueTab` on allocation/item writes; Studio `syncPrintRequestQueueTabBestEffort` after allocate/remove.
- **Post-finish reconciliation:** `markShowPrintingFinished` → `reconcileCompletedPrintRequest` per affected request.

### ADR-FP-071 continuable requests

Portal continuable = `status in [draft, editing]` only (`portalWorkingPrintRequest.ts`). `active` is **not** continuable. Studio `markPrintRequestEditingIfNoActiveAllocations` moves `active → editing` when zero non-canceled allocations globally—**can create two continuable requests** if customer already has another `draft|editing` request.

---

## Needs Attention predicate (proposed)

**Surface:** `source === "whatnot"` only.

**Unresolved Past show** when ALL of:

1. `isPastScheduledShow(show, now)` is true.
2. `productionStatus` is **not** a terminal production state for Whatnot history display.

**Terminal production statuses (normal Past tab):**

- `completed`
- `fully_printed` (treat as terminal for filtering; rare/legacy)
- `archived`
- `canceled`

**Non-terminal (Needs Attention candidates):**

- `open`, `full` (derived full badge only—persisted `open`)
- `printing` (including stale Past printing per ADR-FP-139 until reconciled)

**Explicit exclusions:**

- Staff Gang Sheets (`source === "staff_gang_sheet"`) — keep Current/History model.
- Upcoming shows (by schedule).

### Reason labels (derived, not persisted)

| Reason code | Predicate (simplified) |
|-------------|-------------------------|
| `stale_printing` | `productionStatus === printing` && past |
| `queued_work_attached` | past && non-terminal && finishable allocation count > 0 |
| `no_production_completion` | past && `open|full` && never started (`!printStartedAt`) |
| `empty_show` | past && non-terminal && active allocation count === 0 |
| `inconsistent_state` | owner override preview flags impossible combos |

### Tab interaction

| Tab | Shows included |
|-----|----------------|
| **Upcoming** | `getShowScheduleTab === upcoming` (unchanged) |
| **Needs Attention** | unresolved Past Whatnot shows (predicate above) |
| **Past** | Past Whatnot shows with **terminal** `productionStatus` |

A show appears in **exactly one** of Needs Attention vs Past (mutually exclusive). Upcoming unchanged.

**Stale printing UX:** Continue ADR-FP-139 auto-finish on load (`useStalePastPrintingShowReconciliation`). While `printing` + past, show may briefly appear in Needs Attention until reconciliation completes (or hide row while in-flight reconcile flag is set).

---

## Case A — Past show with nothing to print

### Detection

Past + non-terminal production + **zero non-canceled allocations** on the show (`allocatedQuantity === 0` reconciled).

### Resolution: **Close Empty Show** (one-click; safe for optional auto-offer)

**Behavior:**

- Set show `productionStatus: completed` via **trusted callable** (Admin SDK—not client rules).
- Set audit fields: `printFinishedAt`, `printFinishedBy`, `updatedBy`, optional `productionResolutionKind: "empty_closure"`.
- Do **not** set timer fields as if printing occurred (`printStartedAt` remains unset unless already set).
- **No** allocation writes. **No** print request writes.
- Remove from Needs Attention → appears in normal Past.

**Do not** use `deleteEligibleUpcomingShow` for this product path (hard delete remains owner-only separate action).

**Idempotency:** Second apply → `already_terminal` if already `completed`.

**Automatic vs manual:** Predicate is provably harmless (zero allocations). **Recommendation:** one-click staff action required on first implementation; optional future auto-close banner only after DEV QA—**not** silent auto-close in v1 without owner approval (Formal Review may confirm).

---

## Case B — Past show with Print Requests

### Needs Attention row data

Display (from existing list + allocation queries):

- Show title / scheduled date
- `productionStatus`, derived FULL badge
- Print Request count (distinct `printRequestId` on show allocations)
- Finishable allocation quantity sum
- `printStartedAt` present / absent
- Other-show allocation indicator per request (query `listShowAllocationsForPrintRequest`—count allocations on other non-past or upcoming shows)

### Resolution A — **Mark as Fulfilled** (staff confirms show was printed)

**When:** Staff confirms physical fulfillment despite missed Finish.

**Path:**

1. Callable `resolvePastShowAsFulfilled` (staff: `canManageUpcomingShows`).
2. Validate: past, non-terminal, has finishable allocations.
3. Admin transaction:
   - If `printing`: reuse finish semantics (`markShowPrintingFinished` logic)—allocations → `done`, show → `completed`.
   - If `open|full`: **cannot** use client Finish today—callable sets `completed` and allocations → `done` in one Admin transaction (bypass client rules).
4. Run existing post-finish request reconciliation (`reconcileCompletedPrintRequest` / `evaluatePrintRequestCompletionEligibility`) for affected requests **across all shows**.
5. Set `productionResolutionKind: "fulfilled_confirmed"` (optional audit field).

**Never** mark Printed without done/printed allocation evidence or this explicit fulfilled path.

### Resolution B — **Did Not Print / Release Requests**

**When:** Show passed; queued work was not fulfilled.

**Path:**

1. Callable `releasePastShowUnfulfilled` (staff: `canManageUpcomingShows`).
2. For each non-canceled allocation **on this show only**:
   - Prefer `status: canceled` with `canceledAt`/`canceledBy` (preserves history) over hard delete.
3. `recalculateShowAllocatedQuantity` for show.
4. Show → `completed` with `productionResolutionKind: "unfulfilled_release"` (terminal Past; not Printed).
5. Per affected `printRequestId`:
   - `syncPrintRequestQueueTab` (Functions or inline recompute).
   - **Request status policy (ADR-FP-071 safe):**
     - If request has **other active allocations** on other shows → leave `status` unchanged (`active`); tab derivation updates from allocations.
     - If **no** non-canceled allocations remain:
       - If customer has **another** `draft|editing` request → leave `active` (do **not** call `markPrintRequestEditingIfNoActiveAllocations`); UI tab becomes **Working** via derivation.
       - Else if Portal customer → `active → editing` (staff can revise) OR `archive` with closure metadata if product prefers closed state—**default: `editing` for staff recovery** when sole continuable slot is available.
       - Internal requests: same allocation-truth derivation; optional `editing` for staff.

**Idempotency:** Re-apply cancels only still-active allocations on show; show already `completed` → no-op.

---

## One-working-request edge case (mandatory)

**Scenario:** CR001 queued on Past Show A; customer has CR002 as `draft|editing`.

**Rule:** Release path must **not** call `markPrintRequestEditingIfNoActiveAllocations` blindly.

**Implementation:**

- Before `active → editing`, query continuable count for `customerId` (`draft|editing` excluding this request).
- If count > 0: keep `active`; rely on `derivePrintRequestListTab` → **Working** (zero allocations).
- Portal create/attach remains valid (single continuable = CR002).

**If CR001 is the only request:** `active → editing` restores staff editability without violating ADR-FP-071.

---

## Multi-show requests

Reconciliation always uses **global** allocations for the request:

- Release on Show A only cancels allocations where `upcomingShowId === A`.
- Show B allocations untouched.
- `derivePrintRequestListTab` / `evaluatePrintRequestCompletionEligibility` recompute from all allocations.
- Transfer rules unchanged (`transferPrintRequestBetweenShows`).

---

## Owner override design

### Permission

- **Owner only** (`permissionService.isOwner` / callable `caller.role === owner`).
- Helpers/admins: normal remediation actions only, **not** override.

### UX (Studio)

- Entry: Needs Attention row overflow + Settings/Dev danger zone link (owner only).
- **Preview first** (mirror `previewUpcomingShowDeletion` / `deleteEligibleUpcomingShow` pattern):
  - Current production fields, allocation summary, affected requests, proposed semantic action, downstream impact bullets, confirmation phrase optional for destructive targets.

### Semantic actions (not raw enum dropdown)

| Action | Maps to |
|--------|---------|
| Reopen Show | `completed → open` only when **zero** finishable allocations and staff confirms mistake—rare; rules + callable |
| Mark Production Started | `open|full → printing` + optional allocation `in_progress`—dangerous on Past; owner-only with strong warning |
| Mark Completed (force) | Same as Mark as Fulfilled path with owner audit |
| Release / Did Not Print | Same as release path |
| Close Empty Show | Case A path |
| Mark Canceled (show) | `productionStatus: canceled` + cancel allocations—only if rules/callable define safe semantics |

**Forbidden:** Raw “pick any enum → write” without reconciliation plan.

### Audit metadata (new optional fields on `upcomingShows`)

Proposed (implement phase—no new status enum):

- `productionResolutionKind?: "empty_closure" | "fulfilled_confirmed" | "unfulfilled_release" | "owner_override"`
- `productionResolvedAt?: Timestamp`
- `productionResolvedBy?: string`
- `productionOverrideReason?: string` (owner-supplied, max length)

Document in `DATA_MODEL.md`. Backward compatible (optional).

### Backend

- New callable namespace: `previewShowProductionRecovery` + `applyShowProductionRecovery` (or split per action).
- **Admin SDK** transactions; validate transitions in callable code (fail closed).
- Client Studio calls callables; **do not** widen client Firestore rules for arbitrary transitions except where existing staff paths suffice.

---

## Automatic vs manual failsafe

| Behavior | Mode |
|----------|------|
| Classify unresolved Past → Needs Attention | **Automatic** on list load (pure filter) |
| Hide from normal Past while unresolved | **Automatic** (tab split) |
| ADR-FP-139 stale `printing` finish | **Automatic** on load (existing) |
| Close empty show | **Manual** one-click v1 (owner may approve auto later) |
| Fulfilled / Did not print | **Manual** with confirmation |
| Owner override | **Manual** owner-only |

---

## Existing stuck-data remediation

**No separate migration.**

1. **Detection:** Same Needs Attention predicate on existing data.
2. **Preview:** Remediation dialog calls `previewShowProductionRecovery` with action + showId → returns allocation/request counts, idempotent status.
3. **Apply:** Same callables as forward path.
4. **Human checkpoint:** Owner approval before bulk APPLY in shared DEV (signoff/manual test)—not automated batch across all shows in v1.
5. **Idempotency:** Terminal shows skipped; canceled allocations skipped.

---

## Affected files (repo-identified)

### Shared

- `packages/shared/src/utils/showScheduleGrouping.ts` — extend with `isUnresolvedPastWhatnotShow`, reason helpers
- `packages/shared/src/utils/showProductionRecovery.ts` — **new** predicates, action types, preview DTOs
- `packages/shared/src/types/upcomingShow/upcomingShow.types.ts` — optional audit fields
- `packages/shared/src/types/showProductionRecovery/` — **new** callable request/response types
- `packages/shared/src/utils/printRequestListGrouping.ts` — tests for release edge cases
- `packages/shared/src/utils/printRequestCompletionEligibility.ts` — tests

### Studio renderer

- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` — third tab, counts
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/groupShowsByUpcomingPast.ts` — partition helpers
- `apps/studio/src/renderer/src/features/upcoming-shows/components/NeedsAttentionShowList.tsx` — **new**
- `apps/studio/src/renderer/src/features/upcoming-shows/components/ShowProductionRecoveryDialog.tsx` — **new**
- `apps/studio/src/renderer/src/features/upcoming-shows/components/OwnerShowProductionOverrideDialog.tsx` — **new**
- `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts` — callable wrappers; guard `markPrintRequestEditingIfNoActiveAllocations`
- `apps/studio/src/renderer/src/features/upcoming-shows/services/showProductionRecoveryService.ts` — **new**
- `apps/studio/src/renderer/src/features/permissions/services/permissionService.ts` — `canOwnerOverrideShowProduction`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useStalePastPrintingShowReconciliation.ts` — coordinate with Needs Attention loading state

### Functions

- `functions/src/previewShowProductionRecovery.ts` — **new**
- `functions/src/applyShowProductionRecovery.ts` — **new** (or action-specific)
- `functions/src/lib/showProductionRecovery.ts` — **new** shared Admin logic
- `functions/src/index.ts` — export callables

### Rules / indexes

- `firestore.rules` — if any client paths remain, document; prefer callable-only mutations for remediation
- `firestore.indexes.json` — **likely no change** (client-side filter on loaded shows; allocation queries use existing `upcomingShowId` / `printRequestId` indexes)

### Tests

- Shared predicate tests: `showProductionRecovery.test.ts`
- Studio: `showProductionRecovery.contract.test.ts`, extend `showScheduleGrouping.test.ts`
- Functions: `showProductionRecovery.contract.test.ts`
- Integration: multi-show + ADR-FP-071 scenarios

### Docs

- `docs/project/DECISIONS.md` — ADR-FP-149; ADR-FP-139 amendment note
- `docs/architecture/DATA_MODEL.md` — audit fields, Needs Attention predicate
- `docs/architecture/BACKEND.md` — callables
- `docs/standards/SECURITY.md` — owner override authority

---

## Backend / Functions involvement

**Required.** Client Firestore rules cannot authorize Whatnot `open|full → completed` or safe bulk allocation cancel + show terminal transitions for Past remediation. Implement trusted **Admin callable** layer reusing:

- `markShowPrintingFinished` transaction patterns from `upcomingShowService` (ported to Functions or shared pure planners invoked by both)
- `reconcileCompletedPrintRequest` / `evaluatePrintRequestCompletionEligibility`
- `computePrintRequestQueueTab` + `recomputeAndPersistQueueTab`

**No deploy during Plan phase.**

---

## Approach (implementation sequence)

1. Shared predicates + DTOs + tests (no UI).
2. Functions preview/apply with Admin transactions + contract tests.
3. Studio Needs Attention tab (read-only list + reasons).
4. Staff remediation dialogs (fulfilled / release / close empty).
5. Owner override dialog + permission gates.
6. Harden `markPrintRequestEditingIfNoActiveAllocations` ADR-FP-071 guard.
7. Docs + ADR-FP-149.
8. Manual DEV QA on stuck fixtures.

---

## Test strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit tests | `npx tsx --test packages/shared/src/utils/showProductionRecovery*.test.ts packages/shared/src/utils/showScheduleGrouping.test.ts` | yes |
| Functions contract tests | `npm run test --workspace=functions` (targeted files) | yes |
| Studio unit/contract | targeted `tsx --test` under `upcoming-shows` | yes |
| Typecheck Studio | `cd apps/studio && npx tsc --noEmit` | yes |
| Rules tests | `npm run test:rules` if show rules change | if rules touched |

### Manual matrix (owner DEV QA)

1. Past show, zero allocations → Close Empty Show; no PR mutation.
2. Past show, one queued customer PR, never started → Needs Attention → Release → not trapped Queued.
3. Past show, queued PR, staff confirms fulfilled → Printed correctly via completion path.
4. Past show already Printing → ADR-FP-139 unchanged.
5. Past show properly Completed → normal Past only.
6. Past canceled/archived → terminal; not Needs Attention.
7. Multi-show request → release on stale show leaves other show allocation.
8. Customer with another Working Request → one-working preserved.
9. Internal print request paths.
10. Partial quantities.
11. Empty close idempotency.
12. Release idempotency.
13. Owner override happy path.
14. Helper denied override.
15. Impossible transition rejected.
16. Audit fields persisted.
17. Needs Attention → resolved → Past transition.
18. Pre-existing stuck historical show via same UI.

---

## Human checkpoints anticipated

- [x] Manual UI/UX review (Needs Attention tab + dialogs)
- [ ] Production deploy (explicitly out of scope)
- [ ] Database migration (optional audit fields only—backward compatible)
- [x] Owner approval before APPLY on legacy stuck shows in shared DEV (bulk)
- [x] Owner override UX review

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| False Printed via override | High | Fulfilled path requires done allocations or explicit owner force with audit |
| ADR-FP-071 dual continuable | High | Guard before `active→editing`; derive Working tab |
| Multi-show corruption | High | Scope allocation mutations to `upcomingShowId` |
| Client rules drift | Medium | Callable-first remediation; minimal rules widen |
| Auto-finish races Needs Attention UI | Low | In-flight reconcile flag; idempotent finish |

---

## Rollback

- Studio: hide Needs Attention tab via feature flag constant if needed.
- Functions: callables unused if Studio not deployed.
- Audit fields optional—old clients ignore.
- No destructive schema migration.

---

## ADR changes

- **Add ADR-FP-149:** Past-show Needs Attention, remediation actions, owner override, Past ≠ Completed.
- **Amend ADR-FP-139:** Cross-reference Needs Attention for stale printing; note `open|full` Past gap closed by FP-149.

---

## Open questions / owner decisions (Formal Review)

1. **Empty show v1:** One-click only vs auto-close banner for provably empty shows?
2. **Release path request status:** Prefer `editing` vs `archived` with closure kind when sole request and no other continuable?
3. **Owner override actions:** Confirm minimum action set for v1 (recommend: Close Empty, Release, Mark Fulfilled, Force Completed—defer Reopen/Mark Started unless needed in DEV QA).

---

## FreshForge impact

| Area | Impact |
|------|--------|
| Starter Surface | None |
| Documentation | Yes (`DECISIONS`, `DATA_MODEL`, `BACKEND`, `SECURITY`) |
| Production | Not authorized in this goal |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-27-show-queue-past-show-failsafe-and-owner-override-review.md`
- Verdict: pending
