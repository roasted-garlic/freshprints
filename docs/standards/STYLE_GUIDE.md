# Fresh Prints Style Guide

## Purpose

This document is the official visual design system for Fresh Prints.

It defines how every screen, component, and interaction should look and behave across:

* **Fresh Prints Studio** (desktop-first staff application)
* **Fresh Prints Portal** (mobile-first responsive web for customers)

There is no separate native mobile application. Portal responsive breakpoints are the mobile strategy. Optional PWA install remains Portal styling.

Every UI change must follow this guide.

Fresh Prints should feel like professional operations software — not a consumer app, not a starter template, and not a generic admin dashboard.

The visual language is inspired by modern trading terminals and premium SaaS desktop tools:

* Dense but readable
* Data-forward
* Calm under pressure
* Fast to scan
* Precise and trustworthy

---

# 1. Design Philosophy

## Core Identity

Fresh Prints is an operations platform for design management, production workflows, queues, and customer requests. The interface should communicate:

* **Control** — operators can see status at a glance
* **Clarity** — information hierarchy is obvious
* **Speed** — layouts support frequent daily use
* **Professionalism** — the product feels like serious software

## Visual Principles

### Dense But Readable

Prioritize information density without clutter.

* Use compact vertical rhythm in data-heavy views
* Keep labels small and values prominent
* Group related data into bordered panels
* Avoid excessive whitespace in tables, dashboards, and tool panels

### Borders Over Shadows

Use **thin borders** and **layered surfaces** to create structure.

* Prefer `1px` borders using `--color-border`
* Use background layering (`primary` → `secondary` → `tertiary`) for depth
* Shadows are secondary and should be extremely subtle when used at all

### Glass-Like Depth Without Blur Overuse

Create depth through surface contrast, not decoration.

* Panels sit on slightly different background layers
* Modals and overlays use a darker/lighter scrim — not heavy glass blur
* Backdrop blur is allowed only for modals and floating panels, and must remain subtle (`blur(8px)` maximum)
* Never stack multiple blurred layers

### Professional Software Feel

Avoid consumer-app patterns:

* No oversized rounded pill buttons everywhere
* No playful gradients on primary surfaces
* No decorative illustrations in operational views
* No soft, low-contrast pastel UI in dark mode

Prefer:

* Sharp hierarchy
* Functional color coding
* Consistent control sizes
* Terminal-inspired tables and status chips

## Design Anti-Patterns

Do not:

* Hardcode colors in components
* Use inline styles for static layout
* Create one-off button styles per page
* Use heavy drop shadows as the primary depth mechanism
* Invert light theme colors for dark mode
* Sacrifice readability for density
* Use default browser form styling

---

# 2. Theme System

Fresh Prints supports three theme modes:

```ts
export type ThemeMode = "light" | "dark" | "system";
```

## Theme Application

* Theme state is managed centrally in `src/renderer/src/features/theme/`
* Resolved theme is applied to the document root:

```html
<html data-theme="light">
```

or

```html
<html data-theme="dark">
```

* `system` resolves to the OS preference via `prefers-color-scheme`
* Theme preference is persisted locally

## Theme Goals

### Premium Dark Mode

* Deep navy application background
* Layered charcoal/navy surfaces
* Subtle blue accents for selection and focus
* Bright, high-contrast primary text
* Thin cool-gray borders
* High information density
* Color-coded status (green success, red danger, gold warning)

### Premium Light Mode

* Clean white primary surfaces
* Very subtle gray page backgrounds
* Blue primary actions and selection states
* Green success accents
* Red danger accents
* Thin neutral borders
* Professional, calm, print-shop operations feel

## Theme Testing Rule

Every shared component and page must be verified in:

* Light mode
* Dark mode
* System mode on both macOS and Windows when possible

---

# 3. Color Tokens

All colors must use semantic CSS variables. Components must never reference raw hex values directly.

## Required Semantic Color Tokens

These tokens are mandatory across the platform:

| Token | Purpose |
| --- | --- |
| `--color-bg-primary` | Application root background |
| `--color-bg-secondary` | Primary panels, cards, shell regions |
| `--color-bg-tertiary` | Inputs, recessed areas, inactive controls |
| `--color-artwork-preview-bg` | Light neutral backing behind transparent or white artwork previews |
| `--color-border` | Standard 1px borders and dividers |
| `--color-text-primary` | Headings, primary values, body text |
| `--color-text-secondary` | Labels, captions, metadata |
| `--color-accent-primary` | Primary actions, active tabs, selection outlines |
| `--color-success` | Positive status, approved, active success actions |
| `--color-danger` | Errors, destructive actions, negative status |
| `--color-warning` | Caution, pending review, high-attention actions |

