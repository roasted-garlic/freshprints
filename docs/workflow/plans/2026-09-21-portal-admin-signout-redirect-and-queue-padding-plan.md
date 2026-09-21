# Plan: Portal admin sign-out redirect + Show Queue bottom padding

| Field | Value |
|-------|-------|
| Date | 2026-09-21 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-21-portal-admin-signout-redirect-and-queue-padding-review.md |

---

## Goal

Fix the Portal admin Show Queue / Staff Artwork sign-out path so staff reliably land on the login page instead of remaining stuck on “Redirecting to staff sign-in…”, and add a little more bottom padding on the admin Show Queue page so the last request card is not flush with the viewport edge.

## Background

Owner report (DEV Portal):

1. Signing out of the admin portal paints **Redirecting to staff sign-in…** (with the DEV banner) and never leaves that screen.
2. Admin Show Queue list needs more space below the last card.

Code inspection:

- `PortalAdminAuthGate` shows that copy when `bootstrapStatus` is `unauthenticated` / `anonymous-guest`, and soft-navigates via `router.replace(buildPortalAuthHref('/login', …))`.
- `AuthProvider.logout` also soft-navigates with `router.replace('/login')` after Firebase `signOut`.
- Soft navigation from the `(admin)` client layout can race or fail to unmount the gate, leaving the redirect UI permanently painted. This is not DEV-only logic (DEV banner is unrelated); it can happen anywhere soft nav fails after admin sign-out.
- Show Queue section uses `.portal-admin-queue { padding: 1.25rem 0.75rem 2rem; }` — bottom `2rem` is tight against the last card.

## Scope

### In Scope

- Harden admin guest redirect in `PortalAdminAuthGate` to use a full document navigation to the staff login href (escape `(admin)` layout).
- Harden `AuthProvider.logout` post-sign-out landing so leaving an authenticated session always reaches `/login` via hard navigation (avoids soft-nav race with admin/customer gates).
- Increase bottom padding/margin on the admin Show Queue content (`.portal-admin-queue` and contract assertions if present).
- Update admin Show Queue architecture/contract tests that assert AuthGate redirect behavior.

### Out of Scope

- Customer AuthGate guest-browse behavior
- Login/register UI redesign
- Production deploy (human-gated later if owner asks)
- Changing `returnTo` validation rules beyond preserving current admin targets

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/admin-show-queue/components/PortalAdminAuthGate.tsx`
- `apps/portal/features/auth/context/AuthProvider.tsx`
- `apps/portal/styles/admin-show-queue.css`
- `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts`
- Optional small unit helper if extracting hard-nav for testability (prefer inline if simpler)

### Architecture Impact

- [x] Details: Client navigation only. Prefer hard navigation when leaving authenticated admin (and after logout generally) so App Router soft navigation cannot leave a gate screen mounted. No new modules; no layer violations.

### Security Impact

- [x] Details: Redirect remains same-origin `/login` (with existing `buildPortalAuthHref` / `getSafePortalReturnTo`). No permission model change. AuthGate remains UX-only; rules/callables unchanged.

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Sign-out should reach Login. Show Queue gains modest bottom breathing room. Manual DEV check recommended for sign-out.

### Migration Impact

- [x] None

---

## Approach

1. **Admin AuthGate guest redirect:** When bootstrap is guest/unauthenticated, navigate with `window.location.replace(buildPortalAuthHref(...))` (or equivalent) instead of `router.replace`, so the document fully leaves `/admin/*`. Keep pathname-specific `returnTo` (`/admin/staff-artwork` vs `/admin/show-queue`).
2. **Logout landing:** After successful `portalAuthService.logout()`, use hard navigation to `/login` (`window.location.assign('/login')`) instead of `router.replace('/login')`. Keep error-path soft state updates unchanged.
3. **Padding:** Raise `.portal-admin-queue` bottom padding from `2rem` to about `3.5rem`–`4rem` (and mirror in desktop media query if bottom is overridden). Prefer padding on the queue section so staff artwork upload layout is untouched unless it shares the same rule intentionally — upload uses `.portal-admin-upload-card`, so queue-only change is fine.
4. **Contracts:** Update `adminShowQueue.contract.test.ts` to assert hard navigation / `location.replace` (or helper) rather than only `router.replace`.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit / contract | `npx tsx --test apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts` (and any touched auth tests) | yes |
| Typecheck | Portal `npm run typecheck` (or package script) if available | yes if configured |
| Lint | Portal lint script if quick | no if heavy |
| Build | no | no |
| Integration / E2E / rules | no | no |

### Manual

- [x] Details: On DEV Portal as owner/admin — open Show Queue → Sign out → expect Login (not permanent “Redirecting…”). Optional: Staff Artwork Upload → Sign out. Confirm Show Queue list has visible space below last card.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (sign-out + padding)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hard nav loses in-memory client state on logout | Low | Intended after sign-out; login is a clean entry |
| Full page reload feels slightly slower than soft nav | Low | Reliability over polish for auth boundary |
| Over-padding on short queues | Low | Modest bump (~3.5–4rem), not a large spacer |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the AuthGate / AuthProvider navigation changes and CSS padding. No data or Firebase rollback.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] Other: workflow plan/review/test/signoff only unless behavior note is useful in ARCHITECTURE auth section (optional one-liner)

---

## Open Questions

- [x] None

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-21-portal-admin-signout-redirect-and-queue-padding-review.md
- Verdict: pending
