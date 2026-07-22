# Brevo Product Email Setup

## Purpose

Configure **Brevo transactional email** for Fresh Prints invitations and Assisted Creation
proof-ready notices via the Brevo **HTTP API** (not SMTP).

Product secret name: `BREVO_API_KEY` (Firebase Secret Manager).

**Do not confuse with Cursor MCP tooling.** The agent MCP token is `BREVO_MCP_TOKEN` and must never
be used as the product email API key. See `docs/workflow/setup/brevo-mcp-setup.md` for MCP only.

## Prerequisites

- Firebase Cloud Functions already deployed for the target project (`fresh-prints-dev` first)
- Blaze plan / secrets enabled
- Owner access to the Brevo dashboard and Firebase project
- Sender domain or address verified in Brevo for the from-address used by
  `INVITATION_FROM_EMAIL` / `PROOF_NOTICE_FROM_EMAIL` (default
  `Fresh Prints <noreply@myprintrequest.com>`)

## Step-by-step

### 1. Create a Brevo product API key

1. Sign in to the Brevo dashboard.
2. Open SMTP & API → API Keys (or equivalent).
3. Create a key with permission to send transactional emails.
4. Copy the key once; store it only in Secret Manager (next step). Never commit it or paste it into
   chat/docs.

### 2. Verify sender / domain

1. In Brevo, verify the domain (or single sender) that matches the Functions from-address params.
2. Confirm test mail can send from that sender in Brevo’s own UI before relying on Fresh Prints.

### 3. Set Firebase secret on `fresh-prints-dev`

A placeholder secret version may already exist so Functions could deploy. **Replace it** with your
real product API key before live send QA:

```bash
firebase functions:secrets:set BREVO_API_KEY --project fresh-prints-dev
```

Paste the product API key when prompted (value is not echoed here). Adding a new version does not
print the prior value in this guide.

After replacing the secret, redeploy the email Functions once so new instances pick up the latest
secret version (see step 4).

### 4. Deploy email Functions (if not already on the new build)

```bash
firebase deploy --only functions:createTeamUser,functions:createCustomerWithPortalInvite,functions:staffAddAssistedCreationProof,functions:onEmailDeliveryJobCreated,functions:updateEmailProviderSettings --project fresh-prints-dev
```

**Always include `staffAddAssistedCreationProof` when provider IDs change.** That callable snapshots
`proofNoticeProvider` onto each delivery job using the shared allowlist. A stale build that does not
recognize `brevo` silently resolved settings to Resend and sent via Resend even when Studio showed
Brevo.

### 5. Select Brevo in Studio

1. Sign in to Studio as owner → Settings → Email Providers.
2. Set **Proof-ready emails** and/or **Invitation emails** to **Brevo**.
3. Save.

Defaults remain Resend until you change Settings.

## Smoke test (proof-ready)

1. Confirm customer `assistedProofEmailOptIn` is not opted out.
2. In Studio, attach a proof on an Assisted request (`in_progress` → submit to customer).
3. Expect: customer receives proof-ready email; Assisted history shows `Proof-ready email sent`.
4. Optional: Studio Settings → switch proof provider back to Resend and confirm Resend still works.

## Rollback

Switch Settings back to Resend, or unset/stop using `BREVO_API_KEY`. No schema migration.

## Production

Production secret + deploy require a separate human checkpoint. Do not set production secrets from
this guide without explicit approval.
