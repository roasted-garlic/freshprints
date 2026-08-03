# Test Report: Studio update channel test fix (validate generated value, not a hardcoded default)

Date: 2026-08-02
Branch: `fix/studio-update-channel-test-generated-value` (based on `origin/development` at `e9be714`)

## Root cause

`apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.test.ts`'s `"dev-default generated
config resolves to stable"` test hardcoded `assert.equal(resolveStudioUpdateChannel(), "stable")`.
This assertion is only true when the generator was run with no `FRESH_PRINTS_UPDATE_CHANNEL` set
(the local dev default). The release workflow legitimately sets `FRESH_PRINTS_UPDATE_CHANNEL=prerelease`
for prerelease runs and generates `packagedBuildConfig.ts` with the literal value `"prerelease"`
before this test runs — the implementation was correct; the test asserted the wrong thing for the
environment it was actually running in.

## Fix

Replaced the hardcoded assertion with one that imports `PACKAGED_UPDATE_CHANNEL` directly from the
generated file and asserts `resolveStudioUpdateChannel()` equals it — the test now validates
whatever the generator actually produced for the build currently under test, rather than assuming
a fixed value. The separate `"resolves to a valid channel value"` test (asserting it's one of the
two valid literals) is unchanged. No production code was modified.

Default/stable/prerelease/invalid *generator* behavior remains covered exhaustively by
`apps/studio/scripts/generate-packaged-build-config.test.ts`, which was not touched.

## Verification (this pass)

### Prerelease scenario

Deleted `apps/studio/electron/generated/`, ran the generator with
`FRESH_PRINTS_UPDATE_CHANNEL=prerelease` — confirmed literal `"prerelease"` written. Ran the full
updater/generator test suite: **23/23 pass**, including the fixed test confirming
`resolveStudioUpdateChannel()` returns `"prerelease"`.

### Stable scenario

Deleted the generated directory again, ran the generator with `FRESH_PRINTS_UPDATE_CHANNEL=stable`
— confirmed literal `"stable"` written. Ran `studioUpdateChannel.test.ts` alone: **2/2 pass**.

### Default and invalid generator scenarios (unaffected, re-confirmed)

Ran `generate-packaged-build-config.test.ts` standalone: **4/4 pass** — unset still defaults to
`stable`, explicit `stable`/`prerelease` both still correct, and an unrecognized value still fails
closed (non-zero exit, no file written).

### Full release gate

| Check | Result |
|---|---|
| Repo lint | exit 0, 0 warnings |
| Functions build | exit 0 |
| Portal typecheck | exit 0 |
| Studio typecheck | exit 0 |
| Whitespace | `git diff --check` exit 0 |

Local generated config was left at its dev default (`stable`, no env var set) after verification.

## Files changed

- `apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.test.ts` (test-only change)

## Confirmation

- This fix produced no installer, artifact, or release — test/documentation-only change.
- Beta.1 was not touched.
- No production action occurred.
