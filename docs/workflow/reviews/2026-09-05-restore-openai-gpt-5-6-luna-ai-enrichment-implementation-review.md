# Implementation Review: Restore OpenAI `gpt-5.6-luna` AI enrichment (Phase 1)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Plan | `docs/workflow/plans/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-review.md` (`approved_with_notes`) |
| Verdict | **approved_with_notes** — source ready for DEV deploy; **deploy not authorized this pass** |
| Environment | `fresh-prints-dev` (deploy pending owner authorization) |

---

## Checklist (owner-required 1–33)

| # | Question | Answer |
|---|----------|--------|
| 1 | Luna added | **YES** — `gpt-5.6-luna` |
| 2 | Existing Gemini models retained | **YES** |
| 3 | Gemini 3.1 selectable | **YES** |
| 4 | Global default solely `visionModelId` | **YES** |
| 5 | System fallback Gemini 2.5 | **YES** |
| 6 | No automatic Luna switch | **YES** |
| 7 | Explicit provider metadata | **YES** — `VISION_MODEL_PROVIDER_BY_ID` |
| 8 | Prefix inference present | **NO** |
| 9 | Reasoning effort | **low** (Luna only) |
| 10 | Cached-input pricing | **YES** — 0.02 / 1M |
| 11 | OpenAI secret server-only | **YES** — Secret Manager; no value accessed/logged |
| 12 | Primary enrichment routes | **YES** |
| 13 | Reprocess routes | **YES** |
| 14 | Playground routes | **YES** |
| 15 | Processing override routes | **YES** |
| 16 | Rerank routes | **YES** — follows selected provider/model |
| 17 | Suggestion-author routes | **YES** |
| 18 | Approved path exceptions | **none** |
| 19 | Override mutates global default | **NO** |
| 20 | Settings can select any Phase 1 model | **YES** — label “Default AI model” |
| 21 | Model change affects prompt | **NO** |
| 22 | v34 unchanged | **YES** |
| 23 | Normalizer v6 unchanged | **YES** |
| 24 | Smart Profile v1 unchanged | **YES** |
| 25 | Evidence validators changed | **NO** |
| 26 | Explicit system changed | **NO** |
| 27 | Migration required | **NO** |
| 28 | Rules change | **NO** |
| 29 | Indexes change | **NO** |
| 30 | Exact tests/results | See Test section below |
| 31 | DEV deploy allowlist | See below |
| 32 | Source ready for DEV deploy | **YES** |
| 33 | Unresolved owner checkpoint | **Authorize DEV deploy**; later OpenAI secret live-auth QA |

---

## Test results (this session)

| Command | Result |
|---------|--------|
| `npx tsx --test` Functions: config/provider/vision/slice5 | **36 pass / 0 fail** |
| `npx tsx --test` shared `aiEnrichment.constants.test.ts` | **8 pass / 0 fail** |
| `npx tsx --test` Studio settings constants | **27 pass / 0 fail** |
| `npm run build` (functions) | **exit 0** |
| `optionalAlgoliaSecretDiscovery` | enqueue + secrets **pass** (OPENAI present); **index discovery fail** = pre-existing ALGOLIA leak on default index — **unrelated baseline** |
| Studio `tsc --noEmit` | **baseline errors** outside Luna files (pngValidator, export tests, staff-inbox unused, etc.) — none attributed to Luna allowlist/UI |
| eslint (touched Luna files) | run with focused paths |
| `git diff --check` | Luna files clean; unrelated trailing whitespace in `CURRENT-STATE.md` |

---

## DEV deploy allowlist (owner must authorize separately)

**Do not deploy in this pass.** When authorized for `fresh-prints-dev` only:

### Cloud Functions (secret rebinding required)

- `enqueueAiEnrichment` — secrets: `GEMINI_API_KEY`, `OPENAI_API_KEY`
- `testAiEnrichmentPlayground` — secrets: `GEMINI_API_KEY`, `OPENAI_API_KEY`
- `testAiEnrichmentTagRerank` — secrets: `GEMINI_API_KEY`, `OPENAI_API_KEY`
- `reprocessReadyDesignWithAi` — secrets: `GEMINI_API_KEY`, `OPENAI_API_KEY`
- `onCatalogReprocessJobWritten` — secrets: `GEMINI_API_KEY`, `OPENAI_API_KEY`

### Studio

- Ship Studio build that includes Default AI model picker options (Gemini 2.5 / 3.1 / Luna)

### Shared

- Deploy/consume shared package constants allowing `gpt-5.6-luna` + provider map + pricing (monorepo: ship with Functions/Studio)

### Explicitly out of allowlist

- Production
- Firestore rules / indexes / migrations
- Phase 2 model registry
- Autonomous / WS6
- Prompt / normalizer / evidence changes

---

## Notes

- ADR-FP-174 recorded (amends ADR-FP-040).
- Evidence-friction / TD-034 remain **PARKED — PENDING NEW MODEL DEV BENCHMARK**.
- Phase 2 dynamic registry **not implemented**.
- OpenAI secret **value** was never accessed or displayed.
