# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-06-28**

---

## At a Glance

| Field | Value |
|-------|-------|
| **App** | Fresh Prints — DTF design catalog & print planning |
| **Active app** | Fresh Prints Studio (Electron desktop, staff only) |
| **Roadmap phase** | **Phase 5** — AI Review Workflow (in progress) |
| **Managed workflow goal** | `phase-6-print-requests-foundation` — Print Requests implementation |
| **Workflow phase** | Implement |
| **Status** | In progress — Phase 0 deploy gate cleared; Phase 6 ready |
| **Human checkpoint** | **NO** — Phase 0 verified on `fresh-prints-dev` |

---

## Workflow Snapshot (FreshForge)

```
Mode:           managed-phase
Goal:           phase-6-print-requests-foundation
Phase:          implement
Status:         in_progress
Plan:           docs/workflow/plans/2026-06-28-phase-6-print-requests-foundation-plan.md
Review:         approved — Phase 0 deploy gate cleared
Signoff:        phase 0 blocker cleared; ready to implement Phase 6
DONE:           no
```

### Allowed now
- Read docs, path verification, implementation within approved Phase 6 scope
- Plan/review updates, tests, documentation updates

### Forbidden now
- Phase 7 implementation
- Whatnot integration
- Production deploy without explicit approval

### Next required step
Implement Phase 6 Print Requests foundation from `docs/workflow/plans/2026-06-28-phase-6-print-requests-foundation-plan.md`.

---

## Roadmap Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation (Auth, roles, shell) | ✅ Complete |
| 2 | Design Library (2A–2C) | ✅ Complete |
| 3 | Import System (3A–3D) | ✅ Complete |
| 4 | Catalog Search & Cleanup | ✅ Complete (2026-06-24) |
| **5** | **AI Review Workflow** | **🔄 In progress** — 5A polish done; 5B pipeline active locally; enrichment v15 pending deploy |
| 6 | Customers & Print Requests | 📋 Planned |
| 7 | Print Runs / Upcoming Shows | 📋 Planned |
| 8 | Fresh Prints Portal (customer web) | 📋 Planned |
| 9 | Custom Request Q&A | 📋 Planned |
| 10 | Analytics & Popularity | 📋 Planned |

---

## Active Sub-Goal: AI Catalog Enrichment v15

| Sub-phase | Description | Status |
|-----------|-------------|--------|
| **0** | Deploy + path verification (UI shows v15) | ⛔ **BLOCKED — human action** |
| 1–7 | v15 prompt, parse, retry, category, tags | ✅ Done locally |
| 8–12 | Placeholder rejection, garbled OCR, confidence tiers, model fallback | ⏳ Pending (after Phase 0) |

**Known issue:** UI may show `catalog-enrich-openai-v12` because functions were not deployed to production; local code is v15.

**Tests (local baseline):** 49/49 pass — see `docs/workflow/reviews/2026-06-26-ai-catalog-enrichment-v15-test-report.md`

---

## Studio Workspaces (live routes)

| Route | Workspace | Purpose |
|-------|-----------|---------|
| `/designs` | Design Library | Approved catalog only (`status: ready`) |
| `/imports` | Imports | ZIP/folder batch import, validation, AI enqueue |
| `/ai-review` | AI Review | Processing / Needs Review / Rejected tabs |
| `/users` | Team management | Owner/admin team CRUD |
| `/settings` | Settings | AI enrichment model selection (owner/admin) |
| `/dev-dashboard` | Dev Dashboard | Placeholder stats (bottom of sidebar) |
| `/show-queue` | Legacy placeholder | Pre–Phase 6 scaffold |
| `/customer-requests` | Legacy placeholder | Pre–Phase 9 scaffold |

Default landing: `/designs` (Design Library).

---

## Recently Completed (June 2026)

Features signed off in managed phases — do not re-implement:

- Phase 4 catalog cleanup (approved-only library, archived toggle, tag filter modal)
- AI Review workspace (tabs, queue, approve/reject/skip, keyboard shortcuts)
- Automatic AI enqueue on import (Cloud Functions pipeline)
- OpenAI vision enrichment (GPT-5 nano models, configurable via Settings)
- AI processing stepper, re-run overlay, rejected-tab cross-navigation
- OCR/arched text validation, visible text quality checks
- Text-only title color suffix rules
- AI description required + server synthesis fallback
- Processing latency investigation + pipeline timing logs
- AI review queue panel height fix
- Firebase auth/storage handoff package (`docs/handoffs/firebase-auth-storage/`)

---

## Tech Stack (quick)

- **Desktop:** Electron 30 + Vite + React 18 + TypeScript
- **Backend:** Firebase Auth, Firestore, Storage, Cloud Functions
- **AI:** OpenAI vision via Cloud Functions (`functions/src/ai/`)
- **Image processing:** sharp (Electron main process)

---

## Open Blockers & Risks

1. **Print Requests Firestore rules still pending** — the new route renders, but CRUD is blocked until the separate rules/index review is approved.
2. **No `npm test` script** — unit tests exist as `*.test.ts` but no wired runner; run via node/tsx manually or add in future phase.
3. **Portal not built** — customer-facing app is Phase 8; all current UI is Studio.

---

## How to Update This File

1. Read `.cursor/workflow/state.md`
2. Update **Workflow Snapshot**, **Active Sub-Goal**, and **Next required step**
3. Move completed items into **Recently Completed**
4. Bump **Last updated** date
5. Upload this file to your external AI chat
