# Plan: Needs Review shortcut hints alignment

**Date:** 2026-06-25

## Goal
Split shortcut hints into left (A/R) and right (J/K) columns under matching button groups on Needs Review and Rejected tabs.

## Changes
- `AiReviewWorkspace.tsx`: `ai-review-shortcuts-row` with two hints (Needs Review); Rejected right-only J/K
- `ai-review.css`: `.ai-review-shortcuts-row` matching auto-advance row flex layout

## Out of scope
Shortcut key behavior (unchanged)
