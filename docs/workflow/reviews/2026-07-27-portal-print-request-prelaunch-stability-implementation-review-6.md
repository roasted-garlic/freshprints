# Portal Print Request Pre-Launch Stability — Implementation Review 6

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent context, sixth Implementation Review session on this goal)
- **Scope:** Plan Section 23 (Amendment 5). Deliberately scoped to a DIFFERENT angle than the
  Amendment 5 Formal Review (which already performed a thorough line-by-line trace and returned
  `approved_with_changes` with two minor doc/test-exactness fixes, both already applied) — this
  review's distinct focus is full-goal-history regression safety and cross-cutting risk.

---

## 1. Verdict

**`APPROVED`**

---

## 2. Spot-checks of the Formal Review's claims (independently re-verified, not rubber-stamped)

1. Confirmed both uniqueness throws are genuinely removed from
   `functions/src/queuePortalPrintRequestToShow.ts` and that `existingOnShowQty`/
   `freshCustomerOnShowQty` exist only as inputs to the unchanged cap math — no throw gate remains.
2. Confirmed the `printPausedAt: deleteField()` test-fidelity fix is present in
   `tests/firebase/studioProductionTimer.rules.test.ts:94`.
3. Re-ran the full regression list (13 files spanning all 5 amendments) — **101 tests, 101 pass, 0
   fail, 0 cancelled**, a superset consistent with the Formal Review's narrower 24-test claim.

---

## 3. Distinct regression-safety findings

**No implicit one-request-per-show invariant found anywhere outside the two removed throw blocks.**
`usePrintRequestDetail.ts` has no per-show uniqueness logic at all.
`groupAllocationsByRequest.ts` groups purely by `printRequestId`, unaffected by ADR-FP-122 by
construction. `listPortalAllocatableShows.ts`'s `customerQtyByShowId` already correctly aggregates
across however many separate requests contribute (keyed by show id, not request id) — no change
needed, none made. Repo-wide search for `customerAllocatedQuantity`/`sumCustomerQuantityOnShow` found
zero hits in Studio — confirming Studio never consumed or displayed the now-removed assumption.
Studio's staff "+Add Print Request" picker filters by `printRequestId`, not per-customer, so a
customer's second separate request remains correctly selectable there too.

**No second instance of the "stale value from Show A leaks into Show B" defect class found in
`PortalQueueToShowModal.tsx`'s other per-show state.** `pendingAllocatedByShowId`/
`allocatedBaselineByShowId` are `Map<showId, number>`, consumed per-option via `.get(show.id)` — even
a lingering stale entry could only affect its own show's rendering, never bleed into a different
show. `isCelebratingSave` has no per-show dimension at all. Neither is in the same defect class as the
fixed error string; no analogous leak exists.

---

## 4. Regression suite

**101 tests, 101 pass, 0 fail, 0 cancelled, 0 skipped** across the full 13-file surface spanning all
5 amendments on this goal.

---

## 5. Scope-boundary confirmation

- No Functions/Rules/deployment action occurred; the two new diagnostic scripts are read-only and
  fail cleanly without credentials by design.
- Unrelated `firestore.rules`/`firebase.json`/`storage.rules`/`.env.example` diffs present in the
  working tree belong to separate, already-in-flight goals — none attributable to Amendment 5.
- The 25-print limit, its computation, the one-working-request-at-a-time rule, and the 200-DPI floor
  are all unchanged — only the customer-uniqueness gate was removed.

---

## 6. Blocking findings

None.

## 7. Non-blocking findings

None beyond what the Formal Review already resolved.

This review corroborates the Amendment 5 Formal Review from an independent, full-history regression
angle: the change is complete, correctly scoped to the owner's exact decision, and does not regress
any earlier amendment in this goal.
