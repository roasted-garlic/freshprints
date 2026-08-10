# Plan Amendment: Pairwise companion links + Censored/Uncensored toggle label

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `prelaunch-companion-designs-and-censored-content` |
| Related | supersedes transitive semantics of `companionSets` (ADR-FP-131/132 membership model); keeps Needs Companion unlinked-queue rule |
| Parent | Goal #13 voluntary pre-cutover hardening |
| Environment | **fresh-prints-dev only** |

---

## Goal

Replace group/transitive `companionSets` membership with **explicit pairwise many-to-many links** so Portal Matching Designs shows only direct neighbors. Update the Portal filter toggle visible label to **Censored** (off/default) / **Uncensored** (on). Preserve censor reveal UX, Needs Companion unlinked-queue semantics, Studio Companion modal UX, and Algolia non-touch.

---

## Background

Current model (`companionSets` + `designs.companionSetId`) treats companions as a clique: linking Front B → Back D when D is already with Front A puts A, B, and D in one set, so A incorrectly sees B as a match. Owner requires Matching Designs = **explicit links only** (not “you may also like”, not transitive).

Example required graph:

- A↔D, B↔D, C↔D  
- D lists A,B,C; each of A/B/C lists only D  
- A must not list B/C unless separately linked  

Also: designs already linked elsewhere must remain linkable to additional partners (true many-to-many).

---

## Scope

### In Scope

1. **Pairwise companion data model** replacing set membership for product behavior
2. Studio link / unlink / Needs Companion / picker / Companion modal wired to pairwise APIs
3. Portal Matching Designs + post-add suggestion + list-card hint from direct neighbors only
4. Firestore Rules + indexes updates for the new shape; expression-budget-safe denorm writes
5. Docs: DATA_MODEL + ADR amendment
6. Portal Censored ↔ Uncensored visible toggle label by preference state
7. Automated tests for pairwise / Needs Companion / Portal / censor label / Rules
8. Narrow **fresh-prints-dev** Rules/index deploy if required

### Out of Scope

- fresh-prints-prod / App Hosting prod / Studio prod package / Algolia / DNS / myprintrequest.com
- Automatic migration that invents pairwise edges from old `companionSets` cliques
- Destructive DEV cleanup executed by agents overnight
- Renaming `companionSetIncomplete` field (keep name; semantics unchanged)
- Changing Explicit Content / Halftone / catalog lifecycle status behavior
- Algolia schema changes

---

## Affected Areas

### Files / Modules (expected)

**Studio**

- `apps/studio/.../services/companionSetService.ts` → pairwise link service (rename or thin wrapper)
- `apps/studio/.../utils/companionSetHelpers.ts` → pairwise helpers
- `apps/studio/.../types/companionSet.types.ts` (+ new link types)
- `CompanionSetPanel.tsx`, `CompanionLinkPickerModal.tsx`, Design Library / AI Review wiring
- Firestore collection constants

**Portal**

- `catalogService.ts` (ready companions by neighbor IDs; drop `companionSetId` peer query)
- `catalog.types.ts`, cards, details, suggestion modal, home/library pages
- `CatalogFilterBar.tsx` (Censored / Uncensored label)
- Censor tests

**Backend / shared**

- `firestore.rules` (new collection + design denorm fields; remove/retire `companionSets` product path)
- `firestore.indexes.json` (drop or leave unused `companionSetId+status`; add indexes only if queries require)
- `docs/architecture/DATA_MODEL.md`, `docs/project/DECISIONS.md`

### Architecture Impact

- [x] Details: Companion domain becomes **edge + design denorm neighbors**. Portal still never reads staff-only edge collection; hydrates neighbor IDs from design docs (same pattern as today with `companionSetId`).

### Security Impact

- [x] Details: New `companionLinks` staff-only R/W. Portal continues to discover peers only via design fields + public/ready design reads. Needs Companion never customer-visible. Keep `companionDenormOnlyUpdate`-style fast path for neighbor-array / queue-flag writes to avoid expression-budget denials.

### Data Model Impact

- [x] Details: see Approach § Data model

### Backend Impact

- [x] Details: Rules (+ indexes if needed). **No Functions / Algolia** expected. If Algolia appears required → STOP.

