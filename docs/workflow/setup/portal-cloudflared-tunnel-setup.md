# Portal Remote Testing — Cloudflare Tunnel

## Purpose

Expose the local Fresh Prints Portal dev server (`http://localhost:3100`) to the internet for testing on phones, tablets, or other networks — without deploying to Firebase App Hosting.

## Prerequisites

- Portal dev server running: `npm run dev:portal`
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed (already on this machine at `C:\Program Files (x86)\cloudflared\cloudflared.exe`)
- Firebase project configured in `apps/portal/.env.local`

## Option A — Quick tunnel (fastest for ad-hoc testing)

Use this when you want a public URL in under a minute. The hostname **changes every time** you restart the tunnel.

### Steps

1. Start the Portal (terminal 1):

```bash
npm run dev:portal
```

2. Start the tunnel (terminal 2):

```bash
npm run tunnel:portal
```

Or directly:

```bash
cloudflared tunnel --url http://localhost:3100
```

3. Copy the `https://….trycloudflare.com` URL from the tunnel output.

4. Add that hostname to Firebase **Authorized domains** (required for customer login/register from the tunnel URL):

   - Firebase Console → **Authentication** → **Settings** → **Authorized domains**
   - Click **Add domain**
   - Enter only the hostname (example: `heading-adams-wonder-eddie.trycloudflare.com`)
   - Save

5. Open the tunnel URL on your remote device and test `/login`, `/register`, `/catalog`.

### Notes

- Keep **both** terminals running while testing.
- Quick tunnels are for development only (no uptime guarantee).
- Each new tunnel run gets a new subdomain — repeat step 4 when the URL changes.

## Option B — Named tunnel (stable hostname)

Use this when you want the same URL across restarts (recommended if you remote-test often).

Requires a free Cloudflare account and a domain on Cloudflare (or a subdomain you control).

High-level steps:

1. Log in: `cloudflared tunnel login`
2. Create tunnel: `cloudflared tunnel create fresh-prints-portal-dev`
3. Route DNS: `cloudflared tunnel route dns fresh-prints-portal-dev portal-dev.yourdomain.com`
4. Create config at `%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: C:\Users\<YOU>\.cloudflared\<TUNNEL_UUID>.json

ingress:
  - hostname: portal-dev.yourdomain.com
    service: http://localhost:3100
  - service: http_status:404
```

5. Run: `cloudflared tunnel run fresh-prints-portal-dev`
6. Add `portal-dev.yourdomain.com` once to Firebase Authorized domains.

See Cloudflare docs: [Create a locally-managed tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/local-management/create-local-tunnel/).

## Verification

| Check | Expected |
|-------|----------|
| Tunnel URL loads `/` | Portal home or redirect |
| `/catalog` while signed in | Design grid loads |
| Login from phone | Succeeds after domain is authorized |
| Thumbnails | Load (Storage rules already deployed) |

## Common issues

| Symptom | Fix |
|---------|-----|
| `502` / connection error | Confirm `npm run dev:portal` is running on port 3100 |
| `500 Internal Server Error` after route/code changes | Stop dev server, delete `apps/portal/.next`, restart `npm run dev:portal` |
| `500` on `/favicon.ico` | Do **not** keep both `apps/portal/app/favicon.ico` and `apps/portal/public/favicon.ico`. Next.js App Router treats `app/favicon.ico` as a page route → **conflicting-public-file-page**. Keep icons in `public/` + `portalSiteMeta` `icons` only. |
| Firebase auth fails on tunnel URL | Add tunnel hostname to Authorized domains |
| New tunnel URL after restart | Re-add hostname (quick tunnel) or use named tunnel |
| Page loads but API errors | Confirm `apps/portal/.env.local` points at `fresh-prints-dev` |
| Console: `WebSocket … /_next/webpack-hmr` failed | **Expected / harmless** for tunnel QA. Cloudflare Tunnel often does not reliably upgrade Next.js HMR WebSockets. Hot reload may not work on `myprintrequest.dev`; use `http://localhost:3100` for HMR. No tunnel config change required for normal remote testing. |
| Console: `Cross-Origin-Opener-Policy` would block `window.closed` / `window.close` | **Usually harmless** browser noise from Firebase `signInWithPopup` / Google Identity. Portal does not set COOP headers. Ignore if Google sign-in still completes; only revisit headers if auth is actually broken. |
| Facebook Sharing Debugger **HTTP 403** / empty OG on `myprintrequest.dev` | Usually **not** Portal AuthGate (client redirect, not 403). With tunnel + Portal up, `/share/design/{id}` returns **200** and full `og:*` tags. Likely cause: Cloudflare **Bot Fight Mode** / WAF / Access challenge, or tunnel/origin down when Facebook crawled. Check Cloudflare Security → Bots / WAF for the zone; allow or skip challenges for `facebookexternalhit`. Keep Portal + named tunnel running during scrape. `robots.txt` is currently **404** (no disallow); optional later: explicit allow for social crawlers — does not fix 403 by itself. Re-scrape in Debugger after CF/tunnel is healthy. See `docs/workflow/reviews/2026-07-20-facebook-share-og-403-findings.md`. |

## Completion checklist

- [ ] Portal dev server running on port 3100
- [ ] Tunnel running and URL copied
- [ ] Tunnel hostname added to Firebase Authorized domains
- [ ] Remote device can sign in and browse catalog
- [ ] `/favicon.ico` returns **200** (not 500) after hard refresh

## Console triage note (2026-07-20)

Owner reported three console issues on `myprintrequest.dev`:

| Error | Worry? | Resolution |
|-------|--------|------------|
| `/favicon.ico` 500 | Yes | Fixed — removed duplicate `app/favicon.ico` that conflicted with `public/favicon.ico` |
| HMR WebSocket failed | No | Expected over tunnel; use localhost for HMR |
| COOP `window.closed` / `window.close` | No (if auth works) | Firebase popup noise; no Portal COOP headers |
