# Plan: Portal unqueue capacity cache + Studio cancel-parity remove

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Author | Planning Agent |
| Status | **closed_dev — Signoff approved_with_notes** |
| Workflow | managed-phase (narrow follow-up from Owner DEV QA) |
| Goal | `portal-unqueue-capacity-cache-and-studio-cancel-parity` |
| Parent | `print-request-count-parity-across-show-queue-and-summary-surfaces` (Owner DEV QA FAIL WITH FOLLOW-UPS) |
| Related | Owner DEV QA checklist; `unqueuePortalPrintRequestFromShow`; `unqueueStudioCustomerPrintRequestFromShow`; Portal allocatable-shows read cache |

---

## Goal

After a Print Request is removed from a show, Portal Add-to-Show must immediately reflect true show capacity and per-customer personal-spot usage (no page refresh required), and Studio staff remove-from-show must leave the same canceled / History-only allocation trail as Portal customer remove—without letting canceled rows consume capacity, personal cap, or active Designs/Items counts.

## Background

Owner DEV QA on count parity surfaced two linked defects while exercising remove → re-add on DEV request `roasted_garlic-CR022` (`5BMpSsBsm6Om9DiiWV0y`):

1. **Pre-refresh Portal false exhaustion.** Immediately after customer unqueue, Add to Show showed show capacity `29 of 201` and personal spots `29 of 25 used` with exhausted copy. After full page refresh, those healed to `4 of 201` / `4 of 25 used`. Root cause: `portalAllocatableShowsReadCache` (60s TTL) is never cleared on queue/unqueue, so `listPortalAllocatableShows` can return pre-unqueue `allocatedQuantity` and `customerAllocatedQuantity`. Hook session cache can also keep serving that stale list until TTL expires.

2. **Staff vs customer canceled history mismatch.** Portal `unqueuePortalPrintRequestFromShow` soft-cancels allocations (`status: "canceled"`). Studio `unqueueStudioCustomerPrintRequestFromShow` **hard-deletes** active allocation docs. Show Queue therefore shows a canceled / History only row after customer remove, but the row disappears after staff remove.

### Clarified non-bug (owner expectation vs data)

DEV item rows for CR022 are quantity **19** and **6** (2 designs, **25** prints). With another request already using **4** personal spots on the show, blocking a full 25-print re-add after refresh (`room for only 21 of your 25`) is correct under the per-show customer cap. This follow-up does **not** change that cap math.

### Owner product decisions (recorded)

- Keep canceled allocation records for glance/history (and audit), matching Portal today.
- Canceled rows must not consume show capacity, personal print-spot allotment, or active Designs/Items.
- Customer and staff remove must look and behave the same on Show Queue.

## Scope

### In Scope

- Clear Portal allocatable-shows read cache **and** hook session cache on successful Portal queue and unqueue (service layer + any local apply helpers that complete those mutations).
- Ensure Add-to-Show reload after unqueue cannot treat a just-cleared cache as still-fresh TTL data.
- Change Studio staff customer-request remove callable to **cancel** allocations (with `canceledAt` / `canceledBy` / timestamps) instead of deleting them; recompute show `allocatedQuantity` from non-canceled rows (already shared helper).
- Align Studio Show Queue canceled / History only visibility with Portal-origin cancels (already driven by canceled rows remaining in `group.allocations`).
- Automated tests for cache clear contract and Studio cancel-vs-delete behavior; update durable docs where remove semantics are described.
- Record that parent count-parity Signoff remains blocked until this follow-up is done or explicitly deferred.

### Out of Scope

- Changing per-show customer cap `L` or overflow copy.
- Editing CR022 item quantities or any DEV/production data repair/backfill.
- Hard-deleting historical canceled rows; rewriting audit activity.
- Internal Gang Sheet–only remove paths unless they share the same Studio customer unqueue callable (if a separate delete path exists for internal requests, note and leave unless it is the same function).
- Production Functions deploy (human promotion gate after Signoff).
- Broader count-parity checklist items not failing for this follow-up.

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/print-requests/services/portalAllocatableShowsReadCache.ts`
- `apps/portal/features/print-requests/hooks/usePortalAllocatableShows.ts`
- `apps/portal/features/print-requests/services/portalShowSelectionService.ts`
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` (if unqueue success path must clear/reload explicitly)
- `apps/portal/features/print-requests/hooks/useUnqueuePrintRequestFromShow.ts` / queue hook (if clearer at mutation boundary)
- `functions/src/unqueueStudioCustomerPrintRequestFromShow.ts`
- Shared tests under `apps/portal/features/print-requests/**` and Functions/shared Studio unqueue contracts
- `docs/architecture/DATA_MODEL.md` and/or `docs/WORKFLOWS.md` if remove semantics currently say Studio deletes
- Workflow artifacts for this goal

### Architecture Impact

- [x] Details: Keep Portal UI → service → callable layering. Cache invalidation belongs in the Portal show-selection service (or shared cache module) at successful mutation boundaries, not in presentational components alone. Studio remove remains staff-only callable; only persistence of cancel vs delete changes.

### Security Impact

- [x] Details: No permission model change. Studio callable stays staff-gated. Cancel writes must set actor `canceledBy`/`updatedBy` to staff caller id (parallel to Portal customer id). No new public endpoints.

### Data Model Impact

- [x] Details: No new fields. Studio remove aligns with existing `showAllocations.status = "canceled"` + audit timestamps already used by Portal. Historical rows retained; active counters continue to exclude `canceled`.

