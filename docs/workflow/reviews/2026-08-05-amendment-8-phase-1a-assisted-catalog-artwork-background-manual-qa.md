# Owner QA — Amendment 8 Phase 1A (consolidated for tomorrow)

**Branch:** `fix/post-launch-catalog-and-processing-stability` / PR #40 (open, unmerged)  
**Prior Phase 1A owner result:** **PASS WITH NOTES** (Assisted catalog-share artwork background)  
**Correction status:** Implemented, independently reviewed **APPROVED**, committed at `bc9e7e7`  
**Owner re-QA result (2026-08-06):** **PASS**  
**Signoff:** `docs/workflow/reviews/2026-08-05-amendment-8-phase-1a-signoff.md` — **approved_with_notes**

**Environment:** Studio + Portal vs `fresh-prints-dev`  
**Note:** New catalog-share snapshots need the updated `staffSuggestAssistedCreationCatalogDesign` Functions runtime. Owner **PASS** was recorded with live-resolve/CSS mats available; scoped Functions deploy remains optional follow-up if durable suggest-time snapshots are required.

---

## Test A — Phase 1A speed and catalog behavior

Confirm smoke (no need to retest unrelated product areas):

1. Portal unfiltered browse — fast, designs load  
2. Category browse  
3. Single-tag browse  
4. Discovery / Discover home  
5. Search still works  
6. Multiple tags / facets still work (generated path)  
7. Lazy image loading (first viewport eager, rest lazy)  
8. Studio taxonomy  
9. Archived management still reachable  
10. Assisted catalog picker opens and lists ready designs

---

## Test B — Assisted catalog-share artwork background

**Prerequisites:** ready Design Library design with a clearly **non-default** custom artwork background; Assisted request eligible for a catalog suggestion.

1. Confirm the custom mat in Design Library.  
2. Select it in the Assisted picker.  
3. Confirm picker thumbnail shows the same mat.  
4. Send/share the catalog design.  
5. Confirm Studio request overview and proof thumbnail show the same mat.  
6. Open the Portal customer request.  
7. Confirm proof stage shows the same mat.  
8. Open the proof lightbox — same mat.  
9. Complete approval if practical.  
10. Confirm approved card and Proofs history retain the same mat.  
11. Open one older pre-fix catalog share if available.  
12. Confirm it resolves the design-specific mat, or safely uses the default if the linked design cannot be resolved — with no error and no loading loop.

### Pass criteria

- Configured background stays consistent across Studio + Portal Assisted catalog-share surfaces  
- Transparent PNG is never shown against the wrong default mat when the design background is available  
- Transparent source remains transparent (mat is display-only)  
- Legacy records do not error; no visible loading loop / repeat-read storm  

### Reply with exactly one of

- `PASS`  
- `FAIL: [exact screen and behavior]`  
- `PASS WITH NOTES: [notes]`

---

## Out of scope for this QA

- Amendment 8 Phase 1B / managed-search provider setup  
- Firebase production deploy  
- Merging PR #40  
- AI Processing (unchanged; already signed off)
