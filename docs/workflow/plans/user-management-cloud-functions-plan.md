# User Management Cloud Functions Plan

## Goal

Add secure Phase 1 team user management for the Fresh Prints Desktop Admin App.

Owners and admins can invite staff accounts through a callable Firebase Cloud Function that uses the Firebase Admin SDK. The renderer must never create Firebase Auth users directly.

## Why User Creation Requires Firebase Admin SDK

Firebase client SDKs can only create users for the currently signed-in account (for example linking providers). Creating accounts for other people requires privileged Auth APIs.

Only the Firebase Admin SDK can:

* Create Auth users with arbitrary email addresses
* Assign initial credentials securely on the server
* Generate password reset links without exposing secrets to the client

If user creation happens in the renderer:

* Any authenticated client could attempt account creation
* Admin credentials would be required in the desktop app
* Role enforcement would be UI-only and bypassable

Fresh Prints must treat Cloud Functions as the trusted authority for team user creation.

## Architecture Impact

### Layers

| Layer | Responsibility |
| --- | --- |
| Firebase Cloud Functions | Auth user creation, Firestore profile creation, permission enforcement |
| `userManagementService` | Callable function invocation from renderer |
| `userService` | Firestore reads for team user listing |
| `permissionService` | UI authorization helpers |
| `UserManagementPage` | User list and create form UI |

### Out Of Scope

* Customer account creation from desktop
* Design library, imports, queues, customer website
* Role editing UI
* User deactivation callable (permission helper only in Phase 1 foundation)
* Email provider integration beyond password reset link generation

## Firebase Cloud Functions Setup

### Project Structure

```txt
functions/
├── package.json
├── tsconfig.json
├── .gitignore
└── src/
    ├── index.ts
    ├── createTeamUser.ts
    └── lib/
        ├── admin.ts
        ├── permissions.ts
        ├── errors.ts
        └── types.ts
```

### Root Firebase Config

```txt
firebase.json
firestore.rules
.firebaserc.example
```

Manual step: copy `.firebaserc.example` to `.firebaserc` with the real Firebase project ID.

## Callable Function Design

### Function Name

```txt
createTeamUser
```

### Type

Firebase Callable HTTPS function (`onCall`).

### Request

```ts
interface CreateTeamUserRequest {
  email: string;
  displayName: string;
  role: "admin" | "helper";
}
```

### Response

```ts
interface CreateTeamUserResponse {
  userId: string;
  email: string;
  displayName: string;
  role: "admin" | "helper";
  passwordResetEmailSent: boolean;
  nextStep: string;
}
```

### Server Flow

```txt
Verify request.auth exists
  ↓
Load users/{callerUid}
  ↓
Verify caller.isActive === true
  ↓
Verify caller role may create requested role
  ↓
Validate email + displayName
  ↓
Reject if email already exists
  ↓
Create Firebase Auth user with random server-side password
  ↓
Create users/{newUid} Firestore document
  ↓
Attempt password reset link generation
  ↓
Return safe response (no password, no reset link)
```

## Role Permission Rules

| Caller role | May create `admin` | May create `helper` |
| --- | --- | --- |
| `owner` | Yes | Yes |
| `admin` | No | Yes |
| `helper` | No | No |
| `customer` | No | No |

### Explicit Denials

* Admin cannot create `owner`
* Admin cannot create `admin`
* Helper cannot create any user
* Customer cannot create any user
* Desktop app cannot create `customer` through this function
* Callable rejects `owner` and `customer` in the `role` field

## Desktop App Access Rules

Customers must not access the desktop admin app.

Update `permissionService.canAccessDashboard()` to allow only:

```txt
owner
admin
helper
```

Customers remain valid for future website workflows but are blocked from the desktop shell.

## Firestore `users` Collection Updates

### Document Path

```txt
users/{newAuthUid}
```

### Fields Written By Function

| Field | Value |
| --- | --- |
| `id` | Auth UID |
| `email` | Normalized email |
| `displayName` | Trimmed display name |
| `role` | `admin` or `helper` |
| `isActive` | `true` |
| `createdAt` | `serverTimestamp()` |
| `updatedAt` | `serverTimestamp()` |
| `createdBy` | Caller UID |

Client writes to `users` remain denied.

## Invite / Create User Flow

### Desktop UI

1. Owner or admin opens **Users** in sidebar.
2. Page loads team users from Firestore.
3. User submits create form with email, display name, and allowed role.
4. Renderer calls `userManagementService.createTeamUser()`.
5. Callable function creates Auth + Firestore records.
6. UI shows success message and `nextStep` guidance.

### Role Options In UI

| Viewer | Role dropdown |
| --- | --- |
| `owner` | `admin`, `helper` |
| `admin` | `helper` only |
| `helper` | No user management page |

## Temporary Password Strategy

Firebase Auth requires a password when creating an email/password user through Admin SDK.

Phase 1 strategy:

1. Generate a long random password on the server.
2. Use it only inside the Cloud Function.
3. Never return or log the password.
4. Immediately attempt `generatePasswordResetLink(email)`.
5. Do not return the reset link to the client.

