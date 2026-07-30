# Portal Print Request Pre-Launch Stability — Amendment 12 Test Report

- **Date:** 2026-07-28
- **Scope:** Plan Section 30 / Amendment 12
- **Deployment:** none required; client-only implementation (Studio + Portal)

## Implemented behavior

1. **Workstream A/B — Studio reconciliation Retry persistence:**
   - Root cause 1: `retryReconciliation` (`useShowProductionTimer.ts`) silently returned with zero
     observable effect when `failedReconciliationRequestIds.length === 0` — now logs an explicit
     `no_op_nothing_to_retry` diagnostic trace instead of a truly silent no-op.
   - Root cause 2: all retry/warning state was pure ephemeral `useState`, unconditionally blanked on
     every `show?.id` change (including navigation away and back) with no reconstruction from
     Firestore. A new bounded, show-scoped reconstruction effect now re-derives real unresolved state
     via `upcomingShowService.listShowAllocations` (this show's own allocations only, never an
     unbounded scan), routed through the existing `ShowProductionRetrySession` for mutual exclusion
     with a live retry and stale-settlement discard.
   - A new dev-only sanitized click-trace log (`request reconciliation retry activation`) fires on
     every activation attempt, including early-return paths, with the required field schema.
   - A new derived `reconciliationRetryUiState` (`"retryable" | "remediation_only" | "none"`) is now
     wired directly into `UpcomingShowsPage.tsx`'s render, replacing the prior incidental binary check.
2. **Workstream E — Portal historical capacity-banner suppression:**
   - Root cause: `usePortalAllocatableShows.ts`'s module-level 60-second session cache could serve a
     stale `isAllocatable: true` for a show that had since become historical server-side, letting
     `PortalQueueToShowModal.tsx` compute a real capacity-exhausted `effectiveFit` against stale data.
   - A first-draft correction (invalidate on `onInspect`) was found by independent Formal Review to be
     a no-op against the actual failure path and was replaced before implementation with a
     `hasConfirmedFreshness` gate: `effectiveFit` cannot compute (and the capacity banner/`canConfirmFull`
     cannot activate) until the current modal-open's own reload has confirmed the cache at least once.
     A genuinely open, capacity-exhausted show is unaffected — its banner still renders, only slightly
     deferred until freshness is confirmed.

## Verification

| Command | Result |
|---|---:|
| `npx tsc -v` | 5.9.3 |
| New tests (2 files: reconstruction, capacityFreshness) | exit 0; 13/13 pass |
| Directly-relevant regression (11 files) | exit 0; 77/77 pass |
| Broader goal-scoped regression (52 files) | 214/219 pass; 5 failures in unrelated, pre-existing-modified files (`printRequestItemSizingAndNaming.test.ts`, `printRequestOversizedSelection.test.ts` — DPI floor/sizing, untouched by this amendment) |
| Portal typecheck | exit 0 |
| Portal build | exit 0; 19/19 pages |
| Studio build | exit 2; unchanged 29-error baseline, none in touched files |
| Repository lint | exit 1; unchanged 41 findings (31 errors, 10 warnings), none in touched files |
| `git diff --check` | exit 0 (only LF/CRLF autocrlf warnings) |
| Rules/Functions suites | not run: no Rules or Function file was changed; not required |

No changed-line lint error remains. No TypeScript setting or lint rule was weakened. No Function,
Rules, migration, or production action occurred.

**Independent Formal Review** (`.../amendment-12-review.md`): found the first-draft Workstream E
design was a no-op against its own identified root cause; the corrected `hasConfirmedFreshness` design
was approved to proceed to implementation without a further review round.

**Independent Implementation Review 14** (`.../implementation-review-14.md`): did not defer to the
Formal Review or the implementer's narrative; independently re-verified both workstreams against
current source and re-ran the full verification matrix directly. Found `reconciliationRetryUiState`
was computed but not actually wired into `UpcomingShowsPage.tsx`'s render (dead code, coincidentally
correct output) — corrected before sign-off, re-verified with no baseline regression. **Verdict:
APPROVED.**

## Files changed

- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- `apps/portal/features/print-requests/hooks/usePortalAllocatableShows.ts`
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx`
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowProductionTimer.reconstruction.test.ts` (new)
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.capacityFreshness.test.ts` (new)

## Evidence checkpoint

The unresolved write remains exactly:

```text
updateDoc printRequests/{printRequestId}
fields: status=completed, updatedBy, updatedAt
```

Whether the specific live denial the owner originally saw was a Rules-eligibility defect, malformed
request, service-payload defect, or transient remains evidence-gated pending a live reproduction, as in
every prior amendment. The new click-trace log is the mechanism that will let the next live Retry
attempt report a structured classification instead of another round of diagnostic extension. No Rules
or Function change is proposed or was made in this amendment.
