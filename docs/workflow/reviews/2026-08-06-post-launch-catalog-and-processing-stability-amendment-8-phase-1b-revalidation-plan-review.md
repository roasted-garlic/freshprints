# Formal Review — Amendment 8 Phase 1B Revalidation Plan

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Plan | `docs/workflow/plans/2026-08-06-post-launch-catalog-and-processing-stability-amendment-8-phase-1b-revalidation-plan.md` |
| Starting HEAD reviewed against | `71a4cec` |
| Mode | Independent Formal Review (Plan only) |
| Verdict | **APPROVED** (required Plan corrections applied in-place) |

---

## Scope of this review

Re-derived consumer inventory from current source (not Plan prose alone). Challenged tags-only snapshot claim, search replacement, Firestore feasibility, guest-search security, hidden design snapshots, cost arithmetic, rollback sequencing, and P4 conclusion. Confirmed no implementation, deployment, merge, cleanup, or production action occurred in this pass.

---

## 1. Consumer inventory re-derivation

| Claim | Independent check | Result |
|---|---|---|
| Studio Design Library FS-only | `DesignLibraryPage` → `useDesigns`; no `portalCatalogAssetService` / `studioCatalogAssetService` imports under Studio | **Pass** |
| Studio taxonomy FS | `useGeneratedDesignLibraryTaxonomy` uses `categoryService` / `catalogTagService` | **Pass** |
| Assisted picker FS | `useGeneratedReadyDesigns` paginates Firestore to exhaustion; no `studioCatalogAssetService` | **Pass** |
| Portal ordinary browse FS | `useCatalogDesigns` generated path only when `requiresGeneratedSearchPath`; ordinary uses `catalogService.listReadyDesignsPage` | **Pass** |
| Discover home FS | Containment test forbids `listDiscoverDesigns`; home uses `listHomeDiscoveryPool` | **Pass** |
| Remaining generated reads | Five service entry points; **8** portal-catalog call-chain surfaces + **1** catalog-reference taxonomy surface (+ dead `listDiscoverDesigns`) | **Pass** — Plan §4.5 updated to record both aggregations |
| AI Storage taxonomy | `loadAiCatalogReferenceSnapshot` returns `loadFirestoreFallback()` only | **Pass** — Strategy 2 already live |
| Publishers still live | `onPortalCatalogSnapshotSourceWritten` still full-publishes on non-operational classifications; catalog-reference on tag/category writes | **Pass** |

No Studio app import of `@fresh-prints/shared/catalog-snapshots` at HEAD.

---

## 2. Challenge — “only tags require a snapshot”

**Challenge:** Owner prefers a tags-only snapshot; Plan must not smuggle design data or oversell necessity.

**Finding:** Plan correctly separates (a) approved tag definitions from (b) facet **counts**, which are design-derived and **cannot** live in a tags-only package. AI already loads tags via Firestore; a tags-only Storage object is optional optimization, not required for retirement of design snapshots.

**Required Plan correction (applied):** Strengthen sequencing so Strategy 1 is not implied as blocking Stage 1a. Already stated in §9; Stage 1 split added (§16).

**Verdict on claim:** **Accepted with nuance** — tags-only snapshot is *feasible* but *not necessary*; facets still need Option A or B.

---

## 3. Challenge — search replacement

**Challenge:** Prior Phase 1B assumed managed search; re-validate Options A–D.

| Option | Review |
|---|---|
| A Hybrid | Still the only scalable path preserving current Portal search/multi-tag/exact facets without a design snapshot |
| B Product simplify | Honest loss list present — acceptable only with owner D1 |
| C Firestore-only preserve | Correctly rejected (`catalogNeedsFullClientHydrate` exists precisely because FS cannot page these queries) |
| D Callable | Correctly rejected as primary — no concrete read bound for full-text ∩ multi-tag ∩ exact facets |

**Required Plan correction (applied):** Stage 1a (by-id + categories FS-primary) may proceed without D1; Stage 1b search cutover remains D1-gated. Prevents false “all Phase 1B blocked forever” reading.

---

## 4. Firestore query / index feasibility

Ordinary browse/category/single-tag/`readyAt` completeness path already implemented (mats/ordering Signoff). Multi-tag AND + free-text + exact global facets: **not** feasible as truthful Firestore-only at catalog scale without hydrate or a second snapshot. Review agrees.

Assisted pagination-to-exhaustion is staff-side and complete; growth risk noted — not a reason to restore design snapshots.

---

## 5. Public guest-search security

Option A contracts (search-only keys, allowlisted public fields, FS auth for mutations) are adequate for Plan stage. No provider account creation in this pass — correct. Index must never authorize Add-to-Request.

---

## 6. Hidden design snapshot check

| Risk | Status |
|---|---|
| Rename portal-catalog under new path | Explicitly forbidden in Plan acceptance criteria |
| `listAllReadyDesigns(2000)` | Deprecated; **no callers** — Plan prefers DELETE |
| `getReadyDesignsByIds` card buckets | **Active hidden-ish design snapshot consumer** — correctly listed; Stage 1a must flip to FS-primary |
| Search index under Option A | Disposable derived index of **public** fields — allowed if not treated as full catalog snapshot replacement for browse authority |
| AI `catalog-reference` writes while unread | Publisher still writes; AI does not read — Stage 4/5 retire |

---

## 7. Cost arithmetic

Amendment 9 attribution (~25 pubs / ~28.8K; AI ~3.4K) reused appropriately. Target “0 design snapshot pubs” is correct; residual FS page reads + optional search upserts acknowledged (not “zero cost”). Review accepts upper-bound framing.

---

## 8. Rollback sequencing

Stages 1–6 with separate human gates for Function delete, Storage cleanup, and production match workflow rules. Stage 1a/1b split improves rollback clarity (can ship by-id FS without tearing out search yet).

---

## 9. P4 conclusion

Review agrees: P4 is **not** a permanent containment architecture; **not** safe to claim publisher retirement is immediate (search/facet readers remain); correct disposition is **short transition / accelerate Stage 4 after cutover**, with D4 if Phase 1B Implement is delayed.

---

## 10. No implementation / Firebase action

Confirmed this pass produced Plan + Review docs + workflow state updates only. No app code, no deploy, no merge, no Storage/Firestore mutation, no Function retirement.

---

## Required changes (applied to Plan)

1. **Stage 1a vs 1b split** — FS by-id + categories unblocked by D1; search cutover blocked by D1.
2. **Classifier precision** — document that pure `aiSuggestions` writes are operational (not in index/card field sets).
3. **75-path matrix delta** — state Phase 1A deletions so inventory is not double-counted.

---

## Residual gates (not Plan defects)

- Owner **D1** (provider vs product simplify) before Stage 1b Implement.
- Owner **D2–D4** as listed in Plan §20.
- Stage 4/5/6 human approvals.

---

## Final verdict

**APPROVED**

Plan is acceptable for Investigate → Plan → Formal Review stop. **Implement is not authorized** until Managing Agent opens an Implement phase; Stage 1b further requires D1.
