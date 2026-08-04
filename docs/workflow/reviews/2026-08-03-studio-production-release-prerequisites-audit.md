# Audit: Studio production release prerequisites (Phase F)

Date: 2026-08-03
Verified production commit: `ab2d4675f0915a7658bb112d29b7985c3dcb42fb`
Current Studio version: `1.0.0-beta.5`
Read-only audit. **No stable build, no GitHub release, no Firebase/App Hosting action occurred.**

## Verdict: READY WITH OWNER ACTIONS

Every reviewable technical safeguard is in place and correctly fails closed. The only remaining
blockers are owner-side: **GitHub secret population** (all 6 `PROD_FIREBASE_*` names) and
**Windows code-signing certificate acquisition + secret population** (`WINDOWS_CSC_LINK` /
`WINDOWS_CSC_KEY_PASSWORD`). Neither can be checked or supplied from this environment.

## Phase F1 — source and workflow baseline

- `origin/production` confirmed exactly `ab2d4675f0915a7658bb112d29b7985c3dcb42fb`; no later
  commit had appeared. Working tree clean throughout.
- Stable-release workflow: `.github/workflows/studio-release.yml` (unchanged since last reviewed).
- Studio version: `apps/studio/package.json` → `"version": "1.0.0-beta.5"`.
- `apps/studio/electron/generated/packagedBuildConfig.ts` confirmed **not committed** (gitignored,
  produced only at build time).
- Confirmed no Firebase API key, private key block, or hardcoded `CSC_LINK` value exists anywhere
  under `apps/studio` (`git grep` for `AIzaSy`/`BEGIN ... PRIVATE KEY`/inline `CSC_LINK=` — no
  matches).

## Phase F2 — production Firebase prerequisite audit

The stable path (`Configure Studio Firebase environment` step, `release_type == "stable"` branch)
reads exactly these six names and no others:

- `PROD_FIREBASE_API_KEY`
- `PROD_FIREBASE_AUTH_DOMAIN`
- `PROD_FIREBASE_PROJECT_ID`
- `PROD_FIREBASE_STORAGE_BUCKET`
- `PROD_FIREBASE_MESSAGING_SENDER_ID`
- `PROD_FIREBASE_APP_ID`

Confirmed at the source level:
1. Only these six names are read for `release_type: stable` — no fallback to `DEV_FIREBASE_*` in
   that branch.
2. Missing/blank-value guard: `($values | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count -gt 0`
   → `Write-Error` + `exit 1` **before** `.env.local` is written and before the build step runs.
   Re-simulated this exact logic locally with all six values empty: **correctly failed closed**
   with the expected message, no real secret used.
3. No fallback path exists to `DEV_FIREBASE_*` for a stable build — confirmed by reading the
   `if/else` branch structure (stable → `PROD_FIREBASE_*` only, else → `DEV_FIREBASE_*` only).
4. A successful stable build would embed `VITE_FIREBASE_PROJECT_ID=fresh-prints-prod` (from
   `PROD_FIREBASE_PROJECT_ID`) and, per the separate `Set Studio release channel env` step,
   `FRESH_PRINTS_UPDATE_CHANNEL=stable`.
5. No production Firebase value is stored in repository source — confirmed (see Phase F1).

### Secret-name existence status

**`OWNER VERIFICATION REQUIRED`.** This environment has no GitHub authentication (confirmed:
`curl https://api.github.com/repos/roasted-garlic/freshprints/actions/secrets` → `401 Requires
authentication`, and no `gh`/token access exists here) — not even the secrets-list endpoint, which
only returns names, never values, is reachable. Existence of the six secret names cannot be
confirmed from this environment.

**Exact GitHub UI steps for the owner to confirm all six exist:**
1. Go to `https://github.com/roasted-garlic/freshprints`
2. **Settings** (repo-level, requires admin access)
3. **Secrets and variables** → **Actions**
4. Under **Repository secrets**, confirm all six names appear in the list:
   `PROD_FIREBASE_API_KEY`, `PROD_FIREBASE_AUTH_DOMAIN`, `PROD_FIREBASE_PROJECT_ID`,
   `PROD_FIREBASE_STORAGE_BUCKET`, `PROD_FIREBASE_MESSAGING_SENDER_ID`, `PROD_FIREBASE_APP_ID`
   (GitHub shows only the name and last-updated date, never the value — that's all that's needed
   at this checkpoint).

## Phase F3 — Windows signing prerequisite audit

