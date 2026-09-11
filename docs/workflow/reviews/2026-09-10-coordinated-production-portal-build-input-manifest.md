# Coordinated Production Portal Build-Input Manifest

Status: read-only M0 reconciliation artifact; no App Hosting build or publication was executed.

## Exact build boundary

Portal candidate input is `apps/portal/**` at the eventual clean candidate SHA, with the App Hosting backend `fresh-prints-portal` (`firebase.json` `rootDir: ./apps/portal`). The checked-in App Hosting ignore set excludes `node_modules`, `.git`, Firebase debug logs, `functions`, `electron`, `dist`, `dist-electron`, and `release`. The workspace lockfile and shared package are release inputs even though they live above `rootDir`.

| Input class | Exact path / rule | Current disposition |
|---|---|---|
| App source | `apps/portal/**` after the App Hosting ignore set | Include at clean candidate SHA |
| Changed Portal runtime source | Paths listed below | Include |
| Shared runtime dependency | `packages/shared/src/**` (maintenance constants are changed at `packages/shared/src/constants/portal/portalMaintenance.constants.ts`) | Include through workspace resolution |
| App config | `apps/portal/package.json`, `apps/portal/tsconfig.json`, `apps/portal/next.config.*` if present, `apps/portal/apphosting.yaml` | Include; package scripts/dependencies are unchanged except source inputs |
| Workspace config | root `package.json`, `package-lock.json`, `firebase.json`, `packages/shared/package.json` | Include/revalidate; root `test:rules` change is validation-only |
| Secret names | The 13 names in the table below | Include names only; values are not in Git or this artifact |
| Validation-only files | Portal contract tests and test fixtures | Run/record; not production runtime inputs |

## Changed Portal runtime paths

| Area | Paths |
|---|---|
| Auth/login continuity | `apps/portal/app/login/page.tsx`; `apps/portal/features/auth/components/CompleteProfileForm.tsx`; `LoginForm.tsx`; `RegisterForm.tsx`; `PortalLoginMaintenanceNotice.tsx`; `features/auth/context/AuthProvider.tsx` |
| Maintenance runtime | `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx`; `features/maintenance/services/portalMaintenanceService.ts`; `features/maintenance/components/PortalMaintenanceExperience.tsx`; `PortalMaintenanceTestBanner.tsx` |
| Customer shell/navigation | `apps/portal/app/providers.tsx`; `features/navigation/components/PortalAppShell.tsx`; `PortalHeaderActions.tsx`; `PortalSidebar.tsx`; `styles/shell.css` |
| Admin read-only Show Queue | `apps/portal/features/admin-show-queue/components/PortalAdminAuthGate.tsx`; `styles/admin-show-queue.css` |

The admin route is a narrow owner/admin read-only runtime exception. Its signoff is included at `docs/workflow/reviews/2026-09-09-portal-admin-daily-show-queue-signoff.md`; request-design parity remains explicitly excluded from this candidate.

## App Hosting secret names (names only)

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY
NEXT_PUBLIC_PORTAL_ORIGIN
NEXT_PUBLIC_GA_MEASUREMENT_ID
NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH
NEXT_PUBLIC_ALGOLIA_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
NEXT_PUBLIC_ALGOLIA_INDEX_NAME
```

`apps/portal/apphosting.yaml` currently hashes to `e0516a8752a378b446dd8e82b113861c43a0144d00dba47ac58f58d621c04e2d`; production baseline is `e97085023aad63748b63d7a03ab43dcb43aa5904a02f6073db16d64d0d436e03`. Secret values must not be printed, rotated, or changed in M0.

Selected build metadata hashes (current / `origin/production`) are `apps/portal/package.json`
`66465320b6ce174727e99f0d95f9b1891fa7599d215c37ee7012cdf621c26a2b` /
`75406ef27f4a0a5d43df4634b74faa6b668683fb137f312247bf9ce20c507368`, root `package-lock.json`
`9798441f210f864ff6216cca45e137307e3f2bfccc86c4e4fce6fa3a2cf1ce48` /
`2d239134732ab2be24f8ca0fb1459f2f63348c6f2e4422c86f219f88a79b3344`, and
`apps/portal/tsconfig.json` `1ebc1808fd469c7073cbae1e43fba54c050e5932256fe57f69cc0366abf9690d` /
`da515a35d2d330ea49eb0e6c9f2f01b55e5900c6a311e19c52e4ceb4535f4616`.

## Maintenance and rollback

The maintenance runtime uses the callable-backed resolver and shared maintenance constants; it does not require a Portal rebuild to read a saved heading/message at runtime, but the candidate build still includes the source so the current Portal behavior is reproducible. A production rollback target is **Portal build-003**. No build, restart, hosting deployment, or production setting mutation occurred.

## Exclusions and stop conditions

- Exclude Studio/Electron source, Functions source, Firebase deployment output, `dist`, `dist-electron`, `release`, secrets, and local `.env.*` values.
- Exclude the request-design parity Plan from the candidate until separately reviewed.
- Tests are validation evidence, not browser bundle inputs.
- Do not infer a production App Hosting build or publish from this manifest; regenerate it at the clean SHA and obtain the required owner checkpoint first.
