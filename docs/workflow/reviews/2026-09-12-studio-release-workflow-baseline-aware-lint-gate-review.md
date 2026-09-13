# Formal Review — Studio release workflow baseline-aware lint gate

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Corrective child | `studio-release-workflow-baseline-aware-lint-gate` |
| Plan | `docs/workflow/plans/2026-09-12-studio-release-workflow-baseline-aware-lint-gate-plan.md` |
| Date | 2026-09-12 |
| Verdict | **approved_with_changes — owner acceptance and implementation authorization required** |
| Scope | Workflow/tooling only; no Studio runtime behavior change |

## Review finding

The real Studio workflow fails before packaging because both Windows and macOS jobs run the root
whole-repository command `npm run lint`, which expands to
`eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`. The frozen candidate
produces 20 errors and 5 warnings, and all diagnostic files are unchanged relative to the former
candidate’s parent. This is a release-gate policy mismatch, not a newly introduced Studio defect.

Repository search found no existing baseline-aware lint implementation. Existing changed-file lint
patterns are useful for developer iteration but are insufficient as the release gate because they
would discard whole-repository coverage.

## Reviewed decision

Select the Plan’s exact checked-in baseline manifest and comparator (Approach B). The correction is
accepted only if it:

- invokes the same whole-repository ESLint scope on Windows and macOS;
- fails closed on any diagnostic absent from the reviewed manifest;
- permits only the exact pre-existing findings recorded in the manifest;
- reports removed findings without modifying or silently expanding the manifest;
- treats path/rule/position/message changes as new findings;
- fails closed on ESLint execution or JSON parsing errors;
- preserves targeted changed-file lint as a required check; and
- adds tests proving new errors/warnings fail, removals pass, and workflow calls cannot bypass the gate.

Approach C (changed-files-only/release-scope lint) is rejected as the primary gate because it weakens
coverage and could miss regressions in untouched release dependencies. No alternate repository-native
mechanism was found.

## Required changes before implementation acceptance

1. Keep the baseline manifest reviewable and deterministic: sorted entries, no timestamps, no
   auto-write/update mode, and explicit schema/version.
2. Keep the helper independent of Studio runtime code and ensure its own failure modes are covered
   by focused tests.
3. Add workflow-policy assertions for both platform jobs, including a negative assertion against a
   direct `npm run lint` bypass and preservation of prerelease no-release-mutation guards.
4. Record the exact 25 baseline diagnostics and the zero-overlap candidate-change evidence in the
   implementation/test artifacts; do not broaden the baseline to make unrelated new findings pass.
5. If any Studio application/runtime source must change, stop this corrective and return for expanded
   review; that would be outside the approved workflow-only scope.

## Safety and release boundaries

The reviewed correction does not authorize implementation, staging, commit, push, deployment,
publication, production data/settings/Auth/secrets changes, projection runner execution, DRY RUN,
VERIFY, APPLY/backfill, maintenance activation, or merge to production. Stable release creation and
publication remain separately gated; prerelease validation must remain release-mutation-free.

The former M1 SHA `ff533c835508e65bb3cfd9d2739f72bafe1fc895` is superseded for production release
purposes by the owner invalidation decision. Its historical freeze and RC evidence must not be
rewritten. Once reviewed workflow/config source changes are implemented, a new M0/M1 candidate cycle
is mandatory.

The remote Rules rollback snapshot remains a separate read-only blocker. Current 403/service-disabled
access must be reported to the owner/admin; no IAM or quota intervention may be automated or folded
into this corrective.

## Approval disposition

**Approved with the required changes above.** Do not implement until the owner explicitly accepts the
corrective and authorizes implementation.

## Next owner checkpoint

**`OWNER ACCEPT STUDIO RELEASE WORKFLOW CORRECTIVE + AUTHORIZE IMPLEMENT`**
