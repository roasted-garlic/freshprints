# Formal Review: Show Queue global allocation quota — apply to existing shows

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-15-show-queue-global-allocation-quota-apply-existing-shows-plan.md` |
| Managed goal | `show-queue-global-allocation-quota-apply-existing-shows` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan correctly identifies this as **show capacity** (`settings/showQueue.defaultMaxTotalQuantity` → `upcomingShows.maxTotalQuantity`), not Portal customer print limits. Scope is bounded, architecture favors a trusted owner/admin callable for bulk apply, and eligibility correctly excludes Past/Needs Attention/terminal shows and Internal Gang Sheets. Verdict is **approved_with_changes**: Implement may proceed only after the owner explicitly accepts this Formal Review **and** authorizes implementation; Required Changes below must be followed during Implement (no new Plan loop unless the owner rejects a Required Change).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Checkbox + optional apply; regression boundaries explicit |
| Architecture alignment | pass | Modal → Hook → Service → Callable; bulk not in React |
| Security impact addressed | pass | Owner/admin only; no Rules change; no permission broaden |
| Data model impact addressed | pass | No new fields; overwrite semantics documented |
| Backend impact addressed | pass | New callable + shared eligibility helper |
| Test strategy adequate | pass | Unchecked/checked, eligibility, auth, partial failure, regressions |
| Human checkpoints identified | pass | Owner DEV QA required; production forbidden |
| Roadmap alignment | pass | Phase 7 Show Queue settings refinement |
| Documentation plan | pass | DATA_MODEL / DECISIONS / ROADMAP |
| No silent scope expansion | pass | Explicit exclusions; printRequestLimits/ADR-FP-159 untouched |

---

## Architecture Review

**Findings:**

- Current Settings save is client SDK to `settings/showQueue` with Rules owner/admin — acceptable for the **unchecked** path.
- Bulk multi-show mutation must not live in the modal; Plan’s callable + shared helper matches project boundaries and the print-request-limits “trusted write” pattern more closely than a client batch loop.
- Separating “Apply checked → callable for default max + shows” from “other settings fields via existing client update” is acceptable for v1; one Save click remains one user action.

**Required changes:**

- [x] When Apply is checked, the callable must be the **only** writer of `defaultMaxTotalQuantity` for that Save (avoid double-write race: client `updateSettings` must not also write `defaultMaxTotalQuantity` in the same Save). Non-quota fields may still use the existing client path.
- [x] Shared eligibility helper must live under `packages/shared` and be imported by Functions (and Studio contracts as needed)—do not duplicate predicates.

---

## Security Review

**Findings:**

- `canManageShowQueueSettings` is owner/admin; Rules already gate `settings/showQueue`.
- Bulk apply must assert active **owner or admin** in the callable (align with Settings, not with owner-only `updatePrintRequestLimitSettings`).
- UI checkbox is not authorization.

**Required changes:**

- [x] Callable auth: active caller with role `owner` **or** `admin` (mirror Show Queue Settings, not print-request-limits owner-only).
- [x] Validate `defaultMaxTotalQuantity` bounds server-side (non-negative number or clear/absent “no limit”); reject malformed input.

**Human approval needed before production:**

- [x] Production Functions deploy / Studio release — **not authorized** by this review; separate owner gate later.

---

## Data Model Review

**Findings:**

- Confirmed snapshot model; no live derivation of show capacity from settings.
- `maxQuantityOverridden` is **not** an intentional “custom quota lock”; overwriting differing show max values when Apply is checked is acceptable **with explicit owner opt-in**.
- Internal Gang Sheets correctly use a different default (200) and must be excluded.

**Required changes:**

- [x] When applying “no limit” (blank / undefined global), clear show `maxTotalQuantity` with Admin `FieldValue.delete()` (or equivalent), and set `maxQuantityOverridden` to `false` on updated shows so stale danger flags do not linger.
- [x] When applying a finite max, set `maxQuantityOverridden: false` on successfully updated shows (bulk apply is not the danger-override path).
- [x] Document overwrite semantics in the ADR: checked Apply intentionally replaces staff-edited eligible show capacity.

---

## Backend Review

**Findings:**

- Chunked batches required for show counts approaching Firestore limits.
- Settings-then-shows ordering means settings can commit before show failure — Plan correctly requires honest UI messaging.

**Required changes:**

- [x] Callable response must include at least `updatedShowCount` and `skippedBelowAllocatedCount` (and optionally `failedShowCount` / error detail on throw).
- [x] On chunk failure after some successful chunks: throw a clear error that includes how many shows were already updated; Studio must not show the “full success” toast in that case.
- [x] Query strategy: prefer a bounded Firestore query (e.g. by `productionStatus in [...]` and/or `source in [...]`) then filter Upcoming schedule + exclusions in trusted code—avoid loading the entire `upcomingShows` collection unboundedly without a documented limit/strategy in the implementation notes.

---

## Testing Review

**Findings:**

- Coverage list matches acceptance criteria.
- Owner DEV QA is mandatory before Signoff.

**Required changes:**

- [x] Add at least one contract asserting the Studio Save path does **not** call the apply callable when the checkbox is unchecked.
- [x] Add eligibility cases for `productionStatus: "full"` (included) and Needs Attention / Past (excluded).

---

## Documentation Review

**Findings:**

- ROADMAP still says the default is applied only at creation — must be updated.
- Keep ADR-FP-159 / printRequestLimits documentation clearly separate.

---

## Required Changes (approved_with_changes)

1. **No double-write of default max when Apply is checked** — callable owns `defaultMaxTotalQuantity` for that Save; client path updates only non-quota settings fields (or omits default max).
2. **Callable roles = owner or admin** (Show Queue Settings parity).
3. **Clear / reset `maxQuantityOverridden` to `false` on successfully bulk-updated shows**; use `FieldValue.delete()` when applying no-limit.
4. **Honest partial-failure reporting** with counts; never full-success toast after partial show updates.
5. **Documented query/filter strategy** with no unbounded silent full-collection scan without notes/limits.
6. **Focused tests** for unchecked (no callable), `full` included, Past/Needs Attention excluded, below-allocated skipped.

---

## Blockers

None for Formal Review completion. **Implementation is blocked** until the owner explicitly accepts this Formal Review and authorizes Implement → Test.

---

## Verdict Rationale

**approved_with_changes** — Investigation is solid; recommended eligibility and architecture are sound; Required Changes are implementable constraints that harden atomicity, auth parity, and overwrite hygiene without expanding scope. Do not implement until owner acceptance.

---

## Next Step

1. Owner reviews Plan + this Formal Review.
2. Owner replies with explicit acceptance and authorization to implement (or requests Plan revision).
3. Only then: Implement → Test → Owner DEV QA → Signoff.
4. Production / Studio release remain separately unauthorized.
