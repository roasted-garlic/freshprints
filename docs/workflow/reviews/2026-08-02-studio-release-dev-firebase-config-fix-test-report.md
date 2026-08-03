# Test Report: Studio release workflow Firebase environment fix

Date: 2026-08-02
Branch: `fix/studio-release-dev-firebase-config` (based on `origin/development` at `b156d61`)

## Root cause

Studio reads its Firebase project config from six `VITE_FIREBASE_*` Vite env vars, sourced by
default from `apps/studio/.env.local` (gitignored, per this repo's established convention — no
`.env`/`.env.local` file is tracked in git; only the blank `.env.example` template is committed).
`validateFirebaseEnv()` (`apps/studio/src/renderer/src/config/env.ts`) throws if any value is
missing — **but this check runs at Studio's actual runtime launch** (a top-level `const` evaluated
when the renderer module loads), not at Vite's build time. Vite happily bundles the app with all
six values as empty strings and reports a successful build.

The Studio release workflow (`.github/workflows/studio-release.yml`) never wrote
`apps/studio/.env.local` or set any `VITE_FIREBASE_*` variable before building. This meant the
first successful beta.1 CI build (produced after the Functions-dependency and signing fixes) was
packaged with **no Firebase project embedded at all** — not `fresh-prints-dev`, not
`fresh-prints-prod`, nothing. It would very likely have thrown `Missing required Firebase
environment variable: VITE_FIREBASE_API_KEY` and failed to start normally on launch, rather than
silently connecting to the wrong project.

## Reproduction (before fix)

Removed `apps/studio/.env.local` and ran `npx vite build`: build succeeded (exit 0) as before.
Inspected the built bundle (`dist/assets/*.js`): `VITE_FIREBASE_PROJECT_ID:""` was baked in as a
literal empty string. The `fresh-prints-dev` text appearing elsewhere in the same bundle is
unrelated UI copy in `TestDataResetPage.tsx` and code comments, not the resolved Firebase config —
confirmed by locating the exact source lines that produce those matches.

## Fix

Added a `Configure Studio Firebase environment` PowerShell step before the existing signing step,
which:
- Selects `DEV_FIREBASE_*` secrets for `release_type: prerelease` and `PROD_FIREBASE_*` secrets
  for `release_type: stable`.
- Fails closed (exit 1, no secret value logged beyond the resolved project ID itself, which is
  not sensitive) if any of the six required values for the selected release type is missing or
  blank.
- Writes `apps/studio/.env.local` with the resolved values before the Studio build step runs.

**Bug found and fixed during verification, not assumed correct:** the initial missing-secret check
used `if ($values | Where-Object { [string]::IsNullOrWhiteSpace($_) })`. PowerShell's truthiness
treats a *single empty-string* result from that pipeline as **falsy**, so this check would have
silently passed even with a genuinely missing secret. Reproduced this directly in a local
PowerShell 7 session before shipping the fix. Corrected to
`($values | Where-Object { ... }).Count -gt 0`, and re-verified both the missing-secret and
all-present cases pass correctly with the corrected form.

## Verification (this pass)

### Local `.env.local` generation + build (exact production-path logic)

| Step | Result |
|---|---|
| Generate `.env.local` with valid dev values via the corrected PowerShell logic | Correctly wrote all 6 `VITE_FIREBASE_*` lines |
| `npx vite build` with that generated `.env.local` | exit 0; bundle inspection confirms `VITE_FIREBASE_PROJECT_ID:"fresh-prints-dev"` (and all other real values) baked in as the actual resolved config object, distinct from the unrelated all-blank reduce-accumulator literal also present in the same file |
| Missing-secret path (one value blank) | Correctly detected via `.Count -gt 0` after fixing the truthiness bug found during this verification; would exit 1 before writing `.env.local` |
| All-present path | Correctly proceeds and reports the resolved project ID |

Local `apps/studio/.env.local` was backed up before this test and restored unchanged afterward —
no real credential was modified or exposed.

### Full local gate

| Check | Command | Result |
|---|---|---|
| Updater focused tests | `npx tsx --test .../studioUpdateStateTransitions.test.ts .../studioUpdateChannel.test.ts .../studioUpdateIpcChannels.test.ts` | 14/14 pass |
| Repo lint | `npm run lint` | exit 0, 0 warnings |
| Whitespace | `git diff --check` | exit 0 |

(Root/Functions install, Functions build, Portal typecheck, Studio typecheck, and Studio package
build were already re-verified clean in the two prior fix passes on this same workflow file this
session and are unaffected by this change, which only adds a new step before the existing signing
step.)

## Required new GitHub repository secrets

This fix requires the owner to add, before the next workflow run:

- `DEV_FIREBASE_API_KEY`
- `DEV_FIREBASE_AUTH_DOMAIN`
- `DEV_FIREBASE_PROJECT_ID`
- `DEV_FIREBASE_STORAGE_BUCKET`
- `DEV_FIREBASE_MESSAGING_SENDER_ID`
- `DEV_FIREBASE_APP_ID`

(matching `apps/studio/.env.local`'s existing dev values), and, before any stable release:

- `PROD_FIREBASE_API_KEY`
- `PROD_FIREBASE_AUTH_DOMAIN`
- `PROD_FIREBASE_PROJECT_ID`
- `PROD_FIREBASE_STORAGE_BUCKET`
- `PROD_FIREBASE_MESSAGING_SENDER_ID`
- `PROD_FIREBASE_APP_ID`

These are Firebase's public client-side config values (not private credentials by Firebase's own
design — safe to ship in a browser/Electron bundle), consistent with this repo's existing
`.env.local` convention; they are stored as GitHub secrets here only to keep them out of the
repository, mirroring how the signing secrets are already handled.

## Files changed

- `.github/workflows/studio-release.yml` (new `Configure Studio Firebase environment` step)

## Confirmation

- No Studio installer or GitHub Release was produced or published during this fix — this is a
  workflow-only change, verified via local build reproduction only.
- No production action occurred as part of this fix. `PROD_FIREBASE_*` secrets are referenced by
  the new step but not yet used by any actual run in this pass (no stable run has been triggered).
