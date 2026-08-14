# Plan: Studio Design Library archive / restore / companion Load More reconciliation

| Field | Value |
|-------|-------|
| Date | 2026-08-14 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal slug | `studio-design-library-archive-restore-reconciliation` |
| Related | docs/workflow/reviews/2026-08-14-studio-design-library-archive-restore-reconciliation-review.md |
| Prior phase | `studio-dev-recovery-white-screen` — signoff **approved** (owner PASS); recovery implementation closed |

---

## Goal

Correct four existing Studio Design Library defects without changing catalog lifecycle statuses, Print Request request-selection behavior, companion eligibility/ordering, or introducing full-catalog reloads:

1. **A** — Remove unintended card checkboxes from ordinary `/designs` browse
2. **B** — Immediately reconcile Archived Design Library after successful archived image-delete (purge)
3. **C** — Repair Restore for archived designs (Rules + UI error surfacing + local reconcile)
4. **D** — Companion (“Needs Companion”) Load More visibility only when a genuine next page exists

---

## Background

Owner verified development Studio recovery (**PASS**). This phase resumes paused Design Library corrective work. Defects are maintenance of Phase 2/4 Design Library behavior, not new features.

Working directory: **only** `C:\coding\fresh-prints` on `development` → `origin/development`. Phase 9 worktree remains parked/untouched. Production untouched.

---

## Scope

### In Scope
- Ordinary Design Library hard-delete selection chrome (checkboxes)
- Request-selection mode preservation
- Archived purge success → local list/count/pagination reconciliation
- Restore mutation (Rules fast path + client wiring + local reconciliation)
- Needs Companion Load More visibility (authoritative pagination metadata)
- Focused regression tests + manual Studio QA plan
- Docs/tests for Rules/index as required by evidence

### Out of Scope
- Bulk select/delete/restore; new archive UI; new permanent-delete capability; new roles
- Changing delete eligibility product rules beyond removing dead ready-browse chrome
- New design statuses; schema migration of design fields beyond optional query filter for existing `companionSetIncomplete`
- AI Review / Imports / Print Request business rules / Show Queue / Portal / Phase 9
- Full-catalog reload after mutations
- Studio installer/release; production branch; Firebase deploy **during Plan/Review** (deploy gates called out for Implement if Rules/indexes approved)

---

## Reproduction results (investigation)

### Defect A
- Ordinary `/designs` (owner): every card shows upper-left checkbox; toggle is effectively dead for ready catalog cards.
- Request-selection uses a **different** component (`DesignSelectionCard`) and is not the source of these checkboxes.

### Defect B
- Archived → Delete images (purge) succeeds; cards can reappear / remain after `refreshCatalog()` within the 15s page-cache window until navigate away/back or TTL expiry.
- Hard-delete path already uses `removeDesignFromList` + invalidation; archived purge does not.

### Defect C
- Restore click appears to do nothing for typical enrichment-heavy archived designs.
- **Live emulator reproduction blocked this session** (Java not on PATH → `firebase emulators:exec` cannot start). Runtime class proven from source + historical archive Defect B pattern:
  - Expected client-visible error (when not swallowed): Firestore **permission-denied** mapped by `getFirestoreErrorMessage` → typically **“Missing or insufficient permissions.”** / “Unable to restore the design. Please try again.”
  - Hook stores `error`, but `DesignLibraryPage.handleRestoreDesign` **swallows** the catch with `// Error handled in hook.` and never renders `useRestoreDesign().error`.
- **[NEEDS OWNER INPUT / Implement QA]:** Capture exact DevTools Network/`updateDoc` error string on one archived design during implementation verification once Rules fix is staged locally.

### Defect D
- Design Library with **Needs Companion** on: “Load more designs” remains when zero/few companion matches are visible because `catalogHasMore` tracks unfiltered ready-catalog pagination, not companion-filtered results.

---

## Root-cause analysis (required per defect)

### Defect A — Unwanted checkboxes

