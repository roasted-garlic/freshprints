# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-06-29**

---

## At a Glance

| Field | Value |
|-------|-------|
| **App** | Fresh Prints — DTF design catalog & print planning |
| **Active app** | Fresh Prints Studio (Electron desktop, staff only) |
| **Roadmap phase** | **Phase 6** — Customers and Print Requests PASS with hardening notes; Phase 5 AI Processing maintenance signed off locally |
| **Managed workflow goal** | `owner-only-sensitive-ai-and-category-controls` — complete |
| **Workflow phase** | Signoff |
| **Status** | **PASS** |
| **Human checkpoint** | **NO** |

---

## Workflow Snapshot (FF)

```txt
Mode:           managed-phase
Goal:           owner-only-sensitive-ai-and-category-controls
Phase:          signoff
Status:         pass
Plan:           docs/workflow/plans/2026-06-29-owner-only-sensitive-ai-and-category-controls-plan.md
DONE:           yes
```

### Current Signoff

`wrap-up-open-items-audit` remains the latest completed signoff. It did not change app behavior or run deploys. It confirmed AI Processing playground-pattern deltas and Phase 6 Print Requests can be locally accepted, with human approval still required for Firebase Functions deploy/smoke and any Phase 7 planning.

Current active managed phase:

* `owner-only-sensitive-ai-and-category-controls`
* plan created at `docs/workflow/plans/2026-06-29-owner-only-sensitive-ai-and-category-controls-plan.md`
* implementation complete locally; automated checks passed
* authenticated manual QA passed
* repo-grounded result: bulk category import is now owner-only and the AI Processing prompt block in Settings is now owner-only, while admins retain standard category CRUD and other permitted AI settings

`ai-processing-direct-run` remains **PASS WITH NOTES** and is the baseline for the current AI Processing implementation.

Passed:

- Default AI vision model remains `gpt-5.4-nano-2026-03-17`.
- Lowest-cost selectable option remains `gpt-5-nano-2025-08-07`.
- Stronger selective option `gpt-5.4-mini-2026-03-17` is allowlisted and selectable in `/settings` and AI Review re-runs.
- `/settings` now persists `reasoningEffort` with allowlisted values `none`, `minimal`, `low`, `medium`, and `high`.
- The saved reasoning-effort default is `medium`; server compatibility fallback remains `low` per request only.
- `/settings` now includes an owner/admin AI playground for one-off text + image tests through Cloud Functions only.
- AI Review re-runs now use a compact `Re-run AI` action menu instead of a persistent visible model selector.
- Manual AI Processing now runs directly inside the callable instead of enqueueing to a Firestore-trigger hop.
- AI Review sequential processing still runs one design at a time, but no longer waits on a separate trigger round-trip.
- AI Processing is now a single playground-style call (ADR-FP-035/036): Settings-managed prompt template with server-side `{{excluded_tags}}` replacement, 4-field JSON (`description`, `category`, `title`, `tags`), **no** `response_format: json_object`, tolerant server-side JSON extraction.
- One normal OpenAI call per success — no empty-output retry and no quality retry (reasoning-effort 400 fallback and 429/5xx network retry kept). This fixes the `OpenAI returned no visible output (reason: length)` error at its source.
- **ADR-FP-039 (v18):** the prompt is now small and vision-only — the full approved category list and full approved tag list are no longer injected into every call (was the driver of high input token cost). Approved tag/alias matching, `suggestedNewTags` generation, and category resolution are all deterministic server-side steps (`catalogTagResolver.ts`, `catalogThemeCategoryResolver.ts`) that run after the model call, with category resolution running after tag resolution so matched tags feed category scoring. Server enforces single-word/deduped/exclusion-filtered tags capped at 8.
- `aiSuggestions.model` continues to record the actual model used per run; Processing can pass one-off model/reasoning overrides, Auto advance snapshots them at start, and Settings playground remains unchanged.
- Needs Review / Rejected re-run resets the design back to Processing instead of running AI in place on review tabs.
- Current prompt target is `catalog-enrich-openai-v18`.
- Latest local audit checks passed: repo lint, root TypeScript, functions TypeScript, functions build, `git diff --check`, and full `npm run build` including Electron packaging.

Notes:

- Production Firebase Functions deploy was not run.
- Authenticated AI Processing / AI Review / Settings smoke verification remains pending after approved deploy.
- Recommended next command for the current active work: choose the next approved managed phase.

---

## Roadmap Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation (Auth, roles, shell) | Complete |
| 2 | Design Library (2A–2C) | Complete |
| 3 | Import System (3A–3D) | Complete |
| 4 | Catalog Search & Cleanup | Complete |
| 5 | AI Review Workflow / enrichment baseline | Complete through Phase 0 deploy gate |
| **5** | **AI Review Workflow / enrichment baseline** | **Complete through Phase 0 deploy gate; advanced AI controls signed off locally** |
| **6** | **Customers & Print Requests** | **PASS WITH NOTES** |
| 7 | Print Runs / Upcoming Shows | Planned |
| 8 | Fresh Prints Portal (customer web) | Planned |
| 9 | Custom Request Q&A | Planned |
| 10 | Analytics & Popularity | Planned |

---

## Studio Workspaces (live routes)

| Route | Workspace | Purpose |
|-------|-----------|---------|
| `/designs` | Design Library | Approved catalog only (`status: ready`) |
| `/imports` | Imports | ZIP/folder batch import, validation, AI review intake |
| `/ai-review` | AI Review | Processing / Needs Review / Rejected tabs |
| `/print-requests` | Print Requests | Internal/customer request lists and request items |
| `/users` | Team management | Owner/admin team CRUD plus customer record create/edit |
| `/settings` | Settings | AI enrichment model + reasoning selection plus owner/admin AI playground |
| `/show-queue` | Legacy placeholder | Future Print Runs (Phase 7) |
| `/customer-requests` | Legacy placeholder | Future Custom Requests (Phase 9) |

Default landing: `/designs` (Design Library).

---

## Open Blockers & Risks

1. **No `npm test` script** — unit tests exist as `*.test.ts` but no wired runner.
2. **AI Processing Functions are not deployed yet** — authenticated smoke still required after approved Functions deploy.
3. **Print Request indexes not yet added** — current broad reads are acceptable for foundation, but server-side indexed queries are needed before scale.
4. **No `npm test` script / no CI** — tests are run through explicit `npx tsx --test ...`, lint, typecheck, and build commands.
5. **Dirty worktree from recent managed phases** — reconcile or commit before starting Phase 7 implementation to avoid scope mixing.
6. **Portal not built** — customer-facing app is Phase 8; all current UI is Studio.

---

## How to Update This File

1. Read `.cursor/workflow/state.md`
2. Update **Workflow Snapshot**, **Roadmap Phase Status**, and **Next Managed Bug**
3. Move completed items into **Recent Completed Work**
4. Bump **Last updated** date
5. Upload this file to your external AI chat
