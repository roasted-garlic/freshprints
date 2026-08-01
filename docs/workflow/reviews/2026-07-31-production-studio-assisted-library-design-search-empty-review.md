# Formal Review: Production Studio Assisted library design search empty

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent of Planning) |
| Plan | `docs/workflow/plans/2026-07-31-production-studio-assisted-library-design-search-empty-plan.md` |
| Incident | `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-incident.md` |
| Verdict | **approved** |

---

## Summary

The empty “Share a library design” modal is a **Studio client contract break**, not a missing ready design, not a failed suggest callable, and not an index/permission mystery. Wave C correctly narrowed `useReadyDesignsForSelection` to selected IDs for Print Requests; the Assisted picker still calls it with no IDs and therefore always shows zero designs—including with empty search. The Plan correctly keeps that Print Request containment intact, redirects the picker to a browse-capable source, and gates Studio ship separately. **Approved** to implement after the owner phrase.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Client picker fix; no Stage 2/domain/data repair |
| Architecture alignment | pass | Prefer ADR-FP-120 Studio ready-index; no Portal Firestore catalog reads |
| Security impact addressed | pass | Suggest stays owner/admin; no auth weakening |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Functions not required for list emptiness; callable already live |
| Test strategy adequate | pass | Failing-before + containment + search/exclusion cases |
| Human checkpoints identified | pass | Implement phrase → Studio ship → QA; Stage 2 separate |
| Roadmap alignment | pass | Goal #13 Phase G remediation; prior PASSes untouched |
| Documentation plan | pass | Update only if source-of-truth docs need the picker path |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Root cause evidence is strong and file-grounded (`AssistedCatalogDesignPickerModal.tsx:26` + `useReadyDesignsForSelection.ts:36–38`).
- Preferring `useGeneratedReadyDesigns` over stuffing `listReadyDesigns` back into the ID-only hook is the right separation.
- Implement must confirm Customer Requests route can use catalog IPC the same way Design Library does (`[NEEDS REPO CHECK]` in Plan is appropriate, not blocking).

**Required changes:**
- [x] None for Plan approval

---

## Security Review

**Findings:**
- List/browse remains staff Studio; send remains `assertOwnerAdminCaller` + `status === "ready"`.
- No production data mutation in Plan/Review pass.
- Ephemeral empty-list is not a privileges bug.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Studio rebuild/distribute after implement (separate phrase)
- [ ] Functions deploy — not required for this fix
- [ ] Stage 2 / domain — still deferred

---

## Data Model Review

**Findings:** None. Prod fixture already eligible for share.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- `staffSuggestAssistedCreationCatalogDesign` is deployed on `fresh-prints-prod` and is the **send** path only.
- Do not treat Functions redeploy as the remediation for empty search.

**Required changes:**
- [x] None

---

## Test Review

**Findings:**
- Failing-before correctly targets the ID-less hook / picker wiring, not a fake callable search.
- Containment regression guard for Print Requests is mandatory and present.
- Manual Studio QA after ship is correctly required (Electron UI).

**Required changes:**
- [x] None

---

## Risks / residual

| Item | Notes |
|------|-------|
| Generated index unavailable | Plan’s bounded Firestore fallback for picker-only is acceptable |
| Helper vs owner/admin send | Pre-existing; optional UX note not required to close empty list |
| Prior PASSes | Must not be reopened |

---

## Verdict

**approved**

Implementation may begin only after:

```text
APPROVE STUDIO ASSISTED LIBRARY DESIGN SEARCH FIX IMPLEMENTATION
```

Do not implement, deploy, modify production data, resume Stage 2, or begin domain cutover until that phrase (and later Studio ship / QA phrases) are given.
