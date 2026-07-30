# Portal Print Request Pre-Launch Stability — Amendment 3 Review

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent context, focused solely on Section 21)
- **Scope:** Section 21 ("Amendment 3 — Owner Runtime QA `FAIL` (Third Pass)") of
  `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md` only. Sections
  19/20 are treated as already implemented and separately reviewed/confirmed working by the owner —
  not re-litigated here except where Section 21's fixes touch the same files.

---

## 1. Verdict

**`approved_with_changes`**

---

## 2. Independent confirmation of the three root-cause claims

### 2.1 Root Cause 1 — item-card local draft never learns the server-accepted quantity

**Confirmed, exactly as claimed, with my own citations.**

- `PortalPrintRequestItemCard.tsx` L71-74: `onUpdate` is typed `Promise<void>`.
- `saveDraft`'s success path, L364-375:
  ```ts
  await onUpdate(item, { quantity: parsedQuantity, printWidthInches: ..., printHeightInches: ... });
  lastSavedSignatureRef.current = draftSignature;   // built at L346-350 from parsedQuantity (typed value)
  lastAcceptedUpdatedAtMsRef.current = Date.now();  // stamped unconditionally, comment at L371-373 admits this
  onAutosaveStateChange('saved');
  ```
  `quantityInput` itself is never touched here. If the server clamps `7` down to `5`, the input stays
  `'7'` and the "accepted" bookkeeping is stamped from the rejected value.
- `usePrintRequestDetail.ts` `updateItem` (L289-413) does correctly resolve and commit the server value:
  `serverQuantity = resolveServerAuthoritativeQuantity(result)` (L379), committed via
  `applyServerQuantityPatch(serverQuantity)` (L345-348, L381-385) to both `items` and (if viewing the
  working request) `workingItems`. But `applyServerQuantityPatch` (L345-348) patches **only**
  `quantity` — confirmed by direct read, it does not touch `updatedAt`:
  ```ts
  const applyServerQuantityPatch = (serverQuantity: number) => (currentItems) =>
    currentItems.map((item) => item.id === itemId ? { ...item, quantity: serverQuantity } : item);
  ```
- Card's prop-sync effect (`PortalPrintRequestItemCard.tsx` L233-266) is the only path that can update
  `quantityInput` from an incoming prop, gated by `shouldAcceptIncomingItemProp`
  (`itemPropSyncGuard.ts` L20-48), whose relevant branch (L45-47) is:
  `return incomingUpdatedAtMs >= lastAcceptedUpdatedAtMs;`
- Sequence traced by hand: type `7` → `saveDraft` → `onUpdate` resolves → card stamps
  `lastAcceptedUpdatedAtMsRef.current = Date.now()` (a real wall-clock value, e.g. `T1`) even though
  the server actually clamped to `5` → hook commits `{ ...item, quantity: 5 }` to `items`/`workingItems`
  with the item's **original** `updatedAt` (unchanged, since `applyServerQuantityPatch` never sets it)
  → re-render delivers the corrected `item` prop (quantity `5`, `updatedAt` = pre-edit timestamp, which
  is necessarily `< T1`) → guard evaluates `incomingUpdatedAtMs (pre-edit) >= lastAcceptedUpdatedAtMs (T1)`
  → **false** → correction rejected as stale. This is not a plausible narrative, it is the literal
  comparison the code performs. Confirmed.

The "minus works, plus doesn't" explanation also checks out: `stepQuantity` (L409-419) routes through
the identical `scheduleSave`/`saveDraft` path, so a subsequent manual edit that produces a save whose
requested value happens to equal the true server-accepted value will look "correct" purely by
coincidence of matching input, not because the bug is fixed for that path.

### 2.2 Root Cause 2 — Studio timer `permission-denied`, independently re-derived a fourth time

I re-traced this from scratch, without reading the prior three passes' reasoning first, against the
exact batch write in `upcomingShowService.startShowPrinting` (`upcomingShowService.ts` L860-919):

