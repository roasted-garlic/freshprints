# Recent Completed Work (June 2026)

> Signed-off managed phases. External agents should not re-plan or duplicate this work.

## Phase 4 — Catalog cleanup (2026-06-24)

- Design Library defaults to approved catalog only
- Removed status/AI review filters from Library
- Archived visibility toggle + URL params
- Searchable multi-select tag filter modal
- Import completion links to AI Review
- Legacy `status=imported` URLs redirect to AI Review
- Default landing page → `/designs`

## Phase 5A — AI Review workspace polish

- Processing / Needs Review / Rejected tabs
- Oldest-first queue (no inbox search/filter)
- Preview → pipeline stepper → suggestions → catalog form layout
- Approve & Next, Reject & Next, Skip, auto-advance toggle
- Keyboard shortcuts (J/K, approve/reject)
- Main panel height management

## Phase 5B — AI pipeline (local)

- Automatic enqueue on import
- Cloud Functions: `enqueueAiEnrichment`, `onDesignAiEnrichmentQueued`
- OpenAI vision provider with GPT-5 nano models
- Development provider fallback when no API key
- Pipeline timing and latency logging

## AI enrichment iterations (2026-06-24 – 2026-06-26)

| Feature | Date |
|---------|------|
| AI processing queue fixes + stop control | 2026-06-24 |
| AI inbox sort + skip behavior | 2026-06-24 |
| 72 DPI import resolution pills | 2026-06-24 |
| Auto-advance toggle | 2026-06-24 |
| Long tags crash fix | 2026-06-24 |
| Configurable OpenAI vision model (Settings) | 2026-06-25 |
| GPT-5.4 nano support + params action bar | 2026-06-25 |
| GPT-5 nano empty response fix | 2026-06-25 |
| Settings tag exclusions + re-run AI | 2026-06-25 |
| AI description required + synthesis fallback | 2026-06-25 |
| Text-only title color suffix | 2026-06-25 |
| Rejected tab cross-navigation | 2026-06-25 |
| Needs review re-run overlay latch | 2026-06-25 |
| OCR/arched text + re-run overlay stepper | 2026-06-25 |
| AI processing latency investigation | 2026-06-25 |
| AI review queue panel height | 2026-06-25 |
| Processing J/K shortcuts alignment | 2026-06-25 |
| **Catalog enrichment v15 baseline (Phases 1–7)** | **2026-06-26** |

## Infrastructure / docs

- Firebase auth/storage handoff package (`docs/handoffs/firebase-auth-storage/`)
- FreshForge workflow on project (AGENTS.md, .cursor/, docs/)

## Phase 6 — Print Requests foundation (2026-06-29)

- Status: **PASS**
- `/print-requests` staff workspace
- Internal print requests
- Customer print requests
- Print request create/update flows
- Request item list/edit/remove
- Design Library request-selection mode
- Approved catalog designs added to requests with quantity
- Request items persist after revisit/reload
- Design lifecycle status remains clean (`designs.status` stays catalog-only)
- Customer record creation/editing now works from `/users` without customer Auth or Studio access

## Follow-up hardening

- Print Request unit tests and indexed query hardening remain open follow-ups.

See `CURRENT-STATE.md` for live status.

## Deferred / backlog

- Staff confirm modal during import (Phase 3D Step 5)
- Optional backfill for print sizes (Phase 3D Step 8)
- Date range filters (Phase 4B)
- Print Request unit tests and indexed query hardening
- Print Runs (Phase 7), Portal (Phase 8)
