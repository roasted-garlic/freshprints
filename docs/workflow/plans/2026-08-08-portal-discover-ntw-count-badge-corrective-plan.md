# Plan: Correct New This Week “Counting designs…” stuck badge (TD-031 follow-up)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Planning Agent |
| Status | approved_with_changes (Formal Review 2026-08-08) |
| Workflow | managed-phase (corrective) |
| Managed goal | `portal-discover-view-all-complete-pagination` (corrective after QA FAIL) |
| Parent | TD-031 pagination/count implementation live on `build-2026-08-08-003` |
| Related | Owner QA: `DISCOVER VIEW ALL PAGINATION QA: FAIL` |

---

## Goal

Restore an honest, finite New This Week (and any `readyAfterMs`) result-count badge on Portal `/catalog` View All: show the true aggregate membership when available, and **never** leave the UI permanently on “Counting designs…” when the aggregate has failed or is not pending.

Preserve bounded Load more / page size 40. Do not Signoff TD-031 until this corrective is live and owner QA passes.

---

## Background — production QA FAIL

Live: `build-2026-08-08-003` @ `9f3a01a`.

| Observation | |
|-------------|--|
| New This Week designs load | Yes |
| Other ordinary View All / filters | Correct totals |
| New This Week badge | Stuck on **“Counting designs…”** after refresh |

Owner QA: `DISCOVER VIEW ALL PAGINATION QA: FAIL` — **do not Signoff**.

---

## Root-cause investigation

### A. UI mapping (PROVEN in source)

`shouldShowOrdinaryCountPending` returns **true** for both:

- `countAuthority.status === 'pending'`
- `countAuthority.status === 'failed' && !isFullyHydrated`

`CatalogPageContent` maps `matchingCount === null && isHydrating` → **“Counting designs…”**.

Therefore a **failed** New This Week aggregate while page 1 of many remains incomplete renders **identically** to an in-flight count — forever, until the user loads every page (`isFullyHydrated`).

This matches production: designs visible, badge stuck on Counting.

### B. Why NTW aggregate fails while other modes succeed (HIGH confidence)

`countReadyDesigns` builds **only** `buildDesignFilterConstraints` — for NTW:

- `where('status', '==', 'ready')`
- `where('readyAt', '>=', Timestamp…)`
- **no** `orderBy`

Firestore inequality filters imply an order on the inequality field. Default direction is typically **ASC**. Production indexes for `status + readyAt` are **DESC only** (plus `__name__` DESC) — see `firestore.indexes.json`. There is **no** `status ASC + readyAt ASC` composite.

By contrast, the **list** path uses `orderBy('readyAt', 'desc')` + `orderBy('__name__', 'desc')` and hits the existing DESC composite — so cards load.

Other ordinary counts (plain `/catalog`, category, tag without `readyAfterMs`) use equality-only (or non-readyAt) filters and succeed — matching owner report.

**Conclusion:** NTW `getCountFromServer` likely fails with a missing-index / failed-precondition (swallowed by `fetchReadyDesignCountWithRetry` → `{ ok: false }`) → UI defect A.

### C. Secondary risks (document; address if cheap)

| Risk | Notes |
|------|--------|
| `readyAfterMs = Date.now() - 7d` inside memoized query | If `serverListQuery` identity churns, serialized key changes every ms and can cancel in-flight count (stuck `pending`). Stabilize window (e.g. day bucket) in corrective if touch query builder. |
| Silent swallow of count errors | Retry then fail with no user-visible distinction — worsens A. |

---

## Scope

### In Scope

- Fix NTW / `readyAfterMs` aggregate count to use an index-aligned query (prefer **no new index**)
- Stop mapping aggregate **failure** to “Counting designs…”
- Discriminating tests (pending vs failed; NTW count constraints / orderBy)
- Re-QA plan for production after corrective deploy
- Docs / workflow state updates

### Out of Scope

- Raising `DEFAULT_CATALOG_PAGE_SIZE`
- Unbounded load-all
- Algolia enablement
- Home rails
- readyAt backfill / semantics
- Functions / Rules / Storage
- Expanding `CLIENT_SORT_MEMBERSHIP_CAP`
- Blind production index deploy unless Formal Review requires it after proving code-path insufficient

