# Production Rollout Manifest: Shared Length-Based Show Pricing and Customer Navigation

| Field | Value |
|---|---|
| Candidate branch | `development` |
| Candidate SHA | Production merge `e6e7eaf7b47e714414572a986611afa124bb8a8b` via protected PR #101 |
| Comparison | `git diff origin/production...development` after push |
| Status | **BLOCKED — production infrastructure rollout complete; Studio stable publication blocked by repeated external GitHub failures** |

## Exact cumulative production delta

The candidate is cumulative from the current production merge base. The delta contains the prior
Portal show-rail description-parity hotfix plus this managed goal and its owner-directed closeout
corrections. It was reviewed by runtime surface:

| Runtime surface | Required action | Scope |
|---|---|---|
| Portal App Hosting | **Deploy** | All cumulative `apps/portal` changes, including show-rail hydration, pricing projection/UI, cross-origin Working reuse, cart rebinding, and post-queue hardening |
| Studio stable release | **Build/publish** | All cumulative `apps/studio` changes, including pricing/settings, allocation/customer navigation, restore/Add-to-Show reconciliation, preview/import/staff cache hardening; canonical version `1.0.15` |
| Cloud Functions | **Deploy exactly 25** | Reviewed allowlist below; no bare `functions` deploy |
| Firestore Rules | **Deploy** | `firestore.rules`, with immutable optional pricing snapshot field and surcharge settings fields |
| Storage Rules | **NONE** | No cumulative delta |
| Firestore indexes | **NONE** | `firestore.indexes.json` unchanged in the candidate delta |
| IAM / secrets / Firebase config | **NONE** | No change required or authorized |
| Migration / backfill / data rewrite | **NONE** | Legacy snapshot fallback is runtime-only |
| Documentation | **Included** | Plan, review, test report, Signoff, roadmap, and handoff mirrors |

## Exact Function allowlist

`addPortalCatalogDesignToPrintRequest`, `allocateStudioPrintRequestToShow`,
`applyShowProductionRecovery`, `applyShowQueueMove`, `archivePrintRequest`,
`attachExistingCustomerUploadsToPrintRequest`, `clearPortalWorkingPrintRequest`,
`confirmCustomerUploadsAndAttachToRequest`, `convertCustomerPrintRequestToInternal`,
`createPortalPrintRequest`, `createStudioCustomerPrintRequest`,
`customerAddAssistedApprovedProofToPrintRequest`, `deleteEligiblePrintRequest`,
`duplicatePortalPrintRequestItem`, `getPortalShowPricing`,
`onPrintRequestEditingExitRestoreParked`, `previewPrintRequestDeletion`,
`previewShowProductionRecovery`, `previewShowQueueMove`, `queuePortalPrintRequestToShow`,
`removePortalPrintRequestItem`, `unqueuePortalPrintRequestFromShow`,
`unqueueStudioCustomerPrintRequestFromShow`, `updatePortalPrintRequestItemQuantity`,
`updatePortalStaffArtworkPrintRequestItemSize`.

DEV evidence: all 25 were `ACTIVE` at source hash `9eff4e7503246487859ad354ce53d2f78360b9b5`.

## Execution record

- Protected PR [#101](https://github.com/roasted-garlic/freshprints/pull/101) merged to production as
  `e6e7eaf7b47e714414572a986611afa124bb8a8b`.
- Firestore Rules deployed successfully as ruleset `0a4965b5-5996-463f-ad4a-4b06b1bc1830`;
  Storage Rules and indexes were not changed.
- The exact 25-function allowlist is deployed to `fresh-prints-prod`; all 25 are `ACTIVE` at
  production source hash `57b0335ec58fb2cf4c4213101f7a955e65d26483`.
- Portal App Hosting build `build-2026-09-17-002` is READY at revision
  `fresh-prints-portal-build-2026-09-17-002` with 100% traffic. Hosted `/` and `/requests` returned
  HTTP 200 without development markers; protected callable boundaries returned 401 unauthenticated.
- Studio stable `v1.0.15` is **not published**. Windows builds repeatedly succeeded, but macOS
  packaging stalled on multiple fresh runners and GitHub Release asset uploads returned HTTP 500/502
  while saving assets. Existing stable `v1.0.14` remains the rollback/current release. No stable
  publication is claimed without verified eight-asset draft evidence.
- No migration, backfill, cleanup, merge, fixture mutation, secret, IAM, Storage Rules, or index
  action occurred.

The managed goal remains blocked on the external Studio release pipeline. Retry the exact production
workflow after GitHub macOS packaging and release-asset service recover; then verify all eight assets,
publish `v1.0.15`, run final production smoke, and update this manifest before closing the goal.

## Release and rollback references

- Existing production Studio stable `v1.0.14` is the rollback release; candidate stable is `v1.0.15`.
- Capture the production Rules release/ruleset and each existing Function revision before deploy.
- Capture the current Portal App Hosting revision/build before rollout; verify candidate revision has
  100% traffic before smoke.
- No data mutation is part of rollout, so rollback is code/runtime rollback only.

## Required execution order

1. Create and inspect protected `development` → `production` PR; verify the Files Changed view
   matches this manifest.
2. Merge through the protected PR; record production merge SHA.
3. Deploy Firestore Rules, then the exact 25 Functions to `fresh-prints-prod`.
4. Deploy Portal App Hosting to `fresh-prints-prod`; verify revision and 100% traffic.
5. Run the manual GitHub Studio release workflow from production for `1.0.15`, then publish its
   draft with the owner-gated helper. Verify tag, target SHA, eight assets, and Latest.
6. Run production smoke: Portal HTTP/relevant routes without DEV markers, pricing callable DTO,
   unauthenticated Function boundaries, active Function count/hash, Rules release, Portal traffic,
   and Studio release metadata/assets.

## Accepted limitations

Interactive Studio/Portal/customer QA was unavailable and is accepted in the Signoff as
`approved_with_notes`. Repository lint retains its unrelated baseline; Node.js 20 deprecation and
the Firestore emulator expression-limit baseline remain documented residual risks.
