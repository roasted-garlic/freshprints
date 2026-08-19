# Review: Portal Design Engagement Analytics — Amendment 1

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-18-portal-design-engagement-analytics-plan.md (Amendment 1) |
| Original review | docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-review.md |
| Verdict | **approved** |

---

## Summary

Owner QA showed that `design_view` / `design_title` does not populate GA4 standard Page Title / Views. Amendment 1 adds an **intentional virtual** modal `page_view` with `page_title` = public catalog title and `page_path` = `/catalog/design/:id`, paired with the existing `design_view`. Share navigation behavior stays as implemented. The chosen API is a narrow `trackCatalogDesignModalView` — not a generic page-view/event bag, and not a second navigation controller.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Modal virtual pair only; share unchanged |
| Architecture alignment | pass | Controller remains navigation `page_view` owner; modal owns the explicit virtual pair; no `updatePageContext` for modal |
| Security impact addressed | pass | Literal `:id`; approved catalog title only; no `document.title` |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Pair/dedupe/sanitizer unit tests + existing suites; transport is owner QA |
| Human checkpoints identified | pass | Stop for DEV QA; no production this session |
| Roadmap alignment | pass | Narrow Phase 10 analytics; Phase 9 parked |
| Documentation plan | pass | Plan amendment + ROADMAP/checkpoint |
| No silent scope expansion | pass | No generic virtual-page API; no close compensating Catalog view |

---

## Architecture Review

**Findings:**

- Extending `useCatalogDesignViewAnalytics` to call a paired service function is the smallest change. The existing local `design.id` dedupe already matches the new pair semantics (open / swap / close / reopen).
- **Do not** send modal virtual views through `runPortalAnalyticsControllerTick`. That state machine owns route identity and would either skip the virtual path or require a forbidden close restore.
- **Do not** call `updatePageContext` for the virtual descriptor. That would leave the GA stream on `/catalog/design/:id` until the next navigation and invite a compensating Catalog `config`/`page_view` on close.
- **Do not** add `/catalog/design/:id` to `ROUTE_RULES` as a browser-path matcher. It is not a real Portal route. Build it as a constant virtual descriptor.
- Reuse `trackPageView` + `trackDesignView` inside `trackCatalogDesignModalView` so the gtag allowlist does not grow.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Title source remains `design.title` (public catalog). Fail closed via `approvePublicCatalogDesignTitle`.
- Virtual `page_path` / `page_location` must be the literal `/catalog/design/:id` — never interpolate `designId`.
- Parent referrer is the sanitized parent **path** from the existing sanitizer (drops `q` / `returnTo` / ids).
- No `document.title` mutation.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] Later batched PR — not this session

---

## Data Model Review

**Findings:** None.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:** None. Host gate, Measurement ID, App Hosting, and `send_page_view: false` stay.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Must prove the paired emit, sanitized virtual path, no raw id in location, close = 0, reopen = new pair, A→B pair for B, and that share/controller tests still pass.
- Agent must not invent `g/collect`.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:** Update the plan (done), ROADMAP current-work note, test report, and owner DEV QA checklist. Original review remains historical for Amendment 0.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

The usability gap is a product-analytics requirement, not a sanitizer leak. The paired typed API preserves GA4 safety (manual events only, no stream `update`, no close compensation, no IDs) while putting catalog titles into standard Page Title reporting.

---

## Next Step

Implement Amendment 1 on `development`. Re-run automated tests. STOP for owner DEV QA. Do not sign off, commit, or open a production PR.
