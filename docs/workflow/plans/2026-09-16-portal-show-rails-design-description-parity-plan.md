# Plan: Portal Show Rails Design Description Parity

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Author | Codex / Owner-requested hotfix |
| Status | complete — Owner DEV QA passed; production promoted and machine-verified |
| Workflow | managed-phase / hotfix |
| Related | `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-review.md` |

---

## Goal

Restore the persisted catalog description in Design Details when a customer opens a ready design
from the Portal homepage's `Next Show` or `Added to Shows This Week` rail. The fix will reuse the
existing customer-safe ready-design-by-ID hydration path, preserving the compact public show-card
payload and the exact existing Design Details text/censoring behavior.

## Background

The two homepage show rails call `portalShowDesignsService.listShowCatalogDesigns`, map each
`PortalShowCatalogDesignCard` through `mapPortalShowCatalogDesignCardToCatalogDesign`, and pass the
result through `CatalogSelectionCard` into the shared `CatalogDesignDetailsModal`. The mapper omits
`description` because the show-card DTO is intentionally compact. Ordinary catalog cards are mapped
by `catalogService.mapCatalogDesign`, which includes `description`, and cold/deep-linked details use
`catalogService.getReadyDesignsByIds`, which also uses that mapper.

Investigation findings:

1. `Next Show` and `Added to Shows This Week` use the same `CatalogSelectionCard` and the same
   `CatalogDesignDetailsModal` as ordinary catalog cards; only their source object differs.
2. Both affected rails pass the compact mapped object with `id`, title, image paths, dimensions,
   category, counts, background, Halftone, and Explicit Content fields, but no `description`.
3. A working ordinary catalog/deep-link path passes the full `CatalogDesign` produced by
   `catalogService.mapCatalogDesign`, including the persisted `description`.
4. The description is omitted at the public show-card DTO/Function projection and again absent from
   the Portal show-card mapper; it is not overwritten by the modal. The modal already renders
   `design.description` through the canonical `usePortalCensoredDesignText` helper.
5. The two affected homepage rails share `portalShowDiscoveryContent.hydrateShowDesigns` and the
   same compact mapper. The full Show Designs view is not affected: `loadCatalogShowDesigns`
   hydrates its IDs through `catalogService.getReadyDesignsByIds` before rendering cards.
6. Repository search found no additional consumer of the compact show-card mapper; no other Portal
   rail is proven to use this incomplete object path.
7. Design Details accepts a full `CatalogDesign`; it does not perform its own hydration. The
   established route hook hydrates by ID for deep links, and that same bounded service is the safe
   seam for this click path.

## Scope

### In Scope

- Homepage `Next Show` and `Added to Shows This Week` Design Details opening.
- A Portal-only click-time hydration seam that resolves the selected show-rail design by ID through
  `catalogService.getReadyDesignsByIds`.
- Race-safe successive design selection so a late Design A response cannot replace Design B.
- Focused regression tests for both rails, normal catalog parity, empty descriptions, missing/stale
  hydration, modal actions, and rail ordering/membership preservation.
- Portal typecheck, canonical lint for changed source, production Portal build, and diff check.

### Out of Scope

- Changing `PortalShowCatalogDesignCard` or expanding the public show-card callable payload.
- Any Function, Firestore Rules, Storage Rules, index, IAM, Firebase configuration, schema,
  migration, backfill, or Firestore data change.
- Rewriting or regenerating catalog descriptions.
- A new modal, duplicate modal logic, full-catalog fetch, rail ordering/membership changes, show
  membership behavior, Add to Request behavior, Studio changes, or unrelated Discover redesign.

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`
- `apps/portal/features/show-designs/utils/showDesignDetailsHydration.ts` (new pure async seam)
- `apps/portal/features/show-designs/utils/showDesignDetailsHydration.test.ts`
- `apps/portal/features/catalog/pages/CatalogHomePageContent.showRails.test.ts`
- `docs/workflow/plans/2026-09-16-portal-show-rails-design-description-parity-plan.md`
- `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-review.md`
- `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-test-report.md`
- `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-signoff.md`
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md` and required recent-work handoff entry at
  signoff

### Architecture Impact

- [x] Details: Portal page coordinates a bounded service-layer read on opening a compact show-card;
  Firebase access remains in `catalogService`, and the shared existing Design Details modal remains
  the sole presentation component.

