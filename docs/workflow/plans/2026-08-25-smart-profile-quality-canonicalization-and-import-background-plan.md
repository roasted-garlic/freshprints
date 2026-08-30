# Plan: Smart Profile Quality + Canonicalization (+ Import Halftone / Artwork Background)

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Amended | **2026-08-25** — Owner: approve background/halftone locks; **do not authorize implement** until profiler-quality portion is concrete (this amendment) |
| Author | Planning Agent |
| Status | implement_authorized — DEV only; owner corrections 2026-08-25 binding; **C2 Auto detector corrective added 2026-08-25** |
| Workflow | managed-phase |
| Goal | `smart-catalog-intelligence-unattended-enrichment` |
| Placement | **Between Slice 4 (signed off) and Slice 5** — **blocks Slice 5** until this refinement is signed off |
| Parent | `docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md` |
| Runtime | **Not authorized** — Plan + Formal Review amendment only |

---

## Goal

Two equally required deliverables before Slice 5:

1. **Substantially improve Smart Profile profiling quality + canonicalization** so Slice 5 backlog reprocess does not amplify shallow/inconsistent profiles  
2. **Import-stage + code-first artwork background / halftone batch overrides** (owner-approved locks retained)

This is **not** a small bounded cleanup of the profiler. Slice 5 remains blocked until both sides are implemented, calibrated, and signed off.

---

## Owner authorization status (2026-08-25)

| Item | Status |
|------|--------|
| Background / halftone Formal Review locks | **APPROVED** |
| Profiler quality Formal Review (this amendment) | Awaiting re-review + owner confirm |
| Implement | **NOT authorized** |

---

# Part I — Smart Profile Quality + Canonicalization (REQUIRED DEPTH)

## I.0 Repo root-cause audit (verified)

| Layer | Finding | Path / constant |
|-------|---------|-----------------|
| Schema | `smart-profile-v1` — 11 open `string[]` dims | `smartProfile.types.ts` |
| Persist caps | 12 / dim; 24 searchConcepts; string len 64 (visibleText 120) | `SMART_PROFILE_MAX_*` |
| Algolia | Most dims max 12; searchConcepts **16** on index; facets exclude objects/searchConcepts/visibleText | `portalCatalogAlgoliaRecord.ts` |
| Normalizer | Whitespace + case-dedupe + caps only — **no** plural/synonym/canonical fold | `smartProfileNormalization.ts` |
| Prompt | `catalog-enrich-v27` — dims described briefly; **no** Smart Profile vocab inject; no per-dim thoroughness mandate; no text-concept checklist for Search Concepts | `aiEnrichment.constants.ts` `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` |
| Taxonomy inject | Categories yes; approved tags **not** in lean prompt (ADR-FP-041); **no** existing Smart Profile value frequencies | `simpleCatalogEnrichmentPrompt.ts`, `loadAiCatalogReferenceSnapshot.ts` |
| Builder | Maps parse → normalize; does not rewrite specificity | `smartProfileBuilder.ts` |

**Root cause (Formal Review lock):** quality failures are primarily **prompt underspecification + missing bounded vocabulary bias + weak post-generation canonicalization**, not “caps alone.” Caps may be raised modestly where Algolia/Firestore allow, but raising caps without (1)–(3) will not fix Highland/Jimothy/color-variant inconsistency.

**Versioning (Formal Review lock):** Keep **`smart-profile-v1`** if dimension shape unchanged. Bump prompt to **`catalog-enrich-v28`** (and `smart-profile-normalizer-v2` for new canonicalize rules). Propose **`smart-profile-v2` only** if persisted shape changes — then STOP for owner before implement. Do not create v2 for prompt-only quality.

---

## I.1 Text-dominant / wording-is-the-design profiling

**Requirement:** When wording is the design (typography, quotes, sayings, slogans, sarcasm, humor, profession/holiday sayings, text with minimal decoration), the profiler must reliably emit **supported** Search Concepts / themes / interests such as (when genuinely apply):

- `text`, `typography`, `quote`, `saying`, `slogan`  
- plus design-specific discovery phrases (e.g. `nurse humor`, `funny nurse shirt`)

**Must not:** blindly stamp every text design with every meta-term.

