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
| Firebase dev | Development backend (Functions/Rules/indexes only — **no App Hosting**, see hosting policy above) | `fresh-prints-dev` (`.firebaserc`) | `development` branch; local / manual deploy |
| Production | Live users | Portal App Hosting on `fresh-prints-prod` (`.firebaserc` `production` alias); domain `[TBD — pending DNS connection]` | `production` branch; human approval required for every deploy |

---

## Development and Production Portal Hosting Policy (2026-08-02 — owner-confirmed, binding)

**`fresh-prints-dev` must not have a Firebase App Hosting backend.** Its absence is intentional
policy, not environment drift, missing infrastructure, or a release blocker. Do not report it as
any of those things.

- **Portal development runs on localhost only** (`npm run dev:portal`, `http://localhost:3100`),
  connecting to the real `fresh-prints-dev` Firebase project — not emulators, per this repo's
  established `apps/portal/.env.local` convention.
- **Studio development runs as the local Electron dev process** (`npm run dev:studio`), also
  connecting to `fresh-prints-dev`.
- **Firebase App Hosting is production-only**, used exclusively for the production Portal in
  `fresh-prints-prod` (backend `fresh-prints-portal`, see the Production Release Checklist below).
- Cloud Functions, Firestore Rules, Storage Rules, and Firestore indexes may still be deployed to
  `fresh-prints-dev` when separately reviewed and approved — this policy governs Portal/Studio
  **hosting** only, not backend resource deployment.
- Localhost-only Portal development does **not** mean Firebase emulators are required; local Portal
  connects to the real `fresh-prints-dev` backend per existing environment configuration.
- Do not create Firebase Hosting, classic Hosting, or App Hosting resources for the development
  Portal, and do not modify `firebase.json`, App Hosting configuration, project aliases, or
  deployment workflows to add a development Portal hosting target — unless the owner explicitly
  reverses this policy through a separately reviewed decision.
- Agents must not recommend development App Hosting merely to obtain production-like QA parity.
  Production-like source verification is provided by builds and tests (typecheck, production build,
  lint); interactive development QA remains localhost-based.
- Production App Hosting rollout and `hosted.app` smoke testing remain production-release
  activities only (see the Production Release Checklist below).

**Do not interpret an empty result from `firebase apphosting:backends:list --project
fresh-prints-dev` as an error. That is the expected state.**

### Environment matrix

| | Runtime | Firebase project | App Hosting | Purpose |
|---|---|---|---|---|
| Development Portal | `localhost:3100` | `fresh-prints-dev` | Prohibited by this policy | Implementation, local smoke, authenticated owner QA |
| Development Studio | Local Electron dev process | `fresh-prints-dev` | N/A (packaged installer not required) | Implementation, local smoke, authenticated owner QA |
| Production Portal | Firebase App Hosting | `fresh-prints-prod` | Existing `fresh-prints-portal` backend | `hosted.app` smoke and public release |
| Production Studio | Packaged Windows application | `fresh-prints-prod` | N/A | Approved installer/update release workflow |

### Checklist for future agents before proposing any hosting or rollout work

Before proposing Portal/Studio hosting or rollout work, answer:

1. Is this Portal work for localhost development or production App Hosting?
2. Which Firebase project is authorized for this action?
3. Is the requested action source verification (build/typecheck/lint), backend resource deployment
   (Functions/Rules/indexes), or Portal **hosting**?
4. Does the action require a human deployment checkpoint?

Ordinary reporting-feature work, local QA, or a missing dev App Hosting backend do **not**, by
themselves, justify proposing a policy change. Any future proposal to create development Portal
hosting must stop with the literal checkpoint phrase:

`[NEEDS OWNER DECISION: REVERSE LOCALHOST-ONLY DEVELOPMENT POLICY]`

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

### Local checkout policy (development-first) — owner decision 2026-08-18 (ADR-FP-137)

The owner is the sole developer. Normal work uses **one** checkout and **one** working branch.

| Rule | Required behavior |
|------|-------------------|
| Checkout | `C:\coding\fresh-prints` only |
| Branch | `development` |
| Per-goal branches | **Do not** create `feature/*`, `fix/*`, `docs/*`, `chore/*`, or other temporary implementation branches unless the owner **explicitly** requests one |
| Worktrees | **Do not** create a new Git worktree or replacement checkout unless the owner **explicitly** requests one |
| FreshForge phases | Plan, Review, Implement, Test, DEV QA, and Signoff all occur on `development` |
| Production | Promote only by reviewed PR: `development` → `production`. Never push directly to `production`. Never force-push protected branches |
| Deploys | App Hosting / production rollouts remain separate human checkpoints after merge |

A temporary branch or worktree may be **proposed** only when working directly on `development` is genuinely unsafe or technically impossible. Do not create one automatically. Explain the reason and ask the owner first.

1. After clone, after pulling, and after any temporary inspection of `production` (or another
   release tip), switch back to `development` before continuing work:
   `git switch development` (or `git checkout development`).
