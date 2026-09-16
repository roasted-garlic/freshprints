# Owner DEV QA Preparation: Pre-release lifecycle / image parity / DEV hardening

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Goal | `pre-release-lifecycle-image-parity-and-dev-environment-hardening` |
| Status | **pending** |
| Environment | `fresh-prints-dev` / Portal `myprintrequest.dev` (or local Portal with DEV Firebase) |
| Automated | Focused suites **76/76 PASS** (see test report) |

---

## Prerequisites

- Studio connected to **`fresh-prints-dev`**
- Portal on DEV App Hosting **or** local Portal with DEV env (`NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev`, origin not production)
- Owner/admin for Portal Admin Show Queue
- Staff who can Mark Complete an Internal Gang Sheet
- **Note:** Current DEV has only open Internal Gang Sheet #2 with pending allocations (diagnostic H1-class). Mark Complete on that sheet (or a fresh Internal sheet with a full Internal PR) is the A proof.

### Deploy note for live Functions paths

Studio Mark Complete and Portal View Designs callables must be the **updated** DEV Functions for live QA of A/B server changes. If DEV Functions are not yet redeployed, A/B live checks may still exercise older callables — record that in notes. Source + automated tests are already on `development`.

---

## Manual Test Checkpoint

**Feature / area:** Workstreams A–C (Internal Printed path, Admin View Designs honesty, DEV banner/noindex)  
**Why automated tests are insufficient:** Requires live Firestore Mark Complete, Portal rendering, and crawler-facing headers/meta on the real DEV host.  
**Environment:** DEV only — no production mutation

### Workstream A — Internal Gang Sheet → Printed

1. Ensure an Internal Print Request is fully allocated on the open Internal Gang Sheet (or create a small Internal PR and Add to Internal Gang Sheet). → **Expected:** request appears under Print Requests → Internal → Queued.
2. On Internal Sheets, **Mark Complete** the sheet. → **Expected:** sheet completes; next cycle opens; no error toast.
3. Open Print Requests → Internal → **Printed**. → **Expected:** the completed PR is listed under Printed (not Queued).
4. Refresh / remount Studio. → **Expected:** still Printed.
5. (Optional) If a second sheet holds remaining qty for another PR, complete only sheet A. → **Expected:** partial PR stays Queued until fully printed.

### Workstream B — Portal Admin View Designs (DEV only)

1. Open Portal `/admin/show-queue` on DEV. → **Expected:** dashboard loads.
2. Open **View Designs** on a request with catalog and/or customer-upload art. → **Expected:** previews render (or a truthful unavailable message if object missing — not a silent blank for signing if DEV IAM is healthy).
3. If a Staff Artwork line exists. → **Expected:** intentionally **no** image preview (`Staff Artwork — no preview`).
4. Do **not** change production IAM. If you separately inspect production and see widespread “Preview unavailable (signing)”, stop and open a new owner checkpoint — do not mutate prod here.

### Workstream C — DEV banner + noindex

1. Open DEV homepage (`myprintrequest.dev` or local DEV Portal). → **Expected:** sticky banner text exactly `THIS IS A DEVELOPMENT SERVER`.
2. Navigate to public catalog and an authenticated route (and `/admin/show-queue` if available). → **Expected:** banner remains visible; does not block nav/dialogs.
3. View page source / DevTools for robots meta. → **Expected:** noindex, nofollow, noarchive, nosnippet (or framework equivalent).
4. Check response headers on a DEV HTML page. → **Expected:** `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`.
5. Fetch `/robots.txt` on DEV. → **Expected:** allows crawl (`Allow: /`); does **not** `Disallow: /`; does **not** advertise a sitemap URL.
6. Fetch `/sitemap.xml` on DEV. → **Expected:** empty / no DEV URL inventory.
7. Confirm production Portal (read-only spot-check if available) does **not** show the banner and remains indexable. → **Expected:** no DEV banner; production SEO unchanged. (**Do not deploy** as part of this QA.)

### Pass criteria
- [ ] A: Mark Complete moves eligible Internal PR Queued → Printed and persists after refresh
- [ ] A: Partial multi-sheet (if tested) does not print prematurely
- [ ] B: Catalog/upload View Designs previews work on DEV; Staff Artwork remains blank by design
- [ ] C: Banner on all checked DEV routes with exact copy
- [ ] C: DEV noindex meta + X-Robots-Tag present
- [ ] C: DEV robots allows fetch (not Disallow:/); sitemap empty
- [ ] C: Production not showing DEV banner / not noindexed (read-only check)

### Please reply with
- `OWNER DEV QA: PRE-RELEASE LIFECYCLE / IMAGE PARITY / DEV HARDENING — PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

---

## Agent actions while paused

**Allowed:** Read docs, answer clarifying questions, record QA result  
**Forbidden:** Implement further scope, production IAM, production deploy, Rules changes, Signoff before QA
