# Phase 9A follow-up — Hybrid free-text + suggest dictionary

**Date:** 2026-07-15  
**Goal:** Replace required curated subject chips with an 80-character free-text subject field plus a large in-repo searchable suggestion dictionary; parse into short Open API keywords.  
**Parent:** phase-9a-etsy-recommendations-foundation  
**Status:** approved for implementation (owner direction)

## Decision

Customer types “what is it of?” (max 80 chars) with autocomplete from a seed dictionary. Longest-match dictionary phrases + distinctive remaining tokens drive Open API keywords. Optional tone (max 2) and exact saying (max 60) remain. Occasions fold into dictionary/free text.

**Dual-path:** new submits use `subjectText`; legacy Dev docs with `subjects` ids still validate and rebuild on search.

## Scope

Suggest dictionary + subject parser; dual-path validation/builders; Portal Step 1 autocomplete; draft v3; Functions redeploy; ADR/DATA_MODEL; manual QA.

## Out of scope

CMS dictionary UI; LLM prose extraction; production quota restore; complete pop-culture encyclopedia.
