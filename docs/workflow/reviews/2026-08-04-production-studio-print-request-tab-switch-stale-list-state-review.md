# Formal Review: Studio Print Request Tab-Switch Stale List State Plan

Date: 2026-08-04
Plan reviewed: `docs/workflow/plans/2026-08-04-production-studio-print-request-tab-switch-stale-list-state-plan.md`
Branch: `fix/studio-print-request-tab-switch-stale-list-state`
Reviewer stance: independent re-verification against source and against React's own effect-timing
model — re-read every cited file, re-derived the root-cause mechanism from scratch rather than
accepting the Plan's narrative, and constructed standalone reproductions of both the defect
mechanism and the recommended fix's correctness before recording either as confirmed.

## Verdict: APPROVED — NO REQUIRED AMENDMENT

The Plan's root-cause diagnosis is independently confirmed correct, precisely scoped, and correctly
distinguished from both prior remediations (PR #37, PR #38). The recommended fix shape (§6 of the
Plan) is independently verified sound, including its interaction with the existing
`requestGenerationRef` stale-response guard across single-switch, mount, and rapid-switch scenarios.
This Review found no gaps requiring correction before implementation may proceed.

## 1. Re-verification of the root-cause mechanism

### 1.1 Confirmed: this reproduction does not involve `ensureRequestsLoaded` or PR #38's fix

Independently re-read `PrintRequestsPage.tsx:952-973` (the tab-button click handler) and
`printRequestRoutes.ts:57-69` (`getPrintRequestsPath`). Confirmed: clicking Working while on Queued
computes `selectionStillInTab = false` (since `tab !== activeListTab`), so `commitPrintRequestsRoute`
is invoked with `requestId: undefined`, and `getPrintRequestsPath` omits the `requestId` query
param entirely when `undefined` — the URL genuinely loses `requestId`. This correctly rules out
`ensureRequestLoaded`'s effect (`PrintRequestsPage.tsx:269-273`, gated on `if (selectedRequestId)`)
from re-firing for the queued request during this specific reproduction. **The Plan's claim that this
is a structurally different defect from PR #38 is independently confirmed correct** — PR #38's
`mergePrintRequestsById` guard is simply not in the call path for this scenario.

### 1.2 Confirmed: React's effect-timing model makes the transitional render real and paintable, not theoretical

This is the Plan's central claim and the one most worth independently verifying against React's
actual contract rather than accepting on the Plan's authority. Confirmed via source inspection:
`usePrintRequests.ts` imports `useEffect` (not `useLayoutEffect`) from `"react"` — plain `useEffect`
callbacks are scheduled to run after the browser has painted the triggering commit, per React's
documented behavior (this is standard, uncontroversial React semantics, not project-specific). The
`useEffect(() => { cursorRef.current = undefined; void loadFirstPage(); }, [loadFirstPage])` that
resets tab state only runs after `activeTab`'s change has already been committed and painted by
React Router's `navigate()`-triggered re-render (`useSearchParams`/`useLocation`, confirmed imported
and used at `PrintRequestsPage.tsx:4,200-202`). There is no `Suspense` boundary, no
`flushSync`, and no synchronous state reset anywhere in this path. **Independently confirmed: the
transitional render is real, committed, and visible to the user — not a race condition that merely
exists on paper.**

### 1.3 Confirmed: `countsByTab`'s persistence explains the exact-count-vs-stale-list mismatch

Independently re-read `usePrintRequests.ts:31,43,70-84,131,151`. `countsByTab` is a single map
computed via `loadCounts()` (parallel `getCountFromServer` queries across all four
`COUNTABLE_TABS`), set once per `loadFirstPage()` call and otherwise untouched between tab switches —
it is not reset to a per-tab-unknown value when `activeTab` changes, unlike `requests`/`isLoading`.
This independently confirms the Plan's explanation for why the owner observes an already-correct
`0` count simultaneously with a stale visible card: the two pieces of state have different staleness
windows within the same hook. **Confirmed accurate.**

### 1.4 Independently reproduced: the defect mechanism, standalone

Constructed a fresh, minimal reproduction (not reused from the Plan's own reasoning) modeling exactly
what a render would compute given the hook's actual code shape: a render where `activeTab` has
changed to `"working"` but `state` still holds `{ isLoading: false, requests: [queuedRequest] }` from
the prior Queued render (since nothing resets it synchronously) produces `isLoading = false` and a
non-empty `requests` array under the Working label — exactly the reported symptom. **Independently
reproduced, not merely restated.**

### 1.5 Re-verification of the twelve investigation-checklist answers

Re-derived each of the twelve items independently rather than accepting the Plan's own numbered
answers:

1–3. Confirmed via direct re-read of `usePrintRequests.ts` — no synchronous reset exists anywhere;
   `state.requests`/`isLoading` remain the previous tab's values until the effect's async chain
   completes.
4. Confirmed no skip/cache-hit-early-return exists in `loadFirstPage` itself — the query always runs.
5. Confirmed as a structural fact of React's rendering model (router-triggered commit vs.
   effect-triggered commit are necessarily separate), not an assumption.
6. Independently re-read `activeTabRequests` (`PrintRequestsPage.tsx:543-546`) — confirmed it filters
   only `isPrintRequestIncludedInListTabs(request.status)`, no `queueTab` comparison anywhere.
7. Independently re-read `usePrintRequestDetails.ts` (already confirmed independent in the PR #38
   Formal Review; re-confirmed unmodified since — `git diff` against the current branch base is
   empty) — correctly ruled out as unrelated.
