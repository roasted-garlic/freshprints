# Review: Print request upload library consent (revised — per-thumb icons)

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-08-print-request-upload-library-consent-detail-plan.md` |
| Status | **approved_with_changes** |

## Summary

Owner preference supersedes the prior request-header meta line. Per-thumbnail upper-left green check / red X for known library consent on customer uploads only is approved. Pending/null and assisted copies show no icon. Remove the header summary line to avoid double UI.

## Checklist

| Area | Result | Notes |
|------|--------|-------|
| Scope | pass | Narrow UI; no persistence/rules |
| Security | pass | Same staff read path |
| Architecture | pass | Card presentation + existing upload summaries |
| UX clutter | pass | Icons only when consent known; catalog untouched |
| Tests | pass | Resolver + contract updates required |

## Required changes from prior implementation
1. Remove detail-header consent paragraph.
2. Add per-thumb icons as specified.
3. Update helper/tests/contracts to match icon model.

## Decision
**approved_with_changes** — proceed to implement revised approach.
