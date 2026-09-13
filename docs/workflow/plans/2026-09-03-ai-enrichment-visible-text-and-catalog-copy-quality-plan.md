# Plan: AI Enrichment Visible-Text and Catalog-Copy Quality

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-03-ai-enrichment-visible-text-and-catalog-copy-quality-review.md |
| Protected baseline | `catalog-enrich-v31` / `smart-profile-normalizer-v5` (`125af425`); schema `smart-profile-v1` |
| Proposed versions | **catalog-enrich-v32** + **smart-profile-normalizer-v6** |
| Architecture | **OPTION E** — prompt + visibleText sanitizer + title/description semantic guards |

---

## Goal

Stop background/document-style text, fragmented OCR, music notation, partial lyrics, underscores, chords, numbers-as-noise, and other transcription artifacts from polluting catalog **title**, catalog **description**, and Smart Profile **visibleText**, while still letting clearly readable, meaningful wording inform semantics, search, title, description, and Smart Profile.

This is the owner-selected **final narrow AI-quality corrective** before Smart Profiling completion. Do **not** start Smart Profiling completion in this goal.

---

## Background

Owner found a Dolly Parton portrait over sheet music for “I Will Always Love You.” Semantic identity was partly correct, but `visibleText` resembled a malformed OCR dump (page marks, “freely”, N.C., underscores, clipped lyric fragments). That is unacceptable for a Smart Profile field and for catalog copy.

Live DEV (unchanged by this Plan/Review): **catalog-enrich-v31**, **smart-profile-normalizer-v5**, schema **smart-profile-v1**, Autonomous **OFF**, production **NOT AUTHORIZED**.

Repo inspection shows this is **not** a character-cap problem. The live lean prompt **instructs Gemini to transcribe every readable line** and to form title/description from that wording. The server then **joins** `readableTextLines` into the title and **preserves** the model description after a canvas-phrase scrub + 500-character slice.

Protected prior goal: `smart-profile-subject-canonicalization-and-derivative-suppression` (signoff approved_with_notes). Subject v31/v5 behavior must not regress.

---

## Root-cause audit (R1–R20)

