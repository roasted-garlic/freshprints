# Review: Smart Catalog Intelligence — Slice 5 Plan

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-slice-5-plan.md` |
| Audit | `docs/workflow/reviews/2026-08-25-smart-catalog-intelligence-slice-5-eligibility-preservation-audit.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Slice 5 Plan correctly scopes AI Review Queue reprocess + Shadow calibration on top of the Slice 4 control plane, with repo-grounded eligibility, a field-by-field preservation matrix, v29/v3 pipeline reuse, Autonomous/production/Slice 6 exclusions, and Gates A–J that keep bulk Start separate from Plan approval. Formal Review **approves with required changes** that must be applied before Implement (Gate C)—primarily hardening Start preflight defaults, preview inventory contract, job-scoped calibration evidence, and reset-equivalent Smart Profile clearing.

**This review does not authorize implement, deploy, Start unlock in production, typed phrase submission, or any backlog job run.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Slice 5 only; Slice 6/prod/live Autonomous excluded |
| Architecture alignment | pass | Extends `catalogReprocessJobs` worker; no second queue |
| Security impact addressed | pass | Owner-only + server phrase; Start mode/live gates required |
| Data model impact addressed | pass | Outcomes subcollection optional; AI blob regenerate |
| Backend impact addressed | pass | Eligibility + worker execution still stubbed — Plan owns them |
| Test strategy adequate | pass | Eligibility/preservation/Shadow/gates covered |
| Human checkpoints identified | pass | Gates E/G/I explicit; G ≠ Plan approval |
| Roadmap alignment | pass | Parent §12 / §11a; refinement unblock honored |
| Documentation plan | pass | DATA_MODEL / BACKEND / ROADMAP |
| No silent scope expansion | pass | C2b closed; tags not retired |

---

## Architecture Review

**Findings:**

- Slice 4 shipped control plane stubs (`estimateEligibleCount` → 0; worker `slice_execution_not_enabled`). Slice 5 correctly owns eligibility + execution for `ai_review_queue` only.
- Internal Admin pipeline invocation (not Studio client loop / not nested callable-as-user) is the right pattern; Implement must not reintroduce `useAiProcessingQueue` for bulk.
- Preview response today lacks exclusion/version distributions promised by Slice 4 product contract — Plan correctly extends preview.

**Required changes:**

1. Implement must use **reset-equivalent** AI blob clears (including `smartProfile`) before pipeline so enqueue/reset asymmetry cannot leave stale profiles.
2. Prefer job-scoped `outcomes/{designId}` (status + error + key decision flags) over failures-only, for idempotency **and** calibration sampling.

---

## Security Review

**Findings:**

- Owner-only callables and DEV phrase `REPROCESS AI REVIEW QUEUE` already exist and must remain server-validated.
- Critical residual risk: Start while mode ≠ Shadow or live Autonomous ON.

**Required changes:**

1. **Server Start preflight (binding for this DEV calibration phase):** reject if `catalogAutonomousLiveEnabled === true` **or** `catalogWorkflowMode !== "shadow"`.
2. Do not treat Plan approval or Implement as permission to flip live Autonomous.

**Human approval needed before production:**

- [x] Any production reprocess / PRODUCTION phrase — **out of scope**; separate future authorize

---

## Data Model Review

**Findings:**

- Eligibility `imported` + `needs_review` matches inbox + `isRerunFromReviewEligible` — approved.
- Preservation matrix is evidence-based; mid-draft non-persistence correctly avoids inventing a merge boolean.
- Algolia non-ready delete/skip path is sufficient to claim zero ready publication under Shadow.

**Required changes:**

1. Document in DATA_MODEL (Implement docs pass): Slice 5 reprocess clears AI blobs like reset; preserves B-class fields; Shadow keeps `needs_review`.
2. Gate F inventory must surface any unexpected `aiReviewNotes` density; if non-trivial, stop before Gate G and reclassify notes to **B PRESERVE**.

---

## Backend Review

**Findings:**

