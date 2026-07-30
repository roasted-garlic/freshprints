# Portal Print Request Pre-Launch Stability — Implementation Review 5

- **Date:** 2026-07-27
- **Reviewer:** Review Agent (independent context, fifth Implementation Review on this goal, no
  context inherited from any of the four prior "APPROVED" reviews)
- **Scope:** Plan Section 22 (Amendment 4) — Fix 1 revised (re-entrancy + clamp-bypass fix at the
  item-card layer), Fix 3 extended (Show Queue selected-show live document subscription). Fix 2
  (Studio timer) has no code change in this amendment and is out of scope for this review.

---

## 1. Verdict

**`APPROVED`**

---

## 2. Independence statement

Read Plan Section 22 and the Amendment 4 Formal Review in full before touching any implementation
file. Read, in full: `PortalPrintRequestItemCard.tsx` (824 lines), `usePrintRequestDetail.ts` (667
lines), `upcomingShowService.ts` (1427 lines), `useUpcomingShows.ts` (96 lines),
`UpcomingShowsPage.tsx` (relevant sections plus targeted grep), `usePrintRequestDetail.behavior.test.ts`
(750 lines), `useUpcomingShows.test.ts` (232 lines). Independently isolated this pass's actual
7-file change set from ~292 unrelated changed paths in the working tree (an in-flight, unrelated
`usePrintRequests` pagination rework, Functions changes, Rules/indexes changes) via `git diff --stat`
and content inspection — confirmed none of those unrelated files reference this amendment and none
are Functions/Rules/indexes/deployment files.

---

## 3. Fix 1 revised — confirmed against actual shipped code

- **`quantityInputRef` mirrored via a wrapper, no bypass:** confirmed —
  `PortalPrintRequestItemCard.tsx:219-223` defines the ref and wrapper; every `setQuantityInput(`
  call site (lines 279, 293, 421, 477, 530, 759) routes through it; the raw state setter
  (`setQuantityInputState`) is called only once, inside the wrapper itself.
- **`saveDraft` captures `submittedQuantityInput` at dispatch; write-back gated on liveness:**
  confirmed — `submittedQuantityInput = quantityInput` captured at line 386 before the `await`;
  `isStillLive = quantityInputRef.current === submittedQuantityInput` (line 411) gates the
  `setQuantityInput` write-back; the `else` branch (424-432) updates only `lastSavedSignatureRef`,
  never touching a newer live input.
- **Prop-sync effect untouched:** confirmed — `itemPropSyncGuard.ts` and
  `resolveSavedDraftReconciliation.ts` carry zero diff; the effect's own logic is unchanged.
- **`usePrintRequestDetail.ts` clamp fix:** confirmed — `hasKnownLimit` gates whether the optimistic
  patch clamps or holds `currentQuantity` unchanged (lines 327-335); the network request still sends
  the user's real requested quantity regardless of `hasKnownLimit` (line 383); the downstream
  `serverQuantity !== optimisticQuantity` correction check remains sound under the new semantics.
- **Test file genuinely models the overlapping-save race, not a reworded sequential test:**
  confirmed — `usePrintRequestDetail.behavior.test.ts:635-697` dispatches a save, mutates the live
  input before that save resolves, resolves it, and asserts the live value survives; a second test
  proves the queued follow-up reconciles server-authoritatively; a third proves the ordinary
  single-save path is unaffected; a fourth proves a genuinely external prop update still applies. The
  harness's `dispatchSave()`/`resolve()` split independently mirrors the shipped component's
  `submittedQuantityInput`/`isStillLive` logic 1:1, not a parallel reimplementation that merely
  happens to pass its own test.

---

## 4. Fix 3 extended — confirmed against actual shipped code

- **Single-document subscription, not a query; reuses `mapUpcomingShowData`; ref-counted per show
  id:** confirmed — `getOrCreateUpcomingShowSubscription` (lines 431-476) uses
  `onSnapshot(doc(...), ...)`, no `query`/`where`; calls `mapUpcomingShowData` directly; keyed in a
  module-level Map mirroring `getOrCreateShowAllocationsSubscription`'s exact shape.
- **`useUpcomingShows.ts`:** confirmed — optional `liveShowId` parameter, subscribes only when
  provided, patches only the matching show by id (not a full re-fetch), cleans up on unmount/id
  change, `listUpcomingShows`'s one-shot fetch is structurally untouched.
