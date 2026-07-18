# Test Report: Brevo transactional email provider

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Phase | Test |
| Plan | docs/workflow/plans/2026-07-17-brevo-email-provider-plan.md |
| Status | **passed_with_notes** |

---

## Automated checks

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Email + provider unit tests | `npx tsx --test packages/shared/src/constants/emailProviders.constants.test.ts functions/src/lib/email/email.test.ts apps/studio/src/renderer/src/features/permissions/services/permissionService.emailProviders.test.ts` | 0 | **pass** (15/15) |
| Functions build | `npm --prefix functions run build` | 0 | **pass** |

Covered: Brevo adapter (rate limit, messageId, sender parse, idempotency UUID hash), router + API key resolver, shared `isEmailProviderId("brevo")`, Resend regression, owner-only settings permission.

---

## Manual / live send

| Check | Status | Notes |
|-------|--------|-------|
| Set `BREVO_API_KEY` on `fresh-prints-dev` | **PASS** (owner) | Implied by live Brevo delivery |
| Verify Brevo sender/domain | **PASS** (owner) | From `team@funkyfreshprints.com` delivered |
| Studio select Brevo → proof-ready email | **BREVO PASS** | Transactional Logs: Sent / Delivered / First opening |
| Resend regression | optional / not run | Not required for Brevo signoff |

---

## Parallel UX (same session; absorbed under Brevo phase)

| Check | Status |
|-------|--------|
| Portal Request revisions above Approve + Sending… residual | code done; **absorbed / optional** (not separately owner-confirmed) |
| Studio taller proof note textarea | code done; **absorbed / optional** (not separately owner-confirmed) |

---

## Dev deploy

| Target | Functions | Result |
|--------|-----------|--------|
| `fresh-prints-dev` | `createTeamUser`, `createCustomerWithPortalInvite`, `onEmailDeliveryJobCreated`, `updateEmailProviderSettings` | **success** (2026-07-17) |

`BREVO_API_KEY` secret was created as a non-working placeholder so deploy could bind the secret.
Owner must `firebase functions:secrets:set BREVO_API_KEY --project fresh-prints-dev` with the real
product key, then redeploy email Functions once, then run live QA.

## Notes

- **2026-07-17 owner BREVO PASS** recorded — live proof-ready via Brevo confirmed (logs Sent / Delivered / First opening).
- Signoff: `docs/workflow/reviews/2026-07-17-brevo-email-provider-signoff.md` (**approved_with_notes**).
- Defaults remain Resend until Settings switch; fail-closed if Brevo selected without key.
