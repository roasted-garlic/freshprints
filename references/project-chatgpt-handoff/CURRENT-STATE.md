# Fresh Prints - Current State Snapshot

## 2026-08-21 — studio-print-request-customer-internal-list-split — SIGNOFF APPROVED (DEV) / CLOSED

| Item | Value |
|-------|-------|
| Managed goal | `studio-print-request-customer-internal-list-split` — **CLOSED (DEV)** |
| Signoff | **approved** — `docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-signoff.md` |
| Owner QA | Studio list-split QA **`PASS`** |
| Checkout | `C:\coding\fresh-prints` on **`development`** @ **`bdadd30`** |
| Delivered | Studio `/print-requests` Customer vs Internal lists via `isInternal`; default Customer Requests; lifecycle tabs preserved; Users-page kind switcher; DEV index `isInternal + queueTab + updatedAt + __name__` (ADR-FP-140) |
| Production | **Not** promoted. Index is `fresh-prints-dev` only. No Studio/Portal/Functions/Rules release. |
| Workflow | **IDLE** |
| Phase 9 | **PARKED** |
| Tag-alias | QUEUED ONLY |

---

## 2026-08-20 — print-request-shared-sizing-and-queue-integrity — SIGNOFF APPROVED (DEV) / CLOSED

| Item | Value |
|-------|-------|
| Managed goal | `print-request-shared-sizing-and-queue-integrity` — **CLOSED (DEV)** |
| Signoff | **approved** — `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-signoff.md` |
| Owner QA | Combined DEV QA **`PASS`** |
| Checkout | `C:\coding\fresh-prints` on **`development`** @ **`4865c2b`** |
| Delivered | Manual save 200 DPI + 22″; persist/queue barriers; export requested inches; Past+Printing Finish + Mark Complete (ADR-FP-139); Studio Add Designs item-id save |
| Production | **Not** promoted. No Functions/Portal/Studio release in this push. |
| Workflow | **IDLE** |
| Phase 9 | **PARKED** |
| Tag-alias | QUEUED ONLY |

---

## 2026-08-18 — PR #83 Portal add-to-show + design analytics — PRODUCTION LIVE / CLOSED

| Item | Value |
|-------|-------|
| Goals | `portal-add-to-show-unmissable` + `portal-design-engagement-analytics` — **CLOSED/LIVE** |
| Production Signoff | **approved** — `docs/workflow/reviews/2026-08-18-portal-pr-83-production-signoff.md` |
| Owner QA | `PROD PR 83 QA: PASS` |
| Production source | `99b230333efd9a4892f8c4a30ccf72008baf2246` (PR **#83**) |
| App Hosting | **`fresh-prints-portal-build-2026-08-19-001`** @ **100%** |
| Canonical | `https://myprintrequest.com` |
| Rollback | `fresh-prints-portal-build-2026-08-18-001` @ `cb006bd` |
| Workflow | **IDLE** |
| Phase 9 | **PARKED** |
| Tag-alias | QUEUED ONLY |
| Record | `docs/workflow/reviews/2026-08-18-portal-pr-83-app-hosting-rollout-record.md` |

---

## Live production

| Item | Value |
|-------|-------|
| App Hosting | `fresh-prints-portal-build-2026-08-19-001` @ 100% |
| Source | `99b230333efd9a4892f8c4a30ccf72008baf2246` (PR #83) |
| Canonical | `https://myprintrequest.com` |
| Rollback | `fresh-prints-portal-build-2026-08-18-001` @ `cb006bd` |
