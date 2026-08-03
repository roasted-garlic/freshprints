# Test Report: Studio release workflow generated-channel-config ordering fix

Date: 2026-08-02
Branch: `fix/studio-release-generate-channel-config-before-tests` (based on `origin/development` at `2fc8b79`)

## Root cause

`apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.ts` imports the gitignored generated
file `apps/studio/electron/generated/packagedBuildConfig.ts`, produced only by
`apps/studio/scripts/generate-packaged-build-config.mjs`. The workflow's `Run tests` step (which
runs `studioUpdateChannel.test.ts` via `tsx --test`) was ordered **before** both `Set Studio
release channel env` and any invocation of the generator script. On a clean GitHub Actions
checkout — which never has this generated file — the test import failed with
`ERR_MODULE_NOT_FOUND`.

## Reproduction (before fix)

Removed the local generated file and re-ran the exact test: reproduced
`ERR_MODULE_NOT_FOUND ... packagedBuildConfig imported from studioUpdateChannel.ts` locally,
matching the CI failure precisely.

## Fix

Added a new `Generate Studio packaged build config` step (`node
scripts/generate-packaged-build-config.mjs`, working-directory `apps/studio`) directly between
`Set Studio release channel env` and `Run tests`. Corrected step order:

1. Install root dependencies
2. Install Functions dependencies
3. Set Studio release channel env
4. **Generate Studio packaged build config (new)**
5. Run tests (repo + updater)
6. Configure Studio Firebase environment
7. Configure optional Windows signing
8. Build Studio (NSIS + updater metadata) / publish

## Verification (this pass)

| Check | Result |
|---|---|
| Reproduced failure with generated file removed | `ERR_MODULE_NOT_FOUND`, matching CI exactly |
| Regenerated file, re-ran same test | Pass |
| Full updater + generator test suite | `npx tsx --test` across all 5 files — **23/23 pass** |
| Repo lint | exit 0, 0 warnings |
| Whitespace | `git diff --check` exit 0 |

## Files changed

- `.github/workflows/studio-release.yml` (step reorder + one new step)

## Confirmation

- No installer, updater metadata, artifact, or draft release was produced or touched by this fix
  — it only reorders CI steps.
- No production action occurred.