The account is effectively invite-pending until the user completes password reset.

## Password Reset Email Strategy

Firebase Admin SDK generates reset links but does not send email by itself.

Phase 1 behavior:

* Attempt link generation inside the function.
* Set `passwordResetEmailSent: false` unless Firebase email delivery is configured.
* Return `nextStep` telling the operator to confirm Firebase Authentication email templates and domain settings, or send reset from Firebase Console.

Future enhancement:

* Firebase Trigger Email extension
* Transactional email provider from Cloud Functions

## Error Handling

### Callable Errors

| Code | When |
| --- | --- |
| `unauthenticated` | Missing Auth context |
| `permission-denied` | Inactive caller or role not allowed |
| `invalid-argument` | Missing/invalid email, displayName, or role |
| `already-exists` | Email already registered |
| `internal` | Unexpected server failure |

### Renderer Handling

* Map callable errors to user-safe messages in `userManagementService`
* Show inline form errors and list-level errors
* Never expose stack traces or secrets

## Security Rules Impact

Replace starter self-read-only rules with role-aware read access for team management.

### Firestore Rules Summary

* Users may read their own `users/{uid}` document.
* Active owners may read `owner`, `admin`, and `helper` profiles.
* Active admins may read `admin` and `helper` profiles.
* All client writes to `users` remain denied.
* User creation and updates happen only in Cloud Functions.

Deploy rules with:

```bash
firebase deploy --only firestore:rules
```

## Required Files

### Documentation

* `docs/plans/user-management-cloud-functions-plan.md`
* `docs/setup/firebase-functions-setup.md`

### Firebase Backend

* `firebase.json`
* `firestore.rules`
* `.firebaserc.example`
* `functions/package.json`
* `functions/tsconfig.json`
* `functions/src/index.ts`
* `functions/src/createTeamUser.ts`
* `functions/src/lib/admin.ts`
* `functions/src/lib/permissions.ts`
* `functions/src/lib/errors.ts`
* `functions/src/lib/types.ts`

### Renderer

* `src/renderer/src/config/firebase.ts` — export `functions`
* `src/renderer/src/features/permissions/services/permissionService.ts`
* `src/renderer/src/features/users/services/userManagementService.ts`
* `src/renderer/src/features/users/services/userService.ts`
* `src/renderer/src/features/users/types/userManagement.types.ts`
* `src/renderer/src/features/users/hooks/useTeamUsers.ts`
* `src/renderer/src/features/users/hooks/useCreateTeamUser.ts`
* `src/renderer/src/features/users/components/CreateTeamUserForm.tsx`
* `src/renderer/src/features/users/components/TeamUserList.tsx`
* `src/renderer/src/features/users/pages/UserManagementPage.tsx`
* `src/renderer/src/shared/components/Select.tsx`
* `src/renderer/src/routes/AppRoutes.tsx`
* `src/renderer/src/shared/components/Sidebar.tsx`
* `src/renderer/src/styles/components/inputs.css`
* `src/renderer/src/styles/layout.css`

## Testing Checklist

### Cloud Function

- [ ] Unauthenticated call returns `unauthenticated`
- [ ] Helper call returns `permission-denied`
- [ ] Admin creating `admin` returns `permission-denied`
- [ ] Admin creating `owner` returns `permission-denied`
- [ ] Owner creating `admin` succeeds
- [ ] Owner creating `helper` succeeds
- [ ] Admin creating `helper` succeeds
- [ ] Duplicate email returns `already-exists`
- [ ] Firestore `users/{uid}` document is created with required fields
- [ ] Response does not include password or reset link

### Firestore Rules

- [ ] User can read own profile
- [ ] Owner can list team users
- [ ] Admin can list admin/helper users
- [ ] Helper cannot list other users
- [ ] Client cannot write `users` documents

### Desktop UI

- [ ] Sidebar **Users** item visible only to owner/admin
- [ ] Owner sees `admin` and `helper` role options
- [ ] Admin sees `helper` only
- [ ] Helper does not see user management navigation
- [ ] Customer cannot access desktop dashboard
- [ ] Create form success refreshes user list
- [ ] Errors display safely in the form

### Manual Setup

- [ ] Firebase CLI installed
- [ ] Functions deployed
- [ ] Firestore rules deployed
- [ ] Blaze billing enabled if required by project policy
- [ ] Firebase Authentication email templates reviewed

## Risks

| Risk | Mitigation |
| --- | --- |
| Functions not deployed in dev project | Setup guide with deploy commands and emulator notes |
| Email invite not delivered automatically | Document manual password reset step |
| Firestore list query blocked by rules | Deploy updated rules before testing UI |
| Customer desktop access regression | Block customers in `canAccessDashboard` |
| Admin SDK exposure in renderer | Admin SDK only in `functions/` |

## Migration Strategy

1. Add Cloud Functions backend and Firestore rules.
2. Deploy functions and rules to the Firebase project.
3. Add renderer services and permission helpers.
4. Add Users page and navigation.
5. Verify with owner and admin test accounts.
