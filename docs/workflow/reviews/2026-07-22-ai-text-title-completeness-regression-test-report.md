# Test Report: AI text title completeness regression (description leakage)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Goal | `ai-text-title-completeness-regression` |
| Plan | docs/workflow/plans/2026-07-22-ai-text-title-completeness-regression-plan.md |
| Review | docs/workflow/reviews/2026-07-22-ai-text-title-completeness-regression-review.md |
| Automated status | **passed** |
| Manual status | **PASS** (owner 2026-07-22) |
| Overall | **passed** |

---

## Soft-deploy

| Field | Value |
|-------|-------|
| Approval | Owner APPROVE SOFT-DEPLOY (2026-07-22) |
| Project | `fresh-prints-dev` |
| Command | `firebase deploy --only functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing,functions:testAiEnrichmentPlayground --project fresh-prints-dev` |
| Result | **PASS** — all three Functions updated successfully |

---

## Commands Run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Title + lean enrichment | `npx tsx --test functions/src/ai/catalogTitleRules.test.ts functions/src/ai/simpleCatalogEnrichmentResponse.test.ts` | 0 | 86 pass |
| Full Functions AI suite | `npx tsx --test` on all `functions/src/ai/*.test.ts` | 0 | **258 pass** / 0 fail |
| Functions build | `npm --prefix functions run build` | 0 | pass |

Lint / shared settings prompt tests: run as needed in follow-up; core AI suite and build green.

---

## Coverage Notes

New fixtures covered:

- Description leakage rebuild from `readableTextLines` + `centralSubject`
- First-sentence rejection when `Text reads` / single-quoted narration present
- Boilerplate openings rejected
- Decorative subject strip (`Polka Dot Bow`)
- Correct model title preservation
- No-text visual title protection
- Prior Sarcasm / apostrophe / one-word fixtures remain green

---

## Manual Test Checkpoint (required after soft-deploy)

**Feature / area:** Studio AI Review title finalization (`catalog-enrich-v26`) description leakage  
**Why automated tests are insufficient:** Live Gemini narration variance; persistence/display path  
**Environment:** `fresh-prints-dev` after Functions soft-deploy  
**Prerequisites:** Soft-deploy enrichment Functions with v26 prompt/code

### Steps
1. Soft-deploy Functions to `fresh-prints-dev` → **Expected:** deploy succeeds  
2. Reprocess Christmas mouse-ear design **5×** → **Expected:** 5/5 titles begin with `Best Christmas Ever`; preferred `Best Christmas Ever Mouse Ears`; zero `The Design Features…` / copied description sentences  
3. Reprocess both Sarcasm images, I'm Fine…, I'm Not Arguing…, one single-word, one no-text → **Expected:** prior completeness behavior holds; category/tags/description reasonable  

### Pass criteria
- [x] 5/5 Christmas titles begin with `Best Christmas Ever`
- [x] Zero description-boilerplate titles
- [x] Prior completeness cases still good
- [x] Category/tags/description do not regress

**Owner reply:** `PASS` — 2026-07-22

---

## Next Step

Signoff complete — see `docs/workflow/reviews/2026-07-22-ai-text-title-completeness-regression-signoff.md`.
