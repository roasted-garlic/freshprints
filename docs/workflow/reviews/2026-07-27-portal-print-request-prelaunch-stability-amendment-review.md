# Portal Print Request Pre-Launch Stability — Amendment Review

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (focused, independent review of Plan Section 19 only — the amendment
  documenting the owner's runtime QA `FAIL` and corrected remediation)
- **Plan amendment reviewed:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 19
- **Prior Implementation Review reviewed for context (not deferred to):**
  `docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review.md`

---

## 1. Verdict

**`approved_with_changes`**

One non-blocking-but-should-fix wording issue in 19.3, and one point in 19.2/19.6 that needs
tightening before Implement (below). No blocking findings against the root-cause diagnosis or the
core remediation direction — both are correct and independently reproducible from source.

---

## 2. Independent confirmation of the root-cause claim

I opened and traced (not merely grepped) `PrintRequestDetailView.tsx`, `usePrintRequestDetail.ts`,
`useWorkingCurrentRequestItems.ts`, `mergeServerWorkingItemsWithLocal.ts`, and
`PortalPrintRequestItemCard.tsx` as they exist in the current tree. The claim holds exactly as
written.

**Context destructure (raw function, not a wrapped one):**
`PrintRequestDetailView.tsx` L71-81 destructures `reloadWorkingItems` directly from
`usePortalPrintRequests()`. Confirmed via `PortalPrintRequestContext.tsx` L97/L163 that this is the
same function object returned by `useWorkingCurrentRequestItems` — no interposed guard.

**The three handlers, confirmed at their actual current line numbers:**
- `handleUpdateItem` (`PrintRequestDetailView.tsx` L192-203): `await updateItem(item.id, input);`
  then unconditionally `void reloadWorkingItems({ silent: true });` (L199-200).
- `handleDuplicateItem` (L205-219): `await duplicateItem(item.id);` then
  `void reloadWorkingItems({ silent: true });` (L210-211) inside the try block.
- `handleRemoveItem` (L221-237): `await removeItem(item.id);` then
  `void reloadWorkingItems({ silent: true });` (L227-229) inside the try block.

All three fire the raw reload after — never conditioned on — the hook's own reconciliation
completing successfully.

**The guard is already cleared by the time the second reload starts, confirmed by control flow:**
`usePrintRequestDetail.removeItem` (L545-608) calls `beginItemMutation` (L557) and, while viewing the
working request, `beginPendingItemRemovals([itemId])` (L566) **before** awaiting the callable, and
`endPendingItemRemovals([itemId])` in its `finally` (L592-596). Because `handleRemoveItem` does
`await removeItem(item.id)` and only then calls `reloadWorkingItems`, `removeItem`'s `finally` (which
runs synchronously as part of that same awaited call resolving) has already cleared
`pendingRemovedItemIdsRef` for that id by the time `handleRemoveItem`'s own
`reloadWorkingItems({ silent: true })` starts. This is exactly the sequencing claimed — not merely
"the guard exists," but "the guard is provably not active during the window that matters."

**`mergeServerWorkingItemsWithLocal.ts`'s contract genuinely works against this reload:**
L33-49 (`preservedLocal` filter): `if (serverIds.has(item.id)) return false;` (L34) drops any local
row whose id also appears in the server response — i.e., **server rows win on matching id,
unconditionally**, with no timestamp or generation comparison. A stale-but-still-server-authored row
for a removed or pre-edit item is indistinguishable, from this function's point of view, from a
genuinely fresher one. This is not a hypothetical: `reloadWorkingItems`
(`useWorkingCurrentRequestItems.ts` L134-243) calls `portalPrintRequestService.listPrintRequestItems`
(L163) — a real, unguarded network round trip — and merges via this exact function at L177. Firestore
read-after-write consistency after a just-issued delete/update is not guaranteed to reflect
instantaneously on a subsequent independent query, so the claimed race window is ordinary, not
exotic.

**The resurrected state flows back into rendered `items` via the sync effect, confirmed:**
`cartSignature` (`usePrintRequestDetail.ts` L183-186) is derived from `workingItems` whenever
`isViewingWorkingRequest`. The effect at L191-243 (specifically L212-218) applies
`setItems(sortWorkingCurrentRequestItems(workingItems))` whenever `cartSignature` differs from
`lastSyncedWorkingSignatureRef.current` — which it will, once the stale merge in
`useWorkingCurrentRequestItems` changes `workingItems`'s contents/order. This overwrites the
just-corrected local `items` state that `removeItem`/`updateItem` had already set correctly moments
earlier.

