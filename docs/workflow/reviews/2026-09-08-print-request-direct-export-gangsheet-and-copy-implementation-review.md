# Implementation Review: Print Request Direct Export, Gangsheet, and Copy

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Goal | `print-request-direct-export-gangsheet-and-copy` |
| Plan | [`2026-09-08-print-request-direct-export-gangsheet-and-copy-plan.md`](../plans/2026-09-08-print-request-direct-export-gangsheet-and-copy-plan.md) |
| Formal Review | [`2026-09-08-print-request-direct-export-gangsheet-and-copy-review.md`](2026-09-08-print-request-direct-export-gangsheet-and-copy-review.md) |
| Implementation authorization | **Recognized: YES** — explicit owner authorization received |
| Verdict | **Implementation Review approved locally; DEV Firebase deployment recorded; follow-up pricing/weight refinement validated locally; stop before Studio publish and Owner QA** |

## Scope and stop boundary

The first implementation tables below are retained as pre-amendment evidence for the original
Export/Generate/Copy scope. The amended implementation review at the end of this document is the
authoritative final state for the global Gang Sheet Settings and four-tier pricing work.

The approved implementation is complete in the working tree. This review covers the three authorized Studio capabilities for Customer and Internal Print Requests:

- request-scoped Export Images and Export x(Qty);
- Standard-only request-scoped Generate Gangsheet;
- staff-only Copy Request with atomic server validation.

The authorized DEV Rules and `copyStudioPrintRequest` deployments are recorded below. Studio
publish, production action, commit, push, and Owner QA have not been performed. The next action
requires the owner checkpoint named at the end of this document.

### Workflow state before implementation

The authoritative state was `managed-phase`, active goal
`print-request-direct-export-gangsheet-and-copy`, implementation gate, with the Plan and Formal
Review approved and an owner checkpoint requiring explicit implementation authorization. The
attached owner authorization cleared that implementation gate while retaining the separate DEV
deployment, Studio publish, production, commit, push, and Owner QA restrictions.

## Required implementation checks

| # | Check | Result | Evidence |
|---:|---|---|---|
| 1 | Show Queue behavior unchanged | **PASS** | Existing allocation gathering remains in the Show Queue adapter; shared resolver and downstream ZIP/Sharp/planner/compositor paths are reused. Show Queue regression tests passed. |
| 2 | Show Queue filenames unchanged | **PASS** | Request-only naming helpers are used only by request actions; existing Show Queue filename helpers and call sites remain unchanged. |
| 3 | Request production-resolution parity | **PASS** | Request asset gathering calls `resolveShowExportProductionAsset` and the same source-aware production path used by Show Queue. |
| 4 | Enhanced artwork parity | **PASS** | `artworkEnhanceMode`, active enhanced dimensions, and enhanced derivative resolution are preserved; missing enhanced assets fail closed. |
| 5 | Request actions use request items only | **PASS** | Export and Standard gang-sheet hooks build inputs from the selected request's items; no show/allocation query is used. The legacy gang-sheet IPC token is compatibility-only; `requestItemId` is authoritative. |
| 6 | No current allocation dependency | **PASS** | When shown, request export/generation do not require a show or allocation; Working/Editing requests intentionally hide these direct buttons while retaining Add to Show/Internal Gangsheet. |
| 7 | Request cache isolation | **PASS** | Gang-sheet requests use `print-request:<requestId>` scope and request-specific fingerprint inputs, preventing Show Queue cache collision or overwrite. |
| 8 | No Show telemetry mutation | **PASS** | Request generation does not call `recordGangSheetGenerated`, write show metadata, create Firebase artifacts, or attach to a show. |
| 9 | Copy is atomic | **PASS** | `copyStudioPrintRequest` uses an Admin SDK transaction, bounded writes, full pre-write validation, and no partial-write path. |
| 10 | Source request immutable | **PASS** | Copy creates fresh parent/item IDs and writes no source updates, allocations, lineage, or history. |
| 11 | CR/IR normal naming | **PASS** | Copy uses the existing sequence/name utilities for fresh CR/IR identities; source names and sequences are not copied. |
| 12 | Continuable Customer guard authoritative | **PASS** | Destination customer state is revalidated server-side for active, non-guest eligibility and existing continuable requests. |
| 13 | Foreign private uploads fail closed | **PASS** | A cross-customer copy containing a private upload owned by another customer rejects the entire transaction; same-owner Customer and Internal destinations remain allowed. |
| 14 | Portal permissions unchanged | **PASS** | No Portal UI, Firestore Rule, or Storage Rule changes were made. |
| 15 | No Rules/index/migration change | **PASS** | No Firestore Rules, Storage Rules, index, schema, or migration files changed. |
| 16 | Historical/Printed behavior | **PASS** | Non-Working/non-Editing historical/Printed requests expose the direct actions read-only when exact request items/assets resolve; Working/Editing requests intentionally expose only their existing Add to Show/Internal Gangsheet actions. Missing assets fail preflight without fallback or lifecycle reopening. |
| 17 | Exact proposed DEV Function inventory | **PASS** | The only new exported Function is `copyStudioPrintRequest` (`functions/src/index.ts` → `functions/src/copyStudioPrintRequest.ts`). No Function was deployed. |
| 18 | Studio packaging/publish disposition | **PASS** | Renderer/Electron changes imply a later Studio package/publish, but no package or publish was performed and no release/version bump was made. |