**Exact mechanism implemented:** electron-builder's native Windows code-signing support via the
`CSC_LINK`/`CSC_KEY_PASSWORD` environment variables (populated in this workflow's build step from
`WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD`, which are in turn set — only when both are genuinely present
— from the `WINDOWS_CSC_LINK`/`WINDOWS_CSC_KEY_PASSWORD` GitHub secrets by the `Configure optional
Windows signing` step). This is a standard PFX-certificate-and-password signing flow, not an
Azure/cloud-based signing service.

**Azure Artifact Signing / Microsoft Trusted Signing: NOT implemented.** Confirmed via source
search across the workflow, `electron-builder.json5`, and `package.json` — zero references to
Azure, Trusted Signing, `signtool`, or an Azure Key Vault. If the owner intends to use Azure
Artifact Signing instead of a traditional PFX certificate, **that requires a separate, reviewed
workflow implementation before it could be used** — it is not a drop-in secret-population step
like the PFX path.

Confirmed at the source level:
1. Stable builds fail closed without signing — `if ($env:RELEASE_TYPE -eq "stable") { Write-Error
   "Stable Studio releases require Windows signing credentials..."; exit 1 }`, reached only when
   neither `WINDOWS_CSC_LINK` nor `WINDOWS_CSC_KEY_PASSWORD` is set. Re-simulated locally with both
   empty and `release_type=stable`: **correctly failed closed** with the expected message.
2. Prerelease builds may remain unsigned under current policy — confirmed unchanged; the same logic
   branch, when `RELEASE_TYPE != "stable"`, logs "No Windows signing credentials configured;
   building unsigned prerelease" and proceeds. This is the already-approved policy exercised
   successfully across every beta build this session (beta.1 through beta.5).
3. Partial configuration (only one of the two secrets set) fails closed via the `-xor` check —
   unchanged from the original fix, not re-tested this pass since no source changed.

### Signing credential existence/readiness status

**`WINDOWS SIGNING NOT YET CONFIRMED`.** Same unverifiable-from-this-environment status as the
Firebase secrets — no GitHub API access exists here to check whether `WINDOWS_CSC_LINK` /
`WINDOWS_CSC_KEY_PASSWORD` exist as repository secrets.

### Exact owner action required for signing

1. **Acquire a Windows code-signing (Authenticode) certificate** from a recognized Certificate
   Authority, if one is not already owned. A standard OV (Organization Validation) or EV (Extended
   Validation) code-signing certificate both work with electron-builder's `CSC_LINK` mechanism; EV
   certificates typically build SmartScreen reputation faster but are more expensive and require
   hardware-token issuance in many cases.
2. **Export the certificate as a password-protected `.pfx`/`.p12` file.**
3. **Base64-encode the `.pfx` file** (electron-builder's `CSC_LINK` convention accepts either a
   file path or a `data:application/x-pkcs12;base64,<...>` URI — a base64 GitHub secret is the
   standard, portable approach for CI).