**Verdict on root cause: confirmed, not merely plausible.** The three handlers fire an independent,
unguarded, real server round trip immediately after the properly-reconciled hook call, and the merge
function's own documented contract ("server rows win on matching id") means a genuinely-fresh-looking
but logically-stale response is kept, not discarded — precisely because nothing in this path compares
against a generation/version, only against id presence.

**Second contributing cause (item card), confirmed:**
`PortalPrintRequestItemCard.tsx` prop-sync effect (L216-230) compares `incomingSignature` (built from
incoming `item.quantity`/size props) against `lastSavedSignatureRef.current`, and if different, resets
`quantityInput` and advances `lastSavedSignatureRef.current` to the incoming (possibly stale) value
(L229). `lastSavedSignatureRef.current` is otherwise only advanced in `saveDraft`'s success branch
(L334). Both race the same unguarded `reloadWorkingItems({ silent: true })` from `handleUpdateItem`.
If that reload's stale response reaches the card as a new `item` prop before or during `saveDraft`'s
own resolution, the effect fires with a signature that doesn't match `lastSavedSignatureRef.current`
(because the ref hasn't yet been advanced by `saveDraft`'s own success branch, or was already advanced
to the stale value first) and silently reverts the input to the stale quantity. Confirmed exactly as
described — this component has no way, today, to distinguish "genuine newer external edit" from
"stale reload of pre-save data," because both look identical: an incoming prop whose signature differs
from the last-known-saved one.

---

## 3. Assessment of proposed remediation (19.2)

**Minimality and correctness: sound.** Removing the three redundant `reloadWorkingItems({ silent:
true })` calls in `PrintRequestDetailView.tsx` (L200, L211, L229) is the correct minimal fix, because:

- `usePrintRequestDetail.updateItem`/`removeItem`/`duplicateItem` already synchronously patch
  **both** `items` (local) and `workingItems` (via `patchWorkingItems`,
  confirmed at L318-325/L577-581/L415+L458) on success — the component-level reload adds no
  information the reconciled hook state doesn't already have; it only reintroduces the exact race
  the hook's own generation/pending-removal machinery was built to prevent.
- Grepped every call site of `reloadWorkingItems` across `apps/portal` (30 matches). The only calls
  that need removing are the three in `PrintRequestDetailView.tsx` (L200, L211, L229). All other
  callers — `CurrentRequestDrawer.tsx` (L210, L298), `useAddDesignToRequestFlow.ts` (L223),
  `AssistedCreationDetailPanels.tsx` (L164, L596), `useWorkingCurrentRequestItems.ts`'s own internal
  `useEffect` (L260) — are unrelated call sites that do not have a preceding reconciled-hook call
  racing them, and Section 19.2 does not propose touching any of them. This is a narrow, correctly
  scoped removal, not a blanket "stop calling `reloadWorkingItems`."

**Regression risk against Section 8 item #2: none identified.** Section 8 item #2's actual fix lives
entirely inside `usePrintRequestDetail.ts` (the `beginItemMutation`/`beginPendingItemRemovals`/
`patchWorkingItems`/`isLatestItemMutation` wiring) and is untouched by 19.2's proposed removal — the
amendment removes only the extra, always-redundant-on-success reload that sits *after* that fix's own
synchronous reconciliation. The one place Section 8 item #2's design *does* still call
`reloadWorkingItems` — `updateItem`'s **error path**, gated by `isLatestItemMutation` (L341-346) — is
inside the hook, not the component, and is explicitly out of scope for 19.2's removal (it is the
"remains" case 19.2.1 describes, and it already carries the generation guard). No other consumer of
`workingItems`/the reload timing was found to depend on the component-level reload specifically:
`CurrentRequestDrawer.tsx` and `useAddDesignToRequestFlow.ts` trigger their own reloads independently
of the detail page's handlers and are unaffected by removing the detail page's redundant calls.

**Item 19.2's fallback clause is appropriately hedged.** "If a specific known scenario still needs a
reconciling reload... that reload must carry the same per-item generation guard" is the right
contingency and correctly generalizes the existing pattern rather than inventing a new one.

