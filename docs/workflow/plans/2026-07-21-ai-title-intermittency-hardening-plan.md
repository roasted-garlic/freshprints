# Plan: AI title intermittency / narration-shape hardening

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase follow-up (`ai-text-title-completeness`) |
| Related | 2026-07-21-ai-title-multi-segment-completeness-plan.md; ADR-FP-113 |

## Goal

Make text-dominant title completion **stable across reprocesses** when Gemini varies description narration (multi-quote vs single-quote+prose vs slash vs unquoted stacked lines).

## Background

Owner FAIL WITH NOTES: same Sarcasm design sometimes titles fully, sometimes collapses to `Sarcasm`. Root cause: extraction returned early on the first/only headline quote and never merged prose/slash continuations.

## Approach (implemented)

1. Merge quotes + prose continuation patterns + slash segments.
2. Prepend lead headline when only continuations were captured.
3. Shared `resolveReadableWordingForTitle` for incompleteness + fallback (incl. trailing recovery).
4. Cut style/product tails; keep true one-word titles.

## Out of scope

Providers, OCR, category/tags, production deploy, prompt version bump (unless required).

## Tests

Multiple Sarcasm description shapes + non-expand one-word + Motherhood/apostrophe regressions.
