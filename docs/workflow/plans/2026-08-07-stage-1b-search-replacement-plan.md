# Plan: Stage 1b — Search Replacement / Snapshot Retirement Path

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Agent |
| Status | ready_for_review — **Implement BLOCKED on owner D1** |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Decision analysis | `docs/workflow/reviews/2026-08-07-stage-1b-d1-search-architecture-decision-analysis.md` |
| Prior binding | Amendment 8 Phase 1B revalidation plan + review (2026-08-06) |
| Amendment 9 | Closed — do not reopen |

---

## Goal

Retire Portal **generated design search / multi-tag / facet** Storage consumers (the only remaining Stage 1b graph) via either:

- **D1 = A (Algolia)** or **B (Typesense Cloud)** — managed search adapters + sync, Firestore remains SoR; **or**
- **D1 = C (Product Simplification B1)** — remove free-text, multi-tag AND, and exact/narrowed facet UX; keep Firestore browse.

Then, in **separate** human-gated stages, retire publishers and clean generated assets.

### D1 lettering crosswalk (required — avoid Option A/B/C collision)

Prior Amendment 8 Phase 1B used **Option A** = managed search (any provider), **Option B** = product simplification, **Option C/D** = rejected Firestore-preserving / callable paths. Decision analysis uses **A1/A2/B1**. This Plan’s owner D1 letters are **different**:

| Owner D1 (this Plan) | Means | Prior Option | Analysis |
|----------------------|-------|--------------|----------|
| **A** | Algolia | Option A (provider = Algolia) | A1 |
| **B** | Typesense Cloud | Option A (provider = Typesense) | A2 |
| **C** | Product Simplification B1 | Option B | B1 |
| *(not offered)* | Firestore-only preserving current search | **Rejected Option C** | — |
| *(not offered)* | Minimal server callable as primary | **Rejected Option D** | — |

Do **not** answer D1 with legacy “Option A/B/C” alone — use Plan letters **A / B / C** or provider/simplify names.

---

## Background

Amendment 9 bounded AI/Studio/publication *amplification*. Residual **~1.1K C+T+R per full `portal-catalog` publication** remains because A1–A3 generated consumers still force the publisher to live. Stage 1a already moved by-id + categories to Firestore.

**D1 is the product/architecture fork.** This Plan is provider-neutral in the body; appendices activate after owner selection.

---

## Scope

### In Scope (after D1 — Implement authorization separate)

- Stage 1b-A replacement (provider **or** simplification)
- Stage 1b-B local verification (localhost Portal → `fresh-prints-dev`)
- Stage 1b-C owner QA checklist
- Docs / instrumentation / outage UX

### Out of Scope (this Plan’s Implement authorization)

- Stage 4 publisher retirement (separate checkpoint)
- Stage 5 generated asset cleanup (dry-run + approval)
- Stage 6 production promotion
- Amendment 9 reopen; AI pipeline changes; Studio taxonomy rewrite
- Option C/D; full-catalog hydrate; new design snapshot; Algolia Firebase Extension without separate review
- Creating provider accounts / secrets **before** owner D1 + explicit deploy/secret phrases

### Provider-neutral binding

- Firestore authoritative; Storage images authoritative
- Ordinary browse / category / single-tag / Discover / Home / New This Week / known-ID stay Firestore
- Index (if any) = disposable, ready-only, public allowlisted fields; not auth
- Mutations / Add-to-Request = Firestore + Rules
- Search outage → FS browse continues; facets unavailable explicitly
- No `array-contains-any` multi-tag workaround
- Prefer **FS by-id card hydrate** after search hits (minimal index) unless QA proves latency unacceptable

---

## Affected Areas (expected after D1)

### Files / Modules

| Path area | Likely touch |
|-----------|--------------|
| `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` | Search path switch |
| `apps/portal/features/catalog/services/portalCatalogAssetService.ts` | Stop calling generated search/facets |
| `apps/portal/features/catalog/services/catalogService.ts` | Facet adapter |
| `apps/portal/features/catalog/components/CatalogTagFilterModal.tsx` | Facets or simplify |
| `functions/src/**` (search sync) | Only if A/B |
| Env / Secret Manager docs | Only if A/B |

### Architecture / Security / Data / Backend / UI

- Architecture: hybrid search **or** product cut; no second SoR
- Security: search-only client key; admin in Secret Manager (A/B)
- Data: no Firestore schema migration required for B1; index schema disposable (A/B)
- Backend: sync Functions (A/B) or none (B1)
- UI: search/tag modal behavior changes per D1

### Migration

- A/B: backfill all `ready` designs into index before cutover; dual-run optional briefly; publishers remain until Stage 4
- B1: feature-flag remove search/multi-tag/facets; publishers remain until Stage 4

---

## Stage 1b-A — Replacement implementation

### If managed search (Algolia or Typesense Cloud)