| ID | Answer |
|----|--------|
| **R1** | **Yes.** Live Gemini returns one JSON object: `title`, `description`, `readableTextLines`, Smart Profile dimensions, etc. (`DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`). |
| **R2** | Prompt (`packages/shared/src/constants/aiEnrichment.constants.ts`): `readableTextLines` = every distinct readable line; title built from those lines + optional `centralSubject`; description = 1–2 sentences **with all readable text exactly as shown**. Older unused system prompt in `catalogTitleRules.ts` (`CATALOG_ENRICHMENT_SYSTEM_PROMPT_BODY`) still says OCR-every-word + description sentence 1 = `visibleText` joined with ` / ` — **not** the live user template, but the same philosophy. |
| **R3** | **Model-semantic OCR only.** No Tesseract / Cloud Vision / separate OCR engine in repo. Gemini is told to read the image. Optional `visibleText` JSON key may appear; live JSON example omits it. Smart Profile `visibleText` is filled from model `visibleText` **or** `readableTextLines` (`mergeVisibleTextFromReadableLines`). |
| **R4** | **Weak / not quality-based.** `normalizeReadableTextLines`: trim, drop empty, **slice 12**. `normalizeSmartProfileStringList` for visibleText: trim/dedupe, **maxItemLength 120**. `normalizeVisibleTextPhrases` (legacy parse): trim, slice 12. `visibleTextValidation.ts` flags merged dual-arc slogans / short-token gibberish / known homophones — **retry helper only**, not wired to live Gemini path. |
| **R5** | Model emits title and description independently in the same JSON. Server **re-resolves title** via `resolveLeanCatalogTitle`. Server **does not rewrite** description except `sanitizeCatalogDescription` (canvas/matte phrases) + `.slice(0, 500)`. |
| **R6** | **Yes.** `resolveLeanCatalogTitle` prefers `buildTitleFromReadableTextLines` (join all lines, max 24 words, optional `centralSubject`). If the model title includes that readable phrase and is not generic/filename/style/description-like, the **model title is kept**. An OCR dump in both fields **wins**. Description is not rebuilt from visibleText on the live path unless missing/placeholder (lean path requires description). |
| **R7** | **Yes.** Prompt requires description to include all readable text. Sanitizer does not detect OCR dumps, lyrics, underscores, or slash-joined transcription. 500-char cap only truncates. |
| **R8** | **Partial, unused live.** `hasGibberishFragmentation` / `hasMergedWordPhrase` / dual-arc heuristics in `visibleTextValidation.ts`; `shouldRetryCatalogEnrichment` is **test-only** (not imported by `aiEnrichmentPipeline` / Gemini provider). |
| **R9** | **No.** Repeated underscores are not a dedicated detector. |
| **R10** | **No** punctuation/symbol-to-letter ratio for catalog copy. Title token punctuation stripping exists for titles only. |
| **R11** | **Yes.** Prompt: every readable line. Arrays capped at 12 items; each visibleText item 120 chars. Long dense blocks fit as few long strings. |
| **R12** | **No.** Prompt does not classify foreground slogan vs document/background text. It asks for **all** readable text. |
| **R13** | **No** sheet-music / newspaper / book-page cases in existing automated tests. Tests cover slogans, dual-arc, description-prose titles, subject canonicalization. |
| **R14** | **Yes, but it currently *amplifies* OCR.** `resolveLeanCatalogTitle` / `buildTitleFromReadableTextLines` / `sanitizeCatalogDescription` / generic-title rejection. They own title/description post-processing and **must** gain anti-OCR guards. |
| **R15** | **Multiple layers (OPTION E).** Prompt-only will miss dumps; sanitizer-only cannot invent a semantic title like “Sheet Music Portrait”; title-only leaves dirty `visibleText` in Algolia. |
| **R16** | **Yes, conservatively.** Drop phrases with repeated underscores, chord/notation tokens, extreme symbol density, clipped fragments. **Do not** drop slogans, dates, scripture refs, `Smith & Co.`, `Class of 2026`, `Route 66` when they look like intentional short phrases. |
| **R17** | Keep **multiple short array entries** (one headline/name/phrase per item), not one concatenated dump. Title may combine a few primary phrases + visual identity; description should **summarize**, not join with ` / `. |
| **R18** | **Yes.** Portal Algolia searchable attributes include `unordered(visibleText)` (not faceted). |
| **R19** | Search hierarchy: **title** first, then structured facets, then `searchConcepts`, then **visibleText**, then objects, then `searchText` (title + **description** + category + tags/aliases). Dirty description pollutes `searchText`; dirty visibleText pollutes a dedicated searchable field. |
| **R20** | **Yes.** Removing noisy visibleText and OCR descriptions reduces retrieval noise and record bulk; useful song/person names should remain via visibleText **and/or** searchConcepts/themes/interests. |

---

## Semantic text classification

Conceptual classes (not new JSON/schema fields):

| Class | Meaning | visibleText | Title / description |
|-------|---------|-------------|---------------------|
| **A. Primary / meaningful design text** | Slogan, name, song title, short caption, location, date, team/occupation text that a person would identify as intentional wording | Keep short high-confidence phrases | May inform copy when semantically appropriate |
| **B. Background / contextual document text** | Sheet music, newspaper, book page, letter, recipe, menu, map, collage, repeating print, dense chalkboard | Do **not** transcribe. Optionally keep 1–2 short **headlines** if clearly prominent (e.g. song title) | Understand role: “sheet music”, “newspaper background”. Do not dump the document |
| **C. Low-confidence / fragmented OCR** | Partial words, isolated junk numbers, stray punctuation, underscores, notation/chords, clipped lyrics, reconstruction artifacts | Discard | Must not construct title or description |

Gemini may still **understand** “sheet music for I Will Always Love You” for subjects/objects/themes/searchConcepts.

**Copyright / long-text:** Do not reproduce long lyrics, articles, or book paragraphs. Retain recognizable identity (song title, person name) only.

---

## Contracts

### visibleText

