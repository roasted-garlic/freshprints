# Manual Test Checkpoint — Portal Google auth

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Goal | `portal-google-auth-customer-login-register` |
| Reason | Firebase Console provider enablement + UI/auth flows |
| Status | **complete** |
| Result | **PASS** (owner, 2026-07-14) |

---

## Human setup (required before Google PASS)

Follow `docs/workflow/setup/portal-google-auth-setup.md` on **dev** (`fresh-prints-dev`):

1. Enable **Google** under Authentication → Sign-in method
2. Confirm authorized domains include `localhost` (+ Portal host if testing deployed)

Reply `GOOGLE_ENABLED` when done (or `GOOGLE_ENABLED: [notes]`).

**Result:** Google enabled on dev for testing (implied by successful manual PASS).

---

## Manual Test Checkpoint

**Feature / area:** Portal Google login/register + username completion  
**Why automated tests are insufficient:** OAuth + Firebase Console + browser popup  
**Environment:** local Portal against Firebase with Google enabled  
**Prerequisites:** Google provider enabled; test Google account

### Steps

1. `/login` → **Expected:** email/password form + **Continue with Google**
2. `/register` → **Expected:** email form + Google; hint about username after Google
3. New Google account → **Expected:** `/complete-profile`; set username (+ display name); enter app
4. Sign out; Google again → **Expected:** enter app (no username prompt)
5. Email/password register + login → **Expected:** still work
6. Studio login → **Expected:** **no** Google button; email/password works
7. Cancel Google popup → **Expected:** safe cancel message; no broken session
8. (If available) staff email via Google on Portal → **Expected:** blocked / unavailable + sign out

### Pass criteria

- [x] Google provider enabled on dev
- [x] Dual-method login/register UI works
- [x] First Google login requires username before portal access
- [x] Returning Google login skips complete-profile
- [x] Email/password unchanged
- [x] Studio remains email-only
- [x] Cancel popup safe
- [x] Complete-profile processing overlay / busy lock (owner polish request)

### Please reply with

- `GOOGLE_ENABLED` — provider ready (then continue testing)
- `PASS` — all criteria met
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

### Owner result

**PASS** (2026-07-14) — “PASSED with flying colors,” including complete-profile spinner overlay.
