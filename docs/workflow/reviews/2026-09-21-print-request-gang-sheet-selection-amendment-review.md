# Implementation Review Amendment: PR Gang Sheet Selection (D)

- **Date:** 2026-09-21
- **Goal:** `studio-portal-print-request-inbox-ai-queue-batch`
- **Status:** **approved_with_changes** (owner-requested QA amendment to D)

## Decision

Keep a **single** Generate Gang Sheet selection view (no tabs):

- All items selected by default (full-PR generate path unchanged in practice).
- Add artwork thumbnails for identification.
- Add **export-only** quantity controls (default = saved qty); no width/height editors.
- Generate snapshots selection + export qtys without mutating the Print Request.

## Why not tabs

“Full PR” is identical to “all selected at saved quantities.” Tabs would split one job into two surfaces without gaining coverage for the reprint case.

## Scope gate

This amends plan D’s prior out-of-scope “no quantity edit” to allow **export-only** quantity overrides. Persistence of quantity changes remains out of scope.

## Required tests

- Selection + export-qty pure helpers (defaults, clamp/invalid, snapshot clones, no mutation of source items).
- Modal contract: thumbnails wiring, qty controls present, no width/height editors, no Firestore/update paths.
- Manual QA: deselect + reduce qty for a 2-design reprint; full select at saved qty still works.
