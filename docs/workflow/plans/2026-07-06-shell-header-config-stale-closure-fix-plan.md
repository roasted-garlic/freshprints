# Plan: Fix Stale Shell Header Action Closures

**Date:** 2026-07-06
**Status:** Draft — awaiting review

## Problem

User reported that after saving a new gang sheet label font size in Show
Queue settings, reopening the settings modal did not show the newly saved
value — despite the save itself succeeding (confirmed via Firestore).

Root cause is in shared infrastructure, not the Show Queue feature itself:
`src/renderer/src/shared/hooks/useShellHeaderConfig.ts` registers each
page's header config (title, actions, search, etc.) into a shared context
consumed by `AppHeader.tsx`. Its `useLayoutEffect` that actually pushes the
config into context is gated by a hand-rolled `configSignature` string
(`serializeShellHeaderConfig`) that only serializes **display** values —
action labels, title, description, filter/search/toggle values. It does
**not** include the identity of `onClick`/`onChange` handlers themselves.

`UpcomingShowsPage.tsx`'s "Settings" header button's `onClick` is
`openSettingsModal`, a `useCallback` whose identity correctly changes every
time `showQueueSettings.settings.*` changes (its dependency array already
lists every relevant settings field). But because the button's **label**
("Settings") never changes, `configSignature` never changes either, so the
`useLayoutEffect` never re-runs after the very first time it fired — the
shared header context is permanently stuck holding the **first-ever**
`openSettingsModal` closure from initial mount, before `getSettings()` had
even resolved. Every subsequent click reseeds the modal's inputs from that
ancient, empty snapshot of settings — explaining exactly why saved changes
never appear to "take" on reopen.

This is not specific to Show Queue or gang sheet settings: any page using
`useShellHeaderConfig` with a header action whose handler closes over
frequently-changing state has the same latent bug (currently at least 7
pages use this hook — Show Queue, Print Requests, AI Review, User
Management, Settings, Imports, Design Library).

## Decision (confirmed with user)

Fix `useShellHeaderConfig` itself, not just the Show Queue call site — this
is the correct long-term fix since other pages rely on the same hook the
same way and could hit the identical bug with any header action that reads
frequently-changing state.

## Scope

### In scope

- `src/renderer/src/shared/hooks/useShellHeaderConfig.ts`: change the
  `useLayoutEffect`'s dependency from the hand-rolled `configSignature`
  string to the `config` object itself (removing
  `serializeShellHeaderConfig` and its signature memo entirely). Every
  existing call site already wraps its config in `useMemo` with a correct
  dependency array (confirmed across all current callers), so `config`'s
  identity already changes exactly when it should — the signature layer was
  redundant at best and, as shown here, actively wrong since it silently
  dropped updates whose only difference was a closure identity.

### Out of scope

- No caller-side changes needed — every existing `useShellHeaderConfig`
  call site already memoizes its config object correctly; they were doing
  the right thing and being defeated by the hook's own internal gating.
- No change to `ShellHeaderProvider`/`AppHeader.tsx` — both already read
  `headerConfig` fresh from context on every render; the bug is purely in
  when `setHeaderConfig` gets called.

## Technical Approach

Replace:

```ts
const configSignature = useMemo(() => serializeShellHeaderConfig(config), [config]);

useLayoutEffect(() => {
  setHeaderConfig(configRef.current);
}, [configSignature, setHeaderConfig]);
```

with simply depending on `config` directly:

```ts
useLayoutEffect(() => {
  setHeaderConfig(config);
}, [config, setHeaderConfig]);
```

`configRef` and `serializeShellHeaderConfig` become unnecessary and are
removed. This is a strict correctness fix with no behavior change for any
call site that was already working correctly (static or rarely-changing
configs) — it only changes behavior for the case that was broken (a config
whose action closures should have triggered a re-registration but didn't).

## Files Touched (expected)

- `src/renderer/src/shared/hooks/useShellHeaderConfig.ts`

## Verification Plan

- `npx tsc --noEmit`, `npm run lint`, `npx vite build`.
- Manual QA: in Show Queue, open Settings, change the label font size, save,
  reopen Settings, and confirm the field now shows the just-saved value
  (previously showed the stale pre-save value). Spot-check one or two other
  pages using `useShellHeaderConfig` (e.g. Print Requests) to confirm header
  actions still render and function normally with no regressions.
