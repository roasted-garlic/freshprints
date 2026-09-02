# Signoff: Studio history newest-first ordering (+ Pocket/Full Size counts amendment)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Signoff by | Signoff Agent |
| Goal | `studio-history-newest-first-ordering` |
| Amendment | `print-request-pocket-fullsize-counts` |
| Plans | `docs/workflow/plans/2026-09-02-studio-history-newest-first-ordering-plan.md`, `docs/workflow/plans/2026-09-02-print-request-pocket-fullsize-counts-amendment-plan.md` |
| Reviews | `docs/workflow/reviews/2026-09-02-studio-history-newest-first-ordering-review.md`, `docs/workflow/reviews/2026-09-02-print-request-pocket-fullsize-counts-amendment-review.md`, corrective `...-corrective-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-09-02-studio-history-newest-first-ordering-final-test-report.md` |
| Owner QA History | `docs/workflow/reviews/2026-09-02-studio-history-newest-first-ordering-owner-qa.md` → **PASS** |
| Owner QA Pocket/Full Size | `docs/workflow/reviews/2026-09-02-print-request-pocket-fullsize-counts-owner-qa-retest.md` → **PASS** |
| Final status | **approved** |
| DONE | **yes** |
| Production | **NOT AUTHORIZED** |

---

## Summary

Internal Gang Sheet **History** lists newest completed sheet first (`printFinishedAt` DESC; missing finish last; cycle DESC then id). **Current**, **Past**, and **Upcoming** ordering unchanged. Amendment adds derived **Pocket N · Full Size M** operational counts (width-only, print quantity, configurable Show vs Internal cutoffs) on Print Request / Show Queue / Internal surfaces as one compact pill, without changing gang-sheet pricing/weight classification. Print Request detail uses outer page scroll only (no nested `.print-requests-main` scrollbar). Owner QA **PASS** for both parts on local/DEV. No Functions, Portal, Firestore Rules, Storage Rules, indexes, or migrations.

---

## Changes Delivered

### Behavior

- History: `sortStaffGangSheetHistoryForDisplay` on Internal Gang Sheet History only
- Pocket/Full Size: dedicated width-only helper; hide when total classified qty = 0
- Cutoffs from `settings/showQueue` vs `settings/internalGangSheet` (not hardcoded)
- Pricing: `resolveGangSheetPriceTierForInches` unchanged (both-dim)
- Scroll: `.page-content-area--print-requests` outer `overflow-y: auto`; no nested main scrollbar

### Inventory (production impact — future promote only)

| Area | Change |
|------|--------|
| Functions | **no changes** |
| Portal | **no changes** |
| Firestore Rules | **no changes** |
| Storage Rules | **no changes** |
| Indexes | **none** |
| Migration | **none** |
| Runtime config | **unchanged** |
| Studio | source/build/release only |

### Files Created (application)

- `packages/shared/src/utils/printRequestPocketFullSizeCounts.ts`
- `packages/shared/src/utils/printRequestPocketFullSizeCounts.test.ts`
- `apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts`

### Files Modified (application)

- `apps/studio/.../upcomingShowListSort.ts` (+ tests)
- `apps/studio/.../UpcomingShowsPage.tsx`
- `apps/studio/.../PrintRequestsPage.tsx`
- `apps/studio/.../printRequestQueryPlanning.ts` (+ tests)
- `apps/studio/.../showQueuePrintRequestSources.test.ts` (`sizeClassRows` fixtures)
- `apps/studio/.../print-requests.css`
- `apps/studio/.../layout.css`

### Documentation

- Plans, reviews, owner QA, correction, corrective review, final test report, this signoff, ROADMAP banner, workflow state

---

## Tests

### Automated

- Final focused: **63/63 PASS**
- Pricing regression: **PASS**
- Studio Vite build: **PASS**
- Studio typecheck: **passed_with_notes** (pre-existing only)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| History ordering | **PASS** | Owner |
| Pocket/Full Size corrective retest | **PASS** | Owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | **not authorized** | 2026-09-02 | Preserve for coordinated Studio promote |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-09-02 | Owner QA PASS (counts + scroll) |
| Business / policy | obtained | 2026-09-02 | WIDTH-ONLY operational counts |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Studio `tsc --noEmit` pre-existing debt | low | Documented; not introduced by this goal |
| Show vs Internal cutoff divergence | info | Expected product behavior |

---

## Deferred Items (Roadmap)

- Smart Profiling — **PARKED**
- `show-queue-batch-allocation-performance` — **DEFERRED**
- Production Studio promote — not authorized this closeout

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Owner QA PASS for History and Pocket/Full Size corrective; final regression green; inventory confirms Studio-only surface.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` → IDLE / DONE yes
- [x] `ROADMAP.md` updated
- [ ] `references/project-chatgpt-handoff/` — **not present** in this checkout (N/A)

**Recommended next action for user:** Do not start another task until ready; production remains NOT AUTHORIZED.
