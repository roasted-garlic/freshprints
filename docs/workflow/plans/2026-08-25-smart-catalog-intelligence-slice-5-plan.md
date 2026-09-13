# Plan: Smart Catalog Intelligence — Slice 5 (AI Review Queue Reprocess + Shadow Calibration)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal slug | `smart-catalog-intelligence-unattended-enrichment` — **Slice 5** |
| Parent | `docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md` §12 + §11a |
| Control plane | Slice 4 plan/signoff + `catalog-reprocessing-amendment-plan.md` |
| Prior gate | Refinement signoff **approved_with_notes** (`2026-08-25-smart-profile-quality-…-signoff.md`) |
| Related audit | `docs/workflow/reviews/2026-08-25-smart-catalog-intelligence-slice-5-eligibility-preservation-audit.md` |
| FreshForge impact | Fresh Prints application only — **not** starter-surface |

---

## Goal

Safely reprocess the existing **fresh-prints-dev** AI Review / Needs Review backlog through the live **`catalog-enrich-v29` + `smart-profile-normalizer-v3`** pipeline using the owner-only durable Catalog Reprocessing control plane, while preserving human-authoritative fields and collecting **Shadow-mode** evidence to judge unattended approval quality.

**This Plan + Formal Review authorize design only.** They do **not** authorize implement, Start unlock deploy, typed phrase submission, or any bulk job run.

---

## Runtime baseline (confirmed 2026-08-25)

| Check | Evidence | Result |
|-------|----------|--------|
| DEV `enqueueAiEnrichment` | Cloud Run `enqueueaienrichment-00080-dog`, lastTransition **`2026-08-26T03:04:03Z`** | **catalog-enrich-v29** path deployed |
| Prompt / normalizer constants | `functions/src/ai/catalogTitleRules.ts`, `packages/shared/.../smartProfile.constants.ts` | **`catalog-enrich-v29`**, **`smart-profile-normalizer-v3`** |
| Catalog Reprocess Functions | `preview` / `start` / `pause` / `resume` / `retry` / `onCatalogReprocessJobWritten` present on DEV | Control plane **deployed** |
| Start gates | `CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED = false`, `…READY_CATALOG… = false` | Both Starts **gated** |
| Worker execution | `onCatalogReprocessJobWritten.ts` → non-dry-run fails `slice_execution_not_enabled` | **Stub** until Slice 5 |
| Eligibility count | `estimateEligibleCount` returns `0` | **Stub** until Slice 5 |
| Production | Untouched; prod enqueue still pre-v29 era | **Out of scope** |
| Live Autonomous | Must remain OFF for DEV Slice 5 run | Gate F/G verify `catalogAutonomousLiveEnabled === false` |
| C2b | PASS WITH NOTES; closed | **Do not reopen** |

---

## Scope

### In Scope

1. **Eligibility** for `targetType = ai_review_queue` (repo-grounded query + preview inventory).
2. **Staff-edit preservation policy** (field-by-field A/B/C/D).
3. **Worker execution** for AI Review Queue only: durable page/cursor processing via existing `catalogReprocessJobs` + `onCatalogReprocessJobWritten`.
4. **Reuse** live enrichment pipeline (`generateAiEnrichmentCandidateForDesign` / `runAiEnrichmentPipeline` path) — no Slice-5 prompt fork.
5. **Shadow calibration** posture + job-scoped metrics + Automation Health increments via existing pipeline hooks.
6. **Narrow Start unlock**: `CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED = true` only (DEV phrase unchanged).
7. **Studio UX**: enable Start / Preview / phrase for `ai_review_queue` only when flag true; keep Ready Catalog locked.
8. **Preview enrichment**: eligible count + exclusion buckets + version/status distributions (read-only).
9. **Tests** for eligibility, preservation non-overwrite, Shadow no-publish, gate flags, phrase.
10. **Docs**: DATA_MODEL / BACKEND / ROADMAP / DECISIONS as needed for Slice 5 behavior.
11. **Gates A–J sequencing** (implement/deploy/run remain later owner checkpoints).

### Out of Scope

