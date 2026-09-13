# Proposed M1 candidate freeze — coordinated production promotion

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
