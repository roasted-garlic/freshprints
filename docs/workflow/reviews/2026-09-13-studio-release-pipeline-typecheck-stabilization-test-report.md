# Test Report — Studio release pipeline typecheck stabilization

| Field | Value |
|---|---|
| Corrective child | `studio-release-pipeline-typecheck-stabilization` |
| Date | 2026-09-13 |
| Result | **RC PACKAGE VALIDATION PASS — Owner QA pending** |
| Validation SHA | `5bf477fcf676f37265018262268ee5e8734e8eff` |
| Workflow run | [34739620667](https://github.com/roasted-garlic/freshprints/actions/runs/34739620667) |
| Version / mode | Studio `1.0.10`; `prerelease`; `internal-unsigned` |

## Implementation and local validation

- All 29 reviewed TypeScript diagnostics are resolved in the consolidated corrective.
- `npx tsc -p apps/studio/tsconfig.json --noEmit --pretty false`: **PASS — zero diagnostics**.
- Corrective/lint policy/release helper suite: **49/49 PASS**.
- Relevant targeted suites: **198/198 tests PASS** across 38 suites.
- Baseline-aware lint: **PASS**, `current=19 baseline=25 new=0 removed=6`; the checked-in baseline
  remains exactly 25 findings (20 errors / 5 warnings) and was not modified.
- Targeted lint on all changed source/test files: **PASS**.
- `git diff --check`: **PASS**, line-ending conversion warnings only.

## Remote workflow results

Both platform jobs passed checkout, baseline-aware lint, Functions build, Portal typecheck, Studio
updater tests, environment/signing policy checks, Studio TypeScript, packaging, artifact verification,
and upload. Finalize-release also passed; no stable release mutation was performed.

| Platform | Result | Evidence |
|---|---|---|
| Windows | **PASS** | NSIS package built and verified; Windows artifact uploaded |
| macOS | **PASS** | arm64 and x64 DMG/ZIP packages built, merged metadata verified, uploaded |
| Finalize | **PASS** | dual-platform assets and version `1.0.10` verified; combined evidence uploaded |

## RC artifacts and hashes

Package filenames and SHA-256 values emitted by the workflow:

| Artifact | SHA-256 |
|---|---|
| `Fresh-Prints-Windows-1.0.10-Setup.exe` | `712bf32b2c2e4b78a3ad34450f35dbd5296f50bb41a817d619db061297c1defa` |
| `Fresh-Prints-Mac-arm64-1.0.10-Installer.dmg` | `c84877785614f954c12c8d2189424b127e85f3e473a74c01c640d7bcb9429d9d` |
| `Fresh-Prints-Mac-arm64-1.0.10-Installer.zip` | `8a9ce2c1842238b22a19fdd00bb892474e91cbd0ae24cecb285d74aab1fc02d6` |
| `Fresh-Prints-Mac-x64-1.0.10-Installer.dmg` | `260bbd59660ac76057b2d2484be3418a1f3964dcc6cf3625f3d095660053186a` |
| `Fresh-Prints-Mac-x64-1.0.10-Installer.zip` | `b6f1232faaac8e62717777647a03ac0d1f9568f0fdae12388e1b90ccc7eb301a` |

The workflow also verified required blockmaps and updater metadata. GitHub Actions artifact archive
digests were Windows `3c09d422acc3e06ccf5ff67dbb8056ef150e0806a4aaeacbc88b974f12943861`, macOS
`1f2813166fd22a11b3421c186d85aee43ff6d4f344a5cddf7edd1b52210acd49`, and combined evidence
`9b4061b0b5f092a3e240a9edfa862b09f252ac1a88b9376c7be871616db3d775`.

Provenance is the GitHub Actions run above, against the immutable temporary RC SHA, using the
repository workflow's prerelease/internal-unsigned validation mode. No stable GitHub Release or
stable tag was created.

## Owner QA gate

Owner QA is required for the Windows installer before consolidated Signoff:

1. Upgrade installed Studio `v1.0.9` to RC `1.0.10`.
2. Launch Studio.
3. Verify version `1.0.10`.
4. Confirm Settings opens.
5. Confirm Design Library opens.
6. Confirm Print Requests opens.
7. Confirm User Info opens.
8. Confirm maintenance controls are present.
9. Confirm production hard-delete UI is unavailable.
10. Confirm updater/install completes normally.

No separate Mac Owner QA is requested unless release policy requires interaction not covered by the
automated package checks.

## Production boundary

Production was untouched. No production reads or writes, deployment, publication, maintenance
activation, runner, DRY RUN, VERIFY, APPLY/backfill, settings/Auth/secrets mutation, development
merge, candidate freeze, or stable release/tag action occurred.
