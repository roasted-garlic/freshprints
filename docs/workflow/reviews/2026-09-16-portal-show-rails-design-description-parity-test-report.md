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
- Development commit `7be6fd49b8ce2ebaa068963b492db8e51b16c7c6` was pushed and promoted through
  protected PR #100. Production merge SHA is `15676fcd010f572af0d4a2bc969b108d2777be0a`.

## Production rollout and machine verification

- Portal App Hosting rollout `build-2026-09-17-001`: **SUCCEEDED**.
- App Hosting build `build-2026-09-17-001`: **READY**; Cloud Build: **SUCCESS**.
- Cloud Run revision `fresh-prints-portal-build-2026-09-17-001`: **100% traffic**.
- `origin/production` contains the candidate commit. The App Hosting source archive was created
  from that candidate tree; the later `development` tip adds documentation-only verification
  closeout changes.
- Hosted production root, `/catalog`, `/requests`, and `/robots.txt`: **HTTP 200** with no DEV
  marker or development-project string.
- Production Functions: **179/179 ACTIVE**. Firestore indexes: **94/94 READY**.
- `settings/portalMaintenance.enabled`: **false**.
- No Functions, Rules, Storage Rules, indexes, IAM, Firebase configuration, data migration,
  backfill, Studio, or other backend deployment was performed.

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

Automated validation and Owner DEV QA are complete. The candidate was committed and pushed,
promoted through protected PR #100, rolled out as Portal App Hosting build
`build-2026-09-17-001`, and machine-verified successfully.
