# Plan: Customer Account Identity WS4 — Customer Activity + Deep Linking

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Author | Planning Agent |
| Status | **approved — owner decisions recorded 2026-08-29** |
| Workflow | managed-phase |
| Goal | `customer-account-identity-management-ws4-customer-activity-and-deep-linking` |
| Related | WS1–WS3 signoffs; ADR-FP-150–154; master plan `2026-08-28-customer-account-identity-management-and-audit-plan.md` |
| Production | **NOT AUTHORIZED** |

---

## Goal

Redesign the Studio **User Info** modal so customer history is **compact, grouped by Print Request**, merge-aware, and **deep-linkable** to Print Requests (and conversion pairs) without an unbounded flat “Recent activity” feed.

---

## Background

WS1–WS3 closed on DEV with append-only `customerActivityEvents`, Transfer Username, and full account merge (`mergedSourceCustomerIds[]`). The current modal (`UserAuditTrailModal`) still renders a flat chronological list built from print-request create/update rows, show-allocation rows, and identity events — capped at 40 entries with no grouping or navigation.

Owner requirement: staff must see **what this logical customer did**, including pre-merge source history, show/date context for queued work, and Customer Request → Internal Request lineage.

---

## Current repo paths (verified)

| Area | Path |
|------|------|
| Modal shell | `apps/studio/src/renderer/src/features/users/components/UserAuditTrailModal.tsx` |
| Profile / summary stats | `apps/studio/src/renderer/src/features/users/components/UserAuditTrailProfileCard.tsx` |
| Hook | `apps/studio/src/renderer/src/features/users/hooks/useUserAuditTrail.ts` |
| Orchestrator | `apps/studio/src/renderer/src/features/users/services/userAuditTrailService.ts` |
| Activity builder (today) | `apps/studio/src/renderer/src/features/users/services/userAuditTrailActivityService.ts` |
| Identity event mapper | `apps/studio/src/renderer/src/features/users/utils/customerIdentityActivityAudit.ts` |
| Profile stats | `apps/studio/src/renderer/src/features/users/utils/buildAuditTrailProfile.ts` |
| Types | `apps/studio/src/renderer/src/features/users/types/auditTrail.types.ts` |
| Entry from Users page | `apps/studio/src/renderer/src/features/users/pages/UserManagementPage.tsx` |
| Styles | `apps/studio/src/renderer/src/styles/layout.css` (`.user-audit-trail-*`) |
| Print requests by customer | `apps/studio/.../print-requests/services/printRequestService.ts` → `listPrintRequestsByCustomer` |
| Deep link helpers | `apps/studio/.../print-requests/constants/printRequestRoutes.ts` → `getPrintRequestsPath`, `buildPrintRequestDeepLinkPath`, `resolveCanonicalPrintRequestsRoute` |
| Tab derivation | `packages/shared/src/utils/printRequestListGrouping.ts` → `derivePrintRequestListTab` |
| CR→IR types | `packages/shared/src/types/printRequest/printRequest.types.ts` (`closureKind`, `convertedToInternalRequestId`, `convertedFromCustomerRequestId`, …) |
| CR→IR callable | `functions/src/convertCustomerPrintRequestToInternal.ts` |
| Show allocations | `packages/shared/src/types/showAllocation/*`; queried in audit service |
| Show schedule | `packages/shared/src/types/upcomingShow/upcomingShow.types.ts` → `scheduledStartAt` |
| Show display | `apps/studio/.../upcoming-shows/utils/upcomingShowDisplay.ts` |
| Merge survivor alias | `packages/shared/src/types/customer/customer.types.ts` → `mergedSourceCustomerIds[]` |
| Activity events (backend) | `functions/src/lib/customerActivityEvents.ts`; types `packages/shared/src/types/customer/customerActivityEvent.types.ts` |
| Firestore collection | `customerActivityEvents` via `firestoreCollectionService.getCustomerActivityEventsCollection()` |

**Note:** `resolvePrintRequestRouteFromRequest` appears only in planning docs — **not implemented**. WS4 must use `buildPrintRequestDeepLinkPath` + persisted `queueTab` / `derivePrintRequestListTab`.

---

