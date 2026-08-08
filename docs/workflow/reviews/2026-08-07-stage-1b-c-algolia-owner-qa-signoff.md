# Signoff: Stage 1b-C Algolia catalog search owner QA (dev)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Signoff by | Signoff Agent |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Stage | Stage 1b-C (owner QA + correctives) |
| Checklist | `docs/workflow/reviews/2026-08-07-stage-1b-algolia-owner-qa-checklist.md` |
| Plan | `docs/workflow/plans/2026-08-07-stage-1b-search-replacement-plan.md` |
| Final status | **approved_with_notes** |

---

## Summary

Stage 1b Algolia search is **owner-validated on `fresh-prints-dev` / localhost Portal**. Sequential Stage 1b-C QA completed, including outage/kill-switch. Correctives during QA (narrowed facets, initial facet freshness, Discover View All) are signed off separately.

**Stage 4 (publisher retirement) is not authorized by this signoff.**

---

## Owner QA results (final)

### Search / tags / facets
All PASS (including narrowed + initial facet correctives).

### Sync
Approve / ready-edit / archive / restore — all PASS.

### Firestore regressions
| Item | Result |
|------|--------|
| Library / category / single-tag browse | PASS |
| Discover View All | PASS WITH NOTES (rail≠View All for Popular/category accepted) |
| Favorites / details / share / Add to Request | PASS WITH NOTES (TD-030 qty-control parity deferred) |
| Algolia outage / kill-switch | **PASS** |

### Generated-read proof
- Search + multi-tag generated reads = 0 — PASS (prior Network evidence)
- Global / narrowed facet Network “no `tags-facet.json` / generated facet assets” boxes: not re-captured as separate Network phrases; accepted as covered by `GLOBAL FACETS: PASS` + `NARROWED FACET COUNTS: PASS` under Algolia ON (optional future Network spot-check)

---

## Correctives closed in Stage 1b-C

| Corrective | Signoff |
|------------|---------|
| Narrowed facet counts | `…-narrowed-facet-counts-signoff.md` |
| Initial facet count freshness | `…-initial-facet-count-mismatch-signoff.md` |
| Discover View All (Popular blank + category order) | `…-discover-view-all-regressions-signoff.md` (**approved_with_notes**) |

---

## Deferred (not blocking Stage 1b-C)

| Item | ID / note |
|------|-----------|
| Details/share Add-to-Request → quantity control parity | TD-030 |
| Discover rail order ≠ View All (Popular/category) | Accepted architectural note |
| Publisher / generated-asset retirement | **Stage 4** — not started |
| Production / PR #40 merge | Not authorized |

---

## Human approvals

| Approval | Status |
|----------|--------|
| Stage 1b-C owner QA | obtained (PASS / PASS WITH NOTES) |
| Stage 4 start | **not obtained** — stop |
| Production / PR merge | not obtained |

---

## Verdict

**approved_with_notes** — Stage 1b-C complete on dev. Do **not** auto-start Stage 4, merge PR #40, or deploy production.

---

## Next (owner-gated)

1. Optionally restore `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true` if left `false` after outage QA.
2. Explicit owner phrase required before Stage 4 (publisher retirement), e.g. when ready.
3. TD-030 may be a separate managed phase when prioritized.
