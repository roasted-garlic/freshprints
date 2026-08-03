# Test Report: Studio release workflow optional Windows signing fix

Date: 2026-08-02
Branch: `fix/studio-release-optional-windows-signing` (based on `origin/development` at `52fd5b9`)

## Root cause

GitHub Actions resolves an unset `secrets.*` reference to an empty string, not an absent variable.
The Studio build step unconditionally set `CSC_LINK: ${{ secrets.WINDOWS_CSC_LINK }}` and
`CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CSC_KEY_PASSWORD }}`. With no signing secrets configured,
this passed `CSC_LINK=""` to electron-builder, which then tried to resolve the empty string as a
certificate file path and failed: `Env WIN_CSC_LINK is not correct, cannot resolve:
D:\a\freshprints\freshprints\apps\studio not a file`. This occurred after Studio's renderer/main/
preload builds succeeded, during electron-builder packaging — confirmed from the second workflow
run's failure point.

## Fix

Added a `Configure optional Windows signing` PowerShell step before the build step that:
- Exports `WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD` to `$GITHUB_ENV` **only** when both
  `WINDOWS_CSC_LINK`/`WINDOWS_CSC_KEY_PASSWORD` secrets are non-empty (never as blank strings).
- Fails closed (exit 1, no secret value logged) if exactly one of the two secrets is set.
- Fails closed for `release_type: stable` when neither secret is set, with a clear non-secret
  error message.
- Logs a plain informational message and defines neither variable when neither secret is set and
  `release_type` is `prerelease`.

Removed the unconditional `CSC_LINK`/`CSC_KEY_PASSWORD` env mappings from the build step entirely.
`GH_TOKEN` (GitHub release publishing) is unchanged.

## Verification (this pass)

### Signing-logic paths (PowerShell 7, local, exact script logic from the workflow)

| Path | Inputs | Result |
|---|---|---|
| Unsigned prerelease | no secrets, `release_type=prerelease` | Logs "building unsigned prerelease", exports nothing — **PASS** |
| Both credentials present | both secrets set, `release_type=stable` | Exports `WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD` correctly, values never echoed to console — **PASS** |
| Partial credentials | only `WINDOWS_CSC_LINK` set | Fails closed before packaging, fake cert-path value never appears in any output — **PASS** |
| Stable, missing credentials | no secrets, `release_type=stable` | Fails closed with a clear, non-secret error — **PASS** |

### Full local gate (with `CSC_LINK`/`CSC_KEY_PASSWORD`/`WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD` genuinely unset in the shell, matching an unconfigured CI runner)

| Check | Command | Result |
|---|---|---|
| Root dependency install | `npm ci` | exit 0 |
| Functions dependency install | `npm ci --prefix functions` | exit 0 |
| Functions build | `npm run build` (functions/) | exit 0 |
| Repo lint | `npm run lint` | exit 0, 0 warnings |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | exit 0 |
| Updater focused tests | `npx tsx --test .../studioUpdateStateTransitions.test.ts .../studioUpdateChannel.test.ts .../studioUpdateIpcChannels.test.ts` | 14/14 pass |
| Studio typecheck | `npx tsc` (apps/studio) | exit 0 |
| **Studio production package build (unsigned, no publish)** | `env -u CSC_LINK -u CSC_KEY_PASSWORD -u WIN_CSC_LINK -u WIN_CSC_KEY_PASSWORD npm run build` (apps/studio) | **exit 0** — no "not a file" error; produced `Fresh Prints-Windows-1.0.0-beta.1-Setup.exe`, blockmap, and `latest.yml`, unsigned, gitignored, not committed |
| Whitespace | `git diff --check` | exit 0 |

No GitHub Release was created or published during this local verification — the build ran without
`--publish` and with no `GH_TOKEN` present locally.

## Files changed

- `.github/workflows/studio-release.yml` (replaced unconditional signing env with the conditional
  signing-configuration step)

## Confirmation

- The failed run reached electron-builder but produced no release, no installer artifact, and no
  updater metadata — it failed during packaging, before any publish step.
- No production action occurred as part of this fix.
