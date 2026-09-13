# Formal Review: Catalog Reprocessing Amendment (Slices 4–6)

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Plan | `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-catalog-reprocessing-amendment-plan.md` |
| Parent | Master Smart Catalog plan §11a / §12 / §13 / §24 |
| Status | **approved_with_changes** (docs only — open Formal Review items for Slice 4 start) |

---

## Summary

Owner requirement for a first-class Catalog Reprocessing capability is correctly scoped as a **shared control plane** (Slice 4) with action enablement in Slices 5–6. Repo audit correctly rejects client-side AI Processing queues and invents-nothing-yet on queues. Studio Settings → AI Enrichment is the right surface. Owner-only + PRODUCTION confirmation + Algolia reuse match security and Slice 3 architecture.

## Checklist

| Criterion | Result |
|-----------|--------|
| Slice ownership clear (4 define/infra; 5/6 actions) | pass |
| No Slice 5/6 migration execution in Slice 4 | pass |
| Catalog Processing Mode interaction correct | pass |
| Ready lifecycle protected in Slice 6 | pass |
| Backend durability / no Studio-open requirement | pass |
| Repo patterns audited before inventing queue | pass |
| Permissions owner-only (stricter than some AI settings) | pass — Formal Review must lock |
| Production safety confirmation | pass — phrases TBD in Slice 4 FR |
| Algolia no parallel publisher | pass |
| Docs-only; no Slice 4 implement authorized | pass |

## Required changes (carry into Slice 4 Formal Review)

1. **Job architecture decision (blocking for implement):** Choose Firestore job doc + worker (email-job pattern) vs cursor-callable + durable progress doc — record ADR or Slice 4 plan decision before coding.
2. **Owner-only:** Confirm admin excluded for reprocess callables (owner requirement).
3. **Confirmation phrases:** Finalize typed phrases + PRODUCTION copy using shared confirmation constants.
4. **Pause:** Define soft-pause semantics if supported.
5. **Eligible/exclusion queries:** Specify exact Firestore predicates in Slice 5/6 detail plans.

## Verdict

**approved_with_changes** — Amendment accepted into master plan. Open items are Slice 4 Formal Review / detail-plan gates, not blockers to recording this requirement. **Does not authorize Slice 4 implementation.**
