# Phase 9A follow-up — Website-first Etsy results (Open API rip)

**Date:** 2026-07-15  
**Goal:** Remove Etsy Open API search; keep hybrid questionnaire + request lifecycle; results = Primary + Broader website link cards only.  
**Parent:** phase-9a-etsy-recommendations-foundation  
**Status:** approved for implementation

## Decision

Website search links are the product surface for finding designs. Open API listing cards, diagnostics, quotas, and `ETSY_X_API_KEY` for search are removed. Scraping for in-app cards is deferred behind ToS/legal approval.

## Scope

Delete `searchEtsyRecommendations` + live client stack; stop writing `apiKeywords*`; Portal link-only results; ADR/DATA_MODEL/BACKEND/RISK; deploy delete to `fresh-prints-dev`.

## Out of scope

Scraping; production deploy; Secret Manager key deletion without owner approval.
