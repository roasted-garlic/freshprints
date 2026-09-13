# Production maintenance-mode prerequisite — amendment Implementation Review

**Date:** 2026-09-10<br>
**Goal:** `production-maintenance-mode-prerequisite`<br>
**Environment:** DEV source and `fresh-prints-dev` only<br>
**Production:** untouched; no production deployment, activation, or data operation

## Scope completed

The owner-accepted amendment was implemented exactly within the reviewed boundary:

- Portal `/admin/show-queue` keeps its existing auth and redirect predicates and now presents a
  centered, responsive, static Access denied card with the existing Sign out action.
- Blocked customer sessions return a full-viewport maintenance replacement before customer
  providers, navigation, drawer, or page children mount. Loading, read-error, and maintenance copy
  are friendly and never render raw service/error text.
- Shared private state accepts one nullable `maintenanceTestCustomerUid`; the trusted callable
  validates an active, linked, non-deleted, non-disabled, non-guest customer. Public state exposes
  only caller-specific `maintenanceTestAccessGranted`; the UID is stripped.
- The single trusted callable guard receives the authenticated UID and bypasses only the maintenance
  prohibition for the configured tester. Existing auth, ownership, quota, DPI/size, lifecycle,
  validation, and business checks remain in place and guard ordering is unchanged.
- Firestore and Storage maintenance predicates compare the configured UID only within existing
  customer mutation paths. Assisted Creation pending Storage create/update are now covered in
  addition to source/ZIP/delete paths.
- Studio reuses the existing customer directory and searchable Select with one clear option and a
  safe unavailable-selection state. The listener preserves the private UID for owner/admin only.
- Authorized testers receive the persistent accessible yellow banner while maintenance is ON;
  ordinary customers and guests do not.

## Guard/dependency inventory

- 34 existing deployed customer callable exports were updated to pass the caller UID to the shared
  guard; grouped source files contain 34 guard invocations across the existing 28-source coverage.
- `getPortalMaintenanceState` and `updatePortalMaintenanceState` remain the only maintenance
  callable exports; no additional maintenance Function was introduced.
- No Firestore index was added or required.
- During emulator-backed validation, the trusted write path exposed a Firestore API misuse when
  clearing optional fields (`FieldValue.delete()` in a non-merge `set()`). The implementation was
  corrected to use replacement semantics, verified by the integration test, and only the affected
  `updatePortalMaintenanceState` DEV revision was redeployed.

## Review result

The implementation stayed within the owner-accepted amendment. No production or parent coordinated
rollout action was taken. Test evidence is recorded in the companion Test Report; DEV deployment
evidence is recorded separately.