Only short, clearly readable, meaningful, high-confidence wording. **Not** an OCR transcript store. Multiple short phrases as separate array items. Empty `[]` / omitted is valid when there is no useful wording (dense notation only).

### Title

Describe **what the design is** (subject + theme/context + meaningful phrase + distinguishing style/concept). Do **not** concatenate raw OCR. Do not blindly join all `readableTextLines`. Prefer a semantic model title when it is not OCR-like. Illustrative Dolly style: `Dolly Parton I Will Always Love You Sheet Music Portrait`.

### Description

Natural 1–2 sentences: main subject, composition, meaningful text/theme, style, secondary imagery. May say sheet music for a named song appears in the background. Must **not** dump lyrics, notation, or OCR. Live path must **stop preserving** dumps; must **not** fall back to `phrases.join(" / ")` for document/OCR cases.

---

## Architecture options (Review selection)

| Option | Verdict |
|--------|---------|
| A Prompt-only | Insufficient — current title resolver **keeps** OCR dumps that match readable lines |
| B Sanitizer-only | Insufficient — cannot teach semantic catalog titles or background classification |
| C Title/description rules only | Leaves dirty `visibleText` in Smart Profile + Algolia |
| D Prompt + sanitizer | Better; title path can still prefer a dump-shaped model title |
| **E Prompt + sanitizer + title/description guards** | **Chosen.** Matches repo: prompt instructs dump; lean title joins lines; description is preserved |

---

## Approach (implement after owner authorization — not this phase)

1. **Prompt `catalog-enrich-v32`** in `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`:
   - Classify text role including document/background vs primary wording (profiling guidance, not a new persisted field).
   - `readableTextLines` / implied visibleText: **only class A** phrases; never bulk document transcription; never notation/chords/underscores/clipped lyrics.
   - Title rules: semantic catalog title (what the design **is**), not OCR concatenation; may use confident names/titles plus visual identity (`portrait`, `sheet music`).
   - Description: summarize; mention background document type; do not transcribe.
   - Keep v31 **subject** rules verbatim (canonical bases, no `bass fish` / `leaping fish` / `make fish`, atomic compounds).
   - Snapshot current default as `PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31` and include it in `isPreviousDefaultAiEnrichmentPromptTemplate` (today the helper stops at **v29** — v30/v31 Settings copies would not auto-upgrade until this is fixed).
2. **Deterministic sanitizer** (new shared helper, e.g. `packages/shared/src/utils/visibleTextQuality.ts`):
   - Conservative per-phrase + per-list filters (underscores, chord/notation tokens, extreme punct/symbol density, many 1–2 letter fragments, overlapping duplicate dumps).
   - False-positive allow: years/dates, `Class of 20xx`, scripture (`John 3:16`), apostrophes/ampersands, `Route 66`, `USA 1776`, short slogans, phone-like prominent numbers, scores, coordinates, meaningful abbreviations.
   - Apply to `readableTextLines` **before** `resolveLeanCatalogTitle`, and to AI `visibleText` merge.
   - **Do not** run inside staff `normalizeSmartProfileDimensions` (`designSmartProfileStaffUpdate.ts`).
3. **Title guard** in `resolveLeanCatalogTitle` / `buildTitleFromReadableTextLines`:
   - Treat OCR-like titles as unusable **even when** they contain/equal readable lines (fixes Dolly win condition).
   - Build from **sanitized** primary phrases + `centralSubject` / visual identity — not unsanitized joins.
   - Prefer a **non-OCR** model title that describes the design.
4. **Description guard**:
   - Detect OCR/lyric/transcription dumps (underscores, notation, slash-joined fragment lists, extreme length of quoted dump).
   - Replace with a short semantic summary from centralSubject / subjects / objects / sanitized phrases — **never** `join(" / ")` of noise.
   - Keep canvas-phrase scrub; 500-char cap remains a cap, not the quality rule.
5. **Normalizer `smart-profile-normalizer-v6`**:
   - AI-only: sanitize `visibleText` in `mergeVisibleTextFromReadableLines` and/or `normalizeDesignSmartProfile` (same staff-safe split as subject collapse).
   - Do **not** change `collapseRedundantSubjectDerivatives` unless a tested interaction is required — if subject tests fail, **STOP**.
