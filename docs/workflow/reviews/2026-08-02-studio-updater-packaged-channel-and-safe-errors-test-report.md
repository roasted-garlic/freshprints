# Test Report: Studio updater packaged channel + safe error handling fix

Date: 2026-08-02
Branch: `fix/studio-updater-packaged-channel-and-safe-errors` (based on `origin/development` at `04b2634`)

## Root cause confirmation (two distinct defects, both confirmed at source level)

### 1. Channel never persisted into the packaged application

`apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.ts` read
`process.env.FRESH_PRINTS_UPDATE_CHANNEL` at runtime. The GitHub Actions workflow only ever set
this variable inside its own CI job process (`$GITHUB_ENV`, scoped to that job) — an installed
application launched later on an end user's machine has no such variable, and always fell back to
`"stable"` regardless of how it was built. Confirmed by observing the installed beta.1 report
"Stable channel" despite being built with `release_type: prerelease`.

### 2. `updater.channel = "prerelease"` is not a valid electron-updater GitHub-provider channel

Read `electron-updater@6.8.9`'s `GitHubProvider.js` directly:
`shouldFetchVersion = !currentChannel || ["alpha", "beta"].includes(currentChannel)` — only
`"alpha"` and `"beta"` are recognized standard prerelease channel names. Setting
`updater.channel = "prerelease"` made `currentChannel = "prerelease"`, which matches neither
condition, and `getChannelFilename("prerelease")` (`util.js`) requests a **`prerelease.yml`**
metadata file. `app-builder-lib`'s `AppInfo.channel` getter (confirmed in an earlier pass this
session) derives its published channel filename from the version's own semver prerelease tag
(`1.0.0-beta.1` → `beta` → `beta.yml`), never `prerelease.yml`. This mismatch is the direct cause
of the observed HTTP 406 against `/releases/latest` during the live A→B proof attempt.

### 3. Raw errors reached the renderer verbatim (found during this investigation, matches the report)

