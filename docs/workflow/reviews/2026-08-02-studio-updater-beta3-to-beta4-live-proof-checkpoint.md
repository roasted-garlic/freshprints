# Checkpoint: Studio 1.0.0-beta.3 → 1.0.0-beta.4 live automatic-update proof

Date: 2026-08-02
Source: fixes from `docs/workflow/reviews/2026-08-02-studio-updater-silent-install-and-release-notes-test-report.md` (silent install via `quitAndInstall(true, true)`; safe bounded release-note rendering)

## Verdict: PASS

Owner confirmed the live beta.3 → beta.4 automatic-update proof, 2026-08-02:

| Check | Result |
|---|---|
| Starting version | `1.0.0-beta.3` |
| Detected version | `1.0.0-beta.4` |
| Update downloaded through Studio | Confirmed |
| Restart to Update explicitly selected by owner | Confirmed |
| Windows NSIS installer wizard | **Did not appear** — confirms the `quitAndInstall(true, true)` silent-install fix works live, not just in packaged-bundle inspection |
| Silent installation | Completed |
| Studio relaunch | Automatic |
| Final version | `1.0.0-beta.4` |
| Final channel | `Prerelease` |
| Sign-in | Preserved |
| Settings | Preserved |
| `fresh-prints-dev` data | Preserved |
| Settings tabs on one row | Confirmed |
| Raw updater error | None appeared |

## Note (non-blocking — does not affect this verdict)

The beta.4 release-note formatter (`normalizeStudioReleaseNotes`) could not be visually confirmed
during this specific update, because the **update-available screen showing beta.4's release notes
was rendered by the still-running beta.3 process** — Studio always displays an available update's
metadata using the currently-installed version's own renderer code, before that version has been
replaced. Since beta.3 predates the release-note fix, seeing raw/unformatted content at that stage
(if any was observed) was expected and is not evidence the beta.4 formatter is broken. The
formatter's actual behavior can only be proven once beta.4 itself is the running version detecting
a newer release — this is exactly what the subsequent beta.4 → beta.5 proof is for.

This is **not** a "PASS WITH NOTES" — the silent-update remediation itself (the entire subject of
this proof) passed completely and unambiguously. The release-note formatter is a separate,
already-implemented and unit-tested feature (12/12 tests passing, `docs/workflow/reviews/2026-08-02-studio-updater-silent-install-and-release-notes-test-report.md`)
whose live proof is simply sequenced into the next update cycle.

## Status

`1.0.0-beta.4` is confirmed as the working **A baseline** for the beta.4 → beta.5 proof, which will
be the first live test of the release-note formatter (beta.4 detecting and rendering beta.5's
release notes) in addition to re-confirming silent install.
