# Plan: Invite / Password-Reset Continue URL — Stop Localhost Redirects

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-invite-password-continue-url-localhost-review.md |

---

## Goal

Ensure Firebase Auth password create/reset links generated for **Portal customer invites** (and any related continue URLs) land on the correct environment Portal host — `https://myprintrequest.dev` (fresh-prints-dev) or `https://myprintrequest.com` (prod) — never `localhost`, except when the Functions emulator explicitly opts into a local override.

## Background

Owner reported: after the Google-login invite flow to create/reset password, the Auth action “continue” redirect still goes to **localhost**.

Recent phase `assisted-history-auth-redirect-studio-parity` fixed **in-app** post-sign-in `returnTo` for Portal. That does **not** cover Firebase `generatePasswordResetLink` `actionCodeSettings.url` (continue URL) embedded in invite emails.

Inspection found:

- `createCustomerWithPortalInvite` builds continue URL from `portalBaseUrl` (`defineString("PORTAL_BASE_URL", { default: "http://localhost:3000" })`).
- `functions/.env.fresh-prints-dev` sets `PORTAL_BASE_URL=http://localhost:3000`, which Firebase loads on deploy to that project — baking localhost into the live invite continue URL.
- Proof-ready email CTAs already use fail-closed `resolvePortalBaseUrl` project map; invites do not.

## Scope

### In Scope

- Align Portal invite password-reset continue URL with `resolvePortalBaseUrl` project map.
- Remove or stop using deployed `PORTAL_BASE_URL` param for invite continue URLs; keep localhost override emulator-gated only.
- Fix Functions env example / local `.env.fresh-prints-dev` so deploy does not set localhost for Portal.
- Document env / Firebase Console checks and exact fresh-prints-dev deploy command (no deploy without `APPROVE DEV DEPLOY`).
- Unit coverage for login continue URL resolution; manual QA for invite → set password → continue host.
- Update workflow state / Decision Log; add manual QA checkpoint.

### Out of Scope

- Production deploy.
- Changing Google OAuth client config.
- Account linking (invite password + Google).
- Reworking Studio team invite continue URL (Electron; no Portal host) beyond noting Firebase Console defaults if relevant.
- Committing or pushing unless asked.
- Closing prior `assisted-history-auth-redirect-studio-parity` manual QA (parked; remains open).

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/createCustomerWithPortalInvite.ts`
- `functions/src/lib/email/portalUrlResolver.ts` (add login continue helper or equivalent)
- `functions/src/lib/email/email.test.ts`
- `functions/src/lib/secrets.ts` (remove unused `portalBaseUrl` if no longer referenced)
- `functions/.env.example`
- `functions/.env.fresh-prints-dev` (local; remove localhost Portal deploy param)
- `docs/architecture/BACKEND.md`
- `docs/workflow/setup/resend-email-setup.md` (invite continue URL note)
- Workflow plan/review/test/manual-qa + `.cursor/workflow/state.md`

### Architecture Impact

- [x] Details: Reuse existing email portal URL resolver; no new layers.

### Security Impact

- [x] Details: Continue URL must remain allowlisted domain (Firebase Auth authorized domains). Fail closed on unknown project. Emulator-only localhost override unchanged.

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: `createCustomerWithPortalInvite` continue URL source changes. **Functions deploy required** for live invites on fresh-prints-dev after code lands. No rules change.

### UI / UX Impact

- [x] Details: Customer-facing Auth action “continue” after password set lands on correct Portal `/login`. Manual QA required.

### Migration Impact

- [x] None for data. **Already-sent invite emails** keep old continue URLs; re-invite or new password-reset generation required to verify.

---

## Approach

1. Add `resolvePortalLoginContinueUrl()` (or equivalent) using the same project map + emulator override as `resolveProofReviewUrl`.
2. Update `generateCustomerPasswordResetLink` in `createCustomerWithPortalInvite` to use that helper instead of `portalBaseUrl.value()`.
3. Remove `portalBaseUrl` `defineString` from `secrets.ts` if unused.
4. Update `.env.example`: document that `PORTAL_BASE_URL` is **emulator-only**, not a deploy param for invites; remove misleading localhost deploy guidance.
5. Remove `PORTAL_BASE_URL=...` from local `.env.fresh-prints-dev` so future deploys do not re-bake localhost (if file present).
6. Document: Firebase Console → Authentication → Authorized domains must include `myprintrequest.dev` / `myprintrequest.com`; action continue URL is set per link by Functions, not Portal `NEXT_PUBLIC_*`.
7. Tests + manual QA checkpoint; **do not deploy** until owner says `APPROVE DEV DEPLOY`.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `cd functions && npm test -- --test-name-pattern="portal URL"` (or full email tests) | yes |
| Functions build | `cd functions && npm run build` | yes |
| Typecheck / lint | Via functions build / existing scripts | yes if available |
| Portal | N/A (no Portal code change expected) | no |

### Manual

- [x] Details: Studio create Portal invite → open reset link → set password → confirm continue host is `myprintrequest.dev` (dev), not localhost. Optional: Google sign-in on same invited email still reaches Portal on correct host. Re-test only after Functions deploy.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (invite password continue URL)
- [x] Other: Owner must run `firebase deploy --only functions:createCustomerWithPortalInvite --project fresh-prints-dev` after `APPROVE DEV DEPLOY` (exact command in review/state). Do not agent-deploy.
- [ ] Production deploy
- [ ] Secrets rotation (none expected)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Continue URL rejected if domain not authorized | medium | Keep existing fallback retry without continue URL; document authorized domains |
| Old invite emails still point at localhost | low | Owner re-sends invite / regenerates link after deploy |
| Removing defineString param surprises ops | low | Document; proof path already ignores deploy PORTAL_BASE_URL |

---

## Rollback Plan

Redeploy previous `createCustomerWithPortalInvite` revision; or temporarily restore `PORTAL_BASE_URL` to a correct https Portal host (not localhost) if emergency param-only rollback needed.

---

## Documentation Updates Required

- [x] BACKEND.md (invite continue URL uses same project map)
- [x] Other: `resend-email-setup.md` invite continue note; workflow artifacts

---

## Open Questions

- [x] None — domain map already confirmed in Decision Log / BACKEND.md

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-invite-password-continue-url-localhost-review.md
- Verdict: pending
