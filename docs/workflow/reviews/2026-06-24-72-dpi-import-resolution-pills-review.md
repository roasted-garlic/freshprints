# Review: 72 DPI Minimum Import + Resolution Color Pills

**Date:** 2026-06-24  
**Plan:** `docs/workflow/plans/2026-06-24-72-dpi-import-resolution-pills-plan.md`  
**Reviewers:** Architecture + UX (agent)  
**Status:** approved

## Summary

Plan correctly identifies the width-at-300 rejection vs effective-DPI display mismatch. The 72 DPI normalization fallback for sub-3.5″ assets is sound and produces meaningful persisted `effectiveDpi` for catalog pills.

## Architecture

- **Approved:** Shared math remains authoritative; renderer only displays tiers from `effectiveDpi`.
- **Approved:** `min(pixelWidth, pixelHeight) < 72` reject complements normalization math for boundary tests.
- **Approved:** New `terrible` acceptance level for import warnings without conflating with `reject`.

## UX

- **Approved:** Pill on `DesignCard` with tooltip (`Good · 268 DPI`).
- **Approved:** Black/dark terrible tier with accessible contrast in dark mode via dedicated CSS tokens.
- **Approved:** Concise labels: Optimal, Good, Bad, Terrible.

## Required changes

None — proceed to implementation as written.

## Security

No Firestore rule changes; validation unchanged in Electron import path.