- `upcomingShows` update batch fields: `productionStatus`, `activePrintStartedAt`, `printStartedAt`,
  `printPausedAt: deleteField()`, `updatedBy`, `updatedAt`. Checked against
  `upcomingShowRequiredFieldsValid` (`firestore.rules` L634-696) and the `update` rule
  (`firestore.rules` L1085-1091, `isStaff() && upcomingShowRequiredFieldsValid(...) && source/whatnotShowId/
  createdBy/createdAt unchanged && updatedBy == auth.uid`): all fields are in the allowlist,
  `productionStatus: "printing"` is valid per `isValidShowProductionStatus` (L630-632, includes
  `"printing"`), and `deleteField()` on `printPausedAt` is safe against `isOptionalTimestamp`
  (`firestore.rules` L185-187: `!(field in data) || ...` — an absent-after-delete field passes). No
  discrepancy.
- `showAllocations` update batch fields: `status: "in_progress"`, `updatedBy`, `updatedAt` (a **partial**
  `batch.update()`). Checked against `showAllocationRequiredFieldsValid` (L710-...) and the `update`
  rule (L1287-1295, including `showAllocationSourceIdentityUnchanged()` at L1003-1014). Firestore merges
  a partial `update()` against the existing document before Rules evaluate `request.resource.data`, so
  `designId`/`customerUploadId`/`upcomingShowId`/`printRequestId`/`printRequestItemId`/`addedBy`/
  `createdAt` all remain present and unchanged from the pre-write document automatically — confirmed
  this satisfies both the identity-unchanged function and the unchanged-field checks in the `update`
  rule without the batch needing to resend them.
- Checked for structural gotchas a fresh read might catch that three prior passes missed: no duplicate
  `match /upcomingShows/{...}` or `match /showAllocations/{...}` block exists anywhere in
  `firestore.rules` (grepped both patterns — one match each, at L1078 and L1278) that could shadow or
  reorder evaluation. `isStaff()` (L29-31) depends on `callerUser()` (L9-11, a single `get()` against
  `users/{uid}`) and `callerIsActive()` (L13-15) — both are ordinary synchronous rule functions with no
  ordering dependency on match-block declaration order; Firestore Rules evaluate `get()` calls
  independently of block position. I found nothing new: no field-shape issue, no enum gap, no identity
  check gap, no ordering/shadowing issue.

**I confirm, independently, that this cannot be resolved further from source.** This is a genuine
fourth clean pass, not a rubber stamp — I did not accept the amendment's conclusion without redoing the
comparison myself, and I found the exact same result. The remaining explanations (deployed Rules drift
from checked-in `firestore.rules`, or a live document carrying an out-of-allowlist field) are both
legitimately live-only concerns that no further source review can adjudicate.

### 2.3 Root Cause 3 — Show Queue has no live-update mechanism

**One-shot-fetch claim confirmed.** `useShowAllocations.ts` (72 lines, full file read): `loadAllocations`
(L25-57) calls `upcomingShowService.listShowAllocations` exactly once per `upcomingShowId`/`user` change
via a `useEffect` (L59-61), with a `loadRequestIdRef`-based out-of-order guard but no `onSnapshot`,
`setInterval`, or any listener. `reloadAllocations` (L63-65) is an explicit manual re-fetch, not a
subscription. Confirmed.

**Precedent claim — partially incorrect.** The amendment states `staffInboxSubscriptionService.ts`
demonstrates the proposed reuse of `createSharedFirestoreSubscription`. This is **not accurate**: I read
`staffInboxSubscriptionService.ts` in full (320 lines) and its `subscribe()` (L208-319) is a hand-rolled
composition of three raw `onSnapshot` calls with manual `traceFirestoreListenerAttach`/
`traceWrappedUnsubscribe` calls — it does **not** call `createSharedFirestoreSubscription` anywhere. A
direct grep for `createSharedFirestoreSubscription` usages across `apps/studio/src` shows only two real
consumers: `assistedCreationRequestsService.ts` and `assistedCreationUpdateAckService.ts` (plus the
utility's own test file). `staffInboxSubscriptionService.ts` is still valid precedent for "a bounded,
scoped `onSnapshot` against `showAllocations` already works in this codebase" (its
`where("requestOriginSnapshot", "==", "portal_customer")` query, `ALLOCATIONS_TRACE` metadata, L239-244,
L263-278, is real and shipped) — but it is **not** precedent for the specific
`createSharedFirestoreSubscription`-wrapping pattern the amendment describes it as demonstrating. This
is a citation error, not a fatal flaw in the proposed fix (the utility itself is real, ref-counted, and
does support the described pattern — confirmed by reading `createSharedFirestoreSubscription.ts` in full,
77 lines: `subscribe()`/`unsubscribe()` ref-counting at L47-76 is genuine and would work as intended for a
new keyed-by-`upcomingShowId` wrapper), but Implement should not cite `staffInboxSubscriptionService.ts`
as "already using" the shared utility — it doesn't.

