# Firebase Foundation Plan

## Goal

Establish the Phase 1 Firebase foundation for Fresh Prints before any design import or customer workflow work begins.

This plan covers:

- Firebase Project Setup
- Firebase Authentication
- Firestore
- Firebase Storage
- User Roles
- Permission Service
- Required Collections
- Required Security Rules

This plan does not implement ZIP import, DPI validation, thumbnail generation, AI processing, customer request workflows, design library UI, or customer website UI.

## Scope

### In Scope

- One Firebase backend shared by the Desktop Admin App, future Customer Website, and future Mobile App.
- Firebase client initialization for the renderer.
- Email/password authentication.
- Firestore user profile loading after Firebase Auth login.
- Canonical user roles.
- Centralized permission service planning.
- Required Firestore collections and document expectations.
- Required Storage folders and access boundaries.
- Firestore and Storage security rule requirements.
- Setup documentation requirements for future implementation.

### Out Of Scope

- Cloud Functions.
- Firebase Admin SDK usage.
- Google, Apple, or social auth providers.
- Offline support.
- Design import workflows.
- Customer request implementation.
- Show queue implementation.
- AI workflows.
- Production downloads.

## Architecture Impact

### Roadmap Phase

This belongs to:

```txt
Phase 1
Foundation
```

Phase 1 must establish authentication, roles, permissions, Firestore connectivity, Storage connectivity, shared types, and shared services before image functionality begins.

### Layers

This foundation affects these layers:

- Firebase Service
- Feature Service
- Feature Hook
- Shared Type
- Shared Utility
- React Renderer
- Security Rules
- Documentation

No Electron main process or preload work is required for Firebase foundation setup unless a later workflow needs secure local filesystem access.

### Feature Ownership

Primary feature areas:

- `auth`
- `users`
- `permissions`

Shared ownership:

- Firebase configuration
- Firestore document types
- Role and permission types
- Security rule policy

### File Organization Targets

Future implementation should keep Firebase and permission code in focused locations such as:

```txt
src/renderer/src/config/firebase.ts
src/renderer/src/features/auth/
src/renderer/src/features/users/
src/renderer/src/features/permissions/
src/renderer/src/shared/
```

Firebase calls must stay in services. React components must not call Firebase directly.

## Firebase Project Setup

Use one Firebase project as the shared backend for:

- Desktop Admin App
- Future Customer Website
- Future Mobile App

Enable:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage

Do not create separate desktop, website, or mobile databases unless explicitly approved.

### Environment Variables

Firebase client configuration must come from environment variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Allowed environment files:

```txt
.env
.env.local
.env.production
```

Never commit secrets, service account files, private keys, Firebase Admin credentials, or local environment files containing project credentials.

### Firebase Initialization

Initialize Firebase once in:

```txt
src/renderer/src/config/firebase.ts
```

The initialization file should export:

- `app`
- `auth`
- `firestore`
- `storage`

The app should fail with a clear error if required Firebase environment values are missing.

Do not initialize Firebase in multiple places.

## Firebase Auth

Use Firebase Authentication for identity.

Initial provider:

```txt
Email / Password
```

Future providers such as Google or Apple require approval before implementation.

Authentication identifies the user. Authorization is handled by role and permission data from Firestore.

### Required Login Flow

```txt
User signs in
  ↓
Firebase Auth returns authenticated user
  ↓
App loads users/{uid}
  ↓
App verifies isActive
  ↓
App derives permissions from role
  ↓
Protected app routes become available
```

Every authenticated Firebase Auth user must have a matching Firestore document:

```txt
users/{userId}
```

Protected routes must handle:

- Loading auth state
- Unauthenticated user
- Missing Firestore user profile
- Inactive user
- Firestore load failure
- Successful authenticated session

## Firestore Plan

Firestore stores metadata and business records only.

Firestore must not store:

- Images
- ZIP files
- Binary assets
- Permanent download URLs when storage paths are sufficient

Files belong in Firebase Storage. Firestore should store stable Storage paths.

### Required Collections

Initial Firestore collections:

```txt
users
designs
categories
customers
customerRequests
showQueues
showQueueItems
settings
auditLogs
```

Future collections require approval and corresponding updates to the data model and security rules.

### Document Metadata

Every primary document should include:

- `id`
- `createdAt`
- `updatedAt`

Where applicable, include:

- `createdBy`
- `updatedBy`

Use server timestamps whenever possible.

### Shared Types

Every Firestore document must have a corresponding TypeScript interface or type.

Required model types include:

- `User`
- `UserRole`
- `Design`
- `DesignStatus`
- `Category`
- `Customer`
- `CustomerRequest`
- `CustomerRequestStatus`
- `ShowQueue`
- `QueueStatus`
- `ShowQueueItem`
- `QueueItemStatus`
- `AppSettings`
- `AuditLog`

Do not duplicate model definitions across features.

### Expected Indexes

Initial expected indexes:

```txt
designs.status
designs.categoryId
designs.uploadedBy
customerRequests.status
showQueueItems.queueId
showQueues.status
```

Additional indexes should be added only when actual query patterns require them.

## Firebase Storage Plan

Firebase Storage stores files. Firestore stores metadata.

Required top-level folders:

```txt
/originals/
/thumbnails/
/previews/
/customer-uploads/
```

Expected paths:

```txt
/originals/{designId}.png
/thumbnails/{designId}.webp
/previews/{designId}.webp
/customer-uploads/{requestId}/original.png
```

Firestore should store paths such as:

```txt
/originals/design123.png
```

Do not store permanent download URLs unless a specific approved workflow requires them.

### Storage Access Boundaries

- Originals are restricted to owner, admin, and helper roles.
- Customers must never access originals.
- Thumbnails and previews may be visible to authenticated users when tied to customer-visible designs.
- Customer uploads must be scoped to the owning customer request and authorized staff.
- All writes require authentication, authorization, file size validation, and content type validation.

Upload workflows are not part of this plan, but future upload implementation must validate:

- File type
- File extension
- File size
- File ownership
- Request ownership
- User permissions

## User Roles

Use the canonical role union:

```ts
export type UserRole =
  | "owner"
  | "admin"
  | "helper"
  | "customer";
```

### Owner

Owners can:

- Manage users
- Manage roles
- Manage settings
- Manage imports
- Manage designs
- Manage queues
- Manage customers
- Manage requests
- Access audit logs

Owners have full platform access.

### Admin

Admins can:

- Manage designs
- Manage imports
- Manage queues
- Manage requests
- Manage customers

Admins cannot:

- Modify owner accounts
- Change platform ownership

### Helper

Helpers can:

- Import designs
- Organize designs
- Tag designs
- Categorize designs
- Review requests
- Manage queues if allowed

Helpers must not have unrestricted administrative access.

### Customer

Customers can:

- Browse approved customer-facing design metadata
- Submit requests
- Upload request images
- View their own requests

Customers cannot:

- View admin data
- View helper data
- View private queue data
- Download originals
- Access audit logs
- Access settings

Role changes must create immutable audit log records.

## Permission Service

Create a centralized permission service during implementation.

Target file:

```txt
src/renderer/src/features/permissions/services/permissionService.ts
```

Do not scatter direct role checks throughout components.

Bad:

```ts
if (user.role === "admin") {
  // ...
}
```

Good:

```ts
permissionService.canManageDesigns(user)
```

### Minimum Permission Methods

The permission service should expose:

- `canManageUsers(user)`
- `canManageRoles(user)`
- `canManageSettings(user)`
- `canManageDesigns(user)`
- `canImportDesigns(user)`
- `canManageQueues(user)`
- `canManageCustomers(user)`
- `canManageRequests(user)`
- `canViewAuditLogs(user)`
- `canViewOriginals(user)`
- `canSubmitCustomerRequests(user)`
- `canViewOwnCustomerRequests(user, customerId)`

Permission service results are for application behavior and UI convenience only. Firebase security rules must enforce access independently.

## Security Rules Plan

Security rules are mandatory.

Default policy:

```txt
Deny by default.
Explicitly allow only approved access.
```

All protected data requires authentication.

### Firestore Rules

#### Users

- Users can read their own `users/{uid}` document.
- Owners and admins can read user documents for administration.
- Only owners can change roles or ownership-sensitive fields.
- Admins cannot modify owner accounts.
- Customers cannot list all users.

#### Designs

- Owner, admin, and helper roles can read and manage internal design metadata according to permission.
- Customers can read only approved customer-facing design metadata.
- Customers cannot read internal notes, review fields, private metadata, or original asset metadata if those fields are later separated.

#### Customer Requests

- Customers can create requests for themselves.
- Customers can read only their own requests.
- Owner, admin, and helper roles can review requests according to permission.
- Customers cannot read requests belonging to other customers.

#### Show Queues And Queue Items

- Owner, admin, and helper roles can access queue data according to permission.
- Customers cannot access internal queue management data.
- Customer-facing queue data must be intentionally modeled before exposure.

#### Settings

- Owner and admin roles can read settings.
- Owner role should control sensitive setting changes.
- Customers are denied.

#### Audit Logs

- Owner and admin roles can read audit logs.
- Audit logs are append-only.
- Clients cannot update or delete audit logs.
- Audit logs should capture user, action, entity, and timestamp.

