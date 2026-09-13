# Review: Portal show price commitment acknowledgment

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-08-portal-show-price-commitment-ack-plan.md` |
| Status | **approved_with_changes** |

## Summary

Scope is sound: reuse shared four-tier pricing math, add Portal review commitment UI, shorten Add-to-Show (+ signup) ack, bump to `portal-bidding-ack-v4`, keep server version gate. Security correctly avoids opening full `settings/showQueue` to customers. **Do not implement** until owner answers blocking Open Questions (copy, pricing source, exclusive paragraph).

## Checklist

| Area | Result | Notes |
|------|--------|-------|
| Scope | pass | Bounded to Portal UX + shared copy/version |
| Architecture | pass | Shared summary helpers; no pay-now path |
| Security | pass | Defaults preferred; no broad settings read |
| Data model | pass | Version bump only in v1 |
| Backend | pass | Redeploy couple after bump; owner-gated |
| UX / policy | pass w/ gate | Customer-facing copy needs human approval |
| Tests | pass | Copy/version + Portal contracts + Functions inherit |

## Required changes / gates
1. Owner approve or rewrite proposed ack + signup copy.
2. Confirm pricing source **(A) defaults** vs **(B) live settings follow-up**.
3. Confirm keep/drop exclusive funkyfreshprints.com paragraph.
4. After answers: implement; then owner visual QA; Functions DEV redeploy when authorized.

## Decision
**approved_with_changes** — implementation blocked on human checkpoint answers only.
