# Coordinated Production Studio Build-Input Manifest

## Authoritative final parent M0 Studio input reconciliation — 2026-09-12

The reviewed dirty snapshot contains 786 Studio app/renderer/Electron/build inputs + 345 shared + 9
show-picker + 5 common/workspace manifests = **1,145**; digest
`bc72d879dd17beca0bc85c83de7526c0eda16ebb27fc19b2eec0c0853ae09aea`. Current status paths under
`apps/studio` are 35 (33 runtime, 2 tests). All coordinated release metadata is **`1.0.10`**;
`1.0.9` remains rollback-only. No packaging build, installer-producing tooling, publication, or
production action occurred.

## Authoritative corrected build boundary — 2026-09-12

The prior 1,019-file manifest was stale and incomplete: its count omitted 104 Electron files,
seven build scripts, two package icons, and the direct `@fresh-prints/show-picker` workspace
dependency even though those are release inputs. The corrected dirty-snapshot method includes all
non-test, non-ignored Studio renderer/Electron/scripts/icons/config/public inputs;
`packages/shared/src/**`; `packages/show-picker/src/**`; root `package.json`, `package-lock.json`,
and `firebase.json`; and both workspace package manifests.

| Input class | Files |
|---|---:|
| Studio app/renderer/Electron/build inputs | 786 |
| Shared runtime | 345 |
| Show Picker runtime | 9 |
| Common/workspace manifests | 5 |
| **Total** | **1,145** |

Digest (sorted path + NUL + raw bytes + NUL):
`bc72d879dd17beca0bc85c83de7526c0eda16ebb27fc19b2eec0c0853ae09aea`.

There are 34 dirty Studio status paths (32 runtime, 2 tests). Studio still declares version
`1.0.9`, which is already the production rollback release, and the release workflow enforces that
version. M1 requires an owner-selected next semver (recommendation: `1.0.10`) and reviewed package,
lockfile, workflow, test, and release-document alignment. No package build/publication occurred.

## Authoritative post-Staff-Artwork M0 rerun — 2026-09-12

The earlier inventory is retained below. The current deterministic manifest is authoritative for the
dirty reconciliation at `development` `a76d8be218571e1260bdb983f86ee5cf86563e1b`.

The manifest includes sorted, non-test runtime files under `apps/studio/**`, shared runtime files
under `packages/shared/src/**`, and `package.json`, `package-lock.json`, `firebase.json`, and
`packages/shared/package.json`. It excludes dependency/build/release/generated output, local env
files, logs, and `.test.`/`.spec.` files. Digest algorithm: SHA-256 over each sorted relative path,
NUL, raw file bytes, NUL.

| Input set | Files | Digest |
|---|---:|---|
| Studio app runtime/build inputs | 673 app + 342 shared + 4 common = **1,019** | `676bf86df0d4c048fd9b5fdb642c63d4bb23950e6ddc494d3a3b342d73f81312` |

The 27 changed Studio status paths cover request-detail/source propagation, queue/allocation/export/
gang-sheet resolution, artwork-background handling, permission types, shared navigation/styles, and
the new Staff Artwork library, customer picker, AI Review confirmation, permission contract, and
Staff Artwork styling. Staff Artwork management remains owner/admin-only; helper access is
selection-only and the Portal projection remains customer-safe. The production rollback target is
Studio v1.0.9. No Studio publication occurred.

Status: read-only M0 reconciliation rerun artifact; no Studio publication or release was executed.

Rerun snapshot: `development` dirty at `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`. The signed-off
customer-upload follow-up child and the previously signed-off hard-delete UI gate are both included
below; the dirty snapshot is not a release SHA.

## Exact build boundary

The Studio candidate is built from `apps/studio/**` at the eventual clean candidate SHA with the workspace shared package resolved through the Vite/TypeScript aliases. Build scripts are `node scripts/generate-packaged-build-config.mjs && tsc && vite build && electron-builder`; `apps/studio/package.json` remains version **1.0.9**. A production rollback target is **Studio v1.0.9**.

