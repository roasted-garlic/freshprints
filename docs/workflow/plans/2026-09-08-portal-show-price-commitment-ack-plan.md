# Plan: Portal show price commitment (review pills + acknowledgment)

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-09-08-portal-show-price-commitment-ack-review.md |
| Goal id | `portal-show-price-commitment-ack` |

---

## Goal

On Portal print-request **review**, show **show-commitment pricing** (tier pills + breakdown + estimated total) similar to Studio’s request totals, clearly framed as **what they owe at the show / personal bin**, not a Portal charge now. On **Add to Show** confirmation, shorten the acknowledgment (no auction/bidding language), show the same commitment total/breakdown, and require checkbox acknowledgment of that pricing before queue.

## Background

Owner: requests queued to a show use **tiered personal-bin pricing**, not live auctions. Customers must see Pocket / Standard Full Size / Standard Oversized / Extra Oversized rates and their **estimated show total**, then explicitly acknowledge that commitment when submitting to a show. Existing ack (`portal-bidding-ack-v3`) is auction-centric and too long (ADR-FP-097). Studio already computes totals via `calculateGangSheetCustomerSectionSummary` + four-tier defaults (ADR-FP-185). Portal does not compute prices today. `settings/showQueue` (canonical gang-sheet prices) is **staff-read-only** in Rules.

## Scope

### In Scope
- Request detail review UI: compact total-price style pill(s) + expandable or inline tier breakdown; non-payment framing copy.
- Add-to-Show ack modal: shortened policy copy; embed estimated total + tier rates/breakdown; checkbox that includes price commitment; bump ack version constant.
- Align signup ack copy with the same non-auction product model (same version bump).
- Reuse shared pricing helpers/constants (`gangSheetCustomerSectionSummary`, default section pricing).
- Unit/contract tests for copy version + summary wiring; update DATA_MODEL / DECISIONS (ADR-FP-097 amendment) for new version/semantics.
- Workflow docs/state.

