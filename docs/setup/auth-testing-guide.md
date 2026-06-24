# Auth Testing Guide

## Purpose

This guide explains how to manually test Firebase Authentication in the Fresh Prints Desktop Admin App during local development.

It covers:

- Creating test users in the Firebase Console
- Creating matching `users/{uid}` Firestore documents
- Required profile fields
- Running the app locally
- Login, logout, and session persistence checklists
- Negative test cases (wrong password, missing profile, inactive account, unauthorized role)
- Common errors and what they mean

This guide does not cover production user provisioning, Cloud Functions, or automated test suites.

## Prerequisites

Before testing auth, confirm:

- The Fresh Prints Firebase project exists and is configured locally.
- `.env.local` exists at the project root with all required `VITE_FIREBASE_*` variables.
- Node.js dependencies are installed.
- You have completed or reviewed:

```txt
docs/setup/firebase-project-setup.md
docs/setup/firestore-setup.md
```

- You can access the Firebase console:

```txt
https://console.firebase.google.com/
```

- You have reviewed:

```txt
docs/AI_RULES.md
docs/FIREBASE.md
docs/DATA_MODEL.md
docs/SECURITY.md
```

### Auth Architecture (What You Are Testing)

Fresh Prints uses a two-step access model:

```txt
Firebase Auth (who you are)
  ↓
Firestore users/{uid} (what role you have)
  ↓
permissionService (what you can access)
```

Firebase Auth alone is not enough. Every test user must have:

1. A Firebase Authentication account (email/password).
2. A matching Firestore document at `users/{uid}` where the document ID equals the Firebase Auth UID.

## Step-By-Step Setup

### Step 1: Enable Email/Password Authentication

1. Open the Firebase console.
2. Select the Fresh Prints project.
3. Go to:

```txt
Build > Authentication
```

4. Open the **Sign-in method** tab.
5. Enable **Email/Password**.
6. Leave **Email link (passwordless sign-in)** disabled unless explicitly approved.
7. Save.

### Step 2: Create A Test User In Firebase Authentication

1. In Authentication, open the **Users** tab.
2. Click **Add user**.
3. Enter a test email and password.

Recommended test accounts:

| Purpose | Example email | Example password | Firestore role |
| --- | --- | --- | --- |
| Owner access | `owner.test@freshprints.local` | Use a strong dev-only password | `owner` |
| Admin access | `admin.test@freshprints.local` | Use a strong dev-only password | `admin` |
| Staff access | `helper.test@freshprints.local` | Use a strong dev-only password | `helper` |
| Customer access | `customer.test@freshprints.local` | Use a strong dev-only password | `customer` |
| Inactive account test | `inactive.test@freshprints.local` | Use a strong dev-only password | any role with `isActive: false` |
| Missing profile test | `noprofile.test@freshprints.local` | Use a strong dev-only password | no Firestore document |

4. Click **Add user**.
5. Open the newly created user row.
6. Copy the **User UID**. You need this exact value for the Firestore document ID.

Important:

- The app does not create Firestore profiles during login.
- The Firestore document ID must match the Firebase Auth UID exactly.
- Do not use the email address as the document ID.

### Step 3: Create The Matching `users/{uid}` Firestore Document

For every test user except the missing-profile test account:

1. Go to:

```txt
Build > Firestore Database
```

2. If the `users` collection does not exist yet, click **Start collection**.
3. Collection ID:

```txt
users
```

4. For **Document ID**, paste the Firebase Auth **User UID** from Step 2.
5. Add the required fields below.
6. Click **Save**.

Repeat for each role you want to test.

#### Required Fields

Every `users/{uid}` document must include these fields with the correct Firestore types:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string | Yes | Should match the Firebase Auth email |
| `displayName` | string | Yes | Shown in the app shell and dashboard |
| `role` | string | Yes | Must be exactly one of: `owner`, `admin`, `helper`, `customer` |
| `isActive` | boolean | Yes | Must be `true` for normal login |
| `createdAt` | timestamp | Yes | Use the Firebase Console timestamp picker |
| `updatedAt` | timestamp | Yes | Use the Firebase Console timestamp picker |

