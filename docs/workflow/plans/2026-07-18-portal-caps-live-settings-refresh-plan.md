# Plan: Portal caps refresh when Studio Settings change

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | Cap A/B print-request limits; customer upload quotas |

---

## Goal

When the owner Saves new Cap A / upload daily limits in Studio Settings, Portal UI shows the new **limit** (and remaining) without a full redeploy—via live callables plus Portal refresh triggers.

## Background

Investigation findings:

- Portal Cap A and upload quotas load via callables (`getPrintRequestDailyDesignQuota`, `getCustomerUploadDailyQuota`), not client Firestore Settings reads.
- `settings/printRequestLimits` and `settings/customerUploadQuotas` are **owner-read only** in Firestore rules; customers cannot subscribe to Settings docs.
- Both callables already call `loadPrintRequestLimitSettings` / `loadCustomerUploadQuotaSettings` on **every** invocation (no process-level forever cache).
- Gap is Portal UI: Cap A banner refreshes mainly on auth / working-request item changes; upload panel on mount / after processing; drawer when opened. Studio Save alone does not trigger a refetch.

## Scope

### In Scope

- Keep admin-only Settings; continue using callables (no customer-readable Settings snapshot).
- Add Portal refresh: visibility/focus + short poll (~45s) while relevant UI is mounted; refresh when drawer/upload panel opens (already partly present).
- Soft-reload Portal after implement. No Functions deploy unless a caching bug is found (none found).
- Brief owner tip in workflow deliverable.

### Out of Scope

- Production deploy
- Exposing full Settings docs to customers
- Changing Cap A/B enforcement semantics
- Cap B queue UI rewrite (enforcement already reads live Settings on queue callables)
- Studio changes

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/shared/hooks/useLiveQuotaRefresh.ts` (new)
- `apps/portal/features/print-requests/components/PortalPrintRequestDailyQuotaBanner.tsx`
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- `apps/portal/features/customer-uploads/components/CustomerUploadPanel.tsx`
- Workflow plan/review/state docs

### Architecture Impact

- [x] Details: Thin Portal hook coordinating refetch of existing services; no new backend surface.

### Security Impact

- [x] Details: No new Settings client reads. Callables remain authz-gated (`requirePortalCustomer`). Only limit/remaining already returned by callables.

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: None expected (callables already live-read Settings). No Functions deploy.

### UI / UX Impact

- [x] Details: Banner/drawer/upload quota copy updates after focus, visibility, open, or within ~45s poll while Portal is open.

### Migration Impact

- [x] None

---

## Approach

1. Add `useLiveQuotaRefresh(refreshFn, { enabled, intervalMs })` that:
   - Runs refresh when `enabled` becomes true / deps change
   - Listens to `visibilitychange` (visible) and `window` `focus`
   - Polls every 45s while enabled
   - Soft-fails (caller already catches)
2. Wire Cap A banner + drawer + upload panel to the hook.
3. Soft-reload Portal; no Functions deploy.
4. Document owner tip: Save in Studio → click/focus Portal or wait ~45s.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | targeted / existing lint if practical | no (narrow UI) |
| Unit tests | none new (hook is thin browser glue) | no |
| Build | soft-reload Portal only | soft |
| Functions | none | no |

### Manual

- [ ] Owner: Save higher/lower Cap A in Studio → focus Portal or wait ≤45s → banner limit/remaining updates
- [ ] Owner: Same for upload quotas with upload panel open

---

## Human Checkpoints Anticipated

- [x] Soft manual verify after soft-reload (optional light check; Cap A QA checkpoint still separate)
- [ ] Production deploy — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Extra callable traffic from poll | Low | 45s interval; only while mounted/authenticated |
| Stale UI until focus/poll | Low | Document owner tip |

---

## Rollback Plan

Revert Portal hook wiring; soft-reload. No backend rollback.

---

## Documentation Updates Required

- [ ] Other: workflow plan/review only; no permanent doc change required for this UX refresh

---

## Open Questions

- [x] None — Settings stay owner-only; callables + Portal refresh is the chosen mechanism

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-18-portal-caps-live-settings-refresh-review.md
- Verdict: pending
