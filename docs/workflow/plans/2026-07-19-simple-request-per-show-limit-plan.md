# Plan: Replace Cap A/B split with one simple request-per-show limit

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-review.md |

---

## Goal

Replace the dual Cap A (daily) + Cap B (per-show) + choose-prints / auto-remainder model with **one** Portal limit: max prints on Current Request equals max prints per customer per show. Entire request queues to exactly one show atomically or cleanly rejects. After success, Current Request is empty. No daily Cap A counters, no Choose Prints, no remainder request.

## Background

- Owner launched Managed Phase: **Replace Daily Cap and Split Requests With One Simple Request-Per-Show Limit**.
- Prior ADR-FP-101 remainder QA and Cap A qty-clamp smoke are **stopped** (do not continue testing or sign off).
- QA target limit: **25** (Studio Settings; code default may stay 20 until Settings set).
- Upload quotas (ADR-FP-095) stay unchanged.
- Preserve **one request ↔ one show** (no multi-show request) in a new ADR; drop remainder/split and daily Cap A.

### Product model (authoritative)

| Rule | Behavior |
|------|----------|
| One limit `L` | Max prints on Current Request = max per customer per show |
| Count | Sum of `printRequestItems.quantity` |
| Queue | Entire Continuable request → exactly one show |
| Fit | Show must accept **entire** request qty or **clean reject** (atomic; no partial) |
| After queue | New **empty** Current Request (no remainder items) |
| Uniqueness | One Portal print request per customer per show — reject a second |
| Cap A | Remove daily charge/refund/counters/UI entirely |
| Cap B naming | Collapse into the single `L` setting (keep field or thin rename — see Settings) |
| Uploads | ADR-FP-095 unchanged |

### ADR supersession (plan)

| ADR | Action |
|-----|--------|
| **FP-096** | Supersede Cap A half; Cap B becomes the sole `L` (amend or replace with new ADR) |
| **FP-100** | Supersede (Cap A exhausted UX / daily remaining = 0 gates) |
| **FP-101** | Supersede remainder/choose-prints; **preserve** one-request↔one-show in new ADR |
| **FP-099** | Remains superseded (do not revive) |
| **FP-095** | Keep (upload quotas) |
| **New ADR** | One limit `L`; atomic full-queue-or-reject; empty Current Request after queue; one Portal request per customer per show |

---

## Scope

### In Scope

1. Repo-backed removal of Cap A daily system (settings field usage, counters, charge/refund, Portal banner/gates, create-at-0 gate).
2. Unify working-request max and per-show customer max to one Settings value `L`.
3. Simplify `queuePortalPrintRequestToShow`: remove `selections` / remainder create; atomic full fit or reject; empty Current Request after success.
4. Enforce one Portal request per customer per show (reject second).
5. Over-limit Continuable compat (carts built under Cap A > `L`).
6. Studio Settings UI: single print-request limit field + copy.
7. Tests remove/update/add; docs + new ADR; deploy Functions to `fresh-prints-dev`; manual QA. **No production.**

### Out of Scope

- Production deploy
- Studio staff multi-show split UX (`AddToShowModal` / `SplitDesignPickerModal`) — keep staff tools
- Upload quota changes (ADR-FP-095)
- Changing show `maxTotalQuantity` semantics beyond using them in the atomic fit check
- Committing unless owner asks

---

## Inventory (repo inspection)

### 1. Cap A inventory (remove)

