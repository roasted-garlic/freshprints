# Review: Amendment 9 P2 — Studio taxonomy/tag-library read containment

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Independent Formal Review (adversarial) |
| Plan | `docs/workflow/plans/2026-08-07-amendment-9-p2-studio-tag-library-read-containment-plan.md` |
| Live evidence | `docs/workflow/reviews/2026-08-07-amendment-9-combined-live-qa-attribution.md` |
| Parent framing | Amendment 9 plan §P2.1 / classification matrix — Studio tags once = **ACCEPTABLE CURRENT COST** |
| Verdict | **approved — recommend NO IMPLEMENTATION** (accept Option A) |

---

## Summary

P2’s investigation plan is accurate and appropriately bounded (Plan → Review → STOP). Adversarial economic challenge fails to justify implementation: live QA already shows **tags = 1,121 once**, which meets the Amendment 9 budget of ≤1 full approved-corpus load per session, and `catalogTagService` already has a **12h** `boundedAsyncCache` with in-flight dedupe. Further containment either saves **zero billable docs** (projection), trades UX for speculative savings (typed search / lazy hydrate), or optimizes a **second-key** path that this session did not hit. **Accept the fixed cost; do not implement P2.**

---

## Explicit recommendation

| Decision | Action |
|----------|--------|
| **Accept current fixed cost** | **YES — preferred** |
| Implement P2 (any of B–E) now | **NO** |
| Owner authorize Implement later | Only if Debug proves **frequent** second `:all` hydrates (or corpus growth makes O(T) painful) — then tiny B/E only |

**Bottom line:** Implement P2? **No.** Accept the ~1.1K Studio tag hydrate as a bounded fixed cost? **Yes.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | **pass** | Explicitly Plan→Review→STOP; no implement authorization |
| Architecture alignment | **pass** | Correctly rejects new Storage snapshot / API / Algolia unless owner forces STOP |
| Security impact addressed | **pass** | N/A for Option A; no auth/rules change proposed |
| Data model impact addressed | **pass** | No schema migration in scope |
| Backend impact addressed | **pass** | Studio client-only cost; server P3/P4 already separate |
| Test strategy adequate | **pass** | Deferred correctly (“only if Implement later”) |
| Human checkpoints identified | **pass** | Formal Review decides implement vs accept; separate owner auth for any later Implement |
| Roadmap alignment | **pass** | Matches Amendment 9 Priority 2 “ACCEPTABLE CURRENT COST” |
| Documentation plan | **pass** | Disposition recorded here; no behavior change |
| No silent scope expansion | **pass** | Options table does not smuggle Stage 1b / new infra |

---

## Adversarial economic challenge

### Claim under review

That P2 implementation is worth engineering cost to reduce the Studio ~1,121-doc approved-tag hydrate.

### Evidence against implementing

1. **Already at acceptance budget.** Amendment 9 P0 gate: “Fixed tag startup | 1,121 | ≤1 full load / session (cache OK).” Combined live QA: tags **1,121 once**. Target met; no regression to chase.

2. **Cache already does the cheap thing.** `TAXONOMY_CACHE_TTL_MS = 12 * 60 * 60 * 1000` + `createBoundedAsyncCache` (hit / in-flight share / reject-not-retained). Remounts within TTL are cache hits, not re-pages. Live session’s one hydrate is consistent with cold miss + subsequent hits.

3. **Parent plan pre-classified this as non-blocking.** Classification matrix: “Studio tags once (~1121) | **ACCEPTABLE CURRENT COST**.” P2 was always “optimize later / may recommend no implement,” not a production gate like P0/P1.

4. **Console spike optics are not a P2 problem.** Attribution reconstructs ~2.0K / ~1.7K buckets as **P3 cold taxonomy + P4 pubs** stacking (~1.1K each), with Studio tags as another fixed contributor. Removing or delaying Studio’s single hydrate does not retire publication C+T+R (~3×1,139 this window) and does not change “bounded, not amplifying with N.”

5. **Option math is hostile to ROI:**

