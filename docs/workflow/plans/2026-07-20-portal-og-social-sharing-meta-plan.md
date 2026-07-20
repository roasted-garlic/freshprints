# Plan: #11 Portal OG / social sharing meta (expanded v3)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | Small Managed #11; owner expansions (share modal/deep link/per-design OG + card share + Studio global OG) |

---

## Goal

Social link previews show proper OG/Twitter meta. Customers can share designs from **cards and modals**; shared design URLs open the details modal; crawlers get **per-design** OG on `/share/design/[id]`. Non-design Portal URLs use **Studio-configurable** global title/description plus a **daily-rotated random ready-library image**.

## Scope

### In Scope

- Site-wide / login / register OG (async from settings + random library image)
- `/share/design/[id]` per-design OG (Admin; ready only) + client deep link to `/catalog?designId=`
- Share on design details **modal** and **selection cards** (title row: truncate + share; no overlap)
- Studio Settings: global OG **title** + **description** (`settings/portalSocialMeta`, owner callable)
- Soft-deploy Portal App Hosting + functions/rules to **fresh-prints-dev** as needed
- Docs / ROADMAP / state

### Out of Scope

- Production deploy; commit; anonymous Firestore/Storage rules; #12 Studio messaging flow

---

## URL patterns

| Purpose | Pattern |
|---------|---------|
| Design share / OG | `/share/design/{designId}` |
| Deep link (modal) | `/catalog?designId={designId}` (also `/`) |
| Global OG | Any other Portal URL (home, login, register, …) |

## Global random image (approach)

Server Admin loads a small sample of **ready** designs (e.g. newest 40), picks index `floor(unixDay) % sampleSize` so the image is **stable for ~24h** (cache-friendly) yet rotates daily. Falls back to brand logo if Admin/sample unavailable. Per-design share URLs never use this path.

## Settings location

Studio → **Settings** → tab **Social sharing** (owner) → title + description fields → Save via `updatePortalSocialMetaSettings`.

---

## Approval

- Review: docs/workflow/reviews/2026-07-20-portal-og-social-sharing-meta-review.md
- Verdict: pending re-review
