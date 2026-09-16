# Plan — Current-stack Autonomous DEV canary and production enablement preflight

| Field | Value |
|---|---|
| Date | 2026-09-13 |
| Status | approved_with_changes — bounded execution authorized by the attached request |
| Workflow | managed-phase |
| Parent program | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Checkout | `development`; existing worktree preserved |
| Related historical evidence | `docs/workflow/reviews/2026-09-05-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-signoff.md` |
| Related review | `docs/workflow/reviews/2026-09-13-smart-catalog-autonomous-current-stack-dev-canary-formal-review.md` |
| Authorization | This plan/review and the attached request authorize the bounded DEV canary and read-only production preflight; production enablement is not authorized |

## Goal

Mechanically validate the current deployed DEV Autonomous catalog path on a very small,
representative sample, then determine whether production Autonomous could be enabled by settings
alone. The historical WS5 result is evidence, not a substitute for proving the current v39/v7
stack.

## Current contract under test

- Settings document: `settings/aiEnrichment`.
- Processing mode is fail-safe `manual | shadow | autonomous`; invalid/missing values resolve to
  Manual.
- Live publication requires both `catalogWorkflowMode=autonomous` and
  `catalogAutonomousLiveEnabled=true`.
- Only an active owner may change the mode/live gate. Enabling live requires the exact phrase
  `ENABLE AUTONOMOUS`; selecting a non-Autonomous mode clears the live gate.
- Pass 1 is the active enrichment authority. The current source constants are
  `catalog-enrich-v39`, `smart-profile-normalizer-v7`, and `smart-profile-v1`.
- The decision is fail-closed: hard blockers route to Needs Review; only a policy-clear result may
  write `ready`/`approved` as `system:catalog-autonomy` and trigger the normal catalog publication
  path. Staff/import authority is merged before the decision and cannot be overwritten by
  automation.
- Semantic Review Pass 2 is parked/manual-only and remains OFF throughout this phase.

## In scope

1. Read-only source, workflow, and DEV/production state inspection.
2. A minimal representative DEV sample (target 5–10 rows, or the smallest established fixture
   set): clean eligible, legitimate hard blocker, explicit-content/safety where an established
   fixture exists, and staff/import authority preservation.
3. Temporary DEV gate changes only as required by the established canary runner, with guaranteed
   read-back and restoration to the pre-canary safe state.
4. Verification of lifecycle/status, Smart Profile v39/v7 provenance, publication/search sync,
   explicit classification, blocker behavior, and absence of unintended demotion/publication.
5. Read-only production preflight if and only if the DEV canary passes.
6. Documentation of evidence, failures, cleanup, and the exact owner checkpoint.

## Out of scope and prohibitions

- No production Autonomous or Pass 2 enablement.
- No production data/settings writes, provider calls, reprocess/backfill, Algolia rebuild, Rules,
  indexes, schemas, secrets, migrations, or releases.
- No customer-facing Print Request changes.
- No new fixture unless the established DEV runner requires it and its cleanup is verified.
- No source implementation, deployment, commit, push, or branch/worktree creation.

## Execution and acceptance

1. Capture the initial DEV gate, Pass 2 state, active jobs, and worktree state.
2. Use the established current-stack DEV runner or the smallest safe adaptation supported by the
   repository. Abort before writes if it targets an obsolete version, lacks cleanup, or cannot
   prove the dual gate rollback.
3. PASS requires all representative cases to meet expected lifecycle and authority outcomes,
   current v39/v7 Smart Profile output, healthy publication/search for Ready rows, no blocker
   becoming Ready, no staff/import authority loss, and a verified final safe gate.
4. If PASS, inspect production read-only: project identity, mode/live/Pass 2 flags, prompt/
   normalizer/profile currentness, active jobs, profile coverage/failures, guardrails, Functions
   status/source, and whether a settings-only switch is technically sufficient.
5. Stop at `OWNER AUTHORIZE PRODUCTION AUTONOMOUS ENABLEMENT`; do not perform that action.

## Evidence artifacts

- Plan and Formal Review in `docs/workflow/{plans,reviews}/`.
- Existing runner raw output under `docs/workflow/reviews/` when used.
- New canary/preflight report only if execution reaches that step; no secrets or document bodies
  are recorded.

## Risks and stop conditions

- Any current-stack/version mismatch, active job, unsafe fixture path, failed rollback, authority
  regression, publication failure, or production code/source mismatch is a STOP and is reported
  precisely.
- A canary PASS does not authorize production activation; production remains owner-gated.
