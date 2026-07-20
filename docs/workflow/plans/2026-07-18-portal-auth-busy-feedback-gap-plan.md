# Plan: Portal auth busy feedback gaps (post-ack)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Goal | Close idle gaps during signup/signin after bidding acknowledgment and Google bootstrap |
| Mode | managed-phase (narrow follow-up to 2026-07-14 auth busy overlay) |

## Problem

Owner report: after Google signup/login (and email/password), the login/register UI can sit idle with no in-progress signal. Acknowledgment confirm can also leave a gap before Auth/provisioning finishes.

## Approach (narrow)

1. Keep `isAuthActionLoading` through profile bootstrap when an intentional auth action started; keep it through redirect to complete-profile for Google first-login.
2. Local `isSubmitting` on login/register so overlay paints on click/confirm before async Auth settles.
3. Flip submitting **before** clearing acknowledgment pending state so the form never looks idle after checkbox confirm.
4. Reuse `AuthBusyOverlay` on complete-profile; raise overlay z-index above ack modals.

## Out of scope

- Production deploy; Functions deploy; big auth refactor; new dependencies.

## Files

- `apps/portal/features/auth/context/AuthProvider.tsx`
- `apps/portal/features/auth/components/LoginForm.tsx`
- `apps/portal/features/auth/components/RegisterForm.tsx`
- `apps/portal/features/auth/components/CompleteProfileForm.tsx`
- `apps/portal/app/globals.css`
