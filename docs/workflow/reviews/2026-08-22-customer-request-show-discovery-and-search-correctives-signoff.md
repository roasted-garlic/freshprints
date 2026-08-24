# Signoff (retrospective DEV): Customer Request, Show Discovery & Search Correctives

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Signoff by | Signoff Agent (retrospective) |
| Plan | docs/workflow/plans/2026-08-22-customer-request-show-discovery-and-search-correctives-plan.md |
| Review | docs/workflow/reviews/2026-08-22-customer-request-show-discovery-and-search-correctives-review.md |
| Test report | docs/workflow/reviews/2026-08-22-customer-request-show-discovery-and-search-correctives-test-report.md |
| Final status | **approved** (retrospective) |
| Product commit | `7dfd7ee054b1126c70e8f6d94830ff1751c9e029` |

---

## Summary

Retrospective DEV Signoff recorded during Gate B of `production-promote-portal-and-studio-2026-08-23`. Owner phrase:

`CONFIRM DEV SIGNOFF FOR PROMOTION: customer-request-show-discovery-and-search-correctives + our-shows-page-ux-and-print-request-actions`

Owner accepts the DEV behavior in commit `7dfd7ee` for production promotion, including Customer→Internal conversion, Internal Gang Sheet completion reconciliation, username registration UX/normalization, public Our Shows / Show Designs calendar and gallery, Portal show browsing callables, Discover show rails, auth return-to, Portal/Studio search normalization, and related Print Request actions.

Formal FreshForge Signoff paperwork was incomplete at original closeout; this document closes that gap. **No production deploy occurred in the original goal**; production promotion is a separate managed goal.

---

## Changes Delivered (DEV)

- WS1: `convertCustomerPrintRequestToInternal` + Studio convert UX
- WS2: `completeStaffGangSheetAndOpenNext` finish + Printed reconciliation
- WS3: Username mixed-case input + normalization + Whatnot guidance
- WS4: Public `/shows` + gallery callables (`listPortalPublicShows`, `listPortalShowCatalogDesigns`)
- WS5: Shared catalog search normalization (Portal + Studio)

DEV Firebase (2026-08-22): scoped Rules + four Functions on `fresh-prints-dev` only.

---

## Tests

- Automated: typecheck Portal/Studio, Functions build, lint, focused unit tests — `passed_with_notes` (see test report)
- Owner DEV acceptance: **confirmed 2026-08-23** via promotion confirmation phrase above

---

## Human Approvals

| Approval | Status |
|----------|--------|
| Production deploy | not in this goal |
| Retrospective DEV Signoff for promotion | **obtained** 2026-08-23 |

---

## Verdict

**approved** (retrospective) — eligible for production promotion under `production-promote-portal-and-studio-2026-08-23`.
