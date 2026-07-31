# Fresh Prints - Current State Snapshot

## 2026-07-31 — Goal #13 Portal registration loading-state fix **implemented** (not deployed)

- Root cause amended: post-Auth complete-profile client stall before `registerCustomer` + hang UX
- Historical `accounts:lookup` 400 = non-reproducible; no Auth Console remediation
- Client fix on `development`: 45s timeout, stages `[fp-portal-auth]`, terminal error, retry,
  sign-out, duplicate guards, explicit `getIdToken(true)` before callable
- Implementation Review **approved**; automated tests/typecheck/lint/build **pass**
- **Next:** `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT` then hosted.app QA
- Branding + Stage 2 still paused; Stage 1 + Class D untouched
- Note: post-fix Auth list had **no** Google user (`L3jjfWJG…` absent); agents did not delete

## 2026-07-31 — Goal #13 registration stuck: Auth inventory amended

- Superseded in part by loading-state implement section above

## 2026-07-31 — Goal #13 Stage 1 fixtures **COMPLETE** (1B + 1C)

- Remains PASS WITH NOTES

## 2026-07-31 — Goal #13 Class D **CLOSED**

- Remains closed

## 2026-07-31 — Goal #13 Class D: Storage cross-service permission **IAM applied** (superseded)

- Granted `roles/firebaserules.firestoreServiceAgent` to
  `service-473623863375@gcp-sa-firebasestorage.iam.gserviceaccount.com`
- No Storage Rules deploy / Studio rebuild — **closed by PASS WITH NOTES above**

## 2026-07-31 — Goal #13 Class D: Storage cross-service permission (awaiting Fix issue)

- **Superseded** — IAM + owner QA closed the incident

## 2026-07-31 — Goal #13 BLOCKED: Studio Storage `storage/unauthorized`

- **Superseded / closed** — Class D IAM + PASS WITH NOTES

## 2026-07-31 — Goal #13: Stage 1 partial — infra/DNS recorded; fixtures pending owner

- Read-only: owner profile OK; 18 categories / 1,122 tags; 99 Functions; 65 indexes; CORS OK;
  hosted.app 200; Coming Soon still on apex (Cloudflare)
- Portal-invite test customer **deferred** (continue URL → `myprintrequest.com/login`)
- Stage 2 hosted.app smoke checklist prepared, **not executed**
- Owner next: create upcoming show + one ready catalog design in production Studio
  (**Storage unblocked** — proceed with fixtures)

## 2026-07-31 — Goal #13: production `settings/emailProviders` PASS

Owner set production Studio email providers:

- `inviteProvider: "resend"`
- `proofNoticeProvider: "brevo"`

Stage 1 email-provider item closed. Next: remaining Stage 1 fixtures (upcoming show, minimum
approved test data as needed, Coming Soon DNS/rollback recorded without changing DNS), then
Stage 2 hosted.app smoke. Custom domain still deferred until `APPROVE MYPRINTREQUEST.COM CUTOVER`.

## 2026-07-31 — Goal #13 production-release: domain-last sequencing amendment approved

**Owner decision:** do **not** point `myprintrequest.com` at App Hosting yet. Coming Soon remains
live until all domain-independent production setup and hosted.app smoke testing are complete.
Custom domain is the final launch switch after readiness gate
`APPROVE MYPRINTREQUEST.COM CUTOVER`.

**Revised remaining stages:** (1) domain-independent setup → (2) smoke on
`https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` → (3) readiness gate →
(4) domain cutover + domain-dependent smoke. GA4 / Search Console stay later.

**Immediate next task:** Stage 1 — Studio `settings/emailProviders` (Resend invite / Brevo proof)
if unset, then remaining domain-independent fixtures. **Do not connect the custom domain.**

Artifacts: Plan §7 in `docs/workflow/plans/2026-07-30-production-release-plan.md`; Formal Review
`docs/workflow/reviews/2026-07-31-production-release-domain-last-sequencing-review.md`
(**approved**). Git: `development`/`production` at `bfa42ef` (PR #11 CORS recording merged) before
this docs amendment.

## 2026-07-30 — Goal #13 "production-release" — v1.0.0-rc5 owner retest PASS WITH NOTES; production Studio (step 8 of 12) fully closed; proceeding into Phase G smoke testing

**Owner retest result: `PASS WITH NOTES`.** `v1.0.0-rc5` (the installer including both the
white-screen fix and the desktop icon alignment) launches without a white screen, the correct
"FP Request" icon is confirmed in place, and the production owner account signs in successfully.

**The note:** sign-in initially failed until the owner added `createdAt` and `updatedAt` timestamp
fields to the manually bootstrapped `users/{uid}` Firestore document. Traced to
`apps/studio/src/renderer/src/features/users/services/userService.ts`'s `mapUserDocument()`,
which throws `"A user profile is incomplete."` if either field is falsy. **This was a gap in the
manual first-owner-bootstrap instructions given earlier this goal (Phase D) — the given field list
omitted these two fields — not a code defect.** Corrected field list for any future manual
first-owner bootstrap: `id` (string), `email` (string), `displayName` (string), `role` (string,
`"owner"` for the first account), `isActive` (boolean, `true`), `createdAt` (timestamp),
`updatedAt` (timestamp); `createdBy`/`updatedBy` are optional.

**Deployment-order step 8 of 12 (production Studio) is now fully closed** — both installer defects
found during this goal (the white screen and the missing/wrong desktop icon) are owner-confirmed
fixed via a real retest, not merely built and assumed correct.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-8 of 12 all
complete and owner-confirmed. Proceeding into Phase G (Portal + installed Studio + backend smoke
testing, step 11 of 12) under the same multi-phase authorization already granted. Phase D's
remaining owner-driven Studio setup (categories, `settings/emailProviders`) is unblocked now that
the owner has working Studio access.

## 2026-07-30 — Goal #13 "production-release" — Studio desktop icon aligned with collapsed-sidebar mark; second replacement installer (v1.0.0-rc5) built, awaiting owner retest

**Owner request:** use the exact icon shown at the top of the collapsed Studio sidebar as the
official packaged Windows application icon.

**Source of truth**, traced through the actual render path: `Sidebar.tsx` renders `<AppLogo
variant="collapsed">` when the sidebar is collapsed; `AppLogo.tsx` resolves that variant's fallback
to `src/assets/brand/fresh-prints-studio-logo-collapsed.png`. Confirmed via this session's earlier
Phase D bootstrap-inventory research that `settings/brandLogos` is unset on the cold-start
`fresh-prints-prod` project, so this bundled asset is genuinely what renders, not a hypothetical
fallback. Visually confirmed as the circular "FP Request" mark; `sharp` metadata confirmed
6387×6405px RGBA with alpha. Correctly excluded every item on the owner's exclusion list (full
wordmark, the never-existed `fresh-prints-logo.svg`, any redesigned/generic icon).

**Existing gap found:** `electron-builder.json5` already referenced `win.icon: "icon.ico"` /
`linux.icon: "icon.png"`, but neither file existed anywhere in the repo — matching the "default
Electron icon is used" line seen in every prior Studio build log this session.

**Fix** (second narrow Plan + independent Formal Review, both `approved`): measured the source
asset's opaque-pixel bounds via `sharp .trim()` and found they already extend to the canvas edges
(no built-in margin), so wrote a one-time asset-generation script
(`apps/studio/scripts/generate-app-icon.mjs`) using `sharp` plus a newly-added `png-to-ico`
devDependency (researched and selected: pure JS, no native binaries, actively maintained, MIT) to
pad and resize the source into a 7-resolution `.ico` (16/24/32/48/64/128/256px) and a 512px PNG,
written to the exact paths the existing config already expected. Also corrected `main.ts`'s
`BrowserWindow.icon`, previously pointing at the same nonexistent `fresh-prints-logo.svg` found
during the white-screen investigation — researched via Electron's own docs and confirmed this
option is redundant for the packaged Windows taskbar (Windows reads the icon embedded in the exe's
resources via electron-builder's `rcedit` step) but genuinely affects the dev-mode window icon.

**Verified directly in this environment, not deferred to the owner:** the generated `.ico` parsed
to confirm exactly the 7 requested resolutions; visual inspection at 16×16/32×32/256×256 confirmed
no clipping and a legible mark at small sizes; Studio typecheck, `vite build` (confirmed the
white-screen fix's circular-chunk protection remained intact), full `electron-builder` packaging,
repo lint, `git diff --check` all exit 0; the "default Electron icon is used" build-log line no
longer appears. **Extracted the actual embedded icon from both the packaged `.exe` and the
installer `.exe` via Windows' own `System.Drawing.Icon.ExtractAssociatedIcon` API and visually
confirmed both show the correct Fresh Prints mark** — direct proof, not inference. Re-confirmed via
`asar` extraction that `scheduler` remains correctly chunked with `react-vendor`.

Promoted via GitHub PR #10 (merge `c644935`), tagged `v1.0.0-rc5`. Re-ran lint/typecheck on the
tagged commit (both exit 0), built the second replacement installer using the same safest
env-file-swap procedure. **Directly re-confirmed on this exact production-configured build:**
correct embedded icon (same extraction method), `firebaseConfig.projectId` resolves to
`fresh-prints-prod` (via `asar` extraction), `scheduler` still correctly chunked.

**Second replacement installer:** `Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc5.exe` (also present
as `Fresh Prints-Windows-0.0.0-Setup.exe`, byte-identical), `apps/studio/release/0.0.0/`, ~102.7
MB, SHA-256 `e07914692ad2ff507bce279522852acf4bd9e89eb75d04da2221e3f05c17d011` — different from
both the original failed installer's checksum and `v1.0.0-rc4`'s checksum, confirming genuinely
new packaged content. `v1.0.0-rc4` (the white-screen-only fix) remains preserved on disk,
untouched, for the incident record. Unsigned. Not uploaded or distributed publicly.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-7 of 12 remain
complete; step 8 (Studio) blocked on the owner's install/launch/login/icon retest of
`v1.0.0-rc5` — which supersedes `rc4` for retest purposes since it includes both the white-screen
fix and the icon fix. Phase G smoke testing does not resume until that retest reports `PASS` or
`PASS WITH NOTES: ...`.

## 2026-07-30 — Goal #13 "production-release" — Production Studio white-screen incident diagnosed and fixed; replacement installer built, awaiting owner retest

**Incident:** the owner installed the first production Studio installer
(`Fresh Prints-Windows-0.0.0-Setup.exe`) and reported a permanent white screen — window opens,
sign-in UI never appears, no recovery. This sandboxed environment could not reproduce the failure
directly: the packaged `.exe` exits silently within seconds across multiple launch methods (a
genuine environment limitation — no Windows Event Viewer crash entry either, confirmed via several
attempts), separate from the actual bug. Asked the owner to launch the installed executable with
`--enable-logging` on their own machine; they captured the real error:
`Uncaught TypeError: Cannot read properties of undefined (reading 'createContext')` in the packaged
vendor chunk, plus a secondary warning about a missing image asset.

**Ruled out with direct evidence:** Firebase environment injection — extracted the actual packaged
`app.asar` via `npx asar extract` and confirmed the embedded config correctly resolved to
`fresh-prints-prod` with a valid, non-empty API key (the `fresh-prints-dev` string also found in
the same bundle was an unrelated allowlist constant and debug label, not the active config).
Packaged asset paths — the packaged `index.html` used correct relative script/link references.

**Confirmed root cause:** `apps/studio/vite.config.ts`'s Rollup `manualChunks` function used a bare
substring match (`id.includes('node_modules/react')`) instead of a package-boundary match. This
correctly caught `react`/`react-dom` but not `scheduler` (react-dom's own runtime dependency, whose
path contains no "react" substring), which fell into the generic `vendor` chunk instead of
`react-vendor`. The original build had already logged a warning — `Circular chunk: vendor ->
react-vendor -> vendor` — but Rollup treats this as a warning, not a build failure, so the broken
build shipped with an exit-0 status. This class of bug only reproduces in packaged production
builds, since Vite's dev server never applies `manualChunks` splitting — `npm run dev:studio` was
structurally incapable of catching it.

**Fix** (narrow Plan + independent Formal Review, both `approved`): corrected the chunk-matching
condition to exact package-boundary paths and explicitly included `scheduler` alongside
`react`/`react-dom`. Added a `rollupOptions.onwarn` hook that fails the build on any future
`CIRCULAR_CHUNK` warning — the real process gap this incident exposed was that nothing in the
existing verification suite inspected build warnings or launched the packaged output; this closes
that gap for this specific, now-understood failure class. Also removed a dead favicon `<link>`
reference to an asset that never existed anywhere in this repo's Git history (unrelated to the
crash, found during the same evidence-gathering pass, fixed as a zero-risk one-line correction).

**Verification:** direct `asar` extraction of the rebuilt bundle confirmed `scheduler` now lives in
`react-vendor`, not `vendor`; the circular-chunk warning no longer appears; Studio typecheck,
`vite build`, full `electron-builder` packaging, repo lint, and `git diff --check` all exit 0.
Promoted via GitHub PR #9 (merge `daaafc1`), tagged `v1.0.0-rc4`. Built the replacement installer
from that exact verified commit using the same safest env-file-swap procedure (backup dev env →
temporary production values → build → restore).

**Replacement installer:** `Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc4.exe`,
`apps/studio/release/0.0.0/`, ~102.3 MB, SHA-256
`a0be8e956108bc786fe3ea629f7dc356bb0e28ed09b60d740c31a64c1bf177ed` — **deliberately different**
from the original failed installer's checksum
(`c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`), confirming genuinely new
packaged content, not a no-op rebuild. Unsigned, same as the original. Not uploaded or distributed
publicly.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-7 of 12 remain
complete; step 8 (Studio) blocked on the owner's install/launch/login retest of the replacement
installer. Phase G smoke testing does not resume until that retest reports `PASS` or
`PASS WITH NOTES: ...`.

## 2026-07-30 — Goal #13 "production-release" — Production Studio installer built, first owner account bootstrapped (deployment-order steps 1-8 of 12 done); awaiting owner installation and smoke testing

**First production owner account bootstrapped.** Presented a consolidated Phase D bootstrap list
for owner approval before any Firestore write: `settings/emailProviders` (approved — owner will
set `inviteProvider: "resend"`, `proofNoticeProvider: "brevo"` via Studio UI once logged in,
matching their decision, since the code default is Resend for both), at least one category
(approved — owner will create via Studio UI). The most significant finding: **no automated way
exists anywhere in this codebase to create the first owner account** — the normal user-creation
callable requires an existing owner caller, and Firestore Rules block all client writes to
`users/*`, a genuine chicken-and-egg gap for a cold-start project. Walked the owner through the
exact manual two-part Console procedure (Firebase Auth → Add user → copy UID; Firestore Console →
`users/{uid}` document with `role: "owner"`, `isActive: true`). **Owner confirmed both parts
complete.** `rebuildCatalogSnapshots` confirmed source-safe on a fully empty catalog but
deliberately held until real catalog data exists — invocation remains its own separate step.

**Production Studio Windows installer built.** Owner chose to prioritize Studio access before
finishing Phase D's remaining Studio-dependent setup. Source audit confirmed Studio's Firebase
config is entirely build-time/Vite-env-file-based with no hardcoded Portal URL, and the Test Data
Reset UI is excluded from production builds by three independent layers (a build-time
`import.meta.env.DEV` gate, a `fresh-prints-dev`-only project allowlist, and the underlying
callable not being deployed to production at all). Backed up the dev env file, temporarily wrote
production Firebase Web config values, ran the full build/package on the verified `production`
commit, immediately restored the dev file. Build + packaging: exit 0.

**Installer:** `Fresh Prints-Windows-0.0.0-Setup.exe`, `apps/studio/release/0.0.0/`, ~102.3 MB,
SHA-256 `c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`, **unsigned** (Windows
will show the expected unrecognized-publisher SmartScreen warning on first run). Not uploaded or
distributed publicly — awaiting owner installation and Phase G smoke testing.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-8 of 12 all
complete. Next: owner installs the Studio `.exe` and begins the consolidated Portal + installed
Studio + backend smoke-test checklist, reporting `PASS` / `PASS WITH NOTES: ...` / `FAIL: ...`.
Once Studio is installed and the owner is signed in, Phase D's remaining items (categories,
`settings/emailProviders`) resume as the owner's own Studio-UI action.

## 2026-07-30 — Goal #13 "production-release" — First App Hosting Portal release COMPLETE (deployment-order steps 1-7 of 12 done); proceeding into settings/bootstrap inventory

**The first-ever Fresh Prints production Portal deployment succeeded.** App Hosting
environment-variable configuration (step 6) added an `env:` block to
`apps/portal/apphosting.yaml` with the 7 required `NEXT_PUBLIC_FIREBASE_*` values plus
`NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com`, sourced from the owner's gitignored
`.env.production.local`. `NEXT_PUBLIC_GA_MEASUREMENT_ID` was deliberately omitted even though a
real value already exists in that local file — GA4 go-live remains a separate, later checkpoint.
Promoted to `production` via GitHub PR #6.

**First rollout attempt failed:** Cloud Build error `Missing dependency lock file at path
'/workspace/apps/portal'`. Root cause: Fresh Prints is an npm-workspaces monorepo (single root
`package-lock.json`; `apps/portal` correctly has none of its own), but Firebase App Hosting's
buildpack has official first-class monorepo support only for Nx/Turborepo.

**Second attempt (first fix hypothesis):** added `buildCommand`/`runCommand` overrides to
`apphosting.yaml`. **This was accidentally committed directly to `production`** during
implementation — caught immediately before pushing (the stray commit never reached GitHub, zero
remote impact), corrected by resetting the local `production` branch pointer and reapplying the
identical change properly via `development` → PR #7. The retry still failed with the byte-identical
error. The owner opened the real Cloud Build Console log and confirmed App Hosting's
monorepo-detection step runs *before* `buildCommand` executes — disproving the first hypothesis
with direct evidence, not assumption.

**Third attempt (root-cause fix):** the owner directed a narrow Plan + independent Formal Review
(both `approved`) to add the minimum officially-documented Turborepo support instead: `turbo` as a
root devDependency, a root `turbo.json` with a single `build` task (no `dependsOn` — the shared
workspace packages have no `build` script; Next.js `transpilePackages` handles them directly), a
`packageManager: "npm@10.8.2"` field (required for turbo's own workspace resolution, discovered
during implementation, within approved scope), removed the now-confirmed-ineffective build-command
override, kept the single root `package-lock.json` and `rootDir: ./apps/portal` unchanged per
explicit owner instruction. Verified locally: `npm ci`, `npx turbo run build
--filter=@fresh-prints/portal` (1/1 tasks successful), Portal typecheck, `npm run build:portal`,
repo lint, YAML validation, `git diff --check` — all exit 0. Promoted via PR #8.

**Retried the rollout: "✔ Successfully created a new rollout!"** Verified the backend live at
`https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` (Enabled, `nodejs24`,
`us-central1`). Homepage returns HTTP 200 with the correct `<title>Fresh Prints Request
Portal</title>`; `robots.txt` returns the **allow** variant (not the fail-closed default),
confirming `NEXT_PUBLIC_PORTAL_ORIGIN`/host resolution is correctly live in production; no
`fresh-prints-dev` string found anywhere in the served HTML. Automatic rollouts remain **disabled**
for this backend — each future release requires its own explicit trigger.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-7 of 12 all
complete. Proceeding into Phase D (production settings and bootstrap inventory, step 9 of 12) under
the same multi-phase authorization already granted by the owner. No production Firestore data has
been written; a consolidated bootstrap list requires its own separate owner approval before any
write occurs.

## 2026-07-30 — Goal #13 "production-release" — Cloud Functions deployment COMPLETE (deployment-order steps 1-5 of 12 done); proceeding into App Hosting/Portal release

**Cloud Functions (step 5) confirmed complete.** Owner issued a multi-phase `Continue Workflow`
instruction authorizing Phase A through Phase H in sequence, pausing only at named checkpoints.
Phase A (non-secret Functions configuration audit) found no source change required —
`portalUrlResolver.ts`, `.firebaserc`, and the `INVITATION_FROM_EMAIL`/`PROOF_NOTICE_FROM_EMAIL`
code defaults already matched owner intent exactly. Reverification on the fast-forward-verified
`production` commit passed cleanly (build/lint/diff-check all exit 0); fresh programmatic
re-enumeration reconfirmed 105 total exports / 99 include / 6 exclude, byte-identical to the
previously approved allowlist, zero drift.

Deployed the exact reviewed 99-function allowlist to `fresh-prints-prod`. First attempt failed
before creating anything (CLI non-interactive mode needed explicit values for two non-secret
`defineString` params) — fixed by creating `functions/.env.fresh-prints-prod` (gitignored,
following the exact existing repo convention, containing only the two non-secret sender-address
defaults already present as code defaults). Second attempt required `--force` because
`onEmailDeliveryJobCreated` has a pre-existing, intentional `retry: true` trigger option (not a new
or accidental change) — surfaced to the owner via a structured question rather than applied
unilaterally; **owner approved `--force` for this specific, reviewed reason.**

