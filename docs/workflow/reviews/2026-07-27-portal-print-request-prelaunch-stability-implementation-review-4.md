# Portal Print Request Pre-Launch Stability — Implementation Review 4

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent context, fourth Implementation Review on this goal)
- **Scope:** Amendment 3 (Plan Section 21) — Fix 1 (item-card local draft reconciliation), Fix 2
  (Studio timer diagnostic handoff), Fix 3 (Show Queue live allocation updates). Sections 19/20 are
  treated as field-confirmed-working baseline, spot-checked for regression only.

---

## 1. Verdict

**`APPROVED`**

---

## 2. Independence statement

I did not defer to any of the three prior Implementation Reviews on this goal, nor to the
orchestrating agent's pre-verification summary. I read Section 21 of the Plan in full (21.1–21.7)
and the Amendment 3 Formal Review directly, then independently re-traced the runtime logic myself by
reading full source files (`PortalPrintRequestItemCard.tsx`, `resolveSavedDraftReconciliation.ts`,
`usePrintRequestDetail.ts`, `PrintRequestDetailView.tsx`, `itemPropSyncGuard.ts`,
`resolveQuantityCommitOutcome.ts`, `upcomingShowService.ts`, `useShowAllocations.ts`,
`createSharedFirestoreSubscription.ts`) and both new test files in full, and by re-running
`npx tsx --test`, Portal typecheck, `build:portal`, `build:studio`, and `lint` myself rather than
trusting reported counts. Two prior "APPROVED" verdicts on this exact goal proved incomplete under
the owner's own runtime QA — I treated that as reason to verify every claim at the source, not as
grounds for extra skepticism toward this specific diagnosis, which is genuinely different work.

---

## 3. Fix 1 — item-card local draft reconciliation

**All three plumbing layers confirmed genuinely wired, not partially stubbed:**

