# Checkpoint: Studio 1.0.0-beta.2 installed-app QA

Date: 2026-08-02
Source: `1.0.0-beta.2` release (GitHub Actions workflow, `development` at merge time), published as
a GitHub prerelease after the owner manually marked the draft as "Pre-release" (see
`docs/standards/DEPLOYMENT.md`'s "Human approval gate before any release is publicly visible" —
prerelease labeling and publishing are manual GitHub UI checkpoints, not automated by the
workflow).

## Verdict: PASS

Owner manually installed `1.0.0-beta.2` and confirmed, 2026-08-02:

| Check | Result |
|---|---|
| Displayed version | `1.0.0-beta.2` — correct |
| Displayed update channel | `Prerelease` — correct (confirms the build-time `PACKAGED_UPDATE_CHANNEL` fix from `docs/workflow/reviews/2026-08-02-studio-updater-packaged-channel-and-safe-errors-test-report.md` works in a real installed package, not just local extraction/inspection) |
| Update check result | Reports the latest version normally (no error) |
| Raw GitHub response/error | Gone — confirms the safe error-mapping fix (`toSafeStudioUpdateError`) is effective, and confirms the `updater.channel` GitHub-provider feed-selection fix resolved the earlier HTTP 406 |
| Sign-in | Works |
| Existing settings and `fresh-prints-dev` data | Preserved |

This is the first live, interactive confirmation (as opposed to static bundle inspection) that:
- the packaged-channel build-time fix works end-to-end in a real installed application;
- the electron-updater GitHub-provider channel/feed fix resolves real update checks against the
  actual published release;
- the safe error-mapping fix prevents raw HTTP/XML/cookie content from reaching the Settings UI.

## Status

`1.0.0-beta.2` is confirmed as the working, valid **A baseline** for the real automatic-update
proof. Proceeding to prepare `1.0.0-beta.3` as the **B** target per
`docs/standards/DEPLOYMENT.md`'s A→B prerelease proof procedure.
