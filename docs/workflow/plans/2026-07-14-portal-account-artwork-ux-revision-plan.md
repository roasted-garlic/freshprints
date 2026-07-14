# Plan: Portal account artwork UX revision

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | ADR-FP-086 §5 (amended) |

---

## Goal

Revise Portal account / request reuse UX per owner feedback after ADR-FP-086 ship:

1. Move **My Favorites** into Quick links with a favorites **count**.
2. Remove Past uploads copy: “Full-size files are not re-addable from here.”
3. Restore single **Your designs** gallery on account; full modal tabs: Uploaded / Donated / **Reusable**.
4. **Reusable** = customer uploads/donations that are still in the catalog (`promotedDesignId` → ready design).
5. Reuse from a **past request**: on that request’s items, **Add to request** if still in catalog; otherwise **No longer in catalog** where the button would be.

## Scope

### In Scope
- Dashboard Quick links + Favorites count (`useFavorites`)
- Restore embedded single gallery; modal Reusable tab + add flow for reusable tiles
- `promotedDesignId` on account gallery items; resolve ready catalog designs
- Read-only request item card: Add / unavailable message + wire `useAddDesignToRequestFlow`
- ADR-FP-086 §5 + ROADMAP wording

### Out of Scope
- Favorites page changes
- Production deploy
- Re-add of non-catalog customer uploads (full-size)

## Test Strategy
- Portal typecheck
- Manual: dashboard gallery + favorites link; modal tabs; past request Add / unavailable

## Approval
- Owner-directed revision; review approved same pass
