# Plan: Remove “No companion set” from AI Review

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (final pre-prod corrective) |
| Related | docs/workflow/reviews/2026-08-10-ai-review-no-companion-set-ui-review.md |

---

## Goal

Remove the irrelevant **“No companion set”** pill from Studio AI Review. Companions are pairwise and only linked after library approval, so the empty pill is always expected and useless during review.

## Scope

### In Scope
- Stop rendering the `No companion set` chip in `AiReviewFormPanel`
- When neither Needs Companion nor In companion set applies, render **nothing** (no replacement empty-state)
- Source assert / Studio typecheck as needed
- Owner QA phrase: `DEV NO COMPANION SET UI QA: PASS`

### Out of Scope
- Placement-default changes (DEFERRED)
- Expects companion design(s) toggle
- Needs Companion / In companion set chips (keep when applicable)
- Explicit Content, censoredTerms, Halftone, approval, companion data model, Portal

---

## Approach

1. In `AiReviewFormPanel.tsx`, change the evidence-row ternary so the final `else` is `null` instead of the “No companion set” span.
2. Add/update a small source assert if a test already covers this panel; otherwise a one-liner assert in an existing AI Review test file.
3. Run Studio typecheck (+ relevant unit tests).
4. Stop for owner QA.

---

## Test Strategy

| Check | Required |
|-------|----------|
| Studio typecheck | yes |
| Unit / source assert that “No companion set” is absent | yes |
| Owner manual QA | yes |

---

## Human Checkpoints
- [x] Owner DEV QA (`DEV NO COMPANION SET UI QA: PASS`)
- [ ] Production — forbidden

---

## Risks
| Risk | Mitigation |
|------|------------|
| Accidental removal of Needs Companion | Keep existing branches |

---

## Approval
- Verdict: pending
