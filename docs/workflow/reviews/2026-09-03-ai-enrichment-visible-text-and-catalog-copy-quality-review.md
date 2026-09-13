# Review: AI Enrichment Visible-Text and Catalog-Copy Quality

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-03-ai-enrichment-visible-text-and-catalog-copy-quality-plan.md |
| Protected baseline SHA | `125af425` (v31/v5 subject goal) |
| Workspace HEAD | `eac50d6c` (AI Processing queue multi-select; v31/v5 still live) |
| Verdict | **approved_with_changes** |

---

## Summary

Repo inspection confirms the Dolly OCR dump is **instructed by the live lean prompt** and **reinforced by lean title joining + description preservation**. There is no separate OCR engine. OPTION E is the correct architecture. Proposed versions **catalog-enrich-v32** and **smart-profile-normalizer-v6** are justified. Implementation is **not** authorized by this review. Smart Profiling completion remains **queued after this goal**, not started. Subject v31/v5 behavior is a hard regression gate.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Quality corrective only; no Smart Profiling completion |
| Architecture alignment | pass | Prompt + Functions title/desc + shared AI sanitizer |
| Security impact addressed | pass | Less long-text reproduction; no auth change |
| Data model impact addressed | pass | `smart-profile-v1`; no new OCR fields |
| Backend impact addressed | pass | Same four Functions later |
| Test strategy adequate | pass | T1–T10 + FP + subject regression |
| Human checkpoints identified | pass | Implement / deploy / canary / production |
| Roadmap alignment | pass | Owner sequencing recorded |
| Documentation plan | pass | New ADR-FP-160 (not 145) |
| No silent scope expansion | pass | Autonomous/tags/mass reprocess/production out |

---

## Independent FR answers

### FR1. Exact current title-generation path

Gemini JSON `title` + `readableTextLines` + `centralSubject` → `normalizeSimpleCatalogEnrichment` → `buildSimpleCatalogEnrichmentResult` → **`resolveLeanCatalogTitle`** (`functions/src/ai/catalogTitleRules.ts`) → `buildTitleFromReadableTextLines` (join lines, max 24 words, append sanitized `centralSubject`) unless a non-unusable model title **includes** the readable phrase. Fallback: description wording extraction, else generic `Artwork Design`. Legacy `resolveCatalogTitle` (visibleText[0]) is **not** the live Gemini path (`developmentAiEnrichmentProvider` only).

### FR2. Exact current description-generation path

Gemini JSON `description` (prompt: include **all readable text exactly as shown**) → `sanitizeCatalogDescription` (canvas/grey-matte phrases only) → **`.slice(0, 500)`**. No OCR-quality rewrite. `resolveCatalogDescription` / `synthesizeCatalogDescription` (`join(" / ")`) is **not** used on the live lean success path (description is required).

### FR3. Exact current visibleText-generation path

Prompt field **`readableTextLines`** (live JSON). Optional `visibleText` array parsed if present. `buildDesignSmartProfile` → `mergeVisibleTextFromReadableLines(parsed.visibleText, parsed.readableTextLines)` → `normalizeDesignSmartProfile` (item length 120, max 12). Transient `readableTextLines` is **not** persisted on `aiSuggestions`.

### FR4. Current prompt version

**catalog-enrich-v31** (`CATALOG_ENRICHMENT_PROMPT_VERSION`, `CURRENT_CATALOG_ENRICH_PROMPT_VERSION`, reprocess snapshot). Template: `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`.

### FR5. Current normalizer version

**smart-profile-normalizer-v5**.

### FR6. Source of malformed Dolly visibleText

Gemini followed “identify **all** readable text exactly as shown” on sheet-music background; one or more `readableTextLines` became an OCR-like dump; merge copied it into Smart Profile `visibleText`.

### FR7. Whether raw OCR is directly involved

**No** dedicated OCR pipeline.

### FR8. Whether model semantic OCR is involved

**Yes.** Vision model transcription.

### FR9. Whether description echo amplifies it

**Yes.** Prompt requires description to include all readable text; server preserves it.

### FR10. Whether title generation consumes visibleText directly

