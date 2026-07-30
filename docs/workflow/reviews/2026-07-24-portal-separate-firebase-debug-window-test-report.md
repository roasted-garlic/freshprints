# Portal Separate Firebase Debug Window — Test Report

## Outcome

Implementation is ready for owner runtime testing.

The verified inactive report root cause was lifecycle ownership: the Portal shortcut only toggled
the in-page panel, while tracing remained disabled unless a prior local-storage opt-in existed.
Reset could initialize tracing, but opening the UI did not. The formatter also lacked an explicit
active/inactive session status, allowing `startedAtIso: null` to resemble a valid empty capture.

## Correction

- The normal eligible Portal tab starts/restores tracing independently of debug UI, before passive
  page effects.
- `Ctrl+Shift+F` opens or focuses one named 485 px `/firebase-debug` popup.
- The main tab publishes sanitized snapshots through `BroadcastChannel`; the popup sends only fixed
  Reset/enable/disable commands.
- The debug route bypasses Portal authentication/data providers and cannot own a trace.
- An opaque handshake binds the popup to one live owner. Direct access fails closed.
- Owner heartbeats make refresh/closure visible; stale snapshots are removed rather than displayed.
- Closing/reopening the popup preserves the main-tab session.
- Popup blocking displays a safe message in the main tab.
- Reports now include `session.status: active | inactive`; inactive reports explicitly say they are
  not completed zero-activity captures.
- Runtime message validation rejects malformed messages and known sensitive-data fields.

No Portal catalog query, Firebase rule, Function, generated asset, or production behavior changed.
The observed 223-read interaction spike and later idle spikes remain unattributed.

## Verification

- `npm run typecheck --workspace @fresh-prints/portal` — pass.
- `npm run build:portal` — pass; `/firebase-debug` included in the route output.
- Focused protocol/gate/report/tracer/event tests — 21 passed, 0 failed.
- Changed-file ESLint with `--max-warnings 0` — pass.
- `git diff --check` — pass with existing line-ending warnings only.
- Live browser automation — unavailable because this session exposed no controllable browser.
  Popup and cross-window behavior therefore remain an explicit owner checkpoint.

No deployment, republish, `rebuildCatalogSnapshots`, rules change, or production action occurred.

---

## Portal R-015 generated-first and popup-liveness correction

The owner’s attributable two-window run proved that successful generated assets were not gating
normal Library loading: ready-design pages/counts ran in parallel, returning 166 documents (171
approximate billable reads). The three-second heartbeat also mistook background timer throttling
for owner loss.

- Every normal browse/filter/discovery request now begins with generated assets and launches no
  speculative Firestore query or count.
- Filtered/discovery failures fail closed. Only plain browse retains the approved bounded first-page
  fallback after terminal failure and an explicit fallback trace.
- The Discover page no longer issues an independent count.
- Existing generation guards ignore stale route/remount completions.
- Popup liveness no longer depends on throttled intervals; explicit owner teardown/refresh is the
  disconnect signal.
- The authoritative print-limit listener replaces redundant focus/visibility `readLimit()` calls.

Portal typecheck/build, focused tests 40/40, changed-file ESLint, and diff check pass. No deployment,
republish, `rebuildCatalogSnapshots`, Function/rules/generated-asset, or production action occurred.
