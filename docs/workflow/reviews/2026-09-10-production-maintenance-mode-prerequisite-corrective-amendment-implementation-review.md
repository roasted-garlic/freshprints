# Production maintenance-mode prerequisite — corrective amendment Implementation Review

**Date:** 2026-09-10<br>
**Goal:** `production-maintenance-mode-prerequisite`<br>
**Environment:** DEV source and `fresh-prints-dev` only<br>
**Production:** untouched; no production deployment, activation, data operation, hosting, publish,
commit, or push

## Owner authorization

The owner explicitly accepted the corrective amendment and authorized `Continue FreshForge` into
Implement. This record covers only the accepted corrective scope; Owner DEV QA and Signoff remain
human gates.

## Implemented contract

- Shared maintenance settings now carry an optional `heading` beside the existing `message`, with
  friendly defaults and bounded normalization. Missing `settings/portalMaintenance` remains OFF;
  existing saved message data is preserved and no initialization or migration was performed.
- `getPortalMaintenanceState`, the Portal context, and the enabled maintenance experience use the
  saved customer-safe heading/body at runtime. Public state contains only `enabled`, `heading`,
  `message`, and the caller-specific boolean; the configured tester UID and audit fields remain
  private.
- Studio Settings uses native Settings classes and separate heading/body controls. Its searchable
  tester selector consumes the owner/admin-only `listPortalMaintenanceTestCustomers` callable and
  passes trusted Firebase UIDs unchanged. An unavailable saved UID is displayed disabled rather
  than silently remapped.
- `functions/src/lib/portalMaintenance.ts` owns one eligibility helper used by candidate listing,
  save validation, caller-specific public access, and the maintenance mutation guard. Eligibility
  requires an active customer-role user and exactly one linked customer that is not guest, deleted,
  disabled, merged, or assigned a nonblank `mergedIntoCustomerId`. A stale configured tester loses
  bypass access on the next trusted read.
- `listPortalMaintenanceTestCustomers` is authenticated and owner/admin-only. It returns only safe
  `{ uid, displayName, username? }` metadata and is not a customer-management endpoint.
- No Firestore or Storage Rules source changed in this corrective amendment; the existing Rules
  authorization boundary remains intact. No index, migration, hosting, Studio publish, or production
  action was added.

## Source inventory

| Area | Files |
|---|---|
| Shared contract | `packages/shared/src/constants/portal/portalMaintenance.constants.ts` and test |
| Trusted backend | `functions/src/lib/portalMaintenance.ts`, `getPortalMaintenanceState.ts`, `updatePortalMaintenanceState.ts`, new `listPortalMaintenanceTestCustomers.ts`, `functions/src/index.ts` |
| Portal | maintenance context and enabled experience |
| Studio | maintenance Settings section, hook, service, and focused contract test |
| Contracts/integration | `tests/portalMaintenance.contract.test.ts`, trusted resolver integration test |
| Documentation | `docs/architecture/BACKEND.md` and the companion review/test/deployment records |

## Scope verdict

Implementation matches the owner-accepted corrective Plan. The source-only Test gate passed before
the narrow DEV redeployment. The exact allowlist and resulting ACTIVE revisions are recorded in the
companion DEV deployment record. Owner DEV QA is still required; this review does not perform QA or
advance Signoff.
