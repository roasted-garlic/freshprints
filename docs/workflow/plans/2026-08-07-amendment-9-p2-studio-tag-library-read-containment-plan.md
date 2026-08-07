# Plan: Amendment 9 P2 — Studio taxonomy/tag-library read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Agent |
| Status | reviewed — NO IMPLEMENTATION (accept Option A) |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Amendment | 9 P2 — Studio tag-library read containment |
| Related | Combined live QA attribution (tags **1,121** once this session) |
| Implement | **NOT authorized this pass** — Plan → Formal Review → STOP |

---

## Goal

Evaluate whether the Studio’s fixed ~1,121-document approved-tag hydrate can be reduced without degrading AI Review tag editing, aliases, Tag/Category Management, or taxonomy freshness — **or recommend accepting the cost**.

---

## Background (live)

After P0/P1/P3/P4, the dominant remaining **Studio client** fixed cost in the ~45-design QA was:

| Collection | Docs |
|------------|-----:|
| tags | **1,121** |
| categories | **18** |

This is **O(1) per session/cache window**, not O(n) per design.

---

## Investigation summary (current HEAD)

1. **Sole Firestore reader:** `catalogTagService.listTags` — paged `getDocs` (500/page).
2. **Shared cache already exists:** `boundedAsyncCache`, **TTL = 12 hours**, key `{projectId}:{callerId}:approved|all`, in-flight dedupe.
3. **AI Review / Design Library** use `useGeneratedDesignLibraryTaxonomy` → `listTags()` (approved). Multiple React callers share one service load.
4. **AI Review needs** full approved corpus client-side for `TagChipInput` name/**alias** resolve + suggestions. `preferredWhen` not used by the picker (still required on documents).
5. **Second corpus risk:** `:all` key (Tag Management / `getAllTags` on write) can cause a **second** full hydrate.
6. **Categories:** same 12h pattern; ~18 docs — negligible.
7. **No** Storage taxonomy snapshot / new API / Algolia required for “use existing cache better.”

---

## Scope

### In Scope (this planning pass)

- Document current cost and options A–E
- Formal Review: whether P2 is worth implementing
- **STOP before Implement**

### Out of Scope

- Implementation
- New persistent taxonomy snapshot, Storage JSON cache, new API, Algolia/Typesense, Stage 1b, schema migration, new dependency (unless Review forces owner decision — then STOP)

---

## Options

| ID | Option | Expected Firestore savings | Complexity | UX risk |
|----|--------|---------------------------:|------------|---------|
| A | **Keep as-is** | **0** (already ~1×/12h) | None | None |
| B | Stronger sharing / unify `:approved` vs `:all` | 0–~1121 if second key avoided | Low | Low |
| C | Client field projection | **0** billable docs | Low | None (reads unchanged) |
| D | On-demand / typed search | Up to ~1121 if picker rarely opened | Med–High | Instant browse/autocomplete |
| E | Lazy hydrate on focus; skip write-path full `:all` when safe | Modest / situational | Low–Med | Low |

---

## Recommended disposition (planning)

**Prefer Option A (accept current fixed cost)** unless Debug shows frequent second `:all` hydrates — then a tiny Option B/E cleanup may be justified later.

Rationale: Amendment 9 already treated Studio tags as acceptable fixed cost; live session already hits the one-hydrate budget; further cuts need UX or infra tradeoffs disproportionate to ~1.1K reads/session.

---

## Test Strategy (only if Implement later)

- Prove still ≤1 approved corpus load per 12h for AI Review + Design Library path
- Alias autocomplete regressions
- Tag Management archived list still correct
- No new listeners/polling

## Human Checkpoints

- [x] Formal Review decides implement vs accept
- [ ] Implement only after separate owner authorization

## Open Questions

- [x] None blocking Plan — Review must challenge economic value

## Approval

- Review doc: `docs/workflow/reviews/2026-08-07-amendment-9-p2-studio-tag-library-read-containment-review.md`
- Verdict: **approved — recommend NO IMPLEMENTATION** (accept Option A)
- Implement: **not authorized**; workstream closed as accept-current-cost
