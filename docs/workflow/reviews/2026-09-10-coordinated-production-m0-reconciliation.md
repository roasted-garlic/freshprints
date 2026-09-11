# Coordinated Production M0 Reconciliation

## Rerun — customer-upload follow-up child signed off (2026-09-10)

This section is the authoritative current M0 preparation. The pre-child sections below are retained
as historical evidence and are not a candidate disposition.

| Field | Current rerun result |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Child | `customer-upload-follow-up-catalog-permission` — Signoff `approved_with_notes` |
| Snapshot | `development` dirty at `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`; `origin/development` same |
| Production baseline | `origin/production` at `36165096f09bef6817adb5b11d496dbb1502b34b`; untouched |
| Working-tree inventory | **59** status entries: **43 tracked**, **16 untracked** |
| Candidate SHA | None; prior `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d` is stale and must not be reused |
| Freeze / deploy | Not executed; no production, DEV, hosting, Rules, Storage, index, setting, or data action |

### Complete current inventory and disposition

Every status entry from `git status --short --untracked-files=all` is classified below. Ignored
local environment/build/emulator material is not a status entry and remains excluded; no secret
value was read or staged.

**Included coordinated-candidate runtime (28):**

- Portal (7): `apps/portal/app/(app)/requests/artwork/page.tsx`; `apps/portal/features/auth/components/PortalLoginMaintenanceNotice.tsx`; `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx`; `apps/portal/features/navigation/components/PortalAppShell.tsx`; `apps/portal/features/notifications/services/customerNotificationsService.ts`; `apps/portal/styles/customer-uploads.css`; `apps/portal/features/customer-uploads/components/CustomerUploadCatalogPermissionFollowUpModal.tsx`.
- Studio (4): `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx`; `apps/studio/src/renderer/src/features/customer-uploads/hooks/useCustomerUploadIntake.ts`; `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts`; `apps/studio/src/renderer/src/styles/layout.css`.
- Functions (11): `functions/src/confirmCustomerUploadsAndAttachToRequest.ts`; `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts`; `functions/src/excludeCustomerUploadFromCatalog.ts`; `functions/src/getPortalMaintenanceState.ts`; `functions/src/index.ts`; `functions/src/lib/customerNotifications/createCustomerNotification.ts`; `functions/src/lib/customerUploadCatalogConfirmation.ts`; `functions/src/restoreCustomerUploadCatalogEligibility.ts`; `functions/src/getCustomerUploadCatalogPermissionFollowUp.ts`; `functions/src/requestCustomerUploadCatalogPermissionFollowUp.ts`; `functions/src/respondToCustomerUploadCatalogPermissionFollowUp.ts`.
- Shared (6): `packages/shared/src/types/customerNotifications/customerNotifications.types.ts`; `packages/shared/src/types/customerUpload/customerUpload.enums.ts`; `packages/shared/src/types/customerUpload/customerUpload.types.ts`; `packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types.ts`; `packages/shared/src/utils/customerNotifications.ts`; `packages/shared/src/utils/customerUploadCatalogIntakeEligibility.ts`.

**Validation-only (7):** `docs/workflow/reviews/2026-09-10-coordinated-production-function-closure-audit.mjs`; `functions/src/lib/customerUploadCatalogConfirmation.test.ts`; `packages/shared/src/utils/customerNotifications.test.ts`; `packages/shared/src/utils/customerUploadCatalogIntakeEligibility.test.ts`; `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeQueries.test.ts`; `tests/portalMaintenance.contract.test.ts`; `tests/customerUploadCatalogPermission.contract.test.ts`.

**Documentation/workflow (23):** `.cursor/workflow/state.md`; `references/project-chatgpt-handoff/CURRENT-STATE.md`; `docs/architecture/BACKEND.md`; `docs/architecture/DATA_MODEL.md`; `docs/project/DECISIONS.md`; `docs/workflow/plans/2026-09-10-customer-upload-follow-up-catalog-permission-plan.md`; `docs/workflow/plans/2026-09-10-portal-maintenance-public-read-fail-open-plan.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-candidate-preparation.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-config-data-disposition.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-function-closure.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-index-union.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-portal-build-input-manifest.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-rules-manifest.md`; `docs/workflow/reviews/2026-09-10-coordinated-production-studio-build-input-manifest.md`; the four customer-upload child review/implementation/test/signoff artifacts; and the three Portal-maintenance public-read review/test/signoff artifacts.

