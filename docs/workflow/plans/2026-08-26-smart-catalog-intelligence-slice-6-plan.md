# Plan: Smart Catalog Intelligence — Slice 6 (Ready Catalog Reprocess + Autonomous Readiness Calibration)

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Parent goal | `smart-catalog-intelligence-unattended-enrichment` |
| Prior | Slice 5 signoff **approved_with_notes** — `docs/workflow/reviews/2026-08-26-smart-catalog-intelligence-slice-5-signoff.md` |
| Related Formal Review | `docs/workflow/reviews/2026-08-26-smart-catalog-intelligence-slice-6-review.md` |
| Master plan | `docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md` §11a / §13 / §15 |
| Pipeline | **catalog-enrich-v30** + **smart-profile-normalizer-v4** |

---

## 1. Goal

Safely reprocess the existing **Ready Catalog** on **fresh-prints-dev** through the current v30/v4 Smart Profile pipeline under **Shadow**, while **keeping every Ready design Ready** (no Needs Review demotion, no unpublish, no customer-visible lifecycle change). Generate current Smart Profiles, measure catalog-wide quality and automation confidence, compare coverage vs legacy tags, and produce evidence toward a **later** live Autonomous enablement phase — without enabling Autonomous, unlocking production, or retiring tags in this initial Slice 6 pass.

---

## 2. Phase alignment

| Item | State |
|------|--------|
| Parent | `smart-catalog-intelligence-unattended-enrichment` |
| Slice 5 | **COMPLETE** (approved_with_notes) |
| This pass | **Plan → Formal Review → STOP** |
| Implementation | **Not authorized** until separate owner phrase after Formal Review |
| Runtime today | Shadow; Autonomous live **false**; `CATALOG_REPROCESS_READY_CATALOG_ENABLED = false`; production untouched |

Preferred execution cadence (mirrors Slice 5):

```
Plan → Formal Review → (owner authorizes Implement)
  → code for Ready-preservation path
  → DEV deploy allowlist
  → unlock Ready Catalog gate constant
  → read-only Preview inventory
  → owner Preview review
  → explicit Start authorization (phrase)
  → durable job
  → owner stratified sample
  → Slice 6 signoff
```

**Do not** auto-enable Autonomous or retire tags at signoff.

---

## 3. In scope

1. **Repo-grounded Ready Catalog reprocess path** for `targetType = ready_catalog`.
2. **Ready preservation contract** (regenerate / preserve / never-touch) implemented in worker + pipeline success/failure writes.
3. **Eligibility + Preview inventory** for Ready Catalog (read-only counts/distributions).
4. **Durable job execution** reusing `catalogReprocessJobs` + `onCatalogReprocessJobWritten` + outcomes subcollection.
5. **Outcome metrics** for calibration and Autonomous-readiness evidence (would-auto-approve, verifier, category conflict, preservation violations).
6. **Owner stratified sample plan** after job completion.
7. **Legacy-tag vs Smart Profile coverage analysis** (measurement only; no retirement).
8. **Studio UI** enablement for Ready Catalog Preview/Start once gate unlocked (same owner-only control plane).
9. Docs: DATA_MODEL / BACKEND / ROADMAP / DECISIONS updates for Ready backfill semantics.
10. Tests proving Ready designs never leave `status=ready` / `aiReviewStatus=approved` across clear → enrich → success/fail.

---

## 4. Out of scope

- Live Autonomous enablement (`catalogAutonomousLiveEnabled=true`) or mode leave from Shadow
- Production deploy / production Ready Catalog reprocess
- Legacy tag retirement / Tag Management hide / facet removal (separate owner gate; see §14)
- Category CRUD / new categories from AI
- Print Requests / Show Queue / companion graph mutations
- Full AI Review Queue reprocess again
- Changing published root `title` / `description` / `categoryId` / root `tags` during backfill
- Approving/rejecting designs as part of the job
- Slice 7+ product work beyond measurement criteria definition

---

## 5. Repo-grounded current behavior (critical)

### 5.1 Gates

