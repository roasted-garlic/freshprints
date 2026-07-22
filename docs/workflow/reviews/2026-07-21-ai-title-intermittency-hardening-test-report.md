# Test Report: AI title intermittency hardening

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Goal | `ai-text-title-completeness` (intermittency follow-up) |
| Status | **passed_with_notes** (automated pass; manual 3× reprocess pending) |

## Commands

| Check | Command | Exit |
|-------|---------|------|
| Title unit tests | `npx tsx --test functions/src/ai/catalogTitleRules.test.ts` | 0 |
| All Functions AI tests | `npx tsx --test` over `functions/src/ai/*.test.ts` | 0 (**~246+ pass**) |
| Functions build | `npm --prefix functions run build` | 0 |

## Manual checkpoint (stability)

**After soft-deploy to `fresh-prints-dev`**, reprocess the **same** Sarcasm design **3 times**:

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:resetAiEnrichmentForProcessing,functions:testAiEnrichmentPlayground --project fresh-prints-dev
```

### Expected each time
- Title: `Sarcasm Just One of My Many Talents` (or equivalent full phrase)
- Not: `Sarcasm` alone
- Description/category/tags remain sensible

### Also spot-check
- One true one-word design stays one word
- Apostrophe designs still intact
- Motherhood-style mixed title not collapsed

### Reply with
`PASS` / `FAIL: …` / `PASS WITH NOTES: …`
