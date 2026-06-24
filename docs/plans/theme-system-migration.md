# Theme System Migration Plan

## Goal

Migrate the Fresh Prints desktop renderer UI from the Phase 1 purple-accent token set to the official trading-terminal-inspired design system defined in `docs/STYLE_GUIDE.md`.

This migration updates styling, layout, theme architecture, and reusable UI components only.

## Scope

### In Scope

* Centralized design tokens
* Light and dark theme CSS variables
* Shared component styles (buttons, inputs, cards, modals, tables, badges, loading, empty states)
* Layout and navigation styling (sidebar, top bar, page layout)
* New shared UI components: `Badge`, `Modal`
* Replacing legacy color variable names with STYLE_GUIDE semantic tokens

### Out Of Scope

* Routing changes
* Firebase logic
* Authentication logic
* Service layer changes
* Business workflow changes
* New features or pages

## Files Affected

### Documentation

| File | Change |
| --- | --- |
| `docs/plans/theme-system-migration.md` | Created (this plan) |

### Style Architecture

| File | Change |
| --- | --- |
| `src/renderer/src/styles/tokens.css` | Expand to full token system |
| `src/renderer/src/styles/themes.css` | Replace with STYLE_GUIDE light/dark palettes |
| `src/renderer/src/styles/globals.css` | Import component style modules |
| `src/renderer/src/styles/layout.css` | Update to semantic tokens; reduce shadows |
| `src/renderer/src/styles/utilities.css` | Keep cross-cutting utilities only |
| `src/renderer/src/styles/components/buttons.css` | New |
| `src/renderer/src/styles/components/inputs.css` | New |
| `src/renderer/src/styles/components/cards.css` | New |
| `src/renderer/src/styles/components/modals.css` | New |
| `src/renderer/src/styles/components/tables.css` | New |
| `src/renderer/src/styles/components/badges.css` | New |
| `src/renderer/src/styles/components/loading.css` | New |
| `src/renderer/src/styles/components/empty-states.css` | New |
| `src/renderer/src/styles/components/navigation.css` | New |

### Shared Components

| File | Change |
| --- | --- |
| `src/renderer/src/shared/components/Button.tsx` | Add `warning` and `success` variants; optional `size` prop |
| `src/renderer/src/shared/components/Badge.tsx` | New |
| `src/renderer/src/shared/components/Modal.tsx` | New |

### Feature UI (styling-only touch points)

| File | Change |
| --- | --- |
| `src/renderer/src/features/firebase/components/FirebaseConnectionCard.tsx` | Use shared `Badge` component |

No other feature logic files require changes.

## New Styling Architecture

```txt
src/renderer/src/styles/
├── globals.css          # Imports + base document styles
├── tokens.css           # Non-color design tokens
├── themes.css           # Light/dark semantic color tokens
├── layout.css           # App shell, page layout, feature layout blocks
├── utilities.css        # Eyebrow, messages, reduced motion, helpers
└── components/
    ├── buttons.css
    ├── inputs.css
    ├── cards.css
    ├── modals.css
    ├── tables.css
    ├── badges.css
    ├── loading.css
    ├── empty-states.css
    └── navigation.css
```

### Layer Responsibilities

* **tokens.css** — spacing, radii, typography scale, motion, z-index, layout constants
* **themes.css** — all color semantics for light and dark themes
* **components/** — reusable visual patterns for shared UI primitives
* **layout.css** — structural composition of shell, pages, and feature sections
* **utilities.css** — small helpers not tied to one component

Components reference semantic classes only. Components must not define colors inline.

## Token Structure

### Color Tokens (themes.css)

Required semantic tokens from `docs/STYLE_GUIDE.md`:

```css
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary
--color-border
--color-border-strong
--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-accent-primary
--color-accent-primary-hover
--color-accent-primary-soft
--color-accent-primary-text
--color-success
--color-success-soft
--color-success-text
--color-danger
--color-danger-soft
--color-danger-text
--color-warning
--color-warning-soft
--color-warning-text
--color-focus-ring
--color-overlay
--color-scrim
--color-scrollbar-track
--color-scrollbar-thumb
--color-scrollbar-thumb-hover
```

### Non-Color Tokens (tokens.css)

```css
--space-1 … --space-8
--radius-xs … --radius-full
--font-size-xs … --font-size-2xl
--line-height-tight | normal | relaxed
--sidebar-width
--topbar-height
--panel-width-sm | md | lg
--content-max-width
--transition-fast | normal | slow
--shadow-xs | sm
--z-base | sticky | dropdown | modal | toast
--scrollbar-size
```

## Theme Structure

Theme modes remain unchanged:

```ts
type ThemeMode = "light" | "dark" | "system";
```

`ThemeProvider` continues to set `document.documentElement.dataset.theme` to the resolved `light` or `dark` value.

Light and dark palettes are defined in `themes.css` using exact values from `docs/STYLE_GUIDE.md`.

Derived tokens (scrollbar, focus ring references) are computed from semantic colors inside `themes.css`.

## Migration Strategy

### Phase 1 — Token Foundation

1. Expand `tokens.css` with the full non-color token set.
2. Replace `themes.css` with STYLE_GUIDE color values.
3. Update `globals.css` to use `--color-bg-primary` and `--color-text-primary`.

### Phase 2 — Component Style Extraction

1. Move button, input, card, loading, and empty-state rules out of `utilities.css`.
2. Create `styles/components/` modules per shared primitive.
3. Import component modules from `globals.css`.

### Phase 3 — Layout And Navigation Refresh

1. Update `layout.css` to use layered surfaces and thin borders.
2. Move sidebar and topbar rules to `navigation.css`.
3. Remove heavy shadows and decorative gradients from auth/status pages.

### Phase 4 — Shared Component Alignment

1. Extend `Button` variants to match the style guide.
2. Add `Badge` and `Modal` shared components.
3. Update `FirebaseConnectionCard` to render badges through the shared component.

### Phase 5 — Verification

1. Confirm login, dashboard, protected route states, and theme toggle in light mode.
2. Confirm the same screens in dark mode.
3. Run ESLint and TypeScript checks.
4. Ensure no inline styles or hardcoded hex values remain in renderer UI code.

## Risks

| Risk | Mitigation |
| --- | --- |
| Visual regressions on auth and dashboard screens | Keep class names stable where possible; use alias selectors during migration |
| Missed legacy token references | Search for `--color-bg`, `--color-primary`, `--color-surface` after migration |
| Contrast issues in dark mode | Use STYLE_GUIDE values verbatim; verify status badges and buttons |
| Scope creep into business logic | Restrict edits to `styles/` and shared UI components only |
| File size growth | Split by component domain instead of one large `utilities.css` |

## Rollback Strategy

If a visual regression is found:

1. Revert `src/renderer/src/styles/` changes.
2. Revert shared component styling changes.
3. Keep `docs/STYLE_GUIDE.md` as the target spec for a follow-up attempt.

## Completion Checklist

- [x] `tokens.css` contains full non-color token system
- [x] `themes.css` contains STYLE_GUIDE light and dark palettes
- [x] All renderer styles use semantic tokens only
- [x] Component style modules exist for buttons, inputs, cards, modals, tables, badges, loading, empty states, navigation
- [x] `Button`, `Badge`, and `Modal` shared components align with style guide
- [x] No inline styles in renderer UI
- [ ] Light and dark themes verified on existing screens (manual)
- [x] No Firebase, auth, routing, or service logic changed
