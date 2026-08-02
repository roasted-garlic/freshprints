# Implementation Review: Studio automatic updates

Date: 2026-08-02
Branch: `feature/studio-automatic-updates` (based on `origin/production` at `9726edb`)
Plan: `docs/workflow/plans/2026-08-01-studio-automatic-updates-plan.md`
Formal Review: `docs/workflow/reviews/2026-08-01-studio-automatic-updates-review.md`

## Verdict: implementation complete, unsigned; A→B GUI proof still pending interactive owner verification

## Owner decisions applied (all 21, no re-litigation)

Provider: GitHub Releases on the confirmed-public `roasted-garlic/freshprints` repo (verified via
`GET /repos/roasted-garlic/freshprints` → `"private": false`, resolving the Plan's previously
open `[NEEDS REPO CHECK]`). No GitHub token embedded in Studio. Channels `stable`/`prerelease`,
manual `workflow_dispatch` trigger, user-gated download/install, no forced restart, postpone
allowed, no mandatory updates in v1, ≥2 prior stable installers retained, Settings → Studio updates
UI, release notes shown, stable publish requires human approval.

## What was built

| Area | Files |
|---|---|
| Shared IPC contract | `packages/shared/src/types/studioUpdate/studioUpdateIpc.types.ts` |
| Shared pure state machine | `packages/shared/src/studioUpdate/studioUpdateStateTransitions.ts` (+ test) |
| Main-process channel selection | `apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.ts` (+ test) |
| Main-process IPC channels/allowlist | `apps/studio/electron/ipc/studioUpdate/studioUpdateIpcChannels.ts` (+ test) |
| Main-process update service (electron-updater wrapper) | `apps/studio/electron/ipc/studioUpdate/studioUpdateService.ts` |
| Main-process IPC handlers | `apps/studio/electron/ipc/studioUpdate/studioUpdateIpcHandlers.ts` |
| Main process wiring | `apps/studio/electron/main.ts` (registers handlers, starts periodic checks) |
| Preload bridge | `apps/studio/electron/preload.ts` (`window.freshPrints.studioUpdate`) |
| Renderer hook | `apps/studio/src/renderer/src/features/settings/hooks/useStudioUpdate.ts` |
| Renderer UI | `apps/studio/src/renderer/src/features/settings/components/StudioUpdatesSettingsSection.tsx` |
| Settings page wiring | `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx` |
| Packaging | `apps/studio/package.json` (version `1.0.0-beta.1`, `electron-updater` dependency), `apps/studio/electron-builder.json5` (`publish` block) |
| CI release workflow | `.github/workflows/studio-release.yml` |
| Docs | `docs/standards/DEPLOYMENT.md` ("Studio Automatic Updates" section) |

## Architecture conformance

- Follows the existing `fresh-prints:*` namespaced IPC convention exactly (channel constants +
  allowlist + typed preload bridge, matching `appIpcChannels.ts`/`appIpcHandlers.ts`).
- Update service runs only in packaged builds: `isUpdateCapable()` gates on `app.isPackaged`;
  `npm run dev:studio` never touches `electron-updater` (dynamic `import("electron-updater")` is
  only reached when `isUpdateCapable()` is true).
- Download requires an explicit "Download update" click (`canStartDownload` gate); install
  requires an explicit "Restart to Update" click (`restartAndInstallStudioUpdate` only ever calls
  `quitAndInstall` from a renderer-initiated IPC call, never from a timer or event handler).
- Periodic check every 4 hours (`CHECK_INTERVAL_MS`), plus one on launch.
- Errors are converted to a plain string message before being stored/broadcast — the raw error
  object (which could contain response headers) is never logged or sent to the renderer.
- No native `alert`/`confirm`/`prompt` used anywhere in the new UI.
- Stable/prerelease isolation is structural: electron-builder derives the update-feed channel from
  the semver prerelease tag (`AppInfo.channel` in `app-builder-lib`), not from a convention that
  could silently drift; `allowPrerelease` on the client is only true when the packaged build's own
  `FRESH_PRINTS_UPDATE_CHANNEL` env var (baked in at build time) is `prerelease`.

## Test results (this pass, all commands actually run)

| Check | Command | Result |
|---|---|---|
| Shared state-machine tests | `npx tsx --test packages/shared/src/studioUpdate/studioUpdateStateTransitions.test.ts` | 8/8 pass |
| Channel-resolution tests | `npx tsx --test apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.test.ts` | 3/3 pass |
| IPC allowlist tests | `npx tsx --test apps/studio/electron/ipc/studioUpdate/studioUpdateIpcChannels.test.ts` | 3/3 pass |
| Studio typecheck | `npx tsc` (apps/studio) | exit 0 |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | exit 0 |
| Functions build | `cd functions && npm run build` | exit 0 |
| Repo lint | `npm run lint` | exit 0, 0 warnings |
| Whitespace | `git diff --check` | exit 0 |
| **Full electron-builder package build** | `npm run build` (apps/studio) | **exit 0** — produced `Fresh Prints-Windows-1.0.0-beta.1-Setup.exe` (106,632,593 bytes), blockmap, and `latest.yml` in `apps/studio/release/1.0.0-beta.1/` (gitignored, not committed) |

Installer SHA-256 (local unpublished build, version `1.0.0-beta.1`):
`86fa5dcb301432287f1ffb98755af218c1074a466959452a99c5453a57ba4f9c`

## Signing status

No Windows code-signing certificate is configured (`WINDOWS_CSC_LINK`/`WINDOWS_CSC_KEY_PASSWORD`
are referenced by the CI workflow as optional secrets but are not set). electron-builder built
successfully unsigned, as expected — this is explicitly allowed for prerelease/test builds per the
Plan. **This remains a hard checkpoint before any stable `1.0.0` publish** (see the Signoff).

## What was NOT verified in this pass (honest limitations)

This implementation and its automated tests were done in a non-interactive environment. The
following require a real, interactive desktop session and were **not** performed here:

- Actually clicking through the Settings → Studio updates UI in a running packaged app.
- A live GitHub Releases publish (would require `gh`/a GitHub token with release-write scope,
  neither available in this environment) and a real electron-updater HTTP check against that
  release.
- Installing the built `.exe` and observing real update-detection/download/restart behavior.

These are exactly the items the A→B prerelease proof procedure (documented in `DEPLOYMENT.md`)
and the owner-QA checkpoint below are for.
