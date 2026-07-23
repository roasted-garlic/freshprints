# Review: Portal SEO Foundations

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-portal-seo-foundations-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly scopes crawl foundations to robots + sitemap + share-route SEO polish, keeps FAQ / GA / production out, and reuses the existing `/share/design/{id}` canonical surface (ADR-FP-105). Conditional approval adds implementer constraints for Admin fallback clarity, disallow completeness, and sitemap size handling.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | FAQ/GA/prod explicitly out |
| Architecture alignment | pass | App Router metadata routes; Admin server-only |
| Security impact addressed | pass | ready-only; no signed URLs in sitemap |
| Data model impact addressed | pass | Read-only `status == ready` |
| Backend impact addressed | pass | Prefer Admin-in-sitemap; no new Functions required |
| Test strategy adequate | pass | Unit + portal typecheck/lint/build + light manual |
| Human checkpoints identified | pass | Manual robots/sitemap/share check; Search Console deferred |
| Roadmap alignment | pass | Pre-prod sequence recorded |
| Documentation plan | pass | ADR + DEPLOYMENT + ROADMAP |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Canonical design SEO URL remains `/share/design/{id}` — correct; do not invent `/design/{id}` in this phase.
- Catalog/`?designId=` stays UX deep-link only — correct for crawlers.
- Admin query in `sitemap.ts` matches existing share-meta Admin pattern.

**Required changes:**
- [x] When Admin is unavailable, sitemap must still return **200** with static public URLs only (never 500 the route).
- [x] Do not add a new Cloud Function in this phase unless Admin-on-App-Hosting proves impossible (then stop and revise).

---

## Security Review

**Findings:**
- Ready-only filter is mandatory; archived/rejected/imported must never appear.
- Disallow list must cover gated Portal surfaces; sitemap must not list them.

**Required changes:**
- [x] Unit-test disallow paths include at least: `/requests`, `/dashboard`, `/favorites`, `/custom-designs`, `/donate`, `/login`, `/register`.
- [x] Never put Storage signed URLs or design blobs in sitemap entries.

**Human approval needed before production:**
- [x] Google Search Console / production domain verification — deferred to `production-release`

---

## Data Model Review

**Findings:**
- No schema changes.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Local sitemap incompleteness without ADC is acceptable and already anticipated.
- Origin must come from `getPortalSiteOrigin()` so `Sitemap:` and absolute URLs match env.

**Required changes:**
- [x] Document in DEPLOYMENT that App Hosting should set `NEXT_PUBLIC_PORTAL_ORIGIN` for correct absolute sitemap/robots URLs.

---

## Testing Review

**Findings:**
- Adequate for foundations. Manual check on `myprintrequest.dev` after soft-deploy/hosting is preferred when Admin is live.

**Required changes:**
- [x] Include at least one unit test that builds sample sitemap entries from a fake ready-id list (no live Firestore).

---

## Documentation Review

**Findings:**
- ADR + DEPLOYMENT + ROADMAP updates are required in the same implementation pass.

---

## Required Changes (if approved_with_changes)

1. Sitemap route returns 200 with static URLs when Admin unavailable (no throw).
2. Disallow-path unit coverage for gated routes listed above.
3. DEPLOYMENT note for `NEXT_PUBLIC_PORTAL_ORIGIN` + robots/sitemap endpoints.
4. No new Functions unless blocked; no FAQ/GA/prod scope.

---

## Blockers (if blocked)

(none)

---

## Verdict Rationale

Bounded, aligned with public-browse + share-meta architecture, security-aware. Conditional changes are implementer guardrails, not plan rewrites.

---

## Owner amendments (2026-07-22)

Recorded in plan before implement:

1. **Fail-closed indexing** — `.dev` / staging / local must not be indexed; robots/sitemap/meta remain testable; indexing only for production domain `myprintrequest.com`.
2. **SSR share landing** — `/share/design/{id}` is a real server-rendered design page (image, title, description, category/tags, alt, CTAs); no auto client redirect as primary UX.
3. **Stable public images + sitemap revalidate** — page + social image URLs must be public Function URLs (not short-lived signed Storage); document ~1h sitemap revalidation for new approvals.

Prior review constraints remain in force (ready-only, static Admin fallback, gated-route coverage, no signed URLs / PII in sitemap).

---

## Next Step

**Implement** `portal-seo-foundations` under plan + review + owner amendments.
