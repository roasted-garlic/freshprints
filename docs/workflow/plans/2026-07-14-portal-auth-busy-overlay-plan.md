# Plan: Portal auth busy overlay (login / register)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-portal-auth-busy-overlay-review.md |

---

## Goal

While Portal Google or email sign-in (and register) is in progress, show a clear full-viewport busy overlay so the login/register page does not appear idle after the user starts authentication.

## Background

`CompleteProfileForm` already uses a fixed `portal-auth-processing-overlay` with spinner and status copy. `LoginForm` / `RegisterForm` only flip button labels (`Signing in…` / `Connecting…`) via `isAuthActionLoading`. After Google popup or email submit—especially during profile bootstrap—the page can look unchanged aside from disabled controls. Owner asked for an overlay (or equivalent) during wait.

Parked prior workflow: `portal-catalog-pagination` (awaiting owner PASS/FAIL on indexes + manual paging).

## Scope

### In Scope
- Reuse existing auth processing overlay styles (`globals.css`) for login and register busy states
- Shared lightweight overlay component (title + optional message; no step list)
- Show overlay when `isBusy` already used by forms: `isAuthActionLoading` or (`loading-profile` + signed-in Firebase user)
- Appropriate copy for login vs register
- Accessibility: `role="status"`, `aria-busy`, `aria-live="polite"` (match complete-profile)

### Out of Scope
- AuthProvider / Firebase auth flow changes
- Complete-profile step progress UI refactor (already has overlay)
- Studio auth UI
- Catalog pagination signoff (parked)

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/auth/components/AuthBusyOverlay.tsx` (new)
- `apps/portal/features/auth/components/LoginForm.tsx`
- `apps/portal/features/auth/components/RegisterForm.tsx`
- Optionally thin refactor of `CompleteProfileForm` to compose shared shell — **optional**; prefer not to touch unless trivial

### Architecture Impact
- [x] Details: Presentation-only shared auth UI component; forms keep using `useAuth` busy flags. No service/layer changes.

### Security Impact
- [x] None — UI feedback only; does not alter auth, tokens, or error handling.

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Full-viewport blur overlay on `/login` and `/register` while signing in / creating account. Manual smoke recommended.

### Migration Impact
- [x] None

---

## Approach

1. Add `AuthBusyOverlay` wrapping existing `portal-auth-processing-overlay` / card / spinner classes with `title` and optional `message`.
2. In `LoginForm`, when `isBusy`, render overlay (e.g. title “Signing you in…”, message “This may take a moment.”).
3. In `RegisterForm`, when `isBusy`, render overlay (e.g. title “Creating your account…”, similar supporting line). Keep Google-first-login path that redirects to complete-profile; overlay clears when busy ends or navigation occurs.
4. Do not change when `isAuthActionLoading` is set/cleared in `AuthProvider` unless a clear stuck-state bug appears during implement (out of scope unless trivial).

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes (if TS/TSX touched) |
| Unit tests | n/a for presentational overlay | no |
| Build | optional portal build if typecheck alone insufficient | no |
| Integration | n/a | no |
| E2E | n/a | no |
| Backend/rules | n/a | no |

### Manual
- [x] Details: On Portal `/login`, start Google and email sign-in; confirm overlay appears and dismisses on cancel/error/success redirect. Same for `/register` email create and Google continue.

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (brief smoke)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Overlay sticks after cancelled Google popup | Medium | Rely on existing AuthProvider clear of `isAuthActionLoading` on catch; verify manually |
| Overlay too aggressive during short email login | Low | Same busy flags as disabled buttons; brief flash acceptable |
| Double overlays if redirect lands on AuthGate loading | Low | AuthGate replaces page content; overlay unmounts with form |

---

## Rollback Plan

Revert overlay component and Login/Register form mounts; styles already used by complete-profile remain.

---

## Documentation Updates Required
- [ ] None required for product docs (UI polish)
- [ ] STYLE_GUIDE.md — only if new pattern needs documenting; existing overlay already in globals

---

## Open Questions
- [x] None

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-14-portal-auth-busy-overlay-review.md
- Verdict: pending