## Implemented files

### Application and shared code

- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/print-requests/components/CopyPrintRequestModal.tsx`
- `apps/studio/src/renderer/src/features/print-requests/components/ExportPrintRequestConfirmModal.tsx`
- `apps/studio/src/renderer/src/features/print-requests/components/GeneratePrintRequestGangSheetModal.tsx`
- `apps/studio/src/renderer/src/features/print-requests/hooks/useExportPrintRequestZip.ts`
- `apps/studio/src/renderer/src/features/print-requests/hooks/useGeneratePrintRequestGangSheet.ts`
- `apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/services/copyStudioPrintRequestService.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/buildPrintRequestExportAssets.ts`
- `apps/studio/electron/ipc/export/exportRequestValidation.ts`
- `apps/studio/electron/services/export/composeGroupedGangSheetSheets.ts`
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.ts`
- `apps/studio/electron/services/export/exportGangSheetPng.ts`
- `functions/src/copyStudioPrintRequest.ts`
- `functions/src/lib/copyStudioPrintRequestCore.ts`
- `functions/src/lib/copyStudioPrintRequestCore.test.ts`
- `functions/src/index.ts`
- `packages/shared/src/types/export/gangSheetExportIpc.types.ts`
- `packages/shared/src/types/export/showExportIpc.types.ts`
- `packages/shared/src/types/printRequest/copyStudioPrintRequest.types.ts`
- `packages/shared/src/utils/gangSheetCacheFingerprint.ts`
- `packages/shared/src/utils/gangSheetCacheFingerprint.test.ts`
- `packages/shared/src/utils/printRequestExportFilename.ts`
- `packages/shared/src/utils/printRequestExportFilename.test.ts`

### Documentation and workflow state

- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/BACKEND.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/project/DECISIONS.md`
- `docs/standards/TESTING.md`
- `docs/WORKFLOWS.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/NEXT-PLANNED-GOAL.md`

The approved Plan and Formal Review remain the governing pre-implementation artifacts; no replacement Plan or repeated Formal Review was created.

## Post-review owner clarification

The owner clarified that the direct Export Images, Export x(Qty), Generate Gangsheet, and Copy
Request buttons are not needed on Working or Editing requests. The implementation now gates those
buttons on the derived request tab and leaves the existing Add to Show / Add to Internal Gangsheet
surface under its original eligibility rules. The focused contract test covers both hidden tabs.

## Validation evidence

| Validation | Result |
|---|---|
| Focused shared, Functions, Electron, and Studio contract tests | **PASS — 36/36** |
| Electron export validation + grouped compositor regression | **PASS — 9/9** |
| Show Queue regression-focused tests | **PASS — 55/55** |
| `npm --prefix functions run build` | **PASS** |
| `npx vite build` from `apps/studio` | **PASS** (warnings only) |
| Targeted ESLint over changed TypeScript/TSX files | **PASS** |
| `npx tsc --noEmit` from `apps/studio` | **FAIL — known unrelated baseline errors only** |
| `npm run build:studio` | **FAIL at existing Studio `tsc` baseline; Vite stage not reached** |
| Full `npm run lint` | **FAIL — 19 pre-existing unrelated errors/warnings; changed files clean under targeted lint** |
| `git diff --check` | **PASS** (line-ending conversion warnings only) |

The known typecheck baseline includes existing png-validator pass-count errors, grouped compositor fixture typing, AI-review nullability, `CompanionSetStatusLabel`, existing print-request enhance-service `feature` metadata, Staff Inbox unused variables, Upcoming Shows unused import, and shared test/type errors. No new error was attributed to the implementation files.

Focused commands run:

```text
npx tsx --test packages/shared/src/utils/printRequestExportFilename.test.ts functions/src/lib/copyStudioPrintRequestCore.test.ts apps/studio/electron/ipc/export/exportRequestValidation.test.ts packages/shared/src/utils/resolveShowExportProductionAsset.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts
# 36 passed, 36 total

npx tsx --test apps/studio/electron/ipc/export/exportRequestValidation.test.ts apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts
# 9 passed, 9 total

npx tsx --test packages/shared/src/utils/showExportFilename.test.ts packages/shared/src/utils/gangSheetEfficiencyLayout.test.ts packages/shared/src/utils/gangSheetGroupedLayout.test.ts packages/shared/src/utils/gangSheetContinuousCustomerGroupedLayout.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts apps/studio/src/renderer/src/features/upcoming-shows/utils/showExportEligibility.test.ts
# 55 passed, 55 total

