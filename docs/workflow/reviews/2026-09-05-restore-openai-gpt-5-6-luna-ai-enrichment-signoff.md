# Signoff: Restore OpenAI `gpt-5.6-luna` AI enrichment (Phase 1)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-plan.md` |
| Review | `docs/workflow/reviews/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-review.md` |
| IR | `docs/workflow/reviews/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-implementation-review.md` |
| DEV deploy | `docs/workflow/reviews/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-dev-deploy-record.md` |
| Model benchmark | `docs/workflow/reviews/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-model-benchmark-report.md` |
| Owner QA | `docs/workflow/reviews/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-owner-qa-checkpoint.md` |
| Final status | **approved_with_notes** |

---

## Summary

Phase 1 restores OpenAI as an additive selectable vision provider with allowlisted `gpt-5.6-luna`, dual-provider routing (Google / OpenAI), Settings Default AI model = global `visionModelId`, run-scoped overrides, Luna `reasoning_effort: "low"`, and system fallback `gemini-2.5-flash-lite`. DEV deploy + agent QA + three-model benchmark + **Owner Studio QA PASS**. Post-QA polish: Smart Profile footer shows Profile + Normalizer versions (prompt remains in AI suggestions meta).

---

## Changes Delivered

### Behavior
- Additive `gpt-5.6-luna` (OpenAI) alongside Gemini 2.5 / 3.1 Flash-Lite
- Explicit model→provider metadata; no prefix inference
- Settings Default AI model persists `visionModelId`; override never mutates default
- Luna pinned `reasoning_effort: "low"`; Gemini requests omit that field
- Settings-cache clear on enrichment pipeline start (Wave 3)
- Smart Profile AI Review / Design Details provenance: **Profile version** + **Normalizer version** (redundant Prompt version removed from Smart Profile-specific section only)

### Documentation
- Plan, Formal Review, IR, DEV deploy record, model benchmark report, owner QA checkpoint, this Signoff

---

## Tests

### Automated / agent
- Phase 1 focused tests + IR (prior pass)
- DEV QA scripts PASS WITH NOTES (deploy record)
- Three-model DEV benchmark complete (supporting evidence)
- UI polish: `smartProfileDisplay.test.ts` **2/2 PASS**

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Owner Studio QA (Settings / Playground / override / Luna + 3.1 default paths / visual compare) | **PASS** | Owner 2026-09-05 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| DEV deploy | obtained | 2026-09-05 | |
| Owner Studio QA | **PASS** | 2026-09-05 | |
| Signoff + commit + push | obtained | 2026-09-05 | Owner authorized |
| Production deploy | **not required / not authorized** | | |
| Database migration | N/A | | |
| Secrets / env | OPENAI_API_KEY on DEV (values not logged) | 2026-09-05 | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| TD-034 evidence friction | medium | Benchmark: Luna does not close; Gemini 3.1 partial; **separate corrective** |
| Warm Settings cache | low | Mitigated by pipeline cache clear (Wave 3) |
| Studio UI polish not Firebase-deployed | low | Display-only; local/source change — Studio package publish separate |

---

## Deferred Items (Roadmap)

- Phase 2 Firestore model registry
- TD-034 narrow evidence/prompt corrective
- WS6 (parent smart-catalog goal) — still blocked on other gates as previously recorded
- Production promotion of Luna Phase 1

---

## Open Blockers

- [x] None for Phase 1 DEV Signoff

---

## Verdict

**approved_with_notes** — Luna Phase 1 complete on DEV with Owner QA PASS. Notes: TD-034 remains open for a later corrective; DEV default remains `gemini-2.5-flash-lite`; production not authorized; Phase 2 deferred.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Optional Studio rebuild to see footer polish; decide when to plan TD-034 corrective / WS6; production Luna promote only with separate authorization.
