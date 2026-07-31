# Incident: Production Portal registration stuck on account setup

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` (Goal #13) |
| Phase | Phase G — after Stage 1 fixtures; **before** bundled brand / Stage 2 |
| Status | **CLOSED — owner QA PASS WITH NOTES**; loading-ownership live (`58aa0da`); see signoff |
| Environment | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Related Plan | `docs/workflow/plans/2026-07-31-production-portal-registration-stuck-plan.md` |
| Inventory amendment | `docs/workflow/reviews/2026-07-31-production-portal-registration-stuck-inventory-amendment.md` |

---

## Explicit non-scope (must remain true)

| Item | Status |
|------|--------|
| Stage 1B / 1C fixtures | **Remain complete** (`PASS WITH NOTES`) — not reopened |
| Class D Storage IAM | **Remains closed** — not modified |
| Branding / Stage 2 | **Paused** by this incident — not started |
| Runtime source / deploys / Auth config / data repair | **Not performed** in post-rollout diagnosis pass (prior rollout of `8943d17` preserved) |

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
| Message `Creating your customer account…` | `SETUP_PROGRESS_MESSAGES[0]` default / while submitting — **also shown when only `isAuthActionLoading` is true** |
| Async owner (intended) | `completeCustomerProfile` → `registerCustomerService.provisionCustomerProfile` → `httpsCallable('registerCustomer')` |

`isBusy = isSubmitting \|\| isAuthActionLoading`. After `b882e5c`, sign-out control is
`disabled={false}`, but the **fixed** busy overlay still covers the viewport and blocks
interaction. Timeout exists only inside `completeCustomerProfile`.

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
| HTTP status (failed request) | **400** (owner Network / console evidence) |
| Failed Response error code / message | **Not required** — 400 **non-reproducible** (owner 2026-07-31). Historical only. |

### Owner capture correction (2026-07-31)

A Response body with `kind: identitytoolkit#GetAccountInfoResponse`, Google user
`localId` prefix **`MXeK…`**, and `lastRefreshAt: 2026-07-31T20:06:27.801Z` was captured, but that
was a **successful** lookup — **not** the 400 error body. Email/provider details from that
response are **not** recorded here.

**Allowed use of that success:** proves Identity Toolkit lookup **can succeed** for at least one
Auth session. **Must not** drive Auth configuration remediation. Console still showed a separate
`accounts:lookup` HTTP 400.

### Owner capture steps (failed row only)

1. Open Chrome DevTools → **Network**.
2. Find the `accounts:lookup` request with status **400** (red).
3. Open **Response** for that row only.
4. Copy **only** `error.message` / nested error message (and numeric `error.code` if present).
5. Do **not** copy Request Payload, tokens, or a green/`GetAccountInfoResponse` body.

---

## Production partial-state inventory (read-only, sanitized)

### First diagnosis snapshot (historical)

| Store | Finding |
|-------|---------|
| Firebase Auth | Owner + Google orphan **`Pl3ODnKm…`** (created ~19:46:06Z) — Auth-only at that time |

### Amendment re-inventory (2026-07-31, after owner success-response report)

| uidPrefix | Providers | Created | Last sign-in | Disabled | `users/{uid}` | customer | username reservation |
|-----------|-----------|---------|--------------|----------|---------------|----------|----------------------|
| `L3jjfWJG…` | `google.com` | 20:10:37Z | 20:10:37Z | false | **absent** | **absent** | **absent** |
| `7v3SLjRN…` | `password` | 03:05:35Z | 14:10:50Z | false | owner | n/a | n/a |
| `Pl3ODnKm…` | — | — | — | — | **Auth user gone** | none | none |
| `MXeK…` | — | (seen in success lookup ~20:06:27Z) | — | — | **Auth user gone** | none | none |

**Collection totals:** `customers` = 0; `customerUsernames` = 0; `users` role `customer` = 0.

