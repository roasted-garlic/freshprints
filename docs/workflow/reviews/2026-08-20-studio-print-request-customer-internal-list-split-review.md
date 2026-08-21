# Review: Separate Studio Customer and Internal Print Request Lists

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-20-studio-print-request-customer-internal-list-split-plan.md |
| Verdict | **approved** |

---

## Summary

The plan correctly identifies `printRequests.isInternal` as the HEAD discriminator, keeps Customer Requests as both Studio and Portal customer origins (`isInternal == false`), and refuses name-based or `requestOrigin`-only splits. The only safe way to keep Wave C bounded `queueTab` pagination and exact `getCountFromServer` counts is a **new composite index** plus a planner exception for that pair. Scope stays Studio list organization. Implement is blocked until the owner approves this review **and** the index.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Studio `/print-requests` only. Binding behavior (lifecycle, sizing, Portal, Show Queue rules) excluded. New goal, not attached to closed sizing/queue-integrity. |
| Architecture alignment | pass | Page → hook → service → planner → SDK. No Firestore in the page. Client-hide and `isInternal`-only query paths correctly rejected. |
| Security impact addressed | pass | Same permissions. No Rules/secrets/new endpoints. |
| Data model impact addressed | pass | No schema/migration/repair. Missing-field equality caveat documented. Index is query infrastructure, not a new field. |
| Backend impact addressed | pass | Functions/Rules unchanged. Index requirement is explicit and gated — not silent. |
| Test strategy adequate | pass | Planner pair, kind filter, switch, search, routes, merge, loading, create classification; sizing + Add Designs regressions; owner Studio QA. |
| Human checkpoints identified | pass | Implement approval; index file + DEV deploy; later manual QA. No production. |
| Roadmap alignment | pass | Phase 6 Customers and Print Requests. Phase 9 parked. Tag-alias queued only. |
| Documentation plan | pass | WORKFLOWS, DATA_MODEL indexes, ROADMAP, optional ADR. |
| No silent scope expansion | pass | No Portal, no Staff Gang Sheet origin rewrite, no Completed tab, no localStorage preference, no data repair. |

---

## Architecture Review

**Findings:**

- Current list is `queueTab` + `updatedAt`/`__name__` pagination. Planner forbids combining `isInternal` with `queueTab`. That restriction is load-bearing until the composite exists.
- Optional `isInternal` filter already in `PrintRequestListQueryOptions` is **not** sufficient alone: using it without `queueTab` would regress tab counts and paging.
- Loading both kinds and hiding one would break page size, `hasMore`, and mixed counts. Plan correctly forbids it.
- Kind must participate in the same stale-list loading guard as `activeTab` (`derivePrintRequestsListLoading` / `loadedTabRef`).
- Deep-link: `resolveCanonicalPrintRequestsRoute` today can replace a `requestId` that is not in the loaded list. Binding change: wait for by-id fetch and reconcile `kind` before that fallback. Review treats this as required, not optional.
- Show Queue / inbox / Design Library links may omit `kind`. Page-level reconciliation is the correctness path; passing `kind` when known is UX only.

**Required changes:**

- [ ] None beyond the plan’s binding deep-link wait-before-fallback (already in the plan).

---

## Security Review

**Findings:**

- Read path unchanged: `permissionService.canViewPrintRequests`. Writes unchanged.
- Cache keys already uid-scoped; adding `kind` does not leak across users.
- No new client authorization boundary.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [ ] Index deploy to any Firebase project (DEV before Studio can use the query; production index deploy is a later, separate checkpoint if/when Studio is released)
- [ ] Production Studio/Portal/Functions deploys — **not** this phase

---

## Data Model Review

**Findings:**

- Discriminator is existing required boolean `isInternal`. Customer list = `false` (Studio + Portal customers). Internal list = `true`.
- `requestOrigin` stays provenance/badges/Staff Gang Sheet eligibility. Do not reuse it as the list split.
- Firestore `where isInternal == false` omits missing fields. Rules currently require the bool on writes. No backfill in this phase is acceptable if the owner accepts that residual risk.
- `queueTab` remains the lifecycle mirror; not replaced.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- **Index required.** Existing `isInternal + updatedAt` and `queueTab + updatedAt + __name__` do not serve the combined query.
- Required composite: `isInternal ASC, queueTab ASC, updatedAt DESC, __name__ DESC`.
- Do not add this to `firestore.indexes.json` or run `firebase deploy --only indexes` until the owner approves.
- If count-without-orderBy cannot use that composite in DEV, **stop and report**; do not add a second index silently.
- No Functions, Rules, callables, or schema.

**Required changes:**

- [ ] None in code until index checkpoint clears.

---

## Testing Review

**Findings:**

- Planner tests must prove the new pair is the **only** new combination allowed.
- Kind filter + merge + loading tests cover mixed-list leaks and stale paint.
- Search tests must use a pre-scoped list (search helper does not itself filter `isInternal`).
- Re-running `printRequestItemSizing.test.ts` and `planPrintRequestDesignSelectionWrites.test.ts` is the right non-regression pair for the just-closed sizing/Add Designs work.
- Manual QA is required; automated tests cannot cover Electron rail layout.

**Required changes:**

- [ ] None

---

## Documentation Review

**Findings:**

- WORKFLOWS still describes Working/Queued/Printed grouping without a customer/internal split — must update in Implement.
- DATA_MODEL index list is already incomplete vs `firestore.indexes.json` (`queueTab` composite exists but is not listed in the snippet). Implement should add the **new** composite when the owner approves it, and may note the existing `queueTab` index in the same pass without expanding into a full index audit.
- Short ADR is appropriate: list split is `isInternal`, customer includes Portal, index is required.

---

## Required Changes (if approved_with_changes)

None. Verdict is **approved**. Binding checkpoints are owner actions, not plan defects.

---

## Blockers (if blocked)

None for the plan. Implement is **not** authorized yet.

---

## Verdict Rationale

The plan matches the owner brief, current HEAD, and Wave C query architecture. The index finding is the important stop condition, and the plan reports it instead of hiding mixed rows or silently editing `firestore.indexes.json`. Review is **approved** so Implement can start **only after** the owner checkpoint below.

---

## Next Step

**STOP. Do not Implement.**

Owner must reply before any application code or index file change:

1. Approve Implement of this plan (`approved`).
2. Approve adding and deploying the composite index `printRequests.isInternal + queueTab + updatedAt DESC + __name__ DESC` to the Firebase project used by local Studio.
3. Optionally confirm no known `printRequests` documents lack `isInternal`.

Until then: wait. No Studio query change, no index deploy, no production action.
