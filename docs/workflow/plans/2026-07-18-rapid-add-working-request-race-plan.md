# Plan: Rapid Add to Request create race

**Date:** 2026-07-18  
**Goal:** Prevent false “already have a request in progress” when customers rapidly add designs with no working request open.

## Problem

With **no** print request open, rapid successive Add taps:

1. First add calls `createPortalPrintRequest`.
2. Second add still sees empty `continuableRequests` (list lag / promise cleared after create resolves).
3. Second create hits the one-working-request server gate → false error.

Slow adds work because the list reload finishes before the next tap.

## Approach (client mutex first; no Functions deploy)

1. **Shared `ensureWorkingPrintRequestId`** on `PortalPrintRequestContext`:
   - One in-flight create promise for all callers.
   - Cache resolved id until list exposes `workingRequest` (do not clear on create settle alone).
   - Clear cache on clear/reset working cart and on create failure.
2. **`useAddDesignToRequestFlow`** uses context ensure; branch resolution also treats `pendingWorkingRequestId` as a known single request so post-create adds use the attach path.
3. **Busy polish:** detail modal shows Adding… while ensure is in flight; catalog cards stay clickable so parallel adds await the same create (smooth).
4. Soft-reload Portal only. No production / Functions deploy.

## Out of scope

- Server-side create dedupe
- Production deploy
- Changing Cap A / one-working-request product rules

## Files

- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx`
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts`
- `apps/portal/features/print-requests/hooks/usePrintRequestCreationFlow.ts`
- Catalog / home detail modal busy wiring
