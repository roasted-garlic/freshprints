# Fresh Prints Security Standards

## Purpose

This document defines the security architecture and security requirements for the Fresh Prints platform.

This document is the source of truth for:

* Authentication
* Authorization
* User Roles
* Firebase Security
* Firestore Security
* Storage Security
* Electron Security
* IPC Security
* Customer Data Protection
* File Upload Security

Security is not optional.

Security must be considered before implementing features.

---

# Core Security Principles

## Never Trust Client Input

All input must be considered untrusted.

Examples:

* Form input
* Search input
* Customer uploads
* URL parameters
* Query strings
* File names
* Metadata

All input must be validated.

---

## Defense In Depth

Do not rely on a single layer of security.

Security should exist at:

* UI Layer
* Service Layer
* Firebase Rules
* Electron Layer
* Storage Layer

---

## Least Privilege

Users should only have access to what they need.

Grant minimum permissions.

Avoid broad access.

---

## Default Deny

If permission is unclear:

Deny access.

Explicitly allow actions.

Never assume access should be granted.

---

# Authentication

Authentication answers:

```txt id="91qx4i"
Who is this user?
```

Authentication does NOT answer:

```txt id="n0vkk5"
What are they allowed to do?
```

---

# Authentication Provider

Use:

```txt id="esifsv"
Firebase Authentication
```

Supported providers:

```txt id="3r9ud0"
Email / Password
```

Future providers require approval.

---

# Authentication Requirements

All protected routes require authentication.

Protected resources require authentication.

Protected file downloads require authentication.

Protected queue management requires authentication.

---

# Authorization

Authorization answers:

```txt id="jlwm31"
What can this user do?
```

Authorization is separate from authentication.

---

# Supported Roles

```ts id="u0lsix"
export type UserRole =
  | "owner"
  | "admin"
  | "helper"
  | "customer";
```

---

# Owner Permissions

Owners can:

* Manage users
* Manage roles
* Manage settings
* Manage imports
* Manage designs
* Manage queues
* Manage customers
* Manage requests
* Access audit logs
* Use **Test Data Reset** (`/test-data-reset`) in **development Studio builds only**, and only when connected to the allowlisted Firebase project (`fresh-prints-dev`), via `wipeOperationalTestData` — owner role required; never for production project IDs; never exposed in production Studio builds

Owners have full platform access.

---

# Admin Permissions

Admins can:

* Manage designs
* Manage imports
* Manage queues
* Manage requests
* Manage customers
* View the Users directory and manage helper accounts through the `updateTeamUser` callable function
* Edit helper status in the Users directory edit modal

Admins cannot:

* Use **Test Data Reset** / `wipeOperationalTestData` (owner + allowlisted dev project + development Studio build only)
* Modify owner accounts
* Change platform ownership
* Deactivate or reactivate other admins
* Edit owner or admin accounts
* Change user roles

---

# User Status Management

Team user activation, deactivation, and role changes must never be performed from the renderer with direct Firestore writes.

Allowed flow:

```txt
Desktop app
  ↓
updateTeamUser callable
  ↓
Firebase Admin SDK
  ↓
Firebase Auth disabled flag + Firestore users/{uid}.isActive (+ role when applicable)
```

Rules:

* Owners can activate/deactivate admins and helpers.
* Owners can change admin/helper roles for non-owner targets.
* Owners can activate/deactivate other owners, but cannot deactivate themselves.
* Fresh Prints must keep at least one active owner.
* Admins can activate/deactivate helpers only.
* Admins cannot edit owners or other admins.
* Helpers and customers cannot call user management functions.
* UI permission helpers are not a security boundary. Cloud Functions enforce the final rules.

---

# Helper Permissions

Helpers can:

* Import designs
* Organize designs
* Tag designs
* Categorize designs
* Review requests
* Manage queues if allowed

Helpers should not have unrestricted administrative access.

---

# Customer Permissions

Customers can:

* Browse approved designs
* Submit requests
* Upload request images
* View their own requests

Customers cannot:

* View admin data
* View helper data
* View private queue data
* Download originals

---

# Permission Architecture

Permissions should be centralized.

Create:

```txt id="2abg87"
permissionService.ts
```

Do not scatter role checks throughout the application.

Bad:

```ts id="1f3cm0"
if (user.role === "admin")
```

