# Firebase Storage Setup

## Purpose

This guide covers only Firebase Storage setup for Fresh Prints:

- Enabling Firebase Storage
- Recording the bucket name
- Reviewing required Storage paths
- Installing recommended starting Storage rules for development
- Verifying Storage access and rules behavior

This guide does not cover Firebase project creation, Firebase Web app registration, Firestore setup, Firestore rules, environment variable setup, or application code.

## Prerequisites

Before starting, confirm:

- The Fresh Prints Firebase project exists.
- The Firebase Web app has been registered.
- You can access the Firebase console:

```txt
https://console.firebase.google.com/
```

- You have permission to approve billing changes if Firebase requires a billing plan for Storage.
- You have reviewed:

```txt
docs/AI_RULES.md
docs/ARCHITECTURE.md
docs/FIREBASE.md
docs/DATA_MODEL.md
docs/SECURITY.md
docs/WORKFLOWS.md
```

## Step-By-Step Setup

### Step 1: Open Storage

1. Open the Firebase console.
2. Select the Fresh Prints Firebase project.
3. Go to:

```txt
Build > Storage
```

### Step 2: Enable Firebase Storage

1. Click **Get started**.
2. Review any billing prompt carefully.

Do not enable billing unless the project owner approves it.

3. Choose a Storage location.

Recommended starting location:

```txt
us-central1
```

4. Record the selected location.
5. Choose locked-down rules if prompted.
6. Click **Done**.

### Step 3: Record The Bucket Name

Open:

```txt
Storage > Files
```

Record the exact bucket name shown by Firebase.

New Firebase projects often use:

```txt
PROJECT_ID.firebasestorage.app
```

Older Firebase projects may use:

```txt
PROJECT_ID.appspot.com
```

### Step 4: Review Required Storage Paths

Fresh Prints uses these top-level Storage paths:

```txt
/originals/
/thumbnails/
/previews/
/customer-uploads/
```

Path ownership:

| Path | Purpose |
| --- | --- |
| `/originals/` | High-quality production assets |
| `/thumbnails/` | Small images for grids, search, and customer browsing |
| `/previews/` | Medium-resolution display images |
| `/customer-uploads/` | Customer-submitted request files |

Do not upload placeholder files unless explicitly approved.

### Step 5: Configure Storage Rules

Open:

```txt
Storage > Rules
```

Replace unsafe rules with the staff rules in the repository root file:

```txt
storage.rules
```

Deploy from the project root:

```bash
firebase deploy --only storage
```

Phase 3A-3 rules allow authenticated active staff to upload `/originals/{designId}.png` with `image/png` content type and a 50 MB size cap.

Phase 3C Step 5 rules extend staff access to:

* `/thumbnails/{designId}.webp` — WebP only, 10 MB cap, canonical filename
* `/previews/{designId}.webp` — WebP only, 10 MB cap, canonical filename

Customer access to derivatives remains denied in Phase 3C. All other paths are denied by default.

Deploy after updating rules:

```bash
firebase deploy --only storage
```

Rules are not live until deployed.

## Legacy Deny-All Rules (pre-Phase 3A-3)

These rules deny all reads and writes while upload/download workflows are not implemented.

```txt
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Do not use:

```txt
allow read, write: if true;
```

Do not make `/originals/` public.

Do not allow anonymous uploads.

## Production Security Notes

Production Storage rules must:

- Default deny unspecified access.
- Require authentication for protected files.
- Restrict `/originals/` to owner/admin/helper.
- Prevent customers from reading originals.
- Restrict `/customer-uploads/{requestId}/` to the request owner and authorized staff.
- Verify ownership and visibility against Firestore metadata.
- Enforce file size limits.
- Enforce allowed content types.
- Reject unsupported file types.
- Reject executable files.
- Support stable Storage paths stored in Firestore.

Storage paths stored in Firestore should look like:

```txt
/originals/{designId}.png
/thumbnails/{designId}.webp
/previews/{designId}.webp
/customer-uploads/{requestId}/original.png
```

Do not use permanent download URLs as canonical file references.

## Verification Steps

### Console Verification

- Firebase Storage is enabled.
- Storage location is recorded.
- Bucket name is recorded.
- Rules are not publicly open.
- No unexpected files are present.
- No placeholder files were created without approval.

### Rules Verification

With deployed staff rules:

- Unauthenticated reads and writes are denied on all design paths.
- Inactive or customer accounts are denied on `/originals/`, `/thumbnails/`, and `/previews/`.
- Active staff (`owner`, `admin`, `helper`) may read/write/delete canonical `/originals/{designId}.png` (PNG, 50 MB cap).
- Active staff may read/write/delete canonical `/thumbnails/{designId}.webp` and `/previews/{designId}.webp` (WebP, 10 MB cap).
- `/originals/`, `/thumbnails/`, and `/previews/` are not public.
- `/customer-uploads/` is not writable.

### App Verification

After the app is configured:

- Firebase connection diagnostics should show Storage as **Connected** or **Protected by rules**.
- **Protected by rules** means Storage responded and denied the diagnostic request. That is expected with locked-down starter rules.
- Permission-denied responses do not mean Firebase is unreachable.
- No upload workflow exists until approved in a later phase.

## Common Mistakes

### Guessing The Bucket Name

Use the exact bucket shown by Firebase. Do not assume the suffix.

### Making Originals Public

Customers must never access `/originals/`.

### Allowing Anonymous Uploads

Do not allow unauthenticated writes to any Storage path.

### Creating Inconsistent Path Names

Use the canonical paths exactly:

```txt
/originals/
/thumbnails/
/previews/
/customer-uploads/
```

### Enabling Uploads Before Rules Exist

Uploads require authentication, ownership checks, file size checks, and content type validation.

### Storing Permanent Download URLs

Store stable Storage paths, not permanent download URLs.

## Completion Checklist

- Firebase Storage enabled.
- Billing prompt reviewed and approved if required.
- Storage location recorded.
- Bucket name recorded exactly.
- Required Storage paths reviewed.
- No placeholder files created without approval.
- Starter development rules installed.
- Rules default deny all reads and writes.
- `/originals/` is not public.
- Anonymous uploads are denied.
- Production Storage rule requirements reviewed before real files are uploaded.
