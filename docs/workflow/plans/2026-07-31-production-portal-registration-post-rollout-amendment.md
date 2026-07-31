# Plan amendment: Post-rollout Portal registration FAIL (loading-state ownership)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Author | Planning Agent |
| Status | amended — loading-ownership fix **implemented on development**; await App Hosting rollout phrase |
| Workflow | managed-phase (`production-release` Goal #13) |
| Parent plan | `docs/workflow/plans/2026-07-31-production-portal-registration-stuck-plan.md` |
| Related | Incident + rollout checkpoint FAIL; Formal Review (this pass) |
| Supersedes | Assumption that Phase 1 timeout alone would clear hosted.app permanent spinner |

---

## Proven post-rollout root cause

**Selected (evidence-backed):** After Google Authentication succeeds, Auth listener resolution to
`missing-profile` / `missing-customer` **keeps `isAuthActionLoading: true`** (intentional
“keep busy until complete-profile mounts” path in `AuthProvider`). `CompleteProfileForm` treats
`isBusy = isSubmitting || isAuthActionLoading` and mounts a **viewport-fixed**
`AuthBusyOverlay` whose default message is **`Creating your customer account…`**
(`SETUP_PROGRESS_MESSAGES[0]`), even when **`completeCustomerProfile` was never entered**.

Consequences that match owner FAIL:

| Symptom | Why |
|---------|-----|
| Permanent “Setting up…” / “Creating your customer account…” | Overlay driven by sticky `isAuthActionLoading`, not provision progress |
| Expected 45s timeout never appears | Timeout lives only inside `withCompleteProfileTimeout` around `completeCustomerProfile` — never started |
| Terminal error / Retry never appear | `showTerminalFailure = Boolean(displayError) && !isBusy` |
| Escape hard | Overlay is `position: fixed; z-index` above the form; “Use a different account” sits underneath even when `disabled={false}` |
| No Firestore user/customer/username | `registerCustomer` never reached (Cloud Run: **0** invocations in post-rollout window) |
| No reproducible `accounts:lookup` 400 | Consistent with hang **before** provision; not selected as root cause |

**Deployed revision:** App Hosting still serves production merge **`8943d17`** (includes
`b882e5c`). Served layout chunk contains `console.info("[fp-portal-auth]",…)`,
`CompleteProfileTimeoutError` / `45e3` race, and `getIdToken`. **Stale prior build is ruled out.**

**Not selected without evidence:** COOP `window.closed` as root cause.

**Secondary defects (still possible if provision is later entered — must also fix):**

1. While `registrationInProgressRef` is true, Auth listener forces `bootstrapStatus:
   'loading-profile'` + `isAuthActionLoading: true` and skips `loadPortalSession`, which can
   swap the form for the early-return overlay (“This may take a moment.”).
2. `Promise.race` timeout rejects the outer await but leaves the underlying operation running;
   cleanup must reset **all** loading authorities and not rely on orphan completion.
3. After a failed/timed-out attempt, `bootstrapStatus` may remain `loading-profile` with no
   automatic session reload once the lock clears.

---

## Exact files to touch (implementation — after approval only)

| File | Change |
|------|--------|
| `apps/portal/features/auth/context/AuthProvider.tsx` | Clear `isAuthActionLoading` when bootstrap lands on expected `missing-profile` / `missing-customer` (complete-profile is the next user step, not an in-flight action). Keep busy only for intentional login/register/provision. Ensure timeout/error/`finally` clears loading + `registrationInProgressRef`. Do not leave listener stuck on `loading-profile` after provision abort. |
| `apps/portal/features/auth/components/CompleteProfileForm.tsx` | Separate **provision busy** from **bootstrap/auth action busy**. Never show provision copy overlay solely from Google sticky loading. Ensure terminal error + Retry + sign-out are visible and actionable when provision fails/times out (escape not covered by fixed overlay). |
| `apps/portal/features/auth/components/AuthBusyOverlay.tsx` and/or `globals.css` | If overlay remains during provision, include accessible escape actions **in** the overlay, **or** stop using a full-screen blocker that hides recovery controls. |
| `apps/portal/features/auth/utils/completeProfileProvisioning.ts` (+ tests) | Keep timeout helper; ensure composed tests cover ownership, not only helper unit race. |
| New/extended tests under `apps/portal/features/auth/**` | Composed regression for the exact FAIL mechanism (below). |
| Docs | Incident, plan parent checklist, ROADMAP, workflow state, handoff — after implement/test. |

**Out of scope this amendment:** Functions/Rules/Auth Console/API keys/domains/OAuth; Auth user
delete; Firestore repair; branding; Stage 2; custom domain.

---

## Correction to loading-state ownership

1. **Single provision authority:** Only an explicit in-flight `completeCustomerProfile` (or
   equivalent form `isSubmitting` tied to that call) may show the “Creating your customer
   account…” provision overlay.
2. **Google → missing-profile:** Must leave the form interactive (`isAuthActionLoading: false`
   once missing-profile/missing-customer is known), with optional short non-blocking redirect
   state — not a permanent provision spinner.
3. **Timeout coverage:** Remains around Auth user → `getIdToken(true)` → callable create/invoke
   → response → `loadPortalSession` (already correct in `b882e5c`). Confirm no pre-timeout await
   outside the race when wiring ownership fixes.
4. **On timeout/error/`finally`:** Clear `isSubmitting`, `isAuthActionLoading`,
   `registrationInProgressRef`, `submitLockRef`; restore a bootstrap status that shows the form
   (`missing-profile` / `missing-customer`) with visible error.
5. **Terminal error visibility:** Error UI must render when a terminal failure exists even if
   other bootstrap flags are noisy; never require a busy overlay to hide recovery.
6. **Retry / sign-out:** Actionable after failure; locks reset so Retry can reach
   `registerCustomer` once; no duplicate concurrent provision.
7. **Auth-only resume:** Prefer same Google account → `/complete-profile` → provision. Fresh
   Admin inventory at diagnosis time showed **no** Google Auth user (only owner password
   `7v3SLjRN…`). Do **not** delete/disable. Re-inventory before any delete approval. Owner may
   need a new Google sign-in if the prior Auth-only user is gone from Auth.

---

## Automated regression (must reproduce FAIL mechanism)

Not only `withCompleteProfileTimeout` unit tests. Add a composed test (React Testing Library /
existing Portal auth harness) that proves:

1. Simulate Google-login sticky state: `bootstrapStatus` ∈
   `{missing-profile, missing-customer}` **and** `isAuthActionLoading: true` **without**
   calling `completeCustomerProfile`.
2. Assert: provision overlay with “Creating your customer account…” is **not** mounted (or
   form remains interactive) — **this is the post-rollout FAIL**.
3. Separate case: enter provision; stall the exact await (e.g. hung `getIdToken` or hung
   callable) under test-controlled timeout (e.g. 50ms stand-in for 45s).
4. After elapsed timeout: every loading authority clears; busy overlay gone; terminal error
   visible; Retry and sign-out actionable; provisioning lock reset; Retry can invoke
   `registerCustomer` mock once; no duplicate submission.

Also keep existing helper timeout unit tests.

### Other automated gates

| Check | Required |
|-------|----------|
| Portal auth unit/composed tests | yes |
| Typecheck / lint / `build:portal` | yes |
| Functions/Rules | no (unless touched — must not be) |

---

## App Hosting rollback and rollout

| Step | Requirement |
|------|-------------|
| Implementation | Only after Formal Review **approved** + owner phrase below |
| Pre-rollout | Runtime diff limited to Portal auth + tests/docs; verify suite green |
| Promote | PR `development` → `production` if needed; then explicit |
| | `firebase apphosting:rollouts:create … --git-commit <sha> --force` |
| Automatic rollouts | Remain **disabled** |
| Rollback | Redeploy prior known-good App Hosting git commit (`8943d17` or earlier pin) via explicit rollout — do not auto-delete Auth users |
| New rollout phrase | **Do not** reuse `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT` until the **new** implementation has passed Formal + Implementation Review. Use a **new** rollout phrase after that implement pass. |

---

## Owner QA (after next App Hosting rollout of this amendment)

- [ ] Google → complete-profile form is **interactive** (no permanent provision spinner before Continue)
- [ ] Submit completes or shows terminal error ≤ ~45s with Retry + Use a different account usable
- [ ] DevTools Console: Info enabled; filter `fp-portal-auth`; record **stage names only** (+ sanitized error code if any). No tokens/emails/UIDs
- [ ] Network: confirm whether `registerCustomer` callable HTTP appears; sanitized status/duration only
- [ ] On success: `users` / `customers` / `customerUsernames` exist; portal loads as customer
- [ ] Stage 1 fixtures unchanged; branding / Stage 2 still paused until PASS
- [ ] COOP warnings alone do not fail the QA if registration succeeds

### Optional live stage capture (only if still failing)

1. DevTools → Console → enable **Info**
2. Filter `fp-portal-auth`
3. Preserve log
4. Refresh existing Auth-only complete-profile session (or Google again if Auth-only absent)
5. Submit once
6. Return stage names + sanitized error code only

---

## Human checkpoints

| Phrase | When |
|--------|------|
| `APPROVE PORTAL REGISTRATION LOADING-OWNERSHIP FIX IMPLEMENTATION` | Source fix for this amendment (next) |
| *(new)* `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: LOADING-OWNERSHIP FIX` | Only after implementation review of this amendment’s code |
| Auth orphan delete | Only if resume impossible **and** fresh inventory shows a Google Auth-only uid — separate phrase with prefix |

Stop before: runtime source changes (until implementation approval), App Hosting rollout,
Auth-user deletion, Firestore repair, Auth/API-key/domain/OAuth changes, Functions/Rules deploy.

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | None for this docs pass; later Portal app code is product surface (not FreshForge starter) |
| Development Tooling | None |
| Distribution/Installer | None |
| Documentation | Workflow plans/reviews + ROADMAP/state/handoff |
| Development History | N/A |

---

## Rollback of this docs amendment

Docs-only; revert commit. No runtime/Firebase change in the diagnosis/review pass.
