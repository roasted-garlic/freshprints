# Review: Studio Print Request item Download dirty-preset fix

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-16-studio-print-request-item-download-dirty-preset-fix-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow hotfix: Studio item cards falsely report dirty when `standardSizePresetKey` is set because dirty/unsaved checks omit that field from the signature while saved state includes it. Plan correctly mirrors Portal and leaves other download gates intact. Proceed to implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Two call sites + contract guard |
| Architecture alignment | pass | UI-only signature consistency |
| Security impact addressed | pass | No permission/export rule changes |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Contract + Studio tsc; optional owner smoke |
| Human checkpoints identified | pass | None blocking |
| Roadmap alignment | pass | Bugfix restoring intended download |
| Documentation plan | pass | Workflow artifacts sufficient |
| No silent scope expansion | pass | Tooltip deferred |

---

## Architecture Review

**Findings:**
- Signature helper already accepts preset key; only dirty/unsaved call sites were incomplete.

**Required changes:**
- None

---

## Security Review

**Findings:**
- Download remains behind existing staff manage + asset resolution path.

**Required changes:**
- None

---

## Required Changes Before Implementation

None.

---

## Verdict Rationale

Approved as a one-file logic fix with regression contract coverage.