#### Optional Fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | If omitted, the app uses the document ID |
| `createdBy` | string | User UID of the creator |
| `updatedBy` | string | User UID of the last updater |

#### Example Owner Document

```txt
Document path: users/{firebase-auth-uid}

email: owner.test@freshprints.local
displayName: Owner Test User
role: owner
isActive: true
createdAt: <timestamp>
updatedAt: <timestamp>
```

#### Example Inactive User Document

Use the same shape as above, but set:

```txt
isActive: false
```

#### Missing Profile Test Account

For `noprofile.test@freshprints.local`:

- Create only the Firebase Authentication user.
- Do **not** create a `users/{uid}` document.

### Step 4: Confirm Firestore Rules Allow Profile Reads

The recommended development rules from `docs/setup/firestore-setup.md` allow an authenticated user to read only their own `users/{uid}` document.

Confirm your project rules include:

```txt
match /users/{userId} {
  allow read: if isSelf(userId);
  allow create, update, delete: if false;
}
```

If rules are stricter or misconfigured, login may fail even when the profile document exists.

### Step 5: Confirm Local Environment Variables

Confirm `.env.local` contains:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Values must match the Firebase Web app config for the same project where you created the test users.

## How To Run The App

From the project root:

```txt
C:\coding\fresh-prints
```

1. Install dependencies if needed:

```bash
npm install
```

2. Start the development app:

```bash
npm run dev
```

3. Wait for Vite and Electron to launch the desktop window.

4. The app should show the **Sign in** screen when no session exists.

Notes:

- `npm run dev` starts the Electron desktop app through Vite.
- Restart the app after changing `.env.local`.
- Use dev-only passwords. Never reuse production credentials in local testing.

## Manual Test Checklists

### Login Test Checklist

Use an owner test account with a valid Firestore profile.

- [ ] App opens to the login page with email and password fields.
- [ ] Enter the test email and password.
- [ ] Click **Sign in**.
- [ ] Button shows **Signing in...** while the request is in progress.
- [ ] Login succeeds without an inline error message.
- [ ] App navigates to the dashboard inside the admin shell.
- [ ] Top bar shows the user's `displayName`.
- [ ] Top bar shows the user's `role`.
- [ ] Dashboard welcome text shows **Welcome, {displayName}**.
- [ ] Dashboard shows **Your current role is {role}**.
- [ ] Firebase connection card loads on the dashboard.
- [ ] Overall status shows **Connected**.
- [ ] Firestore and Storage may show **Protected by rules** during locked-down Phase 1 testing. That is expected and means Firebase responded correctly.

Repeat login tests separately for `owner`, `admin`, `helper`, and `customer` accounts to confirm each role can authenticate.

### Firebase Connection Diagnostic Checklist

The dashboard **Firebase connection** card is a Phase 1 reachability check. It does not weaken security rules.

Expected statuses:

| Service | Healthy status | Meaning |
| --- | --- | --- |
| Firebase app | Connected | Client SDK initialized with the configured project |
| Authentication | Connected | Firebase Auth is available |
| Firestore | Connected or Protected by rules | Reachable; broad reads may be denied by starter rules |
| Storage | Connected or Protected by rules | Reachable; starter rules deny client access |

Interpretation:

- **Connected** means the service responded successfully.
- **Protected by rules** means Firebase responded and denied the diagnostic request because security rules are working.
- **Failed** means the service did not respond correctly. Investigate env vars, project setup, or network issues.

During locked-down Phase 1 testing:

- Overall status should still be **Connected** when Firestore and Storage are protected.
- Permission denied is not a broken Firebase connection.
- Auth profile loading uses allowed self-read paths and is separate from the broad Firestore diagnostic query.

### Logout Test Checklist

Start from a successful login.

- [ ] Click **Sign out** in the top bar.
- [ ] Button shows **Signing out...** while logout is in progress.
- [ ] App returns to the login page.
- [ ] Dashboard and shell UI are no longer visible.
- [ ] Protected content is not accessible after logout.
- [ ] Signing in again with the same account works.

### Refresh / Session Persistence Checklist

Start from a successful login.

