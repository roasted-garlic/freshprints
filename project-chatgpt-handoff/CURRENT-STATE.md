# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-01**

---

## At a Glance

| Field | Value |
|-------|-------|
| **App** | Fresh Prints — DTF design catalog & print planning |
| **Active app** | Fresh Prints Studio (Electron desktop, staff only) |
| **Roadmap phase** | **Phase 6** — Customers and Print Requests PASS with hardening notes; Phase 5 AI Processing maintenance signed off and smoke-tested |
| **Managed workflow goal** | `remove-openai-google-only` — complete; current-state v19 docs alignment in progress |
| **Workflow phase** | Signoff |
| **Status** | **PASS** |
| **Human checkpoint** | **NO** |

---

## Workflow Snapshot (FF)

```txt
Mode:           managed-phase
Goal:           remove-openai-google-only
Phase:          signoff
Status:         complete
Plan:           docs/workflow/plans/2026-07-01-remove-openai-google-only-plan.md
DONE:           yes
```

### Current Signoff

`remove-openai-google-only` is the latest completed AI provider/signoff baseline. User confirmed
manual smoke testing passed on 2026-07-01. The phase removed OpenAI support from Cloud Function
code and UI, made Google AI / Gemini the only AI provider, removed reasoning-effort controls, and
bumped the catalog prompt version to `catalog-enrich-v19`.

`ai-processing-direct-run` remains **PASS WITH NOTES** and is the baseline for the current AI Processing implementation.

Passed:

- Default Gemini vision model is `gemini-2.5-flash-lite`.
- Newer selectable Gemini option is `gemini-3.1-flash-lite`.
- OpenAI model IDs, OpenAI provider resolution, `OPENAI_API_KEY` references in Cloud Function code, and reasoning-effort settings were removed by ADR-FP-040.
- `/settings` includes an owner/admin AI playground for one-off text + image tests through Cloud Functions only.
- AI Review re-runs now use a compact `Re-run AI` action menu instead of a persistent visible model selector.
- Manual AI Processing now runs directly inside the callable instead of enqueueing to a Firestore-trigger hop.
- AI Review sequential processing still runs one design at a time, but no longer waits on a separate trigger round-trip.
- AI Processing is a single playground-style Gemini call (ADR-FP-035/036/039/040): Settings-managed prompt template with server-side `{{excluded_tags}}` replacement, 4-field JSON (`description`, raw `category`, `title`, `tags`) plus optional `suggestedNewTags`, **no** `response_format: json_object`, tolerant server-side JSON extraction.
- One normal Gemini call per success — no empty-output retry and no quality retry; only the transient 429/5xx network retry remains.
- **ADR-FP-039/040/041 (v20 baseline):** the prompt is small and vision-only, plus approved category names only. The full approved category list (with descriptions) and full approved tag list (names/aliases/preferredWhen) are not injected into every call — testing showed full tag-name injection costs ~4.4x per image versus category-names-only (ADR-FP-041), so that stays gated behind a real accuracy test. Approved tag/alias matching, `suggestedNewTags` generation, and category resolution are deterministic server-side steps (`catalogTagResolver.ts`, `catalogThemeCategoryResolver.ts`) that run after the model call, with category resolution running after tag resolution so matched tags feed category scoring. The category resolver trusts an exact (case/punctuation-tolerant) match between the model's answer and an approved category name directly, falling back to the token-overlap/priority-boost scorer only when there's no exact match. Server enforces single-word/deduped/exclusion-filtered tags capped at 8; tag normalization no longer silently rewrites AI word choice (removed hardcoded `funny` synonym folding — ADR-FP-041).
- **ADR-FP-044 (current v21, business-context prompt framing, implemented, not yet deployed):** added a business-context paragraph before the field instructions in `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` — frames the model as cataloging DTF transfer designs for an apparel print shop and instructs it to judge category/title/tags by subject/message/buyer intent rather than visual style/font/decoration, with worked examples (fashion/luxury, school/education, faith/inspirational) showing style-adjacent decoration alone doesn't qualify a design for a themed category. Added after a real report: a sarcastic-joke design ("Lashes longer than my Patience") with lash line-art in elegant script was miscategorized "Luxury & Fashion Inspired" with an invented "Beauty Makeup Cosmetics" title fragment, because the prior prompt gave the model no business context to anchor judgment against. Prompt-content-only change — `catalogThemeCategoryResolver.ts`, `catalogTagResolver.ts`, the tag reranker, and suggestion authoring are all unchanged. Requires `firebase deploy --only functions` before it is live in any environment.
- **ADR-FP-042 (optional tag reranker, implemented, not yet deployed):** an optional second, text-only Gemini call (`catalogTagRerankProvider.ts`) can run after tag resolution to pick better final tags from a compact `approvedTagCandidates` shortlist using the first call's response as context. Never sends the image or the full tag database. Controlled by owner/admin setting `tagRerankMode: "off" | "auto" | "always"` (shipped default `off`; persisted on `settings/aiEnrichment`). `auto` triggers on cheap heuristics (3+ unmatched candidates, <5 of 8 tag slots filled, or 2+ suggestedNewTags). Server-side validation is authoritative — reranker output outside the shortlist is discarded, failures fall back to the pre-rerank server-ranked tags, and `uncoveredConcepts` can only feed `suggestedNewTags` generation, never a direct persisted tag. New Playground callable `testAiEnrichmentTagRerank` (same owner/admin gate as `testAiEnrichmentPlayground`) lets staff test the reranker against real designs and compare cost/quality before enabling `auto` in production. New `aiSuggestions.tagRerank*` fields track status (`skipped`/`succeeded`/`failed`), tokens, and cost per design. Requires `firebase deploy --only functions` before it is live in any environment.
- **ADR-FP-043 (suggested tags as last resort + AI-authored suggestion quality, implemented, not yet deployed):** `suggestedNewTags` generation is now gated by `isSuggestedTagsLastResort` (`catalogTagResolver.ts`) — suggestions only fire with 0-2 approved matches, or exactly 3 matches that are all weak (partial-token-only) with 2+ candidates still unmatched; never with 3 matches including a strong match, and never with 4+ approved matches regardless of remaining room under the 8-tag cap. When the gate fires, an optional text-only "suggestion author" second call (`catalogSuggestedTagAuthorProvider.ts`, prompt version `catalog-suggested-tag-author-v1`) writes a real per-design `preferredWhen` sentence and real aliases per candidate, replacing the old generic template; the model may omit a candidate to decline suggesting it. Controlled by an independent owner/admin setting `suggestionAuthorMode: "off" | "auto" | "always"` (shipped default `off`; persisted on `settings/aiEnrichment`), separate from `tagRerankMode`. When both settings are enabled and both triggers fire for the same design, the two calls merge into one physical Gemini request (extending the reranker's prompt/response schema) instead of two; otherwise the suggestion author runs standalone. Calibration reference is up to 4 real approved tags (name + up to 3 aliases + `preferredWhen` only), selected deterministically by relevance then quality, never randomly. Server-side validation rejects any authored name outside the original candidate list; any failure falls back to the pre-existing server-templated suggestion, never a silent drop. New `aiSuggestions.suggestionAuthor*` fields track status, tokens, and cost per design (combined with `tagRerank*` fields for display when merged). Playground support is deferred to a fast-follow phase. Requires `firebase deploy --only functions` before it is live in any environment.
- `aiSuggestions.model` continues to record the actual model used per run; Processing can pass a one-off model override, Auto advance snapshots it at start, and Settings playground remains unchanged.
- Needs Review / Rejected re-run resets the design back to Processing instead of running AI in place on review tabs.
- Current prompt target is `catalog-enrich-v21`; development fallback target is `catalog-enrich-dev-v21`.
- Latest local audit checks passed: repo lint, root TypeScript, functions TypeScript, functions build, `git diff --check`, and full `npm run build` including Electron packaging.

Notes:

- Cloud Functions changes from the latest provider/prompt work still require a separate human-approved `firebase deploy --only functions` before taking effect wherever not already deployed.
- Recommended next code phase remains `print-request-query-index-hardening`.

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
2. **Functions deploy is a separate human checkpoint** — pushing Cloud Function source to GitHub does not deploy it.
3. **Print Request indexes not yet added** — current broad reads are acceptable for foundation, but server-side indexed queries are needed before scale.
4. **No `npm test` script / no CI** — tests are run through explicit `npx tsx --test ...`, lint, typecheck, and build commands.
5. **Old Firestore AI records may show historical provider/prompt metadata** — do not backfill without an approved migration.
6. **Portal not built** — customer-facing app is Phase 8; all current UI is Studio.

---

## How to Update This File

1. Read `.cursor/workflow/state.md`
2. Update **Workflow Snapshot**, **Roadmap Phase Status**, and **Next Managed Bug**
3. Move completed items into **Recent Completed Work**
4. Bump **Last updated** date
5. Upload this file to your external AI chat
