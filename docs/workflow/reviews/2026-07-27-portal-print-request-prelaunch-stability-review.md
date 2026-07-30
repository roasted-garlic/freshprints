# Portal Print Request Pre-Launch Stability — Formal Review

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent pass; did not see the Planning Agent's reasoning)
- **Plan reviewed:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
- **Verdict:** `approved_with_changes`

---

## 1. Verdict

**`approved_with_changes`.** The Plan's architecture, root-cause investigation, and file inventory
are exceptionally well-grounded in actual source — nearly every claim I independently re-derived
from the code matched. However, I found **one blocking factual defect** (Section 2 below) that must
be corrected before Implement, because it is wired directly into test-writing guidance and could
cause Implement to write regression tests against the wrong DPI boundary. I also found one
non-blocking internal inconsistency and a few minor notes. Everything else — the bounded-Firestore
constraint, scope boundaries, root-cause claims for items 2/5/7, the cold-start explanation for item
1, and the debug-toast/dev-gate separation — is sound and independently confirmed.

---

## 2. Blocking Finding

### The Plan's "corrected" DPI floor claim (Section 1) is itself factually wrong, and it is embedded in Section 9's test-writing instruction

**Location:** Plan Section 1 ("Executive Summary"), lines 27-35; propagates into Section 9's Item 5
regression-test guidance ("items 5's regression tests must not assume a 200 DPI floor").

**What I checked:** `packages/shared/src/utils/printRequestItemSizing.ts` and
`packages/shared/src/constants/printSize.constants.ts` (the exact file the Plan cites as proof of a
"72 DPI reject floor").

**What the source actually shows:**

```ts
// printSize.constants.ts, line 97-103
export const EFFECTIVE_DPI_BAD_MIN = 200;
/**
 * Minimum effective DPI allowed when saving a size on a standard Print Request item.
 * Import can still accept lower-resolution catalog assets; request sizing cannot go below this floor.
 */
export const MIN_PRINT_REQUEST_EFFECTIVE_DPI = EFFECTIVE_DPI_BAD_MIN;
```

```ts
// printRequestItemSizing.ts, line 193-196
export function resolvePrintRequestItemDpiQualityLevel(effectiveDpi: number): PrintRequestItemDpiQualityLevel {
  if (!Number.isFinite(effectiveDpi) || effectiveDpi < MIN_PRINT_REQUEST_EFFECTIVE_DPI) {
    return "below_minimum";
  }
  ...
```

```ts
// printRequestItemSizing.ts, line 324 (runtime error message)
errorMessage: `Requested size is below the ${MIN_PRINT_REQUEST_EFFECTIVE_DPI} DPI minimum for standard Print Requests.`,
```

The constant's own doc-comment is explicit and unambiguous: it is the floor for **saving a size on a
standard Print Request item**, and its value is **200**, not 72. The customer-facing error string
literally renders "Requested size is below the 200 DPI minimum for standard Print Requests." today.

**Why the Plan got this backwards:** `DATA_MODEL.md`'s "Standard Print Request item sizing rules"
section (which the Plan cites) does say "Saves below 72 DPI are blocked" — but that text, read in
full context alongside `SECURITY.md`'s import/upload validation sections, describes a **different**
code path: catalog import / customer-upload acceptance validation (`imageQualitySizingPolicy.ts` /
import validators), where 72 DPI is genuinely the reject floor for accepting an *asset* into the
system. `printRequestItemSizing.ts`'s `assessPrintRequestItemSize` is a **separate, dedicated**
module specifically for the standard Print Request item **save/resize** action, and it enforces 200
DPI as its own floor — a stricter, later-added floor layered on top of the looser import floor. The
Plan conflated the two floors and asserted the owner's original "200 effective DPI" brief was
factually wrong, when in fact the owner's brief was correct and the Plan's "resolution" inverts it.

