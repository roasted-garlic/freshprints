# Coordinated Production M0 Reconciliation

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
