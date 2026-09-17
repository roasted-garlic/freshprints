# Test Report: Shared Length-Based Show Pricing and Customer Navigation

| Field | Value |
|---|---|
| Date | 2026-09-17 |
| Goal | `print-request-length-surcharge-and-customer-navigation` |
| Status | **Owner DEV QA closed — approved_with_notes; production infrastructure verified; Studio stable publication blocked** |
| Scope | Amended pricing, allocation snapshot, Portal projection, customer navigation, and cross-origin Customer Print Request corrective |

## Passing checks

| Check | Result |
|---|---|
| Focused pricing, cache, Portal, Studio, and cross-origin contract suite | **145/145 pass** |
| Global Gang Sheet Settings / compositor / export / size-count suite | **40/40 pass** |
| Snapshot-first Show Queue dollar total regression | **8/8 pass** |
| Functions build | **pass** — `npm --prefix functions run build` |
| Studio typecheck | **pass** — `npx tsc --noEmit` from `apps/studio` |
| Portal typecheck | **pass** — `npm run typecheck --workspace @fresh-prints/portal` |
| Studio packaged release build | **pass** — `npm run build:studio`, version `1.0.15`; Windows installer generated |
| Portal production build | **pass** — `npm run build:portal`; 22/22 static pages |
| Studio release lint | **pass** — current 15, baseline 25, new 0 |
| Changed-source ESLint | **pass** — modified goal-scoped files and new files |
| Diff validation | **pass** — `git diff --check` |

The focused contract coverage includes the fixed width boundaries, two-dimensional Pocket rule,
all four height surcharge boundaries, exact quantity, Portal pricing projection wiring,
snapshot-first totals, snapshot-less compatibility behavior, origin-neutral Studio drafts,
parking/unparked eligibility, the transactional Studio creation callable, and the stable
`/users?customerId=...` navigation contract.

## DEV deployment and live non-interactive verification

The owner-authorized DEV deployment targeted `fresh-prints-dev` only. The exact reviewed
allowlist contained 25 Functions: `addPortalCatalogDesignToPrintRequest`,
`allocateStudioPrintRequestToShow`, `applyShowProductionRecovery`, `applyShowQueueMove`,
`archivePrintRequest`, `attachExistingCustomerUploadsToPrintRequest`,
`clearPortalWorkingPrintRequest`, `confirmCustomerUploadsAndAttachToRequest`,
`convertCustomerPrintRequestToInternal`, `createPortalPrintRequest`,
`createStudioCustomerPrintRequest`, `customerAddAssistedApprovedProofToPrintRequest`,
`deleteEligiblePrintRequest`, `duplicatePortalPrintRequestItem`, `getPortalShowPricing`,
`onPrintRequestEditingExitRestoreParked`, `previewPrintRequestDeletion`,
`previewShowProductionRecovery`, `previewShowQueueMove`, `queuePortalPrintRequestToShow`,
`removePortalPrintRequestItem`, `unqueuePortalPrintRequestFromShow`,
`unqueueStudioCustomerPrintRequestFromShow`, `updatePortalPrintRequestItemQuantity`, and
`updatePortalStaffArtworkPrintRequestItemSize`. All 25 are `ACTIVE` at deployed source hash
`9eff4e7503246487859ad354ce53d2f78360b9b5`.

Firestore Rules were released successfully to DEV. Storage Rules, indexes, Portal App Hosting,
Studio publishing, production, and data mutation were not deployed.

The live `getPortalShowPricing` callable returned only the reviewed `sectionPricing` DTO. DEV
defaults resolved to Pocket $1, Standard Full $2, Standard Oversized $3, Extra Oversized $4,
and length surcharges of $0 / $1 / $2 / $3 for Standard / Long / Extra Long / Extended. The
live projection calculation verified all eight tiers and `5 × 21 = $4` per unit. The protected
Studio creation, Studio allocation, and Portal queue callables each rejected unauthenticated
requests with HTTP 401 / `UNAUTHENTICATED` and made no data mutation.

The interactive Studio/Portal DEV scenarios were not executed because this session had no
connected in-app browser and the Windows Computer Use bridge could not connect. They remain
Owner DEV QA checks, not passing automated or live-runtime claims. The owner accepted this
limitation based on the reviewed code, 145/145 affected contracts, typechecks, release lint,
packaged build, DEV deployment, and live non-interactive checks.

### Final owner-directed corrective reconciliation

Studio parked-draft allocation now restores the selected draft and reconciles Add-to-Show;
preview/import/staff caches clear at the correct trust boundary; Portal Working identity is
rebound after post-queue cart reset through `cartResetGeneration`; an empty cart does not mask a
not-yet-ready item load; and silent reloads clear stale loading state. No new product decision,
migration, backfill, data rewrite, secret, IAM, or external-service setup was introduced.

## Checks with documented limitations

### Firestore Rules emulator

`npm run test:rules` was previously run with Java 25 and the Firestore/Storage emulators. The
focused `tests/firebase/showQueueAllocation.rules.test.ts` matrix was rerun after DEV Rules
deployment and remained 22/23 passing; the remaining failure is the existing emulator
1,000-expression-limit error while evaluating an existing Print Request / Show Queue update
path. The same failure reproduced after temporarily removing all goal-specific Rules changes,
so no candidate-only regression was identified. The final Rules delta remains narrow: allowlist
the optional `pricingSnapshot` field, make it immutable on client updates, and allow the four
new surcharge settings fields.

The new snapshot shape is authored by the Admin allocation paths. Nested Rules validation was not
added because it pushes the already-budgeted existing validator over the emulator expression limit;
readers validate the snapshot shape and fall back safely for malformed or absent legacy values.

### Portal production build

The initial `npm run build:portal` attempt failed with Windows `EPERM` opening
`apps/portal/.next/trace` because the active Portal development server owned the `.next` output.
After stopping that local server, the canonical `npm run build:portal` rerun passed: Next.js
compiled, typechecked, generated 22/22 static pages, and finalized the production build. The
existing warning that the Next.js plugin was not detected in ESLint remains non-blocking.

### Repository-wide lint

`npm run lint` reports 14 errors and one warning in unrelated pre-existing files (deletion warmup,
catalog tag/design helpers, customer identity propagation, print-request Rules-alignment tests,
show-production recovery, and a Show Rail hook). Goal-scoped modified/new files pass targeted
ESLint; no new goal-scoped lint diagnostic was found.

## Deployment boundary

The owner-authorized DEV Functions allowlist and Firestore Rules were deployed to
`fresh-prints-dev`. No production action, migration, backfill, merge, cleanup, or customer/request
fixture mutation was performed at the time of this report. Storage Rules and indexes were not
deployed. Owner DEV QA is closed `approved_with_notes`; production rollout remains separately
tracked by the Signoff and production rollout artifacts.

## Production rollout closeout note

Protected PR #101 merged as production `e6e7eaf7b47e714414572a986611afa124bb8a8b`.
Production Firestore Rules, the exact reviewed 25 Functions, and Portal App Hosting rollout
`build-2026-09-17-002` were deployed and smoke-checked successfully. Studio `v1.0.15` was not
published: repeated production release attempts built Windows successfully, but macOS packaging
stalled on fresh GitHub runners and GitHub Release asset uploads returned HTTP 500/502. Existing
stable Studio `v1.0.14` remains current. The goal is blocked only on this external release
pipeline; no data mutation, migration, backfill, cleanup, secret, IAM, Storage Rules, or index
change occurred.
