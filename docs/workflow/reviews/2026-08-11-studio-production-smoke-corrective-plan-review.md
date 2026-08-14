# Formal Review: Studio production-smoke corrective plan (A–E)

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Reviewer | Review Agent (independent Formal Review) |
| Plan | `docs/workflow/plans/2026-08-11-studio-production-smoke-corrective-plan.md` |
| Owner map | **PASS WITH REQUIRED CHANGES** |
| FreshForge verdict | **`approved_with_changes`** |

---

## Summary

The amended Plan correctly scopes Design Library Algolia facet counts + Load More (A/B), Imports documentation-only (C), AI existing-tag reconciliation under **D8-A** (D), and helper operational image-processing with Show Queue settings excluded (E). Architecture is least-privilege and deploy layers are correctly classified (Studio 1.0.4 + Functions + Firestore Rules; Algolia query-only). Implementation may proceed only after owner authorization and by applying the Required Changes below (binding Implement constraints, not a Plan rewrite cycle).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | A–E + Show Queue settings exclusion; ADR-FP-088 untouched |
| Architecture alignment | pass | Centralized `permissionService`; shared managed Algolia path for A+B |
| Security impact addressed | pass | E expands narrow operational gates; Rules **tighten** showQueue; no broad auth open |
| Data model impact addressed | pass | No schema migration; D8-A documents eight-tag meaning |
| Backend impact addressed | pass | D pipeline + E promote/enqueue/reset + Rules |
| Test strategy adequate | pass | Matrix + Functions asserts + Rules + helper manual QA |
| Human checkpoints identified | pass | Rules/Functions/Studio 1.0.4 separate |
| Roadmap alignment | pass | Corrective before Prefinal A–H signoff / Phase 9 |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS (D8-A + ADR-FP-085 amend) |
| No silent scope expansion | pass | C docs-only; Assisted Creation unchanged |

---

## Owner evaluation points (A–D)

### 1. A/B managed Algolia for empty-query + tag/category filtering

**PASS.** Plan correctly shares one managed Algolia result source for A+B: empty `query` allowed with `tagIds`/`categoryId` filters; text search no longer the only `managedSearchActive` trigger. Unfiltered browse remains Firestore pagination. Aligns with Portal facet pattern.

### 2. Existing `tagFacetKeys` support facet counts without Algolia settings mutation

**PASS.** Repo confirms `attributesForFaceting: ['filterOnly(tagIds)', 'filterOnly(categoryId)', 'tagFacetKeys']` (`algoliaAdminClient.ts`). `tagFacetKeys` is facetable (not `filterOnly`); Portal already uses `facets: ['tagFacetKeys']` with `hitsPerPage: 0`. **No index-settings mutation required** for default path. B3 / companion facet remains out of default.

### 3. Load More state ownership

**PASS.** Plan: Firestore `hasMore` for ordinary browse; Algolia `offset`/`nbHits` when managed search (including empty-query filtered). Clear filters restores Firestore ownership. Matches current split bug (`managedSearchActive` text-only today in `DesignLibraryPage.tsx`).

### 4. C import audit / documentation-only

**PASS — documentation-only is sufficient.** Audit shows Studio already has strong numeric/safety bounds (500 PNGs, ZIP size/ratio/depth, etc.). No proven safety defect requiring a new Studio import numeric cap. Owner accepted docs-only. Do **not** invent Portal limits into Studio.

### 5–10. D server reconciliation, duplicate suppression, D8-A, form union

**PASS.** Root cause verified: pipeline `DesignRecord` omits `tags`; `resolveAiCatalogTags` ignores assigned tags; `markAiSuccess` does not wipe `designs.tags` but AI Review seeds from suggestions alone.

