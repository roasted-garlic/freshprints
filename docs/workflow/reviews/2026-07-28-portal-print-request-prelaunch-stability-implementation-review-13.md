# Portal Print Request Pre-Launch Stability — Implementation Review 13

- **Goal:** `portal-print-request-prelaunch-stability`
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 29 (Amendment 11)
- **Formal Review (pre-implementation):**
  `docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-amendment-11-review.md`
  — `approved_with_changes` (one clarification, resolved directly in the Plan: the `ShowPicker.tsx`
  `aria-description` string brought explicitly into copy-correction scope)
- **Prior Implementation Review (different amendment, context only):** Implementation Review 12
  (Section 28 / Amendment 10) — `APPROVED`
- **Review type:** independent Implementation Review (post-implementation verification of
  Amendment 11)
- **Date:** 2026-07-28
- **Verdict:** **APPROVED**

## Independence statement

This review read the Plan's Section 29 in full and the Amendment 11 Formal Review in full, then
independently re-derived the implementation contract from those two documents' own stated
requirements — not from any implementer's changelog or self-report (none was supplied). Every file
cited below was opened and read directly by this review. Implementation Review 12 was read only to
confirm what Amendment 10 shipped, so this review could check for regression of that prior approved
state; none of Review 12's conclusions were re-used as evidence for Amendment 11's own correctness.
All test, typecheck, build, and lint commands in the verification matrix were executed directly by
this review in this session; every pass/fail count and error/warning count below is this review's own
console output, not carried over from any prior report. The Rules-mirroring claim in 29.3 was checked
by reading `firestore.rules`' `isValidPrintRequestAssignment`/`isValidPrintRequestOriginAssignment`
side-by-side against the new TypeScript function's actual body, not assumed from a code comment.

## 29.3 — diagnostic extension (cross-field assignment invariant): CONFIRMED

**`diagnosePrintRequestAssignmentInvariant`** —
`apps/studio/src/renderer/src/features/print-requests/utils/printRequestCompletionDiagnostics.ts:26-61`
— exists and mirrors Rules exactly. Side-by-side comparison against `firestore.rules:402-423`:

- Internal requests: Rules requires `!("customerId" in data) && !("guestCustomerId" in data)`
  (`firestore.rules:403`); the TS function requires `!hasCustomerId && !hasGuestCustomerId` (lines
  33-37), returning `"both_customer_and_guest_id_present"` on violation (the function collapses two
  Rules sub-cases — "guest present," "customer present," or "both present" — into one failure label,
  which is a reporting simplification, not a logic divergence: any non-empty presence of either field
  on an internal request is invalid under both).
- Non-internal requests: Rules requires **exactly one** of `customerId`/`guestCustomerId`, each
  checked as `is string && .size() > 0` (`firestore.rules:406-407`); the TS function requires the same
  exactly-one condition via `hasNonEmptyString` (lines 14-16, 39-44), correctly distinguishing "both
  present" from "neither present" as named failure reasons.
- `requestOrigin` consistency: Rules' `isValidPrintRequestOriginAssignment`
  (`firestore.rules:411-423`) treats an absent `requestOrigin` as valid, requires `studio_internal` to
  pair with `isInternal == true` and neither id field, and requires `studio_customer`/
  `portal_customer` to pair with `isInternal == false` and exactly one id field. The TS function
  (lines 47-59) mirrors this: absent → `null` (line 48-50), `studio_internal` → valid only if
  `isInternal && !hasCustomerId && !hasGuestCustomerId` (line 51-53), `studio_customer`/
  `portal_customer` → valid only if `!isInternal && (hasCustomerId !== hasGuestCustomerId)` (line
  54-56, an XOR that is logically equivalent to Rules' explicit two-armed OR). An unrecognized
  `requestOrigin` value returns `null` with an explanatory comment (lines 57-59) noting this is
  already covered by the existing field-presence/type diagnostics, not double-reported — a reasonable,
  documented design choice, not an oversight.

`diagnosePrintRequestForCompletion` (lines 63-80) now returns `assignmentInvariantFailure:
diagnosePrintRequestAssignmentInvariant(data)` (line 78) as a new field alongside the pre-existing
`parserStatus`/`missingFields`/`legacyExtraFields`. Confirmed read-only: the function only reads
`data` fields and returns a plain object; it performs no writes, imports no Firestore write APIs, and
is not present in `firestore.rules`' diff (see Scope section below — zero occurrences of
`isValidPrintRequestAssignment`/`isValidPrintRequestOriginAssignment` in the working tree's
`firestore.rules` diff). `mapPrintRequestData`'s own behavior in
`apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts:202` and its
call sites (lines 596, 652, 675, 805, 928, 955, 982, 1001, 1021, 1107, 1141, 1509) are unchanged by
this pass — `diagnosePrintRequestAssignmentInvariant` is invoked only from
`getPrintRequestForShowReconciliation` (line 1034, via `diagnosePrintRequestForCompletion`), never
threaded into the mapper.