Repeated across dozens of files.

Good:

```ts id="vphl4z"
permissionService.canManageDesigns(user)
```

---

# Firebase Security Philosophy

Security does not belong only in the UI.

The frontend should not be trusted.

Firebase Rules are mandatory.

All access must be enforced at the backend level.

---

# Firestore Security

Every collection must have security rules.

Never leave collections open.

Bad:

```txt id="36z8nr"
allow read, write: if true;
```

Never use this in production.

---

# User Document Security

Users may read:

* Their own profile

Admins may read:

* User profiles needed for administration

Customers may not read all users.

---

# Design Security

## Desktop App (Phase 2A / Phase 2C)

Active staff (`owner`, `admin`, `helper`) may read and write design catalog records through `designService`.

| Action | Owner | Admin | Helper |
|--------|-------|-------|--------|
| View designs / categories | Yes | Yes | Yes |
| Create / edit / archive designs | Yes | Yes | Yes |
| Assign existing category on design edit | Yes | Yes | Yes |
| Create / edit / archive categories | Yes | Yes | No |
| View approved tag library | Yes | Yes | Yes |
| Create / edit / archive approved tags | Yes | Yes | No |
| Bulk import approved tag JSON | Yes | No | No |
| Approve AI suggested-new-tags | Yes | Yes | No |

Permission checks use `permissionService` in the renderer and matching Firestore rules. UI must not expose category management write actions to helpers.

Helpers may assign existing categories to designs but cannot manage category documents.

Helpers may view approved tags and use existing design tag strings, but cannot create, edit,
archive, bulk import, or approve suggested tag records.

Customers cannot access the desktop app and have no Firestore read access to `designs`, `categories`, or `tags` in the current rules.

Category documents are readable by active staff. Category create/update/archive is restricted to `owner` and `admin`.

Tag documents are readable by active staff. Tag create/update/archive is restricted to `owner` and `admin`; bulk import is additionally owner-only at the UI/service layer. Firestore rules block tag deletes.

Design and category documents use soft archive patterns:

* Designs: `status: "archived"`
* Categories: `isActive: false`

## Audit Metadata (Phase 3A)

Design and category documents store:

* `createdBy` — set on create; immutable after creation
* `updatedBy` — set on create; must equal the authenticated user on every update
* `createdAt` — immutable after creation
* `updatedAt` — refreshed on every update

Firestore rules enforce:

* Create: `createdBy == request.auth.uid` and `updatedBy == request.auth.uid`
* Update: `createdBy` and `createdAt` cannot change when already present; `updatedBy == request.auth.uid`

Services set audit fields in `designService` and `categoryService`. UI must not accept audit fields from user input.

## Phase 3C derivative lifecycle (Step 6)

`designReadyService.markDesignProcessing` and `designReadyService.markDesignDerivativesComplete` update design documents through `designService.updateDesign` during Phase 3C import. `markDesignReady` is reserved for a future post-AI-review phase and is not called from import orchestration.

Existing `firestore.rules` already allow:

* `status` transitions via workflow services only (`designReadyService`, `catalogApprovalService`, `archiveDesign`, `restoreDesign`) — not from Edit Design metadata saves
* `thumbnailPath` and `previewPath` updates on staff edit
* `updatedBy` set to the authenticated caller on update
* Immutable `createdAt`, `createdBy`, and `uploadedBy` on update

**No Firestore rules changes required for Step 6.** `firebase deploy --only firestore:rules` is not required unless rules are edited separately.

## AI review foundation (Phase 3D Step 5)

AI review fields are system-controlled. Catalog edit forms must not write `aiReviewStatus`, `aiReviewedAt`, `aiReviewedBy`, `aiReviewVersion`, `aiReviewNotes`, or `aiReviewConfidence`.

| Action | Owner | Admin | Helper |
|--------|-------|-------|--------|
| View AI review fields | Yes | Yes | Yes |
| Approve / reject / override AI review | Yes | Yes | No |

Mutations use `designAiReviewService` with `permissionService.canManageAiReview`. Step 5 exposes read-only review display in Design Details only — no review action buttons yet.

## Catalog approval foundation (Phase 3D Step 6)

