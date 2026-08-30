# Smart Profile v28 DEV Calibration — Report

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Amended | 2026-08-25 — six flagship non-mutating observes complete |
| Environment | **fresh-prints-dev** |
| Plans | Calibration + flagship observe (`2026-08-25-smart-profile-v28-flagship-calibration-observe-plan.md`) |
| Flagship results JSON | `docs/workflow/reviews/_calibration-flagship-observe-results.json` |
| Prior 18-run JSON | `docs/workflow/reviews/_calibration-run-dev-results.json` |
| Status | **COMPLETE** — awaiting owner review of final recommendation |
| Final recommendation | **NEEDS CORRECTIVE** |

---

## Final recommendation

### NEEDS CORRECTIVE

v28 is **largely good enough** for most of the 24-fixture set, and five of six flagships pass their owner questions. One **reproduced v28 product defect** blocks refinement signoff for Slice 5 backlog reprocessing:

| Priority | Defect | Evidence |
|----------|--------|----------|
| **P0** | **Highland subject specificity** | Observe `yJm2VBRvecPNjx79aSnK`: `subjects: ["cow"]` only — not `highland cow`. Title + searchConcepts *do* say “highland cow”; structured **subjects** still collapse to generic cow. |

**Not blocking Slice 5 as code defects (owner decisions / notes):**

| Item | Classification |
|------|----------------|
| #21 `F*CK` sanitization | Product-policy question — OCR present, not missing |
| Jimothy `people` (v27) | **Fixed on v28** — not carried forward |
| Checker token mismatches | Checker artifacts (sarcasm/sarcastic, Grinch/grinch) |
| Skeleton/hand pair | Artwork-variant (§E) — not color-parity failure |
| Caps 12/24 | Keep — no saturation |

**Do not** sign off refinement, start Slice 5/6, bulk reprocess, enable Autonomous, or touch production until Highland subject specificity is corrected (or owner explicitly accepts residual risk).

---

## Execution summary (24 fixtures)

| Item | Value |
|------|-------|
| Mutating calibration runs | **18 / 18** → v28 |
| Non-mutating flagship observes | **6 / 6** → v28 candidates |
| Immutability (SHA-256 before/after) | **6 / 6 PASS** — no design writes |
| Aborted | **No** |
| Caps hit | **None** — keep 12 / 24 |
| Live Autonomous | OFF |
| Bulk reprocess | No |
| Cloud deploy for observe | No |

---

## Evidence classification

| Section | Content |
|---------|---------|
| **A** | 24-fixture v28 product evidence (18 mutate + 6 observe) |
| **B** | Historical v27 baseline (six flagships) |
| **C** | Checker / normalization artifacts |
| **D** | True color-variant comparisons |
| **E** | Artwork-variant comparisons |
| **F** | Real v28 profiler failures |
| **G** | Quality notes / acceptable variation |

---

## A — Flagship v28 observe results (non-mutating)

All six: `catalog-enrich-v28` + `smart-profile-normalizer-v2`. Designs unchanged (hash PASS).

| Slot | Design ID | Immut. | v28 subjects | Owner question | Verdict |
|------|-----------|--------|--------------|----------------|---------|
| Highland | `yJm2VBRvecPNjx79aSnK` | PASS | `cow` | Need `highland cow` in subjects | **FAIL** |
| Jimothy | `6x2LyTvG3ewIePeWHanV` | PASS | `raccoon` | Drop unsupported `people`; keep raccoon | **PASS** |
| Plant Goose | `KI7Ncd1O9JCuX9uCq505` | PASS | `goose` | Plant concepts; no bad audience speculation | **PASS** |
| Nurse | `mZWO3Lsra91EhNRNEkhR` | PASS | `brain` + professions `nurses` | Nurse identity; no doctor drift | **PASS** |
| Santa | `W1bwk4jrCoQFn0OiyiSU` | PASS | `Santa Claus` | Search Concepts cleaner vs v27 | **PASS** |
| Summer Vibes | `ltn0gzs2YGXPADqCejr8` | PASS | fruits… | Summer retained; no regression | **PASS** |

### Flagship detail

**Highland — FAIL (v28 reproduced)**  
- Baseline v27: `subjects: [cow]`  
- Candidate v28: `subjects: [cow]`; searchConcepts include `highland cow cartoon`, `cute highland cow`; title names Highland Cow  
- Structured primary subject still generic → **real specificity defect**

**Jimothy — PASS (v27 defect cleared)**  
- Baseline v27: `subjects: [raccoon, people]`  
- Candidate v28: `subjects: [raccoon]` only — unsupported `people` **absent**

**Plant Goose — PASS**  
- `goose` + themes/interests/search: plant lover, gardening, plant mom/dad — useful, not speculative audience inventing

**Nurse — PASS**  
- `professionsGroups: [nurses]`; interests nursing/healthcare; **no** doctor/physician

