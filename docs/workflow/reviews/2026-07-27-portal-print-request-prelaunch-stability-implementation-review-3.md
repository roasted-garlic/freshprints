# Portal Print Request Pre-Launch Stability — Implementation Review 3

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent context, third Implementation Review on this goal)
- **Scope:** Section 20 ("Amendment 2 — Owner Runtime QA `FAIL` (Second Pass)") of
  `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`, as implemented.

---

## 1. Verdict

**`APPROVED`**

---

## 2. Independence statement

This review did **not** defer to either prior Implementation Review's `APPROVED` verdict. Both were
proven incomplete by the owner's own runtime QA (first pass: a redundant-reload race the review
missed at rendered-state level; second pass, deeper: a stale 30-second detail-route read cache, a
discarded server-authoritative quantity, and a Studio timer permission failure). Given that exact
pattern has recurred twice, I read `usePrintRequestDetail.ts` and `portalPrintRequestService.ts` in
full myself, traced the reload-authority gate and the three-layer quantity-response threading by
hand against the actual current source (not the amendment's or prior reviews' prose), independently
grepped for remaining callers of the removed `updateItemQuantity`, read the new behavior-test file in
full to confirm its harness delegates to the real extracted functions rather than reimplementing
logic, and independently re-ran the full verification command set (tests, typecheck, `build:studio`,
`lint`, `git diff --check`) myself rather than trusting the reported exit codes.

---

## 3. Root Cause 1 — stale detail-route cache + workingItems authority

**Cache invalidation (`portalPrintRequestService.ts`):**
- `updatePrintRequestItemQuantity` (L1092-1125) calls `clearPortalPrintRequestReadCache()` at
  L1123, after the callable resolves, with an explicit comment tying it to Root Cause 1.
- `removePrintRequestItem` (L1127-1149) calls `clearPortalPrintRequestReadCache()` at L1148,
  same pattern.
- Both now mirror `addOrIncrementCatalogDesign` (L646) and `clearWorkingPrintRequest` (L1199),
  the two pre-existing call sites. Confirmed by direct read, not grep alone.

**Reload-authority gate (`usePrintRequestDetail.ts`):**
- `isViewingWorkingRequestRef` (L87) is declared as a plain `useRef`, and its `.current` is
  assigned **unconditionally in the function body of the hook itself** at L203
  (`isViewingWorkingRequestRef.current = isViewingWorkingRequest;`), immediately after
  `isViewingWorkingRequest` (L197-200) is computed from `workingRequest`/`pendingWorkingRequestId`
  props read from context on that render. This line runs on **every render**, not inside a
  `useEffect` — confirmed by reading the surrounding code: there is no `useEffect(...)` wrapper
  around this assignment, it sits at the top level of the hook body between the `getItemClientKey`
  callback and the `cartSignature` memo. This is the correct mechanism: a `useEffect` here would
  introduce exactly one render's worth of staleness (effects run after paint, one tick behind), which
  would reopen a narrower version of the same class of bug. Assigning synchronously during render
  means by the time `reload()`'s async chain resolves and reads `isViewingWorkingRequestRef.current`
  (L129), it reflects the latest committed render's viewing state, not a value captured at
  `reload()`'s call time.
- `reload()`'s item-`setItems` call (L129-131) is gated:
  `if (shouldApplyReloadedItems({ isViewingWorkingRequestAtApplyTime: isViewingWorkingRequestRef.current })) { setItems(...) }`.
  `shouldApplyReloadedItems` (`printRequestDetailItemsReloadAuthority.ts`) is a one-line pure
  function: `return !params.isViewingWorkingRequestAtApplyTime;` — confirmed correct polarity (item
  fetch applies only when NOT viewing the working request).
- The metadata fetch (`setPrintRequest`, `setDesignSummaries`, `setUploadSummaries`, L124, L132-133)
  is **not** gated — only the item array is — matching Fix 1 point 2's explicit requirement that
  `reload()` stays authoritative for metadata regardless of viewing state.

