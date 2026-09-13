# Coordinated production immutable baseline — read-only capture

| Field | Value |
|---|---|
| Date | 2026-09-12 (America/Chicago) |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Frozen candidate | `ff533c835508e65bb3cfd9d2739f72bafe1fc895` |
| Production project | `fresh-prints-prod` |
| Production source baseline | `origin/production` at `36165096f09bef6817adb5b11d496dbb1502b34b` |
| Capture mode | Read-only service and Git inspection; no writes or deployment commands |

This record captures the rollback/readiness baseline authorized for the frozen-candidate RC. The
service queries below were reads only. Secret values, customer documents, and customer identifiers
were not requested or recorded.

## Rules rollback snapshot capture — 2026-09-13

Owner-authorized read-only Rules API access was used to capture the currently deployed production
Firestore and Storage releases and their source-backed rulesets. The complete metadata, source
hashes, raw-response hashes, and reproducibility method are recorded in
`docs/workflow/reviews/2026-09-13-coordinated-production-rules-rollback-snapshot.md`.

| Service | Release | Ruleset | Release updated | Source SHA-256 |
|---|---|---|---|---|
| Firestore | `cloud.firestore` | `42adfbb5-9f5d-4d22-a07b-e38078aba074` | `2026-08-24T15:32:06.614257Z` | `cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad` |
| Storage | `firebase.storage/fresh-prints-prod.firebasestorage.app` | `0c911fca-b6bf-48cd-83c8-e0622f334767` | `2026-08-11T20:45:02.917649Z` | `69ca680a7018ed48a9b46dc9cefd239ed0b5ea94ef50c57c3b75a9689f108306` |

The Rules rollback-evidence blocker is **CLOSED**. This was metadata/source retrieval only; no
Rules deployment, replacement, publication, or production data/configuration mutation occurred.

## Remediation revalidation update — 2026-09-12

- **Portal clean build:** an isolated checkout at the frozen SHA used Node `v20.20.1`, npm
  `10.8.2`, and `npm ci --ignore-scripts`. `npm run build:portal` passed compilation, lint/type
  validation, 21/21 static pages, and trace collection. `.next/trace` exists (818,950 bytes; 298
  output files); the EPERM condition did not reproduce. Synthetic non-production public config
  placeholders were used, and no secret values were read or recorded. Build ID:
  `ieL4DZ0JURjcMgcb-S0q4`.
- **Studio prerelease workflow:** validation-only run
  `34735296362 <https://github.com/roasted-garlic/freshprints/actions/runs/34735296362>` targeted
  the exact frozen SHA with `release_type=prerelease`. Windows and macOS both failed at the
  existing whole-repository lint gate before packaging; no artifacts or release were created.
- **Rules API:** read-only ruleset/release requests still return `403` because the available ADC
  has no quota project and the Rules API is service-disabled for that credential. No IAM or quota
  project change was made; remote Rules identifiers/exports remain open.

## Source and Git baseline

| Check | Result |
|---|---|
| Candidate | `HEAD = origin/development = ff533c835508e65bb3cfd9d2739f72bafe1fc895` |
| Branch / divergence | `development`; ahead/behind `0 / 0` |
| Production source | `origin/production = 36165096f09bef6817adb5b11d496dbb1502b34b` |
| Staged paths | `0` |
| Post-freeze worktree paths | `6`, all documentation-only; non-documentation paths `0` |
| Stray zero-byte root file | absent |

The six post-freeze paths are `.cursor/workflow/state.md`, `docs/project/ROADMAP.md`, the
candidate-freeze review, and the three handoff records. Runtime/config comparison against the
frozen SHA is clean. `git diff --check` passes with line-ending conversion warnings only.

## Live Functions baseline

Read-only command: `npx --no-install firebase functions:list --project fresh-prints-prod --json`.

| Field | Result |
|---|---|
| Project / region | `fresh-prints-prod` / `us-central1` |
| Runtime | Node.js 20 (all listed Functions) |
| Live Functions | `113` |
| State | `113 ACTIVE`, `0` non-ACTIVE |
| Sorted live-ID SHA-256 | `ad78175b2a7b191eab6b67163a9c31d6e25907c2f80972f57203a8e18db0f7d3` |
| Maintenance callables | none in live IDs |
| Projection reconciler IDs | none in live IDs |

