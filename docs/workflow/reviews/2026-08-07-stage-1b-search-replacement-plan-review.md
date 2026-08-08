# Review: Stage 1b — Search Replacement / Snapshot Retirement Path

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Independent Formal Review (adversarial) — non-author |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-search-replacement-plan.md` |
| Decision analysis | `docs/workflow/reviews/2026-08-07-stage-1b-d1-search-architecture-decision-analysis.md` |
| Verdict | **APPROVED_WITH_CHANGES** |
| Implement | **Still BLOCKED** on owner D1 (unchanged; this review does not select D1) |
| Pass type | Docs / Formal Review only — **no Implement** |

**Binding priors:** Amendment 8 Phase 1B revalidation plan + review (2026-08-06). Amendment 9 closed — not reopened.

**Inventory spot-check (HEAD):** `useCatalogDesigns.requiresGeneratedSearchPath` = non-empty `q` **or** `selectedTags.length > 1` (inverse of `allowsBoundedCatalogFirestoreFallback`). Generated path calls `portalCatalogAssetService.listMatchingDesigns` (token ∩ multi-tag AND ∩ category, offset page). Facets: `listTagFacets` / `listNarrowedTagFacets` as claimed. Note: `catalogNeedsFullClientHydrate` name is legacy; search/multi-tag uses generated pagination, **not** Firestore full-catalog hydrate.

**Pricing revalidation (2026-08-07):** Algolia Grow official rates match analysis (10K searches + 100K records free; then $0.50/1K searches, $0.40/1K records). Typesense Cloud remains capacity/hourly — **no static official $/mo** without live calculator; Plan’s prior fixed `~$86.40` example was over-specific (corrected in this pass).

**Non-owner Plan/analysis corrections applied in this review pass** (see Required Changes). Owner D1 **not** resolved.

---

## Summary

Architecture binding (Firestore SoR, ordinary browse on FS, index disposable, no Option C/D, publishers until Stage 4) is sound and inventory A1–A3 claims hold. The package correctly blocks Implement on owner D1 and honestly ties Algolia vs B1 on the weighted matrix. Adversarial pressure finds narrative bias toward buying search, D1 lettering collision with prior Option A/B/C, over-specific Typesense pricing, and understated Algolia keystroke billing — corrected as small factual/clarity edits. **Verdict: APPROVED_WITH_CHANGES.** `RECOMMENDED D1: ALGOLIA` stands only as a **conditional feature-preserving lean**, not an unconditional winner over Product Simplification.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Stage 1b-A/B/C; Stage 4/5/6 separate; hard-stops respected |
| Architecture alignment | pass | Hybrid or simplify; FS authority; no second SoR |
| Security impact addressed | pass | Search-only client key; admin Secret Manager; ready-only allowlist |
| Data model impact addressed | pass | No FS schema migration for B1; disposable index for A/B |
| Backend impact addressed | pass | Sync + reconcile only if A/B; no accounts/secrets before D1 |
| Test strategy adequate | pass | Unit/integration/manual + generated-read = 0 proof |
| Human checkpoints identified | pass | D1, secrets, 1b-C QA, Stage 4/5/6 |
| Roadmap alignment | pass | Continues Amendment 8 Stage 1b; Amendment 9 closed |
| Documentation plan | pass | Decision analysis + Plan appendices |
| No silent scope expansion | pass | Publisher delete / prod / PR merge out of scope |

---

## Adversarial challenge results

### 1. Buying search for features customers may not need?

**Sustained as risk; mitigated by D1 gate.** Free-text, multi-tag AND, and exact/narrowed facets are classified OWNER DECISION / CAN SIMPLIFY in analysis §2 — not proven MUST KEEP. Algolia at current scale is cheap (~$0–$10/mo **if** request assumptions hold) but still adds sync, secrets, dual env, drift, and outage UX. Package correctly refuses to Implement without D1; risk is **narrative**, not missing gate.

### 2. Product Simplification unfairly dismissed?

**Partially sustained — matrix fair, narrative soft-biased.** Weighted totals: Algolia **390**, Typesense **355**, B1 **390**. B1 wins complexity, maintenance, security simplicity, Firebase fit. Analysis Recommendation B already says owner classification is the fork; `RECOMMENDED D1: ALGOLIA` is a feature-preserving default, not a score win. **Correction applied:** analysis + Plan Appendix C now state the tie and that B1 is co-equal when features are CAN REMOVE.

### 3. AND / facet semantics supported?

**Pass.** Current A1 intersects tag ID lists + search terms (true AND). Algolia `facetFilters` / filter AND and Typesense filter AND + facets cover multi-tag and refined facets. Narrowed counts via faceting are provider-native; Plan allows deferral to explicit unavailable if needed.

### 4. Search credentials scoped?

**Pass with standard caveats.** Plan/analysis: Portal search-only key + index allowlist + referrer/domain where supported; admin/write in Secret Manager only. Index ≠ authorization. Implement must still restrict keys to the catalog index and never ship admin keys to Portal (already stated).

### 5. Private / non-ready leak?

**Pass with sync-lag residual.** Ready-only upsert + delete on leave-ready + public field allowlist + prefer FS by-id card hydrate are correct. Residual: brief stale hits until delete/reconcile — mitigated by reconcile job + mutations always validating Firestore. Do not index AI internals / drafts / private paths (stated).

### 6. Index becoming authoritative / second catalog DB?

**Pass if bindings held in Implement.** Explicit non-negotiable: disposable derived data; Add-to-Request / details = Firestore. Prefer minimal index + FS by-id hydrate resists “index as catalog.” Stage 4 must not delete publishers until search path proven independent.

### 7. Firestore still authority?

**Pass.** Ordinary browse / category / single-tag / Discover / Home / New This Week / known-ID stay Firestore. SoR unchanged under A, B, or C.

### 8. Hidden full-catalog hydrate?

**Pass (inventory verified).** Search/multi-tag uses generated `listMatchingDesigns` pagination, not `listAllReadyDesigns` / FS full hydrate. Option C (FS preserving current behavior) correctly rejected. `catalogNeedsFullClientHydrate` is a **misleading name** for the generated branch — behavior is not FS full hydrate; no Plan lie, but Implement must not “restore” client full hydrate as a shortcut.

### 9. Can snapshots truly retire?

**Pass with staging honesty.** After Stage 1b removes A1–A3 readers **and** Stage 4/5 retire publishers/assets, portal-catalog **search/facet/card-bucket publication class** can go to ~0 residual for that class. Does **not** remove Studio tag hydrate (~1.1K) or AI taxonomy loads. Unread published assets remain until Stage 4/5 — Plan correctly gates deletion.

### 10. Current official pricing?

**Algolia: pass (verified).** Grow matches analysis.  
**Typesense: pass with caveat.** Capacity model confirmed; exact HA SKU is calculator-only. **Correction applied:** removed Plan’s authoritative-sounding `~$86.40/mo` 0.5GB Oregon HA claim; aligned with analysis `[NEEDS OWNER CURRENT PRICING VERIFICATION]`.  
**Extra finding:** Algolia may count **per keystroke** — cost table honesty requires debounce/submit (correction applied).

### 11. Unnecessary infra complexity?

**Sustained as owner tradeoff, not Plan defect.** Managed search is medium complexity vs B1’s delete-and-done. Typesense adds cluster sizing mental model. At Fresh Prints scale, complexity—not dollar cost—is the real Algolia tax. Matrix captures this; D1 must weigh it.

### 12. Outage preserves browse?

**Pass as contract.** Binding: search down → FS browse continues; facets show unavailable. Ordinary `/catalog` without `q` / multi-tag must never require the provider. (Today’s generated path fails closed with an error on search failure — future A/B must improve to the stated outage UX, not regress ordinary browse.)

### 13. Rollback realistic?

**Pass during Stage 1b; constrained after Stage 4.** Keeping publishers until Stage 4 + transitional feature-flag to generated is realistic. **Correction applied:** after Stage 4, rollback ≠ “snapshots back on”; means kill-switch to FS browse / simplify or rebuild provider index.

---

## Architecture Review

**Findings:**
- Provider-neutral bindings match Amendment 8 Option A hybrid / Option B simplify; Option C/D remain correctly forbidden.
- Dual-run publishers through Stage 1b is the right retirement sequence.
- D1 lettering (Plan A/B/C) collided with prior Option A/B/C — **clarity hazard for owner selection** (crosswalk added).

**Required changes:**
- [x] Add Plan D1 ↔ prior Option ↔ analysis A1/A2/B1 crosswalk (applied)
- [x] Clarify Algolia lean ≠ matrix win over B1 (applied)

---

## Security Review

**Findings:**
- Search-only client key + Secret Manager admin + ready-only allowlist + FS mutation authority are adequate for this decision package.
- No production secrets, accounts, Rules, or deploys in this pass (hard-stop confirmed).

**Required changes:**
- [ ] None beyond already-stated Implement constraints

**Human approval needed before production:**
- [ ] Provider account / Secret Manager phrases (A/B only)
- [ ] Stage 6 production promotion (separate)
- [ ] Stage 4/5 publisher/asset deletion (separate)

---

## Data Model Review

**Findings:**
- No Firestore schema migration required for B1.
- Index schema disposable; not SoR.
- Taxonomy rename → targeted upsert/reconcile is correctly called out.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Sync on ready / leave-ready / metadata + periodic reconcile is the minimum reliable pattern.
- Prefer trigger/service sync over periodic-only (analysis) — Plan should keep that in Appendix A/B Implement (already referenced via analysis §3).
- Typesense self-host correctly rejected.

**Required changes:**
- [x] Soften Typesense static price claim; require calculator verification (applied)
- [x] Algolia keystroke / debounce cost note (applied)

---

## Testing Review

**Findings:**
- Generated-read = 0 proof is the right cutover gate.
- Stage 1b-C owner QA covers retained features and archived/non-ready removal.
- Outage UX and no full-catalog hydrate called out in 1b-B.

**Required changes:**
- [ ] None for decision package

---

## Documentation Review

**Findings:**
- Decision analysis + Plan are sufficient for owner D1.
- Corrections applied to Plan appendices / risks and analysis recommendation clarity / cost assumptions.

---

## Required Changes (approved_with_changes)

Applied in this review pass (non-owner-dependent):

1. **Plan:** D1 lettering crosswalk vs prior Option A/B/C and analysis A1/A2/B1.
2. **Plan Appendix B:** remove fixed `~$86.40` Typesense HA claim; require live calculator verification.
3. **Plan Appendix A + Risks:** Algolia keystroke request counting / debounce note.
4. **Plan Risks/Rollback:** post–Stage 4 rollback realism (no generated flip-back).
5. **Plan Appendix C + analysis §8:** B1 co-equal when features CAN REMOVE; Algolia lean is conditional.

**Not applied (owner-only — do not resolve here):**
- Owner D1 selection (A Algolia / B Typesense / C B1 simplify)
- MUST KEEP vs REMOVE for free-text, multi-tag, facet counts
- Grow vs Grow Plus; Typesense HA budget confirmation
- Card hydrate FS by-id vs indexed thumbs final pick

---

## Blockers

1. **Owner D1** — Implement remains blocked (pre-existing; not introduced by this review).
2. No architecture/security blocker that would force **BLOCKED** on the decision package itself.

---

## Verdict Rationale

**APPROVED_WITH_CHANGES** because:

- Scope, architecture bindings, security posture, retirement sequencing, and inventory claims survive adversarial scrutiny.
- Product Simplification is not dismissed by score; buying search without MUST KEEP features remains the primary product risk — correctly gated on D1.
- Clarity/pricing/cost-assumption defects were real but fixable without changing the decision fork; corrections applied in-review.
- `RECOMMENDED D1: ALGOLIA` **stands as conditional lean** (preserve free-text / multi-tag / facets → Algolia over Typesense; if those can be cut → B1 co-equal / preferred for maintenance). It is **not** owner approval and **not** an unconditional “Algolia wins.”

Not **BLOCKED**: no false inventory, no SoR violation, no hidden full hydrate as the proposed primary, no silent Implement authorization.

Not plain **APPROVED**: lettering collision + Typesense price overclaim + keystroke billing honesty required explicit Plan/analysis edits before treating the package as unambiguous for owner D1.

---

## RECOMMENDED D1: ALGOLIA — standing?

| Question | Answer |
|----------|--------|
| Stands as engineering lean if features MUST KEEP? | **Yes** — over Typesense at current scale |
| Stands as best overall regardless of product cuts? | **No** — tied with B1 at 390; B1 wins if features CAN REMOVE |
| Owner approval implied? | **No** — Implement still blocked |

---

## Next Step

1. Owner records explicit **D1** using Plan letters **A / B / C** (or named choice) plus MUST KEEP classifications for free-text / multi-tag / facets.
2. After D1 + phase open: Implement **only** the matching Plan appendix — still no Stage 4/5/6, no prod, no PR #40 merge from this authorization alone.
3. Do not reopen Amendment 9.
