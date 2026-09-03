# Plan: Customer-specific temporary Print Request + Show quota override

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `customer-specific-temporary-print-request-and-show-quota-override` |
| Baseline HEAD | `c050a0bfd02f53098e6c36697381a7657b661c5a` (= `origin/development`) |
| Related | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-review.md` |
| Roadmap | Phase 8 / Print Request + Show Queue operational fast-follow |

---

## Goal

Add a **server-authoritative, per-customer, temporary override** for the two existing Studio-configurable Portal print limits:

1. **Print Request quota** — `settings/printRequestLimits.maxQuantityPerPrintRequest`
2. **Customer Show quota** — `settings/printRequestLimits.maxQuantityPerShowPerCustomer`

Global defaults remain unchanged for all other customers. Override affects only the targeted customer, can be cleared (and optionally expired), and must be honored by every authoritative Portal enforcement path. Applying/clearing/expiring an override must **not** mutate existing requests, items, allocations, Editing/Working ownership, or statuses.

---

## Prerequisite / baseline

| Check | Result |
|-------|--------|
| `git rev-parse HEAD` | `c050a0bfd02f53098e6c36697381a7657b661c5a` |
| `git rev-parse origin/development` | `c050a0bfd02f53098e6c36697381a7657b661c5a` |
| HEAD == origin/development | **yes** |
| Working tree | clean except intentional `?? .worktrees/` |
| FreshForge prior state | IDLE / DONE yes; last closed `cross-app-lightbox-previous-next-navigation` |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| `show-queue-batch-allocation-performance` | **DEFERRED** |

**Prerequisite: MET.**

---

## Background

Owner needs temporary higher (or different) print limits for one customer without changing site-wide Settings. Current dual limits were introduced by ADR-FP-102 (sole `L`) and amended 2026-07-31 to independent `maxQuantityPerPrintRequest` / `maxQuantityPerShowPerCustomer` with optional linking. Cap A daily counters are retired (ADR-FP-102). Continuable ownership (ADR-FP-071 / parking) is separate and must remain intact.

---

## Audit — what “quota” means today (source of truth)

### A. Print Request quota

| Item | Exact current value |
|------|---------------------|
| Product meaning | Max total **print quantity** allowed on **one** Portal working / Current Request (Continuable editable cart). |
| Global field | `maxQuantityPerPrintRequest` |
| Firestore path | `settings/printRequestLimits` |
| Studio UI | Settings → **Print request limits** tab → `PrintRequestLimitSettingsSection` (`apps/studio/.../settings/`) |
| Shared types/constants | `packages/shared/src/constants/printRequest/printRequestLimitSettings.constants.ts` |
| Code default | **20** (`PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER` in `printRequestLimitDefaults.constants.ts`) |
| Validation bounds | integers **1–10000** (`PRINT_REQUEST_LIMIT_BOUND_*`) |
| Resolve rules | Missing request field falls back to `maxQuantityPerShowPerCustomer`, then default 20 |
| Portal read | `portalPrintRequestLimitService` direct Firestore subscribe to `settings/printRequestLimits` (signed-in read) |
| Count semantics | `sumPrintRequestItemQuantities(workingItems)` = sum of `printRequestItems.quantity` on the **active working request only** |
| Time window | **None** (not daily) |
| What it is not | Not Cap A; not request-record count; not show capacity; not upload quota; not ADR-FP-071 ownership count |

### B. Customer Show quota

| Item | Exact current value |
|------|---------------------|
| Product meaning | Max cumulative **print quantity** one customer may allocate to **one** show across **all** of their requests (ADR-FP-122 accumulation). |
| Global field | `maxQuantityPerShowPerCustomer` |
| Firestore path | Same `settings/printRequestLimits` |
| Studio UI | Same Settings section (“Customer show limit”) |
| Code default | **20** |
| Validation bounds | integers **1–10000** |
| Portal read | Same settings subscribe; used as `customerShowLimit` in working-limit state / queue modal |
| Count semantics | Sum of `showAllocations.allocatedQuantity` where `customerId` matches and `status !== "canceled"` on that show (`sumCustomerQuantityOnShow` / `countsTowardPerShowCustomerCap`) |
| Time window | **None** (lifetime of non-canceled allocations on that show) |
| What it is not | Not `upcomingShows.maxTotalQuantity` physical capacity; not Studio staff capacity danger override |

### Linked limits (global only)

- Field: `linkPrintRequestAndCustomerShowLimits` (absent → **true**).
- When linked, Studio save forces both numerics equal.
- When unlinked, Studio edits each independently.
- **Recommendation for overrides:** customer override dimensions are **independently nullable**. Global link UX does **not** apply to per-customer overrides.

### Legacy Cap A (do not revive)

- Field `dailyDesignsAddedToRequestsLimit` mirrored on save only; **not read/enforced**.
- Collection `printRequestDesignDailyLimits` — retired / wipe-only.

---

## Counting algorithms (exact)

### Print Request quota usage

```
usage = Σ printRequestItems.quantity  for the single active Portal working request
remaining = max(0, effectiveMaxQuantityPerPrintRequest − usage)
block add/qty-up/duplicate/upload-attach/assisted-add when usage + add > effectiveMax
queue rejects when totalRemainingUnallocated > effectiveMax  (over-limit cart)
```

- **Parked draft:** does **not** count toward the active working request’s print max. Limit state uses `workingItems` for the selected editable Continuable only (`usePortalWorkingRequestLimitState`).
- **Editing ownership / ADR-FP-071:** still one Portal-editable Continuable at a time; override does not create a second editable cart.
- **Completed/queued requests:** not part of working-request usage (they are no longer the working cart). Their quantities may still count toward **Show quota** via allocations.

### Customer Show quota usage

```
usageOnShow = Σ showAllocations.allocatedQuantity
  where customerId == customer
    and upcomingShowId == show
    and status !== "canceled"