- Bulk job execution in this Plan/Review phase
- Production deploy or PRODUCTION phrase run
- Enabling `catalogAutonomousLiveEnabled` / live Autonomous publication
- Unlocking `ready_catalog` / Slice 6
- Legacy tag retirement / Tag Management removal
- Reopening C2b Auto Background calibration
- New analytics stack / parallel Algolia publisher
- Category auto-creation
- Companion graph mutation as reprocess side effect
- Ad hoc full-catalog scripts when control plane can serve

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|--------|
| Shared gates / types | `packages/shared/src/constants/catalogReprocess.constants.ts`, `.../types/admin/catalogReprocess.types.ts` |
| Eligibility + preview | **New** helper under `functions/src/catalogReprocess/` (e.g. `catalogReprocessEligibility.ts`) |
| Callables | `functions/src/catalogReprocess/catalogReprocessCallables.ts` |
| Worker | `functions/src/catalogReprocess/onCatalogReprocessJobWritten.ts` (+ optional failures subcollection writer) |
| Pipeline reuse | `functions/src/ai/aiEnrichmentPipeline.ts`, `aiEnrichmentCandidateCore.ts`, `resetAiEnrichmentForProcessing.ts` patterns |
| Studio | `CatalogReprocessingSettingsSection.tsx`, `catalogReprocessService.ts` |
| Tests | Shared constants tests; functions eligibility/worker/policy tests; Studio contract if needed |
| Docs | DATA_MODEL, BACKEND, ROADMAP, DECISIONS (Slice 5 ADR note if needed) |

### Architecture Impact

- [x] Details: Extends Slice 4 control plane with **eligibility resolver + per-design work unit**; does not add a second queue. Worker calls **internal** enrichment entry (Admin SDK), not Studio client loops.

### Security Impact

- [x] Details: Owner-only callables remain; server-validated phrase `REPROCESS AI REVIEW QUEUE` (DEV) / production phrases remain separate and **unused** this phase. No admin broadening. Mode + live-flag snapshots at job start; reject Start if live Autonomous ON unless owner explicitly changes mode in a separate checkpoint (this plan: **hard fail Start** if `catalogAutonomousLiveEnabled === true` **or** mode ≠ `shadow` for the authorized DEV calibration run — see Open Questions if owner wants Manual allowed).

### Data Model Impact

- [x] Details: No new top-level collections. May add `catalogReprocessJobs/{jobId}/outcomes/{designId}` (or `failures/{designId}`) for idempotency + per-design errors (already foreshadowed in Slice 4 plan). Design AI blobs regenerated; human fields preserved per policy. Optional preview response fields (exclusions, distributions).

### Backend Impact

- [x] Details: Implement `estimateEligibleCount` + inventory; unlock AI Review gate flag; worker stops returning `slice_execution_not_enabled` for `ai_review_queue` when enabled. Ready path stays stubbed/fail-closed.

### UI / UX Impact

- [x] Details: Catalog Reprocessing → Reprocess AI Review Queue becomes Start-capable when enabled; Preview shows inventory; Ready Catalog remains “Start (unavailable)”. Manual owner sample after run (Gate I).

### Migration Impact

- [x] Forward: DEV Needs Review designs re-enriched to v29/v3; remain `needs_review` under Shadow.
- [x] Rollback: Soft-pause / stop job; per-design failures isolated; AI fields intentionally rewritten — recovery relies on job outcomes + Health + optional pre-run ID inventory (not full Firestore backup). Human fields unchanged by policy.

---

## Approach

### 1. Eligibility (Requirement 1) — **repo-grounded**

**Canonical eligibility for `ai_review_queue`** (mirror Needs Review inbox + server rerun contract):

```
status == "imported"
AND aiReviewStatus == "needs_review"
```

