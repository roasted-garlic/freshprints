# Resend Email Setup

## Purpose

This guide configures Resend for Fresh Prints invitation emails (Studio team users and Portal
customers) and Assisted Creation proof-ready notices.

When an owner or admin creates a team user, the `createTeamUser` Cloud Function:

1. Creates the Firebase Auth user
2. Creates the Firestore `users/{uid}` record
3. Generates a Firebase password reset link
4. Sends the invitation email through Resend
5. Returns whether the invitation email was sent

When an owner or admin creates a customer with Portal access, `createCustomerWithPortalInvite` follows the same Resend + password-reset-link pattern and sends **You're invited to Fresh Prints Portal**.

The Resend API key is stored only in Firebase Functions secrets.

When owner/admin staff attach the first or a revised Assisted Creation proof,
`staffAddAssistedCreationProof` commits a deterministic `emailDeliveryJobs` record with the proof.
`onEmailDeliveryJobCreated` sends the notice asynchronously. A provider failure never rolls back the
proof. Studio owners may independently select invitation and proof providers in Settings (`resend` or
`brevo`). For Brevo product setup (not Cursor MCP), see `docs/workflow/setup/brevo-email-setup.md`.

## Prerequisites

Before starting, confirm:

- Firebase Cloud Functions are set up. See `docs/workflow/setup/firebase-functions-setup.md`.
- The Firebase project is on a plan that supports Cloud Functions and secrets.
- You have owner or admin access to the Fresh Prints Firebase project.
- Node.js 20 is installed locally.
- You have reviewed:

```txt
docs/workflow/plans/resend-team-invitation-plan.md
docs/standards/SECURITY.md
docs/architecture/FIREBASE.md
```

## Step-By-Step Setup

### Step 1: Create A Resend Account

