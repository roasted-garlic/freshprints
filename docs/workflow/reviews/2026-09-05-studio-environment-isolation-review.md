# Studio Environment Isolation Review

## Decision

**Approved — 2026-09-05 by owner instruction: “proceed with the Studio environment isolation plan.”**

## Review scope

The change is limited to Electron startup identity/session isolation and taskbar differentiation. It does not alter renderer auth behavior, Firebase configuration, backend data, deployment, or production services.

## Approval conditions

- Development and production must use distinct persistent storage locations.
- Production behavior must remain backward-compatible where practical.
- The dev marker must be environment-gated and absent from production.
- Tests must cover identity/path selection.

## Implementation result

- Implemented in `apps/studio/electron/main.ts` and `environmentIdentity.ts`.
- Focused tests pass: `npx tsx --test apps/studio/electron/environmentIdentity.test.ts`.
- Full Studio typecheck remains blocked by pre-existing unrelated errors in import/export, renderer, and shared code; no reported error targets this change.