| Concern | Rule | Source |
|---------|------|--------|
| Allowed `status` | `imported` only | Inbox Needs Review query; `isRerunFromReviewEligible` |
| Allowed `aiReviewStatus` | `needs_review` only | Same |
| Rejected | **Exclude** (`status: rejected`) | Parent §12; inbox separate tab |
| Archived | **Exclude** | Not mutable for AI Review |
| Ready / approved | **Exclude** | Slice 6 / not inbox |
| Processing tab (`pending`) | **Exclude** | Still in AI Processing; not Needs Review |
| `aiProcessingStage: failed` with `pending` review | **Exclude** from Slice 5 queue | Finish/retry via Processing; do not pull into backlog reprocess |
| Already v29 / normalizer-v3 | **Include** | Shadow calibration consistency |
| No Smart Profile / v27 / v28 | **Include** | Primary migration targets |
| Query ownership | **New** `resolveAiReviewQueueEligibleQuery` / count+page in `functions/src/catalogReprocess/` | Replaces stub `estimateEligibleCount` |
| Feature gate | Eligibility code may exist behind `CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED`; Start/worker require flag **true** | Today: stub + disabled |

**Explicit non-goals for eligibility:** Do not use UI labels alone; do not include rejected reopen candidates; do not include ready designs.

### 2. Read-only inventory (Requirement 2)

Before any mutation (Gate F):

1. Owner (or implement phase) calls **`previewCatalogReprocessJob({ targetType: "ai_review_queue" })`** after Slice 5 unlock + deploy.
2. Extend response beyond `eligibleCount` to include (read-only aggregation; may page designs server-side with hard caps / sampling if backlog is large):

| Inventory field | Purpose |
|-----------------|--------|
| `eligibleCount` | Gate G confirmation |
| `exclusions` | Counts by reason: rejected, ready, archived, pending/processing, other |
| `promptVersionDistribution` | From `smartProfile.provenance.promptVersion` (incl. missing) |
| `normalizerVersionDistribution` | From `smartProfile.provenance.normalizerVersion` |
| `aiReviewStatusDistribution` / `statusDistribution` | Sanity |
| `catalogWorkflowMode` / `autonomousLiveEnabled` | Mode gate |
| `targetEnabled` / phrase / `activeJobId` | Existing |

3. Prefer control-plane preview over ad hoc scripts. If preview aggregation is too heavy for one callable, add a **bounded Admin diagnostic script** that only reads and writes a review artifact JSON (no design writes) — Formal Review prefers extending preview first.

**No design mutation for inventory.**

### 3. Staff-edit preservation policy (Requirement 3) — P0

Full field matrix: `docs/workflow/reviews/2026-08-25-smart-catalog-intelligence-slice-5-eligibility-preservation-audit.md`.

**Summary classifications:**

| Class | Fields |
|-------|--------|
| **A. REGENERATE** | `aiSuggestions`, `aiAnalysis`, `smartProfile` (incl. provenance automation fields), pipeline stages / transient review flags reset as today |
| **B. PRESERVE** | `artworkBackgroundHex`, `artworkBackgroundSource`, `halftoneStaffDecision`, `halftoneDecisionSource`, `halftoneSubmitterResponse`, `isExplicitContent`, `censoredTerms`, `companionDesignIds`, `companionSetIncomplete`, root `tags`, root `title` / `description` / `categoryId`, print/sizing/asset paths, audit IDs, queue metrics |
| **C. MERGE / RECONCILE** | None required for Needs Review backlog today: Studio **does not persist** mid-draft catalog edits until Approve (`approveFromInbox`). Draft UI re-seeds from suggestions after re-run (existing behavior). Do **not** invent a “preserve staff edits” boolean. |
| **D. OUT OF SCOPE / NEVER TOUCH** | Companion relationship graphs (beyond leaving IDs alone), category document creation, legacy tag retirement, Algolia ready publication, C2b detector, production data |

**Hard rules (binding):**

- Halftone remains human-authoritative (ADR-FP-080) — never infer from reprocess.
- Artwork display background must not be silently recomputed by backlog reprocess (pipeline may **read** hex for analysis canvas only).
- Companions are not an AI reprocess side effect.
- Category creation prohibited.
- Legacy tags not retired in Slice 5.

**Implementation pattern:** Per design, apply the same clears as `resetAiEnrichmentForProcessing` for AI blobs **without** changing preserved fields, then run the existing enrichment pipeline. Assert unit tests that hex/halftone/title/tags/companions unchanged across a mocked success write.

**Note — `aiReviewNotes`:** Reset/enqueue today **delete** notes. Needs Review docs rarely have notes (reject UI often omits). Classify as **A (regenerate/clear)** consistent with existing re-run; if Formal Review finds owner-critical notes on DEV backlog during inventory, escalate to **B** before Gate G.

