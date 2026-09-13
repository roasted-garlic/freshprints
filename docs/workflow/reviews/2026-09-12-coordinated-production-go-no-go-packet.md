# Coordinated production readiness GO/NO-GO packet

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Frozen candidate | `ff533c835508e65bb3cfd9d2739f72bafe1fc895` |
| Classification | **C — NO-GO** |
| Scope | RC evidence and owner checkpoint preparation only |

This packet is the formal readiness handoff for the frozen candidate. It does not authorize any
production mutation or release action.

Owner subsequently invalidated this candidate for production release purposes to permit the
workflow-only Studio corrective. This packet remains historical evidence; a new M0/M1 cycle is
required after the reviewed workflow/config change.

## Readiness checklist

1. **Freeze integrity — PASS.** `HEAD = origin/development` at the frozen SHA, development is
   `0/0` ahead/behind, staged paths are `0`, and all post-freeze paths are documentation-only.
   Core/Portal/Studio Git-object manifests audit with zero mismatches.
2. **Production read-only baseline — CAPTURED WITH ONE GAP.** Live Functions, indexes, Portal,
   Studio, and absent maintenance setting were read-only captured in
   `2026-09-12-coordinated-production-immutable-production-baseline.md`; remote Rules release
   export/ID/hash returned API `403` and remains outstanding.
3. **Portal rollback evidence — PASS.** build-003 is live at 100%; build-002 is secondary. Final
   raw-read rollback is coupled to transition/prior Rules restoration.
4. **Studio rollback evidence — PASS.** Stable `v1.0.9` is published with eight assets;
   `v1.0.8` is secondary.
5. **Live Function baseline and candidate allowlist — PASS.** Live is 113/113 ACTIVE Node 20
   Functions; candidate closure is 186/120 exports, 530 paths, explicit action counts 54/110/3/10/9.
   The exact export → closure → action allowlist is
   `docs/workflow/reviews/2026-09-10-coordinated-production-function-closure.md`; no broad deploy
   command is permitted and hard-delete/DEV-only exports are EXCLUDE.
6. **Rules rollback baseline — INCOMPLETE.** Source hashes are recorded; immutable remote release
   export/ID/hash must be captured before any replacement.
7. **Index baseline/readiness — PASS WITH READINESS HOLD.** 77/77 live indexes are READY; the
   candidate union is 95/77 with 18 additive and zero removed/replaced, but the projection index
   is not live and no index deployment is authorized.
8. **RC automated results — PASS WITH NOTES.** Focused 87/87, Functions build, Portal typecheck,
   targeted lint, and diff check pass. Existing baseline failures are listed in the RC report.
9. **Portal build — PASS in clean RC environment.** Exact frozen-SHA isolated checkout compiled,
   typechecked, prerendered 21/21 pages, and collected `.next/trace`; the EPERM condition did not
   reproduce. Synthetic non-production public configuration placeholders were used.
10. **Studio RC/package/install/update — BLOCKED.** The real validation-only workflow run
    `34735296362` failed its existing whole-repository lint gate on both Windows and macOS before
    packaging; no installer was produced and install/update checks remain not run. Stable
    publication was not attempted. Closing this requires a reviewed source/workflow change and
    therefore invalidating the frozen candidate.
11. **Five DEV journeys — PASS (accepted owner evidence).** Portal request/upload/edit; Studio
    catalog→Ready/search; Studio request/show/gang-sheet; identity/User Info + admin queue; and
    maintenance gate are covered by the terminal Owner DEV QA PASS.
12. **Projection rehearsal — PASS (DEV/local contracts).** Projection-first reads, bounded
    canonical fallback, delayed/stale reconciliation, order/deduplication, error fallback, and
    pre/post VERIFY semantics are covered. Production runner was never invoked.
13. **Rollback rehearsal — PASS as documentation-only rehearsal.** Portal/Rules coupling, Studio
    v1.0.9, explicit Function revisions, projection preservation, and additive index retention are
    recorded; no rollback was executed.
14. **Data-operation classifications — RECORDED.** Projection population is REQUIRED but APPLY is
    separately owner-gated; lifecycle mirror and Algolia/Smart Profile operations are CONDITIONAL;
    queueTab, retention, cleanup, hard-delete, merge, wipe, and physical deletion are DEFERRED or
    EXCLUDED.
15. **Known baseline comparison — UNCHANGED.** Portal EPERM, Firestore expression-budget,
    unrelated Studio typecheck, and whole-repository lint diagnostics are existing baselines, not
    newly introduced failures.
