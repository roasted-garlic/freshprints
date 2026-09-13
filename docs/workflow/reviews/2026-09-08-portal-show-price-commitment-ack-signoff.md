# Signoff: Portal show price commitment acknowledgment

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Signoff by | Signoff Agent |
| Goal | `portal-show-price-commitment-ack` |
| Plan | `docs/workflow/plans/2026-09-08-portal-show-price-commitment-ack-plan.md` |
| Review | `docs/workflow/reviews/2026-09-08-portal-show-price-commitment-ack-review.md` |
| Test report | `docs/workflow/reviews/2026-09-08-portal-show-price-commitment-ack-test-report.md` |
| Owner visual QA | **PASS** (2026-09-08) |
| Final status | **approved_with_notes** |

---

## Summary

Portal customers now see **show price commitment** (tier rates × quantity) on request review and Add to Show, with shortened non-auction acknowledgment copy (`portal-bidding-ack-v4`). Size-tier entry points were added in the sidebar (**Show Prices**), Help/FAQ, and Show Limits modal. Owner visual QA **PASS** after copy and mobile modal polish.

---

## Changes Delivered

### Behavior
- Request review: **Show total** pill + breakdown modal (totals + by-size-tier; no calculation formula bars).
- Add to Show ack: shortened personal-bin / price-commitment copy; **Size tiers** + **Show total** pills; exclusive paragraph retained; checkbox required.
- Shared ack version **`portal-bidding-ack-v4`** (signup + queue).
- Pricing source: shared defaults `$1/$2/$3/$4` (not live `settings/showQueue`).
- **Show Prices** in sidebar (side-by-side with Help); FAQ size-tiers section; Show Limits modal footer.
- Size-tiers modal portals to `document.body` (centers on mobile; sidebar stays open).
- Universal hint: per-print by size; commit to price × quantity.
- Show Limits copy shortened: per-show limit, no daily cutoff, request cap as failsafe.

### Files Created (high level)
- Portal: `PortalShowPriceCommitmentModal`, `PortalShowPriceCommitmentBreakdown`, `PortalShowSizeTiersModal`, `PortalShowSizeTiersTrigger`, summary utils + tests
- Workflow plan / review / test report / this signoff

### Files Modified (high level)
- Shared: `portalBiddingAcknowledgmentCopy`, ack version constants, `printRequestWorkingRequestMax` help copy, DATA_MODEL / DECISIONS (ADR-FP-097)
- Portal: review detail, bidding ack, queue modal, sidebar, help page/content, working-request limit banner, styles
- Functions validation inherits v4 via shared constant (redeploy still required for live DEV)

### Documentation Updated
- Plan, review, test report, signoff, ROADMAP banner, workflow state

---

## Tests

### Automated
| Check | Result |
|-------|--------|
| Shared ack copy + price commitment hint | **PASS** |
| Portal show price commitment summary | **PASS** |
| Working request limit help modal copy | **PASS** |
| Functions queue + register validation (inherits v4) | **PASS** (earlier focused run) |

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Review Show total + ack + Show Prices / FAQ / Show Limits | **PASS** | Owner |

---

## Human Approvals

| Item | Status |
|------|--------|
| Owner visual QA | **PASS** |
| Functions DEV redeploy (`registerCustomer`, `queuePortalPrintRequestToShow`) | **Not authorized** — required before live v4 ack on DEV |
| Commit / push | **Not authorized** |
| Portal / production promote | **Not authorized** |

---

## Risks / Follow-ups

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Live Add to Show / signup reject until Functions redeploy with v4 | Medium | Owner-authorize DEV Functions deploy of `registerCustomer` + `queuePortalPrintRequestToShow` |
| Defaults may diverge from Studio show-queue settings | Low | Accepted (pricing source A); future phase if live customer-readable rates needed |
| Commit/push / production | — | Owner-gated |

---

## Deferred Items (Roadmap)
- Owner-authorized Functions DEV redeploy for ack v4.
- Optional later: customer-readable live gang-sheet prices (out of this goal).

---

## Open Blockers
- [x] None for source signoff (Functions redeploy is follow-up, not a signoff blocker)

---

## Verdict

**approved_with_notes** — UI/copy signed off; Functions DEV redeploy remains owner-gated before live queue/signup accept v4.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/` — not present; skipped

**Recommended next action for user:** Authorize Functions DEV redeploy of `registerCustomer` + `queuePortalPrintRequestToShow` when ready so live Add to Show / signup accept `portal-bidding-ack-v4`. Say when to commit/push.
