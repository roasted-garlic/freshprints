# Test Report: AI text title completeness

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Goal | `ai-text-title-completeness` |
| Plan | docs/workflow/plans/2026-07-21-ai-text-title-completeness-plan.md |
| Review | docs/workflow/reviews/2026-07-21-ai-text-title-completeness-review.md |
| Status | **passed_with_notes** (automated pass; manual AI Review pending after Functions deploy) |

---

## Commands run

| Check | Command | Exit code | Result |
|-------|---------|-----------|--------|
| Focused title/prompt tests | `npx tsx --test functions/src/ai/catalogTitleRules.test.ts functions/src/ai/simpleCatalogEnrichmentResponse.test.ts apps/studio/.../aiEnrichmentSettingsConstants.test.ts` | 0 | 95 pass |
| All Functions AI unit tests | `npx tsx --test` over `functions/src/ai/*.test.ts` (PowerShell-expanded) | 0 | **243 pass / 0 fail** |
| Functions build | `npm --prefix functions run build` | 0 | pass |
| Lint (repo) | `npm run lint` | 1 | **Pre-existing** Portal/Studio/Functions lint errors unrelated to this change (e.g. `@next/next/no-img-element` rule missing, unused vars). No new lint issues introduced in touched title files. |
| Diff check (touched files) | `git diff --check --` on changed title/prompt/workflow files | 0 | pass |

---

## Coverage vs acceptance

- Root causes documented in plan (model under-title vs post-model trust + apostrophe quote extractor).
- Straight/curly apostrophe JSON + normalize + lean resolve fixtures pass.
- Incomplete `I` / `Sarcasm` completed from description; valid one-word `Faith` not expanded.
- Motherhood mixed-content regression still green.
- Prompt bumped to `catalog-enrich-v25` with previous-default auto-upgrade for v24.

---

## Manual Test Checkpoint

**Feature / area:** Studio AI Review title completeness (`catalog-enrich-v25`)  
**Why automated tests are insufficient:** Live Gemini vision output on the supplied artworks.  
**Environment:** local Studio + `fresh-prints-dev` after Functions deploy  
**Prerequisites:** Deploy enrichment Functions to `fresh-prints-dev` (see below). Open Studio AI Review.

### Soft-deploy (human)

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing,functions:testAiEnrichmentPlayground --project fresh-prints-dev
```

(Adjust to the repo’s usual AI-related function set if different; production deploy forbidden without explicit approval.)

### Steps

1. Reprocess the design that previously titled **`Sarcasm`** only → **Expected:** title includes `Sarcasm Just One of My Many Talents` (or equivalent complete phrase); description/category/tags remain sensible.
2. Reprocess **`I'M NOT ARGUING…`** design that titled **`I`** → **Expected:** full contraction phrase, not `I`.
3. Reprocess **`I'M FINE / THE REST OF YOU / NEED THERAPY`** → **Expected:** complete phrase with intact `I'm`.
4. Spot-check one known good short one-word title and one mixed text+visual title → **Expected:** not unnecessarily rewritten.

### Pass criteria

- [ ] No title reduced to `I` for the contraction examples
- [ ] Multi-line text designs keep secondary lines in the title
- [ ] Descriptions/categories/tags not regressing for these designs

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
