# Review: Studio history newest-first ordering

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-02-studio-history-newest-first-ordering-plan.md |
| Verdict | **approved** |

---

## Summary

Audit-backed plan correctly identifies Internal Gang Sheet History as unordered (inherits ascending/`id` list order) and Past Shows as already newest-first via `sortPastShowsForDisplay`. Minimal client-only fix using `printFinishedAt` DESC for History, with explicit **no change** to Upcoming Shows. Scope is bounded; no Functions/rules/indexes/migration.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | History sort only; Past NO-OP; Upcoming frozen |
| Architecture alignment | pass | Matches existing client sort pattern in `upcomingShowListSort.ts` |
| Security impact addressed | pass | Display order only |
| Data model impact addressed | pass | Uses existing `printFinishedAt`; no schema change |
| Backend impact addressed | pass | Functions/Rules/indexes/migration all NO |
| Test strategy adequate | pass | History + Past/Upcoming regression + empty/single/ties |
| Human checkpoints identified | pass | Owner QA after implement; production not authorized |
| Roadmap alignment | pass | Small Studio UX ordering fix |
| Documentation plan | pass | Workflow artifacts sufficient |
| No silent scope expansion | pass | Explicit Upcoming lock |

---

## Architecture Review

**Findings:**
- Correct layer: UI page wires a pure util; service full-collection read unchanged.
- Paths verified: `UpcomingShowsPage` / `useUpcomingShows` / `listUpcomingShows` / `upcomingShowListSort`.
- Authoritative completion field verified in `completeStaffGangSheetAndOpenNext` and client finish path: `printFinishedAt`.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No auth, rules, or exposure changes.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None for this DEV-scoped ordering change; production remains NOT AUTHORIZED for the phase.

---

## Data Model Review

**Findings:**
- `printFinishedAt` is the correct completion chronology; cycle number is complementary only for ties/missing finish.
- No migration for legacy rows without `printFinishedAt` (missing-finish last) is acceptable.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Functions: **NO**
- Firestore Rules: **NO**
- Indexes: **NO** (client sort)
- Migration: **NO**

**Required changes:**
- [x] None

---

## Upcoming Shows lock (explicit)

**Confirmed:** Upcoming Shows ordering, grouping, filtering, and UI must remain exactly as today (`sortUpcomingShowsForDisplay` / `scheduledStartAt` ASC). Implementation must not alter `showsByScheduleTab.upcoming` wiring or reverse that helper. Regression tests are mandatory.

---

## Past Shows audit (explicit)

**Confirmed:** Past already uses `sortPastShowsForDisplay` (`scheduledStartAt` DESC). **No source change** required; regression tests only.

---

## Testing Review

**Findings:**
- Plan covers required cases including Upcoming regression and Current unchanged.
- Prefer keeping all sort contracts in `upcomingShowListSort.test.ts` for focused runs.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Plan documents audit and field choice; no product-doc churn required for this UX ordering tweak.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Approved because: (1) audit paths are concrete and verified, (2) Past is already correct (NO-OP), (3) History fix is minimal and uses the real completion timestamp, (4) Upcoming is explicitly protected, (5) no backend/index/migration risk, (6) no owner decision needed.

---

## Next Step

Implement approved scope only — History client sort + tests. Do not deploy production. Await Owner QA after Test phase.
