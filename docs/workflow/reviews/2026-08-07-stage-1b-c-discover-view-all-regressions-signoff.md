# Signoff: Stage 1b-C Discover View All regressions

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-c-discover-view-all-regressions-plan.md` |
| Plan review | `docs/workflow/reviews/2026-08-07-stage-1b-c-discover-view-all-regressions-plan-review.md` |
| Implementation review | `docs/workflow/reviews/2026-08-07-stage-1b-c-discover-view-all-regressions-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-08-07-stage-1b-c-discover-view-all-regressions-test-report.md` |
| Final status | **approved_with_notes** |

---

## Summary

Corrected two Firestore-backed Portal Discover View All regressions found during Stage 1b-C owner QA:

1. Popular → View All blank (Firestore `orderBy(requestCount)` omitted docs missing the field).
2. Category View All wrong order (readyAt completeness demoted to `createdAt` order).

Owner re-QA: **`DISCOVER VIEW ALL: PASS WITH NOTES`**.

---

## Changes Delivered

### Behavior
- Popular / Most Liked View All: incomplete metric `orderBy` repaired via complete membership + client metric sort (missing → 0).
- Category / Library ready browse: incomplete `orderBy(readyAt)` repaired via membership + `readyAtMs ?? createdAtMs` (not createdAt order).
- New This Week unchanged; Discover home pool skips repair (`skipClientSortRepair`).

### Files Created
- `apps/portal/features/catalog/services/catalogService.discoverViewAllRepair.test.ts`
- Plan / plan-review / test-report / implementation-review / this signoff

### Files Modified
- `apps/portal/features/catalog/services/catalogService.ts`
- `apps/portal/features/catalog/types/catalog.types.ts`
- `apps/portal/features/catalog/services/catalogService.readyAtOrdering.test.ts`

### Documentation Updated
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- Stage 1b owner QA checklist (Discover item)

---

## Tests

### Automated
- 68/68 focused catalog + containment + ranking
- Portal typecheck pass
- Touched-file eslint pass
- `git diff --check` pass

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Popular → View All | PASS WITH NOTES | owner |
| Funny & Sarcastic → View All | PASS WITH NOTES | owner |
| Additional category → View All | PASS WITH NOTES | owner |
| New This Week → View All regression | PASS (exact rail match) | owner |

Owner note (accepted): Popular and category View All card order does **not** exactly mirror Discover rails; only New This Week matches rail ↔ View All exactly. Expected under current architecture (rails = bounded home pool + client rank; View All = dedicated Firestore ordering contract).

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | |
| Database migration | not required | | |
| Design / UX | obtained (notes) | 2026-08-07 | Rail ≠ View All order accepted |
| Business / policy | N/A | | |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Discover rail order ≠ View All for Popular / category | low / accepted | Documented architectural difference; not a defect for this corrective |
| Metric / readyAt client-sort membership capped at 500 | low | Adequate for current catalog size; revisit if catalog grows large |

---

## Deferred Items (Roadmap)
- Unifying Discover rail membership with View All ordering (product/architecture choice) — out of scope for this corrective
- Stage 4 publisher retirement — not started

---

## Open Blockers
- [x] None for this corrective

---

## Verdict

**approved_with_notes** — owner PASS WITH NOTES; architectural rail vs View All ordering difference accepted; no further implement for this corrective.

---

## Confirmations
- No production
- No PR #40 merge
- No Stage 4/5/6
- Publisher remains alive