| | |
|--|--|
| **A. UI owner** | `DesignLibraryPage.tsx` → `DesignGrid.tsx` → `DesignCard.tsx` (`<input type="checkbox">`); styles `.design-card-purge-select` |
| **B. State owner** | Page `selectedHardDeleteIds`; permission `canDeleteEligibleUnapprovedDesigns` (owner). **Not** URL `mode=request-selection`. |
| **C. Selection path** | `purgeSelection` ternary when `!includeArchived && !selectionModeActive && canDeleteEligibleUnapprovedDesigns` → `showPurgeSelection` → checkbox if `!assetsPurgedAt`. Toggle only mutates selection for `imported`/`processing`/`rejected`. |
| **D. Current behavior** | Ready browse query is `statusIn: ["ready"]` only, so every card shows a non-functional hard-delete checkbox for owners. |
| **E. Proven root cause** | Hard-delete multi-select chrome is wired onto ordinary ready Design Library even though that list cannot contain eligible statuses. Distinct from Print Request selection. Contract test `optionBPermanentDeleteUi.contract.test.ts` currently expects Library wiring. |
| **F. Remediation** | Stop passing hard-delete `purgeSelection` on ordinary ready Design Library. Keep archived purge checkboxes. Keep AI Review overflow Delete. Keep request-selection `DesignSelectionCard`. Update Option B contract test accordingly. Optional defense: status-gate checkbox render in `DesignCard` (not required if page stops passing selection). |
| **G. Regression risk** | Low for request-selection (separate path). Confirm AI Review delete unchanged. Owners lose dead Library multi-select chrome only. |

### Defect B — Stale Archived after purge delete

| | |
|--|--|
| **A. UI owner** | `DesignLibraryPage.handlePurgeConfirm`; `PurgeArchivedDesignAssetsDialog`; `visibleDesigns` filters `!assetsPurgedAt` |
| **B. State owner** | `useDesigns` (`applyDesignPatch`, `reloadDesigns`/`refreshCatalog`); `designService` 15s `designPageCache` / count cache |
| **C. Mutation path** | Purge UI → `usePurgeArchivedDesignAssets.purgeDesigns` → callable `purgeArchivedDesignAssets` → `applyDesignPatch({ assetsPurgedAt })` → **`refreshCatalog()` without prior `invalidateReadCaches` for purge fields** |
| **D. Current behavior** | Local patch briefly hides cards; refresh reloads from **stale cached page** (pre-purge, no `assetsPurgedAt`) → cards return. Navigate away/back or TTL clears it. |
| **E. Proven root cause** | Admin SDK purge write is out-of-band to client caches; `applyDesignPatch` only invalidates caches for AI terminal pending leave — **not** for `assetsPurgedAt`. Happy-path `refreshCatalog()` then hits 15s page cache. Contrast: hard-delete uses `removeDesignFromList` which invalidates + removes. Precedent: `taxonomyArchiveCacheInvalidation.test.ts`, AI Review `reconcileSuccessfulHardDelete`. |
| **F. Remediation** | On purge success for purged/skipped_already_purged ids: prefer **`removeDesignFromList(id)`** (or equivalent hide) **and** `designService.invalidateReadCaches()` before any optional confirmation read. **Do not** rely on refresh into un-invalidated cache. Prefer skipping happy-path full reload (AI Review Amendment 9 style). Adjust count chip via invalidate/recount without full catalog loadAll. Failed purge: do not permanently remove. |
| **G. Regression risk** | Medium-low: selection/dialog cleanup; count label; load-more must not reinsert (invalidation + generation bump in `removeDesignFromList`). |

### Defect C — Restore fails