2. Do not leave a long-lived local checkout on `production` for feature work, docs edits, or
   day-to-day agent sessions.
3. Inspecting `origin/production` for ancestry, release SHAs, or diff gates is fine; committing or
   pushing from a `production` checkout is not part of ordinary workflow (promotion is PR-only).
4. Existing leftover worktrees from older goals are not a license to create new ones. Do not add
   more unless the owner asks.

### Development workflow

1. Start all ordinary work on `development` in `C:\coding\fresh-prints` (see local checkout policy above).
2. Test normal work against `fresh-prints-dev` / localhost. Portal DEV QA does not require App Hosting.
3. Commit and push ongoing work to `origin/development`.
4. Do not perform ordinary feature work on `production`.
5. Do not open a new implementation branch for each managed goal.

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

Prefer fixing on `development` and promoting with the normal reviewed PR, even for urgent bugs,
unless that is genuinely unsafe (for example a production-only emergency that cannot wait for
current development-line work).

If a temporary hotfix branch is truly required:

1. **Ask the owner first.** Do not create the branch automatically.
2. Create it from `production` only after explicit owner authorization.
3. Make and test the smallest necessary fix.
4. Promote with a reviewed PR into `production` (never a direct push).
5. Deploy and verify only after the standing production rollout checkpoint.
6. Merge the same hotfix into `development` if it is not already there.
7. Delete the temporary hotfix branch after both sides are updated.

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