### UI / UX Impact

- [x] Details: Studio Companion modal lists **pairwise neighbors** (not set members). Unlink removes one edge. Picker allows already-linked-elsewhere designs. Portal Matching Designs = direct ready neighbors only. Toggle label Censored/Uncensored.

### Migration Impact

- [x] Forward: **no automatic clique→pairwise conversion** (intent unknowable).
- [x] Compatibility: New code **ignores** `companionSetId` / does not treat old set membership as matches. Reads/writes `companionDesignIds` + `companionLinks`.
- [x] Old DEV `companionSets` docs: leave in place; document owner cleanup/reset before QA (list known DEV set IDs / advise Test Data Reset or manual delete). Do **not** dissolve-migrate overnight.
- [x] Rollback: redeploy prior Rules; revert app code; old sets still present but unused by new clients.

---

## Approach

### 1. Canonical pairwise schema (repo-checked recommendation)

**Single source of truth (edge):**

```
companionLinks/{linkId}
  id: string                 // == linkId
  designIds: [string, string] // exactly two IDs, sorted ascending for stability
  createdAt, updatedAt: timestamp
  createdBy, updatedBy: string
```

- `linkId` = `${min(a,b)}_${max(a,b)}` (deterministic; prevents duplicates)
- Staff-only Rules (same posture as today’s `companionSets`)
- Symmetric product view derived from one edge

**Portal / list efficiency denorm on each design:**

```
designs/{id}
  companionDesignIds?: string[]     // direct neighbor IDs only (no transitive closure)
  companionSetIncomplete?: boolean  // KEEP: unlinked-only Needs Companion queue
  // STOP writing companionSetId (legacy; ignore on read for matching)
```

**Why hybrid (edge + denorm), not array-only or edge-only**

| Option | Verdict |
|--------|---------|
| Array-only on designs | No single edge doc; unlink/link must keep two arrays in sync without an authoritative pair key → duplicate-link races harder |
| Edge-only | Forces Portal/Studio to query edges per design → N+1 or new customer-readable edge rules (leak non-ready peer IDs) |
| **Edge + `companionDesignIds` denorm** | Canonical pair; Portal keeps hydrated neighbor IDs on catalog designs; Details does batched gets by ID; card hint uses in-memory arrays — **no N+1** |

**Retire product use of:** `companionSets`, `designs.companionSetId` (leave orphan DEV data; do not auto-delete).

### 2. Link / unlink algorithms (Studio service)

`linkDesigns(caller, a, b)` in one transaction:

1. Reject `a === b`
2. If `companionLinks/{min_max}` exists → **no-op success** (duplicate prevented)
3. Create edge doc
4. Symmetrically add each ID into the other’s `companionDesignIds` (dedupe)
5. Clear `companionSetIncomplete` on **both** (first link / any link clears queue; never propagate queue to peers beyond clearing)

`unlinkDesigns(caller, a, b)`:

1. Delete edge `min_max` if present (idempotent)
2. Remove each from the other’s `companionDesignIds`
3. **Do not** set `companionSetIncomplete` on either (manual only when zero links remain)

`listLinkedDesigns(designId)`: read design’s `companionDesignIds` → batch `getDoc` members (Studio).

`markNeedsCompanion`: allow only when `companionDesignIds` empty/absent (and no edge orphan); queue-only write. Reject if any link.

`clearNeedsCompanionUnlinked`: clear flag when unlinked; reject if still linked.

### 3. Needs Companion (unchanged owner rule)

| State | Mark Needs Companion | Auto on link | Auto on unlink |
|-------|----------------------|--------------|----------------|
| 0 links | allowed (manual) | n/a | n/a |
| ≥1 links | **rejected** | clear flag on linked designs | never set |
| After last unlink | eligible again (manual) | — | **do not** auto-mark |

### 4. Studio picker

Exclude only:

- self
- IDs already in current design’s `companionDesignIds`

**Do not** exclude candidates that have other companions.

### 5. Studio Companion modal

Preserve UX (dedicated modal, thumbs, lightbox, truncation, THIS DESIGN, unlink confirm, live refresh). List = pairwise neighbors. Unlink one neighbor = one edge.