### Storage Rules

#### Originals

```txt
/originals/
```

- Owner, admin, and helper roles only.
- Customers denied.
- Anonymous users denied.

#### Thumbnails

```txt
/thumbnails/
```

- Readable by authenticated users when tied to customer-visible designs.
- Writes restricted to authorized staff workflows.

#### Previews

```txt
/previews/
```

- Readable by authenticated users when tied to customer-visible designs.
- Writes restricted to authorized staff workflows.

#### Customer Uploads

```txt
/customer-uploads/{requestId}/
```

- Request owner can access their own upload files.
- Owner, admin, and authorized helper roles can access uploads for review.
- Other customers denied.

#### Storage Write Requirements

All writes must enforce:

- Authentication
- Role or ownership authorization
- Allowed content types
- File size limits
- Approved path structure

## UI Considerations

No UI is implemented by this plan.

Future authentication UI must follow `docs/STYLE_GUIDE.md` and include:

- Loading states
- Error states
- Inactive account state
- Missing profile state
- Accessible forms
- Light and dark theme support
- Shared UI components

Components must call hooks, hooks must coordinate services, and services must call Firebase.

## Setup Documentation Requirements

Future implementation must create or update setup documentation under:

```txt
docs/setup/
```

Required setup guides:

- `docs/setup/firebase-project-setup.md`
- `docs/setup/firebase-auth-setup.md`
- `docs/setup/firestore-setup.md`
- `docs/setup/firebase-storage-setup.md`
- `docs/setup/environment-variables.md`

Each setup guide must include:

1. Purpose
2. Prerequisites
3. Step-by-step instructions
4. Verification steps
5. Common mistakes
6. Completion checklist

## Test Plan

### Firebase Configuration

- Verify Firebase initializes only once.
- Verify missing environment variables produce a clear failure.
- Verify `app`, `auth`, `firestore`, and `storage` are exported from the single config file.

### Authentication

- Verify Email/Password login succeeds for a seeded Firebase Auth user with a matching Firestore profile.
- Verify login blocks authenticated users with no `users/{uid}` document.
- Verify login blocks users with `isActive: false`.
- Verify logout clears protected app access.

### Permissions

- Verify each role maps to expected permission service results.
- Verify owner has full platform permissions.
- Verify admin cannot modify owner accounts or platform ownership.
- Verify helper permissions do not include unrestricted administration.
- Verify customer permissions are limited to customer-facing actions.

### Firestore Rules

- Verify unauthenticated reads and writes are denied by default.
- Verify users can read their own profile.
- Verify customers cannot list all users.
- Verify customers cannot read other customer requests.
- Verify customers cannot read settings, audit logs, or internal queue data.
- Verify owner, admin, and helper access matches the role policy.
- Verify audit logs cannot be updated or deleted by clients.

### Storage Rules

- Verify unauthenticated reads and writes are denied by default.
- Verify customers cannot read `/originals/`.
- Verify authorized staff can read originals.
- Verify customer uploads are limited to the owning request and authorized staff.
- Verify writes reject unsupported content types and oversized files.

## Risks

- Weak security rules could expose customer data or production originals.
- Duplicated role logic could cause UI permissions and backend rules to drift.
- Missing Firestore user records could leave authenticated users unable to enter the app.
- Premature advanced collections could create roadmap drift.
- Permanent download URLs could leak files or become stale.
- Unplanned Admin SDK usage could expose secrets if placed in the renderer.

## Future Expansion Considerations

- Separate development and production Firebase projects may be introduced later with explicit approval.
- Cloud Functions may later support server-enforced audit logging, role changes, notifications, and validation.
- Additional auth providers may be added later with approval.
- Future customer website and mobile app must reuse the same Firebase backend, shared types, and permission concepts.
- Future upload workflows must build on the Storage path standards in this plan.

## Assumptions

- Phase 1 uses a single Firebase project unless a separate dev/prod split is explicitly approved.
- Email/Password is the only initial auth provider.
- No Cloud Functions are required for the initial foundation.
- No Firebase Admin SDK is used in the renderer.
- No image import, ZIP processing, thumbnails, AI, customer request workflow, or customer website UI is implemented as part of this plan.
- Setup documentation will be created alongside implementation so future developers can reproduce the Firebase configuration.

## Completion Checklist

- Architecture respected.
- Correct Phase 1 scope maintained.
- Correct Firebase ownership identified.
- Correct feature folders identified.
- Required collections listed.
- Required roles listed.
- Permission service responsibilities listed.
- Security rule expectations documented.
- Storage paths documented.
- Test scenarios documented.
- Future setup documentation requirements recorded.
