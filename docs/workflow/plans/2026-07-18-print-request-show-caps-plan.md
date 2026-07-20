# Plan: Print request & show design caps + Studio Settings (Backlog #3 expanded)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review → **approved_with_changes** (review) → **amended Cap A print-count + refunds** |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-print-request-show-caps-review.md |

---

## Amendment (2026-07-18, owner FAIL Cap A)

Cap A counts **print quantity** (sum of `printRequestItems.quantity`), not designs/lines.

- Charge: new item total qty; qty increase delta; library / upload / assisted / duplicate by qty.
- Refund: qty decrease delta; remove item (item qty); clear Current Request (sum). Same America/Chicago day; floor at 0.
- Copy: prints / print count everywhere (banner, drawer, errors, Settings). Default remains **20** if Settings already saved.
- Help modal: plain language + size×qty example; no jargon. Banner stays short; ? opens modal.
- Cap B unchanged (already quantity-based).
- New callables: `updatePortalPrintRequestItemQuantity`, `removePortalPrintRequestItem`. Customer rules: no qty change / no delete client-side.
- After deploy: wipe Cap A counters on `fresh-prints-dev` (old line-based counters).

---

## Goal

Ship **both** settings-backed caps under one Studio Settings section (“Print request limits”), with Functions enforcement, Portal remaining/errors UX, soft deploy to `fresh-prints-dev` only, and unit tests for day-key + charge/reject logic. Stop for owner manual QA (no production).

## Background

- **Backlog #3** was originally “cap quantity per show queue per customer” only.
- Owner confirmed wrapping a new anti-flood need into #3 and allowed shipping one or both caps; **authoritative product decision: ship both**.
- Prior investigation: no daily add-to-request cap exists; upload quotas ≠ this. Flood path = fill request → queue show → new request → repeat.
- Clarification stub: `docs/workflow/plans/2026-07-18-small-items-2-3-settings-caps-notes.md`.
- Prior workflow (upload-limits Portal polish) parked: owner moved on to #3; upload manual QA PASS deferred.

### Best decision (authoritative)

| Cap | Why |
|-----|-----|
| **A. Daily designs added to print requests** | Primary anti-flood. Count **+1 per new `printRequestItems` line** (library create, upload attach per new line, assisted add, duplicate). Reset **midnight America/Chicago (CST/CDT)**. Portal: “X of Y designs left today (resets at midnight Central).” |
| **B. Max quantity per show per customer** | Original #3. When queueing to a show, sum this customer’s quantity already on that show + new request total; reject if over. Prevents dumping the whole daily budget onto one show. |

One cap alone is weaker: A without B still allows all daily designs on the next show; B without A still allows many shows across the day.

**Defaults (unless docs already specify otherwise — they do not):**

| Cap | Default |
|-----|---------|
| A | **25** designs/day (Chicago calendar day) |
| B | **15** total quantity units per show per customer |

Owner can change both in Studio. Do **not** block implementation on default tweaks; ask only if owner says 25/15 is wrong.

**Charge rules for Cap A (precise):**

- **Charges:** creating a **new** `printRequestItems` document (catalog library new line, each upload attach line, assisted approved proof line, duplicate item).
- **Does not charge:** quantity increment/update on an existing line; remove item; size edits; queue-to-show itself.
- Multi-line attach (e.g. N uploads confirmed) charges **N** atomically (reject if remaining &lt; N).

**Cap B (precise):**

- On `queuePortalPrintRequestToShow`: `existingOnShowQty` = sum of `showAllocations.allocatedQuantity` for this `customerId` + `upcomingShowId` where allocation status is **active** (not canceled / not completed-cancelled equivalents — use same “counts toward show” statuses as capacity math, excluding canceled).
- `newRequestQty` = sum of this request’s item quantities.
- Reject if `existingOnShowQty + newRequestQty > maxQuantityPerShowPerCustomer`.
- Show’s own `maxTotalQuantity` capacity check remains unchanged (separate concern).

---

## Scope

### In Scope

