# Manual Test Checkpoint — #7–#10 Account management

**Feature / area:** Portal password reset, change email, request account deletion; Studio owner delete individual user  
**Why automated tests are insufficient:** Firebase Auth emails and destructive per-user wipe need live inbox + UI judgment  
**Environment:** `fresh-prints-dev` only (Portal + Studio DEV)  
**Prerequisites:** Soft-reload Portal; reload Studio; owner account for Test Data; a disposable password customer for email/reset tests; a disposable staff helper and/or guest/customer for delete tests (do not delete your only owner)

### Deploy status (already done)
- Functions: `syncPortalAccountEmail`, `requestPortalAccountDeletion`, `cancelPortalAccountDeletionRequest`, `ownerDeleteUser` on **fresh-prints-dev**
- Firestore rules released (includes `accountDeletionRequests` read for self/staff)

---

## Owner result

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Result | **PASS** |
| Scope | #7–#10 plus related polish: Notifications **Back to settings**; Google Change email copy without Sync (new-account least-resistance path); Delete user modal width/theme + confirm-phrase **copy** button |

---

## #7 — User reset password

### Steps
1. Portal `/login` → Sign in with email → **Forgot password?** → enter a known customer email → Send.  
   → **Expected:** Generic success (“If an account exists…”); Firebase reset email arrives; link continues to Portal `/login` after reset.
2. Signed in as password user → Account → **Settings** → **Password** → Send password reset email **or** change password with current + new.  
   → **Expected:** Reset email works; or password updates and next login uses new password.
3. Google-only account → Settings → Password.  
   → **Expected:** Message that account has no password / Google recovery — no broken form.

### Pass criteria
- [x] Forgot-password path works without revealing whether email exists
- [x] Signed-in password change or reset works for password users

---

## #8 — User change email

### Steps
1. Signed in as **password** customer → Settings → **Change email** → current password + new email → Send verification.  
   → **Expected:** Message to check new inbox; verification email arrives.
2. Confirm the Firebase link on the **new** email. Return to Portal → Settings → Change email → **Sync email from sign-in**.  
   → **Expected:** Profile email (`users` / `customers`) updates to the new address; dashboard shows new email. Sync button is present for password accounts only.
3. Google-only account → Change email.  
   → **Expected:** Honest copy that the Fresh Prints sign-in email is tied to Google and **cannot** be changed in-app; guidance to sign out and create a new account (optional mention of Request account deletion). **No** “Sync email from sign-in” button. No Google unlink flow.

### Pass criteria
- [x] Password users: verify-before-update + Sync updates Portal profile email
- [x] Google-only: no Sync; copy points to new account (least resistance), not Google account email change

---

## #9 — User request account deletion

### Steps
1. Settings → **Request account deletion** → type `DELETE` → submit.  
   → **Expected:** Success toast; banner that request is pending; can still use Portal.
2. Open Settings again → **Cancel deletion request**.  
   → **Expected:** Request cancelled; banner gone.
3. (Optional) Confirm in Firebase Console: `accountDeletionRequests/{uid}` status transitions pending → cancelled.

### Pass criteria
- [x] Request is not immediate wipe (Auth user still exists)
- [x] Cancel works

---

## #10 — Owner delete users (Test Data)

### Steps
1. Studio (DEV, `fresh-prints-dev`, owner) → **Test Data Reset** → section **Delete individual user** → **Delete user…**.  
   → **Expected:** Modal with **Staff** / **Customers** tabs and search (Users-like).
2. Customers tab → select a **disposable** customer (not yourself) → type `DELETE USER` → Delete user permanently.  
   → **Expected:** Success summary on page; customer gone from Users; Auth user gone (if had Portal); username free; associated print requests/uploads for that customer cleaned (spot-check Console).
3. Staff tab → select a disposable **helper** (not yourself, not last owner) → confirm `DELETE USER`.  
   → **Expected:** Staff user + Auth removed; cannot delete self; cannot delete last active owner (error if tried).

### Pass criteria
- [x] Modal search + tabs work
- [x] One-user hard delete works for customer and staff
- [x] Self / last-owner protections work
- [x] Bulk operational wipe still says accounts are kept (unchanged)

---

### Please reply with
- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Owner replied:** `PASS` (2026-07-20) for #7–#10 and related polish. Final Delete individual user modal polish (owner **PASS**): widened, theme-matched, confirm phrase copy button, **list-only scroll**, and visible height **5 user cards** (modal shell does not scroll).
