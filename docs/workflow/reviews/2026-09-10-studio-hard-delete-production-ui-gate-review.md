# Formal Review: Studio hard-delete production UI gate

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Reviewer | FreshForge Review Agent |
| Plan | `docs/workflow/plans/2026-09-10-studio-hard-delete-production-ui-gate-plan.md` |
| Verdict | **approved_with_changes — owner acceptance required** |

## Review summary

The Plan identifies a real production-release blocker: the current Studio customer directory
exposes a permanent hard-delete action even though the Apply callable is DEV-project-gated and the
preview callable is not. Reusing the existing `isOperationalWipeUiEnabled()` project/build gate at
the shared `CustomerDirectoryTable` menu boundary is the smallest repository-supported corrective.
It preserves the DEV-only test workflow and server backstop without weakening ADR-FP-151.

## Required changes

- [x] Gate the customer-directory hard-delete action on `isOperationalWipeUiEnabled()`.
- [x] Keep both `hardDeleteCustomerAccount` and `previewHardDeleteCustomerAccount` excluded from
  the coordinated production Function allowlist.
- [x] Preserve reversible disable/restore, tombstone and merge-preview paths.
- [x] Add focused contract coverage for production-hidden/DEV-available UI behavior and rerun the
  parent exclusion audit.
- [x] Do not remove the underlying DEV-only dialog/backend source.

## Scope and security checks

| Area | Result | Review note |
|---|---|---|
| UI boundary | pass with changes | The shared customer table is the correct lowest boundary for menu exposure. |
| Server authorization | pass | No callable auth or project gate is changed; Apply remains DEV-only and preview remains excluded in production. |
| Data safety | pass | No delete, merge, tombstone or account data operation is performed. |
| Production packaging | pass with changes | A production-mode Studio build must prove the action is not rendered; stable Function allowlist must exclude both exports. |
| Test coverage | pass with changes | Focused contract + DEV/production-mode checks required; unrelated baseline failures must be distinguished. |

## Stop conditions

Stop and return to review if the implementation broadens beyond the table/menu gate, changes server
authorization, exposes the action when `import.meta.env.DEV` is false, invokes the preview callable
in production mode, or changes any unrelated runtime path.

## Verdict rationale and next step

`approved_with_changes` is appropriate. The child is not implementation-authorized until the owner
accepts this review. After acceptance, run `Continue FreshForge` to Implement → Test this narrow
gate. Then rerun parent M0 and prepare (but do not execute) the exact M1 candidate-freeze proposal.
