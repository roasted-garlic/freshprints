# Plan: AI Processing Tab — Horizontal Stepper + Hybrid Scroll

**Date:** 2026-06-24  
**Status:** Complete

## Goal

3-step horizontal AI stepper on Processing tab; hybrid scroll (sticky bounded left queue, natural page scroll for right panel).

## Pipeline UI groups

| Label | Stages |
|-------|--------|
| Sending to AI | queued, preparing_image, sending_to_ai |
| Receiving from AI | receiving_response, validating_response |
| Ready for review | ready_for_review |

## Layout

- `page-content-area--ai-review`: `overflow-y: auto` (page scroll)
- Left `.ai-review-queue-panel`: `position: sticky`, `max-height`, internal list scroll
- Right workspace: remove inner `overflow-y` on `.ai-review-workspace-flow`

## Files

- `aiProcessingOutput.ts` — `resolveAiProcessingPipelineSteps()`
- `AiReviewProcessingStatusSection.tsx` — horizontal stepper + error message
- `ai-review.css`, `navigation.css`
- `aiReviewInbox.test.ts`, `STYLE_GUIDE.md`
