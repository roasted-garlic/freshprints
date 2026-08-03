# Test Report: Studio release workflow Functions dependency install fix

Date: 2026-08-02
Branch: `fix/studio-release-functions-dependency-install` (based on `origin/development` at `ead3e55`)

## Root cause

The root `package.json`'s `workspaces` field is `["apps/*", "packages/*"]` — `functions/` is
deliberately excluded (it has its own `package.json` and `package-lock.json`, a separate dependency
tree). The Studio release workflow (`.github/workflows/studio-release.yml`) ran root `npm ci` and
then immediately `npm --prefix functions run build`, without ever installing `functions`'s own
`node_modules`. On a clean GitHub Actions runner this produced `Cannot find module
'firebase-functions/v2/https'` plus cascading `Parameter 'request' implicitly has an 'any' type`
errors, exit code 1 — exactly what the first prerelease workflow run (`ead3e55`, run failed at
2m48s) showed.

## Reproduction (before fix)

Removed `functions/node_modules` locally and ran `npm --prefix functions run build`: reproduced
the identical `firebase-functions/v2/https` module-resolution failures across every function file
importing it (20+ errors).

## Fix

Added an explicit `Install Functions dependencies` step (`npm ci --prefix functions`) between the
existing root `Install dependencies` step and the `Run tests` step in
`.github/workflows/studio-release.yml`. No change to the Functions build command itself, no change
to lockfiles, no addition of `functions` to root workspaces.

## Verification (after fix, this pass)

| Check | Command | Result |
|---|---|---|
| Functions dependency install | `npm ci --prefix functions` | exit 0, 257 packages added, no lockfile drift |
| Functions build | `npm --prefix functions run build` | exit 0 — `firebase-functions/v2/https` resolves, no `request: any` errors |
| Repo lint | `npm run lint` | exit 0, 0 warnings |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | exit 0 |
| Updater focused tests | `npx tsx --test packages/shared/src/studioUpdate/studioUpdateStateTransitions.test.ts apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.test.ts apps/studio/electron/ipc/studioUpdate/studioUpdateIpcChannels.test.ts` | 14/14 pass |
| Studio typecheck | `npx tsc` (apps/studio) | exit 0 |
| Studio production package build (no publish) | `npm run build` (apps/studio) | exit 0 — produced `Fresh Prints-Windows-1.0.0-beta.1-Setup.exe` + blockmap + `latest.yml` locally, gitignored, not committed |
| Whitespace | `git diff --check` | exit 0 |

No GitHub Release was created or published during this local verification — the build ran without
`--publish`.

## Files changed

- `.github/workflows/studio-release.yml` (one new step)

## Confirmation

- The failed workflow run (`ead3e55`, "Studio release" / `build-and-release`) produced no release,
  no installer artifact, and no updater metadata — it failed during the Functions build step,
  before Studio packaging began.
- No production action occurred as part of this fix.
