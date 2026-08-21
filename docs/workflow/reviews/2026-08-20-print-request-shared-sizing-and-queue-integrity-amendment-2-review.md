# Review: Amendment 2 — Studio Add Designs Must Not Replay Existing Request Items

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-2-plan.md` |
| Parent | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md` (Formal Review **approved**) |
| Amendment 1 | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-plan.md` (Formal Review **approved**) |
| Goal id | `print-request-shared-sizing-and-queue-integrity` |
| Verdict | **approved** |

---

## Summary

Amendment 2 correctly traces the owner duplicate-on-Add-Designs defect to Studio `savePrintRequestDesignSelections` matching existing catalog items by **`designId` + default requested size**, after selection mode replays every hydrated catalog design on Save and drops `existingItemId`. The bug predates this managed goal (`22ab215c`, 2026-07-04); parent sizing exposed it by making 14×21.1 savable. The proposed fix uses the identity the hook already tracks (request item id) and must not add a `designId` uniqueness rule. Combined Implement remains blocked on **explicit owner approval**.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio Add Designs save/replay only. Parent sizing + Amendment 1 preserved. Portal matcher documented out of scope. |
| Architecture alignment | pass | UI → hook → service; pure planner for write intent. No UI Firebase. |
| Security impact addressed | pass | Same `canManagePrintRequestItems`. Skip stale ids. No new public API. |
| Data model impact addressed | pass | No schema/index/status change. Item id remains authoritative. |
| Backend impact addressed | pass | Studio client only. STOP if Functions/Rules appear necessary. |
| Test strategy adequate | pass | Reproduction, default-size existing, Duplicate, remove, repeated sessions, stale id, uploads omitted. |
| Human checkpoints identified | pass | STOP before Implement; combined DEV QA after; no production. |
| Roadmap alignment | pass | Request integrity; Phase 9 still parked. |
| Documentation plan | pass | Optional WORKFLOWS note only; no historical rewrite. |
| No silent scope expansion | pass | No designId unique constraint; no Portal rewrite; no data repair. |

---

## Architecture Review

**Findings:**

- Selection mode already has the right model: `isExisting` + `existingItemId`. Save currently maps that away to `{ designId, quantity }`. Restoring `existingItemId` is the smallest aligned fix.
- Default-size matching was introduced to let oversized catalog designs be added, not to identity existing resized items. Using create-time default size as an upsert key is the layering error.
- `addDesign` no-op on an already-selected `designId` is current product behavior. Review agrees: do not invent library re-add. Duplicate stays the second-item path.
- `buildSelectionStateFromRequestItems` collapsing Duplicate copies by `designId` is a pre-existing limitation. Out of scope. Planner must still refuse to create a third default-size copy when two item ids already exist.
- Customer-upload items are excluded from the catalog selection map and from Save. Correct to leave them untouched.
- Portal has the same matcher but filters to dirty selections, so the owner reproduction is Studio-specific. Do not expand to Portal in this amendment.
- Parent overlap is `printRequestService.ts` only. Implement must not edit `assertPersistedPrintRequestItemSize` / allocate gating.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Save remains a privileged Studio write. Planner skip-on-missing-id avoids recreating a deleted item from a stale selection row.
- Do not accept client-supplied inches on the existing-item update path; quantity-only updates.
- New creates still go through `addPrintRequestItem` / printable-design load.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] Owner Continue Workflow before Amendment 2 Implement
- [x] Combined owner DEV QA after Implement (Amendment 2 + parent sizing + Amendment 1)
- [x] Production Studio/Portal/Functions deploys are **not** part of this amendment
- [x] No production data repair of already-duplicated items

---

## Data Model Review

**Findings:**

- No persisted field, status, or index changes.
- Existing request item documents stay the source of truth for size, quantity, notes, source, allocations.
- Default requested size remains create-time initialization only.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- Studio renderer service only. No callable, Rules, index, or scheduler.
- If Implement discovers a backend requirement, **STOP** per plan.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Planner unit tests can prove the owner cases without Firestore.
- Must include: resized replay, unresized existing, Duplicate two-A-plus-B, remove-no-resurrect, stale existingItemId skip, empty new-selection no-op.
- Parent automated suite re-run is required because `printRequestService.ts` is already dirty with sizing work.
- Manual QA list matches the owner amendment. Signoff stays blocked until that QA is recorded.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:**

- No ADR required: this restores item-id identity the UI already had, rather than a new product rule.
- Optional WORKFLOWS clarification only if docs currently describe design+size upsert.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Root cause is proven in current Studio source and git history. The fix is narrow, architecture-aligned, and explicitly preserves Duplicate and multi-size same-design items. Parent sizing and Amendment 1 are protected. Remaining gate is owner approval to Implement, then combined DEV QA — not a plan defect.

---

## Next Step

**STOP.** Do not implement Amendment 2 until the owner continues the workflow.

After owner approval: Implement the planner + `existingItemId` save path only; run automated tests; then combined owner QA. Do not Signoff the parent goal until Amendment 2 QA and parent re-QA pass.