4. **Create two GitHub repository secrets:** `WINDOWS_CSC_LINK` (the base64-encoded certificate
   data) and `WINDOWS_CSC_KEY_PASSWORD` (the certificate's export password).
5. **If Azure Artifact Signing is preferred instead:** stop — this requires its own separate,
   reviewed Plan/Implementation phase to add electron-builder's Azure signing support to this
   workflow before any secret population would even apply. Do not attempt to configure Azure
   secrets against the current PFX-only workflow; they would not be read by any existing step.
6. **Note on SmartScreen:** even after signing, a brand-new certificate/publisher typically takes
   time (and download volume) to build enough Windows SmartScreen reputation to avoid the
   "unrecognized publisher" warning entirely — signing removes the "unsigned executable" risk
   category but does not guarantee an immediately warning-free first install. This is a Microsoft
   reputation-system behavior, not something this repository's workflow can control.

No unsigned-stable exception is recommended or implied by this audit.

## Phase F4 — stable workflow safeguards

| Safeguard | Status |
|---|---|
| `release_type: stable` is an explicit, required `workflow_dispatch` choice input | ✅ confirmed |
| Stable ref restricted to `production` or an exact commit reachable from `production` | ✅ confirmed — `Guard stable release ref` step + `Verify ref is reachable from production` step using `git merge-base --is-ancestor` |
| Generated packaged channel is literal `stable` for stable builds | ✅ confirmed via source + local generation test |
| Production Firebase configuration required, fails closed if missing | ✅ confirmed, re-simulated |
| Signing required, fails closed if missing | ✅ confirmed, re-simulated |
| Workflow stops before packaging if prerequisites are missing | ✅ confirmed — both the Firebase-config step and signing step run, and can `exit 1`, before the `Build Studio` step |
| Automatic update downloads remain disabled | ✅ confirmed — `autoDownload = false` unchanged |
| User must explicitly approve download | ✅ confirmed — `canStartDownload`/renderer "Download update" button gate unchanged |
| User must explicitly choose Restart to Update | ✅ confirmed — `canRestartAndInstall` + explicit IPC call gate unchanged |
| Automatic update installation remains silent | ✅ confirmed — `quitAndInstall(true, true)`, the only call site, unchanged since the live-proven fix |
| Manual first-time installation remains assisted | ✅ confirmed — `oneClick: false` unchanged in `electron-builder.json5` |
| Stable and prerelease releases cannot cross-contaminate update metadata | ✅ confirmed — electron-updater derives the channel from the version's own semver prerelease tag (unset `updater.channel`), so a stable `1.0.0` naturally resolves to `latest.yml` and a `1.0.0-beta.N` naturally resolves to `beta.yml`; this is structural, not configuration that can drift |
| GitHub Release publication remains a human checkpoint | ✅ confirmed — every release (stable or prerelease) is created as a **draft**, and neither "Set as pre-release" nor "Publish release" is automated by this workflow (documented in `docs/standards/DEPLOYMENT.md`, verified against the real beta.2 publish attempt) |

No gap found. All stable safeguards pass.

## Phase F5 — stable version and asset audit

**File requiring the version bump:** `apps/studio/package.json` (`"version": "1.0.0-beta.5"` →
`"1.0.0"`).

**Synchronized metadata also requiring a version change:** `package-lock.json`'s `apps/studio`
workspace entry (`"version"` field at the top of the `apps/studio` block) — confirmed this has
required a matching update on every prior version bump this session, applied via
`npm install --package-lock-only` (not hand-edited) to avoid lockfile drift.

No other package/builder metadata file contains a hardcoded version reference — `productName`,
`appId`, and `artifactName` in `electron-builder.json5` all use electron-builder's `${version}`
template substitution, not a literal version string.

**Expected stable artifacts** (per the existing workflow's `Compute installer SHA-256` and `Upload
build evidence` steps, unchanged pattern from every beta build):
- `Fresh Prints-Windows-1.0.0-Setup.exe` (per `electron-builder.json5`'s
  `artifactName: "${productName}-Windows-${version}-Setup.${ext}"`, `productName: "Fresh Prints"`)
- `Fresh Prints-Windows-1.0.0-Setup.exe.blockmap`
- `latest.yml` (stable channel, since `1.0.0` has no semver prerelease tag)
- `sha256.txt` (computed by the workflow)
- A GitHub Release/tag for `v1.0.0` (draft, until the owner marks it published — this workflow
  does not distinguish "release" from "tag" creation; electron-builder's GitHub publisher creates
  both together)
- A **signed** executable and installer, contingent on the signing secrets above being present

**Release-branch policy:** per `docs/standards/DEPLOYMENT.md`'s existing "Production release
workflow" section, ordinary releases promote via PR from `development` into `production` — a
narrow release-preparation branch is this repo's established convention for isolated fixes (as
used throughout this session for every CI/updater remediation), but the version-bump-to-`1.0.0`
step itself should follow the same pattern: a narrow branch off `production` (or `development`,
then promoted), not a direct commit to `production`. `docs/standards/DEPLOYMENT.md` does not
describe a special "release-prep" branch type distinct from the ordinary feature-branch + PR flow
already used for every other change this session — no new policy is invented here.

## Phase F6 — non-publishing verification results

| Check | Result |
|---|---|
| Root dependency install | exit 0 |
| Functions dependency install | exit 0 |
| Studio typecheck | exit 0 (after generating the build-time config file locally, which is required before typecheck/tests on any fresh checkout — confirmed this is expected, not a defect: the generated file is gitignored by design) |
| Updater/release-note/generator test suite | **39/39 pass** |
| Repo lint | exit 0, 0 warnings |
| Stable channel generation (`FRESH_PRINTS_UPDATE_CHANNEL=stable`) | literal `"stable"` confirmed |
| Prerelease channel generation | literal `"prerelease"` confirmed |
| Firebase missing-secret fail-closed simulation (no real secrets used) | correctly failed closed |
| Signing missing-secret fail-closed simulation (no real secrets used) | correctly failed closed |
| `git diff --check` | exit 0 |

No stable workflow run, no installer build, no publish, and no real secret value was used anywhere
in this verification.

## Confirmation

No Studio stable build, GitHub release, Firebase deployment, App Hosting rollout, production data
change, DNS action, or custom-domain action occurred during this audit.

## Next approval phrase

`APPROVE PHASE F2: CONFIGURE STUDIO PRODUCTION SECRETS AND WINDOWS SIGNING`