## Light Theme Color Values

```css
:root,
[data-theme="light"] {
  /* Background layers */
  --color-bg-primary: #f3f4f6;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f8f9fb;
  --color-artwork-preview-bg: #e5e7eb;

  /* Borders */
  --color-border: #e3e7ee;
  --color-border-strong: #cfd6e0;

  /* Typography */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;

  /* Accents */
  --color-accent-primary: #2563eb;
  --color-accent-primary-hover: #1d4ed8;
  --color-accent-primary-soft: rgb(37 99 235 / 0.12);
  --color-accent-primary-text: #ffffff;

  /* Status */
  --color-success: #0d9f6e;
  --color-success-soft: #ecfdf5;
  --color-success-text: #047857;

  --color-danger: #dc3f56;
  --color-danger-soft: #fef2f4;
  --color-danger-text: #b4233a;

  --color-warning: #d9a406;
  --color-warning-soft: #fffbeb;
  --color-warning-text: #92400e;

  /* Focus & overlays */
  --color-focus-ring: rgb(37 99 235 / 0.28);
  --color-overlay: rgb(17 24 39 / 0.42);
  --color-scrim: rgb(243 244 246 / 0.72);
}
```

## Dark Theme Color Values

```css
[data-theme="dark"] {
  /* Background layers */
  --color-bg-primary: #0b0e14;
  --color-bg-secondary: #12161f;
  --color-bg-tertiary: #1a2030;
  --color-artwork-preview-bg: #d9dee7;

  /* Borders */
  --color-border: #2a303c;
  --color-border-strong: #3a4354;

  /* Typography */
  --color-text-primary: #f3f6fb;
  --color-text-secondary: #9aa3b2;
  --color-text-tertiary: #6f7a8c;

  /* Accents */
  --color-accent-primary: #3b82f6;
  --color-accent-primary-hover: #60a5fa;
  --color-accent-primary-soft: rgb(59 130 246 / 0.16);
  --color-accent-primary-text: #ffffff;

  /* Status */
  --color-success: #22c997;
  --color-success-soft: rgb(34 201 151 / 0.12);
  --color-success-text: #86efca;

  --color-danger: #f05264;
  --color-danger-soft: rgb(240 82 100 / 0.14);
  --color-danger-text: #fecdd3;

  --color-warning: #e8b339;
  --color-warning-soft: rgb(232 179 57 / 0.14);
  --color-warning-text: #fde68a;

  /* Focus & overlays */
  --color-focus-ring: rgb(59 130 246 / 0.32);
  --color-overlay: rgb(0 0 0 / 0.58);
  --color-scrim: rgb(11 14 20 / 0.72);
}
```

## Functional Color Usage

| Use case | Token |
| --- | --- |
| App background | `--color-bg-primary` |
| Sidebar, cards, modals | `--color-bg-secondary` |
| Inputs, recessed controls | `--color-bg-tertiary` |
| Transparent and white artwork preview backing | `--color-artwork-preview-bg` |
| Dividers and panel edges | `--color-border` |
| Emphasized separators | `--color-border-strong` |
| Main text and numeric values | `--color-text-primary` |
| Field labels and table headers | `--color-text-secondary` |
| Placeholder and disabled text | `--color-text-tertiary` |
| Primary buttons, active tabs, selected cells | `--color-accent-primary` |
| Approved, connected, success chips | `--color-success` |
| Delete, reject, error states | `--color-danger` |
| Review needed, caution actions | `--color-warning` |

## Color Rules

* Use semantic tokens only
* Status colors communicate meaning — do not use red/green decoratively
* Accent blue is for interaction, not decoration
* Warning gold/yellow is reserved for high-attention actions (for example review/submit), not general highlights
* Never use pure `#000` or `#fff` except where contrast explicitly requires it

---

# 4. Typography

## Font Stack

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Optional monospace stack for IDs, timestamps, and queue positions:

```css
font-family:
  "SF Mono",
  ui-monospace,
  SFMono-Regular,
  Menlo,
  Monaco,
  Consolas,
  monospace;
```

