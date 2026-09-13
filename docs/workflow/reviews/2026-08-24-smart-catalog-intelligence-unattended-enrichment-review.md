# Review: Smart Catalog Intelligence and Unattended Enrichment

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md |
| Verdict | **approved_with_changes** |
| Amendments | 2026-08-24 Catalog Processing Mode plan amendment — **approved** (docs/workflow/reviews/2026-08-24-smart-catalog-intelligence-catalog-processing-mode-plan-amendment-review.md) |

---

## Summary

The Slice 1 plan is grounded in verified repo inventory (prompt **catalog-enrich-v26**, staff-only approval, Algolia contract, tag dependency graph, non-blocking import queue). The six-slice structure, shadow-first automation, coexistence model for legacy tags, and human checkpoints align with FreshForge gates, ADR-FP-080 halftone policy, and the owner's "import and walk away" intent. **Approved to proceed to owner approval** with minor plan clarifications noted below — not blockers for Slice 2 once the owner approves.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Six slices; Phase 9 and unrelated domains explicitly out |
| Architecture alignment | pass | Functions-owned AI; server-authoritative automation; layered apps |
| Security impact addressed | pass | Callable authority, Rules updates flagged, no permission weakening |
| Data model impact addressed | pass | Smart Profile schema, batch fields, migration/backfill |
| Backend impact addressed | pass | Pipeline, Algolia, new callables scoped by slice |
| Test strategy adequate | pass | Per-slice matrix + TESTING.md commands |
| Human checkpoints identified | pass | Auto-approve, backfill, prod Algolia, tag retirement |
| Roadmap alignment | pass | Modernizes Phase 4/5; does not reopen Phase 9 |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS, DEPLOYMENT by slice |
| No silent scope expansion | pass | Slice 1 is docs-only |

---

## Architecture Review

**Findings:**

- Reuses existing pipeline entry (`enqueueAiEnrichment` → `runAiEnrichmentPipeline`) rather than introducing parallel orchestration — correct.
- Proposed `smartProfile` top-level field keeps discovery metadata separate from production flags (halftone, explicit, companion) — aligns with DATA_MODEL boundaries.
- Batch coherence requires new persisted import fields; plan correctly identifies current gap (session-only `jobId`).
- Shadow automation before ADR for unattended approval respects existing staff-mandatory AI Review architecture.

**Required changes:**

- [x] Document during Slice 2 implement whether `catalogCategoryResolver.ts` is dead code or still referenced — consolidate or delete in same slice if unused.

---

## Security Review

**Findings:**

- Auto-approval must remain Functions-only; plan states Firestore Rules updates — required before live auto-approve.
- Smart Profile must not expose staff-only fields in Algolia allowlist (follow `PORTAL_CATALOG_ALGOLIA_ALLOWED_FIELDS` pattern).
- No secret exposure in review evidence UI.

**Required changes:**

- [ ] None blocking Slice 1

**Human approval needed before production:**

- [x] Production Functions deploy (each slice)
- [x] Production Algolia reconcile / Smart Filter enable
- [x] Ready-catalog backfill
- [x] Live auto-approval enable
- [x] Legacy tag retirement

---

## Data Model Review

**Findings:**

- 200-character title max is correctly sourced from `designService` / DATA_MODEL — not invented.
- 24-word lean cap documented with owner decision gate before tightening — appropriate.
- `categoryGapSignals` and `catalogCorrectionEvents` are additive; no destructive migration in early slices.
- Ready backfill preserves title/description/category by default — matches owner requirement.

**Required changes:**

- [ ] During Slice 2, add Firestore Rules validation for new optional fields (`smartProfile`, import batch fields) in the same PR as persistence.

---

## Backend Review

**Findings:**

- Conditional verifier and title-repair calls avoid cost on happy path — good.
- Idempotency leverages existing enqueue validation and proposed version field — adequate.
- Algolia sync classifier must gain Smart Profile field watch list in Slice 3 — plan mentions this.

**Required changes:**

- [ ] Slice 3: extend `portalCatalogChangeClassifier.ts` explicitly in file list (plan §14 implies; add to Slice 3 deliverables during implement).

---

## Testing Review

**Findings:**

- Honest command references from TESTING.md.
- Slice 5/6 manual DEV QA appropriately required for backlog/backfill.
- Search acceptance criteria with concrete query examples in Slice 3 — good.

**Required changes:**

- [ ] Slice 2: add title length histogram test fixture or script output to test report before word-cap decision.

---

## Documentation Review

**Findings:**

- Handoff path reconciliation documented — prevents stale v21/v25 assumptions.
- `portal-tag-alias-search-discoverability` supersession documented; missing plan file noted.
- Supersedes queued alias-search goal without deleting historical signoffs.

**Required changes:**

- [ ] Add one-line supersession note to `docs/project/ROADMAP.md` queued-goals section when Slice 2 starts (not required for Slice 1 STOP).

---

## Required Changes (approved_with_changes)

1. **Slice 2 implement:** Confirm fate of `catalogCategoryResolver.ts` vs `catalogThemeCategoryResolver.ts`.
2. **Slice 2 implement:** Firestore Rules for new design fields in same change set as persistence.
3. **Slice 2 test report:** Title length distribution before any word-cap change.
4. **Slice 3 implement:** Explicitly include `portalCatalogChangeClassifier.ts` in deliverables.

These are implement-phase reminders — **not** plan revision blockers.

---

## Blockers

None.

---

## Verdict Rationale

The plan resolves all `[NEEDS REPO CHECK]` items from the owner brief with source paths, separates facts from proposals, preserves title/description quality constraints, gates automation and tag retirement behind shadow evidence and owner checkpoints, and keeps halftone human-only per ADR-FP-080. The scope is large but sliced reversibly. Minor implement-phase clarifications warrant `approved_with_changes` rather than open plan revision.

---

## Next Step

**Historical (Slice 1 STOP):** Awaited owner approval to begin Slice 2 — complete.

**Current:** Slice 2 owner DEV QA retest after persistence corrective redeploy. Catalog Processing Mode is a **plan amendment only** — implement in Slice 4 after Slice 2 signoff and Slice 3 authorization; full Slice 4 Formal Review required before code.
