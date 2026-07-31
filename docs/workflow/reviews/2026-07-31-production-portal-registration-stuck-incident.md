# Incident: Production Portal registration stuck on account setup

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` (Goal #13) |
| Phase | Phase G — after Stage 1 fixtures; **before** bundled brand / Stage 2 |
| Status | **Diagnosed (docs only)** — remediation Plan + Formal Review required; no implement |
| Environment | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Related Plan | `docs/workflow/plans/2026-07-31-production-portal-registration-stuck-plan.md` |

---

## Explicit non-scope (must remain true)

| Item | Status |
|------|--------|
| Stage 1B / 1C fixtures | **Remain complete** (`PASS WITH NOTES`) — not reopened |
| Class D Storage IAM | **Remains closed** — not modified |
| Branding / Stage 2 | **Paused** by this incident — not started |
| Runtime source / deploys / Auth config / data repair | **Not performed** in this pass |

---

## Reproduction summary (owner-reported)

1. Customer attempts Portal account registration on production hosted.app.
2. UI becomes permanently stuck on **Setting up your account…** with progress
   **Creating your customer account…**
3. Browser Network shows repeated
   `POST https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=…` → **HTTP 400**.
4. Console also shows COOP `window.closed` warnings and asynchronous-listener channel
   warnings (treated as secondary unless proven otherwise).
5. Setup screen never exits; no successful portal session.

Screenshots summarized without tokens: account-setup busy overlay with the strings above;
Network 400 on `accounts:lookup`.

---

## Registration path (repository-traced)

### Routes

| Route | File |
|-------|------|
| `/register` | `apps/portal/app/register/page.tsx` → `RegisterForm` |
| `/complete-profile` | `apps/portal/app/complete-profile/page.tsx` → `CompleteProfileForm` |
| `/login` | `LoginForm` (redirects incomplete profiles to `/complete-profile`) |

### Auth stack (single Firebase app)

`apps/portal/lib/firebase/client.ts` — one `initializeApp(getPortalFirebaseConfig())`;
Auth / Firestore / Functions / Storage all share that app.

### Email/password signup

`RegisterForm` → bidding ack → `AuthProvider.register` →
`portalAuthService.register` (`createUserWithEmailAndPassword`) →
`registerCustomerService.provisionCustomerProfile` (`registerCustomer` callable) →
`loadPortalSession`. On failure: best-effort `logout` and clear session.

Busy overlay title on register page: **Signing you up…** (not the stuck strings).

### Google signup (matches stuck UI)

`RegisterForm` / `LoginForm` → `loginWithGoogle` → `signInWithPopup(GoogleAuthProvider)` →
Auth listener → `loadPortalSession` → missing `users/{uid}` throws
“No Fresh Prints user profile…” → `bootstrapStatus: missing-profile` → redirect
`/complete-profile`.

`CompleteProfileForm` (display name + username + bidding ack) →
`completeCustomerProfile` → `registerCustomer` callable → `loadPortalSession` →
`router.replace(returnTo)`.

### Stuck UI owners (exact)

| UI string | Owner |
|-----------|--------|
| Title `Setting up your account…` | `CompleteProfileForm` → `AuthBusyOverlay` |
| Message `Creating your customer account…` | `SETUP_PROGRESS_MESSAGES[0]` while `isSubmitting` |
| Async owner | `completeCustomerProfile` → `registerCustomerService.provisionCustomerProfile` → `httpsCallable('registerCustomer')` (requires Auth ID token) |

`isBusy = isSubmitting \|\| isAuthActionLoading`. While busy, **Use a different account**
(`logout`) is **disabled**. No client timeout around provisioning.

### Callable / data writes (server)

`functions/src/registerCustomer.ts` (deployed ACTIVE on prod): in a transaction creates/merges
`users/{uid}` (role `customer`), `customers/{id}`, `customerUsernames/{username}`.
Idempotent return when already provisioned.

---

## Registration method

**Google popup registration → `/complete-profile` provisioning** — evidence-backed:

- Stuck copy exists only on `CompleteProfileForm`, not email `RegisterForm` overlay.
- Production Auth inventory: orphan user with provider **`google.com` only**, created
  `2026-07-31T19:46:06Z` (UTC), no Firestore profile.

Email/password path **not** indicated for this attempt.
`[NEEDS OWNER CONFIRMATION]` only if owner asserts a different method was used despite the above.

---

## Identity Toolkit `accounts:lookup` error

| Item | Value |
|------|-------|
| HTTP status | **400** (owner Network evidence) |
| Error code / message | **`[NEEDS OWNER RESPONSE CAPTURE]`** |

Probe without a token (agent, empty body) returns `MISSING_ID_TOKEN` — proves the API key can
reach Identity Toolkit, **not** the live session failure mode.

### Owner capture steps (beginner-friendly)

1. Open Chrome DevTools → **Network**.
2. Reproduce or refresh while stuck (or use the existing failed request).
3. Click the failed **`accounts:lookup`** request.
4. Open **Response**.
5. Copy **only** the JSON `error.code` / `error.message` (and nested `errors[].message` if present).
6. Do **not** copy Request Payload, Authorization, cookies, or tokens.

---

## Production partial-state inventory (read-only, sanitized)

| Store | Finding |
|-------|---------|
| Firebase Auth | **2** users: owner (`password`, has `users/{uid}` role `owner`); **1 Google orphan** `uidPrefix=Pl3ODnKm…` created 19:46:06Z, `emailVerified=true`, `disabled=false`, providers=`google.com` |
| `users/{uid}` for orphan | **Absent** |
| `customers` | **0** documents |
| `customerUsernames` | **0** documents |
| Notifications / other bootstrap | No customer provisioning records found |

**Classification: Auth user only** (Google signup succeeded; Firestore provisioning did not).

### Retry risk if registration is repeated without repair

| Risk | Assessment |
|------|------------|
| email-already-in-use (email/password) | N/A for this Google orphan unless same email uses password signup |
| Google sign-in again | Same Auth uid likely resumes to `/complete-profile` |
| username-already-reserved | **No** reservation exists yet |
| duplicate customer / users | **No** Firestore rows yet |
| Orphan worsens | Possible if more Auth users are created without completing profile |

**Do not delete** the Auth user without a separate reviewed approval phrase.

---

## Hosted Portal Firebase configuration (read-only)

| Check | Result |
|-------|--------|
| Deployed JS (`6833-*.js` chunk) | `projectId=fresh-prints-prod`; API key prefix `AIzaSyBE9IAF…` matches `apphosting.yaml`; appId suffix `…85ca3a` |
| Wrong project (`fresh-prints-dev`) | **Not** found in sampled deployed chunks |
| Single Firebase app | Confirmed in `client.ts` |
| `apphosting.yaml` | Prod values; `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com` (canonical origin for meta; Auth action codes use `window.location.origin`) |

---

## Authorized Domains (read-only; unchanged)

Present on `fresh-prints-prod`:

- `localhost`
- `fresh-prints-prod.firebaseapp.com`
- `fresh-prints-prod.web.app`
- `myprintrequest.com`
- `www.myprintrequest.com`
- **`fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`**

Hosted.app Auth domain **is** authorized. Deferred `.com` presence does **not** explain
hosted.app failure. **No domain changes made.**

---

## API key / Identity Toolkit (read-only)

| Check | Result |
|-------|--------|
| Browser API key | Firebase auto “Browser key”; `apiTargets` **includes** `identitytoolkit.googleapis.com` and `securetoken.googleapis.com` |
| Browser referrer list | `browserKeyRestrictions: {}` (no allowlist entries — unrestricted referrers) |
| Google IdP | `defaultSupportedIdpConfigs/google.com` **enabled** (client id prefix only recorded) |
| Email/password | Enabled in Identity Toolkit config |

Identity Toolkit is not disabled; Google provider is enabled (consistent with Auth user creation).

---

## Logs (sanitized)

| Source | Finding |
|--------|---------|
| `registerCustomer` Cloud Run | **ACTIVE**; timeout 60s; **no request/invocation logs on 2026-07-31** (only 2026-07-30 deploy/startup) |
| Incident window ~19:46Z | Portal App Hosting info log at 19:46:07Z; **no** callable evidence |
| Auth audit / Identity Toolkit admin logs | No useful entries retrieved in window |

**Interpretation:** `registerCustomer` was **never successfully invoked** (or never reached the
function) during the stuck attempt. Failure is **client-side Auth token / Identity Toolkit
lookup** before provisioning, not a Firestore Rules deny inside the callable and not a
server-side username collision.

---

## Secondary console messages

### COOP `window.closed`

| Classification | **Still possible as noise; not primary root cause** |
|----------------|------------------------------------------------------|
| Source | Typical of Firebase **`signInWithPopup`** polling after Google popup |
| Evidence | Google Auth user **was created** — popup Auth succeeded |
| Repo | `portalAuthService.loginWithGoogle` uses `signInWithPopup` only (no redirect path) |

### Asynchronous listener / message channel

| Classification | **Likely unrelated browser-extension noise** |
|----------------|-----------------------------------------------|
| Portal code | No `chrome.runtime` / extension messaging in Portal auth path `[NEEDS REPO CHECK: full-repo extension APIs]` — auth path has none |
| Firebase | Not the usual wording for Identity Toolkit failures |
| Recommend | Retest in Incognito with extensions disabled after remediation |

---

## Permanent-loading resilience (product defect)

**Confirmed defect (independent of backend root cause):**

- Busy overlay can remain while `completeCustomerProfile` awaits Auth token + callable.
- No bounded timeout.
- Escape control **Use a different account** is disabled while `isBusy`.
- Catch paths clear busy **only if** the Promise rejects; a non-settling Auth SDK wait leaves
  the customer trapped.
- Errors that do reject show `portal-form-error` only when `!isBusy`.

Remediation must include terminal error UX, timeout, and usable sign-out/retry — see Plan.

---

## Hypothesis matrix

| # | Hypothesis | Verdict | Evidence |
|---|------------|---------|----------|
| 1 | Auth account creation failed before user existed | **ruled out** | Google Auth user exists (`Pl3ODnKm…`) |
| 2 | Auth user exists but `accounts:lookup` rejects its token | **still possible** | 400 observed; exact code `[NEEDS OWNER RESPONSE CAPTURE]`; callable never hit |
| 3 | Hosted Portal Firebase values from wrong project | **ruled out** | Deployed chunk = `fresh-prints-prod` |
| 4 | Auth and Firestore use different Firebase apps | **ruled out** | Single app in `client.ts` |
| 5 | Deployed API key wrong project | **ruled out** | Key prefix matches prod `apphosting.yaml` / messaging sender `473623863375` |
| 6 | API-key restrictions block Identity Toolkit | **ruled out** | `identitytoolkit` in `apiTargets`; empty referrer allowlist |
| 7 | Identity Toolkit API unavailable/disabled | **ruled out** | API responds; Google user created; empty lookup returns structured 400 |
| 8 | hosted.app not authorized for Auth | **ruled out** | Domain present in Authorized Domains |
| 9 | Deferred `.com` incorrectly required by code | **ruled out** for this failure | Auth uses Firebase SDK + `authDomain` firebaseapp.com; hosted.app authorized |
| 10 | Google popup/redirect fails due to COOP | **still possible** as secondary only | Popup Auth succeeded; COOP warnings common; not proven to cause lookup 400 |
| 11 | Email/password Auth OK but profile provisioning fails | **not applicable** | Attempt is Google Auth-only orphan |
| 12 | Google Auth OK but profile provisioning fails | **confirmed** (provisioning never completed) | Auth yes; Firestore no; callable not invoked |
| 13 | Required callable missing | **ruled out** | `registerCustomer` ACTIVE |
| 14 | Callable deployed but misconfigured | **still possible** only after client reaches it | No invocation logs yet |
| 15 | Firestore Rules deny profile R/W | **not applicable** yet | Client never reached server transaction; Rules not exercised by this attempt |
| 16 | Username reservation fails | **ruled out** for this attempt | No username docs; callable not invoked |
| 17 | Auth + partial Firestore | **ruled out** | Auth only |
| 18 | All records exist; client fails to leave loading | **ruled out** | No Firestore customer/user |
| 19 | Setup error swallowed; no terminal UI | **still possible** / **confirmed risk** | Hang path has no timeout; busy disables logout |
| 20 | Strict Mode / listener lifecycle stale pending | **still possible** | `registrationInProgressRef` skips listener load during provision; not proven primary |
| 21 | Extension async-listener errors unrelated | **still possible** → treat as **likely noise** | Wording matches extensions; not in Portal auth source |
| 22 | Repeating registration worsens orphan state | **still possible** | Additional Auth-only users if new Google accounts used; same uid may resume |

---

## Root cause (current)

**Evidence-backed mechanism:**

1. **Primary:** After Google sign-in, `/complete-profile` provisioning cannot obtain a usable Auth
   session for `registerCustomer` — manifested as Identity Toolkit **`accounts:lookup` HTTP 400**.
   Exact Firebase error string is still **`[NEEDS OWNER RESPONSE CAPTURE]`**.
2. **Confirmed consequence:** `registerCustomer` never ran; state = **Auth user only**.
3. **Confirmed product defect:** Permanent busy overlay with no timeout and disabled escape while
   busy.

**Not the root cause (this pass):** Storage Class D, Stage 1 fixtures, missing Authorized Domain
for hosted.app, wrong Firebase project in the deployed Portal bundle, missing `registerCustomer`
deploy, username collision.

---

## Actions explicitly not taken

- No Auth user delete/disable
- No Firestore create/delete
- No Authorized Domains / OAuth / API-key / Identity Toolkit config changes
- No Rules / Functions / App Hosting / env changes
- No source changes
- No branding or Stage 2 work
- No fixture changes
- No secret access