**Concrete failure scenario if uncorrected:** Section 9 tells Implement, in the item 5 regression
test guidance, that tests "must not assume a 200 DPI floor when asserting save behavior." If Implement
follows this literally, a new or updated test could assert that a print-request item resize/save at,
say, 100 effective DPI succeeds (treating 72-299 as uniformly "warn, but saveable") — which is false;
the real code path rejects anything below 200 DPI with `canSave: false`. That produces a regression
test that passes against the wrong contract, which is worse than no test: it would give false
confidence that stale-completion save races (item 5's actual target) are covered correctly at
DPI boundaries the real code doesn't behave as asserted.

**Required correction before Implement:** Section 1 should be rewritten to state the accurate,
already-shipped fact: `printRequestItemSizing.ts`'s `MIN_PRINT_REQUEST_EFFECTIVE_DPI` (200,
`EFFECTIVE_DPI_BAD_MIN`) is the floor governing standard Print Request item **saves**; 72 DPI governs
a separate, earlier **import/upload acceptance** path documented in `DATA_MODEL.md`/`SECURITY.md` and
is not what `printRequestItemSizing.ts` enforces. Section 9's item 5 test-writing note should be
corrected to say tests must use the real 200 DPI floor (`below_minimum` under 200, warn 200-299,
clean 300+) when constructing any DPI-boundary-adjacent test fixture, not invent or assume 72.

**Scope impact:** This does not change the actual fix design for items 2/5/7 (none of the proposed
file changes touch DPI validation logic — that part of the Plan's claim is true and I confirmed no
`printRequestItemSizing.ts`/`printSize.constants.ts` file appears in Section 8's file list). The
defect is confined to Section 1's restated fact and Section 9's test-writing instruction, but both
must be corrected — an incorrect DPI-floor assumption baked into new regression test fixtures is
exactly the kind of thing a Formal Review exists to catch before Implement writes tests against it.

---

## 3. Independently Verified Claims (file:line citations)

I opened every file the Plan cites for items 1, 2, 5, 7, 3, 4, 6, and 8, plus the shared
context/hook files, and compared the Plan's narrative to the actual code, not the Plan's own summary.

### Items 2/5/7 shared root cause (Section 3, 4, 6)

- **Confirmed:** `usePrintRequestDetail.ts` `removeItem` (actual lines 500-531) never calls
  `beginPendingItemRemovals`/`endPendingItemRemovals`/`patchWorkingItems` — it only mutates local
  `items`/`printRequest` state via `setItems`/`setPrintRequest`. This exactly matches the Plan's
  claimed root cause.
- **Confirmed:** `updateItem` (actual lines 250-333) does call `patchWorkingItems` on the optimistic
  path (line 299, gated by `isViewingWorkingRequest`) but only calls `reload`/`reloadWorkingItems` on
  the **error** path (lines 313-317), never on success — matching the Plan's description.
- **Confirmed:** `useWorkingCurrentRequestItems.ts` genuinely implements `reloadEpochRef` (line 96),
  `pendingRemovedItemIdsRef` (line 94), `beginPendingItemRemovals`/`endPendingItemRemovals` (lines
  106-119), and `patchWorkingItems` (lines 272-277) exactly as the Plan describes, and its own
  doc-comment (lines 59-64) does say it is the "Single owner of working Current Request item loads"
  — confirming the Plan's characterization of a declared-but-violated invariant.
- **Confirmed:** `PortalPrintRequestContext.tsx` exposes `beginPendingItemRemovals`,
  `endPendingItemRemovals`, and `patchWorkingItems` (lines 71-73, 316-317) as context functions that
  `usePrintRequestDetail` has access to but never calls — the mechanism the Plan proposes to extend
  already exists and is already wired through context, not invented.
- **Confirmed (item 7):** `useMyPrintRequests.ts` `reconcileQueuedRequest` (actual lines 158-164)
  patches only `request.status`, never `allocationTotalsByRequestId` — exactly the Plan's claim — and
  the `'full'`-scope reload that would populate `allocationTotalsByRequestId` is genuinely gated on a
  `pathname` transition onto `/requests` or `/dashboard` (lines 98-119), not on the detail route.

### Item 1 cold-start (Section 5)

- **Confirmed:** `catalogService.ts` `getReadyDesignsByIds` (actual lines 281-336): the
  `try { return await portalCatalogAssetService.getDesignsByIds(uniqueIds) } catch { ... }` block
  (lines 288-298) has no length/completeness check against `uniqueIds` — a successful-but-partial
  array is returned as final, matching the Plan's claim precisely. The per-doc Firestore fallback
  (lines 300-335) is real and only reached on a **thrown** exception, confirming the Plan's diagnosis
  that a successful-but-incomplete generated-snapshot response is the actual defect mechanism, not a
  raw Firestore race.

### Item 6 (capacity copy)

- **Confirmed exact current string** in `printRequestQuotaUserCopy.ts` line 19:
  `` `You've used all ${safeCap} print spots on this show. Choose another show for more designs.` `` —
  matches the Plan's citation exactly, missing "of your" as claimed.

### Item 3/Debug toast

- **Confirmed exact string** `Firebase Debug panel available (Ctrl+Shift+F)` in both
  `apps/portal/features/firebase-debug/components/FirebaseDebugPanelActivationToast.tsx` (line 34)
  and the Studio equivalent (line 32).
- **Confirmed separability:** Portal's `FirebaseDebugPanelMount.tsx` renders
  `<FirebaseDebugPanelActivationToast />` as one isolated JSX line (line 292) alongside unrelated
  popup-error UI; the shortcut (`useFirebaseDebugPanelShortcut`, line 108) and the eligibility gate
  (`isFirebaseDebugPanelEnabledForPortal()`, line 70, with an early `if (!isEligible) return null`)
  are independent of the toast render — removing the toast line does not touch the gate or shortcut.
  Studio's `FirebaseDebugPanelMount.tsx` shows the same separation (`isEnabled` gate at line 24/58,
  shortcut at line 28, toast state/effect at lines 25-27/51-56/64 as a separable block). Confirms the
  Plan's claim that the toast and the dev-only tool are genuinely separable and that removing the
  toast does not touch `fresh-prints-dev`/dev-build gating.

