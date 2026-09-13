# Plan: Production maintenance-mode prerequisite production promotion

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Author | Codex / FreshForge Managing Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal | `production-maintenance-mode-prerequisite-production-promotion` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Related | `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-production-promotion-review.md` |

---

## Goal

Safely promote the already signed-off `production-maintenance-mode-prerequisite` capability to
`fresh-prints-prod` while maintenance remains absent/OFF, without silently promoting the unrelated
work accumulated on `development`. This Plan is evidence gathering and release-strategy design
only. It authorizes no implementation, branch, commit, merge, deploy, publish, setting mutation,
maintenance activation, or production data operation.

## Background and source of truth

- DEV prerequisite Signoff is `approved_with_notes` after final Owner DEV QA PASS:
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-signoff.md`.
- The parent coordinated release Plan is
  `docs/workflow/plans/2026-09-10-coordinated-production-promotion-release-readiness-plan.md`;
  its Formal Review is `approved_with_changes` and keeps maintenance as a separately gated
  prerequisite.
- ADR-FP-137 (`docs/project/DECISIONS.md`) requires work on `development`, prohibits per-goal
  branches/worktrees unless the owner explicitly authorizes one, and promotes to production by a
  reviewed `development` → `production` PR. Production deploys remain separate human checkpoints.
- Deployment standards make App Hosting production-only, require explicit Firebase project IDs,
  prohibit broad Functions deploys and `--force`, and require the stable Studio workflow to build
  from a production-reachable SHA.

## Scope

### In scope

- Deterministic signed-off maintenance runtime manifest.
- Current Git/source and live production baseline reconciliation.
- Isolation feasibility for Functions, Firestore Rules, Storage Rules, Portal App Hosting, and
  Studio publication.
- Production OFF/default contract, rollback targets, minimal smoke, and source-integrity gates.
- Owner decision required if a production-based patch exception is the only maintenance-only path.

### Out of scope

- Any implementation or source cleanup.
- Any commit, push, branch/worktree creation, merge, PR creation, or candidate freeze.
- Any `fresh-prints-prod` mutation, deploy, maintenance activation, setting write, data operation,
  App Hosting rollout, or Studio publish.
- Parent coordinated rollout, Smart Profile/lifecycle/queueTab backfills, Algolia rebuild, hard-delete
  enablement, Node/sharp upgrades, or unrelated Portal/Studio feature rollout.

## Read-only evidence snapshot

| Evidence | Result |
|---|---|
| Local branch | `development` |
| `HEAD` | `b5aec1b2b1ac4eba5ab704f1db8f87ea22f1daaa` |
| `origin/development` | `b5aec1b2b1ac4eba5ab704f1db8f87ea22f1daaa` (same as HEAD) |
| `origin/production` | `36165096f09bef6817adb5b11d496dbb1502b34b` |
| Working tree | 56 tracked change entries and 40 untracked entries (96 total); maintenance runtime and workflow records are not all committed |
| Committed tree delta | 1,877 paths differ from `origin/production`; current source export comparison is 170 development exports vs 120 production-source exports (51 added, one removed) |
| Runtime delta categories | 331 Functions, 427 Studio, 239 shared, 175 Portal, 3 Rules/index files, plus 690 docs/workflow and 12 other paths in the committed comparison |
| Immutable maintenance revision | **Not present.** New maintenance modules are untracked; the 28 guard-bearing source files and integration points are working-tree edits, not a single reviewed SHA |
| Production Functions | 113 ACTIVE Gen 2 `nodejs20` Functions in `us-central1`; maintenance callables are absent |
| Production maintenance document | Firestore REST GET for `settings/portalMaintenance` returned HTTP 404 `NOT_FOUND`; absence is the approved OFF default |
| Production Portal | App Hosting backend `fresh-prints-portal`, root `apps/portal`, 100% traffic on `fresh-prints-portal-build-2026-08-24-003` |
| Production Studio | Stable GitHub release `v1.0.9`, target SHA `f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2` |
| Production indexes | 77 live composite indexes; development source has 86; maintenance requires no index |
| Production Rules source anchors | `origin/production` Firestore blob `fc36dda705b0c79b1ebf367b2d8f7bdcf09f2950`; Storage blob `58073e4004ca184cac5f726d5fea1105da6f1da2` |
| Current working Rules | Firestore blob `4721c7a0ff1c21bde7563c55078bb13e5f4a0346` (+635/-93 vs production); Storage blob `67978a29935b0296ab824e7019dec859b60cf4f7` (+72/-5 vs production) |

The committed delta and dirty working tree prove that merging or deploying all of `development`
would promote unrelated runtime behavior. The current tree cannot be treated as a maintenance-only
release candidate.

## Complete signed-off maintenance runtime manifest

The following is the deterministic runtime manifest reconciled from the original prerequisite,
amendment, corrective amendment, implementation, DEV deployment, DEV QA, and Signoff records. Test
files are listed separately as validation evidence and are not runtime resources.

### Shared contract

- `packages/shared/src/constants/portal/portalMaintenance.constants.ts` — setting ID,
  OFF/default semantics, bounded heading/body, private tester UID types, parser, and public
  projection. It is currently untracked.

### Trusted Functions control plane

- `functions/src/lib/portalMaintenance.ts` — uncached trusted resolver; missing document OFF;
  malformed/read failure handling; active linked customer eligibility; merged/disabled/deleted/
  guest/orphan/inactive exclusion; public projection; tester revalidation; customer mutation guard;
  owner/admin save validation.
- `functions/src/getPortalMaintenanceState.ts` — public-safe caller-aware read callable.
- `functions/src/updatePortalMaintenanceState.ts` — active owner/admin control callable.
- `functions/src/listPortalMaintenanceTestCustomers.ts` — active owner/admin candidate-list
  callable returning safe UID/display metadata only.
- `functions/src/index.ts` — the three maintenance exports.

The shared guard is present in these 28 source files (all are working-tree changes relative to the
production source):

```text
functions/src/addPortalCatalogDesignToPrintRequest.ts
functions/src/assistedCreationRequests.ts
functions/src/clearPortalWorkingPrintRequest.ts
functions/src/completeEtsyRecommendationRequest.ts
functions/src/confirmCustomerUploadsAndAttachToRequest.ts
functions/src/confirmCustomerUploadsForDonation.ts
functions/src/createCustomerUploadBatch.ts
functions/src/createPortalPrintRequest.ts
functions/src/customerAddAssistedApprovedProofToPrintRequest.ts
functions/src/deleteEligibleCustomerUpload.ts
functions/src/duplicatePortalPrintRequestItem.ts
functions/src/etsySuggestionRequests.ts
functions/src/finalizeCustomerUpload.ts
functions/src/finalizeCustomerUploadZip.ts
functions/src/queuePortalPrintRequestToShow.ts
functions/src/recordCustomerUploadHalftoneResponse.ts
functions/src/registerCustomer.ts
functions/src/registerWebPushSubscription.ts
functions/src/removePortalPrintRequestItem.ts
functions/src/requestPortalAccountDeletion.ts
functions/src/searchEtsyRecommendations.ts
functions/src/setPrintRequestItemArtworkEnhanceMode.ts
functions/src/submitEtsyRecommendationRequest.ts
functions/src/submitPortalDesignIssueReport.ts
functions/src/syncPortalAccountEmail.ts
functions/src/unqueuePortalPrintRequestFromShow.ts
functions/src/updatePortalCustomerProfile.ts
functions/src/updatePortalPrintRequestItemQuantity.ts
```

Those files provide 34 guard-bearing callable exports:

```text
addPortalCatalogDesignToPrintRequest, submitAssistedCreationRequest,
cancelAssistedCreationRequest, customerUpdateAssistedCreationRequest,
customerSendAssistedCreationMessage, customerRespondToAssistedCreationProof,
completeEtsyRecommendationRequest, cancelEtsyRecommendationRequest,
clearPortalWorkingPrintRequest, confirmCustomerUploadsAndAttachToRequest,
confirmCustomerUploadsForDonation, createCustomerUploadBatch, createPortalPrintRequest,
customerAddAssistedApprovedProofToPrintRequest, deletePortalCustomerUpload,
duplicatePortalPrintRequestItem, submitEtsySuggestionRequest, finalizeCustomerUploadZip,
finalizeCustomerUpload, queuePortalPrintRequestToShow, recordCustomerUploadHalftoneResponse,
registerCustomer, removePortalPrintRequestItem, registerWebPushSubscription,
requestPortalAccountDeletion, cancelPortalAccountDeletionRequest, searchEtsyRecommendations,
setPrintRequestItemArtworkEnhanceMode, submitEtsyRecommendationRequest,
submitPortalDesignIssueReport, syncPortalAccountEmail, unqueuePortalPrintRequestFromShow,
updatePortalCustomerProfile, updatePortalPrintRequestItemQuantity
```

Production currently has 31 of those 34 live. `setPrintRequestItemArtworkEnhanceMode`,
`unqueuePortalPrintRequestFromShow`, and `updatePortalCustomerProfile` are source-only additions
relative to `origin/production` and are not live production endpoints. They must not be added to a
maintenance-only production allowlist unless the owner separately approves shipping their clients.
The three maintenance callables are also new and absent in production.

The Functions deployment record proves the DEV allowlist was 37 names (3 maintenance + 34 guards),
but DEV revision IDs are not production rollback targets and are intentionally not reused here.

### Portal runtime

- `apps/portal/app/providers.tsx` — mounts the maintenance provider and keeps the admin route out of
  customer providers.
- `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx` — uncached read,
  identity refresh, focus/visibility refresh, bounded polling, and conservative unknown/error state.
- `apps/portal/features/maintenance/services/portalMaintenanceService.ts` — public callable client.
- `apps/portal/features/maintenance/components/PortalMaintenanceExperience.tsx` — full-screen
  customer-safe loading/OFF/ON/unavailable experience using saved heading/body.
- `apps/portal/features/maintenance/components/PortalMaintenanceTestBanner.tsx` — tester-only
  yellow banner.
- `apps/portal/features/navigation/components/PortalAppShell.tsx` — blocks customer shell for
  unknown/ON ordinary customers and permits only the trusted tester while ON.
- `apps/portal/features/auth/components/PortalLoginMaintenanceNotice.tsx` and
  `apps/portal/app/login/page.tsx` — maintenance login notice and browse action gating.
- `apps/portal/features/auth/components/CompleteProfileForm.tsx` and `RegisterForm.tsx` — block
  registration/profile completion while state is unknown or ON.
- `apps/portal/features/auth/context/AuthProvider.tsx` — maintenance-aware auth bootstrap and
  logout routing so a signed-out tester reaches login rather than remaining on the wall.
- `apps/portal/features/navigation/components/PortalHeaderActions.tsx` and `PortalSidebar.tsx` —
  maintenance-safe logout/login copy and routes.
- `apps/portal/styles/shell.css` — full-screen/card/banner/auth state styling.

The Owner DEV QA also required the centered unauthorized `/admin/show-queue` state:

- `apps/portal/features/admin-show-queue/components/PortalAdminAuthGate.tsx`
- `apps/portal/styles/admin-show-queue.css`
- `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts` (validation only)

The admin route/layout and the remainder of the admin dashboard are an existing separate feature
introduced on development by commit `908d9123`; they are not maintenance-specific. Shipping the
current Portal source would include that accumulated admin surface and its dependencies.

### Studio runtime

- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx` — owner/admin tab
  exposure (the file also contains substantial unrelated Settings work).
