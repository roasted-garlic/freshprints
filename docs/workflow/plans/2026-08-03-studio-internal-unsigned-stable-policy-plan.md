# Plan: Studio internal-unsigned stable distribution policy

| Field | Value |
|-------|-------|
| Date | 2026-08-03 |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal | `production-release` Goal #13 / `studio-automatic-updates` |
| Production baseline | `ab2d4675f0915a7658bb112d29b7985c3dcb42fb` |

## Product decision (owner-confirmed)

Fresh Prints Studio is an internal staff tool, installed only on computers the owner controls. The
owner has decided not to purchase a publicly trusted Windows code-signing certificate for this
release. An unsigned stable build is approved **only** through an explicit internal-distribution
path, never as a silent default.

## Goal

Add a `distribution_mode` (`signed` | `internal-unsigned`) input to the manual Studio release
workflow so a stable build can proceed without Windows signing credentials when explicitly
selected, while every other stable safeguard (production-source restriction, mandatory
`PROD_FIREBASE_*` values, draft-only GitHub Release publication, silent-install/assisted-manual-
install behavior) remains exactly as-is.

## Investigation (repo evidence)

- `.github/workflows/studio-release.yml`'s `Configure optional Windows signing` step currently has
  three branches: both signing secrets present → configure; neither present + `release_type:
  prerelease` → proceed unsigned; neither present + `release_type: stable` → fail closed
  (`exit 1`). A partial config (one secret only) always fails closed regardless of release type.
- No `distribution_mode`-equivalent input exists today — `release_type` (`prerelease` | `stable`)
  is the only dispatch input governing this behavior.
- The `Configure Studio Firebase environment` step is independent of the signing step and already
  unconditionally requires all six `PROD_FIREBASE_*` values for `release_type: stable` — this Plan
  does not touch that step's logic at all.
- The stable-ref guard (`Guard stable release ref` + `Verify ref is reachable from production`) is
  also independent of signing and is unaffected by this change.

## Approach

1. Add a new `workflow_dispatch` input `distribution_mode`, type `choice`, options `signed` |
   `internal-unsigned`, default `signed` (the safest, existing behavior — an operator must actively
   opt into `internal-unsigned`, it is never implicit).
2. `distribution_mode` is only meaningful when `release_type: stable`; for `prerelease` its value
   is ignored (prerelease continues to build unsigned exactly as today, regardless of what's
   selected — this preserves the existing 5-build-proven prerelease path with zero risk of
   regression).
3. Rewrite the `Configure optional Windows signing` step's decision logic:
   - `release_type != stable` → existing prerelease behavior, unchanged (log unsigned-prerelease
     message, proceed).
   - `release_type == stable` and `distribution_mode == internal-unsigned` and both signing
     secrets absent → print an explicit, prominent warning that this build is unsigned and
     restricted to internal distribution, proceed without signing.
   - `release_type == stable` and `distribution_mode == internal-unsigned` and *some* signing
     config exists (partial or full) → still honor the existing partial-config fail-closed rule
     first (a half-configured secret pair is always an error, regardless of mode); if both are
     fully present, sign anyway (having a certificate is never a reason to withhold it) and skip
     the internal-unsigned warning.
   - `release_type == stable` and `distribution_mode == signed` (or unset/default) and signing
     secrets are incomplete or absent → existing fail-closed behavior, unchanged.
4. No change to the Firebase-configuration step, the stable-ref guard, the packaged-channel
   generator, the updater runtime (silent install, user-gated download/restart), or
   `electron-builder.json5`'s manual first-install NSIS config.

## Scope

In scope: `.github/workflows/studio-release.yml` (new input + rewritten signing-step logic only),
new focused tests proving every mode combination, `docs/standards/DEPLOYMENT.md` policy
documentation, the production prerequisites audit doc (superseding note), workflow-state/
handoff-doc updates.

Out of scope: version bump to `1.0.0`, running the workflow, any release/tag/publish action,
Firebase secrets, certificate acquisition, Firebase/App Hosting deployment, DNS/domain.

## Test strategy

Source-level regression-guard tests (matching the pattern already used for
`studioUpdateService.test.ts`'s `quitAndInstall` call-site check, since GitHub Actions workflow
YAML logic embedded in `run:` blocks isn't independently unit-testable the way TypeScript is) plus
direct re-execution of the exact PowerShell decision logic with synthetic (non-real) values for
every required combination listed in the parent task.

## Risks

- An internal-unsigned installer will trigger Windows SmartScreen "unrecognized publisher"
  warnings on every install — mitigated by requiring staff to source the installer only from the
  private GitHub Releases page and documenting this prominently.
- A future public-facing Studio release must not silently inherit `internal-unsigned` as a
  default — mitigated by keeping `signed` as the workflow input's default value and requiring an
  explicit selection to deviate.

## Rollback

Revert the workflow file; no other system depends on this input.

## Explicit non-actions this pass

No version bump, no workflow run, no release, no Firebase/App Hosting action, no certificate
acquisition, no signing-secret creation.
