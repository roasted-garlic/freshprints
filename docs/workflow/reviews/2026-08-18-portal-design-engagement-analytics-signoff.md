# Signoff: Portal Design Engagement Analytics

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-08-18-portal-design-engagement-analytics-plan.md |
| Review | docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-review.md |
| Amendment 1 review | docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-amendment-1-review.md |
| Amendment 2 review | docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-amendment-2-review.md |
| Test report | docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-test-report.md |
| Owner public-ID decision | ADR-FP-138 |
| Final status | **approved** |

---

## Summary

Portal now sends design-engagement analytics that GA4 standard Page Title and Page Path reports can use: **what** design was viewed, **how** (modal vs share), and **which** public catalog record.

This signoff covers the **final Amendment 2** contract, not the pre-amendment (title-only / `:id` placeholder) behavior. Owner DEV transport QA: `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS`.

Show-clarity (`portal-add-to-show-unmissable`) is a separate signed-off goal and is **not** mixed into this product commit.

---

## Final behavior (Amendment 2)

### Modal (virtual analytics page; browser URL / history / `document.title` unchanged)

`page_view`:

- `page_title` = `Modal: {canonical public catalog title}`
- `page_path` = `/catalog/design/{actual public catalog design ID}`
- `page_location` = `{origin}/catalog/design/{actual public catalog design ID}`

`design_view`:

- `design_title` = canonical public title (no `Modal:` prefix)
- `design_surface` = `modal`
- `content_id` = actual public catalog design ID

Dedupe: open A = 1 pair; rerender / lightbox / favorite / qty = 0; A→B = 1 pair for B; close = 0; reopen = 1 new pair. No compensating Catalog `page_view` on close.

### Share (physical Portal route unchanged)

`page_view` (exactly one after share readiness; no generic Shared Design first hit):

- `page_title` = `Share: {canonical public catalog title}`
- `page_path` = `/share/design/{actual public catalog design ID}`
- `page_location` = `{origin}/share/design/{actual public catalog design ID}`

`design_view`:

- `design_title` = canonical public title (no `Share:` prefix)
- `design_surface` = `share_page`
- `content_id` = actual public catalog design ID

### Invalid / not-found share

One `page_view` with sanitizer title `Shared Design` and path `/share/design/:id`. No `design_view`. No arbitrary route ID as public catalog identity.

### Privacy / GA4 safety

- Public catalog design IDs only, after successful resolve — **ADR-FP-138**
- Request / customer / auth / upload / assisted IDs remain prohibited
- `/requests/:id` remains sanitized
- `q` and `returnTo` remain dropped
- `send_page_view: false` preserved
- Enhanced Measurement remains OFF
- `allow_google_signals: false`
- `allow_ad_personalization_signals: false`
- Production host gate preserved
- `gtag('js', new Date())` preserved
- Analytics failures remain non-blocking
- No Functions / Rules / indexes / App Hosting / Secret Manager changes

---

## Changes Delivered

### Behavior

- Root controller remains the sole **route/navigation** `page_view` owner.
- Modal owns the typed virtual `page_view` + `design_view` pair (`trackCatalogDesignModalView`).
- Share wait until ready/unresolved, then one titled `page_view`.
- Surface prefixes on `page_title` only.

### Files Created

- `apps/portal/features/analytics/context/PortalAnalyticsShareTitleContext.tsx`
- `apps/portal/features/analytics/hooks/useCatalogDesignViewAnalytics.ts`
- `apps/portal/features/analytics/services/approvePublicCatalogDesignId.ts`
- `apps/portal/features/analytics/services/approvePublicCatalogDesignId.test.ts`
- `apps/portal/features/analytics/services/approvePublicCatalogDesignTitle.ts`
- `apps/portal/features/analytics/services/approvePublicCatalogDesignTitle.test.ts`
- `apps/portal/features/analytics/services/catalogDesignViewDedupe.ts`
- `apps/portal/features/analytics/services/catalogDesignViewDedupe.test.ts`
- `apps/portal/features/analytics/services/designEngagementWiring.test.ts`
- `docs/workflow/plans/2026-08-18-portal-design-engagement-analytics-plan.md`
- `docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-review.md`
- `docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-amendment-1-review.md`
- `docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-amendment-2-review.md`
- `docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-test-report.md`
- `docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-dev-qa-checkpoint.md`
- `docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-signoff.md`

