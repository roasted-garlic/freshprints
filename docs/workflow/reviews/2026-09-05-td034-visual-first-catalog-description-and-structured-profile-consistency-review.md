# Review: TD-034 Visual-First v36 + Playground/Processing Parity (Diagnostic Reconciliation)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-td034-visual-first-catalog-description-and-structured-profile-consistency-plan.md` |
| Verdict | **approved** |
| Implementation authorized | **YES** — prompt/version/schema-parity + `excluded_tags` required-placeholder relaxation only; **STOP before DEV deploy** |

---

## Summary

Mechanical diagnosis explains the owner’s DEV observation without requiring product architecture changes: **`promptVersion` is a deployed code constant** (live DEV stamps `catalog-enrich-v35`); **Playground uses request-body editor text** while **Processing uses persisted Settings**; Suggested Tags + Tag Rerank Succeeded are the **legacy tag pipeline** fed by primary tag candidates (consistent with a non-`tags:[]` Processing prompt). Visual-first **`catalog-enrich-v36`** as code default + shared canonical response stripping is approved. **Do not retire Tag Rerank.** Prior local v36 WIP is **unauthorized** and must be reconciled to the owner-approved prompt (including **no** `{{excluded_tags}}` in default / required set).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Diagnose + v36 default + parity; no tag retirement |
| Architecture alignment | pass | Existing parse/settings/cache paths |
| Security impact | pass | No Model 2 / blocker change |
| Data model | pass | No schema migration |
| Backend | pass | Prompt constants + Functions consumers on later deploy |
| Test strategy | pass | Focused contracts + build |
| Human checkpoints | pass | Deploy auth after IR |
| Roadmap | pass | TD-034; WS6 blocked; registry deferred |
| No silent scope expansion | pass | Tag Rerank diagnostic only |

---

## Diagnosis acceptance (Review)

| # | Finding | Accepted |
|---|---------|----------|
| 1 | `promptVersion` = code constant; Settings text does not create v36 | YES |
| 2 | Playground = request override (unsaved OK) | YES |
| 3 | Processing = persisted Settings; pipeline clears settings cache each run | YES |
| 4 | Playground vs Design Details = different pipeline stages (intentional) | YES |
| 5 | Suggested Tags = `aiSuggestions.tags` from primary→resolve→optional rerank | YES |
| 6 | `tags:[]` ≠ full AI tag retirement | YES |
| 7 | Unknown `prompt` stripped; `promptVersion` provenance kept | YES |
| 8 | Remove `{{excluded_tags}}` from default + required placeholders; keep post-parse exclusions | YES |

---

## Implementation authorization

Implement **is authorized** for:

1. Set `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` to owner-approved text (no excluded_tags line).
2. Pin all version constants to `catalog-enrich-v36` (do not stamp v35 after bump).
3. Archive v35 as previous-default; keep auto-upgrade + custom preserve.
4. Required placeholders = `{{approved_categories}}` only.
5. Playground/Processing canonical strip parity (already/WIP reconcile).
6. Tests + ADR/TECH_DEBT/IR.

**Not authorized:** Tag Rerank retirement, Option B, evidence/matcher/blocker/Model 2/normalizer/schema bumps, UI redesign, DEV/prod deploy, commit/push.

---

## Verdict

**approved** — proceed Implement → Test → IR → **STOP before DEV deploy**.
