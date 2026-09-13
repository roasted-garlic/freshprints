# Coordinated production candidate preparation — M0 disposition

> **Rerun note (2026-09-10):** This artifact is retained as the pre-child preparation history. The
> authoritative post-child rerun is in
> `docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md` and records the
> current 50-entry inventory, 173-export/513-path closure, and customer-upload follow-up inclusion.

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Preparation step | M0 / preconditions for M1 |
| Status | **M0 rerun complete; blocked before candidate freeze** |
| Production | untouched |
| Runtime implementation | child Studio hard-delete UI gate implemented and signed off; parent candidate not frozen |

## Result

The owner accepted Strategy B. The narrow hard-delete UI child is now implemented, tested, and
signed off; the production-visible hard-delete exposure blocker is closed. The two inherited
untracked workflow documents now have explicit parent-candidate dispositions. The read-only M0
closure, Rules/index, Portal/Studio input, and configuration/data manifests are now generated at
the current dirty snapshot. M1 is still blocked because those manifests must be regenerated at one
clean committed candidate SHA. No user work was discarded. No branch/worktree, commit, push, merge,
deploy, publish, setting/data mutation or maintenance activation occurred.

## 1. Mechanical Git snapshot

- Branch: `development`
- `HEAD` = `origin/development` = `b5aec1b2b1ac4eba5ab704f1db8f87ea22f1daaa`
- `origin/production` = `36165096f09bef6817adb5b11d496dbb1502b34b`
- Working tree snapshot at the original report: **100** tracked or untracked entries. After the
  child signoff and read-only reconciliation artifacts, the current snapshot is **112** status
  entries (59 tracked, 56 untracked).
- The committed development tree remains substantially ahead of production; the current source
  export comparison is 170 development exports versus 120 production-source exports.
- Production remains read-only baseline: 113 ACTIVE Functions, no maintenance callables, absent
  `settings/portalMaintenance` (safe OFF), Portal build-003, and Studio v1.0.9.

## 2. Complete working-tree disposition

The original 100-entry snapshot is retained below for history. The current 115-entry snapshot and
complete dispositions are authoritative in
`docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md`; paths are
classified and nothing is silently discarded.

### Documentation/workflow only — retain and include as documentation where appropriate

`.cursor/workflow/state.md`

`docs/architecture/BACKEND.md`; `docs/project/ROADMAP.md`

`references/project-chatgpt-handoff/03-roadmap-and-phases.md`;
`references/project-chatgpt-handoff/04-features-inventory.md`;
`references/project-chatgpt-handoff/05-workflows-summary.md`;
`references/project-chatgpt-handoff/07-backend-and-ai-pipeline.md`;
`references/project-chatgpt-handoff/10-security-essentials.md`;
`references/project-chatgpt-handoff/13-recent-completed-work.md`;
`references/project-chatgpt-handoff/CURRENT-STATE.md`;
`references/project-chatgpt-handoff/NEXT-PLANNED-GOAL.md`

The following workflow artifacts are documentation/evidence only and must not be treated as
runtime source. Exact paths and dispositions are listed below. The maintenance production-promotion
pair is historical and superseded by Strategy B; retain it and do not delete it.

- `docs/workflow/plans/2026-09-09-studio-portal-request-design-order-parity-amendment-plan.md` —
  separate review; excluded pending acceptance.
- `docs/workflow/plans/2026-09-10-coordinated-production-promotion-release-readiness-plan.md` —
  accepted parent Plan; documentation-only.
- `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-amendment-plan.md` —
  historical evidence; retain.
- `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-plan.md` —
  historical evidence; retain.
- `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-plan.md` — historical
  evidence; retain.
- `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-production-promotion-plan.md` —
  superseded by Strategy B; retain, do not treat as a production deployment.
- `docs/workflow/reviews/2026-09-09-portal-admin-daily-show-queue-signoff.md` — retained as
  approved-with-notes evidence and explicitly included for the read-only Portal admin Show Queue
  surface; it is not a standalone production deployment authorization.
- `docs/workflow/reviews/2026-09-10-coordinated-production-promotion-release-readiness-review.md` —
  accepted parent Formal Review; documentation-only.
- `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-amendment-dev-deployment.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-amendment-implementation-review.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-amendment-review.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-amendment-test-report.md` —
  historical maintenance evidence; retain.
