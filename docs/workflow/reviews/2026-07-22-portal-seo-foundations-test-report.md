# Test Report: Portal SEO Foundations

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Goal | `portal-seo-foundations` |
| Plan | docs/workflow/plans/2026-07-22-portal-seo-foundations-plan.md |
| Review | docs/workflow/reviews/2026-07-22-portal-seo-foundations-review.md |
| Status | **passed_with_notes** — automated passed; owner manual **PASS** 2026-07-22 |

---

## Commands run

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Unit | `npx tsx --test` portal SEO + shared OG URL tests | 0 | 20/20 pass |
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | |
| Functions build | `npm --prefix functions run build` | 0 | |
| Portal build | `npm run build --workspace @fresh-prints/portal` | 0 | `/robots.txt`, `/sitemap.xml` (1h revalidate), `/share/design/[id]` present |

---

## Automated coverage

- Fail-closed indexing for `.dev` / localhost / non-prod hosts
- Production host indexing enable
- Robots allow/disallow gated paths
- Share metadata canonical + noindex/index + public Function image URL (no signed Storage)
- `buildPortalOgShareImageFunctionUrl` public URL shape

---

## Manual

See `docs/workflow/reviews/2026-07-22-portal-seo-foundations-manual-checkpoint.md`.

| Area | Result | By |
|------|--------|-----|
| Robots / sitemap / SSR share landing / CTAs / crawler image | **PASS** | Owner 2026-07-22 |

---

## Notes

- Soft-deploy `getPortalDesignShareOpenGraph` to `fresh-prints-dev` still recommended so Function JSON always returns public `getPortalOgShareImage` + category/tags (Portal also forces stable image URLs client-side). Not a signoff blocker after owner PASS.
- Unrelated build blocker fixed during implement: unused `_result` in `PrintRequestDetailView.tsx` (Next build ESLint).
- Polish accepted under PASS: in-shell share landing, fail-closed indexing, guest Sign in CTA on catalog modal, centering / theme picker on share route.