### 4. Current v29 pipeline only (Requirement 4)

- Entry: existing `runAiEnrichmentPipeline` / `generateAiEnrichmentCandidateForDesign` (Admin internal), same settings/prompt auto-upgrade path as DEV enqueue.
- Job `pipelineVersion` snapshot at Start must record **`catalog-enrich-v29` + `smart-profile-normalizer-v3`** (replace misleading Slice 4 stub `"smart-profile-v1"`-only label).
- No migration-only prompt; no duplicate candidate generator.

### 5. Shadow calibration (Requirement 5)

**Intended DEV mode:** `catalogWorkflowMode: shadow`, `catalogAutonomousLiveEnabled: false`.

Per design, existing pipeline already:

- Computes `CatalogAutomationDecisionResult` (`wouldAutoApprove`, verifier, reason codes, hard blockers).
- Writes `smartProfile.provenance.automationDecision`, `automationReasonCodes`, `automationDecisionAt`, `verifierInvoked`.
- Increments `settings/catalogAutomationHealth`.
- Logs `smart_profile.automation_decision` (includes `wouldAutoApprove`).

**Slice 5 addition:** Job counters (`remainedNeedsReview`, `autoApproved`, `succeeded`, `failed`, …) **and** job-scoped tallies (or outcomes subcollection) so calibration is **not** polluted solely by global Health counters that mix organic traffic.

Do not invent a new analytics product; extend job document / outcomes.

### 6. Calibration metrics (Requirement 6)

Post-run report must answer:

1. Eligible reprocessed count  
2. Success rate  
3. Failure / retry rate  
4. Would-auto-approve rate  
5. Remained-Needs-Review rate (expect ~100% under Shadow + live OFF)  
6. Verifier invocation rate  
7. Verifier unresolved rate  
8. Category-gap rate  
9. Hard validation-block rate  
10. Subject-specificity issue rate (reason-code prefix / codes)  
11. Unsupported/contextual-subject issue rate  
12. Title/description validity rate (from reason codes / validation warnings)  
13. Smart Profile quality issues from **owner sample** (not a single aggregate score)  
14. Near-duplicate vocabulary explosion (sample + vocab snapshot opportunism)  
15. New dimension/value pathology (sample)  
16. Lifecycle corruption (any ready/rejected/archived drift)  
17. Human edit lost (bg/halftone/title/tags/companions checks on sample)  
18. Unexpected Algolia / publication effect (must be **zero** ready-index upserts for these designs)

Hard failures reported separately — no single “quality score” hiding blockers.

### 7. Owner manual sample (Requirement 7)

After Gate H completes, Gate I requires owner sample **before** Slice 5 signoff.

**Sampling method (bounded; sized after inventory):**

| Backlog eligible N | Recommended sample size |
|--------------------|-------------------------|
| N ≤ 25 | All designs |
| 26–100 | 15–20 |
| 101–500 | 20–30 |
| N > 500 | 30 + stratified extras |

**Must mix (when present):** would-auto-approve; verifier confirmed; verifier unresolved; hard-blocked; category ambiguity; text-heavy; animals; professions; holidays; humor/sarcasm; visually complex.

Do **not** invent a fixed number before Gate F inventory.

### 8. Job safety (Requirement 8)

Reuse Slice 4 architecture:

| Concern | Status | Slice 5 work |
|---------|--------|--------------|
| `catalogReprocessJobs` | Implemented | Use |
| Owner callables | Implemented | Wire eligibility + Start unlock |
| Worker claim/lease | Implemented | Keep |
| Soft pause / resume / retry | Implemented | Keep; verify with execution |
| One active job / `(projectId, targetType)` | Implemented | Keep |
| Cursor / checkpoint | Schema present; **unused in stub** | **Implement** page-by-`__name__` cursor |
| Idempotency | Spec only | **Implement** outcomes/failures doc per design |
| Per-design isolation | Spec only | try/catch per design; continue |
| Design execution | **`slice_execution_not_enabled`** | **Implement** for `ai_review_queue` only |
| `ready_catalog` | Gated + stub | Leave fail-closed |

