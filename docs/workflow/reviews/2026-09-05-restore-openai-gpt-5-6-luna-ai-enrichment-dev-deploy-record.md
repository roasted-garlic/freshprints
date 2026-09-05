# DEV Deploy + QA Record — Luna Phase 1 (`gpt-5.6-luna` dual-provider)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Goal | `restore-openai-gpt-5-6-luna-ai-enrichment` |
| IR | `docs/workflow/reviews/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-implementation-review.md` |
| Owner auth | **APPROVE DEV DEPLOY FOR LUNA PHASE 1** |
| Result | **DEV DEPLOYED · DEV QA PASS WITH NOTES** |

---

## Deploy waves

### Wave 1 — original IR allowlist

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentTagRerank,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten" --project fresh-prints-dev --non-interactive
```

Exit: **0**

| Function | Revision (100% traffic) | Secrets bound (names only) |
|---|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00099-cuv` | `GEMINI_API_KEY`, `OPENAI_API_KEY` |
| `testAiEnrichmentPlayground` | `testaienrichmentplayground-00059-kuw` | `GEMINI_API_KEY`, `OPENAI_API_KEY` |
| `testAiEnrichmentTagRerank` | `testaienrichmenttagrerank-00021-tox` | `GEMINI_API_KEY`, `OPENAI_API_KEY` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00010-hab` | `GEMINI_API_KEY`, `OPENAI_API_KEY` |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00021-naw` | `GEMINI_API_KEY`, `OPENAI_API_KEY` |

Compute SA granted `secretAccessor` on `OPENAI_API_KEY` during deploy (names only; no values logged in this record).

### Wave 2 — Settings allowlist companion (QA-discovered)

`updateAiEnrichmentSettings` was required for **Default AI model = Luna** save. Original IR allowlist omitted it; Wave 1 Playground Luna worked, but Settings save returned `The selected vision model is not allowed.` on the prior revision.

```powershell
firebase deploy --only "functions:updateAiEnrichmentSettings" --project fresh-prints-dev --non-interactive
```

| Function | Revision |
|---|---|
| `updateAiEnrichmentSettings` | `updateaienrichmentsettings-00049-wif` |

### Wave 3 — settings-cache bust (QA-discovered dual-provider correctness)

Warm `enqueueAiEnrichment` instances cached Settings for 60s. Immediately after switching Default AI model to Luna, a no-override enqueue still resolved Gemini. Narrow fix: `clearAiEnrichmentSettingsCache()` at pipeline start.

```powershell
firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten" --project fresh-prints-dev --non-interactive
```

| Function | Final revision |
|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00100-mop` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00011-xir` |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00022-pob` |

Secret bindings reconfirmed on `enqueueaienrichment-00100-mop`: `GEMINI_API_KEY` + `OPENAI_API_KEY` (names only).

**Not deployed:** production, Rules, Storage Rules, indexes, migrations, Phase 2 registry, Hosting, Portal, Studio packaged release.

---

## DEV QA results

Scripts:

- `functions/scripts/luna-phase1-dev-qa.mjs` → `docs/workflow/reviews/_luna-phase1-dev-qa-results.json`
- `functions/scripts/luna-phase1-dev-qa-cachefix.mjs` → `docs/workflow/reviews/_luna-phase1-dev-qa-cachefix-results.json`

| # | Check | Result |
|---|---|---|
| 1 | Gemini Playground (`gemini-2.5-flash-lite`) | **PASS** — `provider=google` |
| 1b | Gemini normal enrichment | **PASS** (initial run) — `google` / `gemini-2.5-flash-lite` / `catalog-enrich-v34` |
| 1c | Gemini requests omit `reasoning_effort` | **PASS** — `provider.selected` logs show `reasoningEffort: null` for Google |
| 2 | Luna Playground live-auth | **PASS** — `provider=openai`, `visionModelId=gpt-5.6-luna`, elapsed ~4s; no auth rejection |
| 2b | Luna `reasoning_effort` | **PASS** — Cloud Logging `provider.selected` with `providerId=openai`, `modelId=gpt-5.6-luna`, `reasoningEffort=low` |
| 2c | Playground does not mutate Settings | **PASS** |
| 3 | Save Default AI model = Luna | **PASS** after Wave 2 — `settings/aiEnrichment.visionModelId=gpt-5.6-luna` |
| 3b | Normal enrichment with Luna default | **PASS** after Wave 3 cache fix — `openai` / `gpt-5.6-luna` / `catalog-enrich-v34` |
| 4 | Override isolation (Luna default + Gemini 3.1 override) | **PASS** — run `gemini-3.1-flash-lite`; Settings remained `gpt-5.6-luna` |
| 5 | Tag-rerank Playground on Luna | **PASS** — completed with `visionModelId=gpt-5.6-luna` |
| 5b | Suggestion-author | Modes were `auto`/`auto`; pipeline inherits selected provider/model (no silent Gemini pin remaining in code) |
| 6 | Reprocess with Luna default | **PASS** — `openai` / `gpt-5.6-luna` |
| 7 | Restore Default AI model | **PASS** — restored to `gemini-2.5-flash-lite` |

### Notes

- Pre-Wave-3 Luna default enqueue incorrectly used Gemini due to 60s Settings TTL on warm instances — corrected and re-verified.
- No OpenAI authentication/authorization rejection. Secret **values** are not recorded here.
- Prompt / normalizer / Smart Profile / evidence validators unchanged (`catalog-enrich-v34`).
- Mode remained `shadow`; Autonomous live gate `false`.

---

## Final DEV Settings

| Field | Value |
|---|---|
| `visionModelId` | `gemini-2.5-flash-lite` (restored) |
| `catalogWorkflowMode` | `shadow` |
| `catalogAutonomousLiveEnabled` | `false` |

---

## Safety

| Item | Status |
|---|---|
| Production | untouched |
| Autonomous | OFF |
| WS6 | not started |
| Phase 2 registry | not implemented |
| Rules / indexes / migrations | untouched |
| Commit / push | none |

---

## Owner readiness

**Phase 1 ready for owner DEV QA / signoff: YES (with notes)**

Notes to owner:

1. Wave 2 added `updateAiEnrichmentSettings` (required for Luna Default AI model save).
2. Wave 3 fixed warm-instance Settings cache so Default AI model switches apply immediately.
3. Disposable DEV QA fixture designs remain labeled `DEV QA FIXTURE — Luna…` (optional cleanup).
4. Evidence-friction / TD-034 remain parked pending model benchmark judgment.