## Type Scale

| Token | Size | Weight | Use |
| --- | --- | --- | --- |
| `--font-size-xs` | `0.6875rem` (11px) | 500 | Table metadata, chip text, compact labels |
| `--font-size-sm` | `0.8125rem` (13px) | 400–500 | Field labels, secondary UI text |
| `--font-size-md` | `0.875rem` (14px) | 400–500 | Default UI body |
| `--font-size-lg` | `1rem` (16px) | 500–600 | Section headers, key values |
| `--font-size-xl` | `1.25rem` (20px) | 600 | Page titles |
| `--font-size-2xl` | `1.5rem` (24px) | 600–700 | Hero metrics, primary instrument-style values |

## Line Heights

| Token | Value | Use |
| --- | --- | --- |
| `--line-height-tight` | `1.2` | Metrics, prices, compact rows |
| `--line-height-normal` | `1.45` | Body copy |
| `--line-height-relaxed` | `1.6` | Longer descriptions |

## Typography Rules

* Labels are smaller and secondary-colored
* Values are larger and primary-colored
* Numeric data in tables may use tabular figures when available
* Uppercase is allowed only for compact metadata labels (for example `BUYING POWER`, `STATUS`)
* Do not use more than three font sizes on a single panel
* Page titles are bold; supporting descriptions are secondary text

---

# 5. Border Radius Standards

Fresh Prints uses restrained radii to feel precise and professional.

| Token | Value | Use |
| --- | --- | --- |
| `--radius-xs` | `0.25rem` (4px) | Table cells, compact chips, price boxes |
| `--radius-sm` | `0.375rem` (6px) | Inputs, buttons, dropdowns |
| `--radius-md` | `0.5rem` (8px) | Cards, modals, panels |
| `--radius-lg` | `0.625rem` (10px) | Large containers, login panels |
| `--radius-full` | `9999px` | Toggles, circular preset buttons, status dots |

## Radius Rules

* Prefer `--radius-sm` for most interactive controls
* Tables and dense data grids use `--radius-xs` or square corners inside bordered grids
* Do not use large pill radii on primary navigation
* Modal corners use `--radius-md`
* Consistency matters more than variety

---

# 6. Spacing System

Spacing is compact by default to support operational density.

| Token | Value | Use |
| --- | --- | --- |
| `--space-1` | `0.25rem` (4px) | Tight icon gaps, chip padding |
| `--space-2` | `0.5rem` (8px) | Compact control padding |
| `--space-3` | `0.75rem` (12px) | Form field gaps, table cell padding |
| `--space-4` | `1rem` (16px) | Standard component padding |
| `--space-5` | `1.25rem` (20px) | Section spacing inside panels |
| `--space-6` | `1.5rem` (24px) | Card padding, panel sections |
| `--space-7` | `2rem` (32px) | Page section separation |
| `--space-8` | `2.5rem` (40px) | Major layout spacing |

## Spacing Rules

* Data tables use `--space-2` to `--space-3` internal padding
* Forms use `--space-3` between label and input, `--space-4` between fields
* Page content uses `--space-6` outer padding on desktop
* Do not create arbitrary spacing values outside the scale
* Dense layouts are preferred; airy layouts are reserved for onboarding and empty states

---

# 7. Layout Standards

## Application Shell

Fresh Prints Studio layout:

```txt
AppShell
├── Sidebar
├── Main
│   ├── TopNavigation
│   ├── PageHeader
│   └── PageContent
└── OptionalDetailPanel / Modal
```

## Layout Characteristics

* Fixed left sidebar for primary navigation
* Top bar for context, account/session actions, and utilities
* Main content scrolls independently where needed
* Optional right-side panel for detail/edit workflows (order-panel pattern)
* Bottom navigation is reserved for future mobile or compact breakpoints only

## AI Processing station layout (`/ai-review`)

The AI Processing page uses a **hybrid scroll** layout:

```txt
page-content-area--ai-review (overflow-y: auto — page scroll for right column)
└── ai-review-page
    └── ai-review-layout
        ├── queue panel (position: sticky, max-height, internal list scroll)
        └── workspace (natural height — no inner scroll trap on workspace-flow)
```

