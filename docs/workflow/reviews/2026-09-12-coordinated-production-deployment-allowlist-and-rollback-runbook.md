# Coordinated production deployment allowlist and rollback runbook

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Candidate | `ff533c835508e65bb3cfd9d2739f72bafe1fc895` (frozen) |
| Status | **Prepared only — no production action authorized** |

This runbook is the prepared deployment/rollback sequence attached to the RC packet. It is an
allowlist and evidence contract, not an execution record. Every listed production action still
requires its own owner checkpoint after a production-readiness GO.

The order incorporates the owner-directed, documentation-only sequencing amendment:
`docs/workflow/plans/2026-09-12-coordinated-production-studio-first-portal-sequencing-amendment-plan.md`
and its Formal Review. Studio is intentionally before Portal; maintenance remains OFF until Portal
is live and smoke-tested.

## Ordered future sequence

1. Re-capture immutable remote Rules/Storage Rules release IDs/exports/hashes and confirm the
   frozen SHA, complete manifests, live rollback anchors, and no unexplained runtime paths.
2. Obtain the production GO decision.
3. Deploy the additive Firestore index union (all 77 live definitions retained, 18 additions,
   no removals/replacements, never `--force`) and wait for the projection index to be READY.
4. Deploy the transition Firestore/Storage Rules from the frozen SHA, preserving the canonical
   customer read while projection rows are populated.
5. Deploy only the explicit Function closure allowlist. Hard-delete/DEV-only exports remain
   excluded; no broad `functions:deploy` or deletion is permitted.
6. Publish Studio `1.0.10` and verify the exact source SHA, package artifacts, startup, Settings,
   catalog, request, User Info, and maintenance-control surfaces against production. Keep
   `settings/portalMaintenance` absent/OFF.
7. Roll out the Portal from the frozen SHA and verify normal-mode compatibility and smoke. Do not
   turn maintenance ON before this step passes.
8. Declare `FULL MAINTENANCE CAPABILITY READY` while maintenance remains OFF.
9. Run the production-locked projection runner in `DRY RUN`, then pre-APPLY `VERIFY`. The runner
   must remain pinned to `fresh-prints-prod`, bounded by deterministic cursors/pages, and fail
   closed on unsafe or unclassified drift.
10. At a separate owner checkpoint, run production `APPLY` in bounded windows only if the dry-run
    and pre-APPLY verification are accepted. Record counts, cursors, retries, and operator.
11. Run post-APPLY `VERIFY` requiring exact source/projection equality, then repeat `DRY RUN` and
    require zero proposed differences. Stop on any non-zero diff.
12. Run convergence/smoke, obtain separate final-Rules boundary authorization, deploy final Rules,
    and run post-final smoke. Any maintenance ON transition and named safe-write fixture require a
    separate owner checkpoint; no destructive cleanup is part of this release.

## Explicit Function allowlist contract

The frozen closure manifest is the source of truth: 186 current exports, 120 production-source
exports, 530 closure paths; action counts ADD 54, UPDATE 110, RETAIN LIVE VERSION 3, EXCLUDE 10,
NO ACTION 9. The two hard-delete exports and DEV fixture/wipe paths remain excluded. Any export or
closure change invalidates the frozen candidate and requires a new M0/M1 cycle.

## Projection population safety contract

- **DRY RUN:** read source rows and projection rows, report proposed writes and unsafe records, and
  perform zero writes.
- **Pre-APPLY VERIFY:** expected missing/stale projection rows are population deltas; malformed,
  unsafe, privacy-violating, or unclassified rows fail closed.
- **APPLY:** owner-gated production mutation only; bounded and resumable, with transaction re-read
  before each write and shared mapping/privacy checks.
- **Post-APPLY VERIFY:** exact equality is required for every in-scope source/projection row.
- **Post-APPLY DRY RUN:** a repeat run must report zero differences before Portal raw-read
  tightening. No production runner was invoked for this RC.

## Rollback coupling

| Layer | Immediate rollback | Coupling / constraint |
|---|---|---|
| Portal | live `fresh-prints-portal-build-2026-08-24-003` (build-003) | Before final raw-read tightening, restore transition/prior Rules before routing traffic to build-003; build-002 is secondary |
| Studio | stable `v1.0.9` | `v1.0.8` secondary; package/tag/source SHA and asset checksums must match the recorded release |
| Functions | prior per-export live revisions | Restore only the reviewed allowlist; never delete historical exports as rollback |
| Firestore Rules | recorded remote immutable release/export | Final Rules cannot be rolled back independently while Portal reads projection-only; restore transition/prior compatibility first |
| Projection data | stop exposure and retain projection rows | Do not blindly delete projections; use field-level forward repair or a reviewed restore if required |
| Indexes | preserve all live definitions | No `--force`, no deletion, and no rollback that removes the 77 retained production identities |

## Stop conditions

Stop immediately on any non-READY index, deletion/replacement proposal, missing Function closure,
remote Rules snapshot gap, projection privacy violation, unexpected write, non-zero post-APPLY dry
run, stale-client incompatibility, Portal smoke failure, missing Studio package/checksum, or
maintenance state that is not the reviewed absent/OFF contract.

## Current authorization boundary

This runbook does **not** authorize staging, commit, push, candidate freeze, index/Rules/Functions
deployment, Portal publication, Studio publication, production runner execution, DRY RUN, VERIFY,
APPLY/backfill, maintenance activation, settings/Auth/secrets/data mutation, or merge to
production. The RC readiness result is C — NO-GO pending owner direction on the blockers in the RC
validation report.
