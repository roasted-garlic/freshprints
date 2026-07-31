# Current Goal
`production-release` (Goal #13)

Current Mode: managed-phase
Current Phase: implement
Plan Status: complete
Review Status: complete (`approved_with_notes`)
Implement Status: in_progress — **Deployment-order step 3 (Firestore indexes) CLOSED** — owner
confirmed via Firebase Console all 65 of 65 composite indexes show `Enabled`, none `Building` or
`Error`, 0 field overrides. **Step 4 (Secret Manager) CONFIRMED COMPLETE.** Source-level secret
audit performed on the verified `production` commit: exactly 4 secrets defined in
`functions/src/lib/secrets.ts` (`geminiApiKeySecret`→`GEMINI_API_KEY`,
`resendApiKeySecret`→`RESEND_API_KEY`, `brevoApiKeySecret`→`BREVO_API_KEY`,
`etsyXApiKeySecret`→`ETSY_X_API_KEY`); confirmed zero `OPENAI_API_KEY` references anywhere in
`functions/src`. Confirmed `DEFAULT_EMAIL_PROVIDER_SETTINGS` (both `inviteProvider` and
`proofNoticeProvider`) defaults to `resend` when `settings/emailProviders` doesn't exist —
cold-start-safe, does not fail closed. Owner selected **both** Resend and Brevo for launch
flexibility. Owner confirmed all four external-provider credentials `AVAILABLE`, Resend sender
domain `VERIFIED`, Brevo sender domain `VERIFIED`, Etsy application access `AVAILABLE` — no
blockers. Pre-population metadata check confirmed all four expected secrets absent from
`fresh-prints-prod` (clean 404s, no existing-secret conflict). **Owner set all four secrets
directly via their own terminal** (this coding agent cannot host a genuinely interactive hidden
prompt within its tool-call model, so secret entry was correctly handed to the owner rather than
attempted through an unsafe workaround). Post-population metadata verification: all four secrets
— `GEMINI_API_KEY`, `RESEND_API_KEY`, `BREVO_API_KEY`, `ETSY_X_API_KEY` — confirmed **version 1,
state ENABLED** on `fresh-prints-prod`. Confirmed no `OPENAI_API_KEY` was created. Confirmed no
secret was created in `fresh-prints-dev` (only a pre-existing, unrelated read-only check of that
project's own already-existing `GEMINI_API_KEY` was performed, not a modification). **No secret
value was ever printed, logged, or stored in any output, document, or command argument
throughout this pass.**
Test Status: pending
Signoff Status: pending
DONE: no
Last Completed Step: **Synced `origin/production` into `development` for CORS promotion PR.**
Clean merge `0a8f8ab` (`merge: sync origin/production into development for CORS promotion PR`);
no conflicts. Final promotion diff is docs/config + handoff only (10 files); no app/Functions
runtime source. CORS JSON validated. Lint and `git diff --check` exit 0. **No bucket CORS
reapply, no Firebase/App Hosting deploy, no snapshot rebuild.** PR to `production` prepared;
await owner merge.

Prior: Owner Discover retest PASS after production Storage CORS on
`gs://fresh-prints-prod.firebasestorage.app`.

**Corrected `users/{uid}` field list for any future manual bootstrap:** `id` (string, same as
document ID / Auth UID), `email` (string), `displayName` (string), `role` (string, `"owner"` for
the first account), `isActive` (boolean, `true`), `createdAt` (timestamp — any non-empty value
satisfies the client mapper's falsy check, though a real Firestore `Timestamp` is correct for
consistency with server-created user documents), `updatedAt` (timestamp, same). `createdBy`/
`updatedBy` are optional (`mapUserDocument` only casts them if present as strings, no throw if
absent).

Studio's Studio deployment-order step 8 of 12 is now **fully closed** — both installer defects
(white screen, missing icon) are confirmed fixed by the owner's own retest, not merely built and
assumed correct.

**Owner request:** use the exact icon shown at the top of the collapsed Studio sidebar as the
official Windows application icon throughout the packaged installer.

**Source of truth (traced through the actual render path, not guessed):**
`Sidebar.tsx:365-372` renders `<AppLogo variant="collapsed">` when collapsed;
`AppLogo.tsx:2,42` resolves that variant's fallback to
`src/assets/brand/fresh-prints-studio-logo-collapsed.png` — confirmed via this session's own
earlier Phase D bootstrap-inventory research that `settings/brandLogos` is unset on the cold-start
`fresh-prints-prod` project (code defaults apply), so this bundled asset is what actually renders,
not a hypothetical fallback. Confirmed via `sharp` metadata: 6387×6405px RGBA with alpha
(transparent background). Visually confirmed as the circular "FP Request" mark. Correctly excluded
every item on the owner's explicit exclusion list (full wordmark, the never-existed
`fresh-prints-logo.svg`, any redesigned/generic/gear/Portal icon).

**Existing packaging gap (confirmed, not assumed):** `electron-builder.json5` already referenced
`win.icon: "icon.ico"` / `linux.icon: "icon.png"`, but neither file existed — matching the
"default Electron icon is used" line seen in every prior Studio build log this session.

**Fix (narrow Plan + independent Formal Review, both `approved`):**
`docs/workflow/plans/2026-07-30-production-release-studio-icon-plan.md` /
`...-studio-icon-review.md`. Measured the source asset's actual opaque-pixel bounds via `sharp`
`.trim()` and found they already extend to the canvas edges (no built-in margin), so wrote a
one-time asset-generation script (`apps/studio/scripts/generate-app-icon.mjs`, using `sharp` +
the new `png-to-ico` devDependency — researched and selected for being pure-JS, no native
binaries, actively maintained, MIT-licensed) that pads and resizes the source into a
7-resolution `.ico` (16/24/32/48/64/128/256, exactly matching the requested minimum set) and a
512px `icon.png`, written to the exact paths the existing config already expected. Researched
(Electron's own docs + a corroborating GitHub issue) and confirmed `BrowserWindow.icon` is
redundant for the **packaged Windows taskbar** (Windows reads the icon embedded in the exe's
resources via electron-builder's `rcedit` step, not this runtime option) but genuinely matters in
**dev mode**, where `main.ts` was pointing at the same nonexistent `fresh-prints-logo.svg` found
during the white-screen investigation — corrected to the new `app-icon.png` (added under a new
`apps/studio/public/` directory so both dev mode and the packaged `dist/` copy resolve it
correctly).

**Verification — confirmed directly in this environment, not deferred to the owner:** generated
`.ico` parsed and confirmed to contain exactly the 7 requested resolutions; visual inspection at
16×16, 32×32, and 256×256 confirmed no clipping and legible mark at small sizes; Studio typecheck,
`vite build` (confirmed the white-screen fix's `onwarn`/circular-chunk protection still intact, no
regression), full `electron-builder` packaging, repo lint, `git diff --check` — all exit 0; build
log's "default Electron icon is used" line is gone. **Extracted the actual embedded icon from both
the packaged `.exe` and the installer `.exe` via Windows' own
`System.Drawing.Icon.ExtractAssociatedIcon` API and visually confirmed both show the correct Fresh
Prints mark** — direct proof, not inference from an absent warning line. Re-confirmed via `asar`
extraction that `scheduler` remains correctly chunked with `react-vendor` (white-screen fix
regression check) on this exact build.

Committed to `development` (`24933d4`), promoted via PR #10 (merge `c644935`). Created and pushed
annotated tag `v1.0.0-rc5` on that verified commit. Re-ran lint/typecheck on the tagged commit (both
exit 0), then built the second replacement installer using the same safest env-file-swap procedure.
Build exit 0. **Directly verified on this exact production-configured build:** embedded icon
correct (via the same Windows icon-extraction method), `firebaseConfig.projectId` resolves to
`fresh-prints-prod` (via `asar` extraction), `scheduler` still correctly chunked with
`react-vendor`.

**Second replacement installer:** `Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc5.exe` (also present
as `Fresh Prints-Windows-0.0.0-Setup.exe`, byte-identical), location `apps/studio/release/0.0.0/`,
size 107,748,796 bytes, SHA-256
`e07914692ad2ff507bce279522852acf4bd9e89eb75d04da2221e3f05c17d011` — different from both the
original failed installer's checksum and the `v1.0.0-rc4` white-screen-fix installer's checksum,
confirming genuinely new packaged content. The `v1.0.0-rc4` installer
(`Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc4.exe`) remains preserved on disk, untouched, for the
incident record. Unsigned. Not uploaded or distributed publicly — awaiting owner installation and
retest (icon + white-screen fix + sign-in, together).

Original white-screen-fix summary below, preserved unchanged as historical record:

**Failure:** owner installed the first production Studio installer
(`Fresh Prints-Windows-0.0.0-Setup.exe`, SHA-256
`c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`) and reported a permanent white
screen — window opens, sign-in UI never appears, no recovery.

**Reproduction attempt:** this sandboxed environment cannot host a real Electron/Chromium GUI
process — the packaged `.exe` exits silently within seconds across multiple launch methods (direct
invocation, PowerShell `Start-Process` with output redirection, with and without `--enable-logging`),
exit code 0, zero output, no Windows Event Viewer entry. Confirmed this is a genuine environment
limitation, not the bug, by requesting the owner run the installed executable directly with
`--enable-logging` on their own machine.

**Owner-captured runtime evidence:** `Uncaught TypeError: Cannot read properties of undefined
(reading 'createContext')` at `.../resources/app.asar/dist/assets/vendor-9Mud9pNT.js:65`, plus a
secondary packaging warning about a missing `fresh-prints-logo.svg` image.

**Ruled out with direct evidence (not guessed):** Firebase environment injection — extracted the
actual packaged `app.asar` via `npx asar extract` and confirmed the embedded `firebaseConfig`
correctly resolved to `PROJECT_ID:"fresh-prints-prod"`, correct `AUTH_DOMAIN`, and a non-empty,
correctly-prefixed API key; the two `fresh-prints-dev` string occurrences in the same bundle were
unrelated (the `OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS` allowlist constant and a debug-UI label).
Packaged asset paths — the packaged `dist/index.html` correctly used relative script/link paths.

**Confirmed root cause:** `apps/studio/vite.config.ts`'s `manualChunks` function used
`id.includes('node_modules/react')` — a bare substring match, not a package-boundary match. This
correctly caught `react`/`react-dom` but not `scheduler` (react-dom's runtime dependency; no
"react" substring in its own path), which fell through to the generic `vendor` chunk instead of
`react-vendor`. Direct extraction confirmed `scheduler` present in `vendor`, absent from
`react-vendor`. The original build log had already warned `Circular chunk: vendor -> react-vendor
-> vendor. Please adjust the manual chunk logic for these chunks.` — Rollup treats this as a
warning, not a build failure, so the broken build shipped with an exit-0 status. `react-dom`
requiring `scheduler` at module-init time, split across two chunks with a circular load-order
dependency, produced exactly the observed `createContext`-on-undefined crash — a permanent
renderer-side failure before `ReactDOM.createRoot(...).render(...)` ever executes, i.e. a white
screen with zero DOM fallback. Confirmed this only reproduces in packaged production builds:
Vite's dev server never applies Rollup's `manualChunks` splitting, so `npm run dev:studio` was
never capable of catching this class of bug.

**Fix (narrow Plan + independent Formal Review, both `approved`):**
`docs/workflow/plans/2026-07-30-production-release-studio-white-screen-fix-plan.md` /
`...-studio-white-screen-fix-review.md`. Changed the chunk-matching condition to exact
package-boundary paths (trailing `/`) and explicitly included `scheduler` alongside
`react`/`react-dom`. Added a `rollupOptions.onwarn` hook that throws (failing the build) on any
future `CIRCULAR_CHUNK` warning — the real process gap this incident exposed was that nothing in
the existing verification suite inspected build warnings or launched the packaged output; this
closes that gap for this specific, now-understood failure class. Also removed a dead `<link
rel="icon" href="/fresh-prints-logo.svg">` reference — that asset never existed anywhere in this
repo's Git history; a genuinely separate, non-fatal bug found during the same evidence-gathering
pass, confirmed not to cause the white screen, fixed in the same narrow pass since it was a
one-line, zero-risk correction.

**Verification:** Studio typecheck, `vite build` (confirmed the circular-chunk warning no longer
appears, and direct extraction reconfirmed `scheduler` now lives in `react-vendor`), full
`electron-builder` packaging, repo lint, `git diff --check` — all exit 0. The unpacked-launch
verification step could not be completed in this sandboxed environment (same limitation as the
reproduction attempt) — this remains the owner's own real-machine verification, per the Plan's own
acknowledgment of this constraint.

Committed to `development` (`b9bdb35`), promoted via PR #9 (merge `daaafc1`). Created and pushed
annotated tag `v1.0.0-rc4` on that verified commit. Re-ran the full verification suite on the
tagged `production` commit (lint, typecheck — both exit 0), then built the replacement installer
using the same safest env-file-swap procedure as the original build (backed up dev `.env.local`,
temporarily wrote production values, built, immediately restored dev file). Build + packaging:
**exit 0, no circular chunk warning.**

**Replacement installer:** `Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc4.exe` (also present as
`Fresh Prints-Windows-0.0.0-Setup.exe`, byte-identical — electron-builder's default output
filename does not embed a version since `package.json`'s `version` field is `0.0.0`), location
`apps/studio/release/0.0.0/`, size 107,272,128 bytes, SHA-256
`a0be8e956108bc786fe3ea629f7dc356bb0e28ed09b60d740c31a64c1bf177ed` — **different from the original
failed installer's checksum** (`c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`),
confirming this is genuinely new packaged content, not a no-op rebuild. Unsigned, same as the
original. Not uploaded or distributed publicly — awaiting owner installation and retest.

Original step-8 (Studio build) summary below, preserved unchanged as historical record of the
first (failed) installer:

**Phase D (production settings/bootstrap inventory) — partial, owner-driven, no automated
Firestore write:** researched and presented a consolidated bootstrap list for owner approval
before any write: (1) `settings/emailProviders` (owner approved — will set via Studio UI once
logged in: `inviteProvider: "resend"`, `proofNoticeProvider: "brevo"`, matching the owner's
decision, since the code default is Resend for both and would silently misroute proof-notice email
if left unset); (2) at least one category (owner approved — will create via Studio UI, Design
Library → Manage Categories, not required for the app to function but needed for meaningful
cataloging); (3) **first owner account bootstrap — the one genuine gap found**: no automated path
exists anywhere in this codebase to create the first owner (`createTeamUser` requires an existing
owner caller; Firestore Rules block all client writes to `users/*`). Walked the owner through the
exact two-part manual Console procedure: (A) Firebase Console → Authentication → Add user, copy the
UID; (B) Firestore Console → `users/{uid}` document with `id`, `email`, `displayName`,
`role: "owner"` (string), `isActive: true` (boolean). **Owner confirmed both parts complete — the
first production owner account now exists on `fresh-prints-prod`.** `rebuildCatalogSnapshots`
confirmed safe to invoke on a fully empty catalog (source-verified: no length/emptiness assertions
in either `publishReference()` or `publishPortal()`; only Storage budget/precondition errors could
fail, irrelevant at empty scale) but deliberately **not yet invoked** — held until real catalog
data exists, per the task's own instruction to treat invocation as its own deliberate step. No
production Firestore data was written directly by this coding agent at any point — every write
either goes through the owner's own Studio session (once Studio is available) or was a manual
Console action the owner performed themselves.

**Phase F (production Studio Windows installer) — COMPLETE.** Source audit confirmed: `getFunctions(app)` uses no explicit region (defaults to `us-central1`, matching all deployed Functions); Test Data Reset UI gate (`isOperationalWipeUiEnabled()`) is `import.meta.env.DEV && isOperationalWipeAllowedProjectId(...)` — a genuine, non-bypassable-by-config guarantee that a production build (`import.meta.env.DEV === false`) never renders this UI regardless of project id; `OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS = ["fresh-prints-dev"]` confirms `fresh-prints-prod` would fail this check even if a dev build somehow pointed at it — and `wipeOperationalTestData` is not deployed to production at all (excluded from the 99-function allowlist), so the guarantee is triple-layered. No hardcoded Portal URL or other dev-only assumption found anywhere in Studio source. Studio's Firebase configuration is entirely build-time/Vite-env-file-based (`apps/studio/src/renderer/src/config/env.ts`'s `validateFirebaseEnv()`), confirming the readiness checkpoint's earlier finding.

Followed the recommended safest approach: backed up the existing dev `apps/studio/.env.local` to a temporary file, wrote the production `VITE_FIREBASE_*` values (same production Web App config already verified for the Portal, `VITE_` prefix instead of `NEXT_PUBLIC_`) into `.env.local` for exactly one build invocation, ran the full production build (`npm run build:studio` = `tsc && vite build && electron-builder`) on the verified `production` commit (`11ed4ef`), then **immediately restored the dev `.env.local`** before any other action — confirmed via `git status`/`git diff --check` that the working tree returned to exactly its prior clean state (env files are gitignored either way, so no accidental commit risk existed, but the restore still matters for local working-directory correctness). Studio typecheck (`npx tsc --noEmit`) passed clean before the build. Build + electron-builder packaging: **exit 0.**

**Installer produced:** `Fresh Prints-Windows-0.0.0-Setup.exe`, location
`apps/studio/release/0.0.0/`, size 107,274,796 bytes (~102.3 MB), SHA-256
`c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`. **Unsigned** — no
`certificateFile`/code-signing configuration exists in `electron-builder.json5` and no signing step
ran; Windows SmartScreen will show an "unrecognized publisher" warning on first run, expected for
an unsigned installer. Installer was **not** uploaded or distributed publicly this pass, per
instruction — only the local build artifact exists, awaiting owner installation and smoke testing.

Original step-5/6-7 summaries (Cloud Functions, App Hosting) below, preserved unchanged:

**Step 6 (App Hosting environment configuration) summary:** added an `env:` block to
`apps/portal/apphosting.yaml` with the 7 required `NEXT_PUBLIC_FIREBASE_*` values +
`NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com`, sourced from the owner's
`apps/portal/.env.production.local` (gitignored, never committed, never printed).
`NEXT_PUBLIC_GA_MEASUREMENT_ID` was deliberately omitted even though a real value already exists
in that local file — GA4 go-live remains its own separate, later checkpoint per owner decisions
#11/#12. Committed to `development`, promoted to `production` via GitHub PR #6 (merge `9437d4b`).

**Step 7 (first App Hosting release) — three rollout attempts, root cause found and fixed:**

*Attempt 1* (commit `9437d4b`, no build override): `firebase apphosting:rollouts:create
fresh-prints-portal --project fresh-prints-prod --git-commit 9437d4b --force` failed at the Cloud
Build stage: `Missing dependency lock file at path '/workspace/apps/portal'`. Root cause: Fresh
Prints is an npm-workspaces monorepo (single root `package-lock.json`; `apps/portal` correctly has
none of its own), but Firebase App Hosting's buildpack has official first-class monorepo support
only for Nx/Turborepo.

*Attempt 2* (commit `35ef8e1`): added `buildCommand`/`runCommand` overrides to `apphosting.yaml`
(both execute from `/workspace`, so they could install/build from the actual workspace root) as a
first hypothesis. **Committed this directly to `production` by mistake** — caught immediately
before pushing, corrected by resetting the local `production` branch pointer back to
`origin/production` (no remote impact — the stray commit never reached GitHub) and reapplying the
identical change properly on `development`, then promoting via PR #7 (merge `35ef8e1`). The retry
still failed with the byte-identical lock-file error. Owner opened the real Cloud Build Console log
and confirmed: App Hosting's framework/monorepo detection runs **before** `buildCommand` executes
and checks `rootDir` for a lock file regardless of any override — the attempt-2 hypothesis was
disproven by direct evidence, not assumption.

*Attempt 3* (commit `11ed4ef`): owner directed a narrow Plan + independent Formal Review (both
`approved`) to add the minimum officially-documented Turborepo support instead —
`docs/workflow/plans/2026-07-30-production-release-turborepo-app-hosting-fix-plan.md` /
`...-turborepo-app-hosting-fix-review.md`. Added `turbo` as a root devDependency, a root
`turbo.json` with a single `build` task (current `tasks` schema, no `dependsOn` since
`@fresh-prints/shared`/`@fresh-prints/show-picker` have no `build` script — Next.js
`transpilePackages` handles them directly), a `packageManager: "npm@10.8.2"` field in root
`package.json` (required for turbo's own workspace resolution, discovered during implementation,
within the Plan's approved scope), removed the now-confirmed-ineffective `buildCommand`/
`runCommand` override, and gitignored `.turbo/`. Kept `rootDir: ./apps/portal` unchanged and the
single root `package-lock.json` as the sole lockfile, per explicit owner instruction. Verified
locally: `npm ci`, `npx turbo run build --filter=@fresh-prints/portal` (1/1 tasks successful),
Portal typecheck, `npm run build:portal`, repo lint, YAML validation, `git diff --check` — all
exit 0. Committed to `development`, promoted via PR #8 (merge `11ed4ef`).

Retried the rollout pinned to `11ed4ef`: **"✔ Successfully created a new rollout!"** — first-ever
Fresh Prints production Portal deployment succeeded. Verified backend live at
`https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` (Enabled, `nodejs24`,
`us-central1`, updated timestamp matches this rollout). Initial hosted.app verification: homepage
returns HTTP 200 with correct `<title>Fresh Prints Request Portal</title>`; `robots.txt` returns
the **allow** variant (not the fail-closed `Disallow: /` default), confirming
`NEXT_PUBLIC_PORTAL_ORIGIN`/host resolution is correctly live in production; no `fresh-prints-dev`
string found anywhere in the served HTML.

Automatic rollouts remain **disabled** for this backend (never enabled this pass, per owner
decision — each future release requires its own explicit `rollouts:create` command).

Original step-5 summary (Cloud Functions) below, preserved unchanged: Phase A
non-secret configuration audit found no source change required: `portalUrlResolver.ts` already maps
`fresh-prints-prod` → `https://myprintrequest.com`; `.firebaserc` already has the `production` alias;
`INVITATION_FROM_EMAIL`/`PROOF_NOTICE_FROM_EMAIL` code defaults already match owner intent exactly;
`PORTAL_BASE_URL` correctly stays unset (emulator-only). Created
`functions/.env.fresh-prints-prod` (gitignored, untracked, same convention as the existing
`.env.fresh-prints-dev`) containing only the two non-secret sender-address defaults, required
because the Firebase CLI's non-interactive mode cannot resolve `defineString` params without a
dotenv file present. Reverification on the fast-forward-verified `production` commit
(`21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`) all passed: Functions build, repo lint, `git diff
--check` all exit 0; fresh programmatic enumeration of `functions/src/index.ts` reconfirmed 105
total exports, 99 included / 6 excluded, byte-identical to the approved allowlist report; all four
secrets reconfirmed Version 1/ENABLED via metadata-only checks.

Ran the exact reviewed 99-function `firebase deploy --only functions:...` command against
`fresh-prints-prod`. First attempt failed before creating anything: `--non-interactive` mode
required explicit values for the `defineString` params (fixed via the `.env.fresh-prints-prod` file
above). Second attempt failed with `Error: Pass the --force option to deploy functions with a
failure policy` — `onEmailDeliveryJobCreated` has a pre-existing, intentional `retry: true` trigger
option (idempotent email-job worker, `functions/src/onEmailDeliveryJobCreated.ts:189`), not a new or
accidental change. Per the workflow's `--force` safety rule, this was surfaced to the owner via a
structured question rather than applied unilaterally; **owner approved `--force` for this specific,
reviewed reason.** Third attempt (with `--force`) partially succeeded: 84 of 99 functions deployed
successfully; 15 failed with transient `429 Quota exceeded` (`Per project mutation requests per
minute per region`, expected on a brand-new project's first bulk 2nd-gen Functions deploy) and two
Eventarc service-agent permission-propagation errors. Verified via authoritative
`firebase functions:list --project fresh-prints-prod --json` (not log-parsing) that all 84 deployed
functions were correctly on the approved allowlist — zero excluded functions and zero unexpected
functions present, confirming the partial failure was purely quota/propagation-related, not a
configuration defect. Waited ~2.5 minutes for the per-minute quota window to reset and Eventarc
propagation to finish, then retried with an explicit `--only functions:` allowlist scoped to
exactly the 15 missing names (same owner-approved `--force`). Retry log ended with an explicit
**"Deploy complete!"** — all 15 succeeded (one, `onTagSnapshotSourceWritten`, hit one more transient
429 but the CLI's own internal retry succeeded before the deploy finished).

**Final authoritative verification** (`firebase functions:list --project fresh-prints-prod --json`,
not log output): **exactly 99 functions deployed, byte-identical diff against the approved 99-name
allowlist (zero drift), 0 of the 6 excluded functions present, all functions in `us-central1`, no
function in a non-`ACTIVE` state, `rebuildCatalogSnapshots` confirmed present.** Deploy log directly
confirmed the `GEMINI_API_KEY` secret-accessor role was granted to the Functions service account
during this deploy (the other three secrets' accessor roles were granted during the first partial
deploy) — direct evidence secret bindings are live, not merely configured. **No secret value was
ever accessed, printed, or logged.** No excluded Function was deployed. No App Hosting, Portal,
DNS, Auth, or production-data action occurred this pass. `rebuildCatalogSnapshots` was deployed
(on the allowlist) but not invoked (that remains its own separate checkpoint per Phase D).

Re-verified all branch/tag facts from Git before relying on them: current
branch `development`; working tree clean; `origin/master` = `aa570aa875d20ba85fd405480a47e6eda59f85b0`;
`origin/production` = `21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`; `origin/development` =
`067f39fdbc158a1292e5ce1f24f67c4aef201729`. **Did not modify `master` or `production` (no Git
commit) this pass — only the Firebase Cloud Functions deployment occurred.**

Recorded the GitHub `production` ruleset accurately: created by the owner, targets `production`,
but GitHub displayed "Your rulesets won't be enforced on this private repository until you move to
GitHub Team organization account" — **`production` is NOT currently protected at the GitHub server
level.** The owner is not upgrading the org this pass. Documented the intended ruleset
configuration (Active enforcement, target `production`, restrict deletions, block force pushes,
require PR before merge, 0 required approvals, status checks/signed commits/linear history all
disabled, empty bypass list) as future-ready documentation, not an active guarantee.

Checked for existing hook conventions before adding anything: no `.githooks/` directory, no
`core.hooksPath` configured, no existing `pre-push` hook, no hook-management package
(husky/etc.) in any `package.json`. No conflict found. Added
`.githooks/pre-push` (POSIX shell script, executable) that blocks a direct push to
`refs/heads/production` with a clear message pointing to the PR-based promotion workflow, allows
an explicit `ALLOW_DIRECT_PRODUCTION_PUSH=1` emergency override, and does not touch `development`
or any other branch. Tested all four cases directly (blocked-without-override,
allowed-with-override, development-untouched, feature-branch-untouched) — all behaved correctly.
**The hook is present but inert** — `core.hooksPath` was deliberately left unconfigured in this
pass, since wiring it in requires its own separate owner approval per instruction; each
contributor's clone must run `git config core.hooksPath .githooks` once it is approved.

Rewrote `docs/standards/DEPLOYMENT.md`'s Branch Model section extensively: GitHub ruleset status
(not enforced) and intended settings table; local pre-push safeguard documentation (behavior,
override, activation command); refined development/production-release/hotfix workflows (PR-based
promotion, fast-forward-only pull on `production`, explicit `--project` flags); a new
"Firebase branch and project separation" subsection (development → `fresh-prints-dev`, production
→ `fresh-prints-prod`, every command must explicitly pass `--project`, never rely on
`firebase use production`); restated the production Functions allowlist/exclusion list and the
"never bare `--only functions`" rule; restated the `master` deletion policy's 8 conditions
verbatim. Added a new "Next checkpoint — Firebase product enablement" subsection with
beginner-friendly, numbered Firebase Console instructions for enabling Firestore (Native mode —
permanent choice), selecting the Firestore location (permanent), enabling Storage, enabling
Authentication, enabling Email/Password and Google sign-in, registering the production Web App,
recording its config into a local gitignored file (never committed), creating the Web Push
certificate, and preparing (not completing) the App Hosting backend — explicitly stopping before
its first rollout/deploy.

**Deployment-order step 5 (Cloud Functions) is now CLOSED.** 99 of 99 approved functions deployed
and verified on `fresh-prints-prod`; 0 of 6 excluded functions present. No App Hosting rollout or
Portal deploy occurred. No secret value was accessed, printed, or logged. No DNS, production user,
or production data was configured/created/seeded. No production Studio installer was built. No GA4
or Search Console configuration occurred. `production` was not modified by Git (Functions deploy is
a Firebase action, not a commit). `master` was not deleted. No force-push occurred anywhere in this
pass.
Human Checkpoint Required: yes — **merge the `development` → `production` PR** that records the
already-applied production Storage CORS configuration. Merging does **not** redeploy CORS.
Blocked: no
Allowed Actions: push sync to `origin/development`; open/update PR base `production` head
`development`; await owner merge; after merge, fast-forward local `production` only if owner
requests
Forbidden Actions: merging the PR without owner action; force-push; rebase of shared branches;
direct commits to `production`; reapplying bucket CORS; Firebase/Rules/Functions/App Hosting
deploys; `rebuildCatalogSnapshots`; deleting `master`; creating `v1.0.0` tag
Next Required Step: Owner reviews and merges the CORS recording PR into `production`. Do not merge
from the agent.

Decision Log:
- 2026-07-31 — Owner `APPROVE PRODUCTION STORAGE CORS`. Applied `storage.cors.production.json` to
  `gs://fresh-prints-prod.firebasestorage.app` (was `cors: null`). Post-apply ACAO probe: all three
  configured origins echo correctly on portal-catalog manifest GET.
- 2026-07-31 — Owner Discover retest **PASS** on hosted.app empty catalog after CORS apply.
- 2026-07-31 — Merged `origin/production` (`c644935`) into `development` (sync merge `0a8f8ab`);
  prepared development→production PR to record live CORS config in the protected branch.

Plan:
`docs/workflow/plans/2026-07-29-preproduction-static-analysis-cleanup-plan.md`.
Formal Review:
`docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-review.md` —
`approved_with_changes`.

Goal basis: make `npm run build:studio` exit 0 by resolving the documented 29 Studio/shared
TypeScript diagnostics and bring repository lint to an approved pre-production state without
disabling strictness, hiding findings, or expanding into unrelated product behavior.

## Side goal completed (does not change Current Goal above)

`customer-upload-early-transparency-format-validation` (Goal #14) — **Done** (2026-07-30, approved).
Narrow follow-up: fixed `processCustomerUploadImageBytes`
(`functions/src/lib/customerUploadProcessing.ts`) so the validation-time transparency trim probe no
longer enters the `trimming` progress stage before its pass/fail verdict is known — rejected uploads
(corrupt, unsupported format, or not meaningfully transparent) no longer transiently display
"Trimming transparent edges…" before failing. Applies uniformly to Customer Upload, Donate Design,
retry, and ZIP processing (all share the one function that changed; confirmed via source, no
caller-side changes needed). Plan, Review (`approved_with_changes`, 3 required changes applied), Test
Report (23/23 automated tests pass, clean build/lint, `git diff --check` clean), and Signoff
(`approved`) are all complete — see
`docs/workflow/plans/2026-07-30-customer-upload-early-transparency-format-validation-plan.md` and
sibling review/test-report/signoff docs of the same date/slug. Owner deployed this change to
`fresh-prints-dev` and confirmed manual QA PASS across all 5 goal-brief scenarios (opaque image,
unsupported format, falsely renamed file, transparent PNG, transparent WebP). This goal did not touch,
advance, or otherwise modify the paused `production-release` (Goal #13) state recorded at the top of
this file; that goal remains exactly as it was before this side task started.

Human Checkpoint Required: no
Blocked: no
Next step for this goal: none — closed.

## Superseded state below

`portal-print-request-prelaunch-stability` — Amendment 16 is implemented, verified, and independently
reviewed. Implementation Review 18 verdict is `APPROVED_WITH_CHANGES`; its two test-coverage
findings (invalid proposed status and `createdAt` mutation) were resolved, and no blocking findings
remain. Final Rules suite: 48/48; focused: 61/61; affected regression: 143/143. The correction
changes `firestore.rules`, so owner QA is blocked until the exact dev Rules release is approved,
performed, and verified.

Human Checkpoint Required: yes — `APPROVE DEV RULES DEPLOY`
Blocked: yes (required dev Rules deployment approval)
Next step: after exact approval, run only
`firebase deploy --only firestore:rules --project fresh-prints-dev`, verify the active dev release,
then open QA checkpoint v18. Do not deploy Functions/Storage/indexes/production, sign off, or start
queued goals.

## Superseded state below

`portal-print-request-prelaunch-stability` — Amendment 16 is implemented and verified after Formal
Review `APPROVED_WITH_CHANGES`. The failing-before emulator matrix proved two independent
whole-document allowlist omissions (`queueTab`, `showQueueBiddingAcknowledgment`) caused the exact
three-field completion patch to be denied. Narrow Rules/schema validation, a completion-specific
`active|editing -> completed` branch, tested exact payload builder, and sanitized current-field
diagnostics are implemented. Rules pass 48/48; focused tests 61/61; full affected suite 143/143;
known Studio/lint baselines unchanged.

Human Checkpoint Required: no — independent Implementation Review 18 is next.
Blocked: no
Next step: Implementation Review 18. If approved, stop at `APPROVE DEV RULES DEPLOY`; do not deploy,
ask for owner QA, sign off, or start queued goals.

## Superseded state below

`portal-print-request-prelaunch-stability` — Amendment 16 Formal Review is
`APPROVED_WITH_CHANGES`. Its binding four-way failing-before fixture (neither current field,
`queueTab` only, `showQueueBiddingAcknowledgment` only, both/live Portal shape) is written, but the
Firebase Firestore emulator cannot start because Java is not installed or present on PATH
(`spawn java ENOENT`). No common bundled JDK was found. Rules mutation is forbidden until this
fixture runs and proves the exact omitted fields.

Human Checkpoint Required: yes — owner must install a compatible JDK or explicitly approve Codex
installing one for local Firebase emulator tests.
Blocked: yes (external Java prerequisite)
Next step: obtain Java, run and record the failing-before matrix, then implement only the
evidence-proven least-privilege Rules/diagnostic correction. No deployment, signoff, or queued goal.

## Superseded state below

`portal-print-request-prelaunch-stability` — owner QA v17 returned `FAIL` with new authoritative
evidence: explicit Retry now acquires and invokes correctly, but the exact completion write fails at
`request_write (permission-denied)`. Plan Section 34 / Amendment 16 records the production
three-field `updateDoc` payload and the staff Rules path. Static source identifies a specific
whole-document mismatch requiring emulator proof: `printRequestRequiredFieldsValid().hasOnly(...)`
omits current persisted `queueTab`, which active backfill/maintenance Functions deliberately write.

Human Checkpoint Required: no — Amendment 16 independent Formal Review is in progress.
Blocked: no
Next step: complete Formal Review; only after approval create the live-shaped failing-before Rules
fixture. Do not edit Rules/application code, deploy, sign off, or start queued goals.

## Superseded state below

`portal-print-request-prelaunch-stability` — final owner-authorized Amendment 15 is implemented,
verified, and independently reviewed. The owner-v16 `sessionAcquired=false` defect was caused by
React Strict Mode's setup→cleanup→setup probe permanently disposing the persistent retry session.
The correction adds Strict-safe activation, explicit phases, atomic token-authoritative release,
one shared Retry capability, a production-used exactly-once retry controller, truthful
`Retrying…`/finalizing presentation, and sanitized release diagnostics. Implementation Review 17
initially rejected presentation, executable-boundary coverage, and release-diagnostic gaps; all
were corrected, and its final verdict is `APPROVED`. Focused tests pass 36/36; full affected Studio
production/reconciliation tests pass 140/140. Known non-zero baselines remain documented.

Human Checkpoint Required: yes — owner must fully restart Studio, run QA checkpoint v17, and return
`PASS`, `PASS WITH NOTES: ...`, or `FAIL: ...`.
Blocked: no (paused at final owner QA)
Next step: owner QA v17 only. Do not create another amendment, deploy, sign off, or start queued
goals without a new owner response/authorization.

## Superseded state below

`portal-print-request-prelaunch-stability` — owner explicitly reopened the final-stop rule for one
narrow Amendment 15 after QA v16 proved the rendered Retry handler ran but session acquisition was
rejected before service invocation. Formal Review first rejected an incomplete reconstruction-race
diagnosis and proved the primary cause: React Strict Mode's setup→cleanup→setup probe permanently
disposed the persistent ref session because setup never remounted it. Corrected plan Formal Review:
`APPROVED_WITH_CHANGES`, applied. Strict-safe lifecycle, explicit operation phases, atomic
token-authoritative availability, shared `canStartRetry`, finalizing UI, exact rejection reasons,
and sanitized transitions are implemented. 101/101 regression tests pass; known baselines unchanged.

Human Checkpoint Required: no — independent Implementation Review 17 is next.
Blocked: no
Next step: independent Implementation Review 17; owner QA only if approved. Do not create another
amendment, deploy, sign off, or start queued goals.

## Superseded state below

`portal-print-request-prelaunch-stability` — final owner-authorized Amendment 14 is implemented,
tested, and independently reviewed after owner QA v15 returned `FAIL` on Test 1 only. Formal Review:
`APPROVED_WITH_CHANGES`, applied. Implementation Review 16 initially rejected three real gaps; all
were corrected within Amendment 14 and the independent re-review verdict is now `APPROVED`.
Amendment 13 repeated default-source reads. Amendment 14 performs one production-used default→server
orchestration for exact provisional retryable IDs plus the exact timestamp-only allocation mapper
shape (`allocation_read`, only `updatedAt` missing); committed genuine remediation remains
non-retryable. 100/100 regression tests pass. Known Studio/lint baselines remain unchanged.

Human Checkpoint Required: yes — owner must fully restart Studio, run QA checkpoint v16, and send
final `PASS`, `PASS WITH NOTES`, or `FAIL`.
Blocked: no (paused at final owner Test checkpoint)
Next step: owner QA v16. Do not create another amendment, sign off, deploy, or begin queued goals
before the owner's response.

## Superseded state below

`portal-print-request-prelaunch-stability` — owner QA v14 (post-Amendment 12) returned `FAIL` on Test 1
only (Test 2 historical capacity messaging and Test 3 regression smoke both `PASS`). Plan amended again
as **Amendment 13** (Section 31): traced the immediate post-Finish "N request update(s) need retry"
warning to a `serverTimestamp()` read-your-own-write race — `markShowPrintingFinished` commits a batch
setting `updatedAt: serverTimestamp()` on finished allocations, then immediately re-reads those same
allocations to decide whether affected print requests are now fully printed; a `serverTimestamp()`
sentinel is not guaranteed resolved in the very next standalone read from the same client, so
`mapShowAllocationData` could transiently throw on a just-written allocation and exclude it from the
printed-quantity sum for that one read — producing a false "needs retry" warning for a request that was
already fully printed. This is exactly why no genuine Firebase error ever appeared and why the warning
correctly disappeared on navigation once enough time had passed for the sentinel to settle (Amendment
12's reconstruction effect performs the same bounded check again, later). The separate "excluded
invalid production record" console warning was confirmed to be the same race manifesting through the
live `showAllocations` subscription's own read path, not an unrelated defect - it self-heals on the
listener's next emission and needed no separate fix. Fixed with a single bounded re-check limited to
exactly the first pass's failed IDs (never remediation IDs, never an unbounded rescan), reusing the
existing `markPrintRequestCompletedIfFullyPrinted` function - a genuinely still-unresolved request
fails the re-check identically and is reported exactly as before, with a working Retry button.

Independent **Formal Review** of Amendment 13
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-amendment-13-review.md`)
approved the fix's logic and safety (scoping, idempotency, no masking of genuine failures) and required
its tests to be added before signoff. Independent **Implementation Review 15**
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-15.md`)
**`APPROVED`, no notes** — did not defer to the Formal Review or the implementer's narrative,
independently re-verified the fix and new tests against current source, and ran the full verification
matrix itself (87/87 directly-relevant tests pass; Portal typecheck/build exit 0; Studio build exit 2
with the unchanged 29-error baseline; lint exit 1 with the unchanged 41-problem baseline; `git diff
--check` clean). The implementation remains client-only. No Function/Rules change or deployment
occurred.

Human Checkpoint Required: yes — owner must run the reduced QA checkpoint
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-qa-checkpoint-v15.md`) and
respond `PASS`/`PASS WITH NOTES`/`FAIL`. Do not sign off or start any queued goal
(`studio-test-data-print-limit-wipe-audit`, `preproduction-static-analysis-cleanup`,
`customer-upload-oversized-image-normalization-and-processing-performance`, `production-release`)
before that response.
Blocked: no (paused at the required Test-phase human checkpoint)

## Superseded state below

`portal-print-request-prelaunch-stability` — owner QA v13 (post-Amendment 11) returned `FAIL` on two
items (one blocking, one display-only per the owner's own annotation). Plan amended again as
**Amendment 12** (Section 30): Workstream A/B traced the Studio reconciliation Retry control's actual
rendered path end-to-end and found two compounding root causes in `useShowProductionTimer.ts` — a
silent early-return producing zero observable effect when there was nothing retryable at click time,
and all retry/warning state being pure ephemeral React state, unconditionally blanked on every
`show?.id` change (including navigation away and back) with no reconstruction from Firestore. Fixed
with a bounded, show-scoped reconstruction effect (this show's own allocations only, never an
unbounded scan) routed through the existing `ShowProductionRetrySession` for mutual exclusion with a
live retry, a new dev-only click-trace log firing on every activation attempt, and a three-state Retry
UI contract (`retryable`/`remediation_only`/`none`) now actually wired into the rendered page.
Workstream E traced the Portal historical-show capacity-exhausted banner to `usePortalAllocatableShows.ts`'s
module-level 60-second session cache serving a stale `isAllocatable: true` for a show that had since
become historical server-side; fixed with a `hasConfirmedFreshness` gate that defers any capacity
decision (the banner, `canConfirmFull`) until the current modal-open's own reload has confirmed the
cache at least once — a genuinely open, capacity-exhausted show is unaffected.

Independent **Formal Review** of Amendment 12
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-amendment-12-review.md`)
found the first-draft Workstream E design was a no-op against its own identified root cause (triggered
on the wrong branch); the corrected `hasConfirmedFreshness` design was approved to proceed to
implementation without a further review round. Independent **Implementation Review 14**
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-14.md`)
**`APPROVED`** — did not defer to the Formal Review or the implementer's narrative, independently
re-verified both workstreams against current source, found `reconciliationRetryUiState` was computed
but not actually consumed by the page render (corrected before sign-off), and ran the full verification
matrix itself (77/77 directly-relevant tests pass; Portal typecheck/build exit 0; Studio build exit 2
with the unchanged 29-error baseline; lint exit 1 with the unchanged 41-problem baseline; `git diff
--check` clean). The implementation remains client-only. No Function/Rules change or deployment
occurred.

Human Checkpoint Required: yes — owner must run the reduced QA checkpoint
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-qa-checkpoint-v14.md`) and
respond `PASS`/`PASS WITH NOTES`/`FAIL`. Do not sign off or start any queued goal
(`studio-test-data-print-limit-wipe-audit`, `preproduction-static-analysis-cleanup`,
`customer-upload-oversized-image-normalization-and-processing-performance`, `production-release`)
before that response.
Blocked: no (paused at the required Test-phase human checkpoint)

## Superseded state below

`portal-print-request-prelaunch-stability` — owner QA v12 (post-Amendment 10) returned `FAIL` on
three items. Plan amended again as **Amendment 11** (Section 29): Workstream A confirmed via
exhaustive repository-wide audit that `printRequests.status = "completed"` is genuinely load-bearing
(Studio add-to-show picker exclusion, print-request detail edit-lock, the persisted `queueTab` field
Studio's list actually queries by, and Function-level delete/archive/upload-purge eligibility) — the
write and its retry UI are retained, not removed. The diagnostic used before that write is extended
to check the exact cross-field customer/guest-assignment invariant Firestore Rules enforce (read-only,
no Rules/behavior change), so the next live retry attempt can prove or rule out that specific
hypothesis. Workstream B found the Retry button's apparent inertness was not a click-handler defect:
after Finish, a just-finished show's scheduled time passing "now" during the post-Finish refresh could
silently reclassify it out of the active schedule tab, causing the page to silently swap the owner's
selection away from it — wiping the just-set retry warning/button in the same instant, with no click
involved. Fixed by making the page follow the just-acted-upon show to whichever tab it now belongs in
instead of abandoning the selection. Workstream C confirmed the separate "excluded invalid production
record" warnings are structurally unrelated to the unresolved `printRequests` write (different
collections entirely). Workstream D fixed historical-show inspection to auto-populate when a date has
exactly one non-allocatable show (never guessed among multiple), corrected the customer-facing copy at
both sites it appeared to stop implying a "read-only" designation, and suppressed the misleading
"N spots remaining" line for shows that can no longer accept new requests.

Independent **Formal Review** of Amendment 11 (`approved_with_changes`, one clarification — a second
customer-facing copy site — resolved directly in the Plan) preceded implementation. Independent
**Implementation Review 13**
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-13.md`)
**`APPROVED`** — did not defer to the Formal Review's approval, independently re-verified all three
workstreams against current source and ran the full verification matrix itself (218/218 tests pass
across the combined focused + full-goal regression suites; Portal typecheck/build exit 0; Studio
build exit 2 with the unchanged 29-error baseline; lint exit 1 with the unchanged 41-problem baseline;
`git diff --check` exit 0; confirmed nothing from Amendment 10 regressed). The implementation remains
client-only. No Function/Rules change or deployment occurred.

Human Checkpoint Required: yes — owner must run the reduced QA checkpoint
(`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-qa-checkpoint-v13.md`)
and respond `PASS`/`PASS WITH NOTES`/`FAIL`. Do not sign off or start either queued goal before that
response.
Blocked: no (paused at the required Test-phase human checkpoint)

## Superseded state below

`portal-print-request-prelaunch-stability` — both Amendment 7 dev deployment checkpoints are now
complete. The owner-completed callable remains active on revision
`queueportalprintrequesttoshow-00031-wip`. After explicit `APPROVE DEV RULES DEPLOY`, Codex ran
`firebase deploy --only firestore:rules --project fresh-prints-dev`: exit 0, compiled successfully,
created ruleset `23a9056c-bc09-4be5-9db1-ec6af78f225e`, and released it to `cloud.firestore` at
`2026-07-28T04:41:58.859402Z`. No unrelated or production deployment occurred. The standalone Admin
SDK comparison script lacked ADC (exit 2), but the signed-in Firebase CLI API response directly
confirmed creation from the uploaded local file and activation of that exact ruleset.

Human Checkpoint Required: yes — owner must run the post-Amendment 7 live QA checkpoint and respond
`PASS`, `PASS WITH NOTES: ...`, or `FAIL: ...`. Do not sign off or start queued goals before that
response.
Blocked: no (paused at required owner Test checkpoint)

## Superseded state below

`portal-print-request-prelaunch-stability` — the owner completed Amendment 7's narrow dev Function
deployment:
`firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev`.
Read-only Firebase metadata verifies the Gen 2 callable is `ACTIVE`, all traffic targets revision
`queueportalprintrequesttoshow-00031-wip`, and its update time is
`2026-07-28T04:36:34.802418735Z`. The exact owner CLI exit code and success line remain
`[NEEDS OWNER CONFIRMATION]`. No Function redeployment occurred during verification. The Function
checkpoint is satisfied; owner QA remains paused because Amendment 7 Firestore Rules are not yet
deployed.

Human Checkpoint Required: yes — request `APPROVE DEV RULES DEPLOY` for exactly
`firebase deploy --only firestore:rules --project fresh-prints-dev`. Do not deploy Functions again
or start QA until the Rules deployment succeeds and is verified.
Blocked: no (paused at required dev Rules deployment approval checkpoint)

## Superseded state below

`portal-print-request-prelaunch-stability` — owner QA v7 returned `FAIL`. Amendment 7 corrects two
separate deployment gaps: the local ADR-FP-122 callable supports multiple separate requests up to
the customer/show cap but has not been deployed, and the timer's three-operation batch needs a
narrow legacy-allocation Rules transition in addition to the already-deployed legacy-show
correction. Formal Review is `approved_with_changes` with all conditions applied. Superseding
Implementation Review 8 is `APPROVED`. Verification: focused 33/33 (independent reviewer 37/37),
full Rules 28/28, Functions build, changed-file lint, and diff check all pass. No Amendment 7
deployment occurred.

Human Checkpoint Required: yes — first request is `APPROVE DEV FUNCTION DEPLOY` for exactly
`firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev`.
After that deployment is verified, request the separate `APPROVE DEV RULES DEPLOY` checkpoint.
Owner QA remains paused until both are deployed and verified.
Blocked: no (paused at required dev Function deployment approval checkpoint)

## Superseded state below

`portal-print-request-prelaunch-stability` — owner completed the approved dev-only Firestore Rules
deployment. Active `fresh-prints-dev` ruleset
`c05daa58-cf8f-40c3-a67a-ac17ed052479` (created `2026-07-28T03:45:17.826815Z`) is byte-identical to
the checkout (SHA-256 `fc27e9bf0537c6bbdc303abc8d730c262cb59b997fd9d39a7b76a630c460d310`).
Implementation Review 7's deployment condition is satisfied. The timer is expected to be corrected
but remains unconfirmed until live owner QA. No production, Functions, indexes, Storage Rules, or
App Hosting action occurred.

Human Checkpoint Required: yes — owner must run the four-test live QA checkpoint and respond
`PASS`, `PASS WITH NOTES: ...`, or `FAIL: ...`.
Blocked: no (paused at required Test-phase owner checkpoint)

## Superseded state below

`portal-print-request-prelaunch-stability` — owner ran a FOURTH runtime QA pass. Two of the three
previously-approved defects (typed over-cap reconciliation, Show Queue live allocation update) passed
cleanly and remain confirmed. Three new items surfaced: the Studio timer remains `permission-denied`
(still unresolved, no code change attempted); a genuine show-capacity defect at the exact `23 + 2 = 25`
boundary; and a show-switch stale-error defect. Investigation found the `23+2` case was **not** a math
bug — the capacity-cap functions were already correct at that boundary — it was an existing,
explicitly-owner-confirmed (2026-07-20) product rule ("one Portal print request per customer per
show") blocking a second, separate request from ever reaching a show the customer already had an
allocation on, independent of remaining capacity. Rather than silently override an accepted decision,
this was raised directly with the owner, who explicitly decided to reverse it — recorded as
**ADR-FP-122** in `docs/project/DECISIONS.md` (superseding only that one rule; everything else about
the 25-print limit, one-working-request policy, and same-request-one-show invariant is unchanged). The
show-switch stale-error defect (a capacity error from one show remaining visible after selecting a
different show) was confirmed and fixed with a generation-scoped, per-show error contract. **The Studio
production-timer `permission-denied` remains NOT remediated** — a programmatic, read-only
deployed-vs-local Rules comparison script and a Rules-emulator reproduction test were both built, but
neither could be executed in this development session (no live `fresh-prints-dev` credentials, no Java
runtime available) — both require the owner (or CI) to run them for an actual result. Plan amended
again (Section 23), the completed change independently Formal-Reviewed (`approved_with_changes`, two
minor doc/test-exactness corrections applied) and independently Implementation-Reviewed a sixth time
(**`APPROVED`**, full 101/101-test regression pass across this goal's entire history). **Awaiting owner
manual QA response (v6)**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`).

Human Checkpoint Required: yes — owner must re-run the minimal remaining manual QA and respond
`PASS` / `PASS WITH NOTES` / `FAIL` before this goal is signed off. Do not treat any previous `FAIL` as
resolved until the owner confirms. **This goal cannot be signed off while the Studio timer still
returns `permission-denied`, regardless of how the capacity-boundary check resolves.** The Studio timer
item specifically requires the owner to run `node functions/scripts/compare-deployed-firestore-rules.mjs`
from a machine with `fresh-prints-dev` credentials and report the exact result before any further fix
can be attempted; if deployed Rules differ from checked-in Rules, a separate `APPROVE DEV RULES DEPLOY`
checkpoint is required before any deployment.
Blocked: no (not blocked; paused at the required Test-phase human checkpoint)
DONE: yes (portal-google-analytics, signed off 2026-07-27); yes (firestore-usage-efficiency-wave-c, signed off 2026-07-27)

**Queued goals after this one closes, in order:** (1) `studio-test-data-print-limit-wipe-audit`
(owner-directed 2026-07-27) — audit and redefine the Studio Test Data action currently labeled like a
Print Request daily-limit wipe, since the product no longer has a standalone customer daily print
allowance; (2) `preproduction-static-analysis-cleanup` (owner-directed 2026-07-27) — make
`npm run build:studio` exit 0, resolve the 29 pre-existing Studio/shared TypeScript errors (exposed,
not introduced, by this goal's tsconfig fix), and bring repository lint to an approved pre-production
state, without disabling strictness or hiding errors, with independent review before
`production-release`. Neither started, neither planned, no Plan authored for either. **`production-release`
begins only after this goal and both queued goals above are signed off.**

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner FOURTH runtime `FAIL`; ADR-FP-122 reverses one-request-per-show uniqueness by explicit owner decision; show-switch stale-error fixed; Studio timer diagnostic tooling built (not executable in this session); sixth Implementation Review session APPROVED; **Studio timer remains unfixed**; awaiting owner re-QA (v6)

Owner's fourth manual QA pass confirmed the typed over-cap reconciliation and Show Queue live
allocation update (Amendment 4's fixes) both hold. Three new items surfaced: the Studio timer
(unresolved, no attempt made this pass); a `23 + 2 = 25` capacity-boundary rejection; and a
show-switch stale-error defect.

**Investigation, confirmed by direct source trace before any code changed:** the `23+2` rejection was
not a math defect — `wouldExceedPerShowCustomerCap`/`remainingPerShowCustomerCap`/
`planPortalShowQueueFit` were already correct at this exact boundary (independently confirmed by both
direct reading and the pre-existing test suite). The actual cause was a **separate, unconditional
uniqueness rule** in `queuePortalPrintRequestToShow.ts` — "one Portal print request per customer per
show," ADR-FP-102 Decision §5, explicitly reconfirmed by the owner on 2026-07-20 as "working well; do
not change" — which rejected any second, separate request to a show the customer already had an
allocation on, before the request ever reached the capacity math. Because this was an existing,
owner-confirmed accepted decision rather than an obvious bug, this session asked the owner directly
rather than silently overriding it. **The owner's explicit decision: reverse the rule.** Recorded as
**ADR-FP-122** (`docs/project/DECISIONS.md`, superseding only ADR-FP-102 Decision §5 and its
2026-07-20 addendum — every other part of ADR-FP-102 unchanged): a customer may now submit multiple
separate print requests to the same show, accumulating toward the same 25-print limit; exactly 25 is
allowed, more than 25 is blocked; the one-working-request-at-a-time rule and the
one-show-per-individual-request structural invariant are both unrelated and unchanged.

**Show-switch stale error, confirmed by direct trace:** `useQueuePrintRequestToShow.ts`'s `error` was
a single global string with no per-show scoping, and a second, independent instance of the same defect
class existed in `PortalQueueToShowModal.tsx`'s `handleConfirmAcknowledgment` catch block, which
additionally duplicated the message into an entirely unscoped local `actionError` state. **Fixed:**
the hook's error is now `{ showId, message }`, gated by a monotonic generation counter (mirroring this
repo's existing stale-completion pattern) so a late-arriving rejection for a superseded attempt cannot
resurrect a cleared error; the modal now clears both error surfaces on show selection change and no
longer duplicates the message into the unscoped state; a render-time defense-in-depth check ensures a
submit error can never display for a show other than the one currently selected.

**Studio timer, still unresolved — no code change attempted.** Per explicit instruction, a
programmatic, read-only Rules-comparison tool
(`functions/scripts/compare-deployed-firestore-rules.mjs`, using the official Admin SDK Security
Rules API) replaces the prior manual Firebase Console guidance, and a new Rules-emulator test
(`tests/firebase/studioProductionTimer.rules.test.ts`) reproduces the exact `startShowPrinting` batch
write against checked-in Rules for owner/admin/helper/customer/inactive-staff/unrelated-field
fixtures. **Neither could be executed in this development session** — no live `fresh-prints-dev`
credentials exist here (the comparison script fails cleanly with an explicit, actionable credential
error, confirmed by direct execution, exit `2`) and no Java runtime is installed here for the
Firestore Rules emulator (confirmed: `java` absent from `PATH`). Both are correct, working tooling
that the owner (or CI, for the emulator test) must run to get an actual result. A read-only post-wipe
capacity-state audit script (`functions/scripts/audit-post-wipe-capacity-state.mjs`) was also built;
direct source reading of the wipe implementation found it already structurally sound for every
capacity-affecting collection/field this flow depends on — no wipe-residue defect was found.

**Plan amendment:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 23. Because the code change was narrow and fully specified by the owner's own explicit,
specific decision (obtained via an in-session clarifying question, not assumed), this amendment
proceeded to a Formal Review of the completed work rather than a pre-implementation gate. **Amendment
5 Formal Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-5-review.md`):
**`approved_with_changes`** — independently confirmed both uniqueness throws were genuinely removed
while the underlying cap math was untouched, confirmed the separate per-request one-show invariant
remained fully intact, confirmed the show-switch fix's generation-scoping was correctly modeled
against the actual race. **Two non-blocking findings, both resolved directly:** a second, missed
location in `docs/architecture/DATA_MODEL.md` still described the now-superseded uniqueness rule; the
new Rules-emulator test's batch write omitted one allowlist-optional field (`printPausedAt:
deleteField()`) present in the real write.

**Implemented:** both uniqueness throw blocks removed from `queuePortalPrintRequestToShow.ts`
(the underlying quantity-sum computations retained, since they still feed the unchanged cap math);
`useQueuePrintRequestToShow.ts`'s scoped-error/generation contract; `PortalQueueToShowModal.tsx`'s
show-switch clearing and defense-in-depth render guard; `docs/project/DECISIONS.md`/
`docs/architecture/DATA_MODEL.md`/`docs/architecture/BACKEND.md` updated for ADR-FP-122; two new
read-only diagnostic scripts under `functions/scripts/`.

**Verification (independently re-run and confirmed twice — once directly, once by Implementation
Review 6):** `npx tsx --test` across the full regression surface spanning all 5 amendments on this
goal — **101/101 pass, exit 0** (new tests cover the owner's exact boundary set — 0+23, 23+2, 23+3,
24+1, 24+2, 25+1 — a no-double-counting proof, the show-switch generation race, and a source-presence
proof that only the uniqueness gates were removed). `npm run typecheck --workspace @fresh-prints/portal`
— **exit 0**. `cd functions && npm run build` — **exit 0**. `npm run build:portal` — **exit 0**.
`npm run build:studio` — **exit 2**, confirmed still exactly the same 29 pre-existing errors, none
attributable to this pass. `npm run lint` — **exit 1**, confirmed still exactly 41 problems, none new.
`git diff --check` — **exit 0**.

**Sixth Implementation Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-6.md`,
deliberately scoped to a different angle than the Formal Review — full-goal-history regression safety
rather than re-tracing the same diff): **`APPROVED`**. Confirmed no implicit one-request-per-show
assumption existed anywhere else in the codebase (Studio's request grouping/pickers key purely by
`printRequestId`, never by customer-uniqueness); confirmed no second instance of the "stale value
leaks across a switched show" defect class existed in the modal's other per-show state
(`pendingAllocatedByShowId`/`allocatedBaselineByShowId` are already correctly keyed by show id).

**Owner manual QA checkpoint rewritten** (v6)
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`),
including the exact command for the owner to run the new Rules-comparison script themselves.

**No Functions, Rules, indexes, migration, deployment, App Hosting, or production action occurred.**
The 25-print limit's value/computation, the one-working-request-at-a-time rule, and the 200-DPI floor
are all unchanged. `preproduction-static-analysis-cleanup` and `studio-test-data-print-limit-wipe-audit`
remain queued, neither started. **Human checkpoint — awaiting the owner's `PASS`/`PASS WITH
NOTES`/`FAIL` response, including the Rules-comparison script's result, before this goal is signed
off.**

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner THIRD runtime `FAIL` (corrected count — this is the third owner FAIL on this goal, not a fourth); deeper root causes traced (re-entrancy race, clamp bypass, second Show Queue gap); fifth Implementation Review session on this goal APPROVED for two of three fixes; **Studio timer remains unfixed**; awaiting owner re-QA (v5)

**Documentation correction, made at the owner's explicit instruction:** this entry and the Plan
previously mislabeled this as the owner's "fourth" runtime FAIL. The owner reviewed the actual recorded
workflow history and confirmed only three owner FAIL checkpoints exist on this goal to date: (1) removal
and quantity persistence, (2) stale detail-route state / typed quantity inconsistencies / Studio timer,
(3) local typed over-cap display / Studio timer / Show Queue live allocation refresh — the pass this
entry documents remediation for. Corrected throughout this file and the Plan. This is a wording
correction only — the underlying root-cause investigation and remediation below are unaffected. (Note:
"Implementation Review 5"/"fifth Implementation Review" below correctly refers to the fifth
Review **document/session** in this goal's history — Plan→Review→Implement passes are numbered
separately from, and outnumber, the three owner FAIL checkpoints, since some passes required more than
one amendment/review cycle before returning to the owner.)

**Critical clarification, also at the owner's explicit instruction: the Studio production timer is NOT
fixed.** This pass performed another static Rules re-comparison and made no Rules, authentication,
service, or payload change. The timer must continue to be described as unresolved, not remediated, and
this goal must not be signed off while it still returns `permission-denied` — regardless of how the
other two checks resolve. The owner's next QA response must include the timer's live-deployed-Rules
comparison result (via the Firebase Console, corrected in the QA checkpoint below since the Firebase
CLI has no command to fetch/diff currently-deployed Firestore Rules content — a CLI `--dry-run` only
validates the local file's syntax, it does not compare against what's actually deployed). If deployed
Rules differ from checked-in Rules, a separate `APPROVE DEV RULES DEPLOY` checkpoint is required before
any deployment; if Rules are identical and the timer still fails, Implement must return to identify the
denied write from live evidence the owner provides (exact error code/message/showId/project
ID/role/active-status/failed write path), not from a sixth static reading of the same local file.

Owner ran a third manual QA pass against the immediately prior Implementation Review's `APPROVED`
fixes and found **all three** targeted defects still failing at runtime, despite two behaviors
(removed-item reconciliation, valid typed reduction) continuing to hold from earlier amendments.

**Root cause 1 (item-card typed over-cap), confirmed by direct trace, with two distinct mechanisms —
the first genuinely new territory beyond Amendment 3's fix:**

1. **Primary — re-entrancy in `saveDraft`'s own overlap guard.** `PortalPrintRequestItemCard.tsx`'s
   `saveInFlightRef`/`saveQueuedRef` were booleans only, never the value to resubmit. If a second edit
   was made while a first edit's save was still awaiting its network round trip, the first
   (superseded) save's completion read `quantityInput` from a stale closure captured at its own
   dispatch time and unconditionally overwrote whatever the user had since typed — Amendment 3's fix
   (reading the server's returned value instead of the locally-typed one) was real and correct for a
   single edit, but never covered two overlapping edits.
2. **Contributing — an unguarded clamp bypass.** `usePrintRequestDetail.updateItem` fell back to an
   uncapped raw value whenever `workingRequestLimit.limit` was transiently `null` (reachable at
   ordinary mount timing, before the limit subscription's first emission arrives), simultaneously
   freezing the capacity banner (which requires the same `limit` to be known) — plausibly explaining
   the owner's paired "field stuck, banner frozen" observation.

**Root cause 2 (Studio timer), still unresolved after a fifth independent check:** a fifth independent
re-derivation of the full `firestore.rules` field allowlists against the exact batch write
`startShowPrinting` performs found — again — no discrepancy. The standing diagnosis (deployed Rules
drift, or a live document with an out-of-allowlist field) remains the only remaining explanation and
requires the owner's own live comparison.

**Root cause 3 (Show Queue), confirmed by direct trace — a second, adjacent gap Amendment 3's fix never
covered, not a regression of it:** Amendment 3 correctly converted the allocation *list* to a live
subscription, but the Show Queue's `capacity`/summary fields (shown on the selected show's own card)
are derived from the show *document* itself, loaded only via a one-shot `listUpcomingShows` fetch with
no live-update mechanism — a completely separate Firestore read from the allocation list, never
touched by any prior amendment.

**Plan amendment:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 22. **Amendment 4 Formal Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-4-review.md`,
focused, independent, did not defer to any of the four prior Implementation Reviews on this goal):
**`approved_with_changes`** — independently re-derived both item-card mechanisms and the Show Queue gap
from source and confirmed each exactly as written; independently re-confirmed the Rules allowlist
analysis a fifth time with the same result. **One non-blocking correction, resolved directly in the
Plan:** an overstated claim that a routine token refresh reliably triggers the clamp-bypass window —
corrected to the weaker, still-sufficient claim that the window is reachable at ordinary mount timing
regardless of exact cause.

**Implemented:** the item card now mirrors its quantity input in a ref on every change and gates a
completing save's write-back on whether the field still shows what that specific save submitted — a
superseded save updates only its own bookkeeping, never overwriting a newer live edit;
`usePrintRequestDetail.updateItem` no longer applies an uncapped optimistic guess when the limit is
unknown (skips the optimistic patch, still sends the real request so the server clamps authoritatively
either way); a new bounded, ref-counted, single-document `onSnapshot` subscription
(`upcomingShowService.subscribeToUpcomingShow`, wired through the existing
`createSharedFirestoreSubscription` utility, mirroring the existing per-show allocation subscription's
exact shape) now keeps the currently-selected show's own document live in `useUpcomingShows`, patched
in place by id — the one-shot full-collection list-load is unchanged.

**Verification (independently re-run and confirmed twice):** `npx tsx --test` on 9 affected test files
— **68/68 pass, exit 0** (new tests cover the exact overlapping-edit race, the clamp-bypass fix, and 5
genuine Show Queue selected-show live-update scenarios driving the real shared-subscription primitive).
`npm run typecheck --workspace @fresh-prints/portal` — **exit 0**. `npm run build:portal` — **exit 0**.
`npm run build:studio` — **exit 2**, confirmed still exactly the same 29 pre-existing errors, none
attributable to this pass (one sits two lines from this pass's edit but is confirmed caused by
unrelated, separately in-flight work). `npm run lint` — **exit 1**, confirmed still exactly 41
problems, none new. `git diff --check` — **exit 0**. Confirmed no Functions/Rules/indexes/deployment
file is part of this pass.

**Fifth independent Implementation Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-5.md`,
explicitly did not defer to any of the four prior "APPROVED" verdicts on this goal): **`APPROVED`**.
Independently traced both item-card mechanisms and the Show Queue subscription to their actual shipped
code (not just claimed to exist), confirmed the new tests structurally cannot pass without the fixes
being real, and personally re-ran every verification command. Its own honest assessment: this pass is
better-founded than the prior amendments (it targets a re-entrancy/overlap defect class rather than a
single-path staleness defect, discovered specifically because this third owner FAIL exposed what
earlier clean reviews missed) — but source review alone still cannot certify real browser timing or
real cross-client Firestore listener latency; a fourth live owner QA pass remains the actual closing
gate, and the Studio timer specifically remains unfixed regardless of what that pass finds for the
other two defects.

**Owner manual QA checkpoint rewritten** (v5)
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`),
including the same live-Rules-comparison request for the Studio timer and a new explicit
overlapping-edit test step for Check 1.

**No Functions, Rules, indexes, migration, deployment, App Hosting, or production action occurred.**
`preproduction-static-analysis-cleanup` and `studio-test-data-print-limit-wipe-audit` remain queued,
neither started. **Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response,
including the Studio timer diagnostic input, before this goal is signed off.**

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner THIRD runtime `FAIL`; two of three remaining defects fixed and field-partially-confirmed; FOURTH independent Implementation Review APPROVED; awaiting owner re-QA (v4)

Owner's third manual QA pass confirmed real progress: removed-item route reconciliation and valid
typed reduction to `1`/`1`/`1` — both previously broken across two prior FAILs — are now genuinely
passing. Three defects remained: the Print Request detail item card's own typed input stayed stuck on
a rejected over-cap value even though shared/cart/Discover/Design Library state was already correct; a
Studio production-timer `permission-denied` error, now confirmed with a real Firebase error code (not
just a message); and a newly-discovered defect — Studio Show Queue not reflecting a cross-client
Portal-submitted allocation while already open.

**Root cause 1 (item-card typed over-cap display), confirmed by direct trace:**
`PortalPrintRequestItemCard.tsx`'s `onUpdate` prop was typed `Promise<void>` and `saveDraft`'s success
path never read a return value — it unconditionally recorded the locally TYPED (rejected) value as
"saved," and separately stamped a fresh `Date.now()` timestamp on every save regardless of outcome.
Because the hook's own server-quantity correction only patched `quantity` (never `updatedAt`), the
later-arriving corrected prop always carried an older timestamp than that stamp and was rejected by
the card's own stale-prop guard — leaving the field stuck until a full remount reset its internal refs.

**Root cause 2 (Studio timer), still unresolved after a fourth independent check:** the diagnostic
logging added in the prior pass captured a genuine `permission-denied` Firestore error code. A fourth
independent re-derivation of the full `firestore.rules` field allowlists against the exact batch write
`startShowPrinting` performs found — again — no discrepancy. The two remaining explanations (deployed
Rules differ from checked-in Rules; a live document has a legacy out-of-allowlist field) are
fundamentally unverifiable without live access to `fresh-prints-dev`. A precise, actionable diagnostic
request (exact commands/Console steps) was prepared and handed to the owner rather than guessing a
fifth speculative fix.

**Root cause 3 (Show Queue live updates), confirmed by direct trace — genuinely new territory, not a
continuation of prior amendments:** `useShowAllocations.ts` was a pure one-shot `getDocs` fetch with no
listener of any kind, triggered only on mount/show-id change — a Portal-submitted allocation was
invisible on an already-open Show Queue session until the page remounted.

**Plan amendment:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 21. **Amendment 3 Formal Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-3-review.md`,
focused, independent, did not defer to any of the three prior Implementation Reviews on this goal):
**`approved_with_changes`** — independently traced Root Cause 1's exact timestamp-comparison sequence
by hand and confirmed it precisely; independently re-derived the `firestore.rules` allowlists a fourth
time with fresh eyes and found nothing new (confirming the diagnose-don't-guess approach is correct);
confirmed no new Firestore index is required for the proposed Show Queue subscription (single-field
equality, identical shape to the existing production query). **Two corrections, both resolved
directly in the Plan:** Fix 1's remediation text originally scoped only the item card's own prop, not
the two intermediate layers (`usePrintRequestDetail.updateItem`, `PrintRequestDetailView.handleUpdateItem`)
that also needed to actually return/pass through the value — now explicitly required at all three
layers; and Fix 3's cited `createSharedFirestoreSubscription` usage precedent
(`staffInboxSubscriptionService.ts`) was factually wrong — it hand-rolls its own `onSnapshot` without
that utility — corrected to cite the actual real consumers (`assistedCreationRequestsService.ts`,
`assistedCreationUpdateAckService.ts`) as the coding template.

**Implemented:** the server-accepted quantity now threads through all three layers end-to-end
(`usePrintRequestDetail.updateItem` → `PrintRequestDetailView.handleUpdateItem` → `PortalPrintRequestItemCard`'s
`onUpdate`), consumed by a new pure `resolveSavedDraftReconciliation` function that applies the
accepted value directly to the card's local input state the moment a save completes, instead of
depending on the async prop-sync effect to carry the correction; a new bounded, ref-counted, per-show
`onSnapshot` subscription (`upcomingShowService.subscribeToShowAllocations`, wired through the existing
`createSharedFirestoreSubscription` utility, scoped by `where("upcomingShowId", "==", upcomingShowId)`)
replaces `useShowAllocations`'s one-shot fetch, reusing the existing allocation-document mapping logic
rather than duplicating it; and the Studio timer diagnostic request was finalized for direct inclusion
in the owner QA checkpoint.

**Verification (independently re-run and confirmed twice):** `npx tsx --test` on 8 affected test
files — **65/65 pass, exit 0** (new tests cover the exact 15/5/5→7-rejection sequence, plus/minus
stepper parity, and 6 genuine Show Queue live-update scenarios driving the real shared-subscription
primitive). `npm run typecheck --workspace @fresh-prints/portal` — **exit 0**. `npm run build:portal`
— **exit 0**. `npm run build:studio` — **exit 2**, confirmed still exactly the same 29 pre-existing
errors, none in any touched file. `npm run lint` — **exit 1**, confirmed still exactly 41 problems,
none new in any touched file. `git diff --check` — **exit 0**. Confirmed no new Firestore index
required.

**Fourth independent Implementation Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-4.md`,
explicitly did not defer to any of the three prior "APPROVED" verdicts on this goal): **`APPROVED`**.
Independently re-traced all three quantity-plumbing layers to their actual return statements (not just
existence), confirmed `itemPropSyncGuard.ts` remains unconditionally correct for genuinely external
changes, confirmed the Show Queue subscription is genuinely ref-counted/bounded/torn-down-correctly,
and personally re-ran every verification command rather than trusting reported counts. Its own stated
confidence: high for both fixes at the mechanism level, with an explicit, honest note that only live
testing — not further source review — can confirm real network-timing races and actual cross-client
Firestore listener behavior, which is exactly why the owner's next QA pass matters.

**Owner manual QA checkpoint rewritten** per the owner's exact Check 1-4 format
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`),
including the precise, copy-pasteable diagnostic request for the Studio timer's live-Rules-comparison
step.

**No Functions, Rules, indexes, migration, deployment, App Hosting, or production action occurred.**
`preproduction-static-analysis-cleanup` and `studio-test-data-print-limit-wipe-audit` remain queued,
neither started. **Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response,
including the Studio timer diagnostic input, before this goal is signed off.**

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner SECOND runtime `FAIL`; three deeper root causes traced and fixed; THIRD independent Implementation Review APPROVED; awaiting owner re-QA (v3)

Owner ran a second manual QA pass against the first remediation's Implementation-Review-APPROVED fix
and found it real but incomplete: cart/context, Discover, Design Library, and Add to Show cancellation
were now confirmed correct, but the Print Request **detail route itself** still showed stale data after
navigating away and back; typed quantity entry was badly inconsistent, including values silently
collapsing to `1`; and a previously-hidden Studio production-timer permission failure blocked a
required regression criterion.

**Three distinct root causes, found by direct source trace and independently confirmed twice (once by
a focused Formal Review of the diagnosis before any code changed, once by a third Implementation
Review after):**

1. **A second, un-invalidated 30-second read cache.** `portalPrintRequestService.getPrintRequest`/
   `listPrintRequestItems` (called by the detail route on every mount, including navigate-away-and-back
   to the same working request) route through a 30-second in-memory cache
   (`portalPrintRequestReadCache.ts`) entirely separate from the cart's `workingItems`. Neither
   `removePrintRequestItem` nor `updatePrintRequestItemQuantity` ever invalidated it — only two other
   mutations did, and one of those two carries a code comment proving this exact defect class was
   already found and fixed once before, for a different mutation, and never extended to these two.
   Separately, the detail hook's mount-time `reload()` unconditionally overwrote item state with no
   gate for whether the working request was being viewed, racing the cart-sync effect with no
   arbitration.
2. **Quantity update discarded the server's authoritative clamped value at three separate layers**
   (`usePrintRequestDetail.updateItem` → `portalPrintRequestService.updatePrintRequestItem` →
   `updatePrintRequestItemQuantity`), so the client's own optimistic guess — not what the server
   actually accepted — is what displayed; a separate lookup-miss fallback silently defaulted to the
   literal `1` rather than surfacing an explicit failure.
3. **Studio production-timer permission failure** — not resolvable from source alone; requires live
   reproduction against `fresh-prints-dev` that this remediation could not perform.

**Plan amendment:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 20. **Amendment 2 Formal Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-2-review.md`,
focused, independent, did not defer to either prior "APPROVED" Implementation Review on this goal):
**`approved_with_changes`** — independently re-derived all three root causes from source and confirmed
each exactly as written, including independently re-deriving the full `firestore.rules` field
allowlists against the timer's actual batch write and finding no discrepancy (confirming "diagnose
first, don't guess a Rules fix" as the correct, most conclusive answer obtainable from source alone).
**One blocking finding, resolved directly in the Plan:** the amendment's original diagnosis only
analyzed `updateItem`, missing a second, parallel dead-code function
(`usePrintRequestDetail.updateItemQuantity`) with the identical bug pattern — required to be explicitly
fixed or removed, not left as an undocumented duplicate.

**Implemented:** cache invalidation added to both mutations; `usePrintRequestDetail.ts` restructured so
`workingItems` is authoritative for item state while viewing the working request (`reload()`'s own item
fetch is gated by a new `shouldApplyReloadedItems` check evaluated at apply time via a ref updated on
every render, not a stale closed-over value); `updatePrintRequestItem`/`updatePrintRequestItemQuantity`
now return the server's authoritative accepted quantity, which `updateItem` commits on success instead
of its own optimistic guess (the implementer additionally found and fixed a third layer of this same
discard pattern, one level below what the Plan named, inside `updatePrintRequestItem`'s own internal
call); the lookup-miss fallback now throws an explicit error instead of silently defaulting to `1`; the
dead-code `updateItemQuantity` duplicate is fully removed (confirmed via fresh grep, zero callers); and
`useShowProductionTimer.ts` gained diagnostic-only error-detail logging (no Rules/data touched, no
behavior change) so a future reproduction attempt can capture the exact failure.

**Verification (independently re-run and confirmed twice — once directly, once by the new
Implementation Review):** `npx tsx --test` on 8 affected test files — **52/52 pass, exit 0** (new
behavior tests drive the same extracted functions the shipped hook uses, in the same sequence, covering
the owner's exact 15/5/5→7-rejection and 15/5/5→1/1/1-reduction regression cases plus stale-completion
ordering and cart/detail parity). `npm run typecheck --workspace @fresh-prints/portal` — **exit 0**.
`npm run build:portal` — **exit 0**. `npm run build:studio` — **exit 2**, confirmed still exactly the
same 29 pre-existing errors, none in any touched file. `npm run lint` — **exit 1**, confirmed still
exactly 41 problems, none in any touched file. `git diff --check` — **exit 0**.

**Third independent Implementation Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-3.md`,
explicitly did not defer to either of the two prior "APPROVED" verdicts on this same goal, both of
which the owner's own runtime QA had already proven incomplete): **`APPROVED`**. Independently traced
the render-vs-effect timing of the new viewing-state ref (confirming it updates synchronously in the
render body, not inside an effect — the detail that actually matters for the fix to work), traced all
three quantity-response-threading layers by hand, confirmed the dead-code removal via its own fresh
grep, confirmed the new tests genuinely drive shipped logic rather than a parallel reimplementation, and
personally re-ran both `build:studio` and `lint` rather than trusting reported counts. Its own stated
confidence: **high but not absolute** — this pass traced actual runtime data flow rather than confirming
code merely exists (the gap that sank both prior passes), but React scheduling edge cases, live
Firestore consistency timing, and the still-open Studio timer question remain outside what source-level
review can fully verify; a fourth owner QA pass, not a fourth source review, is what closes the
remaining gap.

**Owner manual QA checkpoint rewritten and restructured**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`) per the
owner's explicit instruction: a "developer already verified automatically" section listing every
automatable check with exact exit codes, and a "minimal remaining owner checks" section limited to the
5 items that genuinely require a live authenticated session or real UI interaction (remove+navigate,
typed over-cap rejection, typed valid reduction persistence, Studio timer reproduction with the new
diagnostic log, and a brief regression smoke of previously-passing items).

**No Functions, Rules, indexes, migration, deployment, App Hosting, or production action occurred.**
`preproduction-static-analysis-cleanup` is now also recorded as a queued goal (owner-directed), after
`studio-test-data-print-limit-wipe-audit`, both still ahead of `production-release`. **Human checkpoint
— awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response to the restructured manual QA
checkpoint before this goal is signed off.**

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner runtime `FAIL`; real root cause traced and fixed; NEW independent Implementation Review APPROVED; awaiting owner re-QA

Owner ran manual QA against the previously "Implementation Review APPROVED" fix and found both core
defects still broken at runtime: removed designs stayed visible until a hard refresh, and quantity
changes reverted or were lost. The prior Implementation Review had genuinely verified that the
reconciliation calls existed and were individually wired correctly — that verification was accurate
as far as it went, but did not prove the *rendered* page actually reflected those calls end-to-end.

**Real root cause (found by tracing the live component→hook→context call graph directly, not
re-reading the same functions in isolation), independently confirmed twice (once by a focused Formal
Review of the diagnosis before any code changed, once by a brand-new Implementation Review after):**
`apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx`'s `handleRemoveItem`/
`handleUpdateItem`/`handleDuplicateItem` each awaited the properly-reconciled hook method (which
already synchronously patches both local and shared state on success) and then **unconditionally**
fired a second, completely unguarded `reloadWorkingItems({ silent: true })` directly on the raw
context function. By the time that second reload started, the removal's own pending-removal guard
had already fully cleared (it brackets only the awaited callable inside the hook, not this later,
independent, component-level reload). The fresh server read this reload triggered could — via
ordinary Firestore eventual-consistency lag, not a rare edge case — still contain the just-deleted
item or the pre-edit quantity, and the merge function's own contract ("server rows win on matching
id," no timestamp/generation check) kept it as if it were fresher. That incorrect state then flowed
back through the page's own sync effect, overwriting the just-corrected data. This explains why the
defect was consistent rather than intermittent — it fired on every single remove/update, since the
redundant reload ran unconditionally every time.

**Plan amendment:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 19 — documents this root cause, the corrected remediation, an owner copy correction
("Print again" → exactly "Request Again"), and an owner-explicitly-approved scope addition to fix the
separate, pre-existing Studio `tsconfig.json` build blocker in the same pass.

**Amendment Formal Review** (`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-review.md`,
focused, independent, reviewed only Section 19 before any code changed): **`approved_with_changes`**
— independently re-traced the full call sequence across all five cited files and confirmed the root
cause exactly as written (reproducible from source, not merely plausible), confirmed the proposed
remediation was narrowly scoped (grepped ~30 `reloadWorkingItems` call sites app-wide; only three
needed removing) with no regression risk to the existing fix or any other consumer, and independently
re-verified the Studio tsconfig diagnosis. Two non-blocking notes (a capitalization inconsistency in
the "Request Again" example wording; a residual-risk check against `CurrentRequestDrawer.tsx`'s own
separate reload calls) both resolved directly in the Plan before Implement proceeded.

**Implemented:** removed the three redundant `reloadWorkingItems({ silent: true })` calls from
`PrintRequestDetailView.tsx`; added a new prop-sync guard
(`apps/portal/features/print-requests/utils/itemPropSyncGuard.ts`) to
`PortalPrintRequestItemCard.tsx` so a stale prop from an unrelated, still-legitimate reload elsewhere
(e.g. the Current Request drawer) cannot silently revert an already-saved quantity — compares a
monotonic "last accepted" timestamp, not just a value signature, with a `Date.now()` fallback in the
save-success path since the update callable doesn't return a fresh server timestamp (confirmed sound:
a local clock reading is always ≥ any real Firestore timestamp already observed); changed the
historical-request reuse button to exactly "Request Again"; fixed `apps/studio/tsconfig.json`'s
invalid `"ignoreDeprecations": "6.0"` to `"5.0"` (valid for the installed TypeScript 5.9.3) — a single
line, no dependency upgrade, no other compiler option touched. Added real behavior-level tests (not
static/regex source checks) modeling the actual state transitions: two new cases in
`mergeServerWorkingItemsWithLocal.test.ts` proving the exact traced race, and a new
`itemPropSyncGuard.test.ts` with 5 cases proving genuine accept/reject decisions.

**Verification (independently re-run and confirmed by direct exit-code capture, not trusted from any
self-report):** `npx tsx --test` on all affected files — **30/30 pass, exit 0**.
`npm run typecheck --workspace @fresh-prints/portal` — **exit 0**. `npm run build:portal` — **exit 0**
(19/19 pages). `npm run build:studio` — **exit 2**: `TS5103` is gone, but 29 separate, genuinely
pre-existing type errors (previously masked by the build failing before type-checking ever ran) are
now exposed across Studio/shared source — independently cross-checked against `git diff --name-only`
and confirmed none are in any file this remediation pass touched. `npm run lint` — **exit 1**, 41
problems, identical count to before this pass, all pre-existing. `git diff --check` — **exit 0**.

**New independent Implementation Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-2.md`,
explicitly instructed NOT to defer to the prior, now-disproven `APPROVED` verdict): **`APPROVED`**.
Independently re-traced the actual current call sequence for both remove and update end-to-end from
source, confirmed no code path in `PrintRequestDetailView.tsx` calls `reloadWorkingItems` after the
reconciled hook methods resolve, confirmed the hook methods still correctly patch both local and
shared state, confirmed the new prop-sync guard's logic and `Date.now()` fallback are genuinely sound
(not a disguised hack), independently ran the new tests (14/14 pass) and confirmed they assert on
resulting state transitions rather than mock-call presence, independently re-ran `build:studio` and
`lint` and confirmed the same pre-existing-only characterization. Answered the reviewer's own required
key question — "will the owner's same manual QA scenarios now behave correctly" — with **yes,
concrete evidence, not just plausibility**: both traced root causes have been removed at the exact
call sites responsible.

**Owner manual QA checkpoint rewritten**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`) with
all 16 owner-specified scenarios (A through P) verbatim from the owner's `FAIL` message, plus the
updated verification table and an honest flag that Studio's production build still fails (on 29
separate, pre-existing, out-of-scope errors) even though the `TS5103` blocker specific to this goal is
resolved.

**No Functions, Rules, indexes, migration, deployment, App Hosting, or production action occurred at
any point in this remediation.** `studio-test-data-print-limit-wipe-audit` remains queued but not
started; `production-release` remains not started. **Human checkpoint — awaiting the owner's
`PASS`/`PASS WITH NOTES`/`FAIL` response to the rewritten manual QA checkpoint before this goal is
signed off.**

## 2026-07-27 — `portal-print-request-prelaunch-stability` Implement complete; independent Implementation Review APPROVED; owner manual QA checkpoint prepared

Owner approved the corrected Plan for implementation with explicit scope discipline (no DPI-policy
change, no `production-release`, no production/Firebase/deployment action, no Functions/Rules/
indexes/migration unless proven necessary — none were), and directed that
`studio-test-data-print-limit-wipe-audit` be recorded as the next queued goal after this one, before
`production-release`.

**Implemented exactly the approved Plan's Section 8 file list, nothing more:**
`apps/portal/features/catalog/services/catalogService.ts` (item 1 — bounded missing-ID-only retry
against the generated-catalog fallback, zero extra reads on a fully successful response),
`apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` (items 2/5/7 — `removeItem`/
`updateItem`/`duplicateItem` now call the context's existing `beginPendingItemRemovals`/
`endPendingItemRemovals`/`patchWorkingItems`, plus a new per-item generation tracker,
`itemMutationGeneration.ts`, that discards stale completions for a superseded mutation),
`useMyPrintRequests.ts` (`reconcileQueuedRequest` now patches `allocationTotalsByRequestId` from the
queue-to-show callable's authoritative result, not a guess), `PrintRequestDetailView.tsx`
(`handleQueuedToShow` threads that result through), `PortalPrintRequestProgressPanel.tsx` (elapsed
clock removed from customer-visible render; Queued/Printing/Done rail and status copy retained;
`usePortalShowPrintProgress.ts` — the underlying production timer — untouched),
`packages/shared/src/utils/printRequestQuotaUserCopy.ts` (+ 2 dependent test files — exact corrected
capacity copy), `PortalPrintRequestItemCard.tsx` (item 8 — "Print again" + repeat icon + distinct
`aria-label` in the historical/catalog-reuse context only; `onAddToRequest` wiring unchanged, no
duplication), and the Firebase Debug toast removed from both `FirebaseDebugPanelMount.tsx` files in
Portal and Studio (both `FirebaseDebugPanelActivationToast.tsx` files deleted; dev-only eligibility
gates and the Ctrl+Shift+F shortcut confirmed untouched in both apps). 6 new test files added per
Plan Section 9.

**Verification (exact exit codes, this session):** `npx tsx --test` on the 8 new/updated test files —
**45/45 pass, exit 0**. `npm run typecheck --workspace @fresh-prints/portal` — **exit 0**.
`npm run build:portal` — **exit 0** (19/19 pages; a first attempt hit a transient Windows
file-rename race unrelated to code, a clean retry succeeded). `npm run build:studio` — **exit 2**,
traced to a genuinely pre-existing, out-of-scope defect: `apps/studio/tsconfig.json`'s
`"ignoreDeprecations": "6.0"` was committed 2026-07-13 (two weeks before this goal) and the installed
TypeScript (5.9.3) rejects that value; confirmed via `git log -p`/`git diff --stat` that this session
made zero changes to that file. `npm run lint` — **exit 1**, 41 problems (31 errors, 10 warnings),
independently confirmed every one pre-existing and not on a line this goal's diff touched (spot-check:
`PortalPrintRequestItemCard.tsx`'s one lint finding is an unrelated unused-prop line untouched by this
goal's 13-line "Print again" diff). `git diff --check` — **exit 0**.

**Independent Implementation Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review.md`,
separate context, did not trust the implementer's self-report): **APPROVED, no blocking findings.**
Independently traced the actual reconciliation logic line-by-line (not just confirmed functions
exist), independently re-ran 10 relevant test files (57/57 pass), and independently re-derived both
pre-existing-defect diagnoses (`build:studio` tsconfig issue; lint characterization) from `git log`/
`git diff` rather than trusting the claim. One non-blocking test-architecture note: the Plan's
requested single "delayed load resolves after delete" test is satisfied by composition across two
files (`itemMutationGeneration.test.ts` + `mergeServerWorkingItemsWithLocal.test.ts`) rather than one
combined test, since this repo's convention avoids DOM-rendering tests — confirmed this still
provides real, non-superficial coverage of the actual race.

**Owner manual QA checkpoint prepared:**
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md` — covers
all 8 defects plus the debug-toast removal, restates the exact verification exit codes above, and
flags the pre-existing `build:studio` defect separately as a note for a future (not this goal's)
decision.

**No Functions, Rules, indexes, migration, deployment, App Hosting, or production action occurred.**
`production-release` remains not started. **Human checkpoint — awaiting the owner's `PASS`/
`PASS WITH NOTES`/`FAIL` response to the manual QA checkpoint before this goal is signed off.**

## 2026-07-27 — `portal-print-request-prelaunch-stability` Plan + independent Formal Review complete; awaiting owner approval to begin Implement

Started this required pre-production stabilization goal (immediately before the separate, still-queued
`production-release` roadmap goal) per explicit task instruction: Plan phase only, Formal Review
required, **no implementation this session**.

**Investigation (read-only, direct source inspection, no code changes):** all 8 owner-reported Portal
print-request defects plus the Firebase Debug availability toast were reproduced against actual current
source, not documentation. **Root cause for items 2 (removed items reappearing), 5 (stale/reverting
quantities), and 7 (missing post-queue progress tracker) is one shared structural pattern, not three
independent bugs**: `usePrintRequestDetail.ts` maintains its own local item/request state that only
partially reconciles with `useWorkingCurrentRequestItems.ts` (the context's declared sole owner of
working-request item state) — `removeItem` never calls the existing `beginPendingItemRemovals`/
`patchWorkingItems` mechanism that already exists in context, so a slower stale load can resurrect
deleted items or clobber a newer quantity edit; `reconcileQueuedRequest` (called after a successful
queue-to-show) patches only `request.status`, never `allocationTotalsByRequestId`, so the progress
tracker stays invisible until a pathname-gated `'full'` reload happens to occur later. **Item 1's**
cold-start blank-image defect is a separate root cause: `catalogService.getReadyDesignsByIds` reads a
generated portal-catalog manifest snapshot with a documented cache window; a successful-but-incomplete
snapshot read (missing a just-added/approved design) is treated as final — the per-doc Firestore
fallback only triggers on a thrown exception, never on a successful-but-partial result, so the missing
design renders as "unavailable" instead of "still loading."

**Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`. Proposes
narrow, reversible fixes reusing existing-but-underused reconciliation plumbing (no second write path,
no new unbounded reads, no reintroduction of the Wave-C-abandoned print-request read model) across:
`catalogService.ts`, `usePrintRequestDetail.ts`, `useWorkingCurrentRequestItems.ts` (likely zero-diff),
`useMyPrintRequests.ts`, `PrintRequestDetailView.tsx`, `PortalPrintRequestProgressPanel.tsx`,
`printRequestQuotaUserCopy.ts`, `PortalPrintRequestItemCard.tsx`, and the Firebase Debug toast
components/mounts in both Portal and Studio (toast component deleted; dev-only gate and Ctrl+Shift+F
shortcut confirmed separable and left untouched). No Functions, Rules, indexes, or data migration are
required.

**Independent Formal Review** (`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-review.md`,
separate context, did not see the Planning Agent's reasoning): **`approved_with_changes`**. Found and
required correction of **one blocking factual defect**: the Plan's first draft asserted the owner's
"200 effective DPI" print-request-save-floor brief was wrong and that the real floor was 72 DPI —
independently re-checking `packages/shared/src/constants/printSize.constants.ts` and
`packages/shared/src/utils/printRequestItemSizing.ts` showed this was backwards (200 DPI,
`EFFECTIVE_DPI_BAD_MIN`/`MIN_PRINT_REQUEST_EFFECTIVE_DPI`, is the genuine save-floor with a matching
runtime error string; 72 DPI/`MIN_ACCEPTABLE_EFFECTIVE_DPI` governs a separate import/upload-acceptance
path). The owner's original brief was correct. **Resolved directly in the Plan** (Section 1, plus
Section 18's disposition record) — confined to a restated-fact/test-guidance correction; the reviewer
confirmed no proposed file touches DPI validation logic, so the fix design for all 8 items is
unaffected. Every other claim (shared root cause for items 2/5/7, item 1's cold-start mechanism, exact
strings for items 3/6, elapsed-clock/production-timer separation for item 4, already-correct historical
gating for item 8, bounded-Firestore constraint, and every scope boundary) was independently
re-verified against source with file:line citations and confirmed sound.

**No implementation occurred.** No Firebase, deployment, App Hosting, or production action occurred.
`production-release` remains not started and untouched. **Human checkpoint — awaiting owner review and
approval of the corrected Plan before Implement begins.**

## 2026-07-27 — `portal-google-analytics` SIGNED OFF: PASS — managed goal CLOSED

Owner reviewed the Test Report and Signoff checkpoint and responded **`PASS`** with
no notes. The goal is now closed.

**Final state:** an inert Google Analytics 4 architecture is built and merged into
Fresh Prints Portal (`apps/portal/features/analytics/`), wired into
`apps/portal/app/layout.tsx`/`providers.tsx`. It is fully dormant in every deployed
environment today — no `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured anywhere
(`fresh-prints-dev` or local), and the architecture is designed to stay inert
(`resolvePortalAnalyticsConfig` resolves `enabled: false` without one, gated further by
a production-hostname-only check even if one were accidentally set).

Five Formal Review passes and two Implementation Review passes were required across
the goal's lifetime, each resolving owner-identified defects: an initial PII-leak risk
(raw request/design IDs, search text, `returnTo`, dynamic titles reaching Google), an
Enhanced Measurement duplication gap, a de-duplication under/over-counting defect, an
internally contradictory Enhanced-Measurement/ad-signal scope, a Server-Component/
Client-Component architectural conflict plus a dual-ownership conflict for the initial
page view, a rejected "accept a narrower privacy gap" production fallback (replaced by
a hard PASS/BLOCKED gate, Plan Section 6c.4), and finally a genuine runtime
initialization race (the script-readiness handshake fix, Plan Section 34) found only
after Implementation Review had already approved an earlier version — closed by an
explicit `onReady`-based readiness signal and a success-gated state commit rule.

**Test phase**: automated suite 81/81 pass (exit 0), Portal typecheck exit 0, Portal
build exit 0 (19/19 pages, no Suspense error), lint exit 1 with the correct, precise
characterization (10 pre-existing warnings tripping the repo's `--max-warnings 0`
policy; zero new findings in this goal's files). Inert local runtime smoke test
performed and passed: Portal starts normally, zero Google-domain script/network
activity anywhere, all routes HTTP 200, zero console/server errors.

Full artifact trail: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`,
`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`,
`docs/workflow/reviews/2026-07-26-portal-google-analytics-implementation-review.md`,
`docs/workflow/reviews/2026-07-27-portal-google-analytics-test-report.md`,
`docs/workflow/reviews/2026-07-27-portal-google-analytics-signoff-checkpoint.md`.

**Production was untouched throughout the entire goal.** No real Measurement ID was
ever used. No GA4 property was created. No Firebase, App Hosting, or production action
occurred at any point across Plan, five Formal Reviews, Implement, two Implementation
Reviews, Test, or Signoff.

**Next queued goal (per the roadmap's pre-production sequence,
`docs/project/ROADMAP.md`): `production-release`.** Not started — requires its own new
Plan phase and explicit owner approval before any implementation or deployment begins.
Per this goal's Plan (Section 18, Owner Decision 6), `production-release` is where the
owner will: create the real GA4 property, disable Enhanced Measurement completely,
verify advertising settings are disabled, run the Section 6c.4 hard PASS/BLOCKED
DebugView privacy gate, resolve privacy disclosure/consent (Owner Decision 3/7), and
only then supply the real Measurement ID and deploy.

## 2026-07-27 — `portal-google-analytics` script-readiness race fixed (second Implementation Review APPROVED); Test phase complete; awaiting owner Signoff

The owner found a real runtime race in the Implementation-Review-approved code: the
analytics controller could permanently lose its initial GA configuration and page view
if its first React effect ran before the `next/script strategy="afterInteractive"`
script had executed and defined `window.gtag` — the prior code committed "initialized"
state unconditionally after merely *calling* the service functions (which correctly
no-op if `gtag` doesn't exist yet), not after confirming they succeeded. A dropped
query-parameter change, a config toggle, or any other unrelated dependency change would
never re-run the effect to retry, so the initial configuration/page view would be lost
permanently in that scenario.

**Fix (root cause resolved, not merely worked around):**

1. `portalAnalyticsService.ts`'s three exported functions
   (`initializeStream`/`updatePageContext`/`trackPageView`) now return an explicit
   `boolean` — `true` only if `window.gtag` existed and the call was made — making "did
   this succeed" directly observable instead of inferred.
2. `PortalAnalyticsScript.tsx` now accepts an `onReady` prop, wired to the stub
   `<Script>` tag's `onReady` — `next/script`'s own documented lifecycle callback,
   verified against current Next.js documentation, not an invented polling/timer
   mechanism.
3. `PortalAnalyticsBoundary.tsx` now owns a `scriptReady` boolean, flipped by that
   callback, passed into `usePortalAnalyticsController` as a second parameter.
4. The controller's state machine now refuses to attempt initialization while
   `scriptReady` is `false`, and commits `initialized`/`lastIdentityKey`/
   `previousSanitizedPath` state **only** when `initializeStream` returns `true` —
   structurally making `updatePageContext`'s `update: true` call unreachable before a
   real successful initial configuration.

No new lifecycle owner was introduced — `PortalAnalyticsScript`/`PortalAnalyticsBoundary`
only report the fact that the script executed; every decision about `gtag` calls
remains exclusively inside `usePortalAnalyticsController`/`portalAnalyticsService`.

**Ten required regression tests added** to
`usePortalAnalyticsController.test.ts` covering: controller run before readiness;
readiness false→true without navigation; readiness remaining false across repeated
renders; Strict-Mode-style replay after readiness; readiness firing more than once;
navigation before readiness (current route becomes the one initial page view, no stale
earlier route); navigation after successful initialization; `initializeStream`
reporting failure (no false state, later retry succeeds); permanently blocked script;
and a `PortalAnalyticsScript` thin-component regression test (comment-stripped
source-text check proving no sequencing/identity logic and no `useState`/`useRef` of
its own leaked back into that component).

**Second independent Implementation Review**
(`docs/workflow/reviews/2026-07-26-portal-google-analytics-implementation-review.md`,
rewritten for this pass): **APPROVED** — every one of the owner's ten required
checklist items independently re-verified against the actual shipped code, not the
first review's claims.

**Verification (independently re-run, exact results):**
`npx tsx --test` on the analytics test files — **81/81 pass, exit 0**.
`npm run typecheck --workspace @fresh-prints/portal` — **exit 0**. `npm run build:portal`
— **exit 0** (19/19 pages, no Suspense build error). `npm run lint` — **exit 1**
(corrected characterization: the repo's `--max-warnings 0` policy makes this the true,
deterministic exit code whenever any of the 10 pre-existing warnings exist; the earlier
implementation review's "exit 0" claim for this same command was itself an error, now
corrected — the problem count/file list are identical and unrelated to this goal in
both runs).

**Test phase complete**: automated results recorded plus an inert local runtime smoke
test (Portal started with no `NEXT_PUBLIC_GA_MEASUREMENT_ID` set; confirmed zero
Google-domain script tags or network activity in the fetched HTML for `/`, `/catalog`,
`/login`, `/help`, `/firebase-debug`; all routes returned HTTP 200; zero console/server
errors). Test Report:
`docs/workflow/reviews/2026-07-27-portal-google-analytics-test-report.md`.

**Signoff checkpoint prepared, awaiting owner response**:
`docs/workflow/reviews/2026-07-27-portal-google-analytics-signoff-checkpoint.md`.

Production remains completely untouched throughout every pass of this goal.

## 2026-07-26 — `portal-google-analytics` Implement complete: inert GA4 code built, all verification passed, independent implementation review APPROVED

Owner approved Owner Decisions 1–7 (Plan Section 18), subject to a whole-Plan
consistency correction resolving three implementation blockers found in the
twice-amended Plan:

1. **Server Component boundary conflict** — `apps/portal/app/layout.tsx` cannot call
   `usePathname()`/`useSearchParams()` (Client-only hooks) and never receives
   `searchParams` as a prop. Resolved: `layout.tsx` now only calls
   `resolvePortalAnalyticsConfig(process.env)` (env-only, pure) and passes the result
   as a prop; a new Client Component, `PortalAnalyticsBoundary`, wrapped in the
   `<Suspense>` boundary Next.js requires for any `useSearchParams()` caller, owns all
   URL-aware logic.
2. **Dual ownership of the initial page view** — a bootstrap script and a separate hook
   both previously claimed to send the first page view. Resolved: a single new hook,
   `usePortalAnalyticsController`, is now the sole authoritative owner of the entire
   lifecycle (initialization exactly once via `gtag('config', ...)`, every navigation
   via `gtag('config', ..., {update:true})` then a manual `page_view`).
   `PortalAnalyticsScript` is now reduced to loading `gtag.js` and defining the
   `dataLayer`/`gtag` stub only — no sequencing logic.
3. **Accepted-fallback production gate removed** — a prior revision let production GA4
   enablement proceed even if automatically-collected events showed raw context, "as
   long as accepted." The owner rejected this. Resolved: a hard, two-outcome
   PASS/BLOCKED gate (Plan Section 6c.4) replaces it — no accept-and-proceed path
   exists anywhere in the Plan's current, operative text.

**Whole-Plan independent Formal Review**
(`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`, rewritten for
this pass — the fifth Formal Review on this goal, and the first scoped to the entire
document rather than one amendment) verified all three corrections directly against
source and current Next.js/GA4 documentation, and found **one blocking defect**: an
older section of the Plan (Section 32) still narrated the rejected fallback as the
Plan's live resolution, with no note that it had been superseded — a cross-section
drift exactly the kind a whole-Plan review exists to catch. **Resolved** with a
supersession note added directly in that section, plus removal of one dead label.
Verdict: `approved_with_changes`, all findings resolved.

**Implement.** Built exactly the inert code specified in Plan Section 16, nothing more:

- `apps/portal/features/analytics/services/portalAnalyticsHostGate.ts` — dedicated
  production-hostname gate, independent of the SEO-named
  `isPortalSearchIndexingEnabled`.
- `apps/portal/features/analytics/services/portalAnalyticsConfig.ts` — pure
  `resolvePortalAnalyticsConfig(env)`; inert unless a Measurement ID is set AND the
  resolved origin is `myprintrequest.com`/`www.myprintrequest.com`.
- `apps/portal/features/analytics/services/portalAnalyticsSanitizer.ts` — the single
  mandatory choke point between raw navigation state and `gtag`: exhaustive route
  templating (`/requests/:id`, `/share/design/:id`, etc.), a fixed query-parameter
  allowlist (drops `q`, `returnTo`, `requestId`, `designId`, `seedDesignId`,
  `etsyRecommendationId`; templates `category` to a presence marker only), fixed
  non-dynamic titles, sanitized referrer (never `document.referrer`), fail-closed
  unknown-route handling; plus `buildNavigationIdentity`/`navigationIdentityKey` for
  de-duplication, sharing the same allowlist constant so it cannot drift from the
  descriptor.
- `apps/portal/features/analytics/services/portalAnalyticsService.ts` —
  `initializeStream` (the only caller of a bare `gtag('config', ...)`, explicitly
  setting `send_page_view: false`, `allow_google_signals: false`,
  `allow_ad_personalization_signals: false`), `updatePageContext` (uses the official
  `update: true` mechanism, never re-initializes, never sends `send_page_view`/ad
  flags), `trackPageView` — all three guarded on `window.gtag` and narrowed to a single
  sanitized descriptor type, never an arbitrary object.
- `apps/portal/features/analytics/hooks/usePortalAnalyticsController.ts` — the single
  authoritative lifecycle owner; its state-machine logic is extracted into a pure,
  directly-testable function (`runPortalAnalyticsControllerTick`) per this repo's
  established testing convention (no DOM-rendering dependency exists in this repo).
- `apps/portal/features/analytics/components/PortalAnalyticsScript.tsx` — thin script
  loader only; `PortalAnalyticsBoundary.tsx` — Suspense wrapper mounting the controller.
- `apps/portal/features/analytics/types/portalAnalytics.types.ts` — strict types, no
  `any`.
- `apps/portal/app/layout.tsx`, `apps/portal/app/providers.tsx` — wired per the
  corrected architecture; `apps/portal/.env.example` — one new documented, empty
  `NEXT_PUBLIC_GA_MEASUREMENT_ID=` line.

**Verification (all independently re-run, exact exit codes recorded in
`docs/workflow/reviews/2026-07-26-portal-google-analytics-implementation-review.md`):**
`npx tsx --test` on the six new test files — **73/73 pass, exit 0**.
`npm run typecheck --workspace @fresh-prints/portal` — **exit 0**.
`npm run build:portal` — **exit 0** (19/19 pages generated; critically, no "Missing
Suspense boundary with useSearchParams" build error, confirming the Suspense placement
is correct). `npm run lint` — **exit 0**, 41 pre-existing problems all in unrelated
files, zero new findings in the analytics feature or the two edited files.

**Independent implementation review: APPROVED** (separate context, verified every file
directly, re-ran every command independently rather than trusting the claim). One
non-blocking note: the "survives Strict Mode" guarantee is proven at the pure-function
level (matching this repo's established no-DOM-renderer testing convention), not via
an actual mounted-hook render.

**Not authorized and not performed, per the task's explicit scope:** no real
Measurement ID anywhere; no GA4 property created; no consent banner; no Firebase
change; no App Hosting deployment (dev or production); no CSP work; no custom events;
no Enhanced Measurement enablement; no advertising/personalization feature.

**Stopped here, before deployment and before any real Measurement ID**, per the task's
explicit instruction. Remaining phases for this goal: Test (formal QA sign-off of the
inert code, still possible without a real Measurement ID) and Signoff — then, as a
fully separate later checkpoint, the `production-release` roadmap goal's own GA4
property creation, hard-gate verification, and production deployment.

## 2026-07-26 — `portal-google-analytics` Plan corrected a third time (navigation de-dup, Enhanced Measurement full disable, global page-context sanitization); third Formal Review's two blocking findings resolved in-Plan

The owner reviewed the twice-amended Plan and found three remaining material conflicts,
all resolved this session. No implementation, configuration, dependency, environment,
Firebase, or Google Analytics property change was made — `git status` confirms only the
Plan and Review documents (plus this state-file pair) changed; no
`apps/portal/features/analytics/*` files exist.

**Correction 1 — navigation de-duplication (Section 6a.5, third revision).** The prior
revision de-duplicated on raw navigation state and explicitly reframed
dropped-parameter-only changes (e.g. search-box typing) as "still fires, but produces
identical descriptors, which is acceptable GA4 behavior." **The owner explicitly
rejected this reframing** — the requirement was never actually satisfied by that
design. Replaced with a three-part design: a **local navigation identity** (raw
pathname + normalized allowlisted-query state only, never transmitted, logged, or
persisted — held only in a `useRef`) that decides *whether* to fire; the **sanitized
analytics descriptor** (unchanged) that decides *what* is reported; and the **previous
sanitized descriptor** for the safe referrer. This satisfies both requirements
simultaneously: `/catalog?q=shirt`→`?q=shirts` no longer fires at all, while
`/requests/abc123`→`/requests/xyz789` and `/share/design/abc123`→`/share/design/xyz789`
still correctly fire as distinct navigations (preserving the second-pass fix), and
query-parameter ordering no longer causes spurious mismatches.

**Correction 2 — full Enhanced Measurement disablement (Section 6b, revised).** The
prior version disabled only "Page changes based on browser history events" and
explicitly deferred Site search, scrolls, outbound clicks, video engagement, file
downloads, and form interactions as "unrelated" — while simultaneously claiming "page
views only." **This was an internal contradiction**: Enhanced Measurement's Site search
sub-feature auto-detects Portal's own `q` search parameter and reports customer search
text via an automatic `view_search_results` event, entirely independent of and
unreachable by this Plan's own sanitizer. Now requires the **entire top-level Enhanced
Measurement switch** off, folded into revised Owner Decisions 5 and 6 with an explicit
DebugView checklist (no `view_search_results`, no scroll/click/video/file-download/form
events).

**Correction 3 — global GA4 page-context sanitization and initialization order (new
Section 6c).** The Plan previously sanitized only the manually-authored `page_view`
event. Automatically-collected lifecycle events (`first_visit`, `session_start`,
`user_engagement`) would still inherit raw `document.location`/`document.title`/
`document.referrer` unless the tag's global page-context state is itself overridden
first. Added the required ordering: build the initial sanitized descriptor →
`gtag('set', ...)` the sanitized page context → `gtag('set', { allow_google_signals:
false, allow_ad_personalization_signals: false })` → `gtag('config', ...)` → manual
sanitized `page_view`; every subsequent navigation updates context via a new
`setSanitizedPageContext` function before calling the existing `trackPageView`.
**Separately corrected**: an earlier Plan draft incorrectly claimed leaving
`allow_google_signals`/`allow_ad_personalization_signals` unset meant they were "not
enabled" — verified against current documentation that both default to `true`
(enabled), so both are now set explicitly to `false`.

**Third Formal Review (`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`,
independent context, separately verified `gtag.js` scope-precedence documentation
rather than trusting the Plan's citation):** confirmed the navigation de-duplication
mechanism, Enhanced Measurement checklist, ad-signal-default correction, and
Owner-Decision wording were all sound. **Found two blocking wording/certainty issues,
no architecture changes required:** (1) Section 6a.5's `category`-handling paragraph
asserted two mutually exclusive behaviors in the same paragraph — **resolved** by
rewriting to state only the correct presence-marker behavior (switching category IDs is
*not* distinguished by this signal, an accepted scoped limitation, not a claimed
capability). (2) Section 6c's claim that `gtag('set', ...)`-before-`config` sanitizes
`first_visit`/`session_start`/`user_engagement` was overstated as "verified official
mechanism" when official documentation is silent on this specific point and one
adjacent source suggests the opposite for the two named events — **resolved** by
softening the certainty language and converting Section 20 step 6 / Owner Decision 6
sub-step (c) into an explicit go/no-go test with a documented, non-blocking fallback
(accept a narrower residual gap) if those automatic events turn out not to inherit
sanitized context.

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md` (Sections 6a.5,
6b, 6c, 18 items 3/5/6, 20, 24, 31, 32).
Review: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md` (rewritten
for this pass, with a resolution record).

**Owner Decisions 1–7 remain the same seven decisions**, with items 3/5/6 now carrying
the owner's exact required wording (no consent banner this goal; full Enhanced
Measurement disablement; ordered GA4-property-setup sub-steps a–d including an
ad-signal verification and a go/no-go DebugView check). **Production remains
completely separate and untouched.**

## 2026-07-26 — `portal-google-analytics` Plan amended (analytics sanitization + Enhanced Measurement); second Formal Review's one blocking finding resolved in-Plan

An external owner review of the already-`approved_with_changes` Plan/Review found two
material omissions: (1) the original design would have sent raw `pathname+searchParams`
toward `gtag`, risking leakage of the `/requests/[id]` Firestore document ID, free-text
catalog search strings, the `returnTo` parameter (which can itself embed a nested
request ID and query string), and — via GA4's default `page_title` behavior —
`/share/design/[id]`'s real, dynamic design-title `<title>`; (2) the Plan's
`send_page_view: false` mitigation only addresses GA4's one-time auto-page-view on
script load, not GA4 web data streams' separate, on-by-default Enhanced Measurement
"Page changes based on browser history events" setting, which would double-count every
App Router client-side navigation if left enabled. This session amended the Plan to
close both, then ran a second independent Formal Review, then resolved that review's
one blocking finding directly in the Plan. No implementation, configuration,
dependency, environment, Firebase, or Google Analytics property change was made —
`git status` confirms only the Plan and Review documents (plus this state-file pair)
changed; no `apps/portal/features/analytics/*` files exist.

**Verified repository inventory (Plan Section 6a.1/6a.2), built from direct inspection,
not invented:** every Portal route and every query parameter actually read via
`useSearchParams()` anywhere in `apps/portal` was catalogued. Key findings: `/requests/[id]`'s
dynamic segment is a Firestore `printRequest` document ID (sensitive-adjacent, not
public); `/share/design/[id]`'s dynamic segment is a catalog design ID already public
via the existing sitemap/share-link SEO work (safe to template, not newly sensitive);
`q` (catalog search) is free customer-entered text; `returnTo` (used by `/login`,
`/register`, `/login-required`, `/complete-profile`, `/donate`, `/requests/artwork`) can
transitively embed a `/requests/:id`-shaped path with its own nested query string,
confirmed via real call sites in `PrintRequestDetailView.tsx`; `discover`'s enum is
exactly `new|popular|mostLiked|recent` (four values, not three); `category` is a
taxonomy document ID chosen via dropdown, not free text; no `tags` URL parameter exists
anywhere in the app.

**Sanitization architecture added (Plan Section 6a):** a new pure function,
`buildSanitizedAnalyticsPageDescriptor`, is now the sole choke point between raw
navigation state and any value reaching `gtag`. It replaces dynamic identifiers with
fixed route templates (`/requests/:id`, `/share/design/:id`), strips all query
parameters by default and re-adds only an explicit allowlist of fixed
enum/flag-shaped parameters, never uses `document.title` (uses a fixed
route-template-keyed title lookup instead — critical for `/share/design/[id]`, whose
real `<title>` contains the actual design name), never reads `document.referrer`
(tracks the previous *sanitized* path internally instead), and fails closed (a fixed
`/other` label, zero query parameters) on any unmatched route. `portalAnalyticsService`'s
input was narrowed from an arbitrary URL string to only this pre-sanitized descriptor
type.

**GA4 Enhanced Measurement checkpoint added (Plan Section 6b):** documented, per
official Google Analytics documentation verified during this session (not from
memory), the exact console setting (Admin → Data streams → the web stream → Enhanced
measurement gear icon → Page views → Show advanced settings → uncheck "Page changes
based on browser history events"), who performs it, when (before any real Measurement
ID is configured anywhere), how it's verified in DebugView (exactly one `page_view` per
navigation, not two), and how rollback/production-release interact with it. Folded into
a revised Owner Decision 6 rather than a new numbered decision, since both concern the
same out-of-repository GA4-property-setup action and actor.

**Second Formal Review (`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`,
independent context):** verified the amendment's route/query inventory, sanitizer
architecture, Enhanced Measurement checkpoint, expanded test coverage, revised Owner
Decisions, date-consistency handling, and production-safety retention — all confirmed
sound. **Found one blocking defect the amendment itself introduced**: the original
Section 6a.5 de-duplication design compared only the *sanitized* route, which would
have silently suppressed a real page view when navigating between two different
dynamic-segment resources that template identically (e.g. `/requests/abc123` →
`/requests/xyz789`, both `/requests/:id`, with no distinguishing allowlisted query) —
an under-counting defect, not hypothetical. **Resolved directly in the Plan** (Section
30): Section 6a.5 was revised to a two-tier comparison — the de-duplication guard now
compares **raw** `pathname+searchParams` state to decide *whether* a navigation
occurred (fixing the under-counting), while the sanitized descriptor remains the only
thing ever reported to `gtag` (preserving the original privacy fix). Dependent sections
(11, 16, 19) and two minor non-blocking findings (stale cross-references; the `/other`
fallback's query-parameter handling) were also corrected.

**Date-consistency finding (Plan Section 2.1):** the Wave C signoff's 2026-07-27 date
is one day ahead of this Plan's own 2026-07-26 filename date and the system clock at
authoring time — logged as an observed documentation inconsistency between two
different sessions' artifacts, explicitly not corrected (would require rewriting a
closed goal's historical record) and explicitly not grounds to reopen Wave C.

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md` (amended, see
Sections 2.1, 6a, 6b, 18.1, 29, 30).
Review: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md` (amended
with a resolution record).

**Owner decisions required before Implement remain the same seven** (Plan Section 18),
with Decision 6 now explicitly including the GA4 Enhanced Measurement property-setting
step. **Production remains completely separate and untouched** — no GA4 property,
Firebase, environment, or deployment action occurred this session.

## 2026-07-26 — `portal-google-analytics` Plan + Formal Review complete; Implement blocked on owner decisions

Started the next queued managed goal per the roadmap's pre-production sequence
(`docs/project/ROADMAP.md` item #5, after Wave C signoff). No implementation,
configuration, dependency, environment, Firebase, or CSP change was made this pass —
this session was strictly Plan + Formal Review.

**Repository inspection (read-only, no code changes):** confirmed zero existing GA4/
analytics implementation anywhere in the repo (`apps/portal`, `apps/studio`,
`functions`, `packages/shared` — grep for `gtag`, `googletagmanager`, `GoogleAnalytics`,
`measurementId`, etc. all zero real hits); no analytics dependency in
`apps/portal/package.json`; no CSP anywhere in Portal (`next.config.ts` has no
`headers()`, no `middleware.ts` exists, no CSP in `firebase.json`/`apphosting.yaml`);
no Privacy Policy/Terms/consent page anywhere in Portal. Confirmed the exact existing
hostname-gating precedent (`getPortalSiteOrigin`/`isPortalSearchIndexingEnabled` in
`apps/portal/features/brand/`) and the exact existing per-route-effect precedent
(`Providers.tsx`'s `usePathname()`-keyed `useEffect` calling
`setFirestoreUsageTraceContext`) that the proposed architecture reuses.

**Proposed architecture:** a new `apps/portal/features/analytics/` folder
(services/hooks/components/types) following the existing Component → Hook → Service
layer rule. Root layout (`app/layout.tsx`) renders a client `PortalAnalyticsScript`
(two `next/script` tags, `strategy="afterInteractive"`, `send_page_view: false`) only
when a Measurement ID is configured AND a dedicated `isPortalAnalyticsHostAllowed` gate
resolves true (production hostname only, reusing the same hostname-resolution logic as
the existing SEO-indexing gate without coupling to it — a Formal Review-driven
correction from an earlier draft that called the SEO-named function directly).
`Providers.tsx` mounts a new `usePortalPageViewTracking` hook
(`usePathname`+`useSearchParams`, `useRef` de-dupe, excludes `/firebase-debug`) that
fires exactly one page-view per route change via a thin `portalAnalyticsService`
wrapper around `window.gtag` — every failure path (missing config, blocked script,
network failure) is a silent no-op, never a thrown error, never blocking Portal
rendering. No new npm dependency (`next/script` ships with the existing Next.js
dependency). No Firestore/Storage/Functions/Rules change anywhere in this design.

**Formal Review verdict: `approved_with_changes`** — independent review (separate
context) verified every repository claim directly, confirmed zero scope violations and
zero code/config changes by this session, and found no blocking defects. Three
findings were resolved directly in the Plan: (1) a citation overstatement about
`PortalScrollReset.tsx` proving root-level behavior was corrected to accurately scope
that precedent to the `(app)` shell only; (2) reusing the SEO-named
`isPortalSearchIndexingEnabled` gate directly was replaced with a dedicated
`isPortalAnalyticsHostAllowed` wrapper to avoid coupling the analytics and SEO
concerns; (3) an unverified Suspense-boundary assumption for `useSearchParams()` was
downgraded to an explicit Implement-time verification step rather than an assumed
fact. Two non-blocking housekeeping notes (a stale Wave C status row in
`ROADMAP.md`; a large pre-existing uncommitted Wave C diff unrelated to this goal)
were logged, not acted on.

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`.
Review: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

**Owner decisions required before Implement** (Plan Section 18, numbered 1–7): dev
analytics strategy (Plan default: disabled entirely), hostname gating (Plan default:
production hostname only), **consent strategy (no existing Privacy Policy anywhere in
Portal — Plan recommends legal review before enabling any consent-dependent path; this
is the one decision the Plan says should block Implement of consent-dependent pieces,
though the inert-by-default skeleton can be built regardless)**, test/staff traffic
exclusion (Plan default: none needed, Portal has no staff role), event scope (Plan
default: page views only), Measurement ID provisioning (owner creates the GA4 property
out-of-repo; ID supplied only at the later production checkpoint, never during
Implement/Test against `fresh-prints-dev`), and privacy disclosure (tied to consent
decision).

**Production remains completely separate and untouched.** `production-release`
(roadmap item #6) is not started and is not conflated with this goal anywhere in the
Plan. No Firebase project, App Hosting, Firestore, Storage, or Cloud Function was
touched this session.

## 2026-07-27 — firestore-usage-efficiency-wave-c SIGNED OFF: PASS WITH NOTES

Both final owner smoke tests passed. Studio: 0 listeners/callables/Storage requests/writes/
fallbacks/errors across a full all-tab traversal, bounded reads only (28 design cache hits, 12
misses), no return of the prior 1,000+ read spike. Portal: 0 fallbacks/errors/client writes, 7
callables all succeeded (1 push-sync, 1 catalog-add, 1 quantity-update, 4 item-removals — the last
four beyond the planned smoke-test script but reconciled as additional owner activity), 112 Storage
requests all from active generated catalog families, no abandoned private read-model asset
appeared.

Full signoff artifact: `docs/workflow/reviews/2026-07-27-firestore-usage-efficiency-wave-c-signoff.md`
— contains the complete problem statement, root causes, retained/abandoned architecture, dev
resources changed, preserved resources, test results, both QA results, cost interpretation, notes,
production-untouched confirmation, and monitoring recommendation.

Every abandoned private print-request read-model artifact (source, 3 Functions, Storage objects,
Storage Rules, 2 Firestore indexes) is fully removed from both source and `fresh-prints-dev`.
Bounded Firestore is the sole, permanent Print Requests path in both apps. The generated
catalog/Design Library architecture is unaffected and remains active.

**Production untouched throughout the entire goal.** No billing-alert configuration was performed
(explicitly deferred to a separate future approval, per the signoff's monitoring recommendation).

**Next queued goal (per `references/project-chatgpt-handoff/03-roadmap-and-phases.md`'s own
pre-production sequence): `portal-google-analytics`.** Not started — requires a new Plan phase and
explicit owner approval before any implementation begins.

## 2026-07-27 — Pass 6: Studio final smoke test — PASS; Portal final smoke test pending

**Studio Print Requests final owner smoke test: PASS.** Observed across all tabs: 0 listeners, 0
callable invocations, 0 Storage asset requests, 0 writes, 0 fallbacks, 0 errors; bounded page,
item, allocation, customer, show, and design reads only; the Design document cache produced
repeated cache hits; no return of the prior 1,000+ broad-read behavior. This confirms bounded
Firestore is genuinely the sole, working Studio Print Requests path with zero remaining trace of
the abandoned private read-model architecture.

**Pre-test read-only repo verification for the Portal checkpoint** (all confirmed before handing
the owner manual test steps):
- Zero remaining references anywhere in `apps/portal/` or `functions/src/` to
  `portalPrintRequestReadModelService`, `portalPrintRequestReadModelMapping`,
  `readStudioPrintRequestReadModelAsset`, `publishPrintRequestReadModels`, or
  `onPrintRequestReadModelInputWritten` (confirmed via grep).
- `apps/portal/features/print-requests/hooks/useMyPrintRequests.ts` imports only
  `portalPrintRequestService` (the bounded, customer-scoped Firestore path) — no read-model import.
- Generated catalog asset consumption (`generated/catalog-reference/**`,
  `generated/portal-catalog/**`) remains active, confirmed still referenced in
  `apps/portal/features/catalog/services/portalCatalogAssetService.ts`.
- No feature flag exists anywhere (`READ_MODEL_ENABLED`/`readModelEnabled`/`USE_READ_MODEL`/
  `ENABLE_PRINT_REQUEST_READ_MODEL` — zero matches) that could reactivate the abandoned
  architecture.
- `npm run dev:portal` runs `next dev --port 3100` — confirmed unchanged, `http://localhost:3100`
  remains the correct local URL.

**Portal final owner smoke test: pending** — owner instructed to cold-open Discover, browse the
Design Library, add one catalog design to the working request, open that request, confirm the item
appears, edit its quantity once, then provide the complete Firebase Debug report for review.

## 2026-07-27 — Pass 6: FINAL CLEANUP COMPLETE — the two unused printRequests createdAt indexes deleted from fresh-prints-dev; every abandoned private print-request read-model artifact now fully removed from source AND Firebase; awaiting owner's final Wave C smoke test

Pre-deployment check confirmed the local `firestore.indexes.json` already had both `createdAt`
indexes removed (from an earlier pass) and the bounded `queueTab+updatedAt+__name__` index intact;
the live `fresh-prints-dev` project still had both orphaned `createdAt` indexes plus every other
expected `printRequests` index (`customerId+status`, `customerId+updatedAt`, `isInternal+updatedAt`,
`requestOrigin+updatedAt`, `status+updatedAt`) — matching exactly, no unrelated index missing
locally.

`npx firebase deploy --project fresh-prints-dev --only firestore:indexes` (exit 0) did NOT remove
the two orphaned indexes by default — the CLI explicitly warned "there are 2 indexes defined in
your project that are not present in your firestore indexes file. To delete them, run this command
with the --force flag," confirmed by re-listing indexes afterward (both still present). Re-ran with
`--force` per the task's explicit pre-authorization for exactly this CLI confirmation flow — exit 0,
CLI output: "Deleting 2 indexes..." (matching the expected count exactly, no more).

**Post-deletion verification**: `queueTab ASCENDING, createdAt DESCENDING, __name__ DESCENDING` and
`queueTab ASCENDING, createdAt ASCENDING, __name__ ASCENDING` are both confirmed absent. The bounded
`queueTab ASCENDING, updatedAt DESCENDING, __name__ DESCENDING` index remains, live and unchanged.
All four other pre-existing `printRequests` indexes remain untouched — 6 total `printRequests`
indexes now live (down from 8), matching the local file exactly.

No Functions, Storage, Storage Rules, App Hosting, or application resource changed this step. No
callable was invoked. Production untouched throughout.

**Every abandoned private print-request read-model artifact is now fully removed from both source
and `fresh-prints-dev`**: application code, the three Functions, the Storage objects, the Storage
Rules, and now the two orphaned Firestore indexes. Bounded Firestore is the sole, permanent Print
Requests path for both Studio and Portal.

**Human checkpoint — awaiting the owner's final Wave C smoke test** (Studio: cold-open Print
Requests, confirm immediate bounded load with no callables/Storage requests, tabs/selected-request
work; Portal: Discover/Design Library load, working print request items load and edits work). After
that passes, Wave C is ready for signoff with no further performance work unless a new measured
regression appears.

## 2026-07-27 — Pass 6: abandoned Storage Rules cleanup DEPLOYED to fresh-prints-dev; last remaining artifact is the two unused createdAt indexes

Deployed the reviewed Storage Rules cleanup via
`npx firebase deploy --project fresh-prints-dev --only storage` — exit 0, `storage.rules` compiled
and released successfully. Only Storage Rules were deployed; no Functions, Firestore Rules,
indexes, App Hosting, or production resource changed. No callable was invoked.

Re-ran `npm run test:rules` both immediately before and immediately after deployment (portable JDK):
**12/12 pass, exit 0 both times** — confirms the abandoned print-request prefixes remain
default-denied to every role (guest/staff/customer, read and write) and every working generated
catalog rule (public manifest/client/portal-catalog reads, private AI-projection denial, all-role
write denial) is unchanged.

With Storage Rules now live, every artifact of the abandoned private print-request read-model
architecture is fully removed from `fresh-prints-dev`: application source, the three Functions,
the Storage objects, and now the Storage Rules. **The only remaining artifact anywhere is the two
unused Firestore composite indexes** still live on `fresh-prints-dev` (already removed from the
local `firestore.indexes.json` in an earlier pass, not yet removed from live Firebase):
- `queueTab ASCENDING, createdAt DESCENDING, __name__ DESCENDING`
- `queueTab ASCENDING, createdAt ASCENDING, __name__ ASCENDING`

The bounded Firestore index (`queueTab ASCENDING, updatedAt DESCENDING, __name__ DESCENDING`) must
remain and is unaffected by the next step. **Human checkpoint — index removal not yet approved or
performed.** Production remains untouched throughout this entire cleanup thread.

## 2026-07-27 — Pass 6, final cleanup step: abandoned Storage Rules removed locally, verified, independently reviewed — not yet deployed

Owner confirmed both abandoned private Storage prefixes
(`generated/studio-print-requests/`, `generated/portal-print-requests/`) were manually deleted via
the Firebase Console in `fresh-prints-dev`. With the objects, Functions, and application source all
already removed, this pass removed the last remaining artifact: the explicit Storage Rules.

**Removed from `storage.rules`**: the two explicit `match` blocks
(`generated/studio-print-requests/{allPaths=**}`,
`generated/portal-print-requests/customers/{customerId}/{allPaths=**}`) and the
`customerBelongsToCaller(customerId)` helper function that only those blocks used. Confirmed via
grep that `isStaff()`/`isCustomer()` (used elsewhere by 8+ unrelated rule blocks) are untouched.

**No wildcard-overlap risk**: every remaining `generated/**` rule
(`generated/catalog-reference/ai/**`, `/manifest.json`, `/client/**`,
`generated/portal-catalog/{allPaths=**}`) is scoped to a distinct literal subpath — none is a bare
`generated/{allPaths=**}` that could now cover the removed paths. They fall through only to the
final, unchanged catch-all `match /{allPaths=**} { allow read, write: if false; }`.

**Removed** `tests/firebase/printRequestReadModel.rules.test.ts` (tested only the deleted rule
blocks) and fixed the now-stale `test:rules` script in `package.json` (previously ran both rules
test files; now runs only `catalogSnapshot.rules.test.ts`). **Added** a new `describe` block to
`catalogSnapshot.rules.test.ts` proving the abandoned prefixes are denied to every role
(guest/staff/customer, read and write) and do not fall through to the public catalog wildcard,
plus a sanity-check read of a real seeded public catalog path to prove the deny assertions are
exercising a genuine rules deny.

**Verification**: `npm run test:rules` (portable JDK,
`%USERPROFILE%\.local-jdk\jdk-21.0.11+10`) — **12/12 pass, exit 0**. `git diff --check` clean.
Changed-file lint clean. Independent, non-authoring security review — **APPROVED, zero
findings** — independently re-ran the rules-emulator suite itself (same 12/12/exit-0 result) rather
than trusting this claim, and confirmed no wildcard exposure, no dead code, no unrelated drift to
originals/thumbnails/previews/customer-uploads/assisted-creation/brand-logo rules.

**Human checkpoint — Storage Rules not yet deployed.** `npx firebase deploy --project
fresh-prints-dev --only storage` has not been run. No Functions, Firestore Rules, indexes, App
Hosting, or production resource was touched this pass.

With this step approved and deployed, every abandoned private print-request read-model artifact
(source, Functions, Storage objects, Storage Rules) will be fully removed from `fresh-prints-dev`,
closing this cleanup thread of `firestore-usage-efficiency-wave-c`.

## 2026-07-26 — Pass 6, Storage object cleanup step BLOCKED (no Admin SDK credential path) — owner will delete manually via Console

Attempted the abandoned private Storage object cleanup (`generated/studio-print-requests/`,
`generated/portal-print-requests/`) in `fresh-prints-dev.firebasestorage.app`. No safe tooling
path existed: no `gsutil`/`gcloud` installed, no Firebase CLI native storage-object subcommand, no
existing repo Admin SDK maintenance script or service-account credential. A narrowly-scoped,
hardcoded-safety-constrained local Admin SDK script was written (exact project ID check, exact two
allowed prefixes only, list-only by default, exact confirmation phrase required for delete, no
content/credential logging) but failed even in read-only list mode:
`Could not load the default credentials` — the Firebase CLI's own login does not expose
Application Default Credentials to arbitrary local scripts. The script was deleted immediately
after the failed dry-run; nothing was listed, inspected, or deleted.

Per the failure rule, stopped rather than force a workaround. Offered the owner two paths (a
service-account key, or a temporary owner-only deployed callable); **the owner declined both** and
will delete the two abandoned prefixes manually through the Firebase Console instead. No code,
deployment, credential, or Firebase resource change was made in this step or as a result of this
decision.

**Storage Rules remain unchanged and active** — the explicit private-prefix rules for both abandoned
paths stay in place. Do not remove them until the owner confirms (via Console, out of this session's
tooling) that both prefixes are empty.

## 2026-07-26 — Pass 6, removal deployment step 3: three abandoned Functions deleted from fresh-prints-dev; next checkpoint is private Storage object cleanup

Studio and Portal QA both passed (Studio: near-immediate load, 0 callable invocations, 0 private
Storage requests, 0 fallback events, 0 listeners, bounded reads only. Portal: generated Discover/
Design Library loaded normally, `/catalog` 0 client Firestore reads, no fallback, four catalog-add
callables succeeded exactly once each with no retries/duplicates, request detail loaded normally).

The read-only final Firestore attribution pass (owner-approved, no code/deployment/data change)
confirmed the only remaining abandoned-architecture activity in a live evidence window was
`onPrintRequestReadModelInputWritten` still firing — expected, since its deletion had been
deliberately gated behind this QA pass. No new defect was found; verdict was `CLOSE WAVE C`.

**Deleted from `fresh-prints-dev`** via
`npx firebase functions:delete publishPrintRequestReadModels readStudioPrintRequestReadModelAsset
onPrintRequestReadModelInputWritten --project fresh-prints-dev --region us-central1 --force`
— exit 0, all three confirmed via "Successful delete operation" and absent from a post-deletion
`firebase functions:list`.

**Confirmed preserved and still live**: `onPrintRequestItemQueueTabInputWritten`,
`onShowAllocationQueueTabInputWritten`, `addPortalCatalogDesignToPrintRequest`,
`rebuildCatalogSnapshots`, `onPortalCatalogSnapshotSourceWritten`,
`onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten` — every catalog/Design Library
Function and both queueTab maintenance triggers remain untouched. No Rules, indexes, Storage
objects, or App Hosting resource were touched by this step. No callable was invoked. Production
untouched throughout.

**Next separate checkpoint**: deletion of the abandoned private Storage objects under
`generated/studio-print-requests/` and `generated/portal-print-requests/` in `fresh-prints-dev` —
NOT performed this step. Once those objects are confirmed deleted and the prefixes verified empty,
the remaining sequence is: deploy final Storage Rules cleanup (remove the now-safe-to-remove
explicit private rules) → remove the two already-locally-removed indexes from live Firebase → final
smoke tests. Production remains untouched throughout every step of this sequence.

## 2026-07-26 — Pass 6, removal deployment step 1: simplified queueTab triggers deployed to fresh-prints-dev; owner Studio QA pending, all destructive Firebase cleanup still blocked

Deployed `onPrintRequestItemQueueTabInputWritten` and `onShowAllocationQueueTabInputWritten`
(the two simplified triggers with the private-read-model publish call removed) to `fresh-prints-dev`
via `npx firebase deploy --project fresh-prints-dev --only
"functions:onPrintRequestItemQueueTabInputWritten,functions:onShowAllocationQueueTabInputWritten"`
— exit 0, both confirmed live as v2 Functions in `us-central1`. No other Function, Rules, index,
Storage object, or App Hosting resource was touched by this deploy. Production untouched.

**The three abandoned Functions remain live and undeleted, confirmed via `firebase functions:list`**:
`publishPrintRequestReadModels`, `readStudioPrintRequestReadModelAsset`,
`onPrintRequestReadModelInputWritten`. Their deletion — along with private Storage object deletion,
Storage Rules cleanup, and index removal from live Firebase — remains explicitly blocked until the
owner confirms the simplified bounded-Firestore path actually works correctly in a live Studio QA
pass. No destructive Firebase action has occurred or is authorized yet.

**Current checkpoint status**: owner asked to fully restart Studio (`npm run dev:studio`) and Portal
(`npm run dev:portal`) from the current checkout, then run the Studio QA sequence FIRST (cold-open
Print Requests with Firebase Debug reset, confirm zero read-model callable/asset activity, zero
fallback event, four exact tab counts, one bounded list page, normal selected-request load) —
Portal QA and any Firebase resource deletion are both gated on Studio passing first.

## 2026-07-26 — Pass 6: PRIVATE PRINT-REQUEST READ MODEL ABANDONED AND REMOVED — bounded Firestore restored as the sole, permanent Print Requests path; generated catalog/Design Library system unaffected

**Owner decision**: after the read-model architecture was fully corrected (immutable content-
addressed paths, both required composite indexes deployed) and a controlled real-publication test
was set up, the owner determined the measured benefit did not justify the complexity. The final
runtime evidence: ~10s before Print Requests became visible, ~5.29s manifest callable duration,
~333ms page callable duration, 4 Firestore count queries still running, 1 request-item query still
running, 4 catalog design document reads still running, ~12 client-side billable reads remaining.
The read-model layer was technically working by this point (correct manifests, correct pages,
correct immutability) but never actually eliminated the Firestore/latency cost it was built to
eliminate. **This is a permanent architectural decision, not a temporary disablement** — the private
print-request JSON read-model system is completely removed, not feature-flagged off.

**Removed entirely:**
- `packages/shared/src/printRequestReadModel/` (types, builders, tests)
- `packages/shared/src/types/admin/publishPrintRequestReadModels.types.ts`,
  `readStudioPrintRequestReadModelAsset.types.ts`
- `functions/src/printRequestReadModels/` (publisher, callable, read-callable, all tests)
- `functions/src/onPrintRequestQueueTabInputsWritten.test.ts` (tested only the now-deleted
  `printRequestReadModelFieldsChanged`; the underlying queueTab recompute logic
  (`computePrintRequestQueueTab`) has its own separate, untouched test file at
  `packages/shared/src/utils/printRequestQueueTabRecompute.test.ts`)
- Studio: `studioPrintRequestReadModelService.ts`, `printRequestReadModelMapping.ts` (+test),
  `printRequestReadModelPublicationAdminService.ts` (+test)
- Portal: `portalPrintRequestReadModelService.ts`, `portalPrintRequestReadModelMapping.ts` (+test)

**Edited, not deleted** (queueTab maintenance and bounded Firestore behavior fully preserved):
- `functions/src/onPrintRequestQueueTabInputsWritten.ts` — removed the read-model publish import
  and call; removed the `onPrintRequestReadModelInputWritten` trigger entirely (it existed only to
  publish the read-model — unlike its two siblings, it does no queueTab computation).
  `recomputeAndPersistQueueTab`, `extractPrintRequestId`, and both real triggers
  (`onPrintRequestItemQueueTabInputWritten`, `onShowAllocationQueueTabInputWritten`) are unchanged.
- `functions/src/index.ts` — removed the two read-model Function exports; removed
  `onPrintRequestReadModelInputWritten` from the combined trigger export, keeping the other two.
- `apps/studio/.../usePrintRequests.ts` — removed all read-model branching
  (`loadFirstPageFromReadModel`, `isResolvingSource`, `readModelNextPageIndexRef`, the fallback
  trace); the bounded Firestore path (`listPrintRequestsPage`/`countPrintRequests`, cursor
  pagination) is now the sole, unconditional, immediate path — no callable, no Storage request, no
  fallback decision before the list loads.
- `apps/studio/.../PrintRequestsPage.tsx` — removed the `isResolvingSource`/`detailRequestId`
  gating; deep-link detail fetch and `usePrintRequestDetails` run unconditionally again.
- `apps/studio/.../freshPrintsDevConsole.types.ts`, `AppShell.tsx` — removed only the
  `publishPrintRequestReadModels` dev-bridge method/installer; `backfillPrintRequestQueueTab`,
  `rebuildCatalogSnapshots`, and their installers are untouched.
- `apps/portal/.../useMyPrintRequests.ts` — removed the read-model branch inside `reload`'s full-
  scope case; the bounded, customer-scoped Firestore path is now unconditional.
- `firestore.indexes.json` — removed the two `printRequests` composite indexes
  (`queueTab ASC, createdAt DESC/ASC, __name__ DESC/ASC`) confirmed via repo-wide grep to have zero
  remaining query consumers. Kept `queueTab ASC, updatedAt DESC, __name__ DESC`, still used by the
  bounded Firestore list path (`printRequestQueryPlanning.ts`).

**`storage.rules` intentionally NOT modified this pass.** The explicit private-prefix rules for
`generated/studio-print-requests/**` (staff-only) and
`generated/portal-print-requests/customers/{customerId}/**` (customer-scoped) remain in place —
per the owner-specified safe-removal sequence, the rules stay private until the old dev Storage
objects under both prefixes are confirmed deleted in a separate, later checkpoint. No private
object can become publicly readable at any point in this sequence.

`tests/firebase/printRequestReadModel.rules.test.ts` was accidentally deleted along with the rest,
then reconstructed from scratch (no git history existed — the entire feature was built and removed
within this session's uncommitted working-tree changes) since `storage.rules` itself is unchanged
and still needs coverage. Actually EXECUTED against the real Firestore + Storage Rules emulators
using the project's documented portable JDK (`%USERPROFILE%\.local-jdk\jdk-21.0.11+10`, per the
2026-07-25 rules-gate precedent in `references/project-chatgpt-handoff/CURRENT-STATE.md`) —
`npm run test:rules`: **17/17 pass, exit 0** (9 catalog-snapshot + 8 print-request read-model),
proving staff-only Studio access, customer-scoped Portal access (own customer only, denied for
another customer), guest denial, and default-deny writes for both kept-private prefixes exactly as
the current unmodified `storage.rules` actually enforces.

**Generated catalog/Design Library system — completely untouched**, confirmed via grep:
`rebuildCatalogSnapshots`, `onPortalCatalogSnapshotSourceWritten`, `generated/catalog-reference/**`,
`generated/portal-catalog/**`, `studioCatalogAssetService.ts`, `portalCatalogAssetService.ts` all
present, unmodified, still exported. This system remains active and successful.

**Verification**: `npm run build --prefix functions` clean; Studio 3-target `vite build` clean;
Portal `typecheck`/`build:portal` clean; `onPrintRequestQueueTabInputsWritten.test.ts` confirmed
genuinely deleted; Portal print-requests tests 28/28 pass; Studio print-requests tests 64/69 pass
(5 pre-existing, unrelated DPI/print-size failures in `printRequestItemSizingAndNaming.test.ts`/
`printRequestOversizedSelection.test.ts`, confirmed via `git stash` earlier this session to predate
all Wave C pass-6 work — not caused by this removal); lint clean; diff-check clean; repo-wide grep
confirms zero remaining code/config references to the removed architecture outside the
intentionally-kept `storage.rules` block and its reconstructed test. Independent, non-authoring
review: **APPROVED WITH CONCERNS** (the only concern was the pre-existing unrelated DPI test
failures, not this removal).

**Human checkpoint — nothing deployed or deleted from Firebase this pass.** All work was local file
changes only. See the deployment/destructive-action checkpoint report for the required later
sequence: deploy corrected Functions/app code → verify bounded Firestore behavior → delete the
abandoned callable/trigger Functions from `fresh-prints-dev` → delete abandoned private Storage
objects → verify prefixes empty → deploy final Storage Rules cleanup → remove the two already-
locally-removed indexes from live Firebase → final smoke tests. Production remains untouched
throughout every step of this pass and the proposed later sequence.

## 2026-07-26 — Pass 6: Both required printRequests composite indexes deployed to fresh-prints-dev; HARD STOP RULE for the next dry run

Both `printRequests` composite indexes required by `loadAffectedPrintRequestPage` are now deployed
to `fresh-prints-dev`: `queueTab ASC, createdAt DESC, __name__ DESC` (primary paginated fetch) and
`queueTab ASC, createdAt ASC, __name__ ASC` (ahead-count/same-createdAt-tiebreak queries). Neither
was removed or modified from a prior deploy; every other pre-existing index (customerId, isInternal,
requestOrigin, status combinations, and both `updatedAt`-based indexes) remains present and
unchanged, confirmed via direct enumeration of the live server-side index list both before and after
this deploy. Build state (`BUILDING` vs `READY`) cannot be verified from this session — no available
tool exposes it; only the Firebase Console's Firestore → Indexes → Composite tab does. Owner must
confirm `Enabled` there before the next dry run is run.

**Hard stop rule for the next dry-run decision gate (owner-specified, binding for this workstream):**
- If the next dry run **succeeds** (zero `FAILED_PRECONDITION`/other errors, `published` matches
  `scanned - skippedNoQueueTab`), proceed to exactly ONE controlled real publication — still a
  separate owner checkpoint, not automatic.
- If the next dry run exposes **another new** architecture, data-shape, or publication defect (not
  a variant of the two index-shape issues already fixed), **stop this read-model workstream
  entirely**. Do not attempt a third redesign or another index-shape fix without a new, explicit
  owner decision to continue.
- The bounded Firestore fallback (`listPrintRequestsPage`/`countPrintRequests`, pass 5) remains the
  working, already-approved path for both Studio and Portal regardless of this workstream's outcome
  — it is never at risk and never blocked by anything in this pass.
- No broad redesign of the read-model architecture begins without a new owner decision, even if a
  narrow-looking issue is found in the next dry run.

## 2026-07-26 — Pass 6: SECOND MISSING COMPOSITE INDEX — the descending index alone was insufficient; a separate ascending index is required and added, not yet deployed

After the first `printRequests` composite index (`queueTab ASC, createdAt DESC, __name__ DESC`) was
deployed to `fresh-prints-dev`, the owner's corrected dry run **still** failed with
`FAILED_PRECONDITION: The query requires an index`. The Firebase-generated index URL in the error
decoded to a DIFFERENT field-direction combination than the one just deployed:
`queueTab ASC, createdAt ASC, __name__ ASC`.

**Prior conclusion corrected**: the assumption that one composite index could serve all three of
`loadAffectedPrintRequestPage`'s queries (the primary `orderBy("createdAt","desc")
.orderBy("__name__","desc")` query, plus the `createdAt >` ahead-count and `createdAt ==` +
`__name__ >` same-createdAt-tiebreak count queries) was **wrong**. Firestore requires the composite
index's field directions to match the query's actual clauses exactly — inequality/range filters
(`>`, `==` on a non-equality-prefix field) need their own direction-matched index, separate from an
`orderBy`-only query's index, even when both queries share the same field set. The two ahead-count
queries use ascending semantics; the primary paginated fetch uses descending `orderBy`. Two separate
indexes are required, not one.

**Added**: a second `printRequests` composite index, `queueTab ASC, createdAt ASC, __name__ ASC`,
alongside (not replacing) the already-deployed `queueTab ASC, createdAt DESC, __name__ DESC` index.
Both now exist in `firestore.indexes.json`. No index was removed or modified — confirmed via direct
enumeration of every `printRequests` index in the file before and after this edit.

**Human checkpoint — second index not yet deployed.** Once deployed
(`npx firebase deploy --project fresh-prints-dev --only firestore:indexes`) and BOTH indexes read
`Enabled`/`READY` in the Firebase Console (this session has no tool that reports Firestore composite
index build state directly — only the Console shows it), the next action is rerunning the dry run.

## 2026-07-26 — Pass 6: MISSING COMPOSITE INDEX — immutable read-model dry run blocked by FAILED_PRECONDITION, required index identified and added, not yet deployed

After the five corrected Functions (`publishPrintRequestReadModels`, the three triggers,
`readStudioPrintRequestReadModelAsset`) were deployed to `fresh-prints-dev`, the owner's dry run
scanned all three requests but published zero — every one failed with
`FAILED_PRECONDITION: The query requires an index`.

**Traced to the exact query** in `loadAffectedPrintRequestPage`
(`functions/src/printRequestReadModels/publishPrintRequestReadModels.ts`):
```
.collection("printRequests").where("queueTab", "==", queueTab)
  .orderBy("createdAt", "desc").orderBy("__name__", "desc")
```
plus two supporting count queries against the same field set (`queueTab ==`, `createdAt >` /
`createdAt ==` + `__name__ >`). All three share one `(queueTab, createdAt, __name__)` field set, so
one composite index serves all three.

**Confirmed no existing index covers it**: `firestore.indexes.json` already had a `printRequests`
index on `queueTab ASC, updatedAt DESC, __name__ DESC` (a different sort field, `updatedAt` not
`createdAt` — added for the pass-5 Firestore-fallback path, unrelated to this query). No duplicate
or equivalent definition existed for `createdAt`. Added exactly one new index, matching the
established repo format exactly: `printRequests` → `queueTab ASC, createdAt DESC, __name__ DESC`.
The prior `queueTab + updatedAt` index was left untouched — it's still used by the pass-5 fallback
path, never proven unused, never removed.

No index-alignment test file exists anywhere in this repo (confirmed by repo-wide search) — this is
not an established test convention here, so none was added; inventing one would have been scope
creep beyond the missing-index defect.

**Human checkpoint — index not yet deployed.** `firestore.indexes.json` was only edited, never
deployed. Once approved and deployed (`npx firebase deploy --project fresh-prints-dev --only
firestore:indexes`) and the index reaches `READY` state in the Firebase Console (composite index
builds are asynchronous), the next action is only rerunning the dry run — no Functions/Rules
changes needed, since only the index file changed this pass.

## 2026-07-26 — Pass 6: IMMUTABLE READ-MODEL PATH FIX (second correction) — manifest/page architecture rebuilt on content-addressed paths after the owner caught an immutability violation in the first fix; a real data-loss bug in the backfill callable found by independent review and fixed in the same pass; not yet deployed or republished

Deployed `readStudioPrintRequestReadModelAsset` (the pass-6 security-corrected Studio transport)
went live, and the owner's first live dry-run/republish attempt surfaced a genuine publisher defect:
`object-not-found` for every queue tab except whichever one happened to publish last.

**Root cause #1 (found and fixed this pass, then itself corrected)**: `buildPage()` computed
`contentVersion` as a hash of only the ONE page passed into that call. Since both the trigger-based
incremental publisher and the owner's backfill callable publish one tab's one page at a time, each
call wrote to a DIFFERENT `v{hash}/` directory while the single shared manifest's `contentVersion`
field got overwritten by whichever call won the last manifest write — orphaning every other tab's
already-published page.

**First fix, REJECTED by the owner**: carrying the existing manifest's `contentVersion` forward and
reusing that SAME directory for every subsequent publish. The owner correctly identified this as a
genuine immutability violation — republishing any page under an already-referenced directory means
writing DIFFERENT JSON to the SAME path a reader might already have cached, breaking "a reader
holding an old manifest can still fetch every old object" and previous-version rollback.

**Final architecture (this pass, Option A — explicit per-page immutable paths)**: every page is
content-addressed by ITS OWN content hash embedded directly in its Storage path
(`generated/studio-print-requests/{tab}/page-{index}-v{16-hex-digest}.json`;
`generated/portal-print-requests/customers/{customerId}/page-{index}-v{16-hex-digest}.json`) — no
shared "version directory" concept exists anywhere anymore. `StudioPrintRequestManifest.pages:
Record<tab, string[]>` and `PortalPrintRequestManifest.pages: string[]` store the EXACT current path
for every page directly; publishing one page changes only that ONE manifest entry, and every other
page's entry/object is left completely untouched. A path is never reused for different content
(republishing identical content reproduces the identical path — an idempotent no-op; different
content always mints a new, previously-unused path), so an existing object can never be overwritten
with different bytes. `runManifestSwapWithRetry`'s `buildManifest` callback re-reads the manifest
fresh on every retry attempt, so concurrent publishers of different tabs/customers merge into the
manifest instead of clobbering each other — this also structurally eliminates the earlier fix's
residual first-manifest-bootstrap race, since concurrent bootstraps now only ever race on their own
manifest field, never on shared page content.

**Second real bug, found by independent architecture review (not the owner) and fixed in the same
pass**: the backfill/publish callable (`publishPrintRequestReadModelsCallable.ts`) hardcoded
`pageIndex = 0` and built a single-request `source` array per scanned Firestore row — so a batch
containing multiple requests sharing a tab had each row's publish call silently overwrite the
manifest's `pages[tab][0]` entry with a single-request page, dropping every earlier request in that
tab from the same batch while still counting each as `published`. The dedup guard was keyed with the
request's own id baked in, making it structurally unable to ever deduplicate. Fixed by delegating to
`loadAffectedPrintRequestPage` (the same function the production trigger path already used
correctly) for every scanned row, and re-keying the dedup Sets by the real `(tab, pageIndex)` /
`(customerId, pageIndex)` unit. A second independent review confirmed this fix is correct (traced a
3-request-same-page scenario end to end) and flagged one non-blocking residual inefficiency: calling
`loadAffectedPrintRequestPage` once per scanned row (even when a later row lands on an
already-published page) causes bounded, per-page-size-scoped redundant Firestore reads — not a
corpus scan, not a correctness issue, a reasonable target for a future optimization pass, not fixed
now to avoid expanding scope beyond the two proven defects.

**Response accounting corrected**: added `studioPageObjectsWritten`, `portalPageObjectsWritten`,
`studioManifestObjectsWritten`, `portalManifestObjectsWritten`, `partialFailureRequestIds`.
`published` now only increments once every required object for that request is written AND its
manifest reference is successfully committed — a retry-exhausted manifest swap is reported under
`partialFailureRequestIds`, never counted as published.

Verification: full functions build clean, Studio 3-target build clean, Portal typecheck clean,
Portal production build clean, all focused tests pass (49 functions/shared print-request read-model
tests, 20 Studio mapping tests, Portal mapping tests), lint clean, diff-check clean. `storage.rules`
was NOT modified — the existing wildcard Rules (`{allPaths=**}`) already cover the new flat,
version-directory-free path shape. Two independent reviews this pass: architecture review (found the
backfill data-loss bug, otherwise approved the core content-addressing design) and a fast follow-up
review confirming the backfill fix is correct with one noted non-blocking inefficiency.

**Human checkpoint — nothing deployed or republished this pass.** `publishPrintRequestReadModels`
and the three triggers (`onPrintRequestItemQueueTabInputWritten`,
`onShowAllocationQueueTabInputWritten`, `onPrintRequestReadModelInputWritten`) all need redeployment
before any dry-run/republish can reflect this fix — they currently run the pre-fix logic in
`fresh-prints-dev`.

## 2026-07-26 — Pass 6: SECURITY CORRECTION — Studio private-asset transport rebuilt on a staff-only callable, getDownloadURL() removed entirely, independently reviewed with zero findings, not yet deployed or retested

The owner caught a real security defect in the previous transport (`getDownloadURL()` + Electron
main-process IPC fetch) before any retest: the claim "Storage Rules evaluate `getDownloadURL()`
identically to `getBytes()`" was asserted, not verified, and was wrong in a load-bearing way.

**Investigation (direct Firebase Storage JS SDK source inspection, `node_modules/@firebase/storage`,
no live Storage access used or attempted)**: `getDownloadURL()` performs an authenticated,
Storage-Rules-gated metadata GET, then builds a URL client-side from the object's own PERSISTENT
`downloadTokens` metadata field: `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}`.
This is a static, long-lived, non-session-bound bearer-style capability. Storage Rules (`isStaff()`)
are evaluated ONLY ONCE, at mint time — never again when the resulting URL is later fetched via
`alt=media`. Once minted, that URL string is a standing credential for anyone who obtains it
(logs, a compromised IPC payload, a proxy), with no expiry tied to the Auth session and no
per-request staff-role re-check. This is not a safe substitute for authenticated access to
staff-wide private print-request data. A live cross-session test was deliberately NOT attempted
(would require deploying/invoking against real dev data, which needs its own checkpoint, and
probing token behavior against live customer-adjacent data without explicit sign-off is exactly the
kind of action this session avoids) — the SDK source alone was decisive enough to apply the decision
gate: **`getDownloadURL()` is rejected and fully removed** for this private asset family.

**Final architecture (per the owner's specified fallback)**: a new, narrow, staff-only Cloud
Function callable, `readStudioPrintRequestReadModelAsset`
(`functions/src/printRequestReadModels/readStudioPrintRequestReadModelAsset.ts`):
- Re-checks `assertStaffCaller`/`loadCallerProfile` on EVERY invocation — no caching, no persisted
  session, structurally unreachable to skip (Storage read is the last step, after both auth checks).
- Accepts only `{ kind: "manifest" }` (no client-supplied path — uses the server constant directly)
  or `{ kind: "page", path }`, where `path` must exactly match a strict regex allowlist
  (`generated/studio-print-requests/v{16-hex-digest-content-version}/{one-of-four-fixed-tabs}/page-{digits}.json`)
  — no arbitrary Storage path, no path traversal, no cross-family confusion with the customer-scoped
  `portal-print-requests/**` family, verified adversarially in the independent review.
- Reads via the Admin SDK (bypasses Storage Rules, which is why the callable itself is now the
  primary enforcement point — `storage.rules`' existing `isStaff()` rule for this path family is
  UNCHANGED and remains as defense-in-depth, not modified).
- Firestore reads: exactly one `users/{uid}` doc read (the same staff-role check every other
  staff-only callable already performs) — verified by direct code read, no other collection touched.
- Uses the SDK's own standard `httpsCallable`/`onCall` authentication (ID token attached
  automatically as an `Authorization: Bearer` header, entirely SDK-managed) — the same mechanism
  every other Studio callable already uses; this module never reads, logs, traces, or persists that
  token. A signed-out renderer has `request.auth === undefined` and is rejected before any Storage
  access; a customer-role caller is rejected by `assertStaffCaller`'s closed staff-role allowlist.

Studio's consumer service (`studioPrintRequestReadModelService.ts`) was rewritten to call this
callable via the existing `callTracedFunction` wrapper — `getDownloadURL()`, `getBytes()`, and the
Electron `catalogAsset` IPC bridge are ALL now absent from this file. Exact-path/kind in-flight
de-duplication, rejection eviction, and the Firestore-fallback-on-failure behavior are preserved
(cache key is now a `kind`+`path` composite). `classifyFetchFailure` was rewritten for Firebase
Functions callable error codes (`functions/permission-denied`, `functions/unauthenticated`,
`functions/invalid-argument`, `functions/not-found`) instead of the old Storage-SDK/IPC error
shapes. No token, credential, or Storage path content ever reaches `firestoreUsageTrace`, logs, or
error messages — only sanitized asset-class strings and the fixed classified-failure-code
vocabulary above.

Independent, non-authoring SECURITY review (separate context, instructed to be skeptical and
adversarial): **APPROVED, zero findings.** Verified: authorization sequencing is structurally
unbypassable; the path-allowlist regex correctly rejects path traversal, newline-suffix bypass
tricks, cross-asset-family confusion, and unrelated paths (adversarially tested, not just the
written test cases); no credential/content ever reaches any log/trace/error; sign-out and
customer-role denial both confirmed by tracing the actual code; Firestore read scope is exactly the
claimed single `users/{uid}` doc; in-flight de-dup logic re-verified correct with the new composite
cache key; Portal's own transport (still `getBytes()`-based, a separate open question, explicitly
out of scope here) confirmed untouched; and the callable's authorization scope is confirmed
IDENTICAL to (neither wider nor narrower than) the existing `isStaff()` Storage Rule it replaces as
the primary enforcement point.

Verification: 98/98 focused tests (added the new callable's path-allowlist regex tests — 7 adversarial
cases including path traversal and cross-family confusion — and rewrote the transport-error-
classification tests for the callable error shape), `npm run build --prefix functions` clean, Studio
3-target build clean (renderer/main/preload), changed-file lint clean, `git diff --check` clean.
`storage.rules` was NOT modified (no rule change was needed — the existing `isStaff()` rule remains
valid, unmodified defense-in-depth even though Admin SDK reads bypass it).

**Human checkpoint — no deploy, no retest performed by this session.** This pass adds one new
Cloud Function (`readStudioPrintRequestReadModelAsset`) that must be deployed to `fresh-prints-dev`
before any Studio retest can succeed — the currently-deployed Functions and the currently-running
Studio build both predate this entire security correction. No `storage.rules` deploy is required.

## 2026-07-26 — Pass 6: Studio private-asset transport replaced (getBytes() eliminated), corrected twice via independent review, not yet deployed or retested

The prior fixes (dedup, sequencing, error classification) were confirmed working by a live owner
retest — but the underlying `getBytes()` transport still failed, with an exact classified code of
`timeout` after the full 10s budget, matching this repo's own documented ADR-FP-112 incident
("Studio ref-thumb hang hotfix": `getBytes()` hangs indefinitely in Electron/Studio).

**Research phase** (subagent, no code changes): confirmed this repo has zero precedent anywhere in
Studio or Portal application code for manually attaching a Firebase Auth ID token to a raw `fetch()`
call, and the Wave C plan already explicitly rejected building a new ID-token-over-IPC bridge for
this exact asset family. Requirement 7 (bearer-token REST) was therefore not pursued.

**Attempt 1**: replaced `getBytes()` with `getDownloadURL()` (renderer, Storage-Rules-gated) + a
plain renderer-side `fetch(url)` against the resulting signed URL, citing
`assistedCreationRequestsService.getDownloadUrl` as "the exact pattern already proven in this repo."

**Independent review #1 caught a real defect in that claim**: every actual `getDownloadUrl()`
consumer in this repo is only ever consumed via `<img src>` or a main-process download dialog
(`desktopAppService.downloadUrlToFile`, itself IPC-routed) — **never** via renderer-JS `fetch()`. A
renderer `fetch()` against a cross-origin Firebase Storage URL is exactly the CORS-risk class this
repo's own public-catalog-asset transport (`studioCatalogAssetService.ts`, routed through Electron's
`catalogAsset` IPC bridge to the main process) was built specifically to avoid. The cited precedent
did not actually support the chosen mechanism.

**Attempt 2 (corrected)**: kept `getDownloadURL()` in the renderer (still `isStaff()`-gated, same
authorization boundary), but instead of a renderer `fetch()`, hands ONLY the resulting short-lived
signed URL to Electron's main process via the **existing, already-deployed** `catalogAsset` IPC
bridge (`window.freshPrints.catalogAsset.fetchJson`) — zero new main-process code, reusing the exact
mechanism already proven for the public catalog-asset family. A signed URL is a short-lived,
single-object-scoped capability, not a reusable credential — categorically different from the raw-
ID-token-over-IPC bridge the Wave C plan rejected. `getBytes()` is fully removed from
`studioPrintRequestReadModelService.ts`.

**Independent review #2** (of the corrected version) approved the architecture but found the new
IPC-failure path always classified as generic `"other"`, discarding the main process's own real
`failureStage`/`failureCode` diagnostics (host-allowlist / http-request / http-status /
json-parsing / response-size). Fixed: new `IpcFetchFailedError` class carries those real
diagnostics through to `classifyFetchFailure`.

**Final transport shape**: `getDownloadURL()` (renderer, Storage-Rules-gated) → signed URL handed to
main via the existing `catalogAsset` IPC channel → main-process `fetch()` (no browser CORS
enforcement) → JSON parsed in main → returned to renderer. The whole sequence (not per-sub-stage)
shares ONE 6-second timeout (`STAGE_TIMEOUT_MS`), chosen because the asset is capped at 32 KiB
(manifest)/256 KiB (page) by the publisher — far smaller than the 12s ADR-FP-112 timeout sized for
image previews — and a single shared bound (vs. stacked per-stage timeouts) guarantees the worst
case is strictly shorter than the original 10s hang, not longer. Exact-path in-flight
de-duplication, rejection eviction, and "prefer generated over Firestore fallback" behavior (from
the prior pass) are all preserved unchanged. No token, credential, or signed URL ever reaches
`firestoreUsageTrace`, logs, or error messages — only sanitized asset-class strings and classified
failure codes/stages. No `storage.rules`, Functions, or backend change was made or is required —
Storage Rules evaluate `getDownloadURL()`'s authorization identically to any other SDK read.

Verification: 93/93 focused tests (added `classifyFetchFailure`/`StageTimeoutError`/
`IpcFetchFailedError` coverage, removed one now-obsolete test for the abandoned direct-`fetch()`
error shape), Studio 3-target build clean (renderer/main/preload — confirms the IPC bridge types
line up), changed-file lint clean, `git diff --check` clean. Portal's own read-model transport
(`portalPrintRequestReadModelService.ts`, still `getBytes()`-based) was explicitly NOT touched, per
the owner's explicit scope limit — Portal's transport question remains open and out of scope here.

**Human checkpoint — no deploy, no retest performed by this session.** This is a Studio-client-only
change (no Functions/Rules), so only a Studio restart is required, not a Functions redeploy — but
per this session's established practice, the owner directs when to restart and retest, not this
agent. The currently-running Studio build predates this transport replacement entirely.

## 2026-07-26 — Pass 6: Studio cold-open test FAILED, five defects diagnosed/fixed via code inspection (no live Storage access), not yet deployed or retested

The owner's first live Studio Print Requests cold-open test failed: ~10s to appear, two identical
manifest Storage requests both hanging the full 10s timeout, four `printRequests` count queries
starting concurrently with the still-pending Storage fetch, no explicit fallback trace, 4 Design
reads racing the pending fetch, and a separately-flagged concern about whether real-run byte
counters could conceal a publication-write defect.

**No live Storage/Admin access was available or used** — no `gcloud`/`gsutil` installed, no
Application Default Credentials configured, and none were newly created (consistent with this
session's standing policy against extracting/bootstrapping credentials without explicit owner
sign-off). All findings below come from direct code inspection and cross-referencing this repo's
own prior documented incident (ADR-FP-112), not from inspecting the live object.

**Diagnosed and fixed (5 defects, all confirmed by source inspection):**
1. **Duplicate manifest fetch**: `studioPrintRequestReadModelService.ts` had no exact-path
   in-flight de-duplication at all. Fixed with an `inflightByPath` Map + rejection eviction
   (independent review verified correct third-caller-join and cleanup behavior).
2. **Generic, undiagnosable error code**: the fetch failure handler was a bare
   `catch { return null }` that discarded the real Firebase Storage SDK error entirely. Added
   `classifyFetchFailure` distinguishing `object-not-found` / `permission-denied` /
   `unauthenticated` / `invalid-path` / `parser-schema-failure` / `timeout` / other real SDK codes
   — hardened per independent review to guard against a non-object thrown value.
3. **Firestore work started concurrently with the pending Storage fetch**: `usePrintRequests.ts`'s
   `loadFirstPage` ran `Promise.all([readModelAttempt, loadCounts()])`, so 4 Firestore count
   queries fired immediately regardless of the Storage fetch's outcome. Rewrote to strict
   sequencing — the read-model attempt now resolves (success or terminal failure) alone before any
   Firestore call starts. Added a new `isResolvingSource` state field and an explicit
   `traceGeneratedFallbackActivation(...)` call fired before the first Firestore fallback
   operation (the owner-observed "0 explicit fallback trace events" gap).
4. **Design reads racing the pending fetch**: `PrintRequestsPage.tsx`'s deep-link
   `ensureRequestLoaded` effect and the `printRequestId` passed into the independent
   `usePrintRequestDetails` hook fired unconditionally regardless of `usePrintRequests`'s own
   loading state. Gated both on `!isResolvingPrintRequestsSource` (`detailRequestId` is `null`
   while resolving) — independent review traced the full downstream chain
   (`requestItems`→`selectedDesignIds`→`useReadyDesignsForSelection`→allocations→shows) and
   confirmed this one gate point correctly blocks the entire chain, no other path bypasses it.
5. **Real-run byte counters silently hardcoded to zero** (separate concern, also fixed):
   `publishStudioPrintRequestPage`/`publishPortalPrintRequestPage` in
   `functions/src/printRequestReadModels/publishPrintRequestReadModels.ts` returned
   `pageBytes: 0, manifestBytes: 0` on every REAL (non-dry-run) success, even though `saveJson`
   computed the real byte count internally and discarded it. Fixed: `saveJson` now returns
   `{ bytes }`; both publish functions thread it through (manifest bytes via a closure variable
   captured inside the `writeManifest` retry callback, gated on `result.outcome === "success"` so a
   failed/retried attempt's stale captured value is never reported — independent review traced the
   retry loop and confirmed this gating is correct and necessary).

**Deliberately NOT changed, flagged for owner decision rather than guessed:**
- **Client transport** (`getBytes()` alone, no signed-URL-first fallback). This repo's own
  ADR-FP-112 ("Studio ref-thumb hang hotfix") documents that `getBytes` specifically hangs
  indefinitely in Electron/Studio for a different private asset family — independent review
  correctly pointed out this is on-point evidence (both duplicate requests here ran the full 10s
  timeout rather than failing fast, matching that documented symptom), not a genuine tie against
  the conflicting `assistedCreationRequestsService.downloadBytes` comment. Left unchanged anyway
  because adopting the signed-URL-first fix would be a second live behavior change stacked on an
  unretested page in the same pass; the classified error code from the next retest (`timeout` vs.
  `permission-denied`/`object-not-found`/etc.) will resolve this precisely rather than guessing
  twice. Documented in-source at `studioPrintRequestReadModelService.ts`'s file header.
- **`STORAGE_DOWNLOAD_TIMEOUT_MS` (10s)**: left unchanged per the owner's explicit prior
  instruction ("do not change the fallback budget yet").

Independent, non-authoring review: **approved_with_changes**, 3 findings, 2 fixed (defensive
`.code` access in `classifyFetchFailure`; sharpened the transport-decision comment's honesty about
ADR-FP-112 being on-point evidence, not a tie), 1 accepted as documentation-only (a scope-clarifying
comment added to `loadMore` — the "nothing else starts while loading" guarantee was never meant to
cover post-initial-load pagination, not a defect).

Verification: 84/84 focused tests (2 new regression tests added: byte-count capture-on-success
pattern, and byte-count-must-not-be-trusted-on-failure), Functions build clean, Studio 3-target
build clean (renderer/main/preload), changed-file lint clean, `git diff --check` clean.

**Human checkpoint — no deploy, no retest performed by this session.** These fixes exist only in
source. The currently-deployed `publishPrintRequestReadModels`/triggers and the currently-running
Studio build both predate all five fixes above. A fresh Functions deploy (for the byte-counter fix)
and a fresh Studio restart (for the four client-side fixes) are both required before any further
retest, and both require a separate owner checkpoint per this session's established practice.

## 2026-07-26 — Pass 6 defect: dry-run mode skipped required projection/validation work, fixed

The owner's first live dry run against `fresh-prints-dev` (3 scanned, 3 published, 0 skipped)
returned `itemsAndAllocationsReadOperations: 0` despite at least one of the three requests having
`printRequestItems`. Investigated against the real deployed source
(`functions/src/printRequestReadModels/publishPrintRequestReadModelsCallable.ts`,
`publishPrintRequestReadModels.ts`).

**Root cause — confirmed dry-run logic defect, not correct counter semantics**: the callable's
per-request loop had `if (dryRun) { published += 1; continue; }` **before** the items/allocations
reads, before the Studio/Portal projection objects were built, and before
`publishStudioPrintRequestPage`/`publishPortalPrintRequestPage` were ever called — those two
functions are where schema construction, ownership-mapping resolution, and (via `saveJson`'s byte
check) payload-size/schema validation actually happen. Neither function had any `dryRun` awareness
of their own; they always wrote to Storage. So dry-run mode only ever scanned `printRequests` docs
and classified them by `queueTab` — it validated nothing else. Answered the owner's 6 specific
questions against the real code: all six were **NO** in the pre-fix implementation (no projection
build, no items/allocations reads, no ownership/customer-scope validation, no payload size/schema
validation, did not exercise all prep short of the write, and reported a read count that was always
zero rather than an accurate one).

**Fix**: removed the early `continue`. Dry-run now always performs the items/allocations reads and
builds the real projection object, identical to a real run. Added a `dryRun` parameter to
`publishStudioPrintRequestPage`/`publishPortalPrintRequestPage` (default `false`, so the existing
`printRequests`-trigger call sites are unaffected): in dry-run they build the same page/manifest
objects, read the CURRENT real manifest (read-only, never written — proves ownership/shape
validation against real existing state without contending on it), and validate both payloads'
byte budgets via a new extracted `validateJsonPayload` helper (the same check `saveJson` performs,
minus the actual `.save()` call and the write-retry loop). Per-request work is now wrapped in
try/catch so one oversized/malformed request can't abort the batch; failures are surfaced via two
new response fields (`oversizedPayloadRequestIds`, `errors`) instead of silently dropped or
crashing. Added `studioProjectedBytes`/`portalProjectedBytes` so the owner can see real projected
payload sizes from a dry run. Extended `PublishPrintRequestReadModelsResponse` (shared type) with
these four new fields; extended the console bridge's own tests to match.

Verification: 82/82 focused tests across the full pass-6 area (up from 57 — added `validateJsonPayload`
tests, a `PublishPrintRequestReadModelsResponse` post-fix contract test reproducing the exact
owner-reported 3/3/0 scenario with a nonzero read count, and updated the bridge's response-contract
test for the new fields), Functions build clean, Studio 3-target build clean, changed-file lint
clean, `git diff --check` clean. **Not yet deployed** — this fix exists only in source; the owner's
next dry run must wait for a fresh Functions deploy of the corrected
`publishPrintRequestReadModels` callable (and its dependency `publishPrintRequestReadModels.ts`),
which has not been requested or performed yet.

## 2026-07-25 — Pass 6 update: Rules emulator security gate executed and passing (22/22)

Per explicit owner instruction, executed the previously-written-but-unverified
`tests/firebase/printRequestReadModel.rules.test.ts` against the real Firestore + Storage Rules
emulators before any deploy approval, using the documented Wave C portable JDK
(`%USERPROFILE%\.local-jdk\jdk-21.0.11+10`, Temurin 21.0.11, `JAVA_HOME`/`PATH` set for the shell
only, no admin/system install). Command: `npm run test:rules` (repo-approved script).

**First run: 16/19 pass, 3 fail** (all three "allow" cases: staff reading the Studio manifest,
customer reading their own manifest, staff reading a customer manifest). Diagnosed via a minimal
isolated repro, then confirmed against the repo's own pre-existing, completely unmodified
`isReadyDesignDerivative` Storage Rule (which also does a cross-service `firestore.get()`): it
failed identically. Root cause was a **test-harness configuration bug, not a rules defect** — the
new test file's `initializeTestEnvironment({ projectId: 'demo-fresh-prints-print-request-read-model-rules', ... })`
used an arbitrary demo project ID, but this Firebase CLI version's Storage Rules engine only
resolves cross-service `firestore.get()`/`firestore.exists()` calls against the emulator's actual
configured project (`fresh-prints-dev`, from `.firebaserc`) — a mismatched demo project ID makes
every cross-service check silently deny (fail closed), masking real allow-cases as failures. The
existing `catalogSnapshot.rules.test.ts` has the same latent risk but never happened to assert a
passing cross-service check, so it never surfaced this gap. **Fix**: changed only the test file's
`projectId` to `'fresh-prints-dev'` and added a code comment explaining why. No `storage.rules`
change was made to pass this test — confirmed via `git diff --stat -- storage.rules` unchanged
before and after the fix.

Also added, per the owner's 10-point requirement, two previously-missing assertions: an inactive
staff account (role `owner`, `isActive: false`) is denied both the Studio manifest and any
customer's Portal manifest; a `customers` document that exists but has no `userId` field at all
(malformed/legacy record) is denied for the `isCustomer()` ownership branch while staff can still
read it via the separate `isStaff()` branch — proving the two authorization paths are independent
and the malformed-record case fails closed rather than granting broad access.

**Final run: 22/22 pass, exit code 0.** Java: OpenJDK Temurin 21.0.11+10. `JAVA_HOME`:
`C:\Users\Roasted Garlic\.local-jdk\jdk-21.0.11+10`. Command:
`npm run test:rules` → `firebase emulators:exec --only firestore,storage "npx tsx --test tests/firebase/catalogSnapshot.rules.test.ts tests/firebase/printRequestReadModel.rules.test.ts"`.
Covers, and proves rather than assumes: signed-out/customer denied Studio snapshot reads; staff
(owner/helper) allowed; customer A reads only customer A's manifest/page; customer A denied
customer B's assets (cross-customer leak); staff allowed any customer's assets; every client
write (create/update/delete-equivalent) denied on both new prefixes for every role including
staff/owning-customer; the `customers/{id}.userId`-to-Auth-UID resolver proven correct including
its failure modes (missing customers doc, malformed customers doc missing `userId`, inactive
staff); unrelated existing Storage Rules behavior (public catalog assets, AI-private denial,
coordination-doc denial, `originals/` staff-only, default-deny) unaffected. One benign emulator
diagnostic log line ("Property userId is undefined on object") appeared during the malformed-doc
test — this is the rules engine correctly logging the missing-field access it then correctly
denies, not a failure. No emulator limitation blocked any required assertion this time (Java was
the only missing piece in the prior sessions, now resolved via the documented portable JDK).
**No rule or application code was changed to bypass a failing test; only the test harness's
project-ID configuration was corrected, and 2 missing assertions were added.** **Nothing was
deployed** — no `firebase deploy`, no Storage Rules push, no Functions push, no backfill/
initial-publish invocation.

## 2026-07-25 — Pass 6: Private generated print-request read models (Studio + Portal), implemented and reviewed, ready for owner dev deployment approval

Plan amendment: `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md` (pass 6
section). Extends pass 5 (unmodified, still the secure fallback) with two PRIVATE generated Cloud
Storage read-model caches — Studio staff-only, Portal customer-scoped — mirroring the existing
catalog-snapshot architecture's publication mechanics as two separate, non-public security contracts.

Confirmed by direct code inspection before implementation (two background research passes):
`customers/{id}` doc ID is not the Auth UID (mapping via `customers.where("userId","==",authUid)`,
never assumed equal to a path segment); no Electron-main-to-renderer-auth bridge exists, so Studio's
private asset uses the renderer's authenticated Storage SDK (`getBytes`), not the public-asset
Electron IPC transport — matching existing repo precedent
(`assistedCreationRequestsService.downloadBytes`).

Implemented:
- **Shared**: `packages/shared/src/printRequestReadModel/` — read-model types, path templates, pure
  card/summary/allocation builders (11 tests). New `publishPrintRequestReadModels.types.ts` (backfill
  callable contract).
- **Functions**: `functions/src/printRequestReadModels/publishPrintRequestReadModels.ts` — targeted
  per-request/per-customer page publisher with a shared, injectable, bounded generation-precondition
  retry helper (`runManifestSwapWithRetry`, `MANIFEST_RETRY_LIMIT = 5`, verified sufficient under a
  same-manifest concurrent-burst test, not assumed by analogy with the catalog-snapshot case's 3-retry
  budget). New `onPrintRequestReadModelInputWritten` trigger on `printRequests` itself (no prior
  listener existed there) with a field-diff guard (`printRequestReadModelFieldsChanged`) that
  correctly excludes `queueTab`/`updatedAt`, preventing it from re-firing on the sibling `queueTab`
  triggers' own write (would otherwise be a recursion loop) — confirmed by direct event-sequence
  walkthrough during independent review, not just the guard's comment. The read-model publish call
  in the existing `queueTab` triggers is wrapped in its own try/catch, called strictly after the
  `queueTab` write succeeds, and never affects that write's outcome. New owner-only,
  `fresh-prints-dev`-only, confirmation-phrase-gated `publishPrintRequestReadModels` callable
  (backfill/initial-publish) — skips (never publishes) any request missing `queueTab`, reporting
  `skippedNoQueueTab` so the owner can see whether the existing `queueTab` backfill needs to run
  first. 27 Functions-side tests total (publisher/retry-budget/trigger-guard/backfill-guard).
- **Storage Rules**: `generated/studio-print-requests/**` (staff-only, `isStaff()`);
  `generated/portal-print-requests/customers/{customerId}/**` gated by a new
  `customerBelongsToCaller(customerId)` helper that reads `customers/{customerId}` and checks
  `.data.userId == request.auth.uid` — the doc-ID-vs-uid mapping is resolved and verified
  server-side, never assumed from the path segment. New `tests/firebase/printRequestReadModel.rules.test.ts`
  (cross-customer-leak deny, staff-allow, customer-own-scope-allow, unauthenticated-deny,
  missing-customers-doc-deny, write-deny for every role) — **written and logically reviewed, not
  executed** (no Java in this environment, consistent with this repo's documented limitation).
- **Studio consumer**: `studioPrintRequestReadModelService.ts` (authenticated `getBytes`, never
  Electron IPC) + pure validation/derivation helpers moved to a Firebase-config-free utils module
  (`printRequestReadModelMapping.ts`, 13 tests) for direct testability. `usePrintRequests.ts` prefers
  the generated asset for the first page load, falls back transparently to pass 5's bounded Firestore
  path on any failure. Exact tab counts always come from the existing `countPrintRequests` path
  regardless of branch (manifest page-counts are not exact request counts).
- **Portal consumer**: `portalPrintRequestReadModelService.ts` + `portalPrintRequestReadModelMapping.ts`
  (11 tests) — defense-in-depth `filterCardsBelongingToCustomer`/`filterItemsForOwnCards` re-checks
  every card/item's own `customerId` even though Storage Rules already enforce ownership server-side.
  `useMyPrintRequests.ts`'s `'full'` scope prefers the generated asset, falls back to the existing
  customer-scoped Firestore queries (`listMyPrintRequests` etc., unchanged) on failure.

Independent review of the Plan (pre-implementation): approved_with_changes, 6 findings addressed in
the Plan text (novel Storage-Rules-helper test requirement, per-manifest retry-budget verification,
publish/queueTab error isolation, backfill sequencing enforcement, exact Portal-fallback citation,
capacity-authority guard). Independent review of the implementation (post-coding, separate
non-authoring pass): approved_with_changes, 1 confirmed bug — Studio's "Load more" silently no-op'd
for any tab exceeding one page after a read-model-sourced first load, because the Firestore cursor it
depended on was never populated on that path. **Fixed**: `usePrintRequests.ts` now tracks the
read-model's own next page index and advances through it directly; only falls back to the Firestore
cursor path once the read-model pagination is exhausted or unavailable. Rebuilt/relinted clean after
the fix.

Verification: 57/57 focused tests (11 shared + 27 Functions + 13 Studio + 11 Portal... note some
overlap in categorization above; exact count confirmed via combined `npx tsx --test` run), Functions
build, Portal typecheck + production build, Studio 3-target build (re-verified after the Load-more
fix), changed-file lint (2 pre-fix findings resolved, 0 remaining), no trailing-whitespace issues, no
`git diff --check` errors on modified (non-new) files. No deploy, republish, rules deploy, or
production action occurred.

**Human checkpoint — do not deploy without explicit owner approval**: this pass requires deploying
the new Storage Rules (`storage.rules`), the new Function (`onPrintRequestReadModelInputWritten`),
the modified Functions (`onPrintRequestItemQueueTabInputWritten`/`onShowAllocationQueueTabInputWritten`
— behavior-preserving addition, not a rewrite), the new callable (`publishPrintRequestReadModels`),
and — after those deploy — running the new backfill/initial-publish callable (confirmation phrase
`PUBLISH PRINT REQUEST READ MODELS`, dry-run first recommended), sequenced **after** the existing
`backfillPrintRequestQueueTab` (pass 5) has been run to completion, since the new backfill skips any
request still missing `queueTab`. Recommend: deploy dev Storage Rules and Functions, dry-run the new
backfill and review `skippedNoQueueTab`, run the pass-5 `queueTab` backfill first if that count is
nonzero, then run the new backfill for real, then restart Studio and the Portal dev surface, then
test Studio Print Requests cold-open on each tab (including a tab with >50 requests to exercise the
newly-fixed "Load more" path) followed by Portal's `/requests` full-scope view.

READY FOR OWNER APPROVAL TO DEPLOY PRIVATE PRINT-REQUEST READ MODELS TO FRESH-PRINTS-DEV

## 2026-07-25 — Pass 5: Print Requests page bounded hydration, independently approved, deployed, backfill pending human checkpoint

Pass 4 flagged the Print Requests page's own unbounded hydration (full `printRequests`,
`customers`, `showAllocations`, `upcomingShows` scans on every mount) as an owner-approval-gated
gap. The owner directed strict bounds everywhere, exact tab counts (never approximate), a
maintained field only if exact bounded counting is genuinely impossible, server pagination, and a
safe resumable dry-run backfill gated at a human checkpoint. Implemented:

- **New maintained field**: `printRequests/{id}.queueTab` (Working/Queued/Printing/Printed) —
  tab membership depends on item/allocation sums with no raw filterable field and no way to
  compound two inequality filters in one Firestore query, so a maintained field is the only exact,
  zero-scan option. Kept in sync by two new narrowly-scoped triggers
  (`onPrintRequestItemQueueTabInputWritten` on `printRequestItems`,
  `onShowAllocationQueueTabInputWritten` on `showAllocations`, both create+update+delete): each
  event resolves the affected request, skips if the relevant field didn't change, recomputes from
  only that one request's own items+allocations (never a corpus scan), writes only on actual
  change. Pure recompute function `computePrintRequestQueueTab` (9 tests).
- **Bounded service layer**: `listPrintRequestsPage` (server-paginated, cursor+limit),
  `countPrintRequests` (exact `getCountFromServer` per tab), `getPrintRequestsByIds` (deep-link
  direct reads), `listAllocationTotalsForRequests`/`listCustomersByIds` (chunked, page-scoped),
  `listPrintRequestsByCustomer` (customer-scoped, for the audit-trail feed). `listCustomers` (full
  scan) kept only for the lazy-loaded create-request customer picker.
- **Rewritten `usePrintRequests` hook + `PrintRequestsPage`**: loads one tab's bounded page + all
  four tabs' exact counts (auth-scoped remount cache, 8 tests, mirrors Portal's proven pattern);
  every mutation handler (update/remove/duplicate item, save detail, create, add/remove show queue)
  reconciles locally instead of a full-list reload; deep-linked requests fetched by direct ID; show
  lookups scoped to only the selected request's own allocation groups; full-scan
  `useCustomers`/`usePrintRequestAllocationTotals`/`useUpcomingShows` removed from this page.
- **Backfill callable built, NOT run**: `backfillPrintRequestQueueTab` — owner-only,
  `fresh-prints-dev`-only, confirmation-phrase-gated, cursor-paginated (bounded 400/page,
  resumable), dry-run supported, idempotent, zero auto-run callers. Existing pre-migration
  requests lack `queueTab` until explicitly backfilled; new/mutated requests get it immediately via
  the two triggers regardless.

Independent review: **approved_with_changes → all 4 findings resolved** (tab count didn't
decrement on delete/archive — fixed; `insertCreatedRequestLocally` lacked an internal tab guard —
fixed; two dead-code methods/hooks found — removed). Verification: 46/46 focused tests (was 42),
Studio 3-target build, functions build, changed-file lint, diff-check — all clean. Deployed to
fresh-prints-dev: `onPrintRequestItemQueueTabInputWritten`, `onShowAllocationQueueTabInputWritten`,
`backfillPrintRequestQueueTab` (deployed as inert code — NOT invoked). Studio requires a full
restart for the client changes.

**Human checkpoint — do not run without explicit owner approval**: the `backfillPrintRequestQueueTab`
callable must be invoked manually (with the confirmation phrase `BACKFILL QUEUE TAB`) before
pre-existing print requests will appear correctly in the new bounded tab queries/counts. Recommend
a `dryRun: true` pass first to review the reported `scanned`/`alreadyCorrect`/`updated` counts,
then a real pass, paging via `nextStartAfterRequestId` until `hasMore` is false.

## 2026-07-25 — Pass 4: 249-read Studio spike attributed and fixed, independently approved, no Functions change

Deployed Function logs for the exact owner window (19:13:30-19:16:30Z) prove the **server is already
clean and constant-cost**: exactly 4 `onPrintRequestItemCreated` executions (1 read/2 writes/1 transaction
each — the pass-1 idempotency guard's exact designed budget), exactly 4 `onPortalCatalogSnapshotSourceWritten`
executions (all `operational`/0 reads — no publication), no other Function in or adjacent to the window.
Server total: 8 of 249 reads. The ~241 remainder is untraced Studio client reads, code-identified as: (a)
per-add hidden reads in `addPrintRequestItem` (unconditional parent read + growing item-list read + a
read-after-write, per add) and (b) the Print Requests page's own mount/remount hydration
(`listPrintRequests`/summaries/`listCustomers`/`listAllShowAllocations`/`listUpcomingShows`, none
previously read-traced, which is why the debug report showed only 4 reads while Console showed 249).

Fixed: `addPrintRequestItem`'s parent update now uses `increment(1)` (no read); the item-list read is
skipped entirely when an explicit `sortOrder` is supplied or an `existingItems` hint is passed;
`savePrintRequestDesignSelections` (the actual caller behind the owner's 4-design-add workflow) now passes
its one already-loaded item list through the hint instead of re-querying per add (closing a gap the
independent reviewer caught — the first pass only removed the parent read, not the growing items read);
read-after-write replaced with local synthesis from the known payload. Read tracing added to the six
previously-untraced hot reads so the next debug report attributes hydration correctly instead of hiding it.

Independent review: **approved_with_changes → both findings resolved** (existence-check tradeoff closed at
the root for the tested workflow; accounting corrected to reflect the real fix). Re-verified: Studio
3-target build, changed-file lint, 12/12 focused tests, diff-check — all clean. **No Functions changed or
deployed this pass** — `onPrintRequestItemCreated`/the classifier already met the required budgets;
evidence, not guesswork. Studio requires a full restart for the client fixes to take effect.

**Known remaining gap, explicitly flagged, not silently accepted**: the Print Requests page's own
mount/remount hydration is unbounded (full request-list/customer/allocation/show scans) and stays above
this task's ~20-read hard budget for a cold/remount visit. Bounding it is the same deferred,
behavior-sensitive item carried from pass 2 and requires explicit owner approval before Wave C signoff.

## 2026-07-25 — Pass 3: live cost-test failures remediated, independently approved, dev-deployed

The owner's July 25 runtime test surfaced seven evidence items; all are resolved with source/log proof:

1. **AI Review 1,122-tag mount read**: proven defect (pass-1 boundary decision did not survive live
   evidence). Fixed — approved-tag display/autocomplete uses the generated taxonomy (0 Firestore reads);
   `approveSuggestedTag` is a lazy service call whose server-side validation independently checks the full
   corpus (reviewer-verified); tag management keeps Firestore.
2. **Quota double-call**: working as designed — server quota counters are per-purpose; the two calls were
   different purposes (print_request vs catalog_donation) from the only two quota-consuming routes.
   Documented; per-purpose cache/in-flight sharing already correct.
3. **Storage bucket redundancy (12 misses/4 items)**: both apps' generated-asset `fetchJson` had no
   per-path in-flight sharing. Fixed in Portal + Studio; traced as `in-flight-reuse`.
4. **Queue failed-then-succeeded**: deployed logs prove attempt 1 was a legitimate rejection (chosen show
   already carried the customer's allocations — `showAllocationsReturned: 4`) and attempt 2 targeted a
   different show (`showAllocationsReturned: 0`); no race, no state written between calls. Fixed the two
   real accounting defects: seven distinct validation-stage labels (previously a misleading catch-all) and
   `failureStage` now attached to the client-visible error details (was null). Zero validation changes.
5. **Clear Request stale UI**: proven root cause — the service never invalidated the 30s read cache, so
   post-clear silent reloads served pre-clear items. Fixed: cache invalidation + full local reconciliation
   (items emptied, list entry patched from the callable result, summary dropped, pending loads
   epoch-discarded); zero immediate post-clear reads.
6. **Portal startup ~99 reads**: attributed — only `registerWebPushSubscription` (4 reads, no-op) ran
   server-side; the remainder is bounded one-time client startup hydration, not idle activity.
7. **Deletion budget**: preview/delete had no server accounting (both live invocations were cold-start
   inflated). Added sanitized dev accounting to all outcomes so the next controlled deletion yields exact
   live numbers against the `4 + 2I` / `I + 1` formula.

Independent non-authoring review: **approved, no required changes** (details in the Review doc). All
verification green: functions build, Portal typecheck + production build, Studio 3-target build, 53/53
regression tests, changed-file lint, diff check. Deployed to fresh-prints-dev:
`queuePortalPrintRequestToShow`, `deleteEligiblePrintRequest` (accounting/stage changes only). Portal and
Studio client fixes require full local restarts. No rules/index/App Hosting/CORS/production action.

## 2026-07-25 — Comprehensive eradication pass 2 complete: independently reviewed, dev-deployed, ready for owner cost test

Owner directed a full one-pass completion superseding the narrowed five-item pass, with dev Functions
deployment authorized after independent review and tests. Three parallel source audits re-verified all four
owner evidence items; an isolated reviewer that did not author the changes audited both passes
(`approved_with_changes`, both findings resolved). Results:

- Catalog-add chain, request creation, metadata, and push: **proven already fixed in current source** with
  line citations (owner traces predate the unrestarted build).
- Queue-success 1+4+4 reread: **still broken in source — root-caused and fixed**. It fired via two effects
  (`usePrintRequestDetail`'s working-transition reload; the detail view's status-keyed allocation effect),
  not the handler. `reconcileQueued()` now clears the transition refs synchronously and the view arms a
  one-shot allocation-load suppression in `handleQueuedToShow`. Post-queue client reads: 0.
- Deletion: exact formula established — current hard delete is `4 + 2I` reads / `I + 1` writes, zero
  post-delete reads, zero triggers. The historical ~1,663-read spike reconstructs as the removed unbounded
  post-delete list reload (≈3R) plus the `listAllShowAllocations` full scan (A) — not the bulk-wipe tool.
- New pass-2 fixes: wipe reset no-op skips (repeat wipe over reset data = reads only; also eliminates one
  snapshot-trigger invocation per design per repeat wipe), Studio item-summary N+1 → chunked `in` queries
  (`ceil(N/10)` instead of `N` on every Print Requests list load), AI Review failed-taxonomy notice
  (review-required).
- Recursion risk closed: `classifyPortalCatalogDesignChange` confirms counter/timestamp-only design writes
  classify `operational` (no publication).
- Deferred with documentation (behavior-change or already-mitigated): AI Review per-action reload+counts,
  unbounded staff list queries (`listPrintRequests`/`listUpcomingShows`/`listAllShowAllocations`),
  upload-intake enrichment batching, favorites/full-history bounds.

Verification: functions build, Portal typecheck+production build, Studio 3-target build (re-run after every
edit), 49/49 regression + 4/4 util + 7/7 re-run tests, changed-file lint clean, diff-check clean. The four
changed Functions (`onPrintRequestItemCreated`, `onShowAllocationCreated`, `deleteEligiblePrintRequest`,
`wipeOperationalTestData`) were deployed to fresh-prints-dev per the owner's pass-2 authorization. No rules,
index, App Hosting, CORS, republish, migration, or production action. Full report and budget table:
`docs/workflow/reviews/2026-07-25-comprehensive-firestore-eradication-pass-2-report.md`.

Next: owner runs the consolidated cost test (closed baseline, Portal idle, catalog, create+4 adds, detail,
queue, Studio workspace audit, controlled deletion) after fully restarting Studio and the local Portal dev
server. No App Hosting.

## 2026-07-25 — Comprehensive Firestore spike eradication (narrowed 5-item scope) ready for approval

An owner-issued comprehensive 12-task/40-test audit prompt was narrowed after full required reading (Wave C
Plan/Review/checkpoint, six 2026-07-24 remediation reports) plus a parallelized four-pass operation inventory
across Portal, Studio, and Functions
(`docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-pre-implementation-report.md`). Most of
the 12-task scope re-audits areas already correctly implemented with no new regression evidence; five new,
evidence-cited defects were found and fixed under a narrow Plan/Review amendment
(`docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md` top section,
`docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md` top section):

1. Studio AI Review's category filter dropdown now reads the existing generated client-safe taxonomy snapshot
   (`useGeneratedDesignLibraryTaxonomy`) instead of unconditionally querying Firestore on every mount (up to
   ~200 reads removed per AI Review open). Tag Management/tag-approval flows were explicitly left untouched
   (genuine write/archived-data needs).
2. Studio's per-request delete/archive no longer triggers a full unbounded `listPrintRequests` + N+1
   item-summary reload; the affected request is reconciled locally instead. New pure
   `reconcileDeletedOrArchivedRequest` util, 4 new tests.
3. Portal's `createPrintRequest` no longer unconditionally rereads the customer profile after every
   working-request creation — verified safe since the only UI reader of the touched field
   (`totalPrintRequests`) is a loading-state fallback already superseded by the existing list reload.
4. `onPrintRequestItemCreated`/`onShowAllocationCreated` gained a transactional idempotency guard against
   Cloud Functions v2/Eventarc CloudEvent redelivery double-counting `requestCount`/`showAddCount` — a
   correctness gap not previously identified in any prior pass, fixed with a marker field on the small
   triggering document (not the potentially-hot `designs` document) to avoid adding steady-state cost to the
   catalog-add hot path.
5. `deleteEligiblePrintRequest`'s single-request hard-delete flow previously ran `buildPreview()` three times
   (client preview-on-open, one inside the callable, one recheck-before-mutate); the redundant first internal
   call is removed, dropping reads from 3x to 2x base preview cost while preserving the TOCTOU-safety recheck
   and all authorization checks unchanged. This was also the key finding correcting the task prompt's own
   framing: the owner's reported single-print-request-deletion spike almost certainly came from this triple-
   preview pattern, not from the separate `wipeOperationalTestData` bulk-wipe tool the prompt's Task 8
   assumed — that tool's real, separate full-collection-scan defect is documented but explicitly deferred
   (dev-only, owner-triggered, confirmation-gated, not part of normal-operation budgets).

Explicitly deferred, not reopened: the remaining 12-task/40-test scope (provider audits, generated-JSON
re-review, debug accounting extensions, `wipeOperationalTestData`'s scan pattern, several other real but
lower-priority findings cataloged in the pre-implementation report) — all either re-audit already-correct,
owner-approved architecture with no new regression evidence, or require further unread source
(`classifyPortalCatalogDesignChange`, `handleQueuedToShow`'s full body) before they can be planned accurately.

Verification: 4 new focused tests pass; existing regression suites for adjacent areas
(`generatedReadyDesignMapping`, `deletionEligibility`, `createPortalPrintRequestValidation`,
`addPortalCatalogDesignToPrintRequest`, `clearPortalWorkingPrintRequest`) all pass; Functions build, Portal
typecheck/build, full Studio Vite build (renderer + Electron main + preload), changed-file ESLint (10 files,
zero warnings), and `git diff --check` all exit 0. Pre-existing, unrelated DPI/print-request-sizing test
failures (5) confirmed via `git stash`/`git stash pop` to predate this pass, consistent with this repo's
already-documented pre-existing test debt. No deploy, republish, rules, or production action occurred. Full
details: `docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-test-report.md`.

Owner approval required for: `onPrintRequestItemCreated`, `onShowAllocationCreated`, and
`deleteEligiblePrintRequest` (dev Functions redeploy, items 4-5 only); Studio full restart and Portal local
rebuild/restart (`npm run dev:portal`, no App Hosting) for items 1-3, which need no Functions redeploy.

## 2026-07-24 — Portal show-queue submission remediation ready for approval

Revision `queueportalprintrequesttoshow-00028-ruk` received three sequential browser POSTs through
the sole acknowledgment-confirm handler: two HTTP 400 responses followed by one HTTP 200. No form,
effect, automatic retry, or server retry exists. The first call included a cold Function start. The
old revision did not log validation stages, so the two precise failed preconditions are not
recoverable and are not guessed.

Portal now shares one service-owned in-flight Promise per authenticated request/show pair and has a
synchronous hook guard. Queue validation rejects named ineligible requests/shows before item and
allocation queries while preserving transaction checks. Sanitized accounting reports stage, counts,
attempts, writes, duration, and outcome. Catalog-add returns an allowlisted item DTO, removing four
follow-up item reads. Quota callers share the existing 45-second freshness window. Queue success
reconciles local request/cart/allocation state with zero immediate request/item/customer/allocation
or status-list reloads.

Focused tests 20/20, Portal typecheck/build, Functions build, changed-file lint, and diff check pass.
No deployment or production action occurred. Owner approval is required for
`queuePortalPrintRequestToShow`, `addPortalCatalogDesignToPrintRequest`, and Portal App Hosting,
followed by the isolated retest in
`docs/workflow/reviews/2026-07-24-portal-show-queue-submission-remediation-test-report.md`.

## 2026-07-24 — Residual Portal server activity attributed and remediation ready for approval

The 02:34–02:43 UTC log sweep found no generated-catalog fallback, old ready-design metadata query,
full snapshot publication, or App Hosting Firestore request. It found ten catalog-add calls in two
concurrent groups of five, ten matching item-created analytics triggers, three clear-working-request
calls, one explicit show-picker call, three unchanged push registrations (12 exact reads), and one
metadata miss (1 exact read). All ten snapshot triggers were operational skips with zero reads and
writes. The three clear calls are the only delete-capable path and therefore account for all nine
deletes, although the old revision cannot prove the per-call split.

The dominant bounded read candidate is transaction retry amplification: concurrent adds reread the
same parent and growing full item query. Portal now serializes mutations per request. Dev accounting
captures transaction attempts/returned documents; the analytics trigger removes its redundant
existence read; empty clears are idempotent zero-write/delete no-ops and skip allocation lookup; and
clear/show-picker accounting records exact aggregate counts.

Focused tests 6/6, Functions build, Portal production build/typecheck, changed-file lint, and diff
inspection pass. No deployment, republish, rebuild, rules, Storage, or production action occurred.
Owner approval is required for the four scoped dev Functions and rebuilt Portal revision, followed
by the isolated retest in
`docs/workflow/reviews/2026-07-24-portal-residual-server-firestore-remediation-report.md`.

## 2026-07-24 — Portal print-request duplicate-read remediation ready for owner retest

The owner-captured four-item request route produced 102 approximate request-specific reads because
the global request list, Current Request provider, route-detail hook, route allocation calculation,
and a second route card resolver independently started overlapping reads. Strict Mode amplified
one-shot calls because those services had no shared in-flight ownership. Request cards also hydrated
the same design IDs through both `portalPrintRequestService.getReadyDesign` and
`catalogService.getReadyDesignsByIds`; the first-load card race occurred when working items arrived
after the detail hook's one-time summary pass.

The Portal now has an auth-scoped 30-second request read cache with concurrent promise sharing,
shell-to-detail priming, rejection eviction, bounded LRU storage, mutation invalidation, and stale
completion rejection. The chrome path uses the same single-request item key as Current Request and
route detail. Allocation calculation reuses already-loaded items. Catalog request-card summaries
resolve through generated card buckets/overrides first; Firestore starts only after a generated
failure trace. The route's second design resolver was removed, and item-ID changes trigger a
generation-guarded card resolution pass, so previews/titles/backgrounds render on first navigation.
Customer-upload summary behavior is unchanged.

The popup retains its last sanitized report when its owner refreshes, discovers/adopts the refreshed
owner over the same-origin BroadcastChannel, rejects stale-owner commands, and copies a version-2
multi-segment report with an `owner-refreshed` boundary. No browser storage contains trace snapshots.

The 14-write owner graph is exactly attributable when the four adds created a new working request:
request creation writes the request plus customer sequence (2); each new catalog item writes the item
and parent request (2 × 4); each item-create trigger updates design analytics (1 × 4): `2 + 8 + 4 =
14`. Dev-only aggregate accounting was added to the create and catalog-add Functions; required writes
were not removed.

Verification: Portal typecheck/build pass; Functions build passes; focused affected suites 45/45
pass; changed-file lint and diff check pass. No
deploy, republish, snapshot rebuild, rules, or production action occurred. Human checkpoint:
restart/deploy the Portal dev surface and deploy only `createPortalPrintRequest` and
`addPortalCatalogDesignToPrintRequest` if owner-visible server write accounting is required, then run
the four-item cold/repeat/refresh retest.

## Current Mode
managed-phase

## Phase
`preproduction-static-analysis-cleanup`: **DONE — signed off approved** (2026-07-29; see
`docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-signoff.md`). Prior
active-goal phase `owner_qa` for Wave C below is preserved and unchanged — Wave C remains separately
queued/parked. No new managed goal has been started.

## Plan Status
complete (pass 6 — private print-request read models — Plan amendment complete, independently
reviewed approved_with_changes, all findings addressed in the Plan text)

## Review Status
approved_with_changes (2026-07-25 — two independent non-authoring reviews for pass 6: one against the
Plan pre-implementation, 6 findings all addressed in the Plan; one against the real implementation
diff post-coding, 1 confirmed bug found and fixed — see the pass 6 entry above)

## Implementation Status
pass6_private_print_request_read_models_complete_pending_owner_storage_rules_and_functions_deploy_and_backfill_checkpoint;
comprehensive_firestore_eradication_5item_scope_complete_pending_owner_functions_redeploy_and_restart (prior, unchanged);
portal_metadata_cache_generated_recent_asset_push_idempotency_and_tracer_coverage_complete (prior, unchanged)

## Test Status
pass6_57_focused_tests_pass_functions_portal_studio_builds_lint_clean_rules_tests_executed_22_of_22_pass_java21_portable_jdk;
comprehensive_firestore_eradication_4_new_tests_pass_regression_suites_pass_functions_portal_studio_builds_lint_diff_pass (prior, unchanged);
portal_functions_build_typecheck_focused_18_pass_changed_file_lint_diff_pass (prior, unchanged)

## Signoff Status
pass6_private_print_request_read_models_ready_for_owner_dev_deployment_approval_see_checkpoint_below;
studio_background_edit_pass_with_notes_wave_c_remains_open; comprehensive_firestore_eradication_5item_pass
pending owner Functions redeploy/restart and retest

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Pass 6 (private Studio/Portal print-request generated read models) is implemented, tested, and
independently reviewed twice (Plan + implementation), but requires explicit owner approval before any
deploy: new Storage Rules, the new `onPrintRequestReadModelInputWritten` Function, the modified
`onPrintRequestItemQueueTabInputWritten`/`onShowAllocationQueueTabInputWritten` Functions, and the new
`publishPrintRequestReadModels` callable — followed by running that callable's dry-run/real backfill
(sequenced after the existing pass-5 `queueTab` backfill). See the pass 6 entry above for the exact
deployment/backfill/restart/retest checklist.

Comprehensive Firestore eradication (narrowed 5-item scope) is implemented and locally verified, pending
owner Functions redeploy for `onPrintRequestItemCreated`/`onShowAllocationCreated`/`deleteEligiblePrintRequest`
(items 4-5) and a Studio full restart / Portal local rebuild-restart for items 1-3 (no App Hosting). See the
2026-07-25 entry above and
`docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-test-report.md` for the exact
consolidated owner retest checklist.

Portal R-015 remains passed and closed. The residual metadata remediation is complete locally using
the repository's existing one-hour freshness rule. Portal and Function caches are bounded,
in-flight-deduplicated, and rejection-safe. Library metadata now selects from the existing generated
newest-card page, reducing a miss from up to 41 Firestore reads to exactly one settings read; logo
mode uses two settings reads; cache hits use zero.

`getPortalGlobalOpenGraph` now emits sanitized exact development accounting. Session push sync
reuses its token, unchanged subscriptions skip the current-document write, sibling reconciliation
remains limited to 25, and sanitized aggregate accounting is emitted. All audited raw Portal SDK
operations now have service-level trace lifecycle coverage; `addDoc` and `runTransaction` remain
absent.

Verification passes: Portal typecheck/build, Functions build, focused tests 18/18, changed-file
lint, and diff check. No deploy, republish, rebuild, rules, or production action occurred. Owner
approval is required for the two scoped dev Functions and Portal App Hosting deployment.

Owner verdict for the isolated Studio Design Library background-edit retest: **PASS WITH NOTES**.
The card updated immediately, survived route remount, retained its immutable created-date position,
and triggered no generated fallback, broad taxonomy/ready-design client query, or approximately
1,221-read full publication. Firebase Console measured 3 reads/1 write; Studio traced the one
approved authoritative editor-opening read and one successful write; the targeted Function measured
0 Firestore reads. The two additional Console reads are unattributed and non-blocking.

The restart-inclusive 2:44–2:45 observation (69 Console reads/0 writes) included Studio startup and
Inbox loading, so it does not replace the isolated measurement. Studio traced one successful write;
the Console write likely appeared in an adjacent/delayed bucket.

This closes the Studio generated healthy path, zero broad taxonomy/ready-design reads, created-date
ordering, immediate reconciliation, session override, targeted card-only publication, elimination
of the 1,221-read background-edit publication, accounting, and duplicate idempotency. Wave C remains
open. The next verified checkpoint is owner Portal QA for generated-catalog dynamic AND-tag
narrowing (R-015), followed by the remaining consolidated Wave C smoke.

The owner-confirmed route-remount reversion is fixed with a service-owned, authenticated-session
card override. It overlays generated cards and ready-index fields across route mounts, preserves
`createdAtMs`, clears only on matching generated truth/non-ready/sign-out, and emits sanitized
lifecycle traces.

The reviewed targeted-publication amendment is implemented locally. Design writes are classified as
card-only, index/filter, or operational. Operational-only writes no longer publish. Card-only writes
map the Firestore event payload directly into an immutable content-addressed override asset and use
a generation-preconditioned manifest merge/retry; they query zero ready designs/categories/tags.
Index/filter changes retain the full publisher. Dev-only structured accounting records returned
counts, mode, classification, pass, coordination counts, duration, and outcome.

Pre-deployment verification passed: focused tests 91/91, Functions build, Studio
renderer/main/preload build, Portal override typecheck, changed-file lint, and diff check. The
isolated owner retest above is now the authoritative live result.

The Firebase Debug window now opens at 485 px wide on Studio's monitor. It is placed immediately
beside the Studio window (right side when space is available, otherwise left), with bounded fallback
placement when neither side has enough room. The panel itself is capped at 485 px and wide tables
scroll internally. Placement/lifecycle tests are 9/9; changed-file lint, Studio renderer/main/preload
build, and diff check pass.

The generated Design Library edit-reconciliation failure is fixed locally. `updateDesign` already
returns a mapped persisted Design after its one authoritative pre-write read; the modal had discarded
that result, the page performed a second read, patched only list fields, deleted the visible card,
and never re-resolved because the visible IDs were unchanged. The save result now flows through
explicit generated entry/card mappers, preserves `createdAtMs`, updates visual metadata immediately,
invalidates only the affected card bucket, and records a sanitized reconciliation trace. Parsed card
buckets are materialized once with duplicate/in-flight reuse. Focused tests are 47/47, snapshot
ordering tests 33/33, changed-file lint and Studio renderer/main/preload build pass.

An earlier owner retest reached the healthy generated path but the Design Library crashed because its
Firestore-only list comparator called `createdAt.toMillis()` on generated filter records that carry
`createdAtMs` instead. The page now has an explicit sort boundary: healthy generated records sort by
numeric `createdAtMs DESC, id DESC`; archived and bounded-fallback Firestore records continue to sort
using their real Timestamp. Missing sort data is defensive and cannot crash the page. The later
isolated owner retest above confirms this correction live.

The completed clean Studio diagnostic used the corrected generated asset renderer transport. The
panel separates read operations, returned documents,
approximate billable document reads, listener initial documents, and listener update documents.
The unconditional legacy Design Library hooks were verified as the parallel-read source and are now
disabled on a healthy generated path. Callable tracing (32 files, both apps) and write
tracing (8 Studio service files covering Design Library/print requests/show allocations/staff inbox)
are now wired to real call sites. The separate-window correction is implemented with a main-renderer
authoritative trace session and sanitized Electron-main IPC broker; focused tests and the full Studio
Vite build passed. Prior context is preserved below.

---

Owner republished generation 9 successfully (`portal.contentVersion: "9-cea01d758a81dd60"`,
`reference.contentVersion: "5-1a810751ceb2b381"`) and ran local Portal QA against it. Still FAIL: tag
modal "unavailable"; searching "best" showed 1 result with Load more, 2nd appearing only after
clicking it; ~2,700-2,800 more Firestore reads. Diagnosed via a live Node script (using the actual
shared parsers, no browser) that generation 9's manifest/tag-facet/search-shard assets all parse
correctly and return exactly the 2 expected design IDs when fetched outside a browser — proving the
Storage assets and parsers are correct. Owner then supplied the exact browser console error: a CORS
policy block on `https://firebasestorage.googleapis.com/...` from origin
`https://myprintrequest.dev` ("No 'Access-Control-Allow-Origin' header"). Confirmed the exact live
bucket is `gs://fresh-prints-dev.firebasestorage.app` (`.appspot.com` 404s the same object; `.dev`
Portal's own `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` confirms it). Found the repo's existing
`storage.cors.json`/`docs/workflow/setup/firebase-storage-cors.md` (from an earlier, unrelated
Assisted Creation proof-download CORS effort, confirmed unused in the current codebase) targeted the
wrong bucket alias (`.appspot.com`) — any CORS ever "applied" under that name would have done
nothing. Corrected both files to the right bucket name and a narrower GET/HEAD-only,
Content-Type/Cache-Control/ETag-only config scoped to the actual read-only generated-asset use case.
Independently, found and fixed a second real defect: `useCatalogDesigns.ts`'s search/multi-tag branch
silently fell through to an unrelated, unfiltered 40-design Firestore page on any generated-asset
failure (CORS error included) — `buildServerListQuery()` drops the search term/multi-tag selection
entirely, so that fallback reproduced the exact 1-result/Load-more symptom and read spike regardless
of root cause. Removed that fallback entirely for search/multi-tag; it now shows a "Catalog search is
temporarily unavailable" state with zero Firestore reads. Normal unfiltered Discover/Library browse
keeps its separately-approved bounded Firestore fallback, unchanged. Reviewed Studio's actual search/
tag-filter implementation for parity: ordering, substring search semantics, and tag-count scoping are
all already correctly aligned with Portal's existing (documented) conventions — no parity defects
found, no additional changes needed. `gcloud`/`gsutil` are not installed in this environment, so the
live CORS-inspection command could not be run directly here (`[NEEDS REPO CHECK / OWNER OR CI MACHINE
WITH gcloud]`) — the exact command is provided for the owner to run. Owner approval is now required
to apply the corrected bucket CORS configuration; no Functions/Rules/republish action is required for
either fix in this pass (CORS is bucket-level config; the fallback fix is Portal-code-only).

**Update:** owner applied the corrected dev bucket CORS configuration; generated Portal assets now
load successfully in the browser, and searching "best" correctly returns both matches immediately.
Next request: after a tag is selected, unrelated tags stay visible with stale global counts (the
modal doesn't dynamically narrow to AND-filtered results). Diagnosed: the modal's `facetedTags`
computation only ever filtered the *global* tag facet by name-search text, with no AND-narrowing
logic at all — not a regression in this pass's earlier fixes, a feature gap. Implemented via Option A
(existing assets sufficient, no new generated asset): a new
`portalCatalogAssetService.listNarrowedTagFacets(selectedTags)` reuses the same per-tag design-ID
list asset (`filters/tagPathTemplate`) already fetched for search/filtering plus the same card-bucket
assets already required to render results — intersects the selected tags' design-ID lists (zero new
fetch per candidate tag, zero new generated asset, zero Firestore reads), then tallies each matching
card's own `tags` to get live co-occurrence counts. Extracted the pure core
(`computeNarrowedTagFacets`/`intersectDesignIdLists`) for direct unit testing. Wired into
`CatalogTagFilterModal` via a new effect keyed on the (halftone-excluded) selected-tag set: empty
selection uses the existing global facet list unchanged; a non-empty selection fetches the narrowed
list, with in-flight/stale-response generation guarding and the same "unavailable" (never Firestore
fallback) error state on failure. 7 new pure-function tests (99 total project-wide). Portal-only fix
— no Functions/Rules/manifest change, no redeploy/republish required.

**Update (2026-07-24):** owner decided to move Studio's own Design Library (normal ready browse,
search, category/tag/halftone filtering, dynamic narrowing, pagination) onto the same generated
Storage architecture, keeping Studio's exact existing UX unchanged. Full Plan/Review amendment
completed and approved (Option B: reuse existing public Portal card buckets + client taxonomy; add
one new compact asset `generated/portal-catalog/v{contentVersion}/studio/ready-index.json`;
Electron main-process IPC transport, not browser CORS; archived designs stay Firestore-only;
owner-approved catalog-wide-accurate dynamic tag narrowing). Implementation now complete:
- Shared: `PortalCatalogStudioReadyIndex` (`id, title, description?, categoryId?, tags,
  updatedAtMs`), `parsePortalCatalogStudioReadyIndex`, manifest field `studio.readyIndexPath`
  (required, validated).
- Publisher: `studioCatalogReadyOrder`/`buildPortalCatalogStudioReadyIndex` (Studio's own
  `updatedAt DESC, id DESC` order, independent of Portal's `createdAt`-based order), wired into
  `publishPortal()`.
- Electron: new `catalogAsset` IPC feature (channel registry, main-process handler reusing the
  existing Storage-URL host allowlist — extracted to a dependency-free
  `firebaseStorageDownloadUrl.ts` module so it's unit-testable and shared with the existing
  download-to-file feature — preload bridge, `window.freshPrints.catalogAsset.fetchJson`).
- Studio consumer: `studioCatalogAssetService.ts` (manifest/asset caching mirroring Portal's
  pattern, via IPC instead of renderer `fetch()`); `useGeneratedReadyDesigns` hook (loads the whole
  ready-index once, exposes it for Studio's *existing, unchanged* pure filter functions to run
  against, resolves real card fields only for the visible page); pure mapping helpers
  (`cardToDesign`/`entryToFilterableDesign`) extracted to a Firebase-import-free utils module for
  direct testability.
- `DesignLibraryPage.tsx`: normal ready browse (not archived) now sources `designs` from the
  generated hook instead of `useDesigns`; archived mode and Firestore's own bounded 100-doc fallback
  (on generated-index load failure) are unchanged; edit-save/archive apply local
  patch/removal to the generated-derived state (Firestore stays the write target); opening a design
  detail always re-fetches the authoritative Firestore document first via the existing bounded
  `designService.getDesignById`.
- New tests: 7 (`generatedReadyDesignMapping.test.ts`, including a direct reproduction of the "BEST"
  search regression for Studio's own search path), 3 (`catalogAssetIpcChannels.test.ts`), 3
  (`fetchCatalogAssetJson.test.ts`), 6 (`firebaseStorageDownloadUrl.test.ts`), plus manifest/parser/
  builder additions and 2 new rules-emulator assertions proving the new path needs no rules change
  — 138 tests total in the full relevant suite (all pass), rules 8/8 (was 7/7).
- Verification: functions build exit 0, Portal typecheck exit 0, full Studio `vite build`
  (renderer+main+preload) exit 0, rules suite 8/8 (Java 21, portable JDK), lint clean on every
  changed file except one pre-existing unrelated `no-control-regex` finding in
  `downloadFirebaseStorageUrlToFile.ts` (present before this pass, confirmed via `git stash`), diff
  check clean. Studio's full-repo `tsc --noEmit` remains blocked by the pre-existing TS5103
  `ignoreDeprecations` issue (documented across many prior passes in this repo); the established
  `--ignoreDeprecations 5.0` CLI override shows **zero errors in any new/changed file** (28
  pre-existing unrelated errors elsewhere, confirmed by file path).
- Developer runtime read verification **not performed**: this environment has no Electron/browser
  automation tooling and no Studio dev session was running to attach to — disclosed honestly rather
  than fabricated, consistent with this goal's established practice. A manual test script is
  provided for the owner.
- No Functions/Rules/CORS change applied. Affected Functions for redeploy:
  `rebuildCatalogSnapshots`, `onPortalCatalogSnapshotSourceWritten` (same two already pending from
  the prior CORS/fallback pass — `publishPortal()`'s output changed again). One republish required
  to produce the new asset once deployed. No CORS/rules change needed (proven via the new rules
  test).

**Update (2026-07-24):** owner republished generation 38 and validated the live asset (manifest,
`studio.readyIndexPath`, byte size, field safety, ordering) — all confirmed correct against the
then-current `updatedAtMs`-based ordering rule. Owner then ran Studio QA and found two problems: (1)
the Design Library visibly reshuffled on print-request/show/edit activity — root cause confirmed:
the generated ordering field (`updatedAtMs`) is bumped by exactly those writes; (2) ~1,300 Firestore
reads during the session. Owner decided ordering must use the immutable `createdAt` field instead.
Investigated every `designs` document-creation path in the repo (`designService.createDesign`,
`promoteCustomerUploadToAiReview`) — both write `createdAt` unconditionally via `serverTimestamp()`;
Firestore rules forbid changing it on update; no repo-visible evidence of legacy designs missing it.
No backfill needed. Changed `PortalCatalogStudioReadyIndex`'s ordering field from `updatedAtMs` to
`createdAtMs` (field rename within the same schema version, no Portal impact), updated
`studioCatalogReadyOrder`/`buildPortalCatalogStudioReadyIndex` and all consumer doc comments/tests.
10 new tests including explicit regressions for each owner-reported scenario (request activity,
show activity, editing — none move a design; a new design appears first; ID DESC tiebreaker).
Attributed the ~1,300 reads via direct code inspection (no live Studio session/automation tooling
available): reconciles almost exactly to `useCatalogTags`'s full tag-collection pagination (~1,122
reads at the real dev corpus) + `useCategories()`'s bounded load (≤200 reads) — both unconditional on
every Design Library mount, both unchanged since before this Studio generated-catalog work began, not
a new regression. Surfaced (not fixed) that `useCategories()` should already have been converted to
the generated client-safe taxonomy per the original Plan text — a real gap, but out of this task's
explicit scope (ordering + attribution). 148/148 tests pass project-wide, rules 8/8 unaffected,
functions/Studio builds exit 0. No Functions/Rules/CORS applied; same two Functions need a further
redeploy (live generation 38 still has the old ordering) plus one more republish.

**Update (2026-07-24):** owner directed closing the surfaced taxonomy read gap. Converted
`DesignLibraryPage.tsx`'s `useCategories()`/`useCatalogTags()` (normal, non-archived mode only) to
the existing, already-published `generated/catalog-reference/**` client-safe taxonomy snapshot — the
same one Portal already publishes/consumes, no new asset, no manifest/publisher change. New
`studioCatalogAssetService.loadClientTaxonomy()`, new `clientCategoryToCategory`/
`clientTagToCatalogTag` mapping functions (confirmed by direct inspection that only
`id/name/sortOrder/isActive` and `id/name/aliases/status` are ever read by the Design Library's own
filter/dropdown/tag-picker logic), new `useGeneratedDesignLibraryTaxonomy` hook with transparent
Firestore fallback on load failure. `CategoryManagementModal` (a real management flow) explicitly
repointed at the Firestore-backed `firestoreCategories`; `TagManagementModal` already used its own
independent Firestore hook, unaffected. One owner-approved narrow behavior change (via
`AskUserQuestion`): tag-modal search no longer matches each tag's `preferredWhen` guidance text
(server-only field, correctly excluded from the public snapshot) — name/alias matching, the primary
path, is unaffected. 7 new tests (155 total project-wide), rules 8/8 unaffected (no rules change),
functions/Portal/Studio builds exit 0. **No Functions redeploy or republish required for this
specific fix** — it activates on the next Studio restart, reusing an already-live asset. The
`createdAt`-ordering fix still needs its own redeploy + republish.

**Update (2026-07-24):** owner directed starting a separate development-only Firebase Debug panel
(Ctrl+Shift+F, `fresh-prints-dev`-only, development-build-only) to capture and attribute real Firebase
activity before guessing at the card-refresh bug, the ordering-reshuffle-on-save bug, or the ~1,300-read
spike root causes. Explicit instruction: build the tracker and run the diagnostic workflow, do not
assert any root cause from code-reading alone. Implemented:
- Extended the existing shared tracer (`packages/shared/src/utils/firestoreUsageTrace.ts`, not a new
  parallel framework): write tracking (`traceFirestoreWriteStart/Complete`), callable tracking
  (`traceCallableStart/Complete`), Storage-asset tracking (`traceStorageAssetStart/Complete`,
  sanitized `assetClass` strings only — never real paths/signed URLs/tokens), auto route-change
  events, and action-grouping (`startFirebaseTraceAction`/`endFirebaseTraceAction`/
  `withFirebaseTraceAction`). `getFirestoreUsageTraceSnapshot()` extended to expose
  `writes/callables/storageAssets/sessionStartedAtIso/routesVisited`.
- New `firebaseDebugPanelGate.ts` (shared): `fresh-prints-dev`-only + development-build-only gate,
  mirroring the existing `wipeOperationalTestData` allowlist pattern. Per-app wiring
  (`firebaseDebugPanelStudioGate.ts`/`firebaseDebugPanelPortalGate.ts`) attaches zero listeners and
  renders nothing when the gate is false, so production builds are unaffected.
- New `firebaseDebugReport.ts` (shared, pure, no I/O): turns a trace snapshot into a structured report
  (totals, byAction/byRoute/byCollection/byCallable, storage cache-hit/miss/fallback breakdown,
  fallbacks, errors, full event list, an explicit accuracy disclaimer) for the panel's Copy Debug
  Report button and for later analysis.
- New Ctrl+Shift+F shortcut + visibility hooks and a dark-overlay panel UI (live-polling, Reset, Copy
  Debug Report, Close) built per-app (`apps/studio/.../features/firebase-debug/`,
  `apps/portal/features/firebase-debug/`), mounted at each app's shell
  (`AppShell.tsx`/`app/providers.tsx`) with a first-activation toast.
- Wired real instrumentation into: both apps' generated Storage catalog-asset fetch layers
  (`studioCatalogAssetService.ts`/`portalCatalogAssetService.ts` — cache hit/miss/bytes/contentVersion,
  sanitized asset-class labels only), Studio's `designService.updateDesign` Firestore write, and
  `DesignLibraryPage.tsx`'s save-completion path wrapped as a `"Save design"` action. Callable-site
  wrapping (35+ `httpsCallable` call sites across both apps) was deliberately deferred as
  out-of-scope-for-this-pass rather than blanket-wrapped without evidence of which callable matters.
- Found and fixed one defect during review: Studio's `AppShell.tsx` originally called
  `setFirestoreUsageTraceContext(...)` directly in the render body (a React purity violation, not
  present before this pass) to guarantee route-context ordering before child mount-effects; corrected
  to `useLayoutEffect` (same intended ordering guarantee, without violating render purity).
- 17/17 focused tracer/report/gate/formatting tests pass (8 existing + 9 new; one existing test
  updated to locate events by kind instead of a hardcoded array index, since route changes now also
  emit trace events). Did **not** fix the card-refresh bug, the ordering-reshuffle bug, or the read
  spike — those remain unconfirmed hypotheses pending the owner's live diagnostic run.
- Repo-wide `tsc -p apps/studio/tsconfig.json` remains blocked by the pre-existing, unrelated TS5103
  `ignoreDeprecations` issue (confirmed via `git stash` to predate this pass); relied on
  `npx tsx --test` plus manual type review instead, consistent with this goal's established practice
  for that known limitation.
- This environment has no Electron/browser automation tooling, so the required 10-step diagnostic
  workflow (start Studio idle → open Design Library → search/filter → open a design → edit background
  color → save → return to Design Library → confirm card refresh → confirm createdAt ordering → idle
  5 minutes) could not be run here. **Owner action required:** run that workflow in Studio with the
  panel open (Ctrl+Shift+F), enable tracing if prompted, then use Copy Debug Report and share the JSON
  so the four required findings (card-refresh cause, ordering-reshuffle cause, per-spike attribution,
  remaining safe-to-migrate reads) can be derived from real captured data rather than guessed.

**Update (2026-07-24):** owner reviewed the panel and correctly found it not yet ready for retest:
callable tracing wasn't wired to real call sites, and write tracing covered only one Studio file
(`designService.updateDesign`). Required, before any owner checkpoint: centralized callable/write
tracing across Studio and Portal, instrumentation kept in services/hooks (never components) per
`09-coding-standards.md`, each event capturing route/action/service/operation/success-failure/
duration/sanitized counts, no document contents or payloads ever recorded, tests proving callables
and writes appear in the report, and a re-run of focused tests/builds. Implemented:
- Extended the tracer schema with `durationMs`/`success` on write/callable-complete events (measured
  by the calling wrapper, not inferred).
- New shared wrapper primitives `runTracedCallable`/`runTracedWrite` (in `firestoreUsageTrace.ts`) that
  measure duration, record success/failure, and never accept payload/document values as metadata —
  only safe descriptive fields (collection, path pattern, source, action).
- New per-app `callTracedFunction` factories (`apps/studio/.../config/tracedCallable.ts`,
  `apps/portal/lib/firebase/tracedCallable.ts`) — drop-in replacements for raw `httpsCallable(...)`
  construction, so each call site's diff is mechanical (one line) while still routing through the
  tracer. Both are thin service-layer helpers, never imported by a component.
- Converted **every** real callable call site across both apps (32 files: 22 Studio, 10 Portal;
  confirmed via `grep -rln "httpsCallable(" apps/studio/src apps/portal --include="*.ts"` returning
  only the two `tracedCallable.ts` wrapper files themselves afterward). Two Portal call sites
  (`customerUploadService.finalizeImage`/`finalizeZip`) needed a custom callable `timeout` that
  `callTracedFunction` doesn't expose, so they call `runTracedCallable` directly instead — still fully
  traced, payload still excluded from metadata. Existing error-mapping try/catch wrappers (e.g.
  `portalAuthService.getCallableErrorMessage`) were preserved unchanged; only the invocation mechanism
  changed.
- Wired `runTracedWrite` into every remaining Firestore write in the domains the owner named
  (startup/globally-mounted behavior, Design Library, design editing, print requests, show
  allocations): `designService.ts` (5 new sites: create/AI-review/catalog-approval/reopen/archive/
  restore — `updateDesign`'s existing wiring left as-is), `catalogTagService.ts`, `categoryService.ts`,
  `printRequestService.ts` (including two `runTransaction`s with `writeCount: 2`, verified against the
  actual `transaction.set` calls in each, not guessed), `upcomingShowService.ts` (including two
  `writeBatch`es with `writeCount` computed from the actual batch composition), `showQueueSettingsService.ts`,
  `staffInboxAckService.ts`, `staffInboxAlertDeliveryService.ts`.
- Enriched the report/panel: `byCallable` now shows success/failure counts and average duration;
  new `byWrite` breakdown (by write kind: count, success/failure, average duration, collections
  touched) added to both the report schema and both apps' panel UI.
- 4 new focused tests for the wrapper primitives (`firestoreUsageTraceWrappers.test.ts`), 2 existing
  report tests updated for the new `byCallable`/`byWrite` fields — 21/21 focused tracer/report/gate/
  formatting tests pass.
- Reviewed every converted file directly (not just trusted the implementing pass's self-report):
  confirmed zero remaining raw `httpsCallable(` usage outside the two wrapper files; confirmed
  `writeCount` values on multi-doc batch/transaction writes against the actual code rather than
  assumed; confirmed zero tracing calls exist in any `.tsx` component file (coding-standards layer
  rule respected — tracing lives in services only); spot-checked that no document IDs, customer data,
  or write/request payloads leak into any trace metadata.
- Ran the full project-wide focused test suite (not just the tracer files): Studio 358/363 pass
  (5 pre-existing, unrelated DPI/print-request-sizing failures, confirmed via `git stash` to predate
  this pass — actually improved from 13 failing at the stashed baseline), Portal 160/160 pass, shared
  package 809/810 pass (1 pre-existing, unrelated `firestore.rules` alignment-test failure tracking an
  already-dirty, unrelated 5-line `firestore.rules` diff from an earlier pass in this same goal — not
  touched by this task). No new test failures were introduced by this pass.
- Still not done, deliberately out of scope for a diagnostics-only task: no fix attempted for the
  card-refresh bug, the ordering-reshuffle bug, or the read-spike root cause. No deploy, redeploy,
  republish, or `rebuildCatalogSnapshots` run.

**Update (2026-07-24 — separate Studio debug window):** owner reported the in-renderer overlay blocked
navigation during the required live diagnostic. Added and formally reviewed a narrow Wave C
amendment because cross-renderer state required a new IPC boundary. Studio now opens a singleton
development-only Firebase Debug `BrowserWindow` on Ctrl+Shift+F. The main renderer remains the
authoritative trace-session owner; a typed preload API publishes sanitized snapshots through an
Electron-main broker, and reset/enable-disable commands return to the same main-renderer session.
Electron main independently gates on unpackaged runtime, exact `fresh-prints-dev`, and retained
main-window sender; it restores/focuses an existing window, clears the reference on close, permits
reopen without clearing the session, and closes the debug window with the main app. The debug
renderer mounts no normal Studio routes, so main route/action attribution is preserved. Portal keeps
its existing in-page panel. Focused debug/tracer suite 34/34 passed; Studio Vite renderer/main/preload
build passed; changed-file ESLint and diff check passed; Portal override typecheck passed. The
repository-standard typecheck command still hits the pre-existing TS5103 configuration issue, and
Studio's approved override reports only the existing unrelated errors documented below. Portal build
was inconclusive due to the command timing out at 124 seconds without output. No deploy, republish,
`rebuildCatalogSnapshots`, production action, or diagnosis/fix of the three owner-reported issues.

**Update (2026-07-24 — live-report verified corrections):** the owner capture proved two defects.
First, report schema v1 labeled SDK operation count as `reads`; schema v2 now reports
`readOperations`, `documentsReturned`, `approximateBillableDocumentReads`,
`listenerInitialDocuments`, and `listenerUpdateDocuments`. Approximate billing applies returnedCount
and the one-document minimum to completed one-shot queries and initial listener results, while the
disclaimer explicitly excludes index-entry charges and server-side reads. Action/route/collection
tables use the same terminology. Second, direct inspection proved this was current-code behavior, not
just a stale build: `useCategories`, `useCatalogTags`, and `useDesigns` ran unconditionally beside the
generated taxonomy/catalog requests. Added explicit enabled policies: a healthy normal ready browse
starts zero legacy category/tag/ready-design queries; taxonomy Firestore fallback starts only after
verified taxonomy asset failure; ready-design fallback remains bounded and now runs through a tested
generated-rejection sequencer; archived mode keeps its approved Firestore paths; category management
explicitly loads full categories only when opened. Focused suite 30/30,
Studio renderer/main/preload build, Portal override typecheck, changed-file ESLint, and diff check
pass. No deployment, republish, rebuild, production action, or unrelated bug fix.

**Update (2026-07-24 — failed retest/runtime-path audit):** owner still saw the exact pre-gate
1,221-document pattern with generated requests and no fallback event. Exhaustive caller search found
one routed `DesignLibraryPage`; no second page/selection-mode caller exists. The current initial
policy was already false for all legacy hooks, including loading/remount, and there was no Studio
Vite/Electron process running at inspection time. The freshly built local renderer contains the new
gate code, while a packaged or already-running Studio does not consume local `dist` changes. This
makes stale runtime the verified leading explanation for that capture, but the implementation was
also hardened: generated taxonomy now uses explicit loading/ready/failed/inactive status (never a
default-true unavailable boolean); only terminal `failed` enables taxonomy fallback; ready fallback
checks mount generation/cancellation before starting, preventing Strict Mode's cleaned-up first mount
from launching a stale fallback. Added generated success/failure/fallback trace events with visible
revision marker `generated-first-v3`. Focused tests cover loading, success, Strict Mode remount, route
remount, stale-mount cancellation, and terminal-failure-only fallback: 36/36 pass. Studio
renderer/main/preload build, Portal override typecheck, changed-file lint, and diff check pass. The
built bundle `index-Brv-ShB4.js` contains four `generated-first-v3` markers. No deployment,
republish, rebuild, production action, or unrelated bug fix.

**Update (2026-07-24 — actual generated asset failure fixed):** the clean v3 report proved both
generated families reached terminal failure before fallbacks. Reproduced all four exact live objects
through Studio's real Electron-main `fetchCatalogAssetJson` function plus the real shared parsers:
bucket `fresh-prints-dev.firebasestorage.app`, host `firebasestorage.googleapis.com`, taxonomy
manifest `generated/catalog-reference/manifest.json`, client snapshot
`generated/catalog-reference/client/v8-1a810751ceb2b381.json`, Portal manifest
`generated/portal-catalog/manifest.json`, ready index
`generated/portal-catalog/v40-4d50a5ac0c97ab21/studio/ready-index.json`; all HTTP 200 and all parsers
pass. One shared renderer cause was confirmed: after successful URL resolution, IPC, allowlist,
HTTP, main-process JSON parse, and before shared schema parsing, the context-isolated renderer called
Node-only `Buffer.byteLength`, which is unavailable with Node integration disabled. Replaced it with
browser-safe `TextEncoder`. Added sanitized transport diagnostics for URL construction, IPC,
allowlist, HTTP request/status, response size, JSON parse, shared schema parse, manifest path, and
ready-index path; storage completion events now include success/failure, failureCode, failureStage,
HTTP status, duration, and assetClass without URLs/tokens/bodies. Removed the normal taxonomy
Firestore fallback entirely: generated failure shows unavailable; category/tag management retains
intentional Firestore access. Bounded ready-design fallback remains. Focused transport/parser/policy
suite 39/39, Studio build, Portal override typecheck, lint, and diff check pass. Live exact-path
main-fetch verification 4/4 passes. No deploy, republish, rebuild, or production action.

**Update (2026-07-24 — debug-window monitor placement):** new Firebase Debug windows now use
Electron `screen.getDisplayMatching(mainWindow.getBounds())` and center within that display's work
area, including negative-coordinate and smaller displays. Existing open debug windows remain where
the owner placed them and are only restored/focused on repeated shortcuts. Focused placement/lifecycle
tests 7/7, Studio renderer/main/preload build, changed-file lint, and diff check pass.

## Allowed Actions
Read-only review; install Java and run the committed emulator rules test; make narrow local fixes if
verification finds a defect; inspect deployed Cloud Functions logs via `firebase functions:log`;
verify public generated assets and rule boundaries via unauthenticated HTTPS reads (including via a
standalone Node script using the real shared parsers, to distinguish server/asset-side failures from
browser-only failures like CORS); amend the existing Wave C Plan/Review for owner-approved narrow
numeric-budget decisions or new bounded generated assets; apply implementation corrections
(deterministic addressing, path templates, pagination ordering, unsafe-fallback removal) already
implied by the approved architecture without a new amendment; ask the owner a narrow question when no
correct bounded implementation option exists rather than inventing an incomplete one; prepare (but not
apply) a bucket CORS configuration change for explicit owner approval.

## Forbidden Actions
Firebase Functions/rules/index deployment; Portal/App Hosting deployment; snapshot
coordination-document initialization; further snapshot publication/retry; migration/backfill;
production deployment or production data changes; manual mutation of
`snapshotPublicationState/*` documents or `generated/**` Storage objects; running the controlled
design import; requesting another broad owner QA pass before a real browser-based retest; applying
any bucket CORS configuration change without explicit prior owner approval.

## Next Required Step
Owner: the four changed Functions are already deployed to `fresh-prints-dev` (pass-2 authorization).
(1) Fully close and restart Studio (`npm run dev:studio` from this checkout); (2) fully restart the
local Portal dev server and tunnel (`npm run dev:portal`, `npm run tunnel:portal` — no App Hosting).
Then run the consolidated owner cost test (Tests A-H) in
`docs/workflow/reviews/2026-07-25-comprehensive-firestore-eradication-pass-2-report.md` /
the final assistant checklist: closed baseline, Portal idle, catalog navigation + design detail,
create + 4 adds, request detail cold/repeat, queue with deliberate double-click, Studio workspace
sweep + idle, controlled known-request deletion twice. Capture Firebase Debug reports, Console
minute buckets with padding, and Query Insights before/after for each. The previously-pending R-015
dynamic AND-tag narrowing check can be folded into the catalog step of the same session.

## DONE
no

## Last Completed Step
2026-07-25 - Comprehensive Firestore spike eradication: narrowed an owner-issued 12-task/40-test audit
prompt to five evidence-backed fixes after full required reading and a parallelized four-pass
operation inventory across Portal/Studio/Functions
(`docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-pre-implementation-report.md`).
Implemented under a self-reviewed Plan/Review amendment (`approved_with_changes`): (1) Studio AI
Review's category filter now reads the existing generated taxonomy snapshot instead of Firestore; (2)
Studio per-request delete/archive reconciles locally instead of a full unbounded list + N+1 reload,
new pure `reconcileDeletedOrArchivedRequest` util with 4 new tests; (3) Portal's `createPrintRequest`
no longer unconditionally rereads the customer profile, verified safe against the one UI reader of the
touched field; (4) added a transactional idempotency guard to `onPrintRequestItemCreated`/
`onShowAllocationCreated` against CloudEvent redelivery double-counting, a correctness gap not
previously identified; (5) removed a redundant third `buildPreview()` execution in
`deleteEligiblePrintRequest`, the most likely actual cause of the owner's reported single-request
deletion read spike (correcting the task prompt's own assumption that `wipeOperationalTestData` was
responsible — that tool's separate, real full-scan defect is documented but deferred as
lower-priority/dev-only). All verification (4 new tests, adjacent regression suites, Functions build,
Portal typecheck/build, full Studio build, changed-file lint, diff check) passes; 5 pre-existing
unrelated DPI-sizing test failures confirmed via `git stash` to predate this pass. No deploy,
republish, rules, or production action occurred. Full report:
`docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-test-report.md`.
2026-07-24 - Closed the callable/write instrumentation gaps the owner found in the prior Firebase
Debug panel pass. Added `durationMs`/`success` to write/callable-complete trace events; new shared
`runTracedCallable`/`runTracedWrite` wrapper primitives (never accept payload/document values,
service-layer only); new per-app `callTracedFunction` factories so callable call sites convert with a
one-line diff. Converted every real callable call site across both apps (32 files) — confirmed via
grep that zero raw `httpsCallable(` usage remains outside the two wrapper files. Wired `runTracedWrite`
into every remaining Firestore write in Design Library, design editing, print requests, show
allocations, and staff inbox (8 Studio service files), verifying multi-doc batch/transaction
`writeCount` values against actual code rather than guessing. Enriched the report/panel with
success/failure/average-duration on `byCallable` and a new `byWrite` breakdown. 21/21 focused tracer
tests pass (4 new); reviewed every converted file directly rather than trusting the implementing
pass's self-report, confirming zero tracing calls in any `.tsx` component (coding-standards layer rule
respected) and zero payload/document leakage into trace metadata. Ran the full project-wide focused
suite: Studio 358/363 (5 pre-existing unrelated DPI-sizing failures, confirmed via `git stash` to
predate this pass), Portal 160/160, shared 809/810 (1 pre-existing unrelated `firestore.rules`
alignment failure) — no new failures introduced. Did not fix the card-refresh bug, the
ordering-reshuffle bug, or attribute the read spike; did not deploy, redeploy, republish, or run
`rebuildCatalogSnapshots`.
2026-07-24 - Built the development-only Firebase Debug panel (Ctrl+Shift+F,
`fresh-prints-dev`-only + development-build-only) per owner instruction, to capture real Firebase
activity before diagnosing the card-refresh bug, the ordering-reshuffle-on-save bug, and the
~1,300-read spike. Extended the existing shared tracer (writes/callables/Storage-asset requests/route
changes/action-grouping — no new parallel framework), added a pure report formatter, per-app
dev/project gates, shortcut + panel UI for both Studio and Portal, and wired real instrumentation into
both apps' generated Storage catalog-asset services plus Studio's design-save write path and Design
Library save action. Found and fixed one render-purity defect during review (a `setFirestoreUsageTraceContext`
call in Studio's `AppShell` render body, corrected to `useLayoutEffect`). 17/17 focused tests pass (9
new). Did not fix either suspected bug or attribute the read spike — those require the owner's live
10-step diagnostic run and Copy Debug Report output, per explicit instruction not to guess. Did not
deploy, redeploy, republish, or run `rebuildCatalogSnapshots`.
2026-07-24 - Closed the taxonomy read gap surfaced in the prior pass: converted
`DesignLibraryPage.tsx`'s normal-mode `categories`/`catalogTags` to the existing generated client-safe
taxonomy snapshot (no new asset, no redeploy/republish needed), keeping `CategoryManagementModal`/
`TagManagementModal` on full Firestore-backed data since they're real management flows. Confirmed by
direct inspection that only `id/name/sortOrder/isActive`/`id/name/aliases/status` are ever read by
Design-Library-facing consumers. One owner-approved narrow behavior change (tag search no longer
matches `preferredWhen` guidance text). 7 new tests (155 total), rules 8/8 unaffected, all builds
exit 0. Did not deploy, redeploy, republish, or run the controlled import.
2026-07-24 - Owner republished generation 38, validated the live asset (correct at the time), then
ran Studio QA and found the catalog reshuffled on unrelated activity plus ~1,300 Firestore reads.
Diagnosed the ordering defect (generated index used `updatedAtMs`, bumped by request/show/edit
writes) and corrected it to owner-decided `createdAtMs` ordering, after confirming via direct
repository investigation that `createdAt` is written unconditionally on every design-creation path
and is immutable after creation (Firestore rules enforce this) — no backfill needed. Attributed the
~1,300 reads via code inspection to `useCatalogTags`/`useCategories`, both pre-existing and
unconditional on Design Library mount, not a new regression; surfaced (did not fix) a real gap where
`useCategories()` should already use the generated taxonomy per the original Plan. 10 new tests (148
total), rules 8/8 unaffected, functions/Studio builds exit 0. Did not deploy, redeploy, republish, or
run the controlled import.
2026-07-24 - Completed the Studio generated-catalog consumer: `useGeneratedReadyDesigns` hook,
`DesignLibraryPage.tsx` wiring (normal ready browse sources `designs` from the generated hook;
archived mode/selection-mode unaffected; bounded Firestore fallback on generated-index failure only;
edit/archive apply local patches; detail always re-fetches authoritative Firestore data), Electron
IPC `catalogAsset` bridge, `studioCatalogAssetService`. Extracted pure mapping/validation helpers to
Firebase-import-free modules for direct testability (`generatedReadyDesignMapping.ts`,
`firebaseStorageDownloadUrl.ts`). 19 new/updated tests this pass (138 total in the full relevant
suite), rules 8/8 (added and proved coverage for the new Storage path), functions/Portal builds and
full Studio `vite build` all exit 0, lint clean except one confirmed pre-existing unrelated finding.
Studio's repo-wide `tsc` remains blocked by the documented pre-existing TS5103 issue; the established
override shows zero errors in any file this pass touched. Developer runtime read-trace verification
could not be performed (no Electron/browser automation tooling, no active Studio session) — disclosed
honestly with a manual test script provided instead. Did not deploy, redeploy, republish, or run the
controlled import.
2026-07-23 - Completed remaining Wave C local implementation and available automated verification.
Stopped before dev deployment/initialization/publication at the required human checkpoint.
2026-07-23 - Claude continued the goal: installed a user-scoped portable Java 21 JDK (no admin
rights), ran the committed rules emulator suite (added two missing narrow assertions for
`update`/`delete` denial on coordination docs and explicit authenticated-role AI-prefix denial;
6/6 pass), reviewed and classified all 24 npm audit findings (none introduced by Wave C; `sharp`
EXIF DoS flagged as R-012, not a deployment blocker), reconfirmed deployment/initialization/
trigger/rollback procedures unchanged, and re-ran affected builds/lint/diff checks (all exit 0).
Stopped before dev deployment/initialization/publication at the required human checkpoint.
2026-07-23 - Owner approved and ran first-stage dev deployment (Functions + rules) and, ahead of
approved order, the trigger stage. First `rebuildCatalogSnapshots` invocation failed twice (HTTP
500). Claude diagnosed via `firebase functions:log`: proven root cause is
`snapshot-asset-budget-exceeded` on the AI reference snapshot at the real ~1,122-tag dev corpus
(measured ~284 KB vs 256 KiB budget; client snapshot at ~161 KB stays under budget). No trigger
fired (no source writes occurred). Applied a narrow, reversible fix mapping the internal build error
to a safe `failed-precondition`/stable-code `HttpsError` in `rebuildCatalogSnapshots` only (does not
touch budgets, sharding, or the public/private contract); added regression tests (dev-scale fixture
+ error-mapping, 4 new tests). Did not fix the underlying budget/sharding conflict — flagged as
R-013, requiring an explicit owner/Review decision. All affected verification re-run (rules 6/6,
functions build, Portal typecheck/build, Studio build, 16/16 focused tests, lint, diff check — all
exit 0). Did not redeploy, retry initialization, or touch live Firestore/Storage state.
2026-07-23 - Owner approved R-013's remediation: raise only the AI-private reference snapshot budget
to 512 KiB (no sharding, no other budget change). Amended the existing Wave C Plan (new architecture
amendment section) and Formal Review (new amendment verdict: approved) rather than reopening
planning; amended ADR-FP-120 in place. Implemented `AI_CATALOG_REFERENCE_MAX_BYTES = 512 * 1024`,
`PUBLIC_ASSET_MAX_BYTES` (renamed, value unchanged), and an 80%-of-512-KiB non-blocking diagnostic
warning in `publishCatalogSnapshots.ts` (scoped to the AI asset only; `publishPortal` untouched).
Measured the real dev-scale fixture at exactly 295,152 bytes (56.3% of new ceiling, under the 80%
warning). Added 9 new tests (15 total across the two affected test files; up from 6). Determined
`onCategorySnapshotSourceWritten`/`onTagSnapshotSourceWritten` (not just `rebuildCatalogSnapshots`)
need redeployment this time, since their shared `publishReference()` logic changed;
`onPortalCatalogSnapshotSourceWritten` does not. All verification re-run (rules 6/6, functions build,
Portal/Studio builds, 25/25 focused tests, lint, diff check — exit 0). Did not redeploy, retry
initialization, or touch live Firestore/Storage state.
2026-07-24 - After the R-013 redeploy, owner's retry surfaced a second confirmed failure (owner
provided the exact callable error verbatim): `generated/portal-catalog/manifest.json` measured 130.9
KB, 4.09x over its 32 KiB budget, because it enumerated a full Storage path per tag/category/
shard/bucket/page (`tagPaths` alone was 106,591 bytes, 79.5% of the total — reproduced and measured
in a new test). Opened R-014. Fixed by replacing enumeration with deterministic path templates and
bounded counts: new `PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION = 2` (manifest shape only; every
individual asset keeps schema version 1), new `portalCatalogPathTemplates()`/
`buildPortalCatalogManifest()` in `snapshotBuilders.ts` (pure, directly testable), `publishPortal`
and the Portal consumer (`portalCatalogAssetService.ts`) updated to resolve paths via templates
instead of array/record lookups. Kept a compact `existingShardKeys` list (~1 KB) so search-miss
behavior is unchanged; tag/category filter misses now rely on a Storage 404 instead of a
manifest-side existence check. Measured corrected manifest: 2,179 bytes (6.6% of budget, ~61x
smaller). Recorded as an implementation correction under the existing approved architecture — no
Plan/Review amendment needed (deterministic addressing for oversized assets was already the stated
principle). Added 5 new tests (35 total across affected suites) plus fixed one pre-existing test
whose fixture (`schemaVersion: 2`) became valid under the new manifest version. Determined
`onPortalCatalogSnapshotSourceWritten` (not `onCategorySnapshotSourceWritten`/`onTagSnapshotSourceWritten`)
needs redeployment alongside `rebuildCatalogSnapshots`, since only `publishPortal()` changed. All
verification re-run (rules 6/6, functions build, Portal typecheck/build, Studio build, 35/35 focused
tests, lint, diff check — exit 0). Did not redeploy, retry initialization, or touch live
Firestore/Storage state.
2026-07-24 - Owner redeployed both R-013/R-014 fixes and ran `rebuildCatalogSnapshots` exactly once.
Both families published successfully at generation 4 (`catalog-reference`:
`4-1a810751ceb2b381`; `portal-catalog`: `4-e0e5b3ae9fb69797`). Claude confirmed this live via
unauthenticated public HTTPS reads against the real Firebase Storage/Firestore REST endpoints (no
credentials needed for public paths): both manifests match the callable result exactly; AI asset
confirmed private (403 on read and metadata); client/Portal assets confirmed public; unauthenticated
write and coordination-doc read confirmed denied; representative Portal assets (Discover, recent
page, a real 45-design category filter, a category page, a card bucket at 2,238 bytes, a search
shard) all confirmed live and correctly addressed via the new templates. Orphaned v1–v3 client assets
from earlier failed attempts confirmed present and retained. Closed R-013 and R-014 in
RISK_REGISTER.md. Confirmed the exact Portal dev deployment command (`firebase deploy --only
apphosting --project fresh-prints-dev`) against `firebase.json` and `DEPLOYMENT.md`; confirmed the
generated-snapshot flag defaults to enabled and the rollback flag is unchanged. Re-ran Portal
typecheck/build, 35/35 focused tests, lint, diff check — all exit 0. Did not deploy Portal, retry
snapshot publication, or run the controlled import.
2026-07-24 - Owner ran local Portal QA against live generation-4 snapshots; recorded FAIL. Found: tag
modal showed the full ~1,122-tag taxonomy with no design counts and no zero-result exclusion;
searching "BEST" showed only 1 of 2 matches until Load more; Firestore Product Usage rose by
~3,600 reads. Diagnosed root causes precisely (not by guessing): `listApprovedTags()`'s generated
path had no bounded facet/count data source (the pre-Wave-C client-hydration-derived mechanism was
never replaced); its Firestore fallback queried the full `tags` collection unbounded; and
`listMatchingDesigns()` combined candidate ID sets via `intersect()` with no deterministic sort
before slicing into a page, relying on non-guaranteed Set/Firestore iteration order. Amended the
Wave C Plan and Formal Review (new asset + additive manifest field require an amendment per the
task's rule). Implemented: new compact `generated/portal-catalog/v{version}/filters/tags-facet.json`
asset (`buildPortalCatalogTagFacetSummary`, tags with ≥1 ready design + count, 256 KiB budget);
`filters.tagFacetPath` added to the manifest (additive, `PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION`
unchanged at 2); rebounded the Firestore tag fallback to a ready-design scan; extracted a pure
`planPortalCatalogSearchPage` that assembles the complete deterministically-ordered matching ID set
before pagination, fixing the exact reported "BEST" case (reproduced in a dedicated regression test).
Confirmed the new asset path needs no rules change (existing `generated/portal-catalog/{allPaths=**}`
wildcard already covers it; proved with a new rules test, 7/7 pass, was 6/6). Added 26 new/updated
tests across 5 files (77 focused tests total pass). Functions build, Portal typecheck, rules suite,
lint, and diff check all exit 0; `npm run build:portal` did not complete (hung, no error) — likely
local dev-server file-lock contention with the owner's own active Portal session, left undisturbed
rather than guessed at; typecheck already confirms compile-correctness. Determined redeployment scope
unchanged from the prior pass (`rebuildCatalogSnapshots`, `onPortalCatalogSnapshotSourceWritten`) plus
a required fresh republish (the currently-live generation-4 manifest lacks the new field). Did not
redeploy, republish, or run the controlled import; did not request further owner QA before the
required developer-controlled local retest.
2026-07-24 - Owner reported the Functions were already deployed (do not redeploy again this pass) and
asked for the remaining blockers cleared. Reviewed the prior pass's own reported work and found two
real defects it had not actually fixed: (1) the "bounded ready-design scan" Firestore fallback still
queried the entire `tags` and `designs` collections unbounded, no cache/limit/dedup at all; (2) search
pagination sorted candidate IDs alphabetically by design ID instead of the established "Studio-newest
first" customer-facing order (proven via the explicit code comment/convention in
`catalogService.ts`/`useCatalogDesigns.ts`). Investigated whether a correct, complete, bounded
Firestore fallback could exist for tag counts — concluded none does (full scan vs. ~1,122 count
queries) — asked the owner a narrow question rather than inventing an incomplete source; owner chose
to remove the Firestore fallback entirely for a graceful "unavailable" UI state. Implemented: removed
the fallback from `catalogService.listApprovedTags()`; added an `error` prop to
`CatalogTagFilterModal` for the unavailable state; added in-flight dedup to
`portalCatalogAssetService.listTagFacets()`; added new pure `portalCatalogBrowseOrder` in
`snapshotBuilders.ts` (newest-first, ID-descending tiebreaker) that every tag/category/search-term ID
list is now built from at publish time; reworked `planPortalCatalogSearchPage` to accept ordered
arrays and preserve relative order under intersection instead of re-sorting alphabetically. Also
corrected the prior pass's inconclusive Portal build report: re-ran without an artificial timeout
wrapper and confirmed `npm run build:portal` exits 0 (the build had already succeeded through
static-page generation when the tool's own 30-40s cap killed it previously — not a real failure).
Confirmed via `grep` that `portalCatalogAssetService.ts` has zero Firestore imports (structural proof
of zero Firestore reads on the generated path). Added 11 new tests (37 total for R-015; 88 total
project-wide focused tests). Disclosed honestly that no browser-automation tooling exists in this
environment to perform the required interactive developer-controlled retest, and provided a manual
test script instead. All automated verification re-run clean (functions build, Portal typecheck,
Portal build, rules 7/7, 88/88 focused tests, lint, diff check, Studio build — all exit 0). Determined
that `rebuildCatalogSnapshots`/`onPortalCatalogSnapshotSourceWritten` need a follow-up redeployment
since the owner's already-deployed version predates this pass's ordering fix and fallback removal.
Did not redeploy, republish, or run the controlled import.
2026-07-24 - Owner applied the corrected CORS config; generated Portal assets now load and "best"
search is fixed. New request: tag modal doesn't narrow after selection (unrelated tags stay visible
with stale global counts). Investigated the existing generated contracts and found the per-tag
design-ID list asset already published for search/filtering, plus existing card-bucket assets, are
sufficient to compute exact AND-narrowed counts with zero new generated assets and zero Firestore
reads (Option A). Implemented `portalCatalogAssetService.listNarrowedTagFacets` (intersects selected
tags' design-ID lists, tallies co-occurring tags from the matching cards' own `tags` field) with pure
extracted helpers `intersectDesignIdLists`/`computeNarrowedTagFacets`, and wired it into
`CatalogTagFilterModal` via a generation-guarded effect keyed on the selected-tag set. 7 new tests
(99 total). Verified the exact co-occurrence computation against live generation-9 data via a
standalone diagnostic script (christmas: 6 designs; disney co-occurs on 4, winter on 3, etc.) before
writing the tests. Typecheck/lint/diff-check clean; `npm run build:portal` blocked again by the
owner's `dev:portal` process re-holding `apps/portal/.next` (same contention as before, not a code
issue) — not re-requested to stop it again this pass since the fix doesn't require build
confirmation to review. Did not deploy, redeploy, republish, or run the controlled import.
2026-07-24 - Owner published generation 9 and ran local QA; still FAIL (tag modal unavailable,
"best" search 1-result/Load-more, ~2,700-2,800 more Firestore reads). Live-diagnosed via a Node
script using the real shared parsers that generation 9's assets are all correct outside a browser;
owner then supplied the exact browser CORS error, confirming the true blocker. Confirmed the exact
live bucket (`fresh-prints-dev.firebasestorage.app`; `.appspot.com` 404s) and found the repo's
existing CORS file/doc (from an unused, unrelated proof-download effort) targeted the wrong bucket
alias — corrected both. Independently found and fixed a second real defect:
`useCatalogDesigns.ts`'s search/multi-tag branch fell through to an unrelated unfiltered Firestore
page on any generated-asset failure; removed that fallback for search/multi-tag (now shows an
"unavailable" state, zero Firestore reads); normal browse's separately-approved fallback is
unchanged. Reviewed Studio's search/tag-filter code for parity: ordering, substring search
semantics, and tag-count scoping already correctly match Portal's existing documented conventions —
no defects found. `gcloud` unavailable in this environment; live CORS inspection command provided
for the owner/CI instead of guessed at. 46/46 focused tests pass (no new tests added — the fix is
inside an untested-by-convention React hook; its pure dependencies already have coverage), lint and
typecheck clean, diff check clean. Did not apply CORS, redeploy, republish, or run the controlled
import.

## Plan Path
- docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md

## Review Path
- docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md
- docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-phase-0-containment-review.md

## Test Report Path
- docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-phase-0-test-report.md

## Signoff Path
- pending

## Prior Goal Signoffs
- docs/workflow/reviews/2026-07-23-studio-inbox-default-landing-signoff.md (**approved**; owner PASS)
- docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-signoff.md (**approved_with_notes**; Wave C explicitly deferred)
- docs/workflow/reviews/2026-07-22-portal-seo-foundations-signoff.md (**approved_with_notes**; reaffirmed 2026-07-23 after ship commit `63140a5`)
- docs/workflow/reviews/2026-07-23-portal-how-to-faq-signoff.md (**approved_with_notes**; owner PASS)

## Prior Manual Checkpoint Path
- docs/workflow/reviews/2026-07-23-studio-inbox-default-landing-manual-checkpoint.md (**PASS** owner 2026-07-23)

## Tests Run For Active Goal
- Studio taxonomy read-gap closure pass: `npm run build --prefix functions` exit 0 (no functions
  changed); Portal typecheck exit 0; full Studio `vite build` exit 0; rules 8/8 unaffected (no rules
  change); 155/155 focused tests project-wide (7 new: `clientCategoryToCategory`/
  `clientTagToCatalogTag` mapping tests including direct integration with
  `buildCategoryFilterOptions`/`buildCatalogTagSuggestions`/`resolveCatalogTagCandidate`/
  `computeFacetedTagsForDraftSelection`); eslint clean on all changed files; `git diff --check` clean;
  Studio `tsc --ignoreDeprecations 5.0` override: zero errors in any file this pass touched.
- Studio ordering-correction pass: `npm run build --prefix functions` exit 0; Portal typecheck
  exit 0; full Studio `vite build` exit 0; rules 8/8 unaffected; 148/148 focused tests project-wide
  (10 new: `studioCatalogReadyOrder`/`buildPortalCatalogStudioReadyIndex` request/show/edit/new-design
  regressions x5, parser createdAtMs validation updates, mapping test field-rename update); eslint
  clean on every changed file; `git diff --check` clean. `npm run build:portal` not confirmed
  (owner's `dev:portal` running again, same recurring file-lock contention, not a code defect —
  Portal has zero code changes this pass). Studio `tsc --ignoreDeprecations 5.0` override: zero
  errors in any file this pass touched (28 pre-existing unrelated). Read attribution for the
  ~1,300 reads performed via direct code inspection only (no live Studio session/automation tooling
  in this environment).
- Studio generated-catalog consumer pass: `npm run build --prefix functions` exit 0; Portal
  typecheck exit 0; full Studio `vite build` (renderer+main+preload) exit 0; rules 8/8 (was 7/7 —
  added and proved coverage for `generated/portal-catalog/v{version}/studio/ready-index.json` under
  the existing wildcard, no rules change needed); 138/138 focused tests project-wide (19 new this
  pass: `generatedReadyDesignMapping.test.ts` x7 including a direct "BEST"-regression reproduction
  for Studio's own search path, `catalogAssetIpcChannels.test.ts` x3,
  `fetchCatalogAssetJson.test.ts` x3, `firebaseStorageDownloadUrl.test.ts` x6, plus manifest/parser/
  builder test updates for the new `studio.readyIndexPath` field); eslint clean on every
  new/changed file except one confirmed pre-existing unrelated `no-control-regex` finding in
  `downloadFirebaseStorageUrlToFile.ts` (verified via `git stash` to predate this pass); diff check
  clean. Studio's repo-wide `tsc --noEmit` blocked by the documented pre-existing TS5103
  `ignoreDeprecations` issue; `npx tsc --noEmit --ignoreDeprecations 5.0` (the established override)
  shows zero errors in any file this pass touched (28 pre-existing unrelated errors elsewhere).
  Developer runtime read-trace verification not performed — no Electron/browser automation tooling
  and no active Studio dev session in this environment; disclosed honestly, manual script provided.
- Dynamic tag-facet narrowing pass: Portal typecheck, 99/99 focused tests project-wide (7 new:
  `intersectDesignIdLists` x4, `computeNarrowedTagFacets` x7 minus overlap — see test file for exact
  list), eslint on all 4 changed files, diff check — all exit 0; `npm run build:portal` blocked by the
  owner's `dev:portal` process holding `apps/portal/.next` (same contention as the prior pass, not a
  code defect) — not re-run this pass; live diagnostic script against generation-9 data confirmed the
  exact co-occurrence computation (christmas: 6 designs, disney co-occurs on 4) before tests were written
- Bucket-CORS + unsafe-fallback pass: Portal typecheck, 46/46 focused tests (portalCatalogAssetService,
  catalogSearch, catalogNeedsFullClientHydrate, snapshotBuilders — no new tests added, hook-level fix
  has no existing hook-test harness in this repo), eslint on the changed hook, diff check — all exit 0;
  live diagnostic script against generation-9 Storage assets outside a browser (manifest/facet/search
  shard all parse correctly, "best" → 2 correct IDs) proved the CORS block was browser-only
- R-015 review-pass corrections: rules 7/7 (unchanged), functions build, Portal typecheck, Portal
  build (confirmed exit 0 — corrects prior inconclusive report), Studio build unaffected, 88/88
  focused tests (11 new: `portalCatalogBrowseOrder` x4, corrected/expanded search-pagination x7),
  lint, diff check — all exit 0
- R-015 remediation (first pass): rules 7/7 (was 6/6), functions build, Portal typecheck, Studio build
  unaffected, 77/77 focused tests (26 new/updated: tag-facet builder x7, manifest tagFacetPath x1,
  parser x5, search-pagination pure-function x10, catalogSearch count-carrying x2, rules-coverage x1),
  lint, diff check — all exit 0. `npm run build:portal` reported as not completing — later found to be
  a tool-timeout artifact, not a real failure (corrected in the review pass above)
- R-014 remediation: rules 6/6, functions build, Portal typecheck/build, Studio build, 35/35 focused
  tests (5 new: old-vs-corrected manifest size, projected-growth manifest size, template/writer
  parity, every asset family addressable, hash/strategy version constants), lint, diff check —
  all exit 0
- R-013 remediation: rules 6/6, functions build, Portal/Studio builds, 25/25 focused tests (9 new:
  budget constants, warning boundary x2, dev-scale fixture fits + no-warning, oversized-fixture
  hard-failure, Portal-budget-untouched), lint, diff check — all exit 0
- Post-incident: rules 6/6, functions build, Portal typecheck/build, Studio build, 16/16 focused
  tests (incl. 4 new: dev-scale budget fixture + 3 error-mapping tests), lint, diff check — all exit 0
- Rules emulator suite (`npm run test:rules`, Java 21) → 6/6 pass, exit 0; two narrow assertions added
- npm audit reviewed: 24 findings classified (1 critical/13 high/10 moderate); none introduced by Wave C
- Focused Phase 0 suites → 46/46 pass
- Changed Phase 0 file ESLint → exit 0
- `npm exec --workspace @fresh-prints/studio -- vite build` → exit 0 (renderer, Electron main, preload)
- Authenticated Electron: 20 Print Requests tab transitions + Back/Forward, 0 throttle warnings,
  0 errors, responsive; Inbox 60-second idle 0 events and listeners 7 -> 7
- Corrected authenticated Electron: all four Empty/All → Active/Stale cases passed; one route commit
  per explicit click; Back/Forward made zero normalization commits; no reversion/read regression
- Studio `tsc` remains blocked by pre-existing TS5103; CLI override reports unrelated existing errors
- Wave C snapshot/bounded-read suite: 69/69 pass
- Functions build, Portal typecheck/build, focused lint, Studio Vite build, diff check: exit 0
- Rules harness installed/committed; execution blocked by local `spawn java ENOENT` (exit 1)

## Files Modified By Active Goal
- See Wave C plan and Phase 0 test report for the full existing dirty-worktree scope.
- Latest remediation centers on Print Requests routing, trace attribution/logical pagination,
  taxonomy cache control, Phase 0 tests, and workflow records.
- Remaining Wave C implementation and exact deployment/rollback/QA record:
  `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-dev-deployment-checkpoint.md`

## Goal Order
(Reconciled 2026-07-29 against `docs/project/ROADMAP.md`'s authoritative pre-production sequence
table — this list had drifted; ROADMAP.md is the source of truth if the two ever disagree again.)

1. portal-seo-foundations - **DONE**
2. portal-how-to-faq - **DONE**
3. firestore-usage-efficiency-wave-c - **DONE** (2026-07-27, PASS WITH NOTES; owner PASS — the
   `owner_qa` block above/`## Next Required Step` is superseded prior-state detail, not current)
4. studio-inbox-default-landing - **DONE** (approved 2026-07-23)
5. portal-google-analytics - **DONE** (2026-07-27, signed off PASS — inert architecture merged, no
   real Measurement ID/GA4 property configured)
6. portal-print-request-prelaunch-stability - **DONE** (2026-07-29, approved; owner QA v18 PASS)
7. studio-test-data-print-limit-wipe-audit - **DONE** (2026-07-29, approved; owner PASS)
8. preproduction-static-analysis-cleanup - **DONE** (2026-07-29, approved; owner QA not required —
   `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-signoff.md`)
9. customer-upload-oversized-image-normalization-and-processing-performance - **DONE** (Workstream A
   only; 2026-07-29, approved; owner QA not required —
   `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-signoff.md`)
10. Increase the MB limit for custom-request reference images - **DONE** (2026-07-29, approved —
    40 MB/file live in `fresh-prints-dev` at every layer, 8 files unchanged, 320 MB combined ceiling
    active; owner QA FAIL → Amendment 1 (Cloud Functions deployment gap, root-caused, fixed via
    scoped redeploy) → owner re-QA PASS —
    `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-signoff.md`)
11. customer-upload-oversized-pixel-normalization-and-processing-timeout-followup - **DONE**
    (2026-07-30, approved_with_notes; owner QA PASS WITH NOTES — oversized-canvas uploads take
    proportionally longer at the trim stage but always complete, never stuck; deployed to
    `fresh-prints-dev` — `finalizeCustomerUpload`, `retryCustomerUploadProcessing` only — signoff
    `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-signoff.md`)
12. catalog-image-derivative-storage-consolidation - **DONE — closed_by_owner_after_inventory**
    (2026-07-30). Plan + Formal Review complete (`approved_with_changes`). Two rounds of owner
    sample review converged on 1024×1024 WebP Q82, no separate thumbnail. A dry-run-only,
    owner/admin-restricted `inventoryCatalogImageStorage` callable was built, independently
    security-reviewed, and deployed to `fresh-prints-dev`; a dev-only Studio invocation panel was
    added after DevTools bare-import invocation failed. **Owner ran the real inventory**: 87
    designs scanned; originals 81 objects / 980,807,863 bytes (~97.66% of catalog Storage);
    thumbnails 87 objects / 2,820,654 bytes; previews 81 objects / 20,676,202 bytes; display
    derivatives 0/0; zero orphans, zero missing objects, zero promotion-cool-off duplicates, zero
    purge-policy violations. **Owner decided to stop before implementation** — the addressable
    byte pool (thumbnails+previews, ~22.4 MB) was too small relative to the required backfill,
    consumer cutover, and grid-bandwidth increase (~86 KB vs ~23 KB/8-card grid) to justify
    completing the migration. This is an evidence-based decision, not a failed implementation.
    Interrupted mid-Implement scaffolding (`displayPath` type fields, migration-only constants,
    unused helper functions, their dedicated tests) was inspected file-by-file against baseline
    and removed narrowly, with zero unrelated pre-existing work touched. Retained: the dry-run
    inventory tool (callable + pure classification logic + dev-only Studio panel), all Goal #12
    workflow artifacts, and one generalized (no-longer-Goal-#12-specific) regression test
    protecting `originalPath`-only production export behavior. Verification: Functions build,
    Portal typecheck, Studio build, repo lint, changed-file lint, `git diff --check` all exit 0;
    53/53 retained focused tests pass. Nothing migrated, backfilled, deployed beyond the one
    diagnostic callable, or deleted; production untouched throughout —
    `docs/workflow/plans/2026-07-30-catalog-image-derivative-storage-consolidation-plan.md`,
    `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-review.md`,
    `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-real-dev-inventory-report.md`,
    `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-signoff.md`)
13. production-release - **ACTIVE** — no longer blocked (Goals #9–#12 all signed off/closed);
    Plan + Formal Review phase started 2026-07-30; production approval required before any
    implementation or deployment

**Owner queue decision (2026-07-29):** goals #9–#12 (the four image-related goals) may be coordinated
or worked in parallel where their product/security boundaries allow — see the Goal #9 Plan for the
originally-recommended coordination structure (separate managed goals vs. one goal with separated
workstreams), which now extends to #11 and #12 as well. `production-release` (#13) remains blocked
regardless of that structure until all four are signed off.

## Decision Log
- 2026-07-24 - Owner directed closing the surfaced taxonomy read gap. Confirmed by inspection that
  the Design Library's own filter/dropdown/tag-picker code never reads anything beyond
  id/name/sortOrder/isActive (categories) and id/name/aliases/status (tags), so the existing public
  client-safe taxonomy snapshot is a safe data source; management flows
  (`CategoryManagementModal`/`TagManagementModal`) correctly kept on full Firestore data. Asked the
  owner (via `AskUserQuestion`) whether to drop `preferredWhen`-based tag search matching (the one
  real behavior narrowing) rather than assume — owner chose to drop it. No new generated asset, no
  redeploy/republish needed for this fix.
- 2026-07-24 - Owner QA on generation 38 found catalog reshuffling on unrelated activity plus
  ~1,300 reads. Root cause: generated ordering used `updatedAtMs` (bumped by request/show/edit
  writes). Owner decided ordering must use immutable `createdAt` instead; confirmed via repo
  investigation that createdAt is unconditionally written and immutable post-creation — no
  backfill needed. Fixed the ordering field; attributed the reads to pre-existing, unconverted
  tag/category Firestore loads (not a new regression); surfaced but did not fix an already-approved
  Plan gap (categories should use the generated taxonomy). Redeploy + republish required again.
- 2026-07-24 - Completed the Studio generated-catalog-assets implementation per the approved Plan
  amendment (Option B; IPC transport; owner-approved catalog-wide narrowing). Preserved every
  existing Studio behavior (search/category/tag/halftone/ordering/page-size/selection-mode) by
  reusing the exact same pure filter functions against a new data source, rather than rewriting
  Studio's filtering logic to match Portal's. Archived designs and detail/edit stay entirely
  Firestore-authoritative, unchanged. No Functions/Rules/CORS applied; redeploy of
  `rebuildCatalogSnapshots`/`onPortalCatalogSnapshotSourceWritten` plus one republish required
  before an owner Studio retest.
- 2026-07-24 - Owner-applied CORS fix confirmed working (assets load, "best" search fixed). New
  request: dynamic tag-facet narrowing after selection. Investigated whether existing generated
  assets suffice (Option A) vs needing a new generated index (Option B) — concluded Option A: the
  existing per-tag design-ID list asset (already fetched for search/filter) plus existing card
  buckets (already fetched to render results) give exact AND-narrowed co-occurrence counts with zero
  new assets, zero new fetch per candidate tag, zero Firestore reads. Implemented and unit-tested
  against a live-data-verified worked example. No Functions/manifest change — Portal-only fix.
- 2026-07-24 - Generation-9 owner QA still FAIL. Root cause was browser Storage CORS (confirmed by a
  live outside-browser diagnostic proving the assets/parsers are correct, then the owner's exact
  console error). Found the repo's existing CORS file/doc targeted the wrong bucket alias
  (`.appspot.com` vs the real `.firebasestorage.app`) — corrected. Also fixed an independent second
  defect: the search/multi-tag Firestore fallback (unrelated unfiltered pages) is now removed
  entirely in favor of a graceful unavailable state. Studio/Portal search+tag+ordering parity
  reviewed and confirmed already correct — no changes needed there. CORS application requires owner
  approval (bucket-config change); not applied this pass.
- 2026-07-24 - Review found the first-pass R-015 fix's Firestore fallback was still unbounded and its
  search fix used the wrong order (alphabetical instead of newest-first). Owner decided: remove the
  Firestore tag fallback entirely (no correct bounded alternative exists) for a graceful "unavailable"
  state. Fixed the ordering with a new pure `portalCatalogBrowseOrder`. Corrected an inconclusive
  Portal build report (was a tool-timeout artifact). Redeploy of the two Functions required again
  (owner's already-deployed version predates these corrections); republish and a real browser retest
  (no automation tooling available here) still required before further owner QA.
- 2026-07-24 - Owner Portal QA (post-publication) recorded FAIL: tag modal full-taxonomy/no-counts
  regression and search-pagination regression ("BEST"), plus a Firestore read spike. Diagnosed and
  fixed both regressions and the fallback read-bound gap; opened R-015 (not yet closed). New bounded
  generated asset + additive manifest field required a narrow Plan/Review amendment (approved).
  Redeploy + republish + developer-controlled local retest required before further owner QA.
- 2026-07-24 - Both snapshot families published successfully at generation 4, confirmed live via
  unauthenticated public reads. R-013 and R-014 closed. Portal consumer deployment
  (`firebase deploy --only apphosting --project fresh-prints-dev`) confirmed as the exact next
  action, gated on separate owner approval; controlled import remains gated behind the consolidated
  post-publication smoke.
- 2026-07-24 - R-014: second confirmed budget failure on `generated/portal-catalog/manifest.json`
  (130.9 KB, 4.09x over 32 KiB) from full path enumeration. Fixed via deterministic path templates
  (manifest schema v2 only) — implementation correction under the existing approved architecture, no
  new Plan/Review amendment. Corrected size 2.13 KB. R-014 opened, remains open pending live
  redeploy/retry confirmation.
- 2026-07-23 - Owner approved R-013's resolution: raise only the AI-private catalog-reference
  snapshot budget to 512 KiB, no sharding, no other budget/field change. Plan and Formal Review
  amended in place (not reopened); ADR-FP-120 amended. Implementation, an 80% non-blocking warning,
  and 9 new regression tests complete and locally verified. R-013 remains open pending live
  redeploy/retry confirmation.
- 2026-07-23 - First real dev `rebuildCatalogSnapshots` failed twice on
  `snapshot-asset-budget-exceeded` for the AI reference snapshot; proven deterministic at the real
  ~1,122-tag dev corpus. R-013 opened; requires owner/Review decision (shard AI snapshot, raise its
  budget, or reduce AI content) before `catalog-reference` can publish. Error-mapping fixed narrowly
  (not the budget conflict). No redeploy/retry/import performed.
- 2026-07-23 - Owner **PASS** on Studio Inbox default landing smoke; signoff **approved** (ADR-FP-119). Wave C remains the active managed goal.
- 2026-07-23 - Wave C snapshots, generated Portal search/Discover, bounded paging, design-ID
  dedupe, polling containment, rules, rollback flags, and deployment records implemented locally.
  69/69 tests pass; rules emulator execution awaits Java. Human checkpoint is active before any
  dev deployment or initial publication.
- 2026-07-23 - Owner passed all six corrected Print Requests checks. Phase 0 is
  `passed_with_notes`; note is Firebase dashboard rounding/reporting delay. Resumed reviewed Wave C
  implementation; deployment, initialization, publication, migration, and production remain gated.
- 2026-07-23 - Corrected owner finding: primary status tabs pass; remaining defect was Working
  Active/Stale reversion after Empty/All. Proved the deep-link reveal effect forced local filter back
  to All. Added canonical `workingFilter` URL ownership, explicit click precedence, history support,
  and compatible-selection fallback. Authenticated Electron and 46/46 tests passed; the subsequent
  owner retest passed all six checks.
- 2026-07-23 - Owner Wave C smoke failed on Print Requests Chromium navigation throttling/freeze.
  Reconciled Firebase rounded 34K/67.9% -> 36K/71.7% across the full run without misattributing it
  to quiet Inbox idle. Restored Wave C as active and parked the landing checkpoint unchanged.
- 2026-07-23 - Replaced Print Requests route writers with one URL authority. Authenticated Electron
  passed five tab cycles, empty/populated tabs, back/forward, and 60-second idle; 42/42 tests pass.
  This intermediate result was superseded by the corrected owner retest PASS.
- 2026-07-23 - Implemented Studio Inbox default landing; automated checks passed; paused for owner manual smoke.
- 2026-07-23 - Owner requested Studio default landing = Inbox. Parked Wave C (smoke checkpoint preserved). Started `studio-inbox-default-landing`; plan + review **approved**; Implement next.

## 2026-07-29 — `preproduction-static-analysis-cleanup`: implementation continued and verified, Test phase complete

Resumed after Codex's credits expired mid-Implement. Re-verified from scratch rather than trusting
the prior session's claims: `npm run build:studio` and `npm run lint` both already reproduced clean
(exit `0`/`0`) before this session made any edit, confirming Codex had already resolved all 29
TypeScript diagnostics and all 41 lint findings (31 errors, 10 warnings), including deep
implementation for the Formal Review's three binding conditions (bounded Show Queue read via a new
`useShowQueuePrintRequests` hook reading Working/Queued/Printing tabs and merging by ID; a shared
`getSharp()` lazy-loader using `createRequire`; and stable-ref/destructure-based fixes for all 10
hook warnings). Found and closed two verification gaps: (1) no test proved `sharp` stays unloaded
through Functions deploy discovery — added
`functions/src/lib/lazySharpDeployDiscovery.test.ts`, which requires the compiled `functions/lib/`
output and proves zero `sharp` cache entries after requiring the compiled index, non-zero only after
`getSharp()` runs, with instance-identity reuse on a second call; (2) one stale test-fixture
assertion in `assistedCreationAnswerDisplay.test.ts` still matched the *removed* enum literal's
semantics after the fixture was updated to a current valid value — corrected two regexes to match
the current labels while preserving original test intent. Full verification matrix (Portal
typecheck/build, Functions build, `git diff --check`, changed-file lint, 101/101 focused tests) all
exit `0`. Ran an independent Implementation Review against the real final diff (not either agent's
claims) — **APPROVED**, no residual defect, confirmed the only two `eslint-disable` additions in the
full diff belong to unrelated in-flight goals (`CatalogPageContent.tsx`,
`useShowProductionTimer.ts`) and were correctly left untouched. No manual owner QA checkpoint is
required — every behavior-sensitive hook warning had deterministic automated coverage. No
deployment, Firebase Rules/schema, dependency, or production action occurred. Test report:
`docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-test-report.md`.
Implementation Review: `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-implementation-review.md`.
Next: Signoff phase — update `references/project-chatgpt-handoff/CURRENT-STATE.md` and close the
goal; no further owner action is required before signoff.

## 2026-07-29 — `preproduction-static-analysis-cleanup` — DONE, signed off approved

Signoff created: `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-signoff.md`
— **approved**. No new implementation, deployment, or production action taken in this pass; this
step only formalizes completion of the Test-complete state recorded in the entry immediately above.
`docs/project/ROADMAP.md` goal #8 marked Done; Goal Order (below) reconciled against ROADMAP.md's
authoritative sequence, which had drifted out of sync in this file; `CURRENT-STATE.md` updated.

**DONE (this goal): yes.**
**Signoff Status (this goal):** approved — see signoff doc above.
**Active managed goal:** none (idle).
**Next queued managed goal:** `customer-upload-oversized-image-normalization-and-processing-performance`
(not started) — see Goal Order below.
**Owner-referenced items not yet in the queue:** a custom-request reference-image MB-limit increase,
and `catalog-image-derivative-storage-consolidation` — neither is recorded anywhere in this repository's
workflow artifacts as of this date; both need explicit scoping/placement before they can be started.

Wave C (`firestore-usage-efficiency-wave-c`) is independently marked **DONE** per `ROADMAP.md`
(2026-07-27, PASS WITH NOTES, owner PASS) — the large `owner_qa`/pending-deployment block earlier in
this file is superseded prior-session detail from before that closure and should not be read as
current status. This signoff pass did not touch Wave C.

## 2026-07-29 — `customer-upload-oversized-image-normalization-and-processing-performance` — Plan + Formal Review complete

Started per owner instruction (Plan and Formal Review only; no implementation). Owner also directed a
Goal Order update: two previously-unscoped items (a custom-request reference-image MB-limit increase;
`catalog-image-derivative-storage-consolidation`) are now recorded in `ROADMAP.md` and this file's
Goal Order as #10 and #11, sequenced after this goal (#9) and before `production-release` (#12, which
stays blocked until all three image-related goals sign off).

A research pass traced all three workstreams end-to-end with exact file/line citations (customer
uploads, Assisted Creation reference images, catalog original/preview/thumbnail derivatives).
Confirmed root cause for Workstream A: `functions/src/finalizeCustomerUploadZip.ts:282-330` processes
every image in a ZIP **sequentially** (plain `for...of` with `await` inside, no `Promise.all`/bounded
concurrency) — up to 100 images per batch, each up to 100 megapixels, inside one 540s/2GiB `onCall`.
This is the load-bearing evidence for the Plan's fix.

**Recommendation (independently confirmed during Review): three separate coordinated managed goals,
not one merged goal.** Zero file overlap exists between the three workstreams; they have materially
different risk profiles (A = pure performance fix; B = requires an owner MB-limit decision with no
existing target value anywhere in the repo; C = migration/consumer-inventory heavy, touches the
ADR-FP-120 generated-snapshot system and the existing `purgeArchivedDesignAssets.ts` retention
policy). This Plan implements Workstream A only; it formally scopes B and C (current-state evidence,
open questions, recommended next step) so their own future Plans don't need to re-derive the research,
but does not implement, deploy, or set a specific limit/migration decision for either.

Formal Review returned **approved_with_changes** — three binding required changes carried into
Implement, none requiring a Plan amendment: (1) aggregate the ZIP batch's `readyCount`/`failedCount`
from post-settlement results rather than mutating shared counters inside concurrent callbacks (closes
a real, if subtle, race-safety gap the Plan flagged but didn't fully resolve); (2) evaluate
reusing/relocating the existing Electron-independent `DerivativeConcurrencyQueue` pattern
(`apps/studio/electron/services/import/derivativeConcurrencyQueue.ts`) before writing a new bounded-
concurrency helper; (3) the new ADR-FP-123 must show explicit worst-case memory arithmetic, not just
assert a concurrency-ceiling number.

No implementation, deployment, or production action occurred. `docs/project/DECISIONS.md` was not yet
edited (ADR-FP-123 is reserved for Implement, not written during Plan/Review).

Plan: `docs/workflow/plans/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-review.md`
— **approved_with_changes**.

Next: Implement Workstream A only, treating the three required changes as binding, per the "Continue
Workflow" / "Managed Phase" command pattern already used for other goals in this file.

## 2026-07-29 — `customer-upload-oversized-image-normalization-and-processing-performance` — Implement + Test complete (Workstream A)

Implemented Workstream A only, per the approved Plan/Review; Workstreams B/C (#10/#11) and
`production-release` (#12) were not started. Replaced `finalizeCustomerUploadZip.ts`'s fully
sequential per-image processing loop with bounded concurrency of 3
(`CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY`), aggregating `readyCount`/`failedCount`/
`fileResults` deterministically after every task settles rather than mutating shared counters from
concurrent callbacks.

All three Formal Review binding requirements satisfied: (1) post-settlement aggregation via a new
pure `aggregateZipProcessingResults` function; (2) evaluated the existing
`DerivativeConcurrencyQueue` pattern first — confirmed it cannot be imported directly into
`functions/src` (`functions/tsconfig.json` excludes `apps/studio/electron`), so its
acquire/release/wait-queue mechanism was relocated (not forked) to a new
`packages/shared/src/utils/boundedConcurrencyQueue.ts`, importable by both Studio and Functions;
(3) new ADR-FP-123 shows explicit worst-case memory arithmetic (100M-pixel decode buffer ≈381.5 MiB,
2GiB function memory, 200 MiB reserved overhead, 461.5 MiB per-image peak, concurrency-3 budget
table with a documented 25.1% safety margin, concurrency-4 correctly rejected at ~0.1% margin) with
proven constants, derived arithmetic, and runtime-validation-required assumptions explicitly
separated.

`processCustomerUploadImageBytes` (the actual image-processing logic) was not modified; its existing
8-test suite passes unmodified, proving no processing-logic drift. No accepted format, limit,
transparency rule, upscale policy, or the 200-DPI save floor changed. No Storage Rules, dependency,
schema, or Function memory/timeout configuration changed — no Human Checkpoint was triggered.

Verification: Functions build, repository lint, changed-file lint, `git diff --check` all exit `0`;
31/31 focused tests pass (10 new bounded-concurrency-queue tests, 7 new aggregation tests, 8
unmodified processing tests, 6 unmodified ZIP-extraction tests). Independent Implementation Review
against the real final diff: **APPROVED**, no residual defects — confirmed the sequential-to-
concurrent conversion is behavior-preserving by tracing the diff line-by-line, confirmed the ADR's
arithmetic independently rather than trusting its own numbers, confirmed no PII/content is logged
(only aggregate counts), confirmed exactly five files touched (all within Plan scope).

No deployment, migration, or production action occurred. Goals #10 (reference-image MB limit), #11
(catalog derivative consolidation), and #12 (`production-release`) remain unstarted.

Test report: `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-test-report.md`.
Implementation Review: `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-implementation-review.md`
— **APPROVED**.

Next: Signoff for this goal (Workstream A) is available once requested — Test phase is complete with
a passing result and an approved Implementation Review. Awaiting explicit instruction before
proceeding to Signoff, deployment, or Workstreams B/C.

## 2026-07-29 — `customer-upload-oversized-image-normalization-and-processing-performance` — DONE, signed off approved (Workstream A)

Signoff created:
`docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-signoff.md`
— **approved**. No new implementation, deployment, migration, Storage cleanup, or production action
taken in this pass; this step only formalizes completion of the Implement+Test state recorded in the
entry immediately above. `docs/project/ROADMAP.md` goal #9 marked Done (Workstream A);
`CURRENT-STATE.md`, `03-roadmap-and-phases.md`, and `13-recent-completed-work.md` updated.

**DONE (this goal, Workstream A): yes.**
**Signoff Status (this goal):** approved — see signoff doc above.
**Active managed goal:** none (idle).
**Next queued managed goal:** Goal #10, "Increase the MB limit for custom-request reference images"
(not started) — see Goal Order below. Its own Plan requires an owner MB-limit decision; no target
value exists anywhere in the repository yet.
**Explicitly confirmed at this signoff:** no deployment, no migration, no Storage cleanup; production
untouched; Goals #10, #11 (`catalog-image-derivative-storage-consolidation`), and #12
(`production-release`, blocked until #9–#11 all sign off) were not started.

## 2026-07-29 — Goal #10 `Increase the MB limit for custom-request reference images` — Plan + Formal Review complete

Started per owner instruction (Plan and Formal Review only; no implementation, no limit change, no
deployment). Re-verified every fact carried over from Goal #9's Workstream B section against current
source — all matched exactly, no drift. Investigation went materially deeper than Goal #9's outline:
found a fourth manual-sync enforcement location for the 15 MB constant (client, submit-path parser,
update-path parser, Storage Rules — Goal #9 only counted 3), confirmed reference images have **no
thumbnail/preview derivative** (every preview fetches the full original file, unlike catalog
Designs), and located the exact prior "Studio ref-thumb hang hotfix" / ADR-FP-110-related decision
record (`docs/project/DECISIONS.md:525-550`, 2026-07-21) proving the historical preview-hang bug was
a network/CORS timing issue independent of file size, with a **live 25 MB precedent**
(`ASSISTED_CREATION_MAX_PROOF_BYTES`, staff proof uploads) already running successfully through the
identical `getDownloadURL`-first/`getBytes`-fallback/12-second-timeout download architecture.

Confirmed no total-request byte ceiling exists at any layer today (only an implicit `8 × 15 MB =
120 MB` worst case), and confirmed Cloud Function memory/timeout is entirely irrelevant to this
change since reference-image bytes never transit a callable body (client uploads directly to Storage
via the SDK; callables only ever receive small JSON metadata).

Presented three evidence-graded options rather than round numbers: **Option 1 (20 MB, conservative)**,
**Option 2 (25 MB, recommended — reuses the already-live, already-proven proof-upload ceiling through
the identical architecture)**, **Option 3 (40 MB, highest reasonably safe — explicitly flagged as
projected, not observed, since it exceeds the 25 MB live precedent)**. Each option is paired with a
recommended total-request ceiling. **No value was selected — this remains the explicit owner decision
this Plan stops for.**

Formal Review returned **approved_with_changes** — two binding required changes carried into a future
Implement phase, neither expanding scope: (1) the Storage-Rules-literal-matches-shared-constant check
must be a mandatory automated test, not a described-in-prose recommendation, since this exact
manual-sync risk has now surfaced unresolved across two consecutive goals; (2) any total-request
ceiling must be enforced as a client-side pre-upload check (before any file upload begins), not a
server-only check that would leave partially-uploaded files orphaned with no cleanup path (the
existing "no cleanup for abandoned pending uploads" gap, documented but not required to be fixed by
this goal, would otherwise be made materially worse).

No implementation, deployment, limit change, or production action occurred. `docs/project/DECISIONS.md`
was not edited (the ADR is reserved for Implement, once the owner selects a value).

Plan: `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md`
— **approved_with_changes**.

Next: **stop for an explicit owner decision** — select Option 1 (20 MB), Option 2 (25 MB,
recommended), Option 3 (40 MB), or a different value with rationale — before Implement begins. Goal
#11 (`catalog-image-derivative-storage-consolidation`) and Goal #12 (`production-release`) remain
unstarted.

## 2026-07-29 — Goal #10 — Owner selected 40 MB/8 files/320 MB; Implement + Test complete

Owner selected Option 3 (40 MB per file), left the 8-file count unchanged, and specified a 320 MB
combined pre-upload ceiling (= 8 x 40 MB exactly). Implemented per the approved Plan/Review.

All four per-file enforcement layers updated to 40 MB: Portal client validation (new pure
`assistedCreationReferenceFilesValidation.ts`, delegated to by `assistedCreationService.ts`),
submit-path and update-path trusted-server parsers
(`packages/shared/src/utils/assistedCreationValidation.ts`, via a shared
`assertReferenceImageTotalWithinCeiling` helper), and `storage.rules`
(`isValidAssistedCreationImage()`). While implementing, found and fixed a genuine pre-existing
boundary inconsistency: `storage.rules` used exclusive `<` (rejecting a file exactly at the old
limit) while the TS validators used inclusive semantics (`>` for rejection, i.e. accept-at-limit) —
corrected `storage.rules` to `<=`, required to satisfy "a file exactly at the limit must be
accepted" at every layer, not scope creep.

New 320 MB combined ceiling (`ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES = 8 *
ASSISTED_CREATION_MAX_REFERENCE_BYTES`, so the two constants cannot drift apart) enforced as a
client-side pre-upload check in both the submit path (`useAssistedCreationWizard.setReferenceFiles`)
and update path (`AssistedCreationUpdateModal`, correctly excluding removed/replaced kept-reference
bytes on every add/remove), with the server-side parsers as defense-in-depth only — confirmed by
tracing the actual call sequence that zero uploads occur on an over-ceiling selection in either path
(not merely asserted by a passing test).

Formal Review's two binding requirements both closed: (1) a new
`packages/shared/src/constants/storageRulesAlignment.test.ts` test parses the real arithmetic
`storage.rules` enforces and asserts numeric equality against the live imported constant — fails if
either drifts independently, not a duplicated handwritten "40"; (2) the total-ceiling check is
client-side-first as required.

Also consolidated a duplicated `withTimeout` helper (previously hand-copied identically in Portal's
and Studio's Assisted Creation services) into a new shared
`packages/shared/src/utils/withTimeout.ts` — a pure no-op refactor done specifically to make "preview
fallback remains timeout-bounded regardless of payload size" directly testable; both call sites now
import the shared version, `STORAGE_DOWNLOAD_TIMEOUT_MS = 12_000` unchanged in both.

No customer-upload artwork, Goal #9 code, or catalog-derivative code touched. No new dependency.
New ADR-FP-124 records the decision with full detail (former/new limits, four enforcement layers,
architecture preservation, cost/slow-network risk analysis, deployment checkpoint, rollback).

Verification: repository lint, Functions build, Portal typecheck/build, Studio build, changed-file
lint, `git diff --check` all exit `0`; 44/44 focused tests pass. Independent Implementation Review
against the real final diff: **APPROVED**, no residual defects — independently re-traced the
zero-uploads-on-rejection guarantee and the removed/replaced-file exclusion logic against actual code
paths rather than trusting the test report's claims alone.

**Deployment checkpoint prepared, not executed.** `storage.rules` changed (one function, one line) —
requires explicit owner approval before deploying to `fresh-prints-dev`. The checkpoint document also
flags an important caveat: the current uncommitted `storage.rules` file contains ~22 lines of
unrelated pre-existing content from other in-flight goals (`generated/catalog-reference`/
`generated/portal-catalog` blocks); `firebase deploy --only storage` would publish the whole file,
not just this goal's one-line change — owner should confirm those unrelated blocks are also intended
for `fresh-prints-dev` before this deploy runs, or the deploy should wait.

No deployment, migration, Storage cleanup, or production action occurred. Goals #11 and #12 remain
unstarted. Post-deployment owner QA (per the Plan) is still required before Signoff.

Plan: `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md`.
Test report: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-test-report.md`.
Implementation Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-implementation-review.md`
— **APPROVED**.
Deployment checkpoint: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-dev-rules-deployment-checkpoint.md`
— awaiting owner approval.

Next: stop for owner approval of the dev Storage Rules deployment (and the unrelated-content caveat
above), then post-deployment owner QA, then Signoff. Do not deploy, sign off, start Goal #11, or
touch production without that approval.

## 2026-07-29 — Goal #10 — Deployment-scope audit (Verdict A), then owner-approved dev Storage Rules deployment executed

**Deployment-scope audit (read-only, no changes):** investigated the ~22 unrelated lines in
`storage.rules` (`generated/catalog-reference/ai|manifest.json|client`,
`generated/portal-catalog/{allPaths=**}`). Confirmed via `.cursor/workflow/state.md:1533-1544`
(2026-07-27 entry) and the signed-off Wave C record
(`docs/workflow/reviews/2026-07-27-firestore-usage-efficiency-wave-c-signoff.md`) that this content
is already-deployed, already-live `fresh-prints-dev` Storage Rules belonging to the completed
`firestore-usage-efficiency-wave-c` generated-catalog architecture (ADR-FP-120) — not the abandoned
private print-request read-model architecture (`generated/studio-print-requests`,
`generated/portal-print-requests`, confirmed absent from the current file). The 2026-07-27 Wave C
deploy (`npx firebase deploy --project fresh-prints-dev --only storage`, exit 0) explicitly verified
these generated-catalog rules unchanged while removing the abandoned paths; `npm run test:rules`
passed 12/12 both immediately before and after. **Verdict A** — safe to deploy the current file,
since deploying it republishes already-live content unchanged alongside Goal #10's one real change.

**Owner approved deployment** ("Approved — deploy storage.rules to fresh-prints-dev for Goal #10.").

**Pre-deployment re-verification:** confirmed `storage.rules` unchanged since the audit; active
project `fresh-prints-dev`; `storageRulesAlignment.test.ts` 5/5 pass; `git diff --check` exit 0;
`<= 40 * 1024 * 1024` present; abandoned paths absent; all 4 generated-catalog blocks present;
Assisted Creation ownership/path functions and the unrelated 25 MB proof rule confirmed unchanged.
Local `storage.rules` SHA-256 (pre-deploy): `e11cb3bf1cf316bd9ba77765f8a112b355ced2d7aef4e5a4b9ae4fb400c3c730`.

**Deployment executed:**
```
firebase use fresh-prints-dev          -> exit 0, "Now using project fresh-prints-dev"
firebase deploy --only storage         -> exit 0, "rules file storage.rules compiled successfully",
                                           "released rules storage.rules to firebase.storage",
                                           "Deploy complete!"
```
Timestamp: 2026-07-29T22:22:31Z. Post-deploy SHA-256 identical to pre-deploy
(`e11cb3bf1cf316bd9ba77765f8a112b355ced2d7aef4e5a4b9ae4fb400c3c730`), confirming deployed content
matches exactly what was reviewed. No Functions, Firestore Rules, indexes, App Hosting, CORS, or
production resource was included — `--only storage` deploys Storage Rules exclusively; no other
Firebase project was referenced at any point.

**Effective state in `fresh-prints-dev` as of this deploy:** Assisted Creation reference-image
per-file limit is now live at 40 MB (inclusive `<=`), 8-file maximum unchanged, generated-catalog
rules unchanged (harmlessly republished), abandoned print-request rules remain absent. The 320 MB
combined ceiling remains an application-layer-only pre-upload guard (Portal client + trusted-server
parsers) — Storage Rules cannot and do not enforce it.

Deployment checkpoint updated:
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-dev-rules-deployment-checkpoint.md`.

No migration, Storage cleanup, Function deploy, Firestore Rules/indexes deploy, App Hosting deploy,
or production action occurred. Goal #11 not started. Signoff not performed — owner QA is required
first (checkpoint prepared next).

Next: prepare and present the owner QA checkpoint covering deployed-environment behavior (submit
path, near-limit acceptance, over-limit rejection, combined-ceiling guard, update path, Portal
preview, Studio access, proof/customer-upload regression). Await the owner's QA result before
Signoff.

## 2026-07-29 — Goal #10 — Owner QA FAIL; Amendment 1 (root cause + fix) Plan/Review/Implement complete; scoped Functions deployment awaiting approval

Owner QA returned **FAIL**: a reference image between 15 MB and 40 MB was accepted by the Portal
picker but rejected at Submit with the stale message "Each reference image must be 15 MB or
smaller." Recorded FAIL in the QA checkpoint doc; goal reopened.

**Root cause investigated and confirmed (deployment gap, not a source-code defect):**
`submitAssistedCreationRequest`/`customerUpdateAssistedCreationRequest`
(`functions/src/assistedCreationRequests.ts:252,409`) are Cloud Functions callables that call the
exact parser functions (`packages/shared/src/utils/assistedCreationValidation.ts`) Goal #10's
original Implement phase updated to 40 MB. Cloud Functions bundle their own compiled copy of
`packages/shared` at **deploy** time — entirely separate from Storage Rules deployment. Goal #10's
only deployment action to date was `firebase deploy --only storage` (Storage Rules only). Cloud
Functions in `fresh-prints-dev` were never redeployed, so the live callables were still running
pre-Goal-#10 compiled code. Confirmed via: repo-wide search for stale "15" literals (zero found —
current source correctly template-interpolates from the constant); the local compiled build
artifact (`functions/lib/.../assistedCreation.constants.js:16`) correctly showing `40 * 1024 *
1024`; `git log` showing no commit/deploy of the relevant files since before Goal #10 began; and the
Storage Rules deployment checkpoint's own command log showing no Functions deploy target. Portal's
client picker correctly accepting the file (owner's own evidence) independently rules out a
Portal-side staleness/cache explanation.

**Plan amended in place** (Amendment 1, recorded in the existing Plan document) — scope: add
regression tests proving the parser functions the live callables invoke are correct at the exact
boundary the owner hit; prepare (not execute) the scoped Functions redeploy; no application source
change, no Storage Rules change, no value change.

**Amendment 1 Formal Review: approved** — one binding condition (informational, applies to the
deployment checkpoint, not Implement): confirm via `git diff` that the scoped Functions redeploy
carries only this goal's change, given ~23 other unrelated `functions/src/*.ts` files currently sit
dirty in the working tree from other in-flight goals.

**Implemented:** added a dedicated regression `describe` block to
`packages/shared/src/utils/assistedCreationValidation.test.ts` (9 new tests) proving: the exact
15 MB+1-byte boundary is accepted (submit and update paths); the rejection message for an oversized
file names "40 MB" and never "15 MB" (both paths, via `assert.doesNotMatch`); submit and update
paths produce identical accept/reject decisions across 4 boundary cases; a rejected file never
produces a partial reference entry; the 320 MB ceiling and 8-file count remain enforced. No
application source file changed — only the test file.

Verification: 49/49 focused tests pass (33 in the amended file), Portal typecheck exit 0, Portal
build exit 0, repository lint exit 0, changed-file lint exit 0, `git diff --check` exit 0, Functions
build exit 0. Independent Implementation Review: **APPROVED**, no residual defects — independently
re-traced the root-cause evidence chain and confirmed the message-content assertions would have
correctly failed against the old pre-Goal-#10 source (proving the tests are real, not tautological).

**Binding condition satisfied:** confirmed via `git status`/`grep` that
`functions/src/assistedCreationRequests.ts` and its two Assisted-Creation-specific lib imports
(`assistedCreationReferencePromote.ts`, `assistedCreationProofPurge.ts`) have zero uncommitted
changes, and that the two shared files that *are* modified
(`assistedCreation.constants.ts`, `assistedCreationValidation.ts`) import nothing from
`functions/src/` — so the scoped redeploy is proven clean of the ~23 unrelated dirty Functions files.

**Deployment checkpoint prepared, not executed:**
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-functions-deployment-checkpoint.md`
— exact command `firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest`
targeting only `fresh-prints-dev`, awaiting explicit owner approval. Storage Rules are correct and
already live — not touched again.

No deployment, migration, Storage cleanup, or production action occurred in this pass. No Storage
Rules redeployed. Value unchanged (still 40 MB / 8 files / 320 MB). Goal #11 not started, Signoff
not performed.

Plan (amended): `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md`.
Amendment 1 Formal Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-review.md`
— **approved**.
Amendment 1 Implementation Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-implementation-review.md`
— **APPROVED**.
Functions deployment checkpoint: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-functions-deployment-checkpoint.md`
— awaiting owner approval.
QA checkpoint updated with FAIL result and reduced re-QA steps:
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-qa-checkpoint.md`.

Next: stop for owner approval of the scoped Functions deployment. After deployment, run the reduced
5-step owner re-QA (Portal Submit with a 15–40 MB file). Do not sign off, start Goal #11, or touch
production without that approval and a passing re-QA result.

## 2026-07-29 — Goal #10 — Scoped Functions deployment executed; owner re-QA PASS; DONE, signed off approved

Owner approved the scoped Functions redeployment. Executed exactly:
```
firebase use fresh-prints-dev                                                            -> exit 0
firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest -> exit 0
```
Both functions reported "Successful update operation" (Node.js 20, 2nd Gen, `us-central1`); "Deploy
complete!" Timestamp: 2026-07-30T00:23:55Z. No `storage` deploy step appeared in the CLI output — Storage
Rules were not touched again (confirmed via unchanged SHA-256). No other Firebase resource or
project was referenced.

Owner ran the reduced 5-step re-QA (attach a 15–40 MB reference image, Submit/Save, confirm success
with no "15 MB" error, confirm the reference appears on the request, confirm an over-40 MB file is
still rejected with 40 MB copy) — **PASS**. Recorded in
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-qa-checkpoint.md`.

**Goal #10 signed off: approved.** Signoff:
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-signoff.md`.
Full history preserved: original Plan (amended in place), original Formal Review, Test Report,
original Implementation Review, ADR-FP-124, Storage Rules deployment checkpoint, Amendment 1,
Amendment 1 Formal Review, Amendment 1 Implementation Review, scoped Functions deployment
checkpoint, owner QA checkpoint (FAIL then PASS), final Signoff.

**Final effective state in `fresh-prints-dev`:** Assisted Creation reference-image per-file limit is
40 MB (live at every enforcement layer — Portal client, submit-path parser, update-path parser,
Storage Rules); 8-file maximum unchanged; 320 MB combined ceiling active as an application-layer
pre-upload guard. No migration, no Storage cleanup, production untouched throughout the entire goal.

**DONE (this goal): yes.**
**Signoff Status (this goal):** approved.

## 2026-07-29 — Queue reconciliation: Goal #11 `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` added (owner-directed, not started)

Per explicit owner instruction, added a new goal to the pre-production queue, inserted as **#11**
(before the previously-recorded `catalog-image-derivative-storage-consolidation`, which shifts to
**#12**; `production-release` shifts to **#13**, blocked until #9–#12 all sign off). This is a
documentation-only addition — **no Plan was created, no implementation started.**

Scope summary (for the future Plan to develop in full): investigate pixel width/height/total-pixel
rejection behavior in Customer Uploads and Donate Design; preserve original uploads; create
proportional normalized production derivatives for otherwise-valid technically-oversized images;
preserve transparency and aspect ratio; never crop/stretch/distort; maintain truthful DPI and
printable dimensions; preserve the 200 effective-DPI save floor (ADR-FP-075); investigate excessive
time observed at "Trimming transparent edges..."; add bounded timeout and idempotent retry behavior;
resolve the 80 MB vs. 100 MB limit discrepancy; resolve the narrow ADR-FP-080 technical-safety
downscaling exception. This goal does not modify ADR-FP-080 itself — investigating whether its
existing narrow exception needs a scoped correction is in scope; changing the ADR is not authorized
by this documentation pass.

Reconciled Goal Order (below) and `docs/project/ROADMAP.md` to match.

No application code, tests, Firebase resources, or configuration changed in this documentation-only
pass. Goal #11 was not started. Production remains untouched.

## 2026-07-30 — Goal #11 `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` — Plan + Formal Review complete

Started per owner instruction (Plan and Formal Review only; no implementation). A research pass
traced the full customer-upload/Donate Design trusted-server pipeline
(`functions/src/lib/customerUploadProcessing.ts`) and confirmed every reported symptom's exact root
cause from current source:

1. **Pixel-dimension rejection** — the check at `customerUploadProcessing.ts:404-410` evaluates raw
   source metadata (`sourceWidthPx * sourceHeightPx > CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS =
   100,000,000`) **before** any trim attempt, so a large-canvas PNG with large transparent margins
   (which would trim down under the ceiling) is rejected outright — trim never gets a chance to run.
   Math confirms a 7–14 MB PNG can easily carry 100M+ pixels (a 12,500×8,000 canvas = exactly 100M
   px, well under the 15,000px-per-side cap but over the total-pixel cap), fully explaining the
   owner's exact symptom.
2. **`"Trimming transparent edges…"` delay** — `trimTransparentEdges` (`:239-293`) performs three
   separate full-resolution sharp decodes, two of which are provably redundant (a metadata-only
   decode that duplicates data already known to the caller, and a second metadata decode of the
   trimmed output that `.toBuffer({ resolveWithObject: true })` would return for free from the same
   operation that already produced it).
3. **Donate Design and Customer Uploads confirmed to share the exact same pipeline** — same
   callable, same processing function, same byte/pixel limits; only daily quota counters differ by
   purpose.
4. **80 MB vs. 100 MB** — confirmed pure documentation drift. The enforced byte limit
  (`CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES = 80 MB`) already matches exactly across the shared
  constant, `storage.rules`, and Portal UI copy. "100 MB" appears only in four stale
  `references/project-chatgpt-handoff/` files — likely a conflation with
  `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS = 100,000,000` (a pixel count, not a byte size). No enforced
  value changes; only the four docs need correction.

Recommended fix: bounded decode (`limitInputPixels`, confirmed already used as a working precedent
in this exact codebase at `functions/src/lib/portalOgImageCompose.ts:39`) → trim → normalize only if
still over the ceiling after trim — explicitly compared against three alternative orderings with
memory/decode-safety/quality tradeoffs. Original source always preserved; a normalized production
derivative is created only when technically required, reusing the existing production Storage path
convention (no new path family). Recommended a narrow ADR-FP-080 amendment (text drafted for
Implement, not recorded now) permitting downscale-only normalization strictly for this technical
ceiling case. Goal #9's bounded-ZIP-concurrency work (`finalizeCustomerUploadZip.ts`,
`boundedConcurrencyQueue.ts`, `aggregateZipProcessingResults`) is confirmed untouched — this Plan's
fixes live entirely in the shared `processCustomerUploadImageBytes` function both the single-image
and ZIP callables call as an opaque per-image unit, so Goal #9's orchestration code inherits the fix
automatically without modification.

Formal Review returned **approved_with_changes** — three binding required changes, none requiring a
Plan amendment: (1) the proposed stage watchdog must be extracted as a pure, directly-testable
function (mirroring Goal #10's `withTimeout.ts` precedent) before Implement writes its tests, since
this repository has no live-callable integration-test harness — confirmed during Review that
`finalizeCustomerUpload.test.ts`/`retryCustomerUploadProcessing.test.ts` (which the Plan initially
assumed existed) do not exist; (2) explicitly document `wasNormalizedForDimensions` and `wasUpscaled`
as independent, non-mutually-exclusive booleans; (3) resolve the `06-data-model-essentials.md`
update question definitively during Implement's first step rather than leaving it open. Review also
independently confirmed the Plan's `limitInputPixels` mechanism has a real, working precedent in
this codebase (not a speculative capability) and resolved all of the Plan's own
`[NEEDS REPO CHECK]` flags — all filenames the Plan cited exist except the two test files noted
above, correctly reclassified as new files to create.

No implementation, deployment, or production action occurred. `docs/project/DECISIONS.md` was not
edited (the ADR-FP-125 amendment is reserved for Implement, once written against the real diff).

Plan: `docs/workflow/plans/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-review.md`
— **approved_with_changes**.

Next: Implement, treating the three required changes as binding. Do not touch Goal #9 or Goal #10
files. Stop and return to Plan if evidence shows the existing 540s/2GiB Function configuration is
insufficient even after the redundant-decode fix — a Function config change is a Human Checkpoint,
not an Implement-phase decision.

## 2026-07-30 — Goal #11 `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` — Implement + Test + Implementation Review complete

All three binding Formal Review conditions satisfied: (1) stage watchdog extracted as a pure,
directly-testable helper (`packages/shared/src/utils/customerUploadFinalizeWatchdog.ts`,
`withCustomerUploadFinalizeWatchdog`, mirroring `withTimeout.ts`'s exact precedent, 5 tests, no
`onCall` harness) before any watchdog test was written; (2) `wasNormalizedForDimensions` and
`wasUpscaled` explicitly documented and tested as independent, non-mutually-exclusive booleans;
(3) `06-data-model-essentials.md` question resolved — added one concern-level row to its existing
high-level `Customer Uploads` table (the doc already omits granular fields like
`wasTrimmed`/`wasUpscaled` at that detail level, so a new row, not per-field documentation, was the
correct match to the doc's own convention).

Processing order changed in `functions/src/lib/customerUploadProcessing.ts`: bounded decode → trim
→ normalize-if-still-oversized. **Implement caught and fixed a real design flaw of its own making**
mid-implementation: an initial `limitInputPixels` bound set equal to the app-level 100M-pixel
ceiling was empirically proven (via a failing test against a 104M-px fixture) to reject the decode
itself for any oversized-but-trimmable canvas — defeating the entire fix. Corrected to sharp's own
built-in decoder default (`0x3FFF * 0x3FFF` ≈ 268.4M px, ~1.0 GiB max buffer,
`CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS`), leaving the actual product-level ceiling enforced only
after trim/normalize against real pixel counts, as originally intended.

`trimTransparentEdges` reduced from three full-resolution decodes to one (accepts known dimensions
as parameters; uses `.toBuffer({ resolveWithObject: true })`); the `converting_format` branch
similarly consolidated. New `normalizeForDimensionCeiling` function (downscale-only,
`fit: "inside"`, strictest-of-width/height/total-pixel-scale-factor wins) is structurally separate
from the existing `upscaleIfNeeded` (ADR-FP-080 pass). New additive fields
(`wasNormalizedForDimensions`, `preNormalizationWidthPx`, `preNormalizationHeightPx`) written in
both `finalizeCustomerUpload.ts` and `retryCustomerUploadProcessing.ts` success transactions.

Watchdog wired into both callables at 480s (60s headroom under the 540s `onCall` ceiling) — writes
explicit `technicalFailureCode: "processing_timed_out"` before the platform can silently terminate
the invocation. New failure code added to `CustomerUploadTechnicalFailureCode` and to
`RETRYABLE_FAILURE_CODES`. Baseline timing measurement (Approach step 2) was run empirically and
reported honestly: at the tested pixel scale, a synthetic single-process benchmark showed the
redundant-decode removal's wall-clock effect within measurement noise (PNG `.metadata()` reads
only header bytes, not the full raster) — so the 480s watchdog value is justified as a fixed
safety margin under the platform ceiling, not a value tuned against a specific measured worst
case, since a local benchmark cannot reproduce real Cloud Functions cold-start/memory-pressure
conditions.

Sanitized per-stage timing instrumentation added (`StageTimer` inside the pure library function,
`stageTimingsMs` returned on success; each callable emits one `logger.info("<scope>.stageTimings",
{...})` matching the `finalizeCustomerUploadZip.processingBatch` convention from Goal #9). 80 MB vs
100 MB: no enforced value changed; four stale handoff docs corrected
(`03-roadmap-and-phases.md`, `CURRENT-STATE.md`, `04-features-inventory.md`,
`07-backend-and-ai-pipeline.md`) plus one clarifying sentence distinguishing the byte ceiling from
the unrelated pixel-count ceiling. ADR-FP-125 recorded in `docs/project/DECISIONS.md` (narrow
ADR-FP-080 amendment, text matches the final diff exactly, not written speculatively in advance).

**Tests**: 28 new/updated tests across `customerUploadProcessing.test.ts` (20, includes 12 new
oversized-normalization cases), `customerUploadFinalizeWatchdog.test.ts` (5, new file),
`retryCustomerUploadProcessing.test.ts` (3, new file — path-determinism idempotency tests, since
this repo has no live-callable harness to exercise the callable itself). All 28 pass. Goal #9 ZIP
regression (`finalizeCustomerUploadZipAggregation.test.ts`) and `storageRulesAlignment.test.ts`
(byte-limit-consistency, regression item #18) re-run unmodified: 12/12 pass, confirming Goal #9 is
untouched. Functions build, Portal typecheck, Portal build, and repo-wide `npm run lint` all exit 0.

Independent Implementation Review verdict: **approved_with_changes** — one required
documentation-precision change (name the `previousFailureCode`-vs-`retryAttempt`-counter
substitution as a deliberate, scope-conscious deviation from the Plan's literal suggestion,
rather than an unflagged difference), applied immediately, no code/test change required.

`finalizeCustomerUploadZip.ts`, `boundedConcurrencyQueue.ts`,
`finalizeCustomerUploadZipAggregation.ts` (Goal #9) and every Assisted Creation file (Goal #10)
confirmed untouched by this diff. `storage.rules` not modified (no Rules-layer change; 80 MB
already correct everywhere). **Nothing deployed. Nothing migrated. No Storage objects touched.
Production untouched.** Functions requiring a future dev deployment:
`finalizeCustomerUpload`, `retryCustomerUploadProcessing` — a separate owner checkpoint, not
performed in this pass.

Test Report: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-test-report.md`.
Implementation Review: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-implementation-review.md`
— **approved_with_changes** (required change applied).

## 2026-07-30 — Goal #11 `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` — dev Functions deployment

Owner approved and explicitly directed a scoped Functions deployment to `fresh-prints-dev`. Before
deploying, traced the full transitive import closure of both target functions and confirmed
neither `finalizeCustomerUpload.ts` nor `retryCustomerUploadProcessing.ts` imports (even
transitively) any of the extensive unrelated pre-existing uncommitted files in `functions/src/`
(`ai/*`, `etsyRecommendation*`, and others from prior sessions) — no conflict found. Deployed
exactly:
```
firebase use fresh-prints-dev
firebase deploy --only functions:finalizeCustomerUpload,functions:retryCustomerUploadProcessing
```
Both functions reported "Successful update operation," exit 0, 2026-07-30T02:31:47Z UTC. Node.js
20 (2nd Gen), region us-central1. Only these two functions were deployed — confirmed via CLI
output. No Storage Rules, Firestore Rules/indexes, App Hosting, or other Functions were deployed;
no migration/backfill ran; no Storage objects were touched; production was not targeted at any
point.

Deployment checkpoint: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-functions-deployment-checkpoint.md`.

A reduced 12-item owner QA checkpoint (Customer Uploads oversized-canvas success, Donate Design
parity, normal-upload regression, no-indefinite-trimming, retry-idempotency, 80 MB copy) is
prepared and pending owner execution.

**Next: owner QA.** Do not sign off until owner QA returns an explicit result. Do not start Goal
#12.

## 2026-07-30 — Goal #12 `catalog-image-derivative-storage-consolidation` — Plan + Formal Review complete

Started per owner instruction (Plan and Formal Review only; no implementation). Investigation
(direct source reading plus a background research-agent audit) confirmed every catalog design
normally has three permanent Storage objects: `/originals/{id}.png` (staff-only, production),
`/thumbnails/{id}.webp` (320×320 @ Q80), `/previews/{id}.webp` (1280×1280 @ Q85) — both derivatives
generated by the identical shared-constants-driven sharp pipeline whether produced by Studio
Electron import or Cloud Functions donation-promotion processing. Confirmed with exact file/line
citations that **every consumer without exception** already follows a `thumbnailPath`-for-grids /
`previewPath ?? thumbnailPath`-for-detail pattern, meaning a missing `previewPath` is already a
supported, non-breaking state everywhere — the key fact that makes an additive, fallback-safe
migration low-risk. Confirmed Show Queue export and gang-sheet generation
(`useExportShowZip.ts:160`, `useExportGangSheetPng.ts:139`) use `design.originalPath` exclusively,
never a derivative. Confirmed customer-upload promotion **copies** bytes into new catalog-canonical
paths (not a live link), creating a real, already-policy-sanctioned temporary duplication window
during the existing 14-day cool-off purge (ADR-FP-086 §4). Confirmed `purgeArchivedDesignAssets`
deletes `originals`+`previews` and keeps `thumbnails` only (ADR-FP-084) — a retention policy this
Plan does not modify, but whose future interaction with a new derivative field is explicitly
flagged. Confirmed and correctly distinguished ADR-FP-120 (the generated catalog/Portal-catalog
snapshot architecture — preserved, unaffected) from ADR-FP-121 (the abandoned print-request
read-model — unrelated, not reintroduced).

Recommended architecture: one new, additive `/display/{designId}.webp` derivative (starting
dimension/quality hypothesis 640×640 @ Q82, explicitly flagged as a Human Checkpoint pending real
UI-measurement and visual sample review, not a final decision) to potentially replace both
`thumbnails` and `previews`; a separate tiny thumbnail is explicitly *not* recommended by default,
per the owner's own instruction not to preserve one merely because it exists, pending Implement's
own measured evidence otherwise. A dry-run-only Storage inventory callable
(`inventoryCatalogImageStorage`, modeled on the confirmed `purgeIdleCustomerUploadFullSize.ts`
dry-run precedent) is designed to classify every object as referenced / orphaned candidate /
purged-per-policy / promotion-cool-off duplicate — no deletion capability is proposed in this
Plan at all. Staged, non-destructive migration: additive Firestore field, dual-read fallback
chains extended one level, bounded-concurrency backfill (reusing Goal #9's
`boundedConcurrencyQueue.ts`), old objects never touched, deletion deferred to a separate future
goal requiring its own owner checkpoint.

Formal Review returned **approved_with_changes** — four binding required changes, all
incorporated directly into the Plan: (1) explicit "Interaction with Archive-Purge" section naming
that `displayPath` will be silently orphaned (not deleted, not retained-with-intent) by
`purgeArchivedDesignAssets` until a future goal reconciles the two; (2) explicit commitment to
extract the Storage inventory classification logic as a pure, directly-testable function
(mirroring `withTimeout.ts`/`withCustomerUploadFinalizeWatchdog.ts`/
`evaluateCustomerUploadFullSizeRetention`'s precedent) rather than requiring a live emulator; (3)
explicit statement that the Cache-Control gap between new and not-yet-migrated derivative objects
is an accepted transitional inconsistency, not an oversight; (4) explicit per-question sequencing
classification for all three Open Questions (which must resolve before Implement starts vs. during
Implement's first step vs. deferred to a future goal entirely), mirroring Goal #11's own
binding-condition precedent. Review's independent re-verification pass found every spot-checked
Plan citation accurate, including several structurally significant findings the Plan surfaced
honestly (a `DesignSelectionCard.tsx` internal inconsistency, the missing Cache-Control headers on
today's derivatives).

No implementation, migration, backfill, deletion, or deployment occurred. `docs/project/DECISIONS.md`
was not edited (a new ADR is reserved for Implement, once written against a real diff).

Plan: `docs/workflow/plans/2026-07-30-catalog-image-derivative-storage-consolidation-plan.md`
— **approved_with_changes**.
Formal Review: `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-review.md`
— **approved_with_changes** (all four required changes incorporated into the Plan directly).

Next: awaiting owner instruction to begin Implement. Do not deploy, migrate, backfill, or delete
anything. Do not start Goal #13 (`production-release`, already blocked pending #12's signoff). Do
not reopen Goals #9, #10, or #11.

## 2026-07-30 — Goal #12 `catalog-image-derivative-storage-consolidation` — Implement Human Checkpoint 1 complete

Resumed per owner instruction, scoped explicitly to the first implementation checkpoint only
(measure, build dry-run inventory, generate sample derivatives, stop for owner visual approval —
no consumer migration, backfill, deployment, or cleanup).

All four Formal Review binding conditions confirmed handled (condition 1 and 3 are structurally
satisfied by not yet writing `displayPath` to any real record or Storage object; conditions 2 and
4 were followed exactly as specified).

**Measurement**: a background research pass traced real rendered CSS dimensions across all 9+
required Portal/Studio surfaces with exact file/line citations. Key finding: no surface anywhere
requests more than ~1152×896 CSS px (the shared preview lightbox, common to both apps), which is
already served by today's 1280px preview with headroom to spare and no upscale; no DPR/retina
`srcset`/`sizes` handling exists anywhere in either app; grid cards render ~256–380px, well inside
any 512–800px candidate.

**Storage inventory**: built `packages/shared/src/utils/catalogImageStorageInventory.ts` (pure
classification function — referenced / orphaned candidate / purged-per-policy-violation /
promotion-cool-off-duplicate — 14 tests, zero Storage/Firestore calls inside it) and
`functions/src/inventoryCatalogImageStorage.ts` (thin, owner/admin-only, dry-run-only `onCall`
shell with no delete mode built). **This environment has no Google Application Default
Credentials configured** (confirmed via a direct failed `firebase-admin` connection attempt) — the
callable could not be invoked against real `fresh-prints-dev` data in this pass; this is disclosed
explicitly in the checkpoint artifact, not worked around. Real inventory totals remain a suggested
follow-up the owner can run independently (the callable is read-only/dry-run-only, safe to invoke
at any time).

**Samples**: generated 7 synthetic representative fixtures (transparent, fine text, thin lines,
halftone/distressed, flat-color, multicolor, light/dark, portrait/landscape/square — no real
catalog or customer data, since none was accessible) run through the real production
`encodeWebpDerivative` pipeline at 3 candidate settings (512×512, 640×640, 800×800, all Q82) plus
today's actual thumbnail/preview outputs for comparison. All output written to an isolated local
session-scratchpad directory only — nothing uploaded to Storage, no new permanent path family
added to the repo. Every candidate at every sample is 40–82% smaller than today's preview;
recommendation is 640×640 @ Q82 (the Plan's original hypothesis), pending the owner's own visual
review of the side-by-side samples.

**Thumbnail-necessity evidence**: excluding a noise-heavy synthetic outlier, a typical 8-card grid
load today (thumbnail-only) is ~23 KB; a shared 640px derivative would be ~50 KB — not judged a
material regression at this catalog's scale (~80 designs), no virtualization/lazy-loading
infrastructure exists that a larger derivative would meaningfully strain. Recommendation: **no
separate tiny thumbnail**, consistent with the Plan's default and the owner's explicit instruction
not to preserve one merely because it exists.

**Original-production protection**: re-confirmed via 4 new static-source regression tests that
`useExportShowZip.ts` and `useExportGangSheetPng.ts` resolve exclusively from `design.originalPath`
and never from any derivative field.

**Additive schema preparation** (types only, no migration/backfill): `displayPath?: string` added
to Studio's `Design`/`CreateDesignInput`/`UpdateDesignInput`, Portal's `CatalogDesign`, and the
generated `PortalCatalogCard` shape; `mapPortalCatalogCard` additively includes it when present (5
new tests, including proof it flows into the existing `contentVersion` hash automatically with no
special-case code). **Zero design Firestore documents were written to** — `displayPath` exists
only as a type-level addition, confirmed by the checkpoint artifact's explicit "No Backfill
Occurred" section.

**Tests**: 80 new tests (14 inventory classification, 6 path helper, 18 candidate-encode
properties across 3 sizes, 5 manifest compatibility, 4 original-path protection) all passing.
Goal #9/#11 regression suite (32 tests: customer-upload processing, storage-rules alignment, ZIP
aggregation) re-run unmodified, all passing — confirms no regression from the additive schema
changes. Functions build, Portal typecheck, Studio build, repo-wide lint, changed-file lint, and
`git diff --check` all exit 0.

Owner sample-review checkpoint artifact:
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-owner-sample-checkpoint.md`
— contains measured UI requirements, sample list, candidate settings/byte-savings table, the
thumbnail-necessity evidence, a 640×640 @ Q82 recommendation, the exact additive schema proposed,
and the exact next-implementation scope pending approval.

**Nothing migrated. Nothing backfilled. Nothing deployed. Nothing deleted. Production untouched.**
No consumer component was modified — every existing surface reads exactly the fields it read
before this checkpoint.

Next: **stop for owner visual sample review and final dimensions/quality approval.** Do not
proceed to consumer migration, backfill, Functions deployment, Storage Rules deployment, or any
cleanup until the owner responds to the sample checkpoint. Do not start Goal #13. Do not reopen
Goals #9, #10, or #11.

## 2026-07-30 — Goal #12 `catalog-image-derivative-storage-consolidation` — Human Checkpoint 1, round 2

Owner did not approve 640×640 @ Q82. Correctly identified, with technical precision, that the
shared preview lightbox (~1152×896 CSS px, both apps) has no DPR/retina handling anywhere in the
codebase, so a 640px derivative would be **upscaled by the browser**, not merely rendered smaller.
Owner provisionally reaffirmed the no-separate-tiny-thumbnail direction.

Expanded the candidate matrix to 640/800/1024/1280 px @ Q82 plus one evidence-driven quality
variant (1024 @ Q88), regenerated the 7 synthetic fixtures at higher source resolution so 1280
represents a genuine downscale test, and ran every candidate through the real production
`encodeWebpDerivative` pipeline. Directly computed the browser's `object-fit: contain; width:
auto` upscale behavior at the lightbox (confirmed exact CSS at
`apps/portal/styles/catalog.css:2144-2152`, shared by Studio) for each candidate:

- 640×640 → displayed 896×896 → **1.40× upscale** (confirmed, matches owner's concern exactly)
- 800×800 → displayed 896×896 → **1.12× upscale** (confirmed)
- 1024×1024 → displayed 896×896 → 0.88× (no upscale)
- 1280×1280 → displayed 896×896 → 0.70× (no upscale)

Built a real, self-contained local HTML contact sheet (`contact-sheet.html`, ~21 MB, base64-embedded
images, no external references, nothing uploaded to Storage) rendering every fixture × every
candidate at native/grid-card/lightbox contexts using the app's actual CSS, with explicit
upscale-warning flags.

Byte-size finding that reshaped the recommendation: **1280×1280 Q82 saves almost nothing over
today's live 1280×1280 Q85 preview** (−6.8% on representative content, excluding a noise-heavy
outlier fixture) — choosing it would deliver only the object-count consolidation (3→2 per design),
not a meaningful size reduction, undermining the goal's core purpose. **Revised recommendation:
1024×1024 @ Q82** — the smallest candidate that avoids lightbox upscaling entirely while still
delivering a real −28.2% reduction vs. today's preview and comfortable headroom over every grid
surface (256-380px). Explicitly did not choose 640 merely for its smaller byte size, per the
owner's explicit instruction.

Independent focused review of `inventoryCatalogImageStorage` (owner/admin-only, dry-run, read-only,
no delete/update/migration capability, no PII/URL/artwork exposure — all six required criteria
confirmed) found and fixed one real defect before proposing deployment: the original code queried
`customerUploads.where("promotedDesignId", "!=", null)`, a pattern with **no precedent anywhere in
this codebase** and a known Firestore gotcha (`!=` silently excludes documents where the field is
absent entirely, not just explicitly `null`) — corrected to mirror
`purgePromotedDonationFullSize.ts`'s established `catalogReviewStatus ==
"sent_to_ai_review"` equality-filter pattern. Also found and fixed, within the same pass, a real
gap against the owner's required report shape: generated JSON manifest totals
(`/generated/catalog-reference/**`, `/generated/portal-catalog/**`) were not yet scanned — added
as a new `generatedAssetTotals` field, deliberately kept separate from the per-design
referenced/orphaned/purged classifier since generated manifests have no single `designId`.

Prepared (not executed) a dev-only Functions deployment checkpoint proposing exactly
`functions:inventoryCatalogImageStorage` — the file dependency closure was traced and confirmed to
include no unrelated pre-existing uncommitted files, mirroring Goal #11's own
pre-deployment-conflict-check practice.

**Tests**: 82 focused tests passing (up from 80 — 2 new for generated-asset aggregation). Goal
#9/#11 regression suite (32 tests) unaffected. Functions build, Portal typecheck, and changed-file
lint all exit 0.

**Nothing migrated. Nothing backfilled. Nothing deployed. Nothing deleted. Production untouched.**
No consumer component was modified. No design Firestore document was written to.

Round 2 checkpoint: `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-owner-sample-checkpoint-round-2.md`.
Inventory-callable independent review + deployment checkpoint proposal:
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-inventory-functions-deployment-checkpoint.md`.

Next: **stop for owner approval of (1) final dimensions/quality (1024×1024 @ Q82 recommended) via
the expanded contact sheet, and (2) whether to deploy only `inventoryCatalogImageStorage` to
`fresh-prints-dev`.** Do not proceed to consumer migration, backfill, any Functions deployment
(including the inventory callable itself), Storage Rules deployment, or cleanup until the owner
responds. Do not start Goal #13. Do not reopen Goals #9, #10, or #11. Do not sign off Goal #12.

## 2026-07-30 — Goal #12 `catalog-image-derivative-storage-consolidation` — owner decisions recorded; inventory callable deployed

Owner approved all three round-2 checkpoint items: (1) final shared display derivative —
1024×1024 max bounding box, transparent WebP, Q82, downscale-only, aspect-ratio-preserving,
no crop/stretch/distortion; (2) no separate tiny thumbnail in the target architecture — one shared
derivative serves both grids and larger previews; existing `thumbnailPath`/`previewPath` retained
temporarily for migration fallback/rollback only; (3) `inventoryCatalogImageStorage` dev deployment
to `fresh-prints-dev` only. Owner explicitly accepted the measured grid-bandwidth trade-off (~86 KB
vs ~23 KB for a representative 8-card grid), reasoning that the absolute total stays small and the
shared derivative eliminates lightbox upscaling. All decisions recorded directly in the round-2
checkpoint artifact and this state file.

Verified the exact exported Function name before deploying: `export const
inventoryCatalogImageStorage = onCall(...)` (`functions/src/inventoryCatalogImageStorage.ts:93`)
matches `export { inventoryCatalogImageStorage } from "./inventoryCatalogImageStorage";`
(`functions/src/index.ts:15`) exactly — no `[NEEDS REPO CHECK]` required, deployment proceeded.

Deployed exactly:
```
firebase use fresh-prints-dev
firebase deploy --only functions:inventoryCatalogImageStorage
```
`functions[inventoryCatalogImageStorage(us-central1)] Successful create operation.`, exit 0,
2026-07-30T04:13:23Z UTC. Node.js 20 (2nd Gen), us-central1. Only this one function was deployed —
confirmed via CLI output. No Storage Rules, Firestore Rules/indexes, App Hosting, other Functions,
migration, or Storage object changes occurred. Production was never targeted.

**Could not run the real inventory from this environment.** `inventoryCatalogImageStorage` is an
`onCall` function gated by `request.auth` plus a Firestore `users/{uid}` owner/admin role check —
this requires a real Firebase Auth ID token from a signed-in staff account, which is categorically
different from `firebase` CLI project-level login and is not available in this environment.
Provided the owner an exact DevTools-console invocation snippet (using the same
`httpsCallable`/`getFunctions` pattern as every existing Studio admin callable, e.g.
`purgeArchivedDesignAssetsService.ts`) to run from a signed-in owner/admin Studio session, plus a
noted (not built) option for a dedicated dev-console button in a future pass. Deployment checkpoint
artifact updated with the actual result and the invocation instructions:
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-inventory-functions-deployment-checkpoint.md`.

**Nothing migrated. Nothing backfilled. No display derivative generated or written anywhere.
`displayPath` remains unpopulated on every design record. No preview/thumbnail/original Storage
object was touched. Production untouched.**

Next: **paused pending the owner (or an authenticated owner/admin Studio session) actually running
`inventoryCatalogImageStorage` and sharing the resulting JSON report.** Once real inventory data is
available, complete the required analysis (average bytes/design, per-family totals, estimated
post-migration Storage, suspected duplicates/orphans) and write the real dev Storage inventory
report artifact. Do not begin consumer migration, backfill, deletion, or the next implementation
checkpoint until that analysis is complete and reviewed. Do not start Goal #13. Do not reopen Goals
#9, #10, or #11. Do not sign off Goal #12.

## 2026-07-30 — Goal #12 `catalog-image-derivative-storage-consolidation` — dev-only Studio invocation control added

Owner reported the DevTools-console invocation snippet failed (`Failed to resolve module specifier
'firebase/functions'` — bare npm imports aren't resolvable in the Electron renderer console). Added
the smallest dev-only Studio surface to run the already-deployed `inventoryCatalogImageStorage`
callable instead: `catalogImageStorageInventoryService.ts` (exact `httpsCallable`/`functions`
pattern, mirroring `retentionMaintenanceService.ts`) and `CatalogImageStorageInventoryPanel.tsx`
(mirrors `RetentionMaintenancePanel.tsx` exactly — same Button/loading/error/result conventions),
wired into the existing `TestDataResetPage.tsx` as a new sibling panel. No new gating logic was
written — the panel inherits the page's existing `isOperationalWipeUiEnabled()` (dev + allowlisted
project) and `canWipe`/`permissionService` (owner-only) gates verbatim, since it only renders past
both checks already in place. Labeled "Run Catalog Storage Inventory"; shows a loading state while
running, a clear success/failure result, and a "Copy Inventory JSON" clipboard action. No delete,
migration, backfill, or cleanup capability exists in either new file — confirmed by direct
inspection, matching the already-deployed callable's own read-only guarantee.

Studio build, repo-wide lint, changed-file lint, and `git diff --check` all exit 0. No focused
automated test was added — confirmed this repository has no existing test-file convention for
`test-data-reset` panels (none of its existing components have test files), consistent with this
being thin UI wiring around an already-independently-reviewed and already-unit-tested backend
callable.

No Function was deployed. No Rules were deployed. Production was not touched. No migration,
backfill, or consumer cutover occurred.

Next: **owner runs Studio locally (dev build, signed in as owner, pointed at `fresh-prints-dev`),
opens Test Data Reset, clicks "Run Catalog Storage Inventory," and shares the copied JSON.** Once
received, complete the required real-inventory analysis and write the report artifact. Do not
begin consumer migration, backfill, deletion, or the next implementation checkpoint until that
analysis is complete and reviewed. Do not start Goal #13. Do not reopen Goals #9, #10, or #11. Do
not sign off Goal #12.

## 2026-07-30 — Goal #12 `catalog-image-derivative-storage-consolidation` — CLOSED by owner after real inventory (closed_by_owner_after_inventory)

Owner ran the deployed `inventoryCatalogImageStorage` callable against real `fresh-prints-dev`
data via the dev-only Studio panel. Measured results: 87 designs scanned; originals 81 objects /
980,807,863 bytes; thumbnails 87 objects / 2,820,654 bytes; previews 81 objects / 20,676,202 bytes;
display derivatives 0/0; zero orphans, zero missing objects, zero promotion-cool-off duplicates,
zero purge-policy violations. **Originals account for ~97.66% of measured catalog Storage**;
existing thumbnails + previews combined use only 23,496,856 bytes. Recorded in
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-real-dev-inventory-report.md`
with the required honest interpretation: consolidation remains architecturally worthwhile but
would not meaningfully reduce total catalog Storage, since the addressable byte pool is ~2.3% of
the measured total and originals (untouchable by design) dominate.

**Owner decided to stop the goal before implementation** — an evidence-based decision, not a
failed implementation: the required backfill, consumer cutover across Portal and Studio, and
accepted grid-bandwidth increase (~86 KB vs ~23 KB per typical 8-card grid) were not justified by
the small measured Storage win.

The prior implementation session had been interrupted mid-Implement, having begun wiring
`displayPath` into shared types and constants but not reaching any consumer, generation, or
backfill code. Every touched file was inspected individually against its git baseline (or read
directly for untracked pre-existing files) to separate Goal #12's own additions from unrelated
pre-existing uncommitted work already present in this working tree from many other in-progress and
already-signed-off goals — confirmed via a 543→539 file-count delta, exactly accounting for the
files removed. Removed: `getDisplayStoragePath()` and its dedicated test, the
`DISPLAY_CANDIDATE_DIMENSIONS_PX`/`DISPLAY_CANDIDATE_QUALITY` migration-only constants and their
dedicated test, the unused `displayPath` field from Studio's `Design`/`CreateDesignInput`/
`UpdateDesignInput`, Portal's `CatalogDesign`, and the generated `PortalCatalogCard` type, and the
corresponding `mapPortalCatalogCard` handling line plus its dedicated test suite. Retained:
`DESIGN_STORAGE_ROOTS.display` (read by the already-deployed callable — removing it would desync
source from the live function without a redeploy this pass doesn't authorize), the full inventory
tool (callable + pure classification logic + dev-only Studio panel), all Goal #12 workflow
artifacts, and one regression test (generalized, no longer Goal-#12-specific) protecting
`originalPath`-only Show Queue/gang-sheet export behavior. No unrelated pre-existing change was
reverted or touched.

Verification: `cd functions && npm run build` (0), `npm run typecheck --workspace
@fresh-prints/portal` (0), `npm run build:studio` (0), `npm run lint` (0), changed-file eslint (0),
`git diff --check` (0), focused tests 53/53 passing.

**Nothing migrated. Nothing backfilled. No display derivative ever generated for any real design.
No consumer cut over. No thumbnail or preview deleted. No production original modified. No Storage
cleanup occurred. Production untouched throughout.**

Signoff: `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-signoff.md`
— **closed_by_owner_after_inventory**.

Goal #12 no longer blocks `production-release`. Goals #9–#12 are all now signed off/closed.

## 2026-07-30 — Goal #13 `production-release` — Plan phase started

Per owner instruction, immediately following Goal #12's closure, started the `production-release`
Plan phase (`Managed Phase` command). This pass authorizes Plan and Formal Review preparation
only — no implementation, deployment, migration, or production action.

See `docs/workflow/plans/2026-07-30-production-release-plan.md` and
`docs/workflow/reviews/2026-07-30-production-release-review.md` for full detail.

Next: owner review of the Plan's flagged decisions and `[NEEDS REPO CHECK]`/`[NEEDS OWNER INPUT]`
items. Do not implement or deploy production. Do not touch production data, Storage, or secrets.

## 2026-07-30 — Goal #13 `production-release` — Plan + independent Formal Review complete (approved_with_notes)

Wrote `docs/workflow/plans/2026-07-30-production-release-plan.md` (19 sections: launch-readiness
inventory, exact ship/exclude scope, Functions/Rules/Indexes/App-Hosting deployment scopes, env-var
and Secret Manager inventory, production domains, password-reset/action-URL config, GA4 go-live
sequencing, SEO readiness, branch/release strategy, migration determination (cold-start, no prod
project exists yet), dependency-closure audit deferred to deploy time, build/lint gate, 10-item
smoke-test checklist, rollback strategy per component, 10-checkpoint human-approval sequence,
post-launch monitoring, and 12 consolidated `[NEEDS OWNER INPUT]` + 7 `[NEEDS REPO CHECK]` items).
Every claim was sourced to a specific repo file read this pass (`.firebaserc`, `firebase.json`,
`storage.rules`, `apphosting.yaml`, env example files, `DEPLOYMENT.md`, `BACKEND.md`,
`ARCHITECTURE.md`, `DATA_MODEL.md`, `CODING_STANDARDS.md`, `TESTING.md`, the Goal #12 signoff, the
Portal SEO signoff + reaffirmation, the `portal-google-analytics` signoff checkpoint, and the
Test Data Reset dev-only gate source). No file path, API, branch, or deployment mechanism was
invented; every gap in repo evidence was marked `[NEEDS REPO CHECK]` or `[NEEDS OWNER INPUT]`
rather than assumed.

Wrote `docs/workflow/reviews/2026-07-30-production-release-review.md` as an independent review
pass — cross-checked every factual claim in the Plan against direct source reads (not against the
Plan's own prose). Verdict **approved_with_notes**: confirmed no fabricated paths/APIs/mechanisms
and confirmed the Plan correctly declines to guess wherever repo evidence is genuinely absent; four
minor scoping gaps noted as first Implementation sub-steps (full indexes-file read, Studio
build-time Firebase config confirmation, Auth email template Console-state check, and a full
dependency-manifest grep for existing error-tracking tooling) — none change the Plan's shape or
sequencing.

**No implementation, deployment, migration, secret, or production action occurred in this pass.**
Production Firebase project does not exist. No Functions, Rules, Indexes, or App Hosting
configuration were touched. No env var or secret was set anywhere.

Next: **STOP.** Await owner review of the Plan's flagged decisions (12 `[NEEDS OWNER INPUT]`
items, Plan §5) and explicit approval before Implementation may begin.

## 2026-07-30 — Goal #13 `production-release` — Implementation-readiness checkpoint complete; stopped at production Firebase project creation checkpoint

Recorded all 18 owner decisions from the task instruction as approved and binding: separate
production project; exclude `wipeOperationalTestData` and `inventoryCatalogImageStorage` from
production; keep Test Data Reset/inventory panel on existing dev-only gates; canonical URL
`https://myprintrequest.com` with `www` redirect if connected; continue direct-to-master manual
deploys, no CI/CD/release-branch; launch on code defaults where safe then configure via Studio;
soft launch before announcement; GA4 stays disabled until property+Enhanced-Measurement-
disabled+privacy-policy+separate checkpoint; Firebase Console/Functions-logs/Firestore-
usage/Resend-Brevo dashboards for initial monitoring; Sentry-class tooling is post-launch;
verify Studio production config mechanism before any installer; explicit Functions allowlists
always, never bare `--only functions`; no production deploy without separate explicit approval.

Resolved every repo-check from the approved Plan:
- Re-enumerated the full current `functions/src/index.ts` export list fresh from source (not
  copied from memory) and classified every function. 5 functions flagged for owner classification
  beyond the two explicitly named for exclusion: `testAiEnrichmentPlayground`,
  `testAiEnrichmentTagRerank`, `ownerDeleteUser`, `backfillPrintRequestQueueTab`,
  `rebuildCatalogSnapshots` (the last is likely needed once, post-deploy, to bootstrap generated-
  catalog snapshots — not excluded, but its invocation is its own checkpoint).
- Read the complete 61-index `firestore.indexes.json` in full. No duplicates, no dev/test-only
  indexes found. All indexes trace to real Portal/Studio/Functions query paths. Recommend
  deploying the file unmodified.
- App Hosting env-var mechanism could not be fully resolved without live CLI/Console access —
  correctly left `[NEEDS REPO CHECK]` against the installed Firebase CLI version at
  Implementation time, rather than guessing a schema.
- Found the exact production-URL-resolver file: `functions/src/lib/email/portalUrlResolver.ts`.
  **Important finding:** it already hardcodes a `"fresh-prints-prod"` key mapping to
  `https://myprintrequest.com` — a pre-existing assumption, not an owner-confirmed fact. Flagged
  that this file requires a one-line edit if the owner picks any other project id.
- Traced Studio's Firebase config: build-time only, via Vite `VITE_FIREBASE_*` env vars read from
  `apps/studio/.env.local` at `npm run build:studio` time, baked into the packaged bundle by
  electron-builder. Production requires a separate build invocation with swapped env values —
  recommended (not implemented) a `.env.production.local` convention for safe swapping.
- Searched all package.json files for Sentry/Bugsnag/LogRocket/Datadog/Rollbar — zero matches.
  Firebase Console + provider dashboards are confirmed the only monitoring surfaces today.
- Audited the live working tree: 542 changed entries (312 untracked, 229 modified, 1 deleted).
  The one deleted file (`useCustomers.ts`) is unrelated pre-existing work from another in-progress
  goal — not touched. **Conclusion: this repository is not yet in a single clean, committed state
  suitable as the direct source for a production build** — recommended a dedicated commit/
  reconciliation pass before the Functions/Portal/Studio build steps in the deployment sequence.
- Classified Firestore settings/reference docs for cold-start: categories recommended before
  first real use; tags/printRequestLimits/customerUploadQuotas/portalHelp/portalSocialMeta/
  brandLogos/aiEnrichment all have safe code defaults; emailProviders should be explicitly
  selected before relying on any transactional email; upcomingShows are owner-configurable
  post-deploy, not launch-blocking.
- Prepared the secret-name checklist (`GEMINI_API_KEY`, `RESEND_API_KEY`, `BREVO_API_KEY` if
  selected, `ETSY_X_API_KEY`) and external-provider checklist (Resend/Brevo sender verification,
  Authorized Domains, Auth email templates, Google sign-in config, VAPID web-push cert) without
  printing, requesting, or storing any actual secret value.

Wrote beginner-friendly production Firebase project creation instructions (Console navigation,
project-ID permanence warning, how to avoid touching `fresh-prints-dev`, Firebase-built-in
Analytics vs Portal GA4 distinction, which products will be needed later, Blaze billing note,
what success looks like) and the exact 4-item information return checkpoint.

Created
`docs/workflow/reviews/2026-07-30-production-release-implementation-readiness-checkpoint.md`
covering every required section: recorded decisions, resolved repo checks, exact Functions
include/exclude allowlist (89 include, 2 explicit exclude, 5 needing owner classification), full
index audit, App Hosting env mechanism, Studio config mechanism, production project-ID resolver
file, working-tree readiness, cold-start settings classification, secrets/provider checklist,
project creation instructions, 19-step ordered deployment sequence, rollback sequence, smoke-test
sequence, all remaining human checkpoints, and explicit confirmation no production action
occurred.

Verification (read-only/local only): `cd functions \&\& npm run build` (0), `npm run typecheck
--workspace @fresh-prints/portal` (0), `npm run build:portal` (0, confirmed on third attempt after
capturing the exit code directly; first two attempts hit Windows-filesystem-only `.next`
staging-directory races — `EPERM` on a stale trace lock, then `ENOENT` on a `500.html` rename —
not code defects; all 19 pages compiled successfully in every attempt), `npm run build:studio`
(0), `npm run lint` (0), `git diff --check` (0, only benign LF/CRLF advisory warnings from
Windows checkout config). **No `firebase deploy` command of any kind was run.**

**No production resource was created, configured, modified, or deployed. No Firebase project
created. No secret set. No Rules/indexes/Functions/App-Hosting/DNS/Auth configuration touched. No
GA4/Search-Console property created. No production email sent. No production Studio installer
built. No production data migrated or seeded. No public announcement. No production traffic.**

Next: **STOP.** Await the owner's production Firebase project ID, project-creation confirmation,
billing/Blaze confirmation, and confirmation no deployment has occurred, per
`docs/workflow/reviews/2026-07-30-production-release-implementation-readiness-checkpoint.md` §4.
Do not proceed to any step in the Ordered Deployment Sequence until that information arrives and
is explicitly acted on with its own separate approval per step.

## 2026-07-30 — Goal #13 `production-release` — Production project checkpoint CONFIRMED; Functions allowlist FINALIZED; working tree RECONCILED; stopped at release-source/allowlist checkpoint

Owner confirmed: production Firebase project ID `fresh-prints-prod`; project created; Blaze
billing active; no deployment or configuration of any kind has occurred. Verified against current
source that `functions/src/lib/email/portalUrlResolver.ts` already maps
`"fresh-prints-prod" -> "https://myprintrequest.com"` exactly — confirmed no resolver edit is
required.

Owner recorded final decisions on the 5 previously-flagged Functions: exclude
`testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`, `ownerDeleteUser` (quarantined/
destructive per BACKEND.md — product path is `tombstoneCustomerAccount`, included),
`backfillPrintRequestQueueTab` (cold-start project, nothing to backfill). `rebuildCatalogSnapshots`
was source-verified against all six required conditions
(`functions/src/catalogSnapshots/publishCatalogSnapshots.ts:811-835`): owner/admin-gated via
`assertOwnerAdmin`, non-destructive (only writes versioned snapshot content + manifests, generation-
preconditioned), the documented mechanism for catalog-reference + Portal-catalog snapshot
publication (ADR-FP-120), required for production catalog data to have a working generated read
model, and contains zero dev-only assumptions (no project-id check anywhere in the function body)
— included.

**Final Functions allowlist, programmatically verified from a fresh read of
`functions/src/index.ts`: 105 total exports, 99 include, 6 exclude.** Exact included/excluded
lists and the exact (unexecuted) future `firebase deploy --project fresh-prints-prod --only
functions:...` command recorded in
`docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`.

**Working-tree reconciliation:** classified all 541 remaining changed entries (before this pass:
542; one file removed). ~505 entries trace cleanly to specific already-signed-off or owner-
approved goals (`firestore-usage-efficiency-wave-c`, `portal-print-request-prelaunch-stability`,
`portal-google-analytics`, the Firebase Debug window feature, `assisted-creation-reference-image-
mb-limit-increase`, both customer-upload-oversized/timeout goals,
`customer-upload-early-transparency-format-validation` (Goal #14), `studio-test-data-print-limit-
wipe-audit`, the `test:rules` harness); 6 are this goal's own documentation; 4 are Goal #12's
retained dev-only inventory tooling (confirmed still behind existing dev-only gates); 1 file
(`apps/studio/.../print-requests/hooks/useCustomers.ts`, deleted) has uncertain, unrelated
provenance and was deliberately left untouched, flagged for a separate owner decision. Explicitly
searched for secret-bearing/local-only/build-output files — zero found in the changed set (all
correctly gitignored or, in the one `.env.example` case, a safe committed template).

**Removed exactly one proven-debris file:** `functions/test-admin-auth.mjs` — an unreferenced,
hardcoded-to-`fresh-prints-dev` ad-hoc scratch script left over from this goal's own earlier
DevTools-console troubleshooting, not used by any script, test, or documented command. Nothing
else was removed, reverted, or touched.

**Verified dev-only gating remains intact:** Test Data Reset UI, Catalog Storage Inventory panel,
and the Firebase Debug window all share the same unconditional `import.meta.env.DEV` +
project-allowlist build-time gate, independent of which Firebase project a build targets — a
production Studio build excludes all three regardless. Functions-side exclusion is enforced via
the explicit allowlist itself (not solely the runtime owner/admin gate), per explicit instruction.

**Proposed release-source strategy:** reconcile directly on `master`, committed in ~11 goal-sized
commit boundaries (one per already-signed-off/approved goal, matching this repository's existing
commit-message convention) — no new release branch, since this repository has no release-branch
precedent and owner decisions #7/#8 (recorded in the prior pass) explicitly forbid introducing a
new branch policy for this goal. **No commit or branch was created in this pass** — the inclusion
set is large, so work stops here for explicit owner approval of the commit-boundary plan, per
instruction.

**Prepared (not applied)** an additive `.firebaserc` edit: add `"production": "fresh-prints-prod"`
alongside the untouched `"default": "fresh-prints-dev"`. Non-mutating, contacts no Firebase
service — documented for the next checkpoint rather than applied now.

Verification (read-only/local only, after the one file removal): Functions build (0), Portal
typecheck (0), Studio typecheck (0), Portal build (0, confirmed via direct exit-code capture),
Studio build (0, confirmed via direct exit-code capture), repo lint (0), `git diff --check` (0,
only benign LF/CRLF advisories). **No `firebase deploy` command of any kind was run.**

Artifacts created: `docs/workflow/reviews/2026-07-30-production-release-working-tree-
reconciliation-report.md`, `docs/workflow/reviews/2026-07-30-production-release-functions-
allowlist-report.md`, `docs/workflow/reviews/2026-07-30-production-release-source-and-allowlist-
checkpoint.md`; updated `docs/workflow/reviews/2026-07-30-production-release-implementation-
readiness-checkpoint.md` with a superseding addendum.

**No production resource was created, configured, modified, or deployed. No secret set. No
Rules/indexes/Functions/App-Hosting/DNS/Auth/GA4/Search-Console configuration occurred. No branch
created. No commit made. Production remains the empty, Blaze-billed, unconfigured
`fresh-prints-prod` project the owner reported.**

Next: **STOP.** Await owner decisions on the release-source commit-boundary plan, the
`useCustomers.ts` deletion disposition, and the `.firebaserc` alias application, per
`docs/workflow/reviews/2026-07-30-production-release-source-and-allowlist-checkpoint.md`.

## 2026-07-30 — Goal #13 `production-release` — Permanent branch model created: `production` + `development` pushed from verified commit; v1.0.0-rc1 tagged; stopped at GitHub-settings checkpoint

Verified the owner-reported already-pushed release candidate before touching anything: `git
branch --show-current` = `master`; `git status --short` = clean; `git rev-parse HEAD` =
`b45542ab66a9f6fafb1142201b29fc6d7a969376`, exactly matching `git rev-parse origin/master`; commit
message matched verbatim; remote confirmed `origin` ->
`https://github.com/roasted-garlic/freshprints.git`. Did not recreate, amend, recommit, or
force-push anything.

Checked `.firebaserc` as actually committed in `b45542ab` via `git show b45542ab:.firebaserc` —
confirmed the `production` alias was **not** present (only `"default": "fresh-prints-dev"`).
Added exactly `"production": "fresh-prints-prod"`, preserved the default unchanged, validated as
JSON, committed narrowly (only `.firebaserc` staged) as `aa570aa` ("chore: add production Firebase
project alias"), pushed to `origin/master` (fast-forward, no force).

**Branch-point commit: `aa570aa875d20ba85fd405480a47e6eda59f85b0`** (used instead of `b45542ab`
since the alias was missing).

Created `production` from that exact commit (`git switch -c production aa570aa...`), pushed with
`git push -u origin production` (tracking set, no new commits added to it). Created `development`
from the identical commit (`git switch -c development aa570aa...`), pushed with `git push -u
origin development` (tracking set); left the repository checked out on `development` as required.

Verified via `git fetch origin` + `git rev-parse` that `origin/master`, `origin/production`, and
`origin/development` all resolve to the exact same hash `aa570aa875d20ba85fd405480a47e6eda59f85b0`.
`git branch -vv` confirmed `development` tracks `origin/development` and `production` tracks
`origin/production`; `git status` confirmed a clean working tree on `development`.

Confirmed `v1.0.0-rc1` did not exist locally or on `origin` (`git tag -l` + `git ls-remote --tags`
both empty for that name) before creating it. Created an annotated tag on the exact branch-point
commit (`git tag -a v1.0.0-rc1 aa570aa... -m "Fresh Prints initial production release
candidate"`), verified via `git show v1.0.0-rc1 --no-patch` that it points to `aa570aa` exactly,
and pushed it to `origin`. **This is the release-candidate tag only — the final `v1.0.0` tag is
not created until after production deployment and smoke testing pass**, per explicit instruction.

Updated `docs/standards/DEPLOYMENT.md` with a new "Branch Model" section (development workflow,
production release workflow, hotfix workflow) recording the owner-approved permanent
`development`/`production` structure and explicitly marking the previous direct-to-`master` policy
as superseded; updated the Environments table's Branch/trigger column to reference the new
branches. This state.md entry, `docs/project/ROADMAP.md`, `CURRENT-STATE.md`, and the
recent-completed-work handoff were also updated to record this transition — all committed to
**`development` only**, per explicit instruction (not merged into `production` this pass).

**`master` was NOT deleted** (local or remote) — retained as the required temporary transition
fallback per explicit instruction. No Firebase product was enabled. No Firestore Rules, Storage
Rules, indexes, Functions, secrets, App Hosting, DNS, Authentication, GA4, or Search Console
configuration occurred. No production Studio installer was built or distributed. No production
data was touched. The active Firebase CLI project was never switched (no `firebase use` command
of any kind was run). **No force-push occurred at any point** — every push in this pass was a
clean fast-forward or new-branch push.

Next: **STOP.** Await the owner performing the GitHub UI steps to (1) change the default branch
from `master` to `development`, (2) add branch protection to `production` (block force-push, block
deletion, require PR/merge where supported), and (3) confirm no GitHub integration still assumes
`master` — then confirm back. `master`'s eventual deletion remains its own separate, explicit
future checkpoint, gated on those confirmations plus explicit owner approval to delete.

## 2026-07-30 — Goal #13 `production-release` — GitHub ruleset limitation recorded; local pre-push safeguard added; stopped at Firebase product-enablement checkpoint

Re-verified from Git (not assumed) before any action: `git branch --show-current` = `development`;
`git status` clean; `git fetch origin` then `git rev-parse` confirmed `origin/master` =
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `origin/production` =
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `origin/development` =
`e2d6cde99c72a8d0c3966861b1e1460d520bc9cb` (the prior documentation commit), and
`v1.0.0-rc1` still resolves to `aa570aa875d20ba85fd405480a47e6eda59f85b0`. `master` and
`production` were not touched this pass.

Recorded the GitHub ruleset status accurately, as instructed: created, targets `production`, but
GitHub's own message confirms it is not enforced on this private repository until the organization
moves to a GitHub Team (or equivalent) plan — the owner is not upgrading this pass. Documented the
full intended ruleset configuration as future-ready documentation only, not a present guarantee.

Checked for existing hook conventions first: no `.githooks/`, no `core.hooksPath`, no `pre-push`
hook, no husky/hook-management package anywhere in the repo's `package.json` files — no conflict.
Added `.githooks/pre-push`, a POSIX shell script (executable) that blocks a direct push to
`refs/heads/production` (clear message pointing to the PR-promotion workflow), permits an explicit
`ALLOW_DIRECT_PRODUCTION_PUSH=1` emergency override, and leaves `development` and every other
branch untouched. Directly tested all four cases (blocked, override-allowed,
development-untouched, feature-branch-untouched) — all passed. Left `core.hooksPath`
unconfigured/inert, since activating it is its own separate owner-approval step per instruction;
documented the exact one-time `git config core.hooksPath .githooks` command each clone must run
once approved.

Substantially expanded `docs/standards/DEPLOYMENT.md`'s Branch Model section: GitHub ruleset
status/intended-settings table; pre-push safeguard documentation; refined
development/production-release/hotfix workflows (PR-based promotion only, fast-forward-only pull
on `production`, explicit `--project` flags on every Firebase command); new "Firebase branch and
project separation" table; restated Functions allowlist/exclusion list and the never-bare-allowlist
rule; restated the 8-condition `master` deletion policy verbatim; and a new beginner-friendly
"Next checkpoint — Firebase product enablement" subsection (Firestore Native-mode + location
choices flagged permanent, Storage, Authentication, Email/Password + Google sign-in, Web App
registration, recording its config into a local gitignored file rather than committing it, the Web
Push certificate, and preparing but not completing the App Hosting backend).

**No Firebase Console action was performed on the owner's behalf this pass.** No Rules, Storage
Rules, indexes, Functions, App Hosting rollout, or Portal deploy occurred. No secret, DNS,
production user, or production data was configured/created/seeded. No production Studio installer
was built. No GA4 or Search Console configuration occurred. `production` was not modified.
`master` was not deleted. **No force-push occurred.**

Next: **STOP.** Await the owner performing the Firebase Console product-enablement steps and
reporting back (in particular, confirming the production web-app config was recorded locally and
not committed), per `docs/standards/DEPLOYMENT.md`'s "Next checkpoint" subsection.

## 2026-07-30 — Goal #13 `production-release` — Repository made PUBLIC; production ruleset CONFIRMED ACTIVE via GitHub API; full public-repository security audit PASS (one owner-review finding); stopped at production-security checkpoint

Re-verified branch/tag state directly from Git before any action (unchanged from the prior pass):
current branch `development`, clean tree; `origin/master` = `aa570aa875d20ba85fd405480a47e6eda59f85b0`;
`origin/production` = `aa570aa875d20ba85fd405480a47e6eda59f85b0`; `origin/development` =
`07d134a9124733e1698f31a5aec92fe51770dd54`; `v1.0.0-rc1` still resolves to
`aa570aa875d20ba85fd405480a47e6eda59f85b0`. **`master` and `production` were not touched.**

**Independently confirmed (not just owner-reported) that the repository is now public** via the
public, unauthenticated GitHub API: `curl https://api.github.com/repos/roasted-garlic/freshprints`
returned `"private": false, "visibility": "public"`.

**Independently confirmed the `production` ruleset is genuinely active** via
`curl https://api.github.com/repos/roasted-garlic/freshprints/rulesets` and the ruleset detail
endpoint — real GitHub API data, not owner say-so: `"enforcement": "active"`, target
`refs/heads/production`, rules present for `deletion` (restrict deletions), `non_fast_forward`
(block force pushes), and `pull_request` with `required_approving_review_count: 0` (require PR
before merge, 0 required approvals) — exactly the intended configuration. No status-check,
signed-commit, or linear-history rule present (correctly absent); no bypass actors present (empty
bypass list). **The prior "not enforced — private repo plan limitation" statement is now
superseded and confirmed resolved.**

**Performed the full public-repository security audit** (previously missing, now required before
any production secret/credential/Firebase configuration):

*Current working tree* — `git ls-files` scanned for secret-shaped filenames (only `.env.example`
templates and `functions/src/lib/secrets.ts`, which only declares secret *names* via Firebase
`defineSecret`/`defineString`, never values); `git grep` scanned tracked file contents for Google
API key pattern, PEM private-key headers, `service_account` JSON structure, AWS/OpenAI/Slack/
GitHub/GitLab token prefixes, X.509 certificates, and hardcoded password assignments — **zero
matches** for all. Confirmed `functions/.env.fresh-prints-dev` exists on disk but is genuinely
untracked (`git show HEAD:...` fails; `git check-ignore -v` confirms `functions/.gitignore`
correctly excludes it) — not exposed. `.cursor/mcp.json` uses `${env:VAR_NAME}` interpolation only,
never a literal credential. `storage.cors.json` contains only public dev domain names. Reviewed
all tracked binary files (`*.png/.jpg/.zip/.pdf` etc.) — only two legitimate PWA manifest icons
found, no customer artwork or data exports. Reviewed all tracked `*.csv/.json/.sqlite/.bak/.dump`
files — only ordinary repo config files (`hooks.json`, `mcp.json`, `version.json`,
`storage.cors.json`), no data export format found.

*Complete reachable Git history* — confirmed all 17 refs (5 local branches, 5 remote-tracking
branches, 1 tag, plus 3 local-only `refs/original/refs/heads/*` history-rewrite backup refs and 3
local-only `refs/codex/turn-diffs/*` checkpoint refs — the latter six confirmed via `git ls-remote
origin` to NOT exist on GitHub, i.e. not part of the public exposure surface, but still included in
the `--all` scan for thoroughness) across 131 total reachable commits. Scanned every historical
tree via `git rev-list --all | xargs git grep` for the same patterns as the current-tree scan
(Google API keys, PEM headers, service-account JSON, common token prefixes, AWS keys) — **zero
matches in any historical commit**. Checked every file ever deleted across all history for
secret-shaped filenames — only `.env.example` was ever "deleted," and that was a same-content
file-move as part of the `apps/studio` monorepo-restructure commit, not a real secret removal.
Checked every file ever added across all history for `.env.local` or `firebase-adminsdk*.json`
patterns — **zero matches**.

**One real finding, not a credential/secret exposure:** a real personal email address (the
repository owner's own address, used as a real dev/test account reference) appeared in
`docs/workflow/reviews/2026-07-17-portal-notifications-alert-missing-investigation.md`, present
consistently across every historical commit touching that file (not something later hidden or
scrubbed). This was personal data exposed in a public repository, but it was the owner's own
address in an internal debugging note, not a third-party customer's PII and not a credential. A
second, lower-concern email (a test fixture value in
`functions/src/lib/customerUpdateValidation.test.ts`) was not confirmed real customer data.
**Update (2026-07-30, later pass): owner approved redaction of both from the current tree — see
that pass's log entry below for the resolution. History was not rewritten; both original
addresses may still exist in historical commits.**

**Audit verdict: PASS.** No probable real credential, private key, service-account file, or
third-party customer/financial/legal/personnel data was found in the current tree or anywhere in
reachable Git history. Production credential creation is not blocked by this audit, though the
owner should decide on the one personal-email finding before or independently of continuing.

**Public non-secret content reviewed and classified:** architecture/data-model/backend docs,
workflow plans/reviews/signoffs, `docs/standards/DEPLOYMENT.md`'s operational deployment
instructions, `docs/project/ROADMAP.md`, project IDs (`fresh-prints-dev`, `fresh-prints-prod` —
project IDs are not secrets by Firebase design), the production Functions deployment allowlist, and
internal business/workflow procedure descriptions are all **acceptable for a public repository** —
they describe engineering process and architecture, not credentials or private business data. No
private customer, financial, legal, personnel, or vendor-account information was found anywhere in
this review.

Documented the local pre-push hook (`.githooks/pre-push`) as an **optional defense-in-depth
safeguard** now that the GitHub ruleset provides confirmed server-side protection — left unaltered
and still inert (`core.hooksPath` not configured), per instruction not to activate it this pass.

Updated `.cursor/workflow/state.md`, `docs/project/ROADMAP.md`, `docs/standards/DEPLOYMENT.md`,
`references/project-chatgpt-handoff/CURRENT-STATE.md`, and
`references/project-chatgpt-handoff/13-recent-completed-work.md` to record: public visibility,
the superseded private-plan ruleset warning, the confirmed-active ruleset configuration, the full
audit result (PASS + the one owner-review finding), and the now-optional pre-push hook status. All
committed to **`development` only**.

**No repository visibility change was made** (already public, per owner action, not this pass). No
Git history was rewritten. No force-push occurred. No Firebase product was enabled, no secret was
set, no Rules/indexes/Functions/App-Hosting/DNS/Auth/GA4/Search-Console configuration occurred, no
production Studio installer was built, no production data was touched. `master` and `production`
remain untouched.

Next: **STOP.** Await the owner's decision on the personal-email finding, then completion of the
Firebase product-enablement checkpoint already documented in `docs/standards/DEPLOYMENT.md`.

## 2026-07-30 — Goal #13 `production-release` — Both email findings REDACTED from current tree (owner declined history rewrite); Firebase product-enablement instructions finalized with evidence-based location recommendations

Re-verified branch/tag state directly from Git before any action (unchanged): current branch
`development`, clean tree; `origin/master`/`origin/production` both at
`aa570aa875d20ba85fd405480a47e6eda59f85b0`; `v1.0.0-rc1` unchanged. **`master` and `production`
were not touched this pass.**

Owner approved redacting the two email findings from the prior audit pass from the current
repository state. Located every current-tree occurrence via `git grep` (not the working `grep`,
which hung traversing `node_modules`): the personal owner-email finding appeared in
`docs/workflow/reviews/2026-07-17-portal-notifications-alert-missing-investigation.md` (1
occurrence) and in this very `state.md` file's own prior audit-log text (2 occurrences, since the
prior pass quoted the address verbatim while documenting the finding); the test-fixture email
appeared in `functions/src/lib/customerUpdateValidation.test.ts` (2 occurrences) and this file's
own prior audit-log text (1 occurrence). Replaced every occurrence with the specified non-real
placeholders (`owner@example.com`, `test-user@example.com`) and rewrote this file's own prior
audit-log paragraphs to describe both findings without repeating the original addresses.

**Owner decision recorded: do not rewrite Git history.** Reasoning (recorded verbatim per
instruction): neither finding is a credential; no third-party customer data was found; history
rewriting would change the established `master`/`production`/`v1.0.0-rc1` hashes; it would require
force-pushing public branches and retagging the release candidate; the remediation risk is
disproportionate to the finding. **Historical commits touching either file still contain the
original addresses** — confirmed present across every commit that ever touched those two files
(from the prior pass's full-history scan). A complete historical purge remains available only
through a separately approved history-rewrite Plan if the owner later decides it is necessary.

Verified via `git grep` (both patterns) that zero occurrences of either original address remain
anywhere in the current tracked tree — exit 1 (no match) for both searches.

Ran the focused unit test for the modified test file: `npx tsx --test
functions/src/lib/customerUpdateValidation.test.ts` — 3/3 pass, exit 0. Ran repo-wide lint
(`npm run lint`) — exit 0. Ran `git diff --check` — exit 0 (only benign LF/CRLF advisory
warnings, no real issues).

**Determined the Firestore and Storage production location recommendations from concrete repo
evidence, not guesses:**
- Firestore: **`nam5`** — sourced directly from this repository's own
  `docs/workflow/setup/firestore-setup.md` ("Recommended starting location: `nam5`"), the
  documented setup path already used for `fresh-prints-dev`. `nam5` (a US multi-region) includes
  `us-central1`, and `functions/src/lib/portalOgUrls.ts:39` hardcodes `us-central1` into every
  constructed Cloud Functions URL, confirming the deployed Functions fleet runs in `us-central1`
  regardless of project — `nam5` avoids cross-region latency with Functions while providing
  Firestore's higher multi-region availability, and matches the existing dev environment's
  documented choice.
- Storage: **`us-central1`** — sourced directly from
  `docs/workflow/setup/firebase-storage-setup.md` ("Recommended starting location:
  `us-central1`"), the same documented dev-setup recommendation, and directly matches the
  confirmed Functions region.
- Both recommendations are evidence-based and did not require stopping for owner confirmation
  before documenting them (though the owner may still override either if preferred for other
  reasons) — this differs from the App Hosting rollout-trigger question below, which genuinely
  could not be resolved from repository source.

Confirmed the App Hosting backend ID (`fresh-prints-portal`) and root directory (`./apps/portal`)
directly from `firebase.json`, not guessed. **Could not determine from repository source or
documentation whether creating an App Hosting backend via Console triggers an automatic first
rollout** — no file documents this specific product behavior for this Firebase CLI/Console
version. Marked `[NEEDS REPO CHECK]` and instructed stopping before any final
"Deploy"/"Finish"-style Console button that might trigger a live release, treating that as its own
separate deployment checkpoint rather than assuming either way.

Confirmed no `.env.production.local` file exists yet in this repository (only `.env.example` and
`.env.local` exist for both Portal and Studio) — the previously-suggested
`apps/portal/.env.production.local` / `apps/studio/.env.production.local` naming is a **proposed
convention, not an already-established one**, marked `[NEEDS REPO CHECK]` per instruction; both
proposed names are confirmed covered by the root `.gitignore`'s `.env.*.local` pattern
(`.gitignore:24`), so either is safe from being committed regardless of exact naming.

Substantially rewrote `docs/standards/DEPLOYMENT.md`'s "Next checkpoint — Firebase product
enablement" subsection with the exact, evidence-grounded Console navigation steps for Firestore,
Storage, Authentication (explicitly leaving Authorized Domains unchanged until the separate domain
checkpoint), Web App registration (explicit App-Hosting-vs-classic-Hosting distinction), Web Push
certificate, and App Hosting backend preparation (stopping before any rollout-triggering step).

Updated `.cursor/workflow/state.md` (this entry), `docs/project/ROADMAP.md`, and the
`references/project-chatgpt-handoff/` handoff files to record: redaction completed in the current
tree, no history rewrite performed, historical commits may still contain the prior addresses,
security audit verdict remains PASS, and the Firebase product-enablement checkpoint is next.

**No repository visibility change was made. No Git history was rewritten. No force-push occurred.
No Firebase product was enabled, no secret was set, no Rules/indexes/Functions/App-Hosting/DNS/
Auth/GA4/Search-Console configuration occurred, no production Studio installer was built, no
production data was touched, `rebuildCatalogSnapshots` was not invoked. `master` and `production`
remain untouched.**

Next: **STOP.** Await the owner completing the documented Firebase Console product-enablement
steps and reporting back, in particular confirming whether App Hosting backend creation triggers
an automatic rollout before that specific sub-step proceeds.

## 2026-07-30 — Goal #13 `production-release` — Firebase product enablement CONFIRMED COMPLETE; App Hosting backend CONFIRMED CREATED with no rollout; stopped at App Hosting first-release checkpoint

Re-verified branch/tag state directly from Git before any action (unchanged): current branch
`development`, clean tree; `origin/master`/`origin/production` both at
`aa570aa875d20ba85fd405480a47e6eda59f85b0`; `v1.0.0-rc1` unchanged. **`master` and `production`
were not touched this pass.**

Verified (read-only) the owner's reported Firebase product-enablement completion:
- Firestore: created, Native mode, location `nam5` — matches this session's own evidence-based
  recommendation exactly.
- Cloud Storage: default bucket created, `us-central1` — matches the recommendation exactly.
- Authentication: enabled with Email/Password + Google providers.
- Production Web App registered as `Fresh Prints Portal Production`; classic Firebase Hosting
  correctly **not** enabled during registration (this repo uses App Hosting, a distinct product).
- Production web configuration recorded locally in `apps/portal/.env.production.local`. Verified
  via `git check-ignore -v` that this exact path matches `.gitignore:24`'s `.env.*.local` pattern
  (ignored); via `git ls-files` that it is not tracked (empty result); via
  `git status --porcelain --ignored` that it shows the `!!` ignored marker; and via plain
  `git status --short` that it does not appear at all in the default status view. **No file
  content was read or printed at any point** — verification was existence + ignore-status only.
- Web Push VAPID key generated and recorded in the same local file.
- GA4 confirmed still disabled; `NEXT_PUBLIC_GA_MEASUREMENT_ID` remains unset.
- No production user, collection, document, or Storage object was created.

Confirmed the App Hosting configuration values against current repository source
(`firebase.json`'s `apphosting[0]`: `backendId: "fresh-prints-portal"`,
`rootDir: "./apps/portal"`) — both match the owner-reported values exactly, not guessed.

**Owner clarification received and recorded:** the App Hosting backend `fresh-prints-portal` has
been created in `fresh-prints-prod` using the Console's **Finish** action only. The backend is in
`us-central1` and shows **"Waiting for your first release."** No deployment or rollout occurred.

**This empirically resolves the prior pass's open `[NEEDS REPO CHECK]` question** ("does backend
creation itself trigger an automatic first rollout?") — confirmed **no**: backend
configuration (repository connection, branch, root directory, region) and the first
release/rollout (an actual build+deploy of Portal code) are genuinely separate steps in this
Firebase Console/CLI version. Backend configuration is complete; nothing has been built, deployed,
or served; Portal production traffic remains at zero.

Updated `docs/standards/DEPLOYMENT.md`'s Firebase-enablement and App-Hosting subsections to record
this confirmed-complete status with a clear status table, and resolved the previously-open
rollout-trigger question with the owner's empirical result rather than leaving it flagged
`[NEEDS REPO CHECK]` indefinitely.

**No Firebase deployment, secret configuration, DNS configuration, or production data creation
occurred in this pass.** No Rules, Storage Rules, indexes, Functions, or App Hosting release were
deployed. `rebuildCatalogSnapshots` was not invoked. `master` and `production` remain untouched.

Next: **STOP.** Await explicit, separate owner approval before triggering the App Hosting first
release/rollout — this is its own distinct checkpoint, not implied by backend creation having
completed. Subsequent checkpoints (Rules, indexes, Functions, Secret Manager, DNS) all remain
separately gated as well.

## 2026-07-30 — Goal #13 `production-release` — CORRECTION: App Hosting first release is NOT the next step; restored approved deployment order; prepared Firestore Rules deployment checkpoint

**Correction to the prior pass's framing:** the prior log entry title said "stopped at App Hosting
first-release checkpoint," which incorrectly implied the App Hosting release was the immediate
next action. The owner clarified this is wrong — the approved deployment order places 6 other
steps before the first Portal release: (1) Firestore Rules, (2) Storage Rules, (3) Firestore
indexes, (4) Secret Manager population, (5) Cloud Functions deployment (approved 99-function
allowlist), (6) App Hosting environment-variable configuration, **then** (7) first App Hosting
Portal release, (8) production Studio build, (9) initial settings/reference-data setup, (10)
domain + Authorized Domains, (11) smoke tests, (12) GA4/Search Console. This order is now recorded
explicitly and must not be skipped ahead of.

**Corrected production configuration state (accurate, not "empty"):** `fresh-prints-prod` has
Firestore created (Native mode, `nam5`), Cloud Storage default bucket (`us-central1`),
Authentication enabled (Email/Password + Google), a production Web App registered, a VAPID key
generated, and the App Hosting backend `fresh-prints-portal` created and connected
(`roasted-garlic/freshprints`, branch `production`, root `apps/portal`, `us-central1`, status
"Waiting for your first release"). **Accurate status: production products and backend are
configured; no Rules, indexes, Functions, or Portal release has been deployed; no Secret Manager
values set; no production data seeded; no DNS/custom domain configured; no production traffic
exists.**

Re-verified branch/tag state directly from Git: current branch `development`, clean tree;
`origin/production` = `aa570aa875d20ba85fd405480a47e6eda59f85b0` (unchanged). **`production` was
not modified this pass.**

**Compared `firestore.rules` between `development` and `production`:** `git rev-parse
origin/production:firestore.rules` and `git rev-parse origin/development:firestore.rules` both
return the identical Git blob hash `d4d754e22090a75ec9fa1c7fc38bbf2101822131` — the file is
byte-for-byte identical on both branches (confirmed also via `git diff --stat` between the two
refs on that path, which produced no output). Confirmed the local working-tree copy matches via
`git hash-object firestore.rules` — same hash. **No `development → production` merge is required
before deploying Rules** — `production` already has the exact, current, reviewed Rules content.

**Ran the real Firestore/Storage Rules emulator test suite** (`npm run test:rules`, using
`@firebase/rules-unit-testing` against a local Firestore/Storage emulator, requiring the
user-scoped portable JDK 21 documented in `docs/standards/TESTING.md` since no system Java is
present in this environment — set `JAVA_HOME`/`PATH` for this command only, no system change):
**48/48 tests pass, exit 0.** The `PERMISSION_DENIED` lines visible in emulator output are expected
— they are the emulator's own logging of the exact rule-evaluation denials that several "denies
..." test cases assert should happen, not failures.

**Rollback preparation:** this is the *first* Firestore Rules deployment ever made to
`fresh-prints-prod` (the project has zero deployment history) — there is no prior deployed version
on this project to roll back to. The rollback plan for any *future* Rules change is: redeploy the
prior commit's `firestore.rules` via `firebase deploy --only firestore:rules --project
fresh-prints-prod` (same command, prior file content) or restore the rule set from Firebase
Console's own Rules version history (Firestore → Rules tab retains prior published versions with
timestamps, independent of git).

**Console verification method (for after deployment, not yet needed):** Firebase Console →
`fresh-prints-prod` → Firestore Database → Rules tab → the "Last published" timestamp shown there
should match the time the deploy command actually completes; the Rules content shown in the
Console editor should match `firestore.rules`'s current content exactly.

**Exact prepared command (NOT executed):**
```
firebase deploy --only firestore:rules --project fresh-prints-prod
```

Updated `.cursor/workflow/state.md` (this entry + corrected top status block),
`docs/project/ROADMAP.md`, `docs/standards/DEPLOYMENT.md`,
`references/project-chatgpt-handoff/CURRENT-STATE.md`, and
`references/project-chatgpt-handoff/13-recent-completed-work.md` to correct the "App Hosting first
release is next" framing and restore the full approved 12-step deployment order.

**No `firebase deploy` command of any kind was run. No Firestore Rules, Storage Rules, indexes, or
Functions were deployed. No secret was set. No production data was touched. `production` was not
modified. `master` was not deleted.**

Next: **STOP.** Await explicit owner approval to run
`firebase deploy --only firestore:rules --project fresh-prints-prod`. Do not skip ahead to Storage
Rules, indexes, secrets, Functions, or the App Hosting first release.

## 2026-07-30 — Goal #13 `production-release` — Firestore Rules DEPLOYED to `fresh-prints-prod` (deployment-order step 1 of 12 complete)

**First production Firebase deployment of this goal.** Owner explicitly approved via
`APPROVE FIRESTORE RULES DEPLOY`, authorizing exactly
`firebase deploy --only firestore:rules --project fresh-prints-prod` and no other component.

**Pre-deploy safety sequence, run exactly as specified:**
1. Confirmed working tree clean on `development` before switching.
2. `git fetch origin`.
3. `git switch production`.
4. `git pull --ff-only origin production` — already up to date, no-op (fast-forward-only,
   confirming no divergence).
5. Verified: current branch `production`; local `HEAD` = `origin/production` =
   `aa570aa875d20ba85fd405480a47e6eda59f85b0` (exact match); `firestore.rules` blob hash =
   `d4d754e22090a75ec9fa1c7fc38bbf2101822131` (exact match to the value specified in the approval).
6. Confirmed target project in the command is exactly `fresh-prints-prod`.

All verifications matched exactly — proceeded to deploy.

**Deployment command:** `firebase deploy --only firestore:rules --project fresh-prints-prod`
**Exit code:** 0
**Firebase CLI result:** "Deploy complete!" — rules file compiled successfully, uploaded, and
released to `cloud.firestore`. Console URL confirmed:
`https://console.firebase.google.com/project/fresh-prints-prod/overview` (confirming
`fresh-prints-prod` as the deployed project). The compiler emitted several pre-existing
warning-level advisories (unused/shadowed rule-function names in `firestore.rules`) — these are
non-blocking lint-level notices, not errors, and did not affect compilation or deployment success.
No credential or environment value was printed by this command or captured in this record.

**This is the first Fresh Prints production Firestore Rules deployment** — `fresh-prints-prod` had
no prior Rules deployment history before this action.

**Owner Console verification instructions (provided, not yet confirmed by owner):** Firebase
Console → select project `fresh-prints-prod` → Firestore Database → Rules tab → confirm the
"Last published" timestamp reflects this deployment's completion time → visually compare the
displayed Rules content against the local `firestore.rules` file where practical. Firebase may
retain the previous (default, unpublished-by-us) initial Production-mode Rules version in the
Console's Rules history — this is expected and not a concern; the newly deployed version is now
the live, active ruleset.

**Post-deployment branch return:** `git switch development` → `git pull --ff-only origin
development` (already up to date, no-op) → confirmed current branch `development`, working tree
clean.

**`production` received zero Git commits from this pass** — only the Firebase Rules deployment
itself occurred; `origin/production` remains at `aa570aa875d20ba85fd405480a47e6eda59f85b0`
(reconfirmed via `git fetch origin` + `git rev-parse` after returning to `development`).

**No other Firebase component was deployed or configured.** No Storage Rules, no Firestore
indexes, no Functions, no App Hosting release, no Secret Manager values, no DNS/domain
configuration, no production data, no Studio production build, no GA4/Search Console setup.
`master` was not deleted.

Updated `.cursor/workflow/state.md` (this entry + status block), `docs/project/ROADMAP.md`,
`docs/standards/DEPLOYMENT.md`, and the two handoff files on `development` only, marking
deployment-order step 1 (Firestore Rules) as done and step 2 (Storage Rules) as the new current
checkpoint.

Next: **STOP.** Await explicit owner approval for Storage Rules deployment (deployment-order step
2). Do not proceed to indexes, secrets, Functions, or the App Hosting first release before that.

## 2026-07-30 — Goal #13 `production-release` — Studio tsconfig fix committed; development promoted to production via PR #3; full verification passed; v1.0.0-rc2 tagged

**Studio TypeScript fix:** owner confirmed the local `apps/studio/tsconfig.json` diff (removal of
`"ignoreDeprecations": "5.0"` and `"baseUrl": "."`) was intentional — fixes a TypeScript 5.9.3
compatibility issue (`"5.0"` is no longer a valid `ignoreDeprecations` value on this version;
`baseUrl` was dead configuration, unused by `moduleResolution: "bundler"` with all-relative
`paths`). Config-only, no runtime behavior change. Verified: Studio typecheck (0), Studio build
incl. electron-builder packaging (0), repo lint (0), `git diff --check` (0). Committed to
`development` as `dd05ef25ebeb2512ee1a56da031b6118acb01498a`
("fix(studio): resolve production TypeScript configuration error"), pushed.

**Promotion diff verified before PR:** `origin/production..origin/development` = 8 commits, 9
files (+1535/-53) — the tsconfig fix, `.githooks/pre-push` (new), and 7 documentation/redaction
files. `firestore.rules`, `storage.rules`, `firestore.indexes.json`, and `functions/src/index.ts`
all confirmed byte-identical between branches (no behavioral difference). No secret, local env
file, or generated output present.

**PR #3** ("Release: promote verified development state to production"):
`https://github.com/roasted-garlic/freshprints/pull/3` — owner created and merged (confirmed via
GitHub API: `merged: true`, `merge_commit_sha: a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`, base
`production` was at `aa570aa`, head `development` at `dd05ef2`, 8 commits, 9 files,
+1535/-53 — exactly matching this session's own pre-merge diff). `origin/production` advanced
`aa570aa..a8b02c9`.

**Local production verification:** `git switch production` → `git pull --ff-only origin
production` (fast-forward, no conflicts) → confirmed branch `production`, `HEAD` =
`origin/production` = `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`, clean tree.

**Full release verification suite on the exact merged commit — all pass:**
| Check | Command | Exit |
|---|---|---|
| Functions build | `cd functions && npm run build` | 0 |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 |
| Studio typecheck | `npx tsc --noEmit -p apps/studio/tsconfig.json` | 0 |
| Portal build | `npm run build:portal` | 0 |
| Studio build | `npm run build:studio` | 0 |
| Repo lint | `npm run lint` | 0 |
| Firebase Rules tests | `npm run test:rules` (portable JDK 21) | 0 (48/48 pass) |
| `git diff --check` | — | 0 (clean tree) |
| Fresh Functions export enumeration | programmatic parse of `functions/src/index.ts` | 105 total, 99 include, 6 exclude, `rebuildCatalogSnapshots` included — **unchanged, matches the approved allowlist exactly** |

**Deployment file hashes on the merged `production` commit** (all confirmed unchanged from the
already-verified/deployed versions):
- `firestore.rules`: `d4d754e22090a75ec9fa1c7fc38bbf2101822131` — matches the already-deployed
  version; **no redeployment required**.
- `storage.rules`: `3f1dd48e9f37afacb972ade3dc21c2818038a6fe` — reviewed production version.
- `firestore.indexes.json`: `b67e711bed1a2881767b94ac369fed59346301be` — reviewed production
  version.

**Tag:** confirmed `v1.0.0-rc1` unchanged at `aa570aa875d20ba85fd405480a47e6eda59f85b0`. Confirmed
`v1.0.0-rc2` did not already exist. Created annotated tag `v1.0.0-rc2` on the exact verified
merge commit (`a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`), message "Fresh Prints production
release candidate 2", pushed to `origin` — `* [new tag] v1.0.0-rc2 -> v1.0.0-rc2`.

**Returned to `development`:** `git switch development` → `git pull --ff-only origin development`
— fast-forwarded 2 additional commits (`dd05ef2..1066f57`), the second being PR #4, a benign
production→development sync-back merge (GitHub-suggested branch-alignment merge; content-identical,
introduces nothing new since `production`'s content was already fully derived from `development`).
Confirmed final branch `development`, clean tree, and `origin/production` still exactly at
`a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56` (unaffected by the sync-back).

**No Firebase deployment of any kind occurred in this pass.** No Storage Rules, indexes,
Functions, App Hosting, secrets, DNS, or production data action occurred. `master` was not
deleted. No branch protection was bypassed — the promotion went entirely through the GitHub PR
workflow, no emergency override was used, no force-push occurred anywhere.

Next: **STOP.** Await explicit owner approval to deploy Storage Rules
(`firebase deploy --only storage --project fresh-prints-prod`) to `fresh-prints-prod`
(deployment-order step 2).

## 2026-07-30 — Goal #13 `production-release` — Storage Rules DEPLOYED to `fresh-prints-prod` (deployment-order step 2 of 12 complete)

Owner explicitly approved via `APPROVE STORAGE RULES DEPLOYMENT`, authorizing exactly
`firebase deploy --only storage --project fresh-prints-prod` and no other component.

**Pre-deploy safety sequence, run exactly as specified:**
1. Confirmed main working tree clean on `development` before switching.
2. `git fetch origin`.
3. `git switch production`.
4. `git pull --ff-only origin production` — already up to date, no-op.
5. Verified: current branch `production`; local `HEAD` = `origin/production` =
   `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56` (exact match); working tree clean; `storage.rules`
   blob hash = `3f1dd48e9f37afacb972ade3dc21c2818038a6fe` (exact match to the required value).
6. Confirmed target project `fresh-prints-prod` in the command.
7. Ran `npm run test:rules` (portable JDK 21 workaround, no system Java present) — **48/48 pass,
   exit 0.**
8. Ran `git diff --check` — exit 0 (clean).

All verifications matched exactly — proceeded to deploy.

**Deployment command:** `firebase deploy --only storage --project fresh-prints-prod`
**Exit code:** 0
**Firebase CLI result:** "Deploy complete!" — Storage Rules compiled successfully with no errors
or warnings, uploaded, and released to `firebase.storage`. Console URL confirmed:
`https://console.firebase.google.com/project/fresh-prints-prod/overview`. No credential or
environment value was printed by this command or captured in this record.

**This is the first Fresh Prints production Storage Rules deployment** — `fresh-prints-prod` had
no prior Storage Rules deployment history before this action. Firebase Console may retain the
project's original default bucket rules in its version history alongside the newly deployed
version.

**Owner Console verification instructions (provided, not yet confirmed by owner):** Firebase
Console → `fresh-prints-prod` → Build → Storage → Rules tab → confirm the "Last published"
timestamp reflects this deployment's completion time → confirm the displayed Rules content
matches the reviewed production `storage.rules`.

**Rollback preparation (for any future need, not performed this pass):** since this is the first
Storage Rules deployment on this project, there is no earlier Fresh Prints production commit to
restore. For a future rollback: check out the previously deployed production commit, then deploy
that commit's `storage.rules` via the same command
(`firebase deploy --only storage --project fresh-prints-prod`). Firebase Console's Rules history
may also retain the original Firebase-generated default rules version.

**Post-deployment branch return:** `git switch development` → `git pull --ff-only origin
development` (already up to date, no-op) → confirmed current branch `development`, working tree
clean.

**`production` received zero Git commits from this pass** — only the Firebase Storage Rules
deployment itself occurred; `origin/production` remains at
`a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56` (reconfirmed via `git fetch origin` +
`git rev-parse` after returning to `development`).

**No other Firebase component was deployed or configured.** No Firestore Rules redeployment
(unnecessary — already correctly deployed and unchanged), no Firestore indexes, no Functions, no
App Hosting release, no Secret Manager values, no DNS/domain configuration, no production data,
no `rebuildCatalogSnapshots` invocation, no Studio distribution, no GA4/Search Console
configuration. `master` was not deleted.

Next: **STOP.** Await explicit owner approval for Firestore indexes deployment (deployment-order
step 3). Do not proceed to secrets, Functions, or the App Hosting first release before that.

## 2026-07-30 — Goal #13 `production-release` — Firestore indexes deployment BLOCKED: duplicate index definition caused partial deploy failure; human checkpoint required before retry

Owner approved via `APPROVE FIRESTORE INDEXES DEPLOYMENT`-equivalent instruction, authorizing
exactly `firebase deploy --only firestore:indexes --project fresh-prints-prod` and no other
component.

**Pre-deploy safety sequence, run exactly as specified:** confirmed `origin/master` = `aa570aa`,
`origin/production` = `a8b02c9`, clean tree; switched to `production`, fast-forward pull
(already up to date); verified `HEAD` = `origin/production` = `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`,
clean tree.

**Verified the index configuration:** `git rev-parse HEAD:firestore.indexes.json` and
`git hash-object firestore.indexes.json` both = `b67e711bed1a2881767b94ac369fed59346301be` (exact
match). `git diff --exit-code origin/production:firestore.indexes.json
origin/development:firestore.indexes.json` = exit 0 (identical). JSON validation: exit 0, **66
composite index definitions, 0 field overrides.**

**Full file inspection (as explicitly required) found one real issue:** a byte-for-byte duplicate
index definition on `customerUploads` (`purpose` ASC + `catalogReviewStatus` ASC), appearing
twice at two separate positions in the `indexes` array. No hardcoded project IDs, no malformed
field definitions, no dev-only collection names, no destructive field overrides (array is empty)
— confirmed via direct source inspection, not assumed. This duplicate was flagged but, since it
appeared harmless (not destructive, not unsafe) rather than an obvious hard-stop condition,
verification proceeded to capture remote state and attempt the deploy — where it in fact caused a
real failure, described below.

**Captured remote pre-deployment state:** `firebase firestore:indexes --project fresh-prints-prod`
— exit 0, returned `{"indexes": [], "fieldOverrides": []}`. Confirmed empty — genuinely the first
index deployment attempt on this project, no pre-existing custom indexes to conflict with.

**Deployment attempted:** `firebase deploy --only firestore:indexes --project fresh-prints-prod`
— **exit 1.** Firebase CLI output:
`Error: Request to https://firestore.googleapis.com/v1/projects/fresh-prints-prod/databases/(default)/collectionGroups/customerUploads/indexes had HTTP Error: 409, index already exists with index ID = CICAgLiT6IEJ`
— the CLI submitted the duplicate `customerUploads` index definition twice within the same batch;
the second submission's own duplicate triggered the 409, aborting the remaining batch.

**Post-failure remote state captured:** `firebase firestore:indexes --project fresh-prints-prod`
— exit 0, **50 of 66 indexes now exist** on `fresh-prints-prod`, spanning `categories` (2),
`customers` (1), `customerUploads` (7), `designs` (26), `gangSheetItems` (1), `gangSheets` (1),
`printRequestItems` (3), `printRequests` (6), `showAllocations` (3). **Zero indexes exist** for 7
collection groups that appear later in the file's array order:
`assistedCreationRequests`, `customerNotifications`, `customerUploadBatches`,
`customerUploadFinalizeLeases`, `etsyRecommendationRequests`, `etsyRecommendationSuggestions`,
`etsySuggestionRequests`. The CLI's `firestore:indexes` JSON output does not expose per-index
build-state (`Enabled`/`Building`/`Error`) — only definitions — so per-index Console verification
by the owner is still required for the 50 that were submitted, in addition to the 7 collection
groups needing their indexes created at all.

**No data was corrupted, no unexpected index was created, nothing was deleted.** The 50 created
indexes exactly match their corresponding entries in the local, reviewed `firestore.indexes.json`
— confirmed via direct comparison of the returned index definitions against the source file.

**Per explicit instruction, this pass did not retry blindly, did not use `--force`, and did not
edit or delete anything in Console.** Confirmed `git status` remained clean throughout (no
accidental local edit to `firestore.indexes.json`). Switched to `development` (fast-forward pull,
clean) solely to record this blocked state — the deployment workflow itself did not "complete,"
so this is a status record, not a completed-step commit.

**Firestore Rules (step 1) and Storage Rules (step 2) remain correctly deployed and completely
unaffected by this failure** — this pass touched only `firestore:indexes`.

**Required remediation (not performed this pass, needs owner decision):**
1. Remove the exact duplicate `customerUploads` `purpose`+`catalogReviewStatus` index entry from
   `firestore.indexes.json` (one of the two identical blocks) on `development`.
2. Commit and push the correction to `development`.
3. Promote via a new GitHub pull request (`development` → `production`), per the established
   protected-branch workflow.
4. Obtain separate, explicit owner approval before reattempting
   `firebase deploy --only firestore:indexes --project fresh-prints-prod`.
5. After a successful redeploy, verify all 66 unique index definitions (65 once the duplicate is
   removed) reach `Enabled`/ready state in Firebase Console before closing this checkpoint.

**No production data was touched. No secret was configured. No Functions, App Hosting, DNS, or
Studio action occurred. `master` was not deleted.**

Next: **STOP.** This is a human checkpoint requiring an owner decision on the
`firestore.indexes.json` duplicate-entry correction before Firestore indexes deployment can be
reattempted. Do not proceed to Secret Manager or any later deployment-order step until indexes
reach a fully ready, verified state.

## 2026-07-30 — Goal #13 `production-release` — Firestore index duplicate REMEDIATED (Plan + Formal Review approved, implemented, verified, pushed to development); stopped at production PR checkpoint

Re-verified branch/tag state directly from Git before any action: current branch `development`,
clean tree; `origin/master` = `aa570aa`, `origin/production` = `a8b02c9`,
`origin/development` = `3c2b748` — all matching expected values.

**Step 2 — Canonical duplicate audit:** parsed `firestore.indexes.json` programmatically with a
deterministic structural identity (collectionGroup + queryScope + ordered fields with
fieldPath/order/arrayConfig). Confirmed exactly the expected result: 66 total definitions, 65
unique, **one duplicate group** — `customerUploads` `purpose ASC + catalogReviewStatus ASC` at
array positions 44 and 50, confirmed byte-identical via direct `JSON.stringify` comparison. No
other duplicate exists anywhere in the file.

**Step 3 — Legitimate pair protection:** confirmed array position 43
(`purpose+catalogReviewStatus+createdAt`, three-field) is structurally distinct from positions 44
and 50 (two-field only) — not byte-equal, has an additional `createdAt DESCENDING` field. The
three-field prefix-extension index was correctly identified as untouched by this remediation.

**Step 4 — Provenance:** traced via `git blame` on the exact line ranges of both duplicate blocks.
Position 44 (lines 828–840, the original, kept definition) traces to commit
`043f38a1adc4a62a727e5a4a1ee30fd4d1900c81` (2026-07-13, "Add Portal donate-designs uploads and
Studio donated designs intake") — this commit introduced both the three-field and two-field
indexes together, deliberately. Position 50 (lines 912–924, the removed definition) traces to
commit `cbba4ca858d76da5514389a67e187612761240fd` (2026-07-14, "Add design asset purge, helper
permission gates, and Portal account artwork upgrades") — one day later, an unrelated feature
commit that accidentally re-added an identical index. A later pure-reformatting commit
(`0317a6db536b682ad0eb97ffa569b2be5c133ac6`, 2026-07-22) touched both blocks' inner field
formatting with zero content change, confirmed via diff — does not alter this provenance.

**Step 5 — Remote state (read-only):** `firebase firestore:indexes --project fresh-prints-prod` —
exit 0, unchanged from the prior pass: 50 indexes, 0 field overrides, same 7 collection groups
with zero indexes. Nothing was touched remotely.

**Step 6 — Plan and independent Formal Review:** wrote
`docs/workflow/plans/2026-07-30-firestore-index-duplicate-remediation-plan.md` (full audit,
provenance, exact correction, query-coverage-impact analysis, validator approach, Git promotion
path, remote-handling, and explicit non-goals). Wrote
`docs/workflow/reviews/2026-07-30-firestore-index-duplicate-remediation-review.md` — independently
re-ran the duplicate audit and the `git blame` provenance trace from scratch (not copied from the
Plan's own prose), confirmed both matched exactly, confirmed no code depends on index array
position/count, confirmed the validator pattern matches the existing
`storageRulesAlignment.test.ts` convention. **Verdict: approved**, no unresolved blocker.

**Step 7 — Implementation (after approval):** removed exactly the 14-line block at array position
50 (`firestore.indexes.json` lines 911–924) — the later, redundant `cbba4ca` copy. Preserved the
original `043f38a` two-field definition and the distinct three-field prefix index untouched. Zero
insertions, only the one deletion (`git diff --stat`: `1 file changed, 14 deletions(-)`).
Re-ran the canonical audit on the corrected file: **65 total, 65 unique, 0 duplicate groups.**

**Step 8 — Deterministic validation added:**
`packages/shared/src/constants/firestoreIndexesDuplicateValidation.test.ts` — follows the exact
existing convention from `storageRulesAlignment.test.ts` (`node:test`, `node:assert/strict`,
direct repo-root file read, zero new dependency). Proves: (1) the file parses as valid JSON, (2)
the real corrected file has zero duplicate structural identities (failure output would include
exact collection group, field sequence, and array positions), (3) a fixture with an exact
duplicate is correctly detected, (4) a two-field index and its three-field prefix-extension are
correctly **not** flagged as duplicates — directly proving the historical-caution requirement is
enforced by the same logic protecting the real file.

**Step 9 — Verification, all commands and exit codes:**

| Command | Exit code |
|---|---|
| `node -e "JSON.parse(...)"` (JSON validity) | 0 |
| `npx tsx --test packages/shared/src/constants/firestoreIndexesDuplicateValidation.test.ts` | 0 (4/4 pass) |
| `npm run test:rules` (portable JDK 21) | 0 (48/48 pass) |
| `npm run lint` | 0 |
| `git diff --check` | 0 |

**Step 10 — Committed to `development` with narrow staging:** staged only
`firestore.indexes.json`, the new validator test, the Plan, and the Formal Review (confirmed via
`git status --short` before staging — exactly 4 files, no broad staging). Committed as
"fix(firebase): remove duplicate Firestore index definition", pushed to `origin/development`.

**Step 11 — Production PR prepared, not executed by this coding agent** (no `gh` CLI available in
this environment, consistent with the parent goal's earlier PR #3): exact pre-filled compare URL
and description prepared for the owner (see response). **Did not merge `production` back into
`development`** — correctly identified as unnecessary for this `development`-originated fix with
no production-only content (the PR #4 back-merge earlier in this goal was specific to a different
situation: syncing a just-merged `production` state after that merge, not a general requirement).

**The 50 already-created remote indexes on `fresh-prints-prod` were not touched, edited, or
deleted at any point.** No `firebase deploy` command of any kind was run. No Firestore Rules or
Storage Rules redeployment occurred (both remain correctly deployed, unaffected). No Secret
Manager, Functions, App Hosting, DNS, production data, `rebuildCatalogSnapshots`, Studio
distribution, or GA4/Search Console action occurred. `production` received no Git commit — only
`development` was advanced. `master` was not touched.

Next: **STOP.** Await the owner reviewing and merging the `development → production` remediation
pull request. After merge: production verification, `v1.0.0-rc3` tag, then a **separate** owner
approval before retrying the Firestore indexes deployment itself.

## 2026-07-30 — Goal #13 `production-release` — Firestore index remediation MERGED to production via PR #5; v1.0.0-rc3 tagged; stopped at indexes-redeployment approval checkpoint

**PR #5 merge verified via GitHub API** (not just owner report): `merged: true`, merge commit
`21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`, base `production` (was `a8b02c9`) ← head
`development` (`03d16b0`), 9 files, +1129/-43 — exactly matching this goal's own pre-merge
verification of the remediation commit. `origin/production` advanced `a8b02c9..21f036f`. `master`
unchanged. `git diff --name-status origin/production..origin/development` empty — content
identical, clean complete merge.

**Local production verification:** `git switch production` → `git pull --ff-only origin
production` (fast-forward, 6 commits, no conflicts) → confirmed branch `production`, `HEAD` =
`origin/production` = `21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`, clean tree.

**Verified the corrected index configuration on this exact commit:**
- `firestore.indexes.json` new hash: `e3c15380f538c3e1e6ccf5197c82f1b2ad63b5e5`.
- Canonical duplicate audit (same deterministic structural-identity script used throughout this
  remediation): **65 total, 65 unique, 0 duplicate groups, 0 field overrides.**
- Confirmed both the two-field (`purpose+catalogReviewStatus`, array position 44) and three-field
  (`purpose+catalogReviewStatus+createdAt`, position 43) `customerUploads` indexes remain present
  and distinct.
- `firestore.rules` hash `d4d754e22090a75ec9fa1c7fc38bbf2101822131` — **unchanged** from the
  already-deployed version.
- `storage.rules` hash `3f1dd48e9f37afacb972ade3dc21c2818038a6fe` — **unchanged** from the
  already-deployed version.
- Fresh Cloud Functions export enumeration: **105 total, 99 include, 6 exclude** — allowlist
  unchanged by this merge.

**Full verification suite, all exit 0:**
| Check | Command | Exit |
|---|---|---|
| Duplicate validator | `npx tsx --test packages/shared/src/constants/firestoreIndexesDuplicateValidation.test.ts` | 0 (4/4 pass) |
| JSON validity | — | 0 |
| Firebase Rules tests | `npm run test:rules` (portable JDK 21) | 0 (48/48 pass) |
| Repo lint | `npm run lint` | 0 |
| `git diff --check` | — | 0 |

**Remote state captured read-only:** `firebase firestore:indexes --project fresh-prints-prod` —
exit 0, **50 indexes, 0 field overrides — unchanged, untouched.** 15 corrected local definitions
remain missing remotely (65 − 50), spanning the same collection groups identified in the prior
pass. No unexpected remote index appears.

**Tag creation:** confirmed `v1.0.0-rc1` unchanged at `aa570aa875d20ba85fd405480a47e6eda59f85b0`
and `v1.0.0-rc2` unchanged at `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`. Confirmed `v1.0.0-rc3`
did not already exist. Created annotated tag `v1.0.0-rc3` on the exact verified merge commit
(`21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`), message "Fresh Prints production release candidate
3", pushed — `* [new tag] v1.0.0-rc3 -> v1.0.0-rc3`.

**Returned to `development`:** `git switch development` → `git pull --ff-only origin
development` — already up to date (content was already identical from the earlier `development`
push; no back-merge needed, per instruction, since there is no production-only change to sync
back). Confirmed final branch `development`, clean tree, `origin/production` still exactly at
the verified merge commit.

**No Firebase deployment, secret configuration, DNS configuration, or production data creation
occurred in this pass.** No Storage Rules, indexes, Functions, or App Hosting release were
deployed. The existing 50 remote indexes were not touched, edited, or deleted. `master` was not
deleted.

Next: **STOP.** Await explicit owner approval to retry
`firebase deploy --only firestore:indexes --project fresh-prints-prod` on the verified corrected
`production` commit. Every one of the 65 index definitions must reach `Enabled`/ready state in
Firebase Console before deployment-order step 3 is considered complete and step 4 (Secret
Manager) becomes the next checkpoint.

## 2026-07-30 — Goal #13 `production-release` — Firestore indexes DEPLOYED to `fresh-prints-prod` (deployment-order step 3 of 12 succeeded); awaiting owner Console readiness confirmation

Owner approved via `APPROVE FIRESTORE INDEXES REDEPLOYMENT`, authorizing exactly
`firebase deploy --only firestore:indexes --project fresh-prints-prod` and no other component.

**Pre-deploy verification, all matched exactly:** `git fetch origin`, clean tree confirmed;
`git switch production` + `git pull --ff-only origin production` (already up to date); confirmed
branch `production`, `HEAD` = `origin/production` =
`21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`, clean tree, `firestore.indexes.json` hash
`e3c15380f538c3e1e6ccf5197c82f1b2ad63b5e5` — all exact matches to the required values.

**Re-ran validation, all exit 0:** duplicate validator (4/4 pass), JSON validity, canonical audit
(65 total/65 unique/0 duplicates/0 field overrides — reconfirmed), `npm run test:rules` (48/48,
portable JDK 21), `npm run lint`, `git diff --check`.

**Captured remote baseline (read-only):** `firebase firestore:indexes --project fresh-prints-prod`
— exit 0, 50 indexes, 0 field overrides — matched the expected pre-deploy baseline exactly.

**Deployed:** `firebase deploy --only firestore:indexes --project fresh-prints-prod` — **exit 0.**
Firebase CLI: "Deploy complete!" / "firestore: deployed indexes in firestore.indexes.json
successfully for (default) database." **No deletion prompt occurred.** Same pre-existing,
non-blocking Firestore Rules compilation warnings appeared (unrelated to indexes, unchanged from
every prior deploy in this goal). No `--force` was used. Target project confirmed
`fresh-prints-prod`, default database.

**Post-deployment remote state:** `firebase firestore:indexes --project fresh-prints-prod` — exit
0, **65 indexes, 0 field overrides**, spanning all 16 collection groups (including the 7 that
previously had zero indexes: `assistedCreationRequests` 4, `customerNotifications` 1,
`customerUploadBatches` 1, `customerUploadFinalizeLeases` 1, `etsyRecommendationRequests` 1,
`etsyRecommendationSuggestions` 1, `etsySuggestionRequests` 2).

**Precise set comparison performed** (canonical structural identity: collectionGroup + queryScope
+ fields, correctly excluding Firestore's server-auto-appended `__name__` tiebreaker field, which
an initial naive comparison had mistakenly flagged as 37 false-positive mismatches before being
corrected): **0 local definitions missing remotely, 0 unexpected remote definitions.** Every one
of the 65 local index definitions is present remotely with matching content.

**Remaining verification not obtainable from the CLI:** the Firebase CLI's `firestore:indexes`
command returns only index *definitions*, not per-index build *status*
(`Enabled`/`Building`/`Error`). Per explicit instruction, this final confirmation requires the
owner to check Firebase Console → `fresh-prints-prod` → Firestore Database → Indexes directly.
**This checkpoint is not fully closed until that owner confirmation is provided** — the deploy
itself succeeded and all definitions are present, but "reached Enabled/Ready" per index cannot be
self-certified by this coding agent from available tooling.

**Returned to `development`:** `git switch development` → `git pull --ff-only origin development`
(already up to date) → confirmed branch `development`, clean tree. `origin/production` confirmed
unchanged at `21f036fab2ff6cb0a4d934ef5e5c9e465b21e293` — this deployment added no Git commit to
`production`, only the Firebase indexes release.

**No other Firebase component was deployed.** No Firestore Rules or Storage Rules redeployment
(both remain correctly deployed from earlier, unaffected). No Secret Manager, Functions, App
Hosting, DNS, production data, `rebuildCatalogSnapshots`, Studio distribution, or GA4/Search
Console action occurred. `master` was not deleted.

Next: **STOP.** Await owner confirmation via Firebase Console that all 65 indexes show `Enabled`.
Once confirmed, deployment-order step 3 of 12 is complete and step 4 (Secret Manager inventory,
value collection, and production secret population approval) becomes the next checkpoint.

## 2026-07-30 — Goal #13 `production-release` — Firestore indexes checkpoint CLOSED (owner confirmed all 65 Enabled); Secret Manager population CONFIRMED COMPLETE (deployment-order step 4 of 12)

**Firestore indexes checkpoint closed:** owner confirmed via direct Firebase Console inspection
that all 65 of 65 composite indexes on `fresh-prints-prod` show `Enabled` — none `Building`, none
`Error` — with 0 field overrides. Deployment-order step 3 of 12 is now fully complete (no
redeployment performed this pass; this is a confirmation-only closure).

**Step 1 — Git/source verification, all matched exactly:** `git fetch origin`, clean tree
confirmed; `git switch production` + `git pull --ff-only origin production` (already up to date);
confirmed branch `production`, `HEAD` = `origin/production` =
`21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`, clean tree.

**Step 3 — Source-level secret audit performed on this exact commit:** found exactly one
secret-definition file, `functions/src/lib/secrets.ts`, defining 4 secrets via `defineSecret`:

| Secret name | Constant | Bound by (production-allowlist Functions) |
|---|---|---|
| `GEMINI_API_KEY` | `geminiApiKeySecret` | `enqueueAiEnrichment` (included). Also bound by `testAiEnrichmentPlayground`/`testAiEnrichmentTagRerank`, both explicitly excluded from the approved 99-function allowlist. |
| `RESEND_API_KEY` | `resendApiKeySecret` | `createCustomerWithPortalInvite`, `createTeamUser`, `onEmailDeliveryJobCreated` (all included) |
| `BREVO_API_KEY` | `brevoApiKeySecret` | Same three Functions as above — both provider secrets are bound together in each Function's `{ secrets: [...] }` options per Firebase Functions v2's requirement that secrets be declared at deploy time; `resolveEmailApiKey()` only reads the value for whichever provider is actually selected at runtime |
| `ETSY_X_API_KEY` | `etsyXApiKeySecret` | `searchEtsyRecommendations`, `staffSearchEtsyRecommendationApiResults` (both included). Expected shape per source's own doc comment: `keystring:shared_secret`, used as the `x-api-key` HTTP header value. |

**Confirmed zero `OPENAI_API_KEY` references anywhere in `functions/src`** — the Gemini-only
architecture (ADR-FP-040) is current; no stale OpenAI code path exists to require that secret.

**Step 5 — Email-provider default behavior, confirmed from source, not guessed:**
`packages/shared/src/constants/emailProviders.constants.ts`'s `DEFAULT_EMAIL_PROVIDER_SETTINGS`
sets both `inviteProvider` and `proofNoticeProvider` to `"resend"`; `resolveEmailProviderId()`
falls back to this default for any missing or invalid stored value. **The system defaults to
Resend and does not fail closed** when `settings/emailProviders` doesn't exist — confirmed
cold-start-safe.

**Owner decision (via structured question, not guessed):** selected **both** Resend and Brevo
providers for launch flexibility — both secrets to be populated even though Resend remains the
active default until `settings/emailProviders` is explicitly configured post-launch.

**Step 6 — External-provider readiness, owner-confirmed status-only (no credential values shared
at any point):**

| Provider | Credential status | Domain/access verification |
|---|---|---|
| Gemini | AVAILABLE | N/A |
| Resend | AVAILABLE | VERIFIED (`myprintrequest.com`/`noreply@myprintrequest.com`) |
| Brevo | AVAILABLE | VERIFIED |
| Etsy | AVAILABLE | AVAILABLE (application access confirmed) |

**No blocker identified** — all required and conditional provider credentials are available and
verified.

**Step 4 — Non-secret configuration confirmed separately:** `PORTAL_BASE_URL` confirmed
source-gated to `FUNCTIONS_EMULATOR === "true"` only (never read in production) — verified in
`functions/src/lib/email/portalUrlResolver.ts:33`. `INVITATION_FROM_EMAIL`/
`PROOF_NOTICE_FROM_EMAIL` confirmed to be Firebase Functions parameterized-config `defineString`
values (not Secret Manager entries) — their absence from Secret Manager (confirmed via a
metadata-only `functions:secrets:get` 404) is correct and expected, not a gap; they carry code
defaults of `Fresh Prints <noreply@myprintrequest.com>`. Portal `NEXT_PUBLIC_*` values, the Web
App config, and the VAPID key remain out of scope for this checkpoint (App Hosting env-var
checkpoint, later).

**Step 7 — Pre-population metadata check (read-only, no values accessed):**
`firebase functions:secrets:get <NAME> --project fresh-prints-prod` for all four names returned a
clean HTTP 404 ("Secret ... not found") for each — confirming all four were genuinely absent
before population, with **zero risk of overwriting an existing secret.**

**Step 8 — Secret population.** This coding agent's tool environment cannot host a genuinely
interactive terminal session that a human can type into mid-command — each command executes
non-interactively and returns its complete output. Per the hard security rules (never pass a
value as a command argument, never use a plaintext file, never fabricate an interactive session),
population was correctly handed to the owner: **the owner ran
`firebase functions:secrets:set <NAME> --project fresh-prints-prod` directly in their own
terminal for all four secret names**, using that command's genuine interactive hidden-value
prompt. No value was ever entered into, displayed by, or transmitted through this coding agent's
tool calls.

**Step 9 — Post-population metadata verification (read-only, no values accessed):**
`firebase functions:secrets:get <NAME> --project fresh-prints-prod` for all four names:

| Secret | Version | State |
|---|---|---|
| `GEMINI_API_KEY` | 1 | ENABLED |
| `RESEND_API_KEY` | 1 | ENABLED |
| `BREVO_API_KEY` | 1 | ENABLED |
| `ETSY_X_API_KEY` | 1 | ENABLED |

Confirmed no `OPENAI_API_KEY` was created (404, as expected). Confirmed no secret was created in
`fresh-prints-dev` by this pass — a single informational, read-only metadata check of that
project's own pre-existing `GEMINI_API_KEY` was performed for context only, not a modification;
that project's secret is entirely separate from and unaffected by anything done to
`fresh-prints-prod` in this pass.

**No secret value was ever printed, echoed, logged, displayed, copied to a file, or included in
any command argument, output, or workflow record throughout this entire pass.**

**No Cloud Functions, App Hosting, Portal, or any other Firebase component was deployed.** No
production data was created. `rebuildCatalogSnapshots` was not invoked. DNS was not touched.
`master` was not deleted. `production` received no Git commit — this pass performed only
Secret Manager configuration on `fresh-prints-prod`, not a repository change.

Next: **STOP.** Await explicit owner approval to deploy Cloud Functions to `fresh-prints-prod`
using the approved explicit 99-function allowlist — deployment-order step 5 of 12.
