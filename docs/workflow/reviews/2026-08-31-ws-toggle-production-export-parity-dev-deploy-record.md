# DEV Deploy Record — WS-TOGGLE Production Export Parity

**Date:** 2026-08-31  
**Goal:** `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale`  
**Owner authorization:** DEV Firestore Rules deploy approved for manual gang-sheet builder QA

---

## Git Checkpoint

| Field | Value |
|-------|-------|
| Branch | `development` |
| Commit SHA | `c84ec449a688f1ffac53cc22a75525a9315ec8c3` |
| Subject | `fix: honor enhanced artwork in production exports` |
| `git rev-parse HEAD` | `c84ec449a688f1ffac53cc22a75525a9315ec8c3` |
| `git rev-parse origin/development` | `c84ec449a688f1ffac53cc22a75525a9315ec8c3` |
| Push | **verified match** |

### Scoped files committed (18)

- `packages/shared/src/utils/printAssetResolution.ts`
- `packages/shared/src/utils/printAssetResolution.test.ts`
- `packages/shared/src/utils/resolveShowExportProductionAsset.ts`
- `packages/shared/src/utils/resolveShowExportProductionAsset.test.ts`
- `packages/shared/src/utils/gangSheetCacheFingerprint.ts`
- `packages/shared/src/utils/gangSheetCacheFingerprint.test.ts`
- `packages/shared/src/types/export/gangSheetExportIpc.types.ts`
- `apps/studio/.../utils/buildShowExportAllocationAssets.ts`
- `apps/studio/.../hooks/useExportGangSheetPng.ts`
- `apps/studio/.../hooks/useExportShowZip.ts`
- `apps/studio/.../hooks/useGangSheetBuilder.ts`
- `apps/studio/.../hooks/useGangSheetShowAssets.ts`
- `apps/studio/.../hooks/originalPathProductionProtection.test.ts`
- `apps/studio/.../customer-uploads/services/customerUploadReadService.ts`
- `apps/studio/electron/.../composeContinuousCustomerGroupedGangSheetSheets.test.ts`
- `firestore.rules`
- `docs/workflow/reviews/2026-08-31-ws-toggle-production-export-parity-implementation-review.md`
- `.cursor/workflow/state.md`

Unrelated working-tree changes intentionally **excluded** (Portal UI, Imports, AI Review, WS-CONFIG leftovers, Functions, CSS, etc.).

---

## Pre-Deploy Verification

| Check | Result |
|-------|--------|
| Focused export parity tests | **39/39 PASS** |
| `git diff --check` | **PASS** (exit 0) |

---

## Firebase Deploy

| Field | Value |
|-------|-------|
| Command | `firebase deploy --only firestore:rules --project fresh-prints-dev` |
| Project | `fresh-prints-dev` |
| Exit code | **0** |
| Result | `firestore: released rules firestore.rules to cloud.firestore` |
| Storage rules | **not deployed** |
| Indexes | **not deployed** |
| Functions | **not deployed** |
| Hosting | **not deployed** |
| Production (`fresh-prints`) | **untouched** |

### Rules change scope (security)

Narrow addition only: `gangSheetItems.originalPathSnapshot` may now be:

- `/originals/{id}.interactive.png` (catalog interactive derivative)
- `/customer-uploads/{uid}/{uploadId}/production.interactive.png` (private upload interactive derivative)

Existing ownership, role checks, and path-shape constraints unchanged. No broadening to arbitrary storage paths or cross-customer access.

---

## Studio DEV Reload

Owner must run Studio against commit `c84ec449` (local checkout on `development` after pull):

```bash
git pull origin development
npm run dev:studio
```

If Studio was already running: **quit and restart** `npm run dev:studio` so renderer + Electron main pick up export-parity changes. No production installer/release required.

---

## Workflow State

**Owner DEV QA production export parity** — Tests A–F pending.

Production: **NOT AUTHORIZED**  
Smart Profiling: **NOT STARTED**  
Signoff: **not authorized**