**`getPrintRequestForShowReconciliation`** (`printRequestService.ts:1024-1061`) — confirmed the new
check is genuinely additive beyond the existing try/catch, not folded inside it. Reading the actual
body: the mapper call is wrapped in its own `try { request = mapPrintRequestData(...) } catch { throw
... }` (lines 1036-1043); immediately **after** that try/catch — meaning it only runs when the mapper
already succeeded — a separate, unconditional `if (diagnostics.assignmentInvariantFailure)` check
(lines 1049-1054) throws the same `ShowCompletionReconciliationRemediationError` type with a distinct
message ("customer/guest assignment needs staff remediation"). This is exactly the "new check beyond
the existing try/catch" the task required: a document that parses cleanly via `mapPrintRequestData`
but fails the assignment invariant is still caught and remediated, not returned as usable. The
in-code comment at lines 1044-1048 correctly documents why this is necessary (mapper success does not
imply Rules-writability).

**`ShowCompletionReconciliationRemediationError`/`ShowCompletionReconciliationResult`**
(`apps/studio/src/renderer/src/features/upcoming-shows/utils/showCompletionReconciliation.ts`) — both
now carry `assignmentInvariantFailure` through in practice, not just in a type left undefined:

- `ShowCompletionReconciliationResult.assignmentInvariantFailure?: string | null` (line 37).
- `ShowCompletionReconciliationRemediationError`'s constructor's `diagnostics` parameter type includes
  `assignmentInvariantFailure?: string | null` (line 59), and the error is actually constructed with
  this field populated at both `printRequestService.ts:1041` (passing the full `diagnostics` object,
  which includes `assignmentInvariantFailure` per `diagnosePrintRequestForCompletion`'s return shape)
  and `:1052` (same).
- `runPhase`'s failure-object builder (`showCompletionReconciliation.ts:102-105`) reads
  `error.diagnostics.assignmentInvariantFailure ?? null` when the caught error is an instance of
  `ShowCompletionReconciliationRemediationError`, and `null` otherwise — genuinely populated from the
  thrown error's diagnostics at runtime, not a static `undefined` placeholder. Verified this is wired
  end-to-end from the throw site to the manifest object.

**Test run:**
```
npx tsx --test apps/studio/src/renderer/src/features/print-requests/utils/printRequestCompletionDiagnostics.test.ts
```
Result: **12/12 passed, 0 failed**, 2 suites, ~302 ms. Confirmed the new "Print Request assignment
invariant (Plan Section 29.3 — mirrors firestore.rules exactly)" suite exercises the new function
directly (not a reimplementation) across both-present, neither-present, origin-mismatch (three
distinct mismatch sub-cases), and valid cases, including an edge case for empty-string id fields not
counting as present.

## 29.4 — show-selection-loss fix: CONFIRMED

**`resolveScheduleTabForStillExistingSelection`** —
`packages/shared/src/utils/showScheduleGrouping.ts:83-100` — exists and matches the required contract
exactly: given the full `shows` list (not the visible/active-tab-filtered list — the function
receives `shows: readonly T[]`, the full array, per its call site), a `selectedShowId`, the current
`activeScheduleTab`, and `now`, it returns `null` if there is no selection (line 91-93) or the show no
longer exists at all (line 94-97, i.e. genuinely gone, not just reclassified — this is the
non-resurrection guard), otherwise computes the still-existing show's own current tab via
`getShowScheduleTab` and returns it only if it differs from `activeScheduleTab` (line 98-99),
otherwise `null`.

**`UpcomingShowsPage.tsx`** — confirmed the function is actually called in the relevant effect, not
merely defined and unused. Reading the effect body (`UpcomingShowsPage.tsx:297-371`): after the
existing "selection still present in `visibleShows`" early-return (lines 324-327), a new block (lines
329-347) calls `resolveScheduleTabForStillExistingSelection(shows, selectedShowId, activeScheduleTab,
new Date())` and, if it returns non-null, calls `setActiveScheduleTab(reclassifiedTab)` and `return`s
— **before** the pre-existing `resolveVisibleShowSelection(visibleShows, selectedShowId)` call at line
351 is ever reached. This is exactly the required behavior: the destructive fallback
(`resolveVisibleShowSelection`, which falls back to a different show or `null`) is short-circuited
specifically when the just-finished show still exists but reclassified tabs; it is not bypassed for a
show that genuinely no longer exists (that case still falls through to
`resolveVisibleShowSelection`'s existing behavior, which is correct — nothing to preserve).

**Non-interference with explicit navigation** — `handleScheduleTabChange`
(`UpcomingShowsPage.tsx:388-397`) and `handleSelectShow` (lines 399-405) are distinct `useCallback`
definitions, invoked only from explicit UI click handlers (`onClick={() => handleScheduleTabChange(tab)}`
at line 887, `onClick={() => handleSelectShow(show.id)}` at line 925), and neither calls nor is called
by the reclassification effect. They remain the sole authority for user-driven tab/show changes;
the automatic effect only ever fires from the `useEffect`'s own dependency-triggered re-run.

**Test run:**
```
npx tsx --test packages/shared/src/utils/showScheduleGrouping.test.ts
```
Result: **20/20 passed, 0 failed**, 8 suites, ~177 ms. The `resolveScheduleTabForStillExistingSelection`
suite (5 cases) includes the required "the Finish scenario" test — "returns the show's new tab when it
reclassified out of the active tab (the Finish scenario)" — which constructs a show that still exists
in the full `shows` list but whose own schedule-tab classification (via `getShowScheduleTab`) now
differs from the currently active tab, genuinely modeling the described race rather than a trivial
input/output check. A separate case explicitly asserts non-resurrection for a show the owner
genuinely navigated away from, distinguishing the two scenarios as required.

## 29.6 — historical default inspection + copy fixes: CONFIRMED

**`resolveShowPickerSelection.ts`** (`packages/show-picker/src/resolveShowPickerSelection.ts:16-32`) —
return type now includes `autoInspectId: string | null` (interface, lines 4-14). Logic: when
`getDefaultShowPickerOptionId(options)` (allocatable-only) returns `null` (no allocatable
destination), the function filters to `inspectableOptions` (`option.canInspect !== false`) and sets
`autoInspectId` to that single option's id only when `inspectableOptions.length === 1` (line 25),
otherwise `null` — correctly never guessing when 2+ non-allocatable/inspectable shows exist for the
date, and correctly `null` when the sole non-allocatable show is also not inspectable (verified by the
test suite's dedicated case, see below).

**Non-blocking implementation-shape note:** the Plan's 29.6 item 1 says to "Use
`getDefaultShowPickerOptionId(..., allowInspectOnly: true)` semantics, already present in
`getDefaultShowPickerOptionId.ts`, rather than inventing new selection logic." The shipped code does
not literally call `getDefaultShowPickerOptionId` with `allowInspectOnly: true` for the `autoInspectId`
branch; it instead writes an equivalent-but-separate filter (`options.filter(canInspect !== false)`,
count check). I traced both paths for behavioral equivalence: `getDefaultShowPickerOptionId` with
`allowInspectOnly: true` would fall back to the full `options` pool when `selectable.length === 0`
(`getDefaultShowPickerOptionId.ts:18`) and return the first non-full-or-first option
(`getDefaultShowPickerOptionId.ts:30`) — it does not have a "return null unless exactly one" gate; it
would happily return an id even when several inspectable options exist, which is the "never guess"
behavior 29.6 item 2 explicitly requires resolveShowPickerSelection to avoid. Reusing
`getDefaultShowPickerOptionId(..., true)` as literally suggested would therefore have **violated**
item 2 without an additional exactly-one guard wrapped around it; the shipped code's own inline
filter is a small, self-contained piece of new selection logic, but it is the minimal correct logic
and produces the required behavior (verified by tests below). This is a documentation-fidelity
deviation from the Plan's suggested implementation shape, not a functional defect — flagged as a
non-blocking note only.

**`ShowPicker.tsx`** — `handleSelectDate` (lines 353-371) and the mount-time resolution effect (lines
373-390) both call `resolveShowPickerSelection`, and in the `else` branch (when `resolution.destinationId`
is falsy — i.e. exclusively the no-destination case) call `onInspect(resolution.autoInspectId)` guarded
by `if (resolution.autoInspectId && onInspect)` (lines 367-369, 386-388). This confirms it fires only
in the no-destination-plus-single-show case and never when a destination was resolved (the `if
(resolution.destinationId)` branch calls `onSelect` instead and never reaches the `autoInspectId`
check).

**Customer-facing copy** — both required sites corrected:
- `PortalQueueToShowModal.tsx:527-532` renders "This show has already been printed, so no new print
  requests can be added." plus "You can still review your print activity for this show." (confirmed
  by direct grep, lines 528 and 531).
- `ShowPicker.tsx:166`: `aria-description={isClosedForAdd ? "This show has already been printed. Not
  available for adding." : undefined}` — the Formal Review's required clarification (the second
  call site) is correctly addressed.
- Repository-wide grep for `"Read-only show"` (excluding `node_modules`/`.next`) returns exactly one
  match: `apps/portal/features/print-requests/components/PortalQueueToShowModal.historicalCopy.test.ts`
  — which is the new negative-assertion test file itself (asserting the string does NOT appear in
  rendered source), not a remaining production occurrence. Zero occurrences in any non-test source
  file.

**`portalPersonalShowUsage.ts`** — `buildPortalPersonalShowUsage` (lines 14-29) accepts an
`isAllocatable = true` parameter (line 18) and sets `remainingLabel: isAllocatable ? ... :
undefined` (line 28), while `usedLabel` is always set (line 27) regardless of allocatability.
`resolveSelectedPortalPersonalShowUsage` (lines 32-46) passes through `selectedShow.isAllocatable !==
false` (line 45) as the allocatable flag. `PortalQueueToShowModal.tsx`'s render only displays the
remaining-spots paragraph when `personalUsage.remainingLabel` is truthy (`{personalUsage.remainingLabel
? (<p className="portal-muted">{personalUsage.remainingLabel}</p>) : null}`, lines 540-541) — confirmed
conditional, not unconditional as before.

**Test run:**
```
npx tsx --test packages/show-picker/src/resolveShowPickerSelection.test.ts apps/portal/features/print-requests/utils/portalPersonalShowUsage.test.ts apps/portal/features/print-requests/components/PortalQueueToShowModal.historicalCopy.test.ts
```
Result: **17/17 passed, 0 failed**, 4 suites, ~189 ms.

## Full verification matrix (executed directly by this review)

```
npx tsc -v
```
`Version 5.9.3`.

```
npx tsx --test <28-file list from the task>
```
Result: **218/218 passed, 0 failed, 0 cancelled, 0 skipped**, 57 suites, ~589 ms. This includes every
file named in the task's matrix: Portal print-request hooks/components, Studio show
allocations/upcoming shows, shared Firestore subscription, per-show customer cap, Functions queue
callable, queue-to-show hook, portal show queue fit, Amendment 10's retry-session/outcome/timer-retry/
completion-reconciliation suites, this pass's new assignment-invariant/schedule-tab/show-picker/
personal-usage/historical-copy suites, and the pre-existing show-picker composed tests
(`buildShowPickerOptions`, `getDefaultShowPickerOptionId`, `getShowPickerDayMarker`,
`portalHistoricalShowInspection`, `PortalQueueToShowModal.historicalInspection`).

```
npm run typecheck --workspace @fresh-prints/portal
```
Exit `0`, no errors.

```
npm run build:portal
```
Exit `0` — full Next.js build succeeded, 19/19 static pages generated.

```
npm run build:studio
```
Exit non-zero (`tsc` step fails as expected) — **exactly 29** `error TS` lines, matching the documented
baseline exactly line-for-line (same file/line/code list as Implementation Review 12's own baseline,
re-verified by this review directly rather than assumed). One of the 29 baseline errors
(`UpcomingShowsPage.tsx(119,46): error TS2554: Expected 1 arguments, but got 0`) sits inside a file
this pass modified — investigated directly: `git blame` on that line shows it was last touched by an
unrelated commit dated 2026-07-08 (`usePrintRequests()` called with zero arguments against a hook
signature that now requires an `activeTab` parameter), and this pass's actual diff to
`UpcomingShowsPage.tsx` (`git diff`) does not touch that line — it only adds a new `useState` above it
and a new effect block/JSX block elsewhere. The error's location shifted by a few lines due to
unrelated code moving above it, but the error itself is pre-existing and outside this pass's edits.
Confirmed **zero** other of the 29 baseline errors are in any file this pass touched.

```
npm run lint
```
**41 problems (31 errors, 10 warnings)** — matches the documented baseline exactly. All reported files
(`functions/src/ai/prepareAiAnalysisImage.ts`, `functions/src/lib/customerUploadProcessing.ts`,
`functions/src/lib/etsyRecommendationSuggestionValidation.ts`,
`functions/src/lib/etsySuggestionRequestValidation.ts`, `functions/src/lib/portalOgImageCompose.ts`,
`packages/shared/src/utils/portalBiddingAcknowledgmentCopy.ts`, plus others) are pre-existing and
outside this pass's touched-file set — confirmed by grepping the lint output for every basename this
pass touched, with zero matches.

```
git diff --check
```
Exit `0` — no whitespace-error findings (only benign CRLF/LF normalization warnings on unrelated
pre-existing dirty files across the tree, not errors, and not blocking).

## Scope-boundary confirmation

`git status --short` shows 367 total lines of dirty-tree status spanning many unrelated in-flight
goals (Functions, `firestore.rules`, `storage.rules`, `storage.cors.json`, `firebase.json`, and
numerous unrelated feature files) — this predates this pass. This review confirmed, by filtering
`git status --short` to exactly the files 29.3/29.4/29.6 require, that this pass's actual changes are:

- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestCompletionDiagnostics.ts` (new)
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestCompletionDiagnostics.test.ts` (new)
- `apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts` (modified)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showCompletionReconciliation.ts` (new)
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` (modified)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/groupShowsByUpcomingPast.ts` (modified —
  one new re-export line for `resolveScheduleTabForStillExistingSelection`)
- `packages/shared/src/utils/showScheduleGrouping.ts` / `.test.ts` (modified)
- `packages/show-picker/src/resolveShowPickerSelection.ts` / `.test.ts` (new)
- `packages/show-picker/src/ShowPicker.tsx` (modified)
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx` (modified)
- `apps/portal/features/print-requests/utils/portalPersonalShowUsage.ts` / `.test.ts` (new)
- `apps/portal/features/print-requests/components/PortalQueueToShowModal.historicalCopy.test.ts` (new)

I independently verified `firestore.rules`' working-tree diff contains **zero** occurrences of
`isValidPrintRequestAssignment`/`isValidPrintRequestOriginAssignment` (the two functions 29.3 mirrors)
— the diff's actual content (new `showProductionStatusTransitionValid`/
`staffCanUpdateShowProductionTimerOnLegacyDocument`/`staffCanStartLegacyShowAllocation`/
`staffCanFinishLegacyShowAllocation` functions) is unrelated Amendment-10-era production-timer/show-
allocation legacy-compatibility work, already pre-existing dirty-tree state, not part of this pass. No
Function, Rules, `firebase.json`, `storage.rules`, `storage.cors.json`, or migration file is part of
this pass's changes. This remains client-only plus pure/test utility additions, consistent with 29.8's
binding constraint. No queued goal (`preproduction-static-analysis-cleanup`,
`studio-test-data-print-limit-wipe-audit`) was started — both remain queued per
`.cursor/workflow/state.md`. No production action occurred.

