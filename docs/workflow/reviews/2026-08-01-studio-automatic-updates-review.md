# Formal Review: Studio automatic updates

Date: 2026-08-01
Verdict: **APPROVED WITH CHANGES — owner decisions required before Implement**

Plan: `docs/workflow/plans/2026-08-01-studio-automatic-updates-plan.md`

## Findings

1. **No updater stack today** — no `electron-updater`, no `publish` config, no main-process autoUpdater, no update UI. Greenfield within established Electron IPC patterns is appropriate.
2. **Credential rule is correctly framed** — private-repo GitHub Releases must not use embedded tokens. Prefer a public binary feed or public Storage/CDN. Repo visibility was not machine-confirmed this run (`gh` unavailable); treat as private until owner confirms.
3. **Versioning must change** — `apps/studio/package.json` is `0.0.0`; updater requires monotonic semver. Recommendation `1.0.0` for first public updater-enabled release is sound.
4. **Signing gap** — no Authenticode configuration. Public launch without signing needs an explicit written exception; otherwise signing is required.
5. **No root GitHub Actions workflows** in checkout — release automation must be added, not extended. Human gate before stable publish is mandatory.
6. **NSIS per-user install** (`perMachine: false`) favors non-admin updates and data retention (`deleteAppDataOnUninstall: false`) — good baseline.
7. **Separation from reporting** — Formal Review confirms updater must not be implemented inside the reporting feature’s commit history without its own Implement phase after decisions.

## Required changes before Implement

1. Owner answers all 18 decisions in the plan (or explicitly accepts the recommended baseline).
2. Confirm repository visibility and name the exact update provider/feed URL strategy.
3. Confirm code-signing path (cert source + CI secret names) or document public-launch exception.
4. Lock production Studio semver (`1.0.0` recommended).

## Security notes

- Fail closed on missing publish URL in packaged builds (no update check) rather than embedding secrets.
- Prerelease channel must be unreachable from stable channel configuration.
- Logs must omit tokens and download auth headers.

## Verdict rationale

Plan is sufficient to proceed **after** owner decisions. **Do not implement** until:

`APPROVE STUDIO AUTOMATIC UPDATE OWNER DECISIONS`

No production action authorized by this review.
