# Phase 9A follow-up — Curated Etsy keyword pickers

**Date:** 2026-07-15  
**Goal:** Replace free-text description-driven Open API search with curated subject/occasion/tone pickers so searches reliably return listings.  
**Parent:** phase-9a-etsy-recommendations-foundation  
**Status:** approved for implementation (owner FAIL / A/B diagnosis)

## Decision

Customer steers via pickers; server builds short API keyword stacks. Free-text long description is removed as the search driver. Optional short exact saying kept.

## Scope

Shared option lists + answers shape + query builders; Portal wizard UX; Functions submit/search; docs/ADR; deploy to fresh-prints-dev.

## Out of scope

CMS word lists; AI generation; production quota restore.