### Security Impact

- [x] Details: Uses the existing public ready-design `getDoc` path, which maps only `status: ready`
  records. No private upload, Staff Artwork, original, or internal metadata is requested or exposed.
  The public compact DTO remains unchanged.

### Data Model Impact

- [x] None — persisted `Design.description` is read only; no field or document changes.

### Backend Impact

- [x] None — no Function or callable change. The existing `listPortalShowCatalogDesigns` compact
  projection remains unchanged; the client uses the existing ready-design Firestore read service.

### UI / UX Impact

- [x] Details: A show-rail card opens the existing modal with the authoritative full design object.
  The existing title, image, category, metadata, Explicit Content/censoring, favorite, share,
  report, and Add to Request controls remain wired. During a bounded read, stale responses are
  ignored.

### Migration Impact

- [x] None
- [x] Rollback / compatibility: Revert the Portal client commit. The compact show-card contract and
  existing catalog documents remain backward compatible.

---

## Approach

1. Add a small Portal show-design hydration helper that accepts a compact rail design, the set of
   IDs currently present in the two homepage show rails, and the existing `getReadyDesignsByIds`
   loader. It hydrates only compact show-rail designs whose description is absent, preserves an
   explicitly empty description, and returns no invented fallback.
2. In `CatalogHomePageContent`, wrap the existing deep-link `openDesignDetails` callback so a
   compact show-rail selection is hydrated by ID before the existing URL/modal open occurs. Use a
   request token and invalidate it on close to prevent stale A→B responses from replacing the
   current selection.
3. Keep the public show-card DTO, callable, rail ordering, deduplication, membership, and existing
   modal action props unchanged.
4. Add focused tests that exercise the mapper-to-hydration seam and source contracts for both rails,
   normal catalog parity, empty/missing descriptions, successive selections, action wiring, and
   unchanged public fields/order.

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | canonical changed-source comparator plus `npx eslint` on changed Portal source/tests | yes |
| Unit tests | `npx tsx --test` focused show mapper/hydration, show rail, modal, and catalog parity contracts | yes |
| Build | `npm run build --workspace @fresh-prints/portal` | yes |
| Integration | None — no backend contract changes | no |
| E2E | None configured; Owner DEV QA covers the live UI checkpoint | no |
| Backend/rules | None — no backend/rules scope | no |

### Manual

- [x] Details: Owner DEV QA used a known non-empty-description design to open Next Show, the
  same design from Added to Shows This Week, the same design elsewhere, and switch among two or
  three rail designs to confirm no stale title/description/image.

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Design approval
- [ ] Business logic decision
- [x] Production deploy — completed only after explicit Owner DEV QA PASS, per the owner request
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [x] Other: Owner pre-authorized and production completed the Portal-only protected promotion and
  App Hosting rollout after Owner DEV QA PASS.

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| A compact show-card opens before its authoritative document hydrates | Medium | Hydrate by ID at the existing detail-opening seam and do not open until the bounded read resolves. |
| A late response for Design A overwrites Design B | High | Token each open and invalidate on close; only the current request may open details. |
| Public payload accidentally exposes private metadata | High | Do not change the callable/DTO; hydrate through the existing ready-only `mapCatalogDesign` allowlist. |
| Empty or missing description receives invented copy | Medium | Preserve `undefined`/empty semantics and retain the existing modal `trim() || '—'` display contract. |
| A show design is no longer ready between rail load and click | Low | Fail closed by not opening a stale compact object when by-ID hydration returns no ready design. |

## Rollback Plan

If focused tests, Portal build, or Owner DEV QA fail, do not deploy. Revert the Portal client changes
and retain the existing compact public show-card contract. After a production rollout, revert through
the normal development → production PR path or roll back only the Portal App Hosting revision; do
not touch healthy Functions, Rules, indexes, Storage Rules, IAM, or Studio release state.

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md
- [x] Other: ROADMAP, workflow state, and current handoff at signoff; no durable architecture/data
  doc changes because no contract or model changes.

## Open Questions

- [x] None — the repository proves the compact DTO omission and supplies an established ready-design
  by-ID hydration path.

## Approval

- Review doc: `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-review.md`
- Verdict: approved