**Separately reviewable (1):** `docs/workflow/plans/2026-09-09-studio-portal-request-design-order-parity-amendment-plan.md` — explicitly excluded from this candidate.

No current status entry is silently discarded, deferred, or treated as unrelated runtime. The
previous hard-delete and maintenance runtime remain included through their already reviewed paths;
the parity plan remains outside the candidate.

### Prepared candidate assembly path set (not staged)

If the owner authorizes a new post-child candidate commit, the exact status-path set prepared for
staging is the **58 paths above**: all 28 included runtime paths, all 7 validation/evidence paths,
and these 23 workflow/state paths:

`.cursor/workflow/state.md`; `references/project-chatgpt-handoff/CURRENT-STATE.md`;
`docs/architecture/BACKEND.md`; `docs/architecture/DATA_MODEL.md`; `docs/project/DECISIONS.md`;
`docs/workflow/plans/2026-09-10-customer-upload-follow-up-catalog-permission-plan.md`;
`docs/workflow/plans/2026-09-10-portal-maintenance-public-read-fail-open-plan.md`;
`docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-implementation-review.md`;
`docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-review.md`;
`docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-signoff.md`;
`docs/workflow/reviews/2026-09-10-customer-upload-follow-up-catalog-permission-test-report.md`;
`docs/workflow/reviews/2026-09-10-portal-maintenance-public-read-fail-open-review.md`;
`docs/workflow/reviews/2026-09-10-portal-maintenance-public-read-fail-open-signoff.md`;
`docs/workflow/reviews/2026-09-10-portal-maintenance-public-read-fail-open-test-report.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-candidate-preparation.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-config-data-disposition.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-function-closure.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-index-union.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-portal-build-input-manifest.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-rules-manifest.md`;
`docs/workflow/reviews/2026-09-10-coordinated-production-studio-build-input-manifest.md`.

The modified closure-audit script is validation evidence in this set, not production runtime. The
only status path intentionally omitted is
`docs/workflow/plans/2026-09-09-studio-portal-request-design-order-parity-amendment-plan.md`,
which remains separately reviewable. No staging, commit, push, or cleanup has occurred.

### Child inclusion and regenerated M0 evidence

- **Function closure:** 173 current exports, 120 production exports, 54 additions and 1 removal;
  513 unique local closure paths; digest
  `32cce483f02b8d69d2fcb1e7b98daf544f33095a977cb0d80cfa161c5e7dfb1e`. Action counts: ADD 41,
  UPDATE 47, RETAIN LIVE VERSION 66, EXCLUDE 10, NO ACTION 9. The three child exports are ADD;
  the response callable closure includes the Portal maintenance mutation guard; the read callable is
  owner-scoped and safe. DEV/test/source-only exports remain excluded/deferred, and no broad deploy
  is implied. Full artifact: `2026-09-10-coordinated-production-function-closure.md`.
- **Maintenance guard inventory:** 29 customer-mutation callable modules are guarded, including
  `respondToCustomerUploadCatalogPermissionFollowUp`, plus the shared trusted resolver in
  `functions/src/lib/portalMaintenance.ts`. Missing maintenance state remains OFF/allowed; ON
  blocks ordinary customer response mutation while the configured tester retains the signed-off
  exception. The complete list was mechanically checked with `rg` and the contract test.
- **Rules / Storage:** Firestore candidate `7c9c4a0026c4655ddedb606c043429dbf04d7a4cfe7c02a7af61ee002140612b` (production baseline `cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad`); Storage candidate `d3260351cbf12e550dd3e5e89a1e217dc4b9a0c4e2d819221d6ec8fc5d946297` (production baseline `39f17c0fbc25435eac4355ec2b5977a1aaecf3b340619b3d5f0b6d4ae22a3a36`). Whole-file hashes are unchanged from the reviewed packet; no child Rules/Storage change, bypass, or hard-delete rule was found.
- **Indexes:** exact union remains **87** (77 production + 10 reviewed additions), with zero deletion/replacement and no child-specific index. Reviewed union digest remains `f95a9e68086203a1863a54911c812ae9b2acb73346253ab6f3b28a0081998a20`; current raw hash `6355ca54ce0c282cb6c19987a9c05c5acf8f0c0f259060f1c000c121b91f5ced`, production raw hash `8ede15025538dd4d8c96da28a24b6a8581e7425e75063632bca75b229713dcfa`.
- **Portal:** child Alert/deep-link/modal/service/CSS paths are included; only the opaque token is
  carried in `permissionRequest`, with no upload ID or Storage path/URL in URL or DTO. Existing
  Alerts remain compatible; rollback is Portal build-003. No build or publication occurred. The
  existing `.next/trace` EPERM remains an environment lock, not a pass.
