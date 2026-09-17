# Formal Review: Shared Length-Based Show Pricing and Customer Navigation

| Field | Value |
|-------|-------|
| Date | 2026-09-17 |
| Reviewer | Codex / Review Agent |
| Plan | docs/workflow/plans/2026-09-17-print-request-length-surcharge-and-customer-navigation-plan.md |
| Verdict | **approved** |
| Implementation authorization | **granted for the reviewed scope — stop after Implement + Test + Independent Implementation Review for Owner DEV QA** |

---

## Summary

The original Plan was bounded and aligned with the existing FreshForge architecture: `settings/showQueue` remains canonical, shared pricing remains in `packages/shared`, Portal receives an allowlisted projection, and customer navigation uses the existing Users directory and merged-customer logic. The owner’s amendment explicitly approves the pricing snapshot/legacy fallback and adds an origin-neutral Working-request rule plus unqueue corrective. The amended scope is approved for implementation, with deployment and Signoff still separately gated.

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | Pricing, queue lifecycle, Portal parity, cache, and customer navigation are listed; no 22-inch cap or broad Users redesign. |
| Architecture alignment | pass | Extends the existing shared resolver/settings path and preserves layer direction. |
| Security impact addressed | pass | Private settings remain staff-only; proposed callable returns an allowlisted customer-safe DTO; Rules remain strict. |
| Data model impact addressed | pass with owner decision | Optional allocation pricing snapshot is specified, but the legacy no-snapshot compatibility contract requires owner acceptance. |
| Backend impact addressed | pass with owner decision | Allocation creation/lineage and a narrow Portal callable are identified; no deploy is included now. |
| Test strategy adequate | pass | Boundary, parity, snapshot, Rules, cache, UI contract, typecheck, build, and manual gates are specified. |
| Human checkpoints identified | pass | Business pricing, queued behavior, public callable exposure, UX, and Owner DEV QA are explicit. |
| Roadmap alignment | pass | This is a managed pricing/data-contract phase and does not silently expand into unrelated cleanup. |
| Documentation plan | pass | Data model, backend/security, testing, and decision docs are named. |
| No silent scope expansion | pass | The Plan explicitly stops before implementation and production actions. |

---

## Architecture Review

**Findings:**

- The existing shared pricing utility is the right authority. Direct consumers were found in Studio request cards, request/group summaries, upcoming-show rail/glance totals, Staff Inbox paths, export/composer paths, Portal commitment/size-tier UI, and Portal admin size labels.
- The existing settings service already makes `settings/showQueue` canonical and merges legacy settings only as compatibility input. New surcharge fields should follow that same typed path; no second authority is justified.
- Cache fingerprints already include dimensions and section pricing where relevant, but the current summary/version must be bumped for the material new policy fields.
- `/users` already owns customer directory filtering and merged/survivor behavior, so a stable query parameter is the narrowest navigation extension.

**Required changes:**

- [x] Keep all pricing formulas out of React/Electron components.
- [x] Search and replace every width-only pricing classification that affects price or displayed tier; preserve width-only uses that are genuinely non-pricing after review.
- [x] Make the queued snapshot/legacy behavior an explicit owner-approved contract before touching allocation writers.

## Security Review

**Findings:**

- `settings/showQueue` is staff-readable and owner/admin-writable under strict Rules. Portal cannot directly read it.
- `/help` is a public Portal route and currently opens default pricing. Exact parity requires a narrow server-side projection, not a client-side Firestore read.
- `showAllocations` has a strict `hasOnly` field allowlist and customer-owned read path. New snapshot fields must be added deliberately and tested; broadening the allowlist is not acceptable.

**Required changes:**

- [x] Define the callable response as pricing-only and exclude layout/import/operational settings.
- [x] Decide and test whether the callable is public or uses the existing authenticated Portal policy; this decision must match `/help` accessibility.
- [x] Add Rules emulator coverage for new settings and allocation fields if Rules change.