| Action | Owner | Admin | Helper |
|--------|-------|-------|--------|
| Approve design for catalog (`ready`) | Yes | Yes | No |
| Reject design from catalog | Yes | Yes | No |
| View catalog / AI review status | Yes | Yes | Yes |

`catalogApprovalService` coordinates `status` and `aiReview*` fields. Helpers cannot approve or reject. UI action buttons are deferred to a future AI Review page.

**Future server-side enforcement:** Cloud Functions should validate owner/admin role and catalog transition rules before writes. Current staff Firestore rules allow any active staff to update design documents — service-layer checks are required until role-scoped rules or Functions are added.

**Firestore rules (Step 6):** `queued` and `printed` remain accepted on reads/updates for legacy document compatibility. New application writes block deprecated statuses in `designService`. Rules comment updated; **deploy optional** (no validator tightening).

Hard deletes are denied in Firestore rules.

## Fresh Prints Portal (Phase 8+)

Fresh Prints Portal will receive read access to approved catalog metadata only (for example `status: "ready"` designs and thumbnail paths).

Customers must not receive:

* Original file paths or downloads
* Internal pipeline metadata
* Admin-only fields

Fresh Prints Portal Firestore and Storage rules are not implemented in Phase 2A.

---

Customers should only see:

* Approved designs
* Public design metadata

Customers should never access:

* Internal notes
* Admin review notes
* Private metadata

---

# Customer Request Security

Customers may:

* Create requests
* Read their own requests

Customers may not:

* Read requests belonging to others

Admins and helpers may review requests based on permissions.

---

# Print Requests Security

Print Requests are staff-managed Phase 6 Studio records.

Firestore rules and `permissionService` should stay aligned:

* Active staff (`owner`, `admin`, `helper`) may read `printRequests`, `printRequestItems`, and `customers`
* Active staff may create and update `printRequests`
* Active staff may create, update, and remove `printRequestItems`
* Active staff may create and update `customers`
* Active staff may create/update/delete customer username reservation documents
* Active staff may read/update the `counters/printRequests` internal request counter
* Customer role has no Studio access to these collections yet

### Staff inbox acknowledgments

* Active staff may read, create, and delete their own `staffInboxAcks` documents (`userId == auth.uid`)
* Acks are per staff user (not team-shared); Open alerts remain derived from portal queue data
* Customers have no access to `staffInboxAcks`

The standard Print Request detail page does not expose arbitrary request-name or request-status
writes. Customer request names and all request sequences are locked after creation. Internal
requests may manually save the internal base name when a usable locked sequence exists; the service
re-derives the persisted display name from `internalBaseName` and `requestSequenceNumber`.

Request items own production status:

* `pending`
* `queued`
* `in_progress`
* `printed`
* `done`
* `canceled`

Design documents must not receive production status writes from Print Requests.

Standard Print Request item quantity and requested-size edits autosave. These edits preserve hidden
`notes` and `status` fields. The standard item UI does not expose item notes or production status
controls.

Customer usernames are staff-managed in Studio for Phase 6. Duplicate usernames are blocked through
transactional reservation documents, not query-only checks. Firestore rules updates for username
reservations and counters require a separate deploy checkpoint.

Local Firestore rules allow the approved `internalBaseName`, `nameFormatVersion`, and item
`sortOrder` metadata fields for Phase 6 compatibility. Deploying those rule changes remains a
separate human checkpoint.

Print Request origin metadata is explicit and optional for legacy compatibility. New Studio writes
set `requestOrigin` to `studio_internal` or `studio_customer`; `portal_customer` is reserved for
future Portal writes. Firestore rules validate the value and require it to align with the internal
or customer assignment when present, but existing documents without `requestOrigin` remain readable.
Origin metadata does not grant customer Portal write access in Phase 6, and any Firestore rules
deploy remains a separate human checkpoint.

---

# Queue Security

Customers should not access internal queue management data.

Queue management is primarily an admin feature.

Customer-facing queue data should be intentionally exposed if needed.

---

# Settings Security

Settings should only be accessible by:

```txt id="6a7y18"
owner
admin
```

Never expose settings documents to customers.

---

# Audit Log Security

Audit logs should be restricted.

Only:

```txt id="jqvynh"
owner
admin
```

may access audit logs.

Audit logs should never be editable.

---

# Firebase Storage Security

Storage access must be restricted.

Never expose unrestricted storage access.

---

