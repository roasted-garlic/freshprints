# Owner QA Amendment 7 — Independent Review

Reviewed the Plan (`docs/workflow/plans/2026-08-05-post-launch-catalog-and-processing-stability-owner-qa-amendment-7.md`)
against the actual source in `useAiReviewInbox.ts`, `useDesigns.ts`, `AiReviewPage.tsx`,
`backgroundAiQueueReconciliation.ts`, and `importAiBackgroundQueue.ts`, independently re-deriving
every claim rather than trusting the plan's own framing.

## Root-cause re-verification

Confirmed directly: `AiReviewPage.tsx:64-68` passes a brand-new `options` object literal
(containing a brand-new `onQueueChanged` arrow function) to `useAiReviewInbox` on every render,
never memoized. Confirmed the background-queue observer subscription effect
(`useAiReviewInbox.ts`, pre-fix) had `designs`, `selectedDesignId`, and `options` all in its
dependency array — and that `designs` (a `useMemo` over `rawDesigns`) gets a new array reference
every time `applyDesignPatch`/`reloadDesigns` resolve, including as a direct result of that same
effect's own successful reconciliation. This is a genuine, provable identity-churn bug, not a
speculative diagnosis — independently re-confirmed via direct inspection of the actual dependency
array and the `useMemo`/`useCallback` chains involved.

Confirmed `applyDesignPatch` (`useDesigns.ts`, `useCallback` deps `[]`) and `reloadDesigns`
(`useCallback` deps `[loadDesigns]`, whose own deps `[enabled, loadAll, maxLoadAll, user]` do not
change in this context) are genuinely stable — the plan's claim holds.

## Correction to the plan's own root-cause narrative (required change, applied)

The plan's first draft claimed the resubscription churn "compounds" `onQueueChanged`/
`reloadCounts()` call volume. Independently traced every call site of `options?.onQueueChanged?.()`
inside the observer effect and found it is invoked only from within the observer's per-event
callback (once per real terminal pump event), never from the subscribe/unsubscribe effect body
itself. The resubscription churn does not multiply `reloadCounts()` frequency — its cost is effect
teardown/setup overhead and trace-buffer volume only. Required this correction before approving the
plan; it was applied.

## Fix mechanism review

The proposed fix — `optionsRef`/`designsRef`/`selectedDesignIdRef`, each assigned as a plain
statement during render (never inside a `useEffect`), read from inside the long-lived observer
callback instead of the closed-over variables, with the effect's dependency array reduced to
`[applyDesignPatch, filters.tab, reloadDesigns]` — is sound and consistent with multiple existing
precedents already in this exact file and module (`liveDesignRef`, `designsMirrorRef` in
`useDesigns.ts`, `listQueryKeyRef` in `useDesigns.ts`). Required the plan to specify render-time
assignment explicitly (not `useAiProcessingQueue`'s effect-based ref-update variant, which is not
safe enough for a value that must never be stale within the same render/microtask) — applied.

No stale-closure risk introduced: `applyDesignPatch`/`reloadDesigns` remain direct closures (they
are stable, so this is safe), and every value that does change per-render/per-event
(`designs`/`selectedDesignId`/`options`) is now ref-derived. `filters.tab` alone is sufficient to
force resubscription on a genuine mount/tab-switch edge, mirroring Amendment 5's already-correct
effect one block below (confirmed unchanged, still exactly `[filters.tab]`).

No new bug found: no missed resubscription risk (verified `applyDesignPatch`/`reloadDesigns` never
change identity in this context), no double-subscription risk (React's synchronous
cleanup-before-next-effect ordering was already the case pre-fix), no regression to
`reconcileBackgroundAiQueueEvent`'s pure decision contract (confirmed unchanged).

## Test approach review

Confirmed this repository has zero `@testing-library/react`/`renderHook`/jsdom usage anywhere —
the plan's choice to prove the fix via source-grep assertions (matching the established convention
of `derivePrintRequestsListLoading.test.ts`, `backgroundAiQueueReconciliation.test.ts`, and this
managed goal's own Amendment 6 follow-up IPC-transport tests) is correct for this codebase rather
than introducing a new test-harness dependency.

## Verdict

**approved_with_changes** (Plan phase). Two required corrections — the internal test-filename
inconsistency, and the overstated `onQueueChanged` amplification claim — were both applied before
implementation began. No other defect found in the plan's diagnosis or proposed mechanism.

---

# Owner QA Amendment 7 — Independent Implementation Review

Reviewed the final diff (1 modified file, 1 new test file) against the corrected Plan, independently
re-verifying rather than trusting either the Plan or the implementation's own comments.

## Verification performed

- **Ref assignment timing/placement**: confirmed `optionsRef.current = options;` and
  `selectedDesignIdRef.current = selectedDesignId;` execute as plain statements during render,
  placed after their source variables are already in scope. Confirmed `designsRef.current =
  designs;` is placed immediately after the `designs` `useMemo` resolves (necessarily later in the
  hook body than the other two ref declarations, since `designs` is not yet defined at that point)
  — a deliberate, correct split, not an oversight.