- **Studio:** child Excluded reason/follow-up action, service/hook, query validation, and styling
  are included; the shared hard-delete UI gate remains production-hidden and both hard-delete
  Functions remain EXCLUDE. Rollback is Studio v1.0.9. Vite build and child focused evidence carry
  forward; unrelated Studio typecheck baseline remains documented.
- **Config/data:** maintenance document remains absent/OFF; AI autonomy and Pass 2 remain OFF;
  queueTab and lifecycle backfills remain deferred/conditional; Algolia and Smart Profile remain
  conditional; no child upload migration/backfill, Auth change, secret rotation, standard-size
  reset, production write, maintenance activation, or overnight backfill scheduling occurred.
- **Validation carried forward:** child focused tests **36/36 PASS**, maintenance contracts **9/9
  PASS**, Functions build **PASS**, Portal typecheck **PASS**, targeted ESLint **PASS**, and
  `git diff --check` **PASS**. This is M0 preparation evidence only; final RC/M3 was not run.
- **Hard-delete audit:** `functions/src/index.ts` retains both DEV exports, while neither appears in
  `origin/production:functions/src/index.ts`; both are EXCLUDE in the closure and no production UI
  path exposes them.

### M0 boundary and next owner checkpoint

M0 read-only reconciliation is complete at the dirty snapshot. A new candidate commit/push is not
authorized by the current state, and the previous candidate SHA is stale. Do not stage, commit,
push, freeze, deploy, publish, activate maintenance, run backfills, or mutate production in this
turn. The next exact owner checkpoint is:

> **OWNER AUTHORIZE REVIEWED POST-CHILD CANDIDATE COMMIT/PUSH** — authorize staging only the
> reviewed coordinated-candidate path set from this rerun, creating one new `development` commit
> with message `chore(release): assemble coordinated production candidate`, pushing only
> `origin/development`, and regenerating immutable manifests at the resulting SHA. This does not
> authorize M1 freeze, production deployment, Rules/Storage/index operations, hosting or Studio
> publication, maintenance activation, data operations/backfills, or merge to production.

STOP at this checkpoint. Do not present `FREEZE MAIN CANDIDATE SHA <SHA>` until a clean new SHA and
all regenerated manifests exist.

## Historical pre-child snapshot (retained for audit trail)

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Snapshot | `development` at `b5aec1b2b1ac4eba5ab704f1db8f87ea22f1daaa`; `origin/development` same; dirty |
| Production baseline | `origin/production` at `36165096f09bef6817adb5b11d496dbb1502b34b`; untouched |
| Current status | **M0 reconciliation complete at dirty snapshot; blocked before M1 candidate freeze** |
| Current worktree | 115 status entries: 59 tracked, 56 untracked; no secret-named status path found |
| Child status | `studio-hard-delete-production-ui-gate` Signoff `approved_with_notes` |
| Freeze | Not executed; no candidate SHA exists |

## 1. Complete runtime/config/package disposition

The current status inventory is mechanically classified below. No path is silently discarded. The
original 100-entry inventory and historical evidence remain in
`2026-09-10-coordinated-production-candidate-preparation.md`; the six new reconciliation manifests
and this report account for the current 115-entry snapshot.

The ignored-file audit found local environment files (`apps/portal/.env.local`, `apps/studio/.env.local`,
`functions/.env.fresh-prints-dev`, `functions/.env.fresh-prints-prod`), dependency/build directories,
and emulator/debug logs. They are explicitly excluded from the candidate; no secret value was read,
printed, staged, or copied into the manifests.