| Area | Paths / symbols |
|------|-----------------|
| Settings field | `dailyDesignsAddedToRequestsLimit` in `printRequestLimitSettings.constants.ts`, defaults, Studio `PrintRequestLimitSettingsSection` |
| Counter collection | `printRequestDesignDailyLimits/{uid}_{yyyyMMdd}`; wipe target in `operationalWipeTargets.ts` + Studio wipe UI |
| Charge/refund | `functions/src/lib/printRequestDailyDesignLimit.ts` — `applyDailyDesignAddsChargeInTransaction`, `Refund…`, `assertCapAAllowsNewWorkingPrintRequest`, `readPrintRequestDailyDesignQuota` |
| Callables using Cap A | `createPortalPrintRequest`, `addPortalCatalogDesignToPrintRequest`, `updatePortalPrintRequestItemQuantity`, `removePortalPrintRequestItem`, `duplicatePortalPrintRequestItem`, `confirmCustomerUploadsAndAttachToRequest`, `customerAddAssistedApprovedProofToPrintRequest`, `clearPortalWorkingPrintRequest` |
| Quota callable | `getPrintRequestDailyDesignQuota` (+ Portal `getDailyDesignQuota`) |
| Shared utils | `printRequestDailyDesignLimit.ts`, Cap A branches in `printRequestQuotaUserCopy.ts`, optimistic helpers |
| Working max today | `printRequestWorkingRequestMax.ts` + `assertWorkingRequestAllowsPrintAdds` — currently max = Cap A |
| Portal UI | `PortalPrintRequestDailyQuotaBanner`, `usePortalCapAQuotaState`, `capAQuota` / `notifyCapAQuotaChanged` in `PortalPrintRequestContext`, drawer/shell gates, catalog/upload/assisted `canAddPrints` |
| Error codes | `DAILY_PRINT_LIMIT` (retire or stop emitting); keep `WORKING_REQUEST_PRINT_LIMIT` for per-request max |

### 2. Split / remainder inventory (remove Portal path)

| Area | Paths / symbols |
|------|-----------------|
| UI | `PortalQueueSplitPickerModal.tsx`, choose-prints branch in `PortalQueueToShowModal.tsx`, remainder nav in `PrintRequestDetailView.handleQueuedToShow` |
| Pure helpers | `portalCapBRemainderSplit.ts` (`planPortalCapBRemainderSplit`, choose/remainder copy) |
| Fit | `portalShowQueueFit.ts` — keep capacity math; **change** overflow from choose-prints to **hard reject** |
| Queue callable | `queuePortalPrintRequestToShow.ts` — selections + inline remainder create |
| Types | `queuePortalPrintRequestToShow.types.ts` — `selections`, `remainderPrintRequestId`, `remainderQuantity` |
| Validation | `queuePortalPrintRequestToShowValidation.ts` selections parsing |
| CSS | `.portal-queue-split-*` in `requests.css` |
| Keep | Studio staff split + `printRequestSplitAllocation.ts` (staff only) |

### 3. Settings fields

| Field (today) | Fate |
|---------------|------|
| `dailyDesignsAddedToRequestsLimit` | **Stop requiring / stop enforcing.** Leave orphan field readable for one release (ignore) or strip from parse/save with compat fallback |
| `maxQuantityPerShowPerCustomer` | **Become sole `L`.** Default 20 in code; QA set to **25** in Studio on `fresh-prints-dev` |
| Studio UI | One numeric field + copy: “Max prints per Current Request / per customer per show” |
| Callable | `updatePrintRequestLimitSettings` — accept single required limit (or both fields with Cap A ignored/mirrored — prefer single required field + ignore legacy Cap A on read) |

**Recommended settings strategy:** Keep doc id `settings/printRequestLimits`. Require only `maxQuantityPerShowPerCustomer` as `L`. `resolvePrintRequestLimitSettings`: if Cap A present, ignore for enforcement. Owner save writes `L` only (optional: also write Cap A = `L` for one release so old Functions still see a number if rolled back mid-deploy — document in rollback).

### 4. Callable contracts (target)

