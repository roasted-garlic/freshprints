# Plan: Portal auth logos + Studio login theme-toggle overlap

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-portal-auth-logo-studio-login-overlap-review.md |

---

## Goal

Show the Portal brand logo on Portal sign-in and sign-up pages. Fix Studio login so the theme toggle no longer overlaps the centered logo—without shifting the logo off center.

## Background

Studio login uses an absolute top-right `ThemeToggle` over a centered `AppLogo`; the large logo collides with the toggle. Portal login/register still use text eyebrow only; Request Portal logo assets and `PortalLogo` already exist.

## Scope

### In Scope

- Studio: CSS/layout so theme toggle clears the logo; logo stays horizontally centered
- Portal: add `PortalLogo` to `/login` and `/register` (and `/complete-profile` for the same auth surface)
- Minimal shared auth-header styling on Portal

### Out of Scope

- New logo assets or brand redesign
- Changing Studio sidebar logo behavior
- Auth logic / Google auth changes
- Production deploy

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/src/renderer/src/styles/layout.css` (and/or login panel styles)
- `apps/portal/app/login/page.tsx`
- `apps/portal/app/register/page.tsx`
- `apps/portal/app/complete-profile/page.tsx` (same auth chrome)
- `apps/portal/app/globals.css` (auth logo/header styles)

### Architecture Impact

- [x] None (presentation only)

### Security Impact

- [x] None

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Studio login clearance; Portal auth pages show logo. Manual visual check.

### Migration Impact

- [x] None

---

## Approach

1. **Studio:** Keep logo `justify-items: center`. Reserve vertical space under the absolute toolbar (`padding-top` on `.login-header`) so the logo sits below the toggle. Optionally tighten `.login-logo` `max-width` with symmetric side clearance so a wide mark cannot underlap the toggle corners while remaining centered.
2. **Portal:** Add centered `PortalLogo` above the existing eyebrow/title on login, register, and complete-profile. Match Studio-ish hierarchy (logo → product name → heading).
3. Ensure floating `PortalChrome` theme toggle still clear of the logo (page-level fixed toggle; add top padding on auth shell if needed).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Lint (touched files) | ReadLints | yes |

### Manual

| Check | Required |
|-------|----------|
| Studio login: logo centered; theme toggle does not overlap | yes |
| Portal login + register (+ complete-profile): logo visible, theme toggle usable | yes |

---

## Human Checkpoints Anticipated

- Manual visual PASS on Studio + Portal auth pages

## Risks

| Risk | Mitigation |
|------|------------|
| Over-padding makes login feel sparse | Use ~toggle-height clearance only |
| Portal logo too large on mobile | `max-width: 100%` + capped size |

## Rollback

Revert CSS/TSX presentation changes.

## Open Questions

- None