6. **Versions lockstep:** `CATALOG_ENRICHMENT_PROMPT_VERSION`, `DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION`, `CURRENT_CATALOG_ENRICH_PROMPT_VERSION`, `CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT`, `SMART_PROFILE_NORMALIZER_VERSION`, `CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT`.
7. **No schema fields** (`rawOcr`, `backgroundText`, etc.). Escalate `[NEEDS OWNER DECISION — SMART PROFILE SCHEMA CHANGE]` only if E cannot be implemented — inspection says it can.
8. Docs: new **ADR-FP-160** (do not overload ADR-FP-145). Update `DECISIONS.md`, handoff AI pipeline notes at implement/signoff.

### Deterministic signals (conservative)

Use **combinations**, not a single max-length rule: repeated `_`; high non-letter ratio excluding allowed `&` `'` `:` in short phrases; isolated chord tokens (`N.C.`, `Am7`, staff fragments); many sub-3-letter tokens in a long string; lyric-like fill-in blanks (`if ____ would`); duplicate overlapping phrases.

---

## Scope

### In Scope

- Prompt v32 text-quality instructions (preserve v31 subject contract)
- Shared visibleText quality sanitizer (AI path)
- Lean title + description anti-OCR guards
- Normalizer v6 stamp + AI visibleText sanitize
- Automated tests T1–T10 + false-positive set
- Version constants / previous-default snapshot
- ADR-FP-160 at implement
- Targeted DEV canary **after** implement + Functions deploy (not this phase)

### Out of Scope

- Implementation in this Plan/Review stop
- Smart Profiling completion / unattended catalog enrichment completion
- Mass AI Review or Ready Catalog reprocess / Algolia full reconcile
- Autonomous enablement / `catalogAutonomousLiveEnabled`
- Tag retirement
- Production
- Schema change
- Subject canonicalization redesign
- Staff/import-preset precedence changes
- New OCR provider
- Studio/Portal UI redesign

---

## Affected Areas

### Files / Modules (expected)

| Path | Role |
|------|------|
| `packages/shared/src/constants/aiEnrichment.constants.ts` | Prompt v32 + V31 previous-default |
| `packages/shared/src/constants/smartProfile.constants.ts` | Prompt + normalizer versions |
| `packages/shared/src/constants/catalogReprocess.constants.ts` | Reprocess snapshots |
| `packages/shared/src/utils/visibleTextQuality.ts` | **New** sanitizer |
| `packages/shared/src/utils/visibleTextQuality.test.ts` | **New** unit tests |
| `packages/shared/src/utils/smartProfileNormalization.ts` | AI merge / v6 |
| `functions/src/ai/catalogTitleRules.ts` | Prompt version + title/description guards |
| `functions/src/ai/simpleCatalogEnrichmentResponse.ts` | Sanitize lines before title; description guard |
| `functions/src/ai/smartProfileBuilder.ts` | Pass sanitized visibleText |
| `functions/src/ai/visibleTextValidation.ts` | Optional reuse of gibberish helpers; do not revive unused full-retry as scope |
| Version/parity tests: `catalogTitleRules.test.ts`, `catalogReprocess.constants.test.ts`, `smartProfileQuality.contract.test.ts`, `promptParity.test.ts`, Settings previous-default tests | Lock versions + auto-upgrade |
| `docs/project/DECISIONS.md` | ADR-FP-160 at implement |
| Handoff / ROADMAP | Sequencing; not production |

### Architecture Impact

- [x] Details: Functions enrichment + shared normalizer only. No new persisted Smart Profile keys. Staff path (`normalizeSmartProfileDimensions`) unchanged.

### Security Impact

- [x] Details: Reduces reproduction of long copyrighted document/lyric text in catalog fields. No auth/Rules/secrets change.

### Data Model Impact

- [x] None (schema `smart-profile-v1` unchanged). Field **semantics** of `visibleText` tighten (quality, not new type).

### Backend Impact

- [x] Details: DEV Functions allowlist later (same as v31): `enqueueAiEnrichment`, `onCatalogReprocessJobWritten`, `startCatalogReprocessJob`, `previewCatalogReprocessJob`. No new env vars.

