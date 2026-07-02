# Plan - Current State v19 AI Doc Alignment

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `current-state-v19-ai-doc-alignment`
- **Roadmap phase:** Phase 5 maintenance / Phase 6 readiness documentation
- **Gate:** Plan -> Review -> Implement -> Test -> Signoff
- **Human checkpoint:** None expected. Docs-only correction; no deploy, code, data, or secret changes.

---

## 1. Goal

Align current-state documentation with the actual AI Processing prompt/provider state:

- Current prompt version is `catalog-enrich-v19`.
- Development prompt version is `catalog-enrich-dev-v19`.
- Google AI / Gemini is the only AI provider after ADR-FP-040.
- Stale current-state references to `catalog-enrich-openai-v18`, OpenAI, and reasoning effort should be removed or marked historical.

---

## 2. Scope

| File | Change |
|---|---|
| `.cursor/workflow/state.md` | Track this docs-only managed phase and record the v19 confirmation. |
| `project-chatgpt-handoff/CURRENT-STATE.md` | Refresh the snapshot to the current Google-only/v19 AI state. |
| `project-chatgpt-handoff/07-backend-and-ai-pipeline.md` | Update current AI pipeline/provider/prompt version references. |
| `docs/WORKFLOWS.md` | Update the AI Processing workflow section that still described OpenAI/v17 prompt behavior. |
| `docs/workflow/reviews/2026-07-01-current-state-v19-ai-doc-alignment-test-report.md` | Record verification. |
| `docs/workflow/reviews/2026-07-01-current-state-v19-ai-doc-alignment-signoff.md` | Record signoff. |

No application code, Cloud Functions deploy, Firebase rules, secrets, migrations, dependencies, or data writes.

---

## 3. Verification

Run:

1. `rg -n "catalog-enrich-openai-v18|catalog-enrich-dev-v18|Current prompt target is .*v18|Current target:.*v18|promptVersion: catalog-enrich-openai-v18" .cursor project-chatgpt-handoff docs/WORKFLOWS.md`
2. `rg -n "CATALOG_ENRICHMENT_PROMPT_VERSION|DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION|uses prompt version v19" functions/src/ai`
3. `git diff --check`

---

## 4. Out Of Scope

- Editing historical ADR content.
- Deploying functions.
- Changing prompt text or provider code.
- Migrating old Firestore records with old provider/prompt metadata.