| Constant / UI | Current | Path |
|---------------|---------|------|
| `CATALOG_REPROCESS_READY_CATALOG_ENABLED` | **`false`** | `packages/shared/src/constants/catalogReprocess.constants.ts` |
| Confirmation (DEV) | `REPROCESS READY CATALOG` | same |
| Confirmation (PROD) | `REPROCESS PRODUCTION READY CATALOG` | same |
| Studio Start allow | Hardcoded `targetType === "ai_review_queue"` + Shadow + live OFF + phrase | `CatalogReprocessingSettingsSection.tsx` |
| Unavailable copy | “unlocks in Slice 6…” | `catalogReprocessUnavailableReason` |

### 5.2 Preview / Start callables

| Behavior | Evidence |
|----------|----------|
| Preview when gate false | Returns base payload; **no inventory**; `eligibleCount: 0` | `catalogReprocessCallables.ts` |
| `estimateEligibleCount("ready_catalog")` | **Stub returns `0`** | `catalogReprocessEligibility.ts` |
| Start when gate false | `failedPrecondition` unavailable reason | callables |
| Shadow preflight on Start | Only enforced for `ai_review_queue` today | `assertShadowCalibrationStartAllowed` |

### 5.3 Worker

| Behavior | Evidence |
|----------|----------|
| Non–`ai_review_queue` | Immediately **fails** job: `slice_execution_not_enabled` | `catalogReprocessWorker.ts` |
| Clear payload | Forces `status: "imported"`, `aiReviewStatus: "pending"`, clears AI blobs | `buildCatalogReprocessAiClearUpdate()` |
| Success assert | Requires `imported` + `needs_review`; else `shadow_lifecycle_violation` anomaly + soft-pause | worker |
| Pipeline | Same `runAiEnrichmentPipeline` as queue | worker |

### 5.4 Enrichment pipeline (unsafe for Ready if reused as-is)

| Step | Behavior | Ready risk |
|------|----------|------------|
| Entry | Requires `aiProcessingStage === "queued"` and `aiReviewStatus` missing or **`pending`** | Must stage work without demoting Ready |
| `markAiSuccess` (default) | Sets `aiReviewStatus: "needs_review"` | **Would demote Ready → Needs Review** |
| `markAiSuccess` (`publishReady`) | Sets `ready` + `approved` + overwrites `aiReviewedBy: system:catalog-autonomy` + `readyAt` | **Would rewrite human approval audit** |
| `markAiFailure` | Sets `aiReviewStatus: "pending"` | Leaves Ready in inconsistent review state |

### 5.5 Algolia

| Behavior | Evidence |
|----------|----------|
| Sync trigger | `onDocumentWritten` `designs/{designId}` | `syncPortalCatalogDesignToAlgolia.ts` |
| Non-ready after | **`deleteObject`** from portal catalog index | same |
| Ready + Smart Profile index fields change | Classifier → upsert public-safe Smart Profile projection | `portalCatalogChangeClassifier.ts` |
| Provenance-only churn | Does **not** sync | `projectSmartProfileForAlgoliaIndex` |

**Implication:** Any write that sets `status !== "ready"` (even briefly) **unpublishes** the design from Algolia. Slice 5 AI-clear (`status: imported`) is therefore **catastrophic** if applied to Ready designs.

### 5.6 Parent doctrine (still binding)

Master plan §13: Ready backfill keeps designs `ready` throughout; Catalog Processing Mode must **not** drive Ready designs through approval lifecycle; preserve published title/description/category; tags until separate retirement gate; Algolia via **existing** sync.

### 5.7 Verdict on “is current worker already safe?”

**No.** Current worker is AI Review Queue–only and uses a clear/success path that would demote Ready designs and delete them from Algolia. **Code changes are required before any Ready Preview/Start unlock.**

---

## 6. Exact eligibility contract (Ready Catalog)

### Eligible (include)

| Condition | Notes |
|-----------|--------|
| `status === "ready"` | Primary catalog-ready operational status |
| Prefer also `aiReviewStatus === "approved"` | Fail closed if Ready without approved (treat as anomaly/skip with reason) |
| Has usable preview asset | `previewPath` or `thumbnailPath` present; else per-design `failed` / skip with code |

### Excluded (default)

| Condition | Notes |
|-----------|--------|
| `status` ∈ {`imported`,`processing`,`rejected`,`archived`,…} | Not Ready Catalog |
| Active AI Review Queue eligibility | Slice 5 target; separate job |
| Missing design doc | Skip |

### Reprocess policy for already-current pipeline

