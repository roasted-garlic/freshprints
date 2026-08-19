# Review: Portal Design Engagement Analytics

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-18-portal-design-engagement-analytics-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow GA4 engagement slice on existing Portal analytics. Share `page_view` wait + title override keeps the controller as the sole `page_view` owner. `design_view` is a typed two-param event. Public catalog titles only. Host gate, sanitizer paths, bootstrap `js`, and `send_page_view: false` stay. Production PR is correctly deferred.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Share title + modal/share `design_view` only |
| Architecture alignment | pass | Controller remains sole `page_view` owner; no second owner |
| Security impact addressed | pass | Approved catalog titles; no IDs/PII/q/returnTo; stop rule if upload titles appear |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Unit wait/dedupe + typecheck + build; transport is owner QA |
| Human checkpoints identified | pass | DEV QA / `g/collect`; no production this session |
| Roadmap alignment | pass | Phase 10 analytics; Phase 9 parked |
| Documentation plan | pass | ROADMAP + later handoff |
| No silent scope expansion | pass | No generic event API; no show-clarity mix |

---

## Architecture Review

**Findings:**

- Wait-without-committing-identity is the correct way to avoid Shared Design → real title double `page_view`.
- Share override must apply only while pathname is `/share/design/:id`.
- `trackDesignView` belongs in `portalAnalyticsService.ts`.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- `loadPortalDesignShareMeta` requires `status === 'ready'` and a string title — public catalog.
- Account gallery upload tiles use lightbox, not this modal; reusable tiles are `CatalogDesign`.
- Do not send `displayTitle` (censored UI). Use `design.title` / `initialMeta.title`.

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

**Findings:** None. Do not change Measurement ID, App Hosting, or host gate source.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Existing controller tests must keep passing (non-share paths ignore share context).
- New tests must prove wait, override title, unresolved fallback, modal/share dedupe, and that gtag payloads have no id fields.
- Agent must not invent `g/collect` results.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:** ROADMAP note during implement; full handoff at later signoff after owner QA.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Title sources are public; architecture preserves the single page_view owner and the live GA4 bootstrap. Approved to implement on `development`.

---

## Next Step

Implement approved scope. Stop after automated tests for owner DEV QA / transport. Do not open a production PR.
