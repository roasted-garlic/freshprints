# Proposed M1 candidate freeze — coordinated production promotion

## Current M1 invalidation record — 2026-09-12

Owner decision invalidated former M1 candidate SHA
`ff533c835508e65bb3cfd9d2739f72bafe1fc895` for production release purposes so the reviewed
Studio release-workflow corrective can proceed. The freeze/RC material below is retained as
historical audit evidence and is not rewritten. A new M0/M1 cycle is required after any reviewed
workflow/config source change.

## Authoritative M1 freeze record — 2026-09-12

Owner decision received: **`FREEZE MAIN CANDIDATE SHA ff533c835508e65bb3cfd9d2739f72bafe1fc895`**.
M1 is recorded as **FROZEN** for exactly this commit on `development`:

| Field | Frozen value |
|---|---|
| Candidate SHA | `ff533c835508e65bb3cfd9d2739f72bafe1fc895` |
| Commit | `chore(release): assemble coordinated production candidate` |
| Branch/upstream | `development`; `HEAD = origin/development`; ahead/behind `0/0` |
| Production baseline | `origin/production = 36165096f09bef6817adb5b11d496dbb1502b34b` |
| Portal rollback | build-003 (coupled to transitional/prior Rules after final raw-read tightening) |
| Studio target / rollback | `1.0.10` / `v1.0.9` |
| Freeze status | **FROZEN — production deployment and publication remain unauthorized** |

The frozen runtime/config contract is the previously regenerated and audited Git-object evidence:

| Surface | Frozen evidence |
|---|---|
| Functions | 186 current exports; 120 production exports; 530 closure paths; closure SHA `22e56a4810c0714999f6793a350bb67c22215b0ec556179524948552812f9fbc`; ADD 54, UPDATE 110, RETAIN LIVE VERSION 3, EXCLUDE 10, NO ACTION 9 |
| Firestore Rules | final `dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`; transition `8a50d5bb85fa41fca82652582730940fb1a936cb0aae059a0b05e59099db9945` |
| Storage Rules | `c537183f41d95ade7b6cdf80ea2cbb9241804d7a40c87b4185d3496070d9077a` |
| Indexes | 95 candidate / 77 production; 18 additive; 0 removed/replaced; 3 field overrides; SHA `2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae` |
| Portal | 747 inputs; digest `69f3814242727afa4330cadb11937ad334f64251bf4fc87d3fc57858d0c17b5b` |
| Studio | 1,145 inputs; digest `d565d27c2d4857ae2267c45b52004382a0bd37f7321026992dd37e366d5f0718`; version `1.0.10` |

The commit-byte manifests were verified with zero mismatches. Validation carries forward as 87/87
focused tests PASS, Functions build PASS, Portal typecheck PASS, targeted lint PASS, and
`git diff --check` PASS. Existing limitations remain unchanged: Portal production build is blocked
by `.next/trace` EPERM; full Firestore Rules emulator tests retain the existing expression-budget
baseline; Studio full typecheck and whole-repository lint retain unrelated baseline diagnostics;
Studio packaging was intentionally not run because it invokes installer-producing tooling.

At freeze, maintenance is absent/OFF; AI autonomy and Pass 2 are OFF; projection APPLY, backfills,
schedulers, Auth changes, secret/settings changes, cleanup, Algolia rebuilds, and production data
mutation are unauthorized. The additive dual-read cutover and production-locked runner remain under
the reviewed sequence with dry-run/VERIFY first and APPLY separately owner-gated.

From this checkpoint, any change to candidate runtime/config bytes—including Portal, Studio,
Functions, shared runtime, Rules, indexes, package/lock files, Firebase/build configuration,
production runner, projection mapper/synchronizer, or runtime assets—**invalidates this freeze**.
Stop and establish a new candidate SHA/freeze. Documentation-only workflow/evidence updates may
continue only when they do not alter that frozen contract.

M1 freeze does not authorize production reads, runner execution, DRY RUN, VERIFY, APPLY/backfill,
index/Rules/Functions deployment, Portal or Studio publication, maintenance activation, production
settings/data/Auth/secrets changes, tag/release creation, or merge to production. Exact next
checkpoint: **FROZEN-CANDIDATE RC VALIDATION / PRODUCTION GO-NO-GO PREPARATION**.

The pre-freeze reconciliation sections below are retained as historical evidence; this record is
authoritative for the current frozen candidate.

## Authoritative frozen-candidate RC checkpoint — 2026-09-12