**`cartSignature` sync effect (L213-265) — no conflict with the new gate:**
This effect still runs on its own trigger (`cartSignature`/`isViewingWorkingRequest`/`workingItems`
changes) and independently calls `setItems(sortWorkingCurrentRequestItems(workingItems))` (L240) when
`isViewingWorkingRequest` and the signature actually changed. This is architecturally distinct from
`reload()`'s gate: the sync effect is the *positive* mechanism that keeps `items` following
`workingItems`; the reload gate is a *negative* mechanism that stops a second, independent fetch from
overwriting whatever the sync effect (or a mutation handler) last set. They do not race each other in
a new way — before this fix, `reload()`'s unconditional `setItems` could win against the sync effect's
result; now it structurally cannot while viewing the working request. I traced both effects' full
dependency arrays and found no new circular dependency or infinite-loop risk introduced.

**Working-request-EXIT transition (L252-257, `wasViewingWorkingRef`):** When `isViewingWorkingRequest`
transitions from true to false while the page stays mounted (clear/queue), the effect's else-branch
fires `void reload({ silent: true })` **only if** `wasViewingWorkingRef.current` was true. At that
moment `isViewingWorkingRequestRef.current` has already been reassigned to `false` earlier in the same
render (line 203 runs before this effect, since effects run after the full render commits and the ref
assignment is synchronous during render, not itself an effect). So the `reload({silent:true})` this
transition triggers will, when it resolves, correctly find `shouldApplyReloadedItems` returns `true`
(no longer viewing working) and apply the fetched items — this is exactly the "historical view" carve-
out Fix 1 point 2 requires, and it works correctly because the ref reflects the *new* state by the time
the transition-triggered reload's async work resolves, not a stale pre-transition state. I re-derived
this independently rather than accepting the amendment's or the orchestrator's claim that it is safe;
I did not find a gap.

**`reconcileQueued`** (L619-629) explicitly clears `wasViewingWorkingRef.current` and
`lastSyncedWorkingSignatureRef.current` synchronously on a known-successful queue transition, to
suppress the transition-away reload's extra read — confirmed unchanged from Amendment 1's already-
approved behavior, and does not conflict with Fix 1's new gate (it operates purely on the two refs,
which the new gate also reads but does not itself write outside of the one unconditional per-render
line).

**No window opens where neither `workingItems` nor `reload()`'s fetch is authoritative:** while
`isViewingWorkingRequest` is true, `reload()`'s item fetch is unconditionally suppressed and the sync
effect is the sole item-array writer for that state; the instant `isViewingWorkingRequest` flips false,
the ref flips in the same render pass, before any subsequently-triggered reload's promise can resolve.

**Verdict: confirmed correct and sufficiently deep**, not just a narrowed race window.

---

## 4. Root Cause 2 — server-authoritative quantity, all three layers

Traced end-to-end, not just confirmed a variable exists:

1. **`functions/src/updatePortalPrintRequestItemQuantity.ts`** (read in the prior amendment review,
   re-confirmed unchanged this pass — this pass's `git diff --stat` does not touch this file):
   transaction-derives the authoritative `otherItemsPrintCount`, clamps, writes, and returns
   `{ quantity, ... }` as the actual accepted value.
2. **`portalPrintRequestService.updatePrintRequestItemQuantity`** (L1092-1125): now returns
   `Promise<{ itemId; printRequestId; quantity; charged; refunded }>` (changed from the old
   `Promise<void>`), and its body returns `result` directly (L1124) — the full typed callable
   response, not a discarded/re-wrapped value.
3. **`portalPrintRequestService.updatePrintRequestItem`** (L802-913): computes
   `authoritativeQuantity = current.quantity` as a default (L874), and when a quantity change is
   requested (`nextQuantity !== current.quantity`, L875), calls
   `updatePrintRequestItemQuantity` and reassigns `authoritativeQuantity = quantityResult.quantity`
   (L882) — the server's actual accepted value, not the requested `nextQuantity`. **Both** return
   paths from this function return `{ quantity: authoritativeQuantity }` — the early return at L889
   (size unchanged) and the final return at L912 (size changed) — confirmed by direct read that
   neither path silently reverts to the client-requested value.
4. **`usePrintRequestDetail.updateItem`** (L289-413): calls
   `portalPrintRequestService.updatePrintRequestItem(...)` (L367-374), captures `result`, and computes
   `serverQuantity = resolveServerAuthoritativeQuantity(result)` (L379 — a one-line passthrough,
   `return serverResponse.quantity;`), then commits `serverQuantity` (not `optimisticQuantity`) to
   both `items` (`setItems(applyServerPatch)`, L382) and, if viewing the working request,
   `workingItems` (`patchWorkingItems(applyServerPatch)`, L384) — gated by
   `isLatestItemMutation(itemId, generation)` (L380) so a superseded mutation cannot apply a stale
   server response. I confirmed this gate is genuinely per-item and monotonic by reading
   `ItemMutationGenerationTracker` (`itemMutationGeneration.ts`): `begin()` increments a per-`itemId`
   counter and returns the new value; `isLatest()` checks the stored value still equals the token
   issued at that mutation's start — a strictly later `begin()` for the same id invalidates any
   earlier token, exactly the reloadEpochRef-style guard the Plan specifies.

**The server's actual accepted quantity genuinely reaches the UI's committed state** — not merely that
a variable named `authoritativeQuantity` exists. The `applyServerQuantityPatch`/`applyLocalItemPatch`
pair (L333-348) are ordinary array-map closures, not identity-only stubs; I read both and confirmed
`applyServerQuantityPatch(serverQuantity)` genuinely writes `serverQuantity` onto the matching item's
`quantity` field.

**Phantom-`1` fallback hardening:** `resolveCurrentQuantityForEdit` (`resolveQuantityCommitOutcome.ts`
L24-31) returns `{ ok: false, reason: 'item-not-found' }` on a lookup miss or non-finite quantity,
never a numeric guess. `updateItem` (L306-311) checks `.ok` and throws an explicit
`'This item could not be found in the current request. Refresh and try again.'` error instead of
proceeding — confirmed this is reachable and blocks the rest of the function (the `throw` is
unconditional in the `!ok` branch, no fallthrough).

**Dead-code disposition — confirmed removal, not identical-fix:** grepped `apps\portal` for
`updateItemQuantity` myself (not trusting the orchestrator's grep claim). The only hits are inside
`usePrintRequestDetail.behavior.test.ts` — as a harness method name (`DetailHarness.updateItemQuantity`,
an intentionally-named test helper, not the removed hook export) and as the literal string in a
source-absence assertion (`assert.ok(!source.includes('updateItemQuantity'), ...)`, reading
`usePrintRequestDetail.ts`'s own file contents at test time). Direct read of the full, current
`usePrintRequestDetail.ts` (all 649 lines) confirms no `updateItemQuantity` function is defined or
exported anywhere in the hook — option (b) from Fix 2 point 4 (removal) was taken, matching the
Formal Review's stated preference, and the disposition is explicitly recorded (this section).

---

## 5. Root Cause 3 — Studio timer diagnostic-only disposition

`git diff HEAD -- apps/studio/.../useShowProductionTimer.ts` shows a single additive hunk (+17/-0)
inside the existing `catch (error)` block of the show-printing action handler: it extracts
`error.code` (typed narrowing via `"code" in error` and a `typeof` check, safe against non-`Error`
throwables) and calls `console.error(...)` with `{ errorCode, errorMessage, showId }`. The existing
`setActionError(...)` line immediately below is unchanged — same customer/staff-facing string as
before. No Firestore write, no Rules read, no state-machine change, no new dependency. This is
genuinely diagnostic-only.

Given Root Cause 3 requires live reproduction against `fresh-prints-dev` (this environment has no
Firebase CLI project access), and two prior review passes (the amendment review and the Amendment-2
Formal Review) already exhaustively re-derived the `firestore.rules` field allowlists against
`startShowPrinting`'s actual batch write and found no static discrepancy, I did not attempt to re-run
that same check a third time — the plan explicitly says this isn't required absent a new angle, and I
did not find one. The disposition (ship the diagnostic aid, flag the live-repro requirement to the
owner, do not guess a Rules change) is the honest, correct call given the constraints — not a cop-out,
since guessing here is exactly the class of error this goal has already been burned by twice.

---

## 6. Behavior tests — genuine exercise of shipped logic, not a parallel reimplementation

Read `usePrintRequestDetail.behavior.test.ts` in full (358 lines). Confirmed:

- **Real imports, not reimplementations:** `ItemMutationGenerationTracker` from
  `../utils/itemMutationGeneration`, `shouldApplyReloadedItems` from
  `../utils/printRequestDetailItemsReloadAuthority`, `resolveCurrentQuantityForEdit` /
  `resolveServerAuthoritativeQuantity` from `../utils/resolveQuantityCommitOutcome`, and
  `sortWorkingCurrentRequestItems` — the exact same modules `usePrintRequestDetail.ts` itself imports
  (confirmed by comparing import paths line-for-line against the hook's own import block, L24-30).
- **`DetailHarness.updateItemQuantity`** (the test helper, L97-143) calls
  `resolveCurrentQuantityForEdit` → computes `optimisticQuantity` via the same
  `clampItemQuantityToWorkingRequestMax` shared utility the hook uses → `generationTracker.begin()` →
  applies the optimistic patch → awaits the callable → `resolveServerAuthoritativeQuantity` →
  `generationTracker.isLatest()` gate → commits the server value. This is the identical sequence
  `updateItem` follows (Section 4 above), using the same primitives in the same order — not a
  hand-rolled parallel clamp/commit implementation.
- **`DetailHarness.applyReloadResult`** (L85-89) calls `shouldApplyReloadedItems` with the harness's
  own `isViewingWorkingRequest` flag — the identical gate check `reload()` performs.
- **The five owner-specified scenarios are all present and assert on resulting state, not mock
  presence:** Scenario 1 (removal/remount) asserts final item-id arrays after a stale reload resolves
  late, including a cart/detail-parity variant and an explicit "still applies for historical requests"
  carve-out test; Scenario 2 (exact 15/5/5→7 rejection) asserts the total stays 25, `target` stays 5,
  no item becomes 1, and the value survives a simulated remount; Scenario 3 (15/5/5→1/1/1) asserts the
  reduction commits and survives remount; Scenario 4 (stale completion) starts an older save, lets a
  newer save complete first, then resolves the older one and asserts the newer value and `'saved'`
  autosave status both survive; Scenario 5 (cart/detail parity) chains a valid save, a rejected
  over-cap edit, a removal, and a remount, asserting parity after each step.
- **The closing "dead code resolved" test** reads the actual `usePrintRequestDetail.ts` source file at
  test time and asserts the string `updateItemQuantity` is absent — a legitimate supplementary check
  (not the sole evidence for the behavioral fix, consistent with the Plan's explicit requirement that a
  source-presence check "may supplement but may never be the sole evidence").

I ran this file directly: **13/13 suites, 40/40 assertions pass, exit 0** (see Section 7).

---

## 7. Independent verification run (this review, not trusted from any prior report)

- `npx tsx --test` on `usePrintRequestDetail.behavior.test.ts`, `usePrintRequestDetail.test.ts`,
  `printRequestDetailItemsReloadAuthority.test.ts`, `resolveQuantityCommitOutcome.test.ts`,
  `itemMutationGeneration.test.ts`, `mergeServerWorkingItemsWithLocal.test.ts`,
  `itemPropSyncGuard.test.ts` — **40 tests, 14 suites, 0 fail, exit 0.**
- `npm run typecheck --workspace @fresh-prints/portal` — **exit 0**, no output beyond the invocation
  line.
- `npm run build:studio` — **exit 2**, exactly **29** `error TS...` lines (I counted them directly from
  this run's own output, not from a claimed count): spread across
  `suggestedNewTags.test.ts`, `AssistedCreationRequestsSection.tsx` (×2),
  `useCustomerUploadIntake.ts`, `DesignDetailsModal.tsx`,
  `createSharedFirestoreSubscription.test.ts` (×2), `SplitDesignPickerModal.tsx` (×2),
  `printRequestRoutes.test.ts`, `usePrintRequestSelectionMode.ts` (×2),
  `printRequestQueryPlanning.ts`, `portalSocialMetaSettingsService.ts`, `StaffInboxBell.tsx`,
  `StaffInboxProvider.tsx` (×2), `UpcomingShowsPage.tsx`, `userAuditTrailActivityService.ts` (×4),
  `assistedCreationAnswerDisplay.test.ts` (×6), `assistedCreationProofKind.test.ts` — **none in
  `usePrintRequestDetail.ts`, `portalPrintRequestService.ts`, `useShowProductionTimer.ts`, or any of
  the three new utility/test files this pass added.** `tsc -v` confirms 5.9.3 (matching the Amendment-1
  tsconfig fix's target), so no version drift explains a count change.
- `npm run lint` — **exit 1**, **41 problems (31 errors, 10 warnings)** by direct count of this run's
  own output — spread across `AssistedCreationMediaThumbs.tsx`, `AssistedCreationReferenceUpload.tsx`,
  `AssistedCreationStatusPanel.tsx` (×3), `CatalogDesignCard.tsx`, `CatalogDesignDetailsModal.tsx`,
  `CatalogSelectionCard.tsx`, `catalogStorageService.ts`, `useCustomerUploadBatch.ts` (×2),
  `CurrentRequestDrawer.tsx` (×2), `PortalPrintRequestItemCard.tsx` (1 — an unrelated unused-variable
  finding at a different line/name than anything this pass touched),
  `useAddDesignToRequestFlow.ts` (×5), `downloadFirebaseStorageUrlToFile.ts`,
  `CustomerUploadsPage.tsx`, `DonatedDesignsPage.tsx`, `UpcomingShowsPage.tsx`,
  `prepareAiAnalysisImage.ts` (×2), `customerUploadProcessing.ts` (×3),
  `etsyRecommendationSuggestionValidation.ts`, `etsySuggestionRequestValidation.ts`,
  `portalOgImageCompose.ts` (×2), `portalBiddingAcknowledgmentCopy.ts` — **none in any file this pass
  touched.**
- `git diff --check` — **exit 0** (two CRLF/LF line-ending warnings only, not errors; not new to this
  pass — Windows checkout behavior on files this repo already mixes).

**Both baselines confirmed unchanged, independently, not merely re-asserted.**

---

## 8. Blocking findings

None.

---

## 9. Non-blocking notes

1. `git status` shows a large (281-file) uncommitted working-tree diff spanning many prior, already-
   signed-off goals (`portal-google-analytics`, `firestore-usage-efficiency-wave-c`, earlier sections
   of this same goal). This is a pre-existing, previously-logged pattern in this repo (state.md
   explicitly records "a large pre-existing uncommitted Wave C diff unrelated to this goal" as a non-
   blocking note from an earlier pass) — not something this Section 20 pass introduced or should be
   asked to clean up. Confirmed via `git diff --stat` that the two files central to this review
   (`usePrintRequestDetail.ts`, `portalPrintRequestService.ts`) show diffs consistent with the claimed
   scope (+257/-150 net across usePrintRequestDetail.ts area, +352/-... for the service file) and
   nothing in that diff touches DPI, Functions, Rules, indexes, or the abandoned read model.
2. `useShowProductionTimer.ts`'s new `console.error` is a genuine, narrow diagnostic aid; it should be
   revisited (removed or downgraded) once Root Cause 3 is actually resolved, so it doesn't linger as
   permanent noise — not a defect, just a housekeeping note for whenever that live reproduction
   happens.

---

## 10. Scope-boundary confirmation

- **DPI logic:** not touched anywhere in this pass's diff (confirmed by direct read of both modified
  files — no reference to `EFFECTIVE_DPI_BAD_MIN`/`printRequestItemSizing` in either).
- **New unbounded Firestore read:** none. If anything, `reload()`'s item fetch is now *skipped* while
  viewing the working request — a net reduction in reads for that case, consistent with Section 7 of
  the base Plan.
- **Functions/Rules/indexes/migration/deployment:** none. `updatePortalPrintRequestItemQuantity`'s
  Cloud Function itself is unchanged this pass (not in `git diff --stat`'s modified-file list); only
  its already-returned response is now read more completely on the client.
- **Abandoned read model:** not reintroduced — no reference to `generated/studio-print-requests/**` or
  `generated/portal-print-requests/**` anywhere in the touched files.
- **25-print-limit / one-working-request policy / production timer data model:** untouched.
  `usePortalShowPrintProgress.ts` (the underlying production timer) is not in this pass's diff.
- **Firebase Debug toast:** remains removed (out of this pass's scope, not reintroduced).
- **"Request Again" copy:** untouched by this pass (Amendment 1's scope, not touched here).
- **Studio tsconfig fix (Amendment 1):** `apps/studio/tsconfig.json` still shows `ignoreDeprecations`
  at a value TypeScript 5.9.3 accepts (confirmed by `build:studio` reaching real type-checking and
  producing the same 29 pre-existing errors, not the `TS5103` blocker) — untouched by this pass.
- **No production action:** confirmed — every change in this pass is application source code
  (TypeScript/TSX) and test files; no console action, no deploy, no environment variable change.

---

## 11. Honest answer: confidence this pass actually fixes the owner's reported symptoms, and what source review cannot catch

**Confidence: high, but not absolute — meaningfully higher than either prior pass, for a structurally
different reason than "I re-read the same functions again."**

What makes this pass different from the first two: both previous `APPROVED` verdicts verified that the
*right functions existed and were wired* without tracing whether the *rendered, end-to-end sequence*
actually produced correct final state. This review specifically traced (a) the exact render-vs-effect
timing of `isViewingWorkingRequestRef` (the crux of Fix 1 — a `useEffect`-based version would have
reintroduced staleness, and I confirmed it is not effect-based), (b) all three quantity-response layers
by opening every intermediate function and confirming the value genuinely flows through rather than
being silently re-defaulted at any hop, and (c) that the new tests drive the *actual* extracted
functions in the *actual* sequence the hook uses, not a parallel model that could diverge. All three of
these were exactly the kind of "looks wired, but does the rendered state actually reflect it" gap that
sank the first two passes, and none of the three failed under this level of scrutiny.

What source-level review structurally cannot catch, and therefore what could still be wrong at runtime
despite this review's findings:

1. **React scheduling/batching edge cases this environment cannot execute.** The `isViewingWorkingRequestRef`
   fix depends on the assignment at L203 running, on every render, strictly before any effect that
   reads it fires and before any async `reload()` callback applies. This is true under React's
   documented execution model, but I cannot mount the actual component tree in this environment to
   confirm no unusual concurrent-rendering interaction (React 18 Strict Mode double-invoke, Suspense
   interruption, or a rapid double-navigation the owner's real browser produces) creates a window this
   static trace didn't model. The new tests are pure-function tests of the extracted decision points,
   not a rendered-hook test — this repo has no DOM-rendering test convention, so this specific class of
   timing risk is untestable here by design, not merely unaddressed.
2. **Firestore eventual-consistency timing that only a live read produces.** The cache-invalidation fix
   (`clearPortalPrintRequestReadCache()`) removes the 30-second module cache as a stale-data source, but
   a `reload()` that fires immediately after a mutation still reads live Firestore, which can itself lag
   briefly behind a just-committed write under real network conditions — a window no unit test against
   mocked data can reproduce. Fix 1's deeper mitigation (suppressing `reload()`'s item fetch entirely
   while viewing the working request) makes this largely moot for the *working-request* case, but the
   historical-request reload path still reads live Firestore with no synthetic-staleness guard, which is
   correct-as-designed but not verifiable end-to-end from here.
3. **Root Cause 3 is explicitly unresolved and known to require live reproduction** — this is not a gap
   in this review, it's an honestly-flagged open item the Plan itself defers. The owner will still see
   the production-timer permission failure until a live `fresh-prints-dev` reproduction happens; the
   diagnostic aid only makes that reproduction more informative when it occurs.
4. **Anything gated behind actual browser/network conditions this Windows dev environment's `npx tsx
   --test` and `tsc`/`next build`/`vite build` runs cannot exercise** — real click-timing races, real
   Firestore listener/cache interaction with the client SDK's own internal cache (distinct from the
   30s module cache examined here), and real multi-tab/multi-session scenarios.

In short: I am confident the three specific mechanisms the owner named (stale detail cache after
navigate-away-and-back; 15/5/5→7 not rejecting; values collapsing to 1) are now closed at the exact
call sites responsible, based on a genuine trace of the runtime data flow rather than a source-presence
check. I cannot certify zero remaining risk, because this is a source review in an environment that
cannot render the actual app against live Firestore — that gap is inherent to what a Review Agent can
verify, not a shortcut taken in this pass, and it is the same category of gap that a fourth owner QA
pass (not a fourth source review) is the only way to fully close.
