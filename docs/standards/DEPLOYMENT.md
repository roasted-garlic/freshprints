# Deployment

> Fresh Prints deployment. **Human approval required for production releases.**

---

## Overview

Fresh Prints consists of:

- **Fresh Prints Studio** — Electron build via `npm run build:studio`
- **Fresh Prints Portal** — Next.js on Firebase App Hosting (`apps/portal`)
- **Firebase backend** — Auth, Firestore, Storage, Cloud Functions

---

## Environments

| Environment | Purpose | URL | Branch / trigger |
|-------------|---------|-----|------------------|
| Local | Development | Studio: Electron dev; Portal: `localhost:3100` | `npm run dev` (both), or `dev:studio` / `dev:portal` |
| Firebase dev | Development backend | `fresh-prints-dev` (`.firebaserc`) | `development` branch; local / manual deploy |
| Production | Live users | Portal App Hosting on `fresh-prints-prod` (`.firebaserc` `production` alias); domain `[TBD — pending DNS connection]` | `production` branch; human approval required for every deploy |

---

## Branch Model (2026-07-30 — supersedes the previous direct-to-`master` policy)

Fresh Prints uses two permanent branches:

| Branch | Purpose |
|--------|---------|
| `development` | Default working branch. All ongoing features, bug fixes, experiments, and development testing happen here. Normally tested against `fresh-prints-dev`. |
| `production` | Exact code approved and deployed to `fresh-prints-prod`. Receives reviewed releases from `development` only — no routine feature development directly on this branch. |

