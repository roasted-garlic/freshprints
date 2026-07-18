# Review: Studio Test Data Reset — presets + shorter labels

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-studio-test-data-reset-presets-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow, reversible UX + wipe-expansion change for the existing allowlisted Test Data Reset tool. Presets and short labels address the screenshot pain; expanding assisted/Etsy wipe collections closes the orphan gap from the leftover classification without adding a separate leftover preset or touching Ask-row product config. Safety gates unchanged; production wipe/deploy correctly out of scope.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | UI + shared expand + tests/docs; no leftover console cleanup |
| Architecture alignment | pass | Shared expand remains SSOT; Studio selects targets only |
| Security impact addressed | pass | Same owner + project allowlist + phrase + designs modal |
| Data model impact addressed | pass | Delete-set only; no schema |
| Backend impact addressed | pass | Redeploy `wipeOperationalTestData` to `fresh-prints-dev` required for orphan deletes |
| Test strategy adequate | pass | Unit tests + soft-reload manual; optional post-deploy wipe smoke |
| Human checkpoints identified | pass | Soft UI glance; functions redeploy when owner asks |
| Roadmap alignment | pass | Dev ops UX; no product roadmap conflict |
| Documentation plan | pass | TESTING.md (+ optional ADR note) |
| No silent scope expansion | pass | Ask collections explicitly excluded |

---

## Architecture Review

**Findings:**
- Expanding collections inside existing targets is preferable to new target ids for orphan side data.
- Preset constants belong in shared next to `PRINT_REQUEST_RESET_PRESET_TARGETS`.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Broader deletes still only run on allowlisted project via existing callable gates.
- Wiping all `customerNotifications` / `emailDeliveryJobs` with Custom Requests is acceptable on `fresh-prints-dev`; document in help text.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (production deploy forbidden for this phase)

---

## Data Model Review

**Findings:**
- Legacy `customRequests` / `customRequestEtsySearchRateLimits` deletes are cleanup-only; no live writers expected.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Confirm `wipeOperationalTestData` uses `expandOperationalWipePlan` only (no divergent hard-coded list).
- Implement must note: orphan cleanup inactive until function redeployed to `fresh-prints-dev`.

**Required changes:**
- [x] None (implement note only)

---

## Testing Review

**Findings:**
- Extend `operationalWipeTargets.test.ts` for new delete collections and presets.
- Soft-reload Studio for UI; do not claim orphan wipe pass without redeploy + optional smoke.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- TESTING.md wipe section should list presets and expanded side collections.

---

## Required Changes (if approved_with_changes)

(none)

---

## Blockers (if blocked)

(none)

---

## Verdict Rationale

Scope matches owner request; orphan expansion is documented and constrained; safety unchanged. Approved to implement.

---

## Next Step

Implement approved scope; soft-reload Studio; unit tests; update TESTING.md.