### Files Modified

- `apps/portal/app/providers.tsx`
- `apps/portal/features/analytics/hooks/usePortalAnalyticsController.ts`
- `apps/portal/features/analytics/hooks/usePortalAnalyticsController.test.ts`
- `apps/portal/features/analytics/services/portalAnalyticsSanitizer.ts`
- `apps/portal/features/analytics/services/portalAnalyticsSanitizer.test.ts`
- `apps/portal/features/analytics/services/portalAnalyticsService.ts`
- `apps/portal/features/analytics/services/portalAnalyticsService.test.ts`
- `apps/portal/features/analytics/types/portalAnalytics.types.ts`
- `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx`
- `apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx`
- `docs/project/DECISIONS.md` (ADR-FP-138)
- `docs/project/RISK_REGISTER.md` (R-019)
- `docs/project/ROADMAP.md`
- `docs/standards/SECURITY.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`
- `references/project-chatgpt-handoff/03-roadmap-and-phases.md`
- `references/project-chatgpt-handoff/04-features-inventory.md`
- `references/project-chatgpt-handoff/12-decisions-and-constraints.md`
- `references/project-chatgpt-handoff/10-security-essentials.md`

### Documentation Updated

- Plan + original / Amendment 1 / Amendment 2 reviews + test report + DEV QA checkpoint + this signoff
- ADR-FP-138, SECURITY public-catalog-ID exception, RISK R-019
- ROADMAP + ChatGPT handoff

---

## Tests

### Automated

- Analytics unit suite `npx tsx --test` Portal analytics `*.test.ts` — **109/109** pass
- `npm run typecheck --workspace @fresh-prints/portal` — exit 0
- Touched-file ESLint `--max-warnings 0` — exit 0
- `npm run build:portal` — exit 0
- `git diff --check` — exit 0

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV transport QA (TEST stream via myprintrequest.dev; Amendment 2 modal + share) | PASS | human (`DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS`) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required this signoff | 2026-08-18 | Later App Hosting after merge; not this step |
| Database migration | N/A | | None |
| Design / UX | N/A | | Analytics-only; no `document.title` / history change |
| Business / policy | obtained | 2026-08-18 | Public catalog design IDs in GA4 — ADR-FP-138 |
| Secrets / env | N/A | | No Measurement ID in git |
| Owner DEV QA | obtained | 2026-08-18 | `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS` |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Public catalog IDs in GA4 | Low | Narrow exception (ADR-FP-138 / R-019); sanitizer still templates private IDs |
| Production App Hosting | Medium | Separate human checkpoint after `development` → `production` merge |

---

## Deferred Items (Roadmap)

- Independent pre-merge audit of the batched production PR
- Owner merge authorization
- App Hosting rollout (not authorized)
- Phase 9 remains PARKED
- `portal-tag-alias-search-discoverability` remains QUEUED ONLY

---

## Open Blockers

- [x] None for this DEV signoff

---

## Verdict

**approved**

Final Amendment 2 behavior matches the approved plan and review. Automated tests passed. Owner TEST-stream transport QA passed. Privacy exception is recorded (ADR-FP-138). GA4 safety flags and host gate are preserved. No backend/rules/App Hosting changes.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated**
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files per `references/project-chatgpt-handoff/MANIFEST.md` when behavior/architecture changed

**Recommended next action for user:** Independent pre-merge audit of the `development` → `production` PR. Do not merge or deploy App Hosting from this signoff.
