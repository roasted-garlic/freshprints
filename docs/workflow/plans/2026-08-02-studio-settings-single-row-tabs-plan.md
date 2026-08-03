# Plan: Studio Settings single-row tab layout

| Field | Value |
|-------|-------|
| Date | 2026-08-02 |
| Status | ready_for_review |
| Workflow | managed-phase (small UI amendment) |
| Goal | `studio-automatic-updates` (beta.3 visual proof prep) |

## Goal

Keep all eight Settings tabs on one horizontal row at the normal Studio window width, with
horizontal scroll as the narrow-window fallback instead of wrapping.

## Root cause (repository evidence)

`apps/studio/src/renderer/src/styles/components/settings.css`:
- `.settings-page-tab-bar` (line 5-11): `flex-wrap: wrap` plus `max-width: 62rem` — both cause
  `Studio updates` (the 8th tab) to wrap onto a second row well before the actual window edge.
- `.settings-section` (line 42-45+): also capped at `max-width: 62rem`, artificially narrowing the
  whole Settings content panel regardless of available width.

The outer container (`.page-layout` in `apps/studio/src/renderer/src/styles/layout.css:87-94`) is
already unconstrained (`max-width: none; width: 100%`), so the fix is local to these two rules —
no outer-shell change needed.

`STUDIO_MIN_WINDOW_WIDTH` (`apps/studio/electron/window/studioWindowConstraints.ts`) = `1420`px is
the normal supported minimum; `640`px is the dev-only absolute floor.

## Approach

1. `.settings-page-tab-bar`: `flex-wrap: nowrap`, `overflow-x: auto`, keep existing gap/sizing;
   remove or widen its `max-width` cap so it can use the full available width.
2. `.settings-page-tab`: add `flex: 0 0 auto` and `white-space: nowrap` so tabs never compress or
   wrap individually.
3. `.settings-section`'s `max-width: 62rem` is widened (not removed — an unbounded settings panel
   at very wide windows would look sparse) to a value that comfortably fits all 8 tabs without
   wrapping at the 1420px minimum width, while still reading as a normal content column at wider
   windows.
4. No change to tab selection logic, panel content, or any non-CSS file.

## Scope

In scope: `apps/studio/src/renderer/src/styles/components/settings.css` only (styling-layer change
per `09-coding-standards.md` — no service/IPC/Firebase/data-model touch).

Out of scope: Settings functionality, permissions, tab order, updater logic, release workflow,
Portal, production, stable release.

## Test strategy

- Studio typecheck (CSS-only change, but confirms nothing else regressed)
- Studio production package build
- Repo lint
- `git diff --check`
- Visual QA description (no automated visual regression tooling in this repo) at 1420px (normal
  minimum) and at a narrower width to confirm horizontal scroll engages instead of wrapping

## Risks

Widening `.settings-section`'s max-width could make very wide desktop monitors' Settings content
look stretched — mitigated by choosing a width that's generous but still a bounded reading-width
column, not `100%`.

## Rollback

Revert the CSS file; no other system depends on this change.
