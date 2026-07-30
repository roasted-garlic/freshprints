# Portal Print Request Pre-Launch Stability — Amendment 2 Review

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent — does not defer to either prior `APPROVED`
  Implementation Review verdict on this goal, both of which the owner's actual runtime QA proved
  incomplete)
- **Scope:** Section 20 ("Amendment 2 — Owner Runtime QA `FAIL` (Second Pass)...") of
  `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md` **only**.
  Section 19 (Amendment 1) is treated as already implemented and separately reviewed
  (`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-2.md`,
  `APPROVED`) and is revisited here only to check for conflicts with Section 20's proposal.

---

## 1. Verdict

**`approved_with_changes`**

No blocking defect in the diagnosis. One blocking gap in the remediation's *completeness* (a second,
parallel quantity-update code path the amendment's write-up never mentions, detailed below) must be
resolved before or during Implement, and one clarification is needed on Fix 1's exact mechanics. Both
are narrow, do not require re-diagnosis, and do not block starting Implement provided both are
addressed in the actual code change.

---

## 2. Independent confirmation of the three root-cause claims

### Root Cause 1 — stale 30s detail-route read cache (confirmed, exactly as written)

- `apps/portal/features/print-requests/services/portalPrintRequestReadCache.ts` L1: `TTL_MS = 30_000`.
  `loadPortalPrintRequestReadCached` (L26-56) returns a cached value if `expiresAtMs > Date.now()`
  (L31-34) with no per-key early invalidation except the module-level `clearPortalPrintRequestReadCache`
  (L63-67, bumps a `generation` counter and clears both maps).
- `portalPrintRequestService.getPrintRequest` (L352-374) and `listPrintRequestItems` (L376-408) both
  route through `loadPortalPrintRequestReadCached`, keyed `{uid}:request:{id}` / `{uid}:items:{id}`
  (L51-53) — confirmed.
- Grepped every call site of `clearPortalPrintRequestReadCache()` in `portalPrintRequestService.ts`:
  only `addOrIncrementCatalogDesign` (L646) and `clearWorkingPrintRequest` (L1180) call it.
  **`removePrintRequestItem` (L1112-1130) and `updatePrintRequestItemQuantity` (L1085-1110) — the two
  methods the detail page's remove/quantity handlers actually call — never call it.** Confirmed exactly
  as claimed, including the pre-existing code comment at L1177-1179 documenting the identical defect
  class already found and fixed once for `clearWorkingPrintRequest`.
- `usePrintRequestDetail.ts`'s mount effect (L152-157) unconditionally calls `void reload()` on every
  mount with **no** `isViewingWorkingRequest` gate — confirmed. `reload()`'s success handler (L110-114)
  unconditionally calls `setItems(sortWorkingCurrentRequestItems(nextItems))` regardless of whether the
  request being viewed is the working request — also confirmed, and this is the more precise mechanism:
  the `cartSignature` sync effect (L191-243) only *reconciles* `items` from `workingItems` when its
  signature changes; it does not prevent `reload()`'s own `setItems` call from firing and overwriting
  whatever the sync effect most recently set, because the two effects are not arbitrated against each
  other at all — confirmed as the amendment describes at Section 20.1's closing paragraph.

This exactly explains the owner's stated symptom shape (stale for a window rather than permanent,
independent of cart/context correctness, triggered specifically by leave-and-return navigation
remounting a fresh `usePrintRequestDetail` instance) rather than being merely plausible.

### Root Cause 2 — discarded server-authoritative quantity + phantom `1` fallback (confirmed, with one important omission — see Section 3 below)

- `functions/src/updatePortalPrintRequestItemQuantity.ts`: a `runTransaction` (L71-149) independently
  reads `itemsSnap` fresh inside the transaction, computes `otherPrintCount` (L118-127), calls
  `clampItemQuantityToWorkingRequestMax` (L129-134) against that authoritative count, and returns the
  actual accepted `quantity` in `UpdatePortalPrintRequestItemQuantityResponse` (L24-30, L151-157) —
  confirmed exactly.
- `portalPrintRequestService.updatePrintRequestItemQuantity` (L1085-1110) declares `Promise<void>` and
  its `await callTracedFunction<...>(...)({...})` call (L1100-1109) discards the typed response object
  entirely — confirmed, the response type parameter even includes `quantity`, `charged`, `refunded`, all
  thrown away.
- `usePrintRequestDetail.updateItem` (L267-364) computes its own client-side clamp (L286-294) using
  `otherItemsPrintCount` derived from the hook's own, possibly-stale `items` array (L283-285, itself
  vulnerable to Root Cause 1) and commits that value optimistically (L300-311, L318) with no
  reconciliation against the server's actual accepted value on success (the success path, L330-337, does
  nothing after the awaited callable resolves — no read of a return value, because the service method
  returns nothing to read) — confirmed exactly as claimed.
