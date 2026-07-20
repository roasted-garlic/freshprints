# Plan: Stash false attention, Cap A refresh, first-add lag

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-stash-attention-quota-first-add-review.md |

---

## Goal

Stop Your Stash from showing “needs attention” for ready-to-queue library items; refresh Cap A remaining immediately after cart mutations (not only on the 45s poll); reduce first-add lag with targeted round-trip cuts and responsive optimistic UI.

## Background

Owner screenshot: drawer shows `1 design · 1 print · 1 item needs attention` for a Library row with size + qty 1; first catalog add (create request + add + cart) feels laggy; banner/drawer stay at `50 of 50 prints left today` after add.

Prior related fix (2026-07-13): 1×1 seed pixels falsely flagged attention. Soft `dpi_warning` was left as expected chrome noise — that now conflicts with “must not show for valid ready-to-queue items.”

## Scope

### In Scope
1. **Attention predicate** — Stash/header attention counts only blocking reasons (`missing_or_invalid_size`, `dpi_below_minimum`, upload processing/failed). Soft `dpi_warning` (saveable 200–299 DPI) must not increment attention.
2. **Optimistic first-add size** — Seed `printWidthInches` / `printHeightInches` on optimistic catalog items (from design defaults / `resolveInitialPrintRequestItemSize`) so size is present before Firestore returns.
3. **Cap A refresh** — After successful add / qty change / remove / clear / first create+add, immediately refresh remaining (banner + drawer). Optimistic local decrement OK if followed by server refresh. Do not rely solely on 45s poll or length-only effects (race: refresh fires before charge settles).
4. **First-add lag** — Targeted: fetch created item by id instead of listing all items after callable; avoid redundant dual reload where safe; keep optimistic item + disable double-submit. No large refactor.
5. Soft-reload Portal. Deploy Functions only if server attention/charge bugs need it (expected: **no**).
6. Brief state + manual QA note.

### Out of Scope
- Production deploy
- Changing soft DPI warning UI on Review Request detail cards
- Cap B / Settings changes
- Broad cart architecture rewrite

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/utils/currentRequestAggregates.ts` (+ tests)
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts`
- `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` (quota refresh signal)
- `apps/portal/features/print-requests/components/PortalPrintRequestDailyQuotaBanner.tsx`
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- Workflow state + short manual QA note under `docs/workflow/reviews/`

### Architecture Impact
- [x] Details: Portal UI + shared attention pure util; optional thin `getPrintRequestItem` on existing service. No new modules.

### Security Impact
- [x] None (same callables / customer rules)

### Data Model Impact
- [x] None

### Backend Impact
- [x] None expected — no Functions deploy unless investigation finds server charge bug (unlikely; Cap A charge already in add callable)

### UI / UX Impact
- [x] Details: Stash/header attention badge quieter; Cap A copy updates after mutations; first-add feels snappier

### Migration Impact
- [x] None

---

## Approach

1. **Attention:** In `assessCurrentRequestItemAttention`, stop pushing `dpi_warning` into Stash attention reasons (keep type for optional future detail use, or stop emitting it from assess). Tests: saveable “good” DPI with valid size → no attention; below-min / missing size / upload states still flag.
2. **Optimistic size:** When building optimistic catalog item, set print inches via `resolveInitialPrintRequestItemSize` from catalog design pixels + optional design print defaults.
3. **Quota signal:** Add `capAQuotaEpoch` + `notifyCapAQuotaChanged()` on Portal print-request context. Banner + drawer refresh when epoch bumps (and keep focus/poll). Call `notifyCapAQuotaChanged` after successful flush paths (add/qty/remove), drawer remove, clear working request, and first-create path after charge callable returns. Optional optimistic: adjust displayed remaining by delta before server returns, then replace with server values.
4. **First-add:** `addOrIncrementCatalogDesign` — `getDoc` single item by `result.itemId` instead of `listPrintRequestItems`. After first create+add, prefer `reloadWorkingItems({ printRequestId })` + silent request list reload without blocking UI on duplicate item list. Ensure optimistic path already shows item before awaits complete.
5. Soft-reload Portal; document re-test steps.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Shared aggregates unit | `node --test packages/shared/src/utils/currentRequestAggregates.test.ts` (or package script) | yes |
| Typecheck portal if quick | existing portal typecheck script | preferred |

### Manual
1. Empty Stash → add first library design → item appears quickly; quota decreases without waiting 45s; no “needs attention” for healthy default size.
2. Increment qty / remove / clear → quota updates immediately.
3. Soft DPI (200–299) item still queueable; Stash chrome does **not** say needs attention.
4. Missing size or true below-min still shows attention.

### Human checkpoints
- Manual smoke after soft-reload (owner)

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Soft DPI issues become less visible in Stash | Detail/Review Request still shows quality; intentional |
| Optimistic remaining drifts | Always follow with server refresh |
| Single-item get races serverTimestamp | Existing mapPrintRequestItem fallback already handles |

Rollback: revert Portal + shared util commits; no Functions rollback needed.

---

## Open Questions
- None blocking — owner criteria clear: ready-to-queue library items must not flag attention.