`errorMessageFrom()` returned `error.message` directly. Confirmed from `electron-updater`'s own
source (`GitHubProvider.js`'s `getLatestTagName`/`getLatestVersion`) that thrown errors can have
full HTTP response bodies, XML feed content, and stack traces interpolated directly into their
`message` string via `newError(...)` calls — the prior code comment claiming this was safe was
incorrect.

## Fix

### 1. Build-time packaged channel constant

New `apps/studio/scripts/generate-packaged-build-config.mjs` (following the existing
`generate-app-icon.mjs` one-off-script precedent) writes a gitignored generated file
(`apps/studio/electron/generated/packagedBuildConfig.ts`, added to `.gitignore`) containing a
literal `PACKAGED_UPDATE_CHANNEL: "stable" | "prerelease"` constant, from
`FRESH_PRINTS_UPDATE_CHANNEL` available only during the build process itself. Wired into
`apps/studio/package.json`'s `dev` and `build` scripts so it always runs before `tsc`/`vite build`.
Fails closed (non-zero exit, no file written) on any value other than exactly `"prerelease"`,
`"stable"`, or unset (which defaults to `"stable"`). `studioUpdateChannel.ts` now imports this
constant instead of reading `process.env` at runtime.

**Verified via actual compiled output** (not assumed): extracted the real packaged `app.asar` from
a full electron-builder build and confirmed the compiled main-process bundle contains
`function Ns() { return "prerelease"; }` — a literal return value, no environment-variable lookup
anywhere in the shipped code.

### 2. Corrected electron-updater feed configuration

Removed `updater.channel = "prerelease"` entirely. `allowPrerelease` is still correctly gated on
the packaged channel constant. With `channel` left unset, electron-updater derives the channel
directly from `app.getVersion()`'s own semver prerelease tag (e.g. `1.0.0-beta.2` → `beta`), which
always matches what electron-builder actually publishes for that exact version — verified this is
electron-updater's documented/coded default behavior by reading `GitHubProvider.js` directly
rather than assuming.

### 3. Safe error mapping

New `packages/shared/src/studioUpdate/studioUpdateErrorMapping.ts`'s `toSafeStudioUpdateError()`
maps any thrown error to one of five fixed, pre-written categories based only on structural
signals (`statusCode`, known `code` values, or neither) — it never inspects or forwards the
original error's `message` text. `studioUpdateService.ts`'s three error call sites
(`updater.on("error", ...)`, `checkForStudioUpdate`'s catch, `downloadStudioUpdate`'s catch) now
route through this mapper via a new `handleUpdaterError()` helper, which also logs only the safe
`logHint` (e.g. `HTTP_406`), never the raw error.

### 4. Settings UI hardening

The error panel in `StudioUpdatesSettingsSection.tsx` now explicitly documents (in a comment) that
`state.errorMessage` is always a short, fixed string from the safe mapper, renders it in a plain
wrapping `<p>` (never a `<pre>` or unbounded container), and states Studio remains fully usable.
The existing "Check for updates" button already covers retry for the error state, so no duplicate
action was added.

## Version correction

Bumped `apps/studio/package.json` to `1.0.0-beta.2` — the corrected manually-installed A baseline,
per this task's instruction not to overwrite or reuse the failed `1.0.0-beta.1` release. `beta.1`
remains published, untouched, unpublished-as-stable, as historical failed-test evidence.

## Tests added/updated

| File | Coverage |
|---|---|
| `apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.test.ts` (rewritten) | Channel resolves to a valid value; dev-default generated config resolves to `stable` |
| `apps/studio/scripts/generate-packaged-build-config.test.ts` (new) | Generator defaults to stable when unset; selects prerelease/stable on exact opt-in values; **fails closed** (non-zero exit, no file written) on an unrecognized value |
| `packages/shared/src/studioUpdate/studioUpdateErrorMapping.test.ts` (new) | HTTP errors with cookies/HTML/XML embedded in the raw message map to safe fixed strings with the raw text never appearing anywhere in the mapped result (asserted via `JSON.stringify` substring checks); download vs. check context produces different safe messages; known electron-updater error codes (`ERR_UPDATER_NO_PUBLISHED_VERSIONS`) map correctly; network error codes map correctly; non-Error thrown values handled safely |

## Verification results (this pass)

| Check | Command | Result |
|---|---|---|
| Updater + generator focused tests | `npx tsx --test .../studioUpdateStateTransitions.test.ts .../studioUpdateErrorMapping.test.ts .../studioUpdateChannel.test.ts .../studioUpdateIpcChannels.test.ts .../generate-packaged-build-config.test.ts` | **23/23 pass** |
| Studio typecheck | `npx tsc` (apps/studio) | exit 0 |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | exit 0 |
| Functions build | `npm run build` (functions/) | exit 0 |
| Repo lint | `npm run lint` | exit 0, 0 warnings |
| Whitespace | `git diff --check` | exit 0 |
| **Full electron-builder package build (prerelease config)** | generator run with `FRESH_PRINTS_UPDATE_CHANNEL=prerelease`, then `npx tsc && vite build && electron-builder` | exit 0 — produced `Fresh Prints-Windows-1.0.0-beta.2-Setup.exe` |

### Packaged beta.2 channel evidence

Extracted the actual built `app.asar` (`npx asar extract`) and confirmed the compiled main-process
bundle: `function Ns() { return "prerelease"; }` — literal, no env-var dependency.

### Packaged beta.2 Firebase evidence

Same extraction, renderer bundle: `VITE_FIREBASE_PROJECT_ID:"fresh-prints-dev"` present as the
actual resolved config value (this local build used the real `apps/studio/.env.local`). Confirmed
via `grep -rl "fresh-prints-prod"` across the entire extracted bundle: **no match** — no production
Firebase configuration is present anywhere in this build.

## CI workflow change

Added the same five updater/generator test files to `.github/workflows/studio-release.yml`'s
`Run tests` step so they run in CI going forward, not just locally (this was a pre-existing gap —
the updater tests were never part of the CI gate before this fix).

## Files changed

- `.gitignore` (ignore `apps/studio/electron/generated/`)
- `.github/workflows/studio-release.yml` (run updater tests in CI)
- `apps/studio/package.json` (version bump to `1.0.0-beta.2`; wire generator script into `dev`/`build`)
- `apps/studio/scripts/generate-packaged-build-config.mjs` (new)
- `apps/studio/scripts/generate-packaged-build-config.test.ts` (new)
- `apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.ts` (read generated constant, not env var)
- `apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.test.ts` (rewritten for new semantics)
- `apps/studio/electron/ipc/studioUpdate/studioUpdateService.ts` (removed invalid `updater.channel` assignment; safe error handling)
- `apps/studio/src/renderer/src/features/settings/components/StudioUpdatesSettingsSection.tsx` (hardened error rendering)
- `packages/shared/src/studioUpdate/studioUpdateErrorMapping.ts` (new)
- `packages/shared/src/studioUpdate/studioUpdateErrorMapping.test.ts` (new)

## Confirmation

- `1.0.0-beta.1`'s published release was not overwritten, modified, or deleted at any point during
  this fix — this pass built and inspected `1.0.0-beta.2` only, locally, and did not publish
  anything.
- No production action occurred. No `PROD_FIREBASE_*` secret or `fresh-prints-prod` value was
  read, referenced, or embedded anywhere in this pass.
