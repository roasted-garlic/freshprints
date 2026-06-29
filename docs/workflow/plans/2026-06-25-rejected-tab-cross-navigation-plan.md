# Plan: Rejected tab cross-navigation + Re-run AI header

**Date:** 2026-06-25

## Goal

A. Reopen → Needs Review with same design selected
B. Re-run (Rejected) → Processing with same design selected
C. Move Needs Review Re-run AI button to AI Suggestions header (top right)

## Approach

- `pendingCrossTabSelectionRef` handoff in `useAiReviewInbox`
- `onNavigateToTab` callback from `AiReviewPage` updates URL
- Selection effects skip default `designs[0]` while handoff active
- Header layout for Re-run AI in `AiReviewSuggestionsSection`
