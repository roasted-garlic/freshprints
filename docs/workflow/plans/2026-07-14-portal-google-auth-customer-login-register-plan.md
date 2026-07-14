# Plan: Portal Google login/register (customers only)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-portal-google-auth-customer-login-register-review.md |

---

## Goal

Let Portal **customers** choose **email/password** or **Google** for login and registration. Google first-time users must set a **username** (and confirm display name) before entering the app. Studio staff login and Studio-created customer invites remain **email/password only**. Google is **customers-only**.

## Background

Portal today is email/password only (`portalAuthService` + `registerCustomer`). Google sign-in would create a Firebase Auth user without Firestore provisioning and dead-end on `missing-profile` / `missing-customer`. Owner asked for dual-method Portal auth with username completion for Google, while keeping Studio email-only.

See: `docs/architecture/FIREBASE.md` (Email/Password now; social deferred), ADR-FP-006/007/008 (Portal = customers), ADR-FP-045 (usernames).

## Scope

### In Scope

- **Portal login** (`/login`): email/password form **or** “Continue with Google”
- **Portal register** (`/register`): email/password registration **or** “Continue with Google” (then complete profile)
- **Complete profile** route (`/complete-profile`): required after Google auth when `users`/`customers` not provisioned — collect **username** (required) + **display name** (prefill from Google, editable) → call existing `registerCustomer`
- Wire `AuthGate` / auth pages so `missing-profile` and `missing-customer` (customer Google path) redirect to `/complete-profile` instead of dead-end “Account unavailable”
- Reuse `registerCustomer` (idempotent; blocks staff roles)
- Clear errors for: staff Google attempt, account-exists-with-different-credential, inactive accounts
- Docs: `FIREBASE.md`, `SECURITY.md` (or auth section), `DECISIONS.md` ADR, `BACKEND.md` as needed
- Automated tests where practical (username validation already shared; auth service error mapping)
- Manual checkpoint for Google provider (Firebase Console) + end-to-end flows

### Out of Scope

- Google login for **Studio** staff
- Google option when **Studio staff registers/invites** a customer (stay email invite + password reset)
- Apple / other social providers
- Account linking UI for existing email/password accounts that later want Google (v1: clear error → sign in with original method)
- Real-time username availability endpoint (optional follow-up; rely on `registerCustomer` errors)
- Custom claims migration
- Production Firebase Console changes by the agent (human)

---

## Product rules (locked)

| Actor / surface | Auth methods |
|-----------------|--------------|
| Portal customer self-serve | Email/password **or** Google |
| Portal after Google, no profile | Must complete username (+ display name) before app |
| Studio staff login | Email/password **only** |
| Studio create/invite customer | Email invite **only** (no Google) |
| Staff Auth user tries Google on Portal | Blocked (existing staff-role checks + messaging) |

**Invited customers** who already have `users` + `customers` and sign in with Google using the **same email**: go straight to `ready` (no username prompt). Firebase must allow Google for that email (same Auth user via email match / linking as Firebase provides). If invite created password-only Auth user, Google with same email may hit `account-exists-with-different-credential` — v1 message: use the invite/password sign-in (or reset password). Follow-up: account linking.

---

## Affected Areas

### Files / Modules (expected)

**Portal**
- `apps/portal/features/auth/services/authService.ts` — `signInWithGoogle` (popup; redirect fallback if needed)
- `apps/portal/features/auth/context/AuthProvider.tsx` / `AuthContext` / types — `loginWithGoogle`, `completeCustomerProfile`
- `apps/portal/features/auth/components/LoginForm.tsx`, `RegisterForm.tsx` — method choice UI
- New: `CompleteProfileForm.tsx`, `app/complete-profile/page.tsx`
- `apps/portal/features/auth/components/AuthGate.tsx` — redirect incomplete Google customers
- Auth CSS (`shell.css` or auth styles)
- `apps/portal/app/providers.tsx` — treat `/complete-profile` like `/login`/`/register` (outside AuthGate shell if needed)

**Shared / Functions**
- Prefer **no** `registerCustomer` contract change; optional: accept empty displayName defaulting to Auth token name (nice-to-have)
- `signupSource` remains `"portal"` for self-serve Google + email

**Studio**
- Confirm no Google UI changes (explicit non-goals)
- Optional one-line comment/docs only if helpful

**Docs**
- `docs/architecture/FIREBASE.md`, `docs/project/DECISIONS.md` (ADR), `docs/standards/SECURITY.md` as needed, ROADMAP

### Architecture Impact

- [x] Details: Portal-only OAuth entry; provisioning still via callable; Studio unchanged

### Security Impact

- [x] Details: Google provider enabled for Firebase project (human); Portal-only UI; `registerCustomer` continues to reject staff; no client writes to `users`/`customers`/`customerUsernames`

### Data Model Impact

