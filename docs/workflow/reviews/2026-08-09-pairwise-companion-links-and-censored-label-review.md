# Review: Pairwise companion links + Censored/Uncensored toggle label

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-09-pairwise-companion-links-and-censored-label-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly abandons transitive `companionSets` cliques for explicit pairwise many-to-many links, preserves Needs Companion as an unlinked-only Studio queue, keeps Portal read efficiency via design denorm (no N+1), leaves Algolia untouched, and scopes deploys to fresh-prints-dev. Hybrid **`companionLinks` + `companionDesignIds`** is the right replacement for this codebase. Censored/Uncensored label change is narrowly specified.

**Formal approval of replacement:** `companionSets` / `companionSetId` product path is **replaced** by `companionLinks/{minId_maxId}` (canonical edge) + `designs.companionDesignIds` (symmetric denorm). Legacy DEV set documents are **not** migrated into all-pairs graphs overnight.

Proceed to Implement → Test automatically. Apply required changes below during implementation (no re-plan).

---

## Checklist

- [x] Scope clear and bounded (DEV only; no prod / Algolia / DNS)
- [x] Architecture alignment (services own writes; Portal never reads staff edges)
- [x] Security impact addressed (staff-only edges; ready-only Portal peers; expression-budget fast path)
- [x] Data model + migration notes (no inventing edges from old sets)
- [x] Backend impact (Rules/indexes; Functions not expected)
- [x] Test strategy covers owner’s 1–39 intent
- [x] Human checkpoints: STOP after Test for owner QA; no destructive cleanup overnight
- [x] No silent scope expansion

---

## Required changes (implementers must apply)

1. **Bound `companionDesignIds`** in Rules (e.g. list size ≤ 50) and reject non-string elements if Rules can cheaply enforce size-only (element shape owned by service, matching existing companionSets pattern).
2. **Heal legacy `companionSetId` on first pairwise write** to a design: deleteField `companionSetId` in the same denorm transaction so staff UI cannot show mixed signals; do not create edges from old membership.
3. **Picker / Library filters:** “Needs Companion” remains `companionSetIncomplete === true` AND treat designs with non-empty `companionDesignIds` as linked (never Needs Companion).
4. **Card hint:** prefer `companionDesignIds.length > 0` from hydrated designs; do not reintroduce per-card queries. Document under-report of non-ready peers in Test report.
5. **Service naming:** keep file path migration minimal — `companionSetService` may remain as module name with updated methods, or rename to `companionLinkService` with thin re-exports; avoid breaking import churn beyond what’s needed.
6. **Rules deploy:** update `companionDenormOnlyUpdate` affectedKeys to include `companionDesignIds` and optional `companionSetId` delete; keep short-circuit first.
7. **Do not** deploy Functions unless a blocker appears; if Algolia fields seem required → **STOP**.

---

## Security notes

- Customers must not read `companionLinks`.
- Portal Matching Designs must filter to ready (and existing Portal eligibility) after ID hydration.
- Companion operations must never write design `status`.

---

## Open product/security decisions

**None unresolved.** Owner specified pairwise semantics, many-to-many linking, no clique migration, and label behavior.

---

## Verdict rationale

`approved_with_changes` — plan is implementable overnight; listed amendments are mechanical, not owner decisions.