- `apps/studio/src/renderer/src/features/settings/components/PortalMaintenanceSettingsSection.tsx`
  — native Settings styling, separate heading/body, searchable tester selector, unavailable state.
- `apps/studio/src/renderer/src/features/settings/hooks/usePortalMaintenanceSettings.ts` — live
  settings subscription and save state.
- `apps/studio/src/renderer/src/features/settings/services/portalMaintenanceSettingsService.ts`
  — private settings read and owner/admin callables.

### Firebase Rules and direct-write enforcement

`firestore.rules` adds the trusted `settings/portalMaintenance` predicate and guards direct customer
profile/favorites, print-request/item, notification-marker, and related customer writes. The same
document is private and owner/admin-readable only. `storage.rules` adds the corresponding predicate
to customer source/ZIP uploads and Assisted Creation pending create/update/delete paths. Staff
proof/final/original paths retain their existing gates. No maintenance index or migration is required.

The current Rules files are not maintenance-only: Firestore is +635/-93 and Storage +72/-5 versus
`origin/production`, including unrelated lifecycle, queue, AI/catalog, interactive-original, and
PNG-source changes. Firebase Rules deployment publishes the whole file; it cannot select only the
maintenance hunks.

### Validation-only artifacts

The focused shared/Functions/Portal/Studio contracts, trusted resolver integration, Rules suites,
Functions build, Portal typecheck, lint, DEV deployment, DEV QA, and Signoff records are:

- `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-implementation-review.md`
- `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-test-report.md`
- `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-dev-deployment.md`
- `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-dev-qa.md`
- `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-signoff.md`

## Isolation analysis

### Functions

Firebase permits an explicit `--only functions:name1,...` target, so a future production command
can be narrow. That does not make the current source narrow: 18 of the 28 guard-bearing files have
more than the two-line guard-only delta (for example, `unqueuePortalPrintRequestFromShow.ts` is
411 added lines, `customerAddAssistedApprovedProofToPrintRequest.ts` is 166/29, and
`updatePortalCustomerProfile.ts` is 99 added lines). A scoped deploy from the current tree would
publish those file-level changes in the updated Functions. The three source-only exports above
would add unrelated endpoints and must be excluded. A transitive local import-closure audit is
required at the eventual frozen SHA; no such frozen maintenance SHA exists now.

**Result: isolation not proven from the current tree.**

### Firestore and Storage Rules

Rules are whole-file Firebase resources. The working files contain the reviewed maintenance
predicates plus unrelated accumulated behavior, and their blobs differ materially from the
production anchors. A blind `firebase deploy --only firestore:rules` or `--only storage` from this
tree would silently promote unrelated rules. No safe current-tree Rules deployment exists.

**Result: isolation not proven; a production-based patch or coordinated candidate is required.**