# Original Image Security

Original files:

```txt id="r7x5y4"
/originals/
```

should be restricted to:

```txt id="hjpj1m"
owner
admin
helper
```

Customers should never access originals.

## Storage Rules (Phase 3A-3)

Rules file:

```txt
storage.rules
```

Implemented constraints:

* Authenticated active staff (`owner`, `admin`, `helper`) may read, write, and delete `/originals/{designId}.png`.
* Original uploads require `contentType == "image/png"` and size under **150 MB** (synced with `MAX_SINGLE_PNG_SIZE_BYTES` in `shared/constants/importValidation.constants.ts` and `storage.rules`).
* Authenticated active staff may read, write, and delete `/thumbnails/{designId}.webp` and `/previews/{designId}.webp`.
* Derivative uploads require `contentType == "image/webp"`, canonical `{designId}.webp` filenames, and size under 10 MB.
* All other paths default deny.
* Customers and unauthenticated users are denied.

Deploy:

```bash
firebase deploy --only storage
```

Rules are not live until deployed. Verify derivative upload QA only after deploy.

---

# Thumbnail Security

Thumbnails may be visible to customers.

Depending on future requirements:

```txt id="qmkms0"
/thumbnails/
```

may be customer accessible.

---

# Customer Upload Security

Customer uploads:

```txt
/customer-uploads/
```

must be protected (ADR-FP-073 — Phase 8 request artwork, not Phase 9 custom requests).

## Design (Sub-phase B implemented in repo; deploy to `fresh-prints-dev` before Portal UI)

* Customers access only their own uploads and their own print requests.
* Other customers must not read unapproved artwork.
* Staff access uses centralized Studio permissions.
* Storage rules enforce: canonical path, owner (`userId == auth.uid`), max size (25 MB source / 50 MB ZIP), allowed source/ZIP types.
* Customers may write only `source` and `archive.zip`; derivatives are Admin SDK / Functions only.
* Upload lifecycle / `technicalStatus` / path-to-doc binding are validated in **finalize callables**, not via complex Storage↔Firestore status coupling.
* Ready-catalog derivative public-read patterns must **not** apply to unapproved customer uploads.
* First-release formats: transparent PNG and static transparent WebP only. SVG deferred. JPEG and animated formats rejected.
* ZIP: server-side extract only (`yauzl`); nested ZIPs rejected; customer limits ≪ staff import limits.
* Portal customers clear Current Request via `clearPortalWorkingPrintRequest` (Admin SDK soft-archive); customer Firestore rules still lock `status` on direct updates.
* Owner/admin may run `archiveStaleWorkingPrintRequests` to soft-archive empty working carts older than 14 days.
  * Print-request: create batch **100** / finalize image **200** / finalize ZIP **5**
  * Catalog-donation: create batch **200** / finalize image **500** / finalize ZIP **20**
  * Concurrent finalize leases remain shared: max **8**
* Firestore: client writes denied on `customerUploads` / `customerUploadBatches`; rate-limit / lease / idempotency collections deny all client access.
* UI checks are not authorization.

Customers should only access:

* Their uploads
* Their requests

---

# Upload Validation

All uploads must validate:

* File type
* File size
* Extension
* Content when possible (server decode + magic bytes)

Never trust file names.

Never trust extensions alone.

---

# File Size Limits

All uploads should enforce size limits.

Large uploads should be rejected.

Customer Portal limits (locked): single image 25 MB; batch 25 files / 100 MB; ZIP 50 MB compressed / 200 MB decompressed. Staff Studio import limits remain separate.

---

# File Type Validation

Allowed customer uploads (first release):

```txt
PNG (transparent)
WebP (static, transparent)
```

Reject unknown formats.

Reject executable files.

Reject JPEG and other opaque-only formats for this feature.

Accept ZIP only through trusted server extraction with bomb/traversal protections.

---

# Electron Security

Electron introduces additional security concerns.

Security must be taken seriously.

---

# Context Isolation

Always enable:

```ts id="d6b8wz"
contextIsolation: true
```

Required.

Never disable.

---

# Text Input Context Menu

The main process attaches a minimal `context-menu` handler to each `BrowserWindow` (`apps/studio/electron/services/app/textInputContextMenu.ts`).

Allowed actions for editable fields:

* Cut
* Copy
* Paste
* Select all

