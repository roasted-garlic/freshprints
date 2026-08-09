# Independent Formal Review: Owner QA Amendment 5

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Plan reviewed | `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-5.md` |
| Reviewer stance | Independent — re-verified every load-bearing claim directly against source/SDK, not the Plan's prose |
| Verdict | **approved** |

---

## 1. Independent re-verification of the architecture-correction claim

- `functions/src/index.ts:63` — re-confirmed directly: `export { enqueueAiEnrichment } from
  "./enqueueAiEnrichment";` is the only related export. Ran `grep -c "onDesignAiEnrichmentQueued"
  functions/src/*.ts functions/src/**/*.ts` independently and got zero non-zero matches — the
  trigger genuinely does not exist in Functions source today.
- `docs/architecture/BACKEND.md:272` — re-read directly, confirms the "legacy compatibility
  trigger... live Processing flow should use direct callable execution" framing verbatim.
- `enqueueAiEnrichment.ts:193-219` — re-read the full function body, not just the cited lines,
  confirming `await runAiEnrichmentPipeline(...)` genuinely blocks the callable's own execution and
  the return statement's fields come from a fresh `designRef.get()` performed *after* that await
  resolves. **The Plan's architecture correction is accurate.**

## 2. Independent re-verification of the root-cause claim

- Re-read `enqueueAiEnrichment.ts:53` directly: `{ secrets: [geminiApiKeySecret], timeoutSeconds:
  180, memory: "512MiB" }` — confirmed.
- Re-read `tracedCallable.ts:14-23` directly: confirmed `httpsCallable<Request,
  Response>(functionsInstance, callableName)(req)` is called with no options argument anywhere in
  this wrapper, and re-confirmed (via `aiEnrichmentEnqueueService.ts`) that no caller supplies one
  either.
- **Independently verified the 70-second default against the actual installed SDK source**, not
  just Firebase's public documentation (which the Plan could have merely paraphrased without
  checking): `node_modules/@firebase/functions/dist/index.cjs.js:623-624` —
  `// Default timeout to 70s, but let the options override it.` /
  `const timeout = options.timeout || 70000;`. This is a first-party confirmation from the exact
  code that will execute, not an assumption. **The Plan's core finding is independently confirmed
  correct.**
- Re-read `resolveAiEnrichmentCallableErrorMessage` (`aiEnrichmentEnqueueService.ts:70-95`)
  directly and confirmed there is genuinely no `case "functions/deadline-exceeded"` — it falls to
  `default`, matching the Plan's claim.
- Re-read `importAiBackgroundQueue.ts:114-129`'s `try/catch` and confirmed the failure branch
  discards the actual error object entirely (only its `message` is logged) and the
  `BackgroundAiQueueEvent` sent to observers has no `patchSource` in that branch — consistent with
  the Plan's mechanism description.
- Re-read `AI_ENRICHMENT_STALE_STAGE_MS = 10 * 60 * 1000` (`aiEnrichmentConfig.ts:74`) and confirmed
  this 10-minute staleness window is a materially different, larger timescale than the 70s/180s
  mismatch — the Plan is correct that this existing mechanism does not already cover the newly
  found gap.

## 3. Assessment of the "what the fix must not be" reasoning

Agree with the Plan's refusal to build the literally-requested Firestore-subscription architecture.
The task's own decision rule ("Proceed automatically after an approved review unless a Rules, index,
schema, backend-contract, or security change is required") is satisfied — none of those apply here,
and the corrected understanding of the real architecture (confirmed independently above) means the
originally-requested design would not address the actual, confirmed defect. Recommending a narrower,
evidence-backed fix instead of the literally-requested one, backed by directly-verified source and
SDK evidence, is the correct response to a task built on an incorrect premise — not scope creep and
not a refusal to do the requested work, since the requested work's premise does not hold.

## 4. Gaps or risks in the Plan

- **§2.4's secondary fix (`hasPendingBackgroundAiWork` wiring)** is correctly scoped as narrow and
  clearly separated from the primary fix — appropriate, since it is a real but secondary gap, not
  the confirmed cause of the reported freeze. Implementation should keep this genuinely bounded (one
  reconciliation pass on mount/tab-switch, not a new listener) exactly as specified.
- **The Plan does not yet specify the exact new timeout value** beyond "align with the server's
  180s" — Implementation should use a small buffer above 180s (e.g. matching or slightly exceeding
  it, such as 185–200s) rather than exactly 180000ms, since network/serialization overhead on top of
  the server's own allowance could otherwise reintroduce a razor-thin version of the same race. This
  is a minor refinement for Implementation to apply, not a blocking Plan defect.
- **The Plan does not propose scoping the timeout override to only `enqueueAiEnrichment`** in a way
  that's verifiably isolated from other callables — Implementation must confirm via test that
  `callTracedFunction`'s new optional timeout parameter, when omitted, preserves every other
  callable's existing (SDK-default) behavior exactly.

None of these are blocking; all are addressable during Implementation without requiring a re-plan.

## 5. Scope and architecture-constraint compliance

- No Rules, index, schema, backend-contract, or security change is proposed or required — confirmed
  independently, not merely restated.
- Large-PNG normalization and `readyAt` ordering/backfill are not referenced anywhere in the
  recommended fix's file list — correctly out of scope.
- No new Firestore listener, no polling, no concurrency change, no unbounded reads are introduced by
  the recommended fix — it is a client HTTP-call configuration change plus one narrowly-scoped
  mount-time reconciliation check reusing an existing, already-guarded reload path.
- The fix does not weaken any error visibility — mapping `deadline-exceeded` to an accurate message
  is a UX improvement, not a masking of a real failure.

## 6. Verdict

**approved.** The architecture correction and root-cause finding are both independently
re-verified against actual source and the installed SDK, not merely re-read from the Plan's own
prose. No Rules/index/schema/backend-contract/security change is required, so per the task's
explicit instruction, Implementation may proceed automatically without a separate pause.

`APPROVE POST-LAUNCH CATALOG AND PROCESSING STABILITY OWNER QA AMENDMENT 5`
