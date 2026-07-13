# Plan: Print request Working triage, search, clear, and auto-archive

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-13-print-request-working-triage-search-review.md |

---

## Goal

Keep Studio Print Requests usable as ecommerce-style open carts proliferate: default Working to actionable carts, add clean rail search on every tab, let Portal customers clear their Current Request, soft-archive idle working requests, and exclude `archived` from operational lists.

## Background

ADR-FP-071 + persistent Current Request mean every shopper who adds art leaves a Working-tab row until they queue. Staff inbox already ignores Working. Studio has no search or Working sub-filters; `archived` exists but is unused; Portal customers cannot change `status` (rules lock it).

## Scope

### In Scope
- Shared Working triage: **Active** (default) / **Stale** / **Empty** / **All**
- Exclude `status === archived` from Studio tab grouping and Portal continuable sets
- Studio rail search (all tabs): request name, id, customer display name, username, snapshots
- Recent-first preserved (`updatedAt desc` load order)
- Portal **Clear request** confirm → Cloud Function soft-archives working request (clears items)
- Staff-callable (dry-run capable) **archive stale empty working** requests (auto-archive policy)
- Docs: DATA_MODEL, BACKEND, SECURITY (callable), DECISIONS ADR, helper copy

### Out of Scope
- Full-text Firestore indexes / Algolia
- Hard-delete of requests
- Auto-archive of carts that still have items (Stale stays filterable only)
- Production Scheduler wiring without human deploy approval (callable first; document schedule follow-up)
- Changing ADR-FP-071 one-working rule beyond treating archived as non-continuable

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/utils/printRequestWorkingTriage.ts` (+ test)
- `packages/shared/src/utils/printRequestListGrouping.ts` (archived → out of lists)
- `packages/shared/src/utils/portalOneWorkingPrintRequest.ts` (archived not continuable)
- `packages/shared/src/staffInbox/printRequestTabHelperCopy.ts`
- `apps/studio/.../utils/printRequestListSearch.ts` (+ test)
- `apps/studio/.../pages/PrintRequestsPage.tsx`
- `apps/studio/.../styles/components/print-requests.css`
- `functions/src/clearPortalWorkingPrintRequest.ts`
- `functions/src/archiveStaleWorkingPrintRequests.ts`
- `functions/src/index.ts`
- Portal: clear UI (sidebar +/or Current Request drawer), service wrapper, context refresh
- Docs as listed

### Architecture Impact
- [x] Details: Shared pure triage/search; Portal clear via callable (Admin SDK) because rules lock `status`

### Security Impact
- [x] Details: Clear callable — auth customer owns draft/editing request, no active allocations; archive-stale — owner/admin only

### Data Model Impact
- [x] Details: Document Working triage constants; `archived` used for clear + stale-empty auto-archive; items removed on customer clear

### Backend Impact
- [x] Details: Two new callables; no new collections

### UI / UX Impact
- [x] Details: Compact search + chip row in Print Requests rail; Portal clear with confirm modal; manual Studio/Portal check

### Migration Impact
- [x] Forward: Existing empty/stale remain until filtered or archive callable run
- [x] Rollback: Hide UI; archived requests remain archived (staff can un-archive later if needed — out of scope)

---

## Approach

1. **Constants:** `WORKING_STALE_AFTER_DAYS = 14`; empty = `itemCount === 0` (fallback to summary qty 0 if needed).
2. **Grouping:** If `status === 'archived'`, skip all tabs.
3. **Studio rail:** Search input under tabs; Working chips Active|Stale|Empty|All; filter pipeline: tab → triage (working only) → search.
4. **Portal clear:** Confirm → callable deletes items + sets `archived`, `itemCount: 0` → refresh → virtual empty Current Request.
5. **Auto-archive:** Owner/admin callable archives working candidates with `itemCount === 0`, `updatedAt` older than 14 days, no active allocations; `dryRun` supported.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit triage + search + grouping | `npx tsx --test` on new/updated tests | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |

### Manual
- Studio Working default hides empty/stale; chips + search work on Queued
- Portal clear empties basket and allows new cart
- Archive stale dryRun then real on dev

---

## Human Checkpoints Anticipated
- Manual UI PASS Studio rail + Portal clear
- Deploy Functions (+ optional Scheduler later) with human approval

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Clear with items surprises user | Confirm copy states designs are removed from Current Request |
| Stale carts with items never auto-clean | Intentional; Stale filter + future policy |
| Tab counts vs filtered list confusion | Tab counts = full tab (non-archived); chips show triage counts |

---

## Open Questions
- None blocking — auto-archive empty only (not stale-with-items) locked in this plan.

---

## FreshForge Impact Classification
N/A (Fresh Prints product app).