**Santa — PASS**  
- `Santa Claus`; Christmas humor/sarcasm; searchConcepts more phrase-like than v27 (“santa claus disbelief”, “funny santa christmas shirt”)

**Summer Vibes — PASS**  
- themes include `summer`; interests summer/beach/vacation — no regression

---

## A — Prior 18-fixture v28 runs (summary)

Owner-adjusted (excluding checker false positives): mostly PASS/NOTE. See prior per-design table in git history / raw JSON.

Notable retained:

| # | Design | Review | Note |
|---|--------|--------|------|
| 15–20, 23–24 | books, faith, skeleton, dog mom, logo, halloween, HolyCow, goat | PASS | Solid |
| 7–8 | sarcastic skeleton/hand | NOTE / §E | Artwork variants |
| 9–10 | keepgrowing B/W | PASS | Color parity OK (~0.78) |
| 11–12 | stonernikeswish | NOTE | Moderate color parity (~0.57) |
| 21 | Lastflyingfuck | NOTE (§F/G) | Sanitized `F*CK` — policy |
| 13–14, 22 | Grinch, rights, crazy | NOTE | Variation / soft gaps |

---

## B — Historical v27 baseline (flagships)

| Design | v27 issue | v28 outcome |
|--------|-----------|-------------|
| Highland | generic `cow` | **Still generic in subjects** |
| Jimothy | unsupported `people` | **Cleared** |
| Nurse | nurse via themes more than professions | **professionsGroups: nurses** |
| Plant / Santa / Summer | Acceptable | **Acceptable / improved** |

Do **not** treat cleared v27 issues as open v28 defects.

---

## C — Checker / normalization artifacts

- `sarcastic` vs `sarcasm`
- `grinch` vs `The Grinch`
- `growth` vs `personal growth`
- Literal `fuck` vs sanitized `F*CK`

These inflated automated FAIL counts; not counted as product failures.

---

## D — True color-variant comparisons

| Pair | Overlap | Verdict |
|------|---------|---------|
| keepgrowing B/W | ~0.78 | **PASS** |
| stonernikeswish black/white | ~0.57 | **NOTE** |

---

## E — Artwork-variant comparisons

| Pair | Notes |
|------|-------|
| Sarcastic Skeleton / Hand | Different art subjects — **excluded from color-parity metric** |

---

## F — Real v28 profiler failures

1. **Highland subject specificity** — `subjects` omit highland breed/type when visually + title-supported (**P0 corrective**)  
2. *(Optional owner)* **#21 profanity sanitization** — not missing text; policy whether literal swearing should appear in `visibleText`

---

## G — Quality notes / acceptable variation

- Repeated-run token drift on complex art (Grinch, sarcastic skeleton) — themes often stable; informational  
- Soft text-meta gaps on some typography designs  
- Caps 12/24 unused — **keep**

---

## Caps recommendation

**Keep** `SMART_PROFILE_MAX_ITEMS_PER_DIMENSION = 12` and `SMART_PROFILE_MAX_SEARCH_CONCEPTS = 24`.

---

## Corrective required before Slice 5 (source)

| ID | Change |
|----|--------|
| C1 | Prompt and/or normalizer: preserve **specific** animal identity in `subjects` when confidently supported (e.g. highland cow ≠ cow). Re-observe Highland after fix. |

Do **not** implement C1 in this calibration pass unless owner starts a corrective phase.

---

## Observe mechanism (delivered)

| Artifact | Role |
|----------|------|
| `aiEnrichmentCandidateCore.ts` | Shared pre-persist candidate generation |
| `aiEnrichmentPipeline.ts` | Calls core → then persist |
| `aiEnrichmentObserve.ts` | Core only; six-ID + dev guards; **not** in `index.ts` |
| `calibrationDesignImmutability.ts` | Canonical snapshot + SHA-256 |
| `calibration-flagship-observe-dev.mjs` | Six observes → local JSON |

Immutability: **6/6 PASS**. No design lifecycle mutation.

---

## Human checkpoint

**STOP for owner review.**

- Reply: accept **NEEDS CORRECTIVE** and authorize Highland corrective plan, **or** accept residual Highland risk and override recommendation  
- Do **not** sign off refinement automatically  
- Do **not** start Slice 5 / 6, bulk reprocess, live Autonomous, or production  

---

## Commands / evidence log

```text
2026-08-25 — Formal Review approved_with_changes (R1–R10)
2026-08-25 — Plan amended with R1–R10
2026-08-25 — Implement shared core + observe + immutability + contract tests
2026-08-25 — functions build + 21 contract/pipeline tests PASS; lint PASS
2026-08-25 — calibration-flagship-observe-dev.mjs — 6/6 observed, aborted=false, immutability PASS
2026-08-25 — Final recommendation: NEEDS CORRECTIVE (Highland subjects specificity)
```