**Owner regression:** same artwork in white vs black ink — only one got a text-related Search Concept → **required calibration case** (color-variant parity §I.6).

**Implementation strategy (repo-backed):**
1. Prompt: explicit “text-dominant checklist” — if `readableTextLines` non-empty and visual subject is absent/minimal, require evaluation of text meta-concepts and shopper search phrases derived from the wording  
2. Soft post-check: if readable text present and zero of {text, typography, quote, saying, slogan, …} appear in themes/styles/searchConcepts when text-dominant heuristic fires → flag for Needs Review Soft concern / calibration metric (not necessarily hard blocker for Manual/Shadow)  
3. Do **not** use display `artworkBackgroundHex` as a semantic signal

---

## I.2 Deep per-dimension decomposition

AI must **deliberately evaluate every** Smart Profile dimension on every run:

`subjects`, `objects`, `styles`, `themes`, `interests`, `professionsGroups`, `occasions`, `places`, `colors`, `visibleText`, `searchConcepts`

- Empty `[]` is valid when unsupported  
- Must not stop after 2–3 obvious concepts when more **distinct, useful, evidence-supported** concepts exist  
- Goal: thorough description — **not** keyword stuffing, filler, hallucination, or artificially tiny profiles

Prompt must instruct systematic pass per dimension (checklist), not a single vague “arrays of concise terms.”

---

## I.3 Structured dimensions vs Search Concepts

| Layer | Role | Rules |
|-------|------|-------|
| **Structured dims** | Canonical, reusable, concise, stable, evidence-grounded identity | Prefer one canonical subject (`raccoon`) not near-duplicate synonym pile |
| **Search Concepts** | Synonyms, colloquial shopper language, multi-word retrieval, related supported intent | `trash panda`, `funny raccoon`, `wildlife humor` OK here |

Example locked:

- Subjects: `raccoon`  
- Search Concepts: `raccoon`, `trash panda`, `funny raccoon`, `wildlife humor`  

Do **not** dump `cute raccoon` / `wild raccoon` / `trash panda` into Subjects as separate taxonomy values unless they are genuinely different supported identities.

---

## I.4 Canonical vocabulary reuse (core — not optional polish)

Profiler must **strongly prefer** existing commonly used Smart Profile values for the same concept.

Avoid explosion: `cute` / `cutesy` / `super cute` / `adorable style` / …

**Must not recreate old approved-tag system:**

- No owner approval for every new term  
- No manual alias governance board  
- No fixed closed vocabulary  
- No suggested-tag workflow  
- No 8-tag-style hard product cap  
- No tag/category coupling  

Vocabulary stays AI-native and open-ended: reuse when equivalent; invent when genuinely new.

---

## I.5 Canonicalization architecture — **SELECTED**

Formal Review selects staged hybrid:

### Stage 1 (this refinement — required before Slice 5) — owner-corrected 2026-08-25

| Mechanism | Role |
|-----------|------|
| **A. Deterministic safe normalization** | Case/whitespace/punct/separators; obvious singular/plural where meaning preserved; exact normalized match to existing canonical. **No** broad semantic synonym table. |
| **B. Bounded auto-derived vocabulary context** | Top-N from existing catalog intelligence (Algolia facets where facetable; auto snapshot otherwise). **No** manually curated highland cow/santa/nurse seed list. Novel supported concepts allowed immediately. |
| **D. Post-generation exact/canonical matching** | Match onto bounded vocab by safe normalize key only; preserve unmatched novel terms |

### Caps (owner-corrected)

Keep current caps unless calibration proves truncation. Do not auto-raise to 16/20.

**Rejected as sole approach:** loading all Smart Profiles or all approved tags into every enrichment call (ADR-FP-041 class cost).

---

## I.6 Color-variant semantic consistency

**Principle:** Same artwork in different printable colors → **substantially equivalent** semantic profile.

| Expected equivalent | Expected different |
|---------------------|--------------------|
| Subjects, Objects, Styles, Themes, Interests, Professions/Groups, Occasions, Places, Visible Text, Search Concepts (core) | **Colors** |

Minor model jitter OK. Major discovery concepts randomly appearing/disappearing across white vs black text variants = **FAIL** for calibration.