| Case | Default |
|------|---------|
| Missing Smart Profile | Include |
| Older prompt/normalizer (v27–v29 / v1–v3) | Include |
| Already `catalog-enrich-v30` + `smart-profile-normalizer-v4` | **Include** for Slice 6 calibration consistency (same as Slice 5 default), unless owner later authorizes skip-current |

### Shared helpers to add

- `isReadyCatalogEligibleDesign({ status, aiReviewStatus })`
- `buildReadyCatalogEligibleQuery()` → `designs.where("status","==","ready").orderBy(documentId)`
- `countReadyCatalogEligible` / paging analogous to AI Review helpers
- `buildReadyCatalogInventory()` for Preview

---

## 7. Preservation matrix

### A — REGENERATED (AI-owned)

| Field | Notes |
|-------|--------|
| `smartProfile` | Full replace with v30/v4 output + shadow provenance |
| `aiSuggestions` | Replace |
| `aiAnalysis` | Replace |
| `aiProcessingStage` | Transient `queued` → processing stages → terminal backfill stage (see below) |
| `aiProcessed` | Reflect pass |
| `aiReviewConfidence` / `aiReviewVersion` | May update from suggestions metadata |
| Automation provenance inside `smartProfile.provenance` | Decision, reason codes, verifier flags |
| Job `outcomes/{designId}` | New/updated |

**Terminal stage for Ready backfill:** prefer restore to a non-review-queue stage such as `ready_for_review` **or** a dedicated `ready_backfill_complete` only if already patterned — **do not** invent customer-facing status. Prefer reusing `ready_for_review` / leaving stage empty only if docs already allow; implement must document exact terminal stage in DATA_MODEL. Default proposal: after success, set `aiProcessingStage: "ready_for_review"` (matches pipeline success today) while **keeping** `status=ready` + `aiReviewStatus=approved`.

### B — PRESERVED (must not rewrite)

| Field | Notes |
|-------|--------|
| `status` | Must remain `"ready"` on **every** intermediate write |
| `aiReviewStatus` | Must remain `"approved"` after success/fail recovery (see algorithm) |
| `aiReviewed`, `aiReviewedAt`, `aiReviewedBy` | Human/system approval audit preserved |
| `readyAt` | Do not bump |
| Root `title`, `description`, `categoryId` | Never overwrite from AI suggestions during backfill |
| Root `tags` | Preserve; no retirement |
| `artworkBackgroundHex` / `artworkBackgroundSource` | Preserve |
| Halftone staff fields | Preserve |
| `isExplicitContent`, `censoredTerms` | Preserve |
| Companion fields | Preserve IDs/flags; no graph mutation |
| Asset paths, sizing/metrics, engagement counters | Preserve |
| `uploadedBy`, `createdBy`, `createdAt` | Preserve |
| Staff notes unrelated to AI clear | Do not clear Ready-specific staff fields; Ready typically has empty `aiReviewNotes` — if present, **preserve** (unlike Slice 5 A-clear of notes). **[Binding]** Ready clear must **not** delete `aiReviewNotes` unless inventory proves none matter — default **preserve notes**. |

### C — NEVER TOUCH

| Area | Notes |
|------|--------|
| Ready lifecycle demotion | No `imported` / `needs_review` terminal state |
| Print requests / show allocations / queue counts as business objects | No mutation |
| Category docs / tag taxonomy retirement | No |
| Autonomous live flag / workflow mode | No change by job |
| Production project | Out of scope |

---

## 8. Critical algorithm — Ready-preserving re-enrichment

### 8.1 Required new clear builder

Add `buildReadyCatalogReprocessAiClearUpdate()` (name flexible) that:

- Deletes/regenerates AI blobs: `aiSuggestions`, `aiAnalysis`, `smartProfile` (and request overrides as today)
- Sets `aiProcessingStage: "queued"`, `aiProcessed: false`
- **Does not set** `status`, `aiReviewStatus`, `aiReviewed*`, `readyAt`, title/description/category/tags/bg/halftone/companions
- **Does not delete** `aiReviewNotes` (Ready default preserve)

Optional safer variant (Formal Review preference): avoid deleting `smartProfile` until success write replaces it in one update to minimize empty-profile Algolia flash — implement may choose atomic replace-on-success if pipeline can overwrite without prior delete. If prior delete is required for pipeline hygiene, keep `status=ready` so Algolia upserts a temporary thinner record rather than deleting the object.