* Apply `page-content-area--ai-review` via route detection in `AppShell`.
* Left queue: `.ai-review-queue-panel` is sticky with `max-height: calc(100vh - 9rem)`; `.ai-review-queue-list` scrolls internally.
* Right workspace: `.ai-review-workspace-flow` grows naturally; staff scroll the page to reach long content.
* All tabs share the same square `.ai-review-preview-stage` (aspect-ratio 1, max 28rem).
* Stacked layout (`max-width: 1100px`): queue panel sticky with `max-height: min(38vh, …)` and internal scroll.

## AI Processing horizontal stepper (Processing tab)

Three grouped steps (backend stages unchanged):

| Node label | `aiProcessingStage` values |
| --- | --- |
| Sending to AI | `queued`, `preparing_image`, `sending_to_ai` |
| Receiving from AI | `receiving_response`, `validating_response` |
| Ready for review | `ready_for_review` |

Markup: `.ai-review-pipeline-stepper` with numbered circle nodes, connector line, labels below. States: complete (check + green), active (spinner), pending (number), failed (X + red). Show `aiSuggestions.errorMessage` under stepper when failed.

Import/thumbnail/preview steps are **not** shown in staff UI.

## Grid Behavior

* Dashboard metrics use responsive auto-fit grids
* Data tables are full-width within content area
* Two-column forms collapse to one column below `960px`
* Side panels are `20rem` to `28rem` wide on desktop

## Content Width

* Operational pages may use full available width
* Auth pages use a centered narrow panel (`24rem` to `28rem`)
* Long-form settings may use a max width of `48rem`

## Z-Index Layers

| Token | Value | Use |
| --- | --- | --- |
| `--z-base` | `0` | Normal content |
| `--z-sticky` | `10` | Sticky table headers, top nav |
| `--z-dropdown` | `20` | Menus, popovers |
| `--z-modal` | `30` | Modals and overlays |
| `--z-toast` | `40` | Toast notifications |

---

# 8. Form Controls

Forms should feel like professional software tools.

## General Form Rules

* Labels appear directly above controls
* Labels use `--font-size-sm` and `--color-text-secondary`
* Required fields are indicated consistently (asterisk or `required` attribute with visible label)
* Validation messages appear below the field
* Related controls are grouped inside bordered sections when appropriate
* Segmented controls are used for mutually exclusive options (for example quantity mode, filter mode)

## Segmented Controls

* Container uses `--color-bg-tertiary` with `--radius-sm`
* Inactive segments use secondary text
* Active segment uses:

```css
border: 1px solid var(--color-accent-primary);
background: var(--color-accent-primary-soft);
color: var(--color-text-primary);
```

## Selects And Dropdowns

* Same height and border treatment as text inputs
* Chevron icon on the right
* Menu surface uses `--color-bg-secondary` with `--color-border`

## Toggles

* Pill-shaped switch with `--radius-full`
* Off track: `--color-bg-tertiary`
* On track: `--color-accent-primary`
* Knob: `--color-bg-primary` with subtle shadow; use shared `Toggle` (`role="switch"`) for boolean filters such as **Show archived**

## Radio And Checkbox Groups

* Compact vertical or horizontal grouping
* Click target minimum `2.75rem` height for touch-friendly desktop use

---

# 9. Inputs

## Standard Text Input

```css
height: 2.5rem;
padding: 0 var(--space-3);
border: 1px solid var(--color-border);
border-radius: var(--radius-sm);
background: var(--color-bg-tertiary);
color: var(--color-text-primary);
```

## Input States

| State | Treatment |
| --- | --- |
| Default | Tertiary background, standard border |
| Hover | `--color-border-strong` |
| Focus | `border-color: var(--color-accent-primary)` + `--color-focus-ring` |
| Disabled | Reduced opacity, no hover border change |
| Error | `border-color: var(--color-danger)` + danger helper text |
| Read-only | Secondary background, no focus ring |

## Input Variants

* **Prefix/suffix fields** — currency, percentage, or unit symbols inside the field border
* **Compact numeric fields** — used in dense panels and tables
* **Large metric inputs** — only for primary operational values, not common forms

## Input Rules

* No browser default styling
* Placeholder text uses `--color-text-tertiary`
* Autofill styles must be theme-aware
* Password visibility toggles are icon-only buttons inside the field

---

# 10. Search Bars

Search is a primary navigation pattern in data-heavy views.

## Search Bar Anatomy

* Leading search icon
* Input field with placeholder such as `Search designs`, `Search customers`, or `Search symbol`
* Optional trailing clear button
* Optional keyboard hint in desktop tool views