allow queue when usageOnShow + newRequestQty ≤ effectiveMaxQuantityPerShowPerCustomer
```

- **Canceled allocations** (Portal Editing unqueue/parking, Show Move source cancel, DNP cancel-on-source): **excluded** — already correct; preserve.
- **Printed / done / queued active statuses:** still consume allotment (by design).
- **Physical show capacity** checked separately via `maxTotalQuantity − allocatedQuantity`.

---

## Enforcement matrix (authoritative today → proposed)

| Action | Callable / path | Quota | Usage source | Global setting | Proposed override | Required change | Staff vs customer |
|--------|-----------------|-------|--------------|----------------|-------------------|-----------------|-------------------|
| Add catalog design | `addPortalCatalogDesignToPrintRequest` | PR | item qty sum on request | `maxQuantityPerPrintRequest` | customer effective PR | load + resolve effective | Portal customer only |
| Upload attach | `confirmCustomerUploadsAndAttachToRequest` | PR | same | same | same | same | Portal customer |
| Duplicate item | `duplicatePortalPrintRequestItem` | PR | same | same | same | same | Portal customer |
| Qty update | `updatePortalPrintRequestItemQuantity` | PR | same (clamp) | same | same | same | Portal customer |
| Assisted proof add | `customerAddAssistedApprovedProofToPrintRequest` | PR | same | same | same | same | Portal customer |
| Queue to show | `queuePortalPrintRequestToShow` | PR + Show | remaining unallocated qty; non-canceled allocs | both fields | both effective | resolve both; keep physical capacity separate | Portal customer |
| List allocatable shows | `listPortalAllocatableShows` | Show (display usage) | non-canceled allocs by customer | *(returns usage only; limit from client settings)* | Portal must use effective show limit for remaining copy | either return effective limits from callable **or** Portal reads customer override + shared resolver | Portal customer |
| Studio edit items / qty | Studio Firestore client (`printRequestService`) | **none today** | n/a | n/a | **no new enforcement** | preserve staff bypass | Staff |
| Studio Add to Show / split | Studio allocate + capacity UI | physical show only | show.allocatedQuantity | n/a | **no customer show quota** | preserve | Staff |
| Show Queue Move | `previewShowQueueMove` / apply (`showQueueMove`) | physical only | n/a | n/a | none | preserve | Staff |
| Did Not Print requeue | `previewShowProductionRecovery` / requeue apply | physical only | n/a | n/a | none | preserve | Staff recovery |

**Studio staff policy (preserve):** Portal customer quotas apply to **Portal customer callables only**. Studio operational paths bypass customer PR/Show quotas today and must continue to, unless Owner later decides otherwise ([NEEDS OWNER DECISION] only if Owner wants staff tightened — default: **keep bypass**).

---

## Portal display matrix (must use effective limits)

| Surface | Shows | Today source | Change |
|---------|-------|--------------|--------|
| `PortalWorkingRequestLimitBanner` | remaining / max for request; help modal request+show | global settings via `usePortalWorkingRequestLimitState` | effective PR + effective Show |
| Current Request / add flows | full / room / blocked copy | same | effective PR |
| `CustomerUploadPanel` | print slots remaining / full overlay | same | effective PR |
| `PortalQueueToShowModal` | over-request-limit; personal spots; fit vs customer cap | `customerShowLimit` + usage from list callable | effective Show (+ PR for over-limit) |
| `buildPortalPersonalShowUsage` | “Your print spots: used of limit” | caller-supplied limit | pass effective Show |
| Callable error mapping | `WORKING_REQUEST_PRINT_LIMIT` / show-cap messages | server cap in error payload | server already authoritative if Functions use effective |

Preferred customer copy: accurate effective allowance/remaining. **No** “staff override” admin terminology required.

---

## Distinctions (must not conflate)

| Concept | Relation |
|---------|----------|
| ADR-FP-071 Continuable ownership / parking | Separate; override must not allow two editable carts |
| Legacy Cap A / `printRequestDesignDailyLimits` | Retired; do not revive |
| Show physical capacity `maxTotalQuantity` | Separate; override must not raise show capacity |
| Studio capacity danger override | Separate staff physical-capacity tool |
| Customer upload quotas (ADR-FP-095) | Out of scope |
| 200 DPI / 22-inch sizing | Out of scope; never overrideable here |

---

## Approach

### 1. Effective-limit model (shared resolver)

Illustrative names only — implement with audited field names:

```
effectivePrintRequestQuota =
  activeOverride.maxQuantityPerPrintRequest
  ?? global.maxQuantityPerPrintRequest

