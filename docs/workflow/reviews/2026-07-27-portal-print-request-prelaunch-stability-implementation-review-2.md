# Portal Print Request Pre-Launch Stability — Implementation Review 2 (Post-Amendment)

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent — this review does not defer to the prior
  Implementation Review's `APPROVED` verdict, which was proven wrong by the owner's real runtime
  QA)
- **Scope:** Section 19 remediation pass — removal of the redundant component-level
  `reloadWorkingItems({ silent: true })` calls, the `itemPropSyncGuard.ts` prop-sync guard, the
  "Request Again" copy correction, and the Studio `tsconfig.json` build-blocker fix.
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 19 (19.1–19.7)
- **Amendment Formal Review (plan-only, pre-implementation):**
  `docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-review.md`
  (`approved_with_changes`)
- **Prior Implementation Review (superseded by real runtime QA `FAIL`, not deferred to):**
  `docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review.md`

---

## 1. Verdict

**`APPROVED`**

---

## 2. Independence statement

I did not defer to the prior Implementation Review's `APPROVED` verdict, which the owner's actual
runtime QA proved incorrect. I opened and traced the current source myself — `PrintRequestDetailView.tsx`,
`usePrintRequestDetail.ts`, `useWorkingCurrentRequestItems.ts`, `mergeServerWorkingItemsWithLocal.ts`,
`PortalPrintRequestItemCard.tsx`, and the new `itemPropSyncGuard.ts` — reconstructing the actual
remove and quantity-update call sequences end to end from the files as they exist now, not from any
prior review's summary of them. Where the orchestrating agent's pre-verified findings were relevant
(build/lint characterizations), I independently re-ran the commands myself rather than accepting the
prior characterization at face value.

---

## 3. Removed-item race — verified fixed

`PrintRequestDetailView.tsx` L224–242 (`handleRemoveItem`): calls `await removeItem(item.id)` and
then only `setItemPendingRemoval(null)` — **no** `reloadWorkingItems` call remains. The comment at
L230–232 explicitly documents why (the actual root cause of the original defect).

`usePrintRequestDetail.removeItem` (L545–608): `beginItemMutation(itemId)` (L557), and while
`isViewingWorkingRequest`, `beginPendingItemRemovals([itemId])` (L566) runs **before** the awaited
`removePrintRequestItem` callable. On success it synchronously filters both local `items` (L576) and
`workingItems` via `patchWorkingItems` (L577–581), and `endPendingItemRemovals([itemId])` runs in the
`finally` (L592–596) regardless of outcome.

Grepped every `reloadWorkingItems` call site app-wide: the only remaining callers are
`CurrentRequestDrawer.tsx` (L210, L298 — both gated behind an error path or a `shouldReconcile` flag,
not unconditional), `useAddDesignToRequestFlow.ts` (L224, L298 — its own error/reconcile paths), and
`useWorkingCurrentRequestItems.ts`'s own mount effect (L260). None of these fire immediately after a
`PrintRequestDetailView.tsx` mutation succeeds. **No code path remaining in `PrintRequestDetailView.tsx`
calls `reloadWorkingItems` after `removeItem`/`updateItem`/`duplicateItem` resolves.**

## 4. Quantity race — verified fixed

`handleUpdateItem` (L192–205): `await updateItem(item.id, input)`, nothing after. Comment at
L198–201 documents the same rationale.

`usePrintRequestDetail.updateItem` (L267–364): generation token via `beginItemMutation(itemId)`
(L315) taken before the optimistic patch; `setItems(applyLocalItemPatch)` (L318) and, while
`isViewingWorkingRequest`, `patchWorkingItems(applyLocalItemPatch)` (L324) both run synchronously
before the callable is even awaited — success requires no further action. The **only** remaining
`reloadWorkingItems` call inside this hook is on the **error** path (L341–346), gated by
`isLatestItemMutation(itemId, generation)` so a superseded failure cannot clobber a newer edit — this
is inside the hook (with its generation guard), not the component, and was correctly left alone by
19.2.

`duplicateItem` (L366–501) follows the same pattern: optimistic insert patches both `items` and
`workingItems` (L413–416), real-id swap patches both again (L451–459), and the error-rollback path
also patches both (L476–486) — no reload anywhere in this function.