## Search Styling

```css
height: 2.5rem;
border: 1px solid var(--color-border);
border-radius: var(--radius-sm);
background: var(--color-bg-tertiary);
```

* Top navigation search may be wider (`min-width: 16rem`, up to `28rem`)
* Focus uses accent border and focus ring
* Results dropdown uses card surface styling with compact rows

## Search Rules

* Search bars belong in top navigation or page headers — not buried mid-page without reason
* Loading and empty search results must be explicit
* Recent searches may appear in dropdown for operational screens

---

# 11. Buttons

Buttons must feel deliberate and operational.

## Button Sizes

| Size | Height | Use |
| --- | --- | --- |
| `sm` | `2rem` | Table actions, compact toolbars |
| `md` | `2.5rem` | Default buttons |
| `lg` | `3rem` | Primary modal actions |

## Button Variants

```ts
type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "warning"
  | "success";
```

### Primary

* Background: `--color-accent-primary`
* Text: `--color-accent-primary-text`
* Use for main constructive actions

### Secondary

* Background: `--color-bg-tertiary`
* Border: `1px solid var(--color-border)`
* Text: `--color-text-primary`
* Use for cancel, sign out, low-risk actions

### Ghost

* Transparent background
* Text: `--color-text-secondary`
* Use in toolbars and compact areas

### Danger

* Background: `--color-danger`
* Text: white
* Use for destructive confirmation actions

### Warning

* Background: `--color-warning`
* Text: dark neutral (`#111827` in light mode, `--color-bg-primary` in dark mode)
* Use for high-attention actions such as review/submit in operational flows

### Success

* Background: `--color-success`
* Text: white or dark depending on contrast
* Use sparingly for explicit positive actions (approve, confirm)

## Button Rules

* One primary action per panel or modal footer
* Full-width buttons are allowed in modals and mobile breakpoints
* Icon-only buttons require `aria-label`
* Disabled buttons reduce opacity and remove hover affordance
* Do not create page-specific button styling

---

# 12. Cards

Cards are bordered operational panels — not floating marketing tiles.

## Card Styling

```css
background: var(--color-bg-secondary);
border: 1px solid var(--color-border);
border-radius: var(--radius-md);
padding: var(--space-5);
```

## Card Types

| Type | Use |
| --- | --- |
| **Metric card** | Dashboard counts and status summaries |
| **Section card** | Grouped settings or form sections |
| **Data card** | Connection status, queue summary, request preview |
| **Interactive card** | Clickable design/request previews |

## Card Rules

* Prefer borders over shadows
* Optional shadow only as `--shadow-xs` when layering over busy backgrounds
* Card headers use title + optional eyebrow label
* Metric values use larger type; labels use secondary text
* Nested cards use `--color-bg-tertiary` to show hierarchy

---

# 13. Tables

Tables are a core Fresh Prints pattern and should feel terminal-inspired.

## Table Structure

* Sticky header row where useful
* Compact row height (`2.25rem` to `2.75rem`)
* Column headers in `--font-size-xs` or `--font-size-sm`, secondary color, uppercase allowed
* Row separators via `border-bottom: 1px solid var(--color-border)`
* Optional zebra uses subtle tertiary background — never high contrast

## Trading-Terminal Style Data Cells

For bid/ask, status, or selectable values:

* Values may appear inside bordered mini-cells
* Ask/selected values may use accent border
* Positive/negative values use success/danger text color
* Strike or key identifier columns may be centered and bold

## Table States

* Loading — skeleton rows or inline spinner in header
* Empty — dedicated empty state row or panel
* Error — inline error banner above table
* Selected row — `background: var(--color-accent-primary-soft)`

## Table Rules

* Right-align numeric columns
* Keep action columns narrow
* Do not hide critical status behind hover-only UI
* Horizontal scroll is acceptable for dense operational tables

---

# 14. Modals

Modals follow the order-panel pattern from the reference system.

## Modal Anatomy

```txt
Modal
├── Header (title + close)
├── Body (scrollable form/content)
└── Footer (primary + secondary actions)
```

## Modal Styling

* Surface: `--color-bg-secondary`
* Border: `1px solid var(--color-border)`
* Radius: `--radius-md`
* Overlay: `--color-overlay`
* Optional subtle backdrop blur: `backdrop-filter: blur(8px)`

## Modal Header

