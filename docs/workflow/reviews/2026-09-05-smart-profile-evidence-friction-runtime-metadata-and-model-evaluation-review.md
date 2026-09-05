# Review: Smart Profile Evidence Friction + Runtime Metadata + Model Evaluation

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-smart-profile-evidence-friction-runtime-metadata-and-model-evaluation-plan.md` |
| Verdict | **approved_with_changes** |
| Implementation authorized | **NO** — Plan→Review→STOP only; owner must separately authorize Implement |

---

## Summary

The plan correctly traces cucumber `Y2IQuCgAPgnqrBIeJuap` to a **contract-valid** `structured_evidence_gap:subjects:woman` caused primarily by **non-self-supporting model copy** under `catalog-enrich-v34` / `gemini-2.5-flash-lite`, not by Explicit/profanity, not by a broken validator, and not by normalizer invention of the gap. Workstream B (footer observability) is low-risk display of already-persisted provenance. Workstream C correctly gates model change behind a Gemini-allowlisted DEV benchmark and marks Luna **not feasible** without a new provider. Hard-blocker softening remains correctly out of scope.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Three workstreams; Explicit ADR-173 parallel; no implement this pass |
| Architecture alignment | pass | Evidence stays in shared decision layer; UI reads provenance |
| Security impact addressed | pass | Model 2 hardness preserved; no production; DEV-only eval |
| Data model impact addressed | pass | No migration for metadata UI |
| Backend impact addressed | pass | Gemini 3.1 already allowlisted; Luna needs provider |
| Test strategy adequate | pass | Evidence + Model 2 + UI fallbacks + benchmark smoke |
| Human checkpoints identified | pass | See Owner Decision Matrix |
| Roadmap alignment | pass | Under smart-catalog completion; TD-034 reopen; WS6 still blocked |
| Documentation plan | pass | TECH_DEBT / ADR on Implement |
| No silent scope expansion | pass | No v35 creation, no model switch, no Autonomous |

---

## Architecture Review

**Findings:**
- Evidence path is correctly identified: enrichment → normalizer → `smartProfileBuilder` → `findStructuredEvidenceGaps` → `catalogAutomationDecision` → provenance → Studio `Would Auto Approve`.
- Corpus fields verified in source: title, description, centralSubject, visibleText only.
- Rejecting “subjects self-validate” is mandatory for Model 2 safety.
- Metadata UI should bind to `smartProfile.provenance`, not live `CURRENT_*` constants.

**Required changes:**
- [ ] None architectural beyond Owner Decision Matrix sequencing

---

## Security Review

**Findings:**
- Softening `structured_evidence_gap:*` would increase false Ready risk under Autonomous — correctly forbidden.
- Adding `searchConcepts` to the evidence corpus without a tight independence policy would weaken the validator (synonym/retrieval field already held “vintage woman” while descriptive copy lacked it).
- Model benchmark must not write production Ready state; DEV/fixture isolation required at Implement.

**Required changes:**
- [ ] At Implement: keep Autonomous OFF unless separately authorized; hard-blocker policy unchanged unless a future dedicated ADR

**Human approval needed before production:**
- [x] Any production deploy / model default change / prompt version bump to production

---

## Data Model Review

**Findings:**
- `SmartProfileProvenance` already includes `normalizerVersion`, `model`, `provider` — cucumber document confirms all three present.
- No schema bump / migration for Workstream B.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Provider target is Google-only (`resolveProviderTarget`).
- `gemini-3.1-flash-lite` is already in `ALLOWED_VISION_MODEL_IDS` and Studio settings options — feasible without new secrets.
- Luna / ChatGPT path does not exist in repo — `[NEEDS PROVIDER/REPO CHECK]` stands; do not invent OpenAI wiring in this corrective.

**Required changes:**
- [ ] First authorized benchmark must be Gemini-only unless owner separately authorizes provider work

---

## Testing Review

**Findings:**
- Plan’s cucumber local reproduction of the evidence gap is sound.
- Require fixtures: (1) supported subject does not false-block; (2) unsupported subject still blocks; (3) Model 2 hard blockers cannot Ready; (4) UI missing provenance fallback.

**Required changes:**
- [ ] None for Plan phase

---

## Documentation Review

**Findings:**
- TD-034 should remain open and marked planning-reopened; expand description to include **subjects** (not only objects) when Implement updates TECH_DEBT.
- Cucumber diagnostic remains accepted contract-correct baseline.

---

## Owner Decision Matrix (Formal Review answers)

| # | Question | Review finding / recommendation |
|---|----------|----------------------------------|
| 1 | Preferred root fix for TD-034 | **Prompt self-consistency (+ optional better model)** — not validator softening |
| 2 | Prompt revision required? | **YES** (future v35) — v34 lacks explicit subject/object↔evidence contract |
| 3 | Normalizer revision required? | **NO** for cucumber root cause |
| 4 | Evidence matching revision required? | **NOT first**; optional later for closed aliases only |
| 5 | Validator hardness change? | **NO** |
| 6 | Exact metadata UI fields | Profile, Prompt, Normalizer, Model; optional Provider |
| 7 | Persisted provenance available? | **YES** (`version`, `promptVersion`, `normalizerVersion`, `model`, `provider`) |
| 8 | Benchmark before source corrective? | **Recommended yes** before model switch; prompt-first allowed if owner prioritizes cucumber |
| 9 | Candidate feasibility | Gemini 3.1 **YES**; Luna **NO** without new provider |
| 10 | Benchmark sample size | **30** recommended (20–50 acceptable) |
| 11 | Owner approval before model switch | **REQUIRED** |
| 12 | Owner approval before prompt/version bump | **REQUIRED** |

---

## Required Changes (approved_with_changes)

Before Implement authorization is accepted, owner must confirm (or override) in workflow state:

1. **Sequencing:** metadata-first → Gemini benchmark → prompt/model corrective (**plan default**) **OR** prompt-first if cucumber urgency wins.  
2. **Corpus policy:** do **not** add `searchConcepts` as evidence in the first corrective unless a separate ADR justifies independence.  
3. **Benchmark scope:** Gemini allowlist only for first run; Luna remains out until provider work is planned.  
4. **Hard blockers:** remain hard; no silent policy change.  
5. **Parallel Explicit work:** ADR-FP-173 QA C continues independently; do not couple Signoff.

Plan text already matches (1)–(5); treat as binding Implement constraints unless owner records a different Decision Log entry.

---

## Blockers

None for Plan quality. **Implement is blocked** until owner issues a separate Implement authorization (and answers sequencing if differing from default).

---

## Verdict Rationale

**approved_with_changes** — plan is accurate, safety-aligned, and actionable; binding Implement constraints and unresolved sequencing preference must be acknowledged before coding. This Formal Review does **not** authorize implementation, model switch, prompt bump, Autonomous, WS6, production, or commit/push.

---

## Next Step

1. Owner reads Plan + this Review.  
2. Owner may continue ADR-FP-173 QA C in parallel.  
3. Owner separately authorizes Implement (with sequencing choice).  
4. Until then: **STOP** — no implementation.