### Portal App Hosting

`firebase.json` targets the single production App Hosting backend `fresh-prints-portal` with root
`apps/portal`; the backend is Git-connected to the `production` branch. Existing rollouts record an
exact source commit and build a complete Portal app. There is no repository-supported file-level
App Hosting release mechanism. The current Portal files are interwoven with unrelated auth,
navigation, catalog, request, admin, and styling changes.

**Result: maintenance-only Portal release is not proven and cannot be obtained by deploying the
current `development` branch.**

### Studio publication

`.github/workflows/studio-release.yml` packages the entire Studio application from one ref. Stable
publication is accepted only for `production` or a SHA reachable from `origin/production`; the
workflow has no component-level Settings publication. `SettingsPage.tsx` itself contains broad
unrelated development changes.

**Result: maintenance-only Studio publication is not proven; the current Settings UI cannot be
published independently.**

## Candidate strategies

### A — Owner-authorized production-based maintenance patch

Create a temporary production-based hotfix branch/worktree only after explicit owner authorization,
apply the signed-off maintenance patch (including only the 31 already-live guarded Functions plus
the three new maintenance callables, the minimal Rules hunks, and the Portal/Studio maintenance
surfaces), then prove the frozen tree and transitive Function closure. Promote by a reviewed PR into
`production`, followed by separately approved backend, App Hosting, and Studio checkpoints. This is
technically the only path that can make a truthful maintenance-only candidate, but it is an explicit
exception to ADR-FP-137's no per-goal branch and normal `development` → `production` source path.

Do not create the branch, worktree, commits, PR, or patch automatically. The owner must authorize
the exact exception and source-ownership sequence first.