1. `usePrintRequestDetail.updateItem` (`apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts:289-419`)
   is typed `Promise<{ quantity: number }>` and returns `{ quantity: serverQuantity }` at L392,
   where `serverQuantity = resolveServerAuthoritativeQuantity(result)` (L379,
   `resolveQuantityCommitOutcome.ts:40-42` — returns the server response's `quantity` verbatim).
2. `PrintRequestDetailView.handleUpdateItem` (`apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx:192-208`)
   is typed `Promise<{ quantity: number }>` and does `return updateItem(item.id, input);` at L205 —
   a direct, non-discarding pass-through.
3. `PortalPrintRequestItemCard.tsx`'s `onUpdate` prop (L77-80) is typed
   `Promise<{ quantity: number }>`. `saveDraft`'s success path (L371-399) destructures
   `const { quantity: acceptedQuantity } = await onUpdate(...)` and feeds it to
   `resolveSavedDraftReconciliation` (L382-388), applying the returned `quantityInput` (only when it
   differs, L389-391) and `lastSavedSignature` (L392) directly and synchronously.

**`resolveSavedDraftReconciliation.ts`** (`apps/portal/features/print-requests/components/resolveSavedDraftReconciliation.ts`)
is a small pure function: it rewrites `quantityInput` to `String(acceptedQuantity)` whenever it
differs from the current input, and builds `lastSavedSignature` from the accepted (not typed) value.
No fabrication — confirmed correct by hand and by its 3-case unit test
(`resolveSavedDraftReconciliation.test.ts`), which explicitly asserts the clamped-5-not-typed-7 case.

**Verified the rejected-value correction does NOT depend on the async prop-sync effect.** The fix
applies the correction directly inside `saveDraft`'s own success branch, before
`lastAcceptedUpdatedAtMsRef.current = Date.now()` is stamped (L399) — so by the time that stamp
happens, `quantityInput` already reflects the accepted value. The guard
(`itemPropSyncGuard.ts:20-48`, `shouldAcceptIncomingItemProp`) is unchanged: still an unconditional,
caller-agnostic `incomingUpdatedAtMs >= lastAcceptedUpdatedAtMs` comparison with the same
signature-match short-circuit and null-fallback behavior as previously reviewed. It was not bypassed
or globally disabled — it still runs on every `item` prop change; Fix 1 simply ensures the card no
longer *needs* it to correct its own just-rejected value, while leaving it fully intact for a
genuinely external change (another tab, the drawer).

**Stepper parity — genuinely tested, with one caveat.** `stepQuantity` (`PortalPrintRequestItemCard.tsx:435-445`)
calls `scheduleSave()` → `saveDraftRef.current()` → the same `saveDraft` function typed input uses;
there is no separate save path. `usePrintRequestDetail.behavior.test.ts` "Test B" (L466-495) drives
`DetailHarness.updateItemQuantity` with `requestedQuantity: 6` (modeling one stepper increment past
5) on one path and `requestedQuantity: 7` (typed) on a parallel path, both clamped by the server to
5, and asserts both `CardHarness.quantityInput` values converge to `'5'`. This is meaningful — it
proves the reconciliation function treats both origins identically — but it is not a literal
`stepQuantity()` invocation (that function lives inside the component and is untestable under this
repo's no-DOM-rendering convention, same limitation the Plan itself acknowledges at 21.5 for Test C).
The parity claim is therefore proven at the level "the same `saveDraft`/`onUpdate`/reconciliation path
is exercised for both origins and produces the same output" — which is the correct and only
concretely testable notion of parity here, not a gap in the review.

**Regression check — dead code removed, not duplicated.** `usePrintRequestDetail.ts` no longer
exports `updateItemQuantity`; confirmed by grep (only `updateItem` remains) and by the dedicated test
at `usePrintRequestDetail.behavior.test.ts:598-608`.

**Note:** `PortalPrintRequestItemCard.test.ts` (the file at that exact path) is entirely about item 8
("Request Again" button) and contains zero Fix-1-relevant assertions — all genuine Fix 1 coverage
lives in `usePrintRequestDetail.behavior.test.ts`'s "Fix 1 ... Test A-E" describe block instead. This
is a filing/naming mismatch relative to what a reader might expect from the file name, not a coverage
gap — confirmed the actual assertions exist and pass.

---

## 4. Fix 2 — Studio timer disposition

**Correct call, and appropriately not attempted.** I independently re-read the batch write in
`upcomingShowService.startShowPrinting` and the relevant `firestore.rules` allowlist functions
myself rather than accepting the fourth re-derivation's conclusion, and found the same result: every
field the write sends is in the allowlist, the enum value is valid, and the partial
`showAllocations` update's identity-unchanged constraint is satisfied by Firestore's pre-merge
behavior. Nothing in source explains a `permission-denied` here. A fifth speculative Rules edit with
no new evidence would be worse than documenting a precise handoff. The diagnostic request text (live
Rules-vs-deployed comparison, or Console inspection against the specific failing document) is
concrete and actionable: it names the exact command class needed
(`firebase deploy --only firestore:rules --dry-run` or Console inspection) and the two remaining
live-only hypotheses (deployment drift vs. an existing document carrying an out-of-allowlist field).
This is something the owner can execute directly; no further source-side narrowing is possible.

---

## 5. Fix 3 — Show Queue live allocation updates

**Boundedness and ref-counting confirmed by full read of `getOrCreateShowAllocationsSubscription`**
(`apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts:359-412`):

- Keyed in a module-level `Map<string, SharedSubscription>` (`showAllocationsSubscriptionsByShowId`,
  L354-357) by `upcomingShowId`. A second call for the same show id returns the existing entry
  (L360-363) without creating a second `onSnapshot` — confirmed by `useShowAllocations.test.ts`'s
  "multiple mounted consumers ... share one underlying listener" test (L179-187), which asserts
  `startCount('show-1') === 1` after two independent `subscribe` calls.
- `createSharedFirestoreSubscription.ts:47-76`'s own `subscribe`/unsubscribe logic is genuinely
  ref-counted: `listeners.add(listener)` on subscribe, real teardown (`wrappedUnsubscribe()`) only
  when `listeners.size === 0` on unsubscribe. Confirmed by the "listener cleanup" test
  (`useShowAllocations.test.ts:158-177`), which subscribes twice, unsubscribes once (`stopCount`
  stays 0), then unsubscribes the last consumer (`stopCount` becomes 1).
- A different show id gets an independent `Map` entry and independent listener — confirmed by the
  "different show does not affect visible show" test (L138-156), asserting `show-1`'s state and
  start-count are untouched by a `show-2` subscribe/emit.
- Query is `where("upcomingShowId", "==", upcomingShowId)` only (L379), no `orderBy`/`limit`,
  identical shape to the existing one-shot `listShowAllocations` query. Mapping reuses
  `mapShowAllocationData` (L388, the same function `listShowAllocations` already uses), not a
  duplicate.
- `useShowAllocations.ts` (78 lines, full file read): `activeShowIdRef` guard (L33, L36, L49, L55)
  discards a callback firing for a show id that is no longer the active one; cleanup
  `return () => { unsubscribe(); }` (L62-64) runs on unmount/show-change via the effect's own
  cleanup.

**`useShowAllocations.test.ts` read in full (239 lines) — every assertion is genuinely meaningful,
not tautological.** It drives the real, imported `createSharedFirestoreSubscription` primitive
(L22 import, not reimplemented) through a registry that mirrors
`getOrCreateShowAllocationsSubscription`'s exact shape. Assertions checked and confirmed
non-tautological: immediate visibility of a new cross-client allocation without remount, total
recompute from a full snapshot (not a delta), non-duplication of a repeated identical snapshot,
cross-show isolation with an explicit start-count check, ref-counted cleanup timing, and single-
listener-for-multiple-consumers. A second `describe` block does static source-wiring checks
(uses `createSharedFirestoreSubscription`, no `orderBy`/`limit`, reuses `mapShowAllocationData`, no
`setInterval`/`setTimeout`, one-shot `listShowAllocations` fully replaced not left as fallback,
public hook interface preserved) — these supplement, not substitute for, the behavioral tests above,
consistent with the Plan's "regex may supplement but never be sole evidence" requirement.

---

## 6. Independent build/lint re-run

- `npx tsx --test` on all 8 affected files (`usePrintRequestDetail.test.ts`,
  `usePrintRequestDetail.behavior.test.ts`, `PortalPrintRequestItemCard.test.ts`,
  `resolveSavedDraftReconciliation.test.ts`, `useShowAllocations.test.ts`,
  `itemPropSyncGuard.test.ts`, `resolveQuantityCommitOutcome.test.ts`,
  `createSharedFirestoreSubscription.test.ts`): **51/51 pass, exit 0** (I ran this myself).
- `npm run typecheck --workspace @fresh-prints/portal`: **exit 0** (ran myself).
- `npm run build:portal`: **exit 0**, full route manifest generated (ran myself).
- `npm run build:studio`: **exactly 29 `error TS` lines**, confirmed by `grep -c "error TS"` on my
  own run. Grepped those 29 lines against every file this pass touched
  (`usePrintRequestDetail`, `PrintRequestDetailView`, `PortalPrintRequestItemCard`,
  `upcomingShowService`, `useShowAllocations`, `resolveSavedDraftReconciliation`) — zero matches.
  Baseline unchanged.
- `npm run lint`: **41 problems** (31 errors, 10 warnings), matching claimed baseline. The only
  finding inside a touched file is `PortalPrintRequestItemCard.tsx:182`,
  `'exhaustedHelperText' is assigned a value but never used` — I confirmed by grep this exact
  unused-prop pattern (`_exhaustedHelperText`/`exhaustedHelperText`) also fires in three sibling
  catalog components (`CatalogDesignCard.tsx`, `CatalogDesignDetailsModal.tsx`,
  `CatalogSelectionCard.tsx`), consistent with a pre-existing, unrelated, repo-wide pattern rather
  than something this pass introduced.
- `git diff --check`: exit 0, no whitespace/conflict-marker issues.

---

## 7. Blocking findings

None.

---

## 8. Non-blocking notes

1. `PortalPrintRequestItemCard.test.ts`'s filename suggests general card coverage but is scoped
   entirely to item 8 ("Request Again"); Fix 1's actual card-layer test coverage lives in
   `usePrintRequestDetail.behavior.test.ts`. Not a defect — the tests exist and are correct — but a
   future reader following the filename alone could miss the Fix 1 coverage. Consider a docblock
   cross-reference next time this area is touched.
2. Test B's "stepper path" models the stepper's *output* (a requested quantity one increment past
   the cap) rather than invoking `stepQuantity()` itself, which is an unavoidable consequence of this
   repo's no-DOM-rendering test convention, not a shortcut specific to this pass. Flagged for
   visibility, not as something Implement should have done differently.

---

## 9. Scope-boundary confirmation

- **DPI logic:** untouched — no diff in `assessPrintRequestItemSize`/`printRequestItemSizing.ts`.
- **New unbounded Firestore read:** none. Fix 3's listener is scoped to exactly one
  `upcomingShowId` via a single-field equality filter, ref-counted, one upstream listener per show
  regardless of subscriber count.
- **New Firestore index:** confirmed independently via `git diff -- firestore.indexes.json` — the
  only diff present is a new `printRequests` / `queueTab` + `updatedAt` composite index belonging to
  an unrelated, separately in-flight goal, not to `showAllocations` or anything Fix 3 touches. Fix
  3's query (`where("upcomingShowId", "==", ...)`, no `orderBy`/`limit`) is a single-field equality
  filter, auto-indexed by Firestore by default — no composite index entry required. No index change
  is attributable to this pass.
- **Functions/Rules/migration/deployment:** `git diff -- firestore.rules` shows a small unrelated
  diff (also part of the separately in-flight goal, not this pass's 5+3 file set); nothing in the
  diff touches `upcomingShows`/`showAllocations` update rules. No Functions changes, no migration, no
  deployment action taken or proposed by this pass.
- **Abandoned read model:** not reintroduced — Fix 3 adds a live listener against the existing
  `showAllocations` collection via the existing collection accessor, nothing resembling the removed
  generated read model.
- **25-print-limit / one-working-request policy / production timer data model:** untouched — Fix 1
  does not touch `clampItemQuantityToWorkingRequestMax`; Fix 2 proposes no code change; Fix 3 only
  changes allocation *read* delivery (fetch → subscribe), not any write path or the timer's own data
  model (`activePrintStartedAt`, `accumulatedPrintMs`, etc.).
- **Firebase Debug toast:** remains removed (out of this pass's diff; not reintroduced by anything
  touched here).
- **"Request Again" copy:** untouched by this pass; confirmed still present and correctly gated per
  `PortalPrintRequestItemCard.test.ts`'s existing item-8 assertions, which still pass.
- **Studio tsconfig fix:** untouched by this pass's 5+3 file set.
- **No production action:** confirmed — every command run was local (`npx tsx --test`, `tsc`,
  `next build`, Studio `tsc`/lint), no `firebase deploy`, no Console action, no live-data mutation.

**Regression check on Amendments 1/2's field-confirmed fixes:**
- The three redundant `reloadWorkingItems({ silent: true })` calls remain removed from
  `PrintRequestDetailView.tsx`'s `handleUpdateItem`/`handleRemoveItem`/`handleDuplicateItem` —
  confirmed by grep: only the context destructure and one explanatory comment reference
  `reloadWorkingItems` in that file now.
- `itemPropSyncGuard.ts`'s own comparison logic (not just its existence) is unchanged and still
  unconditional on which caller triggered the update — read and re-confirmed directly (Section 3
  above).
- `shouldApplyReloadedItems` (the `workingItems`-authority restructuring) is still called at
  `usePrintRequestDetail.ts:129`, gating `reload()`'s own `setItems` call exactly as before.
- Cache invalidation (`clearPortalPrintRequestReadCache`) is still called at all four expected sites
  in `portalPrintRequestService.ts` (confirmed by grep), including the two mutations
  (`removePrintRequestItem`, `updatePrintRequestItemQuantity`) Amendment 2 added it to.

---

## 10. Confidence assessment (Question 8)

**(a) Item-card quantity display defect:** High confidence this specific defect — the rejected-value
field staying stuck on the typed input after an over-cap clamp — is now fixed. I traced all three
plumbing layers by hand to their actual `return`/consumption statements (not just their existence),
confirmed the pure reconciliation function's logic against its own unit tests, and confirmed the
timing (correction applied before the `Date.now()` stamp) closes the exact race described in 21.1.
What source review cannot catch: real Firestore/network timing jitter (a save that resolves during
an unmount/remount transition, or two saves racing at exactly the debounce boundary in ways the
synchronous test harness cannot reproduce), and any interaction with `CurrentRequestDrawer.tsx`'s own
separate `reloadWorkingItems` calls if the drawer and detail page are ever mounted concurrently
against the same item — flagged as a residual risk back in Amendment 1's review (19.2 item 4) and
never fully closed by a live test, only reasoned about from source. This is exactly the kind of gap
that turned two prior "APPROVED" verdicts on this goal into runtime failures, so live QA on the exact
owner-reported repro (type an over-cap value, confirm the field snaps to the accepted value without
a remount, repeated a few times under real network latency) remains warranted before treating this as
fully closed.

**(b) Show Queue live-update defect:** High confidence at the mechanism level — the subscription is
genuinely ref-counted, scoped, and cleaned up, and this is new territory (no prior review pass
touched it, so there is no history of false "fixed" claims to be skeptical of specifically here).
What source/unit-test review cannot catch: real cross-client latency and Firestore's actual snapshot
listener behavior under a live `fresh-prints-dev` session (e.g., an offline/reconnect transition, or
two Studio sessions viewing the same show simultaneously) — the test suite proves the wrapper's
ref-counting and dedup logic correctly, using a faked `start` callback, but never exercises a real
`onSnapshot` against live Firestore. A manual QA pass (Portal customer submits to a show while a
Studio Show Queue session is already open on that show, confirm immediate visibility with no
remount) is the one thing that would move this from "high confidence from source" to "confirmed,"
exactly the standard this goal's history shows is necessary.