Third attempt deployed 84 of 99 functions; 15 failed with transient `429 Quota exceeded` (expected
on a brand-new project's first bulk 2nd-gen Functions deploy) plus Eventarc service-agent
permission-propagation delay for newly-enabled trigger infrastructure. Verified via authoritative
`firebase functions:list --project fresh-prints-prod --json` (not log-parsing) that all 84 deployed
functions were correctly on the approved allowlist — zero excluded and zero unexpected functions —
confirming the partial failure was purely quota/propagation-related, not a configuration defect.
Waited for the per-minute quota window to reset, then retried with an explicit allowlist scoped to
exactly the 15 missing function names (same owner-approved `--force`); all 15 succeeded, log ended
with an explicit "Deploy complete!".

**Final authoritative verification:** exactly 99 functions deployed, byte-identical diff against
the approved 99-name allowlist (zero drift), 0 of the 6 excluded functions present
(`inventoryCatalogImageStorage`, `wipeOperationalTestData`, `testAiEnrichmentPlayground`,
`testAiEnrichmentTagRerank`, `ownerDeleteUser`, `backfillPrintRequestQueueTab`), all functions in
`us-central1`, no function in a non-`ACTIVE` state, `rebuildCatalogSnapshots` confirmed present
(deployed but not yet invoked — invocation remains its own separate Phase D checkpoint). Deploy log
directly confirmed the `GEMINI_API_KEY` secret-accessor role was granted to the Functions service
account during this deploy — direct evidence secret bindings are live, not merely configured.

**No secret value was ever accessed, printed, or logged at any point in this pass.** No excluded
Function was deployed. No App Hosting, Portal, DNS, Auth, or production-data action occurred.
`production` received no Git commit (Functions deploy is a Firebase action, not a repository
change).

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-5 of 12 all
complete. Proceeding into Phase C (App Hosting environment configuration and first Portal release,
step 6 of 12) under the same multi-phase authorization already granted by the owner.

## 2026-07-30 — Goal #13 "production-release" — Firestore indexes CLOSED (owner confirmed all 65 Enabled); Secret Manager population COMPLETE (deployment-order steps 1-4 of 12 done)

**Firestore indexes checkpoint closed:** owner confirmed via Firebase Console that all 65 of 65
composite indexes on `fresh-prints-prod` show `Enabled` — 0 `Building`, 0 `Error`, 0 field
overrides.

**Secret Manager (step 4) confirmed complete.** Source-level audit of
`functions/src/lib/secrets.ts` on the verified `production` commit found exactly 4 required
secrets: `GEMINI_API_KEY` (bound by `enqueueAiEnrichment`, included in the approved allowlist —
also referenced by `testAiEnrichmentPlayground`/`testAiEnrichmentTagRerank`, both correctly
excluded), `RESEND_API_KEY` and `BREVO_API_KEY` (both bound by `createCustomerWithPortalInvite`/
`createTeamUser`/`onEmailDeliveryJobCreated` per Firebase Functions v2's deploy-time
secret-declaration requirement — `resolveEmailApiKey()` only reads the value for the actually
selected provider at runtime), `ETSY_X_API_KEY` (bound by `searchEtsyRecommendations`/
`staffSearchEtsyRecommendationApiResults`). **Confirmed zero `OPENAI_API_KEY` references anywhere
in source** — Gemini-only architecture confirmed current.

**Email-provider default confirmed from source, not guessed:**
`DEFAULT_EMAIL_PROVIDER_SETTINGS` (both `inviteProvider` and `proofNoticeProvider`) defaults to
`"resend"`; the system does not fail closed when `settings/emailProviders` doesn't exist —
cold-start-safe. **Owner selected both Resend and Brevo** for launch flexibility.

**External-provider readiness, owner-confirmed (status-only, no credential values shared):**
Gemini AVAILABLE; Resend AVAILABLE, sender domain VERIFIED; Brevo AVAILABLE, sender domain
VERIFIED; Etsy credential AVAILABLE, application access AVAILABLE. **No blocker identified.**

**Pre-population metadata check** (read-only, no values accessed) confirmed all four secrets
absent from `fresh-prints-prod` before population — no existing-secret overwrite risk.

**Secret population method:** this coding agent's tool environment cannot host a genuinely
interactive terminal session that a human can type a value into mid-command. Per the hard
security rules (never pass a value as a command argument, never use a plaintext file, never
fabricate an interactive session), population was correctly handed to the owner: **the owner ran
`firebase functions:secrets:set <NAME> --project fresh-prints-prod` directly in their own
terminal for all four secret names**, using that command's genuine interactive hidden-value
prompt.

**Post-population metadata verification** (read-only, no values accessed) confirmed all four
secrets: version 1, state ENABLED. Confirmed no `OPENAI_API_KEY` was created. Confirmed no secret
was created in `fresh-prints-dev` (a single read-only informational check of that project's own
pre-existing, unrelated `GEMINI_API_KEY` was performed for context, not a modification).

**No secret value was ever printed, echoed, logged, displayed, copied to a file, or included in
any command argument, output, or workflow record throughout this entire pass.**

**No Cloud Functions, App Hosting, Portal, or any other Firebase component was deployed. No
production data was created. `rebuildCatalogSnapshots` was not invoked. DNS was not touched.
`master` was not deleted. `production` received no Git commit** — this pass performed only
Secret Manager configuration on `fresh-prints-prod`, not a repository change.

**Active managed goal:** `production-release` (Goal #13) — deployment-order steps 1-4 of 12 all
complete. STOPPED at the Functions deployment approval checkpoint (step 5 of 12 — approved
99-function allowlist).

## 2026-07-30 — Goal #13 "production-release" — Firestore indexes DEPLOYED to fresh-prints-prod (step 3 of 12 succeeded); awaiting owner Console readiness confirmation

Owner approved via `APPROVE FIRESTORE INDEXES REDEPLOYMENT`. Pre-deploy verification re-confirmed
exact matches on `production` (`HEAD`/`origin/production` = `21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`,
`firestore.indexes.json` hash `e3c15380f538c3e1e6ccf5197c82f1b2ad63b5e5`, clean tree). Re-ran full
validation — all exit 0: duplicate validator (4/4), canonical audit (65 total/65 unique/0
duplicates/0 field overrides), `npm run test:rules` (48/48), lint, `git diff --check`. Captured
remote baseline read-only: 50 indexes, 0 field overrides, matched expected.

**Deployed:** `firebase deploy --only firestore:indexes --project fresh-prints-prod` — **exit 0.**
"Deploy complete!" / "firestore: deployed indexes in firestore.indexes.json successfully for
(default) database." **No deletion prompt occurred.** No `--force` used.

**Post-deployment remote state:** 65 indexes, 0 field overrides — all 16 collection groups
represented, including the 7 that previously had zero. Precise canonical-identity comparison
(correctly excluding Firestore's server-auto-appended `__name__` tiebreaker field, which an
initial pass had mistakenly flagged as 37 false-positive mismatches before being corrected)
confirmed **0 missing, 0 unexpected** — every one of the 65 local index definitions is present
remotely with matching content.

**Remaining verification not obtainable from the CLI:** `firestore:indexes` reports only
definitions, not per-index build status. **This checkpoint is not fully closed until the owner
confirms via Firebase Console** (`fresh-prints-prod` → Firestore Database → Indexes) that every
index shows `Enabled`, not `Building` or `Error`.

Returned to `development` (already in sync, no back-merge needed). `origin/production` confirmed
unchanged — this deployment added no Git commit, only the Firebase indexes release.

**No other Firebase component was deployed.** Firestore Rules and Storage Rules remain correctly
deployed, unaffected. No Secret Manager, Functions, App Hosting, DNS, production data,
`rebuildCatalogSnapshots`, Studio distribution, or GA4/Search Console action occurred. `master`
was not deleted.

**Active managed goal:** `production-release` (Goal #13) — awaiting owner Console confirmation
that all 65 indexes show `Enabled`. Once confirmed, the next checkpoint is Secret Manager
inventory, value collection, and production secret population approval.

## 2026-07-30 — Goal #13 "production-release" — Firestore index remediation MERGED to production via PR #5; v1.0.0-rc3 tagged; stopped at indexes-redeployment approval checkpoint

**PR #5 merge verified via GitHub API:** `merged: true`, merge commit
`21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`, base `production` (was `a8b02c9`) ← head
`development` (`03d16b0`), 9 files, +1129/-43 — exactly matching this goal's own pre-merge
verification. `origin/production` advanced accordingly; `master` unchanged.

Switched to `production`, fast-forward pulled, confirmed branch/HEAD/clean tree. **Verified the
corrected index configuration on the exact merged commit:** `firestore.indexes.json` new hash
`e3c15380f538c3e1e6ccf5197c82f1b2ad63b5e5`; canonical duplicate audit — **65 total, 65 unique, 0
duplicate groups, 0 field overrides**; both the two-field and three-field `customerUploads`
indexes confirmed present and distinct. `firestore.rules` and `storage.rules` confirmed
**unchanged** from already-deployed versions. Fresh Functions export enumeration: **105
total, 99 include, 6 exclude** — allowlist unchanged.

**Full verification suite, all exit 0:** duplicate validator (4/4), JSON validity, `npm run
test:rules` (48/48), `npm run lint`, `git diff --check`.

**Remote state captured read-only:** `firebase firestore:indexes --project fresh-prints-prod` —
50 indexes, 0 field overrides — **unchanged, untouched.**

Confirmed `v1.0.0-rc1` and `v1.0.0-rc2` unchanged; created and pushed annotated tag **`v1.0.0-rc3`**
on the verified merge commit. Returned to `development` (already in sync — no back-merge needed).

**No Firebase deployment, secret configuration, DNS configuration, or production data creation
occurred in this pass.** The 50 already-created remote indexes were not touched, edited, or
deleted. `master` was not deleted.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firestore indexes
**redeployment** approval checkpoint; awaiting explicit owner approval to retry
`firebase deploy --only firestore:indexes --project fresh-prints-prod`.

## 2026-07-30 — Goal #13 "production-release" — Firestore index duplicate REMEDIATED on development (Plan + Formal Review approved); stopped at production PR checkpoint

Performed a canonical duplicate audit of `firestore.indexes.json` (deterministic structural
identity by collectionGroup+queryScope+ordered fields, not raw JSON formatting). Confirmed exactly
one duplicate group: `customerUploads` `purpose ASC + catalogReviewStatus ASC` at array positions
44 and 50, byte-identical. Confirmed the legitimate `customerUploads` two-field/three-field pair
(positions 44/43) are structurally distinct — the three-field prefix-extension index was correctly
protected, not conflated with the duplicate.

**Provenance traced via `git blame`:** position 44 (kept) originates from commit
`043f38a1adc4a62a727e5a4a1ee30fd4d1900c81` (2026-07-13, "Add Portal donate-designs uploads and
Studio donated designs intake") — the original, deliberate pair with the three-field index.
Position 50 (removed) originates from commit `cbba4ca858d76da5514389a67e187612761240fd`
(2026-07-14, "Add design asset purge, helper permission gates, and Portal account artwork
upgrades") — an unrelated feature commit, one day later, that accidentally re-added an identical
index.

**Confirmed remote state unchanged:** `firebase firestore:indexes --project fresh-prints-prod` —
50 indexes, 0 field overrides, same 7 collection groups with zero indexes as before. Nothing was
touched remotely at any point.

**Wrote and independently reviewed a narrow remediation Plan**
(`docs/workflow/plans/2026-07-30-firestore-index-duplicate-remediation-plan.md`) — the Formal
Review (`docs/workflow/reviews/2026-07-30-firestore-index-duplicate-remediation-review.md`)
independently re-ran the audit and provenance trace from scratch and confirmed both matched.
**Verdict: approved**, no unresolved blocker.

**Implemented the exact, narrow correction:** removed only the 14-line duplicate block (array
position 50); zero other changes (`git diff --stat`: 1 file, 14 deletions only). Corrected file:
65 unique definitions, 0 duplicates, 0 field overrides.

**Added deterministic duplicate-validation test coverage:**
`packages/shared/src/constants/firestoreIndexesDuplicateValidation.test.ts`, following the
existing `storageRulesAlignment.test.ts` convention (no new dependency) — proves the real file has
zero duplicates, a fixture with an exact duplicate is detected, and a two-field/three-field prefix
pair is correctly not flagged. 4/4 tests pass.

**Full verification, all exit 0:** JSON validity, the new validator test, `npm run test:rules`
(48/48), `npm run lint`, `git diff --check`.

Committed narrowly (only the 4 intended files: the index fix, the new test, the Plan, and the
Formal Review) and pushed to `origin/development`. Prepared the `development → production` pull
request — did not merge (no `gh` CLI available in this environment) — exact pre-filled compare URL
provided to the owner.

**The 50 indexes already created on `fresh-prints-prod` were not touched, edited, or deleted at
any point.** No `firebase deploy` command of any kind was run. Firestore Rules and Storage Rules
remain correctly deployed, unaffected. No Secret Manager, Functions, App Hosting, DNS, production
data, `rebuildCatalogSnapshots`, Studio distribution, or GA4/Search Console action occurred.
`production` received no Git commit — only `development` advanced. `master` was not touched.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the production PR merge
checkpoint; awaiting the owner to review and merge the remediation pull request. After merge:
production verification, `v1.0.0-rc3` tag, then a **separate** owner approval before retrying the
Firestore indexes deployment.

## 2026-07-30 — Goal #13 "production-release" — Firestore indexes deployment BLOCKED (duplicate index caused partial failure); human checkpoint required

Owner approved via the Firestore-indexes deployment instruction, authorizing exactly
`firebase deploy --only firestore:indexes --project fresh-prints-prod`.

**Pre-deploy verification passed in full:** `origin/master`/`origin/production` confirmed
unchanged (`aa570aa`/`a8b02c9`); switched to `production`, fast-forward pulled, confirmed `HEAD` =
`origin/production` = `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`, clean tree;
`firestore.indexes.json` committed hash, working-tree hash, and production-vs-development
comparison all matched exactly (`b67e711bed1a2881767b94ac369fed59346301be`, identical between
branches); JSON validated (66 composite indexes, 0 field overrides, exit 0); remote
pre-deployment state confirmed empty (`{"indexes": [], "fieldOverrides": []}`).

**Full-file inspection (as explicitly required) found one real issue:** a byte-for-byte duplicate
index definition on `customerUploads` (`purpose` ASC + `catalogReviewStatus` ASC), present twice
at two separate array positions. No hardcoded project IDs, no malformed fields, no dev-only
collection names, no destructive field overrides found otherwise.

**Deployment attempted:** `firebase deploy --only firestore:indexes --project fresh-prints-prod`
— **exit 1.** Firebase CLI reported `HTTP Error: 409, index already exists` on the
`customerUploads` collection group — the CLI submitted the duplicate entry twice within the same
batch, and the second submission's own duplicate triggered the failure, aborting the remaining
batch.

**Post-failure remote state:** 50 of 66 indexes now exist on `fresh-prints-prod`
(`categories`, `customers`, `customerUploads`, `designs`, `gangSheetItems`, `gangSheets`,
`printRequestItems`, `printRequests`, `showAllocations`). **7 collection groups have zero
indexes**: `assistedCreationRequests`, `customerNotifications`, `customerUploadBatches`,
`customerUploadFinalizeLeases`, `etsyRecommendationRequests`, `etsyRecommendationSuggestions`,
`etsySuggestionRequests`. No data was corrupted, nothing was deleted, and no unexpected index was
created — the 50 present indexes exactly match their corresponding entries in the reviewed
`firestore.indexes.json`.

**Per explicit instruction: did not retry blindly, did not use `--force`, did not manually
edit/delete anything in Console.** Firestore Rules (step 1) and Storage Rules (step 2) remain
correctly deployed and are completely unaffected by this failure.

**Required remediation (owner decision needed, not performed this pass):** remove the exact
duplicate index entry from `firestore.indexes.json` on `development`, commit, promote via a new
GitHub pull request to `production`, then obtain separate explicit owner approval before
reattempting the Firestore indexes deployment. After a successful redeploy, every unique index
definition must be verified `Enabled`/ready in Firebase Console before this checkpoint can close.

**No production data was touched. No secret was configured. No Functions, App Hosting, DNS, or
Studio action occurred. `master` was not deleted.**

**Active managed goal:** `production-release` (Goal #13) — **BLOCKED** at the Firestore indexes
deployment checkpoint (deployment-order step 3); awaiting owner decision on the
`firestore.indexes.json` duplicate-entry correction.

## 2026-07-30 — Goal #13 "production-release" — Storage Rules DEPLOYED to fresh-prints-prod (deployment-order step 2 of 12 complete)

Owner approved via `APPROVE STORAGE RULES DEPLOYMENT`, authorizing exactly
`firebase deploy --only storage --project fresh-prints-prod` and nothing else.

Ran the full pre-deploy safety sequence: confirmed clean tree on `development`; `git fetch
origin`; `git switch production`; `git pull --ff-only origin production` (already up to date, no
divergence); verified local `HEAD` = `origin/production` =
`a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56` and `storage.rules` blob hash =
`3f1dd48e9f37afacb972ade3dc21c2818038a6fe` — both exact matches to the required values. Ran
`npm run test:rules` (48/48 pass, exit 0) and `git diff --check` (exit 0, clean).

**Deployed:** `firebase deploy --only storage --project fresh-prints-prod` — **exit 0, "Deploy
complete!"** Rules compiled successfully with no errors or warnings and were released to
`firebase.storage`. Console URL confirmed `fresh-prints-prod` as the deployed project. **This is
the first-ever Fresh Prints production Storage Rules deployment** — no prior Storage Rules
history existed on this project.

Provided owner Console verification instructions: `fresh-prints-prod` → Build → Storage → Rules
tab → confirm "Last published" timestamp and compare displayed content against local
`storage.rules`.

Returned to `development` (`git switch development`, `git pull --ff-only`, clean tree confirmed).
**`origin/production` confirmed unchanged** at `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56` — this
deployment added no Git commit to `production`, only a Firebase Storage Rules release.

**No other Firebase component was deployed.** No Firestore Rules redeployment (unnecessary,
already correctly deployed), no Firestore indexes, no Functions, no App Hosting release, no
secrets, no DNS, no production data, no `rebuildCatalogSnapshots`, no Studio distribution, no
GA4/Search Console configuration. `master` was not deleted.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firestore indexes
deployment approval checkpoint (deployment-order step 3); awaiting explicit owner approval.

## 2026-07-30 — Goal #13 "production-release" — development promoted to production via GitHub PR #3; v1.0.0-rc2 tagged; stopped at Storage Rules checkpoint

Owner confirmed a local `apps/studio/tsconfig.json` change (removed `ignoreDeprecations: "5.0"`
and `baseUrl: "."`) was an intentional TypeScript 5.9.3 compatibility fix — no runtime behavior
change. Verified (typecheck, build incl. electron-builder, lint, diff-check all exit 0) and
committed to `development` as `dd05ef25ebeb2512ee1a56da031b6118acb01498a`, pushed.

Verified the full promotion diff before the PR: 8 commits, 9 files, +1535/-53 between
`origin/production` and `origin/development` — the tsconfig fix, the pre-push hook, and 7
documentation/redaction files. `firestore.rules`, `storage.rules`, `firestore.indexes.json`, and
`functions/src/index.ts` all confirmed byte-identical between branches — no behavioral change, no
secret, no local env file.

**Owner created and merged GitHub PR #3** ("Release: promote verified development state to
production") — confirmed via GitHub API: `merged: true`, merge commit
`a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`, base `production` (`aa570aa`) ← head `development`
(`dd05ef2`), 8 commits, 9 files, +1535/-53 — exactly matching this session's own pre-merge
verification.

Switched to `production`, fast-forward pulled (`aa570aa..a8b02c9`, no conflicts), confirmed
branch/HEAD/clean tree. **Ran the complete release verification suite on the exact merged
commit** — Functions build, Portal typecheck, Studio typecheck, Portal build, Studio build
(incl. electron-builder), repo lint, Firebase Rules emulator tests (48/48), `git diff --check`:
**all exit 0.** Fresh Cloud Functions export enumeration re-confirmed 105 total exports, 99
included, 6 excluded, `rebuildCatalogSnapshots` included — the approved allowlist unchanged by
the merge.

Confirmed `firestore.rules` (`d4d754e2...`), `storage.rules` (`3f1dd48e...`), and
`firestore.indexes.json` (`b67e711b...`) hashes all unchanged from the already-verified/deployed
versions — Firestore Rules remain correctly deployed, **no redeployment required**.

Confirmed `v1.0.0-rc1` unchanged at `aa570aa875d20ba85fd405480a47e6eda59f85b0`. Created and pushed
annotated tag **`v1.0.0-rc2`** on the verified merge commit `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`.

Returned to `development` (fast-forward pull, which also picked up a benign GitHub-suggested
production→development sync-back merge, PR #4 — content-identical, introduces nothing new).
Confirmed final branch `development`, clean tree, `origin/production` still exactly at the
verified merge commit.

**The entire promotion went through the protected GitHub PR workflow** — no branch protection was
bypassed, no emergency override used, no force-push anywhere. **No Firebase deployment of any
kind occurred in this pass.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Storage Rules
deployment approval checkpoint (deployment-order step 2); awaiting explicit owner approval.

## 2026-07-30 — Goal #13 "production-release" — Firestore Rules DEPLOYED to fresh-prints-prod (deployment-order step 1 of 12 complete)

**First production Firebase deployment of this goal.** Owner approved via
`APPROVE FIRESTORE RULES DEPLOY`, authorizing exactly `firebase deploy --only firestore:rules
--project fresh-prints-prod` and nothing else.

Ran the full pre-deploy safety sequence: confirmed clean tree on `development`; `git fetch
origin`; `git switch production`; `git pull --ff-only origin production` (already up to date, no
divergence); verified local `HEAD` = `origin/production` =
`aa570aa875d20ba85fd405480a47e6eda59f85b0` and `firestore.rules` blob hash =
`d4d754e22090a75ec9fa1c7fc38bbf2101822131` — both exact matches to the required values. Confirmed
target project `fresh-prints-prod` in the command.

**Deployed:** `firebase deploy --only firestore:rules --project fresh-prints-prod` — **exit 0,
"Deploy complete!"** Rules compiled successfully (pre-existing non-blocking lint warnings about
unused/shadowed function names, not errors) and were released to `cloud.firestore`. Console URL
confirmed `fresh-prints-prod` as the deployed project. **This is the first-ever Fresh Prints
production Firestore Rules deployment** — no prior Rules history existed on this project.

Provided owner Console verification instructions: `fresh-prints-prod` → Firestore Database → Rules
tab → confirm "Last published" timestamp and compare displayed content against local
`firestore.rules`.

Returned to `development` (`git switch development`, `git pull --ff-only`, clean tree confirmed).
**`origin/production` confirmed unchanged** at `aa570aa875d20ba85fd405480a47e6eda59f85b0` — this
deployment added no Git commit to `production`, only a Firebase Rules release.

**No other Firebase component was deployed.** No Storage Rules, indexes, Functions, App Hosting
release, secrets, DNS, production data, Studio build, or GA4/Search Console configuration
occurred. `master` was not deleted.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Storage Rules deployment
approval checkpoint (deployment-order step 2); awaiting explicit owner approval.

## 2026-07-30 — Goal #13 "production-release" — CORRECTED: App Hosting first release is NOT next; approved deployment order restored; stopped at Firestore Rules deployment checkpoint

**Correction:** a prior pass's log entry title ("stopped at App Hosting first-release checkpoint")
incorrectly implied the Portal release was the immediate next action. The owner clarified the
approved order places 6 steps before it. Restated accurately: `fresh-prints-prod`'s Firebase
products (Firestore Native/`nam5`, Storage `us-central1`, Authentication, Web App, VAPID key) and
its App Hosting backend (`fresh-prints-portal`, connected, branch `production`, root
`apps/portal`, `us-central1`, "Waiting for your first release") are all **configured** —
production is not empty. But **no Firestore Rules, Storage Rules, indexes, or Functions have been
deployed; no secrets set; no production data seeded; no domain configured; no production traffic
exists.**

**Approved deployment order (do not skip):** (1) Firestore Rules, (2) Storage Rules, (3) Firestore
indexes, (4) Secret Manager, (5) Cloud Functions (approved 99-function allowlist), (6) App Hosting
env vars, (7) first Portal release, (8) Studio build, (9) settings/reference data, (10) domain/
Authorized Domains, (11) smoke tests, (12) GA4/Search Console.

Re-verified branch/tag state directly from Git: current branch `development`, clean tree;
`origin/production` = `aa570aa875d20ba85fd405480a47e6eda59f85b0` (unchanged). **`production` was
not modified this pass.**

Compared `firestore.rules` between `development` and `production`: identical Git blob hash
(`d4d754e22090a75ec9fa1c7fc38bbf2101822131`) on both branches, confirmed via
`git rev-parse <ref>:firestore.rules` and cross-checked with an empty `git diff --stat` between
the two refs on that path. Local working-tree copy also matches (`git hash-object`). **No
`development → production` merge is required before deploying Rules.**

Ran the real Firestore/Storage Rules emulator test suite (`npm run test:rules`, using
`@firebase/rules-unit-testing`, requiring the documented portable JDK 21 workaround since no
system Java is present — set `JAVA_HOME`/`PATH` for this command only): **48/48 tests pass, exit
0.**

Rollback preparation: this is the first Rules deployment ever made to `fresh-prints-prod` (no
prior deployed version exists on this project to roll back to). For any future Rules change,
rollback is redeploying the prior commit's `firestore.rules` via the same deploy command, or
restoring from Firebase Console's own Rules version history (independent of git).

**Exact prepared command (NOT executed):**
```
firebase deploy --only firestore:rules --project fresh-prints-prod
```

Updated `docs/standards/DEPLOYMENT.md` with an explicit ordered deployment-sequence list marking
the current position (step 1, Firestore Rules) and clarifying the App Hosting backend's existing
"Waiting for your first release" status does not change that order.

**No `firebase deploy` command of any kind was run. No Rules, indexes, or Functions were deployed.
No secret was set. No production data was touched. `production` was not modified. `master` was
not deleted.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firestore Rules
deployment approval checkpoint; awaiting explicit owner approval to run the exact prepared
command.

## 2026-07-30 — Goal #13 "production-release" — Firebase product enablement CONFIRMED COMPLETE; App Hosting backend created with no rollout; stopped at App Hosting first-release checkpoint

Re-verified branch/tag state directly from Git (unchanged): `master`/`production` both at
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `v1.0.0-rc1` unchanged. **`master` and `production`
were not touched this pass.**

Verified (read-only) the owner's reported Firebase product-enablement completion for
`fresh-prints-prod`: Firestore created in Native mode, location `nam5` (matches this session's own
evidence-based recommendation exactly); Cloud Storage default bucket in `us-central1` (matches
exactly); Authentication enabled with Email/Password + Google providers; production Web App
registered as `Fresh Prints Portal Production` with classic Firebase Hosting correctly not
enabled; production web configuration recorded locally in `apps/portal/.env.production.local` —
confirmed gitignored (`git check-ignore -v` matches the `.env.*.local` rule), confirmed untracked
(`git ls-files` empty), confirmed absent from default `git status` output; **no file content was
read or printed at any point**; Web Push VAPID key generated and recorded in the same local file;
GA4 confirmed still disabled; zero production data created.

Confirmed the App Hosting configuration values against current repository source
(`firebase.json`'s `apphosting[0]`: `backendId: "fresh-prints-portal"`,
`rootDir: "./apps/portal"`) — matched the owner's reported values exactly.

**Owner clarification received:** the App Hosting backend `fresh-prints-portal` was created via
the Console's **Finish** action only, is in `us-central1`, and shows **"Waiting for your first
release."** No deployment or rollout occurred. **This empirically resolves the prior pass's open
question** of whether backend creation triggers an automatic rollout — confirmed **no**: backend
configuration and the first release/deploy are genuinely separate steps in this Firebase
Console/CLI version. Backend configuration is complete; nothing has been built, deployed, or
served; Portal production traffic remains at zero.

Updated `docs/standards/DEPLOYMENT.md` with a clear status table distinguishing backend
configuration (complete) from an actual release/deployment (not performed).

**No Firebase deployment, secret configuration, DNS configuration, or production data creation
occurred in this pass. `rebuildCatalogSnapshots` was not invoked. `master` and `production` remain
untouched.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the App Hosting
first-release checkpoint per explicit instruction; awaiting explicit, separate owner approval
before triggering any release/rollout.

## 2026-07-30 — Goal #13 "production-release" — Both email findings REDACTED from current tree; owner declined Git-history rewrite; stopped at Firebase product-enablement checkpoint

Re-verified branch/tag state directly from Git (unchanged): `master`/`production` both at
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `v1.0.0-rc1` unchanged. **`master` and `production`
were not touched this pass.**

Owner approved redacting the two email findings from the prior audit from the current repository
state. Replaced both with non-real placeholders across every current-tree occurrence (3 files,
including this coding agent's own prior audit-log text in `.cursor/workflow/state.md`, which had
quoted both addresses verbatim while documenting the finding). Confirmed via `git grep` that zero
occurrences of either original address remain anywhere in the current tracked tree.

**Owner explicitly declined a Git-history rewrite** — neither finding was a credential, no
third-party customer data was found, and rewriting would change the established
`master`/`production`/`v1.0.0-rc1` hashes and require force-pushing public branches, a
disproportionate remediation for the finding. **Historical commits touching either affected file
still contain the original addresses** — a complete historical purge remains available only
through a separately approved history-rewrite Plan if the owner later decides it is necessary.
Security audit verdict remains **PASS**.

Ran the focused unit test for the modified test file (3/3 pass), repo lint (clean), and
`git diff --check` (clean) before committing.

Substantially expanded `docs/standards/DEPLOYMENT.md`'s Firebase product-enablement instructions
with evidence-based location recommendations: Firestore `nam5` and Storage `us-central1`, both
sourced directly from this repository's own `docs/workflow/setup/firestore-setup.md` and
`firebase-storage-setup.md` (the same recommendations already used for `fresh-prints-dev`), cross-
checked against the confirmed `us-central1` Functions region
(`functions/src/lib/portalOgUrls.ts:39`). Confirmed the App Hosting backend ID
(`fresh-prints-portal`) and root directory (`./apps/portal`) directly from `firebase.json`.
Flagged `[NEEDS REPO CHECK]` on two points that could not be proven from repository source: whether
creating an App Hosting backend triggers an automatic first rollout (external product behavior,
must be confirmed against actual Console behavior before that step), and the exact production env
file naming convention (no `.env.production.local` file exists yet — a proposed, not established,
convention; both proposed names are confirmed covered by the root `.gitignore`'s `.env.*.local`
pattern regardless).

**No repository visibility change was made. No Git history was rewritten. No force-push occurred.
No Firebase product was enabled, no secret was set, no production configuration of any kind
occurred, no `rebuildCatalogSnapshots` invocation occurred. `master` and `production` remain
untouched.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firebase
product-enablement checkpoint per explicit instruction; awaiting the owner to complete the
documented Firebase Console steps and report back.

## 2026-07-30 — Goal #13 "production-release" — Repository made PUBLIC; production ruleset CONFIRMED ACTIVE; full security audit PASS; stopped at production-security checkpoint

Re-verified branch/tag state directly from Git (unchanged): current branch `development`, clean
tree, `origin/master`/`origin/production` both at `aa570aa875d20ba85fd405480a47e6eda59f85b0`,
`origin/development` at `07d134a9124733e1698f31a5aec92fe51770dd54`, `v1.0.0-rc1` unchanged.
**`master` and `production` were not touched.**

The repository was changed from private to public by the owner. Independently confirmed via the
live, unauthenticated GitHub API (not just the owner's report) that visibility is genuinely
`"public"`, and that the `production` ruleset is genuinely `"enforcement": "active"` with
restrict-deletions, block-force-pushes, and require-PR-before-merge (0 required approvals) rules
all present. **The prior "not enforced — private repo plan limitation" report is now superseded
and resolved.**

Performed the full public-repository security audit (previously missing): scanned the current
working tree and all 131 commits reachable across all 17 refs (branches, tags, remotes) for
credentials, private keys, service-account files, PEM keys, common API-token prefixes, and personal/
customer data. **Result: PASS.** No probable real credential, private key, service-account file, or
third-party customer/financial/legal/personnel data was found anywhere. One non-blocking finding: a
real personal email address (the repository owner's own, from an internal dev-debugging note) in
`docs/workflow/reviews/2026-07-17-portal-notifications-alert-missing-investigation.md`, present
across every historical commit touching that file — `[NEEDS OWNER DECISION]` on redaction, not a
release blocker.

Reviewed public non-secret content (architecture docs, workflow artifacts, deployment instructions,
project IDs, the Functions allowlist) — all classified acceptable for a public repository; no
private business/customer/financial/legal/personnel data found in this category either.

Re-documented the local pre-push hook (`.githooks/pre-push`) as optional defense-in-depth now that
the GitHub ruleset provides confirmed server-side protection — left inert, unaltered.

**No repository visibility change was made this pass** (already public, per owner action). No Git
history was rewritten. No force-push occurred. No Firebase product was enabled, no secret was set,
no production configuration of any kind occurred. `master` and `production` remain untouched.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the production-security
checkpoint per explicit instruction; awaiting the owner's decision on the personal-email finding,
then completion of the documented Firebase product-enablement steps.

## 2026-07-30 — Goal #13 "production-release" — GitHub ruleset limitation recorded; local pre-push safeguard added; stopped at Firebase product-enablement checkpoint

Re-verified all branch/tag facts directly from Git before relying on them (not assumed from a
prior turn): current branch `development`, working tree clean, `origin/master` =
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `origin/production` =
`aa570aa875d20ba85fd405480a47e6eda59f85b0`, `origin/development` =
`e2d6cde99c72a8d0c3966861b1e1460d520bc9cb` (the prior documentation commit), `v1.0.0-rc1` still
points to `aa570aa875d20ba85fd405480a47e6eda59f85b0`. **`master` and `production` were not touched
this pass.**

**GitHub `production` ruleset:** created by the owner, targets `production`, but GitHub's own
message confirms it is **not enforced** on this private repository until the organization upgrades
to a GitHub Team (or equivalent) plan — the owner is not upgrading this pass. `production` is
therefore **not currently protected at the GitHub server level.** Documented the intended ruleset
configuration (Active enforcement, restrict deletions, block force pushes, require PR before
merge, 0 required approvals, status checks/signed commits/linear history disabled, empty bypass
list) as future-ready documentation only.

Checked for existing Git-hook conventions first — none found (no `.githooks/`, no
`core.hooksPath`, no `pre-push` hook, no husky-style package). Added `.githooks/pre-push`, a
tested, executable POSIX shell script that blocks a direct local push to `refs/heads/production`
with a clear message pointing to the PR-based promotion workflow, permits an explicit
`ALLOW_DIRECT_PRODUCTION_PUSH=1` emergency override, and leaves `development` and every other
branch untouched — verified all four behaviors directly. **The hook is present but inert**;
activating it requires running `git config core.hooksPath .githooks`, which is its own separate
owner-approval step, deliberately not performed this pass.

Substantially expanded `docs/standards/DEPLOYMENT.md`'s Branch Model section: ruleset
status/intended-settings table, safeguard documentation, refined
development/production-release/hotfix workflows (PR-based promotion only, fast-forward-only pull
on `production`, explicit `--project` flags on every Firebase command), a new "Firebase branch and
project separation" table, the restated Functions allowlist/exclusion list, the restated 8-condition
`master` deletion policy, and a new beginner-friendly "Next checkpoint — Firebase product
enablement" subsection covering Firestore (Native mode + location choices flagged **permanent**),
Storage, Authentication, Email/Password + Google sign-in, Web App registration (config recorded to
a local gitignored file, never committed), the Web Push certificate, and preparing — not
completing — the App Hosting backend.

**No Firebase Console action was performed on the owner's behalf.** No Rules, Storage Rules,
indexes, Functions, App Hosting rollout, or Portal deploy occurred. No secret, DNS, production
user, or production data was configured/created/seeded. No production Studio installer was built.
No GA4 or Search Console configuration occurred. `production` was not modified. `master` was not
deleted. **No force-push occurred.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the Firebase
product-enablement checkpoint per explicit instruction; awaiting the owner to complete the
documented Firebase Console steps and report back.

## 2026-07-30 — Goal #13 "production-release" — Permanent `production`/`development` branches created and pushed; v1.0.0-rc1 tagged; stopped at GitHub-settings checkpoint

Owner committed and pushed the full consolidated, approved release candidate directly to
`master`/`origin/master`: commit `b45542ab66a9f6fafb1142201b29fc6d7a969376`. Verified before any
action: `git rev-parse HEAD` matched `git rev-parse origin/master` exactly, working tree clean,
commit message matched verbatim, remote confirmed `origin`.

Checked `.firebaserc` as actually committed in `b45542ab` (`git show b45542ab:.firebaserc`) —
confirmed the `production` alias was missing. Added exactly `"production": "fresh-prints-prod"`
(preserving `"default": "fresh-prints-dev"` unchanged), validated as JSON, committed narrowly as
`aa570aa` ("chore: add production Firebase project alias"), pushed to `origin/master` (clean
fast-forward, no force).

**Branch-point commit: `aa570aa875d20ba85fd405480a47e6eda59f85b0`.** Created and pushed
`production` from that exact commit (`git switch -c production` + `git push -u origin production`).
Created and pushed `development` from the identical commit
(`git switch -c development` + `git push -u origin development`); left the repository checked out
on `development`. Verified via `git fetch origin` that `origin/master`, `origin/production`, and
`origin/development` all resolve to the same hash; confirmed tracking and a clean working tree.

Confirmed `v1.0.0-rc1` did not already exist locally or remotely, then created an annotated tag on
the exact branch-point commit and pushed it to `origin`. **This is the release-candidate tag only —
the final `v1.0.0` tag is deferred until after production deployment and smoke testing pass.**

Updated `docs/standards/DEPLOYMENT.md` with a new permanent Branch Model section (development
workflow, production-release workflow, hotfix workflow), explicitly marking the previous
direct-to-`master` policy as superseded. This entry, `.cursor/workflow/state.md`,
`docs/project/ROADMAP.md`, and the recent-completed-work handoff were all updated to record this
transition — committed to **`development` only**, not merged into `production` this pass.

**`master` was NOT deleted** — retained as the required temporary transition fallback; its deletion
remains a separate, later, explicitly-approved checkpoint. No Firebase product was enabled, no
secret was set, no Rules/indexes/Functions/App-Hosting/DNS/Auth/GA4/Search-Console configuration
occurred, the active Firebase CLI project was never switched, and no production Studio installer
was built. **No force-push occurred at any point.**

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the GitHub default-branch +
`production` branch-protection checkpoint per explicit instruction; awaiting the owner to perform
those GitHub UI steps and confirm back.

## 2026-07-30 — Goal #13 "production-release" — Production project CONFIRMED; Functions allowlist FINALIZED; working tree RECONCILED; stopped at release-source checkpoint

Owner confirmed the production Firebase project: **`fresh-prints-prod`**, created, Blaze billing
active, zero configuration performed. Verified `functions/src/lib/email/portalUrlResolver.ts`
already maps that exact project id to `https://myprintrequest.com` — no code change needed.

Owner finalized the 5 previously-flagged Functions: excluded `testAiEnrichmentPlayground`,
`testAiEnrichmentTagRerank`, `ownerDeleteUser` (quarantined/destructive, product path is
`tombstoneCustomerAccount`), `backfillPrintRequestQueueTab` (cold-start project, nothing to
backfill); included `rebuildCatalogSnapshots` after verifying from source it is owner/admin-gated,
non-destructive, project-agnostic, and the documented catalog-snapshot publication mechanism
(ADR-FP-120). **Final allowlist: 105 total exports, 99 include, 6 exclude** — exact future deploy
command prepared, not executed.

Reconciled the working tree: classified all 541 remaining changed entries. The large majority trace
cleanly to specific, already-signed-off or owner-approved goals (Wave C generated catalog read
models, Portal print-request prelaunch stability, GA4 analytics, the Firebase Debug window feature,
several customer-upload/Assisted-Creation goals, Goal #14, the `test:rules` harness). Removed
exactly one proven-debris scratch script (`functions/test-admin-auth.mjs` — unreferenced, hardcoded
to `fresh-prints-dev`, a leftover from this goal's own earlier troubleshooting). Found one unrelated,
uncertain-provenance deletion (`apps/studio/.../print-requests/hooks/useCustomers.ts`) and
deliberately left it untouched, flagged for a separate owner decision. Confirmed zero secret-bearing
or build-output files appear anywhere in the changed set.

Proposed release-source strategy: reconcile directly on `master`, committed in ~11 goal-sized commit
boundaries — no new branch, since this repo has no release-branch precedent and the owner already
decided against introducing a new branch policy for this goal. Prepared (not applied) an additive
`.firebaserc` alias (`"production": "fresh-prints-prod"`, alongside the untouched dev default).

Verification (read-only/local only, after the one file removal): Functions build, Portal/Studio
typecheck, Portal build, Studio build, repo lint, `git diff --check` — all exit 0. No `firebase
deploy` command of any kind was run.

Artifacts:
`docs/workflow/reviews/2026-07-30-production-release-working-tree-reconciliation-report.md`,
`docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`,
`docs/workflow/reviews/2026-07-30-production-release-source-and-allowlist-checkpoint.md`, and an
updated `docs/workflow/reviews/2026-07-30-production-release-implementation-readiness-checkpoint.md`.

**No production resource was created, configured, modified, or deployed. No secret set. No branch
created. No commit made.** Production remains the empty, Blaze-billed, unconfigured
`fresh-prints-prod` project the owner reported.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the release-source
commit-boundary + `.firebaserc` alias checkpoint per explicit instruction; awaiting owner decisions.

## 2026-07-30 — Goal #14 "customer-upload-early-transparency-format-validation" — Done (approved)

Narrow, separately-scoped follow-up (owner explicitly confirmed it should proceed alongside the
paused Goal #13, without touching #13's state). Fixed the exact mechanism behind an owner-observed
symptom: invalid customer artwork (corrupt, unsupported format, or not meaningfully transparent) could
briefly show the Portal's "Trimming transparent edges…" label before being rejected. Root cause: in
`processCustomerUploadImageBytes` (`functions/src/lib/customerUploadProcessing.ts`), the
validation-time transparency trim *probe* entered the `trimming` progress stage before its pass/fail
verdict was known. Fix: removed that premature stage transition — the probe now stays attributed to
the existing `checking_transparency` stage, since it is validation work, not production trimming.
Production trimming (for images that pass validation) is unchanged and still shows the `trimming`
stage as before.

Applies uniformly to Customer Upload, Donate Design, retry, and ZIP-contained images — all four
callers share this one function; confirmed via source inspection that none have caller-specific
branching, so no caller-side code changes were needed. Accepted-format policy (PNG + static WebP) and
transparency thresholds were confirmed unchanged and out of scope; format/decode detection was already
decode-driven (not filename/MIME-driven) and is unchanged.

23/23 automated tests pass (4 new regression tests + 2 extended existing tests, all asserting via an
`onStage` spy that the `trimming` stage is never observed for a rejected upload), Functions build
clean, repo lint clean, `git diff --check` clean. Portal typecheck/build omitted — no Portal or shared
UI files were touched.

Owner deployed this change to `fresh-prints-dev` and ran manual QA directly, confirming **PASS**
across all 5 goal-brief scenarios (opaque image, unsupported format, falsely renamed file, transparent
PNG, transparent WebP).

Artifacts: `docs/workflow/plans/2026-07-30-customer-upload-early-transparency-format-validation-plan.md`,
sibling `-review.md` (`approved_with_changes`), `-test-report.md`, and `-signoff.md` (`approved`) of
the same date/slug.

This goal did not modify, advance, or otherwise touch Goal #13 (`production-release`), which remains
the **active managed goal**, still stopped at its own production Firebase project creation checkpoint
— see the entry immediately below.

## 2026-07-30 — Goal #13 "production-release" — Implementation-readiness checkpoint complete; STOPPED at production Firebase project creation

Owner recorded 18 production decisions (separate prod project; exclude `wipeOperationalTestData` +
`inventoryCatalogImageStorage`; canonical URL `https://myprintrequest.com`; continue direct-to-
master manual deploys, no CI/CD; soft launch; GA4 stays off until property+Enhanced-Measurement-
disabled+privacy-policy+separate checkpoint; Firebase Console/Functions-logs/Resend-Brevo for
initial monitoring; Sentry-class tooling post-launch; explicit Functions allowlists only, never
bare `--only functions`). Every repo-check from the approved Plan was resolved this pass:
re-enumerated the full current `functions/src/index.ts` export list (89 recommended for inclusion,
2 explicitly excluded, 5 flagged for owner classification — `testAiEnrichmentPlayground`,
`testAiEnrichmentTagRerank`, `ownerDeleteUser`, `backfillPrintRequestQueueTab`,
`rebuildCatalogSnapshots`); read the complete 61-index `firestore.indexes.json` (no duplicates, no
dev-only indexes, all trace to real product code — deploy unmodified); found the exact production-
URL-resolver file (`functions/src/lib/email/portalUrlResolver.ts`) and flagged that it **already
hardcodes a `"fresh-prints-prod"` project-id assumption** that must be corrected if the owner
chooses a different id; traced Studio's Firebase config as build-time-only via Vite env files
(requires a separate build invocation with swapped `.env` values for a production installer); found
zero monitoring/error-tracking dependencies anywhere in the repo; audited the live working tree
(542 changed entries, not committed — flagged as needing a reconciliation pass before use as a
production build source, unrelated to this goal); classified cold-start Firestore settings
requirements; prepared the secrets/external-provider checklist without exposing any value.

Wrote beginner-friendly Firebase Console instructions for creating the production project and the
exact 4-item information the owner must return (project ID, creation confirmation, billing/Blaze
status, confirmation no deployment has occurred).

Artifact: `docs/workflow/reviews/2026-07-30-production-release-implementation-readiness-checkpoint.md`.

**No production resource was created, configured, modified, or deployed.** Verification (read-only/
local only) — Functions build, Portal typecheck, Portal build, Studio build, repo lint, and
`git diff --check` all run; no `firebase deploy` command of any kind was executed.

**Active managed goal:** `production-release` (Goal #13) — STOPPED at the production Firebase
project creation checkpoint per explicit instruction; awaiting the owner's project ID and
confirmations.

## 2026-07-30 — Goal #13 "production-release" — Plan + independent Formal Review complete (approved_with_notes)

`docs/workflow/plans/2026-07-30-production-release-plan.md` (19 sections covering launch-readiness
inventory, exact ship/exclude scope, Functions/Rules/Indexes/App-Hosting deployment scopes,
env-var/Secret Manager inventory, domains, GA4 go-live sequencing, SEO readiness, branch strategy,
migration determination — **cold start, no production Firebase project exists yet** — build/lint
gate, 10-item smoke-test checklist, rollback strategy, 10-checkpoint human-approval sequence, and
post-launch monitoring) and `docs/workflow/reviews/2026-07-30-production-release-review.md`
(independent verification pass, verdict **approved_with_notes**, no fabricated paths/APIs/mechanisms
found) are both complete. 12 `[NEEDS OWNER INPUT]` items remain for the owner to decide before
Implementation may begin — most notably whether `wipeOperationalTestData` ships to production
(Plan recommends: no), branch/release strategy (Plan recommends: continue current direct-to-master
manual-deploy pattern), and the still-outstanding GA4 Privacy Policy determination.
**No implementation, deployment, migration, secret, or production action occurred.** Production
Firebase project does not exist yet.

**Active managed goal:** `production-release` (Goal #13) — STOPPED after Plan + Formal Review per
explicit instruction; awaiting owner review.

## 2026-07-30 — Goal #13 "production-release" — Plan phase started; Goal #12 CLOSED by owner after real inventory

Goal #12 (`catalog-image-derivative-storage-consolidation`) is **closed —
closed_by_owner_after_inventory**. The owner ran the deployed, dry-run-only
`inventoryCatalogImageStorage` callable against real `fresh-prints-dev` data: 87 designs scanned;
originals **980,807,863 bytes (~97.66% of catalog Storage)**; thumbnails 2,820,654 bytes; previews
20,676,202 bytes; display derivatives 0; zero orphans, zero missing objects, zero promotion-cool-
off duplicates, zero purge-policy violations. Given originals dominate catalog Storage and must
remain unchanged for print quality, the owner decided the migration's small addressable Storage
win (existing thumbnails+previews combined use only ~22.4 MB, ~2.3% of total) did not justify the
required backfill, Portal/Studio consumer cutover, and accepted grid-bandwidth increase
(~86 KB vs ~23 KB per typical 8-card grid). **The migration was never implemented** — no
`displayPath` was ever populated, no consumer was migrated, no backfill ran, no thumbnail/preview
was deleted, no production original was modified. This is a successful evidence-based decision,
not a failed implementation. Interrupted mid-Implement scaffolding was inspected file-by-file and
removed narrowly; the read-only inventory tool (callable + classification logic + dev-only Studio
panel) is retained as diagnostic tooling only, deployed to `fresh-prints-dev`, explicitly excluded
from any production scope unless separately reviewed.

Signoff: `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-signoff.md`.

**Goal #12 no longer blocks `production-release`.** Goals #9–#12 are now all signed off/closed.
Started the `production-release` (Goal #13) Plan + Formal Review phase immediately after — see
`docs/workflow/plans/2026-07-30-production-release-plan.md` and
`docs/workflow/reviews/2026-07-30-production-release-review.md`. No production implementation or
deployment has started; multiple decisions remain flagged for explicit owner input.

**Active managed goal:** `production-release` (Goal #13) — Plan + Formal Review phase; awaiting
owner review of flagged decisions before any implementation.

## 2026-07-30 — Goal #12 "catalog-image-derivative-storage-consolidation" — owner approved round-2 decisions; inventory callable deployed, execution pending

Owner approved: 1024×1024 max bounding box, transparent WebP, Q82, downscale-only shared display
derivative; no separate tiny thumbnail (existing thumbnail/preview retained temporarily for
migration fallback/rollback only); `inventoryCatalogImageStorage` dev deployment. Owner explicitly
accepted the ~86 KB vs ~23 KB grid-bandwidth trade-off.

Deployed exactly `inventoryCatalogImageStorage` to `fresh-prints-dev` (Node.js 20 2nd Gen,
us-central1), "Successful create operation," exit 0, 2026-07-30T04:13:23Z UTC. No other resource
deployed; production untouched.

**Real inventory execution requires owner/admin Firebase Auth** (an `onCall` function gated by a
Firestore role check) — this environment has no staff credentials to invoke it directly. Provided
the owner an exact DevTools-console snippet to run it from a signed-in Studio session.

Nothing migrated, backfilled, or written to any design record; no display derivative generated
anywhere; no preview/thumbnail/original touched.

**Active managed goal:** Goal #12 — paused pending the owner running the deployed inventory
callable and sharing results.

## 2026-07-30 — Goal #12 "catalog-image-derivative-storage-consolidation" — Human Checkpoint 1, round 2, awaiting owner approval

Owner rejected round 1's 640×640 @ Q82 recommendation, correctly identifying it would be
**upscaled by the browser** at the confirmed ~1152×896 shared lightbox (no DPR handling exists
anywhere in either app). Round 2: expanded to 640/800/1024/1280 px @ Q82 + 1024 @ Q88, computed the
exact browser upscale factor per candidate from the app's real CSS
(640→1.40×, 800→1.12×, 1024/1280→no upscale), built a self-contained local HTML contact sheet, and
revised the recommendation to **1024×1024 @ Q82** — the smallest candidate avoiding lightbox
upscale, while 1280 was found to save almost nothing (−6.8%) over today's live preview.

Independent security review of the `inventoryCatalogImageStorage` callable found and fixed a real
defect (an unprecedented `!=` Firestore query with a known silent-exclusion gotcha, corrected to
match `purgePromotedDonationFullSize.ts`'s established pattern) and added missing generated-JSON-
asset totals to its report shape. Confirmed owner/admin-restricted, read-only, no delete/update/
migration capability, no PII/URL/artwork exposure. A dev-only deployment checkpoint for that one
callable is prepared but not deployed.

82 tests passing, all builds/lint exit 0. Nothing migrated, backfilled, deployed, or deleted;
production untouched.

Artifacts:
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-owner-sample-checkpoint-round-2.md`,
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-inventory-functions-deployment-checkpoint.md`.

**Active managed goal:** Goal #12 — paused at Human Checkpoint 1 (round 2), awaiting owner
approval of final dimensions/quality and the inventory-callable deployment.

## 2026-07-30 — Goal #12 "catalog-image-derivative-storage-consolidation" — Implement Human Checkpoint 1 complete, awaiting owner sample review

Built (no migration/backfill/deployment): a dry-run-only `inventoryCatalogImageStorage` callable
with a pure, 14-test classification function; 7 synthetic sample designs run through the real
production WebP-encode pipeline at 3 candidate sizes (512/640/800px @ Q82); additive `displayPath`
type preparation across Studio/Portal/generated-manifest (no design record populated). Real
Portal/Studio rendering-size measurement confirms no surface needs more than ~1152×896 px and no
DPR/retina handling exists anywhere. Recommendation: 640×640 @ Q82, no separate tiny thumbnail —
pending owner visual sample review. **This environment has no Google Application Default
Credentials**, so real `fresh-prints-dev` Storage/Firestore inventory totals could not be pulled;
disclosed explicitly, not worked around. 80 new + 32 regression tests passing; all builds/lint
exit 0. Nothing migrated, backfilled, deployed, or deleted; production untouched.

Checkpoint artifact:
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-owner-sample-checkpoint.md`.

**Active managed goal:** Goal #12 — paused at Human Checkpoint 1, awaiting owner sample-review
approval before consumer migration, backfill, or deployment.

## 2026-07-30 — Goal #12 "catalog-image-derivative-storage-consolidation" — Plan + Formal Review complete

Started per owner instruction (Plan and Formal Review only; no implementation). Investigation
(direct source reading + a background research-agent audit) confirmed exact Storage architecture:
every catalog design normally has three permanent objects — `/originals/{id}.png` (staff-only,
production, never touched by any derivative work), `/thumbnails/{id}.webp` (320×320 @ Q80),
`/previews/{id}.webp` (1280×1280 @ Q85). Both derivatives are generated by the **identical**
shared-constants-driven sharp pipeline whether produced by Studio Electron import or by Cloud
Functions donation-promotion processing — no divergence to reconcile. Confirmed with exact
file/line citations that **every consumer without exception** already follows a
`thumbnailPath`-for-grids / `previewPath ?? thumbnailPath`-for-detail fallback pattern — the key
fact making an additive, fallback-safe migration low-risk, since a missing new field degrades
exactly like a missing `previewPath` already does today. Confirmed Show Queue export and gang-sheet
generation use `design.originalPath` exclusively (`useExportShowZip.ts:160`,
`useExportGangSheetPng.ts:139`), never a derivative. Confirmed customer-upload promotion **copies**
bytes into new catalog-canonical paths (not a live link), creating an already-policy-sanctioned
temporary duplication window during the existing 14-day cool-off purge (ADR-FP-086 §4). Confirmed
`purgeArchivedDesignAssets` deletes `originals`+`previews`, keeps `thumbnails` only (ADR-FP-084) —
a retention policy this Plan does not modify, with its future interaction with a new derivative
field explicitly flagged rather than silently assumed. Correctly distinguished ADR-FP-120 (the
generated catalog/Portal-catalog snapshot architecture — preserved, unaffected) from ADR-FP-121
(the abandoned print-request read-model — unrelated, not reintroduced).

Recommended architecture: one new, additive `/display/{designId}.webp` derivative (starting
dimension/quality hypothesis 640×640 @ Q82, explicitly flagged as a Human Checkpoint pending real
UI-measurement and visual sample review — not a final decision) to potentially replace both
`thumbnails` and `previews`. No separate tiny thumbnail by default, per the owner's own
instruction not to preserve one merely because it exists — pending Implement's own measured
evidence otherwise. A dry-run-only Storage inventory callable is designed (classifies every object
as referenced / orphaned candidate / purged-per-policy / promotion-cool-off duplicate); no deletion
capability is proposed at all in this phase. Staged, non-destructive migration: additive Firestore
field, dual-read fallback chains extended one level, bounded-concurrency backfill (reusing Goal
#9's `boundedConcurrencyQueue.ts` precedent), old objects never touched, deletion deferred to a
separate future goal requiring its own owner checkpoint.

Formal Review returned **approved_with_changes** — four binding required changes, all
incorporated directly into the Plan: (1) explicit "Interaction with Archive-Purge" section naming
that `displayPath` will be silently orphaned by `purgeArchivedDesignAssets` until a future goal
reconciles the two; (2) explicit commitment to extract the Storage inventory classification logic
as a pure, directly-testable function (mirroring this codebase's own repeatedly-proven extraction
pattern) rather than requiring a live emulator; (3) explicit statement that the Cache-Control gap
between new and not-yet-migrated derivative objects is an accepted transitional inconsistency, not
an oversight; (4) explicit per-question sequencing classification for all three Open Questions,
mirroring Goal #11's own binding-condition precedent. Review's independent re-verification found
every spot-checked citation accurate.

No implementation, migration, backfill, deletion, or deployment occurred.

Plan: `docs/workflow/plans/2026-07-30-catalog-image-derivative-storage-consolidation-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-review.md`
— **approved_with_changes**.

**Active managed goal:** Goal #12 — Plan + Formal Review complete; Implement next (awaiting owner
instruction to begin).
**Last closed:** `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup`
(Goal #11) — approved_with_notes, 2026-07-30.
**Not started:** Goal #13 (`production-release`, blocked until #9–#12 all sign off — #9, #10, #11
now closed; #12 active).

## 2026-07-30 — Goal #11 "customer-upload-oversized-pixel-normalization-and-processing-timeout-followup" — SIGNED OFF (approved_with_notes)

Owner QA returned **PASS WITH NOTES**: all functional behavior correct (oversized-canvas uploads
that previously failed with "Image dimensions exceed the allowed limits." now process
successfully; transparency/aspect ratio preserved; no crop/stretch/distort; DPI and print
dimensions truthful; Donate Design parity confirmed; normal uploads unaffected; 80 MB copy
displayed correctly); oversized-canvas uploads take proportionally longer at the trim stage than
smaller files (expected, given their much larger pixel counts and transparency workload) but
always complete — no stuck/timeout case was observed, confirming the watchdog fix's actual purpose
(bounded, always-completing processing) is working.

Deployed to `fresh-prints-dev`: `finalizeCustomerUpload`, `retryCustomerUploadProcessing` only
(Node.js 20 2nd Gen, us-central1), both "Successful update operation," exit 0,
2026-07-30T02:31:47Z UTC. No Storage/Firestore Rules, indexes, App Hosting, other Functions,
migration, or Storage object changes occurred at any point. Production untouched throughout.

Signoff: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-signoff.md`
— **approved_with_notes**.

**Active managed goal:** none (idle). **Last closed:**
`customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (Goal #11) —
approved_with_notes, 2026-07-30.
**Not started:** Goal #12 (`catalog-image-derivative-storage-consolidation`), Goal #13
(`production-release`, blocked until #9–#12 all sign off — #9, #10, #11 now closed).

## 2026-07-30 — Goal #11 "customer-upload-oversized-pixel-normalization-and-processing-timeout-followup" — Implement + Test + Implementation Review complete

All three binding Formal Review conditions satisfied: (1) stage watchdog extracted as a pure,
directly-testable helper (`packages/shared/src/utils/customerUploadFinalizeWatchdog.ts`, mirroring
`withTimeout.ts`'s precedent, 5 tests); (2) `wasNormalizedForDimensions`/`wasUpscaled` documented
and tested as independent, non-mutually-exclusive booleans; (3) `06-data-model-essentials.md`
resolved (one concern-level row added, matching that doc's existing high-level convention).

Processing order changed: bounded decode → trim → normalize-if-still-oversized
(`functions/src/lib/customerUploadProcessing.ts`). **Implement caught and fixed its own design
flaw**: an initial `limitInputPixels` bound set to the app-level 100M-pixel ceiling was empirically
proven (via a failing test on a 104M-px fixture) to reject the decode itself for any
oversized-but-trimmable canvas — defeating the fix. Corrected to sharp's own decoder default
(`0x3FFF * 0x3FFF` ≈ 268.4M px). `trimTransparentEdges` reduced from three full-resolution decodes
to one. New downscale-only `normalizeForDimensionCeiling` (strictest-of-three-ceilings-wins),
structurally separate from the existing upscale pass. New additive fields
(`wasNormalizedForDimensions`, `preNormalizationWidthPx`, `preNormalizationHeightPx`). Watchdog
wired into `finalizeCustomerUpload.ts`/`retryCustomerUploadProcessing.ts` at 480s (60s headroom
under the 540s `onCall` ceiling), writing `technicalFailureCode: "processing_timed_out"` (new,
retryable) before the platform can silently terminate the invocation. Sanitized per-stage timing
instrumentation added. 80 MB vs 100 MB: no enforced value changed; four stale handoff docs
corrected. ADR-FP-125 recorded (`docs/project/DECISIONS.md`, narrow ADR-FP-080 amendment).

**Tests:** 28 new/updated tests, all passing (`customerUploadProcessing.test.ts` 20,
`customerUploadFinalizeWatchdog.test.ts` 5 new, `retryCustomerUploadProcessing.test.ts` 3 new).
Goal #9 ZIP regression + byte-limit-alignment tests re-run unmodified, 12/12 pass. Functions build,
Portal typecheck/build, repo-wide lint all exit 0.

Independent Implementation Review: **approved_with_changes** — one required documentation-precision
change (name a deliberate `previousFailureCode`-vs-`retryAttempt`-counter substitution explicitly),
applied immediately, no code/test change required.

`finalizeCustomerUploadZip.ts`, `boundedConcurrencyQueue.ts`,
`finalizeCustomerUploadZipAggregation.ts` (Goal #9) and all Assisted Creation files (Goal #10)
confirmed untouched. `storage.rules` not modified. **Nothing deployed. Nothing migrated. No
Storage objects touched. Production untouched.** Functions requiring a future dev deployment:
`finalizeCustomerUpload`, `retryCustomerUploadProcessing` — separate owner checkpoint, not
performed in this pass.

Test Report: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-test-report.md`.
Implementation Review: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-implementation-review.md`
— **approved_with_changes** (required change applied).

**Active managed goal:** Goal #11 — Implement + Test + Implementation Review complete; Signoff
next. Deployment requires a separate owner checkpoint, not authorized by this pass.
**Last closed:** `assisted-creation-reference-image-mb-limit-increase` (Goal #10) — approved,
2026-07-29.
**Not started:** Goal #12 (`catalog-image-derivative-storage-consolidation`), Goal #13
(`production-release`, blocked until #9–#12 all sign off).

## 2026-07-30 — Goal #11 "customer-upload-oversized-pixel-normalization-and-processing-timeout-followup" — Plan + Formal Review complete

Started per owner instruction (Plan and Formal Review only; no implementation). A research pass
traced the full customer-upload/Donate Design trusted-server pipeline
(`functions/src/lib/customerUploadProcessing.ts`) and confirmed every reported symptom's exact root
cause from current source:

1. **Pixel-dimension rejection** — the check at `customerUploadProcessing.ts:404-410` evaluates raw
   source metadata (`sourceWidthPx * sourceHeightPx > CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS =
   100,000,000`) **before** any trim attempt, so a large-canvas PNG with large transparent margins
   is rejected outright instead of being trimmed under the ceiling. Math confirms a 7–14 MB PNG can
   easily carry 100M+ pixels, fully explaining the owner's exact symptom.
2. **`"Trimming transparent edges…"` delay** — `trimTransparentEdges` performs two provably
   redundant full-resolution sharp decodes on top of the one genuinely necessary decode.
3. **Donate Design and Customer Uploads confirmed to share the exact same pipeline** — same
   callable, same processing function, same limits.
4. **80 MB vs. 100 MB** — confirmed pure documentation drift. The enforced byte limit (80 MB)
   already matches exactly across the shared constant, `storage.rules`, and Portal UI copy. "100 MB"
   appears only in four stale handoff files — likely a conflation with the 100,000,000-pixel total
   ceiling. No enforced value changes; only the docs need correction.

Recommended fix: bounded decode (`limitInputPixels`, confirmed already a working precedent in this
codebase) → trim → normalize only if still over the ceiling after trim. Original source always
preserved; normalized production derivative created only when technically required, reusing the
existing production Storage path. Recommended a narrow ADR-FP-080 amendment (drafted for Implement,
not recorded now). Goal #9's bounded-ZIP-concurrency work is confirmed untouched — inherits the fix
automatically since it calls the same shared processing function as an opaque per-image unit.

Formal Review returned **approved_with_changes** — three binding required changes for Implement: (1)
extract the stage watchdog as a pure, directly-testable function (this repository has no
live-callable integration-test harness); (2) treat `wasNormalizedForDimensions`/`wasUpscaled` as
independent, non-mutually-exclusive booleans; (3) resolve the data-model-doc update question
definitively during Implement's first step. Review independently confirmed `limitInputPixels` has a
real working precedent in this codebase and resolved all of the Plan's own open filename questions.

No implementation, deployment, or production action occurred.

Plan: `docs/workflow/plans/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-review.md`
— **approved_with_changes**.

**Active managed goal:** Goal #11 — Plan + Formal Review complete; Implement next.
**Last closed:** `assisted-creation-reference-image-mb-limit-increase` (Goal #10) — approved,
2026-07-29.
**Not started:** Goal #12 (`catalog-image-derivative-storage-consolidation`), Goal #13
(`production-release`, blocked until #9–#12 all sign off).

## 2026-07-29 — Goal #10 "Increase the MB limit for custom-request reference images" signed off approved

The 40 MB per-file limit (owner-selected), 8-file maximum (unchanged), and 320 MB combined
pre-upload ceiling are all live in `fresh-prints-dev`. The first owner QA pass returned **FAIL**: a
reference image between 15 MB and 40 MB was accepted by the Portal picker but rejected at Submit
with the stale message "Each reference image must be 15 MB or smaller." Root-cause investigation
confirmed this was a **Cloud Functions deployment gap, not a source-code defect** —
`submitAssistedCreationRequest`/`customerUpdateAssistedCreationRequest` had never been redeployed
after the source change (only Storage Rules had been deployed for this goal), so the live callables
were still running pre-Goal-#10 compiled code.

**Amendment 1** added targeted regression tests (9 new cases proving the exact 15–40 MB boundary and
that error messages never mention "15 MB") and confirmed, via a Formal Review binding condition, that
a scoped Functions redeploy would carry only this goal's change — no unrelated in-flight Functions
work. Owner approved; deployed exactly:
```
firebase use fresh-prints-dev
firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest
```
Both functions reported "Successful update operation," exit 0, 2026-07-30T00:23:55Z. No Storage
Rules, other Functions, Firestore Rules, indexes, or App Hosting were touched; no other project was
referenced.

The reduced 5-step owner re-QA (attach a 15–40 MB file, Submit/Save, confirm success, confirm the
reference appears, confirm an over-40 MB file is still rejected with 40 MB copy) returned **PASS**.

**Goal #10 signed off: approved.** Signoff:
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-signoff.md`.
Full history preserved — original Plan (amended in place), Formal Review, Test Report,
Implementation Review, ADR-FP-124, Storage Rules deployment checkpoint, Amendment 1, Amendment 1
Formal Review, Amendment 1 Implementation Review, scoped Functions deployment checkpoint, owner QA
checkpoint (FAIL then PASS), final Signoff.

No migration, Storage cleanup, or production action occurred at any point in this goal. Production
untouched throughout.

**Queue reconciliation (documentation-only, no implementation started):** per explicit owner
instruction, a new goal —
`customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` — was added to the
pre-production queue as **Goal #11** (next queued, not started, no Plan yet). This pushes
`catalog-image-derivative-storage-consolidation` to **Goal #12** and `production-release` to **Goal
#13** (blocked until #9–#12 all sign off). Scope summary for the future Plan: pixel-dimension
rejection investigation in Customer Uploads/Donate Design, proportional normalized production
derivatives preserving transparency/aspect ratio (no crop/stretch/distort), the 200-effective-DPI
save floor (ADR-FP-075) preserved, `Trimming transparent edges...` timeout investigation with
bounded timeout/idempotent retry, the 80 MB vs. 100 MB limit discrepancy, and the narrow ADR-FP-080
technical-safety downscaling exception (investigate, do not change the ADR in this documentation
pass).

**Active managed goal:** none (idle).
**Last closed:** `assisted-creation-reference-image-mb-limit-increase` (Goal #10) — approved,
2026-07-29.
**Next queued:** Goal #11,
`customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (not started).
**Not started:** Goal #12 (`catalog-image-derivative-storage-consolidation`), Goal #13
(`production-release`, blocked until #9–#12 all sign off).

## 2026-07-29 — Goal #10 "Increase the MB limit for custom-request reference images" — dev Storage Rules deployed; awaiting owner QA before Signoff

A read-only deployment-scope audit investigated the ~22 unrelated lines present in the current
`storage.rules` diff (`generated/catalog-reference/ai|manifest.json|client`,
`generated/portal-catalog/{allPaths=**}`). Confirmed via repository evidence — the 2026-07-27 Wave C
Storage Rules deploy log (`.cursor/workflow/state.md`), the signed-off Wave C record, and the Wave C
dev-deployment checkpoint's live publication verification — that this content is already-deployed,
already-live `fresh-prints-dev` Storage Rules belonging to the completed and signed-off
`firestore-usage-efficiency-wave-c` generated-catalog architecture (ADR-FP-120), explicitly distinct
from the abandoned private print-request read-model paths (`generated/studio-print-requests`,
`generated/portal-print-requests`, confirmed absent from the current file). **Verdict A**: safe to
deploy the current file as-is.

Owner approved. Pre-deployment re-verification confirmed the file was unchanged since the audit,
active project was `fresh-prints-dev`, the Rules-to-constant alignment test passed 5/5, and all
Assisted Creation ownership/path rules plus the unrelated 25 MB proof rule were unchanged. Deployed:

```
firebase use fresh-prints-dev   -> exit 0
firebase deploy --only storage  -> exit 0, "released rules storage.rules to firebase.storage"
```

Timestamp: 2026-07-29T22:22:31Z. Local `storage.rules` SHA-256 identical before and after deployment
(`e11cb3bf1cf316bd9ba77765f8a112b355ced2d7aef4e5a4b9ae4fb400c3c730`), confirming the deployed content
exactly matches what was reviewed. Only Storage Rules were deployed — no Functions, Firestore Rules,
indexes, App Hosting, CORS, or production resource; no project other than `fresh-prints-dev` was
referenced.

**Effective state in `fresh-prints-dev`:** Assisted Creation reference-image per-file limit is now
live at 40 MB (inclusive `<=`, matching the TS validators exactly), 8-file maximum unchanged,
generated-catalog rules unchanged (harmlessly republished), abandoned print-request rules remain
absent. The 320 MB combined ceiling remains application-layer-only (Portal client + trusted-server
parsers) — Storage Rules cannot enforce a cross-object sum.

No migration, Storage cleanup, Function deploy, Firestore Rules/indexes deploy, App Hosting deploy,
or production action occurred. Goal #11 and Goal #12 remain unstarted. Signoff has **not** occurred —
a focused owner QA checkpoint covering the deployed environment is required first.

Deployment checkpoint (full evidence):
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-dev-rules-deployment-checkpoint.md`.

**Active managed goal:** Goal #10 — dev Storage Rules deployed; **stopped for owner QA of the
deployed environment**, then Signoff.
**Last closed:** `customer-upload-oversized-image-normalization-and-processing-performance`
(Workstream A / Goal #9) — approved, 2026-07-29.
**Not started:** Goal #11 (`catalog-image-derivative-storage-consolidation`), Goal #12
(`production-release`, blocked until #9–#11 all sign off).

## 2026-07-29 — Goal #10 "Increase the MB limit for custom-request reference images" — Implement + Test complete, awaiting dev deployment approval

Owner selected **40 MB per file** (Option 3), left the **8-file count unchanged**, and specified a
**320 MB combined pre-upload ceiling** (= 8 × 40 MB exactly). Implemented per the approved
Plan/Review.

All four per-file enforcement layers updated to 40 MB: Portal client validation (new pure
`assistedCreationReferenceFilesValidation.ts`), submit-path and update-path trusted-server parsers
(shared `assertReferenceImageTotalWithinCeiling` helper), and `storage.rules`. While implementing,
found and fixed a genuine pre-existing boundary bug: `storage.rules` used exclusive `<` (rejecting a
file exactly at the old limit) while the TS validators used inclusive semantics — corrected to `<=`
so "exactly at the limit is accepted" holds at every layer, as required.

New 320 MB combined ceiling enforced client-side, before any upload begins, in both the submit and
update paths — verified by tracing the actual code path (not just a passing test) that zero uploads
occur on an over-ceiling selection, and that removed/replaced kept-reference bytes are correctly
excluded, never double-counted.

Both Formal Review binding requirements closed: (1) new `storageRulesAlignment.test.ts` test parses
the real `storage.rules` arithmetic and asserts numeric equality against the live constant — fails if
either drifts independently; (2) total-ceiling check is client-side-first, server-side as
defense-in-depth only.

Also consolidated a duplicated `withTimeout` helper (Portal + Studio) into a new shared
`packages/shared/src/utils/withTimeout.ts` — pure no-op refactor, done to make "preview fallback
remains timeout-bounded regardless of payload size" directly testable. 12-second bound unchanged.

No customer-upload, Goal #9, or catalog-derivative code touched. No new dependency. New ADR-FP-124
records the full decision.

Verification: repository lint, Functions build, Portal typecheck/build, Studio build, changed-file
lint, `git diff --check` all exit `0`; 44/44 focused tests pass. Independent Implementation Review:
**APPROVED**, no residual defects.

**Deployment checkpoint prepared, not executed** — `storage.rules` changed (one function, one line),
requires owner approval before deploying to `fresh-prints-dev`. The checkpoint also flags that the
current uncommitted `storage.rules` file carries ~22 unrelated lines from other in-flight goals
(`generated/catalog-reference`/`generated/portal-catalog` blocks) that would deploy alongside this
change since `firebase deploy --only storage` publishes the whole file — recommend the owner confirm
those are also intended for `fresh-prints-dev` before approving this deploy.

No deployment, migration, Storage cleanup, or production action occurred. Goals #11 and #12 remain
unstarted. Post-deployment owner QA is still required before Signoff.

Plan: `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md`.
Test report: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-test-report.md`.
Implementation Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-implementation-review.md`
— **APPROVED**.
Deployment checkpoint: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-dev-rules-deployment-checkpoint.md`
— awaiting owner approval.

**Active managed goal:** Goal #10 — Implement + Test complete; **stopped for owner approval of a
dev-only Storage Rules deployment**, then post-deployment QA, then Signoff.
**Last closed:** `customer-upload-oversized-image-normalization-and-processing-performance`
(Workstream A / Goal #9) — approved, 2026-07-29.
**Not started:** Goal #11 (`catalog-image-derivative-storage-consolidation`), Goal #12
(`production-release`, blocked until #9–#11 all sign off).

## 2026-07-29 — Goal #10 "Increase the MB limit for custom-request reference images" — Plan + Formal Review complete, awaiting owner decision

Started per owner instruction (Plan + Formal Review only; no implementation, no limit change, no
deployment). Re-verified every fact carried over from Goal #9's Workstream B section — all matched
current source exactly. Investigation went deeper than Goal #9's outline: found a fourth manual-sync
enforcement location for the 15 MB constant (client, submit-path parser, update-path parser, Storage
Rules), confirmed reference images have **no thumbnail/preview derivative** (every preview fetches
the full original), and located the exact prior "Studio ref-thumb hang hotfix" decision record
(`docs/project/DECISIONS.md:525-550`, 2026-07-21) proving the historical preview-hang bug was a
network/CORS timing issue independent of file size — with a **live 25 MB precedent**
(`ASSISTED_CREATION_MAX_PROOF_BYTES`, staff proof uploads) already running successfully through the
identical download architecture today.

No total-request byte ceiling exists at any layer currently (only an implicit 8×15MB=120MB worst
case). Cloud Function memory/timeout is confirmed irrelevant — reference-image bytes never transit a
callable body.

Presented three evidence-graded options, no value selected: **Option 1 (20 MB, conservative)**,
**Option 2 (25 MB, recommended — reuses the already-live proof-upload ceiling through the identical
architecture)**, **Option 3 (40 MB, highest reasonably safe — explicitly flagged as projected, not
observed)**. Each paired with a recommended total-request ceiling.

Formal Review: **approved_with_changes** — two binding required changes for a future Implement phase:
(1) the Storage-Rules-literal-matches-shared-constant check must be a mandatory automated test, since
this manual-sync risk has now surfaced unresolved across two consecutive goals; (2) any total-request
ceiling must be a client-side pre-upload check, not server-only (to avoid worsening the existing
"no cleanup for orphaned pending uploads" gap).

No implementation, deployment, limit change, or production action occurred.

Plan: `docs/workflow/plans/2026-07-29-assisted-creation-reference-image-mb-limit-increase-plan.md`.
Formal Review: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md`
— **approved_with_changes**.

**Active managed goal:** Goal #10 — **stopped for an explicit owner MB-limit decision** (Option 1 =
20 MB, Option 2 = 25 MB recommended, Option 3 = 40 MB, or an alternative value with rationale) before
Implement can begin.
**Last closed:** `customer-upload-oversized-image-normalization-and-processing-performance`
(Workstream A / Goal #9) — approved, 2026-07-29.
**Not started:** Goal #11 (`catalog-image-derivative-storage-consolidation`), Goal #12
(`production-release`, blocked until #9–#11 all sign off).

## 2026-07-29 — `customer-upload-oversized-image-normalization-and-processing-performance` signed off approved (Workstream A)

Owner started goal #9 with an explicit queue update: two previously-unscoped items (a custom-request
reference-image MB-limit increase; `catalog-image-derivative-storage-consolidation`) are now Goal
Order #10 and #11, sequenced before `production-release` (#12, blocked until all three image-related
goals sign off). Plan + Formal Review (`approved_with_changes`) completed a research pass tracing all
three workstreams; this session implemented **Workstream A only**.

Root cause: `functions/src/finalizeCustomerUploadZip.ts` processed every image in a ZIP
**sequentially** (up to 100 images, each up to 100 megapixels, inside one 540s/2GiB `onCall`).
Replaced with bounded concurrency of 3 (`CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY`),
aggregating batch counters deterministically after every task settles rather than mutating shared
state from concurrent callbacks.

All three Formal Review binding requirements satisfied: (1) new pure
`aggregateZipProcessingResults` function computes `readyCount`/`failedCount`/`fileResults` only after
settlement; (2) evaluated the existing Studio `DerivativeConcurrencyQueue` pattern first — confirmed
it cannot be imported directly into Functions (`functions/tsconfig.json` excludes
`apps/studio/electron`), so its semaphore mechanism was relocated (not forked) to a new
`packages/shared/src/utils/boundedConcurrencyQueue.ts`, shared by both apps; (3) new ADR-FP-123 shows
full worst-case memory arithmetic (100M-pixel decode ≈381.5 MiB, 2GiB function memory, 461.5 MiB
per-image peak, concurrency-3 budget with a documented 25.1% safety margin, concurrency-4 correctly
rejected at ~0.1% margin), with proven constants, derived arithmetic, and runtime-validation-required
assumptions explicitly separated.

`processCustomerUploadImageBytes` (the actual image-processing logic) was not modified; its existing
8-test suite passes unmodified, proving no processing-logic drift. No accepted format, limit,
transparency rule, upscale policy, or the 200-DPI save floor changed. No Storage Rules, dependency,
schema, or Function memory/timeout configuration changed — no Human Checkpoint was triggered.

Functions build, repository lint, changed-file lint, and `git diff --check` all exit `0`; 31/31
focused tests pass. Independent Implementation Review against the real final diff: **APPROVED**, no
residual defects.

Test report:
`docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-test-report.md`.
Implementation Review:
`docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-implementation-review.md`
— **APPROVED**.
Signoff:
`docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-signoff.md`
— **approved**. `docs/project/ROADMAP.md` goal #9 marked Done (Workstream A).

**Active managed goal:** none (idle).
**Last closed:** `customer-upload-oversized-image-normalization-and-processing-performance`
(Workstream A) — approved, owner QA not required, 2026-07-29.
**Next queued:** Goal #10, "Increase the MB limit for custom-request reference images" (not started;
requires an owner MB-limit decision — no target value recorded anywhere in the repository yet).
Goal #11 (`catalog-image-derivative-storage-consolidation`) and Goal #12 (`production-release`,
blocked until #9–#11 all sign off) remain queued after that.
**Explicitly confirmed:** no deployment, migration, or Storage cleanup occurred; production was
untouched.

## 2026-07-29 — `preproduction-static-analysis-cleanup` signed off approved

Resumed after the prior Codex session's credits expired mid-Implement. Re-verified everything from
the actual source rather than trusting prior claims: `npm run build:studio` and `npm run lint` both
already reproduced clean (exit `0`/`0`) before any new edit, confirming Codex had already resolved
all 29 Studio/shared TypeScript diagnostics and all 41 lint findings (31 errors, 10 warnings) —
including the Formal Review's three binding conditions: a bounded Show Queue read spanning
Working/Queued/Printing tabs (`useShowQueuePrintRequests`), a shared lazy `sharp` loader
(`createRequire`-based, not a static import), and stable-ref/destructure fixes for all 10 React hook
dependency warnings.

This session found and closed two verification gaps: (1) added
`functions/src/lib/lazySharpDeployDiscovery.test.ts` to prove — against the **compiled** Functions
output, matching real deploy discovery — that `sharp` stays unloaded until `getSharp()` is first
called, with instance-reuse on subsequent calls; (2) corrected two stale assertion regexes in
`assistedCreationAnswerDisplay.test.ts` that still targeted a *removed* enum literal's semantics
after the fixture itself had already been updated to a current valid value.

Full verification matrix — Portal typecheck/build, Functions build, `git diff --check`,
changed-file lint, and 101/101 focused behavior tests — all exit `0`. An independent Implementation
Review against the real final diff returned **APPROVED**, confirming no blanket suppression, unsafe
cast, or scope drift; the only two `eslint-disable` additions found in the full diff belong to
unrelated in-flight goals and were correctly left untouched. No manual owner QA checkpoint is
required — every behavior-sensitive hook warning had deterministic automated coverage. No
deployment, Rules, schema, dependency, or production action occurred.

Signoff created 2026-07-29:
`docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-signoff.md` — **approved**.
Test report:
`docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-test-report.md`.
Implementation Review:
`docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-implementation-review.md`.
`docs/project/ROADMAP.md` goal #8 marked Done.

**Active managed goal:** none (idle).
**Last closed:** `preproduction-static-analysis-cleanup` — approved, owner QA not required,
2026-07-29.
**Next queued:** `customer-upload-oversized-image-normalization-and-processing-performance` (not
started). Wave C (`firestore-usage-efficiency-wave-c`) remains independently **Done**
(2026-07-27, PASS WITH NOTES, owner PASS) per `ROADMAP.md` — unaffected by this goal.
**Not yet in any queue record — needs explicit scoping before scheduling:** a custom-request
reference-image MB-limit increase, and `catalog-image-derivative-storage-consolidation`. Neither
appears in `ROADMAP.md`, `.cursor/workflow/state.md`'s Goal Order, or any Plan/Review as of this
date.

## 2026-07-29 — `studio-test-data-print-limit-wipe-audit` signed off approved

Owner QA returned **PASS**. Studio Test Data Reset now calls the retired Cap A collection
**Legacy print-limit counters** and states that it is no longer written or enforced. The stable
`printRequestDesignDailyLimits` target, exact standalone delete scope, Print Requests/Select
all/All (-) Designs inclusion, and owner/dev-only safety gates are unchanged. No wipe was submitted,
no deployment was required, and production was untouched.

Final signoff:
`docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-signoff.md`.

**Active managed goal:** none (idle).
**Last closed:** `studio-test-data-print-limit-wipe-audit` — approved, owner PASS 2026-07-29.
**Next queued:** `preproduction-static-analysis-cleanup` — confirmed, not started.

## 2026-07-29 — `portal-print-request-prelaunch-stability` signed off approved

Owner QA v18 returned **PASS**. Start, Pause, Resume, and Finish work; no
`request_write (permission-denied)` error or Retry warning/button appears; Portal remains Printed;
navigation preserves the completed state; and Studio locks and places the request as completed.

Final signoff:
`docs/workflow/reviews/2026-07-29-portal-print-request-prelaunch-stability-signoff.md`.
The Amendment 16 dev Rules deployment record is preserved with unavailable command/output/ruleset
metadata marked `[NEEDS OWNER CONFIRMATION]`; Codex did not redeploy. Production was untouched.

**Active managed goal:** none (idle).
**Last closed:** `portal-print-request-prelaunch-stability` — approved, owner PASS 2026-07-29.
**Next queued:** `studio-test-data-print-limit-wipe-audit` — confirmed, not started.

## 2026-07-29 — Owner completed Amendment 16 dev Rules deployment; QA v18 reopened

Owner reports the Firestore Rules deployment to `fresh-prints-dev` is already complete and directed
Codex not to deploy again. No deploy command was run by Codex. The read-only deployed/local Rules
comparison exited `2` because local Application Default Credentials are unavailable, so the active
ruleset ID and hash match remain `[NEEDS OWNER CONFIRMATION]`. Local Rules verification remains
48/48 passing. QA checkpoint v18 is now open.

Next: reduced owner QA v18 only. Do not redeploy, sign off, start queued goals, or touch production.

## 2026-07-29 — Amendment 16 Review 18 approved; dev Rules deployment approval required

Implementation Review 18 final verdict is `APPROVED_WITH_CHANGES`, with all requested test coverage
resolved and no blocking findings remaining. Rules pass 48/48; focused tests pass 61/61; affected
regression passes 143/143. Because the correction changes `firestore.rules`, owner QA v18 is blocked
until the owner replies `APPROVE DEV RULES DEPLOY`, authorizing only:

`firebase deploy --only firestore:rules --project fresh-prints-dev`

No deployment or production action has occurred. After the approved release is verified, fully
restart Studio and run QA checkpoint v18.

## 2026-07-29 — Amendment 16 implemented; Implementation Review 18 next

The emulator mechanically proved `queueTab` and `showQueueBiddingAcknowledgment` independently
caused the exact request-completion patch to fail the whole-document Rules allowlist. The narrow
correction validates both current optional fields, keeps them client-immutable, and routes only
`active|editing -> completed` through an exact completion predicate. A production-used builder
proves the client patch stays `status|updatedBy|updatedAt`; diagnostics now classify the current
fields without values. Rules pass 48/48, focused tests 61/61, and the full affected suite 143/143.
No deployment or production action occurred.

Next: independent Implementation Review 18. If approved, request only
`APPROVE DEV RULES DEPLOY`.

## 2026-07-29 — Amendment 16 Formal Review approved; emulator blocked on missing Java

Formal Review verdict is `APPROVED_WITH_CHANGES`. It identified two current persisted fields omitted
from the full-document Rules schema and diagnostics: `queueTab` and
`showQueueBiddingAcknowledgment`. The required four-way failing-before emulator fixture is written.
Execution stopped before Firestore started because no Java executable exists on PATH or in common
installed/bundled locations (`spawn java ENOENT`). Rules must not be edited until that fixture
mechanically proves the omission.

Next: install/provide a compatible JDK, rerun the failing-before matrix, then continue Amendment 16.
No Rules, deployment, production, migration, or queued-goal action occurred.

## 2026-07-29 — Owner QA v17 FAIL: confirmed request-write permission denial; Amendment 16 in Formal Review

Amendment 15 worked: Retry acquires, visibly runs, and reaches the exact reconciliation write.
Owner QA v17 now proves the remaining failure is `request_write (permission-denied)`. Plan Section
34 / Amendment 16 is limited to that three-field completion update and its Firestore Rules
contract. Current source shows the whole post-merge request is validated by an exact field
allowlist that omits current persisted `queueTab`, despite active queueTab backfill/maintenance
Functions and Studio query architecture. This remains a hypothesis until the approved
failing-before A/B emulator fixture mechanically reproduces it.

Next: independent Amendment 16 Formal Review. No Rules/application implementation or deployment
before approval; queued goals and production remain untouched.

## 2026-07-29 — Amendment 15 APPROVED; owner QA v17 required

The final owner-authorized retry-session correction is implemented and Implementation Review 17's
final verdict is `APPROVED`. React Strict Mode's development effect probe had permanently disposed
the ref-backed retry session, causing the exact live `sessionAcquired=false` result. The session is
now Strict-safe, uses explicit/token-authoritative phases, and exposes one shared Retry capability.
The hook delegates explicit Retry to a production-used controller that acquires synchronously,
invokes the exact-ID service once, rejects duplicates, discards stale settlements, and releases in
`finally`; active Retry remains visible as disabled `Retrying…`. Sanitized release transitions are
retained. Focused tests pass 36/36 and the full affected suite passes 140/140. No Function, Rules,
deployment, migration, or production action occurred.

Next: fully restart Studio and run
`docs/workflow/reviews/2026-07-29-portal-print-request-prelaunch-stability-qa-checkpoint-v17.md`.
Do not sign off or begin queued goals until the owner returns `PASS`, `PASS WITH NOTES`, or `FAIL`.

## 2026-07-29 — Amendment 15 Strict Mode Retry-session correction; review 17 next

Owner reopened one final narrow correction after QA v16 proved the Retry click reached the handler
but session acquisition failed. Root cause is React Strict Mode permanently disposing the ref-backed
session during its development effect probe. Amendment 15 adds Strict-safe activation, explicit
phases, atomic verified Retry availability, shared render/acquisition authority, finalizing UI, and
exact sanitized rejection reasons. 101/101 regressions pass; Portal passes; Studio/lint baselines
unchanged. No deployment or production action.

Next: independent Implementation Review 17, then minimal owner QA only if approved.

## 2026-07-29 — Amendment 14 final attempt APPROVED; owner QA v16 required

Owner QA v15 failed only the immediate false post-Finish Retry warning. Amendment 14 is the owner's
final authorized engineering attempt. It replaces Amendment 13's repeated default-source recheck
with one exact-candidate server-only request/item/allocation verification. Candidate scope is
retryable failures plus the exact production pending-timestamp mapper shape (`allocation_read`, only
`updatedAt` missing); committed genuine remediation remains non-retryable. Implementation Review 16
final verdict: `APPROVED`. 100/100 regression tests pass; changed-file lint is clean; known baselines
remain. No Function, Rules, deployment, or production action.

Next: fully restart Studio and run owner QA v16. Never create another amendment unless explicitly
requested; do not sign off or start queued goals before final `PASS`/`PASS WITH NOTES`/`FAIL`.

## 2026-07-29 — Amendment 13: false-positive post-Finish Retry warning fixed (serverTimestamp() read-your-own-write race); Implementation Review 15 APPROVED

Owner QA v14 (post-Amendment 12) returned `FAIL` on Test 1 only; Test 2 (historical capacity
messaging) and Test 3 (regression smoke) both `PASS`. Amendment 13 (Plan Section 31) resolves the
remaining item:

- **The immediate post-Finish "N request update(s) need retry" warning could be a false positive** —
  traced to a `serverTimestamp()` read-your-own-write race: `markShowPrintingFinished` commits a batch
  setting `updatedAt: serverTimestamp()` on finished allocations, then immediately re-reads those same
  allocations to decide whether affected print requests are now fully printed. A `serverTimestamp()`
  sentinel is not guaranteed resolved in the very next standalone read from the same client, so the
  read could transiently fail on a just-written allocation and exclude it from the printed-quantity
  sum for that one read - producing a false "needs retry" warning with no genuine Firebase error, for
  a request that was already fully printed. This is exactly why the warning correctly disappeared on
  navigation once enough time had passed (Amendment 12's reconstruction effect performs the same
  bounded check again, later, after the sentinel has settled). The separate "excluded invalid
  production record" console warning was confirmed to be the same race manifesting through the live
  allocations subscription's own read path, not an unrelated defect - it self-heals automatically and
  needed no separate fix.
- Fixed with a single bounded re-check limited to exactly the first pass's failed IDs (never
  remediation IDs, never an unbounded rescan), reusing the existing, already-proven
  `markPrintRequestCompletedIfFullyPrinted` function. A genuinely still-unresolved request fails the
  re-check identically and is reported exactly as before, with a working Retry button.

Independent Formal Review approved the fix's logic and safety and required its tests to be added
before signoff. Independent **Implementation Review 15** (did not defer to the Formal Review or the
implementer's narrative; independently re-verified the fix and new tests against current source and
executed the full verification matrix directly): **`APPROVED`, no notes**. 87/87 directly-relevant
tests pass; Portal typecheck/build exit 0; Studio build and repository lint match their unchanged
pre-existing baselines exactly; nothing from Amendment 12 regressed. The implementation remains
client-only. No Function/Rules change or deployment occurred.

## 2026-07-28 — Amendment 12: reconciliation Retry persistence fix, historical capacity-banner suppression; Implementation Review 14 APPROVED

Owner QA v13 (post-Amendment 11) returned `FAIL` on two items — one blocking, one display-only per
the owner's own annotation. Amendment 12 (Plan Section 30) resolves both:

1. **The Retry control still appeared inert, and its warning disappeared on navigation** — traced to
   two compounding root causes in `useShowProductionTimer.ts`: (a) a silent early-return producing
   zero observable effect when there was nothing retryable at click time, and (b) all retry/warning
   state being pure ephemeral React state, unconditionally blanked on every show-id change (including
   navigation away and back) with no reconstruction from Firestore. Fixed with a bounded, show-scoped
   reconstruction effect (this show's own allocations only, never an unbounded scan) routed through the
   existing retry-session authority for mutual exclusion with a live retry click, a new dev-only
   click-trace log firing on every activation attempt (including the no-op path), and a three-state
   Retry UI contract (retryable / remediation-only / none) wired directly into the rendered page.
2. **Historical/completed shows could still show the capacity-exhausted banner** — traced to Portal's
   allocatable-shows list being served from a 60-second session cache that could report a show as
   still allocatable for a window after it had genuinely become historical server-side. Fixed with a
   freshness gate that defers any capacity decision (the banner, the ability to submit) until the
   current modal-open's own reload has confirmed the cache at least once — a genuinely open,
   capacity-exhausted show is unaffected; its banner still renders, only slightly deferred.

Independent Formal Review found the first-draft historical-banner fix was a no-op against its own
identified root cause (it triggered on the wrong branch) and required a corrected design before
implementation, which was then approved. Independent **Implementation Review 14** (did not defer to
the Formal Review or the implementer's narrative; independently re-verified both workstreams against
current source and executed the full verification matrix directly): found the new three-state Retry
UI value was computed but not actually wired into the page's render (corrected before sign-off), then
**`APPROVED`**. 77/77 directly-relevant tests pass; Portal typecheck/build exit 0; Studio build and
repository lint match their unchanged pre-existing baselines exactly; nothing from Amendment 11
regressed. The implementation remains client-only. No Function/Rules change or deployment occurred.

## 2026-07-28 — Amendment 11: write-requirement audit, show-selection-loss fix, historical inspection/copy corrections; Implementation Review 13 APPROVED

Owner QA v12 (post-Amendment 10) returned `FAIL` on three items. Amendment 11 (Plan Section 29)
resolves all three:

1. **"Why is this write needed?"** — answered from an exhaustive repository-wide audit: the
   `printRequests.status = "completed"` write is genuinely load-bearing (Studio's add-to-show picker
   exclusion, the print-request detail edit-lock, the persisted `queueTab` field Studio's list
   actually queries by, and Function-level delete/archive/upload-purge eligibility). It is retained,
   not removed. The diagnostic run before this write now additionally checks the exact cross-field
   customer/guest-assignment invariant Firestore Rules enforce (read-only; no Rules or behavior
   change), so the next live retry attempt can prove or rule out that specific cause instead of
   requiring another diagnostic round.
2. **The Retry button appeared inert** — root cause found: not a click-handler defect. After Finish,
   if the just-finished show's scheduled time passed "now" during the post-Finish refresh, the page
   would silently reclassify it out of the active schedule tab and swap the owner's selection to a
   different show, wiping the just-set retry warning/button in the same instant, with no click
   involved. Fixed: the page now follows the just-acted-upon show to wherever it now belongs instead
   of abandoning the selection.
3. **Historical show inspection** — a date with exactly one already-finished show now shows its
   details immediately (no second click; multiple shows on one date are never guessed among). The
   customer-facing copy no longer says "read-only" anywhere and instead reads "This show has already
   been printed, so no new print requests can be added." with a supporting sentence. The misleading
   "N spots remaining" line is now suppressed for shows that can no longer accept requests, while the
   used-count line remains for reference; open shows are unaffected.

Independent Formal Review of the amendment (`approved_with_changes`, one clarification resolved
directly in the Plan) preceded implementation. Independent **Implementation Review 13** (did not
defer to the Formal Review's approval, independently re-verified all three workstreams against
current source and executed the full verification matrix directly): **`APPROVED`**. 218/218 tests
pass (80 new/changed + 138 full-goal regression); Portal typecheck/build exit 0; Studio build and
repository lint match their unchanged pre-existing baselines exactly; nothing from Amendment 10
regressed. The implementation remains client-only. No Function/Rules change or deployment occurred.

## 2026-07-28 — Amendment 10 corrected after Implementation Review 11 REJECTED; Implementation Review 12 APPROVED

Independent Implementation Review 11 rejected Amendment 10's implementation with four blocking
findings: (1) the retry lifecycle had no synchronous session/generation authority, so a pending retry
could settle after the show changed or a new timer action started and write its stale result into the
wrong context, and rapid duplicate activation could reach the service twice; (2) a remediation-only
result was unconditionally reported as retry `succeeded`, contradicting the approved structured-outcome
contract (success requires zero failed **and** zero remediation); (3) the required composed behavior
tests (driving the actual production hook/controller/component, not just isolated pure helpers) were
absent for both the retry lifecycle and historical-show inspection; (4) the legacy `isSelectable`
capability was found still referenced (a stale test file; production code was already clean).

**All four findings are now corrected.** A new synchronous, ref-backed retry-session controller
(`ShowProductionRetrySession`) is the sole authority deciding whether a retry can start and whether
its settlement is still valid — a stale retry can no longer write into the wrong show or duplicate its
service call. The structured retry-outcome resolver now atomically determines status, exact
unresolved/remediation IDs, message, and retry eligibility, and the hook derives all retry UI state
from it exclusively — a remediation-only result can never report success. New composed tests drive
the real production controllers/functions through the full required behavior matrix (pending state,
duplicate-activation exclusion, stale-settlement discarding after show-switch/new-action/unmount,
complete success, partial failure, remediation-only, rejected calls, and historical-show pointer/
keyboard inspection with both submit-path defenses). The last `isSelectable` reference was corrected.

Independent **Implementation Review 12** (did not defer to Review 11's prescriptions, independently
re-verified all four findings against current source and by executing every test/build/lint command
directly): **`APPROVED`**. 44/44 focused tests and 103/103 full-regression tests pass; Portal
typecheck/build exit 0; Studio build and repository lint match their unchanged pre-existing baselines
exactly, with zero new findings in any touched file.

The real live request-completion write denial cause is still not claimed — that still requires one
live owner retry reproduction with the sanitized diagnostic manifest. Reduced owner QA checkpoint (v12)
prepared. The implementation remains client-only; no Function or Rules deployment occurred. Neither
queued goal (`studio-test-data-print-limit-wipe-audit`, `preproduction-static-analysis-cleanup`) was
started.

## 2026-07-28 — Amendment 9 QA failed; Amendment 10 awaiting Formal Review

Plan Section 27 / Amendment 9 is implemented. Finish reconciliation now reports exact
request/item/allocation/write phases, treats malformed allocations as remediation rather than
silently omitting them, avoids a post-write read, and retains only exact failed request IDs for
idempotent retry. The mounted Portal rail shares a monotonic request-scoped authority with the live
show state. The existing lower-bounded historical query now retains just-finished terminal shows;
Show Picker renders them as disabled inspection rows and clears allocation destination state.

Initial Implementation Review 10 returned `BLOCKED`. All findings are remediated: remediation IDs
are non-retryable and separately surfaced; the manifest now includes parser/field/status/write/code/
commitment/retry facts; the unproven Rules branch is reverted; the mounted terminal watermark owns
poll enablement; and composed progress, stale-result, cleanup, historical clearing/default, and
activation boundaries are included in the focused suite. A first re-review isolated mapper-
diagnostic loss; request and allocation failures now preserve exact missing/wrong-typed and
legacy-extra field names without values. The complete suite passes 55/55 (1,437 ms measured).

Implementation Review 10's authoritative final verdict is `APPROVED`. Portal typecheck, Functions
build, scoped lint, and diff check pass. Studio typecheck retains only unrelated baseline failures.
No new Rules change and no deployment occurred.

The owner reported completing:
`firebase deploy --only functions:listPortalAllocatableShows --project fresh-prints-dev`.
Read-only metadata verifies the Gen 2 Function is `ACTIVE`, updated
`2026-07-28T16:32:40.92569Z`, serving latest revision
`listportalallocatableshows-00018-fuj`, with 100% traffic assigned to latest. Exact CLI exit code and
success message remain `[NEEDS OWNER CONFIRMATION]`. This recording pass did not redeploy anything.
No Amendment 9 Rules deployment is required.

Owner QA passes mounted progress, Start/Pause/Resume/visible Finish, personal usage, exact-25,
historical visibility, and smoke. It fails because one request completion update remains unresolved
and the Retry control exposes no understandable pending/result lifecycle. Malformed/incomplete
warnings persist. Owner superseded fully disabled historical slots: they must be inspectable through
pointer/keyboard while never becoming allocation destinations.

Plan Section 28 / Amendment 10 is implemented and tested. Retry now has visible pending/result
states and a sanitized structured live manifest; selected invalid allocations block before Finish;
listener diagnostics are field-only and deduplicated; and historical shows are focusable/clickable
for inspection while allocation destination/submission remain independently guarded. Focused tests
pass 60/60; Portal typecheck, scoped lint, and diff check pass. Known Studio/lint baselines remain.

The precise live three-field request-write denial cause is not claimed without the new runtime
manifest. No Function/Rules change, deployment, migration, production action, or queued-goal work
occurred. Next phase: independent Implementation Review 11.

## 2026-07-28 — Amendment 8 dev Rules deployed; owner QA required

After exact owner approval, Codex ran only
`firebase deploy --only firestore:rules --project fresh-prints-dev`. Exit code was 0. Firebase
reported successful compilation, upload, release to `cloud.firestore`, and `Deploy complete!`.
Local Rules SHA-256:
`bbf3da6f5a5159f486b2fce0a6f0459c20ac586f0395c0e7941ab934fb50c978`.

The read-only post-deploy comparison script could not obtain Application Default Credentials
(`metadata.google.internal` lookup failure), so no independent ruleset ID/content fetch is claimed.
The signed-in Firebase CLI's successful release response remains direct deployment evidence. No
Functions, indexes, Storage Rules, App Hosting, production, migration, or secret change occurred.

Current action: owner Amendment 8 live QA. Await `PASS`, `PASS WITH NOTES: ...`, or `FAIL: ...`.
Do not sign off or begin queued goals before the owner result.

## 2026-07-28 — Amendment 8 approved; awaiting dev Rules approval

Plan Section 26 / Amendment 8 is implemented and independently approved. Implementation Review 9's
authoritative final verdict is `APPROVED` after remediation re-review. Accepted scope includes the
full timer mutation/post-commit phase boundary, retry restricted to exact failed request IDs,
composed Portal polling lifecycle coverage, selected-show personal usage, complete sanitized
Start/Pause/Resume/Finish manifests, and the narrow legacy-compatible Finish Rules branch.

Verification: exact failing-before Finish fixture 16/17; passing-after full Rules 34/34 under
Temurin Java 21.0.11; targeted Amendment 8 behavior suite 21/21; Portal production build exit 0;
changed-file lint has no errors; Studio compiler reports no Amendment 8-scoped errors. No deployment
occurred.

Current and only action: request exact `APPROVE DEV RULES DEPLOY`, authorizing only:
`firebase deploy --only firestore:rules --project fresh-prints-dev`. Checkpoint:
`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-amendment-8-rules-deployment-checkpoint.md`.
Do not deploy Functions, indexes, Storage Rules, App Hosting, or production. After verified dev Rules
deployment, resume owner QA; do not sign off before the live result.

## 2026-07-28 — Post-deployment QA failed; Amendment 8 awaiting Formal Review

Owner QA after both Amendment 7 deployments is `FAIL`. Exact-25 multi-request behavior and regression
smoke pass. Show-switch was reported `SHOWN` and remains unconfirmed. Timer Start appeared to
persist and Pause/Resume worked, but Studio reported one incomplete show, four incomplete allocation
warnings, Finish permission denial, and Portal progress requiring manual refresh. The owner approved
a separate personal-use display (`Your print spots: used of limit used`; remaining line).

Plan Section 26 / Amendment 8 covers the full timer lifecycle, separation of committed mutation from
refresh failures, malformed-record handling, least-privilege Finish Rules if proven, bounded Portal
progress polling, and personal show usage using the value already returned by
`listPortalAllocatableShows`. Independent Formal Review is `approved_with_changes`; all constraints
are applied. It corrected one hypothesis: `listUpcomingShows` is already per-document resilient, so
implementation must prove the actual action failure phase. No implementation or deployment has
occurred. Next phase: Implement.

## 2026-07-27 — Both Amendment 7 deployments complete; owner QA required

After the already-verified Function deployment, the owner explicitly approved the separate Rules
checkpoint. Codex executed only
`firebase deploy --only firestore:rules --project fresh-prints-dev`: exit 0, compilation succeeded,
ruleset `projects/fresh-prints-dev/rulesets/23a9056c-bc09-4be5-9db1-ec6af78f225e` was created at
`2026-07-28T04:41:57.650831Z`, and the `cloud.firestore` release was updated to it at
`2026-07-28T04:41:58.859402Z`. The Firebase CLI reported both the Rules release and deployment
complete. Local Rules SHA-256:
`91e565ed0df55b7e1c5f060c9ecaa836cd6c1715f0f13e843e44ae9e101568ef`.

The standalone Admin SDK comparison script could not obtain ADC (exit 2), but the signed-in
Firebase CLI's create response returned the uploaded local Rules content and its release response
activated that exact new ruleset. No Functions, indexes, Storage Rules, App Hosting, production,
migration, or secret change occurred in the Rules deployment.

Both Amendment 7 deployment checkpoints are satisfied. Current action: owner live QA only. Await
`PASS`, `PASS WITH NOTES: ...`, or `FAIL: ...`; do not sign off or start queued goals beforehand.

## 2026-07-27 — Amendment 7 Function deployed and verified; Rules approval required

The owner reported completing:
`firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev`.
No Function redeployment occurred during the documentation/verification pass. Read-only Firebase
metadata confirms `queuePortalPrintRequestToShow` is `ACTIVE` in `fresh-prints-dev`, all traffic is
on revision `queueportalprintrequesttoshow-00031-wip`, and the update time is
`2026-07-28T04:36:34.802418735Z`. Runtime is Gen 2 Node.js 20; build ID is
`f21fd295-03d7-4efe-9ec7-837ea096672e`; resolved source generation is `1785213332317639`; Firebase
Functions metadata hash is `dc382c86844925389583c7e5e522664cca2d34c9`. The hash is not claimed
as a local source-byte comparison. Exact deployment exit code and CLI success line remain
`[NEEDS OWNER CONFIRMATION]`.

The Function checkpoint is satisfied. Owner QA remains paused. The next and only current owner
action is `APPROVE DEV RULES DEPLOY`, authorizing exactly
`firebase deploy --only firestore:rules --project fresh-prints-dev`. Do not redeploy the Function,
combine deployment records, or start queued goals.

## 2026-07-27 — Owner QA v7 failed; Amendment 7 approved; awaiting Function deploy approval

Owner QA found the Studio timer still denied on a one-show/two-allocation batch and the Portal's
ADR-FP-122 multiple-request behavior absent at runtime. Investigation established two separate
deployment needs: the callable has not been deployed since ADR-FP-122, and Amendment 6's deployed
Rules corrected legacy show documents but not mapper-compatible legacy allocation documents.

Amendment 7 adds a least-privilege legacy-allocation timer transition and field-name-only dev
diagnostics without additional reads/listeners. It also extracts and behavior-tests the callable's
authoritative transaction eligibility using fresh transaction values. Failing-before Rules:
12 tests, 11 pass, 1 fail, exit 1. Passing-after: Rules 28/28; focused root tests 33/33; independent
reviewer tests 37/37; Functions build and diff check pass. Formal Review is
`approved_with_changes` with all conditions applied; superseding Implementation Review 8 is
`APPROVED`. No Amendment 7 deployment occurred.

Current checkpoint: request `APPROVE DEV FUNCTION DEPLOY` for only
`firebase deploy --only functions:queuePortalPrintRequestToShow --project fresh-prints-dev`.
After it is deployed and verified, stop for the separate `APPROVE DEV RULES DEPLOY` checkpoint.
Do not resume owner QA until both deploys are complete and verified.

## 2026-07-27 — Dev Rules deployment verified; owner live QA required

The owner completed `firebase deploy --only firestore:rules --project fresh-prints-dev`. Read-only
post-deploy verification found active ruleset
`projects/fresh-prints-dev/rulesets/c05daa58-cf8f-40c3-a67a-ac17ed052479`, created
`2026-07-28T03:45:17.826815Z`, identical to local SHA-256
`fc27e9bf0537c6bbdc303abc8d730c262cb59b997fd9d39a7b76a630c460d310`.
The supplied record did not include the deployment process's exact exit code or literal CLI success
line; both remain `[NEEDS OWNER CONFIRMATION]`, while the active identical release independently
proves the intended Rules are serving. No other deployment occurred.

Implementation Review 7 is now `APPROVED_AWAITING_OWNER_QA`. The timer must not be marked passed
until the owner completes the live Test checkpoint. Queued goals remain untouched.

## Superseded — 2026-07-27 — Timer root cause reproduced; narrow Rules correction ready

The prior timer test never ran under `npm run test:rules` and used invalid fixtures. Corrected
current-schema timer writes pass. Deployed Rules were fetched read-only and matched the prior local
Rules. A preserved legacy show field reproduces the atomic `permission-denied`; the new timer-only
compatibility branch permits only the exact timer diff while preserving all authorization,
validation, transition, and unrelated-field denials. Failing-before: 9/10 pass, exit 1.
Passing-after complete Rules suite: 23/23, exit 0. No deployment occurred.

Plan Section 24; Formal Review:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-6-review.md`;
Implementation Review 7:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-7.md`;
deployment checkpoint:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-dev-rules-deployment-checkpoint.md`.

This checkpoint was satisfied by the deployment recorded above; do not request deployment approval
again.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner FOURTH runtime FAIL; ADR-FP-122 reverses one-request-per-show uniqueness by explicit owner decision; show-switch error fixed; **Studio timer remains unfixed**; sixth Implementation Review session APPROVED — awaiting owner re-QA (v6)

Owner's fourth manual QA pass confirmed the typed over-cap and Show Queue live-update fixes hold.
Three new items surfaced: a `23 + 2 = 25` capacity rejection, a show-switch stale-error defect, and
the still-unresolved Studio timer.

**The `23+2` rejection was not a math bug.** The capacity-cap functions were already correct at this
boundary. The real cause was a separate, existing product rule — "one Portal print request per
customer per show" — which the owner had explicitly confirmed as a decision to keep on 2026-07-20.
Rather than silently override an accepted decision, this was raised directly with the owner, who
explicitly decided to reverse it. Recorded as **ADR-FP-122**: a customer may now submit multiple
separate requests to the same show, accumulating toward the same 25-print limit; exactly 25 is
allowed, more than 25 is blocked. Everything else about the 25-print limit, one-working-request
policy, and same-request-one-show invariant is unchanged.

**Show-switch stale error, confirmed and fixed:** a capacity error from one show no longer stays
visible after selecting a different show; a late-arriving response for a show no longer selected can
no longer resurrect its error.

**The Studio production timer is still NOT fixed.** No Rules, authentication, service, or payload
change was made. A programmatic, read-only Rules-comparison script
(`functions/scripts/compare-deployed-firestore-rules.mjs`) and a Rules-emulator reproduction test
(`tests/firebase/studioProductionTimer.rules.test.ts`) were both built, but neither could be executed
in this development session (no live Firebase credentials, no Java runtime available here) — both
require the owner (or CI) to run them for an actual result.

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 23. Because the change was fully specified by the owner's own explicit decision, this
amendment proceeded to a Formal Review of the completed work. Amendment 5 Formal Review:
`approved_with_changes`, two minor doc/test-exactness corrections applied. Sixth Implementation
Review session
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-6.md`,
deliberately scoped to full-goal-history regression safety rather than re-tracing the same diff):
**`APPROVED`** — 101/101 tests pass across this goal's entire history; confirmed no implicit
one-request-per-show assumption existed anywhere else in the codebase, and no second instance of the
show-switch stale-value defect class existed in the modal's other state.

Owner QA checkpoint rewritten (v6), with the exact command for the owner to run the new Rules-
comparison script themselves:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response, including the
Rules-comparison result, before this goal is signed off.** No Functions, Rules, indexes, migration,
deployment, App Hosting, or production action occurred.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner THIRD runtime FAIL (count corrected — not a fourth); deeper root causes traced for two of three defects; **Studio timer remains unfixed**; fifth Implementation Review session APPROVED for those two — awaiting owner re-QA (v5, superseded by the fourth-FAIL entry above)

**Correction:** this and the workflow-state entry previously mislabeled this as a fourth owner FAIL.
The recorded history shows only three owner FAIL checkpoints on this goal; this is the third.

**The Studio production timer is NOT fixed.** Another static Rules re-comparison found no
discrepancy, but no Rules, authentication, service, or payload change was made this pass. This goal
cannot be signed off while the timer still returns `permission-denied`, regardless of the other two
checks' results.

Owner's third manual QA pass found all three defects the prior ("APPROVED") remediation had targeted
still failing at runtime. Root-cause investigation went one level deeper on the two Portal/Studio
defects that could be addressed from source: the item-card typed-quantity bug turned out to be a
re-entrancy race (a completing save could overwrite a newer, still-in-progress edit made while it was
in flight) plus a contributing clamp-bypass defect (an unknown print limit could briefly let an
uncapped value through); the Show Queue bug turned out to have a second, separate cause beyond the
already-fixed allocation list — the show's own capacity/summary numbers were still only loaded once
per page visit.

**Fixed (Portal typed-quantity and Show Queue live-update only):** the item card now tracks whether
the field still reflects what a given save actually submitted before applying that save's result, so
an overlapping edit can never be silently discarded; an unknown print limit no longer lets an uncapped
value through; the Show Queue's selected-show summary data now updates live, the same way its
allocation list already did, bounded to just that one show. **Not fixed: the Studio timer** — still
requires the owner's own live Rules diagnosis via the Firebase Console (the Firebase CLI has no command
to fetch/diff currently-deployed Firestore Rules content; a `--dry-run` deploy only validates the local
file's syntax, it does not compare against what's live).

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 22. Amendment 4 Formal Review: `approved_with_changes`, one correction resolved in-Plan. Fifth
Implementation Review session
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-5.md`,
explicitly did not defer to any of the four prior "APPROVED" verdicts on this goal): **`APPROVED`** for
the two Portal/Studio fixes only — honest note that this pass is better-founded than earlier ones
(targets an overlap/re-entrancy defect class rather than a single-path staleness bug) but source review
still cannot certify real browser timing or real cross-client Firestore listener latency, and does not
and cannot speak to the Studio timer at all since no code changed there.

Owner QA checkpoint corrected (v5): the live-Rules-comparison step now points to the Firebase Console
(the only actually-supported method) rather than an unverified CLI dry-run, plus a new explicit
overlapping-edit test step:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response, including the
Studio timer diagnostic input, before this goal is signed off.** No Functions, Rules, indexes,
migration, deployment, App Hosting, or production action occurred.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner THIRD runtime FAIL; two of three remaining defects fixed; FOURTH Implementation Review APPROVED — awaiting owner re-QA (v4, superseded by the fourth-FAIL entry above)

Owner's third manual QA pass confirmed real progress: removed-item route reconciliation and valid
typed reduction to `1`/`1`/`1` are now field-confirmed passing. Three defects remained: the Print
Request detail item card's own typed input stayed stuck on a rejected over-cap value even though
shared/cart state was already correct; a Studio production-timer `permission-denied` error, now
confirmed with a real Firebase error code; and a newly-discovered defect — Studio Show Queue not
reflecting a cross-client Portal-submitted allocation while already open.

**Root cause 1 (item-card display):** the card's own local input state never learned the server's
corrected quantity after a rejected save — a timestamp-comparison bug in its own stale-prop guard
rejected the correction. **Fixed:** the accepted quantity now threads through all three code layers
end-to-end and is applied directly to the card's input the moment a save completes.

**Root cause 2 (Studio timer):** confirmed genuinely real, but unresolvable after a fourth independent
check of the security rules against the exact write — remaining explanations require live access
(deployed rules differing from checked-in rules, or a legacy field on a specific document). A precise
diagnostic request was prepared and handed to the owner rather than guessing a fifth fix.

**Root cause 3 (Show Queue live updates):** confirmed as a genuinely new gap — no live-update
mechanism existed at all for this view, only a one-time load on open. **Fixed:** a bounded, ref-counted,
per-show real-time subscription (reusing an existing proven pattern from elsewhere in this codebase)
replaces the one-time fetch.

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 21. Amendment 3 Formal Review: `approved_with_changes`, two corrections resolved in-Plan.
Fourth Implementation Review
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-4.md`,
explicitly did not defer to any of the three prior "APPROVED" verdicts on this goal): **`APPROVED`** —
stated confidence high for both fixes at the mechanism level, with an honest note that only live
testing can confirm real network-timing races and actual cross-client Firestore listener behavior.

Owner QA checkpoint restructured per the owner's exact Check 1-4 format, including a precise
diagnostic request for the Studio timer:
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response, including the
Studio timer diagnostic input, before this goal is signed off.** No Functions, Rules, indexes,
migration, deployment, App Hosting, or production action occurred.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner SECOND runtime FAIL; three deeper root causes fixed; THIRD Implementation Review APPROVED — awaiting owner re-QA (v3, superseded by the third-FAIL entry above)

A second manual QA pass found the first remediation's fix (Implementation Review 2, APPROVED) was real
but incomplete: cart/context/Discover/Design Library/Add to Show cancellation were confirmed correct,
but the Print Request detail route itself still showed stale data after navigate-away-and-back; typed
quantity entry was badly inconsistent, including values silently collapsing to `1`; and a
previously-hidden Studio production-timer permission failure blocked a required regression criterion.

**Three root causes, source-traced and independently confirmed twice:**
1. A second, un-invalidated 30-second read cache the detail route's own fetch used — the two
   mutations that matter (`removePrintRequestItem`, `updatePrintRequestItemQuantity`) never
   invalidated it, so a navigate-away-and-back within that window re-served stale pre-mutation data.
2. The server's authoritative clamped quantity was discarded at three separate code layers on its way
   to the UI; a lookup-miss fallback silently defaulted to the literal `1` instead of surfacing an
   explicit failure.
3. A Studio production-timer permission failure that could not be diagnosed from source alone —
   diagnostic logging was added; live reproduction against `fresh-prints-dev` is needed from the owner.

**Fixed:** cache invalidation added to both mutations; the detail route now treats shared
Current-Request state as authoritative while viewing the working request; the server's actual accepted
quantity is now read and committed everywhere instead of discarded; a second, unused duplicate of the
buggy quantity code was found and removed; Studio timer failures now log full diagnostic detail.

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 20. Amendment 2 Formal Review: `approved_with_changes`, one blocking finding (an undocumented
second buggy duplicate function) resolved in-Plan. Third Implementation Review
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-3.md`,
explicitly did not defer to either prior "APPROVED" verdict on this goal): **`APPROVED`** — stated
confidence "high but not absolute," since source review cannot fully verify live React timing, real
Firestore consistency behavior, or the still-open Studio timer question; a fourth owner QA pass, not a
fourth source review, is what closes the remaining gap.

Owner QA checkpoint restructured per explicit instruction — split into a "developer already verified
automatically" section (all automatable checks with exit codes) and a "minimal remaining owner checks"
section (5 items requiring a live session): `docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

`preproduction-static-analysis-cleanup` is now also queued (owner-directed) after
`studio-test-data-print-limit-wipe-audit`, both ahead of `production-release`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response before this goal is
signed off.** No Functions, Rules, indexes, migration, deployment, App Hosting, or production action
occurred.

## 2026-07-27 — `portal-print-request-prelaunch-stability` owner runtime FAIL; real root cause fixed; new Implementation Review APPROVED — awaiting owner re-QA (superseded by the second-FAIL entry above)

Owner ran manual QA against a previously "Implementation Review APPROVED" fix and found removal and
quantity persistence still broken at runtime. The real root cause (traced directly from the live
component→hook→context call graph, independently confirmed twice): `PrintRequestDetailView.tsx`'s
remove/update/duplicate handlers each awaited the properly-reconciled hook method and then
unconditionally fired a second, unguarded server reload — racing the reconciliation that hook already
performed and resurrecting stale data via ordinary Firestore eventual-consistency lag. This explains
why the defect was consistent, not occasional.

**Fixed:** removed the three redundant reload calls; added a monotonic-timestamp prop-sync guard so a
stale reload from an unrelated, still-legitimate source (e.g. the Current Request drawer) cannot
silently revert an already-saved quantity; changed the historical-request reuse button to exactly
"Request Again" (owner-requested); fixed a separate, pre-existing Studio `tsconfig.json` build blocker
(one-line correction, no TypeScript upgrade) — this exposed 29 separate pre-existing type errors,
unrelated to print requests, previously masked by the earlier build failure; not fixed in this pass,
flagged for a future cleanup.

Plan amendment: `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`
Section 19. Amendment Formal Review (`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-amendment-review.md`):
`approved_with_changes`, two non-blocking notes resolved in-Plan. New independent Implementation
Review (`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review-2.md`,
explicitly did not defer to the prior disproven verdict): **`APPROVED`** — independently re-traced the
actual current source end-to-end and confirmed, with concrete evidence, that both root causes are
removed at their exact call sites.

Owner QA checkpoint rewritten with all 16 owner-specified scenarios (A-P):
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response before this goal is
signed off.** No Functions, Rules, indexes, migration, deployment, App Hosting, or production action
occurred. `studio-test-data-print-limit-wipe-audit` remains queued but not started;
`production-release` remains not started.

## 2026-07-27 — `portal-print-request-prelaunch-stability` Implement complete, Implementation Review APPROVED — awaiting owner manual QA response (superseded by the runtime FAIL entry above)

Required pre-production stabilization goal, immediately before the still-queued
`production-release` roadmap goal. Owner approved the Plan for implementation; all 8
Portal print-request defects plus the Firebase Debug availability-toast removal are now
implemented and independently reviewed.

**Fixed:** stale/reappearing removed request items; stale/reverting quantities across
Discover, Design Library, cart, and detail; cold-start blank design-card images; a
missing post-queue-to-show progress tracker; wrong show-capacity copy; an ambiguous
"Add to request" action on historical requests (now "Print again" with a repeat icon);
the elapsed timer removed from the show-linked progress panel (underlying production
timer untouched); and the "Firebase Debug panel available (Ctrl+Shift+F)" toast removed
from both Portal and Studio (the actual dev-only tool and its gates/shortcut untouched).

**Shared root cause (items 2/5/7), now fixed:** `usePrintRequestDetail.ts` now calls the
context's existing `beginPendingItemRemovals`/`endPendingItemRemovals`/`patchWorkingItems`
reconciliation mechanisms, plus a new per-item generation tracker
(`itemMutationGeneration.ts`) that discards stale completions for a superseded mutation.
`reconcileQueuedRequest` now patches `allocationTotalsByRequestId` from the queue-to-show
callable's authoritative result. **Item 1, now fixed:** `catalogService.ts`'s
`getReadyDesignsByIds` detects exactly which requested IDs are missing from a successful
generated-manifest response and fetches only that missing subset via the existing
per-doc fallback — zero extra reads when the response is already complete.

**Verification (exact exit codes):** new/updated tests 45/45 pass (exit 0); Portal
typecheck exit 0; Portal build exit 0 (19/19 pages); Studio build exit 2, traced to a
genuinely pre-existing, unrelated `apps/studio/tsconfig.json` defect committed
2026-07-13 (`ignoreDeprecations: "6.0"` invalid for installed TypeScript 5.9.3) — not
caused by this goal, flagged separately for a future decision; lint exit 1, all 41
findings independently confirmed pre-existing; `git diff --check` exit 0.

**Independent Implementation Review**
(`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-implementation-review.md`):
**APPROVED, no blocking findings** — traced the actual reconciliation logic directly,
independently re-ran 57 tests (all pass), and independently re-derived both
pre-existing-defect diagnoses from `git log`/`git diff` rather than trusting the claim.

**Owner manual QA checkpoint prepared:**
`docs/workflow/reviews/2026-07-27-portal-print-request-prelaunch-stability-qa-checkpoint.md`.

**Next queued goal after this one closes:** `studio-test-data-print-limit-wipe-audit`
(owner-directed) — audit and redefine the Studio Test Data action currently labeled like
a Print Request daily-limit wipe, since the product no longer has a standalone customer
daily print allowance. Not started, no Plan authored. **`production-release` begins only
after both this goal and `studio-test-data-print-limit-wipe-audit` are signed off.**

**Human checkpoint — awaiting the owner's `PASS`/`PASS WITH NOTES`/`FAIL` response to
manual QA before this goal is signed off.** No Functions, Rules, indexes, migration,
deployment, App Hosting, or production action has occurred.

## 2026-07-27 — `portal-google-analytics` SIGNED OFF: PASS — managed goal CLOSED

Owner responded **`PASS`** to the Signoff checkpoint with no notes. The goal is now
closed.

**Final state**: an inert Google Analytics 4 architecture is merged into Fresh Prints
Portal (`apps/portal/features/analytics/`: host gate, config resolver, a sanitizer that
templates dynamic routes and drops all customer PII/search text/request IDs, a narrow
`gtag` service wrapper with explicit success/failure returns, a single-controller hook
gated on both config and script-readiness, a thin script-loader component, and a
Suspense-wrapping boundary component owning the readiness handshake), wired into
`apps/portal/app/layout.tsx`/`providers.tsx`. It is fully dormant in every deployed
environment today — no `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured anywhere, and the
architecture stays inert by design even if one were accidentally set outside the
production hostname.

**Workflow history**: five Formal Review passes and two Implementation Review passes
resolved, in order: an initial PII-leak risk (raw request/design IDs, search text,
`returnTo`, dynamic titles reaching Google); a GA4 Enhanced Measurement duplication
gap; a de-duplication under/over-counting defect; an internally contradictory
Enhanced-Measurement/ad-signal scope; a Server-Component/Client-Component architecture
conflict plus a dual-ownership conflict for the initial page view (consolidated into a
single controller); a rejected "accept a narrower privacy gap" production fallback
(replaced by a hard PASS/BLOCKED gate); and a genuine runtime initialization race found
only after the first Implementation Review had already approved an earlier version —
closed by an explicit `next/script` `onReady`-based readiness handshake and a
success-gated state-commit rule.

**Test phase**: automated suite 81/81 pass (exit 0), Portal typecheck exit 0, Portal
build exit 0 (19/19 pages, no Suspense error), lint exit 1 correctly characterized (10
pre-existing warnings tripping the repo's `--max-warnings 0` policy; zero new findings
in this goal's files). Inert local runtime smoke test passed: Portal starts normally,
zero Google-domain script/network activity, all routes HTTP 200, zero console/server
errors.

Full artifact trail: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`,
`docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`,
`docs/workflow/reviews/2026-07-26-portal-google-analytics-implementation-review.md`,
`docs/workflow/reviews/2026-07-27-portal-google-analytics-test-report.md`,
`docs/workflow/reviews/2026-07-27-portal-google-analytics-signoff-checkpoint.md`.

**Production was untouched throughout the entire goal.** No real Measurement ID was
ever used. No GA4 property was created. No Firebase, App Hosting, or production action
occurred at any point.

**Next queued goal: `production-release`** (per the roadmap's pre-production
sequence) — not started, requires its own new Plan and explicit owner approval before
implementation or deployment. Per this goal's Plan (Owner Decision 6), that goal is
where the owner creates the real GA4 property, disables Enhanced Measurement
completely, verifies advertising settings are disabled, runs the hard PASS/BLOCKED
DebugView privacy gate, resolves privacy disclosure/consent, and only then supplies the
real Measurement ID and deploys.

## 2026-07-27 — `portal-google-analytics` script-readiness race fixed and re-reviewed (APPROVED); Test phase complete; awaiting owner Signoff

The owner found a real runtime race in the previously-approved implementation: the
analytics controller could permanently lose its initial GA configuration and page view
if its React effect ran before the `next/script strategy="afterInteractive"` script had
executed — the prior code committed "initialized" state unconditionally after merely
calling the service functions (which correctly no-op if `gtag` doesn't exist yet), not
after confirming they succeeded, and nothing would ever trigger a retry once that
false state was committed.

**Fixed with an explicit script-readiness handshake**: the three `gtag`-wrapper
functions now return an explicit `boolean` (true only on real success);
`PortalAnalyticsScript` reports readiness via `next/script`'s own documented `onReady`
callback; `PortalAnalyticsBoundary` owns that boolean and passes it into the single
controller hook; the controller never attempts initialization until the script is
ready, and commits state only on confirmed success — making the later `update:true`
navigation call structurally unreachable before a real initial configuration. No new
lifecycle owner was introduced; the components only report the fact that the script
executed, all decisions remain in the one controller/service layer.

Ten required regression tests were added covering every required scenario (delayed
readiness, permanently blocked script, failed initialization with a working retry,
Strict-Mode-style replay, repeated readiness signals, navigation before readiness using
the current route rather than a stale one, and a thin-component regression proving no
sequencing logic leaked back into the script-loader component).

A second independent Implementation Review
(`docs/workflow/reviews/2026-07-26-portal-google-analytics-implementation-review.md`)
independently re-verified all ten required checklist items against the actual shipped
code: **APPROVED**. All verification commands re-run and passing: 81/81 unit tests
(exit 0), Portal typecheck (exit 0), Portal build (exit 0, no Suspense error). Lint
exit code corrected to its precise value (**1**, due to the repo's `--max-warnings 0`
policy tripping on 10 pre-existing, unrelated warnings) — the first Implementation
Review's "exit 0" claim for this command was itself an error, now corrected; the
problem count and file list are identical and unrelated to this goal in both runs.

**Test phase complete**: automated results recorded, plus an inert local runtime smoke
test (Portal started with no Measurement ID configured; confirmed zero Google-domain
script tags or network activity across `/`, `/catalog`, `/login`, `/help`,
`/firebase-debug`; all routes HTTP 200; zero console/server errors). Test Report:
`docs/workflow/reviews/2026-07-27-portal-google-analytics-test-report.md`.

**Awaiting the owner's Signoff response** (`PASS` / `PASS WITH NOTES` / `FAIL`) at
`docs/workflow/reviews/2026-07-27-portal-google-analytics-signoff-checkpoint.md`.

No real Measurement ID was used at any point. No GA4 property was created or changed.
No Firebase, deployment, App Hosting, or production action occurred throughout this
entire goal.

## 2026-07-26 — `portal-google-analytics` Implement complete: inert GA4 code built and independently reviewed (APPROVED); production analytics remains separately blocked

Owner approved Owner Decisions 1–7 for the Portal Google Analytics goal, subject to a
whole-Plan consistency correction that resolved three implementation blockers: (1) the
Server Component root layout could not read the current URL, so a new Client
Component/Suspense boundary (`PortalAnalyticsBoundary`) now owns all URL-aware logic;
(2) two layers previously contended for ownership of the initial GA4 page view,
resolved by consolidating into one authoritative hook,
`usePortalAnalyticsController`; (3) a prior revision allowed production GA4 enablement
to proceed even with an unresolved automatic-event privacy leak "if accepted" — the
owner rejected this, and a hard PASS/BLOCKED production gate (no accept-and-proceed
path) now governs it instead.

A fifth Formal Review pass — the first scoped to the *entire* Plan document rather
than one amendment — verified all three corrections against source and current
documentation, found one cross-section drift (an older section still narrated the
rejected fallback as current), and confirmed it resolved. Verdict:
`approved_with_changes`, fully resolved.

**Implement then proceeded**, building exactly the inert code specified: a new
`apps/portal/features/analytics/` feature folder (host gate, config resolver,
sanitizer + navigation-identity logic, a narrow `gtag` service wrapper, the single
controller hook, a thin script-loader component, a Suspense-wrapping boundary
component, strict types) plus wiring into `apps/portal/app/layout.tsx`/`providers.tsx`
and one new documented `.env.example` line. No real Measurement ID was used anywhere;
the architecture is fully inert until a real ID is configured on the production
hostname.

**All verification independently re-run and passing**: 73/73 unit tests (exit 0),
Portal typecheck (exit 0), Portal production build (exit 0 — 19/19 pages, no Suspense
build error), repo-wide lint (exit 0, zero new findings — 41 pre-existing unrelated
issues only). An independent implementation review (separate context, re-ran every
command itself rather than trusting the claim) returned **APPROVED**, with one
non-blocking note about Strict Mode test coverage being proven at the pure-function
level, consistent with this repo's established no-DOM-renderer testing convention.

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`.
Reviews: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md` (Formal
Review), `docs/workflow/reviews/2026-07-26-portal-google-analytics-implementation-review.md`
(implementation review).

**Stopped before deployment and before any real Measurement ID**, per explicit scope.
No GA4 property was created. No Firebase, App Hosting, or production action occurred.
Remaining for this goal: Test (formal QA sign-off) and Signoff phases. Production GA4
enablement itself — including the hard PASS/BLOCKED gate verification and property
creation — remains a fully separate checkpoint under the later `production-release`
roadmap goal.

## 2026-07-26 — `portal-google-analytics` Plan corrected a third time (final navigation de-dup design, full Enhanced Measurement disablement, global page-context sanitization); Implement still blocked only on Owner Decisions 1–7

The owner reviewed the twice-amended Plan and found three remaining material
conflicts, all resolved this session. No implementation, configuration, dependency,
environment, Firebase, or GA property change occurred — confirmed via `git status`:
only the Plan/Review docs and this state-file pair changed.

**Correction 1 — navigation de-duplication:** the prior design de-duplicated on raw
navigation state and reframed dropped-parameter-only repeated page views (e.g.
search-box typing) as "acceptable GA4 behavior." **The owner rejected this** — the
original requirement was never actually met. Replaced with a three-part design: a
local, never-transmitted **navigation identity** (raw pathname + normalized
allowlisted query only) decides whether to fire; the **sanitized descriptor**
(unchanged) decides what is reported; a **previous sanitized descriptor** supplies the
safe referrer. This makes dropped-parameter changes (e.g. catalog search text) produce
zero additional page views, while different dynamic-segment resources
(`/requests/[id]`, `/share/design/[id]`) still correctly produce distinct page views.

**Correction 2 — full Enhanced Measurement disablement:** the prior version disabled
only the browser-history-tracking sub-option while claiming "page views only" — an
internal contradiction, since GA4's Site search sub-feature auto-detects Portal's own
`q` search parameter independent of anything this Plan's own code can intercept. Now
requires the **entire** Enhanced Measurement switch off, with an explicit DebugView
checklist (no `view_search_results`, no scroll/click/video/file-download/form events).

**Correction 3 — global GA4 page-context sanitization (new):** automatically-collected
lifecycle events (`first_visit`, `session_start`, `user_engagement`) would inherit raw
`document.location`/`document.title`/`document.referrer` unless the tag's global page
context is explicitly overridden first. Added the required `gtag('set', ...)`-before-
`gtag('config', ...)` sequence, plus explicit `allow_google_signals: false` /
`allow_ad_personalization_signals: false` (corrected from an earlier, inaccurate claim
that leaving these unset was sufficient — both actually default to `true`/enabled).

**Third independent Formal Review** verified the correction against source and current
Google Analytics documentation (not memory) and found two blocking wording/certainty
issues, no architecture changes needed: a self-contradictory paragraph about
`category`-ID handling in the navigation-identity design, and an overstated claim that
the `gtag('set',...)`-before-`config` mechanism was "verified" to reach automatic
lifecycle events (official docs are silent on this specific point). **Both resolved
directly in the Plan**: the contradictory paragraph was rewritten to state only the
correct behavior; the overstated claim was softened into an explicit go/no-go manual-QA
test with a documented, non-blocking fallback.

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`.
Review: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

**Implement remains blocked on the same seven Owner Decisions as before** — items 3, 5,
and 6 now carry the owner's exact required wording (no consent banner this goal; full
Enhanced Measurement disablement; ordered GA4-property-setup sub-steps). Production
remains completely untouched.

## 2026-07-26 — `portal-google-analytics` Plan amended (analytics URL/title/referrer sanitization + GA4 Enhanced Measurement checkpoint); Implement still blocked only on Owner Decisions 1–7

An external owner review of the already-`approved_with_changes` Plan/Review found two
material omissions, both now resolved directly in the Plan. No implementation,
configuration, dependency, environment, Firebase, or GA property change occurred —
confirmed via `git status`: only the Plan/Review docs and this state-file pair changed.

**Omission 1 — data leakage risk:** the original design would have sent raw
`pathname+searchParams` toward `gtag`. Verified by direct repository inspection (not
invented): `/requests/[id]`'s dynamic segment is a Firestore `printRequest` document ID
(not public); the `q` catalog-search parameter is free customer-entered text; `returnTo`
(used across `/login`, `/register`, `/login-required`, `/complete-profile`, `/donate`,
`/requests/artwork`) can transitively embed a `/requests/:id`-shaped nested path and
query string (confirmed via real call sites in `PrintRequestDetailView.tsx`); and
`/share/design/[id]`'s real, dynamic `<title>` contains the actual design name (via
`portalDesignShareMetaService.ts`). **Resolved** with a new sanitization architecture
(Plan Section 6a): a single pure function, `buildSanitizedAnalyticsPageDescriptor`, is
now the sole choke point between raw navigation state and any value reaching `gtag` —
route templating (`/requests/:id`, `/share/design/:id`), query-parameter allowlisting
(fixed enums/flags only; `q`/`returnTo`/`requestId`/`designId`/etc. always dropped),
fixed non-dynamic page titles (never `document.title`), sanitized referrer (never
`document.referrer`), and fail-closed handling of unknown routes/parameters.

**Omission 2 — Enhanced Measurement duplication:** the Plan's `send_page_view: false`
mitigation only suppresses GA4's one-time auto-page-view on script load, not the
separate, on-by-default Enhanced Measurement "Page changes based on browser history
events" setting, which would double-count every client-side App Router navigation.
**Resolved** with a new, explicit GA4 property-setup checkpoint (Plan Section 6b,
verified against official Google Analytics documentation, not memory): exact console
path, who performs it, when, and how it's verified in DebugView — folded into a revised
Owner Decision 6.

**Second independent Formal Review** verified the amendment against source and found
one new blocking defect introduced by the amendment's own original de-duplication
design: comparing only the sanitized route would have silently suppressed a real page
view when navigating between two different dynamic-segment resources that template
identically (e.g. two different `/requests/[id]` values, both `/requests/:id`) — a
real under-counting bug. **Resolved directly in the Plan**: the de-duplication guard
now uses a two-tier comparison — raw navigation state decides *whether* a page view
fires (fixing the under-counting), the sanitized descriptor decides *what* is reported
(preserving the privacy fix).

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`.
Review: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

**Implement remains blocked on the same seven Owner Decisions as before** (Plan Section
18) — nothing new blocks Implement beyond what already blocked it; Decision 6 now
explicitly includes the GA4 Enhanced Measurement property-setting step. Production
remains completely untouched.

## 2026-07-26 — `portal-google-analytics` Plan + Formal Review complete (`approved_with_changes`); Implement blocked on owner decisions

Started the next queued managed goal (roadmap item #5, after Wave C signoff). This
session was **Plan + Formal Review only** — no implementation, dependency, environment,
Firebase, or CSP change occurred.

**Confirmed by direct repository inspection:** zero existing GA4/analytics
implementation anywhere in the repo; no analytics dependency in
`apps/portal/package.json`; no CSP anywhere in Portal (no `next.config.ts` headers, no
`middleware.ts`, no CSP in `firebase.json`/`apphosting.yaml`); no Privacy Policy/Terms/
consent page anywhere in Portal. Reused two exact existing precedents: the
`getPortalSiteOrigin`/`isPortalSearchIndexingEnabled` fail-closed hostname gate
(`apps/portal/features/brand/`) and `Providers.tsx`'s existing
`usePathname()`-keyed `useEffect` pattern.

**Proposed architecture:** a new `apps/portal/features/analytics/` folder
(Component → Hook → Service layering). Root layout renders a client
`PortalAnalyticsScript` (`next/script`, `strategy="afterInteractive"`,
`send_page_view: false`) only when a Measurement ID is configured AND a dedicated
`isPortalAnalyticsHostAllowed` gate resolves true (production hostname only — kept
independent of the SEO-named `isPortalSearchIndexingEnabled` per a Formal Review
correction). `Providers.tsx` mounts a `usePortalPageViewTracking` hook
(`usePathname`+`useSearchParams`, `useRef` de-dupe, excludes `/firebase-debug`) firing
exactly one page view per route change through a thin `gtag` wrapper service; every
failure path is a silent no-op, never blocking Portal rendering. No new npm dependency.
No Firestore/Storage/Functions/Rules change anywhere in this design.

**Formal Review (`approved_with_changes`, independent context):** verified every
repository claim directly, confirmed zero scope violations and zero code/config changes
by this session. Three findings resolved directly in the Plan: a `PortalScrollReset.tsx`
citation was corrected to not overstate root-level proof; the SEO-named hostname gate
was replaced with a dedicated analytics-specific wrapper to avoid concern-coupling; an
unverified Suspense-boundary assumption was downgraded to an explicit Implement-time
verification step. Two non-blocking housekeeping notes logged, not acted on.

Plan: `docs/workflow/plans/2026-07-26-portal-google-analytics-plan.md`.
Review: `docs/workflow/reviews/2026-07-26-portal-google-analytics-review.md`.

**Implement is blocked** on seven numbered owner decisions (Plan Section 18): dev
analytics strategy, hostname gating, **consent strategy (no Privacy Policy exists
anywhere in Portal today — Plan recommends legal review before any consent-dependent
path, though the inert-by-default skeleton can be built regardless)**, test/staff
traffic exclusion, event scope, Measurement ID provisioning (owner creates the GA4
property out-of-repo; supplied only at a later production checkpoint, never during
Implement/Test against `fresh-prints-dev`), and privacy disclosure.

**Production remains completely separate and untouched.** `production-release`
(roadmap item #6) was not started and is not conflated with this goal.

## 2026-07-27 — `firestore-usage-efficiency-wave-c` SIGNED OFF: PASS WITH NOTES — managed goal CLOSED

Both final owner smoke tests passed (Studio: bounded reads only, 0 listeners/callables/Storage
requests/writes/fallbacks/errors across a full tab traversal; Portal: 0 fallbacks/errors/client
writes, 7 callables all succeeded, 112 Storage requests all from active generated catalog families,
no abandoned resource used). Full signoff:
`docs/workflow/reviews/2026-07-27-firestore-usage-efficiency-wave-c-signoff.md`.

**Final state**: bounded Firestore is the sole, permanent Print Requests path for both Studio and
Portal (queueTab-maintained, server-paginated, exact `getCountFromServer` counts, direct
selected-request lookup, local mutation reconciliation). The generated catalog/Design Library
architecture remains fully active and was unaffected by this goal. The private print-request JSON
read-model architecture explored during this goal was abandoned by explicit owner decision (ADR-FP-121)
after a controlled real-publication test proved it didn't eliminate the cost it was built to remove
— every artifact (source, 3 Functions, Storage objects, Storage Rules, 2 Firestore indexes) has been
fully removed from both source and `fresh-prints-dev`.

Production was untouched throughout the entire goal. Managed goal `firestore-usage-efficiency-wave-c`
is now CLOSED. **Next queued goal: `portal-google-analytics`** (per the roadmap's own pre-production
sequence) — not started, requires a new Plan and explicit owner approval before implementation.

## 2026-07-27 — Pass 6: Abandoned private print-request read-model cleanup FULLY COMPLETE (source + Firebase) — awaiting owner's final Wave C smoke test

Every artifact of the abandoned private print-request JSON read-model architecture (see the entry
below for the abandonment decision and rationale) has now been removed from both source and the
live `fresh-prints-dev` Firebase project, across four sequential owner-approved checkpoints:

1. Application source removed (Studio/Portal consumers, shared types, publisher/callable Functions).
2. The three abandoned Functions deleted from `fresh-prints-dev`
   (`publishPrintRequestReadModels`, `readStudioPrintRequestReadModelAsset`,
   `onPrintRequestReadModelInputWritten`) — confirmed via `firebase functions:list`.
3. The abandoned private Storage objects (`generated/studio-print-requests/`,
   `generated/portal-print-requests/`) manually deleted by the owner via the Firebase Console; the
   now-unnecessary explicit private Storage Rules and helper (`customerBelongsToCaller`) removed
   from `storage.rules` and deployed — confirmed by 12/12 passing rules-emulator tests both before
   and after deployment, proving the paths correctly fall through to default-deny.
4. The two Firestore composite indexes that existed only for the deleted publisher
   (`printRequests`: `queueTab+createdAt` ascending and descending) deleted from live
   `fresh-prints-dev` via `firebase deploy --only firestore:indexes --force` — confirmed via
   `firebase firestore:indexes` showing exactly 6 `printRequests` indexes remaining (down from 8),
   with the bounded `queueTab+updatedAt+__name__` index intact and every other pre-existing index
   untouched.

Bounded Firestore (pass 5's `listPrintRequestsPage`/`countPrintRequests`, exact
`getCountFromServer` tab counts, cursor pagination, direct selected-request lookup, local mutation
reconciliation) is now the sole, permanent Print Requests read path in both apps, with zero
remaining trace of the abandoned architecture anywhere in code or Firebase. The generated
catalog/Design Library system remains completely unaffected throughout every step of this cleanup.

**Awaiting the owner's final Wave C smoke test** (Studio cold-open, Portal Discover/Design
Library/working-request check) before Wave C is ready for signoff.

## 2026-07-26 — Pass 6: Private print-request JSON read model ABANDONED and REMOVED — bounded Firestore is the permanent Print Requests path

The private Studio/Portal print-request read-model architecture documented in the entries below was
built, corrected twice for real defects (a manifest/page path-orphaning bug, then an immutability
violation the owner caught in the first fix), deployed to `fresh-prints-dev`, and set up for a
controlled real-publication test. **The owner then decided to abandon it entirely** — not disable,
remove — after the final runtime evidence showed the architecture never actually eliminated what it
was built to eliminate: ~10s before Print Requests became visible, a ~5.29s manifest callable, a
~333ms page callable, and 4 Firestore count queries + 1 item query + 4 catalog design reads (~12
client-side billable reads) still occurring despite the read model being live and correct.

**Bounded Firestore (pass 5's `listPrintRequestsPage`/`countPrintRequests`, cursor pagination, exact
`getCountFromServer` tab counts, direct selected-request lookup, local mutation reconciliation) is
now the sole, permanent Print Requests read path for both Studio and Portal** — this was already the
proven, working architecture the read model was layered on top of; removing the read model restores
it as the only path, with zero conditional branching or fallback-decision latency.

`printRequests.queueTab` and its two maintenance triggers
(`onPrintRequestItemQueueTabInputWritten`, `onShowAllocationQueueTabInputWritten`) are fully
preserved — only their private-read-model publish side effects and the read-model-only
`onPrintRequestReadModelInputWritten` trigger were removed.

The completely separate, successful generated catalog/Design Library system
(`generated/catalog-reference/**`, `generated/portal-catalog/**`, `rebuildCatalogSnapshots`, catalog
snapshot triggers, Studio/Portal catalog consumers) is untouched and remains active.

Full removal: all private read-model shared types, publisher/callable/read-callable Functions,
Studio/Portal consumer services and mapping utilities, the Studio dev-console publish bridge, and
the two now-orphaned Firestore composite indexes (`printRequests`: `queueTab+createdAt` ascending
and descending) were deleted from source. `storage.rules`' explicit private-prefix rules for both
abandoned Storage prefixes were deliberately LEFT IN PLACE (not yet removed) per a safe-removal
sequence — they stay private until the old dev Storage objects under both prefixes are confirmed
deleted in a separate, later owner-approved checkpoint, so no private object can ever become
publicly readable mid-cleanup. The rules-emulator test for those prefixes was re-verified against
the current, unmodified rules: 17/17 pass.

**Nothing was deployed or deleted from Firebase in this removal pass** — this was a local source
cleanup only. The abandoned Functions (`publishPrintRequestReadModels`,
`readStudioPrintRequestReadModelAsset`, `onPrintRequestReadModelInputWritten`) remain live in
`fresh-prints-dev` until a separate, explicit deployment/deletion checkpoint. Historical plans,
reviews, and this snapshot's own earlier entries documenting the read-model work are preserved
below as-is — the work was real and technically successful; it was abandoned for cost/complexity
reasons, not because it was broken.

## 2026-07-25 — Pass 6 update: Rules emulator security gate executed and passing (22/22)

Per owner instruction, ran the previously-written `printRequestReadModel.rules.test.ts` for real
against the Firestore + Storage Rules emulators (had only been logically reviewed before, not
executed — no Java in the environment). Used the documented Wave C portable JDK
(`%USERPROFILE%\.local-jdk\jdk-21.0.11+10`, Temurin 21.0.11, shell-scoped `JAVA_HOME`/`PATH`, no
admin install). `npm run test:rules`.

First run: 3 of 19 tests failed — all "allow" cases (staff reading the Studio manifest, a customer
reading their own manifest, staff reading a customer manifest). Root cause confirmed via a minimal
isolated repro and cross-check against the repo's own pre-existing, unmodified
`isReadyDesignDerivative` rule (also failed identically): a **test-harness bug, not a rules
defect** — the new test file used an arbitrary demo `projectId`, but this Firebase CLI version's
Storage Rules only resolve cross-service `firestore.get()` against the emulator's actual configured
project (`fresh-prints-dev`). Fixed by changing the test's `projectId` to `'fresh-prints-dev'` —
`storage.rules` itself was not touched. Added two previously-missing required assertions (inactive
staff denied; a `customers` doc missing `userId` denied for the customer branch while staff can
still read it).

Final run: **22/22 pass, exit code 0**. Java: Temurin 21.0.11+10. Confirms: signed-out/customer
denied Studio reads; staff allowed; customer A reads only their own manifest/pages; customer A
denied customer B's assets; staff allowed any customer's assets; all client writes denied on both
new prefixes for every role; the `customers.userId`-to-Auth-UID resolver correct including its
failure modes (missing doc, malformed doc, inactive staff); unrelated existing Storage Rules
unaffected. No rule or code change was made merely to pass a test — only the test's project-ID
configuration was corrected and missing coverage was added. **Nothing was deployed.**

## 2026-07-25 — Pass 6: Private generated print-request read models (Studio + Portal), implemented and reviewed, ready for owner dev deployment approval

Added two PRIVATE generated Cloud Storage read-model caches on top of pass 5's already-approved,
unmodified `queueTab`/bounded-Firestore architecture (which remains the permanent secure fallback,
not reverted): one staff-only for Studio, one customer-scoped for Portal. Mirrors the existing
catalog-snapshot architecture's mechanics (manifest-last publish, content-addressed assets,
generation-precondition manifest swaps) but as two genuinely separate security contracts — neither
new asset is public-read, unlike every prior `generated/**` prefix.

Key architecture facts confirmed by direct code inspection before implementation: `customers/{id}`
Firestore doc ID is **not** the Auth UID (mapping is `customers.where("userId","==",authUid)`); no
existing Electron-main-to-renderer-auth bridge exists, so Studio's private asset is fetched via the
renderer's already-authenticated Storage SDK (`getBytes`), not the public-asset Electron IPC
transport — mirroring an existing repo precedent (`assistedCreationRequestsService.downloadBytes`
against per-uid/staff-gated paths).

Implemented: shared read-model types/pure builders (11 tests); Functions publisher module with a
shared bounded generation-precondition retry helper (9 tests including a same-manifest concurrent-
burst test); a new `printRequests`-direct trigger with a recursion guard preventing it from re-firing
on the existing `queueTab` triggers' own write (8 tests); the read-model publish call is wrapped in
its own try/catch, called strictly after the `queueTab` write succeeds, and never affects that
write's outcome; a new owner-only/dev-only backfill/initial-publish callable that skips (never
publishes) any request missing `queueTab`, reported as `skippedNoQueueTab` (5 tests); new Storage
Rules (`generated/studio-print-requests/**` staff-only; `generated/portal-print-requests/customers/
{customerId}/**` gated by a new `customerBelongsToCaller` helper resolving the doc-ID-vs-uid mapping
server-side) plus a new rules-emulator test file (not executable in this environment — no Java —
written and logically reviewed, not live-verified); Studio and Portal consumer services/hooks that
prefer the generated asset and fall back transparently to each app's existing bounded Firestore path
on any failure, with defense-in-depth cross-customer card/item filtering on the Portal side (11
tests) even though Storage Rules already enforce this server-side.

Independent review of the Plan (before implementation): approved_with_changes, 6 findings addressed
in the Plan (novel-rules-helper test requirement, per-manifest retry-budget verification, publish/
queueTab error isolation, backfill sequencing enforcement, exact Portal fallback citation, capacity-
authority guard). Independent review of the implementation (after coding): approved_with_changes, 1
confirmed bug — Studio's "Load more" silently no-op'd for any tab exceeding one page after a
read-model-sourced first load (the Firestore cursor the button depended on was never populated on
that path) — fixed with page-index-based read-model pagination, rebuilt and relinted clean.

Verification: 57/57 focused tests, Functions build, Portal typecheck + production build, Studio
3-target build, changed-file lint (2 findings fixed), no whitespace issues. No deploy, republish,
rules deploy, or production action occurred. Owner approval required before deploying: the new
Storage Rules, the new/modified Functions (`onPrintRequestReadModelInputWritten`, the modified
`onPrintRequestItemQueueTabInputWritten`/`onShowAllocationQueueTabInputWritten`,
`publishPrintRequestReadModels`), and before running the new backfill/initial-publish callable
(dry-run first recommended, sequenced after the existing `queueTab` backfill).

## 2026-07-25 — Pass 5: Print Requests page bounded hydration, approved, deployed, backfill pending human checkpoint

The Print Requests page's previously-flagged unbounded hydration (full request/customer/allocation/
show scans on every mount) is now bounded end-to-end per explicit owner direction: strict bounds
everywhere, exact tab counts never approximated, a maintained field only where exact bounded
counting is genuinely impossible, server pagination, and a gated backfill. Added a maintained
`printRequests.queueTab` field (Working/Queued/Printing/Printed have no raw filterable equivalent
and Firestore can't compound two inequality filters) kept in sync by two new narrowly-scoped
triggers, each O(1) per event (recomputes from only the one affected request's own items/
allocations, never a corpus scan). Rebuilt the service layer with paginated/exact-count/chunked/
direct-ID methods, rewrote the list hook and page to use them, converted every mutation handler to
local reconciliation, and scoped show/customer lookups to only what's actually visible or selected.
Built (but did not run) a resumable, dry-run-capable, idempotent backfill callable for pre-existing
requests. Independent review: approved_with_changes, all 4 findings resolved (a tab-count
decrement bug on delete/archive, a missing internal guard, two dead-code removals). 46/46 focused
tests, all builds/lint/diff-check clean. Deployed the two new triggers plus the backfill callable
(as inert code) to fresh-prints-dev. Studio needs a full restart.

**Pending human checkpoint**: the backfill must be manually invoked by the owner (confirmation
phrase `BACKFILL QUEUE TAB`, dry-run first recommended) before pre-existing requests get a correct
`queueTab` — new/mutated requests already get one automatically via the two deployed triggers.

## 2026-07-25 — Pass 4: 249-read Studio spike attributed and fixed, approved, no Functions change

Deployed Function logs for the exact owner window prove the server side already met its budget: 4
`onPrintRequestItemCreated` executions at 1 read/2 writes/1 transaction each, 4
`onPortalCatalogSnapshotSourceWritten` executions all operational-skip at 0 reads, nothing else running in
or near the window — 8 of 249 reads server-attributed. The remaining ~241 were untraced Studio client
reads: hidden per-add reads in `addPrintRequestItem` (parent read + growing item-list read + read-after-
write) and the Print Requests page's own untraced mount/remount hydration. Fixed the add-path (parent
`increment(1)`, item-list read now skipped via explicit `sortOrder` or a preloaded-items hint that the
actual multi-select add caller now uses — closing a gap the independent reviewer caught in the first
attempt) and added read tracing to the six previously-invisible hot reads so future debug reports attribute
correctly. Independent review: approved_with_changes, both findings resolved. Studio 3-target
build/lint/12 tests/diff-check all clean. No Functions changed or deployed — the trigger/classifier already
met budget. Studio needs a full restart. Known flagged gap (not silently accepted): the Print Requests
page's own hydration is still unbounded and above the ~20-read hard target for a cold/remount visit —
carried from pass 2, requires explicit owner approval before Wave C signoff.

## 2026-07-25 — Pass 3: live cost-test failures remediated, approved, dev-deployed

All seven owner runtime-test evidence items resolved with source/log proof: AI Review's 1,122-tag mount
read fixed (generated taxonomy for display; lazy service call for tag approval — server-side validation
independently rechecks the full corpus); quota double-call proven working-as-designed (per-purpose server
counters, two different purposes); per-path in-flight sharing added to both apps' generated-asset services
(12-misses-for-4-items eliminated); queue fail-then-succeed proven a legitimate rejection of a
different-show retry via deployed logs, with the two real accounting defects fixed (distinct validation
stages + client-visible failureStage, was null); Clear Request stale UI root-caused to missing read-cache
invalidation and fixed with zero-read local reconciliation; startup ~99 reads attributed (4 server via
push no-op, remainder bounded one-time client hydration); deletion accounting added server-side so the
next controlled test verifies `4 + 2I`/`I + 1` live. Independent review: approved, no required changes.
All builds/53 tests/lint/diff green. Deployed: `queuePortalPrintRequestToShow`,
`deleteEligiblePrintRequest`. Full Portal + Studio local restarts required. Next: narrow owner retest.

## 2026-07-25 — Comprehensive eradication pass 2: independently reviewed, dev-deployed, ready for owner cost test

Full one-pass completion per owner directive. Three parallel source audits resolved all four owner evidence
items: catalog-add/creation/metadata/push proven already fixed in current source (owner traces predate the
unrestarted build); the queue-success 1+4+4 reread was still live and is now fixed (two effect-driven
reloads suppressed via synchronous local-transition refs and a one-shot allocation-load guard); deletion has
an exact formula (`4 + 2I` reads, `I + 1` writes, zero post-delete reads/triggers) with the historical
~1,663-read spike reconstructed to the removed unbounded list reload + full allocation scan. New fixes: wipe
reset no-op skips (repeat wipe = reads only, no per-design trigger invocations), Studio item-summary N+1 →
chunked `in` queries, AI Review failed-taxonomy notice. An independent reviewer audited both passes:
`approved_with_changes`, both findings resolved (one fix, one attributed to pre-existing dirty-worktree
work). All builds/tests/lint/diff-check green (49/49 regression + focused suites). The four changed
Functions (`onPrintRequestItemCreated`, `onShowAllocationCreated`, `deleteEligiblePrintRequest`,
`wipeOperationalTestData`) deployed to fresh-prints-dev under the pass-2 authorization. No rules/index/App
Hosting/CORS/republish/production action. Full report + budget table:
`docs/workflow/reviews/2026-07-25-comprehensive-firestore-eradication-pass-2-report.md`. Next: owner
consolidated cost test after full Studio restart + local Portal restart (`npm run dev:portal` +
`npm run tunnel:portal`; no App Hosting).

## 2026-07-25 — Comprehensive Firestore spike eradication (narrowed 5-item scope) ready for approval

An owner-issued comprehensive 12-task/40-test Firestore audit prompt was narrowed to five evidence-backed
fixes after full required reading and a parallelized four-pass operation inventory across Portal, Studio, and
Functions found most of the requested scope re-audits already-correct, owner-approved architecture with no
new regression evidence. Implemented under a self-reviewed Plan/Review amendment: (1) Studio AI Review's
category filter now reads the existing generated client-safe taxonomy snapshot instead of unconditionally
querying Firestore on every mount; (2) Studio's per-request delete/archive reconciles the affected row locally
instead of a full unbounded list reload plus N+1 item-summary reload; (3) Portal's `createPrintRequest` no
longer unconditionally rereads the customer profile after every working-request creation, verified safe since
the one UI reader of the touched field is a loading-state fallback already superseded by the existing list
reload; (4) `onPrintRequestItemCreated`/`onShowAllocationCreated` gained a transactional idempotency guard
against Cloud Functions CloudEvent redelivery double-counting popularity fields — a correctness gap not
previously identified; (5) `deleteEligiblePrintRequest`'s single-request hard-delete flow no longer runs a
redundant third preview computation, dropping reads from 3x to 2x base preview cost for one delete. This last
finding corrects the original task prompt's own assumption: the owner's reported 1,663-read single-request
deletion spike almost certainly came from this triple-preview pattern in the real per-request delete dialog,
not from the separate `wipeOperationalTestData` bulk-wipe tool the prompt's Task 8 had assumed — that tool's
own real, separate full-collection-scan defect is documented but explicitly deferred as dev-only,
owner-triggered, and outside normal-operation budgets.

4 new focused tests pass; existing regression suites for adjacent areas all pass; Functions build, Portal
typecheck/build, full Studio build, changed-file lint (10 files, zero warnings), and diff check all exit 0. 5
pre-existing unrelated DPI/print-sizing test failures confirmed via `git stash` to predate this pass. No
deploy, republish, rules, or production action occurred.

Owner approval required: redeploy `onPrintRequestItemCreated`, `onShowAllocationCreated`, and
`deleteEligiblePrintRequest` to `fresh-prints-dev` (items 4-5 only); full Studio restart and local Portal
rebuild/restart (`npm run dev:portal`, no App Hosting) for items 1-3. Full report and consolidated owner
retest checklist:
`docs/workflow/reviews/2026-07-24-comprehensive-firestore-eradication-test-report.md`.

## 2026-07-24 — Portal show-queue submission remediation ready for approval

The three queue calls were separate sequential entries through the sole acknowledgment handler, not
automatic/server retries. The first included a cold Function start. Revision `00028-ruk` omitted
failure-stage logging, so the two historical precondition reasons remain unknowable without
guessing.

One auth/request/show-scoped Promise now owns submissions; the hook locks synchronously and safely
permits retry after rejection. Cheap request/show validation precedes corpus reads, and exact
sanitized accounting was added. Catalog-add no longer rereads each returned item. Quota startup
calls share the existing 45-second window. Queue success removes all six observed immediate reload
families through local reconciliation while preserving authoritative later refreshes.

Focused tests 20/20, Portal typecheck/build, Functions build, lint, and diff check pass. No
deployment occurred. Pending owner approval: the queue and catalog-add dev Functions plus Portal
App Hosting, then the documented double-click/failure/idle retest.

## 2026-07-24 — Residual Portal server Firestore remediation ready for owner approval

The exact 02:34–02:43 UTC invocation graph is now known. Ten catalog adds arrived as two concurrent
five-call groups against one parent request, causing the deployed transaction to reread its parent
and growing item query on retries. Ten item-created analytics triggers, three clear calls, and one
explicit show-picker call were the only other unaccounted Firestore-capable requests. Push and
metadata account for 13 exact server reads. All nine deletes belong to the three clear calls; the
old uninstrumented revision cannot prove their per-call split. All catalog snapshot triggers were
operational zero-read/zero-write skips, and no legacy ready-design metadata query ran.

Portal now serializes same-request catalog mutations. Scoped development accounting measures
transaction attempts and returned documents. The analytics trigger removes its redundant existence
read; an empty clear is a zero-write/delete no-op; clear and show-picker paths report exact aggregate
counts. Focused tests 6/6, Functions build, Portal build/typecheck, and changed-file lint pass.

No deployment or production action occurred. Pending approval: rebuild/restart the Portal dev
revision and deploy only `addPortalCatalogDesignToPrintRequest`,
`clearPortalWorkingPrintRequest`, `onPrintRequestItemCreated`, and
`listPortalAllocatableShows`, then perform the documented isolated five-minute retest.

## 2026-07-24 — Portal print-request remediation ready for owner retest

The four-item request spike was caused by overlapping shell, Current Request, route-detail,
allocation, and duplicate design-summary loaders. Portal request reads now share an auth-scoped,
bounded 30-second service cache with in-flight dedupe, shell priming, rejection eviction, mutation
invalidation, and stale-completion protection. Route allocation math reuses loaded items. Request
cards resolve generated public card buckets first with an explicit trace before bounded Firestore
fallback; the route's second resolver is removed and late item IDs rerun generated resolution, fixing
first-navigation generic cards.

The Firebase Debug popup keeps its sanitized pre-refresh segment, reconnects to a refreshed owner,
and copies a versioned multi-segment report with an owner-refresh boundary. The exact 14 writes are:
2 working-request creation writes + four item/parent pairs + four design-analytics trigger writes.
Dev accounting now records the sanitized write classes. Portal typecheck/build, Functions build,
focused tests, lint, and diff check pass. No deployment or production action occurred; owner Portal
print-request retest is next.

## 2026-07-24 — Portal metadata read reduction ready for deployment approval

Portal R-015 remains passed. Global social metadata now follows the existing one-hour freshness
rule with bounded/in-flight shared caching. Library mode uses the already-published generated
newest-card page rather than reading 40 designs from Firestore: expected cache-hit/library-miss/
logo-miss Firestore reads are 0/1/2 respectively. Function accounting is aggregate and sanitized.

Push session sync reuses the current FCM token; unchanged subscriptions skip the current write;
older-sibling reconciliation stays bounded at 25 with aggregate accounting. The remaining audited
Portal Firebase SDK calls now have service-level tracer lifecycle coverage, with a static coverage
test confirming the surface and the continued absence of `addDoc`/`runTransaction`.

No deploy, republish, rebuild, rules, or production action occurred. Pending owner approval:
`getPortalGlobalOpenGraph`, `registerWebPushSubscription`, and Portal App Hosting in dev.

## 2026-07-24 — Portal R-015 passed; residual reads attributed to server metadata

The live generated-catalog retest passed with an active report showing zero client Firestore reads,
writes, listeners, callables, fallbacks, and errors. Generated success and Storage activity were
present. R-015 stays closed.

The dominant residual Console reads are repeated `getPortalGlobalOpenGraph` executions from Next
metadata loading. Each library-mode execution reads one settings document plus up to 40 ready
designs; seven retained executions in the requested UTC interval account for up to 287 server reads
that the browser tracer cannot see. A push-subscription execution immediately before the interval
can explain one two-write bucket, but the remaining two writes are not attributable from logs.

The Portal SDK audit found coverage gaps. Brand-logo listener tracing and notification
acknowledgement-write tracing were added. Remaining feature/action-only gaps and exact isolated
retest steps are documented in
`docs/workflow/reviews/2026-07-24-portal-residual-firestore-attribution-report.md`. No deploy,
republish, rules, generated-asset, or production action occurred.

## 2026-07-24 — Portal R-015 generated-first correction ready for owner retest

The attributable Portal report showed legacy catalog pages/counts running concurrently with healthy
generated assets (166 returned documents; 171 approximate billable reads) and false debug popup
disconnects caused by a three-second background-timer heartbeat.

Every normal Portal catalog mode now starts generated-first with no speculative Firestore query or
count. Filtered/discovery failures fail closed; only plain browse may use the approved bounded page
after terminal generated failure and a fallback trace. The independent Discover count and redundant
print-limit focus/visibility reads are removed. Popup connection survives focus/visibility/long-idle
changes and becomes unavailable only on explicit owner close/refresh (or initial handshake failure).

Portal typecheck/build, focused tests 40/40, changed-file lint, and diff check pass. No deployment,
republish, rules, Functions, generated-asset, or production action occurred. Next checkpoint: owner
Portal R-015 retest with a newly built/restarted Portal renderer.

## 2026-07-24 — Portal Firebase Debug moved to a separate browser window

The owner’s Portal R-015/idle report was inactive (`startedAtIso: null`) because the shortcut opened
the in-page UI without starting the tracer. The normal eligible Portal tab now starts and owns the
trace independently and publishes sanitized snapshots to one named 485 px `/firebase-debug` popup
over `BroadcastChannel`. Reset/enable/disable return to the main tab; popup closure preserves the
session; owner refresh replaces its identity; direct/stale access fails closed; inactive reports are
explicitly labeled.

Portal typecheck/build, focused tests 21/21, changed-file lint, and diff check pass. No browser was
available for live automation, so owner two-window testing is next. The earlier 223-read and idle
spikes remain unattributed and must not be diagnosed from the invalid empty report.

## 2026-07-24 — Studio background-edit remediation signed off

**Owner verdict: PASS WITH NOTES.** The isolated test passed immediate card refresh, route-remount
persistence, immutable created-date ordering, generated healthy-path loading, zero broad taxonomy/
ready-design client reads, and targeted card-only publication without the prior approximately
1,221-read full pass. Firebase Console measured 3 reads/1 write; Studio traced the one approved
authoritative editor-opening read and one successful write; the targeted Function measured zero
Firestore reads. Two additional aggregate Console reads remain unattributed and non-blocking.

The separate restart-inclusive 69-read/0-write Console minute included Studio startup and Inbox
loading and does not replace the isolated measurement. This closes only the Studio generated-catalog
background-edit and targeted-publication remediation. Wave C remains open; next is the owner’s live
Portal dynamic AND-tag narrowing retest (R-015), followed by the remaining consolidated Wave C QA.

## 2026-07-24 — Targeted publication live attribution and bounded accounting

The 19:01 UTC owner edit produced exactly one `onPortalCatalogSnapshotSourceWritten` execution:
`card-only`, targeted, pass 1, HTTP 200, 1,416 ms. Its deployed accounting reported zero
ready-design, category, tag, and coordination Firestore reads. No full publisher, Firestore
transaction, retry, duplicate trigger, concurrent publication, or other Function execution appeared
in the inspected minute. The targeted Function therefore accounts for zero of the Console's
approximate 110 reads; Studio accounts for its one authoritative editor-opening read. The remaining
rounded reads cannot be attributed to a caller from the available aggregate graph/logs without
guessing.

Dev accounting separates manifest reads/writes, override reads, transaction attempts,
precondition retries, and Storage download/write/metadata operations. Identical duplicate delivery
is an idempotent no-op and CloudEvent time makes publication metadata deterministic. Concurrency
safety, immutable assets, and the three-attempt retry bound remain. Functions build, 55 focused
tests, changed-file lint, and diff check passed; the subsequent isolated owner retest is signed off
above.

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-25** (`firestore-usage-efficiency-wave-c` — comprehensive Firestore
> eradication narrowed-scope pass ready for owner Functions redeploy + restart + retest; Portal
> separate debug window and Studio background-edit remediation remain signed off/pending as before)

---

## At a Glance

| Field | Value |
|-------|-------|
| **Active managed goal** | `firestore-usage-efficiency-wave-c` |
| **Phase** | Owner QA — Studio remediation signed off; comprehensive eradication pass (5-item scope) implemented, pending Functions redeploy + restart + retest; Wave C remains open |
| **Human checkpoint** | **yes — redeploy 3 Functions + restart Studio/Portal + retest 5-item scope, then Portal separate debug-window retest, then R-015** |
| **Prior goals** | `firestore-usage-efficiency`, `portal-seo-foundations`, and `portal-how-to-faq` DONE |
| **DONE** | **no** |

> Latest implementation: Studio's authoritative saved-card override now lives in a service-scoped
> authenticated session rather than route component state, survives `/designs` unmount/remount,
> preserves `createdAtMs`, overlays stale generated assets, and clears only when generated public
> fields match, status leaves ready, or auth scope ends. The design trigger classifies card-only,
> index/filter, and operational changes. Card-only writes publish an immutable content-addressed
> override asset from the event payload with generation-preconditioned manifest merge/retry and
> zero corpus queries; operational-only writes skip publication; index/filter changes retain the
> full publisher. The isolated owner retest passed with one traced client read/write and zero
> targeted-Function Firestore reads. Focused tests 91/91 and builds/typecheck/lint/diff pass.

> Small debug-window usability update: its default width is now 485 px, it opens directly beside
> Studio on the same monitor when screen space permits (right first, then left), and wide report
> tables scroll inside the fixed-width panel. Placement/lifecycle tests 9/9 and Studio build pass.

> Latest correction: the edit modal discarded the persisted `Design` returned by `updateDesign`,
> then the page performed a second read, patched only generated index fields, and deleted the
> visible card. Since visible IDs did not change, resolution did not rerun; the card disappeared and
> the service cache still held its stale background. The returned save object now passes through
> explicit generated entry/card mappers, preserving `createdAtMs` while updating all card-visible
> metadata immediately. Only the affected bucket is invalidated. Bucket parsing/materialization is
> memoized with duplicate and concurrent in-flight reuse. Sanitized reconciliation traces contain
> an opaque design hash and booleans only.
>
> Read-only dev logs show one snapshot-trigger execution at 18:22:17 UTC, HTTP 200 after 33.8 s,
> with retry disabled and no other Function in that minute. Logs lack query counts, so exact
> attribution of the Console's approximate 669 reads remains `[NEEDS SERVER TRACE CHECK]`. Current
> code reads ready designs plus active categories and approved tags once per publication pass, with
> coordination reads; background color is an intentional public card field. No Functions or
> publication architecture changed.

> Latest owner retest reached the healthy generated asset path but exposed a renderer crash:
> generated ready-index filter records were passed to the Firestore comparator, which called
> `createdAt.toMillis()` even though generated records carry numeric `createdAtMs`. The page now
> sorts healthy generated results through an explicit numeric boundary (`createdAtMs DESC`, design
> ID DESC tiebreaker) and reserves Timestamp sorting for archived/bounded-fallback Firestore
> records. Missing sort data is placed last and cannot crash. The focused generated-sort/load/
> fallback suite is 30/30; changed-file lint and Studio renderer/main/preload build pass. No error
> boundary was added because the architecture has no matching route-level pattern and the root bug
> is fixed directly. No deploy, republish, snapshot rebuild, or production action occurred.

> Post-publication owner Portal QA found two regressions (tag modal, "BEST" search pagination) plus a
> Firestore read spike. A review pass found the first fix's Firestore fallback was still unbounded and
> its search fix used the wrong order (alphabetical instead of the established "newest first"). Both
> corrected: the Firestore tag fallback was removed entirely (owner decision — no correct bounded
> alternative exists) for a graceful "unavailable" state; a new pure `portalCatalogBrowseOrder`
> preserves the correct order through search pagination. An inconclusive Portal build report was
> corrected (tool-timeout artifact, not a real failure — confirmed exit 0).
>
> Owner then republished generation 9 and re-ran local QA: **still FAIL**, same two symptoms plus the
> read spike. Diagnosed via a live outside-browser Node script (using the real shared parsers) that
> generation 9's manifest/tag-facet/search-shard assets are all correct; the owner then supplied the
> exact browser console error, confirming the real blocker is **Storage bucket CORS**
> (`https://myprintrequest.dev` blocked reading `firebasestorage.googleapis.com` responses). Confirmed
> the exact live bucket (`gs://fresh-prints-dev.firebasestorage.app`; the legacy `.appspot.com` alias
> 404s) and found the repo's pre-existing, unrelated CORS file/doc (from an unused Assisted Creation
> proof-download effort) targeted the wrong bucket name entirely — corrected both to the right bucket
> and a narrower GET/HEAD-only config. Independently found and fixed a second real defect: Portal's
> search/multi-tag code silently fell through to an unrelated, unfiltered Firestore page on any
> generated-asset failure (CORS included) — removed that fallback entirely for a graceful
> "unavailable" state; normal unfiltered browse keeps its separate, already-approved bounded fallback.
> Reviewed Studio's actual search/tag-filter code for parity and found Portal's existing ordering,
> substring-search, and tag-count conventions already correctly match it — no parity defects found.
> `gcloud` isn't installed in this environment, so the live CORS-inspection command is provided for the
> owner/CI rather than run here. Awaiting owner approval to apply the corrected
> bucket CORS configuration (`gcloud storage buckets update
> gs://fresh-prints-dev.firebasestorage.app --cors-file=storage.cors.json`), then a real browser
> retest. No Functions/Rules/republish action is required for this pass's fixes. The Portal
> dev-consumer deployment from an earlier checkpoint remains separately pending.
>
> **Update:** owner applied the CORS fix — generated Portal assets now load in the browser, and
> searching "best" correctly returns both matches immediately. New refinement requested: after
> selecting a tag in the tag modal, unrelated tags stayed visible with stale global counts instead of
> narrowing to the AND-filtered result (a feature gap, not a regression from the earlier fixes).
> Investigated whether existing generated assets are sufficient (per the task's Option A/B decision
> framework) and concluded yes: the existing per-tag design-ID list asset (already fetched for
> search/filtering) plus existing card-bucket assets (already fetched to render results) give exact
> AND-narrowed co-occurrence counts with zero new generated assets, zero fetch per candidate tag, and
> zero Firestore reads. Implemented `portalCatalogAssetService.listNarrowedTagFacets` with pure,
> unit-tested helpers (`intersectDesignIdLists`/`computeNarrowedTagFacets`), verified against live
> generation-9 data via a standalone diagnostic before writing tests, and wired it into
> `CatalogTagFilterModal`. 7 new tests (99 total). Portal-only fix — no Functions/manifest change, no
> redeploy/republish required. `npm run build:portal` could not be confirmed clean this pass (the
> owner's `dev:portal` was running again, holding `apps/portal/.next` locked — the same file-lock
> contention as the prior pass, not a code defect); typecheck already confirms compile-correctness.
> R-015 remains open pending owner review and retest of this refinement.
>
> **Update (2026-07-24):** owner decided to extend the same low-read generated-catalog architecture
> to Fresh Prints Studio's Design Library, keeping Studio's existing UX (search, category/tag/
> halftone filters, dynamic narrowing, `updatedAt DESC` ordering, 100-page size, request-selection
> mode) completely unchanged — only the data-delivery layer moves off Firestore. Full Plan/Review
> amendment completed and approved: reuse existing public Portal card buckets + client taxonomy; add
> one new compact asset `generated/portal-catalog/v{contentVersion}/studio/ready-index.json`
> (`id/title/description/categoryId/tags/updatedAtMs` per ready design, Studio's own order); Electron
> **main-process IPC transport** (not browser CORS) to avoid packaged Electron's `file://` origin
> risk; archived designs stay entirely Firestore-only (never enter the public asset, matching the
> staff-only security boundary); owner approved making dynamic tag narrowing catalog-wide accurate
> (fixing an existing loaded-pages-only limitation) as an intentional improvement.
>
> Implementation is now complete: new shared types/parser, publisher asset write, a new Electron
> `catalogAsset` IPC bridge (channel registry, main-process handler, preload bridge), a Studio
> consumer service mirroring Portal's cache pattern, a `useGeneratedReadyDesigns` hook, and
> `DesignLibraryPage.tsx` wiring — normal ready browse now sources its design list from the
> generated catalog while reusing Studio's exact existing filter/search/narrowing functions
> unchanged; archived mode, detail/edit (always re-fetches authoritative Firestore data first), and
> request-selection mode are preserved. 19 new tests this pass (138 total in the relevant suite, all
> pass), rules 8/8 (proved the new Storage path needs no rules change), functions/Portal/full-Studio
> builds all exit 0, lint clean (one confirmed pre-existing unrelated lint finding disclosed, not
> introduced by this pass). Developer runtime read-trace verification could not be performed in this
> environment (no Electron/browser automation tooling, no active Studio session) — disclosed
> honestly rather than fabricated; a manual test script is provided. No Functions/Rules/CORS change
> applied. Redeploy of `rebuildCatalogSnapshots`/`onPortalCatalogSnapshotSourceWritten` (same two
> already pending) plus one republish are required before an owner Studio retest.
>
> **Update (2026-07-24):** owner republished generation 38 and independently validated the live
> manifest/ready-index (correct at the time, against the then-current ordering rule). Owner then ran
> Studio QA and found two problems: (1) the Design Library visibly reshuffled when a design was
> added to a print request, allocated to a show, or edited; (2) ~1,300 Firestore reads during the
> session. Root cause of (1): the generated ordering field (`updatedAtMs`) is bumped by exactly those
> writes. **Owner decided ordering must use the immutable `createdAt` field instead.** Investigated
> every `designs` document-creation path in the repo — both write `createdAt` unconditionally via
> `serverTimestamp()`; Firestore rules forbid changing it on update; no evidence any legacy design is
> missing it — so no backfill was needed. Changed the generated ready-index's ordering field from
> `updatedAtMs` to `createdAtMs` (field rename, same schema version, zero Portal impact) and added 10
> regression tests proving request/show/edit activity never moves a design and a newly created
> design always appears first. Attributed the ~1,300 reads via direct code inspection (no live
> session/automation tooling available): reconciles almost exactly to `useCatalogTags`'s full
> tag-collection pagination (~1,122 reads at the real dev corpus) plus `useCategories()`'s bounded
> load (≤200 reads) — both pre-existing, unconditional on every Design Library mount, and unchanged
> since before the Studio generated-catalog work began; not a new regression. Surfaced (did not
> unilaterally fix) that `useCategories()` should already have been converted to the generated
> client-safe taxonomy per the original Plan text — a real gap worth up to 200 fewer reads, but
> outside this specific task's scope. 148/148 tests pass, rules 8/8 unaffected, functions/Studio
> builds exit 0. No Functions/Rules/CORS applied. The same two Functions need a further redeploy
> (live generation 38 still has the old ordering) plus one more republish before an owner retest.
>
> **Update (2026-07-24):** owner directed closing the surfaced taxonomy read gap. Converted
> `DesignLibraryPage.tsx`'s normal-mode categories/tags to the existing, already-published
> `generated/catalog-reference/**` client-safe taxonomy snapshot — the same one Portal already
> publishes/consumes. No new asset, no manifest/publisher change, **no Functions redeploy or
> republish required for this fix**. Confirmed by direct inspection that only `id/name/sortOrder/
> isActive`/`id/name/aliases/status` are ever read by the Design Library's own filter/dropdown/
> tag-picker logic — `CategoryManagementModal`/`TagManagementModal` (real management flows) stay on
> full Firestore-backed data unchanged. One owner-approved narrow behavior change (via
> `AskUserQuestion`): tag-modal search no longer matches each tag's `preferredWhen` guidance text
> (server-only, correctly excluded from the public snapshot) — name/alias matching is unaffected. 7
> new tests (155 total), rules 8/8 unaffected, all builds exit 0. The `createdAt`-ordering fix still
> needs its own Functions redeploy + republish; both fixes ship together in the same Studio build.
>
> **Update (2026-07-24):** owner directed building a separate, development-only Firebase Debug panel
> (Ctrl+Shift+F in both Studio and Portal, restricted to `fresh-prints-dev` + development builds only)
> to capture and attribute real Firebase activity — reads by collection/query/route/returned-doc-count,
> listener attach/emit, writes, callables, Storage JSON requests, cache hits/misses/fallbacks, route
> changes, session totals, Copy Debug Report JSON — **before** guessing at the Design Library
> card-refresh bug, the ordering-reshuffle-on-save bug, or the ~1,300-read spike. Explicit instruction:
> implement the tracker and run the workflow, don't assert root cause from code alone. Extended the
> existing shared tracer (not a new framework) with write/callable/Storage-asset/route/action
> instrumentation; added a `fresh-prints-dev`-only + dev-build-only gate; built the Ctrl+Shift+F
> shortcut, a pure report formatter, and a live-polling panel UI for both apps; wired real
> instrumentation into both apps' generated Storage catalog-asset services plus Studio's design-save
> write path and Design Library save action (callable-site wrapping deliberately deferred as
> out-of-scope this pass). Found and fixed one render-purity defect during review (a trace-context call
> in Studio's `AppShell` render body, corrected to `useLayoutEffect`). 17/17 focused tests pass (9 new).
> Did **not** fix either suspected bug or attribute the read spike — this environment has no
> Electron/browser automation tooling to run the required 10-step diagnostic workflow, so that step
> needs the owner: launch Studio, open the panel, run the workflow, and share the Copy Debug Report
> JSON so the four required findings can come from real captured data. No deploy, redeploy, republish,
> or `rebuildCatalogSnapshots` run this pass. The `createdAt`-ordering fix's own pending redeploy +
> republish (above) is unaffected and still separately required.
>
> **Update (2026-07-24):** owner correctly rejected the panel as not ready for testing — callable
> tracing wasn't wired to real call sites, and write tracing covered only one file. Required before any
> owner checkpoint: centralized callable/write tracing across Studio and Portal, kept in
> services/hooks (never components) per the coding standards' layer rules, each event recording
> route/action/service/operation/success-failure/duration/sanitized counts, no document contents or
> payloads ever recorded, and tests proving callables/writes appear in the report. Added `durationMs`/
> `success` to the tracer schema; new shared `runTracedCallable`/`runTracedWrite` wrapper primitives
> and per-app `callTracedFunction` factories; converted **every** real callable call site across both
> apps (32 files — confirmed via grep that zero raw `httpsCallable(` usage remains outside the two
> wrapper files) and wired `runTracedWrite` into every remaining Firestore write in Design Library,
> design editing, print requests, show allocations, and staff inbox (8 Studio service files, multi-doc
> batch/transaction write counts verified against actual code, not guessed). Enriched the report/panel
> with success/failure/average-duration on callables and a new by-write-kind breakdown. 21/21 focused
> tracer tests pass (4 new). Reviewed every converted file directly rather than trusting the
> implementing pass's self-report: confirmed zero tracing calls in any component file, zero
> payload/document leakage into trace metadata. Ran the full project-wide focused suite: Studio
> 358/363 (5 pre-existing unrelated DPI-sizing failures, confirmed via `git stash` to predate this
> pass), Portal 160/160, shared 809/810 (1 pre-existing unrelated `firestore.rules` alignment
> failure) — no new failures introduced. Still did not fix either suspected bug, attribute the read
> spike, deploy, redeploy, republish, or run `rebuildCatalogSnapshots`. Awaiting the owner's live
> 10-step diagnostic workflow + Copy Debug Report.

---

> **Update (2026-07-24 — separate Studio debug window):** the in-renderer overlay was not usable for
> the owner workflow because it covered Studio navigation. A narrow Plan/Formal Review amendment was
> added and approved for the required IPC boundary. Ctrl+Shift+F now requests a singleton Electron
> debug window; repeat presses restore/focus it. The main renderer remains authoritative for the
> trace session and publishes sanitized snapshots through preload → Electron main → debug renderer.
> Reset and enable/disable commands return to the main renderer; closing/reopening the debug window
> does not clear the session. The debug renderer mounts no Studio routes. Electron main independently
> enforces unpackaged development runtime, exact `fresh-prints-dev`, and retained-main-window sender.
> Focused debug/tracer suite 34/34, Studio Vite renderer/main/preload build, Portal override
> typecheck, changed-file ESLint, and diff check pass. Full standard typecheck remains blocked by the
> known TS5103 setting; Studio's approved override reports only pre-existing unrelated errors. Portal
> build timed out after 124 seconds without output and is recorded as inconclusive. No deployment,
> republish, snapshot rebuild, production action, or bug/read-spike diagnosis occurred.

> **Update (2026-07-24 — live-report corrections):** owner evidence showed the panel's old `Reads`
> total was SDK operation count (5 operations versus 1,221 returned documents) and that normal
> Design Library startup launched Firestore categories, all 1,122 tags, and an 81-design page in
> parallel with generated assets. Code inspection verified unconditional legacy hooks—not merely a
> stale-build theory or premature fallback. Report schema v2 now separates read operations,
> documents returned, approximate billable document reads, listener initial documents, and listener
> update documents; minimum one-document query charges are applied where observable and limitations
> are explicit. Design Library now disables legacy category/tag/ready-design hooks on healthy
> generated browse; fallbacks begin only after corresponding generated failures; archived mode is
> unchanged. Focused 30/30, Studio build, Portal override typecheck, lint, and diff check pass. No
> deploy, republish, rebuild, production action, or unrelated bug fix.

> **Update (2026-07-24 — generated-first-v3 runtime audit):** failed owner retest still showed the
> exact pre-gate 1,221-document pattern and no fallback event. Repo-wide caller inspection found only
> one routed DesignLibraryPage and no selection-mode duplicate. Its current initial/loading policy is
> generated-only. Process inspection found no Studio Vite/Electron process, while the freshly built
> bundle contains the gate markers; local builds cannot update a packaged or already-running Studio.
> Hardened the runtime path with explicit taxonomy `loading/ready/failed/inactive` state, terminal
> failure-only fallback, stale Strict Mode mount cancellation before ready-design fallback, and
> generated success/failure/fallback events carrying `generated-first-v3`. Focused 36/36 and Studio
> build pass; Portal override typecheck, lint, and diff check pass. Owner must fully close Studio,
> stop any old Studio Vite process, run `npm run dev:studio` from this checkout, and verify the report
> contains `generated-first-v3`; its absence proves the wrong renderer is running.

> **Update (2026-07-24 — actual generated failure):** exact-path live verification through
> Electron main's real fetch function and shared parsers passed all four objects (HTTP 200): taxonomy
> manifest/client v8 and Portal manifest/Studio ready-index v40. Both failures shared one renderer
> cause: Node-only `Buffer.byteLength` ran after successful IPC JSON parsing in a context-isolated,
> Node-disabled renderer, before shared schema parsing. Replaced with `TextEncoder`. Added sanitized
> stage/code/status/duration storage completion tracing across URL, IPC, allowlist, HTTP, JSON,
> schema, manifest-path, and ready-index-path stages. Removed normal taxonomy Firestore fallback;
> failure now shows unavailable, while management modals retain deliberate Firestore access. Bounded
> ready-design fallback remains. Focused 39/39, live main-fetch 4/4, Studio build, Portal override
> typecheck, lint, and diff check pass. No deployment or publication action.

> **Update (2026-07-24 — monitor placement):** newly created Firebase Debug windows center on the
> monitor containing the main Studio window. Existing debug windows retain owner placement when
> refocused. Placement/lifecycle tests 7/7 and Studio build pass.

## Workflow Snapshot

```txt
Mode:           managed-phase
Active:         firestore-usage-efficiency-wave-c
Phase:          owner QA; comprehensive Firestore eradication (5-item scope) implemented, pending
                redeploy/restart/retest; Studio background-edit remediation signed off
Prior closed:   firestore-usage-efficiency; portal-seo-foundations; portal-how-to-faq
Human:          yes — redeploy onPrintRequestItemCreated/onShowAllocationCreated/
                deleteEligiblePrintRequest, restart Studio + Portal, retest 5-item scope; then
                Portal dynamic AND-tag narrowing retest (R-015)
Next:           Owner Functions redeploy + restart + comprehensive-eradication retest, then Portal
                R-015 retest, then remaining consolidated Wave C QA
Queued later:   portal-google-analytics; production-release
```

## Active: firestore-usage-efficiency-wave-c

- Plan: `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md`
- Highest-priority gate: prove and contain reads that continue while idle before snapshot/catalog work.
- Static findings: Studio/Portal/tunnel processes were running; AI reference cache is 60s without
  in-flight dedupe; Studio Design Library uses `loadAll`; Portal search/multi-tag full-hydrates;
  Discover uses 4x80; global Staff Inbox listeners are unbounded.
- Review: `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md`
  (`approved_with_changes`).
- Plan amended with private/public Storage boundaries, exact publication coordinator, generated
  search now, Studio `updatedAt DESC` pagination, numeric budgets, and deployment checkpoints.
- Phase 0 default-off client and AI Functions diagnostics are implemented and locally validated.
  The static operation inventory and owner shutdown instructions are in
  `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-phase-0-operation-inventory.md`
  and `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-phase-0-isolation-checkpoint.md`.
- Changed-file lint, Portal typecheck/build, Functions build, and focused tracer tests pass.
  Studio build remains blocked by known TS5103; repository-wide lint retains pre-existing debt.
- Evidence-backed Internal Gate 1 containment is implemented: bounded Design Library, shared
  long-lived user/project-scoped taxonomy/design dedupe, AI active-page/count containment, Print
  Requests design-ID loading, Staff Inbox bounds, and corrected trace route/pagination correlation.
- The first owner smoke **failed**: rounded Firebase moved `34K` / `67.9%` to `36K` / `71.7%`
  across the entire run, and Print Requests emitted Chromium navigation throttling then froze.
  Its trace also proved Inbox idle quiet and listeners stable with no duplicates.
- Print Requests primary status routing has one URL authority. An authenticated controlled run
  completed 20 transitions, populated/empty tabs, and back/forward with no warning, freeze, reload,
  loop, or error. A 60-second Inbox idle produced zero events and listeners stayed 7 -> 7.
- The owner then clarified the primary tabs pass but Working's secondary Active/Stale controls
  reverted after selecting a request in Empty/All. Source proved a deep-link reveal effect forced
  the local filter back to All to preserve the old request.
- Working filters are now canonical URL state. A click preserves a compatible request, otherwise
  selects the first destination request or clears selection, and creates exactly one history entry.
  Passive normalization preserves filter intent.
- Authenticated Electron passed Empty/All → Active/Stale, Back/Forward, and route exit with one
  commit per click, zero reversion, warnings, errors, freezes, or catalog/taxonomy starts.
- 46/46 focused tests, changed-file lint, and Studio renderer/main/preload Vite build pass.
- Owner passed all six corrected Working-filter checks. Phase 0 verdict is `passed_with_notes`; the
  note is limited to Firebase dashboard rounding/reporting delay during the earlier broad smoke.
- Remaining reviewed Wave C local implementation is complete. The versioned AI/client taxonomy
  snapshots, Portal Discover/search/tag/card assets, 40-card paging, design-ID cache, progress-poll
  containment, security rules, rollback flags, and deployment records are implemented.
- Local results: 69/69+ combined tests pass; Functions, Portal, Studio, lint, and diff checks pass.
  The official rules harness was executed on a Java 21-equipped environment (user-scoped portable
  JDK, no admin rights) after two missing narrow assertions were added; 6/6 rules tests pass. All 24
  npm audit findings were reviewed; none were introduced by Wave C. A pre-existing `sharp` EXIF DoS
  finding (reachable via customer uploads) is tracked as `docs/project/RISK_REGISTER.md` R-012 and is
  not treated as a deployment blocker (bounded impact, requires its own major-version upgrade).
- Owner approved and ran the first dev deployment. First `rebuildCatalogSnapshots` initialization
  attempt failed twice with HTTP 500. Root cause proven via `firebase functions:log`:
  `snapshot-asset-budget-exceeded` on the AI catalog reference snapshot — the real dev tag corpus
  (~1,122 approved tags) serializes to exactly 295,152 bytes (~288.2 KB), over the original 256 KiB
  budget; the client-safe snapshot (~161 KB) stays under budget. This was R-013, a measured
  architecture conflict requiring an explicit owner decision.
- Owner decision: raise only the AI-private snapshot budget to 512 KiB (524,288 bytes) — no
  sharding, no other budget/field change. Implemented in `publishCatalogSnapshots.ts` alongside a
  non-blocking 80%-of-512-KiB (409,600-byte) diagnostic warning for future growth. The real dev-scale
  payload (295,152 bytes, 56.3% of the new ceiling) now fits with headroom and does not trigger the
  warning. The existing safe error-mapping fix (specific `failed-precondition` instead of opaque
  `INTERNAL`) is preserved. Wave C Plan and Formal Review amended in place with the owner decision
  and rationale; ADR-FP-120 amended (not a new ADR). 9 new regression tests added (15 total across
  the two affected files) proving: the dev-scale fixture now publishes; the 80% warning boundary
  behaves correctly; an intentionally oversized fixture still fails safely with the stable code; and
  Portal/public budgets remain untouched. All verification re-run clean (rules 6/6, functions build,
  Portal/Studio builds, 25/25 focused tests, lint, diff check).
- Redeployment scope determined precisely: `rebuildCatalogSnapshots`, `onCategorySnapshotSourceWritten`,
  and `onTagSnapshotSourceWritten` share the changed `publishReference()` logic and need redeploying;
  `onPortalCatalogSnapshotSourceWritten` does not (its `publishPortal()` path is untouched).
  `portal-catalog` publication likely succeeded in the prior failed attempts (no error logged for
  it), still unconfirmed against live state (direct Admin SDK inspection remains blocked by this
  environment's credential-access classifier). No redeploy, retry, initialization, or import
  occurred. R-013 stays open until a live retry succeeds and the resulting AI asset size is recorded.
- Owner redeployed the R-013 fix and retried. The callable returned a second, distinct confirmed
  failure: `{ code: "snapshot/payload-budget-exceeded", kind: "portal-catalog", path:
  "generated/portal-catalog/manifest.json" }`. Measured root cause: the Portal catalog root manifest
  enumerated a full Storage path per tag/category/search-shard/card-bucket/browse-page — at Fresh
  Prints Dev's real scale (~1,122 tags, 18 categories, 202 shards, 128 buckets) this measured
  134,069 bytes (130.9 KB), 4.09x over the 32 KiB budget; `tagPaths` alone was 106,591 bytes (79.5%
  of the total). Opened R-014. Fixed by replacing the enumeration with deterministic path templates
  and bounded count/version metadata (`PortalCatalogManifest` schema bumped 1→2 — manifest shape
  only, every individual generated asset keeps schema version 1); a compact ~1 KB
  `existingShardKeys` list is kept so search-miss behavior (skip a network request for a
  zero-match shard) is unchanged. Corrected manifest measures 2,179 bytes (2.13 KB, 6.6% of budget,
  ~61x smaller). This is recorded as an implementation correction under the already-approved Wave C
  architecture (deterministic addressing for oversized generated assets was already the plan's
  stated principle) — no Plan/Review amendment was required. `publishPortal()` (shared by
  `rebuildCatalogSnapshots` and `onPortalCatalogSnapshotSourceWritten`) changed;
  `onCategorySnapshotSourceWritten`/`onTagSnapshotSourceWritten` did not.
- Owner redeployed both fixes and ran `rebuildCatalogSnapshots` exactly once. Both families
  published successfully at generation 4 (`catalog-reference`: `4-1a810751ceb2b381`;
  `portal-catalog`: `4-e0e5b3ae9fb69797`). Confirmed live via unauthenticated public HTTPS reads
  against the real Storage/Firestore REST endpoints (no credentials needed for public paths): both
  manifests fetched and match the callable result exactly; the AI asset confirmed private (403 on
  read and metadata); client/Portal assets confirmed public; unauthenticated write and
  coordination-doc read confirmed denied; representative Portal assets (Discover, a recent page, a
  real 45-design category filter, a category page, a card bucket at 2,238 bytes, a search shard) all
  confirmed live and correctly addressed via the new templates. Orphaned v1–v3 catalog-reference
  client assets from the earlier failed attempts remain present, harmless, and retained. R-013 and
  R-014 closed in `docs/project/RISK_REGISTER.md`. The Portal catalog manifest is schema version 2;
  the Portal consumer code was updated to match but has not been deployed. Confirmed the exact Portal
  dev deployment command (`firebase deploy --only apphosting --project fresh-prints-dev`) against
  `firebase.json` and `docs/standards/DEPLOYMENT.md`; the generated-snapshot flag
  (`NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS`) defaults to enabled, and the documented rollback
  flag is unchanged. Re-ran Portal typecheck/build, 35/35 focused tests, lint, and diff check — all
  exit 0. Did not deploy Portal, retry snapshot publication, or run the controlled import.
- Owner ran local Portal QA against the live generation-4 snapshots; recorded **FAIL**. Found: tag
  modal showed the complete ~1,122-tag approved taxonomy with no design counts and no zero-result
  exclusion; searching "BEST" showed only 1 of 2 matching designs until Load more; Firestore Product
  Usage rose ~3,600 reads. Root causes diagnosed precisely: `listApprovedTags()`'s generated path had
  no bounded facet/count data source (Wave C removed the pre-Wave-C client-hydration mechanism
  without a generated replacement); its Firestore fallback queried the full `tags` collection
  unbounded; `listMatchingDesigns()` combined candidate ID sets with no deterministic sort before
  slicing into a page, relying on non-guaranteed Set/Firestore iteration order. Fixed: new compact
  `generated/portal-catalog/v{version}/filters/tags-facet.json` asset (tags with ≥1 ready design +
  count, 256 KiB budget) plus an additive `filters.tagFacetPath` manifest field (schema version
  unchanged at 2); rebounded the Firestore fallback to a ready-design scan; new pure
  `planPortalCatalogSearchPage` assembles the complete deterministically-ordered matching ID set
  before pagination (reproduces and fixes the exact "BEST" scenario in a dedicated test). Amended the
  Wave C Plan and Formal Review (new asset + additive field). No rules change needed — existing
  `generated/portal-catalog/{allPaths=**}` already covers the new path, proved by a new test (rules
  suite 7/7, was 6/6). 26 new/updated tests across 5 files; 77/77 focused tests pass. Functions
  build, Portal typecheck, rules, lint, diff check all exit 0; `npm run build:portal` did not
  complete (hung with no error — suspected local dev-server file-lock contention, possibly the
  owner's own active Portal session; left undisturbed rather than guessed at). R-015 opened, not
  closed. Redeployment scope: `rebuildCatalogSnapshots`, `onPortalCatalogSnapshotSourceWritten`
  (unchanged from the prior pass), plus a required fresh republish since the live generation-4
  manifest lacks the new field. Did not redeploy, republish, or run the controlled import; did not
  request further owner QA before the required developer-controlled local retest.
- Owner clarified the Functions were already deployed (do not redeploy again) and asked for remaining
  blockers cleared. Review of the first-pass R-015 fix found two real defects, not just
  under-description: (1) the reported "bounded" Firestore fallback still scanned the entire `tags`
  and `designs` collections unbounded, with no cache/limit; (2) search pagination sorted candidate
  IDs alphabetically by design ID instead of the established "Studio-newest-first" customer-facing
  order (proven from the explicit code comment/convention already in `catalogService.ts`/
  `useCatalogDesigns.ts`). Investigated whether any correct, complete, bounded Firestore mechanism
  exists for tag counts — none does (full scan vs. ~1,122 separate count queries) — asked the owner a
  narrow question rather than inventing an incomplete source; owner chose to remove the Firestore
  fallback entirely for a graceful "Tag filters are unavailable" UI state (implemented via a new
  `error` prop on `CatalogTagFilterModal`). Fixed the ordering defect with a new pure
  `portalCatalogBrowseOrder` (newest-first, design-ID-descending tiebreaker) that every generated
  tag/category/search-term ID list is now built from at publish time, and reworked
  `planPortalCatalogSearchPage` to preserve that order under intersection instead of re-sorting
  alphabetically — verified with a dedicated order-preservation test plus the exact "BEST" regression
  test. Also corrected the prior pass's inconclusive `npm run build:portal` report: re-ran without an
  artificial timeout wrapper and confirmed exit 0 (the build had already succeeded through
  static-page generation before the tool's own cap killed it previously — not a real failure).
  Confirmed via direct grep that `portalCatalogAssetService.ts` has zero Firestore imports at all
  (structural proof of zero Firestore reads on the generated tag/search path). Added 11 new tests (37
  total for R-015; 88 project-wide focused tests pass). Disclosed honestly that this environment has
  no browser-automation tooling to perform the required interactive developer-controlled retest, and
  provided a manual test script for the owner/a human tester instead. All verification re-run clean
  (functions build, Portal typecheck/build, rules 7/7, 88/88 focused tests, lint, diff check, Studio
  build). Determined `rebuildCatalogSnapshots`/`onPortalCatalogSnapshotSourceWritten` need a follow-up
  redeployment since the owner's already-deployed version predates this pass's ordering fix and
  fallback removal. Did not redeploy, republish, or run the controlled import.
- Exact checkpoint:
  `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-dev-deployment-checkpoint.md`.
  Functions/rules deployment, coordination initialization, initial publication, migration/backfill,
  controlled import, Portal dev deployment, and production remain gated.
- Test A: all known Fresh Prints clients/runtimes closed, no other sessions found, and Firebase
  stayed visibly unchanged at `17K` / `34.7%` from 1:54 PM to 2:30 PM CT. This is strong evidence
  against a large repeating closed-state source, but not absolute zero due display rounding and
  Usage reporting delay.
- Cold route trace after remediation: Design Library categories `18`, tags one logical corpus
  (`500 + 500 + 122 = 1,122`), designs `80`; AI Review one active processing page plus three
  aggregate counts; no inactive-page preload and no catalog starts under Inbox/Imports/Show Queue.
- The controlled import remains gated until the dev snapshot deployment/initialization checkpoint,
  initial publication, and post-publication verification are explicitly approved.
- Any OS process shutdown, dev Firebase deploy, rules/index deploy, or snapshot initialization requires
  owner approval/checkpoint.

---

## Just closed: portal-how-to-faq

- Public `/help`: H1 / SEO **FAQ and How To**; nav **Help**; guest browse; Coming soon videos when empty
- Studio Settings CMS → Firestore `settings/portalHelp`; `updatePortalHelpSettings`; seed on **fresh-prints-dev** (8 FAQs)
- Buy-yourself FAQ + Whatnot limits copy; no em dashes; theme picker hidden on `/help`
- Owner manual **PASS** 2026-07-23; signoff `docs/workflow/reviews/2026-07-23-portal-how-to-faq-signoff.md`
- ADRs: FP-117 / FP-118

### Parked / follow-ups

- Add real How To video URLs in Studio when ready
- Production seed of `settings/portalHelp` at `production-release`
- Optional soft-deploy SEO Functions leftovers (prior goal)
- Brand-logo **production** Functions + rules (separate APPROVE)
- B4 / Wave C Firestore efficiency
- Production Portal / Google / email gates unchanged