npm --prefix functions run build
npx vite build   # from apps/studio
npx tsc --noEmit # from apps/studio; unrelated baseline failures recorded above
npm run build:studio
npm run lint
git diff --check
```

## Deployment and release inventory (pre-amendment baseline)

- Proposed DEV Functions deployment inventory: **`copyStudioPrintRequest` only**.
- Studio package/publish: **required later to distribute the renderer/Electron changes; not performed**.
- Firestore Rules: **NO change**.
- Storage Rules: **NO change**.
- Indexes: **NO change**.
- Migration/backfill: **NO**.
- Provider calls during this work: **0**.
- Deployment performed: **NO**.
- Studio publish performed: **NO**.
- Commit/push performed: **NO**.
- Production touched: **NO**.

## Owner checkpoint

The implementation review and authorized DEV deployment are complete. Stop here and await Owner
DEV QA. The required next marker is:

`[NEEDS OWNER AUTHORIZATION: DEV DEPLOY / OWNER QA PRINT REQUEST DIRECT EXPORT, GANGSHEET, AND COPY]`

---

## Amended implementation review — Global Gang Sheet Settings and four-tier pricing

The owner-authorized amendment is implemented locally on top of the original request Export,
Generate, and Copy work. The final amended checks are:

| Requirement | Result | Evidence |
|---|---|---|
| Canonical source | **PASS** | Normalized resolver reads `settings/showQueue`; no third settings document. |
| Legacy fallback | **PASS** | `settings/internalGangSheet` is read only as a non-destructive fallback when canonical values are absent; no migration/backfill. |
| Six layout settings | **PASS** | Width, side margin, top/bottom margin, gutter, max length, and label font are normalized with defaults 23, 0.25, 0.5, 0.5, 300, and 120. |
| Four pricing tiers | **PASS** | Fixed saved-width policy: Pocket `<=4`, Standard Full Size `>4..<=11`, Standard Oversized `>11..<=14`, Extra Oversized `>14`. |
| Four weight settings | **PASS** | Each tier has editable weight; defaults are 0.40 oz for Pocket and 0.75 oz for the other tiers. |
| Saved-width-only classification | **PASS** | Shared resolver rejects invalid widths and ignores height, area, pixels, and allocation dimensions. |
| Show Queue Standard | **PASS** | Uses global normalized layout settings; mode availability and nesting remain unchanged. |
| Grouped by Customer | **PASS** | Existing compositor consumes shared four-tier summary and global layout settings. |
| Sheet per Customer | **PASS** | Existing compositor consumes shared four-tier summary and global layout settings. |
| Internal Gang Sheet | **PASS** | Same `UpcomingShowsPage` surface uses the global resolver; local editor action navigates to Studio Settings. |
| Customer Print Request | **PASS** | Request Standard Generate receives global layout/pricing settings and exact request quantities. |
| Internal Print Request | **PASS** | Internal requests use the same request Standard path and global resolver. |
| Request Standard price/weight display | **PASS** | Standard compositor renders request name plus shared price/weight summary from saved width and request quantity, with no allocation dependency. |
| Local duplicate editors | **PASS** | Show Queue modal exposes only unrelated General settings and a link to `/settings?tab=gangSheetSettings`; Internal Settings action navigates there. |
| Cache invalidation | **PASS** | Fingerprints include material layout, pricing policy/tier values, request scope/name, saved dimensions, identity, and quantity; request scope remains isolated. |
| Export regression | **PASS** | Original request Export Images / Export x(Qty) focused contracts pass; source-aware asset gathering remains unchanged. |
| Copy regression | **PASS** | Existing atomic copy core tests pass; no copy path was rewritten for this amendment. |
| Show Queue regression | **PASS** | Grouped compositor and shared Show Queue focused regressions pass; fixture compatibility fallback preserves old test inputs. |
| Rules scope | **PASS** | Only the existing `settings/showQueue` allowlist gained the eight canonical fields and optional-number checks. |
| Storage Rules / indexes / migration | **PASS** | No Storage Rules, index, migration, or new settings Function changes. |

### Amended validation evidence

| Validation | Result |
|---|---|
| Four-tier constants, summary, cache, IPC, and request contract suite | **PASS — 33/33** |
| Grouped compositor regression | **PASS — 3/3** |
| Request Export/Generate/Copy contracts plus compositor/IPC suite | **PASS — 19/19** |
| `npm --prefix functions run build` | **PASS** |
| `npx vite build` from `apps/studio` | **PASS** (warnings only) |
| Targeted ESLint over all changed TS/TSX files | **PASS** |
| `git diff --check` | **PASS** (line-ending conversion warnings only) |
| Studio typecheck | **FAIL — existing unrelated baseline errors only; no amended-file errors** |
| `npm run build:studio` | **FAIL at the same existing Studio `tsc` baseline; Vite/Electron packaging not reached** |
| Firestore Rules emulator suite | **PASS — 169/169** (initial Java and port blockers are preserved in the checkpoint history below) |

The exact successful amended focused command was:

```text
npx tsx --test packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts apps/studio/electron/ipc/export/exportRequestValidation.test.ts apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts
# 33 passed, 33 total
```

The grouped compositor command passed 3/3 after preserving the pre-amendment fixture fallback.
The combined request Export/Generate/Copy, IPC, compositor, and copy-core command passed 19/19.

### Final deployment inventory and stop boundary

- DEV Functions: **`copyStudioPrintRequest` only**; deployed to `fresh-prints-dev`.
- Firestore Rules: **deployed** for canonical `settings/showQueue` fields; ruleset
  `0d32ca64-8cfc-4bd8-bd56-b34f426d47bd`.
- Storage Rules: **unchanged**.
- Indexes: **unchanged**.
- Migration/backfill: **none required**.
- Studio package/publish: **not performed**.
- Owner DEV QA: **not performed**.
- Commit/push: **not performed**.
- Production: **untouched**.

The authorized DEV deployment is complete. Stop before Owner QA, Studio publish, commit, or push.
The required next marker is:

`[NEEDS OWNER DEV QA: PRINT REQUEST DIRECT EXPORT, GANGSHEET, COPY, AND GLOBAL GANG SHEET SETTINGS]`

### Follow-up modal ordering refinement

The owner subsequently requested a more deliberate order within the same Show Queue modal. The
Whatnot URL is now the first full-width field, default max allocation and Portal cutoff share a
two-column row, and the Gang Sheet Settings link is the final full-width control. The link uses
the shared `button-md` sizing so it matches the app's normal button height. Focused tests, targeted
lint, Vite build, and diff validation remained passing; no behavior, persistence, or deployment
scope changed.

### Test-only Rules checkpoint — 2026-09-08

The owner authorized a test-only attempt to close the remaining Firestore Rules validation blocker.
The machine preflight found no compatible JDK: `java -version` was not available, `where.exe java`
returned no path, `JAVA_HOME` was empty, and read-only scans of the normal Program Files,
ProgramData, local Programs, and Android locations found no `bin\\java.exe`. Per the checkpoint
restriction, `npm run test:rules` was not started and no Java was installed or environment variable
was persisted. The original `spawn java ENOENT` blocker therefore remains confirmed.

Result: **`[BLOCKED: COMPATIBLE JDK REQUIRED FOR FIRESTORE RULES TESTS]`**. Owner action required:
provide a compatible Java 21+ JDK (system or user-scoped), then rerun the documented
`npm run test:rules` command. No corrective Rules/code change was made.

### Resumed Rules checkpoint — Java resolved, emulator port blocked — 2026-09-08

The owner-installed Microsoft OpenJDK is visible from a shell-local fresh environment:
`openjdk version "25.0.4.1" 2026-08-18 LTS`, resolved at
`C:\\Program Files\\Microsoft\\jdk-25.0.4.101-hotspot\\bin\\java.exe` with `JAVA_HOME` set to
the JDK root. The exact documented command `npm run test:rules` was then executed (exit code 1).
Firebase CLI 15.26.0 successfully parsed Java major version 25, but Firestore emulator startup
failed before tests began because port 8080 was already occupied by the unrelated
`Remote_Keyboard.exe` process (PID 29420). No Rules tests ran, so there is no pass/fail count and
no implementation-related failure to correct. No process was terminated and no Rules/code change
was made.

The owner then freed port 8080. The final rerun is recorded below.

### Final Rules validation — 2026-09-08

Preflight confirmed the shell-local Microsoft OpenJDK 25.0.4.1 and
`C:\\Program Files\\Microsoft\\jdk-25.0.4.101-hotspot\\bin\\java.exe`; `netstat -ano | findstr :8080`
reported no listener. The exact command `npm run test:rules` then completed with exit code 0.
Firebase CLI 15.26.0 started both Firestore and Storage emulators, and the complete documented
Rules suite passed **169 tests across 22 suites: 169 passed, 0 failed, 0 cancelled, 0 skipped,
0 todo**. No test failure was attributable to the `settings/showQueue` Gang Sheet Settings
allowlist; no corrective Rules or code change was required.

### Authorized DEV deployment — 2026-09-08

The owner authorized the reviewed DEV deployment to `fresh-prints-dev` after the Rules suite
passed. Deployment commands and results:

```text
firebase deploy --only firestore:rules --project fresh-prints-dev
# exit code 0; rules compiled and released as
# projects/fresh-prints-dev/rulesets/0d32ca64-8cfc-4bd8-bd56-b34f426d47bd

