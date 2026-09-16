# Formal Review: Coordinated production promotion — 2026-09-16

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-16-coordinated-production-promotion-plan.md` |
| Candidate at review | `7c7c65d78d3b408526f28cd3501f9f79b8518d58` (pre-correction) |
| Verdict | **approved_with_changes** |
| Execution boundary | Owner release instruction lifts the prior hold; protected promotion and reviewed rollout are authorized subject to the recorded hard stops. |

---

## Review summary

The plan correctly treats the work as one cumulative, exact-SHA promotion and
derives the runtime closure from the current source and live production rather
than stale historical counts. The newly inventoried
`studio-print-request-item-download-dirty-preset-fix` is correctly classified
as Studio-only and is required in the same stable release as the other Studio
candidate work.

The pre-correction candidate is not ready to freeze. It would omit the export
for the live `completeStaffGangSheetAndOpenNext` callable, and it still carries
the already-published Studio version `1.0.12`. Both findings have deterministic
corrections below. No production mutation is approved by this review while the
latest owner instruction says not to merge or deploy.

The reviewed corrections were applied and checked: the closure is now 192
current exports / 186 production exports / 546 unique closure paths, with the
live callable classified as UPDATE, and Studio is now version `1.0.13`. The
full Rules suite is not clean (179/182); all three failures reproduce against
the transition Rules baseline at the emulator's 1,000-expression ceiling.
Accordingly, preparation remains approved with changes. The owner’s later
release disposition accepts the exact Rules baseline limitation and permits
candidate freeze and production execution subject to the hard stops below.

## Adversarial findings

| Finding | Result | Required disposition |
|---------|--------|----------------------|
| Live Function `completeStaffGangSheetAndOpenNext` is absent from current `functions/src/index.ts` export closure | **NO-GO until corrected** | Re-add the existing export, retain its reviewed response change, regenerate closure, and prove it is an UPDATE rather than a deletion. |
| Studio package/workflow are pinned to published `1.0.12` | **NO-GO for a new stable release** | Bump package and lock entry to `1.0.13`; update the workflow guard and its policy-contract assertion. Verify no release/tag collision. |
| Function closure counts are stale until the export correction | **OPEN** | Re-run the audit after correction and use only the regenerated exact allowlist. |
| Candidate Firestore Rules differ from production | **REVIEWED / conditional** | Test and deploy only the final reviewed rules file. The `portalDevCustomerAccess` path is owner/admin read-only and write-denied; it must not expose customer access or enable the DEV overlay in production. |
| Candidate index JSON has a raw count one higher than live | **NO ACTION** | Semantic comparison proves no index deployment delta; do not deploy a duplicate. |
| Storage Rules source is unchanged | **NO ACTION** | No Storage Rules deploy. |
| Historical reconcile callable includes Apply | **EXCLUDED** | Preview/VERIFY may be read-only evidence; no Apply/backfill/repair is part of this promotion. |
| Live AI settings are currently shadow/Autonomous OFF | **PRESERVE** | Do not change settings or silently enable Autonomous AI/Pass 2. |
| Production runtime self-binding is not present in the read-only IAM policy | **PENDING PREFLIGHT** | Do not mutate under the current hold. Before a future signed-URL smoke, confirm the exact runtime service account and signBlob requirement; only the reviewed self-binding is allowed if required. |

## Gate review

| Gate | Verdict | Evidence / next check |
|------|---------|----------------------|
| Scope and signoff reconciliation | pass | Current cumulative manifest plus source diff and linked DEV signoffs. |
| Runtime closure | pass after correction | Regenerated audit reports 192/186 exports and classifies `completeStaffGangSheetAndOpenNext` as UPDATE; use only the regenerated allowlist. |
| Rules and indexes | conditional / owner-accepted | Firestore candidate hash differs intentionally for catalog-title authority; semantic indexes have zero delta. Rules are 179/182, with exactly the same three failures reproduced against the transition baseline’s emulator expression ceiling. The owner accepts this known baseline limitation for this release. |
| Portal | pass with sequencing | Production backend and current revision are known; exact final production SHA must be rolled out only after backend compatibility checks. |
| Studio release | approved with required version correction | One stable `1.0.13` release from the final production SHA, `internal-unsigned`, Smart Filters ON; no pre-fix SHA may be packaged. |
| Data safety | pass | No migration, backfill, Apply, repair, or production write. |
| Rollback | pass to prepare / not yet live-verified for new candidate | Existing production SHA, Rules record, Portal revision, Function versions, and `v1.0.12` are anchors; refresh exact readbacks before execution. |
| Current owner boundary | released with constraints | Owner authorized freeze, protected merge, reviewed Firebase deployment, the exact IAM self-binding if preflight remains satisfied, Portal rollout, Studio v1.0.13 publication, and machine verification. |

## Required changes before candidate freeze

1. Restore `completeStaffGangSheetAndOpenNext` in `functions/src/index.ts`.
2. Bump Studio to `1.0.13`, synchronize the root lockfile workspace version,
   and update the workflow/test version guard.
3. Re-run all closure, source, Rules/index, typecheck, contract, and release
   policy checks; record results in a Test Report.
4. Freeze and record the resulting exact candidate SHA only after the tree is
   clean, the exact owner-accepted Rules disposition is reconfirmed, and the
   new source manifest is reconciled.

## Verdict rationale

**Approved with changes** for deterministic candidate preparation and
verification. The review does not authorize any scope beyond the owner release
instruction. If either required correction fails, an unexplained live-only
Function remains, the accepted Rules condition changes, a new
secret/data/IAM/product decision appears, or any listed hard stop occurs, the
candidate is NO-GO and rollout must stop or roll back.

## Owner release disposition — 2026-09-16

The owner accepted the exact `179/182` Rules result as
`ACCEPTED KNOWN BASELINE TEST LIMITATION — NON-BLOCKING FOR THIS RELEASE`.
All three failures reproduce against `firestore.transition.rules` at the
emulator’s 1,000-expression ceiling; no Rules or test change is authorized to
force `182/182`. This disposition releases the candidate-freeze and production
boundary, but does not release data repair/backfill/Apply, secret/config
changes, broad IAM, deletion, or any unreviewed runtime scope.
