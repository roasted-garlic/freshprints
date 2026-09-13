# Coordinated production final parent M0 reconciliation — 2026-09-13

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Capture mode | Read-only reconciliation; no staging, commit, push, freeze, deploy, publish, or production mutation |
| Current branch | `rc/studio-release-lint-gate-validation` |
| Corrected source SHA | `5bf477fcf676f37265018262268ee5e8734e8eff` |
| `origin/development` | `ff533c835508e65bb3cfd9d2739f72bafe1fc895` |
| `origin/production` | `36165096f09bef6817adb5b11d496dbb1502b34b` |
| Dirty status paths | `25` (`7` tracked, `18` untracked), all classified documentation/evidence |
| Sorted status-path SHA-256 | `675040758183d1ec7a658edb182e13a6e713aa03b17bd573002c99b3d9229233` |
| Unexplained paths | **0** |
| Classification | **A — READY FOR REPLACEMENT CANDIDATE COMMIT/PUSH AUTHORIZATION** |

## Scope reconciliation

The corrected source includes the coordinated production release work, baseline-aware Studio release
lint gate, consolidated Studio TypeScript stabilization, and accepted Studio-first sequencing
amendment. Studio remains version `1.0.10`; the hard typecheck gate reports zero diagnostics and
the prior package/owner install evidence remains valid for release-pipeline readiness. Production
environment Studio QA is deferred by design to the canonical stable release after production GO and
merge.

Unaffected evidence is reused: Functions closure remains `186/120` exports with controlled
transitive closure; additive index union remains `95/77` with no removals/replacements; Portal
build/smoke evidence remains valid; hard-delete production UI/backend exclusions remain intact;
the selected overnight full eligible-design Smart Profile reprocess/backfill remains separately
owner-gated; legacy physical tag deletion remains deferred.

## Rules rollback evidence

The immutable deployed Firestore/Storage Rules snapshot is captured and closed in
`docs/workflow/reviews/2026-09-13-coordinated-production-rules-rollback-snapshot.md`. Firestore
release `cloud.firestore` points to ruleset `42adfbb5-9f5d-4d22-a07b-e38078aba074` with source
SHA-256 `cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad`. Storage release
`firebase.storage/fresh-prints-prod.firebasestorage.app` points to ruleset
`0c911fca-b6bf-48cd-83c8-e0622f334767` with source SHA-256
`69ca680a7018ed48a9b46dc9cefd239ed0b5ea94ef50c57c3b75a9689f108306`.

## Boundary

No production Rules deployment/replacement, Functions/Portal/index deployment, Studio publication,
maintenance activation, projection runner, DRY RUN, VERIFY, APPLY/backfill, settings/Auth/secrets
mutation, production data write, staging, commit, push, candidate freeze, or merge occurred.

## Next checkpoint

**`OWNER AUTHORIZE REPLACEMENT CANDIDATE COMMIT/PUSH`**
