# Implementation Review: AI Enrichment Visible-Text and Catalog-Copy Quality

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Implementation Review |
| Plan | `docs/workflow/plans/2026-09-03-ai-enrichment-visible-text-and-catalog-copy-quality-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-03-ai-enrichment-visible-text-and-catalog-copy-quality-review.md` |
| Baseline SHA | protected `125af425`; workspace HEAD `eac50d6c` |
| Verdict | **approved_with_notes** |

---

## Summary

OPTION E is implemented: prompt **catalog-enrich-v32**, AI-only `visibleTextQuality` sanitizer, lean title anti-OCR guard, description dump stripping, and normalizer **smart-profile-normalizer-v6**. Schema remains `smart-profile-v1`. Subject F1–F7 + Gate I/shadow regressions **PASS**. Functions build and touched ESLint **PASS**. **No deploy, reprocess, canary, signoff, commit, Autonomous, or production.**

---

## Independent IR answers

### IR1. Final prompt version
**catalog-enrich-v32** (`catalog-enrich-dev-v32` twin)

### IR2. Final normalizer version
**smart-profile-normalizer-v6**

### IR3. Exact prompt changes
`DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`: primary vs background/document vs fragmented OCR classification; `readableTextLines` = short intentional phrases only; description summarizes (no bulk transcription); title describes **what the design is**. v31 subject paragraph preserved. Prior default snapshotted as `PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31` for Settings auto-upgrade.

### IR4. Exact visibleText sanitizer
`packages/shared/src/utils/visibleTextQuality.ts` — `sanitizeMeaningfulVisibleTextPhrases` extracts Class A identity from dumps; drops underscores/chords/page noise/body copy; preserves slogans/dates/references. Wired via `mergeVisibleTextFromReadableLines`, `normalizeDesignSmartProfile` (AI), and `buildSimpleCatalogEnrichmentResult`.

### IR5. Exact title guard
`resolveLeanCatalogTitle`: sanitize lines first; `looksLikeOcrDumpTitle` makes dump candidates unusable even when they contain readable phrases; prefer usable semantic model titles with token overlap; rebuild from sanitized lines + `centralSubject` otherwise.

### IR6. Exact description guard
`stripOcrDumpFromDescription` after canvas scrub; if empty, `synthesizeSemanticCatalogDescription` (never `join(" / ")` of noise).

### IR7–IR10. Semantic classes
A primary/meaningful retained; B background understood via prompt (no bulk transcript); C fragments discarded / extracted away.

### IR11–IR13. Dolly fixture (automated)
Title rebuilt without 182/freely/underscores; description keeps portrait prose, drops dump sentence; visibleText keeps song title + Dolly Parton.

### IR14–IR25. Matrix
T1–T10 + FP suite in `visibleTextQuality.test.ts` **PASS** (sheet music, newspaper, book, letter, slogan, Class of 2026, John 3:16, Mama's Girl, Smith & Co., Route 66, USA 1776, text-heavy typography).

### IR26. Dump-shaped model-title rejection
**PASS** — `catalogTitleRules.test.ts` + Dolly integration in `simpleCatalogEnrichmentResponse.test.ts`.

### IR27. Description-echo
**PASS** — dump sentence stripped; clean prose retained.

### IR28. visibleText dedupe
**PASS** — overlapping/redundant joins handled.

### IR29–IR30. v31/v5 subject + compounds
**PASS** — F1–F7 + cross-domain + atomic compounds green.

### IR31–IR32. Staff / import precedence
**PASS** — staff `normalizeSmartProfileDimensions` keeps leaping fish and OCR-like visibleText; import preset Dolly Parton merge unchanged.

### IR33–IR38. Schema / Rules / indexes / migration
**NO** to all.

### IR39–IR40. Studio / Portal runtime
Studio: settings constants re-export + prompt-contract tests only (no UI feature). Portal runtime **NO**.

### IR41. Exact source files changed
- `packages/shared/src/utils/visibleTextQuality.ts` (new)
- `packages/shared/src/utils/visibleTextQuality.test.ts` (new)
- `packages/shared/src/utils/smartProfileNormalization.ts`
- `packages/shared/src/utils/smartProfileSubjectCanonicalization.test.ts`
- `packages/shared/src/constants/aiEnrichment.constants.ts`
- `packages/shared/src/constants/smartProfile.constants.ts`
- `packages/shared/src/constants/catalogReprocess.constants.ts` (+ test)
- `functions/src/ai/catalogTitleRules.ts` (+ test)
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts` (+ test)
- `functions/src/ai/smartProfileQuality.contract.test.ts`
- `functions/src/catalogReprocess/catalogReprocess.slice5.contract.test.ts`
- `apps/studio/.../aiEnrichmentSettingsConstants.ts` (+ test) — V31 re-export / prompt assertions
- `docs/project/DECISIONS.md` (ADR-FP-160)
- workflow/handoff docs for this goal

Unrelated queue-multiselect app files: **not touched**.

### IR42. Focused tests
`npx tsx --test` visibleTextQuality + title/simple/version/settings suites — **PASS** (included in broader runs).

### IR43. Regression tests
Primary Smart Profile suite **184/184 PASS**. Gate I/shadow/slice6 set **52/52 PASS**.

### IR44. Functions build
`npm --prefix functions run build` — **exit 0**

### IR45. Lint/typecheck
ESLint on touched TS — **exit 0**. Functions `tsc` via build — **exit 0**.

### IR46. git diff --check
Trailing whitespace fixed in handoff NEXT-PLANNED-GOAL. Remaining CRLF warnings only.

### IR47. ADR-FP-160
Created at top of `docs/project/DECISIONS.md`.

### IR48. DEV Functions deployment inventory (do not deploy)
`enqueueAiEnrichment`, `onCatalogReprocessJobWritten`, `startCatalogReprocessJob`, `previewCatalogReprocessJob`

### IR49. Targeted DEV canary plan (later)
≤10 IDs: Dolly/sheet-music, short slogan, text-heavy typography, another document background, one fish/subject regression sample. Verify v32/v6 provenance + clean copy + subjects.

### IR50–IR51. Full Ready / AI Review reprocess
**NO**

### IR52. Autonomous
**OFF** (unchanged)

### IR53. Tag retirement
**NO**

### IR54. Next queued goal
Smart Profiling completion / unattended catalog enrichment completion (do not auto-start)

### IR55. [NEEDS OWNER DECISION]
None for product/schema. Next gate: owner authorize **DEV Functions deploy** + canary (not this stop).

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Dolly OCR dump prevented (automated) | met |
| Title describes design / dump rejected | met |
| Description summarizes | met |
| visibleText meaningful only | met |
| False positives preserved | met |
| Text-heavy typography preserved | met |
| v31/v5 subjects green | met |
| Staff/import green | met |
| Schema/Rules/indexes/migration unchanged | met |
| Autonomous OFF / no tags | met |
| Build/tests/lint pass | met |
| Diff narrow (no queue multi-select) | met |

---

## Required notes

1. Live DEV still runs **v31/v5** until owner-authorized Functions deploy.
2. Automated fixtures prove deterministic layers; live Gemini quality needs the later canary.
3. Studio settings constants were updated only for V31 previous-default export and prompt-contract assertions — no Studio feature UI.

---

## Next Step

**STOP.** Await owner authorization for DEV Functions deploy + targeted canary. No signoff, commit, or Smart Profiling start.
