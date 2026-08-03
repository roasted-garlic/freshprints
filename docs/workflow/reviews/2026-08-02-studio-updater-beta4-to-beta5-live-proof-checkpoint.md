# Checkpoint: Studio 1.0.0-beta.4 → 1.0.0-beta.5 live automatic-update proof (final)

Date: 2026-08-02

## Verdict: PASS

Owner confirmed the complete live beta.4 → beta.5 automatic-update proof, 2026-08-02:

| Check | Result |
|---|---|
| Starting version | `1.0.0-beta.4` |
| Detected version | `1.0.0-beta.5` |
| Channel | `Prerelease` |
| Release notes displayed as safe readable plain text | Confirmed |
| No raw HTML tags appeared | Confirmed |
| Headings and bullets remained understandable | Confirmed |
| Long content stayed within the bounded scrollable notes region | Confirmed |
| Download update | Worked |
| Restart to Update | Worked |
| NSIS installer wizard | Did not appear |
| Installation | Completed silently |
| Studio relaunch | Automatic |
| Final version | `1.0.0-beta.5` |
| Final channel | `Prerelease` |
| Sign-in | Valid |
| Settings | Intact |
| `fresh-prints-dev` data | Intact |
| Settings tabs on one row | Confirmed |
| Raw updater error | None appeared |

## Significance

This is the first live proof of the release-note formatter (`normalizeStudioReleaseNotes`) —
beta.4, itself built with the formatter, correctly rendered beta.5's release notes (including
headings, bold text, lists, a link, and a long unbroken test string) as safe, bounded, readable
plain text with zero raw HTML exposure. Combined with the beta.2→beta.3 (silent-install
regression discovered) and beta.3→beta.4 (silent-install fix confirmed) proofs, this closes the
full verification loop:

- Packaged build-time channel selection: **live-proven** (beta.2, beta.3, beta.4, beta.5 all
  correctly self-reported `Prerelease`).
- electron-updater GitHub-provider feed/channel correctness: **live-proven** (every detection in
  this chain succeeded against the real published releases).
- Silent automatic installation: **live-proven** (beta.3→beta.4 and beta.4→beta.5 both installed
  with no NSIS wizard).
- Safe release-note rendering: **live-proven** (this proof).
- Safe updater error mapping: **live-proven** (no raw GitHub HTTP response ever appeared again
  after the fix, across three subsequent update cycles).
- Data/session preservation across updates: **live-proven** (sign-in, settings, `fresh-prints-dev`
  data all survived four consecutive updates: beta.2→3→4→5).

**No additional beta cycle is required.** `1.0.0-beta.5` is the final prerelease proof build.
Studio automatic updates are eligible for final Signoff.