The owner-authorized RC was completed against the frozen SHA. Freeze integrity passed and the
runtime/config tuple remains unchanged. Read-only baseline capture recorded 113/113 ACTIVE
production Functions, 77/77 READY indexes, live Portal build-003 at 100%/HTTP 200, stable Studio
v1.0.9, and an absent `settings/portalMaintenance` document. The remote Rules release export/ID/
hash could not be retrieved with the available credential (403).

Focused validation is **87/87 PASS**; Functions build, Portal typecheck, targeted lint, and diff
check pass. A clean detached checkout passed the Portal production build with synthetic
non-production public placeholders; `.next/trace` EPERM did not reproduce (build ID
`ieL4DZ0JURjcMgcb-S0q4`). The real prerelease Studio workflow run `34735296362` failed its existing
whole-repository lint gate on Windows and macOS before packaging, so no installer or install/update
evidence exists. The remote Rules release snapshot retry returned 403 service-disabled/no-quota-
project. These are documented baseline/environment limitations or evidence gaps, not new candidate
regressions.

RC readiness is **C — NO-GO for production mutation**. The detailed evidence is recorded in
`docs/workflow/reviews/2026-09-12-coordinated-production-frozen-candidate-rc-validation.md`,
`2026-09-12-coordinated-production-immutable-production-baseline.md`, and the GO/NO-GO packet.
Production state/data was not changed; only authorized read-only baseline queries ran. No runner,
DRY RUN, VERIFY, APPLY/backfill, deployment, publication, maintenance activation, staging,
commit, push, merge, or parent M0 rerun occurred.

Exact next owner checkpoint: **OWNER DECIDE INVALIDATE FROZEN CANDIDATE / RETURN TO M0-M1 FOR STUDIO RC REMEDIATION**.

## Authoritative post-commit/push reconciliation — 2026-09-12

Owner checkpoint received: **OWNER AUTHORIZE FINAL REVIEWED CANDIDATE COMMIT/PUSH**. The exact
Classification-A M0 path set was staged explicitly (256 paths) and assembled in one clean
`development` commit:

| Field | Value |
|---|---|
| Candidate SHA | `ff533c835508e65bb3cfd9d2739f72bafe1fc895` |
| Commit | `chore(release): assemble coordinated production candidate` |
| Parent | `a76d8be218571e1260bdb983f86ee5cf86563e1b` |
| Branch/upstream | `development`; `HEAD = origin/development` |
| Remote verification | `origin/development` resolves to the same full SHA; ahead/behind `0 / 0` |
| Production baseline | `origin/production = 36165096f09bef6817adb5b11d496dbb1502b34b` (unchanged) |
| Rollback anchors | Portal build-003 (standalone only before final Rules tightening; coupled with transitional/prior Rules afterward); Studio `v1.0.9` |
| M1 status | **Historical pre-freeze proposal; superseded by the authoritative M1 freeze record above** |

The clean verification window after push had an empty `git status --porcelain=v1
--untracked-files=all`; `git diff --check` passed. Commit-byte evidence was then regenerated from
Git object bytes at the candidate SHA (not working-tree bytes):

| Evidence | Immutable result |
|---|---|
| Core commit-byte manifest | 10/10 members; audit `mismatches: []`; external output `freshforge-ff533c835508e65bb3cfd9d2739f72bafe1fc895/core-manifest.json` |
| Portal input manifest | 747 files = 388 Portal + 345 shared + 9 show-picker + 5 common; digest `69f3814242727afa4330cadb11937ad334f64251bf4fc87d3fc57858d0c17b5b`; audit 0 mismatches |
| Studio input manifest | 1,145 files = 786 Studio + 345 shared + 9 show-picker + 5 common; digest `d565d27c2d4857ae2267c45b52004382a0bd37f7321026992dd37e366d5f0718`; audit 0 mismatches; version `1.0.10` |
| Function closure | 186 current exports / 120 production exports; 530 unique local closure paths; digest `22e56a4810c0714999f6793a350bb67c22215b0ec556179524948552812f9fbc`; ADD 54, UPDATE 110, RETAIN LIVE VERSION 3, EXCLUDE 10, NO ACTION 9 |
| Firestore/Storage Rules + transition config | `firestore.rules` 127,614 bytes / 2,867 non-empty lines / `dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`; transition 127,701 / 2,868 / `8a50d5bb85fa41fca82652582730940fb1a936cb0aae059a0b05e59099db9945`; `storage.rules` 13,157 bytes / 298 / `c537183f41d95ade7b6cdf80ea2cbb9241804d7a40c87b4185d3496070d9077a`; `firebase.transition.json` 108 bytes / `c07e7c2772b6fcf94b14f42af211883f248952d28bddd6e40c9efe6c8aef0c03` |
| Indexes | 95 candidate / 77 production; 3 / 0 field overrides; 18 additive, 0 removed/replaced; candidate SHA-256 `2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae`; required `portalPrintRequestItems (printRequestId ASC, updatedAt DESC)` retained |
| Config/data disposition | Maintenance absent/OFF; AI autonomy/Pass 2 OFF; queueTab/backfills conditional/deferred; Auth, Algolia, settings, secrets and production data unchanged; projection population runner is production-locked, dry-run/verify first, APPLY separately owner-gated |