| Requirement | Plan stance | Review |
|-------------|-------------|--------|
| Server subtract vs `designs.tags` | After resolve | PASS |
| Exact / normalized / alias-equivalent suppress | Canonical + alias maps | PASS |
| Post-rerank subtract | Required (high risk if skipped) | PASS |
| `suggestedNewTags` strip | Required | PASS |
| Human-first AI Review form union | Required | PASS |
| **D8-A** | Human tags do **not** consume 8; 8 = additional AI; never remove human for ceiling; design max **20** unchanged | **PASS — internally consistent** |
| Category = existing ∪ new AI | Proposed | PASS (see #11) |

**D8-A internal consistency:** Yes. Authoritative `designs.tags` + separate AI allowance of 8 + no human removal for ceiling + unchanged design-level max 20 do not conflict.

### 11. Category resolution consuming existing human + new AI tags

**PASS.** Using existing ∪ genuinely new AI tags for category resolution matches catalog intent after D8-A (category should reflect full intended tag signal, not AI-only remainder).

### 12. Functions deployment isolation from Studio 1.0.4 packaging

**PASS.** Matrix separates Studio package vs Functions vs Rules. Do not treat Functions/Rules as “installer notes.”

### 13. Test sufficiency

**PASS with Implement notes.** A/B facet/Load More matrix, D pipeline + form union, E permission/Functions/Rules + helper manual QA are adequate. Required Changes below tighten E PermissionKey wiring and production sequencing.

### 14. Rollback

**PASS.** Studio 1.0.3 keep; Functions redeploy; Rules redeploy (note restores helper showQueue write); docs revert; no Algolia settings rollback; no data migration.

### 15. Production promotion sequence

**PASS with binding Required Change #3.** Recommended order after Implement/QA/PR merge:

1. Firestore Rules (`settings/showQueue` OA) — human checkpoint  
2. Functions (D AI pipeline + E promote/enqueue/reset) — human checkpoint  
3. Studio **1.0.4** via `studio-release.yml` from **production**, `stable`, `internal-unsigned`  
4. Reduced production re-smoke (incl. helper)  
5. Prefinal A–H final signoff  

---

## Workstream E evaluation

### Root-cause answers

1. **Blocked by multiple layers:** primarily `permissionService` (OA-only approve/manage AI/promote/retry/rerun) + Functions (`assertCanPromoteOrRetryCustomerUpload`, `enqueueAiEnrichment` OA). Firestore `designs` updates already `isStaff()` (helper OK if reached). UI hides controls via capabilities.

2. **Existing capabilities (actual names):** `canApproveDesignForCatalog`, `canRejectDesignFromCatalog`, `canRerunAiSuggestions`, `canManageAiReview`, `canEditAiReviewInbox`, `canPromoteCustomerUploadToAiReview`, `canRetryCustomerUploadProcessing` — all currently OA. Helpers already have `canImportDesigns`, `canViewAiReview`, `canEditDesigns`, etc.

3. **Conflation:** operational processing folded into “catalog approve / manage AI review” admin gates — not a missing separate named capability; expand those operational methods to helper.

4. **Least privilege:** Yes — expand named operational caps; keep users/settings/taxonomy/Whatnot import/delete-eligible/restore/Dev Tools OA; new `canManageShowQueueSettings` OA.

5. **Customer-upload Send to AI:** Helper **not** permitted today at UI + Functions assert. After E, both layers must allow.

6. **Approve/reject:** UI + capability blocked; Rules already allow staff design updates — backend client path would work if UI/Functions opened. Expand both.

7. **Remain OA:** taxonomy / `canApproveSuggestedTags`, Settings/AI config, users, Whatnot Import Shows, delete eligible upload, restore, Dev Tools, Assisted Creation mutate, **Show Queue settings**.

### Show Queue settings

**PASS intent.** Today Settings is under `canManageUpcomingShows` (helper) and Rules `isStaff()` write — **undesired**. Plan correctly splits `canManageShowQueueSettings` (OA) + Rules tighten. Least-privilege split confirmed. Helper must not gain Show Queue admin as side effect of E.

### E Formal Review questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Matches helper role purpose? | **Yes** — operational artwork processor/reviewer, not admin |
| 2 | UI + authoritative backend covered? | **Yes** if PermissionService + Functions + Rules showQueue all ship |
| 3 | Unnecessarily broad? | **No** if Implement expands only named operational methods |
| 4 | Full Imports → AI Review after change? | **Yes** (import already allowed; enqueue/approve/rerun expanded) |
| 5 | Send to AI Processing? | **Yes** (promote/retry UI + Functions) |
| 6 | OA admin boundaries intact? | **Yes** per matrix |
| 7 | ADR-FP-088 untouched? | **Yes** — Plan forbids Assisted Creation mutate change |
| 8 | Deploy layers? | **Studio 1.0.4 + Functions + Firestore Rules** (not UI-only) |
| 9 | Helper QA checklist? | Plan §E.8 — adequate |

**Helper ≠ Admin:** Confirmed and required in Plan.

**C remains documentation-only:** Confirmed; cannot force a code cap without a proven safety defect (none found).

---

## Findings by severity

### Critical
- None blocking Review.

### High
1. **E is not UI-only.** Shipping Studio 1.0.4 without Functions promote/enqueue/reset leaves enabled buttons that fail with `permission-denied`. (Addressed by Required Change #3.)
2. **Show Queue settings:** Expanding processing without Rules + capability split leaves helper able to write `settings/showQueue`. Plan already includes tighten — must ship with E.

### Medium
3. **Post-rerank duplicate suppression** is mandatory for D; skipping reintroduces assigned tags (Plan already requires).
4. **needsCompanion** remains client-side limitation under Algolia facet path (Plan B1/B2) — document in UX; do not silently claim Algolia companion facets without B3 settings change.

### Low
5. Prefer Studio-local Algolia facet helper mirror (Plan default) over Portal import to avoid package cycles.
6. Confirm Portal `maxValuesPerFacet` constant when mirroring.

---

## Architecture Review

**Findings:**
- A+B share managed Algolia source — correct.
- E routes through `permissionService` — correct; no scattered `role === "helper"`.
- D server-side first, then AI Review seed union — correct layering.

**Required changes:**
- [x] See Required Changes below (PermissionKey wiring / Settings action split already reflected in Plan files list — Implement must execute).

---

## Security Review

**Findings:**
- Helper expansion is narrow operational.
- Show Queue Rules change is a **tightening**.
- No Algolia Admin; search-only.
- ADR-FP-088 preserved.

**Required changes:**
- [ ] Implement: expand only the named operational methods; do not widen `canManageSettings` / `canManageTags` / taxonomy approve.

**Human approval needed before production:**
- [ ] Firestore Rules production deploy (E)
- [ ] Functions production deploy (D + E)
- [ ] Studio 1.0.4 package/publish
- [ ] Reduced production re-smoke

---

## Data Model Review

**Findings:** No migration. D8-A documents semantic change to eight-tag meaning only. Category resolution uses existing ∪ new — consistent.

**Required changes:**
- [ ] None beyond planned DATA_MODEL / ADR updates at Implement.

---

## Backend Review

**Findings:** Deploy matrix accurate. Storage Rules likely unchanged (Admin SDK promote) — verify during Implement; stop if client Storage write path for helper is discovered.

**Required changes:**
- [ ] Required Change #4 (Storage verification note).

---

## Testing Review

**Findings:** Adequate automated + mandatory helper-account manual QA.

**Required changes:**
- [ ] None structural.

---

## Documentation Review

**Findings:** D8-A ADR; amend ADR-FP-085; SECURITY/BACKEND as needed.

---

## Required Changes (Implement must apply — `approved_with_changes`)

1. **Register `canManageShowQueueSettings`** on `PermissionKey` and in `permissionService.hasPermission` switch; `updateSettings` + Settings UI use it; operational Show Queue stays on `canManageUpcomingShows`.
2. **Split Settings action** on `UpcomingShowsPage` out of the helper-visible `canManageUpcomingShows` actions list so helpers do not see Settings.
3. **Production sequence binding:** human-approved **Rules** (showQueue) + **Functions** (D+E) before or lockstep with Studio **1.0.4** distribution; never claim E complete from package alone.
4. **Storage:** confirm Admin SDK promote path ⇒ no Storage Rules change; if a client Storage write for helper AI is found, stop for Rules review.
5. **Capability expansion discipline:** expand only named operational approve/manage-AI-review/rerun/promote/retry methods to helper; keep taxonomy/settings/users/Whatnot/delete-eligible/restore/Dev Tools/Assisted mutate OA.
6. **D8-A / C:** Implement D8-A exactly; C remains docs-only (no new import numeric cap).

No Plan re-review required if Implement follows 1–6 only.

---

## Blockers

None.

---

## Final deployment matrix

| Workstream | Studio 1.0.4 | Functions | Firestore Rules | Algolia settings | Docs |
|------------|--------------|-----------|-----------------|------------------|------|
| A | Yes | No | No | **No** (query-only `tagFacetKeys`) | Facet meaning |
| B | Yes | No | No | No (default) | — |
| C | No | No | No | No | **Yes** |
| D | Yes (AI Review seed) | **Yes** (pipeline) | No | No | D8-A ADR / DATA_MODEL |
| E | Yes (permissions UI) | **Yes** (promote/enqueue/reset) | **Yes** (`settings/showQueue` OA) | No | ADR-FP-085 amend |

---

## Exact files expected to change (Implement)

**A/B:** `DesignLibraryPage.tsx`, `DesignLibraryTagFilterModal.tsx`, `designLibrarySearch.ts` (+tests), `useDesignLibraryManagedSearch.ts`, `studioAlgoliaCatalogSearchService.ts` (+ flags/client as needed); optional Studio-local facet helper mirroring Portal.

**C:** Docs only (`BACKEND.md` / Imports notes) — no app code unless later defect proven.

**D:** `functions/src/ai/aiEnrichmentPipeline.ts` (+ related resolve/rerank helpers/tests), `DesignRecord` tags field; Studio AI Review form seed union; `DATA_MODEL.md` / ADR D8-A.

**E:** `permissionService.ts` (+ tests), `permission.types.ts`, `UpcomingShowsPage.tsx`, `showQueueSettingsService.ts`, `functions/src/lib/customerUploadStaffAuth.ts`, `enqueueAiEnrichment.ts`, `resetAiEnrichmentForProcessing.ts` (if on helper re-run path), `firestore.rules`, ADR-FP-085 amend / SECURITY as needed.

**Do not change:** `assistedCreationRequests.ts` / ADR-FP-088; Algolia index settings (default); design-level tag max 20.

---

## Exact tests required

1. Studio typecheck / lint / Vite build (A/B/D UI/E).
2. A/B unit: facet counts independent of hydrated page; Load More ownership; clear filters; archived fail-closed.
3. D unit: assigned/alias suppress; post-rerank suppress; suggestedNewTags strip; D8-A eight additional; form union.
4. E permissionService matrix owner/admin/helper/customer.
5. E Functions asserts: helper promote/enqueue allow; customer deny; OA taxonomy/settings still deny for helper.
6. E Rules: helper cannot write `settings/showQueue`; OA can.
7. Regression: customer cannot write designs/settings.
8. Manual helper-account QA (Plan §E.8) + Design Library / AI tag QA.
9. Functions build when D/E change.

---

## Recommended implementation branch

`hotfix/studio-smoke-corrective-a-e` from **`origin/production`** → PR to **`production`** → sync PR to **`development`**.

---

## Confirmations

| Item | Result |
|------|--------|
| **D8-A internally consistent** | **Yes** |
| **C documentation-only** | **Yes — sufficient** |
| **Helper ≠ Admin** | **Yes** |
| **Show Queue settings remain OA** | **Yes** (after E) |
| **ADR-FP-088 untouched** | **Yes** |

---

## Verdict Rationale

Plan is sound and owner decisions (D8-A, C docs-only, E helper processing, Show Queue settings exclusion) are coherent with repo evidence. Residual risk is Implement discipline (capability boundaries + deploy sequencing), captured as Required Changes rather than a Plan fail.

**Owner-facing verdict: PASS WITH REQUIRED CHANGES**  
**FreshForge: `approved_with_changes`**

---

## Next Step

Owner authorizes Implement of the amended Plan **including Required Changes 1–6**.

**Exact implementation authorization phrase (current conventions):**

```text
Continue Workflow
```

(with intent to Implement the approved Plan), **or** explicitly:

```text
Implement approved plan: docs/workflow/plans/2026-08-11-studio-production-smoke-corrective-plan.md
```

Do **not** implement until that authorization. Formal Review STOP.
