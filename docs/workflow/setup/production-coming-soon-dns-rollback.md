# Production Coming Soon DNS inventory and rollback (read-only)

**Date:** 2026-07-31  
**Project:** `fresh-prints-prod` / public host `myprintrequest.com`  
**Purpose:** Record the live Coming Soon configuration before any future
`APPROVE MYPRINTREQUEST.COM CUTOVER` so rollback can restore it.

**This file documents observations only. Do not treat it as authorization to change DNS.**

---

## Provider

- **DNS:** Cloudflare
- **Nameservers:** `dawn.ns.cloudflare.com`, `tim.ns.cloudflare.com`

---

## Apex `myprintrequest.com` (observed 2026-07-31)

| Type | Value | TTL |
|------|-------|-----|
| A | `104.21.26.183` | 300 |
| A | `172.67.138.87` | 300 |
| AAAA | `2606:4700:3037::6815:1ab7` | 300 |
| AAAA | `2606:4700:3031::ac43:8a57` | 300 |

These addresses are Cloudflare anycast ranges → apex is **proxied** through Cloudflare
(`Server: cloudflare`, `CF-Cache-Status: HIT` on HTTPS GET).

### HTTP behavior

| URL | Result |
|-----|--------|
| `https://myprintrequest.com` | **200**, title `MyPrintRequest - Coming Soon` |
| `http://myprintrequest.com` | **301** → `https://myprintrequest.com/` |

Exact Cloudflare Pages / Workers / origin hostname behind the proxy was **not** uniquely
determined from public headers (`[NEEDS OWNER CONFIRM]` in Cloudflare dashboard before cutover).

### TXT (informational)

- SPF include for registrar-servers forwarder
- Brevo domain verification TXT present

Do not delete verification TXT records during cutover unless Firebase/email docs require a
replacement.

---

## `www.myprintrequest.com`

- **No DNS record** (NXDOMAIN) as of 2026-07-31
- HTTPS to `www` fails with host unknown

Approved production CORS already allows `https://www.myprintrequest.com` for a future redirect or
binding; that does **not** mean `www` is live today.

---

## Production Portal (unchanged; not the public apex)

`https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` → HTTP **200**,
title `Fresh Prints Request Portal`.

---

## Pre-cutover capture checklist (owner)

Before `APPROVE MYPRINTREQUEST.COM CUTOVER`, capture in Cloudflare (do not commit secrets):

- [ ] Full DNS table export/screenshot for `myprintrequest.com`
- [ ] Proxy (orange cloud) status for each apex record
- [ ] Page Rules / Redirect Rules / Bulk Redirects affecting apex or `www`
- [ ] Coming Soon host (Pages project, Worker route, or external origin)
- [ ] SSL/TLS mode (Flexible / Full / Full strict)
- [ ] Exact Firebase App Hosting custom-domain DNS records Firebase will require

---

## Rollback steps (after a failed cutover)

1. In Cloudflare DNS, restore the recorded apex A/AAAA (or CNAME) targets and proxy status.
2. Re-enable Coming Soon host / Page Rule / redirect behavior exactly as captured.
3. Remove or disable incomplete Firebase App Hosting custom-domain entries if they conflict.
4. Leave `www` absent unless it previously existed (it did not on 2026-07-31).
5. Verify `https://myprintrequest.com` returns Coming Soon title and HTTP→HTTPS still works.
6. Keep hosted.app Portal URL as the operational production surface until a successful cutover.

Do not improvise new DNS while rolling back.