### Item 4 (elapsed clock)

- **Confirmed:** `PortalPrintRequestProgressPanel.tsx` is the only component of this name and
  genuinely renders both the elapsed-clock readout (`readoutText`/`formattedElapsed`, lines 55-59,
  87-97) and the Queued/Printing/Done rail (lines 100-143) in the same component, as the Plan states.
- **Confirmed caller wiring:** `PrintRequestDetailView.tsx` passes `formattedElapsed`, `isLive`, and
  `showElapsed` into the panel (lines 403-412) — matching Section 8 item #7's description of what
  needs to change to suppress the clock without touching `usePortalShowPrintProgress`.

### Item 8 ("Print again")

- **Confirmed:** `showCatalogReuse` gating (`PortalPrintRequestItemCard.tsx` lines 181-182):
  `readOnly && catalogDesignId.length > 0 && catalogReuseDesign !== undefined` — exactly as the Plan
  states, and `readOnly={!isEditable}` (`PrintRequestDetailView.tsx` line 519) combined with
  `catalogReuseDesign = !isEditable ? (design ?? null) : undefined` (line 466) confirms the historical-
  only condition is already correct today, requiring no new context plumbing — the Plan's claim that
  only the label/icon/`aria-label` needs to change is verified correct.

### DPI floor as a non-issue for the actual code changes

- Confirmed that no file in Section 8's proposed-modification list touches
  `printRequestItemSizing.ts` or `printSize.constants.ts` — the blocking finding above is confined to
  Section 1's restated fact and Section 9's test-writing guidance, not the fix design itself.

### Test-command conventions

- Confirmed `npx tsx --test` (no root `npm test`) is the documented convention in
  `docs/standards/TESTING.md`, matching Section 9's required verification commands.

---

## 4. Bounded-Firestore / Read-Model Constraint

**Confirmed honored.** I independently checked:

- Item 1's fix retries only the exact missing-ID subset of the *already-fetched* design list via the
  existing per-doc fallback path that already exists in `catalogService.ts` (lines 300-335) — no new
  collection, no full-catalog fetch.
- Items 2/5/7's fixes are pure in-memory reconciliation (`beginPendingItemRemovals`,
  `patchWorkingItems`, a locally-computed `allocationTotalsByRequestId` patch from data the
  `queuePortalPrintRequestToShow` callable already returns) — zero new Firestore reads, zero new
  callables confirmed by inspection of the actual hook code.
- No file path anywhere in Section 8's list touches `generated/studio-print-requests/**` or
  `generated/portal-print-requests/**` — both already fully removed per the Wave C signoff
  (`.cursor/workflow/state.md`, confirmed read). Nothing in this Plan reintroduces the abandoned
  read model.
- Section 13's "No Functions/Rules/Indexes/Migration" table is consistent with every file the Plan
  actually proposes touching — I did not find any file in Section 8 that would require a Rules or
  index change (all reads use existing permitted shapes: `printRequestItems` by `printRequestId`,
  `designs/{id}` ready reads, `showAllocations` by item id — none new).

**Verdict: honored.**

---

## 5. Scope Boundaries