**Optional Algolia (ADR-FP-129):** While Algolia is OFF, do not export the Algolia Function trio
from default `functions/src/index.ts` (restore via `algolia/algoliaFunctionExports.ts` under an
approved Algolia checkpoint). `ALGOLIA_ADMIN_API_KEY` lives in `algolia/algoliaSecrets.ts` only —
not shared `lib/secrets` — so taxonomy/AI scoped deploys do not require the Algolia secret to
exist. Dev and prod must use separate indexes (`portal_catalog_ready_dev` vs a production-only
name such as `portal_catalog_ready_prod`). On `fresh-prints-dev`, if Algolia Functions are already
live, prefer scoped `--only` until those exports are restored (unfiltered Functions deploy can
propose deleting endpoints missing from `index.ts`).

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
6. ✅ **App Hosting environment-variable configuration** — **COMPLETE 2026-07-30; corrected
   2026-08-08.** Initial cutover added an `env:` block with plaintext `value:` entries in
   `apps/portal/apphosting.yaml` (PR #6 / `9437d4b`). That approach is **superseded**: YAML now
   declares the same eight variables via `secret:` references to Cloud Secret Manager (names only;
   no committed plaintext). Local production values remain in gitignored
   `apps/portal/.env.production.local`. Owner must create/grant the eight secrets on
   `fresh-prints-prod` / backend `fresh-prints-portal` **before** the next App Hosting rollout that
   consumes the secret-backed YAML (see "Portal App Hosting environment variables" below).
   `NEXT_PUBLIC_GA_MEASUREMENT_ID` deliberately stays unset — GA4 go-live remains its own separate,
   later checkpoint.
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
8. ⚠️ **Production Studio build** — **first installer white-screened; root cause fixed, replacement
   built 2026-07-30, awaiting owner retest.** Original build (source audit confirmed correct
   Firebase config, triple-layered Test Data Reset exclusion, no hardcoded Portal URL): built
   `Fresh Prints-Windows-0.0.0-Setup.exe` from commit `11ed4ef` — owner installed it and reported a
   permanent white screen. Diagnosed via owner-captured runtime evidence
   (`Cannot read properties of undefined (reading 'createContext')`) since this sandboxed
   environment cannot host a real Electron GUI process. **Confirmed root cause:**
   `apps/studio/vite.config.ts`'s `manualChunks` used a bare substring match
   (`id.includes('node_modules/react')`) that caught `react`/`react-dom` but not `scheduler`
   (react-dom's runtime dependency), producing a circular chunk dependency (Rollup warned but did
   not fail the build) that crashes on `React.createContext` in packaged builds only — never
   reproducible via `npm run dev`, since Vite's dev server never applies `manualChunks`. Fixed via
   narrow Plan + Formal Review (both `approved`):
   `docs/workflow/plans/2026-07-30-production-release-studio-white-screen-fix-plan.md`. Corrected
   the chunk match to exact package-boundary paths plus explicit `scheduler` inclusion; added a
   `rollupOptions.onwarn` hook that fails the build on any future `CIRCULAR_CHUNK` warning (closing
   the actual gap that let the broken build ship with exit 0); removed an unrelated dead favicon
   reference found in the same evidence-gathering pass. Verified: no more circular-chunk warning,
   `scheduler` directly confirmed via `asar` extraction to now live in `react-vendor`, full
   build/typecheck/lint/diff-check all exit 0. Promoted via PR #9 (merge `daaafc1`), tagged
   `v1.0.0-rc4`. **Installer:**
   `Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc4.exe`, `apps/studio/release/0.0.0/`, ~102.3 MB,
   SHA-256 `a0be8e956108bc786fe3ea629f7dc356bb0e28ed09b60d740c31a64c1bf177ed` (deliberately
   different from the original failed checksum
   `c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`, confirming new content),
   unsigned; preserved on disk for the incident record.

   **Desktop icon alignment (same day, later pass).** Owner requested the packaged icon match the
   collapsed Studio sidebar's mark. Traced `Sidebar.tsx` → `AppLogo variant="collapsed"` →
   `src/assets/brand/fresh-prints-studio-logo-collapsed.png` (confirmed via this session's Phase D
   research to be what actually renders on cold-start `fresh-prints-prod`). Found
   `electron-builder.json5` already referenced `icon.ico`/`icon.png` that never existed. Fixed via
   a second narrow Plan + Formal Review (both `approved`):
   `docs/workflow/plans/2026-07-30-production-release-studio-icon-plan.md`. Generated a padded
   7-resolution `.ico` (16-256px) and a 512px `icon.png` via a one-time script
   (`apps/studio/scripts/generate-app-icon.mjs`, `sharp` + the new `png-to-ico` devDependency);
   corrected `main.ts`'s `BrowserWindow.icon` (previously pointing at the same nonexistent
   `fresh-prints-logo.svg` found during the white-screen investigation — confirmed via Electron's
   docs this only matters for dev mode, not the packaged Windows taskbar). **Verified directly**:
   extracted the actual embedded icon from both the packaged `.exe` and installer `.exe` via
   Windows' own `System.Drawing.Icon.ExtractAssociatedIcon` API and visually confirmed the correct
   mark on both; no clipping at 16/32/256px; white-screen fix's chunk placement re-confirmed
   intact. Promoted via PR #10 (merge `c644935`), tagged `v1.0.0-rc5`. **Installer (includes both
   fixes):** `Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc5.exe`, `apps/studio/release/0.0.0/`,
   ~102.7 MB, SHA-256 `e07914692ad2ff507bce279522852acf4bd9e89eb75d04da2221e3f05c17d011`
   (different from both prior checksums). Re-confirmed on this exact build: correct icon, Firebase
   config resolves to `fresh-prints-prod`, white-screen fix intact. Unsigned.

   ✅ **Owner retest: `PASS WITH NOTES`.** `v1.0.0-rc5` launches without a white screen, correct
   icon confirmed in place, production owner account signs in successfully. Sign-in initially
   failed until the owner added `createdAt`/`updatedAt` timestamp fields to the manually
   bootstrapped `users/{uid}` document (`userService.ts`'s `mapUserDocument()` requires both) — a
   gap in the earlier manual bootstrap instructions (step 9 below), not a code defect; corrected
   field list recorded in `.cursor/workflow/state.md`. **Step 8 of 12 fully closed.**
9. ✅ / ⏳ **Domain-independent production setup** — emailProviders PASS; owner/taxonomy/infra/CORS/
   Coming Soon DNS rollback recorded. **Remaining owner Studio fixtures:** upcoming show + one
   ready catalog design. Portal-invite test customer **deferred** until domain cutover. Stage 2
   hosted.app smoke **executed and PASS** (2026-08-09).
10. ✅ **Domain-independent smoke tests** on
    `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` — **COMPLETE**
    2026-08-09 (`PROD CUSTOMER SMOKE QA: PASS`; verdict **READY FOR CUSTOMERS**). Do **not**
    treat hosted.app results as canonical-domain passes. See
    `docs/workflow/reviews/2026-08-09-production-customer-smoke-test-signoff.md`.
11. ⏳ **Final pre-domain readiness gate** — readiness proof recorded; awaiting exact owner phrase
    `APPROVE MYPRINTREQUEST.COM CUTOVER`. Coming Soon remains live until this gate passes.
    Checkpoint: `docs/workflow/reviews/2026-08-09-myprintrequest-com-cutover-checkpoint.md`.
12. ⏳ **Custom domain cutover + domain-dependent smoke** — **only after** the Stage 11 approval.
    Connect `myprintrequest.com` (and approved www behavior), Authorized Domains, Google sign-in
    for the canonical host, then run domain-dependent smoke immediately. Rollback to Coming Soon
    if cutover fails. **GA4 and Search Console remain separate later checkpoints after Stage 12.**

> **2026-07-31 owner sequencing decision:** do **not** point `myprintrequest.com` at App Hosting
> until Stages 9–11 are complete. This supersedes earlier wording that placed “Domain and
> Authorized Domains” before finishing available production readiness checks. Full detail:
> `docs/workflow/plans/2026-07-30-production-release-plan.md` §7 and
> `docs/workflow/reviews/2026-07-31-production-release-domain-last-sequencing-review.md`.

**Historical note (superseded order):** steps were previously numbered as (9) settings/reference
data, (10) domain/Authorized Domains, (11) smoke tests, (12) GA4/Search Console. Domain is now
the final production setup action before domain-dependent smoke.

**The App Hosting backend existing with status "Waiting for your first release" does not change
this order.** Backend configuration (already complete) is not the same as step 7 (the first
release). Each remaining stage still requires its own explicit owner approval where noted; none
of this order authorizes skipping ahead to domain cutover.

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

**Superseded (2026-08-02):** the `firebase deploy --only apphosting --project fresh-prints-dev`
command previously shown here is no longer authorized — see "Development and Production Portal
Hosting Policy" above. `fresh-prints-dev` intentionally has no App Hosting backend; development
Portal QA is localhost-only (`npm run dev:portal`). App Hosting deploys only ever target
`fresh-prints-prod` (human approval required):

```bash
firebase deploy --only apphosting --project fresh-prints-prod
```

Portal backend config: `apps/portal/apphosting.yaml`. App root: `apps/portal` in `firebase.json`.

### Portal App Hosting environment variables

**Do not commit plaintext production Firebase Web config or Portal origin values in
`apphosting.yaml`.** Declare variable names with `secret:` references; store values in Cloud
Secret Manager. Local production builds use gitignored `apps/portal/.env.production.local`
(same names as `apps/portal/.env.example`).

Required secrets (each secret ID matches the env var name; `BUILD` + `RUNTIME` availability):

| Secret / env var | Purpose |
|------------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `fresh-prints-prod` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web app ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web Push VAPID key |
| `NEXT_PUBLIC_PORTAL_ORIGIN` | Canonical origin (`https://myprintrequest.com`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID (public-by-design). Secret Manager + `apphosting.yaml` mapping (`BUILD` + `RUNTIME`). **Do not commit the `G-` value.** **LIVE** 2026-08-18 on `fresh-prints-portal-build-2026-08-18-001` / `cb006bd`; owner `PROD GA4 TRANSPORT QA: PASS`. Collection QA requires an actual `g/collect` request (tag detection alone is insufficient). Historical enablement build: `fresh-prints-portal-build-2026-08-17-002` / `124c6fa`. Rollback for the transmission corrective: that same `124c6fa` build. |

Create or update (values from `.env.production.local` — never paste into chat/logs):

```bash
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY --project fresh-prints-prod
# …repeat for each secret above…
```

If a secret was created in Cloud Secret Manager outside that CLI flow:

```bash
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_FIREBASE_API_KEY --backend fresh-prints-portal --project fresh-prints-prod
```

**Sequencing:** secrets must exist and be granted to `fresh-prints-portal` before any App Hosting
rollout that references them. Firebase Console backend env overrides take precedence over
`apphosting.yaml` if both are set — prefer Secret Manager as the single production source after
cutover. `NEXT_PUBLIC_*` values are browser-exposed after build by design; Secret Manager here is
config hygiene (keep env-specific identifiers out of the repo), not confidentiality of true
backend secrets.

**Portal Algolia managed search (default feature):** after index reconcile, ensure three
search-only Secret Manager secrets exist (never Admin), grant to `fresh-prints-portal`, and
reference them from `apps/portal/apphosting.yaml`. Algolia is **on by default** whenever those
credentials are present; the flag secret is an emergency kill-switch only.

| Secret / env | Production intent |
|--------------|-------------------|
| `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` | Omit or any value other than `false` → ON; set `false` to kill-switch |
| `NEXT_PUBLIC_ALGOLIA_APP_ID` | SEPARATE prod app (e.g. `Z1FVCM5QUX`) |
| `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` | Search-only ACL; index-restricted |
| `NEXT_PUBLIC_ALGOLIA_INDEX_NAME` | `portal_catalog_ready_prod` (never `_dev`) |

Roll out only after credentials exist+granted. Kill-switch: set flag secret to `false` and roll out.

**Residual:** plaintext values previously committed in `apphosting.yaml` remain in git history;
history rewrite is out of scope unless explicitly approved.

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

**Production (2026-07-31):** CORS **applied** to `gs://fresh-prints-prod.firebasestorage.app` after
`APPROVE PRODUCTION STORAGE CORS`. Config: `storage.cors.production.json` (GET/HEAD for hosted.app,
`myprintrequest.com`, `www.myprintrequest.com`). Pre-apply `cors` was null; post-apply ACAO probe
confirmed matching `Access-Control-Allow-Origin` for all three origins on the portal-catalog
manifest download URL. **Owner Discover retest: PASS** (empty catalog loads; unavailable message
gone) — see
`docs/workflow/reviews/2026-07-31-production-portal-catalog-cors-checkpoint.md`. This is separate
from Storage Rules deployment (step 2 above); Rules already allowed public read.

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
- `static` — owner upload or Design Library pick snapshotted on Save (`staticOgImage`); missing asset fail-safes to logo/defaults

**Global metadata freshness/read policy (2026-08-11):** all root/Login/Register/Help metadata callers
share a short **60-second** revalidation window (was 3600s). Portal uses a bounded in-memory cache
keyed by settings `updatedAt` plus Next fetch revalidation with Function `?v=updatedAt` bust.
`getPortalGlobalOpenGraph` uses a **60s** warm-instance cache, cleared on successful
`updatePortalSocialMetaSettings`, with HTTP `max-age=60`. Library rotation uses bounded dual
Firestore ready-design queries (merge/dedup, top 40). Expected measurable Firestore document reads:
cache hit 0; library miss 1 (`settings/portalSocialMeta`); logo/static-fallback miss 2
(social metadata + brand-logo settings).

**Static OG Storage path:** `portal-social-meta/static-og/{uuid}.{png|jpg|webp}` — owner create/delete,
public read, ≤5 MiB. **Deploying Storage Rules is a human checkpoint.**

**Letterbox / crawler images:** Design share and SEO `og:image` / landing `<img>` always use public
`getPortalOgShareImage?designId=…&fit=contain&bg=<hex>` (1200×630 JPEG). Canvas color comes from
the design’s `artworkBackgroundHex` (fallback Portal artwork grey `#e5e7eb`). The `bg` query is a
Facebook/CDN cache-bust; the Function paints from the design document. Short-lived signed Storage
URLs are not used for crawler-facing share/SEO images. **Static Image mode always letterboxes**
via `getPortalOgShareImage` (`designId` for Design Library picks; validated `staticPath` under
`portal-social-meta/static-og/` for uploads). The social letterbox toggle does not disable Static
letterboxing. Missing Static sources fail-safe to brand logo — never raw snapshot URLs.

**Library rotation:** Global library OG picks a ready design via `pickLibraryOgRotatedIndex` using
`libraryOgRotationInterval` (`daily` | `hourly` | `5min` | `1min` | `30s`, default `hourly`).
Studio **Pick next library preview** bumps `libraryOgRotationSalt` to force a different design
without waiting for the next interval bucket; then **Scrape Again** in Facebook Debugger.
There is no “every share” mode — social apps cache OG by page URL.

**Global OG title/description:** Studio → **Settings** → **Social sharing** →
`updatePortalSocialMetaSettings` → `settings/portalSocialMeta`. Portal prefers
`getPortalGlobalOpenGraph` (60s revalidate + `updatedAt` cache bust on root layout).
Default title/description use Fresh Prints Whatnot wording (shared + Portal brand mirrors).

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

## DEV-only pending production promotion inventory

Track Firestore Rules, Functions, indexes, Storage Rules, and Studio releases that passed **DEV** QA but are **not** yet on `fresh-prints-prod`. Add rows when a standalone corrective or goal ships to DEV; remove rows only after owner-authorized production promotion and deploy record.

| Date | Item | DEV deploy | Owner DEV QA | Production |
|------|------|------------|--------------|------------|
| 2026-09-01 | **AI Review Approve/Reject Rules** — allow `artworkBackgroundSource` on `catalogMetadataOnlyUpdate` (`firestore.rules`) | `firebase deploy --only firestore:rules --project fresh-prints-dev` — **done** | **PASS** (Approve + Reject) | **Pending** — include in next owner-authorized Rules promotion |
| 2026-09-01 | **Pre–Smart Profiling managed goal** (WS1–WS3) — Portal + Studio + Functions deltas on `development` | Partial (WS2 Functions on DEV) | WS1 **PASS**, WS2 **PASS**, WS3 **pending** | **Not authorized** — separate promotion after managed goal signoff |

Deploy record (AI Review Rules): `docs/workflow/reviews/2026-09-01-ai-review-artwork-background-source-rules-dev-deploy-record.md`

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

## Studio Automatic Updates

Implemented via `electron-updater`, publishing to GitHub Releases on this repository
(`roasted-garlic/freshprints` — confirmed public, `"private": false` via the GitHub API, so no
client-embedded credential is required for anonymous release-asset reads).

### Channels

- **`stable`** — production users. Selected via a compiled-in constant
  (`apps/studio/electron/generated/packagedBuildConfig.ts`, gitignored, produced at build time by
  `apps/studio/scripts/generate-packaged-build-config.mjs` from the `FRESH_PRINTS_UPDATE_CHANNEL`
  env var available only during the build itself — not a runtime environment variable, which an
  installed application never has) when that value is `stable`, or absent/unset (fail-safe default
  — see `apps/studio/electron/ipc/studioUpdate/studioUpdateChannel.ts`).
- **`prerelease`** — development/test builds only, versioned with a semver prerelease tag (e.g.
  `1.0.0-beta.1`). electron-builder derives the update-feed channel automatically from the
  version's prerelease identifier (`packages/app-builder-lib`'s `AppInfo.channel` getter) — no
  manual channel override is configured, so this isolation is structural, not a convention that
  can silently drift.
- Stable clients never see prerelease releases and vice versa; `allowPrerelease` is only ever
  `true` when the packaged build's own channel is `prerelease`.

### Release trigger

Manual only — `.github/workflows/studio-release.yml`'s `workflow_dispatch` with an explicit
`ref` and `release_type` (`prerelease` | `stable`) input. There is no push-triggered or tag-triggered
automatic publish. A `stable` release_type is refused by the workflow itself unless `ref` is exactly
`production` or a commit already reachable from `origin/production`.

### Release gates and draft `target_commitish` (2026-08-10)

Lint, Functions build, Portal typecheck, and Studio updater unit tests each run as **separate**
workflow steps so any non-zero exit fails the job immediately. Do not recombine them into one
PowerShell `run:` block — Windows PowerShell does not fail-fast across successive `npm` commands,
which previously allowed a lint failure to continue into packaging (observed on the first
`1.0.2` draft attempt).

After electron-builder creates/updates the draft GitHub Release, the workflow **PATCHes** that
draft's `target_commitish` to `git rev-parse HEAD` (the checked-out build SHA). electron-builder
24.x does not send `target_commitish` on create, so GitHub would otherwise default the draft to the
repository default branch; `GITHUB_SHA` on `workflow_dispatch` is also the workflow-file branch tip,
not the `inputs.ref` checkout. Do not publish a stable draft whose `target_commitish` is not the
exact production SHA that was built.

### Human approval gate before any release is publicly visible

`npm run build -- --publish always` (invoked by the workflow) always creates the GitHub Release as
a **draft**. **Confirmed against a real run (2026-08-02, `1.0.0-beta.2`): electron-builder's
GitHub publisher does not reliably mark the draft's "Set as a pre-release" checkbox on its own** —
the draft was created, but the owner had to manually select "Pre-release" in the GitHub UI before
publishing. Both marking a release as prerelease and publishing it (moving it out of Draft) are
currently **manual human checkpoints in the GitHub UI for every release this workflow produces**,
stable or prerelease — the workflow does not automate either step, and this doc previously
overstated that prerelease labeling happened automatically. No release, stable or prerelease,
reaches its update feed without that separate human action.

### Versioning

First updater-enabled version: `1.0.0` (stable). Prerelease test versions use valid semver
prerelease tags, e.g. `1.0.0-beta.1`, `1.0.0-beta.2`. `apps/studio/package.json`'s `version` field
is the source of truth — update it before each build/publish.

### Studio Algolia search-only release secrets (2026-08-11)

Stable Studio packages bake search-only Algolia config into the installer via the same
`.env.local` write step that injects `PROD_FIREBASE_*` (see `.github/workflows/studio-release.yml`).
**Never** put an Algolia Admin/write key in GitHub Actions Studio secrets or in Studio builds.

| GitHub Actions secret | Stable requirement | Production intent |
|-----------------------|--------------------|-------------------|
| `PROD_ALGOLIA_APP_ID` | **Required** for `release_type: stable` | Must be `Z1FVCM5QUX` |
| `PROD_ALGOLIA_SEARCH_API_KEY` | **Required** for stable | Search-only ACL; same value family as Portal `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` |
| `PROD_ALGOLIA_INDEX_NAME` | **Required** for stable | Must be `portal_catalog_ready_prod` (never `_dev`) |
| `DEV_ALGOLIA_APP_ID` / `DEV_ALGOLIA_SEARCH_API_KEY` / `DEV_ALGOLIA_INDEX_NAME` | Optional for prerelease | When unset, prerelease managed catalog search fails closed |

The workflow fails closed if a stable run is missing any `PROD_ALGOLIA_*` secret, if
`PROD_FIREBASE_PROJECT_ID` is not `fresh-prints-prod`, or if the Algolia app/index values do not
match the production identifiers above. Secret values are never printed in logs.

### Code signing and distribution mode (2026-08-03 — owner-approved internal-unsigned policy)

**Fresh Prints Studio is currently an internal-only staff tool**, installed only on
owner-controlled computers. The owner has explicitly decided not to purchase a publicly trusted
Windows Authenticode code-signing certificate for this release. This is documented as a durable
policy, not a one-off exception buried in a workflow run.

The Studio release workflow (`.github/workflows/studio-release.yml`) exposes a `distribution_mode`
`workflow_dispatch` input with two values:

- **`signed`** (the default) — requires both `WINDOWS_CSC_LINK` and `WINDOWS_CSC_KEY_PASSWORD`
  GitHub encrypted secrets; fails closed (before packaging) for any `release_type: stable` run if
  either is missing. This remains the only path intended for any future public/external Studio
  distribution.
- **`internal-unsigned`** — an explicit, deliberately-selected exception. Only applies to
  `release_type: stable`; **never** the default; ignored entirely for `release_type: prerelease`
  (prerelease has always built unsigned regardless of this input, unchanged). When selected with no
  signing secrets configured, the workflow proceeds without signing but prints a prominent
  `Write-Warning` stating the build is unsigned, internal-only, and will trigger Windows SmartScreen
  warnings. A partially-configured secret pair (only one of the two present) still fails closed in
  either mode — having a certificate available is never silently discarded.

**No certificate is required for internal-only distribution under this policy.** If a certificate
is later obtained for a public release, `signed` (the default) already works with no further
workflow change — just populate the two secrets and select `signed` (or omit `distribution_mode`
input reasoning entirely, since `signed` is the default).

**Prominent staff-facing guidance:**
- **Unsigned installers will show a Windows SmartScreen "Windows protected your PC" warning** on
  first run — this is expected for an unsigned internal build, not a sign of a corrupted or
  malicious file.
- **Staff must obtain the Studio installer only from the approved private GitHub Releases page**
  on this repository (`https://github.com/roasted-garlic/freshprints/releases`) — never from any
  other source.
- Before clicking "More info" → "Run anyway" on the SmartScreen prompt, staff should confirm they
  downloaded the installer from that exact GitHub Releases page and that the release was created
  by an authorized workflow run (visible in the repository's Actions history).
- **A future public-facing Studio release must return to the `signed` distribution mode** — do not
  treat `internal-unsigned` as a permanent replacement for signing; it exists specifically because
  today's distribution is internal-only.

### macOS x64 + arm64 packaging (Studio 1.0.4+)

Studio releases build **Windows and Mac from the same production SHA** via
`.github/workflows/studio-release.yml`:

| Job | Runner | Artifacts |
|-----|--------|-----------|
| `build-windows` | `windows-latest` | `Fresh-Prints-Windows-{version}-Setup.exe`, `.blockmap`, `latest.yml` |
| `build-macos` | `macos-latest` (arm64 host) | Native **arm64** + cross-packaged **x64** DMG/ZIP each; merged `latest-mac.yml` |
| `finalize-release` | `ubuntu-latest` | Verifies all platform/arch assets + same SHA. **Mutates a GitHub Release draft only when `release_type=stable` and the build SHA is on `production`.** Branch/`prerelease` runs are validation-only (Actions artifacts only). |

Canonical Mac filenames (space-free, arch-explicit):

- `Fresh-Prints-Mac-arm64-{version}-Installer.dmg` / `.zip`
- `Fresh-Prints-Mac-x64-{version}-Installer.dmg` / `.zip`

- **Architecture:** Apple Silicon **arm64** and Intel **x64** (Big Sur 11.7.11+). Universal is deferred. Rosetta is not the primary M2 path.
- **Updater:** One merged `latest-mac.yml` lists both arches' ZIP/DMG URLs. `electron-updater` selects the matching arch by filename. **Windows** continues to use `latest.yml` with normal automatic update install (unchanged). **Mac:** automatic update **install** remains **unsupported / unreliable** while packages are **ad-hoc signed** — download may succeed, but Squirrel.Mac signature validation fails at install. Settings maps install-phase failures to a safe message directing staff to **install the latest version manually** (A1). This is an accepted product limitation, **not** a fixed issue.
- **Signing:** Mac packages remain **ad-hoc** (`mac.identity: "-"`, `hardenedRuntime: false`). This is **not** Developer ID and **not** notarized. Stable Mac requires `distribution_mode: internal-unsigned`. Selecting `signed` for Mac fails closed (no `MAC_CSC_*` secrets will be configured under the current owner decision). CI runs `codesign -v -vvv --strict --deep` on arm64 and x64 after packaging (fail closed; asserts ad-hoc).
- **Gatekeeper:** Ad-hoc builds are expected to show as **unverified** (Open Anyway / right-click Open). A “damaged / Move to Trash” dialog indicates invalid packaging — do **not** treat clearing quarantine as the product fix. See `docs/workflow/reviews/2026-08-12-studio-1.0.4-macos-smoke-checklist.md`. Do **not** instruct staff to disable Gatekeeper globally.
- **1.0.6 / A2 disposition (2026-08-15):** Owner **declined** paid Apple Developer Program enrollment and **Developer ID Application** signing indefinitely. No `MAC_CSC_LINK` / `MAC_CSC_KEY_PASSWORD`, no notarization credentials, no Apple Program fee dependency. Developer ID may be revisited only by a **future explicit owner decision**. App version pin is `1.0.6`. Mac CI remains ad-hoc / internal-unsigned.
- **Environment bake:** Both platform jobs call `apps/studio/scripts/write-studio-release-env.mjs` with the same stable fail-closed rules (`fresh-prints-prod`, Algolia `Z1FVCM5QUX` / `portal_catalog_ready_prod`, search-only key).
- **sharp:** Each Mac arch installs matching `darwin-${arch}` sharp before package and verifies load + native path via `verify-packaged-mac-sharp.mjs` (`asarUnpack` for `sharp` / `@img`).
- **Minimum OS:** `minimumSystemVersion: 11.0` (Big Sur). Do not raise above Big Sur without an owner decision. Electron 30 supports macOS 10.15+.
- **Publication:** Finalize creates/updates a **draft** only after production merge (`stable`). Draft copy may include a `DRAFT — do not publish…` warning. Publishing remains a separate human checkpoint after **Windows + Mac x64 + Mac arm64** smoke (Mac = manual install path) and owner `APPROVE STUDIO PUBLISH: X.Y.Z`.
- **Same-SHA rule:** Finalize refuses mixed Windows/Mac SHAs. Rebuild all platforms after any production merge that changes packaging source; do not publish a Windows-only draft from an older SHA as final.
- **Pre-merge validation:** Dispatch `release_type=prerelease` (or any non-stable) from a branch to package and verify without creating/mutating GitHub Releases.

### Stable publish helper (2026-08-21)

Do **not** publish with `gh api -X PATCH … -f draft=false` alone. That leaves draft warning copy and may skip GitHub **Latest**.

After owner `APPROVE STUDIO PUBLISH: X.Y.Z` and Windows + Mac arm64 + Mac x64 smoke **PASS**:

```bash
node .github/scripts/publish-studio-stable-github-release.mjs \
  --release-id <id> \
  --version X.Y.Z \
  --sha <40-character-build-sha>
```

The helper PATCHes `tag_name=vX.Y.Z`, `draft=false`, `make_latest=true`, and **final** release copy (version, platforms, source SHA, Windows auto-update, Mac `internal-unsigned` / manual DMG). It then fail-closed verifies:

| Check | Required |
|-------|----------|
| `draft` | `false` |
| `name` / version | `X.Y.Z` |
| `tag_name` | **`vX.Y.Z`** (not `untagged-*`; publish helper sets this on release) |
| `target_commitish` | exact build SHA |
| asset count | **8** |
| GitHub Latest | `GET /releases/latest` `id` equals this release |
| release URL | `https://github.com/roasted-garlic/freshprints/releases/tag/vX.Y.Z` resolves |
| body | no `DRAFT` / `do not publish` (or equivalent) |

**Draft finalize note (2026-08-24):** If GitHub assigns an `untagged-*` slug during draft create, `studio-release.yml` normalizes the draft to `vX.Y.Z-SHORT_SHA`. The publish helper still sets **`vX.Y.Z`** on release. If a published stable release ever ships with a non-`vX.Y.Z` tag, use owner-gated in-place retag (see `docs/workflow/reviews/2026-08-24-studio-1.0.9-release-tag-retag-record.md`).

A stable Studio release is **not** signoff-complete until that checklist is recorded. Raw PATCH or GitHub UI “publish draft” without Latest + final copy is insufficient.

Never commit signing material (certificates, passwords, base64 PFX data) to the repository — CI
encrypted secrets only, for the Windows `signed` path (and any future Mac Developer ID path if owner revisits).

### Update behavior (user-gated, never silent)

- Check frequency: on launch, then every 4 hours while Studio remains running
  (`apps/studio/electron/ipc/studioUpdate/studioUpdateService.ts`).
- Download only starts after an explicit "Download update" click in Settings → Studio updates.
- Install only happens after an explicit "Restart to Update" click — Studio never force-quits or
  force-installs.
- Postponing an offered update is allowed; it is re-offered on the next check.
- No mandatory updates in v1. Update-feed failures leave Studio fully operable — errors surface in
  Settings but never block the rest of the app.
- Rollback: no automatic downgrade. Keep at least the two most recent known-good stable installers
  archived (e.g. in the GitHub Release history) in case a stable release needs to be pulled.

### Where the update UI lives

Settings → **Studio updates** tab (`apps/studio/src/renderer/src/features/settings/components/StudioUpdatesSettingsSection.tsx`).

### A→B prerelease proof procedure

Before any stable release, prove the update path end-to-end on the `prerelease` channel:

1. Build and publish `1.0.0-beta.1` (`release_type: prerelease`), install it manually.
2. Bump to `1.0.0-beta.2`, build and publish to the same prerelease channel.
3. From the running `1.0.0-beta.1` install, confirm: update detected, download starts on click,
   progress shown, "Restart to Update" appears, clicking it relaunches Studio as `1.0.0-beta.2`
   with local settings and Firebase project (`fresh-prints-dev`) intact.

Record versions, release IDs, installer names/sizes/SHA-256, and source commits in a dated Test
Report under `docs/workflow/reviews/`.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-08-21 | Stable Studio publish helper: GitHub Latest + final release copy; draft-only finalize unchanged |
| 2026-07-08 | Phase 8 closeout — Portal App Hosting, build commands, Portal functions deploy note |
| 2026-07-16 | Provider-neutral Resend invitations + proof-ready outbox; selective dev deploy checkpoint |
| 2026-06-24 | Git artifact cleanup; Storage deploy commands; packaging icon note |
| 2026-06-24 | Initial Fresh Prints deployment doc |