### B — First compatible layer of the coordinated release

Keep ADR-FP-137's normal `development` → `production` PR and treat maintenance as the first
compatible layer of the main coordinated candidate. Freeze and review the entire accumulated
candidate; promote all approved compatible runtime layers together, with maintenance absent/OFF.
This is the repository-supported default, but it is **not** a maintenance-only release and does not
meet the present goal without the owner explicitly amending the goal and accepting the broader
candidate boundary.

### C — Existing repository-supported selective method

No third method was found. Scoped Functions targets exist, but they do not isolate file-level source
changes; Rules, App Hosting, and Studio have no hunk/component publication mechanism. No source-only
or DEV-only export may be invented as a workaround.

## Production OFF contract

- Keep `settings/portalMaintenance` absent (the live production 404 is already the safe OFF state);
  do not initialize or mutate it unnecessarily.
- If an explicit document is later required, it must be `enabled: false` with no tester bypass.
- The Portal public read and customer mutations remain normal; no maintenance wall or banner appears.
- Owner/admin Studio Settings can read/control the setting and load only eligible tester candidates
  once the reviewed client is published.
- The three maintenance callables and all required live customer guard revisions are ready for a
  later ON window; no ON window is part of this prerequisite.
- Enabling/disabling later is a runtime setting change and must not require a new Portal or Studio
  build after the clients are promoted.
- Any production ON test requires a separate explicit owner checkpoint.

## Rollback baseline

Live rollback anchors were reverified read-only:

| Surface | Immediate rollback target | Secondary / note |
|---|---|---|
| Portal App Hosting | `fresh-prints-portal-build-2026-08-24-003` (100% traffic) | `build-2026-08-24-002`; exact live revision is the immediate target |
| Studio | Stable `v1.0.9`, target SHA `f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2` | `v1.0.8` secondary only |
| Maintenance Functions | None live in production; `getPortalMaintenanceState`, `updatePortalMaintenanceState`, and `listPortalMaintenanceTestCustomers` are absent | Do not use DEV revision IDs |
| Guard Functions | Current live revisions/hashes below | Redeploy the recorded prior revision per Function if a later promotion fails |
| Firestore Rules | Production source anchor `fc36dda705b0c79b1ebf367b2d8f7bdcf09f2950` | Remote ruleset ID/hash was not exposed by the available read-only CLI/API; capture immutable export before any mutation |
| Storage Rules | Production source anchor `58073e4004ca184cac5f726d5fea1105da6f1da2` | Same remote-ruleset snapshot requirement |

Current live guard revision targets (all ACTIVE, `us-central1`, production) are:

```text
addPortalCatalogDesignToPrintRequest  addportalcatalogdesigntoprintrequest-00002-sul  7eedfc2475a356e21eb4aeac8e9cd45ea232fbed
submitAssistedCreationRequest         submitassistedcreationrequest-00001-car         820170839401aee196ac0c7b335475fc7b608159
cancelAssistedCreationRequest         cancelassistedcreationrequest-00001-haw         820170839401aee196ac0c7b335475fc7b608159
customerUpdateAssistedCreationRequest customerupdateassistedcreationrequest-00001-hix 820170839401aee196ac0c7b335475fc7b608159
customerSendAssistedCreationMessage   customersendassistedcreationmessage-00001-ter   820170839401aee196ac0c7b335475fc7b608159
customerRespondToAssistedCreationProof customerrespondtoassistedcreationproof-00001-pol 820170839401aee196ac0c7b335475fc7b608159
completeEtsyRecommendationRequest     completeetsyrecommendationrequest-00001-zoh     820170839401aee196ac0c7b335475fc7b608159
cancelEtsyRecommendationRequest       canceletsyrecommendationrequest-00001-sav       820170839401aee196ac0c7b335475fc7b608159
clearPortalWorkingPrintRequest        clearportalworkingprintrequest-00001-nus        820170839401aee196ac0c7b335475fc7b608159
confirmCustomerUploadsAndAttachToRequest confirmcustomeruploadsandattachtorequest-00003-qax af441ae8176011a8b6e05f0725fd5ea71d506201
confirmCustomerUploadsForDonation     confirmcustomeruploadsfordonation-00002-get     af441ae8176011a8b6e05f0725fd5ea71d506201
createCustomerUploadBatch              createcustomeruploadbatch-00001-zag              820170839401aee196ac0c7b335475fc7b608159
createPortalPrintRequest               createportalprintrequest-00001-sep               820170839401aee196ac0c7b335475fc7b608159
customerAddAssistedApprovedProofToPrintRequest customeraddassistedapprovedprooftoprintrequest-00003-xib af441ae8176011a8b6e05f0725fd5ea71d506201
deletePortalCustomerUpload             deleteportalcustomerupload-00001-hig             af441ae8176011a8b6e05f0725fd5ea71d506201
duplicatePortalPrintRequestItem        duplicateportalprintrequestitem-00002-tak        7eedfc2475a356e21eb4aeac8e9cd45ea232fbed
submitEtsySuggestionRequest            submitetsysuggestionrequest-00001-hex            820170839401aee196ac0c7b335475fc7b608159
finalizeCustomerUploadZip              finalizecustomeruploadzip-00001-wuv              820170839401aee196ac0c7b335475fc7b608159
finalizeCustomerUpload                 finalizecustomerupload-00002-seb                 af441ae8176011a8b6e05f0725fd5ea71d506201
queuePortalPrintRequestToShow          queueportalprintrequesttoshow-00005-lek          750fb0c65601b70fea410a1babca315c544462aa
recordCustomerUploadHalftoneResponse   recordcustomeruploadhalftoneresponse-00001-mot   820170839401aee196ac0c7b335475fc7b608159
registerCustomer                       registercustomer-00001-xiq                       820170839401aee196ac0c7b335fc7b608159
removePortalPrintRequestItem           removeportalprintrequestitem-00001-dim           820170839401aee196ac0c7b335fc7b608159
registerWebPushSubscription            registerwebpushsubscription-00001-xox            820170839401aee196ac0c7b335fc7b608159
requestPortalAccountDeletion           requestportalaccountdeletion-00001-raj           820170839401aee196ac0c7b335fc7b608159
cancelPortalAccountDeletionRequest     cancelportalaccountdeletionrequest-00001-jof     820170839401aee196ac0c7b335fc7b608159
searchEtsyRecommendations              searchetsyrecommendations-00001-gam              ce7eb01e49e90ecf6002193e7244c192cb224604
submitEtsyRecommendationRequest        submitetsyrecommendationrequest-00001-qik        820170839401aee196ac0c7b335fc7b608159
submitPortalDesignIssueReport          submitportaldesignissuereport-00001-bot          a00cb6425203cae13d39a9f8e9e1c4a1d1b41887
syncPortalAccountEmail                 syncportalaccountemail-00001-jof                 820170839401aee196ac0c7b335fc7b608159
updatePortalPrintRequestItemQuantity   updateportalprintrequestitemquantity-00002-qid   7eedfc2475a356e21eb4aeac8e9cd45ea232fbed
```

The table is a read-only snapshot of the live production revisions. Regenerate it at the frozen
candidate gate immediately before any mutation; no rollback target may be guessed.

## Minimal production smoke (after separate owner authorization)

1. Clean-session public Portal read: home, one public show, Design Library/search, and one design
   detail.
2. One explicitly named, owner-approved safe customer mutation, or record NO-GO if the owner
   declines a production write.
3. Owner/admin Studio Settings: maintenance control loads, public state reads OFF, and candidate
   list contains only eligible active linked customers.
4. Confirm no customer-visible wall/banner and no unrelated feature change; do not enable maintenance.

## Commit and source-integrity sequence

1. Stop at the owner checkpoint and select Strategy A or amend the goal to Strategy B.
2. Resolve the 56 tracked changes and 40 untracked entries with an explicit disposition; do not
   discard user work.
