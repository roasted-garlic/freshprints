# 04 — Security Rules

Philosophy and reusable patterns from `firestore.rules` and `storage.rules`.

**Portable** helpers and user-collection patterns can be copied to a new app. **Fresh Prints–specific** domain validators (designs, categories) illustrate depth — customize for your entities.

---

## Philosophy

| Principle | Implementation |
|-----------|----------------|
| Default deny | Catch-all `match /{document=**}` or `match /{allPaths=**}` → `false` |
| Auth ≠ authorization | `request.auth != null` plus Firestore `users/{uid}` role lookup |
| Client cannot escalate | Users collection: no client writes |
| Validate shape on write | `request.resource.data` field checks |
| Immutable audit fields | `createdBy`, `createdAt`, `uploadedBy` unchanged on update |
| UI is not security | Same checks in rules as in `permissionService` |

Source docs: `docs/standards/SECURITY.md`, `docs/architecture/FIREBASE.md`

---

## Firestore Rule Helpers — Portable

**Path:** `firestore.rules` (lines 5–43)

```javascript
function isSignedIn() {
  return request.auth != null;
}

function callerUser() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}

function callerIsActive() {
  return isSignedIn() && callerUser().isActive == true;
}

function callerRole() {
  return callerUser().role;
}

function isOwner() {
  return callerIsActive() && callerRole() == "owner";
}

function isAdmin() {
  return callerIsActive() && callerRole() == "admin";
}

function isStaff() {
  return callerIsActive() && callerRole() in ["owner", "admin", "helper"];
}

function isOwnerOrAdmin() {
  return callerIsActive() && callerRole() in ["owner", "admin"];
}

function isSelf(userId) {
  return isSignedIn() && request.auth.uid == userId;
}
```

**Copy:** All of the above into a new project (adjust role strings if your app differs).

**Caveat:** `callerUser()` fails if `users/{uid}` does not exist — appropriate for apps that require profiles.

### Optional field validators — Portable

```javascript
function isOptionalString(data, field) {
  return !(field in data) || data[field] is string;
}
// isOptionalNumber, isOptionalBool, isOptionalTimestamp, isOptionalMap
```

---

## Users Collection Rules — Portable

**Path:** `firestore.rules` (lines 168–174)

```javascript
match /users/{userId} {
  allow read: if isSelf(userId)
    || (isOwner() && isReadableTeamProfile(resource.data.role))
    || (isAdmin() && resource.data.role in ["admin", "helper"]);

  allow create, update, delete: if false;
}
```

| Rule | Rationale |
|------|-----------|
| Self-read | User loads own profile for auth bootstrap |
| Owner/admin team read | User management UI |
| Deny all writes | Provisioning via Console or Admin SDK only |

`isReadableTeamProfile` — **Fresh Prints–specific** role list; adapt to your roles.

**Replication:** Always deny client writes to `users`. Use Cloud Functions or manual console for provisioning.

---

## Exemplar Entity Rules (Designs) — Fresh Prints–specific pattern

**Path:** `firestore.rules` (lines 176–197)

Portable **pattern** to adapt:

```javascript
match /items/{itemId} {
  allow read: if isStaff();

  allow create: if isStaff()
    && itemRequiredFieldsValid(request.resource.data)
    && request.resource.data.id == itemId
    && request.resource.data.createdBy == request.auth.uid
    && request.resource.data.updatedBy == request.auth.uid;

  allow update: if isStaff()
    && itemRequiredFieldsValid(request.resource.data)
    && request.resource.data.id == itemId
    && request.resource.data.id == resource.data.id
    && request.resource.data.createdBy == resource.data.createdBy
    && request.resource.data.createdAt == resource.data.createdAt
    && request.resource.data.updatedBy == request.auth.uid;

  allow delete: if false;  // soft-delete via status field instead
}
```

Fresh Prints validates extensive design fields (`designRequiredFieldsValid`) — copy the **structure**, not every field.

### AI / server-only fields — Fresh Prints–specific

```javascript
function clientAiFieldsUnchanged() {
  return request.resource.data.get("aiSuggestions", null) == resource.data.get("aiSuggestions", null)
    && /* ... */;
}
```

Use similar guards when Cloud Functions own certain fields.

---

## Storage Rules — Portable pattern

**Path:** `storage.rules`

### Firestore lookup from Storage rules

```javascript
function callerUser() {
  return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data;
}

function isStaff() {
  return request.auth != null
    && callerUser().isActive == true
    && callerUser().role in ["owner", "admin", "helper"];
}
```

Storage rules can read Firestore for authorization — same role model as Firestore rules.

### Path + content validation — adapt to your files

**Fresh Prints–specific** paths:

```javascript
match /originals/{fileName} {
  allow read: if isStaff() && isCanonicalOriginalFileName(fileName);
  allow create: if isStaff()
    && isCanonicalOriginalFileName(fileName)
    && isValidOriginalUpload();
  // update, delete similarly
}
```

Validators:

- `isCanonicalOriginalFileName` — regex `[A-Za-z0-9_-]+\.png`
- `isValidOriginalUpload` — size &lt; 150 MB, `contentType == "image/png"`

**Portable:** Default deny at end:

```javascript
match /{allPaths=**} {
  allow read, write: if false;
}
```

---

## What to Copy vs Customize

| Copy as-is (portable) | Customize per app |
|----------------------|-------------------|
| `isSignedIn`, `callerUser`, `callerIsActive` | Role names in `isStaff`, etc. |
| `users` deny-write + self-read | Team read rules for your admin model |
| Storage `callerUser` + default deny | Path segments, file extensions, size limits |
| `createdBy`/`updatedBy` immutability pattern | Entity-specific required fields |
| Default deny catch-all | Collection names |

| Do not copy (Fresh Prints domain) | Unless needed |
|-----------------------------------|---------------|
| `designRequiredFieldsValid` | Design catalog app |
| `categoryRequiredFieldsValid` | Category management |
| `clientAiFieldsUnchanged` | AI pipeline |
| `/originals`, `/thumbnails`, `/previews` paths | Same storage layout |

---

## Rules Deployment

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only firestore:indexes
```

Dry run (storage):

```bash
firebase deploy --only storage --dry-run
```

**Reference:** `docs/standards/DEPLOYMENT.md`, `docs/workflow/setup/firestore-setup.md`, `docs/workflow/setup/firebase-storage-setup.md`

`[NEEDS HUMAN INPUT]` — deploy targets production/staging Firebase projects; requires human console login.

---

## Rules / Client Alignment Checklist

| Check | Firestore | Storage |
|-------|-----------|---------|
| Staff roles match `permissionService` | `isStaff()` roles | Same role array |
| Inactive users blocked | `callerIsActive()` | `callerUser().isActive` |
| Path in doc matches rule path | `originalPath` validated in service | `fileName` regex in rules |
| Client cannot write users | `allow create, update, delete: if false` | N/A |

---

## Common Failure Modes

| Symptom | Likely cause |
|---------|----------------|
| `permission-denied` on login profile load | `users/{uid}` read rule or missing doc |
| `permission-denied` on upload | Storage rules not deployed; wrong path shape |
| `callerUser()` null error | No Firestore profile for signed-in user |
| Index error on query | Missing composite index in `firestore.indexes.json` |

---

## Indexes — Fresh Prints–specific

**Path:** `firestore.indexes.json`

Indexes are required only for compound queries. Minimal replication needs **users** queries only (e.g. `where("role", "in", [...])` may need an index).

Deploy: `firebase deploy --only firestore:indexes`

For a new app, add indexes when Firestore error messages link to console index creator.