### Backend Impact

- [x] Details: `unqueueStudioCustomerPrintRequestFromShow` transaction updates (cancel) instead of `transaction.delete`. Show `allocatedQuantity` recompute unchanged in intent. Portal callable unchanged. **Functions deploy required later** for Studio fix to reach shared environments.

### UI / UX Impact

- [x] Details: Portal Add-to-Show personal-spot and show capacity bars update correctly after remove without refresh. Studio Show Queue keeps canceled / History only row after staff remove, matching customer remove. Manual Owner DEV QA required.

### Migration Impact

- [x] None for schema.
- [x] Forward steps: None. Already-deleted Studio removals cannot be reconstructed; future removals cancel. No backfill.
- [x] Rollback / compatibility: Revert Studio callable to delete if needed; Portal cache clear is additive and safe to keep.

---

## Approach

1. **Portal cache invalidation**
   - Extend clear API so one call resets `portalAllocatableShowsReadCache` and the `usePortalAllocatableShows` module session cache (`sessionCachedShows`, timestamps).
   - Invoke clear on successful `queuePrintRequestToShow` and `unqueuePrintRequestFromShow` in `portalShowSelectionService` (covers detail page, heal path, and any other callers).
   - Confirm modal open still performs a real reload after clear (not TTL short-circuit to empty stale state).
   - Add unit/contract tests: after clear, next `listAllocatableShows` must call the loader; unqueue/queue success paths must call clear.

2. **Studio cancel parity**
   - In `unqueueStudioCustomerPrintRequestFromShow`, for each non-canceled allocation on the show: `transaction.update` to `canceled` with timestamps/actor instead of `transaction.delete`.
   - Keep global “any active allocation left?” and show quantity recompute logic, treating this-tx canceled ids like Portal’s `canceledThisTx` set.
   - Response field `canceledAllocationIds` already named correctly; keep meaning as ids canceled this call.
   - Add/adjust tests proving allocations remain as `canceled` and show quantity excludes them.

3. **Docs**
   - Note Portal vs Studio remove parity: both cancel; both retain history; active counts exclude canceled.
   - Update parent Owner DEV QA checklist / state to point at this follow-up.

4. **Validation**
   - Automated focused tests + typecheck for touched packages.
   - Owner DEV QA: Portal remove → immediate Add to Show on same show shows healed personal/show usage; Studio staff remove leaves canceled History only row; re-add still respects personal cap using active-only qty.

---

## Test Strategy

### Automated

| Check | Command | Required |
|---|---|---|
| Portal cache clear / service contract tests | `node --test` on touched Portal cache/service tests (or package script used by repo) | Yes |
| Studio unqueue cancel behavior tests | Focused Functions/shared test for cancel-not-delete | Yes |
| Typecheck touched apps/packages | Existing Portal/Studio/Functions typecheck scripts as applicable | Yes |
| Lint changed files | ESLint on changed paths | Yes |

### Manual

| Check | Who | Required |
|---|---|---|
| Portal: remove CR022 (or fixture) → open Add to Show without refresh → personal spots and show bar exclude released qty | Owner | Yes |
| Portal: after refresh, same numbers; full 25 still blocked when 4 spots already used | Owner | Yes |
| Studio: staff remove customer PR → Show Queue shows canceled / History only; counters not inflated | Owner | Yes |
| Studio: re-add after staff remove does not double-count canceled toward cap | Owner | Yes |

---

## Risks and Rollback

| Risk | Mitigation |
|---|---|
| Clearing cache causes extra `listPortalAllocatableShows` reads | Acceptable; mutation-frequency bounded; matches correctness priority |
| Studio cancel increases allocation doc volume vs delete | Same as Portal; already accepted for customer remove; active queries filter canceled |
| Functions not deployed → Studio still deletes in shared DEV if old build | Document deploy dependency; local emulator/dev functions must run updated code for QA |
| Parent count-parity Signoff confusion | Keep parent Signoff blocked; close or re-QA parent after this follow-up |

Rollback: revert Studio callable and/or Portal clear calls; no data migration.

---

## Human Checkpoints

- Owner already authorized product direction: keep canceled; same behavior for staff/customer; canceled must not affect counts.
- Owner DEV QA after implement/test (UI remove/re-add).
- Production Functions deploy remains separately unauthorized.

---

## Open Questions

None blocking. Optional later: UX hint on Add-to-Show when design count is low but print qty is high (e.g. “2 designs · 25 prints”)—out of scope unless owner requests.

---

## FreshForge Impact Classification

| Area | Impact |
|---|---|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Yes — workflow artifacts + durable remove/cancel semantics if currently wrong |
| Development History | No |

---

## Acceptance Criteria

- [ ] Successful Portal queue/unqueue clears allocatable-shows caches so the next Add-to-Show load cannot return pre-mutation capacity/personal usage within the old TTL.
- [ ] Portal remove → immediate Add to Show shows personal/show usage consistent with non-canceled allocations only.
- [ ] Studio staff remove cancels (does not delete) customer show allocations and Show Queue shows canceled / History only like Portal.
- [ ] Canceled rows do not increase show `allocatedQuantity`, personal cap usage, or active Designs/Items.
- [ ] Automated tests cover cache clear and Studio cancel behavior; Owner DEV QA recorded.
- [ ] No production deploy performed in this goal.
