# Signoff: AI Review Inbox Sort + Skip Removal

**Date:** 2026-06-24  
**Status:** approved

## Delivered

- Tab-aware `sortInboxDesigns(designs, tab)` — Needs Review/Rejected newest first; Processing oldest first
- Removed Skip button, S shortcut, `skipInInbox`, `isDesignSkippableInInbox`
- Removed Auto Advance toggle; approve/reject always advance to next item
- Updated `WORKFLOWS.md`

## Tests

- `npx tsx --test` aiReviewInboxSort, aiReviewInbox, aiReviewInboxEligibility — 27/27 pass
- `tsc` + `eslint` pass

## Manual QA

1. Complete AI on a design → appears at **top** of Needs Review list
2. Processing tab still oldest-first
3. No Skip / Auto Advance UI; Approve & Next still advances
