# DEV Deploy Record — Subject Canonicalization (v31 / normalizer-v5)

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Project | **fresh-prints-dev only** |
| Goal | `smart-profile-subject-canonicalization-and-derivative-suppression` |
| Owner auth | DEV Functions allowlist + post-deploy verify + targeted canary prep |
| Baseline SHA | `b2183139f5affdd8329082eee50a19c79db21cff` (goal-path changes uncommitted) |

---

## Pre-deploy

| Check | Result |
|-------|--------|
| Branch | `development` |
| Source vs Implementation Review | Match (v31/v5 + canonicalization module) |
| Unexpected non-goal app/Rules/index changes | None |
| Functions build | `npm --prefix functions run build` — exit 0 |
| Firebase current project | `fresh-prints-dev` |
| Rules / Storage / indexes / migration required | **NO** |
| Allowlist unchanged | Yes — 4 Functions |

### Prior live revisions

| Function | Prior revision | Prior updateTime |
|----------|----------------|------------------|
| `enqueueAiEnrichment` | `enqueueaienrichment-00084-lom` | 2026-09-03T15:34:12Z |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00006-yex` | 2026-09-03T15:33:27Z |
| `startCatalogReprocessJob` | `startcatalogreprocessjob-00005-rab` | 2026-08-26T17:18:42Z |
| `previewCatalogReprocessJob` | `previewcatalogreprocessjob-00005-zur` | 2026-08-26T17:18:43Z |

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
| `enqueueAiEnrichment` | ACTIVE | Gen2 | us-central1 | nodejs20 | `enqueueaienrichment-00085-pun` | 100% | 2026-09-03T19:13:17Z |
| `onCatalogReprocessJobWritten` | ACTIVE | Gen2 | us-central1 | nodejs20 | `oncatalogreprocessjobwritten-00007-fuf` | 100% | 2026-09-03T19:13:21Z |
| `startCatalogReprocessJob` | ACTIVE | Gen2 | us-central1 | nodejs20 | `startcatalogreprocessjob-00006-her` | 100% | 2026-09-03T19:13:16Z |
| `previewCatalogReprocessJob` | ACTIVE | Gen2 | us-central1 | nodejs20 | `previewcatalogreprocessjob-00006-xed` | 100% | 2026-09-03T19:13:18Z |

All four `updateTime` values are newer than prior revisions. Latest revision receives 100% traffic.

---

## Live version evidence (packaged artifact)

Deployed Functions build artifact includes:

| Constant | Value |
|----------|--------|
| `CATALOG_ENRICHMENT_PROMPT_VERSION` | `catalog-enrich-v31` |
| `CURRENT_CATALOG_ENRICH_PROMPT_VERSION` | `catalog-enrich-v31` |
| `SMART_PROFILE_NORMALIZER_VERSION` | `smart-profile-normalizer-v5` |
| Reprocess snapshots | `catalog-enrich-v31` / `smart-profile-normalizer-v5` |

Per-design provenance (`smartProfile.provenance.promptVersion` / `normalizerVersion`) is confirmed on Owner canary Re-run AI — any post-reprocess v30/v4 is a QA FAIL.

---

## Not deployed / not performed

| Item | Status |
|------|--------|
| Unrelated Functions | **NO** |
| Firestore Rules | **NO** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration / mass backfill | **NO** |
| Full AI Review / Ready reprocess | **NO** |
| Autonomous | **OFF** (unchanged) |
| Tag retirement | **NO** |
| Production | **NOT TOUCHED** |
| Commit/push | **NO** |
| Signoff | **NO** |