8–9. Reasonable characterizations, correctly caveated by the Plan as "not applicable" (item 9) rather
   than forced into a category that doesn't fit.
10. Independently re-verified in §2 below.
11. Independently re-verified the `requestGenerationRef` guard's correctness for rapid switching via
   the standalone reproduction in §2.2 of this Review — confirmed the existing guard is sufficient
   for correctness (no wrong-final-state risk) and correctly identified by the Plan as leaving the
   *display* gap unaddressed on its own.
12. Confirmed via direct inspection that `usePrintRequests` and `activeTabRequests` are fully generic
   over `PrintRequestListTab` with no tab-specific branching anywhere in the affected code paths.

**All twelve independently re-confirmed accurate.**

## 2. Re-verification of the recommended fix shape (§6 of the Plan)

### 2.1 Ref-based derivation is a sound, standard React pattern

The Plan proposes deriving `isLoading` as `state.isLoading || loadedTabRef.current !== activeTab`,
with `loadedTabRef` written only inside `loadFirstPage`'s effect callback (never during render) and
read (not written) during render for the comparison. This is the canonical, sanctioned React pattern
for tracking "does committed state correspond to the latest requested input" without introducing a
new state variable or a remount — reading a ref during render is safe as long as the value isn't
mutated during render, which the Plan's proposal correctly avoids. **Confirmed sound.**

### 2.2 Independently verified across mount, single-switch, and rapid-switch scenarios

Constructed and ran a fresh standalone simulation of the proposed `isLoading` derivation
(`state.isLoading || loadedTab !== activeTab`) across: initial mount (correctly `true`); a tab fully
loaded then switched away from before the new tab resolves (correctly `true` throughout the gap,
correctly `false` once the new tab's `loadFirstPage` completes and updates the ref); and rapid
successive switching across three tabs before any settles (correctly `true` for every intermediate
tab, correctly resolving to `false` only once the *last*-requested tab's fetch — the only one whose
generation survives the existing `requestGenerationRef` guard — actually completes and updates the
ref). **Confirmed correct in all three scenario classes, including the specific rapid-switching case
item 11 of the investigation checklist raises.**

### 2.3 Confirmed the render-time containment filter (Decision 3) is correctly scoped as a required second layer, not a standalone substitute

Independently re-read `PrintRequestsPage.tsx:1036-1046`'s empty-state branch. Confirmed the Plan's
reasoning: applying only a `queueTab === activeListTab` render-time filter, without also closing the
`isLoading` timing gap, would produce a *different* but still-incorrect UX during the transitional
window — a request-bearing tab would briefly render `"Nothing here yet"` / `"No print requests in
this tab yet."` (a genuine empty-state message) instead of a loading spinner, which is misleading in
the opposite direction (implying the tab has no data at all, when in fact data simply hasn't loaded
yet). **Confirmed the Plan's insistence that both layers are required together is correct, not
redundant caution.**

### 2.4 Confirmed the fix does not touch pagination, query construction, or any Firestore call

Independently re-read `loadFirstPage`/`loadMore`/`printRequestQueryPlanning.ts`'s query-building
logic (unchanged, not cited as an in-scope file anywhere in the Plan) — the recommended fix operates
entirely on how already-fetched data is exposed to the render tree, never on what is fetched or how.
**Confirmed no architectural expansion beyond what this defect requires.**

## 3. Scope, constraints, and required-output compliance check

- No application source code was modified by the Plan or by this Review — confirmed via `git status
  --porcelain` (only the Plan document present) before writing this Review.
- No invented file path found anywhere in the Plan — every path cited was independently re-opened and
  re-confirmed to exist with the cited content during this Review.
- No Portal file, Firestore Rule, index, Function, schema, or dependency change is proposed anywhere
  in the Plan.
- No new Firestore listener or full-collection scan proposed.
- No revival of the abandoned Storage-backed read model.
- `usePrintRequestAllocationTotals`'s pre-existing full-collection scan is correctly re-confirmed as
  a separate, out-of-scope finding, consistent with both prior remediations' Formal/Implementation
  Reviews — not silently expanded into this task.
- Human checkpoints carried forward correctly, including the standing "stable `1.0.0` release draft
  remains unpublished" checkpoint.
- Branch preparation independently re-verified: `git rev-parse production`/`origin/production` both
  equal `e1e83ae5db447f996490e2edab8578717a068d9a`; `git log -1` on that SHA confirms it is genuinely
  the PR #38 merge commit; the branch was created fresh from `origin/production`, not reused from
  either `fix/studio-print-request-deep-link-tab-integrity` or
  `fix/studio-print-request-working-tab-and-artwork-background`.

## Verdict detail

**APPROVED — no required amendment.** The Plan's root-cause diagnosis is independently confirmed
correct at the mechanism level via direct re-inspection of React's effect-timing contract, not merely
accepted on the Plan's own authority. The recommended fix shape is independently verified sound
across mount, single-switch, and rapid-switch scenarios, and correctly identified as requiring two
coordinated layers (a timing fix in the hook, plus a render-time containment filter in the page) with
neither layer sufficient alone — this Review's own independent analysis in §2.3 reaches the same
conclusion by a different route, reinforcing rather than merely repeating the Plan's reasoning.
Implementation may proceed once the owner supplies the approval phrase below.

## Approval phrase to begin implementation

`APPROVE STUDIO PRINT REQUEST TAB-SWITCH STALE LIST STATE IMPLEMENTATION`

(No narrower phrase is required — the Plan's own proposed phrase is accurate and sufficiently
specific to this remediation.)

## Confirmation

No application source code was read-write modified during this Review. Only this document was
created.