### 6. Portal Matching Designs

- Input: hydrated `companionDesignIds` on current design
- Fetch: batch get those IDs; keep `status === 'ready'` (+ existing Portal mapping filters)
- **No** `companionSetId` equality query; **no** graph walk; **no** second-degree
- Post-add suggestion: same direct neighbors
- List-card hint: `companionDesignIds?.length > 0` from hydrated catalog designs (no per-card query). Under-report of readiness is OK; Details still filters ready-only.

### 7. Rules / indexes

- Add `match /companionLinks/{linkId}` staff CRUD with shape validation (`designIds` size == 2, `id == linkId`, audit fields)
- Extend design optional: `companionDesignIds` list (size bounded, e.g. ≤ 50)
- Update denorm fast path keys: `companionDesignIds`, `companionSetIncomplete`, `updatedAt`, `updatedBy` (and allow deleting legacy `companionSetId` in same fast path during heal if needed)
- Stop requiring `companionSets` for product; may leave rules match temporarily **or** remove if unused (prefer remove create/update from clients; delete allow staff for manual cleanup)
- Indexes: remove dependency on `companionSetId + status` for Portal; **no new composite required** if Portal uses get-by-id. Deploy index file only if something new is added.

### 8. Censored toggle label

In `CatalogFilterBar.tsx`:

- Preference off → visible label **`Censored`**
- Preference on → visible label **`Uncensored`**
- Keep clear `aria-label` / `title` (e.g. “Show censored content” / “Hide censored content” or state-aware equivalent)
- Do not change preference storage or list/details/lightbox reveal behavior

### 9. Old DEV companionSets treatment

1. New clients ignore `companionSetId` for matching
2. Document known DEV sets (from inspection) for owner manual QA prep
3. Recommended owner action before QA: delete `companionSets` docs and clear stale `companionSetId` on affected designs via Studio/console **or** accept that old set denorm is ignored until designs are re-linked pairwise
4. **No** overnight script that expands cliques into all-pairs

---

## Test Strategy

### Automated

| Check | Required |
|-------|----------|
| Pairwise helper/service unit tests (link cases 1–15, Needs Companion 16–22) | Yes |
| Portal mapping / matching / no transitive / card hint source tests | Yes |
| Censor label OFF=Censored / ON=Uncensored + prior reveal regressions | Yes |
| Studio modal wiring / picker eligibility source tests | Yes |
| Firestore Rules: companionLinks staff; denorm fast path; expression budget suites | Yes |
| Portal + Studio typecheck | Yes |

### Manual (owner morning QA)

See checklist doc produced at Test STOP.

---

## Human Checkpoints Anticipated

| When | Why |
|------|-----|
| After Implement+Test+DEV deploy | Owner manual QA (pairwise graph + toggle label) |
| If Algolia required | STOP |
| If destructive cleanup required to proceed | STOP — document only |

---

## Risks & Rollback

| Risk | Mitigation |
|------|------------|
| Expression budget on denorm array writes | Keep/extend companion denorm-only fast path |
| Stale `companionSetId` confusing staff | Ignore in UI; badge from `companionDesignIds` / links only |
| Array/edge sync drift | Single transaction writes edge + both arrays |
| DEV old sets confuse QA | Document reset; do not auto-migrate |

**Rollback:** revert app; redeploy previous DEV Rules; old sets unused by new code remain until cleaned.

---

## Open Questions

None blocking — owner specified pairwise + many-to-many + no clique migration. Formal Review must explicitly approve replacing `companionSets` with `companionLinks` + `companionDesignIds`.

---

## Implementation Order

1. Types + helpers + Rules/indexes draft  
2. Rewrite companion service (pairwise)  
3. Studio UI wiring (panel, picker, filters, AI Review)  
4. Portal catalog service + pages + suggestion  
5. Censored/Uncensored label  
6. Docs ADR/DATA_MODEL  
7. Tests  
8. DEV Rules/index deploy if needed  
9. STOP for owner QA  

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | Possibly `package.json` test:rules list only |
| Documentation | Yes — DATA_MODEL, DECISIONS, workflow artifacts |
| Application (Portal/Studio) | Yes |
| Production | **No** |