| Surface | Include/review as candidate runtime | Validation-only / docs-only / excluded |
|---|---|---|
| Portal (18 status paths) | 17 runtime paths: login page; providers; `PortalAdminAuthGate`; CompleteProfile/Login/Register; AuthProvider; PortalAppShell/HeaderActions/Sidebar; shell and admin Show Queue CSS; `PortalLoginMaintenanceNotice`; four maintenance context/service/experience/banner paths. Exact source and secret boundary: `2026-09-10-coordinated-production-portal-build-input-manifest.md`. | `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts` is validation-only. Request-design parity Plan remains separate and excluded. |
| Studio (8 status paths) | Six runtime paths: SettingsPage, settings CSS, PortalMaintenanceSettingsSection, settings hook/service, and `CustomerDirectoryTable` hard-delete gate. Existing `operationalWipeUiGate.ts` is clean source retained as a DEV-only dependency. Exact build boundary: `2026-09-10-coordinated-production-studio-build-input-manifest.md`. | Two contract tests are validation-only. Hard-delete backend/dialog source remains retained but both hard-delete Functions are excluded. |
| Functions (35 status paths) | 32 changed runtime source paths (28 customer guard files plus `getPortalMaintenanceState`, `updatePortalMaintenanceState`, `listPortalMaintenanceTestCustomers`, and `lib/portalMaintenance.ts`); `functions/src/index.ts` is the changed export registry. Exact transitive closure and every export action are in `2026-09-10-coordinated-production-function-closure.md`, reproducible with its read-only `...function-closure-audit.mjs` script. | Two resolver integration/unit tests are validation-only. Explicit source-only/destructive/DEV exports are `EXCLUDE`; deferred catalog/Smart Profile playground exports are `NO ACTION`. |
| Shared (2 status paths) | `packages/shared/src/constants/portal/portalMaintenance.constants.ts` | Its contract test is validation-only. Other shared modules are included only when reached by the Function/Portal/Studio closure. |
| Firebase policy | Whole-file `firestore.rules` and `storage.rules`, with maintenance resolver/guards and the reviewed accumulated candidate drift | `tests/firebase/portalMaintenance.rules.test.ts` and `tests/portalMaintenance.contract.test.ts` are validation-only; no Rules deploy occurred. Exact hashes/map: `2026-09-10-coordinated-production-rules-manifest.md`. |
| Indexes | Proposed logical union = all 77 production definitions + 10 additions = 87; the legacy `designs(status ASC, updatedAt ASC)` definition is explicitly restored | No index deploy or data operation occurred. Exact union: `2026-09-10-coordinated-production-index-union.md`. |
| Package/build/config | Root `package.json` changed only for the Rules test command (validation-only); revalidate root `package-lock.json`, `firebase.json`, `.firebaserc`, `functions/package.json`, `functions/package-lock.json`, `functions/tsconfig.json`, `packages/shared/package.json`, Portal `package.json`/`next.config.ts`/`tsconfig.json`/`apphosting.yaml`, Studio `package.json`/`vite.config.ts`/`tsconfig.json`/`tsconfig.node.json`/`electron-builder.json5`, and generated build config at the clean SHA | No secret values, local env files, build output, release output, or debug logs are candidate inputs. |
| Documentation/state | `.cursor/workflow/state.md`, permanent docs, handoff docs, accepted Plans/Reviews/Signoff, historical maintenance evidence, the Portal admin signoff, M0 report, and the exact M1 proposal are retained as docs/evidence | The request-design parity Plan is explicitly excluded for separate review. Documentation does not authorize runtime inclusion or deployment. |

The Portal, Studio, Functions, Rules, index, and configuration/data manifests are the authoritative
path-level dispositions for this M0 snapshot. All must be regenerated at the eventual clean SHA.

## 2. Deterministic Function closure

The closure audit found 170 current exported names versus 120 in production source, 509 unique local
closure paths, and sorted newline-terminated closure hash
`a045c0514e855a08469cffadb81b487d4f5fbfb15e5757a9a588f5b8a3720a90`.

| Action | Count |
|---|---:|
| `ADD` | 38 |
| `UPDATE` | 41 |
| `RETAIN LIVE VERSION` | 72 |
| `EXCLUDE` | 10 |
| `NO ACTION` | 9 |

