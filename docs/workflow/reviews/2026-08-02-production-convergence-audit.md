# Production Convergence Audit

Date: 2026-08-02
Scope: read-only audit. **No production-facing mutation occurred in this pass.**

## 1. Branch topology

| Ref | SHA |
|---|---|
| `origin/development` | `0c8498ccd9a5f11d17c7dd5547b0922431930bfd` |
| `origin/production` | `9726edb5b6251fb10edc6c10ce59bc49f854fb98` |
| Local branch at start of this pass | `feat/studio-beta5-final-proof` @ `70b261edada03b80f9f5898530b10d06f69affa5` |
| Working tree | clean |

`git merge-base --is-ancestor origin/production origin/development` → **true**. `production` is a
strict ancestor of `development`: **44 commits ahead, 0 commits behind.** This is a clean,
fast-forward-compatible history — a direct protected PR from `development` into `production` is
appropriate; **no intermediate release branch is needed.** This matches the already-documented
production release workflow in `docs/standards/DEPLOYMENT.md` ("Production release workflow
(promotion via pull request, not direct push)": base `production`, compare `development`).

Remaining remote feature/fix branches (all already merged into `development`, not deleted):
`docs/studio-updater-manual-prerelease-checkpoint`, `feat/studio-beta3-prep`,
`feat/studio-beta5-final-proof`, `feature/portal-design-issue-reporting` (already merged to
`production` earlier), `feature/studio-automatic-updates`, five `fix/studio-release-*` CI-fix
branches, `fix/studio-settings-single-row-tabs`, `fix/studio-update-channel-test-generated-value`,
`fix/studio-updater-packaged-channel-and-safe-errors`,
`fix/studio-updater-silent-install-and-release-notes`, `release/final-studio-remediations`
(already merged earlier). None require action; cleanup (deletion) is a separate, low-priority
housekeeping item, not a blocker.

## 2. Commits awaiting production promotion

44 commits, `git log origin/production..origin/development`. Full list recorded in this session's
prior turns; summarized by content below. Notably, several commits in this list (customer-upload
restore parity, donation-delete dialogs, donated-menu fixes, Whatnot matched-show updates) are
**already present in `production`'s content** via an earlier separate merge (`fe8c4f0`, PR #18) —
they appear in the commit log because `development` was merged forward from `production` mid-session,
not because their content is still pending. Confirmed via `git diff origin/production...origin/development`
(content diff, not log): these files show **zero** changes.

## 3. Categorized production diff

`git diff origin/production...origin/development --name-only`: **63 files changed** (3618
insertions, 34 deletions). Full categorization:

### Studio automatic updates — implementation (in scope, reviewed)
- `.github/workflows/studio-release.yml` (new CI workflow, iteratively fixed 5×)
- `.gitignore` (+1 line: `apps/studio/electron/generated/`)
- `apps/studio/electron-builder.json5` (+`publish` block only)
- `apps/studio/electron/ipc/studioUpdate/*` (7 files — service, channels, handlers, tests)
- `apps/studio/electron/main.ts`, `apps/studio/electron/preload.ts` (wiring)
- `apps/studio/package.json` (version `0.0.0` → `1.0.0-beta.5`; `electron-updater` dependency)
- `apps/studio/scripts/generate-packaged-build-config.mjs` + test (new)
- `apps/studio/src/renderer/src/features/settings/{components,hooks,pages}/*` (Settings UI + hook)
- `packages/shared/src/studioUpdate/*` (6 files — state machine, error mapping, release notes, tests)
- `packages/shared/src/types/{import,studioUpdate}/*.types.ts` (IPC contract)
- `package-lock.json` (dependency + workspace version sync)

### Studio Settings single-row tabs (in scope, reviewed)
- `apps/studio/src/renderer/src/styles/components/settings.css`

### Firestore Rules/indexes/reporting Functions
- **None.** No `firestore.rules`, `firestore.indexes.json`, `storage.rules`, or reporting-Function
  source file appears in this diff — confirmed via direct `git diff` on those exact paths (empty
  result). This is expected: reporting was already merged to `production` in an earlier phase of
  this same session (`9726edb`), so it's part of the diff *base*, not part of what's pending now.

### Prior customer-upload exclusion/deletion Functions
- **None** — same reasoning; already in `production`'s content and already in the approved
  99-function allowlist (confirmed: `previewCustomerUploadDeletion`, `deleteEligibleCustomerUpload`,
  `excludeCustomerUploadFromCatalog` all appear in
  `docs/workflow/reviews/2026-07-30-production-release-functions-allowlist-report.md`'s deploy
  command, meaning they were already deployed to `fresh-prints-prod` on 2026-07-30).

### Workflow and deployment files
- `docs/standards/DEPLOYMENT.md` (Studio Automatic Updates section + dev/prod hosting-policy
  corrections — docs only)

### Documentation-only files (workflow artifacts, no code)
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md`
- `docs/workflow/plans/2026-08-01-donated-designs-overflow-menu-no-op-plan.md` (already-applied
  work's plan doc, carried forward in the merge)
- `docs/workflow/plans/2026-08-02-studio-settings-single-row-tabs-plan.md`
- 24 files under `docs/workflow/reviews/` — Plans/Reviews/Test-Reports/Signoffs/checkpoints for:
  donated-designs overflow-menu (already-applied), customer-upload exclusion Functions deploy
  checkpoint (already-applied), production Stage-2/schedule/dual-limit records (already-applied,
  historical), and every Studio-updater/Settings-tabs artifact from this session
- `references/project-chatgpt-handoff/{03-roadmap-and-phases,13-recent-completed-work,CURRENT-STATE}.md`

### Unexpected or unrelated changes
**None found.** Every file in the 63-file diff maps cleanly to either (a) Studio automatic updates,
(b) the Settings single-row-tabs fix, or (c) documentation recording either of those two things or
already-applied historical work carried forward by the mid-session `development`↔`production`
merge. No Portal application code, no unrelated Studio feature code, no data-model change.

## 4. Confirmed constraints held

- Designs never receive production status as part of this diff — no design-lifecycle code touched.
- No Firestore/Storage Rules or index change in this diff.
- No Firebase Functions source change in this diff (reporting Functions were already promoted in
  the earlier reporting-merge phase of this session, separately from this Studio-updater diff).
- `apps/studio/package.json`'s version is `1.0.0-beta.5` (prerelease), not `1.0.0` — no stable
  release is embedded in this diff.
- No `myprintrequest.com`/DNS/domain file touched.

## 5. Production prerequisites audit

### GitHub Actions production Firebase secrets

The workflow (`.github/workflows/studio-release.yml`) references, and fails closed without, all
six: `PROD_FIREBASE_API_KEY`, `PROD_FIREBASE_AUTH_DOMAIN`, `PROD_FIREBASE_PROJECT_ID`,
`PROD_FIREBASE_STORAGE_BUCKET`, `PROD_FIREBASE_MESSAGING_SENDER_ID`, `PROD_FIREBASE_APP_ID` — this
is confirmed at the source-code level (the `Configure Studio Firebase environment` step's
`release_type == "stable"` branch, and its missing-value guard). **Whether these six secrets are
actually populated in the GitHub repository is owner-only information — this environment has no
API access to enumerate or check secret existence**, and no secret value has been read or would be
displayed if it were. `[NEEDS OWNER CONFIRMATION]`.

### Windows code signing

- **Current stable-build signing gate:** the `Configure optional Windows signing` workflow step
  fails closed (`exit 1`, before any packaging step runs) when `release_type: stable` and either
  `WINDOWS_CSC_LINK` or `WINDOWS_CSC_KEY_PASSWORD` is missing — confirmed at the source level, not
  weakened by any change in this diff.
- **Supported repository signing mechanism:** GitHub Actions repository secrets
  (`WINDOWS_CSC_LINK` = certificate, base64 or path per electron-builder convention;
  `WINDOWS_CSC_KEY_PASSWORD` = certificate password), consumed by electron-builder's standard
  `CSC_LINK`/`CSC_KEY_PASSWORD` environment variables (mapped from `WIN_CSC_LINK`/
  `WIN_CSC_KEY_PASSWORD` in this workflow to avoid the empty-string-vs-absent bug found and fixed
  earlier this session).
- **Azure Artifact Signing or a purchased certificate:** not implemented or configured in this
  repository — no certificate file, Azure Trusted Signing config, or equivalent exists anywhere in
  source. `[NEEDS OWNER CONFIRMATION]` on whether a certificate has been acquired outside this repo.
- **Exact owner action still required:** acquire a Windows Authenticode code-signing certificate
  (or configure Azure Trusted Signing / another electron-builder-supported signing provider), then
  set `WINDOWS_CSC_LINK` and `WINDOWS_CSC_KEY_PASSWORD` as GitHub repository secrets — or make an
  explicit, separately reviewed decision to accept unsigned-stable SmartScreen friction for the
  initial release (this was flagged as a possible exception path in the original updater Plan, but
  not exercised or approved in this session).
- **Must signing be completed before stable `1.0.0`?** Per the workflow's own fail-closed gate:
  **yes**, unless the owner explicitly approves an unsigned exception through its own reviewed
  checkpoint — this is a hard gate the workflow itself enforces, not a recommendation.

### Production backend — exact approved deployment set

No new backend deployment needed for *this specific diff* (Studio automatic updates + Settings
tabs are pure client/CI changes with zero Firebase Functions/Rules/indexes footprint). However,
two backend deployments remain **outstanding from the earlier reporting-merge phase of this same
session** and are not part of this diff but are relevant to full production readiness:

- `submitPortalDesignIssueReport`, `resolveDesignIssueReport` — merged into `production` source
  (`9726edb`) but **not confirmed deployed** to `fresh-prints-prod` (absent from
  `docs/standards/DEPLOYMENT.md`'s production deployment log and from the approved 99-function
  allowlist doc).
- The two `designIssueReports` Firestore composite indexes and the reporting-scoped Firestore
  Rules block — same status: merged as source, not confirmed deployed to `fresh-prints-prod`.

Already deployed (2026-07-30, confirmed in `DEPLOYMENT.md`, unaffected by this diff): Firestore
Rules, Storage Rules, all 65 Firestore indexes, 4 required Secret Manager secrets, the 99-function
allowlist (including the three customer-upload exclusion/deletion Functions), App Hosting
environment variables, and the first Portal App Hosting release.

### Production Portal

- **Current production App Hosting revision:** live at
  `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`, deployed from commit
  `11ed4ef` (per `DEPLOYMENT.md`'s "First App Hosting Portal release" record) — this predates both
  the reporting merge and this Studio-updater diff, so **the live Portal does not yet include
  reporting UI**.
- **Source SHA currently live:** `11ed4ef` (Turborepo App Hosting fix commit) — stale relative to
  current `production` HEAD (`9726edb`).
- **Automatic rollout state:** disabled (confirmed in `DEPLOYMENT.md`) — merging this diff to
  `production` will **not** trigger an automatic Portal deployment.
- **Required new production rollout after merge:** yes, a manual
  `firebase deploy --only apphosting --project fresh-prints-prod` (or equivalent) is required to
  bring the live Portal current with `production`'s source, including reporting UI — this diff
  itself contains no Portal code, so this rollout requirement stems from the *already-merged*
  reporting work, not from this pass.
- **hosted.app smoke requirements:** re-run domain-independent smoke (per `DEPLOYMENT.md`'s Stage
  9-10 items) after any new rollout, before any further Stage-2/domain progress.
- **Development remains localhost-only:** confirmed — `docs/standards/DEPLOYMENT.md`'s
  "Development and Production Portal Hosting Policy" section (added earlier this session) is
  unaffected by this diff; `fresh-prints-dev` has no App Hosting backend by design.

### Production Studio — stable-release requirements

- **Required version change:** `1.0.0-beta.5` → `1.0.0` (a real, separate version-bump commit;
  not part of this diff or this pass).
- **Production Firebase embedding requirement:** the CI workflow's `Configure Studio Firebase
  environment` step already supports this via `PROD_FIREBASE_*` secrets — no code change needed,
  contingent on secret population (see above).
- **Stable update channel requirement:** `release_type: stable` in the workflow dispatch — already
  implemented and functional (fails closed without signing, as designed).
- **Code-signing requirement:** hard blocker per the workflow's own gate — see above.
- **Expected installer/release assets:** `Fresh Prints-Windows-1.0.0-Setup.exe`, its blockmap,
  `latest.yml`, and a `sha256.txt` (workflow's "Compute installer SHA-256" + "Upload build
  evidence" steps — unchanged, same pattern as every beta build this session).
- **Final installer QA requirements:** first stable install must re-verify the full checklist
  already exercised across the beta cycle (version, channel=stable this time, production Firebase
  project, sign-in against `fresh-prints-prod`, no dev-only UI/tooling exposed — the existing
  `operationalWipeUiGate`/Test-Data-Reset dev-only gating already covers this per prior session
  history) — this is a **new** checkpoint, not yet performed, since no stable build has been made.

## 6. Phased production sequence

Each phase stops at its own human checkpoint. No phase after A has begun.

**Phase A — Final updater Signoff and production-diff approval** ✅ this pass.
`docs/workflow/reviews/2026-08-02-studio-automatic-updates-final-signoff.md` +
`docs/workflow/reviews/2026-08-02-production-convergence-audit.md` (this document). Stop: owner
reviews and approves proceeding to Phase B.

**Phase B — Production PR creation and review.** Open PR: base `production`, head `development`.
Do not merge in the same pass it's opened. Stop: owner (or a reviewer) reviews the Files Changed
view.

**Phase C — Merge into `production`.** Merge commit only, per `DEPLOYMENT.md`'s established policy
(no squash/rebase; GitHub ruleset already enforces PR-required + no-force-push at the server
level). Stop: confirm `origin/production` HEAD moved and local `production` fast-forwards cleanly.

**Phase D — Production Rules/indexes/Functions deployment (reporting only — narrow, scoped).**
Deploy exactly: the two `designIssueReports` indexes, the reporting-scoped Firestore Rules block,
`submitPortalDesignIssueReport`, `resolveDesignIssueReport` — explicit narrow allowlist, never a
bare `--only functions`. Stop: owner confirms indexes show `Enabled`, Rules "Last published"
timestamp updates, both Functions show `ACTIVE`.

**Phase E — Production Portal App Hosting rollout.** Manual rollout from the new `production` HEAD
(includes reporting UI + any other pending Portal source). Stop: hosted.app smoke passes
(HTTP 200, correct title/host, no dev-project strings).

**Phase F — Signed stable Studio `1.0.0` workflow build.** Requires: version bump commit
(`1.0.0-beta.5` → `1.0.0`, separate PR/commit, not bundled with Phase C), `WINDOWS_CSC_LINK`/
`WINDOWS_CSC_KEY_PASSWORD`/`PROD_FIREBASE_*` secrets all populated. Trigger
`workflow_dispatch(ref: production, release_type: stable)`. Stop: workflow succeeds, draft release
created with a real signed installer.

**Phase G — Stable release review/publication.** Owner marks the draft published (not
pre-release) — manual GitHub UI action, same as every prerelease in this session, per the
corrected `DEPLOYMENT.md` documentation. Stop: owner explicitly approves publication (this is the
same "manual human checkpoint" pattern already established and documented).

**Phase H — Production Studio and hosted Portal owner QA.** Full installed-app + hosted.app
checklist (auth, reporting, catalog, print requests, uploads, existing regressions — mirroring the
dev owner-QA checklist pattern already used for reporting). Stop: owner reports PASS/FAIL.

**Phase I — Stage 2 smoke and final launch approval.** Per `DEPLOYMENT.md`'s existing Stage
9-11 items (domain-independent smoke, final pre-domain readiness gate). Stop: documented proof +
owner phrase.

**Phase J — Custom-domain cutover.** Only after the exact phrase `APPROVE MYPRINTREQUEST.COM
CUTOVER`. Not authorized by anything in this pass or any preceding pass.

## 7. Production PR recommendation

- **Base:** `production`
- **Head:** `development` (direct — confirmed clean ancestor relationship, no release branch
  needed)
- **Proposed title:** `Studio automatic updates + Settings single-row tabs`
- **Exact diff scope:** the 63 files enumerated in section 3 above — Studio updater
  implementation, CI release workflow, Settings CSS fix, and their associated workflow
  documentation. No Portal/Functions/Rules/indexes code (those were already promoted separately
  during the earlier reporting-merge phase of this session).
- **Required merge method:** merge commit (matches `DEPLOYMENT.md`'s policy and the GitHub
  ruleset's enforcement — no squash/rebase/force-push option exists at the server level for
  `production`).
- **Tests/checks required before merge:** the full gate already re-run and green multiple times
  this session on `development`'s exact current HEAD (root install, Functions install/build, lint,
  Portal typecheck+build, Studio typecheck, 39/39 updater tests, full Studio package build,
  `git diff --check`) — no further local verification is needed before opening the PR, though a
  final `git diff --check` immediately before merge is good practice.
- **Version/signing preparation timing:** the `1.0.0-beta.5` → `1.0.0` version bump and signing-
  secret population should happen **after** this merge, as their own separate, later Phase F
  commit/action — bundling a stable version bump into this PR would incorrectly suggest stable
  publication readiness before signing is confirmed.

## Confirmation

No production Firebase action, no production deployment, no release publication, no PR was opened
or merged, and no domain/DNS action occurred during this audit pass. This document and the two
Signoff/checkpoint documents referenced above are the only outputs.
