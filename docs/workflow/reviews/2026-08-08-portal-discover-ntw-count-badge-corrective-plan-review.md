# Review: New This Week “Counting designs…” corrective plan

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (independent Formal Review) |
| Plan | `docs/workflow/plans/2026-08-08-portal-discover-ntw-count-badge-corrective-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Production QA FAIL is explained by two stacked defects: (1) NTW `countReadyDesigns` likely fails against DESC-only readyAt indexes because the count query omits list-aligned `orderBy`, and (2) failed incomplete aggregates are mapped to the same “Counting designs…” UI as pending. The plan correctly prefers aligning the count query with the existing DESC index (no index deploy) and separating failed vs pending UI. Implementation may proceed under the binding changes below. **Do not Signoff TD-031** until corrective is live and owner QA passes.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Corrective only; no Signoff yet |
| Architecture alignment | pass | Service + hook |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Prefer no new indexes |
| Test strategy adequate | pass | Binding tests below |
| Human checkpoints identified | pass | Owner QA after corrective deploy |
| Roadmap alignment | pass | TD-031 closeout |
| Documentation plan | pass | Workflow + TECH_DEBT |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:** Root cause chain (index alignment + UI mapping) is consistent with repo indexes and hook code. Prefer `catalogService.countReadyDesigns` fix first.

**Required changes:**

- [ ] **Binding:** In `countReadyDesigns`, when `readyAfterMs` is set (NTW membership), add `orderBy('readyAt', 'desc')` and `orderBy('__name__', 'desc')` before `getCountFromServer`, matching the list path. Do not invent ASC index deploy as the default fix.
- [ ] **Binding:** Apply the same orderBy alignment for any other count that uses readyAt inequality without orderBy if introduced; do not change equality-only counts unnecessarily.

---

## Security Review

**Findings:** None.

**Required changes:**

- [x] None

**Human approval before production:** Corrective App Hosting rollout only (later phrase). No Rules/Functions.

---

## Data Model Review

**Findings:** None.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:** Prefer zero new indexes. If after implement, production still fails count with a missing-index error that names an ASC composite, stop and open a separate index gate — do not silently expand this corrective.

**Required changes:**

- [ ] **Binding:** Log or surface count failure reason in a non-secret way during implement/test (e.g. test mock of failed-precondition); do not paste production secrets.

---

## UI / failure contract (binding)

**Required changes:**

- [ ] **Binding:** `shouldShowOrdinaryCountPending` must return **true only for `pending`**, not for `failed`.
- [ ] **Binding:** Failed + incomplete: `isHydrating === false`, `matchingCount === null` must **not** display “Counting designs…”. Prefer existing muted chip behavior: use a short distinct label in `CatalogPageContent` such as **“Count unavailable”** (minimal one-line change). Do not reintroduce page-length as fake total.
- [ ] **Binding:** Failed + fully hydrated: keep loaded membership as total.
- [ ] Load more remains cursor-driven on failure.

---

## Test Review

**Required changes:**

- [ ] Test: `failed` + `!isFullyHydrated` → `shouldShowOrdinaryCountPending === false`
- [ ] Test: `pending` → `shouldShowOrdinaryCountPending === true`
- [ ] Containment or unit: NTW/`readyAfterMs` count path includes readyAt + `__name__` desc orderBy
- [ ] Prior TD-031 paging tests still pass

---

## Human Checkpoints

- Owner QA after corrective App Hosting (same checklist + explicit NTW Counting regression).
- No Signoff on parent goal until that PASS.

---

## Required Changes Before/During Implementation

1. Align NTW count query orderBy with existing DESC composite (preferred path).
2. Decouple failed from “Counting designs…” UI per contract above.
3. Ship binding tests.
4. Optional: stabilize `readyAfterMs` query identity if touching `buildServerListQuery` anyway.
5. STOP before production deploy; separate rollout phrase after implement/test/impl-review.
6. Do not mark TD-031 resolved / Signoff in this corrective plan phase.

---

## Verdict

**approved_with_changes**

---

## Next owner phrase

`IMPLEMENT PORTAL DISCOVER NTW COUNT BADGE CORRECTIVE`