- `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-dev-deployment.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-dev-qa.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-implementation-review.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-review.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-signoff.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-test-report.md` —
  historical maintenance evidence; retain.
- `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-dev-deployment.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-implementation-inventory.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-production-promotion-review.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-review.md`;
  `docs/workflow/reviews/2026-09-10-production-maintenance-mode-prerequisite-test-report.md` —
  historical maintenance evidence; retain.

### Inherited untracked documents — requires separate review/disposition; do not include silently

- `docs/workflow/plans/2026-09-09-studio-portal-request-design-order-parity-amendment-plan.md` —
  orthogonal request-design parity work; **explicitly excluded** from this candidate and retained
  for a separate future review/acceptance.
- `docs/workflow/reviews/2026-09-09-portal-admin-daily-show-queue-signoff.md` — **explicitly
  included as documentation evidence** for the already scoped read-only admin runtime. Its owner
  DEV QA PASS and approved-with-notes signoff are evidence for candidate reconciliation; they do
  not authorize production deployment by themselves.

### Runtime source — candidate inclusion pending closure/manifest, not yet frozen

All of the following are runtime or build/config paths. Their presence in the working tree does
not automatically authorize production inclusion; each must be reconciled to completed signoffs,
the frozen candidate manifest and transitive dependency closure.

**Portal (18 paths):**

- `apps/portal/app/login/page.tsx`
- `apps/portal/app/providers.tsx`
- `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts` *(validation only)*
- `apps/portal/features/admin-show-queue/components/PortalAdminAuthGate.tsx`
- `apps/portal/features/auth/components/CompleteProfileForm.tsx`
- `apps/portal/features/auth/components/LoginForm.tsx`
- `apps/portal/features/auth/components/RegisterForm.tsx`
- `apps/portal/features/auth/context/AuthProvider.tsx`
- `apps/portal/features/navigation/components/PortalAppShell.tsx`
- `apps/portal/features/navigation/components/PortalHeaderActions.tsx`
- `apps/portal/features/navigation/components/PortalSidebar.tsx`
- `apps/portal/styles/admin-show-queue.css`
- `apps/portal/styles/shell.css`
- `apps/portal/features/auth/components/PortalLoginMaintenanceNotice.tsx`
- `apps/portal/features/maintenance/components/PortalMaintenanceExperience.tsx` *(maintenance runtime)*
- `apps/portal/features/maintenance/components/PortalMaintenanceTestBanner.tsx` *(maintenance runtime)*
- `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx` *(maintenance runtime)*
- `apps/portal/features/maintenance/services/portalMaintenanceService.ts` *(maintenance runtime)*

**Studio (8 status paths; six runtime and two validation-only):**

- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx`
- `apps/studio/src/renderer/src/styles/components/settings.css`
- `apps/studio/src/renderer/src/features/users/components/CustomerDirectoryTable.tsx` *(hard-delete UI gate)*
- `apps/studio/src/renderer/src/features/settings/components/PortalMaintenanceSettingsSection.contract.test.ts` *(validation only)*
- `apps/studio/src/renderer/src/features/settings/components/PortalMaintenanceSettingsSection.tsx`
- `apps/studio/src/renderer/src/features/settings/hooks/usePortalMaintenanceSettings.ts`
- `apps/studio/src/renderer/src/features/settings/services/portalMaintenanceSettingsService.ts`
- `apps/studio/src/renderer/src/features/users/components/customerDirectoryHardDeleteGate.contract.test.ts` *(validation only)*

**Functions (35 paths):**

The 28 modified guard-bearing source files are:

`functions/src/addPortalCatalogDesignToPrintRequest.ts`,
`functions/src/assistedCreationRequests.ts`,
`functions/src/clearPortalWorkingPrintRequest.ts`,
`functions/src/completeEtsyRecommendationRequest.ts`,
`functions/src/confirmCustomerUploadsAndAttachToRequest.ts`,
`functions/src/confirmCustomerUploadsForDonation.ts`,
`functions/src/createCustomerUploadBatch.ts`,
`functions/src/createPortalPrintRequest.ts`,
`functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`,
`functions/src/deleteEligibleCustomerUpload.ts`,
`functions/src/duplicatePortalPrintRequestItem.ts`,
`functions/src/etsySuggestionRequests.ts`,
`functions/src/finalizeCustomerUpload.ts`,
`functions/src/finalizeCustomerUploadZip.ts`,
`functions/src/queuePortalPrintRequestToShow.ts`,
`functions/src/recordCustomerUploadHalftoneResponse.ts`,
`functions/src/registerCustomer.ts`,
`functions/src/registerWebPushSubscription.ts`,
`functions/src/removePortalPrintRequestItem.ts`,
`functions/src/requestPortalAccountDeletion.ts`,
`functions/src/searchEtsyRecommendations.ts`,
`functions/src/setPrintRequestItemArtworkEnhanceMode.ts`,
`functions/src/submitEtsyRecommendationRequest.ts`,
`functions/src/submitPortalDesignIssueReport.ts`,
`functions/src/syncPortalAccountEmail.ts`,
`functions/src/unqueuePortalPrintRequestFromShow.ts`,
`functions/src/updatePortalCustomerProfile.ts`,
`functions/src/updatePortalPrintRequestItemQuantity.ts`.

The remaining seven are maintenance/validation paths:

`functions/src/index.ts` *(three maintenance exports)*;
`functions/src/getPortalMaintenanceState.ts`;
`functions/src/updatePortalMaintenanceState.ts`;
`functions/src/listPortalMaintenanceTestCustomers.ts`;
`functions/src/lib/portalMaintenance.ts`;
`functions/src/lib/portalMaintenance.integration.test.ts` *(validation only)*;
`functions/src/lib/portalMaintenance.test.ts` *(validation only)*`.

