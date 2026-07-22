# Findings: Facebook Debugger on non-root Portal URLs

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Related plan | `docs/workflow/plans/2026-07-21-portal-og-letterbox-and-global-image-toggles-plan.md` |
| Example URL | `https://myprintrequest.dev/requests/artwork?returnTo=%2Fcatalog` |

---

## Owner report

Debugger showed “This URL hasn't been shared on Facebook before” / Fetch new information for
non-root, non-`/share/design/{id}` paths. Suspected missing OG.

## Investigation (2026-07-21)

Probed with `facebookexternalhit/1.1` User-Agent:

| URL | HTTP | `og:title` / `og:image` present? |
|-----|------|----------------------------------|
| `/` | 200 | Yes |
| `/catalog` | 200 | Yes (inherits root layout global meta) |
| `/requests/artwork?returnTo=%2Fcatalog` | 200 | Yes |
| `/login` | 200 | Yes (page-level `generateMetadata`) |

**AuthGate / login overlays do not strip server meta** — they are client-only. Crawlers receive
HTML with Open Graph tags from root `generateMetadata` → `loadPortalGlobalSocialMeta`.

**Root cause of the Debugger empty state:** Facebook had never scraped that exact URL (query
string included). The empty “hasn't been shared” panel is **not** missing meta. Click **Fetch new
information** / **Scrape Again**.

**Secondary bug (fixed in this phase):** Root `buildPortalRootMetadata` hard-coded
`openGraph.url` to the site origin, so deep links advertised `og:url=https://myprintrequest.dev`
instead of the shared path. Omitted so Next.js uses the request URL.

**Library image still logo until Functions soft-deploy:** Portal already calls
`getPortalGlobalOpenGraph`; that Function returned **404** until deploy — metadata falls back to
brand logo. Soft-deploy of the new Functions is required for library rotation + letterbox URLs.

## Action

1. Soft-deploy OG Functions to `fresh-prints-dev`.
2. Owner: Fetch/Scrape Again on home, a deep link, and a design share after Studio toggle changes.
