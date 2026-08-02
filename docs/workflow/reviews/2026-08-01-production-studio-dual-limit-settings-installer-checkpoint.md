# Checkpoint: Production Studio installer — dual-limit Settings

| Field | Value |
|---|---|
| Date | 2026-08-01 |
| Production source | `11960852f45f948e37a1a5aeb3b09699882cd1fd` |
| Result | **PASS — installer built and verified; owner QA pending** |
| Installer | `Fresh Prints-Windows-0.0.0-Setup-dual-limit-settings.exe` |
| Exact path | `C:\coding\fresh-prints\apps\studio\release\0.0.0\Fresh Prints-Windows-0.0.0-Setup-dual-limit-settings.exe` |
| Size | 106,249,514 bytes |
| SHA-256 | `294EC213F811010D61EA4028ACF9185BC8DDEA3426530F242346ED9FC3AB0BE9` |

## Source verification

- Fetched all remotes and fast-forwarded local `production`.
- `HEAD` and `origin/production` were exactly `11960852f45f948e37a1a5aeb3b09699882cd1fd`; the approved commit was present and no newer production commit existed.
- Working tree was clean. PR #16 / Amendment 1 Studio Settings implementation was present.
- Build used a temporary `.env.production.local` derived from the approved production Web configuration. It was removed after packaging; normal development `.env.local` remains pointed at `fresh-prints-dev`.

## Verification results

| Check | Result |
|---|---|
| Shared dual-limit + Rules-alignment focused tests | exit 0; 11/11 pass |
| Retired daily-limit + customer-show fit/usage tests | exit 0; 27/27 pass |
| Studio TypeScript | exit 0 |
| Repository lint | exit 0; zero warnings |
| Studio production build + electron-builder/NSIS | exit 0 |
| `git diff --check` | exit 0 |

Source and test verification confirms: linked defaults and migration-free fallback; equal-value linked saves; independent unlinked values; linkage preference reload model; request-limit/customer-show split; no restored print-request daily bucket; active-owner-only callable writes. Component paths confirm linked edits mirror either field, unlinked edits remain independent, and re-linking copies the current print-request value into the customer-show value.

The renderer embeds `fresh-prints-prod` and the expected dual-limit labels. `app.asar` contains `app-icon.png` and both Fresh Prints Studio logo variants. Windows icon extraction from the installer and packaged executable produced the same Fresh Prints Studio icon. Test Data Reset navigation is gated off in production and direct navigation returns `Not available on this project`; Catalog Storage Inventory functionality is absent from the production bundle.

## Non-actions

- Installer was not installed and the owner's existing Studio was not overwritten.
- No Functions, Rules, indexes, App Hosting, settings/data, Auth/secrets, DNS/domain, Stage 2, or release-tag action occurred.
- Production settings remain unchanged and require separate approval after owner QA.

Next checkpoint: `CONTINUE WORKFLOW: PRODUCTION OWNER QA DUAL LIMIT SETTINGS`.
