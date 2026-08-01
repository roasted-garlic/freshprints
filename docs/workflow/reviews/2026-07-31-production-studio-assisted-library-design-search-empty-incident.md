# Incident / inventory: Studio Assisted “Share a library design” empty on production

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Slice | `production-studio-assisted-library-design-search-empty` |
| Environment | Studio production (Assisted Creation) |
| Status | root cause evidenced; Plan + Formal Review next |
| Pass | Plan → Review only (no implement/deploy) |

---

## Symptom (owner)

1. Studio production → Assisted Creation / Custom Request → **Share a library design**.
2. Modal opens; search field available.
3. Shows **“No ready designs match that search.”** with **empty** search text.
4. Production has at least one known `ready` catalog design.
5. Same workflow showed ready designs in development (pre–Wave C Studio behavior).

---

## Exact production path (repo-traced)

| Step | Path | Role |
|------|------|------|
| 1 | `AssistedCreationRequestsSection.tsx` opens | `AssistedCatalogDesignPickerModal` |
| 2 | `AssistedCatalogDesignPickerModal.tsx` | UI + client filter |
| 3 | `useReadyDesignsForSelection()` **with no `designIds`** | Intended “load ready designs” |
| 4 | Hook early-return | **Always empty list when IDs absent** |
| 5 | Client filter | Empty needle → return `designs` (still empty) |
| 6 | Empty UI copy | `"No ready designs match that search."` |
| 7 | Confirm / Send | `staffSuggestAssistedCreationCatalogDesign` (callable) — **not used for listing** |

**Not on the list/search path:** generated Portal assets, Firestore list query from this modal, search callables, composite indexes for suggest-search.

---

## Evidence-backed root cause

### Primary (proven in repo + consistent with prod symptom)

**Studio client regression after Firestore-efficiency Wave C:** `useReadyDesignsForSelection` was changed from `printRequestService.listReadyDesigns(user)` (bounded ready page) to **ID-only** `designService.getDesignById` loads for Print Requests selected items. When `designIds` is empty, the hook sets `designs: []` with `isLoading: false` and **no error**.

`AssistedCatalogDesignPickerModal` still calls:

```ts
useReadyDesignsForSelection(); // default designIds = []
```

So the picker always renders an empty list. Empty search returns that empty array unchanged → the exact empty-search copy the owner sees.

Commit introducing the hook change (included in production Studio source lineage): `b45542a` (Wave C / pre-release ship). Containment test explicitly requires the Print Requests page to pass `selectedDesignIds` and forbids `listReadyDesigns` **inside this hook** — the Assisted picker consumer was **not** updated.

### Classification

| Class | Verdict |
|-------|---------|
| Studio client filtering / wrong data hook | **Primary** |
| Data eligibility of prod ready design | Disproven for list emptiness (design exists; modal never loads it) |
| Callable logic (`staffSuggestAssistedCreationCatalogDesign`) | Not involved in list/search |
| Deployment drift of suggest callable | Callable **is** live on `fresh-prints-prod`; irrelevant to empty list |
| Permissions blocking list | Hook permission gate would also empty, but early ID gate fires first; staff who open Assisted UI already pass staff gates |
| Missing Firestore index | N/A for this path |
| Generated Portal catalog dependency | Modal does **not** use generated assets today (bug is empty ID list, not missing assets) |

---

## Answers to required questions

1. **Initial list when search empty?** Intended yes (`filtered = designs` when needle empty). Actual: `designs` always `[]` → empty.
2. **Empty text treated as no results?** No — empty text correctly means “show all”; “all” is empty because load never runs.
3. **Share eligibility (send callable):** `status === "ready"`; title fallback; preview/thumbnail optional (empty OK). Archive/non-ready rejected at suggest time. No publication/enrichment gate on suggest.
4. **Known prod ready design:** Sanitized read: id prefix `s9Yi7i8u…`, `status=ready`, title present, thumbnail + preview paths present → **satisfies** share predicate.
5. **Prod vs dev callable:** Same source; list path does not use it.
6. **`staffSuggestAssistedCreationCatalogDesign` on prod?** Yes — listed active callable on `fresh-prints-prod`.
7. **Revision vs source for list bug?** List bug is **Studio client**, not Functions revision.
8. **Callable returns zero / error / discarded?** List never calls it. Send path untested in this incident (blocked by empty picker).
9. **Composite index?** Not required for current broken list path.
10. **Role checks:** Suggest callable is **owner/admin** (`assertOwnerAdminCaller`). Helpers can view Print Requests / open modal but cannot send — separate from empty list.
11. **Missing field on design?** Not causal; design has status/title/derivatives.
12. **Depends on generated Portal assets?** **No** (current code). Remediation may *optionally* use Studio ready-index (same as Design Library) without Portal Firestore reads.
13. **Exact title / design ID search?** Would still filter an empty `designs` array → still empty.
14. **All ready designs vs one fixture?** **All** — hook never loads any IDs.
15. **Newly imported ready design?** Still empty until picker loads a real ready list.

---

## Sanitized production evidence

| Check | Result |
|-------|--------|
| Firestore ready designs exist | Yes (≥1; fixture family `s9Yi7i8u…`) |
| Fixture has thumb + preview | Yes |
| Coordination / catalog publish | Unrelated to this modal’s current code path |
| Suggest callable on prod | Present (`us-central1`) |

---

## Why development “worked”

Pre–Wave C Studio called `listReadyDesigns` when the hook had no ID argument. After Wave C, local/dev Studio built from current source shows the same empty picker; any earlier PASS was against the **old** hook contract. Production Studio installer embeds the post–Wave C client.

---

## What is not required

- Production data repair / design field backfill
- Catalog rebuild
- Functions redeploy for the empty-list fix (send callable already live)
- Weakening staff auth
- Returning archived / non-ready designs

---

## Remediation direction (for Plan)

1. Stop using ID-only `useReadyDesignsForSelection()` for Assisted library browse.
2. Load ready designs via a **browse-capable** Studio path that preserves Wave C Print Request containment (do not put `listReadyDesigns` back into the ID-only hook). Prefer Design Library’s generated ready-index + resolve visible cards, or a dedicated assisted-picker hook/`listDesignsPage({ status: "ready" })`.
3. Keep empty-search = show all loaded ready designs; improve empty copy when catalog truly empty vs no matches.
4. Keep send via `staffSuggestAssistedCreationCatalogDesign` + existing lifecycle.
5. Studio production rebuild/distribute after implement + tests (human-gated).
