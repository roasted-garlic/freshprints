# Recent Completed Work

> Signed-off or largely complete work. External agents should not re-plan or duplicate this.

## 2026-07-31 - production-release: Class D cross-service permission identified (docs only)

- Console warning proves Storage Rules cannot execute `firestore.get`/`exists`
- Class D selected; prior Formal Review preserved; amendment review **approved**
- Brand asset mapping approved (five sources); implement still gated
- Awaiting `APPROVE PRODUCTION STORAGE CROSS-SERVICE PERMISSION ENABLEMENT` — no IAM change yet

## 2026-07-31 - production-release: Studio Storage unauthorized diagnosed (docs only; blocked)

- Ruled out wrong packaged bucket/project, live Rules drift, App Check, CORS
- Confirmed brand Settings error is failed upload (empty `brand/`, no `settings/brandLogos`)
- Plan + Formal Review `approved_with_changes`; later superseded to Class D by Console warning
- No deploy / rebuild / DNS / domain action

## 2026-07-31 - production-release: Stage 1 partial (infra/DNS); customer invite deferred; Stage 2 checklist prepared

- Verified owner/taxonomy/Functions/indexes/CORS/hosted.app/Coming Soon without DNS changes
- Deferred `createCustomerWithPortalInvite` until domain cutover (continue URL is `.com`)
- Prepared hosted.app Stage 2 checklist; awaiting owner show + design fixtures before smoke

## 2026-07-31 - production-release: domain-last sequencing amendment (docs only, Formal Review approved)

- Owner: keep Coming Soon on `myprintrequest.com` until domain-independent setup + hosted.app
  smoke + readiness gate complete; connect custom domain only after
  `APPROVE MYPRINTREQUEST.COM CUTOVER`
- Plan §7 + DEPLOYMENT remaining steps 9–12 rewritten; Formal Review **approved**
- No DNS, Authorized Domains, OAuth, App Hosting, Firebase deploy, CORS reapply, or snapshot
  rebuild
- Immediate next: Stage 1 domain-independent setup (emailProviders first if unset)

## 2026-07-30 - production-release: v1.0.0-rc5 owner retest PASS WITH NOTES; production Studio complete (deployment-order step 8 of 12 closed)

- Owner reported `PASS WITH NOTES` on `v1.0.0-rc5`: launches without a white screen, correct icon
  confirmed, production owner account signs in successfully
- Note: sign-in initially failed until `createdAt`/`updatedAt` were added to the manually
  bootstrapped `users/{uid}` document — a gap in the earlier manual bootstrap instructions
  (missing two required fields), not a code defect; corrected field list recorded for future
  reference
- **Deployment-order step 8 of 12 (production Studio) fully closed** — both installer defects
  found this goal (white screen, missing icon) owner-confirmed fixed via real retest
- Proceeding into Phase G (Portal + installed Studio + backend smoke testing)

## 2026-07-30 - production-release: Studio desktop icon aligned with collapsed-sidebar mark; v1.0.0-rc5 installer built (deployment-order step 8 of 12, blocked on owner retest)

- Traced the collapsed-sidebar icon to its exact source (`AppLogo variant="collapsed"` →
  `fresh-prints-studio-logo-collapsed.png`), confirmed via prior Phase D research this is what
  actually renders on cold-start `fresh-prints-prod`
- Found `electron-builder.json5` already referenced `icon.ico`/`icon.png` that never existed —
  matching the "default Electron icon is used" line in every prior build log
- Fixed via narrow Plan + independent Formal Review (both approved): generated a padded
  7-resolution `.ico` via a one-time script (`sharp` + new `png-to-ico` devDependency), corrected
  `main.ts`'s `BrowserWindow.icon` (was pointing at the same nonexistent file found during the
  white-screen investigation)
- **Verified directly, not deferred**: extracted the actual embedded icon from the packaged `.exe`
  and installer `.exe` via Windows' own icon-extraction API and visually confirmed the correct
  mark on both; re-confirmed white-screen fix and Firebase config intact on the same build
- Promoted via PR #10, tagged `v1.0.0-rc5`; built and verified the second replacement installer
  (`Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc5.exe`, SHA-256
  `e07914692ad2ff507bce279522852acf4bd9e89eb75d04da2221e3f05c17d011`, different from both prior
  checksums); `v1.0.0-rc4` preserved on disk for the incident record
- **`v1.0.0-rc5` supersedes `rc4` for owner retest** (includes both fixes) — Phase G smoke testing
  does not resume until that retest passes

## 2026-07-30 - production-release: Production Studio white-screen incident diagnosed and fixed; replacement installer built (deployment-order step 8 of 12, blocked on owner retest)

- First production Studio installer white-screened on the owner's machine; this sandboxed
  environment could not reproduce it directly (packaged `.exe` exits silently, a genuine
  environment limitation), so requested owner-captured runtime evidence via `--enable-logging`
- Ruled out Firebase environment injection and packaged asset paths with direct `asar` extraction
  evidence, not guesses
