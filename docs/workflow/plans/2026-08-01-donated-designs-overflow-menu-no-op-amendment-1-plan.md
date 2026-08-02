# Amendment 1 Plan: Donated Designs menu preferred below

Date: 2026-08-01
Parent slice: `donated-designs-overflow-menu-no-op`
Starting commit: `4b7f93d2ce384d85d0f7a9e95eb188ef9490daaa`

## Evidence

- Owner QA confirms the repaired menu is now visible, but requests normal placement below the trigger.
- Studio has no shared React portal/popover primitive. `Select` and `TagChipInput` measure available space and flip their absolutely positioned descendants, but that pattern remains subject to an ancestor's overflow clip.
- Removing `.customer-upload-intake-panel { overflow: hidden; }` would broaden layout behavior for the whole intake panel. A document-body portal is narrower and preserves border-radius/content containment.

## Amendment

1. Render the existing shared `DangerOverflowMenu` panel through `createPortal(..., document.body)` while leaving its trigger in place.
2. Position the portaled panel with viewport-fixed coordinates derived from the trigger rectangle and measured menu size.
3. Prefer below. Flip above only when the menu does not fit below and more usable space exists above.
4. Clamp horizontal and vertical coordinates to a small viewport margin so the menu remains visible.
5. Reposition on viewport resize and capture-phase scroll while open.
6. Treat both trigger root and portaled menu as inside-click regions; preserve outside close, Escape/focus return, first-item focus, toggling, selection close, semantics, and disabled/empty behavior.
7. Change the intake call site from forced `top` to preferred `bottom`. Preserve its selected-row/filter key.

## Tests

- Extend the pure behavior tests with deterministic geometry cases: preferred below, insufficient-below flip, no unnecessary flip, and viewport clamping.
- Update the source contract to prove `createPortal`, fixed positioning, retained clipping boundary, preferred bottom, collision fallback, and unchanged action/accessibility/data-safety wiring.
- Run focused tests, Studio TypeScript, Studio production build/package, lint, and `git diff --check`.

## Non-goals

- No action, permission, deletion flow, backend, Rules, data, Whatnot remediation, production promotion, deployment, or installer change.
