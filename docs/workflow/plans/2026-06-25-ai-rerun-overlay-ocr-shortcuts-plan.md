# Plan: Re-run AI overlay, OCR v11, Processing shortcuts layout

**Date:** 2026-06-25

## A — Needs Review re-run overlay
- Overlay on `ai-review-preview-stage` with stepper; hide workspace-flow during rerun
- Processing tab unchanged (inline status section)
- `scrollIntoView({ block: 'nearest' })` on preview when overlay opens

## B — Prompt v11 + reasoning low
- Full visibleText segments; description sentence 1 transcribes all phrases
- Category theme matching; v10 title punctuation rules
- `description_text_mismatch` warning log
- `reasoning_effort: low` primary (document cost in ADR)

## C — Processing shortcuts row
- Toggle left, shortcuts right on one row; remove duplicate line below
