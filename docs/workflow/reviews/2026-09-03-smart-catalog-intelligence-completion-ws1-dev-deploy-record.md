# DEV Deploy Record: Smart Catalog Intelligence Completion — WS1

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | **WS1** — DEV Functions deploy + live verification |
| Project | **fresh-prints-dev** |
| Source SHA | `0424653dcfa28475030da2d63d1611e1380bf48b` (working tree includes WS1 uncommitted source) |
| Branch | `development` |
| Production | **NOT TOUCHED** |
| WS2 | **NOT STARTED** |

---

## Pre-deploy

| Check | Result |
|-------|--------|
| Branch development | PASS |
| Goal unchanged | PASS |
| WS1 source present (matches IR) | PASS |
| No overlapping unrelated app-code drift beyond WS1 + workflow docs | PASS |
| `.worktrees/` preserved | PASS |
| Functions build | PASS (predeploy + local) |
| Target fresh-prints-dev | PASS (`firebase use` → fresh-prints-dev) |
| Rules / Storage / indexes / Algolia settings | Not in deploy |
| Live Autonomous | OFF confirmed post-check |

---

## Exact allowlist (mechanically derived)

| Function | Why required | WS1 dependency |
|----------|--------------|----------------|
| `enqueueAiEnrichment` | Runs enrichment; Health retries on durable re-enqueue; Health failures via pipeline | `enqueueAiEnrichment.ts`, `aiEnrichmentPipeline.ts`, `catalogAutomationHealth.ts`, `catalogAutomationDecision` (via candidate), vision retry |
| `onCatalogReprocessJobWritten` | Worker runs same pipeline (decision/health) | `aiEnrichmentPipeline.ts` + decision path |
| `previewCatalogReprocessJob` | Preview inventory field `alreadyCurrentPipelineCount` + v32/v6 labels | `catalogReprocessCallables.ts`, `catalogReprocessEligibility.ts` |
| `startCatalogReprocessJob` | Same callables module / eligibility; keep Start bundle aligned with Preview (no Start executed) | `catalogReprocessCallables.ts`, eligibility |
| `syncPortalCatalogDesignToAlgolia` | Publication failure evidence + Health `publicationFailures` + rethrow | `syncPortalCatalogDesignToAlgolia.ts`, `catalogAutomationHealth.ts` |

**Not deployed:** `pauseCatalogReprocessJob`, `resumeCatalogReprocessJob`, `retryCatalogReprocessJobFailures` (unchanged behavior; revisions remain 00002-*).

---

## Deploy command

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only "functions:enqueueAiEnrichment,functions:onCatalogReprocessJobWritten,functions:previewCatalogReprocessJob,functions:startCatalogReprocessJob,functions:syncPortalCatalogDesignToAlgolia" --project fresh-prints-dev
```

| Result | Value |
|--------|-------|
| Exit code | **0** |
| Outcome | Deploy complete — all 5 Successful update operation |

---

## Revisions (us-central1, Gen2, Node.js 20, traffic 100%)

| Function | Prior revision | New revision | ACTIVE | Changed |
|----------|----------------|--------------|--------|---------|
| enqueueAiEnrichment | enqueueaienrichment-00086-qet | enqueueaienrichment-00087-xum | Yes | Yes |
| onCatalogReprocessJobWritten | oncatalogreprocessjobwritten-00008-piw | oncatalogreprocessjobwritten-00009-qon | Yes | Yes |
| previewCatalogReprocessJob | previewcatalogreprocessjob-00007-hug | previewcatalogreprocessjob-00008-yoj | Yes | Yes |
| startCatalogReprocessJob | startcatalogreprocessjob-00007-viw | startcatalogreprocessjob-00008-rup | Yes | Yes |
| syncPortalCatalogDesignToAlgolia | syncportalcatalogdesigntoalgolia-00004-wir | syncportalcatalogdesigntoalgolia-00005-riw | Yes | Yes |

Unrelated pause/resume/retry revisions unchanged (00002-*).

---

## Live verification

### Settings / Autonomous

Firestore `settings/aiEnrichment` (Admin read):

- `catalogWorkflowMode`: **shadow**
- `catalogAutonomousLiveEnabled`: **false**

### Automation Health

Firestore `settings/catalogAutomationHealth` keys present: `analyzed`, `routedNeedsReview`, `updatedAt`, `verifierInvoked`, `verifierUnresolved`, `wouldAutoApprove`.

Absent (expected “not tracked yet” in Studio UI until first WS1 events): `retries`, `failures`, `publicationFailures`, `hardBlockerRoutings`, `verifierConfirmed`, `actuallyAutoApproved`, `categoryGap`.

### Title hard block / verifier / Algolia wiring

- Source + deployed allowlist carry WS1 decision/health/sync changes.
- Algolia intentional failure injection: **not performed** (no safe non-destructive injector). Contract + deploy of sync Function verified; live failure path deferred to organic/retry events.

### Preview labels

Studio DEV source (`npm run dev:studio` active): Catalog Reprocessing Settings uses `Already current ({CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT}/{CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT})` → **catalog-enrich-v32** / **smart-profile-normalizer-v6**. No stale “Already v29” / “Already v30/v4” strings remain in that component.

### Studio DEV smoke

- WS1-touched Settings components present and consistent with IR.
- Health UI: “not tracked yet”, Publication failures row, truthful verifier wording.
- No WS1 Settings compile errors observed from source inspection.
- Unrelated full-project Studio `tsc` baseline debt: unchanged / out of scope.
- **No mass Preview inventory / Start** executed (WS2 territory).

---

## Explicit non-actions

| Action | Result |
|--------|--------|
| AI Review reprocess | NO |
| Ready reprocess | NO |
| Autonomous enable | NO |
| Tag retirement | NO |
| Firestore Rules deploy | NO |
| Storage Rules deploy | NO |
| Indexes | NO |
| Algolia settings mutation | NO |
| Migration/backfill | NO |
| Production | NO |
| Commit/push | NO |
| WS2 started | NO |

---

## WS2 readiness after live deploy

**YES** — WS1 calibration is live on DEV Functions + Studio source ready for owner-authorized WS2 inventory/Preview prep.

Do **not** auto-start WS2.