**Item 19.2.2 (item-card guard) is correctly framed as conditional on Implement-time verification.**
Given that removing the racing reload (19.2.1) eliminates the specific stale-response race that
drives the effect's incorrect overwrite, it is plausible the two defects collapse to one fix. The
amendment's own "`[NEEDS REPO CHECK]`... verify at Implement time rather than assuming a second change
is still needed" is the right level of rigor — I did not find evidence that a second, independent race
(one not caused by the same removed reload) also reaches this effect, but I also could not rule out
a residual risk from the other reload paths already in the app (e.g. `CurrentRequestDrawer.tsx`'s
`reloadWorkingItems({ silent: true })` at L210/L298, which is not being removed and could in principle
still deliver a stale prop to a mounted item card if the drawer and detail page are ever both mounted
concurrently against the same item — this is a pre-existing, out-of-scope condition, not a new one
introduced by this amendment, but Implement should keep 19.2.2 open until it is checked against this
path specifically, not just against the three removed calls).

---

## 4. Assessment of the `Request Again` copy correction (19.3)

Trivial, and the cited location is accurate: `PortalPrintRequestItemCard.tsx` L182-183 gates
`showCatalogReuse`; the button and its `aria-label` are rendered at L538-575 (I read this block in
Section 2's related trace above and independently in the prior Implementation Review's citations,
consistent at L542-562/L543). Changing the visible text and `aria-label` from "Print again"/`` `Print
${title} again` `` to "Request Again"/`` `Request ${title} again` `` (or equivalent) is a pure string
change with no behavior implication — `onAddToRequest`/wiring is explicitly unchanged per 19.3's own
text, consistent with everything else in this gated block. No issue found.