Live path consumes **`readableTextLines`**, which is the source of `visibleText`. Effectively yes. Additionally, if model title equals/contains the dump, **the dump is kept**.

### FR11. Current visibleText sanitization

Trim, empty drop, max 12, max 120 chars. No underscore/notation/document classifier. Unused `visibleTextValidation` gibberish heuristics are **not** on the live Gemini path.

### FR12. Current title sanitization

Generic/filename/style/description-prose rejection; 24-word normalize; centralSubject append. **Does not** reject OCR dumps.

### FR13. Current description sanitization

Canvas/background-matte phrase stripping + 500-char cap.

### FR14. Chosen semantic text classes

A primary/meaningful, B background/document, C low-confidence OCR — as in the plan.

### FR15. Primary-text behavior

Retain short high-confidence phrases; may inform title/description/searchConcepts.

### FR16. Background-document behavior

Understand semantically (objects/themes/searchConcepts); do not transcribe; keep only short prominent identity text.

### FR17. Low-confidence OCR behavior

Discard from visibleText; must not build title/description.

### FR18. Title anti-OCR contract

Semantic “what the design is”; reject OCR-like candidates even if they match readable lines.

### FR19. Description anti-OCR contract

Summarize composition; no lyric/OCR dump; no `join(" / ")` of noise.

### FR20. visibleText contract

Short meaningful high-confidence phrases only; not a transcript field.

### FR21. Deterministic sanitizer needed

**YES**

### FR22. Prompt change needed

**YES** → v32

### FR23. Title rule change needed

**YES**

### FR24. Description rule change needed

**YES**

### FR25. Smart Profile normalizer change needed

**YES** → v6 (AI-only visibleText sanitize + version stamp). Subject collapse **unchanged** unless tests force a documented tiny interaction.

### FR26. Proposed prompt version

**catalog-enrich-v32** (also `catalog-enrich-dev-v32` if the development constant remains in lockstep)

### FR27. Proposed normalizer version

**smart-profile-normalizer-v6**

### FR28. Exact files proposed

As listed in the plan (constants, new `visibleTextQuality.ts`, `smartProfileNormalization.ts`, `catalogTitleRules.ts`, `simpleCatalogEnrichmentResponse.ts`, `smartProfileBuilder.ts`, tests, ADR at implement).

### FR29. False-positive safeguards

Conservative multi-signal drops; explicit keep set: Class of 2026, John 3:16, Mama's Girl, Smith & Co., Route 66, USA 1776, short slogans, T10 typography.

### FR30. Test matrix

Plan T1–T10 + FP + **SUB** subject suite.

### FR31. Dolly expected output

Illustrative: title like `Dolly Parton I Will Always Love You Sheet Music Portrait`; description summarizing portrait over named sheet music; visibleText `I Will Always Love You`, `Dolly Parton` (minor words like Ballad optional).

### FR32–FR38. Scenario tests

Sheet music / newspaper / book-page / handwritten letter / slogan / numeric-date-reference / text-heavy typography — as plan T1–T10/FP.

### FR39. Algolia impact

No index schema change. Cleaner `title`, `searchText` (includes description), `visibleText`. `visibleText` remains searchable, not faceted. No full reconcile this goal.

### FR40. Firestore impact

Same design fields; values change on re-enrich only. **No Rules change.**

### FR41. Schema impact

**None.** `smart-profile-v1`.

### FR42. Migration impact

**None.**

### FR43. Studio runtime impact

**None** required. Staff-edited visibleText stays authoritative.

### FR44. Portal runtime impact

**None** required. Search quality improves after re-enrich + later index update of those records.

### FR45. Functions deployment impact

Later DEV allowlist: `enqueueAiEnrichment`, `onCatalogReprocessJobWritten`, `startCatalogReprocessJob`, `previewCatalogReprocessJob`. Production **not** authorized.

### FR46. Ready Catalog full reprocess required

**NO**

### FR47. AI Review full reprocess required

**NO**

### FR48. Targeted canary recommendation

Bounded Ready/AI Review IDs (≤ recommended 10): Dolly (or equivalent), slogan shirt, text-heavy typography, optional newspaper-like if available. Owner PASS/FAIL. Reprocess confirmation phrases unchanged.