firebase deploy --only functions:copyStudioPrintRequest --project fresh-prints-dev
# exit code 0; exactly one Function deployed, zero errors, zero aborted
```

The deployed Function is `copyStudioPrintRequest` in `us-central1`, runtime Node.js 20, state
**ACTIVE**, revision `copystudioprintrequest-00001-yec`, with 100% traffic on the latest revision.
The deployed source hash is `6484fccde1612904191273e4e92138f1c9c780e0`. The CLI emitted only the
documented Node.js 20 deprecation and firebase-functions version warnings; deployment completed
successfully. No other Function was deployed.

Read-only post-deploy verification confirmed the Function is present, ACTIVE, on
`fresh-prints-dev/us-central1`, and serving the latest revision. The Rules deployment output
confirmed the canonical Firestore release; no Storage Rules, indexes, migrations, Portal, Studio,
or production deployment was performed.

---

## Owner-requested Settings UX refinement — local implementation evidence

The owner requested a presentation-only refinement after the amended implementation. The change
does not alter the global settings contract, persistence, permissions, or generation behavior.

| Surface | Result | Evidence |
|---|---|---|
| Show Queue settings modal | **PASS** | Removed the General tab UI; retained the existing modal width; stacked the active General fields in one column; kept Cancel/Save in the footer so Save is the final action at the bottom. |
| Settings navigation | **PASS** | Replaced the horizontal, overflow-scrolling primary settings tab strip with a vertical sidebar beside the settings content; retained tab semantics and deep-link selection. |
| Settings content width | **PASS** | Settings content and sections now use the available page width with min-width guards; the primary tab menu no longer creates horizontal scrolling. |
| Gang Sheet Settings layout | **PASS** | Layout and Pricing & Weight are side-by-side columns on wide screens; layout controls and pricing/weight rows use responsive internal grids and collapse at narrow breakpoints. |
| Accessibility/responsive behavior | **PASS** | Existing tab roles/labels are preserved, the settings navigation declares vertical orientation, and narrow breakpoints collapse the layout without requiring horizontal scrolling. |

Local validation after the UX refinement:

```text
npx tsx --test apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts
# 7 passed, 7 total