effectiveShowQuota =
  activeOverride.maxQuantityPerShowPerCustomer
  ?? global.maxQuantityPerShowPerCustomer
```

**Active override** when stored policy exists **and** `(expiresAt == null || now < expiresAt)` **and** at least one dimension is a valid positive int override. Expired stored fields are ignored authoritatively without a scheduled Function.

One shared resolver in `packages/shared` used by Functions, Portal, and Studio visibility.

### 2. Independent nullable overrides

Staff may set PR only, Show only, or both. Clearing one dimension leaves the other. Global `linkPrintRequestAndCustomerShowLimits` does **not** force customer override equality.

### 3. Temporary semantics — recommend OPTION C

| Option | Description | Plan stance |
|--------|-------------|-------------|
| A | Manual until clear | Supported as subset of C |
| B | Required expiration | Rejected as sole model |
| C | Optional `expiresAt` + always-available Clear | **Recommended** |

**[NEEDS OWNER DECISION]** Confirm OPTION C (or choose A/B) before/at implement start. Formal Review may approve plan conditional on this.

Expiration: time-based inactive; no scheduler required. Lazy cleanup optional.

### 4. Over-limit after lower/clear/expire

Do **not** delete/resize/cancel existing work. Future quota-consuming Portal actions reject until usage ≤ effective limit (matches today’s over-limit Continuable / show-cap behavior).

### 5. Data model — nested optional policy on `customers/{customerId}`

**Decision: Option A (fields on customer doc) as a single nested map**, not a parallel quota system.

Proposed schema (additive):

```ts
/** Optional; absent = full global defaults. */
printRequestQuotaOverride?: {
  /** Null/absent = no override for this dimension. */
  maxQuantityPerPrintRequest?: number | null;
  maxQuantityPerShowPerCustomer?: number | null;
  /** Null/absent = no expiration (manual clear only). */
  expiresAt?: Timestamp | null;
  updatedAt: Timestamp;
  updatedBy: string; // staff uid
};
```

**Why not dedicated doc:** Portal customers already can read their own `customers/{id}`; Functions already load customer context; lookup is by id (no index). Dedicated doc would add a second read path without Rules simplicity gains once customer allowlist is updated carefully.

**Why Admin callable writes:** Customer must never write override. Staff client `customerRequiredFieldsValid` uses strict `hasOnly` — once Admin writes nested fields, staff client updates fail unless allowlisted. Plan:

1. Add `printRequestQuotaOverride` to Rules `hasOnly`.
2. Staff client updates: override map must be **unchanged** vs existing (client-immutable), same pattern as protected identity fields.
3. Mutating callable (Admin SDK) for set/clear.

No Secret Manager / env values. No migration backfill.

### 6. Trusted mutation API

New callable e.g. `updateCustomerPrintRequestQuotaOverride` (final name in implement):

- Auth: staff
- Authorize: **owner only** by default (matches `updatePrintRequestLimitSettings` / `canManageCustomerUploadQuotas`)
- Validate bounds 1–10000 per provided dimension; allow null to clear a dimension; clear-all action
- Write customer nested map; append `customerActivityEvents`
- Return resolved effective + global for Studio UI

**[NEEDS OWNER DECISION]** Owner-only vs owner+admin mutation (view: owner+admin via Users already).

Helper: **cannot** view Users (`canViewUsers` = owner/admin only) → no Helper view/mutate path needed.

### 7. Studio UX

Location: **Users → Customers → User Info** (`UserAuditTrailModal` / profile area) — **Quota Override** section.

Show:

- Global default PR / Show (live from settings)
- Override inputs or “Use global”
- Temporary until (optional datetime) / no expiration
- Save Override / Clear Override
- Badge: **Quota Override Active** with effective vs global

Users-list compact badge: **recommended** (optional chip when active override present) — low spam; detail remains source of truth.

Do **not** add a top-level workspace. Do **not** redesign global Settings.

### 8. Portal UX

Enhance limit hydration so effective limits include customer override (subscribe to own customer doc override + settings, or callable-enriched limits). Customer-facing numbers only.

### 9. Auditability

Extend `CustomerActivityEventType` (existing `customerActivityEvents`):

- `account.quota_override_set` (create/update; metadata: before/after dimensions, expiresAt)
- `account.quota_override_cleared`

No event required for time-based expiration (no write). Studio Account Activity already lists these events.

### 10. Firestore Rules / Storage / indexes

| Area | Impact |
|------|--------|
| Firestore Rules | **Yes** — allowlist + client-immutability for `printRequestQuotaOverride`; customer self-write keys unchanged |
| Storage Rules | **None** |
| Indexes | **None** (direct doc get by customerId) |
| Migration | **None** (absent = global) |

### 11. Functions deploy scope (later; not this phase)

Expected DEV Functions after implement:

- New: `updateCustomerPrintRequestQuotaOverride` (name TBD)
- Updated consumers: `addPortalCatalogDesignToPrintRequest`, `confirmCustomerUploadsAndAttachToRequest`, `duplicatePortalPrintRequestItem`, `updatePortalPrintRequestItemQuantity`, `customerAddAssistedApprovedProofToPrintRequest`, `queuePortalPrintRequestToShow`
- Optional UX consistency: `listPortalAllocatableShows` if returning effective limits simplifies Portal

Also: shared package + Studio + Portal + Rules deploy inventory for DEV checkpoint.

---

## Scope

### In Scope

- Customer-specific override for PR and/or Show limits
- Shared effective-limit resolver
- Studio User Info UX + optional list badge
- Portal messaging/enforcement alignment
- Owner-authorized callable + Rules + activity events
- Tests + Owner QA plan (DEV customers A/B)

### Out of Scope

- Changing global Settings model (keep as site default)
- Smart Profiling; batch-allocation performance
- Upload quotas; DPI/size safety; Cap A revival
- Raising show physical capacity
- Tightening Studio staff bypass (preserve unless Owner decides)
- Production deploy
- Scheduled cleanup Functions

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/printRequest/*` (+ new effective-limit util/types)
- `packages/shared/src/types/customer/customer.types.ts`
- `packages/shared/src/types/customer/customerActivityEvent.types.ts`
- `functions/src/lib/loadPrintRequestLimitSettings.ts` (+ new load/resolve override helper)
- Portal quota callables listed above
- New Functions callable for set/clear
- `apps/portal/.../portalPrintRequestLimitService.ts` (+ customer override hydration)
- Portal banner / queue / upload surfaces (consume effective)
- `apps/studio/.../users/` User Info section + optional directory badge
- `firestore.rules` customer allowlist / immutability
- Docs: `DATA_MODEL.md`, `BACKEND.md`, `DECISIONS.md` (ADR), possibly `SECURITY.md`