3. Produce an immutable committed runtime SHA and a deterministic file/resource allowlist. For
   Functions, emit `export → transitive closure → changed path → action`; exclude all source-only
   and DEV-only exports.
4. For Rules, produce an exact production-based patch/union and immutable remote Rules snapshots;
   stop if any unrelated rule or index deletion is proposed. No `--force`.
5. For Portal and Studio, prove the selected source SHA is the exact build/package input. Any
   runtime/config/package/generated-asset change after freeze invalidates the packet.
6. Only after the owner approves the frozen packet may the appropriate reviewed PR and later
   production deployment checkpoints occur. Documentation-only records after freeze must remain in
   the documented documentation-only paths and must not alter the runtime tuple.

## Test strategy for the later gated execution

| Check | Requirement |
|---|---|
| Focused maintenance contracts | Re-run shared, Functions, Portal, Studio, and Rules maintenance suites at the frozen SHA |
| Regression | Full `npm run test:rules`; Functions build; Portal typecheck/build; Studio typecheck/Vite build and the documented baseline comparison |
| Functions closure | Deterministic allowlist/closure audit and post-deploy ACTIVE/revision verification |
| OFF behavior | Absent/OFF callable read, normal Portal read/write, no wall/banner, owner/admin Settings access |
| Human smoke | The four minimal checks above, owner-performed where authentication/data access is required |

## Human checkpoints anticipated

- [x] Production deploy / Rules / Functions / App Hosting / Studio publication (all separate and
  not authorized in this Plan/Review).
- [x] Source-control policy exception if Strategy A is selected.
- [x] Owner selection of Strategy A or Strategy B.
- [x] Any production safe write fixture and any production ON test.
- [x] Rules/remote baseline snapshot acceptance.

## Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Current development merge silently ships unrelated work | Critical | Block current-tree promotion; require Strategy A patch or full Strategy B candidate acceptance |
| Scoped Function deploy packages unrelated same-file edits | High | Use production-based patch or coordinated frozen SHA; closure audit and explicit names only |
| Whole-file Rules deploy promotes unrelated authorization behavior | Critical | Do not deploy current files; produce reviewed production-based Rules patch/union and snapshot remote rulesets |
| App Hosting/Studio have no component release | High | Do not claim selective release; owner chooses patch exception or coordinated candidate |
| Maintenance document is absent in production | Low / desired | Preserve absence as OFF; no initialization |
| Portal build baseline `.next/trace` EPERM and Studio baseline diagnostics | Low | Reproduce/document unchanged baseline at the later RC gate; do not weaken gates |
| Node.js 20 deprecation and `sharp` risk | Medium | Keep as separate tracked follow-up; do not expand this prerequisite |

## Rollback plan

For any later approved promotion failure, keep maintenance OFF first. Restore the recorded Portal
build-003, Studio `v1.0.9`, each prior Function revision, and the snapshotted Firestore/Storage
Rulesets through separately approved commands. Do not delete Functions, use broad deploys, use
`--force`, mutate unrelated settings, or assume a data rollback. Re-run the OFF smoke and record
any forward repair.

## Documentation updates required

- [x] This Plan and its Formal Review.
- [ ] Production baseline/deployment/test/signoff records after a later approved execution.
- [ ] Permanent architecture/security/deployment docs only if the final release changes their
  durable contract.
- [ ] State and handoff records at every gate; no signoff closure is possible in this Plan/Review.

## Open questions / owner checkpoint

1. **Choose Strategy A or Strategy B.** Strategy A requires explicit authorization for a
   production-based hotfix branch/worktree and an exception to the normal source path. Strategy B
   requires accepting that maintenance is only the first compatible layer of the full coordinated
   candidate, not an isolated release.
2. Confirm how the production Rules/Storage remote ruleset IDs/hashes will be snapshotted before
   mutation; the available read-only CLI/API did not expose them in this environment.
3. Confirm the named production safe-write fixture for the later smoke, or explicitly accept a
   NO-GO result for that check.

## Approval

- Review doc: `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-production-promotion-review.md`
- Verdict: pending
