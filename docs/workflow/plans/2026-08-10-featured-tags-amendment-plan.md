# Plan Amendment: Featured Tags (prelaunch shipment)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase **amendment** to `prelaunch-companion-designs-and-censored-content` |
| Related | Promotion plan `2026-08-10-prelaunch-companion-censored-production-promotion-plan.md` (update after DEV QA) |
| Review | `docs/workflow/reviews/2026-08-10-featured-tags-amendment-review.md` |

---

## Goal

Add **Featured Tags**: staff mark multiple catalog tags as featured in Studio Tag Management; Portal Tag filter modal shows those tags as visually distinct clickable pills at the top, sharing the **same** `selectedTags` draft/apply state as the normal list — before production promotion of the prelaunch bundle.

## Background

Prelaunch companion/censored/placement work is DEV-signed-off but **not** promoted. Owner wants one more feature in that shipment. Portal tag facets come from **Algolia**; tag taxonomy (name, aliases, preferredWhen, status) lives in Firestore `tags/{slug}`. Featured is presentation metadata on the taxonomy doc — **not** an Algolia facet attribute.

## Scope

### In Scope

1. **Data:** optional `isFeatured?: boolean` on `CatalogTag` / Firestore `tags`  
2. **Rules:** allowlist + optional bool validation; public read remains approved-only  
3. **Index:** composite `tags`: `status` ASC + `isFeatured` ASC — required for Portal query `status==approved && isFeatured==true` under public rules  
4. **Studio:** Tag Management mark/unmark + visible Featured identification  
5. **Portal:** featured pills section atop tag modal; sync with checkbox list; hide if none  
6. **Docs:** DATA_MODEL + amend production promotion plan/checkpoint  
7. **DEV:** implement, test, deploy rules (+ indexes) to `fresh-prints-dev` only  

### Out of Scope

- Production deploys / Studio prod package / App Hosting prod  
- Algolia schema, reconcile, or new facet fields  
- myprintrequest.com / DNS / Auth / Coming Soon  
- New category system or second filter model  
- Backfill (missing/`false` = not featured)  
- Regressing companions / censor / placement / post-add suggestion  

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/types/catalogTag.types.ts`
- `firestore.rules` (`tagRequiredFieldsValid`)
- `firestore.indexes.json`
- Studio: `catalogTagService`, `catalogTag.types` (Update/Create), `TagManagementModal`, mapper/normalizer if needed
- Portal: `catalogService` (featured list), `CatalogTagFilterModal`, `catalog.css`; optional small hook
- Docs: DATA_MODEL, promotion plan/checkpoint, DECISIONS short note optional

### Architecture Impact

- [x] Details: Portal keeps Algolia for facet counts/list; **one** lightweight Firestore query for featured approved tags when the tag modal needs them (cached for modal session). Same `draftSelectedTags` / `toggleTag` / `onApply`.

### Security Impact

- [x] Details: Rules allow optional `isFeatured` bool on owner/admin writes; customers only read approved tags (unchanged). No customer writes.

### Data Model Impact

- [x] Details: `tags.isFeatured?: boolean` — absent/false = normal; multiple may be true.

### Backend Impact

- [x] Details: Rules + indexes on DEV. **No Functions.** **No Algolia.**

### UI / UX Impact

- [x] Details: Studio Tag Management + Portal tag modal featured pills (manual QA).

### Migration Impact

- [x] None required (optional field).
- Forward: deploy Rules then indexes on DEV; staff toggle Featured as needed.
- Rollback: hide UI; Rules can remain permissive on optional field.

---

## Approach

1. Extend shared `CatalogTag` + Studio create/update inputs; persist `isFeatured` via `catalogTagService` (deleteField or omit when false — prefer storing `true` only or explicit bool; **explicit bool ok**, default omit/false).  
2. Rules: add `isFeatured` to `hasOnly`; optional `is bool`.  
3. Index: `collectionGroup tags`, `status` ASC, `isFeatured` ASC.  
4. Studio: Featured toggle on create/edit; badge in list rows.  
5. Portal: `listFeaturedApprovedTags()` → Firestore query; modal builds featured pills as **Firestore featured names ∩ current Algolia facet options** (require facet presence / positive count when present). Click calls existing `toggleTag(name)` — same multi-tag AND draft/apply as the checkbox list. Hide section when intersection is empty.  
6. Do **not** duplicate featured tags out of the main list (keep in both for sync visibility) — or keep in main list checked state; featured row is shortcut. **Keep in both** so sync is obvious.  
7. Studio: after Tag Management create/update, refresh Design Library display taxonomy from authoritative `listTags` so new tags are immediately assignable in TagChipInput (materialization CF can lag). Empty-query suggestions prioritize featured tags within the capped list.  
8. Update promotion docs to add Rules+indexes (already required) note for Featured Tags; still no Algolia schema work.  
9. DEV deploy rules+indexes; stop for owner QA.

---

## Why Algolia is NOT required

Featured is taxonomy presentation metadata. Filtering still uses Algolia `tagIds` / names. Portal does not need `isFeatured` on design records or facet keys.

## Why an index IS required

Public tag reads require `status == "approved"`. A featured query must include `status==approved` **and** `isFeatured==true` → composite index. Without it, Portal cannot safely list featured tags for guests/customers.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit / wiring | tag service/modal helpers, Portal featured filter util if extracted | yes |
| Rules | `npm run test:rules` (extend tags suite if present; else add focused cases) | yes |
| Typecheck | portal + studio as touched | yes |

### Manual (owner)

Studio toggle Featured; Portal pills appear, toggle syncs with list; mobile; no featured → section hidden; regress companions/censor/search.

---

## Human Checkpoints

- Owner DEV QA after implement (`DEV FEATURED TAGS QA: PASS` / …)  
- Production promote remains deferred until after this QA + existing promote approval  

## Risks

| Risk | Mitigation |
|------|------------|
| Index build delay on DEV | Deploy indexes early; QA after ENABLED |
| Extra Firestore read on modal open | Single bounded query; only featured docs |
| Staff forgets to set Featured | Empty section hidden — no UX break |

## FreshForge

Amendment to existing prelaunch goal; not a new unrelated project. Starter surface: N/A.