| Callable | Change |
|----------|--------|
| `queuePortalPrintRequestToShow` | Drop `selections` / remainder fields. Input: request id, show id, bidding ack. Response: allocations + `isFullyQueued: true`; **no** remainder ids. Reject if partial would be needed, or if customer already has a Portal request on show, or if request already allocated |
| `listPortalAllocatableShows` | Keep `customerAllocatedQuantity`; Portal uses to disable shows that already have this customer’s request (or qty > 0 allocations) |
| `getPrintRequestDailyDesignQuota` | **Remove or stub-deprecate** (Portal stops calling). Prefer delete export after Portal unwire |
| Add/qty/duplicate/upload/assisted/clear | Remove Cap A charge/refund; keep working-max assert against `L` |
| `createPortalPrintRequest` | Remove Cap A remaining = 0 gate; keep one-working-request gate |
| `updatePrintRequestLimitSettings` | Single `L` (see Settings) |

### 5. Indexes / transactions

| Item | Notes |
|------|-------|
| Cap A counters | No composite index (doc-id lookup). Stop writing; wipe optional on `fresh-prints-dev` |
| Queue txn | Single `runTransaction`: re-read show + request + existing allocations; **assert** no existing request allocations; **assert** customer has zero non-canceled allocations on show (one request/show); **assert** `requestQty ≤ showRemaining` and `requestQty ≤ L`; write all allocations for all items; bump show `allocatedQuantity`; set request `active`; bidding ack. **No** remainder create; **no** Cap A touch |
| Shows list | Existing `showAllocations` indexes (`upcomingShowId+status`, `customerId`) sufficient |
| Continuable | `printRequests` `customerId+status` unchanged |

### 6. One-request-per-show strategy

Two complementary rules:

1. **One show per request (keep):** If this `printRequestId` already has non-canceled allocations → reject (existing FP-101 message).
2. **One Portal request per customer per show (new):** Before allocate, sum/query non-canceled `showAllocations` for `(customerId, upcomingShowId)`. If any allocation exists for **another** (or any) print request on that show → reject with clear copy: e.g. “You already have a print request on this show.”

Enforcement: server in queue callable (authoritative). Portal: disable/hide shows with `customerAllocatedQuantity > 0` in Add to show list for clearer UX (defense in depth; not the security boundary).

### 7. Full capacity atomic strategy

Replace choose-prints overflow with:

```
fitBudget = min(L - existingCustomerQtyOnShow, showRemainingCapacity?)
```

With rule (6), `existingCustomerQtyOnShow` must be **0** for a first request; then:

```
if requestQty > fitBudget OR fitBudget <= 0 → failed-precondition (SHOW_CAPACITY or SHOW_CUSTOMER_LIMIT)
else → allocate entire request atomically
```

No `selections`. No partial `planPortalCapBRemainderSplit`. Reuse `planPortalShowQueueFit` / `planAllocationSplit` only to detect `fitsEntirely`; if not `fitsEntirely`, throw (do not open UI picker).

### 8. Empty Current Request strategy

**Preferred (matches today’s full-queue path, removes remainder):**

1. Queue txn activates source request; does **not** create a Continuable remainder.
2. Portal on success: `resetWorkingCart()`, close drawer, stay on detail or go to requests list / virtual empty shell — same as current non-remainder success, **without** navigating to a remainder id.
3. Next add: `ensureWorkingPrintRequestId` → `createPortalPrintRequest` creates a fresh empty Continuable when needed.

**Not preferred this phase:** Auto-create empty draft inside queue txn (extra writes, orphan drafts). Document as rejected alternative unless owner insists during approval.

**Contrast with Clear:** Clear reuses same Continuable id and (under Cap A) refunded daily — after this phase Clear only empties items; no Cap A refund.

### 9. Over-limit working request compat

Dev carts may already hold qty **> `L`** (e.g. Cap A 50 builds).

| Situation | Behavior |
|-----------|----------|
| Add / qty-up that would exceed `L` | Clamp or reject via existing working-max helpers pointed at `L` |
| Continuable already `sum(qty) > L` | Block **queue** with clear message; allow qty-down / remove / clear until `≤ L` |
| Queue when `≤ L` but show capacity smaller | Atomic reject (show capacity), no split |