## Scope

### In scope (MVP)

1. Replace flat **Recent activity** as primary surface with:
   - **Customer summary** (retain/refine header + stats)
   - **Print Request history** — one compact card per request
   - **Account activity** — compact identity/audit timeline (separate section)
2. **Print Request detail** — expand inline or secondary panel/modal; lazy load per request
3. **Deep links** — `Open Print Request` via `buildPrintRequestDeepLinkPath` (no hardcoded `/print-requests?…` strings)
4. **Show context** — show title + **scheduled start date/time** from `upcomingShows.scheduledStartAt` (via allocation → show), labeled explicitly
5. **CR→IR lineage** — surface conversion fields on customer request cards; link to both sides when IDs exist
6. **Merge-aware queries** — survivor modal unions `customer.id` + `mergedSourceCustomerIds[]` for operational queries
7. **Merged-source attribution** — subtle “Originally under @username” when snapshot/username-at-creation differs from current survivor identity
8. **Bounded queries** — paginated PR list; per-PR detail loaded on demand; account activity paginated
9. **Permissions** — follow existing `canViewPrintRequests`, `canViewUpcomingShows`; staff read on activity events
10. **Tests** — unit tests for query identity expansion, card model, route building, conversion/merge presentation

### Out of scope

- WS3 merge semantic changes
- Production deploy
- Portal redesign
- Full historical backfill of `customerActivityEvents`
- Arbitrary audit export
- Dashboard for every customer-owned collection (uploads/favorites as optional follow-up)
- New Cloud Functions unless Formal Review proves client-only approach infeasible
- `resolvePrintRequestRouteFromRequest` name — use existing helpers; optional thin wrapper alias in Studio only if it reduces duplication

### Optional (post-MVP / separate section in UI)

- **Open in Show Queue** — only if stable route exists `[NEEDS REPO CHECK]` during implement
- Status/show/type filters in modal
- Favorites / uploads summary cards

---

## Proposed information architecture

```
User Info modal
├── Customer summary (identity header — existing profile card, refined stats)
├── Print Requests (primary)
│   ├── Paginated compact cards (default page size: 15 — [NEEDS OWNER DECISION])
│   └── Per-card actions: [Details] [Open Print Request] (+ conversion/show actions)
├── Account Activity (secondary, collapsed by default — [NEEDS OWNER DECISION])
│   └── Paginated identity events from customerActivityEvents (+ alias IDs)
└── (Optional future) Other workflows
```

Flat `Recent activity` list **removed as primary**; may remain temporarily behind feature flag during implement only if needed for rollback — default off at signoff.

---

## Data sources and authority

| UI fact | Authoritative source | Notes |
|---------|---------------------|-------|
| PR name, status, itemCount, origin, dates | `printRequests` document | Canonical |
| List tab / deep link tab | `printRequest.queueTab` mirror OR `derivePrintRequestListTab` over live items+allocations | Prefer persisted `queueTab` when present; derive as fallback |
| Show name + scheduled time | `showAllocations` → `upcomingShows.scheduledStartAt` | Use allocation `createdAt` only as “queued at”, not show time |
| CR→IR linkage | `closureKind`, `convertedToInternalRequestId`, `convertedFromCustomerRequestId` | Do not infer from name alone |
| Merge alias set | `customer.mergedSourceCustomerIds` | Survivor only |
| Identity operations | `customerActivityEvents` | Audit evidence; query by logical customer IDs |
| Per-PR event chronology (older history) | **Reconstructed** from PR + allocations + optional future PR-scoped events | Mark derivation internally; no fabricated timestamps |

**Do not** rewrite historical `customerActivityEvents.customerId`. Survivor view queries multiple IDs.

---

## Print Request card model (MVP)

Each card (compact row):

