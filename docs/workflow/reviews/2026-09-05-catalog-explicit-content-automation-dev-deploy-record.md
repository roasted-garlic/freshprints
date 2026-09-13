# DEV Deploy Record: Automatic Explicit Content Classification

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Corrective | `pre-ws5-catalog-profanity-autonomous-safety-gate` |
| Signoff | `docs/workflow/reviews/2026-09-05-catalog-explicit-content-automation-signoff.md` |
| Result | **SUCCESS** |

## Command

```bash
firebase deploy --only "functions:updateAiEnrichmentSettings,functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten" --project fresh-prints-dev
```

Exit: **0**

## Revisions (us-central1, Node.js 20, ACTIVE, 100% latest)

| Function | Prior | New |
|----------|-------|-----|
| `updateAiEnrichmentSettings` | `updateaienrichmentsettings-00047-ray` | `updateaienrichmentsettings-00048-nel` |
| `enqueueAiEnrichment` | `enqueueaienrichment-00094-wuz` | `enqueueaienrichment-00095-nuf` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00005-fud` | `reprocessreadydesignwithai-00006-jub` |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00016-han` | `oncatalogreprocessjobwritten-00017-may` |

Unrelated sample revisions unchanged: `resetAiEnrichmentForProcessing` `00042-mih`, `testAiEnrichmentPlayground` `00058-bop`, `updateCatalogWorkflowMode` `00001-med`.

## Live settings (read-only)

`settings/aiEnrichment`:

- `catalogWorkflowMode` = `shadow`
- `catalogAutonomousLiveEnabled` = `false`
- `explicitContentAutomationTerms` = **absent** → loader uses code defaults (45 terms)

No settings mutation performed during deploy verification.

## Deployed bundle verification

Downloaded GCF source zips for all four Functions; confirmed present:

- `explicitContentAutomationTerms` persist/load
- `clearAiEnrichmentRuntimeCache` on update
- matcher + `EXPLICIT_CONTENT_AUTOMATION_ALIAS_FAMILIES` (B-light)
- `explicitContentArtworkEvidence` + classify + human authority + atomic Ready Explicit write
- `explicit_automation_settings_unavailable` fail-closed
- `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1`

## Safety

- Rules / Storage / indexes / Hosting / Studio / Portal / production: **not deployed**
- Autonomous: **OFF** (unchanged)
- Commit/push: **not done**
