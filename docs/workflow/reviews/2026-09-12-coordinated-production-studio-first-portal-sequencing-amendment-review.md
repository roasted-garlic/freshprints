# Formal Review — Studio-first Portal sequencing amendment

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Plan | `docs/workflow/plans/2026-09-12-coordinated-production-studio-first-portal-sequencing-amendment-plan.md` |
| Date | 2026-09-12 |
| Verdict | **approved_with_changes — owner-directed and accepted for documentation** |
| Owner decision | `STUDIO FIRST, THEN PORTAL` |

## Finding

The accepted parent Formal Review explicitly found Studio-before-Portal technically compatible
after backend/Rules deployment, because Studio’s maintenance Settings does not depend on the Portal
bundle. It selected Portal-first as the recommended default, not as a safety prohibition. The owner’s
new sequencing decision is therefore a narrow release-order amendment rather than a runtime change.

## Approved amendment

Adopt Studio `1.0.10` publication and packaged-production verification before Portal dual-read
rollout. Keep `settings/portalMaintenance` absent/OFF throughout this interval. Portal rollout and
normal-mode smoke must complete before `FULL MAINTENANCE CAPABILITY READY` is declared or any later
maintenance ON checkpoint is considered.

The authoritative detailed order is in the amendment Plan and the updated deployment/rollback
runbook. No source, package, workflow, Rules, index, Function, or configuration byte is changed by
this review. The frozen candidate remains valid unless a separate RC blocker remediation requires a
runtime/config change.

## Review checklist

| Area | Result |
|---|---|
| Scope bounded to order only | PASS |
| Existing parent compatibility authority | PASS |
| Maintenance remains absent/OFF | PASS |
| Old Portal clients protected from early enforcement | PASS |
| Projection/Rules ordering preserved | PASS |
| Stable publication and production actions remain gated | PASS |
| Runtime/config impact | None |

No production deployment, publication, runner, data operation, maintenance activation, staging,
commit, push, or candidate invalidation occurred as part of this Plan/Review. The owner’s explicit
decision satisfies the sequencing choice checkpoint; no additional acceptance is required to update
the documentation order. Future production execution remains separately owner-gated.