No forced server shrink of existing lines without user action.

### 10. Files to modify (expected)

**Shared**

- `packages/shared/src/constants/printRequest/printRequestLimit*.ts` (+ tests)
- `packages/shared/src/utils/printRequestDailyDesignLimit.ts` — delete or gut; update consumers
- `packages/shared/src/utils/printRequestWorkingRequestMax.ts` (+ tests) — max = `L`
- `packages/shared/src/utils/printRequestQuotaUserCopy.ts` (+ tests) — remove Cap A situations
- `packages/shared/src/utils/portalCapBRemainderSplit.ts` (+ tests) — remove or stop Portal use
- `packages/shared/src/utils/portalShowQueueFit.ts` (+ tests) — hard-reject messaging
- `packages/shared/src/types/portal/queuePortalPrintRequestToShow.types.ts`
- `packages/shared/src/types/printRequest/printRequestDailyDesignQuota.types.ts` — deprecate/remove
- Error codes / wipe targets as needed

**Functions**

- `queuePortalPrintRequestToShow.ts` + validation (+ tests)
- `lib/printRequestDailyDesignLimit.ts` — remove charge paths from callables
- All Cap A callables listed in inventory
- `getPrintRequestDailyDesignQuota.ts` + `index.ts` export
- `updatePrintRequestLimitSettings.ts`
- `listPortalAllocatableShows.ts` (copy / disable semantics if needed)
- `lib/printRequestWorkingRequestMax.ts`

**Portal**

- Remove/repurpose daily banner + Cap A hook/context fields
- `PortalQueueToShowModal.tsx` — remove split picker path
- Delete or stop importing `PortalQueueSplitPickerModal.tsx`
- `PrintRequestDetailView.tsx` — remove remainder navigation
- Catalog / upload / assisted / detail gates — use working-request room vs `L`, not daily remaining
- `portalPrintRequestService.ts` / show selection service
- `mapPortalPrintRequestCallableError.ts`, styles

**Studio**

- `PrintRequestLimitSettingsSection.tsx` + hook/service — single field UI
- Wipe option for Cap A counters may remain for cleanup

**Docs**

- `DECISIONS.md` (new ADR + supersessions)
- `DATA_MODEL.md`, `BACKEND.md`, `ROADMAP.md` Small Managed Items #3
- Handoff `CURRENT-STATE.md`

### 11. Tests — remove / update / add

| Action | Files |
|--------|-------|
| **Remove / gut** | `printRequestDailyDesignLimit.test.ts`, Cap A cases in `printRequestQuotaUserCopy.test.ts`, `portalCapBRemainderSplit.test.ts`, selections-heavy cases in `queuePortalPrintRequestToShowValidation.test.ts` |
| **Update** | `printRequestWorkingRequestMax.test.ts` (max = `L`), `printRequestLimitSettings*.test.ts`, `portalShowQueueFit.test.ts` (reject not overflow UX), `printRequestPerShowCustomerCap.test.ts`, rules alignment messaging, wipe-target tests if Cap A collection removed from required wipe |
| **Add** | Queue atomic reject (fit), one-request-per-show uniqueness helper test, post-queue no-remainder contract on types/validation, Settings single-field parse |
| **Keep** | Studio staff `printRequestSplitAllocation.test.ts`; upload quota tests |

Automated commands (implement phase): scoped `npx tsx --test` on touched shared/functions tests; Functions `npm run build`; Portal typecheck as practical.

### 12. Dev deploy

Deploy updated Functions to **`fresh-prints-dev` only** (queue + all Cap A–stripped add/qty/clear/create + settings + remove/stop daily quota callable). Soft-reload Portal. **No production.**

### 13. Manual QA (after implement; not this planning session)

Prerequisites: Settings `L = 25` on `fresh-prints-dev`; soft-reload Portal.

