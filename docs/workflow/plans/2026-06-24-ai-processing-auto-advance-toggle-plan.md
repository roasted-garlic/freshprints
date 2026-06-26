# Plan: AI Processing — Auto advance Toggle component + queue UX polish

**Date:** 2026-06-24  
**Goal:** Replace Processing tab Auto advance checkbox with shared `Toggle` pill switch; add disabled support.

## Scope

| File | Change |
|------|--------|
| `Toggle.tsx` | Optional `disabled` prop |
| `inputs.css` | `.toggle-switch-disabled` styles |
| `AiReviewWorkspace.tsx` | Use `<Toggle>` for Auto advance |
| `ai-review.css` | Remove checkbox-specific styles; layout wrapper only |

## Out of scope

Queue behavior, server, import, Needs Review changes.

## Acceptance criteria

See user request checklist.

## Testing

`tsc`, `lint`; manual Processing tab toggle checkpoint.
