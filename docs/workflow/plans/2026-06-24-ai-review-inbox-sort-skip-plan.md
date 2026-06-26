# Plan: AI Review Inbox — Needs Review Sort + Remove Skip/Auto Advance

**Date:** 2026-06-24  
**Status:** Complete

## Goal

1. Needs Review tab: **newest first** (`updatedAt desc`)
2. Remove Skip (broken no-op on Needs Review)
3. Always advance after Approve/Reject (remove Auto Advance toggle)

## Sort rules

| Tab | Order |
|-----|-------|
| `needs_review` | `updatedAt` desc |
| `rejected` | `updatedAt` desc |
| `processing` | `createdAt` asc (unchanged) |

Tie-breaker: `id` asc.

## Removals

- Skip UI, S shortcut, `skipSelected`, `skipInInbox`, `isDesignSkippableInInbox`
- `autoAdvance` state, checkbox, `forceAdvance` in `runInboxAction`

## Docs

- `WORKFLOWS.md` — per-tab queue order; approval actions without skip/auto-advance
