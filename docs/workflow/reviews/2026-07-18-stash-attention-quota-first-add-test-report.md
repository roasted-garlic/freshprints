# Test Report: Stash attention, Cap A refresh, first-add lag

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-stash-attention-quota-first-add-plan.md |
| Status | **passed_with_notes** (automated pass; owner manual smoke pending) |

---

## Commands Run

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Unit (aggregates + boundary) | `npx tsx --test packages/shared/src/utils/currentRequestAggregates.test.ts apps/portal/features/print-requests/context/PortalPrintRequestContext.boundary.test.ts` | 0 | 12 pass |
| Portal typecheck | `npm run typecheck` (apps/portal) | 0 | |
| Functions deploy | — | n/a | Not needed |
| Portal soft-reload | kill :3100 + `npm run dev:portal` | ready | http://localhost:3100 |

---

## Coverage Notes

- Soft `dpi_warning` no longer counted in Stash attention.
- Cap A refresh epoch wired after add/qty/remove/clear paths.
- First-add: single-item get after callable; list reload non-blocking after create+add.
- Manual UI smoke still required (see manual QA).
