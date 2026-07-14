# Plan: Owner-only Studio design asset purge (history-safe)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | draft — **queued after** portal-catalog-image-load-caching (decisions locked) |
| Workflow | managed-phase (next) |
| Related | docs/workflow/plans/design-delete-archive-policy-plan.md |

---

## Goal

Allow the **Owner only** to remove a design’s **large Storage images** from Studio so the catalog no longer serves those files, while **preserving enough metadata** that old print requests still show useful history (title / small thumbnail placeholder), not broken production secrets.

## Background

Owner asked alongside image caching. Soft archive already hides designs from Portal without deleting Storage. Firestore client hard-delete of `designs` is denied. Print request catalog items often reference live `designId` without full image snapshots — purging Storage without care breaks request previews and gang-sheet original paths.

Broader policy already drafted in `design-delete-archive-policy-plan.md`. This plan **narrows** the first shippable slice to: **owner purge of large Storage assets + catalog hide**, keeping the design doc and the smallest thumbnail.

## Owner decisions (locked 2026-07-14)

1. **Keep only the smallest image** — retain `/thumbnails/{id}.webp`; purge `/originals/` and `/previews/`.
2. **Allow purge from a live/ready design** — no archive-first requirement; strong confirmation still required.
3. **Active show queue** — show a **warning** if the design is on an active show queue; allow purge after explicit confirm (do not hard-block).

## Scope (proposed for next phase)

### In Scope

1. Owner-only Studio action (e.g. “Delete images”) — gated by `role === owner` in UI **and** trusted backend (callable)
2. Cloud Function: verify owner; delete Storage `/originals/` + `/previews/`; keep thumbnail; mark design purged / archived as needed so Portal catalog hides it
3. Preserve design Firestore doc (fields: e.g. `assetsPurgedAt`, `assetsPurgedBy`, flags for missing original/preview) so `designId` references still resolve title + thumbnail
4. Print-request / Studio UI: when originals/previews gone, use thumbnail or placeholder; gang-sheet export must fail safely with clear message if original missing
5. Ensure `titleSnapshot` on print request items when purging or when adding catalog items
6. Warning modal when active show allocation/queue references exist; confirm continues purge
7. Rules/docs: SECURITY, DATA_MODEL; Storage delete via Function only for this flow
8. Audit: who purged when

### Out of Scope (unless owner expands)

- Full hard-delete of Firestore `designs/{id}` + tombstone collection (later policy step)
- Admin/helper purge rights
- Bulk purge
- Deleting the thumbnail
- Image load caching (prior phase)

## Critical constraints

| Constraint | Approach |
|------------|----------|
| Owner only | Callable Admin SDK + `role == owner`; UI hide for others |
| Keep print request info | Keep design doc + title + thumbnail; snapshot titles on items |
| Remove large images | Delete `/originals/` + `/previews/`; keep `/thumbnails/` |
| Active queue | Warn + require confirm; allow continue |
| No client Storage delete as security boundary | Function performs deletes |

## Sequencing

1. Complete and sign off **portal-catalog-image-load-caching**
2. Promote this plan to `ready_for_review` (decisions already locked)
3. Review → Implement (Function + Studio UI)

## Status

**Not active.** Do not implement until caching phase is signed off.
