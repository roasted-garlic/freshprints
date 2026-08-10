# Plan Amendment: Final prelaunch UX — Portal censor + Studio companion polish

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (corrective amendment) |
| Parent goal | `prelaunch-companion-designs-and-censored-content` |
| Related | Owner `DEV COMPANION CENSORED QA: FAIL: FINAL PRELAUNCH UX CORRECTIVE REQUIRED` (+ Censored toggle label amendment) |
| Deploy | `fresh-prints-dev` only; no Rules/index change expected |

---

## Goal

Polish Portal censored-content UX (single reveal gate, list vs details, global **Censored** toggle), improve mobile Catalog filter layout, move Studio Companion Designs into a dedicated modal with live membership refresh, and finalize Needs Companion as an **unlinked-design working queue only**.

---

## Scope

### In Scope

1. Portal censor presentation (cards / details / lightbox / toggle label)
2. Portal mobile filter responsive layout (narrow, no redesign)
3. Studio dedicated Companion Designs modal + live post-mutation UI
4. Needs Companion semantics #5 (unlinked queue only; auto-clear on first link)
5. Docs + tests per owner list; Explicit SEO/Algolia rules preserved

### Out of Scope

- Production / Algolia reconcile / App Hosting prod / Studio prod package / myprintrequest.com / DNS / cutover
- Field rename migration / backfill of persisted data
- Redesigning whole Catalog page

---

## Data model decision (#5) — binding recommendation

| Option | Choice |
|--------|--------|
| **A. Keep `companionSetIncomplete`** with corrected semantics | **Selected** |
| B. Introduce `needsCompanion` + compatibility | Rejected (migration risk; no prod migration authorized) |

**Semantics (final):**

- `companionSetIncomplete === true` ⇔ staff queue for an **unlinked** design (no `companionSetId`).
- On first successful Link: **clear** queue flag on all designs joining the new/extended set that were waiting.
- Linked designs: **cannot** Mark Needs Companion (hide/disable control).
- Dissolution to zero links: eligible again; **do not** auto-mark.
- `companionSets.complete`: **soft-deprecate for MVP queue UX** — stop mirroring onto `companionSetIncomplete`; remove linked Mark Complete / Mark Needs Companion controls; keep field on docs (new sets may write `complete: true`) for Rules/schema stability without migration.

No production data migration. Optional DEV heal-on-touch: if design has `companionSetId` and `companionSetIncomplete === true`, clear incomplete (treat as linked, not queued).

---

## Approach

### 1. Portal censor UX

| Surface | Behavior |
|---------|----------|
| Catalog/list cards | If censored globally: blurred art + **Censored Content** + **Click to view**. Overlay click opens Design Details (does **not** reveal artwork on the list). |
| Design Details | Initial: Censored Content + Click to reveal. After reveal: real art + small **Censored Content** indicator; no second gate in details/lightbox for that session. |
| Lightbox | If already revealed in details: show art immediately + indicator. |
| List after details reveal | Card stays censored while global OFF. |
| Global ON | List shows real art; no censored card treatment. |

Implementation sketch:

- `CatalogThumbnailPanel`: modes `list` vs `details` (or `allowReveal` boolean). List: overlay non-interactive for reveal; parent card click opens details.
- Lift **session revealed** for the open design in `CatalogDesignDetailsModal` and pass into hero + lightbox.
- Keep optional residual indicator component when revealed but still explicit.

### 2. Global toggle label

- Visible label: **`Censored`** (one word).
- Accessible name / tooltip: `"Show censored content"`.
- Storage key / preference semantics unchanged (`fresh-prints-portal-show-explicit-content`); presentation-only.

### 3. Mobile filter layout

- At ≤47.99rem: Search full width on row 1; secondary filters compact grid without overflow/awkward wrap.
- Prefer existing CSS primitives; desktop no regression.
- Add CSS/structure regression test where practical (source/CSS assertions or layout class presence).

### 4. Studio Companion Designs modal

- Compact Design Details: keep NEEDS COMPANION badge; **View more details** → Audit only (remove CompanionSetPanel from audit modal).
- New button **Companion Designs** directly below View more details → dedicated modal hosting current panel content.
- Reuse `DesignLibraryModal` / ModalHeader patterns.

### 5. Live mutation refresh

- After link/unlink success: update local `companionSet` + `memberDesigns` in the open panel from mutation result + **one** `listMemberDesigns(setId)` (or empty if dissolved) — no full Library reload required for modal UI; keep lightweight parent `onCompanionsChanged` for badge/list denorm.
- Do not add per-member listeners or N+1.

### 6. Service changes for #5

- `linkDesign`: after membership write, clear `companionSetIncomplete` on all members in the resulting set (deleteField/false).
- Remove / no-op product path for `setCompanionSetComplete` from UI; optionally keep method for compatibility.
- `markNeedsCompanion`: reject if design has real `companionSetId`.
- Unlink dissolve: clear membership; **do not** set incomplete true automatically.
- Heal: linked + incomplete → clear incomplete on touch.

---

## Test strategy

Automated: Portal censor mode tests; filter bar label; Studio placement (Companion not in audit); service/helpers for queue-clear-on-link; wiring tests; Rules suite regression.

Manual: owner DEV re-QA checklist (updated).

---

## Human checkpoints

- Owner DEV re-QA after implement
- No production promotion

---

## Deploy confirmation required at end

- fresh-prints-prod untouched
- Algolia untouched
- myprintrequest.com untouched
- App Hosting prod / Studio prod package untouched
