# Review: Phase 9 Etsy+Assisted remap + Discover catalog remediation

| Field | Value |
|-------|-------|
| Date | 2026-08-13 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-13-phase-9-etsy-assisted-discover-remediation-plan.md` |
| Remount STOP | `docs/workflow/reviews/2026-08-13-phase-9-remount-gate-stop-checkpoint.md` |
| Authoritative SHA | `975f6400262a86600c4662f39480c6f55e20b0c1` |
| Verdict | **approved_with_changes** |

---

## Summary

The revised Plan correctly abandons obsolete Custom Request monolith assumptions and remaps Workstream A onto production Etsy Recommendations + Assisted Creation. Etsy completion can reuse existing `completeEtsyRecommendationRequest` / `cancelEtsyRecommendationRequest` without new statuses. Workstream B Discover diagnoses and bounded hydration remain sound. Implementation may proceed after owner APPROVE under the binding changes below.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Split A/B; hard retire list |
| Architecture alignment | pass | No unified fake lifecycle |
| Security impact addressed | pass | Existing ownership on complete/cancel |
| Data model impact addressed | pass | No new Etsy statuses; no human_creation |
| Backend impact addressed | pass | Prefer Portal-only for A |
| Test strategy adequate | pass | Catalog + Etsy wiring |
| Human checkpoints identified | pass | |
| Roadmap alignment | pass | AI deferred |
| Documentation plan | pass | Light as needed |
| No silent scope expansion | pass | Past Etsy searches deferred |

---

## Strengths

- Uses remount-gate evidence as authoritative
- Maps every major Jul 14 requirement to Etsy / Assisted / preserve / retire / defer
- Discovers that Etsy complete/cancel **already exist** server-side — remediation is primarily Portal UX wiring + results IA
- Retires AI broaden / `human_creation` / not_found recompute cleanly
- Discover cost bound and Load more rule preserved
- Does not require new indexes a priori (verify against existing `firestore.indexes.json`)

---

## Required changes (binding for implement)

1. **Etsy Mark as satisfied** must call existing `completeEtsyRecommendationRequest` → `completed` only from `active`. Do not invent a new status.
2. **Etsy Cancel** must remain a separate path via `cancelEtsyRecommendationRequest` → `cancelled`, visually quieter than satisfied.
3. **Do not add Mark as satisfied to Assisted Creation** — preserve approve + cancel + proof workflow.
4. **Do not rebuild Assisted Past Requests drawer.**
5. **Preserve** `/requests/artwork` purchase bridge, price constants, Assisted naming, reference uploads, auth boundaries.
6. **Discover Goal A:** hydrate after selection; never fix solely by raising `HOME_DISCOVERY_POOL_PAGE_SIZE`.
7. **Discover Goal B:** explicit eligibility fields on list+count (and membership repair), not sortField-only inference; no presentation-only hasMore.
8. **Functions:** do not change callables unless a proven gap appears; if changed, stop for DEV deploy human checkpoint before remote deploy.
9. **Indexes:** do not deploy new indexes unless a concrete query failure proves need; verify first against current `firestore.indexes.json`.
10. **No** development merge, remount, Algolia-for-Home, Studio draft mutation, production deploy.

---

## Formal findings (record)

### Etsy lifecycle
`active` → `completed` | `cancelled` (server-enforced from active only).

### Proposed completion
Customer **Mark as satisfied** → `completed`. Cancel remains distinct.

### Owner decision (complete vs cancel)
**Not required for semantics** — already distinct in Functions. Optional non-blocking CTA copy preference only.

### Assisted
Satisfied-by-approval; cancel preserved; no redundant satisfied close.

### Preserve-only
Purchase→artwork; no Etsy upload pipeline; Assisted drawer; Assisted naming; Etsy price constants; reference uploads; proof workflow; Assisted one-open; auth.

### Obsolete / retired
Monolith closeCustomRequest; etsy_referred/reviewing/human_creation; not_found recompute; unified transitionHistory; Mark as satisfied on Assisted.

### Deferred
AI recommendation / Gemini / credits / payments; Etsy Past searches drawer (unless owner later requests).

### Discover
Rail hydrate ≤3 queries / ≤78 docs; Recent + Most Liked eligibility alignment; Popular + NTW preserve.

### Deployment
| Item | Required? |
|------|-----------|
| Portal | Yes |
| Functions | No expected |
| Rules | No expected |
| Indexes | No assumed |
| Algolia | No |

---

## Architecture / Security

No layer violations planned. Complete/cancel remain server-owned with customerUid checks. Do not broaden Rules.

---

## Blockers

None for owner approval. Remount STOP is resolved by this remapped Plan.

---

## Owner decision needed

Reply with one of:

- `APPROVE` — proceed to Implement on `fix/phase9-results-and-discover-remediation`
- `APPROVE WITH NOTES: …`
- `REVISE PLAN: …`

Optional notes (non-blocking):

- Prefer CTA label other than “Mark as satisfied”
- Request Etsy Past searches drawer in-scope (otherwise remains deferred)

**Do not implement until owner approval.**