| Field | Source |
|-------|--------|
| Title line | `printRequest.name` (immutable) |
| Origin badge | `getPrintRequestOriginBadgeLabel` (existing) |
| Lifecycle | `status` + `queueTab` badge if helpful |
| Created | `createdAt` — label **Created** |
| Item count | `itemCount` |
| Last activity | `updatedAt` — label **Last updated** |
| Show (if allocated) | `formatUpcomingShowTitle(show)` + `formatUpcomingShowTimestampLabel(scheduledStartAt)` — label **Show** / **Scheduled** |
| Queued to show (optional) | earliest allocation `createdAt` — label **Queued to show** (distinct from show schedule) |
| Conversion | If `closureKind === "converted_to_internal"`: **Converted to Internal** + target name/id |
| Merge attribution | If `customerUsernameAtCreationSnapshot` or pre-merge customerId ∉ current survivor-only set: **Originally under @…** (details only if cluttered on card — [NEEDS OWNER DECISION]) |

Actions:

- **Open Print Request** → `buildPrintRequestDeepLinkPath({ id, isInternal, queueTab, itemCount, updatedAtMillis })`
- **Details** → expands chronology panel
- **Open Internal Request** / **Open Customer Request** when conversion IDs present (two links, truthful lineage)

---

## Print Request detail model (lazy)

On expand/open:

- Chronological bounded events for **that** `printRequestId` only:
  - Created / updated (from PR timestamps)
  - Allocation queued events (from matching allocations)
  - Conversion event (from PR closure fields)
  - Optional: matching `customerActivityEvents` if WS4 adds `printRequestId` to future writers — **not required for MVP** if reconstruction from domain docs suffices
- Cap e.g. 25 events per expansion; no eager load for all PRs

---

## Merged-account query strategy

```typescript
function resolveLogicalCustomerIds(customer: Customer): string[] {
  return [customer.id, ...(customer.mergedSourceCustomerIds ?? [])];
}
```

| Query | Strategy |
|-------|------------|
| Print requests | `where("customerId", "in", ids.slice(0, 10))` batched if >10 merge sources (unlikely MVP); sort client-side by `updatedAt` desc; paginate |
| Show allocations | Same `customerId in` pattern |
| Account activity events | Query per id OR batched `in` (max 10 per Firestore `in` query); merge + dedupe + sort |

**Post-WS3 operational PRs** on survivor already have `customerId === survivor.id`. Pre-merge PRs on source retain original `customerId` — survivor must include source id via alias array.

Immutable audit events on source id remain under source `customerId` — included via alias queries, not rewritten.

---

## Account Activity model

Separate section fed by `customerActivityEvents` for logical customer IDs:

- Map via existing `buildCustomerIdentityActivityAuditEntry`
- Include WS2 `account.username_transferred`, WS3 merge events, disable/restore, etc.
- Paginate (e.g. 10 per page)
- Default **collapsed** [NEEDS OWNER DECISION]

Do **not** duplicate each identity event as a giant PR card.

---

## Historical reconstruction strategy

Pre-WS1/WS2/WS3 requests may have **no** forward audit events. MVP still shows them via:

1. `listPrintRequestsByCustomer` across logical IDs
2. Allocation + show join for queue context
3. PR timestamps for created/updated lines in detail view

Internal `derivation: "reconstructed"` need not surface in UI unless debugging; do not invent sub-minute event precision.

---

## Deep-link behavior

Use `buildPrintRequestDeepLinkPath`:

- Customer vs internal from `printRequest.isInternal`
- Tab from `printRequest.queueTab` when set; else derive via `derivePrintRequestListTab` if implement loads items+allocation counts (bounded — only at link-build time for opened card, not list page)

Conversion pairs:

- Customer request card links to customer kind + customer tab
- Internal request links to internal kind + appropriate tab
- Both IDs from conversion fields — never guess from name suffix alone

**Open in Show Queue:** evaluate `UpcomingShowsPage` / show queue routes during implement; mark optional `[NEEDS REPO CHECK]`.

---

## Permissions

| Surface | Gate |
|---------|------|
| Modal open | `canViewUsers` (existing `/users`) |
| Print Request section | `canViewPrintRequests` — hide section or show permission message |
| Show fields | `canViewUpcomingShows` |
| Account activity | Staff Firestore rules on `customerActivityEvents`; no extra owner-only gate |
| Deep link navigation | Same as target page permissions |

Sensitive merge metadata (preview checksums) stays in expandable detail only.

---

## UI / modal behavior

