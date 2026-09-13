# Review: Slice 6 Corrective — Ready Design Smart Profile Visibility + Editing

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-26-slice-6-ready-design-smart-profile-visibility-editing-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly identifies the owner QA blocker: Smart Profile and automation provenance exist in Firestore after Ready backfill but are not surfaced in Studio Design Details, and client writes are forbidden. The proposed callable-based edit path, provenance marking (Option B), and `ready_backfill` merge policy align with architecture, security, and Slice 6 preservation goals. Scope is appropriately bounded (no bulk reprocess, no Autonomous, DEV-first).

**Binding changes required before implement** are listed below; none block planning approval.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Design Details + callable edits only; card badges deferred |
| Architecture alignment | pass | Service → callable → Admin; no UI Firestore writes |
| Security impact addressed | pass | Staff auth, lifecycle guards, normalization |
| Data model impact addressed | pass | Additive provenance + snapshot fields documented |
| Backend impact addressed | pass | New callables + ready_backfill merge |
| Test strategy adequate | pass | Unit, rules, contract, preservation regression |
| Human checkpoints identified | pass | Manual UI QA on canary designs |
| Roadmap alignment | pass | Slice 6 corrective before full Ready Start |
| Documentation plan | pass | DATA_MODEL, BACKEND, ADR-FP-147 |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**

- Reusing `AiReviewSmartProfileSection` extraction avoids duplicate dimension rendering logic.
- Keeping root category in Edit Design avoids dual category authority in v1.
- `smartProfileAiSnapshot` at design doc top-level keeps merge/reset logic centralized for Functions.

**Required changes:**

- [x] **Binding:** Implement shared `resolveSmartProfilePipelineStatus()` in `packages/shared` (not Studio-only) so Functions tests and Studio UI use one definition of Missing/Older/Current.

---

## Security Review

**Findings:**

- Firestore rules correctly remain deny-by-default for client `smartProfile` mutation.
- Callable must use transaction or pre/post read assert for `status` + `aiReviewStatus` unchanged (mirror Slice 6 worker assertions).
- Dimension input must pass shared normalization caps to prevent oversized arrays.

**Required changes:**

- [x] **Binding:** Callable returns `failed-precondition` if design is not `ready` + `approved` (fail-closed for this corrective scope).

**Human approval needed before production:**

- [ ] Callable deploy to production (separate from DEV corrective QA)

---

## Data Model Review

**Findings:**

- `staffEditedDimensionKeys` on provenance is sufficient for reprocess merge without a full override layer.
- Snapshot field should be updated on **every** AI smartProfile write (queue + ready_backfill + enqueue path) for consistent reset semantics.

**Required changes:**

- [x] **Binding:** Document `smartProfileAiSnapshot` in DATA_MODEL as Functions-owned, staff read-only.
- [x] **Binding:** `staffEditedDimensionKeys` values must be validated against the canonical dimension key enum (reject unknown keys).

---

## Backend Review

**Findings:**

- ready_backfill merge amendment is **required** before owner relies on staff edits during full Ready backfill — must ship in same implement pass as callables.
- Algolia sync requires no new publisher; dimension edits on Ready trigger existing classifier path.

**Required changes:**

- [x] **Binding:** Include `ready_backfill` merge in implement scope and preservation test suite (extend `catalogReprocessReadyPreservation.test.ts` or add staff-edit merge test).

---

## Testing Review

**Findings:**

- Plan covers rules denial regression (critical).
- Manual QA explicitly targets 3 canary design IDs.

**Required changes:**

- [ ] Add one contract test asserting Design Details shows **no** Smart Profile edit affordance when `status !== "ready"`.

---

## Documentation Review

- ADR-FP-147 should cross-reference ADR-FP-146 (Ready preservation) and state staff-edit merge during backfill.
- Update stale v28 copy in `AiReviewSmartProfileSection` as noted in plan.

---

## Required Changes (binding for implement)

1. Shared `resolveSmartProfilePipelineStatus()` in `packages/shared` (single source for Missing/Older/Current).
2. Callable fail-closed: only `ready` + `approved` designs.
3. Validate `staffEditedDimensionKeys` against canonical dimension enum.
4. `smartProfileAiSnapshot` updated on all AI enrich success paths writing `smartProfile`.
5. `ready_backfill` merge preserves staff-edited dimensions — must ship with callables, with automated test coverage.
6. Design Library card badges remain **out of scope** unless implement review confirms zero grid churn.

---

## Blockers

None.

---

## Verdict Rationale

Plan is architecturally sound, security-aligned, and narrowly scoped to unblock Slice 6 owner QA. Option B with provenance marking and ready_backfill merge is the correct repo-aligned choice given Algolia and Studio read paths. Conditional approval reflects binding implement requirements (shared status helper, snapshot writes, merge tests) rather than plan gaps requiring rewrite.

---

## Next Step

**Implement** after owner acknowledges:

1. Callable permission = active staff (default in plan) — confirm or restrict to owner/admin
2. Missing-profile Ready designs = read-only until enriched (recommended)

Do **not** run full Ready Catalog Start until this corrective is deployed to DEV and owner re-reviews canary designs in Studio.