npx eslint apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx apps/studio/src/renderer/src/features/settings/components/GangSheetSettingsSection.tsx
# PASS

npx vite build   # from apps/studio
# PASS (existing warnings only)

npx tsc -p apps/studio/tsconfig.json --noEmit
# FAIL — existing unrelated baseline errors only; no errors in the changed size-summary files

git diff --check
# PASS (line-ending conversion warnings only)
```

The full Studio build remains blocked at the same unrelated baseline TypeScript errors documented
above. Studio publish, Owner QA, commit, push, and production action have not occurred. The
required next marker is:

`[NEEDS OWNER AUTHORIZATION: STUDIO PUBLISH / OWNER QA PRINT REQUEST DIRECT EXPORT, GANGSHEET, COPY, AND GLOBAL GANG SHEET SETTINGS]`

### Owner-requested design-card cost alignment refinement — local only

The read-only design-card metadata now mirrors the requested two-row layout: `Qty` and `Cost`
share the first row, while the dimensions and per-size cost calculation share the second row with
the cost values right-aligned. The cost label is no longer combined with the formula, so the card
reads consistently across both metadata columns.

Validation after this refinement:

```text
npx eslint --max-warnings 0 [affected Print Request and gang-sheet modal TS/TSX files]
# PASS

npx tsx --test apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts apps/studio/src/renderer/src/features/upcoming-shows/components/exportGangSheetModalLayout.contract.test.ts
# 10 passed, 10 total

npx vite build   # from apps/studio
# PASS (existing warnings only)

npm run build    # from apps/studio
# FAIL before Vite because of documented unrelated baseline TypeScript errors

git diff --check
# PASS (line-ending conversion warnings only)
```

This is a local Studio refinement. No Rules, Function, Studio publish, commit, push, or production
action was performed. The required next marker remains:

`[NEEDS OWNER AUTHORIZATION: STUDIO PUBLISH / OWNER QA PRINT REQUEST DIRECT EXPORT, GANGSHEET, COPY, AND GLOBAL GANG SHEET SETTINGS]`

## Closeout — Owner DEV QA PASS (2026-09-08)

The historical local-validation marker above is superseded by the approved Signoff artifact:
`docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-signoff.md`.
Owner DEV QA passed, the final DEV disposition is approved, and the managed goal is closed.
The exact DEV Rules and `copyStudioPrintRequest` deployment evidence, Rules 169/169 result,
regression results, build/lint results, and prohibited-surface disposition are preserved in that
signoff. The next checkpoint is:

`[NEEDS OWNER AUTHORIZATION: COMMIT/PUSH CLOSED PRINT REQUEST GOAL]`

### Owner follow-up: keep four-tier summaries on queue cards only — local only

The owner clarified that Print Request list cards do not need a size-summary pill because the full
request detail already exposes its complete pricing and weight statistics. The four-tier compact
summary remains on Show Queue and Internal Gang Sheet allocation cards, where it provides useful
at-a-glance production context.

Validation after this follow-up:

```text
npx tsx --test apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts apps/studio/src/renderer/src/features/upcoming-shows/components/exportGangSheetModalLayout.contract.test.ts apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts packages/shared/src/utils/printRequestPocketFullSizeCounts.test.ts
# 19 passed, 19 total