- [ ] Close the Electron app completely.
- [ ] Run `npm run dev` again.
- [ ] App should restore the session without asking for credentials immediately.
- [ ] Brief **Checking your session** loading state may appear first.
- [ ] Dashboard loads again for the same user.
- [ ] User `displayName` and `role` are still correct after restart.

If the session does not restore:

- Confirm you did not click **Sign out** before closing.
- Confirm Firebase Auth is enabled in the same project as `.env.local`.
- Confirm the Firestore profile still exists and `isActive` is `true`.

## Negative Test Cases

### Wrong Password Test

Goal: Confirm Firebase Auth rejects invalid credentials before Firestore profile loading matters.

Steps:

1. Open the login page.
2. Enter a valid test email.
3. Enter an incorrect password.
4. Click **Sign in**.

Expected result:

- Login stays on the sign-in page.
- Inline error message appears:

```txt
The email or password is incorrect.
```

- No dashboard access is granted.
- No Firestore profile load should be treated as a successful login.

Also test:

- Unknown email → same incorrect credential message
- Malformed email → `Enter a valid email address.`

### Missing Firestore User Record Test

Goal: Confirm Firebase Auth success is blocked when no `users/{uid}` profile exists.

Setup:

- Use `noprofile.test@freshprints.local` or any Auth user without a matching Firestore document.

Steps:

1. Sign in with valid Auth credentials.
2. Wait for profile loading to complete.

Expected result:

- App does **not** enter the dashboard.
- Screen title: **Account setup needed**
- Eyebrow: **Access unavailable**
- Message:

```txt
No Fresh Prints user profile exists for this account.
```

- **Sign out** button is available.
- Clicking **Sign out** returns you to the login page.

### Inactive Account Test

Goal: Confirm `isActive: false` blocks app access even when Auth credentials are valid.

Setup:

- Use a Firestore document with `isActive: false`.

Steps:

1. Sign in with valid Auth credentials.
2. Wait for profile loading to complete.

Expected result:

- App does **not** enter the dashboard.
- Screen title: **Account setup needed**
- Message:

```txt
This account is inactive. Contact an administrator.
```

- **Sign out** button is available.

### Unauthorized Role Test

Goal: Confirm role-based authorization works after login.

Fresh Prints separates authentication from authorization:

- Authentication = Firebase Auth + valid active Firestore profile
- Authorization = `role` in Firestore + `permissionService`

#### Route-Level Access

The main app route currently requires the `accessDashboard` permission. All valid active roles can access it:

```txt
owner
admin
helper
customer
```

So a valid `customer` account should still reach the dashboard shell.

#### UI-Level Role Restrictions

Use the dashboard permission cards to verify role behavior after login.

| Role | Should see owner/admin message | Should see staff card | Should see audit card | Should see customer card |
| --- | --- | --- | --- | --- |
| `owner` | Yes | Yes | Yes | No |
| `admin` | Yes | Yes | Yes | No |
| `helper` | No | Yes | No | No |
| `customer` | No | No | No | Yes |

Checklist:

- [ ] `owner` sees owner/admin confirmation message.
- [ ] `admin` sees owner/admin confirmation message.
- [ ] `helper` does not see owner/admin confirmation message.
- [ ] `helper` sees the staff operational access card.
- [ ] `helper` does not see the audit visibility card.
- [ ] `customer` sees the customer access card.
- [ ] `customer` does not see staff or audit cards.

#### Invalid Role Value Test

Goal: Confirm malformed profile data is rejected.

Setup:

- Create a Firestore document with an invalid `role`, such as `superadmin`.

Expected result after login:

- App does **not** enter the dashboard.
- Message:

```txt
Your user profile is incomplete. Contact an administrator.
```

#### Future Route Permission Test

If a route is protected with a permission the user's role does not have, expected result is:

- Eyebrow: **Unauthorized**
- Title: **You do not have access**
- Message:

```txt
Your role does not include permission to view this page.
```

- **Sign out** button is available.

## Common Errors And What They Mean