* Title uses `--font-size-lg` or `--font-size-xl`
* Close button is ghost icon button on the right
* Header separated by `border-bottom: 1px solid var(--color-border)`

## Modal Tabs

For workflows like review/edit:

* Tabs at top of modal (`Buy/Sell` style)
* Active tab uses thick bottom border in semantic color (success/danger/accent depending on context)
* Inactive tabs use secondary text

## Modal Footer

* Primary action right-aligned or full-width on compact layouts
* Secondary action to the left of primary
* Footer separated by top border

## Modal Rules

* Trap focus while open
* Close on `Escape` unless unsafe
* Body scrolls independently from header/footer
* Do not nest modals unless unavoidable

---

# 15. Sidebars

The sidebar is the primary operational navigation rail.

## Sidebar Styling

```css
width: var(--sidebar-width); /* 16rem to 17rem */
background: var(--color-bg-secondary);
border-right: 1px solid var(--color-border);
```

## Sidebar Contents

* Product mark / app identity at top
* Primary navigation links
* Role-aware visible items only
* Disabled future items shown muted with status such as `Later`
* No decorative imagery

## Navigation Item States

| State | Treatment |
| --- | --- |
| Default | Secondary text, transparent background |
| Hover | Tertiary background |
| Active | Accent-soft background or left accent bar, primary text |
| Disabled | Tertiary text, no hover, `aria-disabled` |

## Sidebar Rules

* Icons are optional but should be simple line icons when used
* Keep labels concise
* Do not overload sidebar with account settings; those belong in top navigation

---

# 16. Top Navigation

Top navigation provides session context and utility actions.

## Top Bar Contents

* Optional breadcrumb or page context
* Search in data-heavy views
* Utility icons (notifications, settings, docs) when needed
* Theme toggle
* User identity and sign out
* Role indicator

## Top Bar Styling

```css
min-height: var(--topbar-height); /* 4rem to 4.5rem */
background: var(--color-bg-secondary);
border-bottom: 1px solid var(--color-border);
padding: 0 var(--space-5);
```

## Top Bar Rules

* Keep one row whenever possible
* User name is primary text; role is secondary text
* Actions align right
* Do not place infrequent configuration actions in the top bar unless global

---

# 17. Empty States

Empty states should remain professional and concise.

## Empty State Anatomy

* Title
* Short explanation
* Optional primary action
* Optional secondary link

## Empty State Styling

* Centered within content region or table body
* No oversized illustrations
* Title uses `--font-size-lg`
* Message uses `--color-text-secondary`
* Optional icon in muted secondary color only

## Empty State Rules

* Explain why the area is empty
* Tell the user what to do next
* Use real operational language, not marketing copy

---

# 18. Loading States

Loading states must be calm and unobtrusive.

## Loading Patterns

| Pattern | Use |
| --- | --- |
| Inline spinner | Short auth/session checks, button loading |
| Panel skeleton | Cards and dashboards |
| Table skeleton | Data tables |
| Progress text | Longer known operations later in roadmap |

## Spinner Styling

* Uses accent color
* Accompanied by text for waits longer than ~500ms
* `aria-live="polite"` for page-level loading

## Loading Rules

* Disable triggering control while loading
* Preserve layout while loading (avoid content jumps)
* Session check copy example: `Checking your session`

---

# 19. Status Badges

Badges communicate compact operational status.

## Badge Variants

```ts
type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info";
```

## Badge Styling

```css
display: inline-flex;
align-items: center;
gap: var(--space-1);
padding: 0.125rem var(--space-2);
border-radius: var(--radius-full);
font-size: var(--font-size-xs);
font-weight: 600;
border: 1px solid transparent;
```

| Variant | Background | Text |
| --- | --- | --- |
| `default` | `--color-bg-tertiary` | `--color-text-secondary` |
| `success` | `--color-success-soft` | `--color-success-text` |
| `warning` | `--color-warning-soft` | `--color-warning-text` |
| `danger` | `--color-danger-soft` | `--color-danger-text` |
| `info` | `--color-accent-primary-soft` | `--color-accent-primary` |

## Badge Rules

* Use pills for statuses such as `Call`, `Put`, `Approved`, `Queued`, `Inactive`
* Do not use badges for long sentences
* Status color must match meaning across the app

## Resolution quality pills (Design Library)