| | |
|--|--|
| **A. UI owner** | `DesignDetailsModal` Restore; `DesignLibraryPage.handleRestoreDesign` |
| **B. State owner** | `useRestoreDesign`; permissions `canRestoreDesigns` (owner/admin) |
| **C. Mutation path** | `designService.restoreDesign` → `updateDoc({ status: restoreStatus, previousStatus/archivedAt/archivedBy: deleteField(), updatedAt, updatedBy })` → invalidate caches → getDoc |
| **D. Current behavior** | Write denied on enrichment-heavy docs (falls through to full `designRequiredFieldsValid`); error set in hook but **not shown**; UI appears inert. No local `removeDesignFromList` on success. |
| **E. Proven root cause** | (1) **No `designRestoreStatusOnlyUpdate` fast path** in `firestore.rules` while archive has `designArchiveStatusOnlyUpdate` for the same expression-budget class (Studio 1.0.4 Defect B / `designArchiveExpressionBudget.rules.test.ts`). Restore keys match none of the existing fast paths → full validator → deny. (2) **Silent UI** swallows hook error. (3) Reconciliation secondary if write succeeds. |
| **F. Remediation** | Add Rules `designRestoreStatusOnlyUpdate` mirroring archive (archived → operational catalog status; allowlisted keys; delete archive fields; preserve purge fields immutable; staff/owner-admin parity per product). Extend rules unit tests (enrichment-heavy archived → ready/rejected ALLOW; helper DENY). Surface restore error in modal/page. On success in Archived view: `removeDesignFromList` (or status patch) without depending on stale-cache refresh. |
| **G. Regression risk** | Rules: medium (must not open forgeable archive/restore shapes). UI: low. Local remove: low after confirmed write. |

**Runtime error (this session):** Emulators unavailable (Java missing). **Source-proven expected failure:** Firestore `permission-denied` → user-facing “Missing or insufficient permissions.” / restore fallback message. Confirm exact string during Implement QA.

### Defect D — Needs Companion Load More

| | |
|--|--|
| **A. UI owner** | `DesignLibraryPage` “Load more designs” when `catalogHasMore`; Needs Companion toggle in `DesignLibraryFilterControls`. **Not** `CompanionSetPanel` / picker (no Load More). |
| **B. State owner** | `needsCompanionFilter` page state; unfiltered `useDesigns.hasMore` or managed Algolia `hasMore`; client `filterDesignsByNeedsCompanion` |
| **C. Pagination path** | Needs Companion–only → Firestore pages (size 100) + **client filter**; `catalogHasMore = hasMore` (unfiltered). Managed search + Needs Companion → Algolia totals + client filter. |
| **D. Current behavior** | Button follows source-catalog `hasMore`, not “more companion matches remain.” |
| **E. Proven root cause** | Pagination metadata and visible grid subsets diverge. Documented B1 acceptance of this gap until server/Algolia filter. No `companionSetIncomplete` constraint in `buildDesignFilterConstraints`; no matching composite index. |
| **F. Remediation** | **Needs Companion–only (primary):** add `companionSetIncomplete` equality to `DesignListQuery` / `buildDesignFilterConstraints` / `listQuery` wiring so `hasMore` is authoritative; add composite index; keep or drop redundant client filter. **Do not** hide Load More merely because filtered page is short (false negatives). **Managed + Needs Companion:** leave post-filter or pursue Algolia facet later (out of minimal path / larger gate) — document residual if not fixed this phase. |
| **G. Regression risk** | Index missing → query fail (deploy gate). Ordering/eligibility unchanged if only equality filter on existing denorm field. |

---

## Exact files proposed for modification

### Client (A/B/C/D)
1. `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` — A, B, C, D wiring
2. `apps/studio/src/renderer/src/features/designs/components/DesignCard.tsx` — only if defense-in-depth for A
3. `apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx` — C error display (if error surfaced here)
4. `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` — only if patch invalidation for purge needs extension (prefer using existing `removeDesignFromList`)
5. `apps/studio/src/renderer/src/features/designs/services/designService.ts` — D query constraint; confirm invalidate APIs for B/C
6. `apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts` — D listQuery options
7. `apps/studio/src/renderer/src/features/designs/types/designQuery.types.ts` — D query field
8. `apps/studio/src/renderer/src/features/ai-review/utils/optionBPermanentDeleteUi.contract.test.ts` — A contract update
9. New/extended unit tests under `apps/studio/src/renderer/src/features/designs/` (A/B/C/D)
10. `tests/firebase/designArchiveExpressionBudget.rules.test.ts` (or sibling restore rules test) — C