- Confirmed root cause: `vite.config.ts`'s `manualChunks` used a substring match that missed
  `scheduler` (react-dom's runtime dependency), producing a circular chunk dependency that Rollup
  only warned about (didn't fail the build) and crashed on `React.createContext` in packaged
  builds only — never reproducible via `npm run dev`
- Fixed via narrow Plan + independent Formal Review (both approved): package-boundary chunk match,
  explicit `scheduler` inclusion, a build-failing `onwarn` hook for future `CIRCULAR_CHUNK`
  warnings, and an unrelated dead favicon reference removed
- Verified via direct extraction that `scheduler` now lives in `react-vendor`; full
  build/typecheck/lint/diff-check all exit 0; promoted via PR #9, tagged `v1.0.0-rc4`
- Built and verified the replacement installer (`Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc4.exe`,
  SHA-256 `a0be8e956108bc786fe3ea629f7dc356bb0e28ed09b60d740c31a64c1bf177ed`, deliberately different
  from the original failed checksum)
- **Blocked on owner install/launch/login retest** — Phase G smoke testing does not resume until
  that retest passes

## 2026-07-30 - production-release: Production Studio installer built, first owner account bootstrapped (deployment-order step 8 of 12)

- Presented consolidated Phase D bootstrap list for owner approval before any Firestore write:
  `settings/emailProviders` (approved, owner will set via Studio UI) and at least one category
  (approved, owner will create via Studio UI)
- Found a genuine gap: no automated way exists in this codebase to create the first owner
  account (normal user-creation requires an existing owner caller; Rules block client writes to
  `users/*`) — walked the owner through the exact manual two-part Console procedure; **owner
  confirmed the first production owner account now exists**
- Confirmed `rebuildCatalogSnapshots` is source-safe on a fully empty catalog but deliberately
  held until real catalog data exists
- Studio source audit confirmed triple-layered protection against the Test Data Reset UI ever
  shipping to production; no hardcoded Portal URL or other dev-only assumption found
- Built the production Studio installer following the recommended safest env-file-swap approach
  (backup → temporary production values → build → restore) on the verified `production` commit;
  build + packaging exit 0
- **Produced `Fresh Prints-Windows-0.0.0-Setup.exe`** (~102.3 MB, SHA-256
  `c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`, unsigned); not uploaded or
  distributed publicly
- Next: owner installs and runs Phase G smoke testing (Portal + installed Studio + backend
  checklist), then Phase D's remaining owner-driven Studio setup resumes

## 2026-07-30 - production-release: First App Hosting Portal release complete (deployment-order steps 6-7 of 12)

- Added App Hosting `env:` block (7 `NEXT_PUBLIC_FIREBASE_*` values + `NEXT_PUBLIC_PORTAL_ORIGIN`)
  sourced from the owner's gitignored `.env.production.local`; `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  deliberately omitted (separate GA4 checkpoint); promoted via PR #6
- First rollout attempt failed: `Missing dependency lock file at path '/workspace/apps/portal'` —
  root cause is a genuine gap in Firebase App Hosting's monorepo support (Nx/Turborepo only, not
  plain npm workspaces, which this repo uses)
- First fix hypothesis (`buildCommand`/`runCommand` overrides) was accidentally committed directly
  to `production` during implementation — caught before pushing, zero remote impact, corrected by
  resetting the local branch and reapplying properly via `development` → PR #7; retry failed
  identically, and owner-inspected Cloud Build logs disproved the hypothesis with direct evidence
- Root-cause fix (owner-directed, narrow Plan + Formal Review both approved): added minimal
  officially-documented Turborepo support (`turbo` devDependency, root `turbo.json`, required
  `packageManager` field), removed the ineffective override, kept the single root lock file and
  `rootDir` unchanged; verified locally across 7 checks, all exit 0; promoted via PR #8
- Retried the rollout: **"✔ Successfully created a new rollout!"** — the first-ever Fresh Prints
  production Portal deployment succeeded
- Verified live: homepage HTTP 200 with correct title, `robots.txt` allow-variant confirming
  correct production host resolution, no dev-project strings in served HTML
- Automatic rollouts remain disabled; next checkpoint is production settings/bootstrap inventory
  (deployment-order step 9 of 12)

## 2026-07-30 - production-release: Cloud Functions deployment complete (deployment-order step 5 of 12)

- Phase A non-secret Functions configuration audit found no source change required
  (`portalUrlResolver.ts`, `.firebaserc`, email-sender defaults all already matched owner intent)
- Fresh programmatic re-enumeration on the verified `production` commit reconfirmed 105 total
  exports / 99 include / 6 exclude, byte-identical to the previously approved allowlist
- Created `functions/.env.fresh-prints-prod` (gitignored, matching the existing repo convention)
  to resolve two non-secret `defineString` params under non-interactive CLI deploy mode
- Owner approved `--force` for one specific, reviewed reason: `onEmailDeliveryJobCreated` has a
  pre-existing, intentional `retry: true` trigger option
- First deploy attempt landed 84 of 99 functions; 15 failed with transient quota/Eventarc-
  propagation errors expected on a brand-new project's first bulk 2nd-gen deploy — verified via
  authoritative `firebase functions:list --json` that all 84 were correctly on the allowlist
  before retrying
- Scoped retry of exactly the 15 missing functions succeeded, ending in an explicit "Deploy
  complete!"
- **Final verification: exactly 99 functions deployed, byte-identical to the approved allowlist
  (zero drift), 0 of the 6 excluded functions present, all in `us-central1`, no function in a
  non-ACTIVE state, `rebuildCatalogSnapshots` present** (deployed, not yet invoked)
- **No secret value was ever accessed, printed, or logged. No excluded Function deployed. No App
  Hosting, Portal, DNS, Auth, or production-data action occurred; `production` received no Git
  commit**
- Next checkpoint: App Hosting environment-variable configuration and first Portal release
  (deployment-order step 6 of 12)

## 2026-07-30 - production-release: Firestore indexes checkpoint closed; Secret Manager population complete (deployment-order steps 3-4 of 12)

- Owner confirmed via Firebase Console that all 65 of 65 composite indexes on `fresh-prints-prod`
  show `Enabled` — 0 `Building`, 0 `Error`. Deployment-order step 3 of 12 closed.
- Source-level audit of `functions/src/lib/secrets.ts` on the verified `production` commit found
  exactly 4 required secrets: `GEMINI_API_KEY`, `RESEND_API_KEY`, `BREVO_API_KEY`,
  `ETSY_X_API_KEY` — cross-referenced against the approved 99-function allowlist with no
  inconsistency; confirmed zero `OPENAI_API_KEY` references anywhere in source
- Confirmed from source (not guessed) that the email-provider system defaults to Resend and does
  not fail closed on a missing `settings/emailProviders` document; owner selected both Resend and
  Brevo for launch flexibility
- Owner confirmed all four external provider credentials AVAILABLE and sender
  domains/access VERIFIED — no blocker identified
- Pre-population metadata check confirmed all four secrets absent (no overwrite risk); owner
  populated all four via `firebase functions:secrets:set` in their own terminal (this tool cannot
  host an interactive value prompt); post-population metadata confirmed all four at version 1,
  state ENABLED
- **No secret value was ever printed, logged, or exposed at any point. No secret created in
  `fresh-prints-dev`. No Cloud Functions, App Hosting, or other Firebase component deployed;
  production received no Git commit; `master` untouched**
- Next checkpoint: owner approval to deploy Cloud Functions (approved 99-function allowlist),
  deployment-order step 5 of 12

## 2026-07-30 - production-release: Firestore indexes deployed to fresh-prints-prod (deployment-order step 3 of 12)

- Redeployed `firebase deploy --only firestore:indexes --project fresh-prints-prod` on the
  verified corrected `production` commit (merge `21f036f`) — exit 0, "Deploy complete!", no
  deletion prompt
- Post-deploy remote state: 65 indexes, 0 field overrides, all 16 collection groups represented
- Precise canonical-identity comparison confirmed 0 missing / 0 unexpected — every local
  definition present remotely with matching content
- Remaining: owner Console confirmation that every index shows `Enabled` (not obtainable from CLI
  output alone)
- **No other Firebase component deployed; production received no Git commit; `master` untouched**

## 2026-07-30 - production-release: Firestore index duplicate remediated (Plan + Formal Review approved, committed to development, PR prepared)

- Canonical duplicate audit of `firestore.indexes.json` found exactly one duplicate group:
  `customerUploads` `purpose ASC + catalogReviewStatus ASC` at array positions 44 and 50,
  byte-identical; confirmed the legitimate two-field/three-field prefix pair remained distinct
- Provenance traced via `git blame`: kept copy from commit `043f38a` (2026-07-13, donate-designs
  feature, deliberate pair with the three-field index); removed copy from commit `cbba4ca`
  (2026-07-14, unrelated feature commit, accidental re-addition)
- Confirmed remote `fresh-prints-prod` state unchanged (50 indexes, 0 field overrides) — nothing
  touched remotely
- Wrote and independently reviewed a narrow remediation Plan — Formal Review independently
  re-derived the audit and provenance from scratch, verdict **approved**
- Implemented the exact, narrow correction (removed only the 14-line duplicate block; zero other
  changes); corrected file: 65 unique definitions, 0 duplicates
- Added deterministic duplicate-validation test
  (`packages/shared/src/constants/firestoreIndexesDuplicateValidation.test.ts`, matching the
  existing `storageRulesAlignment.test.ts` convention) — 4/4 pass
- Full verification: JSON valid, validator 4/4, Rules 48/48, lint clean, diff-check clean — all
  exit 0
- Committed narrowly (4 files) to `development`, pushed; production PR prepared (not merged — no
  `gh` CLI available)
- **The 50 indexes already on `fresh-prints-prod` were not touched; no `firebase deploy` command
  of any kind was run; `production` received no Git commit; `master` untouched**

## 2026-07-30 - production-release: Storage Rules DEPLOYED to fresh-prints-prod (deployment-order step 2 of 12)

- Owner approved via `APPROVE STORAGE RULES DEPLOYMENT`; ran the full pre-deploy safety sequence
  (switch to `production`, fast-forward-only pull, verified `HEAD`/`origin/production`/
  `storage.rules` hash all exact matches, 48/48 Rules tests, clean `git diff --check`)
- Deployed exactly `firebase deploy --only storage --project fresh-prints-prod` — **exit 0,
  "Deploy complete!"** — the first-ever Fresh Prints production Storage Rules deployment
- No other Firebase component touched (no Firestore Rules redeployment, indexes, Functions, App
  Hosting, secrets, DNS, production data, `rebuildCatalogSnapshots`, Studio distribution,
  GA4/Search Console)
- Returned to `development` (clean, fast-forward pull); confirmed `origin/production` received no
  Git commit from this pass — only the Firebase Storage Rules release occurred
- Provided owner Console verification steps (Storage Rules tab, "Last published" timestamp)
- Deployment-order step 2 of 12 now complete; step 3 (Firestore indexes) is the next checkpoint

## 2026-07-30 - production-release: development promoted to production via GitHub PR #3, v1.0.0-rc2 tagged

- Committed the owner-confirmed intentional Studio TypeScript fix (`apps/studio/tsconfig.json`,
  TS 5.9.3 compatibility, no runtime change) to `development` as `dd05ef2`, pushed
- Verified the full 8-commit/9-file promotion diff before the PR — no behavioral file changed, no
  secret/env leak
- Owner created and merged GitHub PR #3 ("Release: promote verified development state to
  production") — confirmed via GitHub API, merge commit `a8b02c9`
- Ran the complete release verification suite on the exact merged `production` commit: Functions
  build, Portal/Studio typecheck, Portal/Studio build, repo lint, 48/48 Firebase Rules emulator
  tests, `git diff --check` — all exit 0
- Fresh Functions export enumeration re-confirmed 105 total/99 include/6 exclude,
  `rebuildCatalogSnapshots` included — approved allowlist unchanged
- Confirmed `firestore.rules`/`storage.rules`/`firestore.indexes.json` hashes unchanged —
  Firestore Rules remain correctly deployed, no redeployment needed
- Created and pushed annotated tag `v1.0.0-rc2` on the verified merge commit;
  confirmed `v1.0.0-rc1` unchanged
- Returned to `development`, clean tree, `production` confirmed at the verified commit
- **Entire promotion went through the protected GitHub PR workflow — no bypass, no force-push, no
  Firebase deployment occurred**

## 2026-07-30 - production-release: Firestore Rules DEPLOYED to fresh-prints-prod (first production Firebase deployment of this goal)

- Owner approved via `APPROVE FIRESTORE RULES DEPLOY`; ran the full pre-deploy safety sequence
  (switch to `production`, fast-forward-only pull, verified `HEAD`/`origin/production`/
  `firestore.rules` hash all exact matches to required values)
- Deployed exactly `firebase deploy --only firestore:rules --project fresh-prints-prod` — **exit
  0, "Deploy complete!"** — the first-ever Fresh Prints production Firestore Rules deployment
- No other Firebase component touched (no Storage Rules, indexes, Functions, App Hosting,
  secrets, DNS, production data, Studio build, GA4/Search Console)
- Returned to `development` (clean, fast-forward pull); confirmed `origin/production` received no
  Git commit from this pass — only the Firebase Rules release occurred
- Provided owner Console verification steps (Rules tab, "Last published" timestamp)
- Deployment-order step 1 of 12 now complete; step 2 (Storage Rules) is the next checkpoint

## 2026-07-30 - production-release: corrected deployment-order framing, prepared Firestore Rules deployment checkpoint (not yet deployed)

- Corrected a prior pass's misleading framing that implied the App Hosting first release was the
  immediate next step — restated the approved 12-step deployment order (Rules → Storage Rules →
  indexes → secrets → Functions → App Hosting env vars → first release → Studio build → settings →
  domain → smoke tests → GA4), with Firestore Rules deployment as the actual current checkpoint
- Restated accurately: `fresh-prints-prod`'s products and App Hosting backend are configured (not
  empty), but no Rules/indexes/Functions/Portal release have been deployed
