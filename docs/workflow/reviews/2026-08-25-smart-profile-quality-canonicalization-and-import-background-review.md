# Review: Smart Profile Quality + Canonicalization (+ Import Background) — Amended

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Amended | 2026-08-25 — profiler-quality depth required before implement |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-25-smart-profile-quality-canonicalization-and-import-background-plan.md` (amended) |
| Verdict | **approved_with_changes** |
| Implement | **Authorized DEV only** 2026-08-25 — owner corrections below binding |

## Owner corrections (2026-08-25 — binding)

1. **No curated Smart Profile seed list** — vocabulary from existing Smart Profile / auto top-N only; novel concepts allowed immediately (e.g. highland cow when clearly depicted).
2. **Safe deterministic canonicalize only** — case/whitespace/punct/separators/obvious singular-plural + exact match to existing canonical; **no** broad semantic synonym collapse (teacher≠educator, cow≠highland cow, etc.). Prefer model reuse via bounded context.
3. **Caps calibration-gated** — do **not** auto-raise 12/24; measure truncation first; smallest increase only with size proof.
4. **Hard core-identity checks** — ~80% overlap insufficient alone; FAIL if primary identity (highland cow, text meta, profession, holiday, visible text) disappears across runs/color variants.

---
| Gate | **Blocks Slice 5** until refinement signed off |

---

## Summary

Owner approved import background/halftone locks and withheld implement until profiler quality was specified at implementation depth. Amended plan now locks text-dominant profiling, per-dimension thoroughness, structured vs Search Concepts, Stage‑1 canonicalization (**A+B+D**), color-variant parity, caps, metrics, calibration set shape, and `smart-profile-v1` + `catalog-enrich-v28` / `normalizer-v2`. Background/halftone locks remain approved. **STOP for owner** — confirm amended locks; supply fixture list; implement still requires separate authorization.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Profiler depth concrete | pass | Part I §§I.0–I.15 |
| Background/halftone locks retained | pass | Owner-approved |
| Canonicalization architecture selected | pass | Stage 1 A+B+D; Stage 2 C optional |
| Schema version decision | pass | Stay v1 unless shape changes |
| Root cause from repo | pass | Prompt + missing vocab + weak normalizer |
| Caps vs spam | pass | Modest raise + thoroughness rules |
| Calibration / metrics | pass | Fixture IDs need owner |
| Slice 5 blocked | pass | Explicit |
| No implementation | pass | |

---

## Architecture decisions (locked)

### Canonicalization — Stage 1 (required) — owner-corrected

1. **A** Deterministic **safe** normalize only (case/whitespace/punct/separators/obvious singular-plural; exact match)  
2. **B** Bounded **auto-derived** vocab context (Algolia facet top-N for facetable dims; optional cached auto snapshot for others — **no manual curated seed list**)  
3. **D** Post-generation **exact/canonical** match onto bounded vocab; preserve unmatched novel terms  

**Forbidden:** hand-curated highland cow/santa lists; loose semantic synonym tables (teacher→educator, cow→highland cow, etc.).

### Caps — owner-corrected

- **Keep current caps** (`12` / `24` / Algolia `16`) unless DEV calibration proves truncation of useful concepts  
- Cap is a ceiling, not a target — do not fill arrays to capacity  

### Consistency — owner-corrected

- Aggregate overlap metrics **plus** hard primary-identity checks (FAIL if core concept disappears despite high Jaccard)  


---

## Background / halftone (reconfirmed approved)

Unchanged from prior Formal Review + owner approval: separate concepts; `artworkBackgroundHex`; `#2c2d2d` dark; code-first detector; session import controls; precedence; provenance; preserve AI Review toggle + Halftone filter; reprocess preserves backgrounds by default.

---

## Required changes before implement authorization

1. Owner **confirm amended Formal Review locks** (profiler Part I).  
2. Owner provide **[NEEDS OWNER FIXTURE]** list (~20–30 DEV designs covering required categories).  
3. Owner send separate **authorize implement** message (still not granted).  

---

## Owner decisions now

1. Confirm amended profiler Formal Review locks?  
2. Fixture list when ready ([NEEDS OWNER FIXTURE])  
3. Implement authorization — **later**, not in this message  

---

## Acceptance criteria map (amendment)

| # | Criterion | Met? |
|---|-----------|------|
| 1–11 | Text / dims / spam / reuse / architecture / novelty / color / specificity / contextual / searchConcepts / caps | yes |
| 12 | Calibration set defined | shape yes; IDs **[NEEDS OWNER FIXTURE]** |
| 13–17 | Metrics / consistency / Algolia / v1 / versions | yes |
| 18–19 | Files + DEV plan | yes (implement when authorized) |
| 20 | Slice 5 blocked | yes |

---

## Verdict Rationale

Amended plan is now implementation-ready for profiler quality at the same specificity as background/halftone. Verdict **approved_with_changes**: fixture IDs outstanding; implement still withheld by owner.

---

## Next Step

**STOP.** Await owner confirmation of amended locks + fixture list. Do not implement, deploy, or start Slice 5.
