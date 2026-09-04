# DEV Deploy Record — Humor Dominant-Intent Override Reliability

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Project | **fresh-prints-dev** |
| Branch | `development` |
| Baseline SHA | `0424653dcfa28475030da2d63d1611e1380bf48b` (uncommitted humor-reliability source) |
| Corrective | `humor-dominant-intent-override-reliability` |
| Production | **NOT TOUCHED** |
| WS4 | **NOT STARTED** |

---

## Pre-deploy

| Check | Result |
|-------|--------|
| Branch development | PASS |
| IR source present (joke-primary dual-gate + signal wiring) | PASS |
| `.worktrees/` preserved | PASS |
| Functions build | PASS |
| v33 / v6 / v1 | PASS |
| Target fresh-prints-dev | PASS |

---

## Deploy

Allowlist:

- `enqueueAiEnrichment`
- `onCatalogReprocessJobWritten`
- `startCatalogReprocessJob`
- `previewCatalogReprocessJob`

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:enqueueAiEnrichment,functions:onCatalogReprocessJobWritten,functions:startCatalogReprocessJob,functions:previewCatalogReprocessJob" --project fresh-prints-dev --non-interactive
```

| Note | Detail |
|------|--------|
| CLI | First deploy updated 3/4 then hung on worker; worker completed to revision **00011** (verified via gcloud); CLI killed; worker re-deploy attempt also hung after success |
| Source verification | Downloaded deployed enqueue zip — contains `isJokePrimary` + `buildThemeCategoryResolveInput` |

### Revisions (us-central1, Gen2, Node.js 20, traffic 100%)

| Function | Prior | New | ACTIVE |
|----------|-------|-----|--------|
| enqueueAiEnrichment | `00088-xoj` | `00089-kod` | Yes |
| onCatalogReprocessJobWritten | `00010-ton` | `00011-wot` | Yes |
| startCatalogReprocessJob | `00009-cus` | `00010-yeb` | Yes |
| previewCatalogReprocessJob | `00009-jax` | `00010-mey` | Yes |

Unrelated unchanged: `pauseCatalogReprocessJob` `00002-kom`.

---

## Live settings

- `catalogWorkflowMode`: **shadow**
- `catalogAutonomousLiveEnabled`: **false**

---

## Canary outcome

**FAIL** on `#1` run 1/10 — see canary result + owner checkpoint.

Deploy itself is complete; live reliability gate **failed**.