- The `1`-fallback: `updateItem` L280-282 —
  ```ts
  const currentItem = items.find((item) => item.id === itemId);
  const currentQuantity =
    currentItem && Number.isFinite(currentItem.quantity) ? currentItem.quantity : 1;
  ```
  confirmed at the exact claimed lines.
- `clampItemQuantityToWorkingRequestMax` (`packages/shared/src/utils/printRequestWorkingRequestMax.ts`
  L65-94): the over-cap branch (L88-90) returns `current`, never `1` — confirmed. This is sound proof
  that any observed `1` in this flow traces to the fallback, not the clamp math.

### Root Cause 3 — Studio timer permission failure (diagnosis-deferral framing is correct; no more conclusive source-only answer exists)

- `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts`'s
  `startShowPrinting` (L860-919): a direct client `writeBatch`, confirmed. The show-doc update (L890-897)
  writes `productionStatus`, `activePrintStartedAt`, `printStartedAt`, `printPausedAt` (via
  `deleteField()`), `updatedBy`, `updatedAt`. The per-allocation update (L900-904) writes `status`,
  `updatedBy`, `updatedAt`.
- `firestore.rules` `upcomingShowRequiredFieldsValid` (L634-696) allowlist includes every one of those
  six show-doc fields (`productionStatus` L650, `activePrintStartedAt` L655, `printStartedAt` L656,
  `printPausedAt` L657, `updatedBy` L661, `updatedAt` L663) — independently re-derived, matches.
  `showAllocationRequiredFieldsValid` (L710-741, continuing past what I read) includes `status` (L728),
  `updatedBy` (L730), `updatedAt` (L741) — also independently re-derived, matches. The `allow update`
  block for `showAllocations` (L1287-1295) additionally requires
  `request.resource.data.addedBy == resource.data.addedBy` (immutable) and
  `request.resource.data.updatedBy == request.auth.uid` — the batch write sets `updatedBy: caller.id`,
  consistent with the rule, not a mismatch.
- The `hasOnly()`-evaluated-against-the-full-resulting-document concern (Section 20.3, second bullet) is
  structurally accurate: `data.keys().hasOnly([...])` in Firestore Rules is evaluated against
  `request.resource.data`, i.e. the full post-write document, not a diff — so a legacy field on an
  existing live document not in the allowlist would indeed reject *any* update to that document,
  including this one. This cannot be ruled out or confirmed from static source alone.
- I checked `isStaff()` (`firestore.rules` L29-31: `callerIsActive() && callerRole() in ["owner", "admin",
  "helper"]`) as a candidate for a more conclusive source-only answer — it is a plausible additional
  failure point (e.g. a deactivated or role-drifted staff account) but is exactly as unconfirmable from
  static source as the allowlist-drift and deployed-Rules-drift hypotheses the amendment already lists;
  it does not sharpen the diagnosis further than "needs live reproduction."
- **Conclusion: I did not find a more conclusive source-only answer than the amendment's own framing.**
  The amendment's decision to defer to an Implement-time live reproduction, rather than guess a Rules
  change, is the correct call — everything checkable from the checked-in Rules text is checked and
  consistent; what remains (live-document field drift, deployed-vs-checked-in Rules drift, `isStaff()`
  role/active-state drift) is fundamentally a live-data question, not a source-reading question.

---

## 3. Assessment of remediations

### Fix 1 (Root Cause 1) — correct, sufficiently deep, no regression to Amendment 1

Cache invalidation on the two missing mutations is the narrowest correct fix for the confirmed gap and
directly mirrors the already-proven `clearWorkingPrintRequest`/`addOrIncrementCatalogDesign` pattern —
no new primitive, no risk.

The deeper structural fix — `workingItems` becomes the source of truth for item state while
`isViewingWorkingRequest`, and `reload()`'s own `setItems(...)` is skipped or generation-gated for that
case — is the right level of fix, not merely a narrowed race window, and does not conflict with anything
Amendment 1 did. Amendment 1 removed the *component-level* redundant `reloadWorkingItems` calls in
`PrintRequestDetailView.tsx` and added `itemPropSyncGuard.ts` at the card level; neither touches
`usePrintRequestDetail.reload()`'s own mount-triggered fetch or its `setItems` call, so Fix 1 is
additive, not overlapping, and does not re-open anything Amendment 1 closed. Restricting `reload()`'s
metadata-only fetch (`printRequest`, `designSummaries`, `uploadSummaries`) to continue firing while
gating only the item-array `setItems` call for the working-request case is architecturally sound and
stays within Component→Hook→Service and bounded-read constraints — no new read is added; if anything a
duplicate `listPrintRequestItems` round trip is removed for that case, consistent with Section 7 of the
original Plan.