- **25-print-limit / Cap logic:** Not touched anywhere in Section 8's file list. `formatShowCustomerLimitUserMessage`'s change (item 6) is a pure string constant edit; `finitePositive`/`safeCap` logic (the actual 25-cap arithmetic) is untouched — confirmed by reading the full file (20 lines total, only the return template string changes).
- **Production timer:** Section 14 explicitly and correctly separates the removed customer-visible
  clock from `usePortalShowPrintProgress` (unchanged) and Studio's own timer/allocation fields
  (`accumulatedPrintMs`, etc., unchanged) — confirmed `usePortalShowPrintProgress.ts` is not in
  Section 8's file list, and Studio never renders the Portal-only `PortalPrintRequestProgressPanel`.
- **Dev-gate weakening:** Not present. `isFirebaseDebugPanelEnabledForPortal`/
  `isFirebaseDebugPanelEnabledForStudio` are explicitly listed as unmodified (Section 15), and my
  direct read of both `FirebaseDebugPanelMount.tsx` files confirms the gate functions and shortcut
  wiring are untouched by the proposed toast removal.
- **Production action:** Section 17 explicitly restates the stop-after-Plan checkpoint and forbids
  any App Hosting/production Firebase action; Section 12 confirms no `firebase deploy` is required
  for this Plan's scope at all.
- **DPI validation:** Section 1 claims "No defect item in this Plan requires touching DPI validation
  logic at all" — this is independently confirmed true (no `printRequestItemSizing.ts`/
  `printSize.constants.ts` file appears in Section 8), **but** the same section's factual claim about
  *what* that floor is is wrong (Section 2 above) and must be corrected even though the code itself
  stays untouched.

**Verdict: honored**, subject to the Section 2 correction (which is a documentation/test-guidance
fix, not a scope expansion).

---

## 6. Non-Blocking Findings

1. **Section 9's Item 1 regression test description** says to assert "a fully successful complete
   response... makes zero extra calls" — this is good and I'd flag it as a required assertion, not
   optional, since it's the one thing preventing the fix from silently becoming an unbounded-retry
   loop later. Non-blocking because the Plan already states it; just confirming it should not be
   dropped at Implement time.
2. **Section 8, file #3** (`useWorkingCurrentRequestItems.ts`) is marked "No behavior change... may
   be a zero-diff file" — reasonable hedge; I confirmed the current exported signatures
   (`beginPendingItemRemovals(itemIds: string[])`, `patchWorkingItems: Dispatch<SetStateAction<...>>`)
   already accept calls from any caller, so `usePrintRequestDetail` calling them identically to
   `useAddDesignToRequestFlow` requires no signature widening I could find — this file is very likely
   to end up a true zero-diff, which is fine and does not need Plan correction.
3. Minor: Section 2's reproduction matrix table lists item 5 as two sub-rows (5(a), 5(b)) but Section
   16's acceptance checklist and Section 8's file list refer to "item 5" singularly in places — no
   actual criterion is missing (both sub-cases are covered by the same file changes and the same
   acceptance bullets), just a label consistency nit, not worth blocking on.

---

## 7. Acceptance Criteria Cross-Check

I checked every checkbox in Section 16 against Section 8's file list and Section 9's test list:

- Every "Request integrity" bullet maps to file #2 (`usePrintRequestDetail.ts`) + file #3
  (verify-only) — covered.
- Every "Request rendering" bullet maps to file #1 (`catalogService.ts`) — covered.
- Every "Queue transition" bullet maps to files #4/#5 (`useMyPrintRequests.ts` +
  `PrintRequestDetailView.tsx`) — covered.
- "Customer-facing cleanup" bullets map to files #6/#7 (progress panel clock), #8/#9/#10 (capacity
  copy + tests), and #11-#15 (Print again button + debug toast removal) — covered.
- "Regression safety" bullets map directly to Section 9's test list and command list — covered,
  subject to the Section 2 DPI-floor correction being applied to the item 5 test guidance before
  those tests are actually written.

No acceptance criterion is left unaddressed by the file list. No internal contradiction found between
sections other than the Section 2 finding above.

---

## 8. Summary

This is a well-researched, source-grounded Plan. The consolidated root-cause investigation for items
2/5/7 is genuinely one structural finding, not three independent patches dressed up as one, and I
independently re-derived the same conclusion from the actual hook/context code rather than trusting
the Plan's narrative. The one blocking defect (the inverted DPI floor claim) does not undermine the
architecture or the fix design — no proposed file change touches DPI logic — but it must be corrected
in Section 1 and Section 9 before Implement, specifically so no new regression test is written against
a fabricated 72 DPI boundary when the real, already-shipped, and already-documented-in-a-comment floor
for print-request item saves is 200 DPI.
