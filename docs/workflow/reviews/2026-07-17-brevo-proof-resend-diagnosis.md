# Diagnosis: Proof-ready set to Brevo but sent via Resend

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | `fresh-prints-dev` |
| Status | Root cause fixed + Functions redeployed |

## Fallback behavior (code)

**No.** `onEmailDeliveryJobCreated` does **not** fall back to Resend when Brevo fails.

- Job document snapshots `provider` at enqueue time (`staffAddAssistedCreationProof`).
- Worker calls `sendEmail({ provider: job.provider, apiKey: resolveEmailApiKey(job.provider, …) })`.
- Empty Brevo key → `provider_rejected` (fail), not Resend.
- Brevo HTTP errors → job `failed` / retry with the **same** provider.

## Why the last send was Resend

Live Firestore at diagnosis time:

| Doc | Finding |
|-----|---------|
| `settings/emailProviders` | `inviteProvider: resend`, `proofNoticeProvider: brevo` (saved `2026-07-18T02:24:56Z`) |
| Latest `emailDeliveryJobs` (`…fca2a415`) | `provider: resend`, `status: sent` at `02:27:24Z` |

Timeline: Settings saved as Brevo → ~2.5 min later proof attached → job still snapshotted **resend**.

**Cause:** Brevo deploy updated invitation + delivery Functions and `updateEmailProviderSettings`, but **not** `staffAddAssistedCreationProof`. That callable still had an older shared allowlist that only recognized `resend`. `resolveEmailProviderId("brevo")` therefore **silently defaulted to Resend** when reading settings.

Function hashes before fix:

- `staffAddAssistedCreationProof` ≠ Brevo email Functions hash
- After fix: `staffAddAssistedCreationProof` redeployed with Brevo-aware constants

`BREVO_API_KEY` on `fresh-prints-dev` is present (product-shaped key, secret version 2 bound on `onEmailDeliveryJobCreated`). Secret was not the reason this send used Resend.

## Fix applied

1. Redeployed `staffAddAssistedCreationProof` (+ invite callables + `updateEmailProviderSettings`) to `fresh-prints-dev`.
2. Hardened `loadEmailProviderSettings`: unrecognized stored provider IDs throw (no silent Resend coerce).
3. Enqueue logs `proof email provider snapshot` with `proofNoticeProvider`.
4. Docs: Brevo setup / manual QA deploy lists always include `staffAddAssistedCreationProof`.

## Brevo MCP notes

- Account reachable (Funky Fresh Prints / free plan, send credits present).
- Senders/domains APIs return “manage in Brevo account” for this plan — verify `team@funkyfreshprints.com` (or configured from-address) in the Brevo dashboard UI.
- Product email uses HTTP API + `BREVO_API_KEY` (not SMTP relay, not MCP token).

## Owner next step

Re-run **one** proof-ready send with Proof-ready = Brevo. Confirm:

1. Logs show `provider: "brevo"` on `Email delivery job sent.`
2. Job doc in Firestore `emailDeliveryJobs` has `provider: "brevo"`.
3. Customer inbox received mail from Brevo.

If Brevo rejects (sender not verified), job fails with `provider_rejected` — still **no** Resend fallback.
