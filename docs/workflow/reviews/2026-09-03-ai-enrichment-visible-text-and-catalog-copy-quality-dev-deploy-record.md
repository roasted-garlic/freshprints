# DEV Deploy Record — Visible-Text / Catalog-Copy Quality (v32 / normalizer-v6)

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Project | **fresh-prints-dev only** |
| Goal | `ai-enrichment-visible-text-and-catalog-copy-quality` |
| Owner auth | DEV Functions allowlist + post-deploy verify + targeted canary |
| Workspace HEAD | `eac50d6c` (goal-path changes uncommitted) |
| Protected AI baseline | `125af425` (v31/v5 subjects) |

---

## Pre-deploy

| Check | Result |
|-------|--------|
| Branch | `development` |
| Source vs Implementation Review | Match (v32/v6 + `visibleTextQuality` + title/description guards) |
| Unexpected queue multi-select / Rules / index changes | **None** in deploy scope |
| Functions build | `npm --prefix functions run build` — exit 0 |
| Target project | `fresh-prints-dev` |
| Rules / Storage / indexes / migration required | **NO** |
| Allowlist unchanged | Yes — 4 Functions |

### Packaged constants (local `functions/lib` artifact)

| Constant | Value |
|----------|--------|
| `CATALOG_ENRICHMENT_PROMPT_VERSION` | `catalog-enrich-v32` |
| `CURRENT_CATALOG_ENRICH_PROMPT_VERSION` | `catalog-enrich-v32` |
| `SMART_PROFILE_NORMALIZER_VERSION` | `smart-profile-normalizer-v6` |
| Reprocess snapshots | `catalog-enrich-v32` / `smart-profile-normalizer-v6` |

### Prior live revisions (v31/v5)

| Function | Prior revision | Prior updateTime |
|----------|----------------|------------------|
| `enqueueAiEnrichment` | `enqueueaienrichment-00085-pun` | 2026-09-03T19:13:17Z |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00007-fuf` | 2026-09-03T19:13:21Z |
| `startCatalogReprocessJob` | `startcatalogreprocessjob-00006-her` | 2026-09-03T19:13:16Z |
| `previewCatalogReprocessJob` | `previewcatalogreprocessjob-00006-xed` | 2026-09-03T19:13:18Z |

---

## Deploy command

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:enqueueAiEnrichment,functions:onCatalogReprocessJobWritten,functions:startCatalogReprocessJob,functions:previewCatalogReprocessJob" --project fresh-prints-dev
```

**Result:** Deploy complete (exit 0). Only the four named Functions updated.

---

## Post-deploy revisions

| Function | State | Gen | Region | Runtime | New revision | Traffic | updateTime |
|----------|-------|-----|--------|---------|--------------|---------|------------|
| `enqueueAiEnrichment` | ACTIVE | Gen2 | us-central1 | nodejs20 | `enqueueaienrichment-00086-qet` | 100% | 2026-09-03T20:16:58Z |
| `onCatalogReprocessJobWritten` | ACTIVE | Gen2 | us-central1 | nodejs20 | `oncatalogreprocessjobwritten-00008-piw` | 100% | 2026-09-03T20:16:55Z |
| `startCatalogReprocessJob` | ACTIVE | Gen2 | us-central1 | nodejs20 | `startcatalogreprocessjob-00007-viw` | 100% | 2026-09-03T20:17:10Z |
| `previewCatalogReprocessJob` | ACTIVE | Gen2 | us-central1 | nodejs20 | `previewcatalogreprocessjob-00007-hug` | 100% | 2026-09-03T20:16:59Z |

All four `updateTime` values are newer than prior revisions. Latest revision receives 100% traffic.

---

## Not deployed / not performed

| Item | Status |
|------|--------|
| Unrelated Functions | **NO** |
| Firestore Rules | **NO** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration / backfill | **NO** |
| Full AI Review / Ready reprocess | **NO** |
| Autonomous enablement | **NO** (remains OFF) |
| Tag retirement | **NO** |
| Studio / Portal release | **NO** |
| Production | **NOT AUTHORIZED / untouched** |
| Commit / push | **NO** |

---

## Next

Owner targeted ≤10-design canary (individual Re-run AI). Checkpoint: `docs/workflow/reviews/2026-09-03-ai-enrichment-visible-text-and-catalog-copy-quality-owner-canary-checkpoint.md`.
