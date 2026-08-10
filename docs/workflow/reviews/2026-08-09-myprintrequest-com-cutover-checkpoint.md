# Checkpoint: Approve MyPrintRequest.com cutover

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Goal #13 stage | Pre-domain readiness (DEPLOYMENT Step 11) → cutover (Step 12) |
| Prerequisite | Stage 2 customer smoke **READY FOR CUSTOMERS** |
| Smoke result | `docs/workflow/reviews/2026-08-09-production-customer-smoke-test-result.md` |
| Smoke signoff | `docs/workflow/reviews/2026-08-09-production-customer-smoke-test-signoff.md` |
| Status | **BLOCKED until owner phrase** |
| Smoke | **PASS** — Stage 2 closed (`PROD CUSTOMER SMOKE QA: PASS` → READY FOR CUSTOMERS) |
| Owner deferral | **Voluntary** — cutover deferred until `prelaunch-companion-designs-and-censored-content` ships (dev QA → prod promotion → post-prod smoke). Not a smoke defect. |

---

## Why this gate exists

Production Portal is **READY FOR CUSTOMERS** on hosted.app (Stage 2 customer smoke **PASS**, 2026-08-09). Canonical apex `myprintrequest.com` still serves **Coming Soon**. Pointing the domain at App Hosting is irreversible without a deliberate rollback and must be owner-authorized.

**Owner update (2026-08-09):** Cutover remains deferred while two pre-launch catalog enhancements (companion design sets + Explicit/Censored Content) are planned/implemented. Do not treat those enhancements as reopening Stage 2 smoke.

Rollback inventory (read before cutover):  
`docs/workflow/setup/production-coming-soon-dns-rollback.md`

Live Portal (current customer URL until cutover):  
`https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`  
Build: **`build-2026-08-09-001`** @ tip `f5c0bdb`

---

## What this phrase authorizes (after approval)

A **separate** cutover managed phase / owner-run steps (not executed until phrase):

1. Capture current Coming Soon / DNS / Cloudflare state for rollback (if not already current).
2. Connect `myprintrequest.com` (and approved `www` behavior) to production App Hosting.
3. Firebase Auth **Authorized Domains** for the canonical host.
4. Google sign-in / OAuth redirect URIs as required for the canonical host.
5. Domain-dependent smoke immediately after cutover.
6. Rollback to Coming Soon if cutover smoke fails.

**Does not authorize:** GA4 / Search Console (later), Algolia mutation, Rules redeploy, unrelated app changes.

---

## Confirmations before you approve

- [ ] Hosted.app customer smoke PASS accepted
- [ ] You accept customers will use the canonical domain after cutover
- [ ] Rollback path to Coming Soon is understood
- [ ] You will run or supervise DNS / Firebase Console / Cloudflare actions (agent does not do console DNS)

---

## Exact owner reply to unlock cutover work

```
APPROVE MYPRINTREQUEST.COM CUTOVER
```

Until that phrase: agents must **not** change DNS, custom domains, Authorized Domains, or remove Coming Soon.

---

## After approval

Agent will open a cutover execution plan (or follow DEPLOYMENT Step 12) and stop again for any console-only steps and domain smoke QA.