**Classification (current):** **Auth user only** — current Google orphan `L3jjfWJG…`. Prior
`Pl3ODnKm…` / `MXeK…` prefixes are **stale** (no longer in Auth). Multiple Google Auth-only
attempts likely; whether different Google accounts vs delete-and-retry is
`[NEEDS OWNER CONFIRMATION]`.

**`registerCustomer`:** still **not invoked** on 2026-07-31 (including ~20:06Z window).

See full amendment:
`docs/workflow/reviews/2026-07-31-production-portal-registration-stuck-inventory-amendment.md`.

### Retry risk if registration is repeated without repair

| Risk | Assessment |
|------|------------|
| email-already-in-use (email/password) | N/A for Google orphans unless same email uses password signup |
| Google sign-in again | May create **another** Auth-only uid if prior Auth users were removed |
| username-already-reserved | **No** reservation exists yet |
| duplicate customer / users | **No** Firestore rows yet |
| Orphan worsens | **Yes** — pattern already shows multiple Google Auth-only users over time |

**Do not delete** Auth users without a separate reviewed approval phrase after a **fresh**
read-only inventory (do not target vanished prefixes).

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
| 1 | Auth account creation failed before user existed | **ruled out** | Multiple Google Auth users created over time; current `L3jjfWJG…` |
| 2 | Auth user exists but `accounts:lookup` rejects its token | **still possible** | Console still shows 400; success `GetAccountInfoResponse` also observed — capture failed row only |
| 3 | Hosted Portal Firebase values from wrong project | **ruled out** | Deployed chunk = `fresh-prints-prod` |
| 4 | Auth and Firestore use different Firebase apps | **ruled out** | Single app in `client.ts` |
| 5 | Deployed API key wrong project | **ruled out** | Key prefix matches prod `apphosting.yaml` / messaging sender `473623863375` |
| 6 | API-key restrictions block Identity Toolkit | **ruled out** | `identitytoolkit` in `apiTargets`; empty referrer allowlist |
| 7 | Identity Toolkit API unavailable/disabled | **ruled out** | Successful `GetAccountInfoResponse` observed; Google users created |
| 8 | hosted.app not authorized for Auth | **ruled out** | Domain present in Authorized Domains |
| 9 | Deferred `.com` incorrectly required by code | **ruled out** for this failure | Auth uses Firebase SDK + `authDomain` firebaseapp.com; hosted.app authorized |
| 10 | Google popup/redirect fails due to COOP | **still possible** as secondary only | Popup Auth succeeded; COOP warnings common; not proven to cause lookup 400 |
| 11 | Email/password Auth OK but profile provisioning fails | **not applicable** | Attempts are Google Auth-only orphans |
| 12 | Google Auth OK but profile provisioning fails | **confirmed** | Auth-only Google users; Firestore empty; callable not invoked |
| 13 | Required callable missing | **ruled out** | `registerCustomer` ACTIVE |
| 14 | Callable deployed but misconfigured | **still possible** only after client reaches it | No invocation logs yet |
| 15 | Firestore Rules deny profile R/W | **not applicable** yet | Client never reached server transaction |
| 16 | Username reservation fails | **ruled out** for these attempts | No username docs; callable not invoked |
| 17 | Auth + partial Firestore | **ruled out** | Auth only (current + historical orphans) |
| 18 | All records exist; client fails to leave loading | **ruled out** | No Firestore customer/user |
| 19 | Setup error swallowed; no terminal UI | **still possible** / **confirmed risk** | Hang path has no timeout; busy disables logout |
| 20 | Strict Mode / listener lifecycle stale pending | **still possible** | `registrationInProgressRef` skips listener load during provision; not proven primary |
| 21 | Extension async-listener errors unrelated | **likely noise** | Wording matches extensions; not in Portal auth source |
| 22 | Repeating registration worsens orphan state | **confirmed risk** | `Pl3ODnKm…` → `MXeK…` → `L3jjfWJG…`; still zero Firestore customers |

---

## Owner QA result (post App Hosting rollout — FAIL)

Exact recorded result:

