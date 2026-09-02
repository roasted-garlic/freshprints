# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-02

---

## FreshForge workflow

| Item | Value |
|------|-------|
| Status | **IDLE** |
| DONE | **yes** |
| Last completed goal | `studio-print-request-editing-tab` |
| Production | **NOT AUTHORIZED / NOT TOUCHED** |
| Smart Profiling | **PARKED** |
| `show-queue-batch-allocation-performance` | **DEFERRED** |
| Queued next goal | `portal-editing-request-parks-current-draft` (**do not auto-start**) |
| Queued after that | cross-app lightbox Previous/Next |
| Workflow state | `.cursor/workflow/state.md` |

---

## Last completed — Print Request Editing tab (DEV)

| Item | Status |
|------|--------|
| Goal | `studio-print-request-editing-tab` — **DONE** |
| Owner QA | **PASS** (DEV Studio Customer + Internal) |
| Delivered | Editing lifecycle tab + `queueTab`; Portal Editing list tab; Internal Printed newest-first |
| DEV Firebase | Rules + 10 Functions + reconcile (0 writes) on `fresh-prints-dev` |
| Production | **NOT AUTHORIZED** |
| Signoff | `docs/workflow/reviews/2026-09-02-studio-print-request-editing-tab-signoff.md` |

---

## Next workflow step

Owner may start **`portal-editing-request-parks-current-draft`** with an explicit Managed Phase command. Do not start automatically. Production and Smart Profiling remain unauthorized.

---

## Smart Profiling (truthful state)

- Smart Profiles exist on DEV; autonomous live approval **OFF**
- **No new Smart Profiling work** — parked until owner starts next managed goal

---

## Live production (unchanged)

| Item | Value |
|------|-------|
| Published Studio | **1.0.9** (last documented promote) |
| Canonical Portal | `https://myprintrequest.com` |

Recent DEV goals (including Editing tab) are **not** on production.
