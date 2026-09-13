# Test Report: Studio Staff Artwork Library and Print Request Source

| Field | Value |
|---|---|
| Date | 2026-09-11 |
| Goal | `studio-staff-artwork-library-and-print-request-source` |
| Phase | Implement → Test complete locally; DEV deployment/Owner QA pending |
| Production | Untouched; no deployment or data mutation |

## Automated checks

| Check | Result |
|---|---|
| Staff Artwork focused tests (permissions, storage paths, source contracts, export resolution, Portal privacy) | **PASS — 22/22 tests across 6 suites** |
| Functions TypeScript build (`npm run build` in `functions`) | **PASS** |
| Portal typecheck (`npm run typecheck --workspace @fresh-prints/portal`) | **PASS** |
| Changed-source ESLint (`npx eslint … --max-warnings 0`) | **PASS** |
| `git diff --check` | **PASS** |
| Studio typecheck (`npx tsc --noEmit -p apps/studio/tsconfig.json`) | **BLOCKED by existing baseline diagnostics** |
| Studio build (`npm run build --workspace @fresh-prints/studio`) | **BLOCKED at the same existing TypeScript baseline** |
| Firebase Rules regression | **Original run PASS — 182/182 across 24 suites; post-QA full command retains the documented legacy expression-budget baseline; focused new suites 11/11 pass** |

Focused command:

```text
npx tsx --test \
  apps/studio/src/renderer/src/features/permissions/services/permissionService.staffArtwork.test.ts \
  packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths.test.ts \
  packages/shared/src/utils/staffArtworkSource.test.ts \
  packages/shared/src/utils/resolveShowExportProductionAsset.test.ts \
  packages/shared/src/utils/printRequestItemSource.test.ts \
  tests/firebase/staffArtwork.rules.contract.test.ts
```

The focused contract proves owner/admin-only management, active-staff view/select behavior,
canonical private Storage paths, third-source resolution, baseline/enhanced export selection, and
Portal projection without private identity/title/path/image metadata.

## Baseline diagnostics (not caused by this child)

The Studio TypeScript baseline still reports the repository’s pre-existing issues in
`electron/ipc/import/pngValidator.ts`, customer-upload intake catalog-permission fields, the two
artwork-enhance trace metadata objects, unused Staff Inbox/Upcoming Shows imports/locals, and
existing shared test fixtures (explicit-content readonly arrays, manual-enhance unused import, and
Show Recovery Timestamp/capacity fixtures). No Staff Artwork implementation file appears in those
diagnostics. Because Studio build runs `tsc` first, it stops before Vite/electron packaging.

The original Firebase emulator command passed all 182 assertions across 24 suites before the
post-QA corrective Rules changes. The post-QA repository-wide command still reaches the known
Firestore expression-budget baseline on legacy/heavy request paths; the new lean Staff Artwork and
catalog create suites pass 11/11 under emulator startup. No deployment-time Rules validation beyond
the recorded DEV deployment was performed.

## Original manual QA and deployment boundary

At the time of this original report, Owner DEV QA had not been run because deployment was a
separate human checkpoint. The exact allowlist that was subsequently deployed was:

- Functions: `createStaffArtworkUpload`, `finalizeStaffArtwork`, `updateStaffArtwork`,
  `setStaffArtworkArchiveState`, `deleteEligibleStaffArtwork`, `promoteStaffArtworkToAiReview`,
  plus the existing `setPrintRequestItemArtworkEnhanceMode` source branch.
- Firestore Rules: `staffArtworks` read/write boundary, request/allocation/gang-sheet source checks.
- Storage Rules: `/staff-artwork/{staffArtworkId}/source` owner/admin upload and staff read.
- Firestore indexes: the two additive Staff Artwork query indexes in `firestore.indexes.json`.
- Studio/Portal source for Owner QA; no hosting/publication action is implied.

The follow-up deployment and corrective redeploys are documented in
`docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-dev-deployment.md`. No migration/
backfill, candidate freeze, commit/push, parent M0, or production promotion was performed as part
of this child.

## Post-QA refresh — 2026-09-12

The owner reported that the deployed Staff Artwork flow and the additional corrective work were
fully tested and passed. The DEV deployment record is
`docs/workflow/reviews/2026-09-11-studio-staff-artwork-library-dev-deployment.md`.

Additional automated evidence run after the corrective changes:

- Source-focused contracts: **31/31 passed**.
- Emulator-backed Staff Artwork/catalog create Rules suites: **11/11 passed**.
- Functions build: **PASS**.
- Portal typecheck: **PASS**.
- Targeted ESLint after the final UI cleanup: **PASS**.
- `git diff --check`: **PASS**.

The repository-wide `npm run test:rules` command still emits the known Firestore expression-budget
failure on legacy/heavy request Rules paths (line 690 / source branches around lines 2240 and 3125).
The new lean catalog and Staff Artwork create paths pass their focused emulator suites; this
baseline is retained as a follow-up rather than weakened in this child.