### 8.2 Pipeline extension (required)

Add an explicit Ready-backfill success/failure mode, e.g. options on `runAiEnrichmentPipeline` / `markAiSuccess` / `markAiFailure`:

| Mode | Entry accept | Success write | Failure write |
|------|--------------|---------------|---------------|
| Queue (existing) | pending + queued | `needs_review` (Shadow) or publishReady Autonomous | pending + failed stage |
| **Ready backfill (new)** | `status=ready` + (`approved` or temporary pending) + `queued` | Keep `status=ready`, `aiReviewStatus=approved`; **do not** set `aiReviewedBy`/`readyAt`; write AI blobs + smartProfile only | Restore `aiReviewStatus=approved` + safe stage; never leave Ready as `needs_review` |

**Catalog Processing Mode:** for Ready backfill, **ignore** mode for lifecycle (master §13). Always record shadow-style automation decision in provenance (`shadow` / reason codes / would-auto-approve). Never call `publishReady` autonomy path for these designs.

### 8.3 Worker branch

When `targetType === "ready_catalog"`:

1. Page Ready-eligible designs (not AI Review query).
2. Apply Ready clear (not queue clear).
3. Run pipeline in Ready-backfill mode.
4. Assert post-state: `status === "ready"` && `aiReviewStatus === "approved"`.
5. Else write outcome `anomaly` with `ready_lifecycle_violation` and **soft-pause** (same severity as Slice 5 shadow violation).
6. Record would-auto-approve / verifier / reason codes from provenance (same derivation helpers; extend flags for `category_dominant_intent_conflict`).

### 8.4 Answers to owner algorithm questions

| # | Answer |
|---|--------|
| 1 | Current worker does **not** have Ready-preservation mode |
| 2 | Intended target type exists (`ready_catalog`) but is fail-closed |
| 3 | Intended to share enrichment candidate/pipeline code, **not** the Slice 5 clear/success lifecycle writes |
| 4 | Yes — current clear/success **unsafe** for Ready |
| 5 | Algolia sync **does** upsert when Smart Profile index fields change on `status=ready` |
| 6 | Expected and **desired** for search backfill; must keep `status=ready` always; provenance-only churn does not sync |
| 7 | Yes — root title/category/description remain B-preserve; only AI blobs regenerate |
| 8 | Automation recorded in `smartProfile.provenance` + job outcomes; lifecycle unchanged |

---

## 9. Read-only Preview design

When Ready gate enabled (post-implement unlock):

Preview returns inventory analogous to Slice 5:

| Field | Purpose |
|-------|---------|
| `eligibleCount` | Ready eligible designs |
| status / aiReviewStatus distributions | Sanity |
| prompt/normalizer version distributions | Migration surface |
| `missingProfileCount` | Gap |
| `alreadyCurrentPipelineCount` | Already v30+v4 (rename from `alreadyV29Count` or add parallel field) |
| exclusions | rejected / archived / imported needs_review / processing pending counts |
| optional: tag-density buckets | few/many legacy tags (for sample strata) |

**Before unlock:** Preview remains gated (current behavior). Do **not** unlock during this planning pass.

Optional enhancement (approved_with_changes candidate): allow **inventory-only Preview while Start still phrase-gated** after constant unlock — same as Slice 5 pattern once `ENABLED=true`.

---

## 10. Job architecture / worker behavior

Reuse Slice 4/5 durable model:

| Concern | Approach |
|---------|----------|
| Collection | `catalogReprocessJobs` |
| Outcomes | `outcomes/{designId}` |
| Concurrency | One design per claim (`CATALOG_REPROCESS_DESIGNS_PER_CLAIM = 1`) |
| Pause / resume / retry failures | Existing callables |
| One active job per `(projectId, targetType)` | Existing policy |
| Start preflight | Extend Shadow + Autonomous-OFF check to **`ready_catalog`** as well |
| Dry-run | Keep fail-closed or no-op unless already defined; do not mutate Ready in dry-run |

New / extended counters (job doc):

| Counter | Meaning |
|---------|---------|
| `remainedReady` | Success with Ready preserved |
| `preservationViolations` / `anomalies` | Lifecycle violations |
| Existing | `wouldAutoApprove`, `verifierInvoked`, `verifierUnresolved`, `hardBlocked`, `failed`, `skipped` |
| Optional rolls | `categoryDominantIntentConflict`, `categoryGap` (from reason codes) |