**Shared, Rules and package configuration:**

- `packages/shared/src/constants/portal/portalMaintenance.constants.ts` *(maintenance runtime)*
- `packages/shared/src/constants/portal/portalMaintenance.constants.test.ts` *(validation only)*
- `firestore.rules` and `storage.rules` *(whole-file candidate resources; maintenance guards plus accumulated Rules drift)*
- `package.json` *(test command/config change; requires candidate config review)*
- `tests/firebase/portalMaintenance.rules.test.ts` and `tests/portalMaintenance.contract.test.ts` *(validation only)*

## 3. Hard-delete production exclusion and child closure

Read-only source inspection confirms that the current committed Studio source exposes
`Delete Account Permanently` from `CustomerDirectoryTable`/`UserManagementPage` and wires the
hard-delete preview/apply service. `hardDeleteCustomerAccount` Apply is DEV-project-gated, but
`previewHardDeleteCustomerAccount` and the UI path are not sufficient production safety. The
smallest repository-supported corrective is to reuse
`apps/studio/src/renderer/src/features/test-data-reset/utils/operationalWipeUiGate.ts` so the
customer hard-delete menu/callback is visible only when `import.meta.env.DEV` and the allowlisted
DEV project are both true. The backend remains unchanged and both hard-delete exports remain
excluded from the production Function allowlist.

The reviewed child gate is complete:

- Plan: `docs/workflow/plans/2026-09-10-studio-hard-delete-production-ui-gate-plan.md`.
- Formal Review: `docs/workflow/reviews/2026-09-10-studio-hard-delete-production-ui-gate-review.md`
  (`approved_with_changes`, owner accepted).
- Implement/Test/Signoff: `docs/workflow/reviews/2026-09-10-studio-hard-delete-production-ui-gate-signoff.md`
  (`approved_with_notes`).

The shared `CustomerDirectoryTable` now requires `isOperationalWipeUiEnabled()` before exposing
the hard-delete menu/callback. Focused users/identity contracts pass 12/12; targeted ESLint and
Studio Vite build pass; the unrelated Studio typecheck baseline remains documented in the child
Signoff. The child changed no backend or authorization source and performed no mutation.

## 4. Signed-off maintenance inclusion proof

The intended full candidate must include, from one frozen SHA:

- shared heading/message/default contract;
- `getPortalMaintenanceState`, `updatePortalMaintenanceState`,
  `listPortalMaintenanceTestCustomers`;
- trusted resolver/tester eligibility and all 34 guarded customer callable exports;
- Firestore and Storage direct-write enforcement;
- Portal provider, full-screen wall, tester banner, auth and navigation behavior;
- Studio Settings controls with separate heading/message fields and eligible tester filtering; and
- Admin Show Queue recovery/denial behavior.