- **`UpcomingShowsPage.tsx`:** confirmed — the entire diff is `selectedShowId`'s `useState` moved
  before the `useUpcomingShows(selectedShowId)` call plus a 3-line comment; no other line changed; no
  hook-ordering violation.
- **Test file genuinely drives the real primitive:** confirmed — imports and calls the actual
  `createSharedFirestoreSubscription`, not a reimplementation; assertions check concrete,
  non-tautological outcomes (patch-by-id, single upstream listener for two consumers, cross-show
  isolation, ref-counted teardown, switch-and-reattach); a separate source-wiring describe block is
  explicitly framed as a supplement, not a substitute.

---

## 5. Verification — independently re-run, exact results

- `npx tsc -v` — `5.9.3`.
- `npx tsx --test` on the 9 named files — **68/68 pass, exit 0**.
- `npm run typecheck --workspace @fresh-prints/portal` — **exit 0**.
- `npm run build:portal` — **exit 0** (19/19 pages).
- `npm run build:studio` — **exactly 29 `error TS` lines**, matching the documented baseline. One
  (`UpcomingShowsPage.tsx:118`) sits in a touched file but is confirmed pre-existing and unrelated
  (an in-flight, unrelated `usePrintRequests()` arity change two lines below this amendment's own
  3-line edit; `git diff` confirms lines 118+ are untouched by this pass).
- `npm run lint` — **41 problems (31 errors, 10 warnings)**, matching baseline exactly. Two findings
  sit in touched files (`PortalPrintRequestItemCard.tsx:182`, `UpcomingShowsPage.tsx:584`), both
  confirmed pre-existing via `git diff` (neither line is part of this pass's diff).
- `git diff --check` — clean, no output.
- Confirmed via content inspection: no Functions, Rules, indexes, or deployment file is part of this
  pass — all such diffs present in the working tree belong to separate, unrelated in-flight work.

---

## 6. Blocking findings

None.

## 7. Non-blocking notes

1. `build:studio` cannot currently produce a deployable Studio artifact at all, for reasons entirely
   pre-existing and outside this amendment's scope (an unrelated in-flight `usePrintRequests`
   pagination rework's own arity mismatch) — worth flagging to the owner, not attributable to this
   pass.
2. As with every prior amendment, this review cannot execute the app in a real browser/Electron
   process against live Firestore, so it cannot directly observe real React scheduling/batching order
   or real cross-client Firestore listener latency — only that the logic, once each path executes,
   behaves correctly regardless of arrival order.

---

## 8. Confidence assessment

**What is genuinely different/better this time (Fix 1):** the prior three amendments each fixed a
single code path and were each disproven by a different live-only interaction their own tests didn't
model. This pass specifically targets the re-entrancy/overlap class of defect, and its test harness
structurally cannot pass without the fix being real — the `dispatchSave()`/`resolve()` split forces
the exact "type, then type again before resolution, then resolve" sequence and asserts on the
resulting value, independently confirmed to mirror the shipped component's actual logic line-for-line.

**What is genuinely new (Fix 3):** the first pass to address the show-document-level subscription gap
at all; implemented as a direct structural mirror of an already-proven-in-production pattern, reducing
novel-mechanism risk.

**What source-level review cannot certify:** whether the owner's actual keystroke timing and the
browser's actual React batching reliably reproduce the race window this fix targets, and whether a
still-undiscovered third channel exists (the second-channel/cart-sync race in Section 22.1 was itself
only found because a fourth live QA pass exposed what three prior clean reviews missed — no principled
source-level guarantee rules out a fifth). For Fix 3: whether real cross-client Firestore listener
propagation latency is fast enough in practice for the owner's exact repro to feel instantaneous.

**Bottom line:** every claim in Section 22.2/22.5's required remediation is implemented exactly as
specified, verified against actual shipped code with file:line citations, every named test genuinely
drives the scenario it claims to, all 68 relevant unit tests pass, portal typecheck/build are clean,
studio build/lint match the documented baseline exactly with both in-file findings confirmed
pre-existing, and no Rules/Functions/deployment file is part of this pass. This is a source-level
`APPROVED`. Per this goal's own established practice, this does not certify runtime correctness — a
fifth live owner QA pass remains the actual closing gate.
