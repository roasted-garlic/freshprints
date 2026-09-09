# Test report: portal-show-price-commitment-ack

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Goal | `portal-show-price-commitment-ack` |
| Status | **passed_with_notes** — automated focused tests passed; owner visual QA **PASS**; Functions DEV redeploy still required for live v4 ack |

## Automated

| Check | Result |
|-------|--------|
| Shared ack copy `portal-bidding-ack-v4` + commitment hint | **PASS** |
| Portal show price commitment summary | **PASS** |
| Working request Show Limits help copy | **PASS** |
| Functions queue + register validation (inherits v4) | **PASS** (12) |

## Manual QA

| Area | Result |
|------|--------|
| Request review Show total + breakdown modal | **PASS** (owner) |
| Add to Show ack + size tiers / show total | **PASS** (owner) |
| Sidebar Show Prices (mobile center portal) | **PASS** (owner) |
| FAQ size tiers + Show Limits copy | **PASS** (owner) |

Owner reply: **PASS** (2026-09-08).

## Deploy note

Live Add to Show / signup will reject until `registerCustomer` + `queuePortalPrintRequestToShow` are redeployed to `fresh-prints-dev` with the shared v4 constant (owner-authorized separately).
