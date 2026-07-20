# Review: Assisted intake Custom pill + Approved max resize

**Date:** 2026-07-18  
**Plan:** `docs/workflow/plans/2026-07-18-assisted-intake-custom-pill-resize-plan.md`  
**Status:** approved

## Verdict
Narrow, correct fixes for both owner-reported issues.

## Checks
| Area | Result |
|------|--------|
| Custom pill root cause | Hook omitted `assistedCreationRequestId` despite server write + UI/CSS ready |
| Resize root cause | `assistedProofFastIngest` skipped upscale; switch to `skipCustomerQualityGates` reuses finalize pipeline |
| Security | No auth/rules change; still portal-customer-owned ingest |
| Scope | No production; no preview-bg churn |

## Required before PASS
- Soft-reload Studio for Custom pill
- Deploy Function; **re-add** assisted proof for Approved max (soft-reload insufficient)
