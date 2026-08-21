# Fresh Prints - Current State Snapshot

## 2026-08-21 — studio-updater-design-id-search-tag-picker-polish — SIGNOFF APPROVED (DEV) / CLOSED

| Item | Value |
|-------|-------|
| Managed goal | `studio-updater-design-id-search-tag-picker-polish` — **CLOSED (DEV)** |
| Signoff | **approved** — `docs/workflow/reviews/2026-08-21-studio-updater-design-id-search-tag-picker-polish-signoff.md` |
| Owner QA | `AL PASS` (all pass) |
| Checkout | `C:\coding\fresh-prints` on **`development`** @ **`445ab13`** |
| Delivered | Studio Updates portals to `document.body` with updater-only width; Design Library full document-ID hydrate via `getDesignsByIds`; Load more hidden on short Algolia pages; approved-tag suggestions close after pick |
| Production | **Not** promoted by this goal. Studio version **not** bumped (published remains **1.0.7**). |
| Workflow | **IDLE** |
| Phase 9 | **PARKED** |
| Tag-alias | QUEUED ONLY |

---

## Paused (not this signoff)

| Item | Value |
|-------|-------|
| Goal | `promote-print-request-correctives-to-production` — **PAUSED** at Gate D LIVE |
| Production source | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` (PR **#84**) |
| App Hosting | `fresh-prints-portal-build-2026-08-21-001` @ **100%** |
| Canonical | `https://myprintrequest.com` |
| Rollback Portal | `fresh-prints-portal-build-2026-08-19-001` @ `99b2303` |
| Awaiting | Owner `PROD PRINT REQUEST CORRECTIVES QA: PASS` and/or `APPROVE STUDIO VERSION: <x.y.z>` |
| Studio published | **1.0.7** (list-split not in that published build) |

---

## 2026-08-21 — studio-print-request-customer-internal-list-split — SIGNOFF APPROVED (DEV) / CLOSED

| Item | Value |
|-------|-------|
| Managed goal | `studio-print-request-customer-internal-list-split` — **CLOSED (DEV)** |
| Signoff | **approved** — `docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-signoff.md` |
| Owner QA | Studio list-split QA **`PASS`** |
| Checkout | `C:\coding\fresh-prints` on **`development`** @ **`bdadd30`** |
| Delivered | Studio `/print-requests` Customer vs Internal lists via `isInternal`; default Customer Requests; lifecycle tabs preserved; Users-page kind switcher; DEV index `isInternal + queueTab + updatedAt + __name__` (ADR-FP-140) |
| Production | Index/Function/Portal promoted in paused PR **#84** goal (Gate D LIVE). Studio list-split still needs a new Studio version. |
| Workflow | **IDLE** (superseded by polish close + paused promotion) |
| Phase 9 | **PARKED** |
| Tag-alias | QUEUED ONLY |

---

## Live production

| Item | Value |
|-------|-------|
| App Hosting | `fresh-prints-portal-build-2026-08-21-001` @ 100% |
| Source | `7716d4a97f83c2dbe5602fb3e149875d6d7f38c9` (PR #84) |
| Canonical | `https://myprintrequest.com` |
| Rollback | `fresh-prints-portal-build-2026-08-19-001` @ `99b2303` |