### Backend / config (C/D)
11. `firestore.rules` — C restore fast path
12. `firestore.indexes.json` — D composite index for companion incomplete browse

### Not proposed
- New Cloud Function for Restore (client `updateDoc` remains)
- Phase 9 worktree files
- Portal

---

## State / cache reconciliation design

| Event | Strategy |
|-------|----------|
| Purge success (B) | `invalidateReadCaches` + `removeDesignFromList` (or assetsPurgedAt patch **with** invalidation) for success ids; **no** happy-path refresh into stale cache; failed ids untouched |
| Restore success (C) | After confirmed `updateDoc`, while Archived: `removeDesignFromList`; invalidate already in service; optional light confirmation read only after invalidation |
| Restore/purge failure | Keep rows; show error |
| Sequential purges | Each success removes ids; generation bump prevents stale load-more reinsert |

**Explicitly forbidden:** reintroducing full-catalog `loadAll` / eager catalog-wide reload after every mutation.

---

## Pagination integrity

- `removeDesignFromList` bumps generation and invalidates caches so in-flight/stale pages cannot reinsert removed ids.
- Defect D: server-side companion filter makes `hasMore` match visible universe for Needs Companion–only browse.
- Load More continues bounded page-size fetches only.

---

## Request-selection mode protection

- Do **not** change `usePrintRequestSelectionMode`, `DesignSelectionCard`, or URL `mode=request-selection` behavior.
- Defect A removes only ready-browse `purgeSelection` hard-delete chrome.
- Regression tests must assert request-selection still shows intentional selection UI and ordinary `/designs` does not show checkboxes.

---

## Architecture / security / data / backend impacts

| Area | Impact |
|------|--------|
| Architecture | Component → Hook → Service preserved; no direct Firebase from components |
| Security | Rules restore fast path (narrow allowlist); permissions via `permissionService` unchanged product-wise |
| Data model | No new statuses; D uses existing `companionSetIncomplete` denorm |
| Backend | Rules change (C); index (D); **no new Function** required by evidence |
| UI | Checkbox removal; error toast/banner for restore; Load More visibility |

### Migration
- None for documents
- Index create required before D query ships to environments that hit Needs Companion–only browse

---

## Deployment determination

| Artifact | Required for fix? | When |
|----------|-------------------|------|
| App/Studio client | Yes (A/B/C/D) | After approval; development branch |
| `firestore.rules` | **Yes (C)** | Human approval before **any** shared/prod Rules deploy |
| Cloud Functions | **No** (evidence) | — |
| Indexes | **Yes (D)** for Needs Companion–only server filter | Human approval / deploy indexes before relying on new query |
| Schema migration | **No** | — |
| Production branch / installer | **No** this phase | — |

---

## Test strategy

### Existing coverage to extend
- `optionBPermanentDeleteUi.contract.test.ts`
- `designArchiveRestore.test.ts` / `designArchiveExpressionBudget.rules.test.ts`
- `designLibrarySearch.test.ts` (`filterDesignsByNeedsCompanion`)
- `aiReviewLocalReconciliation.test.ts` (precedent)
- `taxonomyArchiveCacheInvalidation.test.ts` (precedent)
- `permissionService.helperRestrictions.test.ts`

### New/focused coverage (minimum)
1. Normal browse does not enable selection chrome
2. Request-selection still enables intentional selection
3. Successful archived purge removes target from local visible state
4. Failed purge preserves state
5. Sequential purges work
6. Successful Restore removes from archived result set (unit/hook)
7. Restored status stays within catalog lifecycle
8. Stale pagination cannot reinsert deleted/restored archived design
9. No unnecessary broad reload when local reconcile chosen
10. Companion Load More: zero / partial page / hasMore true / final page hides
11. Rules: enrichment-heavy restore ALLOW; helper DENY

