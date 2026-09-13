# Formal Review: Production maintenance-mode prerequisite production promotion

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Reviewer | FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-production-promotion-plan.md` |
| Verdict | **blocked** |

---

## Summary

The Plan is evidence-backed, but the central safety claim is not currently true: the signed-off
maintenance runtime does not exist in one immutable source revision, and `development` contains a
large accumulated delta plus a dirty working tree. Functions can be target-scoped by name, but the
required guard files contain unrelated edits; Firestore/Storage Rules, Portal App Hosting, and
Studio publication are whole-resource surfaces. No production mutation occurred.

The current strategy is therefore rejected pending an owner decision. The owner must either
authorize a production-based hotfix patch exception (Strategy A) or explicitly accept maintenance as
the first compatible layer of the full coordinated candidate (Strategy B). Do not create a branch or
worktree, commit runtime source, merge, deploy, publish, or mutate production before that decision.

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | Plan is Plan → Formal Review only; no runtime or production action is authorized. |
| Architecture alignment | pass with blocker | Two-app Firebase architecture is preserved, but no component-level Portal/Studio release mechanism exists. |
| Security impact addressed | pass with blocker | OFF is safe and maintenance callables are absent in production; current dirty/interwoven source cannot be promoted safely. |
| Data model impact addressed | pass | No index, migration, initialization, or data operation is required for absent/OFF. |
| Backend impact addressed | fail pending isolation | 34 guard-bearing exports are identified; 31 are live, 3 are source-only; current same-file deltas prevent a maintenance-only claim. |
| Test strategy adequate | pass | Later execution has focused regression, closure, OFF smoke, and owner-gated safe-write checks. |
| Human checkpoints identified | pass | Strategy choice, source-policy exception, Rules snapshot, production deploy, safe write, and any ON test are explicit. |
| Roadmap alignment | pass | Parent coordinated release remains separate; Node/sharp and unrelated rollout work stay deferred. |
| Documentation plan | pass | Plan, review, state, and handoff updated; later records remain documentation-only after a frozen runtime tuple. |
| No silent scope expansion | fail for current candidate | Merging/deploying current `development` would include unrelated Portal, Studio, Functions, shared, and Rules work. |

## 1. Maintenance-only runtime manifest summary

The signed-off manifest includes:

- Shared contract: `packages/shared/src/constants/portal/portalMaintenance.constants.ts`.
- Trusted backend: `functions/src/lib/portalMaintenance.ts`,
  `getPortalMaintenanceState`, `updatePortalMaintenanceState`,
  `listPortalMaintenanceTestCustomers`, and their `functions/src/index.ts` exports.
- The shared guard in 28 source files and 34 callable exports, covering print-request, upload,
  Assisted Creation, account/identity, Etsy, report, notification, and direct-write paths.
- Portal provider/context/service, full-screen experience, saved heading/body, tester banner, shell
  gating, login/register/auth/logout behavior, and `shell.css`.
- Centered admin `/admin/show-queue` denial gate/style (the rest of that admin feature is an older
  separate development surface).
- Studio Settings tab/section/hook/service with separate heading/body fields and the trusted tester
  selector.
- Firestore Rules direct customer-write enforcement and private settings read; Storage Rules
  enforcement for customer source/ZIP and Assisted Creation pending create/update/delete.
- No maintenance index, migration, or production setting initialization.

The exact path and 34-export inventory is in the Plan. Validation-only tests and DEV records are
linked there; they do not make a production release candidate.

## 2. Current Git/source state

Read-only commands recorded:

- branch `development`; `HEAD` and `origin/development` both
  `b5aec1b2b1ac4eba5ab704f1db8f87ea22f1daaa`.
- `origin/production` is `36165096f09bef6817adb5b11d496dbb1502b34b`.
- Working tree has 56 tracked changes and 40 untracked entries. Maintenance modules are untracked;
  guard-bearing Function edits and Rules are working-tree changes.
- 1,877 committed paths differ from production; current source export comparison is 170 development
  exports vs 120 production-source exports (51 added and one removed).
- No immutable commit contains the complete signed-off maintenance runtime.

## 3. Functions isolation result

The three maintenance callables are absent from production. The 34 guard-bearing exports are
mechanically identified; only 31 are currently live in production. The source-only trio
`setPrintRequestItemArtworkEnhanceMode`, `unqueuePortalPrintRequestFromShow`, and
`updatePortalCustomerProfile` must not be added merely because they exist in development.

An explicit Firebase function-name allowlist is necessary but insufficient. Eighteen of the 28
guard-bearing source files have a nontrivial delta beyond the guard (including 411 added lines in
`unqueuePortalPrintRequestFromShow.ts`, 166/29 in
`customerAddAssistedApprovedProofToPrintRequest.ts`, and 99 in
`updatePortalCustomerProfile.ts`). A scoped deploy from the current tree would update those
Functions with unrelated code. A frozen-SHA transitive import-closure audit is still required.

**Finding: not isolated; reject current-tree deployment.**

## 4. Firestore and Storage Rules isolation result

The maintenance predicates and direct-write guards are present, including the Assisted Creation
pending Storage paths. However, the working Firestore Rules blob is +635/-93 and Storage is +72/-5
versus the production anchors. Those files also contain unrelated lifecycle, queue, AI/catalog,
interactive-original, and PNG-source behavior. Firebase Rules deploys publish the whole file and
cannot select maintenance hunks. The available read-only CLI/API did not expose a remote production
ruleset ID/hash; immutable exports are a pre-mutation blocker.

**Finding: not isolated; reject a blind Rules deploy.**

## 5. Portal isolation result

The production App Hosting backend is `fresh-prints-portal`, root `apps/portal`, connected to the
production branch. The live revision is `fresh-prints-portal-build-2026-08-24-003` at 100% traffic.
App Hosting builds a complete Portal source revision; no file-level release mechanism exists. The
maintenance provider, auth, navigation, admin, and shell files are interwoven with accumulated
Portal work.

**Finding: maintenance-only Portal release is not proven.**

## 6. Studio isolation result

The stable Studio workflow packages the whole Electron app from one ref and permits stable
publication only for `production` or an exact SHA reachable from it. `SettingsPage.tsx` contains
substantial unrelated development changes, and the workflow has no component-level publication.
The live rollback release is stable `v1.0.9`.

**Finding: maintenance-only Studio publication is not proven.**

## 7. ADR-FP-137 compatibility

The normal policy is one `development` checkout, Plan/Review/Implement/Test/Signoff on
`development`, and a reviewed `development` → `production` PR. It prohibits per-goal branches and
worktrees unless the owner explicitly authorizes one and prohibits direct/force pushes. A
production-based maintenance patch would therefore be a deliberate owner-authorized hotfix/source
path exception, not an action an agent may infer.

## 8. Recommended production promotion strategy

**Do not promote from the current tree.** The smallest truthful alternative is Strategy A only if
the owner explicitly authorizes a production-based hotfix branch/worktree, a reviewed PR path, and
the manual maintenance-only patch/closure audit. It must include only the three new maintenance
callables, the 31 already-live guard revisions required by the production client, the exact
production-based Rules patch, and the required Portal/Studio source surfaces; the three source-only
guard exports and all unrelated work remain excluded.

If the owner will not grant that exception, use Strategy B: amend sequencing so maintenance is the
first compatible layer of the full coordinated candidate. Strategy B is policy-compatible but is
not a maintenance-only release and requires accepting the broader candidate boundary.

No third repository-supported selective method was found.

## 9. Owner authorization required

Before any further phase, the owner must:

1. Choose Strategy A or Strategy B.
2. If Strategy A, explicitly authorize the production-based hotfix branch/worktree and source-path
   exception before it is created, and specify the PR/merge route.
3. Accept the pre-mutation production Rules/Storage snapshot requirement (remote IDs/hashes were
   not available in this read-only pass).
4. Name/approve a production safe-write fixture for later smoke, or accept NO-GO for that check.
5. Keep any production ON test behind a separate explicit checkpoint.

## 10. Rollback baseline

Read-only live anchors:

- Portal: `fresh-prints-portal-build-2026-08-24-003` at 100% traffic; `build-2026-08-24-002` is
  secondary.
- Studio: stable `v1.0.9` targeting
  `f35c96dda23ce83f99f75ab3f942c5edfcfcfdd2`; `v1.0.8` is secondary.
- Functions: no maintenance callables live; prior revisions/hashes for the 31 live guard exports
  are recorded in the Plan. Do not use DEV revision IDs as production rollback targets.
- Rules: production source anchors are Firestore blob
  `fc36dda705b0c79b1ebf367b2d8f7bdcf09f2950` and Storage blob
  `58073e4004ca184cac5f726d5fea1105da6f1da2`; capture remote ruleset exports before mutation.
- Settings/indexes: `settings/portalMaintenance` is absent (HTTP 404 = OFF); 77 production indexes
  are live and no maintenance index is required.

## 11. Minimal production smoke

Only after later owner authorization and a frozen candidate:

1. Clean-session public Portal read (home/show/library/search/detail).
2. One named, safe, owner-approved customer mutation, or honest NO-GO if declined.
3. Owner/admin Studio Settings loads, state reads OFF, and tester selector lists only eligible active
   linked customers.
4. No customer wall/banner and no unrelated feature change; maintenance is not enabled.

## 12. Exact next FreshForge action

**STOP at the owner checkpoint.** The owner must choose Strategy A or Strategy B and then send
`Continue FreshForge`. Until then, keep `Blocked: yes`; do not implement, create branches/worktrees,
commit runtime source, merge, deploy, publish, mutate settings/data, activate maintenance, or begin
the parent rollout.

## Verdict rationale

**blocked** is required because the principal acceptance question — “Can we truthfully say this
production promotion contains only the signed-off maintenance prerequisite?” — cannot be answered
yes for the current `development` source or any current whole-file resource deploy. The Plan is
usable after the owner resolves the source-isolation policy decision and the later frozen-SHA
evidence gates are satisfied.
