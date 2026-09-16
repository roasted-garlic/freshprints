# Formal Review — Smart Catalog Autonomous canonical-copy fail-closed corrective

Date: 2026-09-14
Plan: `docs/workflow/plans/2026-09-14-smart-catalog-autonomous-canonical-copy-fail-closed-corrective-plan.md`
Review scope: `fresh-prints-dev` only

## Verdict

**APPROVED WITH CHANGES — implement the bounded fail-closed persistence gate.**

The evidence and source trace prove a current-stack downstream contract defect. The provider and
parser produce valid candidate title/description/category values; `markAiSuccess` evaluates those
values, then persists lifecycle/AI fields without copying or validating the root catalog fields.
Imported roots therefore remain filename/blank/uncategorized while Autonomous marks Ready, and
Algolia indexes the same root values. Reprocessing intentionally preserves those roots and uses
the same pipeline, so reproduction is expected. This is DEV evidence, not proof of a production
incident; production remains outside implementation and test scope.

## Required review changes incorporated

1. The gate must run against the final root catalog values immediately before the guarded
   persistence decision. Candidate validity alone is insufficient.
2. The fix must not blindly overwrite complete staff-authored root fields. It may replace an
   exact import filename/default or missing/invalid field with the corresponding AI candidate,
   then validates the resulting effective record before approval. Incomplete final copy routes
   to Needs Review for human completion.
3. Category validity must be checked against the active category set (not only a non-empty string),
   and a missing/unknown/Uncategorized sentinel must hard-block.
4. Automation Health increments must use the final reconciled outcome, not the pre-persistence
   candidate decision.
5. Diagnostics remain bounded and exclude provider payloads, image bytes, and secrets.

The approved authority rule for this phase is explicit: exact source-filename/default roots are
import placeholders, while a complete non-matching root is preserved as staff authority; missing
or invalid fields are filled from the current candidate and the resulting values are re-evaluated
before any Ready write. Source-less legacy numeric/opaque basenames are handled only by the narrow
bounded heuristics covered by tests; introducing durable per-field provenance would be a separate
schema/policy checkpoint.

The gate also retains any hard blocker from the current candidate decision (including an unresolved
candidate category) even when a trusted root field could otherwise fill that slot. This is an
intentional conservative rule: a malformed provider result cannot gain Autonomous authority merely
because an older staff field exists.

## Evidence reviewed

- DEV settings readback: `shadow`, `catalogAutonomousLiveEnabled=false`, Pass 2 OFF.
- Three current v39/v7 malformed Ready rows with valid AI suggestions/Smart Profiles and malformed
  roots (`coiXzQDhJBKBVB1dFVZT`, `nff6PpkZF9TNitnpX2Mm`, `1Ws0T9fivryest6IUSbt`).
- Historical Shadow raw/outcome artifacts showing `wouldAutoApprove=true` alongside filename roots,
  blank descriptions, and valid AI suggestions/categories.
- `aiEnrichmentCandidateCore.ts`, `aiEnrichmentPipeline.ts`, import orchestration, reprocess core,
  Algolia record builder/sync, and provider contract comments.
- Existing canary/contract tests, which did not assert final root parity or post-persistence health.

## Scope, risk, and test gates

Approved files are limited to the Functions/shared final-catalog validation and pipeline/health
contracts, the existing Studio Automation Health readout needed to expose the four new bounded
counters, their focused tests, and workflow evidence. No provider/model/prompt, Rules/index,
schema migration, Algolia rebuild, production setting/data, or production deployment is
approved. The implementation is acceptable only if all new tests and existing targeted suites pass,
DEV Functions promotion succeeds, deterministic same-design Shadow-vs-Autonomous comparison and
bounded DEV soak pass, and adversarial review finds no path that can write malformed Ready.

OWNER QA remains a required manual checkpoint. Passing DEV QA does not authorize production
promotion or Autonomous re-enable; return a separate exact production plan at that boundary.
