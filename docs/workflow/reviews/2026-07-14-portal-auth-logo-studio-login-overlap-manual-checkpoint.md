# Manual Test Checkpoint — Portal auth logos + Studio login overlap

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Goal | `portal-auth-logo-studio-login-overlap` |
| Status | **pending** |
| Notes | Condensed auth: removed eyebrow/lead; Google-first; email form behind toggle |

---

## Manual Test Checkpoint

**Feature / area:** Studio login layout; Portal login/register branding + condensed register/login  
**Why automated tests are insufficient:** Visual overlap / logo placement / vertical density  
**Environment:** local Studio + Portal  
**Prerequisites:** both apps running

### Steps

1. Studio login → **Expected:** logo stays centered; sun/moon toggle does **not** overlap the logo
2. Portal `/register` → **Expected:** short page (logo + Create account + Google + “Sign up with email”); no “Fresh Prints Request Portal” text; expanding email reveals the full form
3. Portal `/login` → **Expected:** same Google-first + “Sign in with email” pattern; logo present
4. (Optional) Portal `/complete-profile` → **Expected:** logo, no long eyebrow

### Pass criteria

- [ ] Studio: no theme-toggle / logo overlap; logo still centered
- [ ] Portal login + register show the brand logo
- [ ] Register/login stay condensed until email path is opened

### Please reply with

- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
