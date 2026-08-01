# Plan: Production Studio Assisted library design search empty

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (Goal #13 narrow slice) |
| Goal id | `production-studio-assisted-library-design-search-empty` |
| Incident | `docs/workflow/reviews/2026-07-31-production-studio-assisted-library-design-search-empty-incident.md` |
| Related | ADR-FP-108 / ADR-FP-120; Wave C Print Request ID-only ready-design loads; Small Managed #12 library design sharing |

---

## Goal

Studio production **Share a library design** modal lists eligible ready Design Library designs when search is empty (and filters by title/id when typed), without weakening staff authorization or Assisted Creation lifecycle, and without undoing Wave C Print Request read containment.

---

## Background

Owner sees “No ready designs match that search.” with empty search despite ready designs in production. Incident proves the modal calls `useReadyDesignsForSelection()` with no IDs after Wave C narrowed that hook to selected-ID fetches only — so the picker always loads zero designs. `staffSuggestAssistedCreationCatalogDesign` is only used on Send and is already live on production.

---

## Scope

### In Scope

1. Fix Assisted catalog picker data loading so empty search shows ready designs.
2. Preserve Print Requests’ ID-only `useReadyDesignsForSelection(selectedDesignIds)` contract and containment tests.
3. Client filter: empty needle → all loaded ready; title/id substring match; exclude non-ready at source.
4. Empty-state UX: distinguish loading / load error / zero ready designs / no search matches.
5. Failing-before + passing-after automated tests (hook/modal contract + filter + exclusions).
6. Docs note if Design Library vs Assisted picker data source is documented.
7. Human-gated **Studio production rebuild/distribute** after implement (not Functions-first).

### Out of Scope

- Functions deploy for list/search (callable already live; touch only if send-path bugs found)
- Production data repair / catalog rebuild / Rules/index deploy
- Stage 2 / domain / GA4 / tag-publication / schema-parity audit
- Returning archived/non-ready; removing owner/admin suggest gate
- Portal direct Firestore catalog reads; App Hosting; installer beyond this fix’s Studio ship

---

## Affected Areas

### Files / Modules (expected)

| Path | Role |
|------|------|
| `apps/studio/.../AssistedCatalogDesignPickerModal.tsx` | Stop ID-less `useReadyDesignsForSelection()`; wire browse source + empty-state copy |
| New or existing ready-browse hook (e.g. reuse `useGeneratedReadyDesigns` / thin wrapper) | Load ready catalog for picker |
| `apps/studio/.../useReadyDesignsForSelection.ts` | **Leave ID-only** for Print Requests (unless extracting shared helpers without changing contract) |
| `apps/studio/.../firestoreRouteContainment.test.ts` | Keep Print Request assertions; add Assisted picker must not call ID-less selection hook |
| Tests for picker filter / load contract | Failing-before / passing-after |
| Docs (BACKEND / feature notes) | Only if behavior source changes |

Mark unverified helpers at implement `[NEEDS REPO CHECK]`.

### Architecture Impact

- [x] Details: Assisted picker becomes a **browse** consumer (prefer generated Studio ready-index like Design Library, or bounded `listDesignsPage` ready query). Must not reintroduce full ready-list loads into Print Request ID-only hook.

### Security Impact

- [x] Details: Staff-only Studio; suggest remains owner/admin callable. No auth weakening. No Portal Firestore catalog reads from Studio.

### Data Model Impact

- [x] None

### Backend Impact

- [x] None required for empty-list fix. Suggest callable unchanged unless a separate send bug appears.

### UI / UX Impact

- [x] Details: Modal lists ready designs; clearer empty states; owner manual QA on production Studio after rebuild.

### Migration Impact

- [x] None. No production data repair.

---

## Approach

1. **Failing-before:** Assert `useReadyDesignsForSelection()` with `[]` yields empty designs; assert picker source currently uses that call (structural); with seeded ready design, empty-search filter over empty list returns 0.
2. **Implement browse source for picker only:**
   - **Preferred:** Reuse `useGeneratedReadyDesigns` (+ `resolveVisibleCards` for visible rows) — aligns with Design Library / ADR-FP-120, Electron IPC, no Wave C regression on Print Requests.
   - **Fallback if generated unavailable:** bounded Firestore `listDesignsPage({ status: "ready" })` / existing `printRequestService.listReadyDesigns` in a **dedicated** assisted-picker hook — not inside `useReadyDesignsForSelection`.
3. Keep client search: empty → all; title/id includes; cap display (existing 80).
4. Send path unchanged: `staffSuggestAssistedCreationCatalogDesign` with selected `designId`.
5. Do not put `listReadyDesigns` back into `useReadyDesignsForSelection`.
6. Studio typecheck/lint/tests; stop for implement phrase; then Studio installer / production distribute phrase; then owner QA.

### Preserve

- Design Library = `ready` only
- Staff-only Studio; owner/admin suggest
- Assisted lifecycle + audit / proofs catalog_share row
- Canonical Firestore on send
- Archive / non-ready exclusion
- No production status on designs
- Wave C Print Request selected-ID containment

---

## Test Strategy

### Automated (required)

| Case | Expect |
|------|--------|
| Failing-before: ID-less `useReadyDesignsForSelection` returns `[]` | documents current break |
| Structural: picker must not call `useReadyDesignsForSelection()` with no browse source | fail before / pass after |
| Empty search returns seeded ready design | pass after |
| Exact title and design-id substring search | pass after |
| Archived / non-ready excluded from source | pass after |
| Print Request containment: hook still ID-only / no `listReadyDesigns` in that hook | pass |
| Suggest/send still owner/admin + ready-only (existing callable tests / no weaken) | pass |

### Manual (after Studio production ship)

| Check | Expect |
|-------|--------|
| Open Share a library design, empty search | Ready designs listed |
| Search title / id | Filters correctly |
| Send to customer | Existing proof_ready / catalog_share lifecycle |
| Hard restart Studio | Still lists |

---

## Human Checkpoints Anticipated

| Checkpoint | Phrase / action |
|------------|-----------------|
| Implement | `APPROVE STUDIO ASSISTED LIBRARY DESIGN SEARCH FIX IMPLEMENTATION` |
| Studio production rebuild/distribute | Separate phrase after implement + tests |
| Owner Studio QA | `PASS` / `FAIL` / `PASS WITH NOTES` |
| Stage 2 | Separate authorization |

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Generated ready-index missing/stale on a machine | Bounded Firestore fallback for picker only; show unavailable vs false “no match” |
| Reintroducing Wave C reads on Print Requests | Do not change ID-only hook contract; containment test stays |
| Helpers open modal but cannot send | Pre-existing owner/admin suggest gate — document; optional UI note out of scope unless tiny |

**Rollback:** Prior Studio installer build; no data migration.

---

## Open Questions

1. Prefer generated ready-index vs dedicated Firestore ready page for the picker — **default preferred: generated** (parity with Design Library); confirm at implement if Electron IPC already available in Customer Requests route `[NEEDS REPO CHECK]`.
2. Whether to show a helper-facing “only owner/admin can send” note — optional UX, not required to fix empty list.

Neither blocks Formal Review of the remediation direction.

---

## Implementation approval phrase (after Formal Review approves)

```text
APPROVE STUDIO ASSISTED LIBRARY DESIGN SEARCH FIX IMPLEMENTATION
```

Do **not** implement, deploy, modify production data, resume Stage 2, or begin domain cutover until that phrase (and later Studio ship / QA phrases) are given.