1. Provider app/cluster (dev) + index/collection schema (public fields only)
2. Backend sync: ready upsert / leave-ready delete / metadata upsert + reconcile job
3. Portal search adapter replacing `listMatchingDesigns`
4. Multi-tag AND via provider filters
5. Global + narrowed facets via provider faceting (or explicit unavailable if deferred)
6. Pagination + `readyAtMs` sort option
7. Outage / kill-switch UX (FS browse continues)
8. Instrumentation: prove generated search/facet reads = 0 on those flows

### If Product Simplification B1

1. Remove or disable free-text search entry points
2. Cap tag selection to single-tag Firestore path (no multi-tag AND)
3. Tag modal: names without exact ready counts **or** remove counts UI
4. Remove generated facet/search call sites
5. Copy/empty states updated
6. Prove generated search/facet reads = 0

---

## Stage 1b-B — Local verification

- localhost Portal against `fresh-prints-dev`
- Generated read tracing **zero** on former A1–A3 flows
- Regression: ordinary browse, category, single-tag, Discover, New This Week (`readyAt`), Home, favorites, details, share, Add to Request, mats
- No full-catalog client hydrate

---

## Stage 1b-C — Owner QA

Cover per retained features: search, typo (if A), tags, multi-tag (if A), facets (if A), categories, newest, Discover, Home, favorites, details, share, Add to Request, artwork mats, `readyAt`, archived/non-ready removal from search (if A), outage behavior.

---

## Stage 4 — Publisher retirement (SEPARATE human checkpoint)

Only after Stage 1b owner QA **PASS**. No live deletion under Stage 1b Implement authorization.

## Stage 5 — Generated asset cleanup

Dry-run + owner approval. Separate.

## Stage 6 — Production promotion

Separate owner checkpoint. PR #40 merge is not automatic authorization.

---

## Appendix A — Algolia branch (activates if D1 = A)

- Grow plan; separate dev/prod applications
- Record fields per decision analysis §3
- Sync events per analysis §3
- InstantSearch optional; thin adapter acceptable
- Cost expect ~$0–$10/mo at current scale **only if** request counting matches analysis assumptions (catalog searches, not unbounded per-keystroke). Prefer debounced / submit-driven queries; if InstantSearch fires per keystroke, Algolia bills each as a search request — re-estimate before treating free-tier as durable.

## Appendix B — Typesense Cloud branch (activates if D1 = B)

- Cloud only (no self-host)
- Prod: prefer HA 3-node; **exact monthly quote requires live** [Typesense Cloud calculator](https://cloud.typesense.org/pricing/calculator) (**[NEEDS OWNER CURRENT PRICING VERIFICATION]**). Do not treat any single static $/mo figure as official. Published comparison examples use larger configs (e.g. ~$51–$168+/mo compute for 2 GB class workloads on typesense.org); small-catalog HA cost is capacity/region dependent and may sit above or below analysis’s illustrative ~$22–$86 band.
- Same sync/security model as Algolia
- Scoped search-only keys

## Appendix C — Product Simplification B1 (activates if D1 = C)

- Exact UX cuts per analysis §5 B1
- No provider account
- Snapshot retirement completeness same as A/B after Stage 4/5
- Co-equal with Algolia on the decision-analysis weighted matrix (390 vs 390) when free-text / multi-tag / exact facets are **CAN REMOVE** — not a dismissed fallback.

---

## Test Strategy

| Layer | Focus |
|-------|-------|
| Unit | Adapter query building; sync upsert/delete mapping; simplify gating |
| Integration | Dev index backfill; Portal search/facets or simplify paths |
| Manual | Stage 1b-C checklist |
| Cost/trace | Generated asset fetch count = 0 on cutover flows |

## Human Checkpoints

- [ ] **Owner D1** (blocks Implement)
- [ ] Secret Manager / provider account phrases (A/B only)
- [ ] Stage 1b-C owner QA
- [ ] Stage 4 / 5 / 6 separately

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Sync drift | Reconcile job; FS authority |
| Private fields in index | Allowlist review |
| Search outage | FS browse continues |
| Premature publisher delete | Stage 4 gate |
| Buying search for unused features | D1 + requirements table; matrix ties Algolia and B1 |
| Algolia keystroke request inflation | Debounce / search-on-submit; cost re-estimate if InstantSearch |

Rollback: keep publishers until Stage 4; feature-flag Portal path back to generated **only** during Stage 1b transition if needed (not permanent). **After Stage 4 publisher retirement, rollback to generated assets is not realistic** without rebuilding/republishing — rollback then means kill-switch to Firestore browse (+ simplify UX) or restore prior provider index from reconcile, not “flip snapshots back on.”

## Open Questions

- [ ] Owner D1
- [ ] Feature MUST KEEP classifications (analysis §2)
- [ ] Card hydrate: FS by-id vs indexed thumbs
- [ ] Typesense HA budget if B

## Approval

- Formal Review: `docs/workflow/reviews/2026-08-07-stage-1b-search-replacement-plan-review.md`
- Implement: **not authorized** until D1 + review approval + phase open
