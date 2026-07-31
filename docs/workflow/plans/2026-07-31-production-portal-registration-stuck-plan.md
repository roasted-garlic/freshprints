# Plan: Production Portal registration stuck (accounts:lookup 400)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (`production-release` Goal #13) |
| Related | Incident `docs/workflow/reviews/2026-07-31-production-portal-registration-stuck-incident.md` |

---

## Goal

Restore production Portal self-registration so Google (and shared complete-profile) signup
finishes provisioning, exits **Setting up your account…**, and leaves a consistent
Auth + `users/{uid}` + `customers` + `customerUsernames` state — without hanging forever on
Identity Toolkit failures — while preserving Stage 1 fixtures and the closed Storage Class D
remediation.

---

## Background

After Stage 1 fixture completion, production hosted.app registration stuck on
`CompleteProfileForm` busy overlay. Google Auth user `uidPrefix=Pl3ODnKm…` exists; no Firestore
provisioning; `registerCustomer` Cloud Run shows **no** 2026-07-31 invocations; Network shows
`accounts:lookup` **HTTP 400**. Exact Identity Toolkit error body still needs owner capture.

Branding and Stage 2 remain paused until this blocker clears.

---

## Scope

### In Scope

1. Owner capture of sanitized `accounts:lookup` error code/message.
2. Client resilience: terminal error, timeout, usable sign-out/retry, no permanent trap.
3. Evidence-driven fix for the Identity Toolkit / Auth session failure (only after error code).
4. Safe handling of the existing **Auth-only** Google orphan (resume preferred over delete).
5. Automated + manual tests for hang prevention and successful provision.
6. Separate human checkpoints per production action type.

### Out of Scope

- Bundled brand asset implementation / Studio rebuild / Portal branding rollout
- Stage 2 smoke execution
- Stage 1 fixture changes
- Storage Rules / Class D IAM changes
- Custom domain cutover / Authorized Domain edits unless evidence later requires them
  (hosted.app is already authorized)
- Unrelated Portal features

---

## Affected Areas

### Files / Modules (expected — implement only after Formal Review + approvals)

- `apps/portal/features/auth/components/CompleteProfileForm.tsx`
- `apps/portal/features/auth/context/AuthProvider.tsx`
- `apps/portal/features/auth/services/authService.ts` / `registerCustomerService.ts` (as needed)
- Possible shared Auth error mapping helpers
- Tests under `apps/portal/features/auth/**`
- Docs: incident, DEPLOYMENT/TESTING notes if commands change

### Architecture Impact

- [x] Details: Keep service-layer callables; improve AuthProvider/CompleteProfileForm error and
  lifecycle handling. No new backend provider. Optional redirect-based Google sign-in only if
  Formal Review + evidence require replacing popup.

### Security Impact

- [x] Details: Auth session / Identity Toolkit; no secret logging; sanitized customer errors;
  production Auth/data repair are human checkpoints. Do not weaken Firestore Rules.

### Data Model Impact

- [x] Details: No schema change. May resume `registerCustomer` writes for existing Auth uid
  (already designed). Orphan deletion only with explicit approval.

### Backend Impact

- [x] Details: Prefer **no** Functions change if client Auth session is the failure. Revisit
  `registerCustomer` only if invocations begin failing after Auth works.

### UI / UX Impact

- [x] Details: Complete-profile busy overlay must show terminal failure + retry/sign-out.
  Manual QA required on hosted.app.

### Migration Impact

- [x] Forward: Resume orphan via `/complete-profile` once Auth lookup works; or approved delete.
- [x] Rollback: Redeploy prior Portal revision; do not auto-delete Auth users on rollback.

---

## Approach

### Phase 0 — Evidence gate (docs / owner; no code)

1. Owner captures sanitized `accounts:lookup` Response JSON (`error.message` / code).
2. Classify against Firebase Identity Toolkit codes (e.g. `INVALID_ID_TOKEN`, `USER_NOT_FOUND`,
   `USER_DISABLED`, …).
3. Update incident with the exact code before choosing Auth-config remediations.

### Phase 1 — Permanent-loading prevention (Portal source)

Implement regardless of exact 400 code (confirmed product defect):

1. Bound `completeCustomerProfile` / token+callable wait (e.g. Promise.race timeout).
2. On failure: clear `isSubmitting` / `isAuthActionLoading`; show visible sanitized error;
   keep **Use a different account** enabled when failed (or always enable sign-out on error).
3. Prevent duplicate concurrent `provisionCustomerProfile` submissions.
4. Ensure refresh during setup either resumes idempotently or shows a clear incomplete state
   (Auth-only → complete-profile), never an endless spinner without escape.
5. Do not log tokens.

### Phase 2 — Root technical correction (evidence-selected; separate approvals)

Only after Phase 0 error code:

| If error indicates… | Candidate remediation | Approval |
|---------------------|----------------------|----------|
| Invalid/expired ID token / client session | Client token refresh / re-auth UX; possible popup→redirect | Source + App Hosting rollout |
| API key / restriction (unexpected given current read-only) | Console API-key fix | `APPROVE PRODUCTION API KEY RESTRICTION CHANGE` |
| Domain / OAuth client gap | OAuth JS origin / Authorized Domains | Separate Auth approvals |
| Callable auth failure after lookup fixed | Functions fix | `APPROVE PRODUCTION FUNCTION DEPLOY: registerCustomer` |
| Rules deny after callable starts | Rules plan | `APPROVE PRODUCTION FIRESTORE RULES DEPLOY` |

Do **not** change Authorized Domains or API keys unless the captured error + Formal Review
require it. Current read-only checks already show hosted.app authorized and Identity Toolkit
allowed on the browser key.

### Phase 3 — Partial-account handling

Existing Google orphan `uidPrefix=Pl3ODnKm…`:

1. **Preferred:** User signs in with the same Google account → `/complete-profile` →
   `registerCustomer` (idempotent / first provision).
2. **If resume impossible:** Owner-approved Auth user delete only via
   `APPROVE PRODUCTION AUTH ORPHAN USER DELETION: Pl3ODnKm` (exact phrase; confirm full uid in
   Console privately — docs keep prefix only).
3. Never delete merely to ease testing if resume works.
4. No username reservation exists to release.

### Phase 4 — Production release

1. Merge to the branch used for Portal App Hosting.
2. `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT` for the registration fix build.
3. Owner QA on hosted.app (checklist below).
4. Only then unpause branding / Stage 2 sequencing.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Auth unit/integration tests for timeout / error UI / duplicate submit | Portal test runner for auth feature (exact script from `package.json` / `TESTING.md`) | yes |
| Typecheck / lint / build Portal | Per `docs/standards/TESTING.md` | yes |
| registerCustomer validation tests (existing) | Functions test for validation | if Functions touched |

### Manual (hosted.app)

See Owner QA checklist below.

---

## Human Checkpoints Anticipated

| Phrase | When |
|--------|------|
| (none — paste) Owner Response capture of `accounts:lookup` error | Before Auth-config remediations |
| `APPROVE PORTAL REGISTRATION LOADING-STATE FIX IMPLEMENTATION` | Phase 1 source work |
| `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT` | Deploy Portal fix |
| `APPROVE PRODUCTION AUTH ORPHAN USER DELETION: Pl3ODnKm` | Only if resume fails |
| `APPROVE PRODUCTION API KEY RESTRICTION CHANGE` | Only if evidence requires |
| `APPROVE PRODUCTION AUTHORIZED DOMAINS CHANGE` | Only if evidence requires |
| `APPROVE PRODUCTION FUNCTION DEPLOY: registerCustomer` | Only if Functions change required |
| `APPROVE BUNDLED BRAND ASSET IMPLEMENTATION` | **Still paused** until this incident clears |

---

## Risks and Rollback

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Wrong Auth-config change | Gate on captured error code | Revert Console change; document |
| Orphan deleted prematurely | Resume-first policy | N/A — prefer not to delete |
| Deploy breaks other Portal flows | Narrow auth-only diff; smoke login + catalog | Redeploy previous App Hosting revision |
| Hang fix masks real Auth error | Always surface sanitized code/message | Keep incident open until lookup 400 gone |

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | Docs under `docs/workflow/**` only for this pass |
| Development Tooling | None this pass |
| Distribution/Installer | None |
| Documentation | Incident + plan + review |
| Development History | N/A |

---

## Open questions / checkpoints

- [ ] Owner captures sanitized `accounts:lookup` error message/code
- [ ] Formal Review verdict
- [ ] `APPROVE PORTAL REGISTRATION LOADING-STATE FIX IMPLEMENTATION` before Phase 1 code
- [ ] Production rollouts only with separate phrases above
- [ ] Branding / Stage 2 remain paused until registration PASS

---

## Owner QA checklist (post-remediation)

- [ ] Google registration completes; overlay exits
- [ ] Email/password registration completes (parity on shared provisioning)
- [ ] `users/{uid}`, `customers`, `customerUsernames` exist once each
- [ ] Sign out → login works
- [ ] Forced Auth failure / timeout shows **visible** error (not infinite spinner)
- [ ] Sign-out / start-over usable after failure
- [ ] Refresh during setup does not trap without escape
- [ ] Duplicate submit does not create duplicate customers
- [ ] Stage 1 design `s9Yi7i8uq2ZddERyDuNT` and shows `kmpnyHAvKaesidMrlFkU` /
      `p8ooWvYU01wX1Nug53bp` unchanged
- [ ] No tokens in UI errors or client logs