Validation recorded for this candidate is **87/87 focused tests PASS**, Functions build **PASS**,
Portal typecheck **PASS**, targeted lint **PASS**, and `git diff --check` **PASS** (line-ending
warnings only). The following remain existing baseline/environment limitations, not newly introduced
failures: Portal production build is blocked by the `.next/trace` EPERM environment issue; the full
Firestore Rules emulator suite retains its existing expression-budget baseline; Studio full
typecheck retains existing unrelated baseline errors; whole-repository lint retains existing
unrelated errors/warnings; and Studio packaging build was intentionally not run because it invokes
installer-producing tooling.

The cutover remains the reviewed additive dual-read sequence: deploy transitional Rules and
projection producers, dry-run/verify and populate the projection under a separately gated
production APPLY, verify exact equality and repeat zero-diff DRY RUN, roll out Portal, then tighten
Rules with coupled rollback. No production read, runner invocation, DRY RUN, VERIFY, APPLY/backfill,
Rules/Functions/index deployment, Portal or Studio publication, maintenance activation, settings,
secrets, Auth, or data mutation occurred. No staging/commit/push beyond the authorized candidate
assembly, freeze, tag, release, or parent M0 rerun occurred.

This pre-freeze proposal was ready to present, but its former **M1 freeze is not authorized** wording
is superseded by the authoritative freeze record above. The post-push state,
M1 proposal, and workflow handoff records are documentation-only checkpoint updates; they do not
change the immutable candidate SHA or runtime/config bytes. Exact next checkpoint:
**FREEZE MAIN CANDIDATE SHA `ff533c835508e65bb3cfd9d2739f72bafe1fc895`**.

The pre-commit M0 narrative below is retained as historical context; any “dirty”, “TBD”, or
“awaiting commit/push authorization” statements in it are superseded by this section.

> **Final parent M0 — 2026-09-12:** Owner-authorized read-only reconciliation is complete and
> classified **A — READY FOR REVIEWED CANDIDATE COMMIT/PUSH**. The current tree has 256 status paths
> (134 tracked, 122 untracked), no unexplained paths, and no candidate SHA because it is dirty. All
> prior blockers (stray file, umbrella closure, additive dual-read/production-locked runner,
> Studio `1.0.10`, and SECURITY/FIREBASE/RISK synchronization) are resolved in reviewed evidence.
> This proposal still does **not** authorize freeze, staging, commit, push, deployment, publication,
> maintenance, runner invocation, or production access. Exact next checkpoint:
> **OWNER AUTHORIZE FINAL REVIEWED CANDIDATE COMMIT/PUSH**.

> **2026-09-12 M0 rerun:** This proposal is **not ready to present**. The M0 evidence snapshot had
> 231 status paths (125 tracked, 106 untracked); mandatory reporting then made the live worktree 232
> paths (126 tracked, 106 untracked). There is no candidate SHA, and pre-M1 decisions remain open.
> The 59-path statement later in this historical proposal is superseded.

## New preconditions before candidate assembly

1. Owner disposition of the unexplained zero-byte untracked root file `{console.error(e)`.
2. Owner disposition of the accepted-but-not-independently-signed-off
   `studio-permission-two-ask-activity-excluded-handoff` work (accept umbrella closure or require a
   separate terminal Signoff).
3. Accepted parent amendment/Formal Review for the `portalPrintRequestItems` cutover: additive index,
   compatible projection producers, bounded production population/verify, transitional Rules, Portal
   rollout, stale-client/grace decision, then final Rules tightening with coupled rollback.
4. A reviewed production-locked projection population runner and its tests; no production APPLY is
   authorized by implementation or freeze.
5. Owner selection of the next Studio semver (recommendation `1.0.10`) and reviewed package/lock/
   workflow/test alignment.
6. Security/Firebase/risk documentation synchronized to the accepted enriched projection and
   preview/thumbnail known-ID residual risk.
7. A checked-in, tested commit-byte manifest generator that includes Portal public assets, Studio
   Electron/build inputs, `packages/shared`, and `packages/show-picker`.

