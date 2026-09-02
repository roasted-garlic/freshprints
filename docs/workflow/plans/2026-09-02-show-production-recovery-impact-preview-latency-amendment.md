# Amendment — Show production recovery impact preview latency + flicker

**Date:** 2026-09-02  
**Parent goal:** `studio-delete-first-action-latency` (owner-reported while QA)  
**Status:** implemented (client); Functions warmup pending DEV redeploy

## Problem

Mark as Fulfilled / Did Not Print dialogs showed **Loading impact preview…** slowly and **flickered** as if reloading after content appeared.

## Root causes

1. **Flicker (primary):** `ShowProductionRecoveryDialog` / `DidNotPrintRecoveryDialog` preview `useEffect` depended on `now` (parent schedule clock) and `allocations` / `show` references. Each tick cleared preview, set loading, and re-called the Gen2 preview — looking like endless reload.
2. **Slow first open:** `previewShowProductionRecovery` / `applyShowProductionRecovery` are separate Gen2 services (same cold-start class as deletion callables) and were **not** in the idle/dialog warmup set.

## Changes

| Area | Change |
|------|--------|
| Client | Preview effect deps → stable keys only (`action`/`selectedShowId` + ids). Fallback inputs via refs. |
| Client | Idle warm `previewShowProductionRecovery` for staff; dialog open warms `applyShowProductionRecovery`. |
| Functions | Same-service `{ warmup: true }` on preview + apply recovery callables (Auth + staff assert, no entity work). |

## Deploy

Requires DEV deploy of:

- `previewShowProductionRecovery`
- `applyShowProductionRecovery`

Flicker fix is Studio-only and applies on HMR/reload without Functions deploy.

## Out of scope

- Production deploy
- `minInstances`
- Broader show-queue batch allocation work (still deferred)
