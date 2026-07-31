# Checkpoint: Production Stage 1 domain-independent setup (partial)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` (Goal #13) |
| Phase | Phase G / Stage 1 |
| Status | **Stage 1B + 1C fixtures recorded — Stage 1 fixtures complete** |

**Unblocked 2026-07-31:** Storage cross-service IAM + owner upload QA **PASS WITH NOTES**.

**Stage 1C (2026-07-31):** QA design qualifies — recorded below.

**Stage 1B (2026-07-31):** Owner imported **two** Whatnot shows via Studio import (worked). Both
qualify functionally; recorded below (**PASS WITH NOTES** — titles are live Whatnot titles, not
the placeholder name `Production Smoke Test Show`).

**Stage 1 fixture completion:** **confirmed.** Do **not** start Stage 2. Next per owner: bundled
brand implementation (`APPROVE BUNDLED BRAND ASSET IMPLEMENTATION`) before Stage 2 smoke.

---

## Owner decision still in force

Coming Soon remains on `myprintrequest.com`. No custom-domain, DNS, Authorized Domains, OAuth,
or App Hosting custom-domain action in this pass.

---

## Stage 1A — Owner account (read-only Admin SDK)

| Check | Result |
|-------|--------|
| Owner documents with `role: "owner"` | **1** |
| `isActive` | `true` |
| `createdAt` / `updatedAt` | present |
| Email field present | yes (value not recorded) |
| Active categories | **18** |
| Approved tags | **1,122** |

Studio UI visibility (Test Data Reset absent, Catalog Storage Inventory absent, no Firebase Debug
UI, Settings email providers visible) was previously owner-confirmed on `v1.0.0-rc5` and was not
re-run in this agent session. Owner should reconfirm when creating Stage 1B/1C fixtures.

---

## Stage 1B — Upcoming show

**Status:** **PASS WITH NOTES** (read-only 2026-07-31 after owner Whatnot import).

Owner created **two** shows via Studio Whatnot import (confirmed working). Placeholder name
`Production Smoke Test Show` was **not** used; live Whatnot titles are the fixtures. Functional
requirements met for both.

`settings/printRequestLimits` is **unset** on prod → platform default per-customer-per-show limit
applies (`PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER` = **20** in code). Show capacity
`maxTotalQuantity: 200` is Whatnot show capacity, not that per-customer limit. Zero
`showAllocations` for either show.

### Primary fixture (owner screenshot / Friday)

| Field | Value |
|-------|-------|
| show ID (Firestore) | `kmpnyHAvKaesidMrlFkU` |
| Whatnot show ID | `3fc20124-605d-4db2-a2ff-90ae10f32982` |
| name | 🔥FRIDAY EVENING DTF Transfer show \| Low Starts • Bundle & Save • Press Ready 👕🖨️ |
| scheduled date/time | **Jul 31, 2026, 8:00 PM CDT** (`2026-08-01T01:00:00.000Z`) |
| timezone | America/Chicago (CDT) — derived from schedule + Studio UI |
| status | `scheduled` / production `open` / not archived |
| Portal-allocatable | **yes** — future schedule; `canAllocatePrintRequestToShow` true (not past); `productionStatus: open`; capacity 0/200; no allocations |

### Secondary fixture (Saturday)

| Field | Value |
|-------|-------|
| show ID (Firestore) | `p8ooWvYU01wX1Nug53bp` |
| Whatnot show ID | `ca5fe015-6945-40f6-83e1-0b06e88aae74` |
| name | 🔥SATURDAY EVENING DTF Transfer show \| Low Starts • Bundle & Save • Press Ready 👕🖨️ |
| scheduled date/time | **Aug 1, 2026, 8:00 PM CDT** (`2026-08-02T01:00:00.000Z`) |
| timezone | America/Chicago (CDT) |
| status | `scheduled` / production `open` / not archived |
| Portal-allocatable | **yes** — same criteria as primary |

### Notes

- Import path validated on production Studio.
- Do **not** require renaming to `Production Smoke Test Show` unless Stage 2 smoke needs a
  distinctive label (not required for fixture completeness).

---

## Stage 1C — Catalog design fixture

**Status:** **PASS — QA design qualifies** (read-only inspection 2026-07-31). **Do not import a
duplicate.**

The single production design created during Class D Storage QA already satisfies Stage 1C.

### Recorded values (read-only)

| Field | Value |
|-------|-------|
| design ID | `s9Yi7i8uq2ZddERyDuNT` |
| title | Funky Fresh Print - Steph - Running Noooooowww |
| category | Occupations (`categoryId` `syIPl9aShj2pdz8ajM2p`, `isActive: true`) |
| tags | `funny`, `sarcastic` |
| ready status | `status: ready`, `aiReviewStatus: approved` |
| Storage path prefixes | `/originals/`, `/thumbnails/`, `/previews/` |
| Storage object paths (no signed URLs) | `/originals/s9Yi7i8uq2ZddERyDuNT.png`, `/thumbnails/s9Yi7i8uq2ZddERyDuNT.webp`, `/previews/s9Yi7i8uq2ZddERyDuNT.webp` |
| Studio Design Library visibility | **yes** — in current studio ready-index (`catalogVersion` `7-e79c4f86583f1428`); owner also confirmed Design Library in Class D QA |
| hosted Portal visibility after normal publication | **yes** — present in live `generated/portal-catalog/manifest.json` → generation `7-e79c4f86583f1428` `discover.json` / `recent/page-0.json` / category page; anonymous `getDownloadURL` + Origin `hosted.app` fetch **200** with CORS ACAO |

