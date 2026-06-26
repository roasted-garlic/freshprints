# Plan: AI Processing Layout Follow-up

**Date:** 2026-06-24  
**Status:** Complete

## Goal

Uniform square preview on all tabs; verify queue scrolls inside sidebar (not whole page).

## Changes

1. Remove `ai-review-workspace--processing` class and CSS preview overrides.
2. Strengthen height chain: `grid-template-rows: minmax(0, 1fr)` on layout; `min-height: 0` on grid children; `app-main:has(.page-content-area--ai-review) { max-height: 100vh }`.
3. Keep whitespace fix via `workspace-flow` scroll + `align-content: start`.
