# Studio Environment Isolation Plan

## Goal

Allow development and production Fresh Prints Studio sessions to run at the same time, remain independently signed in, and be distinguishable in the Windows taskbar.

## Scope

- Detect the Studio environment from the baked Firebase project ID.
- Assign environment-specific Electron `userData` directories and Windows App User Model IDs.
- Add a `DEV` taskbar overlay marker for development Studio.
- Preserve existing production behavior and macOS/Linux compatibility.
- Add pure unit tests for environment identity and storage-path decisions.

## Architecture impact

The Electron main process owns OS identity, persistent session storage, and taskbar integration. The renderer Firebase/Auth implementation remains unchanged; separating Electron `userData` separates its persisted Chromium storage, including Firebase Auth state.

## Data/Firebase impact

No Firestore, Storage, Firebase Auth rules, schema, secrets, or backend changes. The existing build-time `VITE_FIREBASE_PROJECT_ID` is the environment discriminator.

## Security considerations

- Unknown project IDs fail closed to the production-safe identity rather than receiving the dev marker.
- No credentials or auth tokens cross IPC.
- Existing single-instance behavior is not introduced globally because dev and production must coexist.

## UI/OS considerations

Windows receives a small dev overlay icon and separate taskbar grouping. Other platforms retain the existing app identity and icon behavior.

## Risks and verification

- Existing users may have auth state in the old shared directory; production remains on the default path to avoid an unnecessary logout migration.
- Verify two processes can launch concurrently, each resolves a different `userData` path, and only dev receives the marker.

