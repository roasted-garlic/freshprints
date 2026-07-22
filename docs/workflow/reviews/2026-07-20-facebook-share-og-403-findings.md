# Findings: Facebook Sharing Debugger HTTP 403 on QA share URL

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| URL | `https://myprintrequest.dev/share/design/Ab2dBnwdAmWG6ivXpzIC` |
| Symptom (owner) | Debugger: **HTTP 403**, Bad Response Code; `og:title` falls back to `myprintrequest.dev`; empty description; no useful preview. Facebook hints robots.txt / allow-list `facebookexternalhit`. |
| Scope | Investigation only (docs + human Cloudflare checklist). No app code change. |

## Verdict

**Not AuthGate.** Portal AuthGate is a **client-side** redirect to `/login` inside `(app)` layouts. Share route `/share/design/[id]` is outside AuthGate and serves HTML with `generateMetadata` OG tags. AuthGate does not emit HTTP 403.

**Best evidence for 403:** edge/tunnel (Cloudflare Bot Fight / WAF / Access, or origin unreachable) at crawl time — not missing OG implementation.

## Live probe (2026-07-20, tunnel + Portal up)

| Probe | Result |
|-------|--------|
| `HEAD` / `GET` with `facebookexternalhit/1.1` UA | **HTTP 200** |
| Browser-like / empty UA | **HTTP 200** |
| HTML body | Full design OG: title `Highland Cow Attitude Bow`, description, signed Storage `og:image` |
| `/robots.txt` | **404** (Next default; no disallow rules) |
| Portal `middleware.ts` | **None** |
| `Server` header | `cloudflare` |

## Code / routing notes

- Share page: `apps/portal/app/share/design/[id]/page.tsx` — `dynamic = 'force-dynamic'`, metadata via `getPortalDesignShareOpenGraph` path.
- No repo `robots.txt`; 404 ≠ 403.
- QA host `myprintrequest.dev` = Cloudflare Tunnel → local Portal `:3100` (`docs/workflow/setup/portal-cloudflared-tunnel-setup.md`).

## Owner actions (human — Cloudflare / tunnel)

1. Confirm **Portal** (`npm run dev:portal`) and **named tunnel** are running while scraping.
2. In Cloudflare dashboard for `myprintrequest.dev`: Security → **Bots** (Bot Fight Mode / Super Bot Fight) — disable or configure so `facebookexternalhit` is not challenged/blocked; check **WAF** / **Custom rules** / **Zero Trust Access** if enabled on the hostname.
3. Re-run [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → **Scrape Again**.
4. Optional later (managed phase): add `apps/portal/public/robots.txt` allowing social crawlers — helpful hygiene, **not** a fix for 403.

## App follow-up (only if 403 persists after CF check)

- Capture response body/headers of the 403 (CF challenge HTML vs origin).
- Confirm production App Hosting host separately — production crawler path may differ from QA tunnel.

## Related backlog

- Small Managed **#13** Public browse + login-gated actions (ROADMAP) — separate product work; do not conflate with this QA crawler 403.