**Per-design work unit (proposed):**

1. Soft-pause check  
2. Claim next eligible design after cursor (re-validate eligibility; skip if no longer Needs Review)  
3. If outcome already `succeeded` for this job → skip  
4. Clear AI blobs (reset semantics) **preserving** B-class fields  
5. Run enrichment pipeline  
6. Assert post-write: still `imported` + `needs_review` when Shadow + live OFF (else record anomaly + pause job)  
7. Update job counters + cursor + renew lease  
8. On failure: record failure doc; increment failed; continue  

### 9. Start gate (Requirement 9)

Narrowest unlock:

```ts
export const CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED = true;  // Slice 5 only
export const CATALOG_REPROCESS_READY_CATALOG_ENABLED = false;   // Slice 6
```

Studio already keys off `isCatalogReprocessTargetEnabled`. Implement Start UI (phrase input + Preview) for enabled targets only — replace permanent `disabled` button when `ai_review_queue` enabled.

### 10. Confirmation + owner security (Requirement 10)

- Phrase DEV: **`REPROCESS AI REVIEW QUEUE`** (`REPROCESS_AI_REVIEW_QUEUE_CONFIRMATION_PHRASE`)
- PRODUCTION phrase exists but **execution out of scope**
- Owner-only: Studio `canManageCatalogReprocessing` + callable `assertOwnerCaller`
- No client-only confirmation

### 11. Autonomous safety (Requirement 11)

- Do not enable live Autonomous in Slice 5.
- **Start preflight (server):** If `catalogAutonomousLiveEnabled === true` → reject Start.  
- **Start preflight (server) for authorized DEV calibration:** If mode ≠ `shadow` → reject Start with explicit error (mode mismatch). Owner who wants Manual-mode reprocess must open a separate checkpoint to amend this gate.
- Snapshot mode + live flag onto job at create (already present).

### 12. Algolia / search (Requirement 12)

Under Shadow + live OFF, designs remain non-ready.

Evidence: `syncPortalCatalogDesignToAlgolia` **deletes** index object when `status !== "ready"`; builder returns null for non-ready.

**Acceptance:** Needs Review reprocess → **zero** public ready-catalog upserts; no new publisher.

### 13–14. Legacy tags / halftone / background

Unchanged coexistence; no tag retirement. Preserve bg + halftone fields; do not reopen C2b.

### 15. Rollback / recovery (Requirement 15)

| Failure | Recovery |
|---------|----------|
| Per-design enrichment error | Record failure; continue; Retry Failures callable |
| Worker crash / stale lease | Lease expiry + reclaim (`CATALOG_REPROCESS_LEASE_MS`) |
| Soft pause | Finish current unit; `paused`; resume from cursor |
| Partial completion | Durable counters + cursor; resume |
| Mode mismatch before start | Reject Start |
| Preservation defect mid-run | Soft-pause immediately; Formal Review / owner; fix; resume or cancel |

**Pre-run snapshot decision (proposed for Formal Review):**  
Full Firestore backup **not** required for DEV Needs Review AI-blob rewrite. Sufficient: job outcomes + Health + design provenance + **optional read-only ID inventory artifact** from Gate F. Human fields are not rewritten. If inventory shows unexpected staff notes / anomalies, escalate before Gate G.

---

## Execution sequencing (Gates)

| Gate | Action | Mutates designs? |
|------|--------|------------------|
| **A** | Read-only repo/runtime audit + eligibility/preservation (this plan) | No |
| **B** | Formal Review approval | No |
| **C** | Implement Slice 5 unlock + eligibility + worker + preview (+ tests) | No (code only) |
| **D** | Automated tests + Implementation Review | No |
| **E** | DEV deploy authorize (Functions if changed; Studio as needed) | No data |
| **F** | DEV preview inventory (eligible + exclusions + mode + live flag) | No |
| **G** | Owner Start authorization — type `REPROCESS AI REVIEW QUEUE` | Creates job |
| **H** | Durable DEV job run | **Yes** |
| **I** | Job results + owner manual sample | No |
| **J** | Slice 5 Signoff recommendation | No |

**Do not combine Gate G with Plan approval.**

---

## Test Strategy