---

## Affected Areas

### Files (expected)

| File | Change |
|------|--------|
| `apps/portal/features/catalog/services/catalogService.ts` | Align `countReadyDesigns` with list indexes when inequality/`readyAfterMs` (or sortField) requires orderBy) |
| `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` | Separate pending vs failed for `isHydrating` / badge; optional readyAfterMs stabilization |
| `apps/portal/features/catalog/pages/CatalogPageContent.tsx` | Minimal copy if needed for failed count (only if hook cannot reuse existing strings honestly) |
| Tests under hook / catalogService | pending≠failed; NTW count orderBy containment |

### Architecture / Security / Data / Backend

- Architecture: hook → service only; no UI→Firestore
- Security: none
- Data model: none
- Backend: client Firestore only; **prefer avoiding new indexes**
- UI: badge honesty for failed vs pending
- Migration: none (unless index path chosen)

---

## Approach

### Preferred (A) — index-align count query (no index deploy)

In `countReadyDesigns`, when filters include `readyAfterMs` (or any readyAt inequality), apply the **same** `orderBy('readyAt', 'desc')` + `orderBy('__name__', 'desc')` used by the list path so `getCountFromServer` uses the existing DESC composite.

Firestore aggregation docs: orderBy on aggregation limits to docs where the sort field exists — acceptable for NTW (membership already requires `readyAt >= cutoff`).

Verify category/tag + readyAt variants if any count uses those filters without list orderBy — apply consistent alignment.

### Required (B) — UI contract for failure

- `pending` → “Counting designs…”
- `failed` + incomplete → **not** “Counting designs…” (e.g. omit numeric claim, short “Count unavailable”, or show loaded + “+” only if product-approved — Formal Review binds copy)
- `failed` + fully hydrated → loaded membership count (already)
- Load more must remain usable on failure

### Optional (C) — stabilize `readyAfterMs` in query identity

Bucket or freeze the NTW window for the session/query key so remounts do not cancel counts.

### Rejected unless proven necessary

- New ASC readyAt composite index as first resort (production index gate)
- Reverting to page-length badge as authority
- One-shot load-all for count

---

## Answers (corrective)

1. **Why stuck on Counting?** Failed (or cancelled) aggregate + UI treats failed-incomplete as pending.
2. **Why NTW only?** Count uses readyAt inequality without DESC orderBy; list has DESC orderBy; only DESC indexes exist.
3. **Fix?** Align count orderBy with list index + separate failed UI.
4. **Indexes?** Prefer none; only add ASC if A fails in test/emulator/prod evidence.

---

## Test Strategy

| Check | Required |
|-------|----------|
| Unit: `shouldShowOrdinaryCountPending` failed ≠ counting | yes |
| Unit/containment: NTW count path includes readyAt desc orderBy (or proven index) | yes |
| Existing TD-031 paging/count tests still pass | yes |
| Portal typecheck / lint / build | yes |
| Manual prod QA after corrective App Hosting | yes (owner) |

---

## Human Checkpoints

- [x] Manual UI QA after corrective rollout (reuse Owner QA checklist + NTW Counting regression)
- [ ] Production App Hosting for corrective (separate phrase after implement)
- [ ] Index deploy — only if Formal Review selects index path

---

## Risks

| Risk | Mitigation |
|------|------------|
| orderBy on count changes billed index scans | Same index as list; small NTW membership |
| Failed UI copy unclear | Bind in Formal Review |
| Scope creep to Algolia/Home | Hard out |

---

## Rollback

Revert corrective Portal commit; prior build `build-2026-08-08-003` still has Load more but NTW Counting stuck — acceptable only as temporary.

---

## Acceptance (corrective)

- [ ] NTW badge shows true total (≈45), not permanent “Counting designs…”
- [ ] Refresh reproducible PASS
- [ ] Other View All totals unchanged
- [ ] Load more still works
- [ ] Failed aggregate does not look like infinite counting
- [ ] No unbounded fetch; page size 40; Algolia OFF
- [ ] Owner QA PASS before Signoff

---

## Next owner phrase (after Formal Review approval)

`IMPLEMENT PORTAL DISCOVER NTW COUNT BADGE CORRECTIVE`
