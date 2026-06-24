# Firebase Functions Setup

## Purpose

This guide covers Firebase Cloud Functions setup for Fresh Prints secure team user management.

It explains how to:

- Install the Firebase CLI
- Connect the local project to Firebase
- Initialize and build TypeScript Cloud Functions
- Deploy the `createTeamUser` callable function
- Deploy updated Firestore security rules
- Test locally with emulators
- Verify secure user creation from the desktop app

This guide does not cover Firebase project creation or desktop `.env.local` setup.

Use these related guides first:

```txt
docs/setup/firebase-project-setup.md
docs/setup/firestore-setup.md
docs/setup/auth-testing-guide.md
```

## Prerequisites

Before starting, confirm:

- The Fresh Prints Firebase project exists.
- Email/Password authentication is enabled.
- At least one active `owner` or `admin` user exists in Firestore.
- Node.js 20 is installed locally.
- You have reviewed:

```txt
docs/plans/user-management-cloud-functions-plan.md
docs/SECURITY.md
docs/FIREBASE.md
```

Manual billing note:

- Cloud Functions deployment may require the Firebase Blaze plan depending on project policy and usage.

## Step-By-Step Setup

### Step 1: Install Firebase CLI

If Firebase CLI is not installed:

```bash
npm install -g firebase-tools
```

Verify:

```bash
firebase --version
```

### Step 2: Log In To Firebase

```bash
firebase login
```

Confirm the correct Google account is active.

### Step 3: Link The Local Project

From the repository root:

```txt
C:\coding\fresh-prints
```

Create `.firebaserc` from the example:

```bash
copy .firebaserc.example .firebaserc
```

Replace:

```txt
YOUR_FIREBASE_PROJECT_ID
```

with the real Firebase project ID from `.env.local`:

```txt
VITE_FIREBASE_PROJECT_ID
```

Example `.firebaserc`:

```json
{
  "projects": {
    "default": "your-real-project-id"
  }
}
```

### Step 4: Install Functions Dependencies

```bash
cd functions
npm install
cd ..
```

### Step 5: Build Functions

```bash
cd functions
npm run build
cd ..
```

Expected output:

```txt
functions/lib/index.js
functions/lib/createTeamUser.js
```

### Step 6: Review Project Files

Confirm these files exist:

```txt
firebase.json
firestore.rules
functions/src/index.ts
functions/src/createTeamUser.ts
```

`firebase.json` should deploy:

- Cloud Functions from `functions/`
- Firestore rules from `firestore.rules`

### Step 7: Deploy Firestore Rules

Deploy role-aware user read rules before testing the Users page:

```bash
firebase deploy --only firestore:rules
```

### Step 8: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

Expected deployed callable functions:

```txt
createTeamUser
updateTeamUser
```

### Step 9: Verify Deployment

```bash
firebase functions:list
```

Confirm `createTeamUser` and `updateTeamUser` appear in the project.

## Local Emulator Notes

The repository includes emulator scripts, but emulator use requires Firebase CLI project linking and emulator initialization.

Recommended local workflow:

1. Build functions:

```bash
cd functions
npm run build
```

2. Start emulators from repo root:

```bash
firebase emulators:start --only functions,firestore
```

3. Point the desktop app to emulators only during explicit local testing.

Manual step:

- Emulator wiring for callable functions is not enabled in the desktop app by default.
- Add emulator connection in development only if you intentionally test against local emulators.

Do not enable emulator shortcuts in production builds.

## Required Commands

| Task | Command |
| --- | --- |
| Install CLI | `npm install -g firebase-tools` |
| Log in | `firebase login` |
| Install function deps | `npm --prefix functions install` |
| Build functions | `npm --prefix functions run build` |
| Deploy rules | `firebase deploy --only firestore:rules` |
| Deploy functions | `firebase deploy --only functions` |
| View logs | `npm --prefix functions run logs` |

## Invitation Email Setup

The `createTeamUser` function:

1. Creates the Auth user with a server-only temporary password.
2. Creates the matching Firestore `users/{uid}` profile.
3. Generates a Firebase password reset link with the Admin SDK.
4. Sends the invitation email through Resend from Cloud Functions.

`generatePasswordResetLink()` only creates a URL. Resend sends the email.

Configure Resend and Firebase secrets using:

```txt
docs/setup/resend-email-setup.md
```

If email delivery fails, the user account is still created and the UI shows a warning with manual fallback guidance.

## User Status Management

The `updateTeamUser` function:

1. Verifies the caller is an active owner or admin with permission for the target user.
2. Blocks self-status changes and last-owner deactivation.
3. Updates Firebase Auth `disabled` to the inverse of `isActive`.
4. Updates Firestore `users/{targetUserId}.isActive`, `updatedAt`, and `updatedBy`.
5. Optionally updates role when the caller is an owner editing admin/helper accounts.

Never change `users/{uid}.isActive` from the renderer.

## Common Mistakes

### Deploying Functions Before Building

Always run:

```bash
npm --prefix functions run build
```

or rely on the `firebase.json` predeploy hook.

### Forgetting To Deploy Firestore Rules

The Users page list query fails with `permission-denied` if role-aware read rules are not deployed.

### Creating `.firebaserc` With The Wrong Project ID

Functions deploy to the wrong Firebase project if `.firebaserc` does not match `.env.local`.

### Expecting The Desktop App To Create Auth Users

Never create Firebase Auth users from the renderer. Use the `createTeamUser` callable function only.

### Committing Secrets

Do not commit:

```txt
.env.local
.firebaserc
service account JSON files
```

`.firebaserc.example` is safe to commit. Real `.firebaserc` should stay local unless your team intentionally shares it through secure internal storage.

### Testing With Helper Accounts

Helpers must not see the Users page or successfully call `createTeamUser`.

### Leaving Starter Firestore Rules In Production

Starter self-read-only rules are not enough for team user listing.

## Verification Steps

### Firebase Console

- `createTeamUser` function is deployed.
- Firestore rules are updated.
- Email/Password auth is enabled.

### Callable Function

- Owner can create `admin`.
- Owner can create `helper`.
- Admin can create `helper`.
- Admin cannot create `admin`.
- Helper call is rejected.

### Desktop App

- Owner/admin see **Users** in the sidebar.
- Helper does not see **Users**.
- Customer cannot access the desktop dashboard.
- Create form shows allowed role options only.
- User list loads after rules deployment.

## Testing Checklist

- [ ] Firebase CLI installed
- [ ] `firebase login` completed
- [ ] `.firebaserc` created with correct project ID
- [ ] `functions` dependencies installed
- [ ] `functions` TypeScript build succeeds
- [ ] Firestore rules deployed
- [ ] `createTeamUser` function deployed
- [ ] Owner can create admin from desktop app
- [ ] Owner can create helper from desktop app
- [ ] Admin can create helper from desktop app
- [ ] Admin cannot create admin
- [ ] Helper cannot access Users page
- [ ] Customer cannot access desktop dashboard
- [ ] Created user appears in Auth and `users/{uid}`
- [ ] Password reset next-step message appears in UI
- [ ] No password or reset link is returned to the renderer

## Completion Checklist

- Firebase CLI configured
- Local project linked with `.firebaserc`
- Functions dependencies installed
- Functions build succeeds
- Firestore rules deployed
- Cloud Functions deployed
- Desktop Users page tested with owner/admin account
- Password reset email process documented and understood
