# Implementation Review: Studio Print Request Deep-Link Tab Integrity

Date: 2026-08-03 (initial pass); addended 2026-08-03 (follow-up pass)
Branch reviewed: `fix/studio-print-request-deep-link-tab-integrity`
Commits reviewed: `368530b25259e90366ea4ccf7bdfa08200b2caf9` (initial pass), plus
`eaa9023a4deb7756af05a227478b461e41535a71` (follow-up pass — final branch HEAD)
Diff base: `origin/production` at `7b75bd7d51858f12e0f397e7e3eec15bc88198e4`
Plan: `docs/workflow/plans/2026-08-03-production-studio-print-request-deep-link-tab-integrity-plan.md`
Prior Formal Review (Plan phase): `docs/workflow/reviews/2026-08-03-production-studio-print-request-deep-link-tab-integrity-review.md`
(verdict: APPROVED WITH REQUIRED AMENDMENT)
Test Report (author's own, being independently re-verified here): `docs/workflow/reviews/2026-08-03-production-studio-print-request-deep-link-tab-integrity-test-report.md`

Reviewer stance: independent re-verification against the actual committed diff and a standalone
reproduction of the merge logic — not a re-read of the author's own Test Report's claims taken at
face value. This review re-derived every finding from source and, where a concern was suspected,
constructed and ran an isolated reproduction before recording it as confirmed.

## FINAL VERDICT (follow-up pass, commit `eaa9023`): APPROVED — NO REMAINING REQUIRED CHANGES

The required follow-up identified in §7 below (the initial pass's finding) has been independently
re-verified as correctly and completely fixed in commit `eaa9023`. See the "Follow-Up Review" section
appended below §8 for the full independent re-verification of all 8 checks requested for this pass.
The sections below this point (§1–§8, "Files reviewed," "Confirmation," "Final commit SHA," "Next
approval phrase") are the **original, unmodified initial-pass review** of commit `368530b`, preserved
as the historical record of that pass. They are superseded where noted by the Follow-Up Review section
that follows.

## Verdict (initial pass, commit `368530b`): APPROVED WITH ONE REQUIRED FOLLOW-UP FIX

The core fix for both originally reported defects is correct, narrowly scoped, and verified sound.
This review found **one new, real, reproducible defect introduced by the Defect B fix itself** — a
narrow summary-data cross-contamination bug distinct from (and not overlapping with) either
originally reported symptom. It does not reproduce the owner's reported bug (wrong tab / wrong list
membership) and does not warrant blocking this fix from landing, but it must be corrected before this
branch is considered fully closed, since it is a genuine correctness regression this review can
concretely demonstrate, not a theoretical concern.

## 1. Deep link prefers the request's authoritative `queueTab` — CONFIRMED

`git diff origin/production..HEAD -- .../pages/UpcomingShowsPage.tsx` shows the link-tab computation
was changed from a direct `derivePrintRequestListTab(...)` call to
`resolveShowQueuePrintRequestLinkTab({ matchedRequest, ...totals })`. Re-read
`resolveShowQueuePrintRequestLinkTab` in the committed `showQueuePrintRequestSources.ts`: it returns
`input.matchedRequest.queueTab` whenever truthy, before ever touching the totals-derived fallback.
Independently confirmed via the new unit test
`"prefers the matched request's own queueTab over recomputing from local totals"`, which passes
deliberately stale/zero totals alongside a `queueTab: "queued"` match and asserts the result is
`"queued"` — re-ran this exact test locally, passes. **Confirmed.**

## 2. Stale allocation totals can no longer send a queued request to Working — CONFIRMED

Traced the actual staleness source identified in the Plan/Review:
`usePrintRequestAllocationTotals` fetches `listAllShowAllocations` once per mount and its `reload` is
never called from `UpcomingShowsPage.tsx` (re-confirmed unchanged in this diff — this hook itself was
correctly left untouched, matching the Plan's explicit scope boundary). Because
`resolveShowQueuePrintRequestLinkTab` now short-circuits on `queueTab` before ever consulting those
stale totals, the staleness of `allocationTotalsByRequestId` is now irrelevant to the tab decision
whenever `queueTab` is present — which it always is for any request that has ever had an item or
allocation write since the Wave C backfill. Constructed and ran a standalone reproduction mirroring
the exact reported scenario (fresh queueTab, stale/zero totals) — resolves to `"queued"`, matching the
new unit test's coverage of this same case. **Confirmed.**

## 3. Requests are only merged into the tab matching their own `queueTab` — CONFIRMED, with a caveat (see §7)

Re-read `mergeShowQueuePrintRequestSources`: `requestsById.set(request.id, request)` only executes
after `if (request.queueTab && request.queueTab !== source.tab) { continue; }` — a request whose
`queueTab` disagrees with the source it was found in is skipped for the **`requests`** output.
Independently reproduced the pre-fix contamination scenario in isolation (a `queueTab: "queued"`
request placed in a `tab: "working"` source) and confirmed it is correctly excluded from
`merged.requests`. Also confirmed a request with no `queueTab` (pre-backfill legacy document) is
still admitted from any source, matching the Plan's Required Decision 2 and the field's own "mirror,
never authoritative when absent" documented fallback behavior. **The `requests` array itself is
correct.** However, the **`summariesByRequestId`** side of the same merge function does not carry the
same protection — see §7, a new defect found by this review, distinct from this check's original
scope.

## 4. No full-collection scan, new listener, backend/Rules/index/Portal change, or unrelated formatting — CONFIRMED

```
git diff origin/production..HEAD --name-only | grep -v "^docs/"
```
returns exactly 4 non-doc files, all under `apps/studio/src/renderer/src/features/upcoming-shows/`:
`useShowQueuePrintRequests.ts`, `UpcomingShowsPage.tsx`, `showQueuePrintRequestSources.ts`,
`showQueuePrintRequestSources.test.ts`. Grepped the full diff for `onSnapshot`, `getDocs`,
`listAllShowAllocations`, and `collection(` — zero matches; no new Firestore listener or
collection-level query was introduced anywhere in this diff. No file under `functions/`,
`firestore.rules`, `firestore.indexes.json`, `storage.rules`, or `apps/portal/` appears anywhere in
the diff. Confirmed `PrintRequestsPage.tsx` has an empty diff against `origin/production`
(`git diff origin/production..HEAD -- .../pages/PrintRequestsPage.tsx` produced no output) — no
unrelated change leaked into that file. Every diff hunk reviewed is directly attributable to one of
the two defect fixes or their test coverage; no stray whitespace/formatting-only changes found in
any hunk. **Note:** the pre-existing `usePrintRequestAllocationTotals` full-collection-scan pattern
(flagged as a separate, out-of-scope finding by the Plan-phase Formal Review) remains present and
unmodified — correctly left alone, not worsened, and correctly not included in this diff. **Confirmed.**

## 5. All three tab sources are loaded without duplicating requests or increasing unbounded reads — PARTIALLY CONFIRMED, see §7

`useShowQueuePrintRequests.ts`'s diff changes `ensureRequestsLoaded` from being called once (via the
`working` source only) to being called on all three sources (`ensureWorkingRequestsLoaded`,
`ensureQueuedRequestsLoaded`, `ensurePrintingRequestsLoaded`) for the same `attachedIds` array. This
is a real, bounded change in read volume: for each attached request ID, this now issues **up to three
`getPrintRequestsByIds`-family reads instead of one** (one per source's own `usePrintRequests`
instance), each bounded to the exact `attachedIds` list — never unbounded, never a collection scan,
never proportional to total corpus size, and each is a plain direct-by-ID Firestore read (not a new
`onSnapshot` listener). This is the necessary and correctly-reasoned cost of the fix: without loading
into all three sources, an attached request whose tab isn't `working` would have no
tab-matching source to be admitted from at all (a regression the author's own Plan/Review already
anticipated and this review independently re-confirms is required, not incidental bloat). **No
duplicate requests appear in the final `requests` output** (confirmed via §3's tab-matching guard and
the `Map`-keyed `requestsById` accumulator, which is inherently duplicate-free by ID). **The 3x
redundant summary/allocation-totals fetch per attached request is real but bounded and consistent
with the architecture's existing "bounded reads over exact IDs" pattern** — it is not a scan and does
not grow with unrelated data, so this review does not consider it disqualifying, though it is a minor
efficiency cost worth noting for a future pass (not blocking, not in this task's stated scope). The
correctness consequence of fetching the same ID three times **is** blocking — see §7.

## 6. Direct links and manual tab navigation remain correct — CONFIRMED

`PrintRequestsPage.tsx` (the page that actually renders tabs and handles both direct URL entry and
in-page tab-button clicks) has a byte-for-byte empty diff against `origin/production`. Its tab
resolution (`isPrintRequestRouteTab(tabParam) ? tabParam : "working"`), canonical-route effect
(`resolveCanonicalPrintRequestsRoute`), and tab-bar click handlers are all completely untouched by
this fix — this fix only changes what `tab` value `UpcomingShowsPage.tsx` puts into the link it
constructs, never how `PrintRequestsPage.tsx` interprets a `tab` value once navigated to. The three
other pre-existing `getPrintRequestsPath(` call sites (`DesignLibraryPage.tsx`,
`CustomerUploadIntakeSection.tsx`, `staffInboxNavigation.ts`) were independently re-checked in the
Plan phase to not share the buggy recomputation pattern and are confirmed still untouched in this
diff. **Confirmed.**

## 7. New finding: `summariesByRequestId` cross-source overwrite in `mergeShowQueuePrintRequestSources`

**This is not one of the two originally reported defects and does not reproduce the owner's bug.**
It is a new, narrow correctness defect introduced as a side effect of fixing Defect B, found by
independently reproducing the merge function's behavior outside the existing test suite rather than
trusting the shipped tests' coverage.

**Mechanism:** in `mergeShowQueuePrintRequestSources`, the `requests` loop correctly guards admission
with `if (request.queueTab && request.queueTab !== source.tab) continue;` before
`requestsById.set(...)`. But the summary-merging step that follows is guarded only by
`requestsById.has(requestId)` — a check against the **global, cross-source accumulator**, not
"was this specific request admitted from *this* specific source." Since `useShowQueuePrintRequests.ts`
(by this same commit's own Defect B fix) now calls `ensureRequestsLoaded` on **all three** sources for
every attached request ID, any attached request's `summariesByRequestId` entry can legitimately exist
in more than one source's local state — each source performs its own independent
`listPrintRequestItemSummariesForRequests` fetch for that ID. `mergeShowQueuePrintRequestSources`
processes sources in the fixed order `[working, queued, printing]`
(`useShowQueuePrintRequests.ts`'s `sources` array), and `Object.assign` means whichever source is
processed **last** silently overwrites any earlier source's summary for the same ID — regardless of
whether that later source's copy of the request was actually admitted into `requests`.

**Reproduction (constructed and run by this review, not present in the shipped test suite):**

```js
// Matches production's fixed source order [working, queued, printing].
// Request's real queueTab is "queued" — correctly admitted into `requests` only from the
// `queued` source (§3 confirms this part is correct).
const queuedRequest = { id: "queued-request", queueTab: "queued" };

mergeShowQueuePrintRequestSources([
  { tab: "working",  requests: [queuedRequest], summariesByRequestId: { "queued-request": { totalQuantity: 1,   uniqueDesignCount: 1 } } },
  { tab: "queued",   requests: [queuedRequest], summariesByRequestId: { "queued-request": { totalQuantity: 5,   uniqueDesignCount: 2 } } }, // CORRECT value
  { tab: "printing", requests: [queuedRequest], summariesByRequestId: { "queued-request": { totalQuantity: 999, uniqueDesignCount: 999 } } }, // wins because processed last
]);
// => summariesByRequestId["queued-request"] is { totalQuantity: 999, uniqueDesignCount: 999 }
```

Result: the `printing` source's summary silently wins, even though `printing` never admitted this
request into `requests` at all (it was correctly rejected there by the tab guard). Confirmed via a
second, order-varied reproduction that the *last-processed* source always wins regardless of
correctness — this is a genuine last-write-wins race across independently-fetched, potentially
transiently-differing summary data (each source's `hydratePage` call is a separate async Firestore
read of the same request's items at a slightly different moment), not merely a theoretical concern.

**Why the shipped test suite did not catch this:** the new test
`"admits a request into whichever source's tab actually matches its queueTab, even when also present
elsewhere"` exercises exactly this multi-source-presence scenario, but its `source()` test helper
assigns an identical `{ totalQuantity: 1, uniqueDesignCount: 1 }` summary to every request in every
source by construction (see the helper's `Object.fromEntries(requests.map((entry) => [entry.id, {
totalQuantity: 1, uniqueDesignCount: 1 }]))`), so an overwrite is indistinguishable from a correct
result in that test — the test cannot detect this defect no matter which source wins, because all
candidate values are identical. This satisfies check #7's request to assess whether the tests
*meaningfully* reproduce the defects: they meaningfully cover the `requests`-array tab-matching
guard (§3) but do not meaningfully cover the summary-merge path's independence from that guard.

**Severity assessment:** narrow. It requires an attached request to be present in more than one
source's local state simultaneously (now a near-certainty given the Defect B fix's all-three-sources
`ensureRequestsLoaded` call) and for those sources' independently-fetched summaries to differ at the
moment of merge (only possible during a genuine concurrent item-count change on that exact request,
a narrow window). Impact is confined to the Show Queue page's own "+ Add Print Request" picker
quantity/design-count display and any other consumer of `usePrintRequestAllocationTotals`... no —
specifically, the exact-same `summariesByRequestId` consumed by `buildShowQueuePrintRequestOptions`
and the Attached Print Requests row's quantity/design-count labels on `UpcomingShowsPage.tsx` alone;
it does not affect `PrintRequestsPage.tsx` (confirmed via §6, that page's own separate hook instance)
and does not reproduce or worsen either originally reported symptom.

**Required follow-up (not blocking this branch's core fix, but must land before this task is fully
closed):** scope the summary admission to the same per-source, per-request tab-match guard already
used for the `requests` loop — e.g. only assign a source's summary entry for a request ID when that
same source's iteration actually admitted that request (track admitted IDs per-source-iteration
rather than checking the cross-source accumulator), or equivalently only take a summary from the one
source whose `tab` matches the final admitted request's own `queueTab`. This is a small, local change
confined entirely to `mergeShowQueuePrintRequestSources` and does not require touching
`useShowQueuePrintRequests.ts`, `UpcomingShowsPage.tsx`, or any other file.

## 8. Final committed tree and commit count — CONFIRMED

```
git status --porcelain          -> (empty; clean)
git rev-parse HEAD               -> 368530b25259e90366ea4ccf7bdfa08200b2caf9
git rev-parse origin/production  -> 7b75bd7d51858f12e0f397e7e3eec15bc88198e4
git rev-list --count origin/production..HEAD -> 1
```

Exactly one commit ahead of `origin/production`, working tree clean. **Confirmed.**

## Files reviewed (exact list)

- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` (full diff
  against `origin/production`; confirmed empty diff for the tab-rendering/route-resolution logic
  this task must not touch)
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts` (full
  diff)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts` (full
  diff, full current content re-read)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.test.ts`
  (full diff)
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` (confirmed
  empty diff)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequests.ts` (re-read
  `ensureRequestsLoaded`/`hydratePage`, confirmed unmodified and confirmed the mechanism behind both
  §5's 3x-read cost and §7's new finding)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestAllocationTotals.ts`
  (re-confirmed unmodified, out of scope, correctly not touched)
- Full non-doc file list via `git diff origin/production..HEAD --name-only`
- Full diff via `git diff origin/production..HEAD --stat` and per-file `git diff`
- `git log --oneline origin/production..HEAD`, `git rev-parse HEAD`,
  `git rev-parse origin/production`, `git rev-list --count origin/production..HEAD`,
  `git status --porcelain`, `git branch -r --list` (push-status check)
- Independent standalone reproductions of `mergeShowQueuePrintRequestSources`'s behavior (not part
  of the repo, run in a scratch location, not committed)

## Confirmation

- **Branch has NOT been pushed** — `git branch -r --list "*fix/studio-print-request-deep-link-tab-integrity*"` returns no results, and `git log origin/fix/studio-print-request-deep-link-tab-integrity` fails with "unknown revision," confirming no remote-tracking ref exists for this branch.
- No production resource (Firestore Rules, indexes, Cloud Functions, App Hosting, Portal) was read-write touched by this review or by the reviewed commit.
- No PR was opened, no merge performed, no installer built, no Release published.
- This review created only this one document.

## Final commit SHA

`368530b25259e90366ea4ccf7bdfa08200b2caf9`

## Next approval phrase (superseded by the Follow-Up Review below)

Once the required follow-up in §7 is implemented and independently re-verified:

```
APPROVE STUDIO PRINT REQUEST DEEP-LINK TAB INTEGRITY SUMMARY MERGE FOLLOW-UP
```

---

# Follow-Up Review (2026-08-03): verification of the summary-merge fix (commit `eaa9023`)

Final branch HEAD reviewed: `eaa9023a4deb7756af05a227478b461e41535a71`
Diff base: `origin/production` at `7b75bd7d51858f12e0f397e7e3eec15bc88198e4`
Both commits reviewed together: `368530b` (initial fix) + `eaa9023` (summary-merge follow-up)

Reviewer stance for this pass: every check below was independently re-derived — re-reading the
actual committed file content via `git show`, writing fresh standalone reproductions rather than
reusing the initial pass's scripts unmodified, and physically swapping the working tree to the
pre-follow-up source to confirm the regression test's discriminating power, rather than trusting the
prior pass's or the author's own Test Report's narrative.

## Pre-checks: branch state

```
git status --porcelain                          -> (empty; clean)
git rev-parse HEAD                                -> eaa9023a4deb7756af05a227478b461e41535a71
git rev-parse origin/production                   -> 7b75bd7d51858f12e0f397e7e3eec15bc88198e4
git rev-list --count origin/production..HEAD       -> 2
git log --oneline origin/production..HEAD          -> eaa9023, 368530b
git branch -r --list "*fix/studio-print-request-deep-link-tab-integrity*" -> (no output; not pushed)
```

## 1. `mergeShowQueuePrintRequestSources` only admits a request into the source matching its `queueTab` — CONFIRMED

Re-read the final committed function body via `git show HEAD:.../showQueuePrintRequestSources.ts`.
The `requests` loop's admission guard (`if (request.queueTab && request.queueTab !== source.tab) {
continue; }` before `requestsById.set(...)`) is unchanged from the initial pass and was re-verified
via a freshly written reproduction: a `queueTab: "queued"` request placed only in a `tab: "working"`
source is correctly excluded from `merged.requests`; the same request placed in a `tab: "queued"`
source is correctly included. **Confirmed.**

## 2. A source may only contribute a `summariesByRequestId` entry for a request it admitted — CONFIRMED

Re-read the follow-up's exact change: `admittedIdsThisSource` is a `Set<string>` scoped to each
source's own loop iteration, populated only inside the same `if` guard that gates `requestsById.set`,
and the summary-merge step now filters on `admittedIdsThisSource.has(requestId)` instead of the
cross-source `requestsById.has(requestId)` used in the initial (defective) version. This structurally
ties summary admission to the identical per-source condition as request admission — there is no code
path by which a source can contribute a summary entry for an ID its own `requests` loop rejected.
**Confirmed by direct source inspection**, not merely by test-passing.

## 3. A mismatched `working`, `queued`, or `printing` source cannot overwrite a correct summary from another source — CONFIRMED, and found to be stronger than required (order-independent)

Wrote a fresh reproduction (not reused from the initial pass) that runs the exact three-source
scenario from §7 of the initial-pass review across **all three possible permutations** of source
processing order (`[working,queued,printing]`, `[printing,queued,working]`,
`[queued,working,printing]`), each time confirming `merged.summariesByRequestId["q1"]` equals the one
correct value (`{ totalQuantity: 5, uniqueDesignCount: 2 }`) from the `queued` source, never the
`working` or `printing` sources' distractor values (`111`/`111` and `999`/`999` respectively),
regardless of which order they were processed in. This is a **stronger property than the initial
review required**: the original defect was order-dependent (only reachable because
`useShowQueuePrintRequests.ts` happens to fix the order `[working, queued, printing]`); this fix
removes the dependency on iteration order entirely, so it is not merely a fix for the one reachable
ordering but a structurally sound fix for all orderings. **Confirmed, exceeds the required bar.**

## 4. The regression test genuinely fails without the follow-up and passes with it — CONFIRMED (physically verified, not inferred)

Rather than trusting the Test Report's claim, this review physically reproduced the before/after
by copying `git show 368530b:.../showQueuePrintRequestSources.ts` (the pre-follow-up source) over
the working tree's file, running the final `showQueuePrintRequestSources.test.ts` (from `eaa9023`)
against it, and observing the result:

```
# tests 10
# pass 9
# fail 1
not ok 4 - never lets a source that did not admit a request overwrite that request's summary
           from a source that did (Implementation Review finding, 2026-08-03)
```

Confirmed it is exactly the intended new regression test that fails, and no other test (including
both original-defect regression tests, §5 below) is affected by the pre-follow-up source. The working
tree file was then restored to the committed `eaa9023` state (`cp` back the backed-up committed
version), and the suite was re-run, confirming **10/10 pass** and `git status --porcelain` /
`git diff --stat` both empty (no residual difference from the commit). **Confirmed — the test has
genuine discriminating power, not a vacuous or coincidental pass.**

## 5. Existing tests still cover the two original defects — CONFIRMED

Re-read the final test file in full via `git show HEAD:...test.ts`. Both original-defect regression
tests are present, unmodified in substance, and semantically sound:

- **Queued deep links resolving to the Queued tab:**
  `"prefers the matched request's own queueTab over recomputing from local totals"` — asserts
  `resolveShowQueuePrintRequestLinkTab` returns `"queued"` given a `queueTab: "queued"` match and
  deliberately stale/zero totals, directly covering the original Defect A staleness mechanism.
- **Queued requests not contaminating the Working requests array:**
  `"does not admit a request into a source whose tab disagrees with the request's own queueTab"` —
  asserts `merged.requests` is empty when a `queueTab: "queued"` request is placed only in the
  `working` source, directly covering the original Defect B contamination mechanism.

Both were re-run as part of the full 10-test suite (§4) and pass against the final committed code.
**Confirmed.**

## 6. No unbounded scan, new listener, backend/Rules/index/Portal change, dependency, or unrelated formatting — CONFIRMED

```
git diff origin/production..HEAD --name-only | grep -v "^docs/"
```
returns exactly the same 4 non-doc files as the initial pass — no additional file was touched by the
follow-up commit. Re-grepped the full `origin/production..HEAD` diff for `onSnapshot`, `getDocs`,
`listAllShowAllocations`, `collection(` — zero matches, confirming the follow-up commit introduced no
new listener or query of any kind (it is pure local `Set`-based bookkeeping). Independently confirmed
no `functions/`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `apps/portal/`, or any
`package.json` file appears anywhere in the full two-commit diff. Reviewed the follow-up commit's
isolated diff (`git diff 368530b..eaa9023`) line by line: 9 inserted lines (mostly a comment
explaining the fix's rationale) and exactly 1 changed line
(`requestsById.has(requestId)` → `admittedIdsThisSource.has(requestId)`) in the source file, plus
purely additive test/doc content — no reformatting, no incidental changes. **Confirmed.**

## 7. Direct links and manual tab navigation remain correct (carried forward from initial pass) — RE-CONFIRMED

`PrintRequestsPage.tsx` still has a byte-for-byte empty diff against `origin/production` across both
commits combined — the follow-up commit did not touch it either. **Re-confirmed.**

## 8. `usePrintRequestAllocationTotals`'s full-collection scan remains a separate, out-of-scope, undocumented-as-fixed finding — CONFIRMED

```
git diff origin/production..HEAD -- apps/studio/.../usePrintRequestAllocationTotals.ts
```
produces an empty diff — confirmed untouched by either commit. Re-checked that all three governing
documents (this Implementation Review's initial-pass §4/§5, the Plan-phase Formal Review, and the
Test Report addendum) consistently describe this hook's `listAllShowAllocations` full-collection-scan
pattern as a related-but-separate, explicitly out-of-scope finding — none of them claim it was fixed,
silently expand this task's scope to include it, or contradict each other on this point. **Confirmed
not silently expanded into this remediation.**

## Final Verdict

**APPROVED.** All 8 requested checks independently re-verified against the actual final two-commit
branch state, with several (checks 3 and 4) verified via physical reproduction rather than
inference. No remaining required changes. This branch's implementation is complete and correct for
the scope defined in the Plan.

## Any remaining required changes

None. The one item noted as informational-only (not required): `usePrintRequestAllocationTotals`'s
full-collection scan remains a legitimate candidate for a future, separately-scoped tech-debt pass —
this is unchanged guidance from the initial review, not a new requirement, and does not block this
branch.

## Exact files reviewed (this follow-up pass)

- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts` (full
  content via `git show HEAD:...`; isolated follow-up diff via `git diff 368530b..eaa9023`)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.test.ts`
  (full content via `git show HEAD:...`)
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` (confirmed
  empty diff across both commits combined)
- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts`
  (confirmed unchanged by the follow-up commit specifically)
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx` (confirmed
  empty diff)
- `apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestAllocationTotals.ts`
  (confirmed empty diff)
- Full diff via `git diff origin/production..HEAD --stat`/`--name-only` and
  `git diff 368530b..eaa9023 --stat`
- `git log`, `git rev-parse`, `git rev-list --count`, `git status --porcelain`,
  `git branch -r --list` (all re-run fresh for this pass)
- Independent, freshly-written standalone reproductions (not reused unmodified from the initial
  pass) of `mergeShowQueuePrintRequestSources`'s behavior, including an order-permutation test not
  present in the initial pass
- Physical working-tree swap to the pre-follow-up commit's source file, re-running the final test
  suite against it, then restoring and re-confirming a clean tree

## Test results independently verified (this follow-up pass)

| Check | Result |
|---|---|
| Full `showQueuePrintRequestSources.test.ts` suite against final `eaa9023` code | **10/10 pass** |
| Same test file against `368530b`'s (pre-follow-up) source, via physical file swap | **9/10 pass, exactly the intended new test fails** |
| Working tree after swap-back | clean, byte-identical to commit |
| Fresh order-permutation reproduction (3 orderings) of the summary-merge fix | all 3 orderings correct |
| `npm run lint` | exit 0, 0 warnings |
| Studio typecheck (`tsc --noEmit`, after generating the build-time config) | exit 0 |
| `git diff --check` | exit 0 (benign CRLF-normalization warnings only) |

## Confirmation that the branch remains unpushed

`git branch -r --list "*fix/studio-print-request-deep-link-tab-integrity*"` returns no results —
confirmed no remote-tracking ref exists for this branch. No push, PR, merge, installer build, or
Release publish action was performed by this review.

## Final branch commit SHA

`eaa9023a4deb7756af05a227478b461e41535a71`

## Next exact approval phrase (for pushing and opening the production PR)

```
APPROVE STUDIO PRINT REQUEST DEEP-LINK TAB INTEGRITY PUSH AND OPEN PRODUCTION PR
```
