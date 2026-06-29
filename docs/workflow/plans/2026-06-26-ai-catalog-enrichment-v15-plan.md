# Plan: AI catalog enrichment prompt v15 + validation hardening

| Field    | Value                                                                |
| -------- | -------------------------------------------------------------------- |
| Date     | 2026-06-26 (revised 2026-06-26)                                       |
| Author   | Managing Agent                                                       |
| Status   | **revised — blocked on Phase 0**                                     |
| Workflow | managed-phase                                                        |
| Related  | docs/workflow/reviews/2026-06-26-ai-catalog-enrichment-v15-path-verification.md |

---

## Goal

Build a **reliable enrichment pipeline**: correct deployed path first, then v15 prompt intent, JSON coercion, rejection of placeholder/garbled output, normalization, retries, model escalation, and low-confidence manual-review-only saves.

Principle: **Verify path → Prompt handles intent → Validation handles structure → Rejection handles garbage → Retries handle low-confidence OCR → Escalation handles hard cases.**

---

## Revision note (2026-06-26)

QA reports AI Review still showing **`catalog-enrich-openai-v12`**. Repo inspection confirms:

- Local code is **v15** (`catalog-enrich-openai-v12` exists only in stale `DATA_MODEL.md`).
- Prior signoff **deferred Firebase deploy** — most likely root cause.
- v15 baseline (Phases 1–7) is implemented locally but **Phase 0 must pass before further tuning**.
- This revision adds **Phase 0** (deploy/path verification) and **Phases 8–12** (placeholder rejection, garbled OCR, confidence tiers, model fallback, prompt hardening).

### Implementation status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Deployment / path verification | **BLOCKED — human deploy + smoke test** |
| 1–7 | v15 prompt + parse/retry/category/tags (baseline) | **DONE locally** |
| 8 | Placeholder / leakage rejection | Pending |
| 9 | Garbled OCR heuristics | Partial (`visibleTextValidation.ts`) — extend |
| 10 | Title blockers + suffix rules | Partial (`catalogTitleRules.ts`) — extend |
| 11 | Confidence tiers + manual-review-only save | Pending |
| 12 | Model fallback escalation | Pending |
| 13 | Prompt anti-placeholder / anti-garbled sections | Pending |
| 14 | Pipeline logging (model, version, retry count, reasons) | Partial — extend |

---

## Background

* **Symptom:** UI shows `catalog-enrich-openai-v12` after re-run.
* **Likely cause:** Undeployed functions +/or stale Firestore suggestions from last production deploy.
* **Re-run path:** Clears `aiSuggestions` on enqueue; new `promptVersion` written only when pipeline completes with deployed code.
* **Dev provider risk:** Used when `OPENAI_API_KEY` secret empty — emits `catalog-enrich-dev-v15` and placeholder description text (not v12).

Path verification report: `docs/workflow/reviews/2026-06-26-ai-catalog-enrichment-v15-path-verification.md`

---

## Scope

### In Scope

**Phase 0 — Deployment / path verification (gate)**

* Confirm UI shows `catalog-enrich-openai-v15` on newly generated suggestions
* Confirm re-run uses OpenAI provider (`provider: "openai"`)
* Confirm stale suggestions overwritten (`generatedAt` changes)
* Search/block placeholder leakage strings
* Add logging: model, prompt version, retry count, retry reasons

**Phases 1–7 — Baseline (done locally)**

* v15 prompts, `catalogEnrichmentResponse`, `catalogCategoryResolver`, `catalogEnrichmentRetry`, provider wiring, tests, ADR-FP-029

**Phases 8–12 — Additional hard safeguards (new)**

* Placeholder phrase rejection before save
* Garbled OCR heuristics + title OCR fragment detection
* Description sentence-1 must match `visibleText`
* Confidence tiers: ≥0.85 accept; 0.70–0.84 accept if validation passes; <0.70 retry then manual-review-only
* Model fallback: primary nano → fallback `gpt-5.4-nano` with higher reasoning on hard failures
* Extended tag filter list (placeholder, example, mock, filename, etc.)
* Prompt sections: anti-placeholder, anti-garbled OCR, strict description sentence-1

### Out of Scope

* Analysis canvas rendering changes
* Settings UI for tag lists
* OpenAI JSON Schema `response_format` migration
* Bulk re-enrich historical designs (optional follow-up)
* Production deploy (human checkpoint — required for Phase 0)

---

## Phase 0: Deployment / path verification

**Do not judge v15 quality until this phase passes.**

| Step | Action | Owner |
|------|--------|-------|
| 0.1 | `cd functions && npm run build && firebase deploy --only functions` | Human |
| 0.2 | Re-run AI on one design currently showing v12 | Human |
| 0.3 | Verify UI: `promptVersion` = `catalog-enrich-openai-v15`, `provider` = `openai` | Human |
| 0.4 | Verify Firestore: `aiSuggestions` deleted then repopulated; new `generatedAt` | Human |
| 0.5 | Verify logs: `provider.selected` openai; no `development` provider | Human |
| 0.6 | Update `DATA_MODEL.md` stale v12 reference | Agent |

