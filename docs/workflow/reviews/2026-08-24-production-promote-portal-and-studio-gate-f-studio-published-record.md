# Record: Studio 1.0.9 PUBLISHED — Gate F complete

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Goal | `production-promote-portal-and-studio-2026-08-23` |
| Owner smoke | `OWNER STUDIO 1.0.9 PACKAGED SMOKE: PASS` |
| Owner authorization | `APPROVE STUDIO PUBLISH: 1.0.9` |
| Release ID | **`375869566`** |
| Tag | **`untagged-ac82c9de5862b0ae7d2d`** (unique tag from finalize; release **name** `1.0.9`) |
| URL | https://github.com/roasted-garlic/freshprints/releases/tag/untagged-ac82c9de5862b0ae7d2d |
| `draft` | **false** |
| `make_latest` | **true** (GitHub **Latest**) |
| `published_at` | `2026-08-24T17:31:11Z` |
| `target_commitish` | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** |
| Build workflow | [**32754684436**](https://github.com/roasted-garlic/freshprints/actions/runs/32754684436) — SUCCESS |
| Distribution | `stable` / `internal-unsigned` |
| Method | `node .github/scripts/publish-studio-stable-github-release.mjs --release-id 375869566 --version 1.0.9 --sha f35c96d…` |

---

## Preflight (passed)

| Check | Result |
|-------|--------|
| Draft `target_commitish` | **`f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`** |
| Assets (8) | Windows exe+blockmap, Mac x64/arm64 dmg+zip, latest.yml, latest-mac.yml |
| Owner packaged smoke | **PASS** |
| **v1.0.8** (`374575547`) | **unchanged** — still `v1.0.8`, SHA `3210190…`, assets intact |

---

## Publish verification

| Check | Result |
|-------|--------|
| `GET /releases/latest` | **375869566** — name **1.0.9**, `draft=false` |
| Release list | **1.0.9** marked **Latest** |
| `latest.yml` `version` | **1.0.9** — path `Fresh-Prints-Windows-1.0.9-Setup.exe` |
| `latest-mac.yml` `version` | **1.0.9** — arm64 + x64 dmg/zip entries |
| Final release copy | No draft-warning text (final body applied) |
| **v1.0.7** / **v1.0.8** | Not modified |

---

## Published assets

| Asset | Platform |
|-------|----------|
| `Fresh-Prints-Windows-1.0.9-Setup.exe` | Windows |
| `Fresh-Prints-Windows-1.0.9-Setup.exe.blockmap` | Windows |
| `Fresh-Prints-Mac-x64-1.0.9-Installer.dmg` | Mac x64 |
| `Fresh-Prints-Mac-x64-1.0.9-Installer.zip` | Mac x64 |
| `Fresh-Prints-Mac-arm64-1.0.9-Installer.dmg` | Mac arm64 |
| `Fresh-Prints-Mac-arm64-1.0.9-Installer.zip` | Mac arm64 |
| `latest.yml` | Windows updater |
| `latest-mac.yml` | Mac updater metadata |

---

## Accepted limitations (unchanged)

- A2 Developer ID **declined** (ADR-FP-136)
- Mac auto-update **install** unsupported
- Windows automatic updates supported
