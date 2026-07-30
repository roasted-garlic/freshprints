# Portal Print Request Pre-Launch Stability — Amendment 12 Formal Review

- **Goal:** `portal-print-request-prelaunch-stability`
- **Scope reviewed:** Plan Section 30 / Amendment 12 (proposed, pre-implementation)
- **Reviewer:** independent Formal Review agent (no prior conversation context; verified against
  current repository source directly)

## Verdict: APPROVED WITH CHANGES → corrected design approved to proceed

### Workstream A/B (Studio Retry button) — approved as specified

Independently confirmed against current source, not the plan's narrative:

- `useShowProductionTimer.ts:214` — the silent early-return on `failedReconciliationRequestIds.length
  === 0` is real and produces zero observable effect (no state write, no log, no network call).
  Confirmed root cause of the "inert button" symptom.
- `useShowProductionTimer.ts:69-77` — the `useEffect` keyed on `[show?.id]` unconditionally blanks all
  retry/warning state with no Firestore reconstruction anywhere else in the hook. Confirmed root cause
  of "warning disappears on navigate-away-and-back."
- `upcomingShowService.listShowAllocations` (line 829) confirmed genuinely bounded — a single
  `where("upcomingShowId", "==", upcomingShowId)` query, not an unbounded scan. Safe as the
  reconstruction data source.
- `ShowProductionRetrySession`/`resolveShowReconciliationRetryOutcome` confirmed to behave exactly as
  described; routing reconstruction settlement through `isStillAuthoritative` does not weaken the
  existing generation guard.

**Required addition (incorporated into 30.5):** an explicit test proving a bounded reconstruction
read in flight concurrently with a user-initiated retry (and the reverse ordering) does not
double-write or produce a lost update. Both write paths are believed idempotent, but this must be
proven, not assumed.

### Workstream E (Portal historical capacity banner) — first draft rejected, corrected design approved

- `usePortalAllocatableShows.ts`'s module-level `sessionCachedShows` cache (60s TTL, silent background
  reload) is confirmed real, exactly as described.
- The first draft's correction (invalidate the cache when the modal enters historical inspection via
  `onInspect`) was found to be a **no-op against the actual failure path** — that trigger only fires
  on the branch where the cache already correctly reports `isAllocatable === false`. The real failure
  is the opposite case: a stale cache reporting `isAllocatable === true` for a show that has since
  become historical, which never takes the inspection branch at all and instead auto-selects the show
  as a normal allocation destination.
- **Correction required and made:** target the actual exposure window — the interval between modal
  open (against a possibly-stale cache) and the existing silent background reload settling at least
  once. Plan Section 30.4 was rewritten to introduce a `hasConfirmedFreshness` gate that
  `canConfirmFull` and the capacity banner must both respect, extending the existing
  `isLoading`/`isLoadingAllocations` gate pattern rather than inventing a new mechanism. This closes
  the real window without discarding the cache's benefit after the first confirmation, and without
  weakening the genuine capacity-exhausted banner for a truly open, exhausted show (it still renders,
  only slightly deferred until freshness is confirmed).
- 30.5's corresponding test bullet was rewritten to test the corrected mechanism (freshness-gating),
  not the original no-op mechanism.

### Process/scope checks — pass

- No Rules or Function change proposed anywhere in Amendment 12 — confirmed by direct source review of
  every file touched (all Studio/Portal client TypeScript/TSX).
- `ShowProductionRetrySession`'s and `useQueuePrintRequestToShow`'s generation guards are both
  confirmed intact in current source; new logic is routed through them, not around them.

## Disposition

Corrected Plan Section 30 (30.4 rewritten, 30.5 test list amended, 30.6a added documenting this
round-trip) is **approved to proceed to implementation**. Workstream A/B required no changes.
Workstream E's corrected design does not require a further Formal Review round before implementation,
but must be independently re-verified — not merely re-asserted — by Implementation Review 14.