**Exit criteria:** At least one re-run produces v15 suggestions with openai provider.

---

## Phase 8: Placeholder / leakage rejection

New module or extend `catalogEnrichmentRetry.ts` + `visibleTextValidation.ts`:

**Reject and retry** if `title`, `description`, or any `visibleText` phrase contains (case-insensitive):

`placeholder`, `example`, `transcribed as visible`, `lorem`, `unknown`, `N/A`, `filename`, `mock`, `sample transcription`

Also scan `tags` and `primarySubject`.

**Block dev provider text** from ever reaching production suggestions (fail closed if `providerId === "development"` when API key expected).

---

## Phase 9: Garbled OCR heuristics

Extend `visibleTextValidation.ts`:

| Heuristic | Trigger retry |
|-----------|---------------|
| 3+ single-letter tokens in a row in one phrase | yes |
| Mid-word spacing (`MOTHERH OOD`, `W ER E`, `SI Epr`) | yes |
| Broken mixed-case fragments (`Sl Eep Deprived`) | yes |
| Known bad patterns from QA | yes |

Reuse/extend: `hasGibberishFragmentation`, `hasMergedWordPhrase`, `hasKnownHomophoneDrift`.

**Title:** reject/retry if title has weird mid-word spacing or broken OCR fragments.

**Description:** retry if sentence 1 contains words not present in `visibleText` (strict token overlap).

---

## Phase 10: Title blockers

Reject or repair + retry if:

1. Title ends with punctuation/separator
2. Title includes `Black Text` / `White Text` when `textOnlyArtwork === false`
3. Title uses generic words (Text, Typography, Quote, Saying, Slogan, Design, Graphic, Artwork, Image, Print, Shirt, Tee, DTF, Transfer, PNG)
4. Title contains broken OCR fragments
5. Title derived from lower segment instead of `visibleText[0]`

**Suffix rule (strict):** Add `Black Text` / `White Text` only when:

* `textOnlyArtwork === true`
* No illustration, character, icon, mascot, logo, banner, ribbon, shape, star, heart, clip art, or decorative art
* All readable ink is single color black or white

Raccoon / skeleton / banner designs → **never** suffix.

---

## Phase 11: Confidence tiers

| `textRecognitionConfidence` | Behavior |
|----------------------------|----------|
| ≥ 0.85 | Accept if all validation passes |
| 0.70 – 0.84 | Accept only if title, visibleText, category, description pass validation |
| < 0.70 | Retry with fallback reasoning/model |
| < 0.70 after retry | Save as **needs manual review** — set `errorCode` or flag; do not treat as high-quality suggestion |

**58% confidence examples must not be accepted as normal suggestions.**

Implement in pipeline `markAiSuccess` guard or pre-save validation layer.

---

## Phase 12: Model fallback

| Pass | Model | Reasoning |
|------|-------|-----------|
| Primary | `gpt-5-nano-2025-08-07` (or settings) | `low` if latency allows; else `minimal` with more retries |
| Fallback | `gpt-5.4-nano-2026-03-17` | `low` or `medium` |

**Fallback triggers** (any):

* OCR confidence < 0.70
* Garbled visibleText / title
* Invalid category (retry once, then remap)
* < 5 tags after filtering
* Placeholder/example text
* Description invents text not in visibleText
* `textOnlyArtwork` conflicts with illustration
* Black/White Text suffix with supporting artwork
* Canvas palette terms

Max calls: primary + empty-output cap + unified quality retry + optional model escalation (document cap, e.g. 4).

---

## Phase 13: Prompt updates (v15.1 sections)

Add to **system prompt** after OCR rules:

**Anti-placeholder:**
> Never output placeholder, example, sample, mock, or instructional text. Do not use text such as "example transcription placeholder," "transcribed as visible," "unknown," "N/A," "sample," or "placeholder" in any JSON field. If text is uncertain, return the best readable text only and lower textRecognitionConfidence. Do not invent additional slogan lines to make the description sound complete. The first sentence of description must use only the exact phrases from visibleText, joined with " / ".

**Anti-garbled OCR:**
> Do not output broken OCR fragments as final text. If a word appears broken into random partial chunks or separated single letters, lower confidence and retry if available. Avoid mid-word spacing such as "MOTHERH OOD," "W ER E," or "SI Epr." Preserve real word boundaries only.

**Description sentence-1:**
> Sentence 1 must be built only from the final visibleText array. Do not add extra words, inferred phrases, explanations, bracketed notes, or placeholder text to sentence 1. Sentence 1 must not contain "transcribed as visible," "example," "placeholder," or bracketed commentary.

Bump prompt version to `catalog-enrich-openai-v15.1` when these sections ship.

---

## Category safeguards

