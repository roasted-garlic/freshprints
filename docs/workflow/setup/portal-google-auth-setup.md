# Setup: Enable Google sign-in for Portal (Firebase Auth)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Related | ADR-FP-081, `docs/workflow/plans/2026-07-14-portal-google-auth-customer-login-register-plan.md` |

## Purpose

Enable the Google provider so Portal customers can use **Continue with Google**. Studio remains email/password only in the app UI.

## Prerequisites

- Access to the Firebase project used by Portal (`fresh-prints-dev` first; production only with separate approval)
- Portal app code with Google buttons deployed/running locally

## Steps

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. **Authentication** → **Sign-in method**.
3. Enable **Google**.
4. Choose a project support email if prompted → Save.
5. **Authentication** → **Settings** → **Authorized domains**.
6. Ensure these are listed (add if missing):
   - `localhost`
   - Portal hosting domain(s) (e.g. App Hosting / custom domain)
7. Restart or refresh the Portal app and test **Continue with Google** on `/login` and `/register`.

## Verification

1. New Google account → `/complete-profile` asks for username → enters app.
2. Returning Google customer → lands in app without username prompt.
3. Studio login page still has **no** Google button.
4. Email/password register + login still work.

## Common mistakes

- Testing Google before enabling the provider → `auth/operation-not-allowed`
- Missing authorized domain → redirect/popup failures
- Expecting Studio invite + Google same-email to auto-link → v1 shows use email/password instead

## Completion checklist

- [ ] Google enabled on **dev** project
- [ ] Authorized domains include localhost + Portal host
- [ ] Manual Portal Google flows verified
- [ ] Production enablement deferred until explicit approval