**Human approval needed before production:**

- [x] Owner approval for public pricing projection exposure and any Functions/Rules deployment.

## Data Model Review

**Findings:**

- Current allocations preserve dimensions and lineage, not price. Active totals are currently live against current settings; canceled rows are excluded.
- A normalized immutable allocation pricing snapshot is the smallest schema addition that preserves new queued commitments across settings changes, moves, and requeues.
- Existing rows cannot be truthfully backfilled from current data. The Plan correctly prohibits a silent historical rewrite.

**Required changes:**

- [x] Owner must approve `[NEEDS OWNER DECISION: QUEUED PRICE SNAPSHOT CONTRACT]`.
- [x] Keep snapshot fields optional and preserve legacy rows/lineage.
- [x] Specify snapshot copy/read/cancel/requeue/move semantics in code and durable data-model docs before implementation.

## Backend Review

**Findings:**

- Studio and Portal allocation Functions are the creation points; move and production-recovery requeue are lineage-copy points.
- The proposed Portal callable avoids exposing the private settings document and allows `/help` and request pricing to share the same effective configuration.
- No new external service or environment variable is required by the Plan.

**Required changes:**

- [x] Read/normalize canonical settings at allocation creation and write only the approved snapshot shape.
- [x] Use snapshot-first reads and explicitly label/handle snapshot-less legacy allocations.
- [x] Build/test Functions before any deployment; deployment remains a separate human checkpoint.

## Testing Review

**Findings:**

- The proposed exact boundary matrix catches the common off-by-one risks: Pocket’s second dimension, width tiers, and surcharge transitions.
- The plan covers parity between Studio and Portal, active/canceled semantics, cache invalidation, strict Rules, and customer-link behavior.
- This turn correctly runs no tests because the attached request explicitly stops before implementation.

**Required changes:**

- [x] Add a test proving Portal does not fall back to a second hardcoded pricing authority after the projection is introduced.
- [x] Add a test proving customer link click does not select the surrounding Print Request card.
- [x] Add compatibility tests for snapshot-present and snapshot-absent allocations.

## Documentation Review

**Findings:**

- ADR-FP-185 currently documents width-only pricing and no Function/migration delta. This goal must amend that decision or add a superseding decision after implementation.
- `DATA_MODEL.md` must explain allocation snapshot optionality and the legacy boundary; `TESTING.md` must retain emulator/build requirements.

**Required changes:**

- [x] Update durable docs in the same implementation/signoff pass as behavior changes.

## Amendment Review: Cross-origin Customer Print Request invariant and unqueue corrective

### Reconciliation findings

- **ADR-FP-071:** the original one-continuable rule and the 2026-09-02 active-parking amendment remain intact. The amendment changes only the origin filter: ordinary non-internal `studio_customer` `draft|editing` rows now participate in the same active/unparked contract as `portal_customer` rows. The intentional parked-draft exception remains.
- **Current Portal resolver:** `portalWorkingPrintRequest.ts` currently filters through `isPortalEditablePrintRequest`, which excludes Studio drafts and then creates a Portal request. Updating the shared predicate makes the existing resolver reuse the Studio request without changing provenance.
- **Current parking:** `portalContinuableParking.ts` already archives empty drafts and parks meaningful drafts, but has an origin-only error branch. Removing that branch makes parking lifecycle/content-driven and fixes the reported error without deleting or merging meaningful content.
- **Studio parity:** Studio’s picker query already uses `status in [draft, editing]` and `isInternal == false`, so it sees both origins. It must filter parked drafts from the active exclusion set. Its current client preflight is not race-safe; a staff callable with an Admin SDK transaction is required for the trusted guard.
- **Indexes/Rules:** the existing `printRequests` `customerId + status` and `status + isInternal` indexes cover the reviewed queries. Trusted callable/Admin SDK writes preserve existing Rules boundaries; no Rules or index change is expected, subject to implementation verification.
- **Pricing interaction:** allocation snapshot/cancel/park/re-add/move/requeue behavior remains unchanged and is covered in combined regression tests. Parking never rewrites request items or allocation pricing history.