Use `ResolutionQualityPill` for catalog resolution tiers derived from persisted `effectiveDpi`. Tooltip format: `Good Resolution · 268 DPI`.

| Tier | Label | Effective DPI | Pill mapping |
| --- | --- | --- | --- |
| Optimal | Optimal | ≥ 300 | `success` / green (`--color-success-*`) |
| Good | Good | 250–299 | `warning` / yellow (`--color-warning-*`) |
| Bad | Bad | 200–249 | `danger` / red (`--color-danger-*`) |
| Terrible | Terrible | 72–199 | `default` with black/dark border (`--color-text-primary` on `--color-bg-primary`) |

CSS tokens live in `design-library.css` under `.resolution-quality-*`. Terrible tier must remain readable in dark mode — use primary text/border tokens, not pure `#000`.

---

# 20. Theme Toggle Behavior

Theme toggle is a global utility control.

## Supported Modes

```ts
"light" | "dark" | "system"
```

## Toggle Behavior

* Cycles or selects between light, dark, and system
* Applies resolved theme immediately
* Persists preference in local storage
* Icon reflects current resolved theme, not just selected mode

## Toggle Placement

* Top navigation
* Login page toolbar

## Toggle Rules

* Must be keyboard accessible
* Must include accessible label such as `Toggle theme`
* Must not cause visible flash of wrong theme on startup when preference exists

---

# 21. Accessibility Requirements

Accessibility is required, not optional.

## Minimum Requirements

* All interactive controls are keyboard reachable
* Visible focus ring using `--color-focus-ring`
* Inputs have programmatic labels
* Buttons use `<button>` elements
* Icons alone are not accessible without labels
* Modal focus is trapped and restored on close
* Error text is associated with fields where possible
* Color is never the only indicator of meaning
* Contrast must meet WCAG AA for text and controls
* `prefers-reduced-motion` is respected

## Density And Accessibility Balance

* Compact UI is allowed, but minimum touch/click targets remain at least `2.25rem`
* Table text may be small, but primary values must remain readable
* Status badges must include text, not color alone

---

# 22. CSS Architecture

Fresh Prints uses a layered global CSS architecture.

## File Structure

```txt
src/renderer/src/styles/
├── globals.css
├── tokens.css
├── themes.css
├── layout.css
└── utilities.css
```

## File Responsibilities

### `globals.css`

* Reset and base element styles
* Font smoothing
* Root typography defaults
* Scrollbar styling
* Focus defaults

### `tokens.css`

* Spacing scale
* Radius scale
* Typography scale
* Z-index scale
* Motion tokens
* Layout constants (`--sidebar-width`, `--topbar-height`)

### `themes.css`

* Light theme semantic colors
* Dark theme semantic colors
* Theme-aware derived tokens (scrollbar, focus, overlays)

### `layout.css`

* App shell
* Sidebar
* Top navigation
* Page layouts
* Auth pages
* Modal layouts
* Table layouts

### `utilities.css`

* Visually hidden text
* Text truncation
* Status messages
* Compact helpers
* Focus utilities

## CSS Rules

* No inline styles for static presentation
* No hardcoded colors in components
* Feature components use semantic classes
* Global theme variables are the single source of color truth
* Scrollbars must be theme-aware

---

# 23. Design Tokens

Complete token reference for implementation.

## Color Tokens

```css
/* Backgrounds */
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary
--color-artwork-preview-bg

/* Borders */
--color-border
--color-border-strong

/* Text */
--color-text-primary
--color-text-secondary
--color-text-tertiary

/* Accent */
--color-accent-primary
--color-accent-primary-hover
--color-accent-primary-soft
--color-accent-primary-text

/* Status */
--color-success
--color-success-soft
--color-success-text
--color-danger
--color-danger-soft
--color-danger-text
--color-warning
--color-warning-soft
--color-warning-text

/* Utility */
--color-focus-ring
--color-overlay
--color-scrim
--color-scrollbar-track
--color-scrollbar-thumb
--color-scrollbar-thumb-hover
```

## Layout Tokens

```css
--sidebar-width: 17rem;
--topbar-height: 4.5rem;
--panel-width-sm: 20rem;
--panel-width-md: 24rem;
--panel-width-lg: 28rem;
--content-max-width: 48rem;
```

## Radius Tokens

```css
--radius-xs: 0.25rem;
--radius-sm: 0.375rem;
--radius-md: 0.5rem;
--radius-lg: 0.625rem;
--radius-full: 9999px;
```