- Compared `firestore.rules` between `development` and `production` — identical Git blob hash on
  both, confirming no merge is needed before deploying Rules
- Ran the real `npm run test:rules` Firestore/Storage emulator suite (documented portable JDK 21
  workaround) — 48/48 pass
- Confirmed this would be the first-ever Rules deployment to `fresh-prints-prod` (no prior version
  to roll back to on this project); documented the rollback method for future changes
- Prepared, but did not execute, `firebase deploy --only firestore:rules --project
  fresh-prints-prod`
- **No deploy command run; no Rules/indexes/Functions deployed; no secret set; no production data
  touched; `production` untouched**

## 2026-07-30 - production-release: Firebase products enabled in fresh-prints-prod, App Hosting backend created with no rollout (not yet deployed)

- Verified (read-only) owner-reported Firebase product enablement: Firestore Native mode `nam5`,
  Storage `us-central1`, Authentication (Email/Password + Google), Web App
  `Fresh Prints Portal Production` registered (classic Hosting skipped), VAPID key generated, GA4
  still disabled, zero production data created
- Confirmed `apps/portal/.env.production.local` is gitignored, untracked, and absent from `git
  status` — no file content read or printed
- Confirmed App Hosting values (`fresh-prints-portal` backend ID, `apps/portal` root) against
  `firebase.json` — match exactly
- Owner clarified the App Hosting backend was created via Finish-only, `us-central1`, and shows
  "Waiting for your first release" — no rollout occurred
- **Empirically resolved** the open question of whether backend creation triggers an automatic
  rollout: confirmed no — backend configuration and first release/deploy are separate steps
- Updated `docs/standards/DEPLOYMENT.md` with a status table distinguishing backend configuration
  (complete) from an actual release/deployment (not performed; zero production traffic)
- **No Firebase deployment, secret configuration, DNS configuration, or production data creation
  occurred; `master`/`production` untouched**

## 2026-07-30 - production-release: email findings redacted from current tree, history rewrite declined, Firebase enablement instructions finalized (not yet deployed)

- Redacted both email findings from the prior audit pass from the current tracked tree (3 files,
  non-real placeholders used); confirmed via `git grep` zero occurrences of either original
  address remain
- Owner explicitly declined a Git-history rewrite (neither finding a credential, no third-party
  customer data, disproportionate remediation risk) — historical commits touching the affected
  files still contain the original addresses; a future history-rewrite Plan remains available if
  the owner later decides it's necessary
- Security audit verdict remains **PASS**
- Ran the focused unit test for the modified test file (3/3 pass), repo lint (clean),
  `git diff --check` (clean)
- Finalized Firebase product-enablement instructions with evidence-based location
  recommendations: Firestore `nam5`, Storage `us-central1` — both sourced directly from this
  repository's own dev-setup documentation, cross-checked against the confirmed `us-central1`
  Functions region
- Confirmed App Hosting backend ID (`fresh-prints-portal`) and root directory (`./apps/portal`)
  directly from `firebase.json`
- Flagged `[NEEDS REPO CHECK]`: whether App Hosting backend creation triggers an automatic first
  rollout (unprovable from repo source), and the exact production env file naming convention (not
  yet established, though any `.env.*.local` name is safely gitignored)
- **No repository visibility change, no Git history rewrite, no force-push, no Firebase action, no
  production configuration of any kind; `master`/`production` untouched**

## 2026-07-30 - production-release: repository made public, production ruleset confirmed active, full security audit PASS (not yet deployed)

- Re-verified branch/tag state directly from Git (unchanged: `master`/`production` both at
  `aa570aa`, `development` advanced by prior documentation commits, `v1.0.0-rc1` unchanged) —
  `master`/`production` untouched this pass
- Independently confirmed via the live GitHub API (not just owner report) that the repository is
  genuinely public and the `production` ruleset is genuinely active with restrict-deletions,
  block-force-pushes, and require-PR-before-merge rules all present — supersedes the prior
  "not enforced" report
- Performed the full public-repository security audit: current tree + all 131 reachable commits
  across all 17 refs scanned for credentials, private keys, service-account files, PEM keys,
  common token prefixes, and personal/customer data
- **Result: PASS** — no probable real credential, private key, service-account file, or
  third-party customer/financial/legal/personnel data found anywhere
- One non-blocking finding: the owner's own real personal email address in one internal
  dev-debugging workflow document — `[NEEDS OWNER DECISION]` on redaction, not a release blocker
- Reviewed public non-secret content (architecture, workflow artifacts, deployment docs, project
  IDs, Functions allowlist) — all classified acceptable for a public repository
- Re-documented the local pre-push hook as optional defense-in-depth now that the GitHub ruleset
  provides confirmed server-side protection
- **No repository visibility change made this pass (already public); no Git history rewritten; no
  force-push; no Firebase action; `master`/`production` untouched**

## 2026-07-30 - production-release: GitHub ruleset limitation recorded, local pre-push safeguard added (not yet deployed)

- Re-verified all branch/tag facts directly from Git (not assumed): `development` current branch,
  clean tree, `origin/master`/`origin/production` both at `aa570aa`, `origin/development` advanced
  with the prior documentation commit, `v1.0.0-rc1` unchanged — `master`/`production` untouched
  this pass
- Recorded the GitHub `production` ruleset accurately: created, targets `production`, but **not
  enforced** on this private repository per GitHub's own message, pending an organization plan
  upgrade the owner isn't doing this pass; documented the intended settings as future-ready
  configuration only, not a present guarantee
- Checked for existing hook conventions (none found) and added `.githooks/pre-push` — a tested
  local safeguard blocking direct pushes to `production` with an `ALLOW_DIRECT_PRODUCTION_PUSH=1`
  emergency override; left inert (`core.hooksPath` unconfigured) pending separate owner approval
- Substantially expanded `docs/standards/DEPLOYMENT.md`: ruleset status, safeguard docs, refined
  PR-based promotion workflow, Firebase branch/project-separation rules, and beginner-friendly
  Firebase product-enablement instructions (Firestore mode/location flagged permanent, Storage,
  Auth, Web App registration with config kept local/uncommitted, Web Push cert, App Hosting backend
  preparation without its first rollout)
- **No Firebase Console action performed on the owner's behalf; `production` not modified;
  `master` not deleted; no force-push occurred**

