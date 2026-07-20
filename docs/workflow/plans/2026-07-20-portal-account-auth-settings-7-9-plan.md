# Plan: Portal account auth settings (#7–#9) + Owner delete users (#10)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-20-portal-account-auth-settings-7-9-review.md |
| Roadmap | Small Managed Items #7, #8, #9, **#10** |

> **Scope expansion (2026-07-20, owner follow-up):** Include **#10 Owner delete users** in the same batch as #7–#9 so all account-management / deletion work is ready before owner QA. #12 (library design sharing) stays backlog-only — do not implement.

---

## Goal

Ship Portal customer account self-service for **password reset (#7)**, **email change (#8)**, and **account deletion request (#9)**, plus Studio **owner delete individual user (#10)** on the Test Data page, in one coherent account-management phase on `fresh-prints-dev` only. Owner QA is a single manual checkpoint covering **#7–#10** after implementation.

## Background

Small Managed Items #5–#6 are Done. Owner directed #7 → #8 → #9 in succession without optional clarifications; stop only for required human checkpoints (manual UI/auth email QA). SECURITY.md: Firebase Auth for email/password (+ Google for Portal); never trust client-only auth decisions; secrets stay server-side.

Existing surfaces: Portal login/register (`LoginForm`, `RegisterForm`, `AuthProvider`, `portalAuthService`); account page Settings currently opens **Notifications** only (`AccountNotificationsModal`). No `sendPasswordResetEmail` / `verifyBeforeUpdateEmail` usage yet. Staff `updateCustomer` can sync Auth email via Admin SDK (Studio path) — customer self-service must not reuse that staff permission path.

## Scope

### In Scope

**#7 — User reset password**
- Login: “Forgot password?” → email field → Firebase `sendPasswordResetEmail` with continue URL to Portal `/login` (same host resolution pattern as invites where applicable from the client origin).
- Signed-in account settings (password provider only): “Send password reset email” and/or change password via reauth + `updatePassword` (prefer reset-email for parity with Firebase templates; include in-app change-password when provider is `password`).
- Neutral success copy (do not reveal whether the email exists).
- Google-only accounts: no password reset UI (or short explanation).

**#8 — User change email**
- Account settings: change email for accounts that have password provider (or password + Google).
- Reauthenticate (current password) before sensitive change.
- Use Firebase `verifyBeforeUpdateEmail` so the **new** address must confirm before Auth email updates.
- After Auth email updates, sync Firestore `users/{uid}.email` and linked `customers/{id}.email` via a **customer-only callable** that trusts `request.auth.token.email` (post-verification) and enforces uniqueness — Admin SDK writes (clients cannot update those fields per rules).
- Google-only: show that Fresh Prints sign-in email is tied to Google and cannot be changed in-app; least-resistance guidance is sign out → register a new account (optional: request deletion on the old account). Do **not** present Sync email or Google-account email change as the solution.
- Pending state messaging while awaiting new-email verification.

**#9 — User request account deletion**
- Account settings: “Request account deletion” with typed confirmation (e.g. DELETE) and clear copy that this is a **request**, not immediate wipe.
- Callable creates/updates an `accountDeletionRequests/{uid}` (or equivalent) doc: `status: pending`, timestamps, email snapshot, customerId; sets a request flag on `users` and/or `customers` for UI.
- Idempotent: second request while pending returns success with existing pending state.
- **No** Auth `deleteUser` / cascade in #9 — hard delete is **#10** on Test Data.
- Optional: disable further sensitive self-service while pending (assumed: allow cancel request + still use Portal until staff acts).

**#10 — Owner delete users (Test Data page)**
- Studio Test Data Reset page only (same UI gates as operational wipe: DEV build + `fresh-prints-dev` + owner).
- **Not** bulk wipe — delete **one** selected user.
- Button opens modal: **search** + **Staff** and **Customer** tabs (Users page pattern).
- Hard delete **all associated records** for that one user: Firebase Auth, `users/{uid}`, linked `customers` (+ favorites / webPush), `customerUsernames`, print-request graph, uploads, assisted creation, notifications, Etsy requests for that uid, `accountDeletionRequests`, staff inbox acks for staff targets, related Storage prefixes.
- Destructive typed confirm: `DELETE USER`.
- Block: deleting self; deleting the last remaining owner; non-allowlisted projects.
- Owner-only (same as wipe).

### Out of Scope
- #11 OG / social meta
- #12 Library design sharing on custom design requests (backlog only — do not implement)
- Production deploy / production Auth template changes
- Soft-only deletion for #10
- Commit unless owner asks

## Product assumptions (marked — do not block)

| ID | Assumption |
|----|------------|
| A1 | One plan covers #7–#10 as related account-management work (Portal self-service + owner hard delete). |
| A2 | Password reset uses Firebase Auth email templates (not Resend custom templates) for self-service. |
| A3 | Email change uses `verifyBeforeUpdateEmail`; Firestore sync after Auth reflects new email. |
| A4 | #9 is **request-only**; #10 is the owner hard-delete fulfillment path on Test Data (dev). |
| A5 | Confirmation word for customer deletion request: `DELETE` (case-insensitive trim). |
| A6 | Account settings live on dashboard: expand Settings into modal sections (Notifications + Security / Email / Danger zone). |
| A7 | Deploy Functions to **fresh-prints-dev only**; Portal soft-reload; Studio reload for Test Data. |
| A8 | #10 confirmation phrase: `DELETE USER`. Do not delete catalog `designs` globally; remove customer-owned uploads/assisted storage and favorites; leave historical `createdBy` on unrelated staff-authored catalog docs. |
| A9 | Guest customers (no Auth) selectable on Customer tab — delete customer graph + username without Auth when no `userId`. |

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/auth/services/authService.ts` — reset / reauth / password / verifyBeforeUpdateEmail
- `apps/portal/features/auth/components/LoginForm.tsx` — forgot password UI
- `apps/portal/features/account/components/*` — account security / email / deletion UI
- `apps/portal/app/(app)/dashboard/page.tsx` — wire settings
- `apps/portal/styles/shell.css` (or account CSS) — minimal layout
- `functions/src/syncPortalAccountEmail.ts` (name TBD) — sync after verified email change
- `functions/src/requestPortalAccountDeletion.ts` (+ optional cancel)
- `functions/src/index.ts` — exports
- `packages/shared` types for request/response + deletion request shape
- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `SECURITY.md` (brief), `DECISIONS.md` ADR if needed, ROADMAP statuses

### Architecture Impact
- [x] Details: Portal UI → auth service / account services → Firebase Auth client APIs; sensitive Firestore writes via callables + Admin SDK. No direct client writes to `users.email` / deletion collections.

### Security Impact
- [x] Details: Reauth before email/password change; neutral reset messaging; customer-only callables; uniqueness checks on email sync; deletion request does not grant self-hard-delete; no production Auth/config changes.

### Data Model Impact
- [x] Details: New `accountDeletionRequests/{uid}` (pending | cancelled | fulfilled) and optional `deletionRequestedAt` / status on user or customer for Portal banner. Email fields remain on `users` / `customers` — updated only via Admin SDK after Auth verification.

### Backend Impact
- [x] Details: New callables on Functions; deploy `fresh-prints-dev` only. No new secrets. Firebase Auth templates assumed already configured for password reset / email change.

### UI / UX Impact
- [x] Details: Login forgot-password; Account Settings security sections. Manual UI + real email QA required.

### Migration Impact
- [x] None for existing docs (new collection; no backfill). Rollback: undeploy callables / hide UI; pending requests remain harmless.

## Approach

1. Extend `portalAuthService` with password reset, reauth, updatePassword, verifyBeforeUpdateEmail helpers + error mapping.
2. Add Login forgot-password panel.
3. Add Account security UI (password / email / deletion) opened from dashboard Settings (alongside or replacing single-purpose notifications-only button — keep Notifications accessible).
4. Implement `syncPortalAccountEmail` callable: `requirePortalCustomer`, read Auth user email via Admin, uniqueness check, update `users` + `customers` emails.
5. Implement `requestPortalAccountDeletion` (+ optional `cancelPortalAccountDeletionRequest`).
6. Implement `ownerDeleteUser` callable (owner + allowlisted project) with per-user cascade + Studio Test Data modal (Staff/Customer tabs, search, typed confirm).
7. Unit-test validation helpers; typecheck Portal + Studio + Functions build.
8. Deploy new Functions (+ rules if needed) to `fresh-prints-dev`.
9. Document manual test checkpoint for owner covering **#7–#10**; set human checkpoint.

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck Portal | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Unit tests | `npx tsx --test` on new validation/helpers | yes |
| Lint | `npm run lint` (scoped if full lint noisy) | yes if feasible |
| Build Portal | optional unless release | no |
| E2E / live email | owner manual | yes (human) |

### Manual
- [x] Details: Forgot password email; email change verification + profile sync; deletion request pending UI; owner delete one staff + one customer on Test Data (Auth gone, username free, associated records gone). Combined Manual Test Checkpoint #7–#10.

## Human Checkpoints Anticipated
- [x] Manual UI/UX review — required (auth emails cannot be fully automated)
- [ ] Design approval
- [ ] Business logic decision — assumptions A1–A7 used instead of blocking
- [ ] Production deploy — out of scope
- [ ] Database migration — none
- [ ] Auth / external service setup — use existing Firebase Auth templates
- [ ] Secrets / env vars — none new
- [x] Other: stop for owner PASS/FAIL on combined #7–#9 QA only

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Auth email updates but Firestore lags | medium | Callable sync on return to app / after verify; surface “refresh / confirm” CTA |
| Email enumeration via reset | low | Always show generic success |
| Customer self-deletes data | high | Request-only; no Admin deleteUser in #9 |
| Google-only confusion | low | Clear copy; hide password/email change where impossible |
| Dev Auth continue URL wrong host | medium | Use `window.location.origin` for client `actionCodeSettings` in local; deployed Portal uses production-like host |

## Rollback Plan

Revert Portal UI; redeploy prior Functions revision on `fresh-prints-dev` if needed. Pending `accountDeletionRequests` can remain unused.

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [x] DATA_MODEL.md — deletion request entity; email change sync note
- [x] BACKEND.md — new callables
- [ ] TESTING.md — only if commands change
- [ ] DEPLOYMENT.md
- [x] DECISIONS.md — short ADR for request-only deletion + email verify-before-update
- [x] ROADMAP.md — #7–#9 status
- [x] SECURITY.md — brief self-service account controls note if missing

## Open Questions
- [x] None blocking — assumptions A1–A7 apply

## Approval
- Review doc: docs/workflow/reviews/2026-07-20-portal-account-auth-settings-7-9-review.md
- Verdict: pending