### Architecture Impact

- [x] Details: new customer policy nested field + shared resolver; no second quota system; Portal still settings-driven with customer override layer

### Security Impact

- [x] Details: Admin-only mutation; customer cannot write; Helper has no Users access; no secrets

### Data Model Impact

- [x] Details: additive optional `printRequestQuotaOverride` on `customers/{id}`

### Backend Impact

- [x] Details: Functions + Rules; no env/secrets

### UI / UX Impact

- [x] Details: Studio User Info + optional badge; Portal effective counts; manual Owner QA required

### Migration Impact

- [x] None (additive; absent = global)
- Rollback: clear overrides + redeploy prior Functions/Rules/clients; or ignore override fields in resolver

---

## Test Strategy

### Automated

| Check | Command / target | Required |
|-------|------------------|----------|
| Unit | shared effective-limit resolver; expiration active/inactive; independent nullables; counting helpers unchanged | yes |
| Unit | Functions validation / permission for override callable | yes |
| Contract | Rules alignment test for customer allowlist + immutability | yes |
| Existing | working-request max + per-show cap tests still pass | yes |
| Typecheck / lint / build | project scripts for touched packages | yes |
| E2E | not required if Owner QA covers A/B customers | no |

### Manual (Owner QA — DEV)

Two DEV customers: **A** (override) / **B** (none). Checklist in Formal Review / future test phase (scenarios 1–18 + A–O from Owner request).

