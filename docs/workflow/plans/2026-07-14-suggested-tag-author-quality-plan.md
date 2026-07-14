# Plan: Suggested-tag writing quality

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-suggested-tag-author-quality-review.md |

---

## Goal

When Suggested New Tags are AI-authored (Suggested-tag writing Auto/Always), produce richer entries closer to hand-curated tags (many useful aliases + detailed preferredWhen including when *not* to use), and strip aliases that already exist on approved catalog tags before staff review.

## Background

Owner PASS on policy settings. Observed suggestions still look thin (1–3 aliases, short preferredWhen). Author prompt currently asks for 1–3 aliases and one sentence; validator caps aliases at 5 and preferredWhen at 300 chars. Approve already blocks collisions; staff should not see colliding aliases in the first place.

## Scope

### In Scope
- Strengthen suggestion-author prompt (aliases + preferredWhen style like `halftone` example)
- Raise caps: aliases (12), preferredWhen length (500), calibration example aliases shown (8), completion tokens
- Bump author prompt version `catalog-suggested-tag-author-v2`
- Strip aliases (and drop name collisions) against approved catalog name/alias set during `validateAuthoredSuggestions`
- Unit tests + deploy enqueueAiEnrichment to fresh-prints-dev

### Out of Scope
- Changing Suggested new tags *when* policy
- Injecting full approved tag list into vision prompt
- Auto-reject for misspellings
- Production deploy

---

## Approach

1. Update `buildSuggestedTagAuthorInstructions` + system prompt for richer output.
2. Raise constants; update calibration slice.
3. Extend `validateAuthoredSuggestions(..., reservedTerms?: Set<string>)` to drop reserved names/aliases.
4. Pipeline/standalone/merged callers pass reserved set built from approved tags.
5. Tests for prompt caps + collision strip.

---

## Test Strategy

| Check | Required |
|-------|----------|
| Unit author provider + validateAuthoredSuggestions | yes |
| functions build | yes |
| Deploy enqueueAiEnrichment (dev) | yes |
| Manual AI Processing with Suggested-tag writing Auto | yes |

---

## Approval
- Verdict: approved (owner-directed follow-up)
