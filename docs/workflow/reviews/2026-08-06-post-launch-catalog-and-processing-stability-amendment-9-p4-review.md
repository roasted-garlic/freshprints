# Formal Review: Amendment 9 P4 — Snapshot Publication Read Amplification Guard

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Reviewer | Independent Formal Review Agent |
| Plan | `docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-p4-plan.md` |
| Starting HEAD | `862f7d1` |
| Branch / PR | `fix/post-launch-catalog-and-processing-stability` / #40 open unmerged |
| Mode | Investigate → Plan → Formal Review → **Stop** (no Implement) |
| Verdict | **approved** (initially `approved_with_changes`; R1–R5 applied in-place to Plan) |

---

## Summary

Independent re-derivation confirms the post–Stage 1a publication path and the compound root cause of the observed 25 full Portal publications (claim-window reopen across a paced batch + immediate catch-up serial full scans + non-ready INDEX_FILTER waste). The recommended quiet + min-interval hybrid is the correct transition guard. Required corrections R1–R5 (mandatory W2 coordination-doc wake, numerical/stretch math, eligibility checkpoint, `passLimit=1`, claim duration 240s) were applied to the Plan before this verdict. No Stage 1b, implementation, deploy, merge, cleanup, or production action occurred.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | P4 transition guard only; Stage 1b / P3 / cleanup out |
| Architecture alignment | pass | Persisted coordination; no second search architecture |
| Security impact addressed | pass | Admin SDK path; no Rules/public exposure change |
| Data model impact addressed | pass | Additive coordination fields only; no migration |
| Backend impact addressed | pass | Functions publisher + W2 trigger; later deploy gated |
| Test strategy adequate | pass | Includes zero-writes-after-last drain + bounds |
| Human checkpoints identified | pass | Implement approval + Functions deploy + QA |
| Roadmap alignment | pass | Production-promotion blocker; retire after Stage 1b |
| Documentation plan | pass | BACKEND / DECISIONS / handoff on Implement |
| No silent scope expansion | pass | Options C–F rejected; D1 not started |

---

## Review duties

### 1. Re-derived trigger / publication path

Matches Plan and source at `862f7d1`:

`onPortalCatalogSnapshotSourceWritten` → classifier → operational skip / card-only override / index-filter → `markAndPublishAfterDebounce` → debounce claim → quiet sleep → `runPublicationCatchUpLoop` (today `passLimit=3`, immediate) → `publishKind` lease → `publishPortal` full C+T+R scan + generated asset writes.

Category/tag writes use separate `catalog-reference` coordination. Portal still loads taxonomy on every portal generation.

### 2. Multi-instance safety

**Pass after R3/R4/R1.** Lease remains sole scan mutex. `nextEligiblePublishAt` must be enforced before every portal publish (not only after quiet). W2 wake uses the same claim + lease + eligibility gates.

### 3. Numerical publication bound challenge

Formula `1 + ⌊D / 120⌋` accepted. Original stretch rows were too tight; **R2 applied** (45 → ≤5 with ≤10 min wall / stretch ≤4 @ ≤6 min; 100 → ≤8 with ≤14 min wall / stretch ≤6 @ ≤10 min).

### 4. Eventual consistency and retry

**Pass.** Dirty watermark, lease-busy/transient retries, and `retryPortalCatalogPublication` retained. Immediate portal catch-up serial scans removed (`passLimit=1` + W2).

### 5. Final generation loss challenge

**Initially fail — corrected by R1.** Process-local sleep / `debounceExpiresAt` alone cannot re-invoke Functions after the last approval when timeout budget is exhausted. Plan now **mandates W2** coordination-doc auto-wake with tests for zero writes after last approval. Ops callable is escape hatch only.

### 6. Hidden Stage 1b

**Pass / reject any.** No provider selection, no incremental search redesign, no generated cleanup.

### 7. Product feature regression

**Pass.** No Portal feature cut; freshness delay ≤ ~6 min documented; ordinary browse already Firestore.

### 8. P3 remains separate

**Pass.** Taxonomy caching secondary; not in P4 Implement scope.

### 9. No implementation / Firebase action this pass

**Pass.** Docs/plan/review only. HEAD remains `862f7d1` for app code. PR #40 unmerged. No deploy.

---

## Required Changes (applied to Plan)

| ID | Change | Status |
|----|--------|--------|
| R1 | Mandatory W2 coordination-doc auto-wake for final dirty drain | **Applied** |
| R2 | Fix stretch bounds; document wall-clock / pace assumptions | **Applied** |
| R3 | Pin `nextEligiblePublishAt` enforcement before every portal publish | **Applied** |
| R4 | Portal `passLimit=1` per wake; no immediate multi-pass full scans | **Applied** |
| R5 | Claim duration `QUIET+MIN_INTERVAL+MARGIN` (240s); admin callable bypass note | **Applied** |

---

## Blockers

None for Plan approval. Implement remains **owner-gated** (explicit Implement approval + later Functions deploy phrase).

---

## Verdict Rationale

Investigation is source-proven; root cause of 25 pubs is correct; Option A∪B hybrid with W2 wake is the smallest bounded multi-instance-safe transition guard that preserves generated search/facet correctness without Stage 1b. After R1–R5 in-place corrections, the Plan is **implementation-ready**.

---

## Confirmations

| Item | Result |
|------|--------|
| Stage 1b began? | **No** |
| Implementation / app code change? | **No** |
| Firebase deploy / Rules / indexes / migration? | **No** |
| PR #40 merge? | **No** (remains open) |
| Generated cleanup / Function retirement? | **No** |
| P3 started? | **No** |

---

## Next Step

Owner may authorize **Implement Amendment 9 P4** from the corrected Plan. Do **not** start Stage 1b / provider selection. Do **not** deploy without a separate owner phrase after Implement + Test.
