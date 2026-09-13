# TD-034 / catalog-enrich-v35 — Cucumber Owner QA Checkpoint

**Date:** 2026-09-05  
**Environment:** `fresh-prints-dev`  
**Design:** `Y2IQuCgAPgnqrBIeJuap`  
**Deploy revisions:** see workflow STOP report  
**Raw capture:** `docs/workflow/reviews/_td034-v35-cucumber-qa-dev-results.json`

## Mechanical result (fresh reprocess)

| Field | Value |
|---|---|
| Model | `gemini-2.5-flash-lite` (default; no override) |
| Prompt | `catalog-enrich-v35` |
| Normalizer | `smart-profile-normalizer-v6` |
| Smart Profile | `smart-profile-v1` |
| AI title | `When Life Gives You Cucumbers Go Fuck Yourself` |
| AI description | `The design features a vintage illustration style with distressed typography.` |
| centralSubject | *(absent)* |
| subjects | `["woman"]` |
| objects | `["cucumber"]` |
| visibleText | `WHEN LIFE GIVES YOU` / `Cucumbers` / `GO FUCK YOURSELF...` |
| Hard blockers | `structured_evidence_gap:subjects:woman` |
| Soft reasons | *(none persisted)* |
| Would Auto Approve | **NO** (hard blocker present; no `shadow_would_auto_approve`) |
| Lifecycle | `imported` / `needs_review` (shadow; Autonomous OFF) |
| Explicit preview | wouldMarkExplicitContent **true**, applied **true**, terms `["fuck"]` |
| Censored terms | `["fuck"]` |

## Classification

**Case A — `PROMPT SELF-CONSISTENCY NOT RELIABLY FOLLOWED`**

Model still emits `subjects=["woman"]` while title, description, centralSubject, and visibleText do **not** provide trustworthy lexical support for `woman`.  
`searchConcepts` includes woman-related phrases (`vintage woman`, `pin-up girl`, `girl holding cucumber`) but searchConcepts is **not** evidence.

Prior `subjects:woman` blocker: **still present**.  
No new hard blockers beyond that gap.

## Owner result (recorded)

`TD-034 CUCUMBER: FAIL: catalog-enrich-v35 did not resolve the existing structured_evidence_gap:subjects:woman. The model still emits woman as a subject without supporting it in title, description, centralSubject, or visibleText.`

**Secondary TD-034 sample:** not started.

**Follow-on:** Plan amendment + Formal Review for post-v35 deterministic corrective (no Implement until owner chooses OPTION A vs OPTION B).