---

## Human Checkpoints Anticipated

- [x] Business logic decision — expiration OPTION C vs A/B; mutate owner vs owner+admin
- [x] Manual UI/UX review — Studio override section + Portal counts
- [x] DEV Functions/Rules deploy after implement (human)
- [ ] Production deploy — **NOT AUTHORIZED**
- [ ] Secrets / env — none expected
- [ ] Database migration — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Portal shows global while server uses override | High | Shared resolver; Portal hydrates customer override |
| Staff client customer update breaks after Admin writes override | High | Rules allowlist + client-immutability |
| Expired override still applied | High | Time check in resolver; no scheduler dependency |
| Canceled allocs double-count after parking | High | Keep `status !== canceled` exclusion; regression tests |
| Override raises show capacity accidentally | High | Keep physical capacity checks separate |
| Scope creep into Cap A / ownership | Med | Explicit out-of-scope + review checklist |

---

## Rollback Plan

1. Clear any DEV overrides via Clear action or Admin delete of nested field.
2. Redeploy prior Functions/Rules/Portal/Studio/shared.
3. Resolver treating missing/invalid override as global is forward-compatible.

---

## Documentation Updates Required

- [x] DATA_MODEL.md — customer override schema
- [x] BACKEND.md — callable + enforcement note
- [x] DECISIONS.md — ADR for per-customer temporary quota override
- [ ] SECURITY.md — brief trusted-write note if needed
- [ ] ROADMAP.md — fast-follow item status on signoff
- [ ] STYLE_GUIDE.md — only if new Studio patterns need note

---

## Open Questions

- [ ] **[NEEDS OWNER DECISION]** Expiration model: confirm **OPTION C** (optional expiresAt + Clear).
- [ ] **[NEEDS OWNER DECISION]** Mutation role: confirm **owner-only** (match global Settings) vs owner+admin.
- [ ] **[NEEDS OWNER DECISION]** Users-list badge: include compact badge? Plan recommends **yes**.

Non-blocking for Formal Review approval-with-changes if Review locks defaults.

---

## Acceptance scenarios (plan tests)

1–18 as specified by Owner (no override; PR-only; Show-only; both; clear one; clear all; global change under override; expire; over-limit after fallback; A≠B isolation; Portal==server; no client bypass; customer cannot write; staff permission; parking intact; physical capacity intact; DPI intact; Cap A retired).

---

## Production inventory (future promote — not now)

| Surface | Likely |
|---------|--------|
| Shared | YES |
| Portal | YES |
| Studio | YES |
| Functions | YES |
| Firestore Rules | YES |
| Storage Rules | NO |
| Indexes | NO |
| Migration | NO |
| Firebase deploy | YES (Functions + Rules) on promote |

**Production status: NOT AUTHORIZED.**

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-review.md`
- Verdict: pending