## Spacing Tokens

```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.25rem;
--space-6: 1.5rem;
--space-7: 2rem;
--space-8: 2.5rem;
```

## Typography Tokens

```css
--font-size-xs: 0.6875rem;
--font-size-sm: 0.8125rem;
--font-size-md: 0.875rem;
--font-size-lg: 1rem;
--font-size-xl: 1.25rem;
--font-size-2xl: 1.5rem;

--line-height-tight: 1.2;
--line-height-normal: 1.45;
--line-height-relaxed: 1.6;
```

## Motion Tokens

```css
--transition-fast: 120ms ease;
--transition-normal: 180ms ease;
--transition-slow: 240ms ease;
```

## Shadow Tokens

Shadows are minimal.

```css
--shadow-xs: 0 1px 2px rgb(0 0 0 / 0.12);
--shadow-sm: 0 4px 12px rgb(0 0 0 / 0.14);
```

Use shadows only when a floating element needs separation from a busy surface.

## Z-Index Tokens

```css
--z-base: 0;
--z-sticky: 10;
--z-dropdown: 20;
--z-modal: 30;
--z-toast: 40;
```

---

# 24. Component Styling Rules

Shared components are mandatory. Pages compose components; they do not invent new visual patterns.

## Required Shared Components

```txt
src/renderer/src/shared/components/
├── Button.tsx
├── TextInput.tsx
├── Card.tsx
├── PageHeader.tsx
├── Sidebar.tsx
├── AppShell.tsx
├── LoadingSpinner.tsx
├── EmptyState.tsx
├── ErrorState.tsx
├── ThemeToggle.tsx
```

Future shared components:

* `Select.tsx`
* `Modal.tsx`
* `Badge.tsx`
* `Table.tsx`
* `Tabs.tsx`
* `SearchInput.tsx`
* `Toast.tsx`

## Component Rules

| Component | Rule |
| --- | --- |
| `Button` | Uses approved variants only; no page-level custom colors |
| `TextInput` | Uses standard height, border, focus, and error states |
| `Card` | Bordered surface, no ad hoc shadows |
| `PageHeader` | Title, eyebrow, description pattern |
| `Sidebar` | Role-aware nav; active state uses accent |
| `AppShell` | Composes sidebar + top nav + content only |
| `LoadingSpinner` | Accent-colored, labeled when page-level |
| `EmptyState` | Concise operational copy |
| `ErrorState` | Clear title, message, and optional recovery action |
| `ThemeToggle` | Accessible, persistent, visible in shell and login |

## Class Naming

Use semantic names tied to purpose:

```css
.page-layout
.dashboard-metric-grid
.order-panel
.design-table
.status-panel
.auth-message
```

Do not use color-based class names:

```css
/* Bad */
.blue-box
.red-text

/* Good */
.info-panel
.danger-text
```

## Page Composition Rules

* Pages render layout and compose shared components
* Pages do not define new button/input/card styles
* Role visibility uses `RoleGate` and `permissionService`
* Data-heavy screens use tables and bordered panels first
* Do not mix marketing-style hero sections into admin workflows

---

# Motion Guidelines

Allowed:

* Fast hover transitions on buttons and nav items
* Modal fade in/out
* Toast slide/fade
* Theme change cross-fade on surfaces

Avoid:

* Bouncy animations
* Long transitions
* Decorative motion on data tables
* Motion that delays operational tasks

Always respect `prefers-reduced-motion`.

---

# UI Completion Checklist

Before completing any UI task:

* [ ] Uses shared components where possible
* [ ] Uses semantic design tokens only
* [ ] Works in light mode
* [ ] Works in dark mode
* [ ] Uses thin borders and layered surfaces appropriately
* [ ] Avoids unnecessary shadows and blur
* [ ] Supports dense data layout where applicable
* [ ] Includes loading state when needed
* [ ] Includes error state when needed
* [ ] Includes empty state when needed
* [ ] Keyboard and focus behavior are correct
* [ ] No inline styles for static presentation
* [ ] No hardcoded colors
* [ ] Looks like professional operations software

---

# Source Of Truth

This document is the source of truth for:

* Visual style
* Theme system
* Color tokens
* Typography
* Spacing and layout
* Component appearance
* Accessibility standards for UI
* CSS architecture

If implementation differs from this guide, update implementation to match this guide — not the other way around.
