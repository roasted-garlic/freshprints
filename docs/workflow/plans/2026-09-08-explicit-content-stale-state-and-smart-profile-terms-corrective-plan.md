# Corrective Plan — Explicit Stale State and Smart Profile Terms

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Parent | `precision-first-explicit-content-false-positive-corrective` |
| Environment | DEV QA finding / local source |
| Scope | Explicit reprocess persistence and AI Review Smart Profile display |
| Production | Not in scope |

## QA findings

1. The precision-first classifier no longer matches historical years `1559` and `1565`, but `resolveExplicitContentAutomationWrite()` intentionally returns no action on a non-match. A prior automation-authored `isExplicitContent=true` and `censoredTerms` therefore survive reprocess and continue to display as Explicit.
2. Smart Profile renders detected terms only from `smartProfile.provenance.explicitAutomationPreview.proposedCensoredTerms`. Older or persisted designs whose root `censoredTerms` exist without that preview show no term pills.

## Narrow corrective

- On a confirmed settings-successful no-match, return an explicit cleanup decision only when the prior root fields were authored by automation (`explicitContentSource === "automation"`).
- Persist cleanup with Firestore deletes for `isExplicitContent`, `censoredTerms`, and `explicitContentSource`.
- Never clear when the deliberate `explicitContentAutomationLocked` is true. Do not infer staff authority from legacy fields; preserve staff/unknown-source fields because automatic ownership cannot be proven.
- Keep positive exact-match writes unchanged.
- In Smart Profile, render preview terms first and fall back to persisted `design.censoredTerms` when the preview has no proposed terms. Do not display stale terms when the persisted root is explicitly false and has no terms.

## Regression coverage

- A prior automation match clears on a corrected no-match.
- A locked prior record is not cleared.
- Staff/unknown-source prior records are not cleared by a no-match.
- Settings failure does not clear anything.
- Positive matches still write terms.
- Smart Profile term fallback is covered for persisted terms and preview precedence.

## Boundaries

No provider calls, settings changes, vocabulary changes, category changes, production actions, destructive data migration, commit, or push. Existing incorrect DEV records are corrected only when those designs are reprocessed through the normal pipeline.

`[NEEDS IMPLEMENTATION REVIEW: EXPLICIT STALE STATE + SMART PROFILE TERMS CORRECTIVE]`