1. Shared constants + settings doc pattern (mirror `customerUploadQuotas`).
2. Studio Settings UI section “Print request limits” (blank-ok edit, select-on-focus, soft borders like upload quotas polish).
3. Owner-only update callable; Firestore rules read for owner (write false — Admin SDK only).
4. Cap A: Chicago day-key helpers + rate-limit charge collection; enforce on upload attach, assisted add-to-request, duplicate item, **and library add via new callable** (replace bypassable client `setDoc` create).
5. Cap B: enforce on `queuePortalPrintRequestToShow` (and any related Portal queue path if present — currently this callable only).
6. Portal UX: remaining for Cap A near Current Request / add flows; clear errors for A and B (no em dashes in UI).
7. Callable to read remaining Cap A quota for Portal display.
8. Unit tests: Chicago day key + charge/reject helpers.
9. Soft deploy needed Functions (+ rules if customer create of `printRequestItems` is closed) to `fresh-prints-dev`.
10. Update ROADMAP #3 text to expanded scope; update workflow `state.md`.
11. Manual QA checklist; stop for owner PASS.

### Out of Scope

- Production deploy.
- Changing upload/donation daily quotas.
- Cap on quantity increments of existing lines.
- Cap on number of shows per day (beyond A+B interaction).
- Staff/Studio internal print request item creates.
- Closing prior upload-limits manual QA (parked / PASS deferred).

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|-------|
| Shared constants | `packages/shared/src/constants/printRequest/` (new: limits + settings constants + tests) |
| Shared types | Portal quota response types; callable request/response for library add |
| Shared utils | Cap A day-key + charge/reject pure helpers; Cap B sum/reject helpers + tests |
| Functions | `lib/printRequestDailyLimit.ts` (or similar), charge helpers; wire into `confirmCustomerUploadsAndAttachToRequest`, `customerAddAssistedApprovedProofToPrintRequest`, `duplicatePortalPrintRequestItem`, **new** `addPortalCatalogDesignToPrintRequest` (name TBD), `queuePortalPrintRequestToShow`; `updatePrintRequestLimitSettings`, `getPrintRequestDailyDesignQuota`; `index.ts` exports |
| Firestore rules | `settings/printRequestLimits` owner read; **deny customer create** on `printRequestItems` (Admin/callable only) — keep customer update/delete for quantity/size/remove as today |
| Indexes | Composite on `showAllocations` (`upcomingShowId` + `customerId`) if not present |
| Studio | Settings section + hook + service (pattern of `CustomerUploadQuotaSettingsSection`) |
| Portal | Replace library create path in `portalPrintRequestService` / `useAddDesignToRequestFlow` with callable; remaining quota UI near Current Request; map errors |
| Docs | `BACKEND.md`, `DATA_MODEL.md` (settings + rate-limit collection), `SECURITY.md` (rules note), `ROADMAP.md` #3, `DECISIONS.md` ADR brief |

### Architecture Impact

- [x] Details: Library catalog **new line** moves from client Firestore write → authenticated callable (Admin write). Quantity update on existing catalog lines stays client. Cap A/B business rules live in Functions + shared pure helpers. Settings follow existing `settings/{doc}` + owner callable pattern.

### Security Impact

- [x] Details: Cap enforcement must not be client-only. Closing customer `create` on `printRequestItems` removes bypass of Cap A via direct `setDoc`. Settings write owner-only via callable. Rate-limit docs written only by Admin SDK.

### Data Model Impact

- [x] Details:
  - New `settings/printRequestLimits` fields: `dailyDesignsAddedToRequestsLimit` (default 25), `maxQuantityPerShowPerCustomer` (default 15), `updatedAt`, `updatedBy`.
  - New collection e.g. `printRequestDesignDailyLimits` docs `{uid}_{yyyyMMdd}` with Chicago day key; field `designsAddedCount` (or similar).
  - No change to `printRequestItems` schema.

### Backend Impact

- [x] Details: New/updated callables listed above. Soft deploy `fresh-prints-dev` only. Env: document code defaults in Settings help + constants (no required new secret). Optional `.env` documentation of defaults for operators.

