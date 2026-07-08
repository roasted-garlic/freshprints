# Firebase Project Setup

## Purpose

This guide covers only the shared Firebase project shell for Fresh Prints:

- Creating the Firebase project
- Registering the Firebase Web app used by the Electron renderer
- Finding Firebase config values
- Creating local environment variables
- Verifying project and environment configuration

This guide does not cover Firestore setup, Firestore rules, Storage setup, Storage rules, Authentication setup, or application code.

Use these separate guides for service-specific setup:

```txt
docs/workflow/setup/firestore-setup.md
docs/workflow/setup/firebase-storage-setup.md
```

## Prerequisites

Before starting, confirm you have:

- A Google account that can create Firebase projects.
- Access to the Firebase console:

```txt
https://console.firebase.google.com/
```

- The Fresh Prints project open locally at:

```txt
C:\coding\fresh-prints
```

- The required project docs reviewed:

```txt
docs/AI_RULES.md
docs/architecture/ARCHITECTURE.md
docs/architecture/FIREBASE.md
docs/architecture/DATA_MODEL.md
docs/standards/SECURITY.md
docs/project/ROADMAP.md
docs/WORKFLOWS.md
```

## Step-By-Step Setup

### Step 1: Create The Firebase Project

1. Open the Firebase console.
2. Click **Add project** or **Create a project**.
3. Enter the project name:

```txt
Fresh Prints
```

4. Review the generated Firebase project ID.

Important:

- The Firebase project ID cannot be changed later.
- Record the project ID because it becomes `VITE_FIREBASE_PROJECT_ID`.
- Use one shared Firebase project for **Fresh Prints Studio** and **Fresh Prints Portal** unless a dev/prod split is explicitly approved.

5. Continue through the setup flow.
6. Google Analytics is optional for Phase 1.

Recommended Phase 1 choice:

```txt
Disable Google Analytics for now.
```

7. Click **Create project**.
8. Wait for Firebase to finish provisioning.

### Step 2: Register The Firebase Web App

Fresh Prints is an Electron app, but the renderer uses the Firebase Web SDK. Register the renderer as a Firebase Web app.

1. From the Firebase project overview page, click the Web icon:

```txt
</>
```

2. Enter an app nickname:

```txt
Fresh Prints Desktop Renderer
```

3. Do not enable Firebase Hosting unless a deployment task explicitly requires it.
4. Click **Register app**.
5. Firebase displays a `firebaseConfig` object.

Do not paste this object directly into source code.

### Step 3: Find Firebase Config Values Later

If you need to find the config again:

1. Click the gear icon next to **Project Overview**.
2. Open **Project settings**.
3. Open the **General** tab.
4. Scroll to **Your apps**.
5. Select:

```txt
Fresh Prints Desktop Renderer
```

6. Select the **Config** Firebase SDK snippet.

The object looks like:

```ts
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### Step 4: Create `.env.local`

Create this file at the project root:

```txt
C:\coding\fresh-prints\.env.local
```

Use this shape:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Step 5: Map Firebase Config Values

Use this exact mapping:

| Firebase config key | Environment variable |
| --- | --- |
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

Example:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789000
VITE_FIREBASE_APP_ID=1:123456789000:web:abcdef123456
```

Notes:

- Do not wrap values in quotes unless the value itself requires it.
- Do not add spaces around `=`.
- Do not add trailing commas.
- Do not store the full JavaScript config object in `.env.local`.
- Vite exposes only variables prefixed with `VITE_` to client code.

### Step 6: Confirm Environment Files Are Ignored

Confirm `.gitignore` includes:

```txt
.env
.env.local
.env.*.local
```

Never commit:

```txt
.env.local
serviceAccount.json
firebase-adminsdk*.json
*.pem
*.key
```

## Verification Steps

### Firebase Console

- Firebase project exists.
- Project name is correct.
- Project ID is recorded.
- Web app is registered.
- Web app nickname is clear.
- Firebase config object is available in Project settings.

### Local Environment

- `.env.local` exists in the project root.
- `.env.example` exists in the project root.
- `.env.example` lists all required `VITE_FIREBASE_*` variables without real values.
- `.env.local` contains all required `VITE_FIREBASE_*` variables.
- `.env.local` values match the Firebase Web app config exactly.
- `.env.local` is ignored by Git.
- No service account or Firebase Admin credentials are present.

### Application

After application code is implemented:

- Firebase initializes once in `apps/studio/src/renderer/src/config/firebase.ts`.
- Missing environment variables fail clearly.
- The app can read the configured Firebase project values from environment variables.

## Common Mistakes

### Creating Separate Projects Too Early

Do not create separate backend projects for Studio, Portal, or native mobile unless explicitly approved. There is no native mobile application.

### Choosing A Bad Project ID

The Firebase project ID cannot be changed after project creation.

### Hardcoding Config Values

Do not hardcode Firebase config in React components, services, or `App.tsx`.

### Committing `.env.local`

Local environment files must stay out of source control.

### Confusing Firebase Web Config With Admin Credentials

Firebase Web config is not a Firebase Admin service account. Do not add service account files to the renderer.

### Guessing The Storage Bucket Value

Use the exact `storageBucket` value from the Firebase Web app config.

## Completion Checklist

- Firebase project created.
- Project ID recorded.
- Web app registered.
- Web app nickname recorded.
- Firebase config object located.
- `.env.local` created.
- `.env.example` created.
- `VITE_FIREBASE_API_KEY` mapped.
- `VITE_FIREBASE_AUTH_DOMAIN` mapped.
- `VITE_FIREBASE_PROJECT_ID` mapped.
- `VITE_FIREBASE_STORAGE_BUCKET` mapped.
- `VITE_FIREBASE_MESSAGING_SENDER_ID` mapped.
- `VITE_FIREBASE_APP_ID` mapped.
- `.env.local` ignored by Git.
- No service account files committed.
- No Firebase Admin credentials added to the renderer.