- Retain modal shell; **internal body scroll** (`max-height` + overflow-y) — pattern from merge wizard
- PR list virtualized or paginated (simple “Load more” for MVP)
- Responsive: single column cards; detail expands below card
- Reevaluate summary stat tiles:
  - **Keep:** Print requests count (logical), Queued to show count
  - **Change:** “Recent events” → **Account events** count or remove if redundant

---

## Files expected to change (implement phase)

| File | Change |
|------|--------|
| `UserAuditTrailModal.tsx` | New sections; remove flat list primary |
| `UserAuditTrailProfileCard.tsx` | Stat labels/metrics |
| `useUserAuditTrail.ts` | Load PR summaries + paginated account activity |
| `userAuditTrailActivityService.ts` | Refactor / split services |
| **New** `customerPrintRequestHistoryService.ts` | Logical-id queries, show join, card DTOs |
| **New** `customerPrintRequestHistoryCard.types.ts` | Shared card/detail types |
| **New** `CustomerPrintRequestHistorySection.tsx` | PR list UI |
| **New** `CustomerPrintRequestHistoryDetail.tsx` | Expand/detail UI |
| **New** `CustomerAccountActivitySection.tsx` | Account activity UI |
| `buildAuditTrailProfile.ts` | Stats from new models |
| `layout.css` | New section styles |
| Tests under `features/users/` | Card builder, logical ids, deep links |

No Functions changes expected for MVP unless review identifies gap.

---

## Index strategy

| Query | Index need |
|-------|------------|
| `printRequests` `customerId` + orderBy `updatedAt` | Likely existing single-field; verify |
| `customerActivityEvents` `customerId` + `occurredAt` desc | **May need composite** — add to `firestore.indexes.json` only after DEV verification / Firebase error |
| `showAllocations` `customerId` | Existing pattern in audit service |

Deploy indexes **DEV-only** with owner authorization; no speculative production index deploy.

---

## Test strategy

### Automated

| Check | Scope |
|-------|-------|
| `resolveLogicalCustomerIds` / alias batching | unit |
| PR card builder (show, conversion, merge attribution) | unit |
| `buildPrintRequestDeepLinkPath` integration for card inputs | unit (extend existing routes tests) |
| Account activity pagination merge | unit |
| Permission gating | contract |

### Manual (DEV)

- Survivor with merged source: sees source PRs + merge account events
- Converted CR→IR pair: lineage + both links
- Allocated request: show title + scheduled date/time labels correct
- Customer with many PRs: modal scroll + pagination usable
- Open Print Request lands on correct tab/kind

---

## Human checkpoints

- Owner approves this plan before implement
- Optional: UX review of card hierarchy after implement prototype
- Index deploy to DEV if required
- No production deploy

---

## Risks

| Risk | Mitigation |
|------|------------|
| Firestore `in` query limit (10) | Batch merge source ids; document max merged sources |
| `queueTab` stale vs derived tab | Prefer mirror; fallback derive on link only |
| Performance with many PRs | Pagination + lazy detail |
| Cluttered merge attribution | Details-only default [NEEDS OWNER DECISION] |

---

## Rollback

Feature flag or revert modal to flat list (keep new services isolated). No data migration.

---

## Acceptance criteria (testable)

See owner prompt checklist — all items mapped in sections above.

---

## [NEEDS OWNER DECISION] — RESOLVED 2026-08-29

Owner **APPROVED** all items:

1. **PR card hierarchy** — approved as proposed; show + scheduled date/time prominent
2. **Card click behavior** — card body opens **Details**; explicit **Open Print Request** navigates
3. **Account Activity collapsed by default** — **yes**
4. **Merge attribution** — **details-only** by default
5. **Open in Show Queue** — **deferred** from WS4 V1
6. **PR page size** — **15** with Load more
7. **Summary stat tiles** — Print requests + Queued to show + **Account Activity** (replaces Recent events)

---

## FreshForge impact

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Studio app | Yes |
| Functions | No (MVP) |
| Firestore indexes | Maybe DEV-only |
| Docs | DATA_MODEL cross-ref only if query contract documented |

---

## Next step

Formal Review → owner **APPROVE WS4 PLAN** → Implement → Test → Signoff.