16. **Unresolved blockers — OPEN.** Studio 1.0.10 package/install/update evidence (requires
    candidate invalidation for any source/workflow change) and immutable remote Rules rollback
    snapshot (available credential returns 403).
17. **GO/NO-GO classification — C / NO-GO.** Frozen source integrity is intact, but required RC
    artifacts and the remote Rules snapshot are incomplete; production readiness cannot be approved.
18. **Production untouched — YES for state.** Production state/data/configuration was not mutated;
    only the expressly authorized read-only baseline queries were made. No runner, dry run, verify,
    apply/backfill, deployment, publication, maintenance activation, or settings/Auth/secrets write
    occurred.
19. **Exact next owner checkpoint —** `OWNER DECIDE INVALIDATE FROZEN CANDIDATE / RETURN TO M0-M1 FOR STUDIO RC REMEDIATION`.

## Deferred production smoke plan (not executed)

After a future A/B readiness decision and the ordered deployment gates, the lean smoke set remains:

1. public read plus a separately named, harmless customer proof (or record NO-GO if the owner
   declines a production write);
2. owner/admin read-only `/admin/show-queue` inspection;
3. packaged Studio 1.0.10 install/launch/catalog/User Info/request-history check; and
4. maintenance capability/toggle path only at its separate owner-approved checkpoint, with OFF
   readback and recovery verification.

No smoke check was executed in this RC turn.

## Maintenance readiness

The production maintenance document is absent/OFF. The future sequence is Portal/backend/cutover
prerequisites → Studio 1.0.10 → verify `FULL MAINTENANCE CAPABILITY READY` while OFF → separate
owner decision for ON → only selected approved overnight operations → smoke → OFF. This packet
does not initialize or activate maintenance.

## Revised Studio-first production order

The owner-directed sequencing amendment is recorded in the Plan/Formal Review and runbook. The
prepared order is: frozen RC PASS/production GO → additive indexes and READY wait → projection
synchronizer/refresh Functions → transition Rules → Studio 1.0.10 publication and production
verification → maintenance controls verified while absent/OFF → dual-read Portal rollout and
normal-mode smoke → `FULL MAINTENANCE CAPABILITY READY` → projection DRY RUN/pre-APPLY VERIFY →
separate APPLY authorization → bounded APPLY/exact VERIFY/zero-diff DRY RUN → convergence/smoke →
separate final-Rules authorization → final Rules and post-final smoke → later separately authorized
maintenance ON and overnight catalog operations.

## Selected overnight catalog operation

Full eligible-design Smart Profile reprocess/backfill is **SELECTED FOR POST-ROLLOUT OVERNIGHT
OPERATION**. Production Algolia reconcile is selected only if required by the final reviewed search
contract. Both remain separately owner-gated and unexecuted. Legacy tag physical deletion remains
deferred to a later zero-consumer cleanup phase.

## Rules and index deployment evidence (prepared, not executed)

- Final `firestore.rules`: `dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`.
- Transition `firestore.transition.rules`:
  `8a50d5bb85fa41fca82652582730940fb1a936cb0aae059a0b05e59099db9945`.
- `storage.rules`: `c537183f41d95ade7b6cdf80ea2cbb9241804d7a40c87b4185d3496070d9077a`.
- `firebase.transition.json`:
  `c07e7c2772b6fcf94b14f42af211883f248952d28bddd6e40c9efe6c8aef0c03`.
- Candidate index source: 95 definitions / 3 field overrides, SHA
  `2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae`; retain all 77 live
  definitions, add 18, remove 0, and never use `--force`.

The transition Rules must precede projection population and dual-read exposure; final raw-read
tightening is a later owner-gated boundary with coupled rollback.

## Explicit non-actions

No Rules, Functions, index, Portal, or Studio deployment; no Portal/Studio publication; no
maintenance activation; no production settings/data/Auth/secret mutation; no runner, DRY RUN,
VERIFY, APPLY/backfill; no staging, commit, push, merge, tag, candidate freeze, or parent M0 rerun
was performed in this RC turn.

## Evidence links

- [Frozen-candidate RC validation](2026-09-12-coordinated-production-frozen-candidate-rc-validation.md)
- [Immutable production baseline](2026-09-12-coordinated-production-immutable-production-baseline.md)
- [Deployment allowlist and rollback runbook](2026-09-12-coordinated-production-deployment-allowlist-and-rollback-runbook.md)
- [M1 freeze proposal](2026-09-10-coordinated-production-candidate-freeze-proposal.md)
