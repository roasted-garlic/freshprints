# Plan: Portal home at `/` and library at `/catalog`

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | ready_for_review |
| Workflow | managed-phase amendment |

## Goal

- Discover / Current Request home: **`/`** (was `/catalog`)
- Design Library: **`/catalog`** (was `/catalog/library`)
- Remove **Home** nav item; logo → `/`
- Redirect legacy `/catalog/library` → `/catalog` for bookmarks

## Scope

Path constants, app routes, nav, auth post-login redirects, back links, providers route detection. No product behavior change beyond URLs.

## Approach

1. `CATALOG_HOME_PATH = '/'`, `CATALOG_LIBRARY_PATH = '/catalog'`
2. `(app)/page.tsx` → CatalogHomePageContent; remove root bounce page
3. `(app)/catalog/page.tsx` → CatalogPageContent; `library/page` → redirect
4. Nav: drop Home; active state for `/` and `/catalog`
5. Login/register → `/`