One point needing tightening before/during Implement, not blocking Plan approval: Section 20.4 point 2
says "the retry is bounded... reload()'s detail-only fetch must be reserved for print-request metadata
... **and for historical/non-working requests only**." This is correct, but Implement must also handle
the transition moment — i.e. when a request is actively being viewed and *leaves* the working set mid-
view (existing `wasViewingWorkingRef`/queue-transition handling at L230-235, L612-622) — without
reintroducing a window where neither `reload()`'s item fetch nor the `workingItems` sync is authoritative.
This is already partially handled by existing code (`reconcileQueued`, the `wasViewingWorkingRef` reload
on transition-away) and should be explicitly re-verified against Fix 1's change during Implement, not
treated as automatically safe.

### Fix 2 (Root Cause 2) — correct as far as it goes, but **incomplete**: a second, unmentioned code path has the identical bug

**Blocking finding.** `usePrintRequestDetail.ts` defines **two** separate functions with the same shape
of defect:

1. `updateItem` (L267-364) — the one Section 20.2/20.4 analyzes. Wired to the real UI:
   `PrintRequestDetailView.tsx`'s `handleUpdateItem` calls `await updateItem(item.id, input)` (confirmed
   at `PrintRequestDetailView.tsx` L202, the only real call site for quantity edits from the detail
   page).
2. `updateItemQuantity` (L503-543) — **a second, independent function**, also destructures
   `items.find(...)` with an identical `: 1` fallback (L509-511), also computes its own client-side clamp
   (L515-523), also calls `portalPrintRequestService.updatePrintRequestItemQuantity` and **also discards
   the response** (L527-532), committing its own locally-clamped `nextQuantity` instead
   (L533-537). This function is returned from the hook (`updateItemQuantity` in the return object,
   L639) but I confirmed via grep across `apps/portal` that **no component currently calls it** — it
   appears to be dead/unused code, exposed on the hook's public return but not wired to any handler in
   `PrintRequestDetailView.tsx` or elsewhere.

Because it is currently unreferenced, this is not the live cause of the owner's reported defect — but
the amendment's Section 20.2/20.4 write-up describes the fix exclusively in terms of `updateItem` and
never mentions `updateItemQuantity` exists at all. Two concrete risks if this is not addressed at
Implement time:
- If Implement fixes only `updateItem` and this second function is wired up later (or already used by
  a caller I did not find, given it is exported from the hook's public surface), the identical discarded-
  response and phantom-`1` bugs return immediately, silently, in a code path this review already knows
  about but the amendment does not document.
- Leaving two parallel, subtly different quantity-update implementations in the same hook — one fixed,
  one not — is exactly the "second, independent representation" failure shape this whole goal has been
  chasing across Sections 4, 19, and 20. It should not survive this remediation pass undocumented.

**Required correction (my proposed text for Section 20.4, Fix 2):** either (a) apply the identical
response-reconciliation and fallback-hardening fix to `updateItemQuantity` as well, or (b) confirm it is
genuinely dead code and remove it (preferred, since an unused duplicate of `updateItem` with a known-bad
pattern is itself a maintenance hazard), and record which option was taken in the Implementation Review.
Do not leave it untouched and undocumented.

Aside from this gap, Fix 2's actual design — return the server's authoritative `quantity` from the
service wrapper and commit that value on success, and treat a lookup miss as an explicit failure rather
than a silent `1` — is correct, closes the "displayed 7, server capped it differently" defect
completely (not just narrows it), and Section 20.4 point 3's reasoning (Fix 1 likely eliminates the
practical trigger for the fallback, but harden it anyway as defense-in-depth) is sound and consistent
with this goal's established "no silent optimistic success" principle from Amendment 1.

### Fix 3 (Root Cause 3) — diagnose-first approach and constraints are correct