| Message or symptom | Likely cause | What to check |
| --- | --- | --- |
| `The email or password is incorrect.` | Invalid Firebase Auth credentials | Email spelling, password, Auth user exists in correct project |
| `Enter a valid email address.` | Email field format is invalid | Use a valid email format |
| `This account has been disabled.` | Firebase Auth user is disabled in console | Authentication > Users > enable the account |
| `Too many login attempts. Wait a moment and try again.` | Firebase rate limiting | Wait and retry with correct credentials |
| `Network error. Check your connection and try again.` | Local network or Firebase reachability issue | Internet connection, VPN, firewall, project availability |
| `Authentication failed. Please try again.` | Unexpected Firebase Auth error | Browser/Electron devtools console, Firebase project config |
| `No Fresh Prints user profile exists for this account.` | Auth user exists but `users/{uid}` document is missing | Create Firestore doc with document ID = Auth UID |
| `Your user profile is incomplete. Contact an administrator.` | Firestore doc exists but required fields are missing or invalid | `email`, `displayName`, `role`, `isActive`, `createdAt`, `updatedAt` |
| `This account is inactive. Contact an administrator.` | `isActive` is `false` | Set `isActive: true` or use a different test account |
| `Unable to load your user profile. Contact an administrator.` | Generic profile load failure | Firestore rules, project mismatch, console errors |
| `Missing or insufficient permissions.` / `permission-denied` | Firestore rules blocked the profile read | Confirm starter rules allow self-read on `users/{uid}` |
| `Checking your session` never finishes | Auth subscription or profile load hanging | DevTools console, Firestore connectivity, env vars |
| App opens but Firebase connection card shows Firestore or Storage as **Protected by rules** | Expected with locked-down starter rules for broad reads | Not an auth failure; Firebase is reachable and security is working |
| Login works in console project A but not locally | `.env.local` points to a different Firebase project | Compare `VITE_FIREBASE_PROJECT_ID` with console project |
| Document exists but login still says profile missing | Firestore doc ID does not match Auth UID | Copy UID from Authentication user, not email |

## Verification Steps

### Firebase Console Verification

- Email/Password provider is enabled.
- Test Auth users exist.
- Each active test user has a `users/{uid}` document.
- Document IDs match Auth UIDs exactly.
- `role` values are valid.
- `isActive` is set intentionally for each test case.

### Application Verification

- `npm run dev` launches the Electron app.
- Valid owner/admin/helper/customer accounts reach the dashboard.
- Wrong password shows the expected inline error.
- Missing profile account shows **Account setup needed**.
- Inactive account shows inactive message.
- Logout returns to login.
- Session persists across app restart for signed-in users.

## Common Mistakes

### Using Email As The Firestore Document ID

The document ID must be the Firebase Auth UID.

### Creating Auth Users Without Firestore Profiles

Firebase Auth success alone does not grant app access.

### Using Invalid Role Strings

Only these values are accepted:

```txt
owner
admin
helper
customer
```

### Forgetting Timestamp Fields

`createdAt` and `updatedAt` are required. Missing or wrong field types cause profile validation failure.

### Testing Against The Wrong Firebase Project

Local `.env.local` must reference the same Firebase project where test users were created.

### Expecting Customers To Be Blocked From The Dashboard

Phase 1 currently allows all active roles to access the dashboard route. Unauthorized behavior appears in role-gated dashboard sections and future protected routes.

### Creating Profiles From The App

Starter Firestore rules deny client-side writes to `users`. Create and edit test profiles in the Firebase Console or through an approved admin workflow.

## Completion Checklist

- [ ] Email/Password auth enabled in Firebase Console.
- [ ] Test Auth users created for each scenario you need.
- [ ] Matching `users/{uid}` documents created for active role tests.
- [ ] Missing-profile test account has Auth only, no Firestore doc.
- [ ] Inactive test account has `isActive: false`.
- [ ] `.env.local` matches the Firebase project under test.
- [ ] Firestore starter rules allow self-read on `users/{uid}`.
- [ ] `npm run dev` launches the app successfully.
- [ ] Login checklist completed for at least one staff role.
- [ ] Logout checklist completed.
- [ ] Session persistence checklist completed.
- [ ] Wrong password test completed.
- [ ] Missing Firestore profile test completed.
- [ ] Inactive account test completed.
- [ ] Unauthorized role UI behavior verified on dashboard.
- [ ] Common error messages understood and documented for the team.
