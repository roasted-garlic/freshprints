# Search Clear Refocus Plan

## Goal

When staff click the `X` clear control inside search inputs, clear the value and return keyboard focus to the same input.

## Scope

- Design Library global search input.
- Tag Management search input.
- Design Library tag filter modal search input.

## Out Of Scope

- Search query behavior changes.
- Firestore query/index changes.
- Styling redesign.
- Firebase deploys, data writes, migrations, or dependency changes.

## Architecture Impact

Renderer-only UI behavior change. No service, backend, Electron, or shared data model changes are required.

## UI Considerations

Keep existing clear buttons and add focus restoration after clear. This improves keyboard continuity and matches expected search-field behavior.

## Security Considerations

No permission, auth, secret, IPC, or Firebase rule changes.

## Test Plan

- Run root TypeScript check.
- Run root lint.
- Run `git diff --check`.
