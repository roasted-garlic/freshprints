# Formal Review Amendment: Portal admin Show Queue upcoming dashboard

| Field | Value |
|---|---|
| Date | 2026-09-09 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-09-portal-admin-daily-show-queue-plan.md` (Amendment section) |
| Related prior review | `docs/workflow/reviews/2026-09-09-portal-admin-daily-show-queue-review.md` |
| Related implementation | Local Portal admin route + corrective; DEV Function `getPortalAdminDailyShowQueue` remains deployed |
| Verdict | **approved_with_changes** |
| Implementation authorized | **NO** |

---

## Summary

Owner DEV re-QA accepts that the page loads after the Portal lifecycle corrective, but rejects the
operational-day dump UX. The Plan Amendment correctly reframes the same narrow Portal staff
exception as a mobile-first upcoming-show dashboard with lazy, owner/admin-only View Designs
artwork. The amendment remains bounded if implementation follows Option B callables, preserves
customer-shell isolation, reuses Studio Upcoming membership without inventing a horizon, and
amends ADR-FP-187 before coding.

This Formal Review Amendment does **not** authorize implementation, deploy, commit, or push.

---

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | Same goal; presentation/DTO/artwork expansion only; mutations still banned |
| Architecture alignment | pass | Isolated admin shell; Option B callables; no PortalAppShell |
| Security impact addressed | pass with changes | Artwork via short-lived signed URLs + IDOR checks required; ADR amendment mandatory |
| Data model impact addressed | pass | No schema/Rules changes; stats derived from existing allocations |
| Backend impact addressed | pass | Function changes + additional modal callable; Rules/indexes unchanged expected |
| Test strategy adequate | pass | Auth, stats, IDOR, lifecycle regression, mobile contracts listed |
| Human checkpoints identified | pass | Owner implement authorization; later DEV Function redeploy; no production |
| Roadmap alignment | pass | Narrow staff exception, not third app |
| Documentation plan | pass | ADR-FP-187 + Architecture/Security/Backend/Testing updates on implement |
| No silent scope expansion | pass | Needs Attention / mutations / helper access explicitly out |

---

## Architecture Review

**Findings:**

- Composing `PortalAdminShowSidebar` with shared `.portal-sidebar*` visual tokens is the correct
  reuse strategy. Mounting customer `PortalSidebar` / `PortalAppShell` would violate ADR-FP-187
  and existing admin contract tests.
- Option B (dashboard callable + lazy designs callable) is preferred over extending the daily
  flattened DTO. Lazy modal loading is mandatory for mobile performance.
- Default selection via `resolveVisibleShowSelection` + `sortUpcomingShowsForDisplay` matches
  Studio Upcoming first-item behavior.
- Upcoming membership correctly reuses `getShowScheduleTab === "upcoming"` + Whatnot surface +
  DEV-only `dev_fixture` gate. Unbounded metadata list matches Studio; no invented horizon.
- Design Qty unique-identity definition is an intentional, documented divergence from Studio PR
  card row-count wording; acceptable for owner glance metric.

**Required changes:**

- [ ] During implementation, keep drawer state in an admin-local provider; do not share customer
      `PortalDrawerContext` wiring that assumes `PortalAppHeader` / bottom nav.
- [ ] Dashboard responses must not embed item arrays or image URLs; only the modal callable may.
- [ ] Preserve the Portal load-lifecycle corrective semantics when reshaping hooks.

---

## Security Review

**Findings:**

- Authorization posture remains owner/admin-only; helpers stay denied at the callable boundary.
  This is still correct even though Studio Storage Rules allow helper reads of uploads.
- Artwork expansion is the highest risk in this amendment. Plan correctly rejects returning Storage
  paths and chooses Admin SDK short-lived signed derivative URLs (15-minute assisted-creation
  precedent).
- Modal callable must deny cross-show / cross-PR IDOR: prove allocations exist for
  `(showId, printRequestId)` before signing any upload/design derivative.
- Catalog originals and customer upload source/production paths must never be signed for this
  modal.
- Minimal `showId` / `printRequestId` in admin DTOs/inputs is acceptable under server authz;
  customer IDs, upload IDs, design IDs, and allocation IDs must stay out of list/dashboard DTOs.
- Firestore Rules: **NO** change. Storage Rules: **NO** change. Do not rely on Portal client
  `getDownloadURL` against private uploads (would require staff client reads conflicting with
  “staff sessions do not query customer documents”).

**Required changes:**

- [ ] ADR-FP-187 must be amended before/with implementation to cover upcoming dashboard + signed
      artwork preview exception and identifier navigation refs.
- [ ] Modal response allowlist tests must prove absence of Storage paths and presence of
      `expiresAtMs`.
- [ ] Helper/customer/guest denial tests required on **both** new/changed callables.

**Human approval needed before production:**

- [ ] Separate owner production authorization after DEV QA (unchanged platform gate)
- [x] Owner implementation authorization required before any coding of this amendment

---

## Data Model Review

**Findings:**

- No new collections, fields, or migrations.
- Capacity reuses `maxTotalQuantity` + non-canceled allocated sum via `assessShowCapacity` /
  `getShowCapacityPercent`. Over-capacity remains truthful; bar width may clamp visually only.
- Print Qty / PR Qty match authoritative non-canceled allocation semantics.
- Design Qty unique-key rules are specified and testable.

**Required changes:**

- [ ] None beyond documenting Design Qty divergence in ADR/docs during implement

---

## Backend Review

**Findings:**

- Function changes: **YES**
- Additional Function: **YES** (modal designs callable; dashboard may replace daily)
- Existing DEV Function redeploy likely: **YES**
- Firestore Rules: **NO**
- Storage Rules: **NO**
- Indexes: **NO** expected if queries remain single-field; confirm on implement
- New dependencies: **NO**
- Retire Portal usage of `getPortalAdminDailyShowQueue`; prefer replacing with the dashboard
  callable rather than growing the day DTO.

**Required changes:**

- [ ] Implementation must include explicit DEV deploy inventory listing exact Function export names
      before any owner deploy authorization.
- [ ] Upcoming discovery must not use an `orderBy(scheduledStartAt)` that drops unscheduled shows;
      match Studio’s include-unscheduled-then-sort behavior.

---

## UI / UX Review

**Findings:**

- Mobile-first ordering and off-canvas sidebar match owner requirements and Portal patterns.
- PR cards without inline item dumps are correct; View Designs is the right progressive disclosure.
- Modal phone constraints are adequately specified.

**Required changes:**

- [ ] Manual Owner DEV QA checklist must cover sidebar, default selection, stats, capacity,
      modal images (catalog + upload), and mobile usability before signoff.

---

## Test Review

**Findings:**

- Plan lists auth, membership, stats, capacity, IDOR, signed-URL minimization, lifecycle
  regression, and shell isolation coverage. Adequate for eventual implementation.

**Required changes:**

- [ ] Extend lifecycle/controller tests so show-switch + modal open do not reintroduce the
      `mountedRef` false-after-cleanup hang.

---

## Risk Review

| Risk | Mitigation |
|---|---|
| Artwork privacy expansion | Signed 15m URLs; owner/admin only; IDOR checks; no paths; ADR amendment |
| Customer shell coupling via sidebar reuse | Compose admin sidebar; CSS-only reuse; contract tests |
| Unbounded upcoming list cost | Metadata-only list; selected-show allocations only; monitor DEV scale |
| Stat divergence from Studio “Designs” copy | Document unique-identity definition in ADR |
| Loading corrective regression | Preserve settlement/coalesce tests; expand for new hooks |
| Daily Function left live unused | Replace Portal client immediately; clean Function exports in authorized deploy |

---

## Explicit gates

| Gate | Result |
|---|---|
| Function changes required | **YES** |
| Additional Function required | **YES** |
| Firestore Rules changes | **NO** |
| Storage Rules changes | **NO** |
| Index changes | **NO** (confirm query shape; do not add speculatively) |
| New dependencies | **NO** |
| ADR-FP-187 amendment required | **YES** |
| Existing DEV Function redeploy likely | **YES** |
| Still a narrow Portal staff exception | **YES** |
| Implementation authorized | **NO** |
| Production touched | **NO** |

---

## Unresolved owner decisions

| Item | Status |
|---|---|
| Admin upcoming list horizon | **Resolved by repo** — Studio Upcoming is unbounded; reuse it (metadata-only) |
| Include Needs Attention (past+printing) | **Default NO** unless owner overrides at implement auth |
| Canceled-only PRs on main list | **Default NO** |
| Design Qty unique vs Studio row count | **Unique non-canceled identities** (documented) |

No blocking `[NEEDS OWNER DECISION]` remains for architecture. Owner must still authorize
**implementation** of this amendment.

---

## Verdict

**approved_with_changes**

The Plan Amendment is accepted as the architecture for the remaining goal work, subject to the
required changes above. Stop for owner implementation authorization.

## Next checkpoint

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PORTAL ADMIN SHOW QUEUE DASHBOARD AMENDMENT]`

Do not implement, deploy, commit, or push until the owner authorizes.