- **Dependency array**: confirmed via `git diff` the effect's array is exactly
  `[applyDesignPatch, filters.tab, reloadDesigns]` — `designs`, `selectedDesignId`, and `options`
  are genuinely absent.
- **Complete migration inside the callback**: checked every line of the observer callback body via
  diff; every prior bare `designs`/`selectedDesignId`/`options` reference was migrated to the
  ref-derived locals (`currentDesigns`, `currentSelectedDesignId`, `optionsRef.current`). No partial
  fix — no reference was missed.
- **Amendment 5's mount-reconciliation effect**: confirmed via `git diff` zero hunks touch it; still
  exactly `[filters.tab]` with the same `eslint-disable` comment.
- **Amendment 2's backend-completion effect** (`liveDesign`/`options`/`reloadDesigns`): confirmed
  byte-identical pre/post fix. Confirmed the Plan's "out of scope" reasoning holds — it is a
  one-shot reconciliation gated on `liveDesign` object identity and status, not a subscribe/
  unsubscribe cycle, so `options` remaining in its dependency array does not reproduce the
  resubscription-loop defect (a pre-existing, unrelated, out-of-scope re-execution characteristic
  that this Amendment neither introduces nor worsens).
- **No other unmigrated closure found**: the only other long-lived subscription in the file
  (`designDocumentSubscriptionService.subscribeToDesign`) correctly depends on `selectedDesignId`
  intentionally (a per-design subscription must follow selection changes) and never closes over
  `designs`.
- **`backgroundAiQueueReconciliation.ts`, `useDesigns.ts`, `aiEnrichmentCallableErrorMessage.ts`,
  `AiReviewPage.tsx`**: confirmed zero changes to all four via `git diff --stat`.
- **Test assertions are genuine discriminators, not tautologies**: re-ran three of the new test
  file's key assertions against the actual pre-fix source (`git show HEAD:...useAiReviewInbox.ts`)
  and confirmed each one fails against the pre-fix code — the dependency-array-exclusion assertion,
  the `designsRef.current`-presence assertion, and the `optionsRef.current?.onQueueChanged?.()`-
  presence / bare-`options?.onQueueChanged`-absence assertions all correctly detect the bug's
  absence-of-fix rather than passing unconditionally.
- **Typecheck/lint**: `npx tsc --noEmit` (Studio) exit 0; `npm run lint` exit 0. `useRef<Design[]>([])`'s
  initial value matches the real `designs: Design[]` type — no mismatch.

## Verdict

**approved.** No required changes. The implementation matches the corrected Plan precisely, the fix
is minimal and surgical (a single file's effect-dependency wiring plus refs, no behavioral change to
reconciliation, selection-advance, or reload semantics), and the new test file's assertions are
empirically confirmed to discriminate the fixed state from the pre-fix regression rather than
passing vacuously.

---

# Owner QA Amendment 7 Follow-Up — Independent Review (second loop, found after this fix shipped)

The owner reproduced the identical symptom after the fix above shipped, with a fresh trace showing
a true tight infinite loop (not resubscription churn) for a single design. Independent review
traced this to a **different** effect in the same file — the Amendment 2 live-design
backend-completion reconciliation effect — which also had `options` in its dependency array, but
whose body directly triggers `reloadDesigns()` on every run where the selected design's live status
is `"needs_review"`, with nothing advancing the selection away from it. This is a genuine
self-feeding loop distinct from (and missed by) the review above, which had examined this exact
effect and incorrectly concluded it was safe because it "is not a subscribe/unsubscribe cycle" — a
correct but insufficient observation, since a plain effect's body can loop on its own dependency
without any subscription involved.

**First-draft fix review finding (regression, corrected before shipping):** the initial fix wrote a
one-shot guard (`alreadyReconciledLiveDesignIdRef`) but never reset it, which would have
permanently blocked reconciliation for any design later reprocessed (e.g. via Retry/Rerun) and
completed a second time. Required fix: reset the guard when it currently holds the same design's ID
that has moved off `"needs_review"`.

**Final independent review** (after the correction): confirmed the reset condition is scoped to
`alreadyReconciledLiveDesignIdRef.current === liveDesign.id` before clearing, so a different
design's guard state is never disturbed. Hand-traced the full render/reload sequence and confirmed
`liveDesign` gets a new object reference on every Firestore snapshot even with unchanged content —
meaning the effect can still re-run more often than the dependency array alone suggests, but the
one-shot guard (not the dependency array) is what actually prevents a repeat `reloadDesigns()` call,
and does so correctly. Confirmed this fix, together with the fix reviewed above, resolves both loop
shapes reported by the owner across both rounds of feedback, and confirmed no further loop risk
remains anywhere else in the file.

## Verdict

**approved.** No further changes required.
