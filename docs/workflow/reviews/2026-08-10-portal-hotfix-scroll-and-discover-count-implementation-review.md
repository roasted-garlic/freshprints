# Implementation Review: Combined Portal hotfix (scroll + Discover placeholder count)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Review Agent (independent) |
| Diff basis | `hotfix/portal-design-modal-scroll-preservation` vs `f5584451…` (scroll + Discover count) |
| Verdict | **approved** |

---

## Summary

Combined hotfix correctly (1) skips `PortalScrollReset` for `designId`-only URL churn and (2) drives Discover search placeholder from `countReadyDesigns` / `readyLibraryCount`, never `designs.length`. Home rails still use bounded `listHomeDiscoveryPool`. No full-catalog hydration, backend, or Algolia scope expansion.

---

## Checklist

| Concern | Verdict |
|---------|---------|
| Accidental full-catalog hydration | **pass** — rails unchanged; count is `getCountFromServer` |
| Extra repeated aggregate reads | **pass** — one Discover aggregate via retry helper; pool still has its own internal membership count for fill (pre-existing) |
| Discover rail regression | **pass** — ranking memos still consume `designs` from pool only |
| Misleading count fallback | **pass** — pending/fail → null → neutral placeholder |
| Duplicate count architecture | **pass** — reuses `fetchReadyDesignCountWithRetry` + `countReadyDesigns` |
| Interaction with library count authority | **pass** — library path untouched |
| Scroll-preservation intact | **pass** — fingerprint helper + PortalScrollReset skip unchanged; tests green |
| Backend/security expansion | **pass** — none |

---

## Required corrections
None.

## Next step
Owner open/update production PR for combined tip → merge → second App Hosting rollout. **Do not** merge/deploy/Studio from this review alone.
