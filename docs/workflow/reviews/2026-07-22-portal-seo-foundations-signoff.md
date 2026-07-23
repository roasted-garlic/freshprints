# Signoff: Portal SEO Foundations

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-22-portal-seo-foundations-plan.md |
| Review | docs/workflow/reviews/2026-07-22-portal-seo-foundations-review.md |
| Test report | docs/workflow/reviews/2026-07-22-portal-seo-foundations-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-22-portal-seo-foundations-manual-checkpoint.md |
| Final status | **approved_with_notes** |

---

## Summary

Delivered Portal crawl foundations: fail-closed `robots.txt`, ready-design sitemap (1h revalidate), SSR `/share/design/{id}` landing under the Portal shell with stable public OG images (ADR-FP-116). Owner manual QA **PASS** on 2026-07-22. Dev-only verification; production indexing remains gated to `myprintrequest.com`. Next pre-prod goal: `portal-how-to-faq`.

---

## Changes Delivered

### Behavior

- **Fail-closed indexing:** robots + page `robots` meta allow index only on production host (`myprintrequest.com` / optional `www.`); `.dev` / localhost / unknown → `Disallow: /` / `noindex`.
- **Sitemap:** `/`, `/catalog`, `/catalog/library`, ready `/share/design/{id}`; Admin unavailable → static URLs only (HTTP 200); revalidate 3600s.
- **SSR share landing in Portal shell:** visible design content; auth-aware CTAs (**Add to request** vs **Sign in to add**); no auto human redirect as primary UX; post-login return maps share → catalog `?designId=`.
- **Stable crawler images:** public `getPortalOgShareImage` Function URLs (no signed Storage in meta/sitemap).
- **Guest catalog modal parity:** guests get **Sign in to add to a request** (same pattern as share landing; `returnTo` = current path + designId).
- **Polish:** centered share design column (CSS vs `.portal-page`); floating theme toggle hidden on `/share/design` (shell sidebar toggle remains).

### Files Created (representative)

- `apps/portal/app/robots.ts`, `apps/portal/app/sitemap.ts`
- `apps/portal/features/brand/portalSearchIndexing.ts` (+ tests)
- `apps/portal/features/catalog/services/portalSitemapService.ts`
- `apps/portal/app/share/design/[id]/ShareDesignLanding.tsx`
- Workflow plan / review / test / manual / this signoff

### Files Modified (representative)

- Share route page + meta service; Portal site meta; globals CSS; catalog design modal guest CTA
- `docs/standards/DEPLOYMENT.md`, `docs/project/DECISIONS.md` (ADR-FP-116), `docs/project/ROADMAP.md`

### Documentation Updated

- ADR-FP-116; DEPLOYMENT SEO endpoints; ROADMAP pre-prod sequence item 1 → Done
- This signoff; manual checkpoint PASS; test report `passed_with_notes`
- Handoff `CURRENT-STATE.md` + `13-recent-completed-work.md`

---

## Tests

### Automated

- Unit (portal SEO + shared OG URL): 20/20 pass
- Portal typecheck: pass
- Functions build: pass
- Portal build: pass (robots / sitemap / share routes present)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Robots fail-closed on `.dev` | **PASS** | Owner 2026-07-22 |
| Sitemap 200 + expected URLs | **PASS** | Owner 2026-07-22 |
| Share landing shell + button styles | **PASS** | Owner 2026-07-22 |
| Auth-aware CTA (Sign in vs Add) | **PASS** | Owner 2026-07-22 |
| Signed-in not stuck on login | **PASS** | Owner 2026-07-22 |
| Public Function crawler image URL | **PASS** | Owner 2026-07-22 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-22 | Foundations verified on `.dev`; prod indexing at `production-release` |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-07-22 | Owner PASS incl. shell/CTA/polish |
| Business / policy | N/A | | |
| Secrets / env | not required | | `NEXT_PUBLIC_PORTAL_ORIGIN` already documented |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Soft-deploy `getPortalDesignShareOpenGraph` may still be pending on `fresh-prints-dev` | low | Recommended so Function JSON matches public image + category/tags; Portal already prefers stable image URLs client-side |
| Production Search Console / allow-index cutover | medium | Deferred to `production-release` |
| Sitemap soft cap / segmentation | low | Documented follow-up if ready designs exceed soft cap |

---

## Deferred Items (Roadmap)

- `portal-how-to-faq` (next)
- `portal-google-analytics`
- `production-release`

---

## Open Blockers

- [x] None

---

## Verdict

**approved_with_notes** — Owner **PASS** closes manual QA. Automated suite passed. Notes: optional Function soft-deploy still recommended; production indexing remains fail-closed until production host + release phase. Delivery includes in-shell share landing, fail-closed indexing, guest Sign in CTA on catalog modal, and centering/theme picker polish.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes` for SEO foundations (then rolled into next goal init)
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed — no new register entry required (risks already covered by ADR / DEPLOYMENT)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Start / continue `portal-how-to-faq` (plan + review → **APPROVE IMPLEMENTATION**).
