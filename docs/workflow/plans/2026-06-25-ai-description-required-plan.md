# Plan: Require non-empty AI catalog descriptions

**Date:** 2026-06-25

## Goal

AI enrichment must always return a usable catalog description. Blank, dash, or placeholder values are rejected server-side with synthesis fallbacks.

## Root cause

- Provider used `sanitizeCatalogDescription` only — no validation or fallback
- Prompt v12 did not require non-empty descriptions
- `sanitizeCatalogDescription` can zero out background-only copy
- Pipeline only logs text mismatch; does not repair empty descriptions

## Scope

1. Prompt v13 — description required, forbid placeholders
2. `isPlaceholderCatalogDescription` + `resolveCatalogDescription` in `catalogTitleRules.ts`
3. Wire OpenAI + development providers; log `catalog.enrich.description_fallback`
4. Pipeline guard before `markAiSuccess`
5. Unit tests + ADR-FP-026

## Out of scope

Latency, overlay, shortcuts, max length change (500)
