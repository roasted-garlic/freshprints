# Test Report: Playground-Style AI Processing Rebuild

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Plan | `docs/workflow/plans/2026-06-29-ai-processing-playground-style-rebuild-plan.md` |
| Prompt version | `catalog-enrich-openai-v16` → `catalog-enrich-openai-v17` |
| Environment | Local (Windows). No deploy. |

## Commands run + results

| Command | Exit | Notes |
|---------|------|-------|
| `npx tsx --test functions/src/ai/*.test.ts` | 0 | 99 tests / 18 suites pass (incl. new simple-enrichment + provider tests) |
| `npx tsx --test functions/src/ai/simpleCatalogEnrichmentResponse.test.ts functions/src/ai/providers/openAiVisionEnrichmentProvider.test.ts` | 0 | 15 tests pass (targeted) |
| `npx tsc --project functions/tsconfig.json --noEmit` | 0 | clean |
| `cd functions && npm run build` | 0 | `tsc` clean |
| `npm run lint` | 0 | `--max-warnings 0` clean |
| `npx tsc --noEmit` (root) | 0 | clean |
| `npx vite build` | 0 | renderer bundles; `electron-builder` packaging intentionally NOT run (outward-facing packaging step, not required for verification) |
| `git diff --check` | 0 | only pre-existing CRLF/LF line-ending warnings; no whitespace/conflict errors |

## How the tests prove the acceptance criteria

- **One normal OpenAI call on success / no `catalog.enrich.retry`:** `callOpenAiVision` calls
  `requestOpenAiVisionCompletion` once and returns; the quality-retry and empty-output-retry code
  paths were removed (no `shouldRetryCatalogEnrichment` / `shouldRetryEmptyOutputWithHigherCap`
  on the live path). Provider test confirms request shape.
- **`finish_reason: "length"` empties no longer expected:** request drops
  `response_format: json_object` and asks for a tiny 5-field object; provider test asserts no
  `response_format` is sent.
- **Simplified parser handles valid JSON, JSON-in-text, missing/bad confidence, phrase tags,
  duplicate tags, excluded tags:** `simpleCatalogEnrichmentResponse.test.ts` covers each case
  (`extractJsonObject` x4, tag single-word/dedupe/exclusion/cap, confidence clamp/default/string).
- **`aiSuggestions` fields:** mapping test asserts `title`, `description`, `tags` (filtered single
  words), `confidence`, `provider: openai`, `model` (actual id), `promptVersion` (v17),
  `generatedAt`. Visible text stored on `aiAnalysis.visibleText` (established field; no new
  persisted field invented — see reconciliation note below).
- **Default model + one-off override:** unchanged; `createOpenAiVisionEnrichmentProvider` still
  receives the resolved/override model id and persists it on `aiSuggestions.model`.
- **Settings playground unchanged:** no edits to `aiEnrichmentPlayground.ts` /
  `testAiEnrichmentPlayground.ts`.

## Reconciliation note

The directive's checklist says `aiSuggestions.visibleText`. The repo's established storage
contract (confirmed in `shared/types/ai/aiProcessing.types.ts` and
`designAiFieldsMapper.ts`) places `visibleText` on `aiAnalysis`, not `aiSuggestions`. Per the
approved plan's constraint ("do not invent a new persisted field"), visible text is stored on
`aiAnalysis.visibleText`. This satisfies the intent (OCR text is persisted and available) without
adding a new field.

## Not run / pending

- Production Firebase Functions deploy — requires explicit human approval.
- Authenticated Studio smoke (playground vs AI Processing parity on the same image, single
  `openai.request.started`, no `reason: length`, override run, approve-to-Design-Library) — requires
  deployed functions + auth; documented in the plan's Manual Smoke section.
