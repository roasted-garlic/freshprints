# Human Checkpoint: Invite Password Continue URL (No Localhost)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Workflow | Managed phase — invite-password-continue-url-localhost |
| Reason | Functions deploy required for live invite links; Auth continue host must be verified manually. |
| Status | **pending** |
| Resolution | pending |

---

## What We Need From You

1. Reply **`APPROVE DEV DEPLOY`** (or decline) for the Functions deploy below.
2. After deploy, run the manual invite QA and reply `PASS` / `FAIL: …` / `PASS WITH NOTES: …`.

---

## Context

Portal customer invite emails embed a Firebase password create/reset link whose **continue URL** was built from `PORTAL_BASE_URL` defaulting to `http://localhost:3000` (also present in local `.env.fresh-prints-dev`). That sent users to localhost after setting a password (including invite flows used alongside Google sign-in).

Code now uses the same project map as proof emails:

- `fresh-prints-dev` → `https://myprintrequest.dev/login`
- `fresh-prints-prod` → `https://myprintrequest.com/login`

Localhost override only when `FUNCTIONS_EMULATOR=true`.

**Already-sent invite emails are not fixed** — create a new invite after deploy.

---

## Decision Required

**Question:** Approve selective Functions deploy to **fresh-prints-dev**?

**Deploy command (exact):**

```bash
firebase deploy --only functions:createCustomerWithPortalInvite --project fresh-prints-dev
```

**Rules / Storage:** No change — do not deploy rules for this fix.

**Production:** Do not deploy.

**Your decision:** _pending_ (reply `APPROVE DEV DEPLOY` to authorize agent or run yourself)

---

## Firebase Console checklist (human)

Confirm on **fresh-prints-dev**:

1. Authentication → Settings → **Authorized domains** includes `myprintrequest.dev` (and `localhost` only for local Portal).
2. Optional: Authentication → Templates — no need to change custom action URL for this fix; continue URL is set per link by the callable.

No new secrets. Do not paste secret values into chat.

---

## Manual Test Checkpoint

**Feature / area:** Portal invite → create/reset password → continue redirect host

**Why automated tests are insufficient:** Firebase Auth action handler + real invite email / reset link require deployed Functions and a real Auth user.

**Environment:** fresh-prints-dev (Portal at `https://myprintrequest.dev`)

**Prerequisites:**
- Deploy above completed on fresh-prints-dev.
- Studio can call `createCustomerWithPortalInvite` against fresh-prints-dev.
- Access to a test inbox you control.
- Do not use production.

### Steps

1. From Studio, create a **new** customer with Portal invite to your test email.  
   → **Expected:** Invitation email arrives with a password set/reset link.
2. Open the reset link (Firebase Auth action page). Before or after submitting a new password, inspect the continue / success destination (URL bar or “Continue” target).  
   → **Expected:** Host is `myprintrequest.dev` (path `/login`), **not** `localhost` or `127.0.0.1`.
3. Complete password set and continue.  
   → **Expected:** You land on Portal login on `https://myprintrequest.dev` (or already-authenticated Portal on that host).
4. Optional (Google path): With the same invited email, use Google sign-in on Portal if applicable for your test account.  
   → **Expected:** You remain on `myprintrequest.dev`; no redirect to localhost.
5. Optional: Decode or inspect the `continueUrl` / `continueUrl` query on the oob link.  
   → **Expected:** Starts with `https://myprintrequest.dev/login`.

### Pass criteria

- [ ] New invite’s password action continue host is `myprintrequest.dev` (not localhost)
- [ ] Successful continue opens Portal on the correct host
- [ ] Authorized domains checklist confirmed (or already known good)

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** _pending_

---

## Impact If Delayed

Live Portal invites on fresh-prints-dev keep sending localhost continue URLs until this function is deployed.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint documentation, answer clarifying questions

**Forbidden:** Deploy without `APPROVE DEV DEPLOY`; production deploy; migrate; change secrets; push; commit unless asked; expand scope

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| | | | |

---

## Resume Checklist

- [ ] Deploy approval recorded (if agent should deploy) or owner confirms self-deploy
- [ ] Manual QA result recorded in Decision Log
- [ ] `Human Checkpoint Required` set appropriately
- [ ] Signoff when PASS (or PASS WITH NOTES) and automated gates satisfied
