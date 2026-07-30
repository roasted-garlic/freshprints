# Portal Print Request Pre-Launch Stability — Implementation Review

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent Implementation Review pass — verified shipped code
  directly against the approved Plan; did not trust any implementer self-report)
- **Plan reviewed:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
- **Formal Review reviewed:** `docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-review.md`

---

## 1. Verdict

**`APPROVED`**

Every file in the Plan's Section 8 was opened and read in full. Every claimed fix is real, correct,
and matches the Plan's design — not merely "a diff exists." The stale-completion guard is a genuine
per-item monotonic generation tracker (`ItemMutationGenerationTracker`), independently unit-tested.
The item-1 fix is a real bounded missing-subset retry with a genuine zero-extra-reads short-circuit
on full success. The item-7 fix genuinely threads the queue-to-show callable's authoritative result
through to a local, zero-read allocation-totals patch. All scope boundaries (DPI, Firestore read
model, 25-cap arithmetic, dev-gate, no Functions/Rules/indexes, no production action) are honored.
The pre-existing `build:studio` tsconfig defect and the lint characterization are both independently
re-verified below and stand as claimed. No blocking findings. One non-blocking note.

---

## 2. Point-by-Point Verification Against Plan Section 8 / Section 9

### File #1 — `apps/portal/features/catalog/services/catalogService.ts` (item 1)

**Confirmed correct**, `getReadyDesignsByIds` (L296-374):
- New exported pure helper `resolveMissingDesignIds(requestedIds, foundDesigns)` (L233-239)
  computes exactly the requested-but-not-found subset via a `Set` lookup.
- L306-315: on the generated-snapshot path, `missingIds = resolveMissingDesignIds(uniqueIds,
  generatedDesigns)`; **if `missingIds.length === 0`, returns `generatedDesigns` immediately** (L313-315)
  — genuinely zero extra reads on a fully successful response, exactly the property the Formal
  Review flagged as non-optional.
- L317-324: on a successful-but-incomplete response, traces the fallback activation and falls
  through to the **existing** per-doc fallback loop, now bounded to `missingIds` (L337: `missingIds.map(...)`),
  not the full `uniqueIds` set.
- No polling loop, no arbitrary delay, no retry-count/backoff logic beyond the one bounded pass —
  matches the Plan's "narrow retry with a completeness check" design exactly (no backoff was
  actually needed since the fallback is a direct authoritative per-doc read, not a re-poll of the
  same generated snapshot).
- Test (`catalogService.test.ts`): 5 cases directly exercise `resolveMissingDesignIds` — full
  success → `[]` (asserted as the exact trigger for zero fallback reads), partial cold-start gap →
  exact missing subset, "never expands beyond the exact missing subset," full-miss case, and
  order/dedup behavior. This is genuine behavioral coverage of the pure retry-bound logic, not a
  superficial existence check.

### Files #2–#5 — the items 2/5/7 shared fix

**`usePrintRequestDetail.ts` — confirmed correct in full:**
- `removeItem` (L545-608): calls `beginItemMutation(itemId)` (L557) before the removal callable;
  calls `beginPendingItemRemovals([itemId])` (L566) while `isViewingWorkingRequest`, **before**
  `removePrintRequestItem` is awaited; on success, patches local `items` **and**
  `patchWorkingItems` (L577-581) while viewing the working request; `endPendingItemRemovals` runs
  in `finally` (L592-596) regardless of success/failure. This is exactly the fix the Plan required
  — `removeItem` previously called none of these.
- `updateItem` (L267-364): `beginItemMutation(itemId)` (L315) captures a generation token;
  optimistic patch applies to local `items` **and unconditionally** `patchWorkingItems` while
  viewing the working request (L318-325) — no longer conditional/inconsistent as before; on
  failure, `reload`/`reloadWorkingItems` only fire `if (isLatestItemMutation(itemId, generation))`
  (L341-346) — a stale failure for a superseded edit cannot clobber a newer one; the error is
  re-thrown (L347) so `PortalPrintRequestItemCard`'s "Save failed" UI is honestly reached, not
  silently swallowed.
- `duplicateItem` (L366-501): `patchWorkingItems` is called for both the optimistic insert (L415)
  and the real-id swap (L458), and again on rollback if the callable fails (L485) — matches the
  Plan's "temp-id → real-id swap must carry through to the shared cart" requirement.
