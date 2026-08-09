# Formal Review: PR #40 — Remaining production gates plan

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent (independent; post-reconciliation) |
| Plan | `docs/workflow/plans/2026-08-08-pr-40-remaining-production-gates-plan.md` |
| Reconciliation | `docs/workflow/reviews/2026-08-08-pr-40-remaining-production-gates-reconciliation.md` |
| Historical plan | `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md` (do not overwrite) |
| Verdict | **approved_with_changes** |

---

## Summary

Read-only reconciliation correctly retires completed PR #40 gates (merge, App Hosting cutover, readyAt indexes/backfill, Home/Discover, TD-031) and replaces stale checkpoint continuation with a live-grounded remaining matrix. Verdict is **approved_with_changes**: enforce Wave A split, keep Algolia OFF until explicit enable, treat ordinary Portal launch as already unblocked, and do not authorize any mutation from this review.

**STOP before Implement / any production mutation.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Inventory + plan + review only |
| Architecture alignment | pass | Firestore authority; Algolia search-only; Stage 4 live |
| Security impact addressed | pass | No secret values; Storage public generated reads called out; `_dev` footgun called out |
| Data model impact addressed | pass | Materialization absent; cleanup deferred |
| Backend impact addressed | pass | Exact CREATE/UPDATE/DELETE; no broad deploy |
| Test strategy adequate | pass | Rules suite required before Rules deploy |
| Human checkpoints identified | pass | One-at-a-time phrases |
| Roadmap alignment | pass | Parent Algolia/Rules/cleanup remain gated |
| Documentation plan | pass | New artifacts; historical plan retained |
| No silent scope expansion | pass | No reopen TD-031/R-018 |

---

## Challenges (required scrutiny)

| Challenge | Finding | Disposition |
|-----------|---------|-------------|
| Stale gate carry-forward | Original Checkpoints 0–2b / index deploy / merge are complete | **Pass** — removed from active matrix |
| Unsafe ordering | Storage Rules deny after Stage 4 live is OK; Algolia Functions before config is **not** | **Pass** with change: Wave A-Algolia hard-gated on RC-R3 |
| Over-broad Functions deploy | Plan forbids broad deploy; allowlists scoped | **Pass** |
| Algolia `_dev` contamination | Source default `portal_catalog_ready_dev` | **Pass** — must override params before Wave A-Algolia |
| Secret exposure | Inventory used describe/list only | **Pass** |
| Rules-before-cutover risk | Cutover already live on `build-2026-08-08-004` | **Pass** — risk retired |
| Deleting publishers too early | Wave B after Stage 4; prefer after Storage deny | **Pass** |
| Deleting generated assets too early | Cleanup after publisher delete | **Pass** |
| Unnecessary index redeploy | 71/71; readyAt 4/4 READY | **Pass** — none remains |
| Unnecessary backfill | R-018 closed | **Pass** — do not reopen |
| Taxonomy bootstrap before compatible Functions | Plan sequences Functions before bootstrap | **Pass** |
| Unnecessary Studio rebuild | Required only for staff disk-cache benefit | **Pass** — deferred / not launch blocker |
| Conflating optional cleanup with launch blockers | Matrix marks Portal browse launch clear | **Pass** |

---

## Architecture Review

**Findings:**

- Portal tip already implements Stage 4 fail-closed managed search; ordinary browse must remain independent of Algolia and generated Storage.
- Taxonomy materialization remains derived; Firestore lists remain fallback — bootstrap is additive.

**Required changes:**

- [x] Split original Wave A into **Taxonomy** vs **Algolia** allowlists (plan + reconciliation already state this — **binding**).

---

## Security Review

**Findings:**

- Live Storage Rules still allow public read of generated portal-catalog and catalog-reference client/manifest paths — tip removes them. This is hardening, not a Portal functional dependency.
- Algolia admin secret must never be printed; Portal may only receive search-only public env at enable time.

**Required changes:**

- [x] Wave A-Algolia forbidden until `ALGOLIA_ADMIN_API_KEY` exists **and** `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` ≠ `portal_catalog_ready_dev`.

**Human approval needed before production:**

- [x] Every remaining gate (already phrase-gated)

---

## Data Model Review

**Findings:**

- `taxonomyMaterialization` absent — bootstrap still required for staff/AI benefit.
- `snapshotPublicationState` still has 2 deny-only docs; live Rules already deny access — removal of dedicated match is cleanup alignment, not a security hole today.

**Required changes:**

- [ ] None beyond plan sequencing

---

## Backend Review

**Findings:**

- Publisher inventory still **5/6** live — delete list of five is correct; skip already-absent publication-state writer.
- `rebuildTaxonomyMaterialization` must stay off deploy allowlists.

**Required changes:**

- [x] Do not recommend `firebase deploy --only functions`.

---

## Required changes (binding before any Implement)

1. Treat reconciliation matrix as authoritative over old PR #40 checkpoint numbers.
2. Keep Algolia **OFF** until `APPROVE PROD ALGOLIA ENABLE`.
3. Do not deploy indexes.
4. Do not reopen TD-031 or R-018.
5. Next owner action is **only** Algolia app decision / admin secret readiness replies — **no agent Firebase mutation** until a later explicit phrase.
6. Rules / taxonomy Functions may be requested later under **separate** phrases; do not bundle with Algolia config.

---

## Verdict

**approved_with_changes**

STOP. No implementation. No deployment. No Algolia change. No secrets change. No bootstrap. No backfill. No Studio release.
