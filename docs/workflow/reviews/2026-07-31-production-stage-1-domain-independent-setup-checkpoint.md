# Checkpoint: Production Stage 1 domain-independent setup (partial)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` (Goal #13) |
| Phase | Phase G / Stage 1 |
| Status | **partial — owner Studio fixtures still required** |

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

**Not created by the agent** (requires production Studio UI).

### Manual fixture checkpoint

**Name:** `Production Smoke Test Show`  
**Requirements:** future schedule; active / Portal-allocatable; default 25-per-show limit; not
completed; no customer orders yet.

Please create in production Studio, then reply with:

- show ID
- display name
- scheduled date/time + timezone
- status/active fields
- `PASS` or `FAIL: …`

---

## Stage 1C — Catalog design fixture

**Not created by the agent** (requires production Studio import → AI Review → ready).

### Manual fixture checkpoint

Import one owner-approved, non-sensitive design; complete normal enrichment/review/ready path.
Do **not** manually edit generated JSON. Do **not** invoke `rebuildCatalogSnapshots` unless the
normal publisher fails and a separate review says so.

Please reply with:

- design ID, title, category, tags
- ready/catalog confirmation
- Storage path prefixes only (no signed URLs)
- Studio Design Library visible: yes/no
- hosted Portal visible after normal publication: yes/no

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

Status: **prepared — not executed**. Blocked on Stage 1B/1C owner fixtures for several items;
customer/invite tests deferred to Stage 4.

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
