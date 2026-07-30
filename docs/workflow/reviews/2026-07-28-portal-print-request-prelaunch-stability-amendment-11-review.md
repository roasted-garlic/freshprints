# Portal Print Request Pre-Launch Stability — Amendment 11 Formal Review

- **Goal:** `portal-print-request-prelaunch-stability`
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 29
- **Review type:** independent Formal Review (pre-implementation)
- **Date:** 2026-07-28
- **Verdict:** **`approved_with_changes`**

## Summary

The evidentiary chain for every workstream independently re-derives correctly from current source —
every citation checks out at the line level, and no place was found where the amendment's narrative
outruns what the code actually does. The corrections required are documentation precision, not scope
changes.

## Workstream A — is `printRequests.status = "completed"` still required?

**CONFIRMED, with one correction that strengthens the conclusion.** `PrintRequestStatus` includes
`"completed"` as a current value; `isPrintRequestFullyPrinted()` short-circuits on it; both
`UpcomingShowsPage.tsx` (add-to-show picker exclusion) and `PrintRequestsPage.tsx` (detail-panel edit
lock, direct `status !== "completed"` check) call it; `derivePrintRequestListTab()` has the exact
branch claimed; deletion/archival eligibility and the idle-upload purge Function both classify
`"completed"` as non-"working."

**Correction (strengthens, not weakens, the conclusion):** `queueTab` is a real, server-indexed
Firestore field (not a client-side re-derivation) maintained by a Cloud Function trigger
(`onPrintRequestQueueTabInputsWritten`) on `printRequestItems`/`showAllocations` writes — Studio's
Print Requests list issues an actual `where("queueTab", ...)` query against it. The completion
write's effect on `queueTab` is realized on the next item/allocation event that re-triggers the
Function, not synchronously with the completion write itself. This is a precision note, not a change
to the "write is required" conclusion.

## Workstream A's diagnostic fix (29.3)

**CONFIRMED in full, and confirmed read-only/diagnostic-only.** `firestore.rules`'s
`isValidPrintRequestAssignment`/`isValidPrintRequestOriginAssignment` require exactly one of
`customerId`/`guestCustomerId` and `requestOrigin` consistency, checked against the full post-merge
document on every `updateDoc`. `diagnosePrintRequestForCompletion` today checks none of this;
`mapPrintRequestData`/`PrintRequestDocumentData` never even reads `guestCustomerId`. The proposed fix
adds only a new computed diagnostic field — no write path, Rules file, or behavior change is touched.

## Workstream B — Retry button appears inert

**CONFIRMED, no existing guard found that would prevent this scenario.** `getShowScheduleTab`
classifies purely by `scheduledDate > now`, independent of `productionStatus`.
`resolveVisibleShowSelection` falls back to a different show when the current selection isn't in the
new visible list. `UpcomingShowsPage.tsx`'s effect (keyed on `visibleShows`) calls this and
`setSelectedShowId` when the resolution differs, with no special-casing for a just-acted-upon show
found anywhere in the touched files. `selectedShow` (derived) feeds `useShowProductionTimer`'s `show`
prop, whose per-show-id reset effect wipes `actionWarning`/`canRetryReconciliation`/
`failedReconciliationRequestIds`/etc. This traces the entire causal chain end-to-end with no
contradicting guard.

**Proposed fix coherence:** confirmed implementable within the existing two-variable state model
(`selectedShowId`/`activeScheduleTab`, both directly present in `UpcomingShowsPage.tsx`) — no third
selection authority is required; explicit-navigation paths (`handleScheduleTabChange`,
`handleSelectShow`) are distinct, identifiable code paths that can clear an exemption flag without
conflating with the automatic-reclassification guard.

## Workstream C — invalid production record correlation

**CONFIRMED.** Both `"excluded invalid production record"` call sites are scoped only to
`showAllocations`/`upcomingShows` documents; neither touches `printRequests`. No correlation by
construction, no code change needed beyond 29.3.

## Workstream D — historical default inspection and copy

**CONFIRMED, with one clarification required before Implement.** `ShowTimeSlotOption` is one native
`<button>` wrapping the entire card. `handleSelectDate` never calls `onInspect`.
`getDefaultShowPickerOptionId`'s `allowInspectOnly` parameter already exists and is reusable as
claimed. The `PortalQueueToShowModal.tsx` copy target and the `portalPersonalShowUsage.ts`
unconditional-`remainingLabel` gap are both confirmed exactly as described.

**Required clarification (resolved directly below):** `packages/show-picker/src/ShowPicker.tsx:166`
contains a second, customer-facing (assistive-tech-rendered) string —
`aria-description={isClosedForAdd ? "Read-only show. Not available for adding." : undefined}` — using
the same "read-only" language the amendment's copy correction targets. The amendment's original text
named only the `PortalQueueToShowModal.tsx` string. This is now resolved directly in Plan Section
29.6 (see the amendment's item 4, updated): the `aria-description` string is explicitly brought into
scope and must also be replaced, so the required 29.7 test ("the old 'Read-only show' string no
longer appears anywhere in customer-facing render output") is satisfiable as literally written.

## Standing constraints check

- **Client-only:** confirmed — nothing in 29.3/29.4/29.6 touches `firestore.rules`, any Function, or
  any index/migration file.
- **Evidence before Rules changes:** confirmed — the assignment-invariant hypothesis is treated as
  unconfirmed pending a live retry manifest; no Rules relaxation is proposed or guessed.
- **No migration:** confirmed — any systemic legacy-data pattern found would require a separately
  approved bounded migration, not authorized here.
- **No production action:** confirmed.

## Blocking findings

None remaining after the Workstream D clarification (resolved directly in the Plan).

## Non-blocking notes

1. Workstream A's `queueTab` mechanism is a real server-indexed field maintained by a Function
   trigger, not a client re-derivation — noted for precision, does not change the conclusion.
2. The `ShowPicker.tsx` `aria-description` string is now explicitly in scope for the copy correction
   (resolved directly in the Plan).

## Verdict

**`approved_with_changes`.** Implement may proceed on Section 29's exact scope as amended. No
workstream's root-cause diagnosis was contradicted by source; no proposed fix reaches outside
client-only/diagnostic-only bounds; the state models each fix hooks into all genuinely support the
narrow changes proposed without a third selection-authority concept, a new selection-resolution
algorithm, or any Rules/Function/migration surface.
