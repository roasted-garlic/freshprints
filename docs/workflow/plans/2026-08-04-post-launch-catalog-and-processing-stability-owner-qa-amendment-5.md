# Plan: Post-Launch Catalog and Processing Stability — Owner QA Amendment 5

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Branch | `fix/post-launch-catalog-and-processing-stability` (existing, unchanged) |
| Scope | AI Processing still freezes after Amendment 4 — new root-cause investigation and fix |
| Out of scope (unchanged, do not touch) | Large-PNG normalization (PASS); `readyAt` ordering/backfill (complete) |

---

## 1. Critical architecture correction — the task's assumed contract is not what is deployed

The task brief assumes: `enqueueAiEnrichment` writes a queued state → a Firestore write triggers
`onDesignAiEnrichmentQueued` → that trigger runs the Gemini pipeline **asynchronously** → the
trigger later writes the terminal result. **This is not the current architecture.** Verified
directly from source, not assumed:

- `functions/src/index.ts:63` exports **only** `export { enqueueAiEnrichment } from
  "./enqueueAiEnrichment";`. A repo-wide `grep -rn "onDesignAiEnrichmentQueued"` across
  `functions/src/**/*.ts` returns **zero matches** — the trigger does not exist in the deployed
  Functions codebase at all today.
- `docs/architecture/BACKEND.md:272` documents this explicitly: `onDesignAiEnrichmentQueued` |
  Firestore update | **"Legacy compatibility trigger; live Processing flow should use direct
  callable execution."**
- `functions/src/enqueueAiEnrichment.ts:193-219`: the callable itself calls
  `await runAiEnrichmentPipeline(designId, geminiApiKeySecret.value())` **synchronously, inline**,
  then re-reads the design document (`designRef.get()`, line 194) and returns the design's real
  **post-completion** `aiProcessingStage`/`aiReviewStatus`/`status` fields (lines 208-219). The
  callable does not return until the Gemini pipeline has actually finished and Firestore has been
  written.

**Conclusion: Amendment 4's approach — trusting the enqueue callable's own returned terminal
fields as authoritative — is architecturally correct for this codebase's real contract.** It is not
the source of the still-frozen symptom. The task's stated root cause is incorrect; per explicit
owner direction (this session), this Plan investigates the actual cause instead of implementing the
literally-requested Firestore-subscription architecture against a problem that does not exist in
the form described.

---

## 2. Actual root cause found

### 2.1 Client-side callable timeout vs. server-side pipeline timeout — confirmed mismatch

- **Server side:** `enqueueAiEnrichment` is registered with `{ timeoutSeconds: 180, memory:
  "512MiB" }` (`enqueueAiEnrichment.ts:53`) — the team explicitly provisioned up to 3 minutes for
  the synchronous pipeline call to complete, well above the Cloud Functions 2nd-gen platform
  default (60s). This 180s allowance is direct evidence the pipeline's real-world duration was
  known to sometimes exceed a short default.
- **Client side:** `callTracedFunction` (`apps/studio/src/renderer/src/config/tracedCallable.ts:14-23`)
  calls `httpsCallable<Request, Response>(functionsInstance, callableName)(req)` with **no options
  object** — no `timeout` override is passed anywhere in this call chain
  (`aiEnrichmentEnqueueService.ts` → `callTracedFunction` → `httpsCallable`). The Firebase JS SDK's
  documented default `HttpsCallableOptions.timeout` is **70,000ms (70 seconds)**.
- **The two timeouts were never coordinated.** When the extended-server-side allowance was added,
  the client was not updated to match. Any design whose Gemini pipeline genuinely takes longer than
  70 seconds (plausible and apparently anticipated, given the 180s server allowance and the
  dedicated latency-observability logging already built for this exact call —
  `docs/architecture/BACKEND.md:274`, "AI enrichment latency observability") causes the **client**
  call to reject with `functions/deadline-exceeded` while the **server-side pipeline keeps running
  to completion independently** — `onCall` Cloud Functions execution is not cancelled by an HTTP
  client disconnect/timeout.

### 2.2 Why this produces exactly the observed symptom