One minor wording note (non-blocking): 19.3 says "the owner has changed the exact required visible
text... to exactly **`Request Again`**" but its own example `aria-label` uses lowercase-again
(`` `Request ${title} again` ``) — inconsistent capitalization between the visible label ("Request
Again," title case) and the aria-label ("again," lowercase). This is a copy nit for whoever implements
it to resolve one way or the other; not a defect in the diagnosis or plan quality, and not blocking,
but I flag it because Section 19.3 is the one part of this amendment where "exactly" is used and the
amendment isn't internally exact.

---

## 5. Assessment of Studio tsconfig fix approach (19.4) — plan only, not the fix

Independently re-ran both checks rather than trusting the amendment's assertions:

- `npx tsc -v` → **`Version 5.9.3`**, matching the claim exactly.
- `git log -p -- apps/studio/tsconfig.json` → confirms `"ignoreDeprecations": "6.0"` was added in
  commit `043f38a1` ("Add Portal donate-designs uploads and Studio donated designs intake," dated Mon
  Jul 13 2026), after one earlier add/remove cycle in the same file's history, and has remained
  present and unchanged since. This is two weeks before this goal's 2026-07-27 date.
- `git diff --stat -- apps/studio/tsconfig.json apps/studio/tsconfig.node.json` → **empty output**,
  confirming neither this goal's original implementation nor this amendment has touched either file.

**The diagnosis is accurate.** `ignoreDeprecations` is a real compiler option whose accepted values
are tied to the installed compiler's own deprecation schedule; TypeScript 5.9.3 does not recognize
`"6.0"` as one of its valid values for this option, producing the claimed `TS5103` unconditionally on
every `build:studio` invocation, regardless of anything else in the file.

**The proposed approach is sound, minimal, and safe as a plan for a subsequent Implement step:**
- Correctly scoped to a single line in a single file.
- Correctly forbids upgrading the `typescript` dependency or touching version pinning — the right
  call, since a broader TS upgrade is an unrelated, higher-risk, unbounded-blast-radius change this
  goal has no reason to take on.
- Correctly forbids touching `functions/tsconfig.json` / `apps/portal/tsconfig.json` without direct
  evidence of the identical defect — appropriately narrow; I have no evidence either file shares this
  defect, consistent with the amendment's own claim that `build:portal` was unaffected.
- Correctly requires that if removing/correcting the setting exposes *other* real compiler errors,
  those be honestly reported and characterized (new / pre-existing / caused-by-this-goal) rather than
  papered over — this is the same standard the original Plan/Implementation Review already applied to
  lint, so it's consistent with this goal's established rigor, not a new invented bar.
- Correctly identifies the two realistic remediation shapes (find a compiler-valid value for 5.9.3, or
  remove the setting if `skipLibCheck: true` already suppresses whatever it was meant to silence) and
  defers the actual choice to Implement-time verification rather than guessing now — appropriate,
  since I did not verify at this review stage what specific deprecation warning (if any) motivated the
  original `"6.0"` value, and doing so is Implement's job, not this review's.

No issue found with the plan for this fix. (I did not implement or test the fix itself, per this
review's scope.)

---

## 6. Assessment of the test-architecture requirement (19.6)

**Correctly diagnoses why the prior (passing) suite missed this defect.** The prior Implementation
Review (Section 3 of that review, "Non-blocking note on test architecture") itself already flagged
that `usePrintRequestDetail.test.ts` was static source-regex wiring verification, and that the actual
behavioral race coverage lived in `itemMutationGeneration.test.ts` and
`mergeServerWorkingItemsWithLocal.test.ts` — both of which test the **pure reconciliation primitives**
in isolation (i.e., "does `beginPendingItemRemovals` + a merge call correctly filter a pending-removed
id," and "does the generation tracker correctly reject a stale generation"). Neither test exercises
the actual defect's location, which is **the composition of a specific call sequence across two
different files** (`PrintRequestDetailView.tsx`'s handler awaiting the hook call and then
unconditionally calling the raw context reload) — a sequencing/call-graph property that is invisible
to a test that only calls the pure merge function directly with hand-constructed inputs, because such
a test never actually invokes `handleRemoveItem`/`handleUpdateItem` or the real `reloadWorkingItems`
in the order the rendered page does. This matches my own independent trace in Section 2 above: the
defect is not in any single function's logic (every function behaves exactly as documented/tested),
it is in an extra call site the prior tests had no reason to know existed, because no test modeled the
component-level handler at all.

**The required new-test approach would actually have caught it.** 19.6 requires either (a) a pure
extracted reconciliation function representing the exact transition (remove → resolve a stale/lagging
server list response → confirm removed item stays removed in the resulting merged/rendered array), or
(b) driving the actual `mergeServerWorkingItemsWithLocal`/hook-level functions with a realistic
stale-then-fresh input sequence that mirrors what the **redundant reload** would have produced. Either
shape, if it modeled the sequence "hook-level remove completes and clears its pending marker, *then* a
second independent reload resolves with a server list still containing the removed row," would
reproduce the actual bug (the resurrected row reappearing) against the pre-fix code and prove it fixed
against the corrected code — because that is precisely the sequence 19.1 traces. A test that only
proves the merge function filters a *currently pending* id, without ever un-marking it first and then
re-merging, does not exercise this. The amendment's requirement to test the state transition "as the
rendered page actually goes through it," not via regex/string-presence or call-was-made checks, is the
correct bar, and is more specific/actionable than the original Plan's Section 9 language (which the
prior Implementation Review had already flagged as satisfied "by composition" — an assessment this
amendment correctly does not fully accept for the amendment's own new fix, requiring true sequencing
coverage this time rather than relying on the same composition argument again).

No issue found with 19.6.

---

## 7. Blocking findings

**None.** The root-cause diagnosis is independently reproducible from source with exact line
citations, the proposed remediation is narrowly scoped and does not endanger Section 8 item #2's
existing fix or any other `reloadWorkingItems` consumer, the Studio tsconfig plan is sound, and the
test-architecture requirement is both an accurate diagnosis of the prior gap and a workable bar for
Implement.

---

## 8. Non-blocking notes

1. **19.3 capitalization inconsistency** (Section 4 above): resolve "Request Again" (title case,
   visible label) vs. "again" (lowercase, example `aria-label`) to a single consistent convention at
   Implement time — cosmetic only.
2. **19.2.2's fallback/residual-risk note** (Section 3 above): `CurrentRequestDrawer.tsx`'s own
   `reloadWorkingItems({ silent: true })` calls (L210, L298) are not part of this amendment's proposed
   removal and are a separate, pre-existing possible source of a stale prop reaching a mounted item
   card if the drawer and detail page are open concurrently against the same working request. This is
   out of scope for this amendment (not a regression it introduces), but Implement should verify
   19.2.2's "may collapse to one fix" hypothesis against this path too, not only against the three
   removed calls, before concluding no card-level guard is needed.
3. Confirmed via grep that no other call site in the app relies on the specific timing of the three
   removed reloads — `useAddDesignToRequestFlow.ts`, `AssistedCreationDetailPanels.tsx`, and
   `useWorkingCurrentRequestItems.ts`'s own mount effect all trigger reloads independently and are
   unaffected.
4. The amendment's process section (19.5) correctly scopes this review to Section 19 plus the Studio
   tsconfig addendum and correctly states no additional owner checkpoint is required beyond this
   review if it approves — consistent with the rest of the Plan's already-established human-checkpoint
   rules (Section 17), which this amendment does not weaken or bypass.
