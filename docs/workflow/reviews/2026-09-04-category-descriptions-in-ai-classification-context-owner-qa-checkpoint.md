# Owner QA Checkpoint — catalog-enrich-v34 category description context

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Environment | **fresh-prints-dev** only |
| Feature | Category descriptions in AI classification context (`catalog-enrich-v34`) |
| Plan | `docs/workflow/plans/2026-09-04-category-descriptions-in-ai-classification-context-plan.md` |
| Formal Review | `approved_with_changes` |
| Implementation Review | `approved_with_notes` |
| DEV deploy | **complete** (this checkpoint) |
| Mode | **shadow** · Autonomous **OFF** |
| WS4 | **PASS WITH NOTES** (not closed) |
| WS5 | **BLOCKED** |
| Production | **NOT TOUCHED** |
| Commit/push | **NOT DONE** (owner taxonomy QA first) |
| Agent canaries | **NOT RUN** — owner runs manually |

---

## Deployment verification

| Item | Result |
|------|--------|
| Project | `fresh-prints-dev` |
| Branch | `development` |
| `.worktrees/` | Preserved |
| Deploy command | `firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten,functions:testAiEnrichmentPlayground,functions:updateAiEnrichmentSettings,functions:previewCatalogReprocessJob,functions:startCatalogReprocessJob" --project fresh-prints-dev` |
| Rules / Storage / indexes / Hosting / Portal | **Not deployed** |
| Unrelated Functions changed | **NO** |

### Functions (post-deploy)

| Function | Prior → New | State | Runtime | Region | Traffic |
|----------|-------------|-------|---------|--------|---------|
| `enqueueAiEnrichment` | `00090` → **`enqueueaienrichment-00091-lur`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `reprocessReadyDesignWithAi` | `00001` → **`reprocessreadydesignwithai-00002-kuw`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `onCatalogReprocessJobWritten` | `00012` → **`oncatalogreprocessjobwritten-00013-xoq`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `testAiEnrichmentPlayground` | `00054` → **`testaienrichmentplayground-00055-mil`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `updateAiEnrichmentSettings` | `00046` → **`updateaienrichmentsettings-00047-ray`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `previewCatalogReprocessJob` | `00010` → **`previewcatalogreprocessjob-00011-wul`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |
| `startCatalogReprocessJob` | `00010` → **`startcatalogreprocessjob-00011-zon`** | ACTIVE | Node.js 20 | us-central1 | **100%** latest |

### Why each Function was deployed

1. **`enqueueAiEnrichment`** — normal AI Processing / retry; executes Gemini + prompt builder + stamps `catalog-enrich-v34`.
2. **`reprocessReadyDesignWithAi`** — Design Library → Reprocess with AI; runs same pipeline.
3. **`onCatalogReprocessJobWritten`** — Ready / AI Review bulk worker; must bundle v34.
4. **`testAiEnrichmentPlayground`** — Settings Playground parity / safe measurement path.
5. **`updateAiEnrichmentSettings`** — save validation requires `{{approved_categories}}` + `{{excluded_tags}}`.
6. **`previewCatalogReprocessJob`** / **`startCatalogReprocessJob`** — snapshot labels / eligibility target **v34** (coordinate + inventory; Start creates jobs; worker above executes Gemini).

### Live prompt resolution (no settings mutation)

Stored `settings/aiEnrichment.promptTemplate` still has names-only `{{approved_category_names}}` (previous-default family).  
`resolveAiEnrichmentPromptTemplate` **auto-upgrades** to shipped DEFAULT v34 (`{{approved_categories}}`) because required placeholders are missing / previous-default match.

| Check | Result |
|-------|--------|
| Bundle prompt version | **catalog-enrich-v34** (deployed `catalogTitleRules`) |
| Resolved default uses `{{approved_categories}}` | **YES** |
| Descriptions in built prompt (Faith & Worship sample) | **YES** |
| Normalizer | **smart-profile-normalizer-v6** |
| Schema | **smart-profile-v1** |
| Resolver changed | **NO** |
| Tags newly injected | **NO** |
| `catalogWorkflowMode` | **shadow** |
| `catalogAutonomousLiveEnabled` | **false** |

---

## Taxonomy (live — do not edit)

