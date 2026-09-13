# Formal Review — Explicit Stale State and Smart Profile Terms Corrective

| Field | Value |
|---|---|
| Plan | `docs/workflow/plans/2026-09-08-explicit-content-stale-state-and-smart-profile-terms-corrective-plan.md` |
| Verdict | **approved_with_constraints** |
| Implementation | Authorized by owner QA feedback; narrow scope only |

## Findings

The deployed precision-first matcher correctly rejects `1559` and `1565`, but the persistence path has no negative reconciliation. A previous automation write remains authoritative in the document until another positive match or manual edit. This makes a corrected reprocess appear to fail even when the new classifier returns no match.

The Smart Profile UI also treats the provenance preview as the only source for detected-term pills. Persisted `censoredTerms` are the durable masking fields and must remain visible when a legacy or pre-preview design lacks the nested preview.

## Approval constraints

1. Cleanup must be limited to `explicitContentSource === "automation"` and must be suppressed by `explicitContentAutomationLocked`.
2. Settings-read failure must remain fail-closed and must not clear existing fields.
3. Staff or unknown-source legacy fields must not be guessed as automation-owned.
4. Preview terms take precedence over persisted terms; the UI fallback must not duplicate terms.
5. Add automated tests for authority boundaries and Smart Profile fallback.
6. Do not run live AI/provider QA as part of implementation.

## Verdict

The corrective is approved for implementation within the stated boundaries. It addresses stale DEV results from the earlier false-positive without weakening human authority or changing the precision-first matching contract.

`[APPROVED: IMPLEMENT EXPLICIT STALE STATE + SMART PROFILE TERMS CORRECTIVE]`