Selected build metadata hashes (current / `origin/production`) are `apps/studio/package.json`
`251b9a481a65cff32bbfad17ad8ec002bad2dc9db019ca53b99de93415b56d9e` /
`dcfe92240acefb4b25ffaecd93103c532d85a0b5a003c5132c1d57232a6e05a8`, `vite.config.ts`
`ffd4164346b1716c7f08093d4aafe2d516dc1e286ce5ec3967e07a71798c3512` /
`70ed97a95b240e495e85bc56258e2175f5f88570dce0b99e3d2407f2ec5c4d06`, and
`electron-builder.json5` `53203ca02ee14b700bec2e064241add6b31b128e2c5c55929ba4858c661f9d80` /
`645e595856089ed199bf277beba3b5857d2faa5f5d43f52092445f5690ecda66`.

| Input class | Exact path / rule | Disposition |
|---|---|---|
| Renderer/Electron source | `apps/studio/src/renderer/**`, `apps/studio/electron/**` | Include at clean candidate SHA |
| Shared runtime dependency | `packages/shared/src/**` | Include through aliases |
| Build/release config | `apps/studio/package.json`, `apps/studio/tsconfig.json`, `apps/studio/tsconfig.node.json`, `apps/studio/vite.config.ts`, `apps/studio/electron-builder.json5`, generated packaged-build config | Include/revalidate |
| Maintenance runtime | `features/settings/pages/SettingsPage.tsx`; `features/settings/components/PortalMaintenanceSettingsSection.tsx`; `features/settings/hooks/usePortalMaintenanceSettings.ts`; `features/settings/services/portalMaintenanceSettingsService.ts`; `styles/components/settings.css` | Include |
| Hard-delete UI gate | `features/users/components/CustomerDirectoryTable.tsx`; existing `features/test-data-reset/utils/operationalWipeUiGate.ts` | Include gate; preserve existing DEV source |
| Validation-only | `PortalMaintenanceSettingsSection.contract.test.ts`; `customerDirectoryHardDeleteGate.contract.test.ts` | Run/record; not packaged runtime inputs |

## Customer-upload follow-up child additions

| Area | Paths / disposition |
|---|---|
| Excluded-state UX | `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx`; permission-denied reason and one-time “Ask for permission again” action |
| Service and hook | `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts`; `.../hooks/useCustomerUploadIntake.ts` |
| Shared query validation | `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeQueries.test.ts` — validation-only, not packaged |
| Styling | `apps/studio/src/renderer/src/styles/layout.css` |

The production build keeps `Delete Account Permanently` absent at the shared table boundary via
`isOperationalWipeUiEnabled()`. Both `previewHardDeleteCustomerAccount` and
`hardDeleteCustomerAccount` remain excluded from the production Function allowlist. The rollback
target remains **Studio v1.0.9**.

## Production hard-delete gate proof

At the shared `CustomerDirectoryTable` menu boundary, both the menu item and callback branch require `isOperationalWipeUiEnabled()`. The helper returns true only for `import.meta.env.DEV` and an allowlisted operational-wipe project ID. Therefore a production-mode Vite build cannot render `Delete Account Permanently`, even for an owner, and cannot reach the hard-delete preview path through the customer directory. The existing dialog/backend and owner authorization remain untouched.

The focused contract suite proves production hidden behavior, no preview invocation from the table, allowlisted DEV availability, owner/non-owner requirements, and unchanged reversible actions. The Studio Vite build passed; repo-wide Studio typecheck retains the documented unrelated baseline diagnostics. A live packaged production session was not run in M0, so the static/build proof must be rechecked during the later Studio validation gate.

## Exclusions and rollback

- Exclude hard-delete and preview Function exports from any production Function allowlist; source retention is intentional.
- Exclude destructive test-data reset UI/callables except the existing DEV-only gate behavior.
- Exclude release artifacts (`dist`, `dist-electron`, `release`) and test files from the packaged input.
- No Studio publication, production deploy, customer mutation, candidate freeze, or rollback execution occurred.
