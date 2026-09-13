# Plan: Portal maintenance public-read fail-open

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Workflow | managed-phase corrective (pauses `customer-upload-follow-up-catalog-permission`) |
| Owner | Authorized pause-and-fix after DEV homepage showed the maintenance wall while OFF |

---

## Goal

Guests on hosted DEV Portal must not see the full-screen maintenance wall when maintenance is OFF (or when the public status callable fails). Mutations stay server-guarded.

## Root cause

1. `PortalAppShell` blocks whenever `status !== 'ready'`, so a failed/loading `getPortalMaintenanceState` replaces the whole customer Portal.
2. `getPortalMaintenanceState` is Gen2 `onCall` without `invoker: "public"`. Guest CORS `OPTIONS` has no Authorization header; Cloud Run IAM 403 matches the Pass 2 toggle incident.

## Approach

1. Pin `invoker: "public"` on `getPortalMaintenanceState` (same pattern as `updateSemanticReviewPlaygroundSetting`). Auth is not required for this public-safe read.
2. Show the maintenance wall only when status is **ready** and enabled and the caller is not the tester.
3. Login “Browse designs” hidden only when maintenance is confirmed ON.
4. Contract tests for invoker + shell predicate. Redeploy the one DEV Function so `myprintrequest.dev` guests can call it.

## Out of scope

- Production Functions/Hosting
- Catalog-permission child goal (paused, then resumed)
- Changing mutation guards or Firestore/Storage Rules

## Rollback

Remove `invoker: "public"` and restore the old `status !== 'ready'` predicate; redeploy the Function.

## Acceptance

- [ ] Guest homepage works while maintenance is OFF
- [ ] Confirmed ON still shows the wall for non-testers
- [ ] Callable reachable without a Firebase ID token