Regression fixture: white-text + black-text pair of same saying design — **[NEEDS OWNER FIXTURE]** IDs.

---

## I.7 Subject specificity

Preserve Highland lesson: prefer `highland cow` over only `cow` when confident. Broader terms may also appear where useful. Do not invent uncertain breeds.

---

## I.8 Contextual evidence (Slice 4 override retained)

No global semantic denylist. Structured fields more evidence-constrained than Search Concepts. Jimothy-class `people` without support → inconsistency; genuine people art → valid.

---

## I.9 Search Concept quality

Expand discovery with useful shopper phrases when supported. Avoid chopped OCR fragments, meaningless permutations, awkward redundancy, unsupported audience guesses.

Prefer e.g. `funny nurse shirt`, `nurse humor`, `nursing gift` when wording/visual supports.

---

## I.10 Coverage / caps (owner-corrected 2026-08-25)

| Constant | Current | This refinement |
|----------|---------|-----------------|
| `SMART_PROFILE_MAX_ITEMS_PER_DIMENSION` | 12 | **Keep 12** unless DEV calibration proves truncation |
| `SMART_PROFILE_MAX_SEARCH_CONCEPTS` | 24 persist / 16 Algolia | **Keep** unless size+usefulness evidence justifies change |
| String lengths | 64 / 80 | Keep unless calibration shows truncation |
| Prompt | per-dim checklist | Instruct thoroughness within caps; quality over stuffing |

Caps are ceilings, not targets. Do **not** auto-raise. Spam remains forbidden.

---

## I.11 Calibration set (~20–30 designs) — BEFORE Slice 5

Must include categories:

- text-only; typography-heavy  
- white/light text; black/dark text; **same-design color variants**  
- text + illustration; illustration-only  
- animals; profession; holiday; sarcasm/humor; hobby; places  
- simple logo-like; visually complex  
- Known Slice 2 cases where available: Highland, Jimothy, Santa, plant  

**Exact design IDs / asset paths:** **[NEEDS OWNER FIXTURE]** — owner supplies DEV fixture list before implement QA. Plan must not invent IDs.

Use real Fresh Prints artwork on `fresh-prints-dev`.

---

## I.12 Quality metrics (lightweight acceptance)

| Metric | Intent |
|--------|--------|
| Text-design concept coverage | Text-dominant fixtures emit ≥1 appropriate meta concept when warranted |
| Dimension coverage | Count of non-empty dims when content supports more |
| Useful values / populated dim | Median count; watch spam |
| Canonical reuse rate | Share of tokens matching bounded vocab |
| Near-duplicate rate | Same-dim near-synonym clustering |
| Unique-value growth / dim | Facet cardinality trend (bounded) |
| Color-variant semantic parity | Core dims Jaccard / set-equality excluding colors |
| Subject specificity | Highland-class fixtures |
| Unsupported structured rate | Jimothy-class |
| Search Concept usefulness | Manual + soft rules (no OCR scrap) |
| Reprocess consistency | Same design 2–3 runs: core identity stable |

No full analytics platform.

---

## I.13 Reprocess consistency (acceptable before Slice 5)

Same design reprocessed need not be byte-identical. **Acceptable:** ≥ ~80% overlap on structured core dims excluding `colors` across 2 consecutive runs on calibration set average; no disappearance of primary subject/theme that title/visible text clearly support. Formal Review may tune threshold after first DEV calibration pass.

---

## I.14 Search / facet impact (Slice 3)

| Concern | Mitigation |
|---------|------------|
| Facet cardinality growth | Bounded vocab reuse + dim caps; monitor Algolia facet counts on DEV |
| Smart Filter usefulness | Prefer canonical values → cleaner facet UI |
| Algolia record size | Soft max 10KB; measure after cap raise; trim searchConcepts projection first if needed |
| Ranking / text search | Title/description remain primary; Smart Profile expands filters — do not spam searchConcepts |
| Legacy tags | Coexist until Slice 6 retirement gate |

Richer profiles must increase **organized** coverage, not vocabulary entropy.

---

## I.15 Prompt / pipeline implementation strategy