| Check | Result |
|-------|--------|
| Active category count | **25** |
| Materialization revision | **17** |
| Materialization ready | **YES** |
| Faith & Worship | **active** |
| Inspirational Quotes & Affirmations | **active** |
| Music & Bands | **active** |
| Duplicate `Inspirational & Affirmations` | **NO** |
| Categories missing descriptions | **0** |

---

## Cost / token measurement (API)

Method: direct Gemini OpenAI-compat call matching `geminiVisionEnrichmentProvider` (same image, no design/settings mutation).  
Playground **cannot** accept full DEFAULT (~10.7k chars; Playground max **8,000** template chars) → direct path used.

Raw JSON: `docs/workflow/reviews/_v34-category-description-playground-ab-dev.json`  
Image: `0MpiuK4ERPawPEsUoZLn` (Thin Red Line American Flag) — not an owner canary.

| Metric | A — v33 names-only | B — v34 names+descriptions |
|--------|--------------------|----------------------------|
| promptTokens | **2661** | **6271** |
| completionTokens | **349** | **396** |
| estimatedCostUsd (vision only) | **$0.000406** | **$0.000786** |

| Delta | Value |
|-------|-------|
| promptTokens B−A | **+3610** (Formal Review est. ~+4240) |
| vision cost B−A | **+$0.000380** (~**+93.6%** vs A) |
| Owner Studio combined baseline (v33 era) | **$0.000521** |
| Vision-only B vs that baseline | **+$0.000265** (~**+50.8%**) |

**Confidence / limitations**

- A/B is **primary vision call only** (no tag author / rerank). Owner baseline was **combined** Studio cost under v33 + tag/reranker.
- Apples-to-apples **combined** post-v34 vs $0.000521 still needs a normal enrichment that reports combined usage, or Studio observation during owner canaries.
- No cost-based corrective; no description shortening.

---

## Owner taxonomy QA (manual — DO NOT agent-execute)

Use local Studio on `development` → **fresh-prints-dev**. Prefer **Design Library → Reprocess with AI** (or AI Review path) so provenance stamps **catalog-enrich-v34**.

Quality principle (ADR-FP-163): plausible suboptimal category alone ≠ Needs Review. Materially unrelated dominant category is a problem.

### 1 — Faith

| Field | Value |
|-------|-------|
| Design ID | `8pSowFU1o1H1EjXBaXaA` |
| Title | I Can Do All Things Through Christ Who Strengthens Me Cross |
| Expected | **Faith & Worship** |

### 2 — Music / Pop competitive

| Field | Value |
|-------|-------|
| Design ID | `Ai4Wmfp4Vd6Ady2WCsKC` |
| Title | Dolly Parton I Will Always Love You Sheet Music Portrait |
| Judgment | Inspect artwork — **Music & Bands** vs **Pop Culture & Characters**; do not auto-mark either wrong without considering dominant buyer intent |

### 3 — Pop negative control

| Field | Value |
|-------|-------|
| Design ID | `0UsPRAh0tggzuX8xwWqq` |
| Title | Scooby-doo Bursting Through |
| Expected | **Pop Culture & Characters** |

### Optional inspirational regression (already passed pre-v34)

`74BdnNQuNWz0N0GaL4CO`, `8QpQFWwwfM21WEimy6Vm`, `FRP1L0K6AKq2hrgGnOxX` — one may be used as a v34 control if useful; full re-run of all three not required.

### Clean non-celebrity Music Ready candidate

**NO CLEAN NON-CELEBRITY MUSIC READY CANDIDATE** (read-only rescan after deploy; false “band” substring hits discarded).

---

## Owner reply format

Reply with exactly one of:

```text
OWNER V34 CATEGORY TAXONOMY QA: PASS
```

```text
OWNER V34 CATEGORY TAXONOMY QA: PASS WITH NOTES — ...
```

```text
OWNER V34 CATEGORY TAXONOMY QA: FAIL — ...
```

---

## Safety (this pass)

| Item | Result |
|------|--------|
| Rules / Storage / indexes deployed | **NO** |
| Migrations / backfills | **NO** |
| Tag/reranker behavior changed | **NO** |
| WS5 started | **NO** |
| Autonomous enabled | **NO** |
| Production touched | **NO** |
| Commit / push | **NO** |
| Owner canaries executed by agent | **NO** |
