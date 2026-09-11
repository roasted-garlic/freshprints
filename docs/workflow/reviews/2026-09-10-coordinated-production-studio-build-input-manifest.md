# Coordinated Production Studio Build-Input Manifest

Status: read-only M0 reconciliation artifact; no Studio publication or release was executed.

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

## Production hard-delete gate proof

At the shared `CustomerDirectoryTable` menu boundary, both the menu item and callback branch require `isOperationalWipeUiEnabled()`. The helper returns true only for `import.meta.env.DEV` and an allowlisted operational-wipe project ID. Therefore a production-mode Vite build cannot render `Delete Account Permanently`, even for an owner, and cannot reach the hard-delete preview path through the customer directory. The existing dialog/backend and owner authorization remain untouched.

The focused contract suite proves production hidden behavior, no preview invocation from the table, allowlisted DEV availability, owner/non-owner requirements, and unchanged reversible actions. The Studio Vite build passed; repo-wide Studio typecheck retains the documented unrelated baseline diagnostics. A live packaged production session was not run in M0, so the static/build proof must be rechecked during the later Studio validation gate.

## Exclusions and rollback

- Exclude hard-delete and preview Function exports from any production Function allowlist; source retention is intentional.
- Exclude destructive test-data reset UI/callables except the existing DEV-only gate behavior.
- Exclude release artifacts (`dist`, `dist-electron`, `release`) and test files from the packaged input.
- No Studio publication, production deploy, customer mutation, candidate freeze, or rollback execution occurred.