**Regression check against Amendment 10 (Implementation Review 12's approved state):** retry
concurrency safety (`showProductionRetrySession.test.ts`), remediation-only-never-success
(`showReconciliationRetryOutcome.test.ts`, `useShowProductionTimer.retry.test.ts`), the composed
tests, and the `isSelectable`-removal (repository-wide grep for `isSelectable` still returns zero
matches; `ShowPickerOption` still has only `canInspect`/`canAllocate`) all remain intact and passing —
confirmed both by direct file inspection and by this pass's full 218/218 test run, which includes all
of Amendment 10's own regression suites.

## Blocking findings

None.

## Non-blocking notes

1. **29.6 implementation-shape deviation:** `resolveShowPickerSelection.ts`'s `autoInspectId` logic
   does not literally reuse `getDefaultShowPickerOptionId(..., allowInspectOnly: true)` as the Plan's
   text suggested; it uses an equivalent-but-separately-written inline filter. Traced for behavioral
   correctness (see 29.6 section above) — the literal suggested reuse would have required an
   additional exactly-one guard to avoid violating the Plan's own "never guess among 2+" requirement,
   so the deviation is arguably the more correct shape, not a functional gap. Documented for the
   record since the Plan named a specific implementation path that was not followed literally.
2. **Pre-existing TS error inside a touched file:** `UpcomingShowsPage.tsx(119,46)` (part of the
   documented 29-error baseline) sits inside a file this pass also modified elsewhere. Confirmed via
   `git blame` and `git diff` that this specific error is untouched by this pass's edits (predates
   Amendment 11 by roughly three weeks) and its baseline count is unchanged (still exactly 29) —
   recorded here only so a future reviewer doesn't need to re-derive this distinction from scratch.

