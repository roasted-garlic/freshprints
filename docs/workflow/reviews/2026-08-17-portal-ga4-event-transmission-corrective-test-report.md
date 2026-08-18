# Test Report: Portal GA4 event transmission corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-08-17-portal-ga4-event-transmission-corrective-plan.md |
| Review | docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-review.md |
| Implementation branch (dirty implement checkout) | `fix/td-030-share-qty-parity` @ `6a75998` — **not** the production PR source |
| Production candidate branch | `fix/portal-ga4-event-transmission` based on `origin/production` @ `124c6fa` |
| Intended production base | `origin/production` @ `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` |
| Overall | **passed** |

---

## Summary

Bootstrap correction implemented: `gtag('js', new Date())` added to `PORTAL_GA4_STUB_SCRIPT`. All applicable automated checks **pass**. Owner **DEV transport QA: PASS** — bootstrap-only corrective restored actual GA4 transport (`g/collect` 204). **Loader-aware `scriptReady` fallback was not implemented and is not required.**

Formal Review causal hypothesis (**missing `gtag('js', new Date())` prevents production transport**) is now **experimentally confirmed** by owner transport evidence (contrast: production @ `124c6fa` showed zero collect with config/page_view queued).

---

## Root-cause confirmation (post-transport QA)

| Stage | Verdict |
|-------|---------|
| Formal Review | Confirmed non-conformant defect; causality strongly supported, not A/B-proven |
| Owner DEV transport QA | **Causality confirmed** — bootstrap-only fix produces `g/collect` with sanitized params |
| Loader-aware fallback | **Not required** |

---

## Implementation reference

### Changed files (this goal — app code)

| File | Change |
|------|--------|
| `apps/portal/features/analytics/components/PortalAnalyticsScript.tsx` | Add `gtag('js', new Date());` to stub constant |
| `apps/portal/features/analytics/components/PortalAnalyticsScript.test.ts` | Bootstrap regression tests (+2 tests) |

### Bootstrap correction

**Before (`124c6fa`):**

```javascript
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
```

**After (corrective):**

```javascript
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
```

Controller remains sole owner of `gtag('config', ...)` and `gtag('event', 'page_view', ...)`.

### Unchanged (confirmed — no diff)

| Area | Path |
|------|------|
| Controller | `apps/portal/features/analytics/hooks/usePortalAnalyticsController.ts` |
| Service | `apps/portal/features/analytics/services/portalAnalyticsService.ts` |
| Sanitizer | `apps/portal/features/analytics/services/portalAnalyticsSanitizer.ts` |
| Host gate | `apps/portal/features/analytics/services/portalAnalyticsHostGate.ts` |
| Config resolver | `apps/portal/features/analytics/services/portalAnalyticsConfig.ts` |
| Boundary | `apps/portal/features/analytics/components/PortalAnalyticsBoundary.tsx` |

### Loader-aware readiness fallback

**Not implemented.** DEV transport QA **PASS** without it.

### Secrets / env hygiene

| Check | Result |
|-------|--------|
| Test Measurement ID in tracked source | **None** (local TEST stream ID is not recorded in Git) |
| Test ID in corrective app diff | **None** |
| `.env.local` committed | **No** — `git check-ignore` → `.gitignore:25:.env.local` |
| Host gate weakened in source | **No** |

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Analytics unit tests | `npx tsx --test` (6 analytics test files) | 0 | **pass** | **83/83** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | **pass** | |
| Portal build | `npm run build:portal` | 0 | **pass** | Final run after clearing stale `.next` |
| Lint (corrective files) | `npx eslint` on `PortalAnalyticsScript.tsx` + `.test.ts` | 0 | **pass** | |
| git diff --check | Corrective analytics files | 0 | **pass** | |
| Integration / E2E | — | — | skip | Not configured |
| DEV transport (`g/collect`) | Owner manual QA | — | **PASS** | See below |

---

## Owner DEV transport QA — PASS

**Recorded:** 2026-08-17  
**Procedure:** `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-dev-transport-qa.md`  
**Owner verdict:** **PASS**

### Test stream

| Item | Value |
|------|-------|
| TEST Measurement ID | Local TEST stream only — **not** production; **not** recorded in Git |
| Enhanced Measurement | **OFF** for QA run |

### Initial load

| Check | Result |
|-------|--------|
| HTTP transport | Present |
| Response | `g/collect` **204** |
| Event | `en=page_view` |
| Stream | TEST stream `tid` (local QA only) |
| Page location | `dl=https://myprintrequest.dev/` |
| Page path | `dp=/` |
| Page title | `dt=Discover` |
| Duplicate page_view | **None** — exactly one `page_view` |

### Client-side navigation to Catalog

| Check | Result |
|-------|--------|
| HTTP transport | Additional `g/collect` **204** |
| Event | `en=page_view` |
| Stream | TEST stream `tid` (local QA only) |
| Page location | `dl=https://myprintrequest.dev/catalog` |
| Page path | `dp=/catalog` |
| Page title | `dt=Catalog` |
| Referrer | `dr=/` |
| Duplicate page_view | **None** — exactly one additional `page_view` |

### Transport QA conclusion

Bootstrap-only corrective **restored actual GA4 transport**. Sanitized paths/titles observed; no duplicate page_view. **Loader-aware `scriptReady` not required.**

---

## Failures (if any)

### Portal build — first attempts (resolved)

Background run aborted; EPERM on `.next/trace` from stale lock. Cleared `apps/portal/.next`; final build **pass**.

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Owner DEV transport QA (`g/collect`) | **PASS** | Owner 2026-08-17 |
| Production transport QA | pending | After future production PR + App Hosting rollout |

---

## Signoff Readiness

- [x] All required automated checks pass
- [x] Owner DEV transport QA complete — **PASS**
- [x] Ready for Signoff phase (Implement/Test scope)

**Next step:** Signoff → independent pre-production review → production PR (separate human gates; **not** part of this Signoff)
