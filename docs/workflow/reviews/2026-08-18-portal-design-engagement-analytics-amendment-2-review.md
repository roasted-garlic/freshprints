# Review: Portal Design Engagement Analytics — Amendment 2

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-18-portal-design-engagement-analytics-plan.md (Amendment 2) |
| Original review | docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-review.md |
| Amendment 1 review | docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-amendment-1-review.md |
| Verdict | **approved** |

---

## Summary

Owner DEV QA confirmed Amendment 1: modal virtual `page_view` titles appear in GA4 Page Title reporting. Amendment 2 makes that reporting immediately useful by prefixing `page_title` with `Modal:` / `Share:` and putting the **actual PUBLIC catalog design ID** in design `page_path` / `page_location` and `design_view.content_id`. The owner explicitly authorized that public-ID exception. The sanitizer stays default-deny for all other identifiers.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Prefixes + public catalog design IDs only; Portal analytics only |
| Architecture alignment | pass | Controller still owns route/navigation `page_view`; modal still owns the typed virtual pair |
| Security impact addressed | pass | Narrow public-catalog-ID exception; unresolved share stays templated; `/requests/:id` unchanged |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Prefix/ID/`content_id`/invalid-share/regression unit tests + owner transport QA |
| Human checkpoints identified | pass | Stop for DEV QA; no production this session |
| Roadmap alignment | pass | Narrow Phase 10 analytics; Phase 9 parked |
| Documentation plan | pass | ADR-FP-138, SECURITY, RISK, plan amendment |
| No silent scope expansion | pass | No sanitizer-wide “IDs allowed”; no generic event API |

---

## Architecture Review

**Findings:**

- Smallest change: extend share readiness to `{ kind: 'ready'; title; designId }`, override share **title + path + location** after the sanitizer (sanitizer default remains `/share/design/:id`), and pass an approved ID into the existing modal helper.
- Reuse `isValidPortalDesignShareId` / `encodeURIComponent` from `portalDesignShareUrls.ts`. Do not invent an analytics-only ID format.
- `trackDesignView` gains required `contentId` on the typed event only — not a generic parameter bag.
- Do **not** add `/catalog/design/{id}` to `ROUTE_RULES`. Physical browser paths of that shape still fail closed to `/other`.
- Do **not** `updatePageContext` for modal. Do **not** add a second navigation controller.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Owner product decision (this amendment): PUBLIC catalog design IDs may be sent to GA4 **only** when bound to a successfully resolved public catalog design, in modal virtual path/location, valid share path/location, and `design_view.content_id`.
- Recorded as **ADR-FP-138**.
- Still prohibited: request / customer / auth / upload / assisted-creation IDs, email, username, filename, private artwork metadata, `q`, `returnTo`.
- Never promote an arbitrary share route parameter. Share ready-state must use `initialMeta.designId` (the ID used to load the ready catalog design), re-validated. Invalid/not-found share remains `Shared Design` + `/share/design/:id` with no `design_view`.
- Prefixes belong on `page_title` only. Canonical `design_title` stays unprefixed.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] Later batched PR — not this session
- [x] Owner already approved the public-catalog-ID analytics exception for this goal

---

## Data Model Review

**Findings:** None.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:** None. Host gate, Measurement ID, App Hosting, `send_page_view: false`, ads flags, and `gtag('js', new Date())` stay.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Must prove exact `Modal: {title}` / `Share: {title}` `page_title`, actual public IDs in path/location, `content_id` on `design_view`, unprefixed `design_title`, modal/share dedupe, invalid share does not expose a route ID, `/requests/:id` + `q`/`returnTo` regression, bootstrap and host gate unchanged.
- Agent must not invent `g/collect`.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:** Plan Amendment 2 (done). Record owner decision in ADR-FP-138, SECURITY (narrow exception), RISK (accepted). Update ROADMAP, test report, and owner DEV QA checklist after Implement + automated Test.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

The owner explicitly approved transmitting PUBLIC catalog design IDs for design-engagement analytics. The plan keeps that exception narrow: validated public catalog identity only, after successful resolve, without weakening the sanitizer for requests or other private IDs. Surface prefixes on `page_title` do not mutate canonical titles. Architecture from Amendment 1 is preserved.

---

## Next Step

Implement Amendment 2 on `development`. Re-run automated tests. STOP for owner DEV QA. Do not sign off, commit analytics, or open a production PR.