Uses Electron built-in menu roles only. No filesystem actions, devtools, or renderer Node exposure.

---

# Node Integration

Never enable:

```ts id="c5nzy5"
nodeIntegration: true
```

unless absolutely required and approved.

---

# Preload Security

Expose minimal APIs.

Good:

```ts id="6r9qaf"
window.freshPrints.files.selectZip()
```

Bad:

```ts id="0hzq5u"
window.fs
```

Never expose raw filesystem access.

---

# IPC Security

All IPC handlers must validate input.

Never trust renderer input.

Bad:

```ts id="v2s9rm"
ipcMain.handle("delete-file", (path) => {
  fs.unlinkSync(path);
});
```

Good:

```txt id="zv4x55"
Validate
Authorize
Execute
```

---

# Filesystem Security

Only allow access to approved paths.

Never allow arbitrary filesystem access.

Avoid exposing full local paths to untrusted users.

Batch folder import scans only the folder root registered in `importBatchSession` at picker time. The renderer cannot supply arbitrary folder paths to discovery. Symlinks are not followed. Recursive scans enforce `MAX_FOLDER_DEPTH` and `MAX_FOLDER_SCAN_ENTRIES` limits.

Batch upload byte reads accept either a single-file session path (string) or `{ jobId, filePath }` for batch sessions. For batch reads, the main process verifies:

* The `jobId` matches an active batch session for the calling window
* Session status is `discovering` (post-discovery, pre-`finishBatchJob`)
* `filePath` was registered via `registerBatchValidatedPath` during discovery

Unregistered or unvalidated paths are rejected with structured IPC errors. Batch reads do not re-validate PNG content — discovery already validated each file.

---

# Secrets Management

Secrets must never be committed.

Use:

```txt id="6h59d5"
.env
.env.local
```

Never commit:

```txt id="fnl7rz"
serviceAccount.json
```

Never commit private keys.

---

# AI Provider Secrets (Phase 5B)

Google AI (Gemini) **provider API key** for server-side AI enrichment:

| Allowed | Forbidden |
|---------|-----------|
| Firebase Secret Manager (`GEMINI_API_KEY`) | Firestore `settings` or any document field |
| Cloud Functions reading bound secrets | Desktop Settings page API-key fields |
| Documented setup in `FIREBASE.md` / `DEPLOYMENT.md` | Renderer env vars, preload, or IPC exposing keys |

The Electron renderer may call `enqueueAiEnrichment` but must **never** receive the Gemini key. Development environments may run the heuristic provider without a real key; production Gemini vision requires Secret Manager configuration with human approval. As of ADR-FP-040, OpenAI is no longer used and `OPENAI_API_KEY` was removed from Cloud Function code.

---

# Firebase Admin SDK

Firebase Admin SDK should never run in the renderer.

Never expose admin credentials.

Admin SDK usage must be isolated and approved.

---

# Customer Data Protection

Protect:

* Email addresses
* Request history
* Uploaded files
* Internal notes

Only expose data necessary for customer workflows.

---

# Internal Notes Security

Admin notes should never be visible to customers.

Helper notes should never be visible to customers.

Review notes should remain internal.

---

# Download Security

Original file downloads require:

* Authentication
* Authorization

Never provide unrestricted download URLs.

Verify permissions before downloads.

---

# Logging Security

Never log:

* Passwords
* Tokens
* Secrets
* Sensitive customer information

Logs should be sanitized.

---

# Audit Logging

Audit logs should capture:

* User
* Action
* Entity
* Timestamp

Examples:

```txt id="0oy0m5"
Design Imported
Queue Updated
Role Changed
Request Approved
```

Audit logs should not be editable.

---

# Security Review Checklist

Before releasing a feature:

* Authentication checked
* Authorization checked
* Firestore rules considered
* Storage rules considered
* Upload validation added
* Sensitive data protected
* Electron security reviewed
* IPC input validated
* Secrets protected
* Logging sanitized

---

# Future Security Enhancements

Future additions may include:

* Rate limiting
* Cloud Functions validation
* Security monitoring
* Suspicious activity alerts
* Two-factor authentication

Do not build dependencies on these features today.

---

# Security Rule

When uncertain:

Choose the more secure option.

If a feature conflicts with security:

Security wins.

Always.
