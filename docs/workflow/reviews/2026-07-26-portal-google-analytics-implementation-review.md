# Implementation Review — `portal-google-analytics` (inert code, second pass)

**Scope:** independent review of the script-readiness handshake correction, addressing
an owner-identified runtime race in the first Implementation-Review-approved code: the
analytics controller could permanently lose its initial GA configuration and page view
if its first React effect ran before the `next/script strategy="afterInteractive"`
script had executed and defined `window.gtag`, because the prior code committed
"initialized" state unconditionally after merely *calling* the service functions
(which silently no-op if `gtag` doesn't exist yet), not after confirming they
succeeded. See Plan Section 34 for the full root-cause record.

## Verdict: APPROVED

All ten required checklist items pass, independently re-verified against the actual
code (not the prior review's claims).

## Files reviewed (this pass)

- `apps/portal/features/analytics/services/portalAnalyticsService.ts` (+ test) —
  `initializeStream`/`updatePageContext`/`trackPageView` now return `boolean`
- `apps/portal/features/analytics/hooks/usePortalAnalyticsController.ts` (+ test) —
  readiness-gated, success-gated state commit
- `apps/portal/features/analytics/components/PortalAnalyticsScript.tsx` (+ test) —
  `onReady` prop added
- `apps/portal/features/analytics/components/PortalAnalyticsBoundary.tsx` — owns
  `scriptReady` state

## Findings

1. **Script/controller readiness handshake — PASS.** Traced the full chain:
   `PortalAnalyticsScript`'s stub `<Script onReady={onReady}>` → `PortalAnalyticsBoundary`'s
   `handleReady` callback flips `scriptReady` `useState` → passed into
   `usePortalAnalyticsController(config, scriptReady)` → read inside
   `runPortalAnalyticsControllerTick` at the `if (!scriptReady) return` guard. Genuine,
   unbroken, no missing link.
2. **Delayed script readiness — PASS.** The tick function always reads the current
   `pathname`/`searchParams` argument at call time, never a stale closure. Direct test
   confirms: two navigations while unready, then readiness arriving on a third,
   different route, produces exactly one initial page view using that current route
   (`/requests/:id`), not an earlier stale one.
3. **Permanently blocked script — PASS.** The tick returns before any service call when
   `scriptReady` is `false`; `state.initialized` never becomes `true`; no throw
   anywhere in the chain, including the real React components (`useState(false)`'s
   initial value simply persists if `onReady` never fires).
4. **`initializeStream` reporting failure — PASS.** `if (!initialized) return`
   executes before any state mutation and before `trackPageView` is reached. A later
   tick with a succeeding service initializes correctly — no state was falsely
   committed to block the retry.
5. **No false initialized state — PASS.** The only write site for `state.initialized`
   is unconditionally guarded by the boolean success check; no other write site exists
   anywhere in the file.
6. **No `update: true` before initial configuration — PASS, structurally.** The
   `updatePageContext` branch is only reachable in the fall-through path after
   `state.initialized` is already `true`, which (per finding 5) can only happen after a
   real successful `initializeStream` call. No code path bypasses this.
7. **Exactly one initial `config` + page view under replay — PASS.** Verified across
   Strict-Mode-style replay both before and after readiness, and across a readiness
   callback firing more than once (still `true` each time) — all produce exactly one
   pair, never duplicated.
8. **Thin component boundaries preserved — PASS.** `PortalAnalyticsScript.tsx` still
   contains zero `gtag('config'/'set', ...)` calls and no route/identity logic (proven
   by a comment-stripped source-text regression test); its only new responsibility is
   forwarding `onReady`. `PortalAnalyticsBoundary.tsx` owns only the boolean readiness
   state and makes no gtag-related decision itself.
9. **No real Measurement ID or external change — PASS.** Confirmed via `git status`
   and direct diff inspection: only the analytics feature files and the already-known
   wiring files changed; no GA4 property, Firebase config, or production file touched.
10. **Command verification — PASS**, independently re-run:
    - `npx tsx --test` on the analytics test files → **81/81 pass, exit 0**.
    - `npm run typecheck --workspace @fresh-prints/portal` → **exit 0**.
    - `npm run lint` → **exit 1** (literal, precisely captured) — `41 problems (31
      errors, 10 warnings)`, all pre-existing and unrelated to this goal; none located
      in `apps/portal/features/analytics/`, `apps/portal/app/layout.tsx`, or
      `apps/portal/app/providers.tsx`. The non-zero exit is fully explained by the
      repository's own `--max-warnings 0` lint policy tripping on 10 pre-existing
      warnings — not a regression introduced by this goal, and not rounded down to
      "clean" in this report.

## Verification commands and exact results

```bash
$ npx tsx --test apps/portal/features/analytics/services/*.test.ts apps/portal/features/analytics/hooks/*.test.ts apps/portal/features/analytics/components/*.test.ts
# tests 81
# pass 81
# fail 0
EXIT_CODE=0

$ npm run typecheck --workspace @fresh-prints/portal
> tsc --noEmit
EXIT_CODE=0

$ npm run build:portal
✓ Compiled successfully
✓ Generating static pages (19/19)
EXIT_CODE=0

$ npm run lint
✖ 41 problems (31 errors, 10 warnings)   # all pre-existing, none in this goal's files
EXIT_CODE=1
```

No real Measurement ID was used at any point. No GA4 property was created or changed.
No Firebase, deployment, or production action occurred.