- **Genuine stale-completion guard confirmed**: `itemMutationGenerationRef` (L74) wraps a new,
  directly-testable pure class `ItemMutationGenerationTracker`
  (`apps/portal/features/print-requests/utils/itemMutationGeneration.ts`) — `begin(itemId)` bumps
  a per-item counter and returns the token; `isLatest(itemId, generation)` returns true only if no
  newer mutation for that same item id has started since. This is traced through actual code, not
  merely present as an unused import — `updateItem`'s failure path and (implicitly, via the
  underlying `useWorkingCurrentRequestItems.reloadEpochRef`/`pendingRemovedItemIdsRef`) `removeItem`'s
  reconciliation both genuinely discard stale results for a superseded mutation, not merely "exist."
- Unit test (`itemMutationGeneration.test.ts`, 5 cases) directly and correctly proves: a stale
  pre-delete generation is not latest once a delete supersedes it; two edits to the same item —
  only the latest's failure path may restore; per-item independence; never-touched ids are never
  latest. This is real behavioral proof of the exact race Section 9 requires, not a wiring check.

**`useWorkingCurrentRequestItems.ts` — confirmed zero-diff / signature-compatible**, as the Plan
hedged it might be. `beginPendingItemRemovals`, `endPendingItemRemovals`, `patchWorkingItems`,
`reloadEpochRef`, `pendingRemovedItemIdsRef` are unchanged and already accept calls from any caller
— `usePrintRequestDetail` now calling them is a pure new-call-site change, no signature widening
was needed. No `useWorkingCurrentRequestItems.test.ts` file exists (confirmed via Glob) — consistent
with this file being untouched.

**`mergeServerWorkingItemsWithLocal.test.ts`** — the "items 2/5" describe block (L91-182) directly
simulates the exact two-step `filterPendingRemoved` → `mergeServerWorkingItemsWithLocal` contract
with a stale server snapshot captured before a delete, proving the removed item id does not survive
the merge; a second case proves two removed items stay absent after an unrelated quantity-edit
reload; a third proves a pending-optimistic item's latest quantity survives the temp-id → real-id
swap. This is genuine end-to-end simulation of the actual race using real (not fabricated) merge
logic, satisfying the Plan's Section 9 requirement in substance even though the assembly point
(`usePrintRequestDetail.test.ts` itself) is static source inspection — see the non-blocking note
below.

**`useMyPrintRequests.ts` (item 7) — confirmed correct:**
- `reconcileQueuedRequest` (L189-211) now accepts an optional `allocationResult:
  { totalAllocatedQuantity: number }` and, when present, patches `allocationTotalsByRequestId` via
  the new pure/exported `mergeQueuedAllocationTotal` helper (L31-45) — preserving
  `totalInProgressQuantity`/`totalPrintedQuantity` from any prior known state. Zero new fetch, zero
  new callable — matches the Plan exactly.