### Out of Scope
- Charging / checkout / Stripe in Portal.
- Persisting price snapshot on the print request (unless review later requires it — **not** in v1).
- Exposing full `settings/showQueue` to customers (see Open Questions).
- Studio UI changes; production deploy (owner-gated). Functions redeploy to DEV only when owner authorizes after version bump.
- Commit/push/publish.

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/.../portalBiddingAcknowledgment.constants.ts` → bump to `portal-bidding-ack-v4`
- `packages/shared/.../portalBiddingAcknowledgmentCopy.ts` (+ tests)
- `apps/portal/.../PortalBiddingAcknowledgmentModal.tsx` — pricing summary slot for queue flow
- `apps/portal/.../PortalQueueToShowModal.tsx` — pass totals into ack
- `apps/portal/.../PrintRequestDetailView.tsx` (+ CSS) — pills + breakdown + “at the show” framing
- Possibly small shared helper for tier labels/ranges (Studio modal already has local maps — prefer shared to avoid drift)
- `functions` validation tests pick up new version via shared constant (redeploy required for live reject of old version)
- `docs/architecture/DATA_MODEL.md`, `docs/project/DECISIONS.md` (ADR-FP-097 amendment)

### Architecture Impact
- [x] Details: Portal presentation + shared copy/version; pricing math from shared utils. No new persistence.

### Security Impact
- [x] Details: Prefer **defaults** for customer-facing prices unless owner approves a customer-safe pricing read. Do **not** broadly open `settings/showQueue` (contains ops/import fields). Ack still server-validated by version + accepted flag.

### Data Model Impact
- [x] Details: Same `showQueueBiddingAcknowledgment` shape; **version string** changes to v4. No new fields in v1.

### Backend Impact
- [x] Details: No callable logic change beyond shared version constant. Redeploy `registerCustomer` + `queuePortalPrintRequestToShow` after bump (owner-authorized DEV).

### UI / UX Impact
- [x] Details: Review pills + breakdown; shortened ack modal with price commitment. Manual visual QA + copy approval.

### Migration Impact
- [x] None for existing docs; new queues must use v4. Old signup/queue acks remain historically stored.

---

## Approach

1. **Pricing source (pending owner choice in Open Questions):**
   - **Recommended default for this phase:** Portal uses `DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG` / resolver defaults (`$1 / $2 / $3 / $4` and owner’s width bands). Matches listed product rates; no Rules change.
   - **Alternative:** Narrow customer-readable pricing document or callable — separate follow-up if Studio overrides must match live.

2. **Review page (`PrintRequestDetailView`):**
   - Compute `calculateGangSheetCustomerSectionSummary` from request items + pricing config.
   - Show a Studio-like **Total (at show)** pill (wording TBD — must not imply “pay now”).
   - Show compact tier breakdown (Pocket … Extra Oversized with size ranges and per-print $); optionally formula line like Studio.
   - Hide when no items / zero qty.

3. **Ack copy (proposed — owner must approve):**

   **Add to Show (`buildPortalBiddingAcknowledgmentCopy`):**
   - Title: `Add to Show`
   - Paras (short):
     1. Designs print for your **personal bin** at the selected live show at the **tiered show prices** below.
     2. The estimated total is what you commit to for that show visit — **you are not charged in the Portal now**.
     3. Keep exclusive-order note linking funkyfreshprints.com (unless owner drops it).
   - Checkbox: includes understanding of **show pricing and estimated total** (and not paying in Portal now). Exact string after owner edit.
   - Modal UI also renders the live estimated total + tier table from props (not only prose).

   **Signup:** Parallel shortened non-auction wording; no request-specific total.

4. Bump `PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION` → `portal-bidding-ack-v4`.

5. Wire `PortalQueueToShowModal` → ack modal with summary props; keep confirm gated on checkbox.

6. Tests: copy/version contracts; optional Portal detail contract for “at show” / not “pay now”; Functions validation tests inherit constant.

---

## Proposed acknowledgment draft (for owner edit)

### Add to Show
- **Title:** Add to Show  
- **Body:**
  1. Your designs will be printed for the selected live show and held in your personal bin at the tiered show prices listed below.
  2. The estimated total is your show commitment for those prints. You are not paying through the Portal now.
  3. Need something exclusive that will not go on the show? Order a custom gang sheet at funkyfreshprints.com instead.
- **Checkbox:** I understand the show pricing and estimated total, and that I am not paying in the Portal now.

### Signup
- **Title:** Request Portal Acknowledgment  
- **Body:** Short explanation that requests print for live shows at posted tiered personal-bin prices; presence at show; not a Portal checkout.  
- **Checkbox:** I understand show pricing works by size tier and that requesting designs does not charge me in the Portal.

*(Owner may rewrite freely before implement.)*

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Shared ack copy + version tests | `npx tsx --test` (shared) | yes |
| Functions validation still accepts current version | existing Functions unit tests | yes |
| Portal contract: review shows at-show framing | cheap source contract | yes if cheap |

### Manual
- Review page: pills + breakdown; clear “not paying now”.
- Add to Show: short ack, total visible, checkbox required, queue succeeds on DEV after Functions redeploy.
- Signup ack still required and stores v4.

---

## Human Checkpoints Anticipated
- [x] **Customer-facing policy / ack copy approval** (blocking before implement)
- [x] Pricing source: defaults vs live Studio settings
- [x] Manual UI/UX review after implement
- [ ] Functions DEV redeploy (when version bumps — owner authorize)
- [ ] Production / commit / push — gated separately

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Portal defaults diverge from Studio custom prices | medium | Document; follow-up customer-safe pricing read |
| Customers confuse total with pay-now | high | Explicit “at the show / not charged in Portal” on review + ack |
| Old clients send v3 after bump | medium | Server rejects; redeploy Functions with shared package |
| Signup still auction-worded if only queue updated | medium | Update both under same version |

---

## Rollback Plan

Revert copy/version/UI; redeploy prior Functions version if needed. Historical acks remain.

---

## Documentation Updates Required
- [x] DATA_MODEL.md (ack version / semantics)
- [x] DECISIONS.md (ADR-FP-097 amendment: personal-bin pricing commitment)
- [ ] STYLE_GUIDE.md only if new Portal patterns need tokens
- [x] Workflow plan/review/signoff

---

## Open Questions (blocking)

1. **Approve or edit** the proposed Add-to-Show and Signup acknowledgment copy above?
2. **Pricing source for Portal:** (A) shared defaults $1/$2/$3/$4 as listed, or (B) authorize a follow-on to expose live Gang Sheet Settings prices to customers?
3. Keep the funkyfreshprints.com exclusive-order paragraph on Add-to-Show?

---

## FreshForge Impact Classification
- App: Portal + shared copy/constants (+ Functions version coupling)
- Docs: DATA_MODEL, DECISIONS, workflow artifacts
- Not starter-surface FreshForge tooling