### Required Formal Review questions answered

1. Portal created a second request because `studio_customer` drafts were excluded from the Portal editability predicate and deliberately ignored by the Portal create resolver.
2. Yes. The `Cannot park while studio customer requests exist.` failure comes from the same origin-only distinction in the parking helper.
3. Active/unparked Working Customer PR means ordinary non-internal `draft|editing`, same logical customer, not a parked draft; origin is not part of uniqueness.
4. A Studio-created Working/Draft row becomes Portal Current through the shared predicate and existing active selector, with ownership checks intact and `requestOrigin` preserved.
5. Catalog add, upload, assisted-approved artwork, quantity, size, duplicate, and remove-item use that request because their existing callables already share the corrected predicate.
6. Internal and other-customer requests remain excluded by `isInternal`, customer ownership, authenticated callable, and active/parked checks; no broader authority is introduced.
7. Editing/show-management remains distinct. Both customer origins are already accepted by the narrow show-management helper; production/cutoff/capacity/terminal guards remain unchanged.
8. Empty conflicting Studio drafts are archived in the existing parking transaction.
9. Meaningful Studio drafts are parked with contents/provenance intact and restored through existing `parksDraftPrintRequestId` fields.
10. Parked drafts are excluded from active selectors and the Studio picker guard; they are not counted as a second active Working request.
11. The Studio picker’s origin-neutral query is already correct, but parked-state filtering is required. The direct client preflight is not a race-safe trusted guard, so creation moves to a staff callable.
12. DEV QA requires the new `createStudioCustomerPrintRequest` Function and any changed existing Functions, plus the already-approved pricing Functions if implemented in this pass. Deployment remains separately authorized.
13. No Rules or index change is expected: existing indexes cover the queries and Admin SDK/callable writes preserve current Rules boundaries. This must be verified by focused tests/build.
14. Legacy duplicates are not migrated or merged. Normal operations prevent new active duplicates, use explicit selection/conflict behavior where multiple active rows genuinely remain, and fail only for unsafe lifecycle/ownership/production conditions.

### Amendment checklist

| Area | Status | Notes |
|---|---|---|
| Root cause traced | pass | Portal resolver exclusion and parking origin-only blocker are proven. |
| ADR-FP-071 reconciled | pass | Continuable and parked-draft semantics preserved; origin filter superseded as owner-directed. |
| Portal mutation consistency | pass | Existing callables already share the predicate; active selector continues to exclude parked drafts. |
| Studio picker and trusted guard | pass | Picker remains origin-neutral; parked filtering plus new staff callable closes the race. |
| Unqueue/parking safety | pass | Empty archive and meaningful park/restore use existing transaction semantics. |
| Security/lifecycle boundaries | pass | Internal, ownership, terminal, production, maintenance, quota, DPI, size, cutoff, and capacity guards remain. |
| Legacy duplicate handling | pass | No migration/merge/backfill; explicit conflict behavior remains. |
| Pricing interaction | pass | Snapshot, canceled-history, re-add, move/requeue semantics remain covered. |
| New product decision found | **no** | Owner supplied the invariant, mutation scope, parking behavior, and deployment boundary. |

### Amendment verdict

**Approved.** The urgent corrective is technically bounded, directly addresses the reported incident, preserves ADR-FP-071’s parking lifecycle, and introduces no unresolved product decision. Implementation is authorized for this managed goal. The agent must proceed through Implement → Test → Independent Implementation Review, then stop for Owner DEV QA. No deployment, Signoff, production mutation, migration, cleanup, or record merge is authorized.

## Next Step

Proceed directly to implementation of the amended Plan, then run the required automated tests and Independent Implementation Review. Stop before DEV deployment and Signoff for the Owner DEV QA checkpoint.
