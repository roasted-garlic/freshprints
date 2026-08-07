# Amendment 9 P3 — Dev Functions deploy checkpoint (DO NOT RUN overnight)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Implementation | Amendment 9 P3 — server AI taxonomy read containment |
| Impl Review | **APPROVED** |
| Project | `fresh-prints-dev` only |
| Status | **Prepared — awaiting owner phrase. DO NOT DEPLOY without owner approval.** |

---

## Why deploy is required for live proof

P3 changes Cloud Functions runtime modules:

- `functions/src/ai/loadAiCatalogReferenceSnapshot.ts`
- `functions/src/ai/aiEnrichmentRuntimeCache.ts`

Studio/Portal clients do not embed this cache. Live taxonomy-cache metrics and Firestore reduction require a Functions deploy.

---

## Import / export dependency tracing (verified)

| Deployed Function | Why included |
|-------------------|--------------|
| `enqueueAiEnrichment` | → `runAiEnrichmentPipeline` → `loadCachedActiveCategories` / `loadCachedApprovedTags` → `loadAiCatalogReferenceSnapshot` |
| `testAiEnrichmentPlayground` | → playground → same runtime cache adapters |
| `testAiEnrichmentTagRerank` | → playground rerank → same adapters |
| `updateAiEnrichmentSettings` | → `clearAiEnrichmentRuntimeCache` → `clearAiCatalogReferenceSnapshotCache` (must ship coherent clear semantics) |

**Excluded (no import of P3 modules):** P4 portal catalog publication Functions, snapshot rebuild/retry callables, Portal/Studio-only code.

---

## Exact proposed command (DO NOT RUN until owner approves)

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentTagRerank,functions:updateAiEnrichmentSettings --project fresh-prints-dev
```

---

## Owner approval phrase (suggested)

`APPROVE DEV FUNCTIONS DEPLOY: AMENDMENT 9 P3`

---

## After deploy — smoke checks

1. Process ≥1 AI enrichment job on `fresh-prints-dev`.
2. Cloud Logging filter: `jsonPayload.message="ai-pipeline" AND jsonPayload.event=~taxonomy-`
3. Expect: one `taxonomy-cache-miss` + `taxonomy-load-success` on cold instance; subsequent jobs `taxonomy-cache-hit` within 15 minutes on the same warm instance.
4. Do **not** expect a global single-load guarantee across multiple instances.

---

## Explicit non-actions

- No production deploy
- No Rules / indexes / App Hosting
- No PR #40 merge
- No Stage 1b
