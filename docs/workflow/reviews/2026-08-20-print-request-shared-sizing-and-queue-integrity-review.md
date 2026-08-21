# Review: Shared Print Request Sizing and Queue Integrity Fix

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md; Amendment 1: docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-plan.md |
| Verdict | **approved** |

---

> **Amendment 1** (same goal, added after this review): `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-review.md`. Combined implementation remains blocked on owner approval.

---

## Summary

The plan correctly identifies a shared ADR-FP-080 approved-max hard block inside `assessPrintRequestItemSize` as the source of the 10.95″ × 16.5″ Portal/Studio error, and a separate persistence/queue/fallback integrity hole as the source of Show Queue values that are not the visible 14″ × 21.1″. The proposed fix keeps one shared manual policy (200 DPI + 22″), removes the processing envelope from save validation, and gates queue/attach until visible inches are persisted. Scope is bounded to Print Request sizing and downstream dimension integrity. No implementation should start until the owner accepts this review.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Corrective fix across Portal, Studio, shared, Functions queue, export/gang. Phase 9 / catalog lifecycle / processing policy math excluded. |
| Architecture alignment | pass | Shared math → hooks/cards → services/callables. No UI Firebase. No duplicate DPI formula. |
| Security impact addressed | pass | Server-side size validation is defense-in-depth; fail closed on missing pixels/inches. No Rules/secrets. |
| Data model impact addressed | pass | No schema/migration. Docs currently stale at 72 DPI; plan updates them. No production data rewrite. |
| Backend impact addressed | pass | `queuePortalPrintRequestToShow` + Studio allocate reuse shared assess. Extra catalog pixel reads are justified. DEV deploy is a later checkpoint. |
| Test strategy adequate | pass | DPI lattice, Painkiller fixture, envelope regression, cap, persist/queue races, catalog/upload/duplicate, export fallback. Commands match `docs/standards/TESTING.md`. |
| Human checkpoints identified | pass | Owner approval before Implement; later manual QA; later DEV/prod deploys. |
| Roadmap alignment | pass | Corrective work on Phases 6–8. Phase 9 parked. Tag-alias remains queued only. |
| Documentation plan | pass | ADR-FP-075/080 clarification; DATA_MODEL + WORKFLOWS 72→200; no historical rewrite. |
| No silent scope expansion | pass | No import pipeline rewrite, no allocation backfill, no Custom Request. |

---

## Architecture Review

**Findings:**

- Current mixing of ADR-FP-080 `calculateApprovedMaxPrintSize` into `assessPrintRequestItemSize` is the layer violation to undo. Processing policy stays in `imageQualitySizingPolicy.ts`.
- Portal size writes skipping shared assess is a real divergence; requiring `assessPrintRequestItemSize` in `portalPrintRequestService.updatePrintRequestItem` restores service-owned validation.
- Export `?? design.printWidthInches ?? 3` is an architecture shortcut that treats catalog native size as production intent. Fail-closed for queued items is the correct boundary.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Queue currently accepts any numeric inches (or omits them). Adding shared assess on the callable is appropriate default-deny for production sizing.
- No client-only authorization change. No new public endpoints. No secret exposure.
- Extra design document reads on queue must not include original image bytes or tokens; existing Admin `designs.width/height` fields are sufficient.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] Later production Functions/Portal/Studio deploy (not this review)
- [x] None for starting Implement after owner approval

---

## Data Model Review

**Findings:**

- `printWidthInches` / `printHeightInches` remain the requested physical size on items and allocations. No new fields.
- Optional inches plus `withoutUndefinedFields` is part of defect C; plan keeps the schema and tightens writers/readers instead of a migration.
- Stale 72 DPI documentation must be corrected so agents do not reintroduce the old band.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- `queuePortalPrintRequestToShow` is the correct Portal integrity choke point. Studio `allocatePrintRequestItem` must not be left weaker.
- Callable-safe reuse of `assessPrintRequestItemSize` is required; do not inline a second DPI formula.
- If pixel metadata is missing, fail closed rather than queue with native-at-300 fallbacks.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Existing `currentRequestAggregates.test.ts` currently **requires** approved-max oversize to flag `dpi_below_minimum`. Implement must invert that case (4″ at 1000px / 250 DPI becomes saveable).
- Painkiller fixture should be deterministic pixels (plan’s 4312×6499 at 14×21.1), not a live catalog read.
- Persist/queue tests must cover pending save and failed save, not only the happy path after the ceiling is removed.

**Required changes:**

- [x] None — already in the plan test strategy

---

## Documentation Review

**Findings:**

- ADR-FP-080 item 6 currently reads as if approved max is an additional request layer alongside 22″ and 200 DPI. Owner clarification belongs there plus ADR-FP-075.
- Do not rewrite historical r7 / intake records.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Investigation is sourced from current HEAD (`1b967fd` on `development`). The 10.95″ × 16.5″ message is reproduced from `calculateApprovedMaxPrintSize` + `assessPrintRequestItemSize`. Queue integrity gaps are proven in Portal CTA gating, skipped autosave, and export/card fallbacks. The smallest fix is a shared policy split plus persistence barriers, without schema or processing-pipeline changes. Review **approved**. Implement is allowed by workflow gates **only after the owner explicitly continues**.

---

## Next Step

Await owner approval to Implement approved scope. Do not write application code, deploy Functions, or open a production PR in this step.
