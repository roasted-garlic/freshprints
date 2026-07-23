# Plan: Portal SEO Foundations (robots + sitemap + design page SEO)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Author | Planning Agent |
| Status | approved (owner amendments 2026-07-22) |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-22-portal-seo-foundations-review.md |

---

## Goal

Make Fresh Prints Portal crawlable and indexable for search engines and social bots: add `robots.txt`, a catalog sitemap of ready designs, and a **real server-rendered** `/share/design/{id}` landing page (canonical) with visible design content and stable public crawler image URLs. **Indexing fails closed** outside the production domain.

---

## Background

Owner directed pre-production sequence (2026-07-22):

1. **`portal-seo-foundations`** (this phase) — robots + sitemap + design page SEO  
2. **`portal-how-to-faq`** — How To / FAQ page (text + video FAQs)  
3. **`portal-google-analytics`** — GA4 on Portal  
4. **`production-release`** — ops phase for production Firebase / App Hosting / Google / email gates  

Portal already has strong Open Graph / social meta (Small Managed #11; ADR-FP-105 / FP-109) and public guest browse (ADR-FP-106). There is **no** `robots.txt` or sitemap today (`/robots.txt` 404). Catalog and home are client-heavy; the intentional crawler/share URL for individual designs is `/share/design/{id}`.

---

## Scope

### In Scope

- Next.js App Router `app/robots.ts` with **fail-closed indexing**:
  - Dev / staging / local (`myprintrequest.dev`, localhost, unknown hosts) → `Disallow: /` (still serve a real robots file so behavior is testable)
  - Production domain (`myprintrequest.com` only) → allow public crawl paths; disallow gated routes
  - Indexing is never enabled merely because `NODE_ENV=production` or project id is non-dev — host must be the production domain
- Next.js `app/sitemap.ts` (segmented if needed) listing:
  - Static public URLs: `/`, `/catalog` (and `/catalog/library` if kept as a distinct path)
  - One entry per **ready** design: `/share/design/{id}`
  - Documented **revalidate** window so newly approved designs appear in the sitemap within a predictable period (default **1 hour**)
- Server-side listing of ready design IDs for sitemap (Admin Firestore when available; **HTTP 200 + static URLs only** when Admin unavailable)
- **SSR design landing page** at `/share/design/[id]` (canonical):
  - Visible server-rendered content: image, title, description, category and/or tags when present, accessible `alt` text
  - Clear CTAs: view in library (catalog deep link) and add/request path (catalog deep link / login-aware link — no auto `location.replace`)
  - Remove automatic client redirect as the primary experience
  - `alternates.canonical` → share URL; `robots` index only when **search indexing enabled** and design ready; otherwise noindex
- **Stable public crawler image URLs** for page `<img>` and OG/Twitter:
  - Prefer public Cloud Function `getPortalOgShareImage` (no auth, no short-lived signed Storage URLs)
  - Do **not** put signed Storage URLs or private paths in sitemap or social meta
- Unit tests for indexing gate, robots allow/disallow, sitemap builders, metadata/canonical/robots, image URL builder
- Docs: `DEPLOYMENT.md` (SEO endpoints, indexing gate, sitemap revalidate), ADR in `DECISIONS.md`, ROADMAP note

### Owner amendments (2026-07-22) — required

1. Dev/staging must **not** be publicly indexed; test robots/sitemap/meta on `.dev`, but indexing fails closed until production domain.
2. `/share/design/{id}` is a **real SSR landing page** with visible design content (not meta-only + auto-redirect).
3. Design image URLs for page + social meta must be **stable and publicly fetchable** by crawlers; document sitemap caching/revalidation for new approvals.

### Out of Scope

- How To / FAQ page content or route (next managed phase: `portal-how-to-faq`)
- Google Analytics / GA4 (`portal-google-analytics`)
- Production Firebase / App Hosting / Search Console setup (`production-release`)
- New alternate SSR route (e.g. `/design/{id}`) — keep `/share/design/{id}` as canonical
- Ranking guarantees / paid SEO / backlink campaigns
- Changing AuthGate or public-browse policy beyond the share landing UX
- Indexing private surfaces (`/requests`, `/dashboard`, `/favorites`, `/custom-designs`, `/donate`, auth flows)
- Studio UI for SEO settings (reuse existing social meta settings only)
- Cloudflare Bot Fight / WAF changes (ops note only; already documented for Facebook 403)

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/app/robots.ts` (new)
- `apps/portal/app/sitemap.ts` (new; optional `sitemap/[id].ts` if segmented)
- `apps/portal/features/brand/` or `features/catalog/` helpers for robots/sitemap URL lists
- `apps/portal/features/catalog/services/portalDesignShareMetaService.ts` and/or `app/share/design/[id]/page.tsx` (canonical + robots metadata)
- `apps/portal/lib/firebase/admin.ts` (reuse `tryGetPortalAdminDb`)
- Tests under `apps/portal/**/*.test.ts`
- `docs/standards/DEPLOYMENT.md`, `docs/project/DECISIONS.md`, `docs/project/ROADMAP.md`

### Architecture Impact

- [x] Details: Portal-only; App Router metadata routes. Sitemap data access uses existing Admin pattern (same family as share meta), not client Firestore from UI. No Studio / Functions export changes required unless review chooses a dedicated list Function (prefer Admin-in-sitemap first to avoid new callables).

### Security Impact

- [x] Details: Sitemap must expose **only** `status == 'ready'` design IDs (public catalog already accepted under ADR-FP-106). Never include Storage signed URLs, PII, draft/rejected/archived designs, or auth-gated paths. Admin credentials stay server-only (`tryGetPortalAdminDb`). Rate/size: paginate queries; avoid unbounded memory.

### Data Model Impact

- [x] None (reads existing `designs.status`)

### Backend Impact

- [x] Details: No new Cloud Functions required for MVP approach. Relies on Portal Admin SDK at App Hosting runtime (already used for share/global OG fallback). Document that local sitemap may be empty/static-only without ADC — Functions-backed list is a follow-up if local completeness becomes a blocker.

### UI / UX Impact

- [x] Details: Share landing is a real public page (image + copy + CTAs). No new primary nav item required. Optional footer link to FAQ deferred to next phase. Auto client redirect removed as primary UX.

### Migration Impact

- [x] None

---

## Approach

1. **Indexing gate** — `isPortalSearchIndexingEnabled(env)` true **only** when `getPortalSiteOrigin()` hostname is `myprintrequest.com` (optional `www.`). Fail closed for `.dev`, localhost, tunnels, unknown hosts. Root + share metadata use `noindex` when disabled.
2. **Robots helper** — When indexing disabled: `Disallow: /` (testable robots file). When enabled: allow `/`, `/catalog`, `/share/design`; disallow gated routes (`/requests`, `/dashboard`, `/favorites`, `/custom-designs`, `/donate`, `/login`, `/register`, `/complete-profile`, `/login-required`). Include `Sitemap:` absolute URL when indexing enabled (optional omit when disabled).
3. **`app/robots.ts`** — Export Next `MetadataRoute.Robots` from the helper.
4. **Sitemap data loader** — Paginate Admin `designs` where `status == 'ready'` (ids + `updatedAt`). Cap/segment if needed. Admin unavailable → static URLs only, HTTP 200.
5. **`app/sitemap.ts`** — Static + share URLs; `export const revalidate = 3600` (1 hour). Document in DEPLOYMENT.
6. **Stable images** — Shared helper builds public `getPortalOgShareImage?designId=&fit=contain` URL. Portal Admin path and CF `getPortalDesignShareOpenGraph` must prefer this over signed Storage URLs for crawler-facing meta/page images.
7. **SSR share landing** — Replace `ShareDesignClientRedirect` auto-redirect with server-rendered landing (image, h1 title, description, category/tags, alt text, View in library + Add to request CTAs linking to catalog deep link / login as appropriate). Keep outside AuthGate.
8. **Metadata** — Canonical share URL; index only when indexing enabled + ready design.
9. **Tests + docs** — ADR + DEPLOYMENT (indexing gate, revalidate, stable image Function URL).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` (Portal-touched files) | yes |
| Unit tests | `npx tsx --test` on new/updated Portal SEO tests | yes |
| Build | `npm run build:portal` | yes |
| Integration | — | no |
| E2E | — | no |
| Backend/rules | — | no |

### Manual

- [x] Details:
  1. On `myprintrequest.dev` / local: `/robots.txt` is `Disallow: /` (fail closed); file is still fetchable for testing.
  2. `/sitemap.xml` returns 200 with static (+ ready share URLs when Admin available).
  3. Open a share URL as a human: see image, title, description, tags/category, CTAs — **no** auto-redirect away.
  4. View source / Debugger: OG image URL is public Function (not `GoogleAccessId` signed Storage); canonical present; meta robots noindex on .dev.
  5. Spot-check sitemap ready-only.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — light: verify robots/sitemap/share meta in browser (not visual design)
- [ ] Design approval
- [ ] Business logic decision — only if owner wants different canonical URL than `/share/design/{id}`
- [ ] Production deploy — **not** in this phase
- [ ] Database migration
- [ ] Auth / external service setup — Google Search Console deferred to `production-release`
- [ ] Secrets / env vars — none new; reuse `NEXT_PUBLIC_PORTAL_ORIGIN` / project id mapping
- [x] Other: Confirm FAQ is **not** in this phase (recorded as next goal)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Accidental indexing of .dev | High | Fail-closed host gate; unit tests; page-level noindex when disabled |
| Local/dev sitemap incomplete without Admin ADC | Medium | Static URLs always emitted; document; App Hosting has credentials |
| Large catalog blows sitemap limits | Medium | Paginate; segment if count approaches limit |
| Short-lived signed image URLs break crawlers | High | Mandate public `getPortalOgShareImage` for page + OG |
| Indexing thin client catalog pages | Low | Per-design SSR content on share landing |
| Accidental index of private paths | High | Explicit disallow list + tests; never add gated routes to sitemap |
| Scope creep into FAQ / GA / prod | Medium | Hard out-of-scope; sequence in ROADMAP |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the Portal commit(s) adding `robots.ts` / `sitemap.ts` / metadata polish. No data migration. Prior behavior returns to no robots/sitemap (404).

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [x] TESTING.md — only if new test commands need a named subsection (likely not)
- [x] DEPLOYMENT.md — robots/sitemap URLs, origin env, Search Console note pointing to production-release
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — new ADR (share URL canonical; robots/sitemap contract)
- [x] Other: ROADMAP — pre-prod sequence including FAQ + GA + production-release

---

## Open Questions

- [x] Canonical design URL = `/share/design/{id}` — confirmed (owner)
- [x] FAQ content/videos — **out of scope**; next phase `portal-how-to-faq`
- [x] Owner amendments 1–3 — documented; implementation authorized to proceed
- [x] Prefer segmented sitemaps immediately vs single file — start single; segment if ready count > ~10k

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-22-portal-seo-foundations-review.md
- Verdict: approved_with_changes + owner amendments 2026-07-22 → **implement**

---

## Pre-production sequence (owner 2026-07-22)

| # | Goal | Status |
|---|------|--------|
| 1 | `portal-seo-foundations` | **Active (implement)** |
| 2 | `portal-how-to-faq` | Queued |
| 3 | `portal-google-analytics` | Queued |
| 4 | `production-release` | Queued |