- `PrintRequestDetailView.tsx`'s `handleQueuedToShow` (L274-298) passes
  `{ totalAllocatedQuantity: result.totalAllocatedQuantity }` from the `PortalQueueToShowResult`
  (previously unused per the Plan's diagnosis) into `reconcileQueuedRequest(printRequestId, ...)`
  (L284-286) — confirmed the previously-discarded parameter is now genuinely threaded through.
- Test (`useMyPrintRequests.test.ts`) directly exercises `mergeQueuedAllocationTotal`: patches from
  authoritative result with zero prior state; preserves known in-progress/printed totals; does not
  disturb other requests; **immediately transitions `derivePrintRequestListTab` to `'queued'`**
  (using the real shared `derivePrintRequestListTab` function, not a stub) — a genuine end-to-end
  proof that the fix actually produces the required UI-visible outcome; a stale pre-queue 0-allocation
  response scenario; and a re-entry-parity case comparing immediate-reconciliation output against
  full-reload output for identical data. This is real behavioral coverage, not superficial.

### File #6/#7 — `PortalPrintRequestProgressPanel.tsx` / `PrintRequestDetailView.tsx` (item 4)

**Confirmed correct.** `PortalPrintRequestProgressPanel.tsx` (full file read) contains **no**
elapsed-clock readout at all — no `formattedElapsed`, no numeric time text, no live-dot driven by
time. What remains: a status chip (`getStatusChipLabel`, L18-37), an optional waiting-copy line
(L49-53, 81-83, driven by `waitingLabel`/`showWaitingCopy` — text, not a clock), and the
Queued/Printing/Done rail (L86-129). The live-dot (L71-76) is a static pulse class tied to
`isRunning`/`activeStage === 'printing'`, not a numeric countdown. `PrintRequestDetailView.tsx`
(L411-424) still passes `isLive`, `isLoading`, `isPaused`, `showElapsed`, `waitingLabel` into the
panel — this is fine and matches the Plan's own allowance ("keeps accepting the same props... unless
Implement determines a prop can be safely dropped") — the panel simply no longer renders a clock
from `showElapsed`/`isLive`, it only uses them to gate the waiting-copy line and the pulse animation.
`usePortalShowPrintProgress.ts` was not in Section 8's file list and I confirmed via `git diff
--stat` it has zero changes — the underlying production timer is genuinely untouched.

### Files #12–#15 — Firebase Debug toast (items 3/12/13/14/15)

**Confirmed correct in full.**
- `apps/portal/features/firebase-debug/components/FirebaseDebugPanelMount.tsx` (full file read):
  no `FirebaseDebugPanelActivationToast` import, no toast render anywhere. `isFirebaseDebugPanelEnabledForPortal()`
  gate (L69, `if (!isEligible) return null` at L259) and `useFirebaseDebugPanelShortcut(openDebugWindow)`
  (L107) are both present and unchanged in shape.
- `apps/studio/.../FirebaseDebugPanelMount.tsx` (full file read): no toast state, no toast effect,
  no toast render — `isFirebaseDebugPanelEnabledForStudio()` gate (L23, early return L48-50) and
  `useFirebaseDebugPanelShortcut(...)` (L25) both present and unchanged.
- Both `FirebaseDebugPanelActivationToast.tsx` files confirmed **absent** via Glob (`apps/portal/features/firebase-debug/components/FirebaseDebugPanel*.tsx`
  and the Studio equivalent list only `FirebaseDebugPanel.tsx` and `FirebaseDebugPanelMount.tsx` —
  the toast files are gone, not merely unreferenced).
- `firebaseDebugToastAbsence.test.ts` (full file read): asserts the exact toast string and the
  `FirebaseDebugPanelActivationToast` identifier are absent from both Mount sources; asserts both
  toast files do not exist on disk (`existsSync` false); asserts both eligibility-gate functions
  still exist with their original export signature; asserts the shortcut hook file exists and is
  still wired from both mounts. This is a well-constructed regression test that would genuinely
  fail if any part of the removal were incomplete or if the dev tool itself had been weakened.
- Repo-wide grep for the toast string returns exactly one hit (this test file's own literal), as
  independently re-confirmed by the orchestrating agent and not contradicted by anything I found.

### Files #8–#10 — capacity copy (item 6)

**Confirmed correct.** `printRequestQuotaUserCopy.ts` L19 reads exactly `` `You've used all
${safeCap} of your print spots on this show. Choose another show for more designs.` `` — "of your"
is present. All three test files
(`printRequestQuotaUserCopy.test.ts`, `portalShowQueueFit.test.ts`, `printRequestPerShowCustomerCap.test.ts`)
were updated to assert the corrected string (verified by direct grep — all three now contain "of
your print spots," none retain the old string). A repo-wide grep for the literal old fragment
`"print spots on this show. Choose"` returns exactly two hits, both the corrected string (with "of
your" already present) in the source file and its own test — no stale call site anywhere.

### File #11 — `PortalPrintRequestItemCard.tsx` (item 8)

**Confirmed correct.** `showCatalogReuse` gate (L182-183) is unchanged: `readOnly &&
catalogDesignId.length > 0 && catalogReuseDesign !== undefined`. Inside that gate (L538-575), when
`catalogReuseDesign` is truthy, the button (L542-562) renders a Lucide `<Repeat aria-hidden
size={14} />` icon plus the text "Print again" (or "Adding…" while in flight), and carries
`aria-label={`Print ${title} again`}` (L543) — distinct from the visible short label as required.
`onClick={() => onAddToRequest?.(catalogReuseDesign)}` (L546) is the same, unmodified
`addDesignFlow.addDesign` wiring passed down from `PrintRequestDetailView.tsx` (L521) — not
duplicated or rewired. This only renders when `readOnly` (i.e., a historical/submitted request,
`!isEditable`), never on an active working request's own items, confirmed by the gate condition
itself and by the test's explicit assertion that "Print again" only appears inside the
`showCatalogReuse`-gated block, positioned after it in source. Test file
(`PortalPrintRequestItemCard.test.ts`) directly asserts the text, the icon import/JSX, the
`aria-label` template, the gate condition regex, and the unchanged `onAddToRequest` wiring.

---

## 3. Section 9 Test List — Verification Summary

All 6 new/updated hook/component/service test files plus the 3 updated shared-copy test files were
opened and read in full (not sampled), and cross-checked against two supporting pure-logic test
files (`itemMutationGeneration.test.ts`, `mergeServerWorkingItemsWithLocal.test.ts`) that the new
tests depend on for their real behavioral coverage:

| Test file | Nature | Verdict |
|---|---|---|
| `catalogService.test.ts` | Genuine behavioral test of `resolveMissingDesignIds` incl. the required zero-extra-reads-on-full-success property | Sound |
| `usePrintRequestDetail.test.ts` | Static source-regex wiring verification (explicitly documented as such in its own header) | Sound as a wiring check; see non-blocking note |
| `itemMutationGeneration.test.ts` | Genuine behavioral simulation of the stale-completion race at the pure-logic level | Sound — this is where the actual race assertion lives |
| `mergeServerWorkingItemsWithLocal.test.ts` (items 2/5 section) | Genuine behavioral simulation of the exact "stale pre-delete server snapshot resolving after a delete" scenario, and the qty temp-id→real-id carry-through | Sound — this is where the actual race assertion lives |
| `useMyPrintRequests.test.ts` | Genuine behavioral test of `mergeQueuedAllocationTotal`, including an assertion that uses the real `derivePrintRequestListTab` to prove the tab transitions to `'queued'` immediately | Sound |
| `firebaseDebugToastAbsence.test.ts` | Static source/filesystem inspection, appropriately so (string-absence and file-deletion are inherently static properties) | Sound |
| `PortalPrintRequestItemCard.test.ts` | Static source inspection of rendered text/icon/aria-label/gate condition/unchanged wiring | Sound |

I independently re-ran all 10 relevant test files (the 6 new/updated ones plus the 2 supporting
pure-logic files plus the 2 other shared-copy test files) via
`npx tsx --test <files>`: **57/57 pass, exit 0.** (`useWorkingCurrentRequestItems.test.ts` does not
exist, as expected — the file was correctly never created since no behavior changed there.)

**Non-blocking note on test architecture:** the Plan's Section 9 literally asked for a test that
"starts a delayed pre-delete item load, completes a delete, resolves the stale load afterward, and
verifies deleted items do not reappear." No single test function does exactly that against the live
React hook (which would require a DOM-rendering harness this repo's testing convention deliberately
avoids per `docs/standards/TESTING.md`). Instead, the requirement is satisfied by **composition**:
`usePrintRequestDetail.test.ts` proves the hook's source genuinely calls the pending-removal/generation
primitives at the right points, while `itemMutationGeneration.test.ts` and
`mergeServerWorkingItemsWithLocal.test.ts` independently prove those primitives correctly resolve
the exact stale-completion scenario when driven with realistic inputs. Taken together this is
genuine, non-superficial coverage of the required race — not a test that would "pass regardless of
the fix," since removing any of the wiring assertions or reverting the pure-logic fix would fail one
of these files. This is a documentation/labeling observation about test architecture, not a defect;
no change is required.

---

## 4. Blocking Findings

**None.**

---

## 5. Non-Blocking Notes

1. See Section 3 above: the item 2/5 stale-completion regression requirement is satisfied by
   composition across three test files rather than one integration-style test. This is consistent
   with this repo's documented no-DOM-rendering test convention and is not a gap in actual coverage
   — just worth knowing for anyone searching for "the" race test later.
2. `useWorkingCurrentRequestItems.ts` ended up a true zero-diff file, exactly as the Plan and Formal
   Review both anticipated as the likely (fine) outcome.
3. `PortalPrintRequestProgressPanel.tsx` still accepts `isLive`/`showElapsed` props from the caller
   (used only to drive the waiting-copy line and the live-dot pulse, not a clock) — matches the
   Plan's explicit allowance to keep the same prop surface rather than force an unrelated caller
   change.

---

## 6. Scope-Boundary Re-Verification (independent)

- **`printRequestItemSizing.ts` / `printSize.constants.ts` untouched:** confirmed. Grepped every
  file in Section 8's list plus the two hook files for these imports; found only two **pre-existing**
  imports (`useAddDesignToRequestFlow.ts` L14, `usePrintRequestDetail.ts` L10 —
  `formatPrintRequestItemSizeLabel`, a display-label formatter, not DPI validation logic) in files
  that are not part of this goal's changes to those specific lines. No file in Section 8 modifies
  DPI validation. Confirmed.
- **No new Firestore read/callable/index/Rule introduced:** confirmed. Grepped all changed files for
  `collection(`/`getDocs(`/`onSnapshot(`; the only hits are in `catalogService.ts`'s pre-existing
  `listReadyDesignsPage`/`listActiveCategories`/`getReadyDesignsByIds`'s pre-existing per-doc
  `getDoc` fallback (all already present before this goal, confirmed by the surrounding function
  bodies being otherwise unchanged apart from the bounded-retry logic added around them). Items
  2/5/7's fixes are pure in-memory state reconciliation (`patchWorkingItems`, `beginPendingItemRemovals`,
  `mergeQueuedAllocationTotal`) with zero new reads. Confirmed.
- **`generated/studio-print-requests/**` / `generated/portal-print-requests/**` untouched/unreferenced:**
  confirmed via grep — zero hits in any changed file.
- **25-print-limit arithmetic untouched beyond the one copy string:** confirmed —
  `printRequestQuotaUserCopy.ts` is a 20-line file; only the template string literal changed;
  `finitePositive`/`safeCap` logic is byte-identical. `printRequestPerShowCustomerCap.ts` and
  `portalShowQueueFit.ts` were not touched at all except their test files' string assertions.
- **No Functions/Rules/indexes file modified:** confirmed — none of Section 8's files live under
  `functions/`, `firestore.rules`, `storage.rules`, or any index config; no such file appears in
  `git diff --stat` scoped to this goal's changed files.
- **No production/deployment action referenced:** confirmed — no `firebase deploy`, no App Hosting
  config change, appears anywhere in the changed files or the Plan/Review documents themselves
  (Section 12 of the Plan explicitly states none is required or authorized).

---

## 7. Independent Re-Verification of the Pre-Existing Defect Claims

### `build:studio` / tsconfig defect

Independently re-ran the exact chain of reasoning myself rather than trusting the prior summary:
- `git log -p -- apps/studio/tsconfig.json` shows `"ignoreDeprecations": "6.0"` was added in commit
  `043f38a` (2026-07-13, "Add Portal donate-designs uploads and Studio donated designs intake"),
  removed and re-added once earlier in the same file's history, but present and stable since
  2026-07-13 — **two weeks before this goal's 2026-07-27 date**, confirmed by direct commit-log
  inspection, not by assertion.
- `git diff --stat -- apps/studio/tsconfig.json apps/studio/tsconfig.node.json` against the current
  working tree returns **empty output** — zero lines changed by this session in either file.
- Installed TypeScript version, checked directly via `npx tsc -v`: **5.9.3**. TypeScript 5.9 does
  not recognize `"6.0"` as a valid `ignoreDeprecations` value (that option only accepts `"5.0"` in
  the 5.x line as a real, defined deprecation-suppression version); it throws `TS5103: Invalid value
  for '--ignoreDeprecations'` exactly as previously reported.
- **Conclusion, independently confirmed:** this is a genuine, pre-existing, out-of-scope repository
  defect unrelated to this goal's changes. It correctly excuses the `build:studio` exit 2 finding.

### Lint characterization

Independently re-ran `npm run lint` myself: **41 problems (31 errors, 10 warnings)**, matching the
previously reported count exactly. Spot-checked the specific example cited —
`PortalPrintRequestItemCard.tsx` line 169 (`'exhaustedHelperText' is assigned a value but never
used`) — by running `git diff` scoped to that exact file and confirming the diff is 13 lines (11
insertions, 2 deletions), entirely the "Print again" button/icon/aria-label change, and does **not**
touch line 169 or the `exhaustedHelperText` prop declaration at all. This independently confirms the
unused-var finding on that line predates this goal's edit to the file. I did not exhaustively
re-verify all 41 findings against every file's diff, but the file list shown by lint (assisted-creation
components, catalog cards, `useCustomerUploadBatch.ts`, Studio Electron/functions files,
`portalBiddingAcknowledgmentCopy.ts`) has no overlap with Section 8's file list except the one
`PortalPrintRequestItemCard.tsx` case directly spot-checked here, which is the highest-risk
candidate for a false "pre-existing" claim and it holds up.

**Conclusion: both pre-existing-defect claims are confirmed accurate on independent re-verification.**

---

## 8. Summary

This is a clean, well-executed implementation that matches its approved Plan closely, including in
places where the Plan explicitly anticipated ambiguity (the zero-diff `useWorkingCurrentRequestItems.ts`
file, the prop-surface-preserving progress-panel change). The stale-completion and pending-removal
mechanisms are not merely present as unused scaffolding — they are genuinely wired into every call
site the Plan specified, and the supporting pure-logic tests genuinely simulate the races the owner
was worried about. No scope creep, no new reads, no DPI logic touched, no production action anywhere
in this diff. **Verdict: APPROVED.**