* Message/audience over supporting props (motherhood slogan + skeleton → Motherhood/Mom Life/Family, not Toys)
* Invalid `categoryName` → retry once; then keyword remap from theme + visibleText + primarySubject
* Never invent categories; never hardcode Uncategorized unless in Firestore
* No death/morbid category from skeleton alone unless text supports it

---

## Tag hardening

Filter generic/meta tags including: `shirt`, `tshirt`, `tee`, `design`, `print`, `png`, `dtf`, `transfer`, `image`, `artwork`, `graphic`, `text`, `quote`, `saying`, `slogan`, `typography`, `lettering`, `background`, `canvas`, `placeholder`, `example`, `mock`, `file`, `filename`

Allow single-word searchable tokens: `mama`, `coffee`, `nurse`, `teacher`, `faith`, `spooky`, `western`, `baseball`, `motherhood`, `mom`

Reject concatenated phrase tags: `mamaneedscoffee`, `outsideimhootin`, `sleepdeprived`

---

## Expected QA outputs

### Sleep Deprived Skeleton

| Field | Expected |
|-------|----------|
| visibleText | `["SLEEP DEPRIVED", "BARELY ALIVE"]` |
| title | `Sleep Deprived` |
| category | Humor (or closest allowed) |
| Must NOT appear | `SI Epr Iv Ed`, `Sl Eep Deprived`, `DRINKING COFFEE`, `TO KEEP GOING`, placeholder text |

### Motherhood Rocks Skeleton

| Field | Expected |
|-------|----------|
| visibleText | `["SOME DAYS IT ROCKS ME", "EITHER WAY WE'RE ROCKIN'", "MOTHERHOOD"]` |
| title | `Some Days It Rocks Me` |
| category | Motherhood / Mom Life / Family |
| Must NOT appear | `Toys`, `MOTHERH OOD`, `EVERY W ER E FR O M`, title ending `-` |

### Outside I'm Hootin Raccoon

| Field | Expected |
|-------|----------|
| visibleText | `["OUTSIDE I'M HOOTIN'", "INSIDE I'M HOLLERIN'"]` |
| title | `Outside I'm Hootin` (no Black Text suffix) |
| category | Animals or Humor |

---

## Affected files (expected)

| File | Phase |
|------|-------|
| `functions/src/ai/catalogTitleRules.ts` | 13 — prompt v15.1 |
| `functions/src/ai/catalogEnrichmentRetry.ts` | 8–11 — rejection reasons |
| `functions/src/ai/visibleTextValidation.ts` | 9 — garbled heuristics |
| `functions/src/ai/catalogEnrichmentResponse.ts` | 8–9 — pre-save validation |
| `functions/src/ai/aiEnrichmentPipeline.ts` | 11 — manual-review-only save |
| `functions/src/ai/aiEnrichmentConfig.ts` | 12 — fallback model config |
| `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts` | 12 — model escalation |
| `functions/src/ai/providers/resolveAiEnrichmentProvider.ts` | 0 — log provider selection |
| `docs/architecture/DATA_MODEL.md` | 0 — fix v12 doc reference |
| Tests | 8–12 |

---

## Test strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Typecheck | `npx tsc --noEmit` | yes |
| Functions build | `cd functions && npm run build` | yes |
| Unit tests | `cd functions && npx tsx --test src/ai/catalogTitleRules.test.ts src/ai/catalogEnrichmentResponse.test.ts src/ai/catalogEnrichmentRetry.test.ts src/ai/visibleTextValidation.test.ts` (+ new tests) | yes |

### Manual (Phase 0 gate)

- [ ] Deploy functions
- [ ] Re-run AI on v12 design → confirm v15 in UI
- [ ] Re-run 3 known QA designs (table above)
- [ ] Confirm 58% confidence designs flagged manual-review, not accepted as normal

---

## Human checkpoints

- [ ] **Phase 0:** Firebase functions deploy
- [ ] **Phase 0:** Manual re-run smoke test (v12 → v15)
- [ ] **Phase 12:** Approve model fallback cost/latency
- [ ] Production deploy after Phases 8–12

---

## Rollback

* Revert prompt version constant and redeploy functions
* Phases 8–12 modules are additive; revert provider wiring if needed
* No Firestore migration

---

## Appendices

### Appendix A: v15 system prompt (baseline — implemented)

See prior plan revision or `functions/src/ai/catalogTitleRules.ts` `CATALOG_ENRICHMENT_SYSTEM_PROMPT_BODY`.

### Appendix B: v15 user prompt (baseline — implemented)

See `buildCatalogEnrichmentUserPrompt()` in `catalogTitleRules.ts`.

### Appendix C: v15.1 prompt additions (Phase 13 — pending)

See Phase 13 sections above.

---

## Approval

* Path verification: `docs/workflow/reviews/2026-06-26-ai-catalog-enrichment-v15-path-verification.md`
* Prior review: superseded pending Phase 0 + plan revision re-review
* Verdict: **blocked on Phase 0 deploy verification**