| Option | Real savings vs this session | Why reject now |
|--------|-----------------------------:|----------------|
| **A Keep as-is** | 0 | **Correct disposition** — cost already bounded |
| **B Unify `:approved` vs `:all`** | 0 this session (no second key observed) | Speculative until Debug shows frequent dual hydrate |
| **C Field projection** | **0 billable docs** | Firestore bills documents, not fields |
| **D On-demand / typed search** | Up to ~1121 if picker never opened | Breaks instant alias autocomplete / staff UX that justifies full corpus today |
| **E Lazy hydrate / skip write `:all`** | Situational | Complexity for modest/rare path; write uniqueness still needs corpus or a narrower query design |

6. **Dollar economics are trivial relative to amplification already fixed.** O(n²) approve reloads (P0) and import/approval oneshots (P1) dominated harm. A one-time ~1.1K doc read per Studio process cold window is noise next to three full portal-catalog publications in the same QA window (~3.4K C+T+R server-side).

### Residual risks acknowledged (do not justify Implement now)

| Risk | Severity | Disposition |
|------|----------|-------------|
| Separate cache keys `:approved` vs `:all` can cause a **second** full hydrate (Tag Management `includeArchived: true`, write-path `getAllTags`) | Low–Med if operators often open Tag Mgmt / create tags after AI Review in same process | Watch Debug; if frequent, tiny B/E later — **not** a full P2 program |
| Process restart loses in-memory 12h cache → new hydrate | Inherent | Acceptable; Storage/shared snapshot is architecture decision, correctly out of scope |
| Stale comment in `useAiReviewInbox` claiming “zero Firestore reads” for generated taxonomy | Doc drift only | Hook still calls `useGeneratedDesignLibraryTaxonomy` → `listTags()`; live 1,121 proves it. Not a P2 implement trigger |

### What would reopen Implement

Reopen **only** with new evidence:

- Studio Debug shows **≥2** full tag-corpus hydrates in a normal AI Review / Design Library session without Tag Management, **or**
- Frequent `:approved` + `:all` double load in staff workflows, **or**
- Corpus growth makes cold hydrate materially slow / expensive enough for owner to accept UX tradeoffs (then re-plan; do not silently expand).

Until then: **Option A.**

---

## Architecture Review

**Findings:**
- Sole reader claim holds: paged `listTagPage` / `listAllTags` behind `catalogTagService.listTags`.
- AI Review + normal Design Library share `useGeneratedDesignLibraryTaxonomy` → approved `listTags()`; service cache shares the load across React callers.
- Plan correctly refuses new persistent taxonomy snapshot / Algolia / Typesense without owner architecture decision (would risk snapshot-shaped duplication).
- Categories (~18) correctly treated as negligible.

**Required changes:**
- [ ] None for disposition Option A

---

## Security Review

**Findings:**
- No permission, Rules, or secret changes under Option A.
- Options D/E would need careful auth on any new query surface if ever pursued later — not in scope now.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] None (no implement / no deploy)

---

## Data Model Review

**Findings:**
- No persisted field or status changes.
- `preferredWhen` note (required on docs, unused by picker) is informational only.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Studio client fixed cost is independent of P3 process-local server taxonomy cache and P4 publication scans.
- Accepting Studio tags does not reopen P3/P4 signoffs.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Live combined QA already supplies the decisive metric (tags **1,121 once**).
- Deferred automated tests are appropriate only if owner later authorizes Implement — not required to close P2 as “accept cost.”

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- Plan + this review close the P2 investigation loop promised by P1 signoff (“may recommend no implement”).
- No product behavior docs to update under Option A.

---

## Required Changes (if approved_with_changes)

None. Verdict is not `approved_with_changes`.

---

## Blockers (if blocked)

None. Plan is not blocked; implementation is **not recommended**.

---

## Verdict Rationale

**approved — recommend NO IMPLEMENTATION (accept Option A).**

The plan is review-complete and honest: it asked whether P2 is economically worth doing and preferred Option A. Independent adversarial review agrees more strongly — live one-hydrate evidence + existing 12h cache + Amendment 9’s prior “acceptable fixed cost” classification make B–E either worthless (C), speculative (B/E without dual-hydrate proof), or UX-hostile (D). P2 must not consume Implement capacity while Stage 1b / production promotion remain the real remaining cost levers.

---

## Next Step

1. Record disposition: **P2 closed as accept-current-cost** (no Implement phase).
2. Do **not** open Implement for P2 unless owner authorizes after new dual-hydrate evidence.
3. Continue Amendment 9 remaining work elsewhere (Stage 1b / production gates) — not tag-library rewrite.