## 2026-07-30 - production-release: permanent `production`/`development` branches created, v1.0.0-rc1 tagged (not yet deployed)

- Verified the owner-pushed release candidate before any git action: `master`/`origin/master` both
  at `b45542ab66a9f6fafb1142201b29fc6d7a969376`, clean working tree, matching commit message
- Confirmed via `git show b45542ab:.firebaserc` that the `production` alias was missing from the
  pushed commit; added it in a narrow follow-up commit `aa570aa` ("chore: add production Firebase
  project alias"), pushed to `origin/master`
- **Branch-point commit: `aa570aa875d20ba85fd405480a47e6eda59f85b0`**
- Created and pushed permanent branch `production` from that exact commit (no additional commits
  added to it)
- Created and pushed permanent branch `development` from the identical commit; repository left
  checked out on `development`
- Verified `origin/master`, `origin/production`, `origin/development` all resolve to the same hash
  after `git fetch origin`; confirmed upstream tracking and clean working tree
- Created and pushed annotated tag `v1.0.0-rc1` on the branch-point commit (confirmed it didn't
  already exist first) — release-candidate only; final `v1.0.0` tag deferred until after production
  deployment + smoke tests pass
- Updated `docs/standards/DEPLOYMENT.md` with a permanent Branch Model section (development /
  production-release / hotfix workflows), superseding the previous direct-to-`master` policy
- `master` was **not** deleted — retained as a temporary transition fallback; deletion is a
  separate future checkpoint
- **No force-push occurred; no Firebase product enabled; no secret set; no production
  configuration of any kind occurred**

## 2026-07-30 - production-release: production project confirmed, Functions allowlist finalized, working tree reconciled (not yet implemented/deployed)

- Owner confirmed production Firebase project **`fresh-prints-prod`** (created, Blaze billing
  active, zero configuration); verified `functions/src/lib/email/portalUrlResolver.ts` already
  maps this exact id — no code change needed
- Finalized the 5 previously-flagged Functions: excluded `testAiEnrichmentPlayground`,
  `testAiEnrichmentTagRerank`, `ownerDeleteUser`, `backfillPrintRequestQueueTab`; included
  `rebuildCatalogSnapshots` after full six-condition source verification (owner/admin-gated,
  non-destructive, project-agnostic, documented catalog-snapshot publication mechanism)
- **Final Functions allowlist (programmatically re-verified from fresh source): 105 total exports,
  99 include, 6 exclude** — exact future deploy command prepared, not executed
- Reconciled the 541-entry working tree: classified into real completed/approved product work
  (~10 named goals), Goal #13 docs, retained Goal #12 dev-only tooling, and one unrelated
  uncertain-provenance deletion (left untouched, flagged for separate owner decision); removed
  exactly one proven-debris scratch script (`functions/test-admin-auth.mjs`); confirmed zero
  secret-bearing or build-output files in the changed set; confirmed dev-only Studio gates
  (Test Data Reset, Catalog Storage Inventory, Firebase Debug window) remain build-time-gated
  regardless of target project
- Proposed release-source strategy: reconcile on `master` in ~11 goal-sized commits, no new branch
  (repo has no release-branch precedent; owner already decided against a new branch policy)
- Prepared, not applied, an additive `.firebaserc` production alias
- Verification (read-only/local only): Functions build, Portal/Studio typecheck, Portal build,
  Studio build, repo lint, `git diff --check` — all exit 0; no `firebase deploy` command run
- **No production resource was created, configured, modified, or deployed; no commit or branch
  created**
- Artifacts: `docs/workflow/reviews/2026-07-30-production-release-working-tree-reconciliation-report.md`,
  `docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`,
  `docs/workflow/reviews/2026-07-30-production-release-source-and-allowlist-checkpoint.md`

## 2026-07-30 - customer-upload-early-transparency-format-validation (Goal #14, approved)

- Narrow, separately-scoped follow-up run alongside the paused `production-release` (Goal #13);
  did not touch #13's state or checkpoint.
- Root cause: `processCustomerUploadImageBytes` (`functions/src/lib/customerUploadProcessing.ts`)
  entered the `trimming` progress stage before its validation-time transparency trim *probe*'s
  pass/fail verdict was known, so a rejected upload (corrupt, unsupported format, or not meaningfully
  transparent) could transiently show the Portal's "Trimming transparent edges…" label before failing.
- Fix: removed the premature `stageTimer.enter("trimming")` call ahead of the probe — it now stays
  attributed to the existing `checking_transparency` stage (validation, not production trimming).
  Production trimming for valid images is unchanged.
- Applies uniformly to Customer Upload, Donate Design, retry, and ZIP processing — confirmed via
  source that all four share this one function with no caller-specific branching; no caller-side code
  changed.
- Confirmed accepted-format policy (PNG + static WebP) and transparency thresholds unchanged/out of
  scope; format detection was already decode-driven, not filename/MIME-driven.
- 23/23 automated tests pass (4 new + 2 extended, using an `onStage` spy to assert `trimming` is never
  observed for a rejected upload); Functions build clean; repo lint clean; `git diff --check` clean.
  Portal typecheck/build omitted — no Portal/shared UI files touched.
- Owner deployed this change to `fresh-prints-dev` and ran manual QA directly, confirming **PASS**
  across all 5 goal-brief scenarios.
- Artifacts: `docs/workflow/plans/2026-07-30-customer-upload-early-transparency-format-validation-plan.md`
  and sibling `-review.md`/`-test-report.md`/`-signoff.md` (`approved`) of the same date/slug.

## 2026-07-30 - production-release Implementation-readiness checkpoint (stopped at project-creation checkpoint)

- Owner recorded 18 binding production decisions (separate project, exclusion list, canonical
  domain + www redirect, deploy-process continuity, GA4 gating, monitoring approach, allowlist
  discipline)
- Resolved every `[NEEDS REPO CHECK]` from the approved Plan by reading current source fresh, not
  reusing an earlier session's memory:
  - Full current Functions export list re-enumerated (89 recommended include / 2 explicit exclude
    `wipeOperationalTestData` + `inventoryCatalogImageStorage` / 5 flagged for owner classification)
  - Full 61-index `firestore.indexes.json` read end-to-end — no duplicates or dev-only indexes found
  - Found `functions/src/lib/email/portalUrlResolver.ts` as the exact production-URL-mapping file —
    **flagged that it already assumes project id `fresh-prints-prod`**, requiring correction if the
    owner picks a different id
  - Traced Studio's Firebase config as build-time Vite env (`apps/studio/.env.local`), packaged by
    electron-builder — production installer needs a separate build with swapped env values
  - Confirmed zero error-tracking/monitoring dependencies exist in any package.json
  - Audited the live 542-entry working tree — not yet in a clean, committable state for a
    production build source (unrelated to this goal's own scope)
  - Classified cold-start Firestore settings (categories recommended first; most settings have safe
    code defaults; email provider should be explicitly chosen before first transactional send)
  - Prepared the secrets/provider checklist (`GEMINI_API_KEY`, `RESEND_API_KEY`, `BREVO_API_KEY` if
    selected, `ETSY_X_API_KEY`, Authorized Domains, sender verification) without exposing any value
- Wrote beginner-friendly Firebase Console project-creation instructions and the exact 4-item
  return checklist (project ID, creation confirmation, billing/Blaze status, no-deployment
  confirmation)
- Verification (read-only/local only): Functions build, Portal typecheck, Portal build, Studio
  build, repo lint, `git diff --check` — no `firebase deploy` command of any kind was run
- **No production resource was created, configured, modified, or deployed in this pass**
- Artifact: `docs/workflow/reviews/2026-07-30-production-release-implementation-readiness-checkpoint.md`

## 2026-07-30 - production-release Plan + independent Formal Review (approved_with_notes, not yet implemented)

- Wrote `docs/workflow/plans/2026-07-30-production-release-plan.md`: confirmed via direct source
  read that no production Firebase project exists anywhere in the repo (`.firebaserc` has only
  `fresh-prints-dev`) — this is a first-time production launch, not a promotion
- Plan covers: exact ship/exclude scope (Test Data Reset UI and `inventoryCatalogImageStorage` are
  both already excluded from production Studio builds by existing code-level gates, not just
  policy), Functions deployment allowlist approach, Rules/Indexes/App-Hosting scope, env-var +
  Secret Manager inventory (`GEMINI_API_KEY`, `RESEND_API_KEY`, `BREVO_API_KEY`, `ETSY_X_API_KEY`),
  production domain (`myprintrequest.com`) and Authorized Domains requirement, GA4 go-live
  5-step sequence (deferred from the `portal-google-analytics` goal), SEO readiness (already
  fail-closed and code-complete per that goal's signoff), branch/release strategy (repo has no
  CI/CD or release-branch convention — recommends continuing current direct-to-master pattern),
  cold-start migration determination (no data to migrate), 10-item post-deploy smoke test,
  per-component rollback strategy, and a 10-checkpoint human-approval sequence
- Wrote `docs/workflow/reviews/2026-07-30-production-release-review.md`: independent verification
  against direct source reads (not the Plan's own prose); verdict **approved_with_notes** — no
  fabricated file/API/mechanism found, four minor scoping gaps flagged as first Implementation
  sub-steps (not blocking)
- 12 `[NEEDS OWNER INPUT]` items and 7 `[NEEDS REPO CHECK]` items consolidated in the Plan for
  owner review before Implementation begins
- **No implementation, deployment, migration, secret, or production action occurred in this pass**

## 2026-07-30 - Catalog image derivative Storage consolidation (closed_by_owner_after_inventory)

- Investigated consolidating catalog thumbnails (320×320 WebP Q80) and previews (1280×1280 WebP
  Q85) into one shared display derivative; two rounds of owner sample review (real UI-rendering
  measurement + a synthetic contact sheet showing exact browser upscale factors at the shared
  lightbox) converged on **1024×1024 WebP Q82, no separate thumbnail**
- Built, independently security-reviewed, and deployed a dry-run-only, owner/admin-restricted
  `inventoryCatalogImageStorage` Cloud Function to `fresh-prints-dev`; added a dev-only Studio
  "Run Catalog Storage Inventory" panel after direct DevTools-console invocation proved impossible
  (bare npm imports don't resolve in the Electron renderer console)
- **Owner ran the real inventory**: 87 designs; originals 81 objects / 980,807,863 bytes (**97.66%
  of catalog Storage**); thumbnails 87 objects / 2,820,654 bytes; previews 81 objects /
  20,676,202 bytes; display derivatives 0; zero orphans, zero missing objects, zero promotion-
  cool-off duplicates, zero purge-policy violations
- **Owner decided to close the goal before implementation** — an evidence-based decision: the
  addressable byte pool (existing thumbnails+previews combined, ~22.4 MB, ~2.3% of total) was too
  small relative to the required backfill, Portal/Studio consumer cutover, and accepted grid-
  bandwidth increase (~86 KB vs ~23 KB per typical 8-card grid) to justify completing the
  migration, since production originals (97.66% of Storage) must remain unchanged regardless
- The migration was **never implemented**: no `displayPath` was populated on any design, no
  consumer was migrated, no backfill ran, no thumbnail/preview was deleted, no production
  original was modified, no cleanup/deletion tooling was built (none was justified — the real
  inventory found zero candidates)
- Interrupted mid-Implement scaffolding (`displayPath` type fields, migration-only constants, an
  unused Storage-path helper, and their dedicated tests) was inspected file-by-file against
  baseline and removed narrowly; zero unrelated pre-existing work (from other in-progress or
  already-signed-off goals sharing this working tree) was touched or reverted
- Retained as dev-only diagnostic tooling: the read-only inventory callable, its pure
  classification logic, and the Studio invocation panel — explicitly excluded from any future
  production deployment unless separately reviewed and approved
- Functions build, Portal typecheck, Studio build, repo lint, changed-file lint, `git diff --check`
  all exit 0; 53/53 retained focused tests pass
- No migration, backfill, deletion, or production action occurred at any point; production
  untouched throughout
- Signoff:
  `docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-signoff.md`
- Unblocks `production-release` (Goal #13) — Goals #9–#12 are now all signed off/closed; Goal #13's
  Plan + Formal Review phase started immediately after this closure

## 2026-07-30 - Customer-upload oversized-pixel normalization and processing-timeout followup (approved_with_notes)

- Fixed the exact root cause of oversized-canvas transparent PNGs being permanently rejected: the
  dimension/pixel-ceiling check ran on raw source metadata **before** any trim attempt; reordered
  to bounded-decode → trim → normalize-if-still-oversized so a trimmable oversized canvas is
  accepted at full fidelity
- Caught and fixed a real design flaw during implementation itself, via a failing test: binding the
  decoder's `limitInputPixels` to the app-level 100M-pixel ceiling would have rejected the decode
  before trim could ever run, defeating the entire fix — corrected to sharp's own built-in decoder
  default (~268.4M px)
- New downscale-only normalization pass (`normalizeForDimensionCeiling`, strictest-of-three-
  ceilings-wins), structurally independent of the existing controlled-upscale pass — new
  `wasNormalizedForDimensions` field, explicitly documented as independent of `wasUpscaled`
- Eliminated 2 of 3 redundant full-resolution decodes in `trimTransparentEdges`
- New pure, directly-testable stage watchdog (`customerUploadFinalizeWatchdog.ts`, mirroring
  `withTimeout.ts`'s precedent) wired into `finalizeCustomerUpload`/`retryCustomerUploadProcessing`
  at 480s — writes an explicit `processing_timed_out` failure (new, retryable) before the platform's
  own 540s timeout can silently leave an upload stuck at `processing` forever
- Sanitized per-stage timing instrumentation added; new ADR-FP-125 (narrow ADR-FP-080 downsampling
  exception) recorded
- 80 MB vs. 100 MB: no enforced value changed; four stale handoff docs corrected
- 28 new/updated tests, all passing; Goal #9 ZIP regression + byte-limit-alignment tests re-run
  unmodified, 12/12 pass; Functions build, Portal typecheck/build, repo lint all exit 0
- Independent Implementation Review: **approved_with_changes** (one documentation-precision note,
  applied)
- Deployed to `fresh-prints-dev`: `finalizeCustomerUpload`, `retryCustomerUploadProcessing` only —
  both "Successful update operation," exit 0; no Storage/Firestore Rules, indexes, App Hosting, or
  other Functions touched
- Owner QA: **PASS WITH NOTES** — all functional behavior correct; oversized-canvas uploads take
  proportionally longer at the trim stage (expected, given pixel-count/transparency-workload
  scaling) but always complete, never stuck
- No migration, Storage cleanup, or production action at any point; production untouched
- Signoff:
  `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-signoff.md`

## 2026-07-29 - Assisted Creation reference-image MB limit increase (approved)

- Owner selected **40 MB per file** (Option 3), **8 files unchanged**, and a **320 MB combined
  pre-upload ceiling** (= 8 × 40 MB exactly)
- All four per-file enforcement layers updated to 40 MB: Portal client validation, submit-path and
  update-path trusted-server parsers, and `storage.rules`; a pre-existing Storage Rules boundary bug
  (`<` exclusive vs. the TS validators' inclusive semantics) was found and corrected to `<=`
- New 320 MB combined ceiling enforced client-side before any upload begins, correctly excluding
  removed/replaced kept-reference bytes; server-side parsers as defense-in-depth only
- New ADR-FP-124 records the decision, architecture, cost/risk analysis, and deployment checkpoints
- **First owner QA pass returned FAIL**: a reference image between 15 MB and 40 MB was accepted by
  the Portal picker but rejected at Submit with the stale "15 MB" message. Root-cause investigation
  confirmed this was a **Cloud Functions deployment gap, not a source-code defect** — Storage Rules
  had been deployed for this goal, but `submitAssistedCreationRequest`/
  `customerUpdateAssistedCreationRequest` had not, so the live callables were still running
  pre-goal compiled code
- **Amendment 1**: added 9 targeted regression tests proving the exact 15–40 MB boundary and that
  error messages never mention "15 MB"; confirmed (Formal Review binding condition) that a scoped
  Functions redeploy would carry only this goal's change, no unrelated in-flight Functions work
- Owner approved; deployed exactly
  `firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest`
  — both functions "Successful update operation," exit 0
- Reduced 5-step owner re-QA: **PASS**
- No customer-upload artwork, Goal #9 code, or catalog-derivative code touched; no new dependency
- Functions build, repository lint, Portal typecheck/build, Studio build, changed-file lint,
  `git diff --check` all exit `0` across both the original Implement and Amendment 1 passes; 53/53
  combined focused tests pass
- Two independent Implementation Reviews (original + Amendment 1): both **APPROVED**, no residual
  defects
- No migration, Storage cleanup, or production action at any point; production untouched
- Signoff:
  `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-signoff.md`
- **Queue reconciliation (documentation-only):** per owner instruction, added a new Goal #11,
  `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (not started, no
  Plan yet), pushing `catalog-image-derivative-storage-consolidation` to Goal #12 and
  `production-release` to Goal #13 (blocked until #9–#12 all sign off)
- Next queued: Goal #11, `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup`
  (not started)

## 2026-07-29 - Customer-upload oversized-image processing performance, Workstream A (approved)

- Root cause: `finalizeCustomerUploadZip.ts` processed every image in an uploaded ZIP
  **sequentially** — up to 100 images, each up to 100 megapixels, inside one 540s/2GiB `onCall`
- Replaced with bounded concurrency of 3 (`CUSTOMER_UPLOAD_ZIP_IMAGE_PROCESSING_CONCURRENCY`),
  aggregating `readyCount`/`failedCount`/`fileResults` deterministically after every task settles —
  never from a counter mutated inside a concurrently-running callback
- Evaluated the existing `DerivativeConcurrencyQueue` (Studio Electron) semaphore pattern first;
  confirmed it cannot be imported directly into Functions (`functions/tsconfig.json` excludes
  `apps/studio/electron`), so its mechanism was relocated — not forked — into a new shared
  `packages/shared/src/utils/boundedConcurrencyQueue.ts`
- New ADR-FP-123 records full worst-case memory arithmetic (100M-pixel decode ≈381.5 MiB, 2GiB
  function memory, 461.5 MiB per-image peak, concurrency-3 budget with a documented 25.1% safety
  margin; concurrency-4 correctly rejected at ~0.1% margin), separating proven constants from
  estimates requiring runtime validation
- `processCustomerUploadImageBytes` (the actual image-processing logic) was not modified; its
  existing 8-test suite passes unmodified — no processing-logic drift
- No accepted format, size/pixel limit, transparency rule, upscale policy, or the 200-DPI Print
  Request save floor changed; no Storage Rules, dependency, schema, or Function memory/timeout
  configuration changed
- Functions build, repository lint, changed-file lint, `git diff --check` all exit `0`; 31/31
  focused tests pass
- Independent Implementation Review against the real final diff: **APPROVED**, no residual defects
- No deployment, migration, Storage cleanup, or production action; owner QA not required
- This goal covers Workstream A only, per an owner-directed decision to keep three image-related
  goals separate and coordinated rather than merged (zero file overlap between them)
- Signoff:
  `docs/workflow/reviews/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-signoff.md`
- Next queued (at the time): Goal #10, "Increase the MB limit for custom-request reference images"
  — now also **Done**, see entry above

## 2026-07-29 - Pre-production static-analysis cleanup (approved)

- `npm run build:studio` and `npm run lint` both exit `0` — all 29 reproduced Studio/shared
  TypeScript diagnostics and all 41 reproduced lint findings (31 errors, 10 warnings) resolved
- Satisfied all three Formal Review binding conditions: bounded Show Queue read across
  Working/Queued/Printing tabs (`useShowQueuePrintRequests`), a `createRequire`-based lazy `sharp`
  loader with a new compiled-output discovery-time proof test
  (`functions/src/lib/lazySharpDeployDiscovery.test.ts`), and stable-ref/destructure fixes with
  dedicated tests for all 10 React hook `exhaustive-deps` warnings
- Corrected one stale test-fixture assertion (`assistedCreationAnswerDisplay.test.ts`) whose regex
  still targeted a removed enum literal's semantics after the fixture value itself had already been
  updated
- No product behavior, architecture boundary, Firebase Rule, dependency, or configuration changed;
  Portal typecheck/build, Functions build, `git diff --check`, and 101/101 focused tests all pass
- Independent Implementation Review against the real final diff: **APPROVED**, no residual defects
- No deployment, migration, or production action; owner QA not required
- Signoff:
  `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-signoff.md`
- Next queued (at the time): `customer-upload-oversized-image-normalization-and-processing-performance`
  — now also **Done** (Workstream A), see entry above

## 2026-07-29 - Studio Test Data legacy print-limit counter cleanup (approved)

- Owner QA **PASS**: preset/target label, truthful legacy/unenforced copy, exact preset selection,
  broad-preset inclusion, and cancel-without-wipe confirmation all passed
- Stable `printRequestDesignDailyLimits` target and exact delete behavior preserved; no active
  limit `L`, Current Request room, show capacity, security, or backend behavior changed
- Focused 28/28 and changed-file lint pass; documented Studio 29-error and repository 41-finding
  baselines remain for the next queued cleanup goal
- No wipe, deployment, migration, or production action
- Signoff:
  `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-signoff.md`
- Next queued (at the time): `preproduction-static-analysis-cleanup` — now also **Done**, see entry
  above

## 2026-07-29 - Portal print-request pre-launch stability (approved)

- Owner QA v18 **PASS**: Start, Pause, Resume, Finish, Studio completed placement/locking, dynamic
  Portal Printed state, and navigation reconstruction all work
- No `request_write (permission-denied)` error, false Retry warning, or Retry button remains
- Amendment 16 aligned Firestore's whole-document schema with current server-maintained `queueTab`
  and `showQueueBiddingAcknowledgment` fields while preserving client immutability and an exact
  completion-only transition
- Rules 48/48, focused 61/61, affected regression 143/143; known Studio build/lint baselines remain
- Owner reported the dev Rules deployment complete; missing CLI/ruleset evidence remains
  `[NEEDS OWNER CONFIRMATION]`; no redeploy or production action
- Signoff:
  `docs/workflow/reviews/2026-07-29-portal-print-request-prelaunch-stability-signoff.md`
- Next queued: `studio-test-data-print-limit-wipe-audit` (not started)

## 2026-07-27 - Firestore usage efficiency Wave C (PASS WITH NOTES)

- Bounded Firestore (queueTab-maintained, server-paginated, exact `getCountFromServer` counts) is
  now the sole, permanent Print Requests path for Studio and Portal
- Explored and then fully abandoned a private Storage-backed print-request JSON read-model cache
  (Studio staff-only + Portal customer-scoped) after a controlled real-publication test proved it
  didn't eliminate the read/latency cost it was built to remove — ADR-FP-121
- Every abandoned artifact (source, 3 Cloud Functions, Storage objects, Storage Rules, 2 Firestore
  indexes) fully removed from source and `fresh-prints-dev`
- Generated catalog/Design Library architecture (`generated/catalog-reference/**`,
  `generated/portal-catalog/**`) unaffected, remains active
- Owner **PASS** on both final Studio and Portal smoke tests 2026-07-27
- Signoff: `docs/workflow/reviews/2026-07-27-firestore-usage-efficiency-wave-c-signoff.md`
- Next queued: `portal-google-analytics` (not started)

## 2026-07-23 - Portal FAQ and How To (approved_with_notes)

- Public `/help` + Studio Settings CMS (`settings/portalHelp`); nav **Help** vs H1 **FAQ and How To**; Coming soon videos; seeded 8 FAQs on fresh-prints-dev
- Buy-yourself FAQ + Whatnot limits copy; no em dashes; theme picker hidden on `/help`
- Owner manual **PASS** 2026-07-23; ADR-FP-117 / ADR-FP-118
- Signoff: `docs/workflow/reviews/2026-07-23-portal-how-to-faq-signoff.md`
- Next queued: `portal-google-analytics` (not started)
## 2026-07-22 - Portal SEO foundations (approved_with_notes)

- Fail-closed robots (prod host only), sitemap + 1h revalidate, SSR `/share/design/{id}` in Portal shell, stable public OG images (ADR-FP-116)
- Guest Sign in CTA on catalog modal; share landing centering + theme picker polish
- Automated 20/20 + Portal typecheck/build pass; owner manual **PASS** 2026-07-22
- Signoff: `docs/workflow/reviews/2026-07-22-portal-seo-foundations-signoff.md`
- Next: `portal-how-to-faq` (plan + review ready; await APPROVE IMPLEMENTATION)

## 2026-07-22 - Brand logo uploads (approved_with_notes)

- Studio Settings four PNG slots (Studio/Portal × full/collapsed); Storage finalize + display-size callables; AR-locked W×H boxes; separate Portal header vs sidebar controls (defaults height 52)
- Soft-deployed to `fresh-prints-dev` (incl. mid-session `updateBrandLogoDisplaySizes`); production deploy **not** done
- Session polish: guest mobile Login hide, logo flash cache, height-only chrome sizing
- Adjacent out-of-band: Studio Design Library `createdAt` desc enforcement
- Owner **PASS** 2026-07-22; ADR-FP-114
- Signoff: `docs/workflow/reviews/2026-07-22-brand-logo-uploads-signoff.md`
- Next: idle — optional APPROVE production brand-logo Functions/rules; else await next goal

## 2026-07-22 - Firestore usage efficiency (approved_with_notes)

- Duplicate listener consolidation, AI Review counts, Portal library deferred hydrate, slim shell loads, bounded gallery, DEV tracer
- B4 / Wave C deferred; no production/rules/Functions deploy
- Owner **PASS** 2026-07-22
- Signoff: `docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-signoff.md`

## 2026-07-21 - Studio design download + newest sort (approved)

- Design details modal full-res Download (`originalPath`); Design Library default `createdAt` desc
- AI Review sort unchanged; unit 8/8 + eslint pass; Studio `tsc` TS5103 pre-existing documented
- Owner **PASS** 2026-07-21
- Signoff: `docs/workflow/reviews/2026-07-21-studio-design-download-and-newest-sort-signoff.md`
- Next: idle — await owner next managed goal

## 2026-07-21 - AI text title completeness (approved)

- Catalog titles keep full readable phrases; intermittency harden so reprocess stays stable
- Prompt `catalog-enrich-v25` / ADR-FP-113 amendments; Functions title unit + build pass
- Owner **PASS** (incl. soft-deploy + **3×** Sarcasm reprocess)
- Signoff: `docs/workflow/reviews/2026-07-21-ai-text-title-completeness-signoff.md`

## 2026-07-21 - #12/#13 Function redeploy leftovers PASS

- Owner **PASS**: with #14 already soft-deployed, #12 (`staffSuggestAssistedCreationCatalogDesign`) and #13 donation-path Function leftovers treated as live on `fresh-prints-dev`
- Small Managed **#1–#14** all Done; soft redeploy parked cleared

## 2026-07-21 - PASS ALL batch (noreply + AI context + #14 + OG letterbox)

- Owner **PASS ALL** closed four parked items
- Signoffs: `noreply-myprintrequest-email-sender-signoff.md`, `custom-request-ai-context-and-final-source-workflow-signoff.md`, `portal-og-letterbox-and-global-image-toggles-signoff.md`
- Soft-deploy: `onShowAllocationCreated` → `fresh-prints-dev` (exit 0); Small Managed **#14 Done**

## 2026-07-21 - Assisted Creation proof preview hang (approved)

- Studio + Portal proof thumbs hung on unbounded `getBytes` (ADR-FP-110); fixed signed-URL-first + timeouts (ADR-FP-112)
- Owner **PASS**; signoff: `docs/workflow/reviews/2026-07-21-assisted-creation-proof-preview-hang-signoff.md`
- Soft-deploy not required (client-only)

## 2026-07-21 - Portal assisted resume + guest auth overlay (approved)

- Assisted hub Reset/Continue mirrors Find; mobile Login required overlay raised above bottom nav
- Owner **PASS**; soft-signoff: `docs/workflow/reviews/2026-07-21-portal-assisted-resume-and-auth-overlay-signoff.md`

## 2026-07-21 - Custom request details parity + Addenda A–C (approved)

- Shared answer display rows; exact-wording draft; mood chips; Review card parity
- Owner **PASS** (checkpoint had been parked; PASS recorded with next-phase brief — not invented earlier)
- Soft-signoff: `docs/workflow/reviews/2026-07-21-custom-request-details-parity-signoff.md`

## 2026-07-21 - #12 Design Library proof-line (soft-signoff approved_with_notes)

- Owner **PASS** on Design Library proof-line UX (believes already passed; recorded)
- Soft-signoff: `docs/workflow/reviews/2026-07-21-library-design-sharing-proof-line-followup-signoff.md`
- Functions soft-deploy leftovers later **PASS** 2026-07-21 (owner: live given #14)
- Small Managed **#12 Done**

## 2026-07-21 - #13 login-required donate product PASS

- Owner: donation works great; login gate fine → product **PASS**
- Donation Functions redeploy leftover later **PASS** 2026-07-21 (owner: live given #14)
- ADR-FP-106

## 2026-07-21 - Portal customer temporary artwork background preview (approved)

- Compact **Background** swatch in design details → nested **Background Color** picker (16 shirt colors + custom hex); temporary local preview only
- Unit 4/4 + Portal typecheck; owner **PASS** (incl. title copy); no Firestore/OG writes; no soft-deploy
- Signoff: `docs/workflow/reviews/2026-07-21-portal-customer-temp-artwork-bg-preview-signoff.md`

## 2026-07-21 - Studio tag footer + Design Library Halftone + AI Processing artwork bg (approved_with_notes)

- Tag modal footer Clear left / Cancel+Apply right; Studio Design Library Halftone dock toggle; AI Needs Review artwork background on approve
- Owner **PASS**; signoff: `docs/workflow/reviews/2026-07-21-studio-tag-footer-halftone-filter-ai-artwork-bg-signoff.md`

## 2026-07-21 - Library OG rotation interval + per-design artwork backgrounds (approved_with_notes)

- Configurable library OG intervals (daily→30s) + Pick next; `artworkBackgroundHex` mats + OG letterbox; Functions soft-deployed to fresh-prints-dev
- Owner **PASS** (same “PASS on the previous work” covered this parked checkpoint); signoff: `docs/workflow/reviews/2026-07-21-library-og-rotation-interval-and-per-design-artwork-bg-signoff.md`

## 2026-07-20 - #13 Public browse + guest chrome / overlay (approved_with_notes)

- Public catalog browse without sign-in; guest chrome; in-shell dimmed auth overlay; login/register card styling
- Addendum A guest donate in repo then retired same day (login required); print-request uploads stay portal-customer only
- Owner UI **PASS** 2026-07-20; login-required donate product **PASS** 2026-07-21
- Signoff: `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-signoff.md` (**approved_with_notes**); ADR-FP-106
- Soft follow-up: donation Functions redeploy if guest-path retirement not live
- Small Managed **#13 Done**; **#14** closed later same week (soft-deploy 2026-07-21)

## 2026-07-20 - Portal account auth (#7–#10) + owner delete user

- **#7–#10** Portal reset password / change email / deletion request + Studio Test Data owner delete individual user; owner **PASS**
- Polish: Notifications **Back to settings**; Google Change email = new-account least resistance (no Sync); Delete user modal wider (~52rem), theme-matched confirm typography, copy button for `DELETE USER`, **list-only scroll** (no outer modal scrollbar)
- Signoff: `docs/workflow/reviews/2026-07-20-portal-account-auth-settings-7-10-signoff.md` (**approved**); ADR-FP-104
- Small Managed **#7–#10 Done**; next **#11** OG social meta, then **#12**

## 2026-07-20 - Show queue cutoff + countdown (#5) + library newest-first (#6)

- **#5** Studio cutoff setting + Functions enforce + Portal compact countdown; owner **PASS** (layout/copy/mobile polish)
- Signoff: `docs/workflow/reviews/2026-07-20-show-queue-cutoff-countdown-signoff.md` (**approved**); ADR-FP-103
- **#6** Portal catalog already `createdAt` desc default browse — owner **PASS** covered already; verification note only (no new code)
- Verification: `docs/workflow/reviews/2026-07-20-design-library-newest-first-verification.md`
- Small Managed **#5** + **#6 Done**

## 2026-07-20 - Upload page mobile actions layout (#4)

- Mobile: Back + Add to Request **side by side**; footer quota/room callout **full width**
- CSS-only `apps/portal/styles/customer-uploads.css`; Donate shares footer; ADR-FP-102 unchanged
- Typecheck pass; Portal soft-reload Ready; owner visual **PASS** 2026-07-20
- Signoff: `docs/workflow/reviews/2026-07-20-upload-page-mobile-actions-layout-signoff.md` (**approved_with_notes**)
- Small Managed Items **#4 Done**; next **#5** show queue cutoff (active)

## 2026-07-20 - Simple request-per-show limit (ADR-FP-102) + Portal UX polish

- Sole limit `L`; Cap A daily + Cap B remainder/choose-prints removed; atomic full-queue-or-reject
- UX: L banner/help, full helper, show callouts, qty-0, full card label, Upload overlay/slot/hydrate/ownership, upload/donate quota badges
- Owner **PASS** (“call all that PASSED”); signoff **approved_with_notes**
- Uniqueness keep confirmed (owner 2026-07-20); multi-request-under-L won't do
- Signoff: `docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-signoff.md`
- Small Managed Items **#3 Done**

## 2026-07-19 - Portal copy/UX polish batch (PASS)

- Cap B split callout title+body (`Each Customer Is Limited to…`); bidding acknowledgments **v3** (gang-sheet paragraph + funkyfreshprints.com); split qty auto-select; yellowish past-show chips
- Owner **PASS on everything**; Cap B allotment bug phase **not** closed
- Signoff: `docs/workflow/reviews/2026-07-19-portal-copy-ux-polish-batch-signoff.md`
- Bidding ack signoff updated: `docs/workflow/reviews/2026-07-18-portal-bidding-acknowledgment-signoff.md` (**approved**, v3)

## 2026-07-19 - Cap A exhausted card/modal copy polish

- Cards/modals: only **“Daily print limit reached”**; banner + Current Request drawer keep situational helper
- Owner soft-reload QA **PASS**; signoff **approved**
- Signoff: `docs/workflow/reviews/2026-07-19-cap-a-exhausted-card-modal-copy-signoff.md`
- Cap B allotment bug remains the active managed phase (not closed by this polish)

## 2026-07-19 - Portal cart/detail UX batch (duplicate preparing + cart polish)

- Optimistic duplicate: preparing UI; size/qty editable while pending; flush on real id
- Newest-first detail + cart; per-size cart rows (`W x H · Qty N`); Clear + quota meta bar; mobile scrollbar chrome hidden
- Owner **PASS on everything**; signoff **approved**
- Signoff: `docs/workflow/reviews/2026-07-19-duplicate-preparing-feedback-signoff.md`
- Closed related manual QA: cart newest-first, detail newest-first, cart per-size

## 2026-07-18 - Portal caps live Settings refresh

- Cap A banner, Current Request drawer quota, and upload daily quotas refetch on focus/visibility + ~45s poll
- Settings docs stay owner-only; callables already live-read limits (no Functions deploy)
- Signoff: `docs/workflow/reviews/2026-07-18-portal-caps-live-settings-refresh-signoff.md` (**approved_with_notes**)
- Owner tip: Save in Studio → focus Portal or wait ≤45s
- Left help-modal widen + Cap B to parallel agent

## 2026-07-18 - Small Managed Items #1 Add to Request PASS

- Assisted approved proof → **Add to Request** / Current Request; owner **PASS** ("working well")
- Signoff: `docs/workflow/reviews/2026-07-18-assisted-approved-proof-add-to-print-request-signoff.md` (**approved_with_notes**)
- Related Custom pill / Current Request chrome absorbed; unrelated Portal duplicate-order remains parked
- Next: #2 upload caps + Studio Settings

## 2026-07-18 - Brevo IP/blocklist PASS + owner clarifying closeouts

- Brevo proof-ready email IP/blocklist → **approved_with_notes**; owner **PASS** (console/provider; no app code)
- Signoff: `docs/workflow/reviews/2026-07-18-brevo-proof-email-ip-block-signoff.md`
- Studio wipe presets confirmed closed (prior signoff same day)
- ROADMAP/state clarifications: Phase 9A/9C in progress/complete in dev (not untouched); image caching already done; account linking = Firebase console setting; Whatnot staff-assisted import built vs live scheduled sync not planned
- Workflow idle / DONE

## 2026-07-18 - Studio Test Data Reset presets + wipe expansion signed off

- Goal `studio-test-data-reset-presets` -> **approved_with_notes**; owner manual QA **PASS**
- Short wipe labels; presets including **All (-) Designs**; expanded Etsy/Custom orphan wipe targets
- `wipeOperationalTestData` already deployed to `fresh-prints-dev` (required for leftovers)
- Signoff: `docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-signoff.md`
- Brevo first-proof IP/blocklist later closed same day (owner PASS) — see entry above

## 2026-07-17 - Parked owner-QA batch (PASS all) signed off

- Owner directed **PASS all** for remaining parked items after proof-download closeout
- `assisted-terminal-messaging-closed` -> **approved_with_notes** - `docs/workflow/reviews/2026-07-17-assisted-terminal-messaging-closed-signoff.md`
- `assisted-customer-cancel-reason` -> **approved_with_notes** - `docs/workflow/reviews/2026-07-17-assisted-customer-cancel-reason-signoff.md`
- `skeleton-not-halloween` optional live smoke -> **PASS** / closed (signoff updated)
- Workflow idle; no parked owner-QA left from that closeout list

## 2026-07-17 - Assisted approved proof download + Portal proof UX signed off

- Goal `assisted-approved-proof-download` (+ CORS + notes/overview residuals) **approved_with_notes**
- Owner manual QA **PASS** ("PASS this") - callable file download; Overview 14-day; Approved labels; Notes dedupe; Studio modal absorbed
- Signoff: `docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-signoff.md`
- Follow-up parked QA later closed via owner **PASS all** (see above)

## 2026-07-17 — Portal notification history + Ctrl+Enter + Studio deep-link signed off

- Goals **approved_with_notes**; owner `PASS` batch:
  - `portal-notification-history-modal` (unread Alerts + history modal + deep-links; absorbed click-vanish/badge)
  - `assisted-messages-ctrl-enter-send` (Portal + Studio)
  - `studio-messages-deeplink-scroll-read-on-reply` (Studio Messages inbox deep-link — confirmed)
- Web-push / VAPID **not** PASS — next: VAPID setup + push QA
- Signoffs under `docs/workflow/reviews/2026-07-17-*-signoff.md` for those three goals

## 2026-07-17 — Portal duplicate + resize permissions signed off

- Goal `portal-duplicate-resize-permissions` **approved_with_notes**; owner manual QA `PASS` (“Portal duplicate/resize is fixed and PASSED”)
- Client: block optimistic `pending_dup_*` edits; item-only update; size/qty validation; notes `deleteField()`
- Optional: `firestore.rules` harden still needs owner `APPROVE DEV DEPLOY` → fresh-prints-dev
- Signoff: `docs/workflow/reviews/2026-07-17-portal-duplicate-resize-permissions-signoff.md`

## 2026-07-17 — Studio Message history signed off

- Goal `studio-message-history` **approved_with_notes**; owner manual QA `PASS` (“I would call this PASS”)
- Studio Messages: unread-only dropdown + Message history modal for acked updates (mirrors Portal Alerts)
- Signoff: `docs/workflow/reviews/2026-07-17-studio-message-history-signoff.md`


## 2026-07-16 — Phase 9C Assisted Creation signed off

- Goal `phase-9c-assisted-creation` **approved_with_notes**; owner manual QA `PASS`
- Portal brief/update/proof/revision/approval flow; Studio Assisted inbox/proof workflow; secured callables/rules/storage
- Signoff: `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-signoff.md`

## 2026-07-14 — Portal Halftone filter toggle signed off

- Goal `portal-catalog-halftone-filter-toggle` **approved_with_notes**
- Standalone Halftone switch; hide tag from Tags modal; mobile sheet + Portal chrome polish
- Signoff: `docs/workflow/reviews/2026-07-14-portal-catalog-halftone-filter-toggle-signoff.md`

## 2026-07-13 — Add-to-show stay on detail + Portal polish batch signed off

- Goal `print-request-add-to-show-selection-bounce` **approved_with_notes**
- Signoff: `docs/workflow/reviews/2026-07-13-print-request-add-to-show-selection-bounce-signoff.md`

## 2026-07-13 — Studio import auto-start AI processing signed off

- Goal `studio-import-auto-start-ai-processing` **approved**
- Signoff: `docs/workflow/reviews/2026-07-13-studio-import-auto-start-ai-processing-signoff.md`

## Earlier

Portal empty-state / stash; image quality ADR-FP-080; catalog donate; Working triage; Phase 8 Portal MVP.

---

## Deferred / backlog

- **portal-notifications-web-push** — VAPID + browser push QA (in-app Alerts already live)
- Optional Functions redeploy: “New message” / “New proof” copy (`APPROVE DEV DEPLOY`)
- Optional `firestore.rules` harden from duplicate/resize (`APPROVE DEV DEPLOY`)
- Brevo (after push, or if push deferred)
- Image load caching (under discussion)
- Google login for Portal (under discussion)
- Production Portal App Hosting deploy
- `studio-apps-folder-monorepo-normalization`

See `CURRENT-STATE.md` for live status.



