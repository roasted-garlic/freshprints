# Stage 2 — Hosted.app production smoke checklist (prepared, not executed)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Target | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Studio | Production installer (`v1.0.0-rc5` or later confirmed build) |
| Status | **Prepared only — do not mark PASS until owner executes** |

**Rule:** A hosted.app pass is **not** a canonical-domain (`myprintrequest.com`) pass.

---

## Runnable now (after Stage 1B/1C fixtures exist)

| # | Test | Class | Notes |
|---|------|-------|-------|
| 1 | Public Portal load (hosted.app) | runnable | HTTP 200 already verified agent-side |
| 2 | Guest catalog / Discover browse | runnable | Empty catalog previously PASS; retest with fixture design |
| 3 | Catalog design visibility (fixture) | runnable | Needs Stage 1C design |
| 4 | Search / filtering | runnable | Needs fixture + tags/category |
| 5 | Storage asset load + CORS from hosted.app Origin | runnable | CORS allowlist verified |
| 6 | Studio sign-in / owner permissions | runnable | Owner profile verified read-only |
| 7 | Studio workspaces load | runnable | |
| 8 | No Test Data Reset UI | runnable | Production build gate |
| 9 | No Catalog Storage Inventory UI | runnable | Excluded function not deployed |
| 10 | No `fresh-prints-dev` project state | runnable | |
| 11 | Studio Design Library shows fixture | runnable | Needs 1C |
| 12 | Create/manage upcoming show already created | runnable | Needs 1B |
| 13 | Gemini enrichment on a new/import path | runnable | Needs design import path / fixture workflow |
| 14 | Etsy recommendation callable (owner/staff) | runnable | Smoke only; no customer PII |
| 15 | No unexpected permission errors in console | runnable | |
| 16 | Automatic App Hosting rollouts still disabled | runnable | Config check |

---

## Runnable only if hosted.app Auth is already authorized

| # | Test | Class | Notes |
|---|------|-------|-------|
| 17 | Customer registration on hosted.app | conditional | Requires hosted.app in Auth Authorized Domains; **do not add** `myprintrequest.com` early |
| 18 | Email/password login on hosted.app | conditional | Same |
| 19 | Current request create + add catalog fixture | conditional | Needs authenticated customer |
| 20 | Quantity / size edit | conditional | |
| 21 | 200 effective-DPI save enforcement | conditional | |
| 22 | 25-per-request limit | conditional | |
| 23 | 25-per-show limit (with Stage 1B show) | conditional | Needs 1B + auth |
| 24 | Customer upload | conditional | |
| 25 | Donate Design | conditional | |
| 26 | Transparency / format validation | conditional | |
| 27 | Studio customer-upload intake visibility | conditional | |
| 28 | Studio print-request receipt | conditional | |
| 29 | Add to Show / Show Queue | conditional | |
| 30 | Start / Pause / Resume / Finish | conditional | |

If Auth on hosted.app fails because the host is not authorized, classify these as **blocked**
(Auth host not authorized) — still **do not** add canonical domains before cutover approval.

---

## Deferred until domain cutover (Stage 4)

| # | Test | Class | Reason |
|---|------|-------|--------|
| D1 | Apex loads production Portal | deferred | Coming Soon until cutover |
| D2 | HTTPS cert / HTTP→HTTPS on apex | deferred | |
| D3 | `www` redirect behavior | deferred | `www` NXDOMAIN today |
| D4 | Canonical host correctness | deferred | |
| D5 | Registration/login on `myprintrequest.com` | deferred | Authorized Domains + DNS |
| D6 | Google sign-in on canonical domain | deferred | |
| D7 | Invitation email + link opens canonical Portal | deferred | Invite continue URL is `.com` |
| D8 | Proof-notice email links use `.com` | deferred | |
| D9 | Password-reset / Auth action links | deferred | |
| D10 | `robots.txt` allow variant on apex | deferred | Host-gated |
| D11 | `/sitemap.xml` on apex | deferred | |
| D12 | `/share/design/{id}` OG on apex | deferred | |
| D13 | CORS from apex Origin in browser | deferred | Config present; browser proof after cutover |
| D14 | No Coming Soon on apex | deferred | |
| D15 | No hosted.app leaks in user-facing canonical links | deferred | |
| D16 | Portal-invite test customer creation | deferred | See Stage 1 checkpoint |

---

## Blocked for other proven reasons (until fixtures)

| # | Test | Class | Reason |
|---|------|-------|--------|
| B1 | Design visibility / search with real card | blocked | Stage 1C design not created yet |
| B2 | Show allocation / Add to Show | blocked | Stage 1B show not created yet |
| B3 | Authenticated Portal E2E without invite | blocked | Pending Auth-on-hosted.app check or Stage 4 invite |

---

## Execution rule

Owner (or agent under explicit smoke authorization) runs this checklist **after** Stage 1B/1C
PASS replies. Record results as `PASS` / `PASS WITH NOTES` / `FAIL` per item. Do not start in the
documentation-only pass that prepared this file.
