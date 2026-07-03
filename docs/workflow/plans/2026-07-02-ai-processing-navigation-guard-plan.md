# AI Processing Navigation Guard Plan

## Goal

Prompt staff before leaving AI Processing while an AI run is active, matching the Imports-page guard pattern. If staff confirms leaving, stop the client queue from starting additional designs while allowing any already-in-flight Cloud Function request to finish.

## Scope

- Reuse the existing app-shell-level leave/quit confirmation infrastructure.
- Allow the shared activity guard to display AI-specific dialog copy.
- Register AI Processing activity while a single design or auto queue run is busy.
- On confirmed leave/quit, request that the AI queue stop after the current in-flight design.
- Do not cancel or modify the server-side `enqueueAiEnrichment` callable.

## Architecture Impact

Renderer-only UI/hook change. The shared activity context remains the central app-shell owner of route and close confirmations. AI Processing registers its active work through the same provider used by Imports.

## Data Model Impact

None.

## Firebase Impact

None. No Cloud Function, Firestore rules, Storage rules, or AI pipeline behavior changes.

## Security Considerations

No permission or secret changes. The renderer still calls existing services only. The guard does not expose AI provider secrets or add IPC input.

## UI Considerations

Use the existing `ConfirmLeaveDialog` modal and design tokens. Dialog copy must state that leaving stops the queue after the current image, not that it cancels in-flight AI.

## Risks

- The Cloud Function cannot be cancelled once invoked; the UI must be explicit.
- Closing or navigating away may unmount the queue hook before local UI refresh finishes. Firestore remains the source of truth after the in-flight callable completes.

## Verification

- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`