| Change | File(s) |
|--------|---------|
| Prompt v28 text-dominant + per-dim checklist + structured vs searchConcepts + reuse instruction | `packages/shared/src/constants/aiEnrichment.constants.ts`; version in `functions/src/ai/catalogTitleRules.ts` |
| Bounded vocab inject helper | New `functions/src/ai/smartProfileVocabContext.ts` (+ Algolia facet top-N fetch or cached snapshot doc) |
| Normalizer v2 equivalence | `packages/shared/src/utils/smartProfileNormalization.ts` + constants |
| Cap constants | `packages/shared/src/constants/smartProfile.constants.ts`; Algolia projection |
| Builder wire-up | `smartProfileBuilder.ts` / pipeline after parse |
| Tests | Normalization, vocab map, color-variant fixtures, text-dominant soft checks |

**Not** the strategy: “just make the prompt longer” without vocab + normalizer + calibration.

---

# Part II — Import Halftone / Artwork Background (APPROVED LOCKS)

Retained without change from owner approval:

- Halftone ≠ background; ADR-FP-080; AI Review toggle + catalog filter preserved  
- Reuse `artworkBackgroundHex`; Dark = `#2c2d2d`; Light = grey default behavior  
- Code-first detector; no extra AI image views; dark mat ≠ halftone  
- Import: Halftone Normal | All halftones; Background Auto | All light | All dark  
- Session-scoped; precedence 1 override → 2 all-halftone dark → 3 auto → 4 light  
- Provenance: `import_override` | `import_halftone_default` | `code_auto` | `staff_manual`  
- Slice 5/6 preserve existing backgrounds by default  

(See prior Formal Review + §A–E of original plan for full paths.)

---

## Combined out of scope

- Implementation / deploy from this amendment command  
- Slice 5 / 6 execution; live Autonomous; production  
- Tag retirement; category auto-create; closed tag taxonomy revival  
- Extra paid AI image variants for background  
- Inventing fixture IDs  

---

## Combined human checkpoints

1. Owner approve **amended** Formal Review (profiler depth + prior bg locks)  
2. Owner supply **[NEEDS OWNER FIXTURE]** calibration list (~20–30)  
3. Owner authorize **implement** (separate message)  
4. DEV deploy + calibration PASS metrics  
5. Signoff → then Slice 5 may be authorized  

---

## Acceptance criteria (amended Plan + Review must answer)

1. Text-only profiling method — **yes §I.1**  
2. Every dimension systematically evaluated — **yes §I.2**  
3. Richer coverage without spam — **yes §I.2–I.3, I.10**  
4. Canonical reuse — **yes §I.4–I.5**  
5. Selected architecture — **Stage 1: A+B+D; Stage 2 optional C**  
6. New vocabulary still possible — **yes §I.4**  
7. Color-variant testing — **yes §I.6, I.11**  
8. Subject specificity — **yes §I.7**  
9. Contextual unsupported — **yes §I.8**  
10. Search Concepts improved — **yes §I.9**  
11. Caps — **yes §I.10**  
12. Calibration set shape — **yes §I.11** ([NEEDS OWNER FIXTURE] for IDs)  
13. Quality metrics — **yes §I.12**  
14. Reprocess consistency — **yes §I.13**  
15. Algolia/facet impact — **yes §I.14**  
16. Schema stays v1 — **yes §I.0**  
17. Prompt/pipeline versions — **v28 + normalizer-v2**  
18. Exact files — **yes §I.15 + Part II paths**  
19. DEV test/deploy plan — Formal Review  
20. Slice 5 blocked until signoff — **yes**  

---

## Amendment — C2 Auto detector false positives (2026-08-25)

Owner QA after prior background corrective: Auto Dark **false positives** on dense/structured light art; cream poodle remains true positive.

- Separate plan: `docs/workflow/plans/2026-08-25-auto-background-detector-false-positive-corrective-plan.md`
- Formal Review: `docs/workflow/reviews/2026-08-25-auto-background-detector-false-positive-corrective-review.md` (**approved_with_changes**)
- Does **not** mix with **C1** Highland subject-specificity corrective
- Changes **Auto detector only**; precedence / pickers / all-halftones unchanged
- **Awaiting owner manual QA** — no refinement signoff
