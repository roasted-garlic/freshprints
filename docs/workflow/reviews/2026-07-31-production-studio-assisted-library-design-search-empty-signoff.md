# Signoff: Production Studio Assisted library design search empty

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-31-production-studio-assisted-library-design-search-empty-plan.md` |
| Review | `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-review.md` (**approved**) |
| Incident | `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-incident.md` |
| Test report | `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-test-report.md` |
| Implement | `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-implement-checkpoint.md` |
| Installer | `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-installer-checkpoint.md` |
| Final status | **approved** |

---

## Summary

Studio production **Share a library design** again lists ready Design Library designs when search is
empty. Root cause was a Wave C regression: `useReadyDesignsForSelection` became ID-only for Print
Requests, while the Assisted picker still called it with no IDs and always rendered an empty list.

Remediation: dedicated browse hook on the Design Library generated ready-index (ADR-FP-120) with
bounded Firestore fallback; Print Request ID-only containment preserved; suggest callable unchanged
(send-only). Production Studio installer shipped; owner QA: **PASS**.

This closes `production-studio-assisted-library-design-search-empty` under Goal #13.
`production-release` continues (Stage 2 and custom-domain cutover remain deferred until separately
authorized). Prior tag-removal / resize / branding / registration PASSes are unchanged.

---

## Changes Delivered

### Behavior

- Assisted picker loads ready designs via generated Studio ready-index (+ fallback)
- Empty search shows all loaded ready designs; title/id filter retained
- Empty-state copy distinguishes loading / unavailable / empty catalog / no search matches
- Send still uses `staffSuggestAssistedCreationCatalogDesign` (owner/admin, ready-only)

### Production

| Item | Value |
|------|-------|
| Installer | `Fresh Prints-Windows-0.0.0-Setup-assisted-library-search.exe` |
| Location | `apps/studio/release/0.0.0/` |
| Size | 106,242,754 bytes |
| SHA-256 | `998E875E885D2BCE7D96A0C16FE69092960DE6520D13B4E55EBC791651FDC0B7` |
| Embedded project | `fresh-prints-prod` |

### Files

- `AssistedCatalogDesignPickerModal.tsx`
- `useReadyDesignsForAssistedCatalogPicker.ts`
- `assistedCatalogDesignPickerSearch.ts` (+ tests)
- `assistedCatalogPickerBrowseContract.test.ts`
- `firestoreRouteContainment.test.ts`
- `docs/architecture/BACKEND.md`
- Workflow plan / review / test / implement / installer / this signoff

---

## Tests

### Automated

| Check | Result |
|-------|--------|
| Picker search + browse contract + containment | 20/20 |
| ESLint on touched Studio files | exit 0 |
| Studio `tsc` / vite / electron-builder (prod shell env) | exit 0 |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Share a library design empty search + search + send on production Studio | **PASS** | owner |

---

## Human Approvals Obtained

| Approval | Status | Date |
|----------|--------|------|
| `APPROVE STUDIO ASSISTED LIBRARY DESIGN SEARCH FIX IMPLEMENTATION` | obtained | 2026-07-31 |
| `APPROVE PRODUCTION STUDIO INSTALLER: ASSISTED LIBRARY DESIGN SEARCH FIX` | obtained | 2026-07-31 |
| Owner Studio QA | **PASS** | 2026-07-31 |

---

## Risks / follow-ups

| Item | Notes |
|------|-------|
| Generated ready-index unavailable | Bounded Firestore fallback for picker; unavailable copy if both fail |
| Helper vs owner/admin send | Pre-existing suggest gate; unchanged |
| Stage 2 | Still paused — resume only with separate owner authorization |
| Domain cutover | Deferred |

---

## Final Status

**approved** — Assisted library design search slice closed. Goal #13 continues; next gated step is
Stage 2 when the owner authorizes it.