1. Build Current Request to 25 → cannot add 26th print (clamp/block).
2. Add to show with room → entire request queues; Current Request empty; request `active` on that show only.
3. Attempt second Portal request to **same** show → rejected / show disabled.
4. Build 25; pick show with capacity &lt; 25 → clean reject; request still Continuable, unchanged qty.
5. Confirm no Choose Prints / remainder navigation.
6. Confirm daily Cap A banner gone; upload quotas still work.
7. Clear / qty-down still work without Cap A refund semantics.

### 14. Rollback

Redeploy previous Functions revision on `fresh-prints-dev`; soft-reload Portal. Settings: if Cap A field was still mirrored = `L`, old Cap A code can run again; otherwise restore Settings doc fields from backup. Cap A counter docs may be stale/zero — acceptable for rollback smoke.

---

## Approach (implement phase — do not run until owner approves)

1. Land new ADR + doc notes (with supersessions).
2. Settings: single `L`; Studio UI; resolve/parse updates.
3. Strip Cap A from Functions callables + delete/stop daily quota callable; point working max at `L`.
4. Rewrite queue callable: uniqueness + atomic full fit; remove remainder/selections.
5. Portal: remove Cap A UI; simplify Add to show; remove split modal/nav.
6. Tests + Functions build; deploy `fresh-prints-dev`; manual QA checkpoint.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit | `npx tsx --test` on touched shared + functions validation tests | yes |
| Functions build | `npm run build` in `functions/` | yes |
| Portal typecheck | scoped `tsc` / Next check as practical | yes |
| Lint | if touched packages have scripts | yes if available |
| E2E | none dedicated | no |
| Production | — | **no** |

### Manual

- [x] Details: §13 checklist after soft-reload on `fresh-prints-dev`

---

## Human Checkpoints Anticipated

- [x] **Owner approval to implement** (this phase — stop after review)
- [x] Manual UI/UX QA after implement + soft deploy
- [ ] Production deploy — forbidden
- [x] Business logic — product model above is owner-authored; confirm any settings field rename preference if desired at approval time

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Orphan Continuable carts with qty &gt; `L` | med | Block queue until shrink; clamp new adds |
| Mid-deploy Portal old client + new Functions | med | Soft-reload guidance; reject unknown `selections` safely |
| Staff split utils accidentally deleted | med | Keep Studio split + shared allocation helpers |
| Customer confusion: one request per show | low | Clear reject + disabled shows in picker |
| Cap A counter docs left in Firestore | low | Optional wipe; stop writes |
| Scope creep into Studio staff split | high | Explicit out of scope |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

See §14. No production. Prefer Functions rollback over data migration reverse.

---

## Documentation Updates Required

- [x] DECISIONS.md — new ADR; supersede FP-096 (Cap A), FP-100, FP-101 remainder
- [x] DATA_MODEL.md — remove Cap A counter semantics; update Portal queue note
- [x] BACKEND.md — callable contracts
- [x] ROADMAP.md — Small Managed Items #3 status
- [x] references/project-chatgpt-handoff/CURRENT-STATE.md — planned model
- [ ] STYLE_GUIDE.md — only if copy patterns need a note (optional)

---

## Open Questions

- [x] None blocking plan — product model is owner-authoritative.
- Optional at implement approval: prefer Settings field rename vs keep `maxQuantityPerShowPerCustomer` label only in UI (recommended: **keep field name**, change Studio labels).

---

## Prior workflows superseded / stopped

| Workflow | Action |
|----------|--------|
| Cap B one-request + auto remainder (FP-101) QA | **Stopped** — do not continue test/signoff |
| Cap A qty clamp + short banner QA | **Stopped** — subsumed by this redesign |
| Cap A daily + Cap B split plans/reviews | Historical only; do not implement further under those goals |

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-review.md
- Verdict: approved_with_changes
- Human: await `APPROVE IMPLEMENT` before any application code