Deprecate misuse of `remainedNeedsReview` for Ready jobs (leave 0; do not require Needs Review).

---

## 11. Algolia / publication implications

| Event | Expected |
|-------|----------|
| Clear while `status=ready` | May upsert thinner Smart Profile fields if profile deleted pre-enrich |
| Success Smart Profile write | Upsert expanded Smart Profile search/facets — **intended** |
| Accidental `status≠ready` | **Delete from index** — treat as P0 preservation bug |
| Title/tags/category unchanged | No INDEX_FILTER churn from those fields |
| Portal browse membership | Unchanged if status stays ready |

No parallel publisher. No staged “hold Algolia” unless Formal Review later requires a feature flag; default = existing sync is correct.

DEV-first only. Production Ready reprocess remains separately gated by phrase + owner.

---

## 12. Metrics / outcome recording

Per design outcome (extend `CatalogReprocessOutcomeDocument` as needed):

- designId, status, timestamps
- promptVersion, normalizerVersion
- automationDecision, automationReasonCodes, wouldAutoApprove
- verifierInvoked / verifierOutcome
- hardBlocked, categoryGap, titleValidationIssue, subject flags
- **categoryDominantIntentConflict** (reason code present)
- finalStatus, finalAiReviewStatus
- **remainedReady** (bool)
- optional snapshot hashes: root title/categoryId unchanged (boolean checks)

Job + optional post-job aggregation script (DEV) for:

- totals, eligible, version distributions
- rates: would-auto-approve, verifier unresolved, category conflict, evidence gaps
- artificial-compound heuristics (reuse Gate I patterns where detectable)
- vocabulary growth signals (via existing vocab snapshot refresh — observe only)
- **preservationViolations = 0** hard gate for signoff

---

## 13. Owner sampling strategy (post-run)

Target **~25–40** designs stratified across:

| Stratum | Intent |
|---------|--------|
| would-auto-approve | Trust if unattended today? |
| verifier-blocked / unresolved | Correct blocks vs over-conservative |
| category_dominant_intent_conflict | Conflict detector on Ready art |
| category gap | Unresolved category |
| Animals / people-characters / professions | Identity quality |
| Holidays / faith / humor | Domain mix |
| Text-heavy / complex art / sparse art | Profile shape |
| Older legacy / many tags / few-or-no tags | Coverage vs tags |

Question for each: **Would we trust this Smart Profile + automation result if ingested unattended today?**

Verdicts: PASS / PASS WITH NOTES / FAIL PROFILE / FAIL AUTOMATION (same vocabulary as Gate I).

---

## 14. Autonomous-readiness evidence (no enablement)

Slice 6 **does not** enable Autonomous. It defines evidence to collect for a **future** enablement phase.

### Proposed evidence checklist (thresholds = HUMAN CHECKPOINT)

| Evidence | Direction |
|----------|-----------|
| Preservation violations | Must be **0** on DEV job |
| Ready → non-ready transitions | **0** |
| Unexpected Algolia deletes for Ready IDs | **0** (spot-check + logs) |
| Owner sample material FAIL AUTOMATION | Aim **0**; any HIGH severity blocks Autonomous discussion |
| False-positive would-auto-approve rate | Owner sets acceptable band after sample |
| Category mismatch / conflict handling | Conflicts should hard-block, not silent approve |
| Unsupported subjects | Must not bypass verifier |
| Artificial compounds | Materially rare vs Gate I pre-corrective |
| Sample size / strata coverage | Owner confirms adequacy |

Mark **HUMAN CHECKPOINT** before any live Autonomous phrase: owner sets numeric thresholds using Slice 6 results — do not invent final percentages in this plan.

---

## 15. Legacy-tag comparison strategy

**No retirement in this pass.**

Measurement-only analysis after/during job:

| Compare | Use |
|---------|-----|
| Root `tags[]` | Temporary reference evidence |
| `smartProfile.subjects/objects/themes/...` | Structured coverage |
| `searchConcepts`, `visibleText` | Alternate discovery language |
| Algolia record projection | What Portal search would use |

Outputs:

- % Ready with non-empty Smart Profile post-job
- Spot-check: designs where tags appear to carry unique discoverability not present in Smart Profile / searchConcepts / visibleText / objects
- Recommendation: ready for retirement planning **or** needs coverage gap corrective

Do **not** feed legacy tags as curated model inputs beyond any existing pipeline reads (today candidate core may pass `tags` into enrichment for context — do not expand; do not make tags required). Document current input use during implement.

---

## 16. Test strategy

### Automated

| Check | Required |
|-------|----------|
| Unit: Ready eligibility helper | yes |
| Unit: Ready AI clear does not touch status/aiReviewStatus/B-fields; does not use queue clear | yes |
| Unit: pipeline Ready-backfill success preserves ready+approved and approval audit | yes |
| Unit: pipeline Ready-backfill failure restores approved | yes |
| Contract: worker accepts `ready_catalog`; still fail-closed until gate true in tests that assert pre-unlock | yes |
| Contract: Start Shadow + Autonomous OFF for ready_catalog | yes |
| Contract: Algolia delete-on-non-ready still present (regression) | yes |
| Shared constants: gate false until unlock commit; phrase strings | yes |
| Studio Start allow includes ready_catalog when enabled + Shadow + live OFF | yes |
| `functions` build / typecheck | yes |

### Manual / ops (DEV)

| Gate | Purpose |
|------|---------|
| Preview inventory | Counts sane; versions; exclusions |
| Tiny canary (2–3 Ready IDs) before full Start | Lifecycle + Algolia object still present |
| Full Ready job | Counters; anomalies=0 |
| Owner stratified sample | Quality + automation trust |
| Spot-check Algolia | Sample Ready IDs still indexed; Smart Profile fields updated |

---

## 17. DEV QA

1. Confirm project `fresh-prints-dev`, Shadow, Autonomous OFF, no active Ready job.
2. Preview → owner acknowledges eligible count.
3. Optional canary Start on explicit ID list if implement adds retry/canary support; else 1-page canary via temporary limit **only if** owner authorizes — default full eligible after Preview OK.
4. Monitor job counters; pause on first `ready_lifecycle_violation`.
5. Owner sample checklist doc (new review artifact).
6. No production actions.

---

## 18. Rollback

| Layer | Action |
|-------|--------|
| Gate | Set `CATALOG_REPROCESS_READY_CATALOG_ENABLED=false` + redeploy shared consumers |
| Job | Pause / cancel; do not Start again |
| Bad profiles | Re-run Ready job after corrective; root catalog fields unchanged so customer title/category intact |
| Algolia | Reconcile callable if sync gaps; status=ready restores membership |
| Code | Revert Ready-backfill pipeline mode; queue path must remain untouched |

Smart Profile regeneration is reversible by another enrichment; **human Ready metadata is not rewritten** by design.

---

## 19. Human checkpoints

| Checkpoint | When |
|------------|------|
| Formal Review complete | This pass |
| Authorize Implement + DEV deploy allowlist | After review approval |
| Unlock Ready gate constant | Part of implement; Start still phrase-gated |
| Preview review | Before Start |
| Authorize Start (`REPROCESS READY CATALOG`) | Explicit owner phrase |
| Canary vs full run | Owner choice if offered |
| Owner stratified sample | After job |
| Autonomous numeric thresholds | After sample — **before any Autonomous phase** |
| Tag retirement | Separate owner gate — **not** this initial reprocess |
| Production Ready reprocess | Separate — forbidden here |

---

## 20. Acceptance criteria (Slice 6 signoff)

1. Ready gate unlockable only after Ready-preservation code deployed.
2. Preview inventory accurate for Ready Catalog.
3. Job processes eligible Ready designs with durable outcomes.
4. **Zero** preservation violations (`status` stayed `ready`; `aiReviewStatus` stayed/restored `approved`).
5. **Zero** unexpected Ready Algolia deletes attributable to the job.
6. Root title/description/categoryId/tags unchanged on sampled successes.
7. Automation evidence recorded (would-auto-approve / verifier / conflicts) without lifecycle change.
8. Owner sample completed with documented verdicts.
9. Legacy-tag coverage notes recorded; tags **not** retired.
10. Shadow remains on; Autonomous live remains false; production untouched.
11. Docs updated (DATA_MODEL Ready backfill semantics; ROADMAP; ADR if needed).