### Automated

| Check | Command / focus | Required |
|-------|-----------------|----------|
| Unit — eligibility | Include/exclude matrix | yes |
| Unit — preservation | Mock success write does not touch B-class fields | yes |
| Unit — gates | AI Review enabled / Ready disabled; phrases | yes |
| Unit — Shadow | `shouldPublishReady` false when shadow + live OFF | yes (existing + reprocess wiring) |
| Typecheck / lint / build | Studio + functions as touched | yes |
| Rules | No client write to jobs (existing) | if rules touched |

### Manual

- [ ] Gate F preview numbers vs spot-check inbox Needs Review count  
- [ ] Gate I owner stratified sample  
- [ ] Confirm Automation Health / job counters move as expected  
- [ ] Confirm no ready designs / Algolia surprises on sample  

---

## Human Checkpoints Anticipated

- [x] Formal Review (Gate B) — this phase  
- [ ] Owner authorize Implement (Gate C) — **separate**  
- [ ] Owner authorize DEV deploy (Gate E) — if Functions/Studio ship  
- [ ] Owner typed phrase Start (Gate G)  
- [ ] Owner manual sample (Gate I)  
- [ ] Production — **excluded**  
- [ ] Live Autonomous enable — **excluded**  

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Worker cost / Gemini rate limits | High | Page size + delay; soft pause; resume |
| Global Health mixed with organic traffic | Medium | Job-scoped tallies / outcomes |
| Accidental ready publish | Critical | Shadow + live OFF hard Start gate; post-write assert |
| Preservation bug overwrites bg/halftone | Critical | Unit tests + mid-run pause policy |
| Preview too heavy | Medium | Bounded aggregation / diagnostic script |
| Unlock Ready by mistake | High | Separate constant remains false; tests |
| Studio draft expectation loss | Low | Document existing re-seed behavior |

---

## Rollback Plan

1. Soft-pause or fail job.  
2. Keep Ready Catalog gate false.  
3. Optionally set `CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED = false` and redeploy if Start must be re-locked.  
4. Do not attempt mass restore of AI blobs (intentional regenerate). Human fields unchanged.  

---

## Documentation Updates Required

- [x] DATA_MODEL.md — Slice 5 eligibility + preservation note on reprocess  
- [x] BACKEND.md — worker execution for `ai_review_queue`  
- [x] ROADMAP.md — Slice 5 status after implement/signoff  
- [ ] DECISIONS.md — short ADR/amendment if Formal Review requires  
- [x] Other: this plan + audit + review artifacts  

---

## Open Questions

1. **Start mode gate:** Plan proposes **hard-require Shadow** for authorized DEV calibration Start. Confirm owner accepts Manual blocked at Start for this phase.  
2. **`aiReviewNotes`:** Confirm clear-on-reprocess (existing re-run) is acceptable after Gate F inventory.  
3. **Already-v29 include-all:** Confirm include (recommended) vs skip-current-version optimization.  
4. **Outcomes subcollection name:** `outcomes` vs Slice 4 foreshadowed `failures` only — recommend `outcomes` with status field.  

Non-blocking until Gate G if Formal Review locks defaults.

---

## Acceptance criteria (Plan)

1. Exact AI Review Queue eligibility is repo-grounded.  
2. Staff-edit preservation is explicit field-by-field.  
3. Current v29/v3 pipeline reused.  
4. Shadow is calibration posture.  
5. Live Autonomous stays OFF.  
6. Only `ai_review_queue` Start unlocked.  
7. Ready Catalog remains locked.  
8. Owner-only backend security intact.  
9. DEV typed phrase server-validated.  
10. Job durable/resumable/idempotent.  
11. Failures isolate per design.  
12. No legacy tag retirement.  
13. Halftone/background human state preserved.  
14. Needs Review reprocess cannot publish ready in Shadow.  
15. Recovery/rollback explicit.  
16. Calibration metrics defined.  
17. Owner manual sample required before signoff.  
18. Production excluded.  
19. Slice 6 excluded.  
20. Bulk execution is a separate owner checkpoint after implement/deploy/preview.  

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-25-smart-catalog-intelligence-slice-5-review.md`
- Verdict: pending