`master` is a **temporary transition fallback** retained after the branch split
(`production-release`, Goal #13) and is not used for ordinary work going forward. It is not deleted
automatically — deletion is its own separate, explicit owner checkpoint (see
`.cursor/workflow/state.md`).

**Previous policy (superseded):** prior to 2026-07-30, all work committed directly to `master` with
no release-branch or CI/CD convention. That policy is superseded by this permanent
`development`/`production` model.

**Branch state as of 2026-07-30 (verified via `git rev-parse`):** `origin/master` and
`origin/production` both point to `aa570aa875d20ba85fd405480a47e6eda59f85b0`; `origin/development`
has since advanced with documentation-only commits; annotated tag `v1.0.0-rc1` marks
`aa570aa875d20ba85fd405480a47e6eda59f85b0` as the release-candidate branch point (not the final
production tag).

### GitHub `production` ruleset status — CONFIRMED ACTIVE (2026-07-30)

**Superseded:** an earlier version of this document reported the ruleset as not enforced because
the repository was private ("Your rulesets won't be enforced on this private repository until you
move to GitHub Team organization account"). **The repository has since been changed to public**,
which resolved that limitation. This was independently verified against the live GitHub API (not
just the owner's report):

```bash
curl https://api.github.com/repos/roasted-garlic/freshprints/rulesets
curl https://api.github.com/repos/roasted-garlic/freshprints/rulesets/<id>
```

confirmed `"enforcement": "active"` for the `production` ruleset, targeting `refs/heads/production`,
with `deletion` (restrict deletions), `non_fast_forward` (block force pushes), and `pull_request`
(`required_approving_review_count: 0` — require PR before merge) rules all present. No status-check,
signed-commit, or linear-history rule is present (correctly disabled); no bypass actors are
configured (empty bypass list).

**Actual, confirmed ruleset configuration:**

| Setting | Value |
|---|---|
| Enforcement status | **Active** (confirmed via GitHub API) |
| Target branch pattern | `production` |
| Restrict deletions | Enabled |
| Block force pushes | Enabled |
| Require a pull request before merging | Enabled |
| Required approvals | 0 |
| Required status checks | Disabled (no CI exists yet) |
| Required signed commits | Disabled |
| Required linear history | Disabled |
| Bypass list | Empty |

`production` is now genuinely protected at the GitHub server level: direct pushes, force-pushes, and
deletion of `production` are rejected by GitHub itself, independent of any local safeguard.

### Public-repository security audit (2026-07-30) — PASS

Because the repository is now public, a full audit was performed across the current working tree
and the complete reachable Git history (all branches, tags, and remotes — 131 total commits) for
credentials, private keys, service-account files, and personal/customer data. **Result: PASS.** No
probable real credential, private key, service-account file, or third-party customer/financial/
legal/personnel data was found anywhere in the current tree or in any historical commit. One
non-blocking finding: a real personal email address (the repository owner's own, used in an
internal dev-debugging note) appears in one workflow document
(`docs/workflow/reviews/2026-07-17-portal-notifications-alert-missing-investigation.md`) —
`[NEEDS OWNER DECISION]` on whether to redact it; it is not a credential and does not block
production release. Full audit method and findings:
`.cursor/workflow/state.md`'s 2026-07-30 log entry for this pass.

### Local pre-push safeguard against direct `production` pushes — now optional (defense-in-depth)

Now that the GitHub ruleset is confirmed active and enforcing at the server level, the local
pre-push hook below is **optional defense-in-depth**, not the primary protection it was documented
as before the ruleset became enforceable.

`.githooks/pre-push` (repository-committed, not a global hook) blocks any local `git push` that
targets `refs/heads/production`, printing a message that points to the pull-request promotion
workflow below. It does **not** block pushes to `development` or to any other branch (feature,
hotfix, etc.). An explicit emergency override exists via the `ALLOW_DIRECT_PRODUCTION_PUSH=1`
environment variable, e.g.:

```bash
ALLOW_DIRECT_PRODUCTION_PUSH=1 git push origin production
```

**This hook only takes effect once `core.hooksPath` is configured to point at `.githooks/`** — that
one-time local configuration step requires separate owner approval (it changes local Git behavior
for this clone) and is not applied automatically by cloning or pulling the repository:

```bash
git config core.hooksPath .githooks
```

Each contributor's clone must run this once. Contains no secret or credential. Works under Git for
Windows (the hook is a POSIX shell script executed by the `sh.exe` bundled with Git for Windows,
the same mechanism Git uses for all hook scripts on Windows).

### Development workflow

1. Start all ordinary work on `development`.
2. Test normal work against `fresh-prints-dev`.
3. Commit and push ongoing work to `origin/development`.
4. Do not perform ordinary feature work on `production`.

### Production release workflow (promotion via pull request, not direct push)

1. Confirm `development` is clean and fully verified.
2. Push `development` (`git push origin development`).
3. Open a GitHub pull request — base: `production`, compare: `development`.
4. Review the complete Files Changed view.
5. Merge the pull request.
6. Check out local `production` (`git switch production`).
7. Pull `origin/production` using fast-forward-only behavior: `git pull --ff-only origin production`.
8. Run the complete release verification suite (see `docs/standards/TESTING.md`) on `production`.
9. Deploy only from `production`.
10. Explicitly target `fresh-prints-prod` in every Firebase production command — see "Firebase
    branch and project separation" below.
11. Perform production smoke testing.
12. Tag the final deployed commit (e.g. `v1.0.0`) only after smoke-test signoff — not before.
13. Return the local working branch to `development` (`git switch development`).

**Do not use direct local pushes to `production` for ordinary releases** — the pre-push safeguard
above blocks this by default; the pull-request path is the only intended promotion mechanism.

### Hotfix workflow

1. Create a temporary hotfix branch from `production`.
2. Make and test the smallest necessary fix.
3. Merge the hotfix into `production`.
4. Deploy and verify.
5. Merge the same hotfix into `development`.
6. Delete the temporary hotfix branch after both merges.

### Firebase branch and project separation

| | Source branch | Firebase project | Every deploy command must include |
|---|---|---|---|
| Development | `development` | `fresh-prints-dev` | `--project fresh-prints-dev` |
| Production | `production` | `fresh-prints-prod` | `--project fresh-prints-prod` |

`.firebaserc` mapping:

```json
{
  "projects": {
    "default": "fresh-prints-dev",
    "production": "fresh-prints-prod"
  }
}
```

The safer default remains `fresh-prints-dev`. **Do not use `firebase use production` as the normal
workflow** — always pass `--project fresh-prints-prod` explicitly on production commands instead of
relying on the CLI's currently-active project, which can silently drift.

**Production Functions deployment remains restricted to the approved explicit allowlist** (99
functions; see `docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`
for the full list and exact command). Excluded from production: `inventoryCatalogImageStorage`,
`wipeOperationalTestData`, `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`,
`ownerDeleteUser`, `backfillPrintRequestQueueTab`. `rebuildCatalogSnapshots` remains included.
**Never** use a bare `firebase deploy --only functions` — always the full explicit
`--only functions:name1,functions:name2,...` list.

### `master` deletion policy (reminder)

`master` must remain until after the first production smoke test passes. It may be deleted only
after **all** of the following are satisfied:

1. GitHub default branch is confirmed as `development`.
2. `production` is confirmed as the live release branch.
3. The first production deployment succeeds.
4. The full production smoke test passes.
5. No Firebase App Hosting setting depends on `master`.
6. No GitHub integration, script, documentation, automation, or external service depends on
   `master`.
7. `development` and `production` are both backed up on `origin`.
8. The owner gives a separate, explicit deletion approval.

### Firebase product enablement in `fresh-prints-prod` — CONFIRMED COMPLETE (2026-07-30)

The owner has completed the initial product-enablement checkpoint. Verified (read-only, this
coding agent performed no Console action or Firebase command):

| Item | Status |
|---|---|
| Firestore | Created, Native mode, location `nam5` |
| Cloud Storage | Default bucket created, `us-central1` |
| Authentication | Enabled; Email/Password + Google providers enabled |
| Production Web App | Registered as `Fresh Prints Portal Production`; classic Firebase Hosting **not** enabled during registration |
| Production web config | Recorded locally in `apps/portal/.env.production.local` — confirmed gitignored (`git check-ignore -v` matches `.gitignore:24`'s `.env.*.local` pattern), confirmed untracked (`git ls-files` empty), confirmed absent from default `git status` output; **no value read or printed by this coding agent** |
| Web Push VAPID key | Generated and recorded in the same local file |
| GA4 | Confirmed still disabled; `NEXT_PUBLIC_GA_MEASUREMENT_ID` remains unset |
| Production data | None created — no user, collection, document, or Storage object |
| **App Hosting backend** | **Created** (`fresh-prints-portal`, `us-central1`, connected to `roasted-garlic/freshprints`, branch `production`, root `apps/portal`) via the Console's "Finish" action — **backend configuration only; no rollout was triggered by this action** |
| First App Hosting release/deployment | **Not performed** — backend shows "Waiting for your first release" |
| Production Portal traffic | **None** |
| Rules/indexes/Functions/Portal/Studio deployment | None occurred |

**Distinction to keep clear going forward:** App Hosting *backend configuration* (repository
connection, branch selection, root directory, region) is a separate, already-completed step from
triggering an actual *release/rollout* (which builds and deploys Portal code and would put
something live). The backend currently existing with no release does not mean Portal is deployed
or reachable — it means the backend object exists and is correctly pointed at the right
repository/branch/root, with nothing built or served yet. Triggering the first release remains its
own separate, later, explicitly-approved checkpoint.

### Approved production deployment order (do not skip ahead)

1. ✅ **Firestore Rules deployment** — **DEPLOYED 2026-07-30.** `firebase deploy --only
   firestore:rules --project fresh-prints-prod`, exit 0, "Deploy complete!" — the first-ever Fresh
   Prints production Firestore Rules deployment. Verify in Console: `fresh-prints-prod` → Firestore
   Database → Rules tab → "Last published" timestamp.
2. ✅ **Storage Rules deployment** — **DEPLOYED 2026-07-30.** `firebase deploy --only storage
   --project fresh-prints-prod`, exit 0, "Deploy complete!" — the first-ever Fresh Prints
   production Storage Rules deployment. Verify in Console: `fresh-prints-prod` → Build → Storage →
   Rules tab → "Last published" timestamp.
3. ✅ **Firestore indexes deployment** — **DEPLOYED 2026-07-30, owner-confirmed Enabled.**
   Remediated via Plan + Formal Review (both `approved`), merged via PR #5 (merge commit
   `21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`, tagged `v1.0.0-rc3`), deployed via
   `firebase deploy --only firestore:indexes --project fresh-prints-prod` (exit 0). All 65 index
   definitions confirmed present remotely with matching content; **owner confirmed via Firebase
   Console that all 65 indexes show `Enabled`** — 0 `Building`, 0 `Error`, 0 field overrides. Step
   complete.
4. ✅ **Secret Manager population** — **COMPLETE 2026-07-30.** Source-level audit of
   `functions/src/lib/secrets.ts` confirmed exactly 4 required secrets: `GEMINI_API_KEY`
   (`enqueueAiEnrichment`), `RESEND_API_KEY` + `BREVO_API_KEY` (both bound by
   `createCustomerWithPortalInvite`/`createTeamUser`/`onEmailDeliveryJobCreated`, per Firebase
   Functions v2's deploy-time secret-declaration requirement — `resolveEmailApiKey()` reads only
   the selected provider's value at runtime), `ETSY_X_API_KEY`
   (`searchEtsyRecommendations`/`staffSearchEtsyRecommendationApiResults`). Confirmed zero
   `OPENAI_API_KEY` references anywhere in source. Confirmed from source that
   `DEFAULT_EMAIL_PROVIDER_SETTINGS` defaults both provider fields to `resend` and does not fail
   closed when `settings/emailProviders` is absent. Owner selected **both** Resend and Brevo for
   launch flexibility; confirmed all four provider credentials available, both email-provider
   sender domains verified, Etsy application access available. Pre-population metadata check
   confirmed all four secrets absent from `fresh-prints-prod` (no overwrite risk). **Owner set all
   four secrets directly via their own terminal** (`firebase functions:secrets:set <NAME>
   --project fresh-prints-prod`, using the command's genuine interactive hidden-value prompt —
   this coding agent's tool environment cannot host that kind of interactive session, so entry was
   correctly handed to the owner rather than attempted through an unsafe workaround). Post-
   population metadata verification (read-only) confirmed all four secrets: version 1, state
   ENABLED. No secret value was ever printed, logged, or exposed. No secret was created in
   `fresh-prints-dev`.
5. ✅ **Cloud Functions deployment** — **COMPLETE 2026-07-30.** Deployed the exact reviewed
   99-function allowlist (see
   `docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`) to
   `fresh-prints-prod`. Phase A non-secret configuration audit found no source change required.
   Created `functions/.env.fresh-prints-prod` (gitignored, same convention as the existing dev
   file) so the CLI's non-interactive mode could resolve the `INVITATION_FROM_EMAIL`/
   `PROOF_NOTICE_FROM_EMAIL` `defineString` params. Owner approved `--force` for one specific,
   reviewed reason: `onEmailDeliveryJobCreated` has a pre-existing, intentional `retry: true`
   trigger option. First bulk-deploy attempt landed 84 of 99 functions; 15 failed with transient
   `429 Quota exceeded` (expected on a brand-new project's first 2nd-gen Functions deploy) plus
   Eventarc permission-propagation delay — verified via authoritative `firebase functions:list
   --json` that all 84 were correctly on the allowlist before retrying. A scoped retry of exactly
   the 15 missing functions succeeded. **Final verification: exactly 99 functions deployed,
   byte-identical to the approved allowlist (zero drift), 0 of the 6 excluded functions present,
   all in `us-central1`, no function in a non-`ACTIVE` state, `rebuildCatalogSnapshots` present**
   (deployed but not yet invoked — invocation is its own Phase D checkpoint). No secret value was
   ever accessed, printed, or logged.
6. ✅ **App Hosting environment-variable configuration** — **COMPLETE 2026-07-30.** Added an `env:`
   block to `apps/portal/apphosting.yaml` with the 7 required `NEXT_PUBLIC_FIREBASE_*` values plus
   `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com`, sourced from the owner's gitignored
   `apps/portal/.env.production.local`. `NEXT_PUBLIC_GA_MEASUREMENT_ID` deliberately stays unset —
   GA4 go-live remains its own separate, later checkpoint. Promoted via PR #6 (merge `9437d4b`).
7. ✅ **First App Hosting Portal release** — **COMPLETE 2026-07-30.** The first-ever Fresh Prints
   production Portal deployment. Two rollout attempts failed with `Missing dependency lock file at
   path '/workspace/apps/portal'` — root cause: Firebase App Hosting's buildpack has official
   monorepo support only for Nx/Turborepo, not this repo's npm-workspaces layout. A first
   hypothesis (`buildCommand`/`runCommand` overrides) was disproven by direct Cloud Build log
   evidence (monorepo detection runs before `buildCommand`). Fixed via a narrow Plan + Formal
   Review (`docs/workflow/plans/2026-07-30-production-release-turborepo-app-hosting-fix-plan.md`)
   adding minimal officially-documented Turborepo support (`turbo` devDependency, root
   `turbo.json`, `packageManager` field), keeping the single root lock file and `rootDir`
   unchanged. Promoted via PR #8 (merge `11ed4ef`). Retried: **"✔ Successfully created a new
   rollout!"** Verified live at
   `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` — homepage HTTP 200,
   correct title, `robots.txt` allow-variant confirming correct host resolution, no dev-project
   strings in served HTML. Automatic rollouts remain disabled.
8. Production Studio build
9. Initial settings and reference-data setup (categories, email provider selection, `rebuildCatalogSnapshots`) ← **current checkpoint**
10. Domain and Authorized Domains configuration
11. Smoke tests
12. GA4 and Search Console (separate later checkpoints)

**The App Hosting backend existing with status "Waiting for your first release" does not change
this order.** Backend configuration (already complete) is not the same as step 7 (the first
release) — four more steps come first after Rules/Storage Rules. Each step requires its own
separate, explicit owner approval; none of this order authorizes skipping ahead.

### Original enablement instructions (retained for reference)

The production Firebase project (`fresh-prints-prod`) originally had **zero products enabled**.
Before any Rules/Functions/App Hosting deploy can occur, the owner needed to enable the following
in the Firebase Console — **this coding agent does not perform Firebase Console actions or run
Firebase commands on the owner's behalf. Instructions only.**

#### 1. Firestore

1. Firebase Console → select project **`fresh-prints-prod`** (top-left project switcher).
2. Left sidebar → **Build** → **Firestore Database**.
3. Click **Create database**.
4. Choose **Native mode** — **do not** choose Datastore mode. **This choice is permanent** —
   Datastore mode cannot later be converted to Native mode.
5. Choose the location: **`nam5`**.

**Recommended location and evidence:** `nam5` (a US multi-region location). This is not a guess —
it is sourced directly from this repository's own `docs/workflow/setup/firestore-setup.md`
(Step 2: "Recommended starting location: `nam5`"), the documented setup path already used for
`fresh-prints-dev`. `nam5` includes `us-central1` as one of its constituent regions, and
`functions/src/lib/portalOgUrls.ts:39` hardcodes `us-central1` into every constructed Cloud
Functions URL — confirming the entire deployed Functions fleet runs in `us-central1` (the Cloud
Functions default region) regardless of project. Using `nam5` for production keeps the same
region relationship to Functions as the existing dev environment while providing Firestore's
higher multi-region availability. **This is proven from current repository documentation and
source, not guessed — no further owner confirmation is required to proceed with `nam5`,** though
the owner may override it if a different location is preferred for other reasons.

6. **This location choice is permanent for the life of the database** — changing it later requires
   exporting all data and recreating the database from scratch.
7. Click **Create**.

**What success looks like:** the Firestore Database page shows an empty database in Native mode,
location `nam5`, with the default `(default)` database name.

#### 2. Cloud Storage

1. Left sidebar → **Build** → **Storage**.
2. Click **Get started**.
3. Review the billing prompt (Blaze is already active for this project — this is expected, not a
   new charge trigger by itself).
4. Choose the Storage location: **`us-central1`**, per this repository's own
   `docs/workflow/setup/firebase-storage-setup.md` (Step 2: "Recommended starting location:
   `us-central1`") — the same documented recommendation already used for `fresh-prints-dev`, and
   the region that directly matches the Functions region above, avoiding Storage-to-Functions
   cross-region latency for derivative generation and file processing.
5. Accept the default (locked-down) security rules prompt if shown — real Storage Rules are
   deployed later, in their own separate checkpoint; this default is a safe placeholder.
6. Click **Done**.

**What success looks like:** the Storage page shows an empty default bucket
(`fresh-prints-prod.firebasestorage.app` or similar) in region `us-central1`, with no objects.

#### 3. Authentication

1. Left sidebar → **Build** → **Authentication** → **Get started**.
2. **Sign-in method** tab → **Email/Password** → click it → toggle **Enable** → **Save**.
3. **Sign-in method** tab → **Google** → click it → toggle **Enable** → select a **support email**
   (use an email the owner controls; this is shown to users during Google sign-in) → **Save**.
4. Google sign-in may prompt Firebase to configure a default OAuth consent screen automatically for
   typical projects — accept the default unless the owner has a specific reason to customize it
   further (custom OAuth consent branding is not required for this checkpoint and is not permanent
   in the sense that it can be edited later in Google Cloud Console → APIs & Services → OAuth
   consent screen, though changes there can affect already-signed-in users).
5. **Leave Authorized Domains unchanged** for now — do not add `myprintrequest.com` yet. Firebase
   automatically includes `localhost` and the project's own default `*.firebaseapp.com`/
   `*.web.app` domains; the production customer domain is added in the separate, later DNS/domain
   checkpoint (per `docs/architecture/BACKEND.md`: "Firebase Authentication Authorized domains must
   include the Portal hosts").

**Do not create any production user accounts in this step.**

#### 4. Production Web App registration

1. Project settings (gear icon, top of left sidebar) → **General** tab.
2. Scroll to **Your apps** → click the Web icon (`</>`).
3. App nickname: **`Fresh Prints Portal Production`**.
4. **Firebase Hosting checkbox: leave unchecked / skip.** This repository uses **Firebase App
   Hosting** (a distinct product from classic Firebase Hosting) for Portal, configured via
   `firebase.json`'s `apphosting` block and deployed separately (App Hosting checkpoint, step 6
   below) — the classic Hosting setup offered during Web App registration is not used by this
   project and would create an unused Hosting site if enabled.
5. Click **Register app**.
6. Firebase displays a config object with these field names: `apiKey`, `authDomain`, `projectId`,
   `storageBucket`, `messagingSenderId`, `appId`.

**Where to record these values — do not paste them into chat, commit messages, or any committed
file.** These are public client-side identifiers, not private credentials by Firebase's own design
(they are safe to embed in a shipped web bundle), but this repository's established convention
keeps all project-specific values — secret or not — out of git via `.env.local`-pattern files
(confirmed: `apps/portal/.env.local` and `apps/studio/.env.local` both already exist, gitignored,
holding the equivalent `fresh-prints-dev` values today).

**`[NEEDS REPO CHECK]` — no `.env.production.local` file exists yet; this exact path is a proposed
convention, not an already-established one.** Recommended (not yet proven in use):
`apps/portal/.env.production.local` for Portal, and a temporary `apps/studio/.env.production.local`
for the one-off production Studio build described earlier in this document. Both filenames match
the root `.gitignore`'s `.env.*.local` pattern (confirmed present at `.gitignore:24`), so either
name is safe from being committed. The owner may choose a different local filename as long as it
matches that gitignore pattern.

#### 5. Web Push certificate

1. Project settings → **Cloud Messaging** tab.
2. Scroll to **Web configuration** → **Web Push certificates**.
3. If none exists yet, click **Generate key pair**.
4. Copy the resulting key into the same local production env file as
   `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.

The public VAPID key is not a private server secret — it is meant to be shipped to the browser —
but store it only in the same local/App-Hosting-configuration location as the rest of the web
config, not in a committed file. **Regenerating this key later invalidates every existing push
subscription** for users who already subscribed, so treat the first generated key as durable once
real customer traffic exists, even though it is technically rotatable.

**Do not create any push subscriptions or send any push notification in this step.**

#### 6. App Hosting backend preparation — CONFIRMED COMPLETE, no rollout triggered

**Resolved (2026-07-30):** the owner completed backend creation using the Console's **Finish**
action. Confirmed values, matching this repository's configuration exactly:

| Setting | Confirmed value | Source |
|---|---|---|
| Firebase project | `fresh-prints-prod` | Owner-confirmed production project |
| GitHub repository | `roasted-garlic/freshprints` | Confirmed connected |
| Live branch | `production` | Matches this goal's branch-model decision |
| Application root | `apps/portal` | Matches `firebase.json`'s `apphosting[0].rootDir: "./apps/portal"` |
| Backend ID | `fresh-prints-portal` | Matches `firebase.json`'s `apphosting[0].backendId` exactly |
| Region | `us-central1` | Owner-confirmed |

**Whether backend creation itself triggers an automatic first rollout — now empirically resolved:
no.** The owner completed backend creation via "Finish" and the backend shows **"Waiting for your
first release"** — confirming backend registration and the first release/rollout are genuinely
separate steps in this Firebase Console/CLI version. Backend *configuration* (repository
connection, branch, root, region) is complete; no build, deploy, or release has occurred; Portal
production traffic remains at zero.

**Triggering the first release remains its own separate, later, explicitly-approved checkpoint** —
not performed in this pass, not authorized by this document.

**Permanent / difficult-to-change choices requiring extra care:**
- Firestore mode (Native vs Datastore) — permanent.
- Firestore location/region (`nam5`, recommended above) — permanent.
- Storage location/region (`us-central1`, recommended above) — effectively permanent.
- Web Push certificate — technically rotatable, but rotating invalidates all existing subscriptions
  once real users exist.
- App Hosting backend ID — not confirmed changeable later without recreating the backend;
  recommend getting it right the first time (`fresh-prints-portal`).

**Not performed by this pass, and not authorized:** Firestore Rules deploy, Storage Rules deploy,
Firestore indexes deploy, Functions deploy, App Hosting's first rollout/deploy, Portal deploy,
Secret Manager configuration, DNS configuration, GA4 configuration, Search Console configuration,
production user/category/show creation, production data seeding, invoking `rebuildCatalogSnapshots`,
the production Studio installer build, any modification to `production`, and deletion of `master`.

---

## Hosting & Infrastructure

| Component | Provider | Notes |
|-----------|----------|-------|
| Desktop app | Electron distributable | `npm run build:studio` → `apps/studio/release/${version}/` |
| Portal web | Firebase App Hosting | `firebase.json` → `apphosting.rootDir: ./apps/portal` |
| Backend | Firebase | See `docs/architecture/FIREBASE.md` |
| Database | Cloud Firestore | Security rules in repo |
| Storage | Firebase Cloud Storage | Security rules in repo |
| Functions | Firebase Cloud Functions | `functions/` |

---

## Build Process

### Desktop Build (Studio)

```bash
npm run build:studio
```

Artifacts: Electron distributable from electron-builder → `apps/studio/release/${version}/` locally (gitignored).

### Portal Build

```bash
npm run build:portal
```

Deploy to Firebase App Hosting (human approval required for production):

```bash
firebase deploy --only apphosting --project fresh-prints-dev
```

Portal backend config: `apps/portal/apphosting.yaml`. App root: `apps/portal` in `firebase.json`.

### Portal Cloud Functions (customer flows)

Deploy after Portal feature changes:

```bash
firebase deploy --only functions:registerCustomer,functions:createPortalPrintRequest,functions:listPortalAllocatableShows,functions:queuePortalPrintRequestToShow,functions:wipeOperationalTestData --project fresh-prints-dev
```

**Test Data Reset (2026-07-10 / policy 2026-07-13):** Deploy `wipeOperationalTestData` to **`fresh-prints-dev` only**. Callable refuses non-allowlisted projects and requires **owner** (not admin). Studio UI is exposed only in **development builds** connected to the allowlisted project — not in production Studio packages.

**Staff inbox acks (2026-07-10):** Deploy `firestore:rules` (new `staffInboxAcks` collection) and redeploy `wipeOperationalTestData` (clears `staffInboxAcks` with print-request / show-queue / upcoming-show wipes) before relying on Done sync or wipe clearing inbox history:

```bash
firebase deploy --only firestore:rules,functions:wipeOperationalTestData --project fresh-prints-dev
```

Adjust function list to match changed exports.

### Provider-neutral email and proof-ready notices

Repository implementation adds `updateEmailProviderSettings` and
`onEmailDeliveryJobCreated`, refactors invitation callables, and changes Firestore rules. No email
deployment is authorized by the implementation phase. After explicit human approval, deploy only
the reviewed dev slice (never bare `--only functions` while the orphan remote function warning
remains):

```bash
firebase deploy --only functions:createTeamUser,functions:createCustomerWithPortalInvite,functions:staffAddAssistedCreationProof,functions:updateEmailProviderSettings,functions:onEmailDeliveryJobCreated,firestore:rules --project fresh-prints-dev
```

Prerequisites: existing `RESEND_API_KEY`; optional `BREVO_API_KEY` when using Brevo (see
`docs/workflow/setup/brevo-email-setup.md`); verified sender
`Fresh Prints <noreply@myprintrequest.com>` for both sender parameters in the selected provider;
canonical dev Portal URL `https://myprintrequest.dev`.

**From-address params (ADR-FP-111):** Code defaults are
`Fresh Prints <noreply@myprintrequest.com>`. If a project-specific
`functions/.env.<projectId>` (e.g. `.env.fresh-prints-dev`) still sets the old
`team@funkyfreshprints.com` values, those override defaults on deploy — update both lines to
the noreply sender before soft-deploy, then redeploy. Do not invent alternate CLI param-set
commands; use dotenv files per Firebase parameterized config. Secret/parameter changes and every
production action require a separate human checkpoint.

### Gitignored build outputs (2026-06-24, paths updated 2026-07-08 for `apps/studio/` move)

These paths are **not tracked** and should not be committed:

| Path | Contents |
|------|----------|
| `apps/studio/dist/` | Vite renderer build |
| `apps/studio/dist-electron/` | Compiled main/preload bundles |
| `apps/studio/release/` | electron-builder installers and unpacked apps |
| `build/` | Local packaging assets (e.g. icons); directory gitignored |

### Packaging icons

`apps/studio/electron-builder.json5` references `icon.ico` (Windows) and `icon.png` (Linux), resolved relative to `apps/studio/`. As of 2026-07-08 neither file exists in the repo (never tracked in git) — electron-builder falls back to its default Electron icon. If custom icons are added, place them at `apps/studio/icon.ico` / `apps/studio/icon.png` or under `apps/studio/build/` (gitignored) `[INFERRED]`.

### Firebase Storage bucket CORS (browser fetch of public generated assets)

Public-read Storage objects (e.g. `generated/portal-catalog/**`, `generated/catalog-reference/manifest.json`/`client/**`)
still need bucket CORS before a browser `fetch`/`getDownloadURL` read from a Portal origin succeeds —
Storage Rules control **who can read an object**; CORS controls **which browser page origins may read
the response body** once fetched. A missing CORS entry surfaces as a browser-console
`Access-Control-Allow-Origin` error even though the same URL succeeds via `curl`/a Node script (no
`Origin` header, not subject to CORS).

Exact dev bucket: `gs://fresh-prints-dev.firebasestorage.app` (confirmed via
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` in `apps/portal/.env.local`, and by direct HTTPS request — the
legacy `fresh-prints-dev.appspot.com` alias 404s the same object path). See
`docs/workflow/setup/firebase-storage-cors.md` and repo-root `storage.cors.json` for the current
config, inspect/apply/verify commands, and history (an earlier CORS effort mistakenly targeted the
`.appspot.com` alias, which had no effect). Applying a bucket CORS change requires human approval
(bucket-config change) — see `docs/workflow/setup/firebase-storage-cors.md` for the exact command.

### Firebase Storage rules deploy

Rules file: `storage.rules` (referenced in `firebase.json`).

Default project: `fresh-prints-dev` (see `.firebaserc`).

```bash
firebase use fresh-prints-dev
firebase deploy --only storage
```

Dry run (compile only, no deploy):

```bash
firebase deploy --only storage --dry-run
```

**Deployed status cannot be confirmed from the repo alone.** Verify in Firebase Console → Storage → Rules (last published time vs repo). Required for Phase 3C signoff condition C1.

Other Firebase deploys (human approval required):

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

**Phase 5B AI pipeline:** Deploy rules first, then **all** functions (preferred after entrypoint/export changes). Set `OPENAI_API_KEY` in Secret Manager before functions deploy — see `FIREBASE.md` (never store in Firestore or desktop Settings).

Verify functions build before deploy:

```bash
npm --prefix functions run build
node -e "console.log(Object.keys(require('./functions')))"
```

Expected exports include `enqueueAiEnrichment` and `onDesignAiEnrichmentQueued`.

---

## Environment Variables

See `docs/architecture/FIREBASE.md`. Never commit secrets.

### Portal SEO foundations (2026-07-22)

| Endpoint | Purpose |
|----------|---------|
| `/robots.txt` | Crawl rules. **Fail closed:** `Disallow: /` unless origin host is `myprintrequest.com` (or `www.`). Dev (`myprintrequest.dev`) and localhost stay non-indexable but the file is still fetchable for testing. |
| `/sitemap.xml` | Static public URLs (`/`, `/catalog`, `/catalog/library`, `/help`) + one `/share/design/{id}` per **ready** design. Revalidates every **3600s (1 hour)** so newly approved designs appear within about an hour when Admin credentials are available. Without Admin (typical local), returns HTTP **200** with static URLs only. |
| `/share/design/{id}` | Canonical **SSR** design landing (image, title, description, category/tags, CTAs). Not meta-only; no automatic client redirect. |
| `/help` | Public **FAQ and How To** (text accordion + How To videos). Content from Firestore `settings/portalHelp` (Studio Settings, owner/admin callable `updatePortalHelpSettings`); missing/empty FAQs → bundled Portal FAQ defaults; empty videos → Coming soon. Guest-browsable under the Portal shell. Indexed only when the production indexing gate is on. |

**Indexing gate:** `isPortalSearchIndexingEnabled()` — only `myprintrequest.com`. Do not enable indexing on `.dev` via env alone. When indexing is enabled, `robots.txt` allow includes `/`, `/catalog`, `/help`, `/share/design`.

**Set on App Hosting:** `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com` (prod) or `https://myprintrequest.dev` (dev) so robots/sitemap/canonical absolute URLs match the public host.

**Crawler image URLs:** Page + OG images use public Function `getPortalOgShareImage` (no auth, no short-lived signed Storage URLs). Do not put signed Storage URLs in sitemap or social meta.

**Search Console:** Deferred to `production-release` for the production domain.

### Portal Open Graph / social meta (2026-07-20; updated 2026-07-22)

Portal site-wide OG / Twitter tags use Next.js `metadataBase` so image URLs are absolute. Root
metadata omits a hard-coded `og:url` so Next.js uses the request path (deep links no longer
advertise the home origin as `og:url`).

| Host | Origin used for absolute OG URLs |
|------|----------------------------------|
| Dev App Hosting | `https://myprintrequest.dev` when `NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev`, or set `NEXT_PUBLIC_PORTAL_ORIGIN` |
| Production | Prefer `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com` on App Hosting; non-dev project ids fall back to that host when `NODE_ENV=production` |
| Local | `http://localhost:3100` (crawlers will not use this for real shares) |

**Site-wide default OG image:** Studio toggle `globalOgImageSource`:
- `library` (default) — interval-rotated ready design via `getPortalGlobalOpenGraph`
- `logo` — uploaded Portal full logo (`settings/brandLogos.portalFull.downloadUrl`) when set; else `/brand/fresh-prints-request-portal-logo.png`

**Global metadata freshness/read policy (2026-07-24):** all root/Login/Register/Help metadata callers
share one global, non-user-specific result for the existing 3600-second revalidation window. Portal
uses a one-entry bounded in-memory cache plus Next fetch revalidation; concurrent requests share one
in-flight load and rejected loads are evicted. `getPortalGlobalOpenGraph` applies the same one-hour
warm-instance cache. Library rotation reads the already-published newest-card page
`generated/portal-catalog/**/recent/page-0.json`, preserving the newest-40 rotation candidate set
without a Firestore design query. Expected measurable Firestore document reads: cache hit 0;
library miss 1 (`settings/portalSocialMeta`); logo miss 2 (social metadata + brand-logo settings).

**Letterbox / crawler images:** Design share and SEO `og:image` / landing `<img>` always use public
`getPortalOgShareImage?designId=…&fit=contain&bg=<hex>` (1200×630 JPEG). Canvas color comes from
the design’s `artworkBackgroundHex` (fallback Portal artwork grey `#e5e7eb`). The `bg` query is a
Facebook/CDN cache-bust; the Function paints from the design document. Short-lived signed Storage
URLs are not used for crawler-facing share/SEO images.

**Library rotation:** Global library OG picks a ready design via `pickLibraryOgRotatedIndex` using
`libraryOgRotationInterval` (`daily` | `hourly` | `5min` | `1min` | `30s`, default `hourly`).
Studio **Pick next library preview** bumps `libraryOgRotationSalt` to force a different design
without waiting for the next interval bucket; then **Scrape Again** in Facebook Debugger.
There is no “every share” mode — social apps cache OG by page URL.

**Global OG title/description:** Studio → **Settings** → **Social sharing** →
`updatePortalSocialMetaSettings` → `settings/portalSocialMeta`. Portal prefers
`getPortalGlobalOpenGraph` (hourly revalidate on root layout).

**Per-design share / SEO landing:** `/share/design/{id}` lives under the Portal `(app)` shell
(header, sidebar, drawer). Guests may browse it without login; signed-in customers get **Add to
request** (same flow as catalog). Guests see **Sign in to add to a request**. After login, return
maps share URLs to `/catalog?designId=` so the design opens in-library. Already-authenticated users
hitting `/login` or `/login-required` are redirected to returnTo or Discover (`/`).

**Facebook Debugger note:** “This URL hasn't been shared on Facebook before” means Facebook has no
cache yet — click **Fetch new information**. Non-root app paths (e.g. `/requests/artwork`,
`/catalog`) already emit the same global OG tags as home (HTTP 200); they are not auth-blocked for
crawlers.

**Soft-deploy (dev only):**

```bash
firebase deploy --only functions:updatePortalSocialMetaSettings,functions:updatePortalHelpSettings,functions:getPortalDesignShareOpenGraph,functions:getPortalGlobalOpenGraph,functions:getPortalOgShareImage,functions:finalizeBrandLogoSlot,functions:updateBrandLogoDisplaySizes,firestore:rules,storage --project fresh-prints-dev
```

Brand logos also need Firestore + Storage rules for `settings/brandLogos` and `brand/**` (same soft-deploy command). FAQ/How To needs `settings/portalHelp` rules + `updatePortalHelpSettings`. Production rules/Functions still require separate owner approval.

**Verify after soft-deploy to fresh-prints-dev:**

```bash
curl -sL https://myprintrequest.dev/login | findstr /i "og:title og:image twitter:card"
curl -sL https://myprintrequest.dev/catalog | findstr /i "og:title og:image"
curl -sL https://myprintrequest.dev/share/design/READY_DESIGN_ID | findstr /i "og:title og:image og:description"
curl -sL "https://us-central1-fresh-prints-dev.cloudfunctions.net/getPortalGlobalOpenGraph"
```

Or paste URLs into [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and
**Scrape Again** after toggle changes (`fit=contain` separates letterbox cache from raw images).

---

## Production Release Checklist

### Wave C dev snapshot checkpoint

Do not run these commands without the owner’s explicit dev approval:

```bash
firebase deploy --only functions:rebuildCatalogSnapshots,functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentTagRerank --project fresh-prints-dev
firebase deploy --only firestore:rules --project fresh-prints-dev
firebase deploy --only storage --project fresh-prints-dev
```

No Firestore index change is required. After those deployments, initialize and publish only with a
separate explicit approval. Start Studio in development against `fresh-prints-dev`, sign in as an
owner/admin, open renderer DevTools, and run:

```js
await window.freshPrintsDev.rebuildCatalogSnapshots()
```

The callable creates/updates exactly the two coordination documents and publishes both initial
manifests; no manual Firestore document creation is needed.

Only after both manifests validate, deploy mutation triggers:

```bash
firebase deploy --only functions:onCategorySnapshotSourceWritten,functions:onTagSnapshotSourceWritten,functions:onPortalCatalogSnapshotSourceWritten --project fresh-prints-dev
```

Verify both coordination documents, both manifests, version parity, Storage metadata, and a Portal
Discover/search smoke before importing designs.

Rollback: set `NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS=false` for a Portal rebuild and
`AI_CATALOG_SNAPSHOT_ENABLED=false` for the Functions revision, or revert the consuming
app/Functions revision. Both flags select bounded Firestore fallbacks. Alternatively restore each
manifest to its recorded `previousContentVersion` using the prior immutable paths.
If trigger behavior is suspect, redeploy the previous Functions revision before changing
coordination state. Do not delete immutable versions during incident rollback.

- [ ] Human approval obtained
- [ ] `npm run lint` passed
- [ ] `npm run build` passed
- [ ] Firebase rules reviewed
- [ ] Signoff doc completed

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-07-08 | Phase 8 closeout — Portal App Hosting, build commands, Portal functions deploy note |
| 2026-07-16 | Provider-neutral Resend invitations + proof-ready outbox; selective dev deploy checkpoint |
| 2026-06-24 | Git artifact cleanup; Storage deploy commands; packaging icon note |
| 2026-06-24 | Initial Fresh Prints deployment doc |