The artifact proves the required `export → transitive import closure → changed path → action`
mapping. `previewHardDeleteCustomerAccount` and `hardDeleteCustomerAccount` are both `EXCLUDE`;
their source remains available for allowlisted DEV only. No broad deploy command was run or prepared.

## 3. Rules, index, Portal and Studio packet

- Whole-file Rules hashes and the maintenance enforcement/compatibility map are recorded in the
  Rules manifest. `rg hardDelete|previewHardDelete firestore.rules storage.rules` returns no match.
- The index union retains all 77 production definitions and adds ten current entries without
  deletion or `--force`; the current file's `__name__` variant does not replace the required legacy
  definition.
- The Portal manifest records the App Hosting root, shared/lockfile/config inputs, 13 secret names
  (names only), maintenance/admin runtime, exclusions, and rollback build-003.
- The Studio manifest records the renderer/Electron/shared/release inputs, maintenance Settings,
  `isOperationalWipeUiEnabled()` hard-delete gate, production-hidden proof, exclusions, and rollback
  v1.0.9.
- The configuration/data disposition keeps maintenance absent/OFF, AI autonomy/Pass 2 OFF, lifecycle
  and queueTab backfills conditional/deferred, and Algolia/Smart Profile/Auth/settings/secrets
  unchanged pending later gates.

## 4. Validation evidence

- `git diff --check`: **PASS** (normal CRLF conversion warnings only).
- Function closure inventory: **PASS** at the dirty snapshot; must be re-run at clean SHA.
- Index structural comparison: **PASS** for 77 baseline + 10 additions, 87-entry proposal.
- Rules/Storage whole-file map and hashes: **GENERATED**; no deploy.
- Portal/Studio build-input manifests: **GENERATED**; no build/publication in this M0 step.
- Hard-delete exclusion audit: **PASS** — both current exports exist in DEV source and neither exists in
  `origin/production:functions/src/index.ts`; child UI contracts and build evidence remain recorded.
- Child focused contracts: **12/12 PASS**; targeted ESLint **PASS**; Studio Vite build **PASS**;
  repo-wide Studio typecheck retains its documented unrelated baseline. Parent M3/RC validation was
  not run and is not claimed.

## 5. Clean candidate boundary and owner checkpoint

The worktree is intentionally preserved and remains dirty. Creating one clean committed development
candidate requires an owner checkpoint because current FreshForge state forbids commit/push and the
115 status entries include prior user work, accepted child source, and untracked evidence. Do not use
`git reset`, `git checkout`, `git clean`, `git add .`, or `git add -A` to make it appear clean.

Exact prepared action after owner authorization:

1. Review the complete `git status --short --untracked-files=all` inventory and this disposition;
   explicitly approve the reviewed path set (including the new manifests) and any paths to retain
   outside the candidate.
2. Stage only that explicit path list with `git add -- <reviewed paths>`; run `git diff --cached --check`.
3. Commit with `chore(release): assemble coordinated production candidate` on `development`.
4. Push only to `origin/development` with `git push origin development`.
5. Verify `git status --short`, `git rev-parse HEAD`, `git rev-parse @{u}`, and
   `git merge-base --is-ancestor HEAD @{u}`; regenerate every manifest at the resulting SHA.

This action is **prepared, not executed**. It requires the owner decision
`OWNER AUTHORIZE REVIEWED CANDIDATE COMMIT/PUSH` and does not authorize a production deploy,
publication, maintenance activation, or M1 freeze.

## 6. M0 result and exact next checkpoint

M0 runtime reconciliation is complete at the dirty snapshot, but M0 is **not complete for freeze**:
the clean committed candidate SHA and its regenerated immutable manifests do not yet exist. No
`FREEZE MAIN CANDIDATE SHA <SHA>` decision is requested or implied here.

**Next parent checkpoint:** owner reviews this packet and authorizes the explicit reviewed
commit/push (or supplies dispositions that reduce the path set). After the clean SHA is verified,
regenerate the six manifests (and re-run the read-only closure audit script) and present the exact M1 proposal at
`docs/workflow/reviews/2026-09-10-coordinated-production-candidate-freeze-proposal.md`. Stop there
for the owner’s explicit freeze decision. Do not proceed to M2/M3, deploy, publish, mutate data,
activate maintenance, or perform Owner QA on the owner’s behalf.
