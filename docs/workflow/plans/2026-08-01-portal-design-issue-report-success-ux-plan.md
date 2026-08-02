# Plan: Portal design issue report success UX

| Field | Value |
|-------|-------|
| Date | 2026-08-01 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-08-01-portal-design-issue-report-success-ux-review.md |

---

## Goal

After a successful Portal design-issue report submit, show a snappier confirmation: animated checkbox as the focal point, drop the form helper copy and the current thank-you line, keep a clear close path via **Done**.

## Scope

### In Scope
- Success branch only in `CatalogDesignIssueReportModal.tsx`
- CSS for animated check + success layout in `catalog.css`
- Contract test update for new success markup/classes

### Out of Scope
- Form fields, submit/validation, Functions, Rules, indexes, Studio Inbox
- Changing pre-submit “Report an Issue” title/helper copy

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/catalog/components/CatalogDesignIssueReportModal.tsx`
- `apps/portal/styles/catalog.css`
- `packages/shared/src/designIssueReports/designIssueReportContract.test.ts`

### Architecture Impact
- [x] None

### Security Impact
- [x] None

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Success state becomes centered animated check + short copy (“Report sent” / “We’ll take a look.”) with Done; form helper and old thank-you hidden on success.

### Migration Impact
- [x] None

---

## Approach

1. Restructure modal body so form vs success are mutually exclusive branches.
2. Add CSS-only animated SVG check (circle then check stroke); respect `prefers-reduced-motion`.
3. Update contract tests; run focused checks.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Contract | `npx tsx --test packages/shared/src/designIssueReports/designIssueReportContract.test.ts` | yes |

### Manual
- Submit a report → see animation and new copy → Done closes modal.

## Human Checkpoints
- Owner visual confirmation of motion/copy (lightweight; owner requested this UX).

## Risks and Rollback
- Low risk UI-only. Rollback: restore prior success branch markup/CSS.
