# Human Checkpoint: Portal SEO Foundations — Manual QA

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Workflow | managed-phase / test / `portal-seo-foundations` |
| Status | **PASS** (owner 2026-07-22) |

---

## Manual Test Checkpoint

**Feature / area:** Portal SEO foundations (robots, sitemap, SSR share landing, stable images)  
**Why automated tests are insufficient:** Need live host verification of robots fail-closed, sitemap contents, and visible share landing HTML.  
**Environment:** `https://myprintrequest.dev` (and/or local Portal if preferred)  
**Prerequisites:** At least one ready design id; Portal App Hosting up to date with this branch (or local `npm run dev:portal` with Admin if testing sitemap design entries). Soft-deploy `getPortalDesignShareOpenGraph` optional but recommended.

### Steps

1. Open `https://myprintrequest.dev/robots.txt` → **Expected:** `Disallow: /` (fail closed; still a real robots file). No production allow rules.
2. Open `https://myprintrequest.dev/sitemap.xml` → **Expected:** HTTP 200; includes `/`, `/catalog`, and (when Admin available on host) `/share/design/{id}` for ready designs only.
3. Open `https://myprintrequest.dev/share/design/{READY_ID}` **signed out** → **Expected:** full Portal chrome (sidebar/header); design preview with Portal button styles; **Sign in to add to a request** (not bare blue text links); **no** auto-redirect away.
4. Same URL **signed in** → **Expected:** **Add to request** primary button (favorite/share tools as on catalog details).
5. From a guest CTA, go through login → **Expected:** land on catalog with that design open (`?designId=`), or Discover if no return path. If already signed in and you hit `/login` or `/login-required`, redirect away to Discover/returnTo (do not stay on login).
6. View page source / Debugger on share URL → **Expected:** OG tags; `og:image` = `getPortalOgShareImage`; noindex on `.dev`.

### Pass criteria

- [x] Robots fail-closed on `.dev`
- [x] Sitemap 200 + expected URLs
- [x] Share landing uses Portal shell + site button styles
- [x] Auth-aware CTA (Sign in vs Add to request)
- [x] Signed-in users are not stuck on login / login-required
- [x] Crawler image URL is public Function URL

### Owner result

**PASS** — 2026-07-22.

Session polish accepted as part of delivery (not separate FAIL notes):

- In-shell share landing (Portal chrome; no bare redirect-only experience)
- Fail-closed indexing (ADR-FP-116)
- Guest **Sign in to add to a request** CTA on catalog design modal (parity with share landing)
- Share design column centering + theme picker polish on `/share/design`

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups  

Optional soft-deploy (dev only, when ready):

```bash
firebase deploy --only functions:getPortalDesignShareOpenGraph --project fresh-prints-dev
```
