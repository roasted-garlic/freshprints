# Review: Studio Editing → Re-add Show Queue permissions / partial-queue corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-09 |
| Reviewer | FreshForge Review |
| Plan | `docs/workflow/plans/2026-09-09-studio-editing-readd-show-queue-permissions-corrective-plan.md` |
| Parent goal | `user-info-print-request-lifecycle-activity-ordering` |
| Owner evidence | DEV re-QA FAIL — permission toast, stale Add to Show, `EDITING` + `PARTIALLY QUEUED`, Portal still editable |
| Verdict | **approved_with_changes** |
| Implementation authorized | **NO** — stop for owner `IMPLEMENT` authorization after acknowledging required changes |

---

## Summary

The corrective plan correctly explains the owner FAIL: Studio’s per-item client
`allocatePrintRequestItem` can commit a `showAllocations` row and then fail the Rules-gated
`printRequests` `editing → active` update, leaving partial queue + stuck Editing + Portal Continuable
edit mode. Portal’s `queuePortalPrintRequestToShow` Admin SDK path is not the same failure mode;
Portal “still editing” is downstream of Studio’s stuck status.

The prior lifecycle-mirror Rules allowlist deploy was necessary but insufficient as a product fix
because the Studio sequence is non-atomic and the UI does not reconcile allocation totals on error.

**Verdict: approved_with_changes.** Implement must hard-pick **Approach A** (trusted staff callable)
as the primary fix for Add to Show / re-add of an entire request, with Phase 0 Rules fixtures first.
Approach B is allowed only as a short interim if the callable cannot ship in the same corrective,
and must still include UI reconcile + stuck-row repair.

---

## Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Scope clear and bounded | **pass_with_changes** — keep out of full batch-performance deferred plan; limit callable to allocate remaining + activate |
| 2 | Diagnosis matches screenshots / code | **pass** |
| 3 | Architecture alignment | **pass_with_changes** — staff full-request queue should match Portal trusted-write pattern |
| 4 | Security | **pass_with_changes** — callable must re-check staff manage-upcoming-shows (+ staff gang sheet rules if applicable); do not relax customer Rules; lifecycle mirror remains client-immutable |
| 5 | Data model / migration | **pass** — repair is status/parking only; non-destructive |
| 6 | Backend impact documented | **pass** |
| 7 | UI reconcile required | **pass** — mandatory even under Approach A |
| 8 | Portal parity | **pass** — verify; change Portal only if Continuable bug is independent |
| 9 | Test strategy | **pass_with_changes** — Phase 0 Rules fixtures before implement coding; include multi-item re-add regression |
| 10 | Human checkpoints | **pass** — implement auth, DEV deploy allowlist, owner re-QA; no production |
| 11 | No silent scope expansion | **pass_with_changes** — do not absorb deferred batch-allocation performance work |
| 12 | Lifecycle backfill / indexed reader | **pass** — remains out of scope |

---

## Required changes (implement must follow)

1. **Hard-pick Approach A** as the durable Studio Add to Show / Editing re-add path for full-request
   (or remaining-quantity) queueing. Do not leave N sequential client allocates + client status
   activation as the long-term primary for this flow.
2. **Run Phase 0 Rules fixtures first** (post-unqueue shape + Studio-shaped activation payload). Fix
   any remaining Rules gap narrowly before or alongside the callable.
3. **UI reconcile is mandatory**: on allocate/callable failure or success, reload selected request +
   allocation totals so Add to Show / badges / Remove-from-queue match server truth without a full
   page refresh.
4. **Stuck-row repair**: support repairing `status: "editing"` with non-canceled allocations →
   `active` (and clear editing parking fields when leaving Editing), for DEV QA rows such as the
   reported partial re-add.
5. **Approach B** only as an explicit interim if Approach A cannot complete in this corrective;
   interim must still ship status-only activation deferral + reconcile + repair, and file a follow-up
   for Approach A.
6. **Portal**: no drive-by Portal queue rewrite; verify Continuable exit after Studio re-queue and
   spot-check Portal unqueue→requeue.
7. **Deploy / commit / production**: still gated; no backfill or indexed-reader activation in this
   corrective.

---

## Security notes

- New callable: authenticate staff, authorize upcoming-show (and staff-gang-sheet) management,
  validate show open/capacity/past gates, reject archived/converted requests, write via Admin SDK.
- Do not grant clients permission to mutate lifecycle mirror fields.
- Do not broaden customer `printRequests` update Rules to “fix” Studio.

---

## Implementation authorization gate

Owner must explicitly authorize implementation (and later the exact DEV deploy allowlist). Until
then: no code changes beyond review/docs/state.

## Next step

Owner: authorize implement of this corrective (Approach A primary), or reply with Approach B interim
preference. Then Implement → Test → Implementation Review → STOP before DEV deploy.