**Query shape confirmed sound and already precedented at the exact call site proposed for reuse.**
`upcomingShowService.listShowAllocations` (`upcomingShowService.ts` L599-623) already issues
`query(getShowAllocationsCollection(), where("upcomingShowId", "==", upcomingShowId))` — no `orderBy`, no
`limit`. The proposed `onSnapshot` query is the identical filter shape, just live instead of one-shot.

---

## 3. Assessment of the three proposed remediations

### Fix 1 — item-card local draft reconciliation

**Correct and minimal.** Changing `onUpdate`'s contract to return the accepted quantity and having
`saveDraft` apply it directly and synchronously closes the loop without depending on the async
prop-sync effect at all for the in-flight edit's own correction — this is the right layer to fix it at,
since the component that requested the save is also the only one that can distinguish "my own rejected
optimistic value" from "someone else's genuinely newer edit."

**Regression risk — low, with one integration point Implement must not skip.** The `onUpdate` prop's
caller is `PrintRequestDetailView.tsx`'s `handleUpdateItem` (L192-205), which currently `await
updateItem(item.id, input)` and returns nothing (also implicitly `Promise<void>`, matching the
component's typed contract). If `onUpdate`'s return type changes to resolve the accepted quantity, this
wrapper function's signature and its `await updateItem(...)` call must also change to capture and return
`usePrintRequestDetail.updateItem`'s ... **note:** `usePrintRequestDetail.updateItem` (L289-413) itself
currently has no return statement / return type — it is effectively `Promise<void>` internally too.
Fix 1 as scoped only mentions "thread it back out to the caller" at the `PortalPrintRequestItemCard`
boundary; it does not explicitly call out that **both** `handleUpdateItem` in
`PrintRequestDetailView.tsx` **and** `usePrintRequestDetail.updateItem` itself need a return-value change
to actually carry `serverQuantity` all the way from the hook, through the view wrapper, to the card. This
is a real gap in 21.4's remediation description — not a wrong idea, but incompletely scoped. **Blocking
finding**, see Section 5.

Confirmed no regression risk to the two now-passing behaviors: removed-item route reconciliation and
valid-reduction persistence are governed by `shouldApplyReloadedItems` / `applyServerQuantityPatch`'s
existing commit path in the hook, neither of which Fix 1 proposes changing — Fix 1 only changes what the
**component** does with the value the hook already produces correctly. `itemPropSyncGuard.ts`'s guard
function itself is explicitly untouched by Fix 1 (21.4 point 2 says so) and remains correct for
genuinely external changes (another tab, the drawer) — confirmed this guard's logic is unconditional on
which caller triggered the update, so leaving it as-is for the external-change case is sound.

### Fix 2 — Studio timer, diagnose via live comparison, no guessed Rules change

**Correct call.** Given my own independent re-derivation (Section 2.2) also found no static
discrepancy, proposing a live Rules-vs-deployed comparison (or Console inspection) rather than a fourth
guessed Rules edit is the right, and now well-substantiated, next step. Nothing more can be soundly
attempted from source. The Plan's existing Path A/B/C/D fallback (deferred to if a live comparison
does find a genuine gap) is an appropriate safety net already specified elsewhere in the Plan.

### Fix 3 — Show Queue live allocation updates

**Sound and bounded, consistent with Wave C.** The proposed `onSnapshot(query(showAllocationsCollection,
where("upcomingShowId", "==", upcomingShowId)))` wrapped in `createSharedFirestoreSubscription`,
patching local state incrementally rather than a full reload, is a narrow, per-show-scoped listener —
not a corpus-wide subscription. This is a legitimate, low-read-count pattern consistent with the
project's established Wave C constraints (Section 7 of the base Plan). The mapping-function reuse
requirement (do not duplicate `listShowAllocations`'s mapping logic) is achievable —
`mapShowAllocationData` (referenced at `upcomingShowService.ts` L613) is already an extractable,
importable function.

**Regression risk — low.** `useShowAllocations`'s existing consumers (Show Queue page) would need the
hook's external interface (`allocations`, `error`, `isLoading`, `reloadAllocations`) to remain stable
so callers don't need to change; a snapshot-driven implementation can preserve that same shape.

---

## 4. Required test scenarios — assessment

Achievable with this repo's established conventions (`npx tsx --test`, no DOM-rendering framework, per
`docs/standards/TESTING.md`). Fix 1's Tests A/B/C/D/E are pure-function-testable against
`itemPropSyncGuard.ts` / `resolveQuantityCommitOutcome.ts` / the card's extracted decision logic, mirroring
the existing `usePrintRequestDetail.behavior.test.ts` harness pattern (confirmed this file already
exercises the real extracted functions, not reimplementations, per Implementation Review 3 Section 6 —
not re-verified independently here since it's Section 20's scope, but the pattern is directly reusable
for Fix 1's card-level logic). A `PortalPrintRequestItemCard.test.ts` already exists (56 lines) as a
plausible home for a card-level reconciliation test extracted the same way `itemPropSyncGuard.ts` was
extracted from the component in a prior amendment — Implement should extract the `saveDraft` success
decision (what to set `quantityInput`/`lastSavedSignatureRef`/`lastAcceptedUpdatedAtMsRef` to, given a
returned accepted quantity) into a similarly pure/testable function rather than asserting only against
rendered component output, consistent with this repo's established pattern of pulling reconciliation
logic out of components into pure modules.

Fix 3's required scenarios (immediate visibility of a new cross-client allocation, no duplicate on
duplicate event, non-visible-show event does not trigger reload, cleanup on unmount, bounded/scoped
query) are testable against `createSharedFirestoreSubscription`'s existing test conventions — I confirmed
`createSharedFirestoreSubscription.test.ts` exists (92 lines) and is a plausible template for a new
focused test file exercising the same ref-count/dedup/cleanup behavior scoped to the new
`showAllocations` per-show query.

A source-string/regex check may supplement but is correctly specified as never sole evidence, consistent
with the Plan's established requirement.

---

## 5. Blocking findings

1. **Fix 1's remediation description under-scopes the return-value plumbing.** 21.4 point 1 says
   `onUpdate`'s contract changes to "return the server-authoritative accepted quantity ... thread it
   back out to the caller instead of only committing it internally," but does not explicitly identify
   that this requires changing **two** intermediate signatures, not one:
   - `usePrintRequestDetail.updateItem` (`usePrintRequestDetail.ts` L289-413) itself has no return value
     today; it must return `serverQuantity` (or the full result) for anything downstream to use it.
   - `PrintRequestDetailView.tsx`'s `handleUpdateItem` (L192-205) currently `await updateItem(item.id,
     input)` and implicitly resolves `void`; it must be changed to `return` the hook's resolved value so
     it reaches `onUpdate`'s caller (the `PortalPrintRequestItemCard` instance) correctly.

   **Proposed correction:** Implement must update all three layers together —
   `usePrintRequestDetail.updateItem`'s return type, `PrintRequestDetailView.handleUpdateItem`'s return
   type and body, and `PortalPrintRequestItemCard`'s `onUpdate` prop type and `saveDraft`'s consumption
   of the resolved value — as one coherent, minimal change. This is very likely what Implement would do
   naturally once it starts (the plumbing is obvious once you try to thread the value through), so this
   is not a design flaw, but 21.4 as written could be read narrowly as "only change the card," which
   would silently no-op if the two upstream functions still return `void`. Flagging so Implement doesn't
   scope this too narrowly and ship a change that typechecks (if the hook keeps returning `void`,
   `onUpdate`'s new return type would either fail to typecheck against a `void`-returning implementation,
   or — worse — a loose typing could let it compile while `saveDraft` receives `undefined`).

2. **Fix 3's stated precedent is factually wrong about `createSharedFirestoreSubscription` usage in
   `staffInboxSubscriptionService.ts`** (Section 2.3 above). Not blocking to the remediation's soundness
   itself (the utility genuinely supports the pattern, confirmed independently), but Implement must not
   rely on `staffInboxSubscriptionService.ts` as a coding template for "how to call
   `createSharedFirestoreSubscription`" — it should instead look at `assistedCreationRequestsService.ts`
   or `assistedCreationUpdateAckService.ts`, the two real consumers, for the actual call pattern.
   **Proposed correction:** amend 21.3's citation before/during Implement to point at the real
   consumers for the wrapping pattern, and treat `staffInboxSubscriptionService.ts` only as precedent for
   "a bounded `onSnapshot` against this collection is safe and already shipped," which remains true.

Neither finding blocks proceeding to Implement — both are precision corrections to the remediation
description that Implement should internalize, not open questions requiring a new owner decision.

---

## 6. Non-blocking notes

1. Fix 1's `lastAcceptedUpdatedAtMsRef` bookkeeping after the fix still needs a defined value to stamp
   on a **successful, matching** save (not just the rejected-and-corrected case) — 21.4 point 2(c) is
   somewhat abstractly worded ("in a way that does not retroactively block the very correction that
   produced it"). The concrete approach that satisfies this without reintroducing the original bug is
   presumably: on success, if the server's returned response includes (or can be paired with) a fresh
   `updatedAt`, use it; otherwise, since the component itself just synchronously applied the accepted
   value to its own `quantityInput`/`lastSavedSignatureRef`, the guard's timestamp comparison becomes
   moot for this specific save (the local state already matches reality without needing the prop-sync
   effect to do anything) — but a subsequent stale reload could still race if `Date.now()` remains the
   stamped value and a genuinely newer external `updatedAt` arrives sooner than expected. This is a
   subtlety Implement should verify with Test E specifically, not merely assume closed by Fix 1's
   headline change.
2. Confirmed no Functions/Rules/index/migration/deployment action is proposed or required for Fix 1 or
   Fix 3 — both are pure client-side TypeScript/TSX changes.
3. Fix 2 correctly proposes no code or Rules change at all this pass beyond what Amendment 2 already
   shipped (the diagnostic `console.error`) — nothing further to assess there.

---

## 7. Firestore index requirement for Fix 3

**No new Firestore index is required.** The proposed listener query,
`where("upcomingShowId", "==", upcomingShowId)` with no `orderBy` and no additional `where` clause, is a
single-field equality filter — Firestore auto-indexes every field for equality queries by default; no
composite index entry is needed for this shape. Confirmed by inspecting `firestore.indexes.json`: the
existing `showAllocations` composite indexes (`upcomingShowId + status + updatedAt`,
`printRequestId + status + updatedAt`, `requestOriginSnapshot + updatedAt`) are for different, more
complex query shapes than the plain single-field filter being proposed here; the proposed query is
already the exact same shape `upcomingShowService.listShowAllocations` (`upcomingShowService.ts` L604-607)
already issues today via `getDocs`, and that call already ships successfully in production without any
composite index — the live `onSnapshot` version issues the identical query, just persistently. **No
"prepare, stop, ask" index-approval step is triggered by Fix 3.**

---

## 8. Scope-boundary confirmation

- **DPI logic:** not touched — Fix 1 does not modify `assessPrintRequestItemSize` or any sizing
  function; Fix 3 has no DPI relevance.
- **25-print-limit / clamp arithmetic:** not touched — `clampItemQuantityToWorkingRequestMax` is
  explicitly untouched per 21.4 point 5, confirmed no proposed change references it.
- **One-working-request policy:** not touched by any of the three fixes.
- **Unbounded Firestore read risk:** none introduced. Fix 3's listener is explicitly scoped to one
  `upcomingShowId` at a time (confirmed no proposal to widen to all shows or a collection-wide listener),
  and Section 21.4 point 6 explicitly forbids that widening.
