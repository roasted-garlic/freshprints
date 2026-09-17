# Test Report: Portal Show Rails Design Description Parity

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Tester | Codex / Test phase |
| Plan | `docs/workflow/plans/2026-09-16-portal-show-rails-design-description-parity-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-review.md` |
| Overall | **passed_with_notes** — automated gates pass; Owner DEV QA required |

## Summary

The compact homepage show-card contract remains unchanged. Both `Next Show` and `Added to Shows
This Week` now resolve the selected ready design through the existing Portal by-ID catalog hydration
path before opening the shared Design Details modal. The helper preserves explicit empty descriptions,
fails closed when a design is no longer ready, and ignores stale A→B responses.

## Automated results

| Check | Command / scope | Result |
|-------|-----------------|--------|
| New hydration and show-rail contracts | `npx tsx --test` helper, mapper, and `CatalogHomePageContent.showRails.test.ts` | **17/17 PASS** |
| Adjacent Portal contracts | Discovery loaders, modal request quantity wiring, and lightbox navigation | **24/24 PASS** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **PASS** |
| Changed-source lint | ESLint with `--report-unused-disable-directives --max-warnings 0` over changed Portal source/tests | **PASS** |
| Portal production build | `npm run build --workspace @fresh-prints/portal` | **PASS** — compiled, type-checked, generated 22/22 static pages, and finalized optimization |
| Diff hygiene | `git diff --check` | **PASS** |

## Known unrelated baseline results

The separately run historical `portalPrelaunchCensorUx` suite remains **52/54**, with the same two
pre-existing assertion failures in the lightbox `useState` guard and mobile filter CSS shape. No
files in that suite were changed by this goal. The previously documented Print Request sweep remains
**PASS WITH 4 ACCEPTED PRE-EXISTING FAILURES**; those four failures are outside this Portal goal and
were not reclassified or changed.

## Scope verification

- Portal client files and workflow evidence only.
- No Functions, Rules, Storage Rules, indexes, IAM, Firebase configuration, schema, migration,
  backfill, description generation, or public show-card DTO change.
- No commit, push, production promotion, Portal App Hosting rollout, or other deployment performed.

## Owner DEV QA checklist

1. Open a known ready design with a non-empty description from `Next Show`; confirm the existing
   Design Details modal shows the persisted description.
2. Open the same design from `Added to Shows This Week`; confirm description, title, image, and
   metadata match.
3. Open the same design from the ordinary catalog/discover surface; confirm ordinary catalog parity.
4. Click two or three different show-rail designs in succession; confirm no stale title,
   description, image, or metadata appears and the modal actions remain usable.
5. Confirm rail ordering and membership are unchanged.

## Gate disposition

Automated validation is complete. Stop here for explicit **Owner DEV QA: PASS** before Signoff,
commit/push, protected production promotion, or Portal App Hosting rollout.
