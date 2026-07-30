# Portal Print Request Pre-Launch Stability — Amendment 15 Formal Review

**Date:** 2026-07-29  
**Plan reviewed:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`, Section 33 / Amendment 15  
**Reviewer:** independent Formal Review  
**Initial verdict:** `REJECTED`  
**Final re-review verdict:** `APPROVED_WITH_CHANGES`

## Review scope

This review independently inspected the owner’s v16 runtime diagnostic, the current
`ShowProductionRetrySession`, `useShowProductionTimer`, the completed-show reconstruction effect,
the production page rendering the Retry control, the composed retry/reconstruction tests, and the
Studio application root. It did not defer to Amendment 14 Formal Review or Implementation Review
16. No application code was changed.

The requested scope remains appropriate: one Studio-client-only correction, no Rules, Functions,
migration, deployment, broad reads, listener, polling, or reopening of timer, Portal, historical,
capacity, or queued-goal work. The proposed shared `canStartRetry` authority, explicit operation
phases, guaranteed `finally` releases, truthful finalizing UI, bounded diagnostics, and composed
tests are directionally sound. Implementation is nevertheless blocked because Section 33.2 states
an unproven and materially incomplete root cause while current production source exposes a more
direct acquisition failure.

## Blocking finding 1 — the Plan omits the React Strict Mode unmount guard that directly explains `sessionAcquired: false`

Section 33.2 says the owner diagnostic proves the completed-show reconstruction effect owns
`isRetryInFlight` when the explicit Retry is clicked. It does not. Current
`ShowProductionRetrySession.acquire()` returns false for three conditions:

1. `isUnmounted`;
2. selected-show mismatch;
3. `isRetryInFlight`.

The runtime trace does not record which guard rejected acquisition. A rendered current-show handler
substantially rules out selected-show mismatch, but it does **not** rule out `isUnmounted`.

Current source makes `isUnmounted` a first-class and highly probable cause:

- `apps/studio/src/main.tsx` renders the application under `React.StrictMode`.
- `useShowProductionTimer` creates the session once in a ref.
- Its mount effect has no setup-side session activation; its cleanup calls
  `retrySessionRef.current?.markUnmounted()`.
- `markUnmounted()` permanently sets `isUnmounted = true`.
- There is no method that sets the session back to mounted.
- React 18 development Strict Mode performs the effect setup → cleanup → setup probe while
  preserving the component’s ref/state lifetime. After that probe, this ref-backed session remains
  permanently unmounted and every later `acquire()` returns `{ ok: false }`.
- The owner trace is emitted only behind `import.meta.env.DEV`, which is consistent with the
  Strict-Mode development lifecycle being active in the observed run.

This path reproduces every decisive runtime field without requiring a reconstruction lock:
`handlerEntered: true`, `sessionAcquired: false`, `serviceInvoked: false`, and one retryable ID
rendered from the Finish result.

The Plan must be corrected before implementation to:

1. record the exact acquisition rejection reason, not only a Boolean;
2. explicitly test the Strict Mode setup-cleanup-setup lifecycle;
3. define a setup-side mounted/active transition (or another Strict-Mode-safe disposal design) so
   the development probe does not permanently dispose the live session;
4. retain true final-unmount invalidation and stale-settlement protection; and
5. prove whether reconstruction contention still exists after the mounted-state defect is removed.

The Plan may retain the explicit phase model if evidence still justifies it, but it must not present
`isRetryInFlight` reconstruction ownership as the proven sole cause until the rejection reason and
phase trace establish that fact.

## Blocking finding 2 — the navigation explanation is contradicted by the same lifecycle defect

Section 33.2 says navigation cancels/recreates the session and later reconstruction sees settled
persisted state, explaining why the warning disappears. Under the current Strict Mode lifecycle, a
new hook instance is again subjected to setup → cleanup → setup, leaving its new session permanently
unmounted. The completed-show reconstruction effect therefore cannot acquire that session.

The current source supports a simpler explanation:

1. navigation/remount resets all ephemeral warning and failed-ID React state;
2. reconstruction attempts acquisition;
3. acquisition may fail because the session was permanently marked unmounted by the Strict Mode
   effect probe;
4. no reconstruction result restores the warning.

That produces the observed disappearance even if persisted state were still unresolved. The Plan’s
navigation-consistency requirement is correct, but its current causal account is not.

The corrected Plan and tests must prove both navigation branches through production-used logic:

- committed complete state remounts with no warning; and
- genuinely unresolved committed state remounts with a usable Retry control.

They must also assert that reconstruction actually invokes its bounded service in the unresolved
case, rather than treating absence of UI state after a failed acquisition as success.

## Blocking finding 3 — the proposed lifecycle contract does not specify Strict-Mode-safe mount activation or an explicit reconstruction phase

Section 33.4 lists:

`idle`, `timer_action`, `post_finish_verification`, `retry_available`, `explicit_retry`, `disposed`.

Section 33.5 then requires reconstruction to use an explicit non-user operation/token, but the phase
contract does not say whether reconstruction is represented by `post_finish_verification`, another
phase, or only an operation-kind side channel. That ambiguity matters because `canStartRetry` and
`acquireRetry` must evaluate exactly the same authority while a reconstruction read is pending.

Before approval, the Plan must define:

- how an effect setup marks the session mounted/active after a Strict Mode probe without reviving a
  genuinely disposed, no-longer-owned session;
- the exact reconstruction phase/operation and its permitted transitions;
- which operation owns the token during Finish’s mutation and committed verification;
- how verified retryable/remediation ID counts are supplied to the session capability without
  creating divergent React/session truth;
- the exact `finally` release for Finish, reconstruction, explicit Retry, rejection, early return,
  stale settlement, show switch, and true unmount; and
- how a release causes React to re-render so an updated `canStartRetry` capability is reflected in
  the page.

## Required Plan/test corrections before implementation

Amendment 15 must be revised and independently reviewed again. At minimum, its production-used tests
must include:

1. a Strict-Mode-equivalent setup → cleanup → setup sequence followed by a successful current-show
   acquisition;
2. a true final unmount that permanently invalidates an in-flight token and prevents settlement;
3. acquisition diagnostics distinguishing `unmounted`, `show_mismatch`, `phase_busy`, and
   `acquired`, without raw IDs;
4. the owner case with one rendered retryable ID proving the corrected rejection reason,
   `sessionAcquired: true`, and exactly one service invocation;
5. reconstruction during Finish/verification proving no enabled control renders;
6. reconstruction after remount proving the service really runs and reconstructs a genuine
   unresolved warning;
7. completed remount proving no warning;
8. guaranteed release on every success, rejection, early-return, stale, show-switch, and unmount
   path;
9. same-frame duplicate activation proving one acquisition/service call; and
10. page wiring proving enabled rendering uses the same `canStartRetry` authority as acquisition.

The diagnostics remain development-only and must contain only a hashed show identifier, counts,
phase/operation, generation, acquisition result/reason, release reason, and stale-discard flag. The
Plan’s prohibition on raw request IDs, customer data, document bodies, credentials, and tokens is
approved.

## Gate result

Application implementation is **not approved** from the current Section 33. The root-cause and
navigation claims must first account for the proven `React.StrictMode`/permanent-`isUnmounted`
lifecycle, and the phase contract must explicitly cover mount reactivation and reconstruction.

No deployment is authorized or required by this review. Queued goals and production remain
untouched.

## Re-review of Sections 33.10–33.13

The Plan was corrected after the initial rejection. This re-review independently compared Sections
33.10–33.13 with the same current production source and the initial blocking findings.

### Resolution of initial findings

| Initial blocking finding | Re-review result |
|---|---|
| Strict Mode permanently leaves the persistent ref session unmounted | **Resolved.** Section 33.10 now records this as the proven primary owner-v16 rejection, and Section 33.11 requires setup-side `markMounted()` plus cleanup invalidation. |
| Navigation disappearance was incorrectly attributed to settled reconstruction | **Resolved.** Section 33.10 now records the actual ephemeral-state reset and failed reconstruction-acquisition path; Section 33.13 requires the bounded reconstruction service to be proven invoked for both complete and genuinely unresolved remounts. |
| Phase contract omitted mount reactivation and reconstruction | **Resolved.** Section 33.11 now names `reconstruction`, defines setup/cleanup semantics, preserves generation invalidation, and separates timer, verification, availability, explicit Retry, and disposed phases. |
| Acquisition failure reason was inferred rather than observed | **Resolved.** The acquisition result must now report `acquired`, `unmounted`, `show_mismatch`, or `phase_busy`, with sanitized diagnostics and exact tests. |
| Rendering and acquisition used different authorities | **Resolved in design.** Section 33.12 requires page eligibility and `acquireRetry()` to use the same `canStartRetry(showId)` predicate and requires a React-visible session revision after every transition. |

The corrected design is narrow, bounded, privacy-safe, and client-only. It does not change
Firestore reads/writes, Rules, Functions, capacity, Portal progress, historical behavior, timer
persistence, or production state. The proposed diagnostics expose only a hashed show ID, counts,
phase/operation, generation, acquisition/release result, and stale-discard status.

### Binding change 1 — retry availability must be committed atomically to the session transition

Section 33.11 says release enters `retry_available` only when verified retryable scope remains, while
Section 33.12 makes the session the authority for `canStartRetry`. Implementation must not decide
that transition from an independently updated React Boolean after releasing the token.

The production API must atomically provide the authoritative final classification to the session
transition—for example, a token-bound completion/release operation that receives whether verified
retryable scope remains and the owning show/generation. React failed-ID state may carry the exact
service scope, but the enabled capability and the phase transition must be produced by one
authoritative operation. A stale token must not be able to publish `retry_available`.

Tests must prove that:

- setting React retryable IDs without an authoritative session transition cannot enable Retry;
- an authoritative release with verified retryable scope enables it;
- complete/remediation/stale releases do not enable it; and
- the session revision causes the page-visible capability to update after release.

### Binding change 2 — the `post_finish_verification` boundary must reflect real production timing

Current `runAction("finish")` awaits `upcomingShowService.markShowPrintingFinished()` as one promise,
and that service currently encapsulates the Finish mutation, provisional reconciliation, and
committed verification. The hook cannot truthfully transition from `timer_action` to
`post_finish_verification` at the internal boundary unless the production orchestration exposes one.

Implementation must choose and document one narrow, production-true mechanism:

- expose a bounded lifecycle callback/phase signal from the existing Finish orchestration; or
- define the entire awaited Finish service lifecycle as one non-retryable Finish-owned phase and
  reserve `post_finish_verification` for a genuinely observable hook-owned boundary.

It must not add a fake phase transition after the service has already completed verification merely
to satisfy a test. No Firebase SDK call may move into the hook or page, and
`upcomingShowService.ts` remains unchanged unless this real boundary proves a minimal orchestration
contract change necessary.

Regardless of naming, reconstruction and explicit Retry must be unable to acquire for the whole
Finish mutation/reconciliation/committed-verification interval, and release must remain guaranteed
in `finally`.

## Final gate

**Final verdict: `APPROVED_WITH_CHANGES`.**

Implementation may proceed only with the two binding changes above applied and covered by
production-used tests. The independent Implementation Review must verify:

1. Strict Mode setup → cleanup → setup reactivates the live session while invalidating old tokens;
2. a true final unmount remains terminal because no later setup occurs;
3. the owner runtime path records the exact acquisition reason and invokes the service once;
4. the session—not a divergent React Boolean—authoritatively enables Retry;
5. the Finish-owned busy interval covers the real service verification timing;
6. reconstruction has an explicit phase and actually runs after remount;
7. all operation paths release in `finally`, with stale settlements discarded;
8. enabled page rendering and synchronous acquisition use the same predicate;
9. diagnostics contain no raw IDs or customer/document data; and
10. no Rules, Functions, deployment, production action, unbounded read, listener, or poll is
introduced.
