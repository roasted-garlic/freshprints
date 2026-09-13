# DEV Deploy Record — Slice 5 Gate I Corrective (v30 / normalizer-v4)

| Field | Value |
|-------|--------|
| Date | 2026-08-26 |
| Project | **fresh-prints-dev** |
| Result | **SUCCESS** |
| Recommendation | **READY FOR POST-DEPLOY MINI QA** |

---

## Command used

```bash
firebase deploy --project fresh-prints-dev --only functions:enqueueAiEnrichment,functions:onCatalogReprocessJobWritten,functions:startCatalogReprocessJob,functions:previewCatalogReprocessJob
```

Allowlist rationale: `docs/workflow/reviews/2026-08-26-slice-5-gate-i-corrective-dev-deploy-allowlist.md`

---

## Functions deployed

| Function | Why required | State | updateTime (UTC) |
|----------|--------------|-------|------------------|
| `enqueueAiEnrichment` | Live enrichment pipeline (v30/v4 + decision) | ACTIVE | `2026-08-26T15:50:49Z` |
| `onCatalogReprocessJobWritten` | Slice 5 worker → same pipeline | ACTIVE | `2026-08-26T15:50:49Z` |
| `startCatalogReprocessJob` | Stamps job `promptVersion`/`normalizerVersion` snapshots (v30/v4) | ACTIVE | `2026-08-26T15:50:54Z` |
| `previewCatalogReprocessJob` | Preview/eligibility notes use prompt snapshot | ACTIVE | `2026-08-26T15:50:48Z` |

---

## Versions in deployed build artifact

| Constant | Value |
|----------|--------|
| `CATALOG_ENRICHMENT_PROMPT_VERSION` | `catalog-enrich-v30` |
| `SMART_PROFILE_NORMALIZER_VERSION` | `smart-profile-normalizer-v4` |
| Reprocess snapshots | `catalog-enrich-v30` + `smart-profile-normalizer-v4` |

(Confirmed in `functions/lib` after predeploy build; no design mutation.)

---

## Safety post-checks

| Check | Result |
|-------|--------|
| Deploy target | fresh-prints-dev only |
| Prod `enqueueAiEnrichment` updateTime | `2026-08-12T15:50:12Z` — **unchanged** |
| `catalogWorkflowMode` | `shadow` |
| `catalogAutonomousLiveEnabled` | `false` |
| Ready Catalog gate | remains `false` in constants |
| Active reprocess jobs | **0** |
| Rules / indexes / App Hosting / Studio | not deployed |
| Full 204 reprocess | not started |
| Mini QA | not run (STOP) |

---

## Warnings

1. Working tree had ambient uncommitted Slice 3–5 / Studio / Portal changes; deploy was Functions-only allowlist.
2. Node.js 20 runtime deprecation warning from Firebase CLI (lifecycle notice only).
3. Prompt/normalizer versions confirmed from build artifact; live provenance on a design requires a later authorized mini-QA enqueue (not done here).

---

## Next

Owner-authorized **post-deploy mini QA** only. Do not full-204 reprocess, enable Autonomous, unlock Ready Catalog, start Slice 6, or touch production.