> FAIL: Google Auth succeeds, but complete-profile remains permanently stuck after the production rollout. No Firestore user/customer/username records are created, and the expected 45-second timeout/error/retry state never appears.

Preserved: Stage 1 fixtures; Class D Storage closed; PR #12 / merge `8943d17`; fix commit
`b882e5c`; completed App Hosting rollout; automatic rollouts disabled. Branding + Stage 2 +
domain cutover remain paused. Agents must not delete/disable Auth users.

Artifacts:

- Rollout checkpoint (FAIL section)
- Plan amendment:
  `docs/workflow/plans/2026-07-31-production-portal-registration-post-rollout-amendment.md`
- Formal Review:
  `docs/workflow/reviews/2026-07-31-production-portal-registration-post-rollout-amendment-review.md`

---

## Post-rollout diagnosis (2026-07-31)

### Deployed revision (read-only)

| Check | Result |
|-------|--------|
| `origin/production` tip | `8943d17` |
| `b882e5c` ancestor of production | **yes** |
| App Hosting backend updated | 2026-07-31 15:36:10 (prior rollout; no new rollout this pass) |
| Served JS markers | `[fp-portal-auth]`, `CompleteProfileTimeoutError`, timeout `45e3`, `getIdToken`, complete-profile overlay copy |
| Stale prior build | **ruled out** for marker presence |

### Loading authorities that can keep `AuthBusyOverlay` visible

| Authority | Source | Clears when |
|-----------|--------|-------------|
| `isSubmitting` | `CompleteProfileForm` local state | Form catch/finally after `completeCustomerProfile` settles |
| `isAuthActionLoading` | `AuthProvider` | Login/register/provision catch paths; logout; unauthenticated |
| Early return `bootstrapStatus === 'loading-profile'` + busy | Form + Auth listener | Only when status leaves `loading-profile` and `!isBusy` |

`isBusy = isSubmitting || isAuthActionLoading`. Terminal error:
`showTerminalFailure = Boolean(displayError) && !isBusy`. Overlay CSS:
`.portal-auth-processing-overlay` is **position: fixed** full viewport above modals — blocks
clicks on controls underneath.

### Timeout boundary (`completeCustomerProfile`)

`withCompleteProfileTimeout` races the full async IIFE: Auth user → `getIdToken(true)` →
callable ref → `registerCustomer` → `loadPortalSession`. Constant `45e3` present in served
bundle. **Does not** start until `completeCustomerProfile` is entered.

### Did timeout fire? Was terminal error hidden?

| Question | Verdict |
|----------|---------|
| Timeout fired in owner attempt | **Not observed**; stage capture incomplete. **Strong source explanation:** sticky Google `isAuthActionLoading` shows provision overlay **without** entering the helper — timeout never starts |
| Terminal error created but hidden | **Design-confirmed risk** whenever `isBusy` stays true; sticky loading alone never sets an error |

### `registerCustomer` invoked?

| Source | Result |
|--------|--------|
| Cloud Run `registercustomer` logs (from ~18:00Z diagnosis window) | **0** entries |
| Firestore customers / usernames / customer users | still **0** |

**Interpretation:** callable **was not invoked** (or never reached Cloud Run) on post-rollout
attempts sampled — consistent with hang/overlay before provision.

### Auth-only inventory (read-only, diagnosis time)

| uidPrefix | Providers | Disabled | `users/{uid}` | customer | username |
|-----------|-----------|----------|---------------|----------|----------|
| `7v3SLjRN…` | `password` | false | owner | n/a | n/a |

**Auth total: 1.** No Google Auth-only user present at diagnosis time (agents did not delete).
Owner reported a Google Auth user during FAIL — treat as time-sensitive / Console observation
gap; **re-inventory before any delete**. Prefer resume when a Google Auth-only uid reappears.

### Stage logs

`console.info('[fp-portal-auth]', …)` **is** in the production bundle. Last stage during FAIL
**not captured**. If Info level is disabled in DevTools, stages are hidden. Optional owner
capture (Info on, filter `fp-portal-auth`) only if still needed after ownership fix.

