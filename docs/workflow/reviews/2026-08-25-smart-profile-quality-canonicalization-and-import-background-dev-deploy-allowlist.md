/**
 * DEV Deploy Allowlist — Smart Profile Quality + Canonicalization (+ Import Background)
 * + **auto Smart Profile vocab refresh** correction
 *
 * **Status:** Owner-authorized 2026-08-25 — **deployed** to `fresh-prints-dev` (see deploy record).
 *
 * **Target:** `fresh-prints-dev` only.
 * **Not included:** production, live Autonomous, Slice 5/6 unlock.
 */

## Preflight (update after test phase)

See `2026-08-25-smart-profile-quality-canonicalization-and-import-background-test-report.md`.

## Enrichment / vocab entrypoint resolution (repo source)

| Finding | Path |
|---------|------|
| Pipeline | `functions/src/ai/aiEnrichmentPipeline.ts` → `runAiEnrichmentPipeline` |
| Sole pipeline caller | `functions/src/enqueueAiEnrichment.ts` → `enqueueAiEnrichment` |
| Vocab **read** (hot path) | `loadSmartProfileVocabSnapshot` → `settings/aiSmartProfileVocab` (10min process cache) |
| Vocab **write / refresh** | `refreshSmartProfileVocabSnapshot` — bounded Firestore sample (max 400 profiles, top-N 40); scheduled + callable + throttled after successful profile write |
| Import session settings | Studio-only (Electron); no new Cloud Function |

## Final Functions allowlist (exact)

### Required for this refinement (enrichment + vocab auto-refresh)

1. `enqueueAiEnrichment` — prompt v28 / normalizer v2 / vocab read + opportunistic refresh trigger
2. `refreshSmartProfileVocabSnapshotCallable` — owner/admin force rebuild of `settings/aiSmartProfileVocab`
3. `refreshSmartProfileVocabSnapshotScheduled` — every 6 hours (America/Chicago)

### Optional / already-live companions (deploy only if also changing in this wave)

4. `testAiEnrichmentPlayground` — same vocab inject path (if playground deploy desired)
5. `updateAiEnrichmentSettings` — unchanged settings surface (only if included in same Functions deploy)

### Explicitly **not** required for vocab correction

- Algolia Functions (`syncPortalCatalogDesignToAlgolia`, reconcile*) — refresh does **not** use Algolia admin
- Catalog reprocess job Functions — Slice 4 surface; unchanged by this correction
- New secrets — none (`ALGOLIA_ADMIN_API_KEY` must remain **off** `enqueueAiEnrichment`)

## Firestore Rules

No change required for vocab write (Admin SDK). Staff client read of `settings/aiSmartProfileVocab` is **not** required for enrichment (Functions-only read). Existing `settings/{settingId}` write deny remains.

## Firestore Indexes

No new composite index required. Refresh query:

- `designs` where `smartProfile.provenance.version == "smart-profile-v1"` limit 400  
  (single-field equality; auto-indexed)

## Studio

Electron build against **fresh-prints-dev** for Import settings / landing QA. Not a Hosting deploy.

## Explicitly exclude

- `fresh-prints-prod`
- Enabling `catalogAutonomousLiveEnabled`
- Slice 5 / Slice 6 Start unlock
- Production Algolia mutations
- Manually curated vocab / synonym seed lists

## Post-deploy smoke (owner)

1. Confirm scheduled Function exists: `refreshSmartProfileVocabSnapshotScheduled`
2. Optional: call `refreshSmartProfileVocabSnapshotCallable` once as owner → Firestore `settings/aiSmartProfileVocab` has `source: "firestore_sample"`, `refreshedAt`, bounded list fields
3. Run one DEV enrichment → prompt receives vocab section when snapshot non-empty; novel terms still accepted
4. Imports Settings modal still page-scoped for single+batch
