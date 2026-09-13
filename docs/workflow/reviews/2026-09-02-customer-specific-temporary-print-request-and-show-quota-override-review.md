# Review: Customer-specific temporary Print Request + Show quota override

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-plan.md` |
| Verdict | **approved_with_changes** |
| Baseline | `c050a0bfd02f53098e6c36697381a7657b661c5a` (= `origin/development`) |
| Phase gate | Plan + Formal Review only — **STOP before implement** |

---

## Summary

Repo audit confirms the owner’s two Studio quotas are the dual fields on `settings/printRequestLimits`: `maxQuantityPerPrintRequest` (Print Request quota) and `maxQuantityPerShowPerCustomer` (Customer Show quota), defaults **20**, with optional global linking. The plan correctly layers a per-customer temporary override via an additive nested customer field, a shared effective-limit resolver, Portal/Functions enforcement alignment, and Studio User Info UX — without reviving Cap A, touching show physical capacity, or breaking parking/Editing. Formal Review **approves with changes**: lock recommended defaults for expiration/permissions/badge unless Owner overrides, and keep staff Portal-quota bypass explicit.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Fast-follow override only; production excluded |
| Architecture alignment | pass | Shared resolver; no second quota system |
| Security impact addressed | pass | Admin callable; customer cannot write; Rules immutability |
| Data model impact addressed | pass | Additive nested map; no backfill |
| Backend impact addressed | pass | Functions list + Rules; no secrets |
| Test strategy adequate | pass | Unit + Rules alignment + Owner QA A/B |
| Human checkpoints identified | pass | Expiration/role decisions; DEV deploy later; prod NOT authorized |
| Roadmap alignment | pass | Phase 8 operational fast-follow |
| Documentation plan | pass | DATA_MODEL / BACKEND / DECISIONS |
| No silent scope expansion | pass | Cap A / upload / DPI / Smart Profiling out |

---

## Formal answers (required output)

### 1. Prerequisite / baseline result

**PASS.** HEAD == `origin/development` == `c050a0bfd02f53098e6c36697381a7657b661c5a`; working tree clean except `.worktrees/`; prior goal closed; FreshForge was IDLE/DONE.

### 2. Exact existing global PR quota field

`maxQuantityPerPrintRequest`

### 3. Exact existing global Show quota field

`maxQuantityPerShowPerCustomer`

### 4. Settings Firestore path

`settings/printRequestLimits`

### 5. Current global Settings UI path/component

Studio **Settings → Print request limits** tab → `PrintRequestLimitSettingsSection` (gated by `canManageCustomerUploadQuotas` = **owner**). Callable write: `updatePrintRequestLimitSettings` (**owner only**).

### 6. Current defaults

Both numeric fields default to **20** when missing/invalid (`PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER`). Bounds **1–10000**. Missing PR field falls back to Show field then 20.

### 7. Current link/unlink behavior

`linkPrintRequestAndCustomerShowLimits` (absent → **true**). Linked saves force equal numerics. Unlinked allows independent global values. **Does not apply to customer overrides** — overrides remain independently nullable.

### 8. Exact meaning of PR quota

Max total **print quantity** (`Σ item.quantity`) allowed on **one** Portal working / Current Request.

### 9. Exact meaning of Show quota

Max cumulative **print quantity** one customer may allocate to **one** show across all requests (non-canceled allocations; ADR-FP-122).

### 10. Exact counting algorithms

**PR:** `sumPrintRequestItemQuantities(workingItems)` on the active editable Continuable only; no time window; not request-count; parked draft excluded from that sum.

**Show:** `sumCustomerQuantityOnShow` = sum `allocatedQuantity` where `status !== "canceled"` for that `customerId` + show; printed/done still count; canceled do not.

### 11. All Portal display surfaces

- `PortalWorkingRequestLimitBanner` (remaining/max + help modal)
- Add-design / Current Request full-room messaging (`useAddDesignToRequestFlow`, exhausted copy)
- `CustomerUploadPanel` print-slot overlay / room hint
- `PortalQueueToShowModal` (over-request-limit; personal spots; fit vs customer cap)
- `buildPortalPersonalShowUsage` / selected-show usage labels
- Callable error mapping (`mapPortalPrintRequestCallableError`)

All must use **effective** limits after this feature.

### 12. All authoritative enforcement paths

Portal callables: `addPortalCatalogDesignToPrintRequest`, `confirmCustomerUploadsAndAttachToRequest`, `duplicatePortalPrintRequestItem`, `updatePortalPrintRequestItemQuantity`, `customerAddAssistedApprovedProofToPrintRequest`, `queuePortalPrintRequestToShow` (PR + Show). Display usage: `listPortalAllocatableShows` (usage only today).

### 13. Studio staff enforcement / bypass behavior

**Bypass confirmed.** Studio item edits and Add-to-Show / split use Firestore staff paths and physical `maxTotalQuantity` only — **not** Portal PR/Show customer quotas. **Preserve** this policy.

### 14. Legacy Cap A distinction

`dailyDesignsAddedToRequestsLimit` + `printRequestDesignDailyLimits` are retired / unenforced. Do not revive or base override on them.

### 15. ADR-FP-071 distinction

One Portal-editable Continuable ownership remains separate. Override changes quantity limits only; does not allow two simultaneous editable carts. Parking contract stays intact.

### 16. Show physical capacity distinction

`upcomingShows.maxTotalQuantity` and Studio capacity danger override are separate. Customer Show quota override must not raise physical capacity.

### 17. Canceled allocation behavior

Canceled rows already excluded from Show quota. Preserve — critical after Portal Editing parking / unqueue retaining canceled allocations.

### 18. Editing / parked draft behavior

PR quota counts **active working request items only**. Parked draft does not add a second cart’s quantity into the working max. Show quota is allocation-based, not draft-based.

### 19. Show Move behavior

Staff Show Queue Move does **not** enforce customer Show quota (physical capacity only). Preserve; no double-consumption logic needed beyond cancel-source + create-destination (canceled source frees customer Show usage).

### 20. Did Not Print behavior

DNP requeue is staff recovery with physical capacity checks only — **no** customer Show quota. Preserve.

### 21. Recommended customer override schema

Nested optional on `customers/{customerId}`:

```ts
printRequestQuotaOverride?: {
  maxQuantityPerPrintRequest?: number | null;
  maxQuantityPerShowPerCustomer?: number | null;
  expiresAt?: Timestamp | null;
  updatedAt: Timestamp;
  updatedBy: string;
};
```

### 22. Independently nullable values

**Yes.** Confirmed. Global link does not apply.

### 23. Temporary / expiration recommendation

**OPTION C** — optional `expiresAt` + always-available Clear.  
**[NEEDS OWNER DECISION]** confirm C (plan default if Owner silent at implement start: **C**).

### 24. Manual-clear behavior

Clear one dimension or clear all; immediate fallback to **current** global values for cleared dimensions.

### 25. Expired override behavior

`now >= expiresAt` → override inactive in resolver even if stale fields remain; no scheduled Function required.

### 26. Effective-limit resolver design

Shared `packages/shared` helper: load global settings + customer override → `{ effectiveMaxQuantityPerPrintRequest, effectiveMaxQuantityPerShowPerCustomer, overrideActive, … }`. Single precedence path for Functions, Portal, Studio.

### 27. Behavior when currently over fallback

Do not mutate existing work. Future Portal quota-consuming actions blocked until usage ≤ effective limit (existing over-limit / show-cap semantics).

### 28. Customer-doc vs dedicated-doc decision

**Customer doc nested map.** Fits existing customer read by Portal self; Functions already load customer; Rules need allowlist + client-immutability because of `hasOnly`. Dedicated doc rejected as unnecessary for this lookup pattern.

### 29. Studio customer-management UX location

**Users → Customers → User Info** (`UserAuditTrailModal` profile area) — Quota Override section. Not global Settings; no new top-level workspace.

### 30. Active override visibility

Required on User Info: **Quota Override Active** + effective vs global. Compact Users-list badge: **recommended yes** (Owner may decline).  
**[NEEDS OWNER DECISION]** badge yes/no — default implement **yes**.

### 31. Portal customer-facing messaging

Show effective max / used / remaining / limit-reached. No admin “override” jargon required.

### 32. Audit event strategy

Append to `customerActivityEvents`:

- `account.quota_override_set`
- `account.quota_override_cleared`

No write/event required for pure time expiration.

### 33. Owner / admin / helper permissions

| Action | Role |
|--------|------|
| View Users / User Info | owner, admin |
| Mutate global Settings quotas | **owner only** (precedent) |
| Mutate customer override | **owner only** (recommended; matches Settings) |
| Helper | no Users access → no view/mutate |

**[NEEDS OWNER DECISION]** mutate owner-only vs owner+admin — default **owner-only**.

### 34. Exact Functions impacted

- **New:** `updateCustomerPrintRequestQuotaOverride` (name TBD at implement)
- **Update:** `addPortalCatalogDesignToPrintRequest`, `confirmCustomerUploadsAndAttachToRequest`, `duplicatePortalPrintRequestItem`, `updatePortalPrintRequestItemQuantity`, `customerAddAssistedApprovedProofToPrintRequest`, `queuePortalPrintRequestToShow`
- **Optional:** `listPortalAllocatableShows` if returning effective caps for UX consistency

### 35. Exact Rules changes

`firestore.rules` `customerRequiredFieldsValid` `hasOnly` add `printRequestQuotaOverride`; staff client updates must keep override map **unchanged**; customer self-write allowlist unchanged (still notification prefs only).

### 36. Storage Rules impact

**None.**

### 37. Indexes

**None.**

### 38. Migration / backfill

**None.** Absent override ⇒ global defaults.

### 39. Exact files expected to change

Shared constants/utils/types; Functions loaders + listed callables + new callable; Portal limit service + banner/queue/upload consumers; Studio Users User Info section (+ optional directory badge); `firestore.rules`; docs DATA_MODEL / BACKEND / DECISIONS (+ tests).

### 40. Tests planned

- Shared resolver unit (independent dims, expire, clear, global fallback)
- Existing working-request max + per-show cap suites still pass with effective injection
- Override callable validation/permission tests
- Rules alignment / immutability contract
- Regression: canceled allocations excluded; parking ownership unchanged
- Typecheck/lint/build for touched packages

### 41. DEV deploy scope expected after implementation

Shared + Studio + Portal clients; Functions (new + updated); Firestore Rules. **No** Storage/indexes/migration. Human DEV deploy checkpoint after implement/test — **not** this phase.

### 42. Owner QA checklist (future)

DEV customers A (override) / B (none):

- A–O from Owner request (global unchanged; A badge/active; B none; PR/Show effective vs global; single-dimension; clear; expire if C; Portal==server; no bypass; parking; canceled allocs; no destroy on lower/clear)

### 43. Production promotion inventory

Studio YES · Portal YES · Shared YES · Functions YES · Firestore Rules YES · Storage NO · Indexes NO · Migration NO.

### 44. Production status

**NOT AUTHORIZED.**

### 45. [NEEDS OWNER DECISION]

1. Expiration model — recommend **OPTION C** (default if silent).
2. Mutate permission — recommend **owner-only** (default if silent).
3. Users-list badge — recommend **yes** (default if silent).

Non-blocking for this Formal Review stop gate; implement phase must record Owner answers in Decision Log if they differ from defaults.

---

## Enforcement matrix (review-confirmed)

| Action | Callable/service | Quota | Usage | Global | Override | Change | Staff/customer |
|--------|------------------|-------|-------|--------|----------|--------|----------------|
| Catalog add | `addPortalCatalogDesignToPrintRequest` | PR | item qty sum | `maxQuantityPerPrintRequest` | customer PR effective | yes | customer |
| Upload attach | `confirmCustomerUploadsAndAttachToRequest` | PR | same | same | same | yes | customer |
| Duplicate | `duplicatePortalPrintRequestItem` | PR | same | same | same | yes | customer |
| Qty update | `updatePortalPrintRequestItemQuantity` | PR | same | same | same | yes | customer |
| Assisted add | `customerAddAssistedApprovedProofToPrintRequest` | PR | same | same | same | yes | customer |
| Queue | `queuePortalPrintRequestToShow` | PR+Show | remaining qty; non-canceled allocs | both | both effective | yes | customer |
| List shows | `listPortalAllocatableShows` | Show usage display | non-canceled allocs | client limit today | Portal effective Show | hydrate effective | customer |
| Studio edit/allocate | Studio services | — / physical | — | — | none | **no** | staff bypass |
| Show Move / DNP requeue | move/recovery libs | physical | — | — | none | **no** | staff |

---

## Architecture Review

**Findings:**

- Effective-limit layering over existing dual fields is correct; avoids parallel counters.
- Nested customer policy + Admin callable matches security and `hasOnly` constraints.
- Staff Portal-quota bypass correctly preserved.

**Required changes:**

- [x] At implement: treat the three Owner decisions as defaults above unless Owner replies otherwise; log answers in workflow Decision Log before coding starts.
- [x] Explicitly keep Studio/Show Move/DNP out of customer quota enforcement in implementation checklist.

---

## Security Review

**Findings:**

- Customer self-write cannot include override (narrow allowlist).
- Owner-only mutate matches global quota Settings precedent.
- No secrets.

**Required changes:**

- [ ] None beyond plan Rules immutability for staff client updates

**Human approval needed before production:**

- [x] Production Functions + Rules promote (future; not now)

---

## Data Model Review

**Findings:**

- Additive nested map; migration-free.
- Expiration time-based; no scheduler.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- Functions impact list complete for PR enforcement; Show enforcement centered on `queuePortalPrintRequestToShow`.
- `listPortalAllocatableShows` optional enhancement acceptable.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:**

- Automated + Owner QA A/B sufficient; manual checkpoint required for Studio UX and Portal counts.

**Required changes:**

- [ ] None

---

## Documentation Review

**Findings:**

- DATA_MODEL / BACKEND / DECISIONS (ADR) required in implement/signoff.

---

## Required Changes (approved_with_changes)

1. Lock implement defaults: **OPTION C** expiration; **owner-only** mutate; **Users-list badge yes** — unless Owner decides otherwise before implement.
2. Preserve Studio / Show Move / DNP **bypass** of customer PR/Show quotas.
3. Do not implement until Owner authorizes Implement phase (this review stop gate).

---

## Blockers

None for Formal Review. Implement is **forbidden** until Owner says to proceed.

---

## Verdict Rationale

Plan is accurate to current source, correctly distinguishes Cap A / ownership / physical capacity, proposes the smallest safe override architecture, and lists complete enforcement/display matrices. Conditional approval records three soft Owner decisions as implement defaults without blocking the Plan→Review stop gate.

---

## Next Step

**STOP.** Await Owner authorization to start **Implement** (and any Owner decision replies). Do not deploy. Do not modify production. Smart Profiling remains PARKED; batch-allocation remains DEFERRED.