Until these are closed, do not stage, commit, push, freeze, deploy, publish, mutate data, or present
`FREEZE MAIN CANDIDATE SHA <SHA>`.

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Gate | M1 — exact candidate freeze |
| Status | **Prepared, not executed; post-child M0 rerun pending candidate authorization** |
| Candidate SHA | **TBD — no SHA is proposed until the working tree is clean** |
| Production | untouched |

## Decision requested

After M0 scope and dependency reconciliation is complete, the owner may approve:

> **FREEZE MAIN CANDIDATE SHA `<SHA>`**

That approval would authorize freezing the exact committed `development` SHA named in the decision
and only the mechanically generated runtime/deployment manifests attached to it. It would not by
itself authorize indexes, Rules, Functions, Portal traffic, Studio publication, maintenance ON,
data operations, or any production mutation; each remains a later checkpoint in the accepted parent
Plan.

## Preconditions before presenting this proposal

1. The reviewed Studio hard-delete child is closed with
   `docs/workflow/reviews/2026-09-10-studio-hard-delete-production-ui-gate-signoff.md`.
   `CustomerDirectoryTable` requires `isOperationalWipeUiEnabled()` for the hard-delete menu and
   callback; both hard-delete Function exports remain excluded from the production allowlist.
2. The inherited request-design parity Plan is explicitly excluded from this candidate and retained
   for a separate review.
3. The inherited Portal admin Show Queue signoff is explicitly included as approved-with-notes
   evidence for the read-only, access-controlled admin runtime already mapped in the parent scope;
   it is not a standalone production authorization.
4. Every remaining runtime/config/package/Rules/index path is mapped to an accepted parent feature,
   deferred, or excluded disposition. No unrelated work, secrets, or generated assets are silently
   included.
5. The candidate is one clean committed SHA on `development`, pushed through the normal reviewed
   source path, and is not the current dirty working tree.

## Exact freeze procedure (proposal only)

On `development`, after the owner-approved scope is complete:

```text
git fetch origin --prune
git status --short --untracked-files=all
git diff --check
git rev-parse HEAD
git rev-parse --abbrev-ref HEAD
git rev-parse --abbrev-ref --symbolic-full-name @{u}
git merge-base --is-ancestor origin/development HEAD
git diff --name-status origin/production...HEAD
git ls-tree -r --name-only HEAD
```

The operator then records the exact SHA, tree hash, branch/upstream proof, production tree delta,
and a zero-entry status result. At that SHA, generate and attach:

- explicit Function `export → transitive import closure → changed path → action` manifest;
- hard-delete exclusion audit proving `hardDeleteCustomerAccount` and
  `previewHardDeleteCustomerAccount` are not production targets;
- whole-file Firestore and Storage Rules manifest and immutable source/deployed baseline hashes;
- additive index union retaining all 77 live definitions, with no deletion proposal and no
  `--force`;
- Portal/App Hosting build-input and rollback manifest (immediate rollback build-003);
- Studio package/SHA/asset-input and rollback manifest (immediate rollback `v1.0.9`);
- shared/package/lockfile/build-config/secret-name metadata inventory (never secret values);
- settings, Auth, Algolia and conditional data-operation dispositions; and
- documentation-only continuation allowlist for post-freeze workflow records.

The resulting packet is the M1 freeze record. Any application, Function, Rules, index, Portal,
Studio, shared package, lockfile, build configuration, secret/config, generated-asset or runtime
path change after freeze invalidates the tuple and requires a new RC/freeze. Only mechanically
verified documentation-only records may follow the frozen runtime contract.

## Explicit stop conditions

Do not present or execute the freeze if any status entry remains, the SHA is not the intended
`origin/development` descendant, a dependency closure is missing, a hard-delete target appears in
the allowlist, an index deletion is proposed, Rules/Storage baselines are incomplete, or an
unreviewed feature/config/data operation is found. Do not commit, push, merge, deploy, publish,
activate maintenance, or mutate production as part of preparing this proposal.

## Current state

The hard-delete gate and customer-upload follow-up child are signed off, and the inherited-document
dispositions are complete. The post-child read-only runtime scope/closure, Rules/index,
Portal/Studio input, and configuration/data manifests are linked from
`docs/workflow/reviews/2026-09-10-coordinated-production-m0-reconciliation.md`.
M0 is reconciled at the dirty snapshot but remains blocked on owner authorization for a new clean
candidate commit/push and regenerated immutable manifests, so the candidate SHA, tree hash, and
freeze approval are intentionally absent. The current worktree is 59 status entries (43 tracked,
16 untracked). Only after the new SHA and manifests are verified may this proposal be presented for
the separate freeze decision.
