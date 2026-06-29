# Plan: Black/White Text suffix — text-only designs only

**Date:** 2026-06-25

## Goal
Append Black/White Text title suffix only when `textOnlyArtwork === true`.

## Changes
- Prompt v12 + `textOnlyArtwork` JSON field
- `appendTextColorSuffix` gated on `textOnlyArtwork === true`
- `stripTextColorSuffixFromTitle` when not text-only
- `DesignAiAnalysis.textOnlyArtwork` in shared types

## Default
Fail-closed: no suffix unless `textOnlyArtwork === true`.
