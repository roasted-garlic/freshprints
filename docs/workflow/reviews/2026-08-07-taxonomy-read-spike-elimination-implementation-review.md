# Implementation Review — Taxonomy read-spike elimination

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Implementation Review |
| Status | **APPROVED** (source only) |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Follow-up | `taxonomy-read-spike-elimination` |
| Plan | `docs/workflow/plans/2026-08-07-taxonomy-read-spike-elimination-plan.md` |
| Formal Review | `approved_with_changes` (RC1–RC9) |
| Scope | Source Implement + Test only — **no** live bootstrap, Rules deploy, Functions deploy, production, or PR merge |

---

## Verdict

**APPROVED** for source Implement. Ready for separate owner gates:

1. Live materialization bootstrap on `fresh-prints-dev`
2. Functions + Firestore Rules deploy to `fresh-prints-dev`
3. 45-design / Studio warm-cache validation

---

## RC challenge answers

| # | Challenge | Answer |
|---|-----------|--------|
| 1 | Can any current writer bypass rebuild? | **No for known writers.** Studio `catalogTagService` / `categoryService` and Admin archive writes mutate `tags`/`categories`; `onTagTaxonomySourceWritten` / `onCategoryTaxonomySourceWritten` coalesce into `rebuildTaxonomyMaterialization`. Registry + containment tests lock this. |
| 2 | Can a future writer bypass tests? | **Harder.** `TAXONOMY_WRITER_REGISTRY` + containment tests require index exports, trigger wiring, and registry paths. New writers that skip Firestore `tags`/`categories` would need a new path — document + extend registry. |
| 3 | Can meta point to incomplete chunks? | **Readers reject.** Fence: chunks written first, meta last. Readers require `ready`, matching `chunkCount`, per-chunk `revision`/`contentHash`, and recomputed SHA-256. |
| 4 | Can fallback cause a fleet-wide spike storm? | **Partially mitigated, documented.** Single-flight is **per instance only**. Circuit opens after 3 FS fallbacks / 5 min. N cold instances can still each hydrate once — explicit in docs/ADR. |
| 5 | Can Studio list 1,121 tags before checking revision? | **No on materialization path.** Hook calls `loadStudioTaxonomyPreferringMaterialization` first (meta → disk revision short-circuit → chunks). FS lists only when materialization unavailable (pre-bootstrap / RC4). |
| 6 | Can a non-staff client read materialization? | **No.** Rules: `allow read: if isStaff()` (existing predicate). Emulator + source alignment tests. |
| 7 | Can any client write materialization? | **No.** `allow create, update, delete: if false`. |
| 8 | Is any Stage 5 path revived? | **No.** Containment + Storage Rules negative tests; no `generated/portal-catalog` / `catalog-reference` matches re-added. |
| 9 | Does resolver output differ? | **Parity test passes** for alias/exact match on materialized vs FS-shaped corpus. |
| 10 | Does any design write rebuild taxonomy? | **No.** Triggers only on `tags`/`categories`. Algolia sync + enqueue do not import rebuild. |
| 11 | Is read cost O(chunks)? | **Yes when healthy.** Current scale → **1 chunk**. AI warm same revision → **0** taxonomy FS reads (process cache). Studio warm disk → **1 meta** read. |

---

## Residual risks (accepted for this gate)

- Until live bootstrap + deploy, runtime still uses FS hydrate (by design RC4).
- Multi-instance cold-start fallback storms remain possible (documented).
- Warm AI TTL may serve prior revision until expiry/clear (TTL secondary to revision key).

---

## Confirmations

- NO live materialization bootstrap
- NO Rules deploy
- NO Functions deploy
- NO Storage changes beyond Stage 5 already deployed earlier
- NO Algolia taxonomy authority
- NO production
- NO PR merge

**STOP.**
