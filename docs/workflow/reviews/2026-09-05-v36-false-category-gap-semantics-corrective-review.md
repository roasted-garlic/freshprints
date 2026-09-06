# Review: v36 False Category-Gap Semantics Corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-v36-false-category-gap-semantics-corrective-plan.md` |
| Verdict | **approved** |
| Implementation authorized | **YES** — narrow prompt/version corrective only; **STOP before DEV deploy** |

---

## Summary

DEV cucumber (`Y2IQuCgAPgnqrBIeJuap`) under `catalog-enrich-v36` correctly resolved **Funny & Sarcastic**, but hard-blocked on `category_gap_suggested` because the model filled `categoryGapNote` with **fit rationale** (secondary cucumber/food/pin-up). Builder treats any non-empty note as a gap; automation correctly hard-blocks true gaps. v36 omitted the prior NL definition of `categoryGapNote`. Truncation at 240 chars is intentional normalizer max — data layer, not Studio clip. Fix: **`catalog-enrich-v37`** with one general semantic sentence. Do **not** soften the blocker, change resolver, or expand schema.

---

## Required answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Exact raw category | Model chose approved **Funny & Sarcastic** (resolved `categoryId` `tj0HemRh2RuYLfI7N6nO`) |
| 2 | Exact raw alternatives | Not persisted on suggestions for this run (`null`); gap path independent |
| 3 | Exact raw gap note | Model `categoryGapNote` → mapped to evidence (rationale text) |
| 4 | Full untruncated gap note | Stored evidence is **240-char truncated** copy of model note; full model string not separately retained after normalize |
| 5 | Where gap note originated | **Gemini / provider model output** (`categoryGapNote`) |
| 6 | Why `category_gap_suggested` | `smartProfileBuilder`: `categoryGapSuggested = Boolean(trim(categoryGapNote))` → automation hard code |
| 7 | Blocker contract-valid under intended product semantics? | **YES for true gaps; NO for rationale misuse** — blocker application is correct given false signal |
| 8 | v36 remove old field semantics? | **YES** |
| 9 | Prompt corrective sufficient? | **YES** (preferred; no brittle server parse) |
| 10 | Server change required? | **NO** |
| 11 | Automation decision change required? | **NO** |
| 12 | Blocker hardness changed? | **NO** (expected) |
| 13 | Resolver change required? | **NO** |
| 14 | Schema change required? | **NO** |
| 15 | Normalizer change required? | **NO** (240 limit stays; secondary note only) |
| 16 | Next prompt version | **`catalog-enrich-v37`** |
| 17 | Exact proposed added sentence(s) | Owner wording in Plan (alternatives + gap-only-when-no-fit + no justify) |
| 18 | v36 simplicity preserved? | **YES** (~one sentence) |
| 19 | categoryAlternatives behavior | Soft `category_alternatives_present` unchanged |
| 20 | True-gap behavior | Remains hard when note non-empty for genuine no-fit |
| 21 | Reason truncation source | **Normalizer** `SMART_PROFILE_MAX_GAP_EVIDENCE_LENGTH = 240` |
| 22 | Reason-display correction required? | **NO** this pass (false gap fix → empty evidence; limit intentional) |
| 23 | Tests | Prompt contract + automation Cases 1–4 + build/diff-check |
| 24 | DEV deploy surface | Enrichment allowlist class: enqueue, reprocess, worker, playground, start/preview, settings if needed |
| 25 | Verdict | **approved** |
| 26 | Unresolved owner decisions | None for Implement; deploy auth later |
| 27 | Implementation authorized | **YES** |

---

## Checklist

| Area | Status |
|------|--------|
| Scope bounded | pass |
| Architecture | pass — prompt contract only |
| Security / Model 2 | pass — unchanged |
| No blocker softening | pass |
| Test strategy | pass |
| Human checkpoints | pass — deploy after IR |

## Verdict

**approved** — proceed Implement → Test → IR → **STOP before DEV deploy**.