The candidate’s source closure and allowlist remain separate from this live baseline: 186 current
exports, 120 production-source exports, 530 closure paths, with the frozen action counts recorded
in the M1 freeze record. No Function was deployed or invoked.

## Firestore index baseline

Read-only command: `gcloud firestore indexes composite list --project=fresh-prints-prod
--format=json`.

| Field | Result |
|---|---|
| Live composite indexes | `77` |
| State | `77 READY`, `0` non-READY |
| Live normalized index digest | `722cf3bd4b02f28b396e7b70b58552cfb968762575f639cbc97c9361784fd34c` |
| Candidate source | `95` definitions, `3` field overrides |
| Candidate source SHA-256 | `2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae` |
| Additive comparison | `18` additions, `0` removals/replacements |
| Required projection index | candidate only: `portalPrintRequestItems (printRequestId ASC, updatedAt DESC)` |

The live service has no `portalPrintRequestItems` index. The candidate union retains all 77 live
definitions and must be deployed without `--force`; index deployment remains separately owner-gated.

## Live Portal baseline

Read-only commands: `firebase apphosting:backends:get fresh-prints-portal --project
fresh-prints-prod --json`, `gcloud run services describe fresh-prints-portal --region=us-central1
--project=fresh-prints-prod --format=json`, and an HTTP GET to the App Hosting URI.

| Field | Result |
|---|---|
| Backend | `fresh-prints-portal`, `us-central1`, Node.js 24 |
| Cloud Run service | `fresh-prints-portal` |
| Latest ready/created revision | `fresh-prints-portal-build-2026-08-24-003` |
| Traffic | `100%` to build-003 |
| Container image | `.../fresh-prints-portal:build-2026-08-24-003` |
| Read-only HTTP GET | `200`, 18,051 response bytes; Envoy; `x-nextjs-cache: STALE` |
| Immediate rollback | build-003 (coupled to transitional/prior Rules after final raw-read tightening) |
| Secondary rollback | build-002 |

No hosting rollout, restart, traffic change, or publication occurred. The 13 App Hosting secret
bindings remain a names/metadata-only concern; values were not read. The exact names are retained in
the Portal input manifest.

## Live Studio baseline

Read-only command: `gh release view v1.0.9 --repo roasted-garlic/freshprints --json ...`.

| Field | Result |
|---|---|
| Stable release | `v1.0.9` / `1.0.9` |
| Published | `2026-08-24T17:31:11Z` |
| Target commit | `f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2` |
| Draft / prerelease | `false / false` |
| Uploaded assets | `8` |
| Sorted asset-name SHA-256 | `475cf22490c3336662f16684c626bad79542ba5dfd9accd86f27a11f562d9bcb` |
| Immediate rollback | stable `v1.0.9` |
| Secondary rollback | `v1.0.8` |

No stable or prerelease publication occurred in this RC. The frozen candidate target is Studio
`1.0.10`; no package artifact was created during the local RC attempt because existing typecheck
errors stopped the build before packaging.

## Settings, search, Rules, Auth and secrets

- Read-only Firestore REST lookup of `settings/portalMaintenance` returned **404 NOT_FOUND**;
  the production setting is absent and therefore OFF under the reviewed contract. No setting was
  initialized or changed.
- Live Function metadata exposes Algolia feature/app/index names (`true`, `Z1FVCM5QUX`,
  `portal_catalog_ready_prod`) without exposing a key. Exact record count/settings remain a later
  read-only evidence item; no reconcile or provider call was made.
- A direct Firestore Rules release-list request returned **403** with the available gcloud token.
  Consequently, the remote Rules release ID/export/hash is **not captured in this record**. The
  source rollback baseline remains `firestore.rules` SHA
  `cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad` and `storage.rules` SHA
  `39f17c0fbc25435eac4355ec2b5977a1aaecf3b340619b3d5f0b6d4ae22a3a36`; remote export capture is
  required before any Rules replacement.
- Historical Auth provider evidence is Email/Password + Google. No Auth query or mutation was
  performed in this capture; reverification remains a pre-mutation gate.
- Secret values were not read, copied, rotated, or changed. Only documented names/metadata are in
  the Portal manifest.

## Boundary

Production was inspected read-only only where listed above. No production runner, DRY RUN, VERIFY,
APPLY/backfill, Rules/Functions/index deployment, Portal/Studio publication, maintenance
activation, settings/Auth/secrets/data mutation, staging, commit, push, freeze, or merge occurred.