---

## 21. Exact files expected to change (implement)

| Path | Role |
|------|------|
| `packages/shared/src/constants/catalogReprocess.constants.ts` | Unlock flag (later); helpers; maybe counter labels |
| `packages/shared/src/types/admin/catalogReprocess.types.ts` | Inventory/outcome fields (`remainedReady`, etc.) |
| `packages/shared/src/constants/catalogReprocess.constants.test.ts` | Gate/eligibility tests |
| `functions/src/catalogReprocess/catalogReprocessAiClear.ts` | Ready clear builder + preserve keys |
| `functions/src/catalogReprocess/catalogReprocessEligibility.ts` | Ready query/count/inventory |
| `functions/src/catalogReprocess/catalogReprocessCallables.ts` | Preview inventory + Start preflight for ready |
| `functions/src/catalogReprocess/catalogReprocessWorker.ts` | Ready branch + lifecycle assert |
| `functions/src/catalogReprocess/onCatalogReprocessJobWritten.ts` | Allow ready_catalog execution |
| `functions/src/ai/aiEnrichmentPipeline.ts` | Ready-backfill success/failure mode |
| Related AI tests | Pipeline preservation fixtures |
| `functions/src/catalogReprocess/catalogReprocess.slice5.contract.test.ts` or new `slice6.contract.test.ts` | Containment |
| `apps/studio/.../CatalogReprocessingSettingsSection.tsx` | Enable Start for ready_catalog when gated on |
| `apps/studio/.../CatalogReprocessingSettingsSection.contract.test.ts` | UI gate |
| `apps/studio/.../catalogReprocessService.ts` | Only if API surface needs it |
| `docs/architecture/DATA_MODEL.md` | Ready backfill note |
| `docs/architecture/BACKEND.md` | If callable/worker semantics change |
| `docs/project/ROADMAP.md` / `DECISIONS.md` | Slice 6 ADR + banner |

Algolia sync code: **prefer no change** if preservation holds; tests remain regression guards.

---

## 22. Migration / backfill risk

| Risk | Severity | Mitigation |
|------|----------|------------|
| Demote Ready → Needs Review | **P0** | Separate clear/success path; hard assert; soft-pause |
| Algolia delete via status flip | **P0** | Never write non-ready status |
| Overwrite human `aiReviewedBy` / `readyAt` | High | Ready success must not use publishReady autonomy write |
| Temporary empty Smart Profile in search | Med | Minimize delete window; accept brief upsert; reconcile if needed |
| Cost/rate on large Ready set | Med | 1 design/claim; pause; DEV first |
| False confidence toward Autonomous | Med | Owner sample + explicit threshold checkpoint |
| Scope creep into tag retirement | Med | Explicit out of scope this pass |

---

## 23. Security review

- Owner-only callables unchanged in principle.
- Confirmation phrases for Ready already exist.
- Extend Shadow + Autonomous-OFF server preflight to Ready Start.
- No client-side bulk loops.
- No production secrets/env changes in this slice’s DEV path.
- Do not relax Firestore rules for designs.

---

## 24. Data-model review

- No new top-level collections.
- May extend job/outcome fields (`remainedReady`, conflict counters).
- Design Ready lifecycle fields immutable under backfill.
- Document Ready-backfill exception alongside Slice 5 AI Review reprocess note in DATA_MODEL `catalogReprocessJobs` section.
- Indexes: `status == ready` + `orderBy(documentId)` — verify existing single-field index sufficiency during implement; add composite only if query requires.

---

## 25. Formal Review

Produce `docs/workflow/reviews/2026-08-26-smart-catalog-intelligence-slice-6-review.md`.

**Stop after Formal Review.** Do not implement, unlock, Preview-mutate, Start, enable Autonomous, retire tags, or touch production without separate owner authorization.

---

## Open questions (non-blocking for Formal Review; binding at implement/Start)

1. **HUMAN CHECKPOINT (later):** Numeric Autonomous readiness thresholds after owner sample.
2. Whether to skip already-v30/v4 Ready designs (default: include).
3. Whether canary ID list is required before full Ready Start (recommended yes).
4. Exact terminal `aiProcessingStage` string for Ready success (propose keep `ready_for_review`).

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-26-smart-catalog-intelligence-slice-6-review.md`
- Verdict: pending Formal Review
