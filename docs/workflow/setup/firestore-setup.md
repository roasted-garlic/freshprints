# Firestore Setup

## Purpose

This guide covers only Cloud Firestore setup for Fresh Prints:

- Enabling Firestore
- Reviewing required collections
- Installing recommended starting Firestore rules for development
- Planning initial indexes
- Verifying Firestore access and rules behavior

This guide does not cover Firebase project creation, Firebase Web app registration, Firebase Storage setup, Storage rules, environment variables, or application code.

## Prerequisites

Before starting, confirm:

- The Fresh Prints Firebase project exists.
- The Firebase Web app has been registered.
- You can access the Firebase console:

```txt
https://console.firebase.google.com/
```

- You have reviewed:

```txt
docs/AI_RULES.md
docs/architecture/ARCHITECTURE.md
docs/architecture/FIREBASE.md
docs/architecture/DATA_MODEL.md
docs/standards/SECURITY.md
```

## Step-By-Step Setup

### Step 1: Open Firestore

1. Open the Firebase console.
2. Select the Fresh Prints Firebase project.
3. Go to:

```txt
Build > Firestore Database
```

### Step 2: Create The Database

1. Click **Create database**.
2. Choose **Production mode**.
3. Choose a Firestore location.

Recommended starting location:

```txt
nam5
```

4. Record the selected location.
5. Click **Create**.

### Step 3: Confirm Required Collections

Fresh Prints uses these initial Firestore collections:

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

Firestore creates collections when the first document is written. Do not create placeholder or fake documents unless explicitly approved.

### Step 4: Confirm Document Metadata Standards

Primary documents should include:

```txt
id
createdAt
updatedAt
```

Where applicable, include:

```txt
createdBy
updatedBy
```

Application code should use server timestamps when writing metadata.

### Step 5: Plan Initial Indexes

Expected initial single-field query needs:

```txt
designs.status
designs.categoryId
designs.uploadedBy
customerRequests.status
showQueueItems.queueId
showQueues.status
```

Create composite indexes only when Firestore requests them for actual app queries.

### Step 6: Configure Firestore Rules

Open:

```txt
Firestore Database > Rules
```

Replace unsafe test rules with the recommended starting development rules below.

## Recommended Starting Rules For Development

These rules allow an authenticated user to read only their own `users/{uid}` profile and deny everything else.

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isSelf(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isSelf(userId);
      allow create, update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Do not use:

```txt
allow read, write: if true;
```

## Production Security Notes

Production Firestore rules must:

- Default deny all unspecified access.
- Require authentication for protected data.
- Enforce roles from `users/{uid}`.
- Allow users to read their own profile.
- Prevent client-side role escalation.
- Restrict role changes to owners.
- Prevent admins from modifying owner accounts.
- Restrict settings to owner/admin.
- Restrict audit logs to owner/admin read-only access.
- Make audit logs append-only where client writes are allowed.
- Allow customers to read only customer-visible design metadata.
- Prevent customers from reading internal notes, review fields, settings, audit logs, or queue management data.
- Allow customers to read only their own customer requests.

Rules must mirror centralized application permission logic. UI permissions are convenience only and are not enforcement.

## Verification Steps

### Console Verification

- Firestore Database exists.
- Firestore location is recorded.
- Rules are not publicly open.
- Required collection names are documented.
- No unapproved placeholder documents were created.

### Rules Verification

With the recommended starting rules:

- Unauthenticated reads are denied.
- Unauthenticated writes are denied.
- Authenticated users can read only their own `users/{uid}` document.
- Authenticated users cannot read other user documents.
- Authenticated users cannot write user documents from the client.
- All other collections deny reads and writes until explicit rules are added.

### App Verification

After the app is configured:

- Firebase connection diagnostics should show Firestore as **Connected** or **Protected by rules**.
- **Protected by rules** means Firestore responded and denied the broad diagnostic read. That is expected with locked-down starter rules.
- Permission-denied responses do not mean Firebase is unreachable.
- Login succeeds only when the authenticated user has a matching `users/{uid}` document and rules allow self-read on that document.

## Common Mistakes

### Leaving Firestore In Test Mode

Do not leave public read/write rules enabled.

### Creating Collections With Wrong Names

Use exact collection names:

```txt
customerRequests
showQueues
showQueueItems
auditLogs
```

### Creating Fake Documents

Do not create fake documents just to make collections appear in the console.

### Storing Files In Firestore

Firestore stores metadata only. Files belong in Firebase Storage.

### Storing Permanent Download URLs

Store stable Storage paths in Firestore, not permanent download URLs.

### Overbuilding Indexes Early

Create indexes from actual query needs, not guesses.

## Completion Checklist

- Firestore Database enabled.
- Firestore location recorded.
- Production mode selected during setup.
- Required collection names reviewed.
- No fake documents created.
- Initial index fields reviewed.
- Starter development rules installed.
- Rules default deny unspecified access.
- Public read/write rules are not present.
- Firestore verification completed.
- Production rule requirements reviewed before real data is used.
