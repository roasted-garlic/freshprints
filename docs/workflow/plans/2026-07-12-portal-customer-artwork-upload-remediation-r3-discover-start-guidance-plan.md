# Plan: Portal Discover hint + Start-request Upload/Browse guidance (remediation r3)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | portal-customer-artwork-upload; remediation r1/r2 |

---

## Goal

Improve Discover (and Library) workflow education so the request-composition hint is full-width and visually clear, and guide customers after confirming **Start request** with a same-modal choice: **Start & upload designs** vs **Start & browse designs**.

## Background

Owner feedback on Discover after remediation r2:

1. The gray narrow hint under the toolbar looks unfinished — needs full width and stronger styling.
2. Customers need hand-holding when starting a print request: upload path vs browse/library path, as a **follow-up step inside the existing start-request modal** (not a second modal).

Parent feature G remains unsigned until prior manual E2E passes; this r3 is additional UX remediation within the same goal.

## Scope

### In Scope

- Restyle `portal-catalog-request-workflow-hint` to full-width callout (Discover + Design Library browse, non-selection).
- Replace single-step start confirm with a **two-step same modal**:
  1. Confirm start a new print request
  2. Choose path: Upload designs | Browse designs
- Create request only after path choice (cancel on step 2 does not create).
- Navigate:
  - **Browse** → existing catalog selection mode (`buildCatalogSelectionHref`)
  - **Upload** → request detail with upload panel open (`/requests/{id}?upload=1`)
- Open upload panel on detail when `upload=1` query is present; strip param after open.
- Update confirm copy so it no longer implies browse-only.

### Out of Scope

- Changing one-working-request rules
- Changing continue-request / multi-working navigation (Continue still goes to selection or working tab)
- Production deploy
- Wipe track
- Studio changes
- New backend/functions

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/styles/catalog.css` — hint callout
- `apps/portal/styles/shell.css` — start-request modal path-step styles (reuse choice-footer patterns)
- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx` — hint markup
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx` — hint markup
- `apps/portal/features/print-requests/hooks/usePrintRequestCreationFlow.ts` — step state + path navigation
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` — render new/extended modal
- `apps/portal/features/shared/components/PortalStartPrintRequestModal.tsx` — **new** two-step modal
- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` — honor `?upload=1`
- `apps/portal/features/print-requests/utils/catalogSelectionNavigation.ts` — optional `buildRequestUploadHref` helper

### Architecture Impact

- [x] Details: Portal UI + creation-flow hook only; services unchanged. Modal remains in shared components; business create still via existing service.

### Security Impact

- [x] None — no auth/rules/API changes; navigation stays within authenticated portal routes.

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Discover/Library hint callout; Start request modal gains path step; Upload landing opens detail upload panel.

### Migration Impact

- [x] None

---

## Approach

1. **Hint callout** — Remove `max-width` / muted-only treatment; use full-width aside with subtle background, border, readable primary text, optional short title (“How print requests work”).
2. **`PortalStartPrintRequestModal`** — Steps `confirm` → `choosePath`. Footer on confirm: Cancel / Start request. Path step: two primary stacked actions (Upload / Browse) + Back or Cancel; reuse column footer pattern from legacy working-request choice styles.
3. **`usePrintRequestCreationFlow`** — Track `modalStep`; on confirm advance to path; on path choice call create then `router.replace` to browse or upload href; reset step on close.
4. **Detail** — `useSearchParams`: if `upload=1` and editable, set `isUploadPanelOpen` true and `router.replace` without query.
5. Keep `PortalConfirmModal` for other flows (add-to-request, remove item, etc.).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit` (portal / workspace as documented) | yes |
| Lint | project lint if configured for touched files | yes if available |
| Unit tests | none new unless hook unit suite exists | no |
| Build | portal build optional for this UI-only change | no |
| Integration | n/a | no |
| E2E | n/a automated | no |
| Backend/rules | n/a | no |

### Manual

- [x] Details: Discover hint looks full-width and readable; Start request → path step → Upload opens detail with upload panel; Browse opens library selection; Cancel on path does not create a request; one-working-request continue behavior unchanged.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Design approval
- [ ] Business logic decision — product direction already given (same modal, Upload vs Browse)
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Create then cancel leaves orphan draft | Medium | Create only after path choice |
| Upload deep-link ignored if not editable | Low | Only open panel when `isEditable`; still land on detail |
| Continue path skips guidance | Low | Out of scope for r3; document as follow-up if needed |

---

## Rollback Plan

Revert portal UI/hook commits; no backend or data migration.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] Other: optional note in STYLE_GUIDE if callout pattern is new — skip unless pattern is reused widely
- Workflow: plan, review, test report, manual checkpoint

---

## Open Questions

- [x] None — owner specified same-modal follow-up Upload vs Browse

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-remediation-r3-discover-start-guidance-review.md
- Verdict: approved
