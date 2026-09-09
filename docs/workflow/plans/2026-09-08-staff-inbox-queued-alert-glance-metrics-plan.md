# Plan: Staff Inbox queued alert glance metrics

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-08-staff-inbox-queued-alert-glance-metrics-review.md |

---

## Goal

Show **design qty**, **print qty**, and **total price** at a glance on Studio Staff Inbox `portal_queued` alert cards (Inbox page and compact bell list), so staff can size a newly queued portal request without opening Print Requests.

## Background

Owner follow-up after closed print-request export/gang-sheet work. Open Inbox cards currently show request name, QUEUED badge, show subtitle, and created timestamp only. Print Request list already surfaces design/qty labels; request detail already prices via global Gang Sheet Settings. Inbox already subscribes to portal `showAllocations` but snapshots omit quantity/dimensions needed for these metrics.

## Scope

### In Scope
- Expand `StaffInboxPortalAllocationSnapshot` with quantity, identity, and print size fields already present on `showAllocations`.
- Derive glance metrics for `portal_queued` items from **active allocations for that request+show** (queued alert context).
- Attach optional glance payload on `StaffInboxItem`.
- Render glance metrics on `StaffInboxItemRow` (full + compact) for `portal_queued` only.
- Price using current global Gang Sheet section pricing (`useGangSheetSettings` / shared `calculateGangSheetCustomerSectionSummary`).
- Focused shared/unit tests for metric derivation; light contract/UI wiring coverage as needed.
- Update workflow state.

### Out of Scope
- `show_queue_full` and `design_issue_report` glance metrics.
- Persisting metrics on `staffInboxAcks` / Firestore Rules changes / migrations.
- New Firestore listeners or printRequestItems hydration for full-request (non-allocated) totals.
- Toast copy changes, sound settings, badge counts.
- Commit, push, Studio publish, DEV/prod deploy.

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/staffInbox/staffInbox.types.ts`
- `packages/shared/src/staffInbox/deriveStaffInboxItems.ts` (+ test)
- New shared helper e.g. `packages/shared/src/staffInbox/staffInboxQueuedGlanceMetrics.ts` (+ test)
- `apps/studio/.../staff-inbox/services/staffInboxSubscriptionService.ts`
- `apps/studio/.../staff-inbox/components/StaffInboxItemRow.tsx`
- `apps/studio/.../styles/components/staff-inbox.css`
- Optional: enrich Done-tab `portal_queued` rows from live allocations when still present (no ack schema change)

### Architecture Impact
- [x] Details: Keep derivation in shared staff-inbox helpers; Studio maps richer allocation snapshots and renders metrics. No new feature module. Pricing read via existing settings service/hook.

### Security Impact
- [x] None — read existing staff-visible allocation fields; no Rules/auth changes.

### Data Model Impact
- [x] None persisted — display enrichment only from live allocations.

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Inbox / bell `portal_queued` cards gain glance pills/labels for designs, print qty, and total price. Manual visual check recommended.

### Migration Impact
- [x] None

---

## Approach

1. Extend allocation snapshot mapping with `allocatedQuantity`, `printRequestItemId`, optional `designId` / `customerUploadId`, optional `printWidthInches` / `printHeightInches`.
2. Add shared `buildStaffInboxQueuedGlanceMetrics(allocationsForGroup)` → `{ designCount, printQuantity, pricingUnits }` using the same unique-key rules as `buildPrintRequestItemSummaries`.
3. When deriving each `portal_queued` item, attach glance metrics from that request+show’s active allocations.
4. In `StaffInboxItemRow`, for `portal_queued` with metrics, show:
   - design count (e.g. `N design(s)`)
   - print qty (e.g. `N print qty`)
   - total price from `calculateGangSheetCustomerSectionSummary` + `useGangSheetSettings().settings.sectionPricing`, or omit/hide price when widths are missing/invalid.
5. Place metrics in unused header/timestamp row space; keep compact bell readable (wrap/pill row).
6. Optionally enrich completed `portal_queued` items from live subscription allocations by the same helper (Done tab), without writing ack fields.

**Metric scope decision:** Allocation-scoped (this request on this show), matching the QUEUED alert meaning—not full multi-show request inventory.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Shared unit | `node --test` (or package script) for glance helper + derive tests | yes |
| Studio typecheck / full build | Document baseline if unrelated failures | no (note only) |
| Lint | Targeted files if practical | yes if cheap |

### Manual
- Open Inbox with queued portal alerts → each QUEUED card shows designs, print qty, price consistent with Show Queue / request pricing for that allocation set.
- Compact bell list shows the same metrics without breaking layout.
- Full / design-report cards unchanged.
- Missing dimensions → designs/qty still show; price hidden or em dash—no crash.

---

## Human Checkpoints Anticipated
- Manual UI glance on DEV Studio after local implement (owner QA).
- Commit/push/publish remain separately gated.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Allocation snapshot limit omits some rows | Existing 400-limit risk; metrics may undercount—document; no new listener in this goal |
| Price mismatch vs full request when partially allocated | Intentional: alert is show-scoped |
| Settings still loading | Use hook defaults / hide price until valid summary |

**Rollback:** Revert the shared + Studio inbox UI/mapping commits; no data migration.

---

## Open Questions
- None blocking. If owner later wants full-request (all items) metrics, that becomes a follow-up with item hydration.

---

## FreshForge Impact Classification
- Starter Surface: no
- Development Tooling: no
- Distribution/Installer: no
- Documentation: workflow plan/review only
- Development History: n/a