**Confirmed: `removeItem`/`updateItem`/`duplicateItem` still correctly patch both `items` and
`workingItems` synchronously on success**, unchanged from the prior pass and not broken by this one.

## 5. Residual-risk path (`CurrentRequestDrawer.tsx`) — verified handled by the card-level guard, not by removal

`CurrentRequestDrawer.tsx` still has its own `reloadWorkingItems({ silent: true })` calls (L210 inside
a quantity-flush error catch, L298 gated by a `shouldReconcile` flag after a remove). These are
out-of-scope, pre-existing call sites the amendment correctly did not remove (19.2 item 4). I checked
whether either could still deliver a stale prop to a mounted `PortalPrintRequestItemCard` for a
**different** item than the one just mutated on the detail page: yes, in principle, if the drawer and
detail page are both mounted against the same working request. This is exactly the scenario
`itemPropSyncGuard.ts` exists to cover — see Section 6. **No other path was silently reintroduced** that
would resurrect stale data outside what the guard already covers.

## 6. `itemPropSyncGuard.ts` — logic verified sound, not merely plausible

`shouldAcceptIncomingItemProp` (`itemPropSyncGuard.ts` L20–48):
- Signature-equal → reject (no-op either way; correct, matches pre-fix early-return behavior).
- Either side missing `updatedAt` → accept (falls back to legacy signature-only behavior, e.g. for
  optimistic rows that have no real timestamp yet) — correct, since there's no sound basis to reject
  without a comparable timestamp.
- Otherwise: accept only if `incomingUpdatedAtMs >= lastAcceptedUpdatedAtMs` — reject strictly older.

Integration in `PortalPrintRequestItemCard.tsx`:
- `resolveItemUpdatedAtMs` (L164–166) reads `item.updatedAt?.toMillis()`, `null` if unavailable.
- `lastAcceptedUpdatedAtMsRef` (L227) is seeded from the initial `item` and advanced in two places:
  the prop-sync effect itself (L263–265, when a prop is accepted) and `saveDraft`'s success branch
  (L370–374).
- The `saveDraft` fallback (L371–374): `onUpdate` does not return a fresh server `updatedAt`, so the
  card sets `lastAcceptedUpdatedAtMsRef.current = Date.now()` immediately after its own save commits.
  **This reasoning is correct**: `Date.now()` at the moment of a just-committed local save is
  necessarily `>=` any real Firestore `updatedAt` timestamp this card has been shown so far (the
  server write that produced that real timestamp already happened in the past relative to this
  instant), so any subsequently-arriving stale prop carrying an older real `updatedAt` is correctly
  rejected by the `>=` comparison. This is not a disguised hack — it is a sound, minimal use of a
  local clock as a lower-bound freshness marker, exactly analogous to `reloadEpochRef`/generation
  counters already used elsewhere in this codebase (not a new architecture).

## 7. New tests — verified they assert on resulting state, not on calls

`itemPropSyncGuard.test.ts` (5 cases): each constructs concrete `{incomingSignature,
lastSavedSignature, incomingUpdatedAtMs, lastAcceptedUpdatedAtMs}` inputs and asserts the boolean
`accepted` result — stale-after-save rejected, genuine-newer accepted, equal-timestamp accepted
(not treated as older), no-op reject on unchanged signature, and the missing-timestamp fallback in
both directions. All are direct input→output assertions, not mock-invocation checks.