### Network (post-rollout FAIL — from owner + server)

| Request | Finding |
|---------|---------|
| Secure Token refresh | Not proven pending from this pass |
| `accounts:lookup` 400 | Owner: **not reproducible** |
| `registerCustomer` HTTP | No Cloud Run evidence of invocation |
| Firestore profile writes | None (no docs) |
| COOP `window.closed` | Present; **not** root cause without direct evidence |

---

## Hypothesis matrix (post-rollout)

| # | Hypothesis | Verdict | Evidence |
|---|------------|---------|----------|
| 1 | New build not served | **ruled out** | `8943d17` / markers / `45e3` in layout chunk |
| 2 | Browser/App Hosting cache serves stale JS | **ruled out** for marker presence | Live chunk contains fix strings |
| 3 | New helper never entered | **still possible** / **primary mechanism** | Sticky `isAuthActionLoading` overlay without `completeCustomerProfile`; 0 callable logs |
| 4 | Info-level stage logs merely hidden | **still possible** | `console.info` in bundle; DevTools Info may be off |
| 5 | `getIdToken(true)` never settles | **still possible** if helper entered | Would be covered by 45s race if entered |
| 6 | Timeout excludes Auth-token wait | **ruled out** | Race wraps full IIFE including `getIdToken` |
| 7 | Timeout fires but `isAuthActionLoading` keeps overlay | **still possible** as secondary | Source allows sticky/listener re-busy; not proven fired |
| 8 | Timeout fires but terminal error hidden behind `isBusy` | **still possible** as secondary | `showTerminalFailure` requires `!isBusy` |
| 9 | `registrationInProgressRef` remains locked | **still possible** if provision entered and never `finally` | Not needed for sticky Google path |
| 10 | `submitLockRef` remains locked | **still possible** if form await never settles | Cleared in `finally` when `runCompleteProfile` returns |
| 11 | Auth listener suppression blocks recovery | **still possible** during provision | Listener skips `loadPortalSession` while ref true |
| 12 | `registerCustomer` request never sent | **confirmed** for sampled window | 0 Cloud Run entries; no Firestore rows |
| 13 | `registerCustomer` sent but rejected | **ruled out** for sampled window | No invocation logs |
| 14 | Callable region/config mismatch | **still possible** only after client sends | Not reached yet |
| 15 | Firestore Rules deny post-call session reads | **not applicable** yet | No callable |
| 16 | Callable succeeds but `loadPortalSession` hangs | **ruled out** for these attempts | No docs created; no callable |
| 17 | COOP warnings unrelated popup noise | **still possible** | Auth succeeded; no proof COOP blocks provision |
| 18 | Auth-only user can safely resume after remediation | **still possible** if Google Auth-only reappears | Diagnosis inventory: Google Auth-only **absent**; resume preferred when present |

---

## Root cause (current — post-rollout)

**Selected:** Google Auth succeeds and lands on `/complete-profile` with
`isAuthActionLoading` held **true** for `missing-profile` / `missing-customer`. The form mounts
a fixed provision overlay using default copy **Creating your customer account…** without
entering `completeCustomerProfile`, so the 45s timeout / terminal error / Retry path never
runs, and recovery controls under the overlay are not usable. `registerCustomer` is never
invoked.

**Prior Phase 1 (`b882e5c`) remains valuable** for when provision is entered, but **did not
address sticky Google loading ownership** — hence owner QA FAIL after rollout.

**Historical / non-selected:** `accounts:lookup` 400; COOP as root cause.

---

## Actions explicitly not taken (post-rollout diagnosis pass)

- No runtime source changes
- No App Hosting / Functions / Rules deploy
- No Auth user delete/disable
- No Firestore create/delete
- No Authorized Domains / OAuth / API-key / Identity Toolkit config changes
- No branding or Stage 2 work
- No fixture changes
- No secret access
