# Checkpoint: Studio 1.0.0-beta.2 → 1.0.0-beta.3 live automatic-update proof

Date: 2026-08-02

## Verdict: PASS WITH NOTES

The live beta.2 → beta.3 automatic-update proof completed successfully end-to-end:

| Check | Result |
|---|---|
| Starting version | `1.0.0-beta.2` |
| Detected version | `1.0.0-beta.3` |
| Download initiated from Studio | Confirmed |
| Installer successfully installed beta.3 | Confirmed |
| Studio relaunched | Confirmed |
| Final version | `1.0.0-beta.3` |
| Final channel | `Prerelease` |
| Sign-in / settings / `fresh-prints-dev` data preserved | Confirmed |
| Settings tabs remained on one row | Confirmed |
| No raw updater error appeared | Confirmed |
| No manual beta.3 download or manual installer launch required | Confirmed |

This is the first real, live confirmation (not static bundle inspection) that the packaged-channel
build-time fix, the electron-updater GitHub-provider channel/feed fix, and the safe error-mapping
fix all work correctly end-to-end in a real installed application talking to a real published
GitHub Release.

## Notes (do not characterize this proof as failed)

1. **The Windows NSIS installer wizard appeared during the automatic update.** Root cause: the
   automatic-update restart/install code called `autoUpdater.quitAndInstall(false, true)` —
   `isSilent=false` runs the installer with its normal interactive wizard, which is correct for a
   manually-downloaded first install but not for an automatic background update the user already
   approved via "Restart to Update". Addressed in
   `docs/workflow/reviews/2026-08-02-studio-updater-silent-install-and-release-notes-test-report.md`.
2. **The available-update description displayed raw GitHub HTML** (`<p>`, `<a>` tags) inside an
   unwrapped `<pre>`, overflowing the Settings card. Root cause: `StudioUpdatesSettingsSection.tsx`
   rendered `state.availableRelease.releaseNotes` — sourced directly from electron-updater's
   `UpdateInfo.releaseNotes`, which is GitHub's rendered release-body HTML — in a raw `<pre>` with
   no sanitization or bounding. Addressed in the same remediation pass referenced above.

## Status

Both notes are being remediated in `fix/studio-updater-silent-install-and-release-notes` before the
next live proof (beta.3 → beta.4). Beta.3 remains the confirmed working A baseline for that proof.