npx eslint --max-warnings 0 [affected size-summary and card TS/TSX files]
# PASS

npx vite build   # from apps/studio
# PASS (existing warnings only)

git diff --check
# PASS (line-ending conversion warnings only)
```

This is a local Studio refinement. No Rules, Function, Studio publish, commit, push, or production
action was performed. The required next marker remains:

`[NEEDS OWNER AUTHORIZATION: STUDIO PUBLISH / OWNER QA PRINT REQUEST DIRECT EXPORT, GANGSHEET, COPY, AND GLOBAL GANG SHEET SETTINGS]`

### Owner-requested request-detail and gang-sheet modal polish — local only

The request-detail header now uses the labeled Total price and Total weight controls in place of
the older Pocket/Full Size count pill. Read-only design cards restore the stacked Qty and
dimensions presentation, with Cost as a matching third line. Both gang-sheet result modals now
allow warning panels to be dismissed. The generated-sheet list expands within the existing fixed
modal height so more sheets are visible before scrolling; the modal remains viewport-bounded.

Validation after this polish:

```text
npx tsx --test apps/studio/src/renderer/src/features/upcoming-shows/components/exportGangSheetModalLayout.contract.test.ts apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts
# 9 passed, 9 total

npx eslint --max-warnings 0 [affected request and gang-sheet modal TS/TSX files]
# PASS

npx vite build   # from apps/studio
# PASS (existing warnings only)

git diff --check
# PASS (line-ending conversion warnings only)
```

No deployment, Studio publish, commit, push, or production action was performed. The next marker
remains the explicit Studio publish / Owner QA authorization checkpoint.

### Post-deployment pricing and weight refinement — local only

The owner requested a quick follow-up after the authorized DEV Firebase deployment. The generated
gang-sheet label now renders the price calculation and weight calculation on separate lines. For
grouped layouts, both totals are calculated from the logical source request items' saved widths,
heights, and quantities, rather than from whichever physical placements happen to fit on a sheet;
physical sheet splitting therefore cannot change the displayed totals. Standard request output
continues to use the request image inputs and saved quantities directly.

Changed surfaces:

- `packages/shared/src/utils/gangSheetLabelRendering.ts`
- `packages/shared/src/utils/gangSheetLabelRendering.test.ts`
- `apps/studio/electron/services/export/exportGangSheetPng.ts`
- `apps/studio/electron/services/export/composeGroupedGangSheetSheets.ts`
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.ts`

Validation after this refinement:

| Validation | Result |
|---|---|
| Focused summary, label rendering, grouped compositor, and IPC tests | **PASS — 18/18** |
| Targeted ESLint | **PASS** |
| `npx vite build` from `apps/studio` | **PASS** (existing warnings only) |
| `git diff --check` | **PASS** (line-ending conversion warnings only) |

This is a local Studio/Electron refinement. It has not been published, and no Firebase Rules or
Function deployment was repeated. Await explicit authorization for Studio publish and Owner QA.

### Owner-requested pricing presentation refinement — local only

The owner requested a follow-up to the pricing/weight presentation. Generated gang-sheet
summaries now order configured terms by least-to-greatest dollar amount, use a compact summary
font, and show generated lengths in gang-sheet modals to exactly two decimal places. Print Request
detail now exposes labeled Total price and Total weight pills; either opens a breakdown modal with
the full price/weight formulas and per-tier rows. Each request item card also shows a right-aligned
`Cost $X x quantity = $Y` line beside the quantity controls.

Changed surfaces:

- `packages/shared/src/utils/gangSheetCustomerSectionSummary.ts` and its test
- `packages/shared/src/utils/gangSheetLabelRendering.ts` and its test
- `packages/shared/src/utils/showExportFilename.ts` and its test
- `apps/studio/electron/services/export/composeGroupedGangSheetSheets.ts`
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.ts`
- `apps/studio/src/renderer/src/features/print-requests/components/GeneratePrintRequestGangSheetModal.tsx`
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestCostBreakdownModal.tsx`
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/upcoming-shows/components/ExportGangSheetConfirmModal.tsx`
- `apps/studio/src/renderer/src/styles/components/print-requests.css`

Validation after this refinement:

```text
npx tsx --test packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts packages/shared/src/utils/gangSheetLabelRendering.test.ts packages/shared/src/utils/showExportFilename.test.ts apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts apps/studio/electron/ipc/export/exportRequestValidation.test.ts
# 46 passed, 46 total

npx eslint --max-warnings 0 [changed shared/export/Studio TS and TSX files]
# PASS

npx vite build   # from apps/studio
# PASS (existing warnings only)

npx tsc -p apps/studio/tsconfig.json --noEmit
# FAIL — existing unrelated baseline errors only; no errors in the changed pricing/UI files

git diff --check
# PASS (line-ending conversion warnings only)
```

This refinement is local only. No Rules, Function, Studio publish, commit, push, or production
action was performed. The required next marker remains:

`[NEEDS OWNER AUTHORIZATION: STUDIO PUBLISH / OWNER QA PRINT REQUEST DIRECT EXPORT, GANGSHEET, COPY, AND GLOBAL GANG SHEET SETTINGS]`

### Owner-requested four-tier size summaries — local only

The compact size summaries on Print Request list cards and Show Queue/Internal Gang Sheet
allocation cards now use the canonical width-based four-tier policy. Nonzero counts are labeled
`Pocket`, `Reg Full`, `Reg Oversize`, and `Ext Oversize`; zero-count tiers remain hidden so the
cards stay compact. The resolver now shares the same boundaries as gang-sheet pricing: 4 inches,
11 inches, and 14 inches, with height ignored as before.

Changed surfaces:

- `packages/shared/src/utils/printRequestPocketFullSizeCounts.ts` and its test
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts`

Validation after this refinement:

```text
npx tsx --test apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts apps/studio/src/renderer/src/features/upcoming-shows/components/exportGangSheetModalLayout.contract.test.ts apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts packages/shared/src/utils/printRequestPocketFullSizeCounts.test.ts
# 19 passed, 19 total

npx eslint --max-warnings 0 [affected size-summary and card TS/TSX files]
# PASS

npx vite build   # from apps/studio
# PASS (existing warnings only)

git diff --check
# PASS (line-ending conversion warnings only)
```

This is a local Studio refinement. No Rules, Function, Studio publish, commit, push, or production
action was performed. The required next marker remains:

`[NEEDS OWNER AUTHORIZATION: STUDIO PUBLISH / OWNER QA PRINT REQUEST DIRECT EXPORT, GANGSHEET, COPY, AND GLOBAL GANG SHEET SETTINGS]`

### Owner-requested inline size-range labels — local only

The request totals modal now renders each tier as a bold name followed by its settings range in
parentheses on the same line, for example `Pocket (4" and under)`. The tier's print count remains
on the next line and the price/weight calculations remain unchanged.

Validation after this refinement:

```text
npx tsx --test apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts
# 6 passed, 6 total

npx eslint --max-warnings 0 apps/studio/src/renderer/src/features/print-requests/components/PrintRequestCostBreakdownModal.tsx apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts
# PASS

npx vite build   # from apps/studio
# PASS (existing warnings only)

git diff --check
# PASS (line-ending conversion warnings only)
```

This is a local Studio refinement. No Rules, Function, Studio publish, commit, push, or production
action was performed. The required next marker remains:

`[NEEDS OWNER AUTHORIZATION: STUDIO PUBLISH / OWNER QA PRINT REQUEST DIRECT EXPORT, GANGSHEET, COPY, AND GLOBAL GANG SHEET SETTINGS]`