### Automated commands (`docs/standards/TESTING.md`)
- Focused `npx tsx --test …`
- `npx tsc --noEmit` in `apps/studio`
- Studio vite build verification
- `npm run lint`
- `git diff --check`
- Rules tests when Java/emulators available: include archive/restore expression budget suite

### Manual QA (`npm run dev:studio`)
Use owner acceptance checklists A, A2, B, C, D from the phase brief (checkbox, request-selection, archived purge reconcile, restore, companion Load More) plus regression list (archive, details, edit, download, filters, ordering, no full-catalog reload, no production statuses on designs).

---

## Human checkpoints anticipated
- [x] Formal Review of this Plan
- [ ] Owner implementation approval phrase (below)
- [ ] Before shared/prod **Rules** deploy (C)
- [ ] Before **indexes** deploy (D)
- [ ] Manual Studio QA after Implement
- [ ] Exact Restore Network error string confirmation during Implement QA if still useful

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rules restore path too broad | High | Mirror archive allowlist; purge fields immutable; unit tests |
| Index not deployed → companion query fails | High | Gate ship of D query behind index; feature-flag wiring or keep client filter until index ready |
| Removing Library hard-delete chrome surprises owners | Low | Chrome was non-functional on ready list; AI Review delete remains |
| Short-page Load More heuristic | High if used | **Do not use**; server filter instead |
| package-lock one-line drift | Low | Leave unrelated |

---

## Rollback

- Revert client PR(s) on `development`
- Revert Rules deploy to previous rules revision if restore fast path misbehaves
- Indexes can remain (harmless) or be left unused if query reverted
- No production status / schema rollback needed

---

## Open questions

- [x] None blocking Plan/Review for A/B/C primary paths
- [ ] **[NEEDS OWNER INPUT]** Confirm Defect B “delete” means archived **Delete images (purge)** (source path analyzed). If a different delete control was meant, say so before Implement.
- [ ] **[NEEDS OWNER INPUT]** For Defect D managed-search + Needs Companion residual: accept Firestore-only fix this phase, or require Algolia B3 in-scope?
- Exact live Restore error string: confirm during Implement (emulators/Java unavailable in Plan session)

---

## Approval phrase for implementation

After Formal Review **approved** (or approved_with_changes addressed), owner authorizes Implement with:

```text
APPROVE STUDIO DESIGN LIBRARY ARCHIVE RESTORE RECONCILIATION IMPLEMENTATION
```

**STOP after Formal Review — do not implement until that phrase.**

---

## Affected Areas (template)

### Architecture Impact
- [x] Details: local reconciliation patterns; Rules fast path; query filter for companion incomplete

### Security Impact
- [x] Details: Firestore Rules restore allowlist; no permission model expansion beyond aligning Rules with existing `canRestoreDesigns`

### Data Model Impact
- [x] Details: none for statuses; uses existing `companionSetIncomplete`

### Backend Impact
- [x] Details: Rules + index; no new Function

### UI / UX Impact
- [x] Details: remove dead checkboxes; restore errors visible; Load More correctness; manual QA required

### Migration Impact
- [x] Forward: deploy index before D query; deploy Rules for C
- [x] Rollback: revert client + Rules; index optional leave

---

## Approach (Implement order, post-approval)

1. A — remove ready-browse hard-delete `purgeSelection`; update contract tests
2. B — purge success local reconcile + cache invalidation; tests
3. C — Rules restore fast path + tests; surface errors; local remove on success
4. D — query constraint + index entry + Load More tests; residual Algolia note per owner input
5. Focused automation + `npm run dev:studio` manual QA
6. Signoff; deploy Rules/indexes only with separate human approval
