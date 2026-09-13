# DEV Deploy Allowlist — C1 v29 / normalizer-v3 Runtime

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Project | **fresh-prints-dev only** |
| Purpose | Put accepted C1 source (`catalog-enrich-v29` + `smart-profile-normalizer-v3`) into the **live** enrichment path |
| Status | **deployed + smoke PASS** — owner authorized |

---

## Evidence: DEV is still on v28 path

| Check | Result |
|-------|--------|
| Last recorded quality deploy | `2026-08-25T16:07:40Z` — v28 / normalizer-v2 wave |
| Live `enqueueAiEnrichment` `updateTime` (gcloud) | **`2026-08-25T16:07:27Z`** — revision `enqueueaienrichment-00079-bog` |
| C1 v29 / normalizer-v3 | Implemented **after** that deploy (local source + local observe only) |
| Flagship observe | Uses **local** `functions/lib` after `npm run build` — **not** Cloud Function runtime |
| Prod `enqueueAiEnrichment` `updateTime` | `2026-08-12T15:50:12Z` — **unchanged**; do not touch |

**Conclusion:** fresh-prints-dev live enqueue path is **still the v28-era deployment**. A narrow DEV Functions deploy is required before refinement signoff.

---

## Dependency inspection (narrow)

| Question | Answer |
|----------|--------|
| Sole live caller of `runAiEnrichmentPipeline` | `functions/src/enqueueAiEnrichment.ts` → **`enqueueAiEnrichment`** |
| Where v29 is set | `CATALOG_ENRICHMENT_PROMPT_VERSION` in `catalogTitleRules.ts` (bundled into enqueue) |
| Where normalizer-v3 is set | `SMART_PROFILE_NORMALIZER_VERSION` + promote in shared package (via `smartProfileBuilder` → candidate core → pipeline) |
| Vocab refresh callables required for C1? | **No** — already ACTIVE on DEV; unchanged by C1; not on enrichment hot path for this corrective |
| Algolia Functions? | **No** |
| Rules / indexes / secrets? | **No** |
| Settings / playground? | **No** |

---

## Exact allowlist (authorized deploy only)

```bash
firebase deploy --only functions:enqueueAiEnrichment --project fresh-prints-dev
```

| Include | Why |
|---------|-----|
| `enqueueAiEnrichment` | Only Function that runs the enrichment pipeline with prompt + normalizer |

| Exclude | Why |
|---------|-----|
| `refreshSmartProfileVocabSnapshotCallable` / `Scheduled` | Already deployed; not required for C1 runtime |
| `testAiEnrichmentPlayground` | Not the live path |
| `updateAiEnrichmentSettings` | Unrelated |
| All Algolia Functions | Out of scope |
| Firestore Rules / indexes | None |
| New secrets | None (`ALGOLIA_ADMIN_API_KEY` must stay off enqueue) |
| **fresh-prints-prod** | Forbidden |

---

## Post-deploy smoke (agent, after owner authorizes + deploy succeeds)

Bounded DEV only — **no bulk reprocess**:

1. Confirm deployed function `updateTime` advances past this authorize time
2. One (or few) owner-chosen DEV design(s) via real `enqueueAiEnrichment` path:
   - provenance `promptVersion` = `catalog-enrich-v29`
   - provenance `normalizerVersion` = `smart-profile-normalizer-v3`
3. Highland (`yJm2VBRvecPNjx79aSnK`) or equivalent: `subjects` include highland cow (mutates that design if re-enqueued — owner must authorize which design(s))
4. Jimothy-class: raccoon present; unsupported `people` absent
5. Live Autonomous remains OFF; no lifecycle / Autonomous behavior change

---

## Hard stops

- No deploy without owner **authorize** reply
- No production
- No Slice 5 / 6
- No bulk reprocess
- No reopen C2b