### UI / UX Impact

- [x] Details: Catalog title/description and Studio visibleText **content** quality only. No Studio/Portal source required. Manual owner canary later.

### Migration Impact

- [x] None. Existing dirty profiles remain until targeted re-enrich. No mass backfill in this goal.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit -p functions` (and shared as used by existing scripts) | yes (implement) |
| Lint | ESLint on touched TS | yes |
| Unit tests | node:test on new quality helper + title/description + merge + **existing subject canonicalization suite** | yes |
| Build | Functions build | yes |
| Integration | not required | no |
| E2E | not required | no |
| Backend/rules | not required (no Rules) | no |

**Matrix (fixtures = function inputs / example strings, not live Gemini in CI):**

| ID | Case | Expected |
|----|------|----------|
| T1 | Dolly-style OCR dump line | visibleText ≈ song title + name; no notation/underscores/lyrics dump; title semantic not OCR; description summarizes portrait + sheet music |
| T2 | Newspaper-like long article string | no article dump; newspaper/document concept allowed in objects/themes/searchConcepts |
| T3 | Book-page paragraph | no long paragraph OCR |
| T4 | Handwritten letter dump | letter concept; only short prominent phrase if high quality |
| T5 | `Just One More Plant` | full slogan kept |
| T6 | `Class of 2026` | kept |
| T7 | `John 3:16` | kept |
| T8 | Dense notation, no headline | visibleText empty/omitted |
| T9 | Song title + lyric dump | title/phrase kept; lyrics dropped |
| T10 | Text-heavy typography (multi-line slogan) | do not over-suppress primary text |
| FP | `Mama's Girl`, `Smith & Co.`, `Route 66`, `USA 1776` | kept |
| SUB | Existing fish/subject tests | **must still pass** |

### Manual

- [x] After implement + DEV Functions deploy: targeted bounded canary (recommended max 10 IDs), including the Dolly design if still in DEV, plus one slogan shirt and one text-heavy typography design.
- Full queue/catalog reprocess: **NO**.

---

## Human Checkpoints Anticipated

- [x] Owner authorization to **Implement** (this stop)
- [x] Owner authorization to **DEV Functions deploy**
- [x] Owner targeted canary PASS/FAIL
- [ ] Production deploy — **not this goal**
- [ ] Database migration — none
- [ ] Smart Profiling completion — **queued next, not started**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Over-suppress legitimate slogans | High | False-positive tests; conservative multi-signal drops; T5/T10 |
| Title still prefers OCR dump | High | Explicit OCR-like title rejection (Review required change) |
| Description `join(" / ")` fallback | High | Ban that fallback for unsanitized/document cases |
| Subject v31/v5 regression | High | Run subject tests; STOP if interaction appears |
| Staff visibleText rewritten | High | Sanitizer AI-only |
| Copyright lyrics still in description | Medium | Prompt + dump detector |
| Dirty historical catalog | Medium | Targeted canary only; full backfill deferred to Smart Profiling completion |
| Settings custom prompt stays on v31 dump rules | Medium | Previous-default auto-upgrade including V31 snapshot |

See `.cursor/workflow/risk-checklist.md`.

---

## Rollback Plan

Redeploy previous Functions revision / revert prompt+normalizer constants to v31/v5. No schema migration. Canary designs can be re-enriched again.

---

## Documentation Updates Required

- [ ] DECISIONS.md — **ADR-FP-160** at implement
- [x] ROADMAP / handoff sequencing — this phase
- [ ] ARCHITECTURE.md / BACKEND.md — only if implement changes documented pipeline (handoff `07` at signoff)
- [ ] DATA_MODEL.md — no schema change; optional visibleText semantic note at implement
- [ ] TESTING.md — only if new commands

---

## Open Questions

- [x] None blocking Plan/Review. No schema change. No `[NEEDS OWNER DECISION]` for product behavior beyond **authorize Implement** (workflow gate, not a schema/product fork).

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-03-ai-enrichment-visible-text-and-catalog-copy-quality-review.md`
- Verdict: **approved_with_changes**