1. Go to [https://resend.com](https://resend.com).
2. Sign up or sign in.
3. Open the Resend dashboard.

### Step 2: Add And Verify Your Sending Domain

Invitation emails must come from a verified domain.

1. In Resend, open **Domains**.
2. Click **Add Domain**.
3. Enter the domain you want to send from, for example:

```txt
yourcompany.com
```

4. Add the DNS records Resend provides to your domain provider.
5. Wait until Resend marks the domain as verified.

Recommended sender format:

```txt
Fresh Prints <team@funkyfreshprints.com>
```

Fresh Prints uses `team@funkyfreshprints.com` as the default invitation sender. Ensure `funkyfreshprints.com` is verified in Resend.

### Step 3: Create A Resend API Key

1. In Resend, open **API Keys**.
2. Create a new API key with permission to send email.
3. Copy the key immediately. Resend shows the full value only once.

Store the key securely. Do not commit it to git. Do not place it in `.env.local` for the desktop app.

### Step 4: Set Firebase Functions Secrets

From the repository root:

```txt
C:\coding\fresh-prints
```

Set the Resend API key:

```bash
firebase functions:secrets:set RESEND_API_KEY
```

When prompted, paste the Resend API key.

Invitation emails are sent from:

```txt
Fresh Prints <team@funkyfreshprints.com>
```

Proof notices use the same confirmed sender:

```txt
PROOF_NOTICE_FROM_EMAIL=Fresh Prints <team@funkyfreshprints.com>
```

Canonical Portal hosts are resolved by Firebase project, not from a browser request:

- `fresh-prints-dev` → `https://myprintrequest.dev`
- production mapping → `https://myprintrequest.com`

That map is used for:

- Proof-notice review CTAs
- Portal invite password create/reset Firebase Auth **continue** URLs (`https://…/login`)

Unknown deployed projects fail closed. `PORTAL_BASE_URL` may override those URLs only for a
localhost Functions emulator (`FUNCTIONS_EMULATOR=true`). Do **not** set
`PORTAL_BASE_URL=http://localhost:…` in `.env.fresh-prints-dev` or other deploy env files —
that previously baked localhost into invite continue links. Do not change shared parameters
or secrets without a human checkpoint.

Firebase Console checklist (dev and prod projects):

1. **Authentication → Settings → Authorized domains** includes `myprintrequest.dev` /
   `myprintrequest.com` as appropriate (plus `localhost` for local Portal only).
2. After changing invite continue URL code, redeploy `createCustomerWithPortalInvite` before
   re-testing; already-sent invite emails keep their old continue URL.

Verify the secret exists:

```bash
firebase functions:secrets:access RESEND_API_KEY
```

Only use these commands on trusted machines. Do not share secret values.

### Step 5: Build And Deploy Functions

Install function dependencies if needed:

```bash
cd functions
npm install
npm run build
cd ..
```

Deploy only after explicit environment approval. For the email slice on dev, use the selective
command in `docs/standards/DEPLOYMENT.md`; do not use a bare full Functions deploy while the
repository's orphan remote-function warning remains.

```bash
firebase deploy --only functions:createTeamUser,functions:createCustomerWithPortalInvite,functions:staffAddAssistedCreationProof,functions:updateEmailProviderSettings,functions:onEmailDeliveryJobCreated,firestore:rules --project fresh-prints-dev
```

Invitation callables and the delivery trigger bind `RESEND_API_KEY` at runtime.

### Step 6: Confirm Firebase Auth Email Settings

The Cloud Function generates a Firebase password reset link with the Admin SDK. Firebase does not send that email. Resend sends the invitation email instead.

Still confirm in Firebase Console:

1. Open **Authentication**.
2. Open **Templates** or **Settings** for password reset.
3. Confirm Email/Password sign-in is enabled.
4. Confirm your Firebase project allows password reset links for invited users.

No Firebase SMTP configuration is required for this flow.

## Verification Steps

Before live verification, run the automated commands in `docs/standards/TESTING.md`. Live email
delivery is a manual checkpoint: verify owner-only provider Settings, invitation regression, one
email for the first proof, one additional email for a revised proof, correct sender/subject, and a
CTA to `/custom-designs?flow=assisted&step=status`.

### Verify Deployment

After deploy, confirm the function list includes `createTeamUser`:

```bash
firebase functions:list
```

### Verify Owner Creating Admin

1. Sign in to the desktop app as an `owner`.
2. Open **Users**.
3. Create a new `admin` user with a real inbox you control.
4. Confirm the UI shows a success message.
5. Confirm the response indicates `invitationEmailSent: true`.
6. Confirm the inbox receives:

```txt
Subject: You're invited to Fresh Prints
```

7. Open the password setup link.
8. Set a password.
9. Sign in to the desktop app with the new account.

### Verify Owner Creating Helper

Repeat the same flow with role `helper`.

### Verify Admin Creating Helper

1. Sign in as an `admin`.
2. Create a `helper` user.
3. Confirm only `helper` appears in the role dropdown.
4. Confirm the invitation email is delivered.

### Verify Admin Cannot Create Admin

1. Sign in as an `admin`.
2. Confirm the role dropdown does not include `admin`.

### Verify Email Failure Handling

To test graceful failure without deleting the user:

1. Temporarily use an invalid Resend API key, redeploy, and create a test user.
2. Confirm the user is still created in Firebase Auth and Firestore.
3. Confirm the UI shows a warning, not a hard error.
4. Confirm `invitationEmailSent` is `false`.
5. Restore the correct API key secret and redeploy.

## Common Mistakes

### Putting The Resend API Key In The Desktop App

Wrong:

```txt
.env.local in renderer
```

Correct:

```txt
Firebase Functions secret only
```

### Using An Unverified Sender Address

Resend rejects or fails sends when `team@funkyfreshprints.com` is not on a verified domain.

### Expecting Firebase To Send The Invitation Email

The Admin SDK only generates the reset link. Resend sends the email.

### Forgetting To Redeploy After Secret Changes

Secrets are read at function runtime, but the function must be deployed with secret bindings. Redeploy after adding or changing secrets if delivery fails.

### Creating Users Without Blaze Or Secret Support

If secrets are missing, user creation can still succeed while email delivery fails.

## Local Emulator Notes

Firebase emulators can run `createTeamUser`, but Resend delivery requires valid secrets and network access.

For local testing:

1. Set secrets in your Firebase project.
2. Use emulator with secret access configured for your environment, or test against deployed functions.

If you test only against deployed functions, local emulator secret setup is optional.

## Troubleshooting

### User Created But No Email Arrived

Check:

1. `RESEND_API_KEY` is set correctly
2. `funkyfreshprints.com` is verified in Resend
3. Resend dashboard logs for rejected sends
4. Spam or promotions folder
5. Function logs:

```bash
firebase functions:log --only createTeamUser
```

### UI Shows Warning Instead Of Success

This means account creation succeeded but Resend delivery failed. Use Firebase Console to send a manual password reset if needed.

### Permission Denied When Creating Users

Confirm the signed-in caller is an active `owner` or `admin` with a valid Firestore `users/{uid}` profile.

## Completion Checklist

- [ ] Resend account created
- [ ] Sending domain verified
- [ ] Resend API key created
- [ ] `RESEND_API_KEY` stored in Firebase secrets
- [ ] `funkyfreshprints.com` verified in Resend for `team@funkyfreshprints.com`
- [ ] Functions built successfully
- [ ] Functions deployed
- [ ] Owner can create admin and helper with email delivery
- [ ] Admin can create helper with email delivery
- [ ] Invited user can set password and sign in
- [ ] Email failure path shows warning and keeps created user