## Confidence assessment

This review certifies, from direct source reading and direct command execution: the assignment-
invariant diagnostic function is a faithful, read-only mirror of `firestore.rules`' own two functions;
`getPrintRequestForShowReconciliation` throws the remediation error on this new condition even when
the mapper succeeds, and the new field is threaded genuinely (not just typed) through the error class,
the result interface, and `runPhase`'s failure builder; `resolveScheduleTabForStillExistingSelection`
is called in the correct effect at the correct point (before the destructive fallback) and is
functionally distinct from the explicit-navigation callbacks; the show-picker auto-inspect logic
correctly never guesses among multiple non-allocatable shows; both required customer-facing copy
sites are corrected and the old string has zero remaining production occurrences; and the personal-
usage `remainingLabel` omission is correctly conditional in both the util and the render. All 218
composed/unit tests, the portal typecheck, the portal build, and `git diff --check` pass cleanly; the
Studio build and lint outputs match their documented pre-existing baselines exactly, with the one
touched-file TS error traced and confirmed pre-existing and unrelated to this pass's edits.

This review **cannot** certify that the show-selection-loss fix (29.4) behaves correctly under real
React effect scheduling with a real Firestore refresh completing at an unpredictable time relative to
`now`. The verification above establishes, from source reading, that: (a) `shows` (the full list, not
`visibleShows`) is a dependency of the effect (line 368 in the dependency array) and is sourced from
`useUpcomingShows`'s live subscription state, so a Firestore refresh resolving asynchronously will
re-trigger this effect with fresh data as a normal React re-render, not a special code path; (b) the
reclassification check runs before the destructive fallback on every re-run of this effect, so it is
not a one-time-only guard that could be bypassed by a differently-timed refresh. But this is an
inference from the effect's dependency list and body structure, not an executed test against a real
mounted React tree, real Firestore snapshot listener, or real system clock advancing across a Finish-
then-refresh sequence — this repository's established no-DOM-rendering testing convention
(`docs/standards/TESTING.md`) means the pure-function test (`showScheduleGrouping.test.ts`'s "Finish
scenario" case) proves the decision primitive produces the correct tab given the right inputs at the
right moment, but does not prove those inputs actually arrive at that moment relative to React's
commit/effect scheduling in the live Electron app, nor does it prove no other effect or state update
races the reclassification effect's own re-run in a way that could re-trigger `resolveVisibleShowSelection`
before `setActiveScheduleTab` commits and this component re-renders with the new `activeScheduleTab`.
A live/DOM-driven Studio QA pass (finishing a show whose scheduled time has already passed, or passes
during the refresh) remains the only way to fully certify this under real scheduling — source review
can certify the logic is correctly wired and the primitive is correct, not that real-world timing
cannot still surface an edge case source reading alone cannot rule out.

## Verdict

**APPROVED.** All three required areas — 29.3 (assignment-invariant diagnostic extension), 29.4
(show-selection-loss fix), and 29.6 (historical default inspection + copy corrections) — are
independently confirmed against current source with file:line citations, matching the Amendment 11
Formal Review's approved scope exactly, including the Workstream D clarification (the `ShowPicker.tsx`
`aria-description` string) resolved directly in the Plan. All required tests pass (218/218, plus the
three targeted sub-runs totaling 12+20+17 = 49 of those 218 specifically exercising this pass's new
code). Typecheck and Portal build are clean; Studio build and lint match documented pre-existing
baselines exactly with zero new findings in any file this pass touched. Scope remains client-only plus
pure/test utility additions; no Function, Rules, production, migration, or queued-goal action
occurred; nothing from Amendment 10 regressed. One non-blocking implementation-shape deviation (29.6's
`autoInspectId` logic) and one pre-existing-error-in-touched-file clarification are recorded above but
do not block approval. Per Section 29.8, this satisfies the amendment's required independent
Implementation Review; the goal may proceed to its next required gate (owner QA / signoff) per the
Plan's standing process.
