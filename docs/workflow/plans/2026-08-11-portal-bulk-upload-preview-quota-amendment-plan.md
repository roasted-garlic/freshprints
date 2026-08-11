# Plan amendment — Portal bulk upload preview exhaustion + donation quota hygiene

**Date:** 2026-08-11  
**Branch:** `qa/prefinal-a-h-dev`  
**Triggered by:** Owner DEV QA — ~56 uploads, ~8 Failed/`internal`, console `ERR_INSUFFICIENT_RESOURCES` on `preview.webp`; failed/abandoned uploads must not consume day quota.

## Problem

1. Finalize concurrency is already 8, but the upload panel eagerly `getDownloadURL` + `<img>` loads **every ready preview in parallel** on each `rows` update, saturating the browser and causing late finalize failures.
2. Donation day quota is charged at **finalize start**; failures and abandon do not refund.

## Scope (this amendment)

| Item | Change |
|------|--------|
| Preview loading | Skip cached; cap concurrent URL fetches; `loading="lazy"`; prefer local file thumbnails while processing |
| Workers | Skip rows marked `removed` before upload/finalize |
| Quota charge | Charge `finalizeImageCountDonation` only when an upload becomes **ready** (not at finalize start) |
| Remove | Hard-delete server upload (refunds if charged) when removing a row with `uploadId` |
| Close / leave / remount | Abandon unconfirmed session uploads (hard-delete) + clear session + refresh quota display |
| Docs | Update `DATA_MODEL.md` F3 note for charge-on-ready + abandon refund via delete |

## Out of scope

- Lowering max files/batch product limit (keep 100; fix resource fan-out instead)
- Print Cap L (still attach-only)
- Production deploy

## Deploy note

Requires **Functions** redeploy of `finalizeCustomerUpload` (and portal client) to `fresh-prints-dev` after implement/test.