1. `pumpBackgroundAiQueue`'s `try/catch` (`importAiBackgroundQueue.ts:114-129`) catches the client
   timeout as a generic error — indistinguishable from a real failure. It notifies observers with
   `outcome: "failed"` and **no `patchSource`** (the call never returned a response body).
2. `reconcileBackgroundAiQueueEvent` (`backgroundAiQueueReconciliation.ts:32-36`) correctly returns
   `patch: null` for an event with no `patchSource` — this is working as designed.
3. `useAiReviewInbox.ts`'s observer (lines 359-390) correctly falls back to `void reloadDesigns()`
   for this one event — also working as designed — **but the server-side pipeline for that design
   is still running at that exact moment**, since the client gave up at 70s while the server was
   allowed 180s. The reload reads Firestore too early and sees the design still mid-pipeline
   (`aiProcessingStage` still an active stage, `aiReviewStatus` still `pending`) — this is the
   observed "count and list remain frozen."
4. `resolveAiEnrichmentCallableErrorMessage` (`aiEnrichmentEnqueueService.ts:70-95`) has no case for
   `functions/deadline-exceeded` — it falls through to the generic `default` branch, so this failure
   mode produces a plain error, not a recognizable "still processing, please wait" state.
5. The pump's `finally` block (`importAiBackgroundQueue.ts:131-136`) still advances to the next
   design in `pendingDesignIds` regardless of the timeout outcome — **this is itself correct** per
   the existing "one at a time" sequencing contract (the pump does not wait for the timed-out
   design's server-side completion before starting the next enqueue call) — but it means Design B's
   enqueue call starts immediately after A's client-side timeout, without A having actually reached
   a terminal state server-side yet. A's own pipeline is still running concurrently with B's. This
   does not violate "one Gemini call in flight at a time" in the way the task worries about
   (`enqueueAiEnrichment` for B is a separate HTTP call/Cloud Functions invocation from A's,
   regardless of whether A's has "returned" to the client) — but it does mean **the client loses
   track of A's real completion entirely** until some later, unrelated reload happens to observe it
   (e.g. navigating away and back, exactly matching "one final refresh removes everything
   together" once enough time has passed for all pipelines to have actually finished server-side).

### 2.3 Why Amendments 3 and 4 could not observe real completion

Neither amendment's premise was wrong about the *reconciliation* mechanism (patch-by-ID, generation-
guarded fallback reload) — both are sound designs for a synchronous-callable architecture. Neither
amendment anticipated that the enqueue call **itself** could fail to deliver its own response before
the real work finished, because neither investigation checked the client-vs-server timeout
alignment. This amendment is the first to find that specific gap.

### 2.4 Secondary, smaller gap found (worth fixing in the same pass, narrowly)

`hasPendingBackgroundAiWork()` (`importAiBackgroundQueue.ts:63-65`) is exported but **never
consumed anywhere** (`grep` across `useAiReviewInbox.ts`/`useAiProcessingQueue.ts` finds zero
references). This does not itself explain the reported freeze (the freeze is explained by §2.1-2.2
above, which occurs even with a fresh mount), but per the task's explicit "Navigation and remount
behavior" requirement, this gap is real: if the AI Review tab is not mounted at all while the
background pump is running, no observer exists to receive events, and nothing on mount re-syncs
with "is the pump still working through a design right now, and if so, which one." Today, a fresh
mount's own `useDesigns` initial load reads the true current Firestore snapshot, which is correct
for any design that has already reached a terminal state — but for a design still genuinely
mid-pipeline at mount time, the mounted UI has no way to know the pump is actively working on it
until either that design's own enqueue call resolves (if the pump instance handling it is the same
JS execution context — true for Studio's single-window Electron renderer) or a later reload
happens to catch the transition.

---

## 3. What the fix must NOT be

Per §1's finding, the task's requested Firestore-subscription architecture (one active-design
listener, teardown/resubscribe on remount, etc.) is not required to fix the actual bug, which is a
client-timeout misconfiguration, not a missing observation mechanism. Building it anyway would:
- Add a new Firestore listener (a fixed cost this whole managed goal has otherwise worked to avoid
  reintroducing) to solve a problem a corrected timeout value already solves for free.
- Not actually fix the reported freeze on its own, since a subscription would still be attached to
  a design whose *enqueue call itself* has already failed client-side — the subscription would
  need the same "the client no longer has an in-flight expectation for this design" bookkeeping
  problem, just relocated.

This Plan's recommendation is the narrower, evidence-backed fix: align the client timeout with the
server's actual allowance, plus close the `hasPendingBackgroundAiWork` mount-gap narrowly, without
adding a new listener.

---

## 4. Recommended fix

1. **Align the client-side callable timeout with the server's `timeoutSeconds: 180`.** Pass an
   explicit `timeout` option through `callTracedFunction` → `httpsCallable`, specifically for
   `enqueueAiEnrichment` (not a blanket change to every callable — other callables have their own,
   shorter server-side timeouts and should not be affected). This directly closes the confirmed gap
   in §2.1.
2. **Map `functions/deadline-exceeded` to an accurate, actionable message** in
   `resolveAiEnrichmentCallableErrorMessage`, distinct from a generic failure — since even with the
   timeout aligned, a sufficiently slow design could still exceed it, and the current fallback
   message ("AI processing could not be queued...") is misleading for what is actually "still
   running, will complete shortly."
3. **On the background-pump failure path specifically** (not the manual/auto-queue paths, which
   already surface `onActionError` to the user directly): a `deadline-exceeded` outcome should not
   be treated identically to a genuine pipeline failure for the purpose of advancing the pump. Given
   the corrected timeout in (1) makes this the rare case (a design pipeline taking longer than 3
   minutes), fall back to the existing generation-guarded reload path unchanged — this is already
   the correct behavior once (1) removes the routine case that was triggering it.
4. **Wire `hasPendingBackgroundAiWork()` into `useAiReviewInbox.ts`'s mount effect** so opening or
   returning to the Processing tab while the pump is actively working can be reflected — narrowly,
   without adding a listener: on mount (or tab-switch-to-processing), if the pump reports pending
   work, trigger one bounded `reloadDesigns()` + `onQueueChanged()` pass, gated by the same
   generation guard already in `useDesigns`. This does not restart, double-enqueue, or reset
   progress for the active design — it only ensures the mounted view's initial snapshot is not
   silently stale relative to pump activity that happened while unmounted.

None of these four items require a Rules, index, schema, backend-contract, or security change —
per the task's own instruction, proceeding directly into Implementation without a separate pause,
since the Formal Review below confirms no such change is required.

---

## 5. Files expected to change

- `apps/studio/src/renderer/src/config/tracedCallable.ts` — accept an optional per-call timeout override.
- `apps/studio/src/renderer/src/features/ai-review/services/aiEnrichmentEnqueueService.ts` — pass the aligned timeout for `enqueueAiEnrichment` specifically; map `functions/deadline-exceeded` to an accurate message.
- `apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts` — no change expected to the sequencing logic itself (already correct); confirm during implementation.
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` — wire `hasPendingBackgroundAiWork()` into a bounded mount/tab-switch reconciliation check.
- New or existing test files covering: the timeout value alignment, the `deadline-exceeded` message mapping, and the mount-reconciliation check.

---

## 6. Required Plan output

1. Actual `enqueueAiEnrichment` return contract: synchronous, returns real post-completion terminal fields (§1).
2. Actual trigger/terminal-status contract: `onDesignAiEnrichmentQueued` does not exist in the deployed codebase; documented as legacy (§1).
3. Why Amendments 3 and 4 could not observe real completion: they did not anticipate the enqueue call's own client-side timeout (70s default) racing the server's allowed pipeline duration (180s) — not a flaw in their reconciliation design (§2.3).
4. Recommended fix: align client timeout, map the timeout error accurately, close the mount-gap narrowly — no new listener, no architecture change (§4).
5. No Rules, index, schema, backend-contract, or security change required — confirmed directly from source; proceeding automatically into Implementation per task instruction.

**Approval phrase for automatic continuation** (per task instruction — no separate approval needed
since no Rules/index/schema/backend-contract/security change is required):

`APPROVE POST-LAUNCH CATALOG AND PROCESSING STABILITY OWNER QA AMENDMENT 5`