`mergeServerWorkingItemsWithLocal.test.ts`'s new `describe` block (5 new cases, lines 91–253):
constructs realistic before/after states — a `localAfterRemoval` array and a `staleServerSnapshot`
still containing the removed row, passed through the actual two-step `filterPendingRemoved` →
`mergeServerWorkingItemsWithLocal` contract — and asserts on the resulting merged array's ids/quantity,
not on whether a function was called. I confirm the deliberately-"proves-the-failure-mode" test (lines
147–185, "a stale server response resolving AFTER a remove has already fully cleared its
pending-removal marker...") is reasoning I agree with: it demonstrates that if a second reload were
still fired after `endPendingItemRemovals` clears (the exact pre-fix defect window), the merge
function's own "server rows win on matching id" contract would resurrect the row — proving the correct
fix is removing the redundant reload call site (Fix 1), not adding a merge-level guard. This is sound,
not a bug in the test.

I ran both test files myself: `npx tsx --test itemPropSyncGuard.test.ts mergeServerWorkingItemsWithLocal.test.ts`
→ **14/14 pass, 0 fail.**

## 8. "Request Again" copy — verified

`PortalPrintRequestItemCard.tsx` L583: `aria-label={\`Request ${title} Again\`}`. L598–600: visible
content is `<Repeat aria-hidden size={14} />` followed by literal text `Request Again`. Both use
title-case "Again," resolving the amendment Formal Review's flagged capitalization inconsistency
exactly as 19.3 specified. `showCatalogReuse` gating (L189–190: `readOnly && catalogDesignId.length >
0 && catalogReuseDesign !== undefined`) and `onAddToRequest` wiring (L586:
`onAddToRequest?.(catalogReuseDesign)`) are unchanged — pure string change, no behavior change,
confirmed by reading the surrounding block in full.

## 9. Studio tsconfig fix — verified

`apps/studio/tsconfig.json` L22: `"ignoreDeprecations": "5.0"`. I ran `npm run build:studio` myself:
`TS5103` does not appear anywhere in the output — confirming `"5.0"` is accepted by the installed
TypeScript 5.9.3. `git diff --stat` confirms only this one line changed in this file; no other
compiler option was touched. `git diff --stat -- functions/tsconfig.json apps/portal/tsconfig.json`
shows no changes to either file. `package.json`/`apps/studio/package.json`'s `typescript` version
pin was not touched by this remediation pass (the broader working tree has unrelated pre-existing
uncommitted changes from other goals, but none touch the `typescript` dependency version).

## 10. `build:studio`'s remaining 29 errors — independently characterized

I ran `npm run build:studio` myself (not just accepted the prior characterization) and counted **29**
`error TS` lines, matching the claimed count exactly. Every one is in a file this remediation pass did
not touch: `ai-review/utils/suggestedNewTags.test.ts`,
`customer-requests/components/AssistedCreationRequestsSection.tsx`,
`customer-uploads/hooks/useCustomerUploadIntake.ts`, `designs/components/DesignDetailsModal.tsx`,
`firebase/utils/createSharedFirestoreSubscription.test.ts`,
`print-requests/components/SplitDesignPickerModal.tsx`,
`print-requests/constants/printRequestRoutes.test.ts`,
`print-requests/hooks/usePrintRequestSelectionMode.ts`,
`print-requests/utils/printRequestQueryPlanning.ts`,
`settings/services/portalSocialMetaSettingsService.ts`,
`staff-inbox/components/StaffInboxBell.tsx`, `staff-inbox/components/StaffInboxProvider.tsx`,
`upcoming-shows/pages/UpcomingShowsPage.tsx`, `users/services/userAuditTrailActivityService.ts`,
`packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts`,
`packages/shared/src/utils/assistedCreationProofKind.test.ts`. None are `PrintRequestDetailView.tsx`,
`usePrintRequestDetail.ts`, `useWorkingCurrentRequestItems.ts`, `mergeServerWorkingItemsWithLocal.ts`,
`PortalPrintRequestItemCard.tsx`, `itemPropSyncGuard.ts`, or `apps/studio/tsconfig.json`. **Confirmed:
none are newly introduced by this pass** — they are pre-existing type errors unrelated to this fix,
previously masked by the `TS5103` failure that stopped compilation before type-checking ran.

## 11. `lint`'s 41 findings — independently characterized

I ran `npm run lint` myself: **41 problems (31 errors, 10 warnings)**, matching the claimed count. The
one finding inside a file this pass touched — `PortalPrintRequestItemCard.tsx:176:3`,
`'exhaustedHelperText' is assigned a value but never used` — is on the props destructure line, which
existed before this pass and is unrelated to the `itemPropSyncGuard`/prop-sync-effect changes (those
are further down the file, lines 233–266). This is a pre-existing unused-prop finding, not introduced
by this remediation.

## 12. Blocking findings

None.

## 13. Non-blocking notes

1. `useAddDesignToRequestFlow.ts` and `CurrentRequestDrawer.tsx` each retain their own,
   pre-existing `reloadWorkingItems` calls (gated by their own generation/pending-removal
   mechanisms) — these are correctly out of scope for this amendment, but remain the reason
   `itemPropSyncGuard.ts` is load-bearing rather than merely defensive: if either ever loses its own
   guard in a future change, the card-level guard is the last line of defense against a stale prop
   reaching a mounted card for a different item than the one being mutated on the detail page. Future
   changes to those two files should be checked against this guard's assumptions.
2. `git diff --check` was re-run and exits 0 — no whitespace errors.

## 14. Scope-boundary re-verification

- **DPI logic:** untouched. `packages/shared/src/constants/printSize.constants.ts` still defines
  `EFFECTIVE_DPI_BAD_MIN = 200` / `MIN_PRINT_REQUEST_EFFECTIVE_DPI = EFFECTIVE_DPI_BAD_MIN`, unchanged
  by this pass; no file in this remediation's scope touches DPI validation.
- **New unbounded Firestore read:** none. This pass **removes** three `listPrintRequestItems`
  round trips (the redundant reloads) and adds zero new reads; `itemPropSyncGuard.ts` is pure
  in-memory logic.
- **Functions/Rules/indexes/migration:** none touched by this pass.
- **Abandoned read model:** not reintroduced; nothing in this pass reads/writes any generated
  print-request read-model path.
- **25-print-limit / one-working-request policy / production timer:** untouched by this pass;
  `printRequestQuotaUserCopy.ts`'s "of your" copy and the elapsed-clock removal were separate,
  already-verified items from the original (non-amendment) pass and are not implicated in Section 19.
- **Firebase Debug toast:** confirmed still removed — grepped `apps/portal/features`,
  `apps/portal/app`, and `apps/studio/src` source trees for the literal string `Firebase Debug panel
  available (Ctrl+Shift+F)`: zero matches in source (the string only appears in a pre-existing
  compiled `apps/studio/dist/` bundle artifact, not source code).
- **No production/deployment action:** none taken or proposed anywhere in this review or the
  diff under review.

## 15. Direct answer to the key question

**Yes — there is concrete evidence from the actual code that the owner's manual QA scenarios will
now behave correctly, not merely a plausible-looking fix.**

- *Remove an item, cancel Add to Show, edit another item's quantity, navigate away and back —
  removed item stays removed:* The specific mechanism that resurrected it (`PrintRequestDetailView`'s
  own unconditional `reloadWorkingItems({ silent: true })` firing immediately after `removeItem`
  resolved, racing past `beginPendingItemRemovals`/`endPendingItemRemovals`'s already-cleared guard)
  is gone from the source — confirmed by reading `handleRemoveItem` at its current lines (224–242)
  and grepping every remaining `reloadWorkingItems` call site app-wide. `removeItem` itself still
  synchronously filters both `items` and `workingItems` on success. A new behavior-level test
  (`mergeServerWorkingItemsWithLocal.test.ts` lines 104–125, 127–145) proves the corrected sequence
  (filter-then-merge with the pending-removal guard properly engaged) keeps the removed item absent.
- *Change a quantity, wait for save, navigate away and back — latest quantity persists:* Same
  removal of the racing reload from `handleUpdateItem`, plus the new `itemPropSyncGuard.ts`, which
  specifically defends the remaining, out-of-scope `reloadWorkingItems` call sites
  (`CurrentRequestDrawer.tsx`) against delivering a stale pre-save prop to a mounted item card. The
  guard's logic was independently verified sound (Section 6), and its test suite proves the exact
  state transition — a stale older-timestamped reload prop is rejected after a newer save, while a
  genuinely newer external edit is still accepted (`itemPropSyncGuard.test.ts`, all 5 cases, run and
  passing).

**No gap identified.** Both defects' actual, traced root causes (not the previously-verified-but-
insufficient reconciliation primitives) have been removed or guarded at the exact call sites where the
race occurred, and the new tests model the real cross-file sequencing — not source-presence or
mock-invocation checks — that the prior test suite lacked.
