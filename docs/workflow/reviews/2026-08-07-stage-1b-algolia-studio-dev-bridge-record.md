# Stage 1b — Studio Dev Bridge: Algolia reconcile

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Approval phrase | `APPROVE STUDIO DEV BRIDGE: ALGOLIA RECONCILE` |
| Status | **Reconcile OK** — scanned=45, upserted=45; Portal enable flag set locally |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 — open / **unmerged** |

## What was added

Minimal Studio DevTools bridge (no permanent UI), mirroring `printRequestQueueTabBackfillAdminService`:

| Piece | Path |
|-------|------|
| Service | `apps/studio/src/renderer/src/features/designs/services/portalCatalogAlgoliaReconcileAdminService.ts` |
| Types | `freshPrintsDevConsole.types.ts` — `reconcilePortalCatalogAlgoliaIndex` |
| Install | `AppShell.tsx` alongside queue-tab backfill |
| Gate | `isFirebaseDebugPanelEnabled` (dev + `fresh-prints-dev` only) |
| Client timeout | `540_000` ms (Function `timeoutSeconds: 540`) |

Callable: `reconcilePortalCatalogAlgoliaIndex` (already deployed on `fresh-prints-dev`).

## Owner run (completed)

Owner replied `ALGOLIA RECONCILE: OK` with `scanned=45`, `upserted=45` (`dryRun: false`).

## After reconcile OK

1. ~~Set `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true` in `apps/portal/.env.local`.~~ **done**
2. Restart Portal (required — Next.js public env is build/start-time).
3. Stage 1b-C QA: `docs/workflow/reviews/2026-08-07-stage-1b-algolia-owner-qa-checklist.md`.

## Out of scope

- No Functions redeploy
- No Portal flag enable in this step
- No publisher retirement / generated deletion
- No production / no PR #40 merge
- No secrets in chat or git
