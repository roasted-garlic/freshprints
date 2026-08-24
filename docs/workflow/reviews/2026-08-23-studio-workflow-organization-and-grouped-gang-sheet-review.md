# Review: Studio workflow organization and grouped gang sheet export

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-23-studio-workflow-organization-and-grouped-gang-sheet-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The plan is well-scoped, Studio-only, and correctly separates five independent workstreams while respecting hard product constraints (especially preserving the existing gang sheet generator). Repo inspection answers all nineteen required questions with concrete file paths and data-model-backed grouping rules. Backend/schema impact correctly stays **none**. Implementation may proceed after owner confirms three minor product defaults listed under Required Changes.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Portal, Firebase deploy, Phase 9, and gang sheet replacement explicitly excluded |
| Architecture alignment | pass | Hooks/services/IPC boundaries preserved; pure shared utils for grouping/layout |
| Security impact addressed | pass | Staff-only reads; export URL validation unchanged |
| Data model impact addressed | pass | No schema changes; authoritative joins documented |
| Backend impact addressed | pass | No Functions/Rules/indexes |
| Test strategy adequate | pass | Unit + contract tests for WS1/3/5; manual QA matrix defined |
| Human checkpoints identified | pass | Manual Studio QA; no production deploy in scope |
| Roadmap alignment | pass | Phases 2–7 cited correctly |
| Documentation plan | pass | ADR for grouped gang sheet mode |
| No silent scope expansion | pass | Prior Portal Functions deploy explicitly out of scope |

---

## Architecture Review

**Findings:**

- WS1 correctly extends existing hydration rather than denormalizing show titles onto `printRequests`.
- WS3 avoids Algolia and new indexes by auto-hydrating paginated inbox rows — appropriate for staff-only bounded queue.
- WS4 patch-first approach matches existing `applyDesignPatch` authority pattern; scroll-into-view fallback handles `updatedAt` sort drift.
- WS5 separates `layoutMode` at IPC boundary; efficiency path extraction prevents silent behavior change.
- Label SVG extraction to shared module enables reuse without duplicating Sharp composition logic.

**Required changes:**

- [x] None blocking — proceed with proposed structure

---

## Security Review

**Findings:**

- No new trust boundaries; gang sheet grouping uses already-loaded staff allocation + request metadata.
- Group keys use `customerId` / `internalBaseName`, not parsed display strings — good.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [ ] None for this goal (production deploy out of scope)

---

## Data Model Review

**Findings:**

- Plan correctly uses `showAllocations`, `upcomingShows`, and `printRequests` without writes.
- Multi-show handling avoids duplicate cards — aligns with acceptance criteria.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- No Cloud Functions, Rules, indexes, or Portal changes required — verified against plan Q16.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:**

- WS5 regression strategy (default `efficiency` mode + fingerprint separation + nesting golden tests) is appropriate.
- WS3 needs explicit test for auto-hydration stopping at cap.
- WS4 manual QA is essential; limited automated coverage acceptable.

**Required changes:**

- [ ] Add `aiReviewNeedsReviewSearch.test.ts` covering cap + normalization during implement phase

---

## Documentation Review

**Findings:**

- ADR for grouped gang sheet export mode is warranted and scoped.
- TESTING.md update optional unless new commands become standard.

---

## Required Changes (approved_with_changes)

Implement using these defaults unless owner objects before implementation starts:

1. **Multi-show requests:** primary show section + `+N more shows` badge (no card duplication).
2. **Needs Review search hydration cap:** 500 designs max while searching.
3. **Grouped gang sheet section label font:** 85% of configured sheet label font size.

---

## Blockers

None.

---

## Verdict Rationale

**approved_with_changes** — The plan is implementation-ready, architecture-consistent, and bounded. The three items above are product defaults, not plan gaps. No schema, security, or backend blockers. Owner implementation approval is still required per managed-phase gate (this review does not authorize coding).

---

## Next Step

1. Owner replies with **implementation approval** (and any overrides to the three defaults).
2. Managing Agent sets workflow state to **Implement** phase.
3. Do **not** deploy Firebase or promote production as part of this goal.
