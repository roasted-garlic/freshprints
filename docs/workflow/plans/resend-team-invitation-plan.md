# Resend Team Invitation Plan

## Goal

Automatically email team user invitations when an owner or admin creates an admin or helper through `createTeamUser`.

The Cloud Function will:

1. Create the Firebase Auth user
2. Create the Firestore `users/{uid}` record
3. Generate a Firebase password reset link
4. Send that link through Resend
5. Return whether the invitation email was sent

## Architecture

```txt
Desktop app (renderer)
  ↓
userManagementService.createTeamUser()
  ↓
createTeamUser callable function
  ↓
Firebase Admin SDK (Auth + Firestore)
  ↓
generatePasswordResetLink()
  ↓
Resend API (server only)
```

### Layer Rules

| Layer | Allowed |
| --- | --- |
| Cloud Functions | Admin SDK, Resend API, secrets |
| Renderer | Callable function invocation only |
| Renderer | No Resend API key |
| Renderer | No email sending |

## Secrets

Firebase Functions secrets:

```txt
RESEND_API_KEY
```

Default invitation sender:

```txt
Fresh Prints <team@funkyfreshprints.com>
```

Secrets are configured with Firebase CLI and injected at runtime only inside Cloud Functions.

## Callable Response

```ts
interface CreateTeamUserResponse {
  userId: string;
  email: string;
  displayName: string;
  role: TeamUserRole;
  invitationEmailSent: boolean;
  nextStep: string;
}
```

### Response Rules

| Result | `invitationEmailSent` | Meaning |
| --- | --- | --- |
| User created and email sent | `true` | Invitation delivered through Resend |
| User created but email failed | `false` | Account exists; operator must retry manually |
| User creation failed | Function throws | No partial success response |

The reset link is never returned to the client.

## Email Template

Subject:

```txt
You're invited to Fresh Prints
```

Content:

* Greeting with display name
* Role created (`admin` or `helper`)
* Explanation that a Fresh Prints account was created
* Password setup button/link using Firebase reset URL
* Fresh Prints signature

## Files To Add Or Update

### Documentation

* `docs/plans/resend-team-invitation-plan.md`
* `docs/setup/resend-email-setup.md`

### Cloud Functions

* `functions/package.json`
* `functions/src/createTeamUser.ts`
* `functions/src/lib/resendEmailService.ts`
* `functions/src/lib/teamInvitationEmail.ts`
* `functions/src/lib/secrets.ts`

### Renderer

* `src/renderer/src/features/users/types/userManagement.types.ts`
* `src/renderer/src/features/users/components/CreateTeamUserForm.tsx`
* `src/renderer/src/features/users/pages/UserManagementPage.tsx`
* `src/renderer/src/styles/utilities.css`

## Security

* Resend API key stored only in Firebase secret manager
* Password reset link generated server-side only
* Reset link included only in email body sent by Resend
* Callable still enforces owner/admin role rules server-side
* Email failure does not roll back created user (operator can manually recover)

## Risks

| Risk | Mitigation |
| --- | --- |
| Unverified Resend sender domain | Document domain verification in setup guide |
| Secret missing in deployed function | Declare secrets on callable and document deploy steps |
| Email send fails after user creation | Return `invitationEmailSent: false` with manual fallback message |
| Link leaked in logs | Do not log reset link or Resend payload |

## Testing Checklist

- [ ] Owner creates admin and receives invitation email
- [ ] Owner creates helper and receives invitation email
- [ ] Admin creates helper and receives invitation email
- [ ] Admin cannot create admin
- [ ] Helper cannot access Users page
- [ ] Missing Resend secret returns `invitationEmailSent: false`
- [ ] Invited user can set password and sign in
