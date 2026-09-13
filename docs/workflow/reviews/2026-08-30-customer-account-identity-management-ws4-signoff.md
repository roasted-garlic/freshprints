# Signoff: Customer Account Identity WS4 — Customer Activity + Deep Linking

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-29-customer-account-identity-management-ws4-customer-activity-and-deep-linking-plan.md` |
| Review | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws4-customer-activity-and-deep-linking-review.md` |
| Implementation review | `docs/workflow/reviews/2026-08-29-customer-account-identity-management-ws4-implementation-review.md` |
| Test report | `docs/workflow/reviews/2026-08-30-customer-account-identity-management-ws4-test-report.md` |
| Final status | **approved** |

---

## Summary

Closed **WS4** of the Customer Identity program on `fresh-prints-dev`. Studio **User Info** modal now centers **Print Request History** (compact cards + lazy details + deep links) and secondary **Account Activity** (collapsed identity timeline). Merged-customer history, CR→IR lineage, Transfer Username / Merge Accounts events, reconstructed older PR history, and Did Not Print → requeue show context are supported. Owner DEV QA **PASS**.

**Customer Identity program (WS1–WS4) is complete on DEV.**

**Production / Studio publish / Portal App Hosting remain NOT AUTHORIZED.**

---

## Changes Delivered

### Behavior

- Print Request History replaces flat Recent Activity as primary customer history surface
- Compact PR cards (initial page ≤ 15) with show name + scheduled time from `upcomingShows.scheduledStartAt`
- Lazy Print Request Details with bounded event list (cap 25)
- Account Activity section collapsed by default (username change, Transfer Username, Merge Accounts, disable/restore)
- `buildPrintRequestDeepLinkPath` for tab-correct Open Print Request navigation
- `resolveLogicalCustomerIds` for merged-source history queries
- Did Not Print requeue: one card per PR; destination show/date as active context; timeline in Details

### Files Created (representative)

- `apps/studio/.../users/services/customerPrintRequestHistoryService.ts`
- `apps/studio/.../users/services/customerAccountActivityService.ts`
- `apps/studio/.../users/components/CustomerPrintRequestHistorySection.tsx`
- `apps/studio/.../users/components/CustomerPrintRequestHistoryDetail.tsx`
- `apps/studio/.../users/components/CustomerAccountActivitySection.tsx`
- `apps/studio/.../users/hooks/useCustomerUserInfo.ts`
- Unit tests: `buildPrintRequestHistoryCard.test.ts`, `resolveLogicalCustomerIds.test.ts`

### Files Modified

- `UserAuditTrailModal.tsx`, `UserAuditTrailProfileCard.tsx`
- `apps/studio/src/renderer/src/styles/layout.css`

### Documentation Updated

- Handoff package refresh (2026-08-30)
- `docs/project/ROADMAP.md` banner

---

## Tests

### Automated

- 16/16 WS4 unit tests **PASS** (see test report)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner WS4 DEV QA checklist | **PASS** | Owner 2026-08-30 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | **not required / not authorized** | — | DEV only |
| Owner DEV QA | **obtained** | 2026-08-30 | PASS |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Customers with >100 identity events | Low | Monitor modal performance; optional cache polish deferred |
| Full Studio typecheck debt | Low | Pre-existing; unrelated modules |
| Open in Show Queue | Low | Deferred per owner decision |

---

## Deferred Items (Roadmap)

- Coordinated production promotion of Customer Identity WS1–WS4 (not authorized)
- Open in Show Queue from PR history card (deferred)

---

## Customer Identity Program Status (DEV)

| Workstream | Status |
|------------|--------|
| WS1 Identity foundations | **DONE** |
| WS2 Transfer Username | **DONE** |
| WS3 Full Account Merge | **DONE** |
| WS4 Customer Activity + Deep Linking | **DONE** |

---

## Verdict

**approved** — Owner DEV QA PASS; scoped tests pass; no production promotion.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated
- [x] `docs/project/ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] Handoff package refreshed per MANIFEST

**Recommended next action:** Formal Plan + Review for `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` (owner-authorized sequencing before Smart Profiling).