- DEV runtime baseline confirmed: enqueue rev `00080` @ `2026-08-26T03:04:03Z`; reprocess Functions present; Starts gated.
- Worker must leave `ready_catalog` fail-closed even after AI Review unlock.
- Job `pipelineVersion` stub `"smart-profile-v1"` must be replaced with accurate v29 + normalizer-v3 labeling at Start.

**Required changes:**

1. Extend `PreviewCatalogReprocessJobResponse` with exclusion buckets + version distributions (or Formal Review–approved bounded diagnostic artifact if callable limits force it — prefer preview first).
2. Post-success assert in worker: under Shadow + live OFF snapshot, design must remain non-ready / Needs Review; on violation → record anomaly, soft-pause job.
3. Keep `CATALOG_REPROCESS_READY_CATALOG_ENABLED = false` with an automated regression test.

---

## Testing Review

**Findings:**

- Unit matrix for eligibility/preservation/gates/Shadow publish is adequate.
- Owner stratified sample sizing table is appropriate (no fixed N before inventory).

**Required changes:**

1. Calibration report must use **job-scoped** tallies (and/or outcomes), not only global `catalogAutomationHealth`, so organic traffic cannot hide Slice 5 rates.
2. Metric list 1–18 remains mandatory at Signoff; no single aggregate score.

---

## Documentation Review

**Findings:**

- Plan + audit cover Requirements 1–15 and acceptance criteria 1–20.
- Parent open questions resolved enough for Implement with defaults locked below.

---

## Required Changes (approved_with_changes)

1. **Start preflight:** Server rejects Start when live Autonomous is ON **or** Catalog Processing Mode ≠ `shadow` for this DEV calibration phase.  
2. **Reset-equivalent clears:** Always delete `smartProfile` with other AI blobs before re-enrich.  
3. **Preview inventory contract:** Exclusions + prompt/normalizer version distributions (read-only) before Gate G.  
4. **Job-scoped calibration evidence:** Outcomes (or equivalent) + job counters sufficient to answer metrics 1–18 without relying solely on global Health.  
5. **Pipeline version snapshot:** Record `catalog-enrich-v29` + `smart-profile-normalizer-v3` on the job at Start.  
6. **Ready Catalog gate:** Remain disabled; add/keep test coverage.  
7. **Open Question defaults (locked unless owner overrides before Gate C):**  
   - Include already-v29 designs.  
   - Clear `aiReviewNotes` on reprocess (existing re-run) unless Gate F inventory escalates.  
   - Use `outcomes/{designId}` subcollection pattern.

---

## Blockers

None. Plan is implementable after required changes are observed in Implement (or a one-line plan amendment note).

---

## Verdict Rationale

**approved_with_changes** — Scope, eligibility, preservation, Shadow posture, security boundaries, and gate sequencing meet the Slice 5 product contract. Residual stubs in Slice 4 are correctly identified as Slice 5 implementation work. Required changes harden Start safety, inventory, and calibration evidence so Gate G/H cannot proceed on incomplete control-plane semantics.

**Recovery snapshot decision:** Full Firestore backup **not** required for DEV Needs Review AI-blob rewrite. Job outcomes + Health + provenance + Gate F read-only inventory are sufficient unless Gate F discovers preservation anomalies.

---

## Open questions / blockers for owner (non-blocking for Implement kickoff)

| # | Topic | Plan default |
|---|--------|--------------|
| 1 | Hard-require Shadow at Start | **Yes** (locked by this review) |
| 2 | Include already-v29 | **Yes** |
| 3 | Clear `aiReviewNotes` | **Yes**, subject to Gate F |
| 4 | Production / live Autonomous | **Forbidden** this slice |

---

## Next Step

**STOP.**

Await owner authorization to begin **Implement (Gate C)** under this review’s required changes. Do **not** unlock Start in a deploy, submit `REPROCESS AI REVIEW QUEUE`, run any `catalogReprocessJob`, enable live Autonomous, start Slice 6, or touch production.
