# Signoff: Portal Google auth (customers only)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Signoff by | Signoff Agent |
| Goal | `portal-google-auth-customer-login-register` |
| Plan | `docs/workflow/plans/2026-07-14-portal-google-auth-customer-login-register-plan.md` |
| Review | `docs/workflow/reviews/2026-07-14-portal-google-auth-customer-login-register-review.md` |
| Test report | `docs/workflow/reviews/2026-07-14-portal-google-auth-customer-login-register-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

Portal customers can sign in or register with email/password **or** Google. First Google login collects username (and display name) on `/complete-profile`, then provisions via `registerCustomer`. Studio stays email/password only. Owner manual PASS after Firebase Google enablement and complete-profile processing overlay polish.

---

## Changes Delivered

### Behavior

- Portal login/register: **Continue with Google** (`signInWithPopup`)
- First Google session → `/complete-profile` → username + display name → provision
- AuthGate routes `missing-profile` / `missing-customer` to complete-profile (no false dead-end error)
- Complete-profile: full-screen processing overlay + busy lock until setup finishes
- Sticky auth errors cleared on login/register mount; Google cancel resets loading safely
- Studio: no Google UI

### Key files

- `apps/portal/features/auth/**` (AuthProvider, LoginForm, RegisterForm, GoogleAuthButton, CompleteProfileForm, authService, AuthGate)
- `apps/portal/app/complete-profile/page.tsx`
- `apps/portal/app/globals.css` (processing overlay styles)

### Documentation

- ADR-FP-081 in `DECISIONS.md`
- `docs/workflow/setup/portal-google-auth-setup.md`
- FIREBASE.md / SECURITY.md / BACKEND.md updates (per plan)

---

## Tests

### Automated

- `npx tsx --test apps/portal/features/auth/types/auth.types.test.ts` — **2 pass**

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Firebase Google enable + Portal Google auth flows (+ overlay polish) | **PASS** | owner (2026-07-14) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Manual UI / auth | obtained | 2026-07-14 | PASS with flying colors |
| Firebase Console Google (dev) | obtained | 2026-07-14 | Enabled for testing |
| Production Google enable / deploy | not required | | Separate checkpoint when shipping prod |
| Design / UX | obtained | 2026-07-14 | Complete-profile overlay accepted |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Same-email password then Google can leave Auth user with only Google provider | medium | Deferred account linking (ADR-FP-081); password reset may be needed to re-add password |
| Production Google provider / authorized domains | medium | Human Console enablement before prod traffic |
| Staff Google on Portal | low | Existing role checks + unavailable + sign out |

---

## Deferred Items (Roadmap)

- Explicit Firebase account linking (invite/password + same-email Google)
- Production Firebase Google enablement + authorized domains
- Image load caching (separate fast-follow)

---

## Open Blockers

- [x] None

---

## Verdict

**approved_with_notes** — Owner PASS on end-to-end Portal Google auth; notes cover deferred linking and production Console enablement.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] Manual checkpoint + test report updated
- [x] `references/project-chatgpt-handoff/` — **N/A** (package not present in repo)

**Recommended next action for user:** Pick next fast-follow (image caching, Phase 9, production Portal deploy, monorepo normalization, or account linking) explicitly — do not auto-start.