The "reproduce and capture the exact denial before proposing a fix" requirement is the right call, given
Section 2's confirmation above that everything checkable from static source is already consistent — a
guessed Rules change here would be exactly the kind of unverified fix this goal's two prior "APPROVED
but wrong" reviews should have taught against. The constraints (separate deployment checkpoint, Rules-
emulator tests before any deploy, no broadening, dev-only target) match the project's established Rules-
change discipline (`docs/standards/TESTING.md`'s `npm run test:rules` / emulator requirement) and the
existing Human Checkpoint requirements in the base Plan (Section 17) and CLAUDE.md ("Secrets or shared
environment variable changes... Any console action outside the repo" require human approval — a live
Rules/data change on `fresh-prints-dev` is squarely in that category even though it is not production).

---

## 4. Assessment of required test scenarios (Section 20.5)

The five scenarios (removal/remount reconciliation, exact typed-cap rejection, valid reduction, stale-
completion ordering, cart/detail parity) are each shaped to reproduce the *specific* sequencing defect
diagnosed in Section 20.1/20.2 — not source-presence checks — and would plausibly have caught this
amendment's defects had they existed before Implement's prior pass. Confirmed the testing approach is
grounded in real repo capability, not aspirational:

- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.test.ts` already exists (added during
  Amendment 1's implementation) — confirmed via Glob — so "extend the existing hook test file" is a real,
  already-established option, not a speculative one.
- `apps/portal/features/print-requests/utils/mergeServerWorkingItemsWithLocal.test.ts`,
  `itemPropSyncGuard.test.ts`, and `itemMutationGeneration.test.ts` all exist and already model exactly
  the "construct a realistic before/after state, drive the real reconciliation function, assert on the
  resulting array" pattern Section 20.5's closing paragraph requires — this is not a new testing
  convention being invented for this amendment, it is the convention Amendment 1's own review already
  validated (Implementation Review 2, Section 7).
- `docs/standards/TESTING.md` confirms `npx tsx --test` is the actual invocation convention (no DOM-
  rendering framework, no jsdom) — consistent with "pure extracted reconciliation controller" being the
  right shape for these tests, as the amendment specifies.

No gap found in the test-scenario requirements themselves. One extension to flag as non-blocking: Fix
2's correction (Section 20.4 point 2) should be tested with an explicit case that also covers whichever
of `updateItem`/`updateItemQuantity` remains after the Section 3 blocking finding above is resolved — the
five listed scenarios describe the observable UI defect but don't explicitly enumerate "verify only one
quantity-update code path exists, or both are fixed identically."

---

## 5. Blocking findings

1. **(Section 3 above.)** `usePrintRequestDetail.updateItemQuantity` (L503-543) has the identical
   discarded-response and phantom-`1`-fallback pattern as `updateItem`, and is not mentioned anywhere in
   Section 20.2/20.4's diagnosis or remediation text. It is currently unreferenced by any caller (grep-
   confirmed across `apps/portal`), so it is not the live cause of the owner's reported defect, but it
   must be explicitly resolved (fixed identically or removed as dead code) in the same Implement pass,
   and the disposition recorded in the Implementation Review — not silently left as an undocumented,
   still-buggy duplicate.

---

## 6. Non-blocking notes

1. Fix 1's "reload() must be reserved for metadata + historical requests only" restructuring should be
   explicitly re-verified against the existing working-request-exit transition logic
   (`wasViewingWorkingRef`, `reconcileQueued`, the `void reload({ silent: true })` call at L234 when a
   request leaves the working set) during Implement, to confirm no new window opens where neither
   `workingItems` nor `reload()`'s fetch is authoritative for items. Not a defect in the amendment's
   design, just a seam to check explicitly rather than assume is automatically safe.
2. `CurrentRequestDrawer.tsx`'s own `reloadWorkingItems` calls (L210, L298) go through
   `useWorkingCurrentRequestItems`'s Firestore fetch path, not the `portalPrintRequestReadCache` module —
   confirmed these are a structurally separate cache/fetch path from Root Cause 1, so Fix 1's cache-
   invalidation change has no interaction with the drawer's existing behavior or with Amendment 1's
   `itemPropSyncGuard.ts`, which remains the correct residual-risk guard for that call site.
3. Section 20.7's new queued goal (`preproduction-static-analysis-cleanup`) is out of scope for this
   review and requires no action here.

---

## 7. Root Cause 3 — no more conclusive answer found

As stated in Section 2 above: I independently re-derived the full field allowlists for both
`upcomingShows` and `showAllocations` against `startShowPrinting`'s actual batch-write field list and
found no discrepancy — every field the write sends is present in the current checked-in Rules'
allowlist, and the additional immutability/`updatedBy`-identity constraints on `showAllocations` updates
are also satisfied by the write as written. I also checked `isStaff()`'s role/active-state check as a
candidate alternate explanation; it does not resolve to anything more conclusive than "needs live
reproduction," for the same reason the amendment already gives (this is a live-caller-identity/live-
document-state question, not a static-Rules-text question). **The amendment's "diagnose first, do not
guess a Rules fix" framing is correct and is the most conclusive answer obtainable from source alone.**