Publication was via the normal catalog publisher (manifest `generatedAt` `2026-07-31T19:30:26.977Z`);
no manual JSON edit and no `rebuildCatalogSnapshots` in this fixture pass.

---

## Stage 1C / customer — **DEFERRED (proven)**

Normal Studio Portal-invite path is `createCustomerWithPortalInvite`, which **always sends** a
Resend/Brevo invitation whose Auth continue URL resolves via
`portalUrlResolver.ts` to **`https://myprintrequest.com/login`** for `fresh-prints-prod`.

Therefore customer+invite creation is **domain-dependent** and must wait until Stage 4 after
`APPROVE MYPRINTREQUEST.COM CUTOVER`.

`createCustomerRecord` (directory-only) does not create Auth / Portal login and is insufficient
for Portal smoke auth.

**Least invasive Stage 2 alternative:** run all guest-capable hosted.app tests now; defer
Portal registration/login, invitation, and authenticated Portal flows to Stage 4 (or register on
hosted.app only if Auth Authorized Domains already include the hosted.app host — verify at smoke
time; do not add domains early).

---

## Stage 1D — Coming Soon DNS (read-only)

| Item | Observed |
|------|----------|
| DNS provider | Cloudflare (`dawn.ns.cloudflare.com`, `tim.ns.cloudflare.com`) |
| Apex A | `104.21.26.183`, `172.67.138.87` (TTL 300) — Cloudflare proxy IPs |
| Apex AAAA | `2606:4700:3037::6815:1ab7`, `2606:4700:3031::ac43:8a57` (TTL 300) |
| `www` | **NXDOMAIN** (no record) |
| Proxy | Apex served via Cloudflare (`Server: cloudflare`, `CF-Cache-Status: HIT`) |
| HTTPS apex | HTTP **200**, title `MyPrintRequest - Coming Soon` |
| HTTP apex | **301** → `https://myprintrequest.com/` |
| `www` HTTPS | host unknown / no DNS |
| Hosted Portal | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` HTTP **200**, title Fresh Prints Request Portal |

TXT notes observed (non-secret): SPF via registrar-servers; Brevo domain verification TXT present.
Exact Cloudflare Page/Worker/origin project name not resolved from public headers alone
(`[NEEDS OWNER CONFIRM]` in Cloudflare dashboard if needed for rollback precision).

**No DNS records were changed.**

### Rollback summary (for future cutover failure)

1. Before Stage 4 cutover, export/screenshot Cloudflare DNS for `myprintrequest.com` (apex A/AAAA,
   proxy status, any Page Rules / Redirect Rules, Coming Soon target).
2. If App Hosting custom-domain cutover fails: restore the recorded apex records and Coming Soon
   target; remove incomplete Firebase custom-domain binding if present; keep `www` absent unless
   it was intentionally added.
3. Verify `https://myprintrequest.com` again shows Coming Soon title before further attempts.
4. Do not leave apex half-pointed at Firebase.

Detail file: `docs/workflow/setup/production-coming-soon-dns-rollback.md`

---

## Stage 1E — Infrastructure (read-only)

| Check | Result |
|-------|--------|
| Firestore composite index definitions | **65** (via `firebase firestore:indexes`) |
| Functions deployed | **99**; `rebuildCatalogSnapshots` present |
| Excluded six | all **absent** |
| Storage CORS | hosted.app + `myprintrequest.com` + `www.myprintrequest.com` (GET/HEAD) |
| App Hosting backend | `fresh-prints-portal` **Enabled**, `nodejs24`, `us-central1` |
| Automatic rollouts | remain disabled (per prior production-release record; not re-enabled this pass) |
| Hosted Portal | HTTP 200 |
| Apex Coming Soon | still live |
| Domain cutover | **not** occurred |

Firestore/Storage Rules “last published” Console timestamps were not re-read this pass (CLI has no
`storage:rules:get`); prior production-release deploys remain the record of truth unless owner
reports drift.

**Secrets:** do **not** use `firebase functions:secrets:access` for readiness checks. Prior
production-release metadata confirmed four secrets ENABLED; treat Console metadata as the safe
re-verify path. If secret values were ever printed in a local tool log, rotate them in Secret
Manager as a precaution.

---

## Stage 2 prep

Checklist: `docs/workflow/reviews/2026-07-31-production-stage-2-hosted-app-smoke-checklist.md`

Status: **prepared — not executed**. Stage 1B/1C fixtures recorded. Owner sequence: bundled-brand
implementation next, then Stage 2; customer/invite tests deferred to Stage 4.

---

## Actions this pass did **not** perform

- DNS / Cloudflare edits
- Custom domain / Authorized Domains / Google OAuth
- App Hosting rollout
- Functions / Rules / indexes deploy
- CORS reapply
- `rebuildCatalogSnapshots`
- Customer invite creation
- Stage 2 smoke execution