### UI / UX Impact

- [x] Details: Studio Settings new section; Portal remaining copy for Cap A; clear HttpsError messages for A/B. No em dashes in UI strings. Manual QA required.

### Migration Impact

- [x] Forward: Additive settings doc + rate-limit collection; missing settings → code defaults.
- [x] Rollback: Redeploy prior Functions; re-allow customer create in rules if rolled back; settings doc can remain unused.

---

## Approach

1. **Shared layer**
   - Constants: defaults 25 / 15, bounds (e.g. 1–10_000), doc id `printRequestLimits`.
   - `resolve` / `parse` settings (mirror upload quotas).
   - Pure helpers: `chicagoDayKey(date)`, charge ok/reject, Cap B `wouldExceedPerShowCustomerCap(...)`.
2. **Functions Cap A**
   - Load settings; transactional charge N against daily doc; exhausted → `failed-precondition` with plain message including Central midnight reset.
3. **Library add callable**
   - Port logic from `addOrIncrementCatalogDesign` / `addPrintRequestItem` server-side.
   - If existing primary line → quantity update only (no Cap A charge).
   - If new line → charge 1 then create item + bump `itemCount`.
4. **Wire Cap A** into attach / assisted / duplicate (charge before or inside same transaction as item create).
5. **Cap B** in `queuePortalPrintRequestToShow` after loading items; query allocations for show+customer; reject with clear message.
6. **Rules + indexes** as needed; export callables.
7. **Studio Settings UI** (blank-ok, select-on-focus, soft borders).
8. **Portal** callable for remaining; show near Current Request / add flows; swap library create to callable; map errors.
9. **Docs + ROADMAP #3**; unit tests; deploy `fresh-prints-dev`; manual QA doc; stop.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `pnpm` / package typecheck for shared + functions + affected apps | yes |
| Lint | project lint if configured for touched packages | yes if available |
| Unit tests | Chicago day-key; Cap A charge/reject; Cap B sum/reject; settings parse/resolve | yes |
| Build | as needed for deploy | soft |
| Integration | not required beyond unit | no |
| E2E | no | no |
| Backend/rules | rules alignment test if pattern exists (like upload quotas) | yes if easy |

### Manual

- [x] Details: Studio Settings save/reset; Portal remaining display; hit Cap A via library + attach; Cap B via queue when already on show; confirm quantity increment does not burn Cap A; soft-reload Studio + Portal after deploy.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Portal remaining + errors; Studio Settings)
- [ ] Design approval
- [ ] Business logic decision — **resolved in this plan** (both caps; defaults 25/15)
- [ ] Production deploy — **out of scope**
- [ ] Database migration — additive only; no prod
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [x] Soft deploy `fresh-prints-dev` Functions (+ rules if changed)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Library add still client-writable → Cap A bypass | High | Deny customer create in rules; route creates through callable |
| Chicago vs UTC confusion vs upload quotas | Med | Explicit helpers + Portal copy “midnight Central”; unit tests around DST |
| Cap B query missing index | Med | Add composite index before deploy; test query |
| Charge without item create (partial failure) | Med | Same Firestore transaction where possible |
| Quantity increment mistakenly charged | Med | Callable branches: increment vs create; unit + manual |
| Closing client create breaks Studio or other paths | Med | Staff paths already Admin/staff rules; verify Studio create still works |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Redeploy previous Functions revision on `fresh-prints-dev`.
2. If rules denied customer create, restore prior `printRequestItems` create allow.
3. Settings doc can remain; clients fall back to defaults if Functions ignore it after rollback.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md — settings + rate-limit collection
- [x] BACKEND.md — callables + defaults
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — short ADR (both caps; Chicago day; defaults)
- [x] Other: ROADMAP #3 expanded text; small-items notes stub update

---

## Open Questions

- [x] None blocking — defaults 25/15 ship unless owner later says otherwise.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-18-print-request-show-caps-review.md
- Verdict: approved_with_changes