The production setting remains absent/OFF. No DEV Function revision is a production target and no
production initialization is authorized.

## 5. Candidate scope reconciliation

- Completed signoffs are evidence, not automatic production inclusion. Each approved feature must
  be mapped to the parent manifest and dependency closure.
- Current Function source has 170 exports versus 120 production-source exports; production has 113
  ACTIVE Functions. The 34 maintenance guards and three maintenance control callables are required
  candidate entries; source-only and destructive/DEV-only exports remain excluded unless separately
  approved.
- Firestore/Storage Rules are whole-file resources. Current Rules changes include maintenance plus
  unrelated lifecycle, queue, AI, catalog, identity and other drift; no hunk-selective deploy is
  available.
- Portal App Hosting and Studio stable publication are whole-resource releases. Current Portal and
  Studio changes are interwoven with unrelated work; both must be built from the final frozen SHA.
- Indexes remain additive only; retain the 77 live production definitions, do not use `--force`,
  and stop on any deletion proposal. QueueTab historical backfill remains deferred.
- Algolia, lifecycle mirrors, Smart Profile/reprocess, settings/config, Auth and secret metadata
  remain conditional/owner-gated as specified by the accepted parent Plan. AI autonomy and Pass 2
  remain OFF. No hard-delete, merge, wipe, physical cleanup or production data operation is in
  this preparation.

## 6. Freeze-input status

Prepared at the dirty snapshot: current export inventory, deterministic transitive closure, complete
`export → closure → changed path → action` manifest, exact Rules/Storage whole-file hashes and map,
index union, Portal build-input manifest, Studio package-input manifest, settings/config/secret
metadata and data-operation dispositions, exclusion list, production baseline anchors,
inherited-document dispositions, and the exact M1 freeze proposal in
`docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md`. The dated
manifests are:

- `2026-09-10-coordinated-production-function-closure.md`
- `2026-09-10-coordinated-production-rules-manifest.md`
- `2026-09-10-coordinated-production-index-union.md`
- `2026-09-10-coordinated-production-portal-build-input-manifest.md`
- `2026-09-10-coordinated-production-studio-build-input-manifest.md`
- `2026-09-10-coordinated-production-config-data-disposition.md`

They are not yet immutable: each must be regenerated at the clean candidate SHA; this preparation
does not invent a SHA or freeze the current dirty tree.

## 7. Preparation validation

- `git status --short --untracked-files=all`: the original snapshot contained 100 entries; the
  current child/test/signoff and read-only manifest continuation contains **115 status entries**
  (59 tracked and 56 untracked). The
  tree remains intentionally uncommitted and is not a freeze candidate.
- `git diff --check`: passed for the preparation/state/handoff artifacts (only normal CRLF
  conversion warnings).
- Read-only `rg` source reconciliation: confirmed the hard-delete UI gate, maintenance callables,
  trusted resolver, 34 guarded customer callables, Rules helpers and Portal/Studio clients. The
  deterministic closure covers 170 current exports, 120 production exports, 509 local closure
  paths, and the required `EXCLUDE` dispositions for both hard-delete exports.
- Child validation: focused users/identity contracts **12/12 PASS**, targeted ESLint **PASS**,
  Studio Vite build **PASS**, and child `git diff --check` **PASS**. Studio typecheck remains the
  documented unrelated baseline; final M3 RC results must not be claimed.

## Remaining blockers before M1 freeze

1. Produce one clean committed candidate without discarding the 115 reviewed status entries; the
   current dirty tree is not a candidate SHA.
2. Regenerate and hash every manifest at that clean SHA, then mechanically verify upstream/clean
   status and no unexplained paths.
3. Obtain the owner checkpoint for the exact M1 freeze proposal before creating/pushing the frozen
   candidate SHA.

## Exact next FreshForge checkpoint

**STOP at M0.** The hard-delete child is signed off, the inherited documents are dispositioned, and
the read-only reconciliation packet is complete at the dirty snapshot. The exact M1 freeze proposal
is prepared for separate owner approval, but no candidate SHA has been created or frozen. Continue
only after a clean committed candidate exists and all manifests are regenerated at that SHA, then
present the proposal and wait for the owner’s explicit freeze decision.
Do not freeze, commit, push, merge, deploy, publish, mutate production, activate maintenance or run
production data operations from this preparation report.