- [x] None required — reuse `users`, `customers`, `customerUsernames`
- Optional note: `signupSource: "portal"` for Google self-serve (same as email register)

### Backend Impact

- [x] Details: Existing `registerCustomer` callable; no new secrets in client (Firebase web config already present). Human enables Google provider in console.

### UI / UX Impact

- [x] Details: Login/register method chooser; complete-profile page; AuthGate redirects. Manual UI review required.

### Migration Impact

- [x] None for existing email customers
- [ ] Forward: Enable Google in Firebase Auth console (dev, then prod with approval)
- [ ] Rollback: Disable Google provider / hide Portal Google buttons

---

## Approach

### 1. Firebase Auth (human)

1. Firebase Console → Authentication → Sign-in method → enable **Google**
2. Add authorized domains for Portal (localhost + hosting domains)
3. Confirm Studio continues to use email/password only (no Studio UI change)

### 2. Portal auth service

- Add `loginWithGoogle()` using `GoogleAuthProvider` + `signInWithPopup` (`getPortalAuth()`)
- Map Firebase errors: popup-closed, account-exists-with-different-credential, network, etc.
- Keep email `login` / `register` unchanged

### 3. AuthProvider

- `loginWithGoogle()` → after Auth, `loadPortalSession`
  - `ready` → home
  - `missing-profile` / `missing-customer` → leave signed in; UI routes to `/complete-profile`
  - `staff-account` / `inactive` → show error; sign out (or keep blocked with logout CTA)
- `completeCustomerProfile({ displayName, username })` → `registerCustomer` → `loadPortalSession` → `ready`
- Do **not** auto-logout on Google missing-profile (unlike failed email register rollback)

### 4. Complete profile page

- Public-ish route: requires Firebase Auth user; if unauthenticated → `/login`
- If already `ready` → redirect `/`
- Form: displayName (prefill `firebaseUser.displayName`), username (required, existing validation)
- Submit → `completeCustomerProfile`
- Cancel / “Use a different account” → logout → `/login`

### 5. Login / Register UI

- Shared pattern: primary email/password form; divider “or”; Google button
- Register Google path: same as login Google → if incomplete, `/complete-profile` (do not collect username before Google popup — username after Google)

### 6. AuthGate / routing

- `(app)` AuthGate: if `missing-profile` | `missing-customer` → `router.replace('/complete-profile')`
- Keep staff/inactive as unavailable (with logout link)
- `/complete-profile` outside `(app)` AuthGate, similar to login/register

### 7. Studio

- No code changes required beyond verification; document constraint in ADR

### 8. Documentation + ADR

- ADR: Portal customer Google auth; Studio email-only; username required on first Google provision
- Update FIREBASE.md Auth providers section

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit | Username util tests (existing); auth error mapping tests if added | yes where added |
| Lint | ReadLints on touched files | yes |
| Typecheck | Portal / functions as applicable | preferred |
| Functions unit | Only if `registerCustomer` changes | if changed |

### Manual

- [x] Details:
  1. Enable Google on **dev** Firebase project
  2. Portal register via Google → complete username → enter app
  3. Portal login via Google (returning) → enter app
  4. Portal email/password register + login still work
  5. Studio login: no Google control; email/password works
  6. Studio invite customer: still email-only
  7. Staff email Google on Portal: blocked message
  8. Cancel Google popup: safe, no half-broken session

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Design approval
- [x] Business logic — locked above
- [ ] Production deploy
- [ ] Database migration
- [x] Auth / external service setup — **Enable Google provider + authorized domains in Firebase Console**
- [ ] Secrets / env vars (unless new OAuth client secrets needed outside Firebase)
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Invited password user + Google same email | medium | Clear error; document; linking follow-up |
| Popup blockers | low | Message + optional redirect follow-up |
| Staff Google on Portal | low | Existing role checks + logout |
| Partial Auth without profile | medium | Complete-profile flow; do not leave dead-end AuthGate |
| Prod provider enable without approval | high | Human checkpoint; start on `fresh-prints-dev` |

---

## Rollback Plan

1. Hide Google buttons behind flag or revert Portal UI
2. Disable Google provider in Firebase Console
3. Email/password path unchanged

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [x] FIREBASE.md / BACKEND.md as needed
- [ ] DATA_MODEL.md (only if signupSource nuance needs note)
- [x] SECURITY.md (auth methods)
- [ ] TESTING.md
- [ ] DEPLOYMENT.md (authorized domains note)
- [x] DECISIONS.md (ADR)
- [x] ROADMAP.md on signoff
- [x] Other: setup note in `docs/workflow/setup/` if useful for enabling Google

---

## Open Questions

- [x] None blocking — product rules locked by owner
- Follow-up (not blocking): account linking for invite/password + Google

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-14-portal-google-auth-customer-login-register-review.md
- Verdict: pending