### FR49. v31/v5 subject behavior preserved

**YES** (required). STOP if title/visibleText cleanup changes subject tests.

### FR50. staff/import precedence preserved

**YES** — sanitizer not in `normalizeSmartProfileDimensions`; staff keys still win on merge.

### FR51. Autonomous remains OFF

**YES**

### FR52. Tag retirement performed

**NO** (forbidden)

### FR53. ADR amendment/new ADR required

**YES — new ADR-FP-160** at implement. Do **not** amend ADR-FP-145 except a one-line “related” pointer if useful.

### FR54. Next queued goal = Smart Profiling completion

**YES** (after this goal closes; do not auto-start)

### FR55. Any [NEEDS OWNER DECISION]

**None** for schema/product fork. Workflow: owner must authorize **Implement** separately.

---

## Architecture Review

**Findings:**

- Live path is lean prompt + `simpleCatalogEnrichmentResponse`, not the old `CATALOG_ENRICHMENT_SYSTEM_PROMPT` OCR-every-word body — but both encode the same dump philosophy.
- OPTION A fails because `resolveLeanCatalogTitle` **keeps** a dump-shaped model title when it contains readableTextLines.
- OPTION B cannot produce “Sheet Music Portrait” identity without prompt/title semantics.
- Normalizer v6 is warranted so pipeline-status / reprocess snapshots match AI visibleText rules; staff path already splits at `normalizeSmartProfileDimensions`.

**Required changes:**
- [x] See Required Changes below (title dump win-condition, description fallback ban, V31 previous-default snapshot).

---

## Security Review

**Findings:** Reducing bulk lyric/document transcription lowers accidental copyright reproduction in catalog fields. No secrets, Rules, or public API expansion.

**Required changes:**
- [ ] None beyond plan copyright guidance in prompt.

**Human approval needed before production:**
- [x] Production remains unauthorized.

---

## Data Model Review

**Findings:** No new fields. visibleText meaning tightens. Do not add `rawOcr`.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:** Same Functions graph as v31 deploy. `catalogEnrichmentRetry` remains unused live — do **not** expand this goal into reviving a second enrichment pass unless tests prove sanitizer+prompt insufficient (that would be scope expansion → re-review).

**Required changes:**
- [ ] None beyond stated files.

---

## Testing Review

**Findings:** Plan matrix is adequate. Subject canonicalization tests are a **hard gate**. Live Gemini is not CI; canary is the live proof.

**Required changes:**
- [x] Include an automated case that a dump-shaped **model title** matching dump `readableTextLines` is **rejected**, not kept.

---

## Documentation Review

**Findings:** ADR-FP-160 is correct. Settings previous-default helper currently ends at **v29** — implement must snapshot v31 (and preferably v30 if still in the wild) so Studio “use current default” upgrades dump prompts.

---

## Required Changes (if approved_with_changes)

1. **Title dump win-condition:** OCR-like model titles must be unusable even when they contain/equal `readableTextLines`. Add a regression test for this.
2. **Description:** Do not preserve OCR/lyric dumps; do **not** use `visiblePhrases.join(" / ")` as the rewrite for document/OCR cases.
3. **Staff safety:** Sanitizer must not run on `normalizeSmartProfileDimensions` / staff edit callable.
4. **Settings auto-upgrade:** Add `PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31` (current default body) to `isPreviousDefaultAiEnrichmentPromptTemplate`.
5. **Subject gate:** Run existing `smartProfileSubjectCanonicalization` tests; if they fail because of this work, STOP and document — do not silently retune subjects.
6. **Version lockstep:** Bump prompt/normalizer constants **and** reprocess snapshots together.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

The plan matches source, chooses E for documented reasons, preserves schema and sequencing, and names exact files/versions. Conditional approval locks the Dolly title-path bug and staff/subject safety so implement cannot “prompt-only” the title resolver.

---

## Next Step

**Await owner authorization to Implement.** Then implement approved scope + required changes only. No deploy, reprocess, Autonomous, tag retirement, commit/push, or production until later gated steps.
