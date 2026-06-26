# Plan: Phase 3D — Print Size & DPI Completion and Signoff

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/phase-3d-print-size-completion-review.md |

---

## Goal

Verify Phase 3D print size and DPI normalization is complete against the approved design, close any small gaps within scope, update documentation if needed, and produce signoff — without starting Phase 4 or deferred optional work.

## Background

- Parent spec: `docs/workflow/plans/print-size-dpi-normalization-plan.md`
- Phases 3A–3C signed off; repository stabilization complete on `master`
- `PROJECT_HEALTH.md` lists **P0: Phase 3D print size & DPI normalization** as active roadmap work
- Code inspection shows Steps 2–4, 6–7 largely implemented (`shared/utils/printSizeMath`, `pngValidator`, `DesignPrintSettingsFields`, `DesignDetailsModal`, import orchestration)

## Scope

### In Scope
- Gap audit vs `print-size-dpi-normalization-plan.md` completion criteria (§14)
- Fix only **blocking** gaps found during audit (within Phase 3D print-size scope)
- Documentation sync: `docs/architecture/DATA_MODEL.md`, `docs/WORKFLOWS.md`, `docs/architecture/FIREBASE.md` if gaps found
- Automated validation: `npm run lint`, `npx tsc --noEmit`
- Manual test checklist for import + Edit Design + Design Details print size flows
- `docs/workflow/reviews/phase-3d-print-size-signoff.md`
- Update `docs/project/ROADMAP.md` Phase 3D status on signoff

### Out of Scope
- Import staff-confirm modal for misleading metadata (deferred per parent plan §3D-5)
- Optional backfill tool (§3D-8)
- Phase 4+ features, AI review automation, queue, customer catalog
- Firebase rules / Storage deploy changes
- `testing-and-ci-bootstrap` (separate phase)
- PNG rewrite, production RIP integration

---

## Affected Areas

### Files / Modules (expected)
- `shared/utils/printSizeMath.ts`, `importPrintSizeMetadata.ts`, constants
- `electron/ipc/import/pngValidator.ts`
- `src/renderer/src/features/imports/` (display, orchestration)
- `src/renderer/src/features/designs/components/DesignPrintSettingsFields.tsx`
- `src/renderer/src/features/designs/components/DesignDetailsModal.tsx`
- `src/renderer/src/features/designs/services/designService.ts`
- Docs under `docs/architecture/`, `docs/WORKFLOWS.md`, `docs/project/ROADMAP.md`

### Architecture Impact
- [x] None expected — verification and signoff only

### Security Impact
- [x] None — service-layer DPI authority already documented; verify no regression

### Data Model Impact
- [x] None — fields already in `DATA_MODEL.md`; verify persistence paths only

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Manual verification of import assessment display, Edit Design print fields, Design Details readout

### Migration Impact
- [x] None — no Firestore migration; legacy designs use documented fallback

---

## Approach

1. **Audit** — Walk parent plan §14 test matrix; mark pass/fail/deferred per item
2. **Code review** — Confirm `restoreDesign` uses `resolveRestoreStatus` (TD-004 closed)
3. **Automated checks** — `npm run lint`, `npx tsc --noEmit`
4. **Gap fixes** — Only if audit finds blocking defect in Phase 3D scope
5. **Docs** — Patch only if audit finds doc/code mismatch
6. **Signoff** — Record results, deferred items, recommended next phase (Phase 4 or testing bootstrap)

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Typecheck | `npx tsc --noEmit` | yes |
| Unit tests | manual `node --test` on `*.test.ts` if runnable | optional (no npm script) |
| Build | skip unless gap requires packaging | no |

### Manual
- Single PNG import: assessment display, reject below 3.5″, warn tiers
- Edit Design: print inches editable, effective DPI derived, save persists
- Design Details: print size, effective DPI, source label
- Regression: derivatives + library thumbnails still work

---

## Human Checkpoints Anticipated
- [x] Manual UI verification of print size flows (signoff gate)
- [ ] Production Storage rules deploy (C1 — separate from this phase)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Staff-confirm deferred leaves misleading-metadata edge case | Low | Document in signoff; track on roadmap |
| No `npm test` script | Medium | Run targeted `node --test` on print-size tests if feasible |
| Legacy designs without print fields | Low | Verify fallback display in Design Details |

---

## Rollback Plan

Revert signoff commit only; no schema changes in this phase.

---

## Documentation Updates Required
- [ ] `docs/project/ROADMAP.md` — Phase 3D status
- [ ] `docs/architecture/FIREBASE.md` — only if field docs gap found
- [ ] Parent plan path references (optional cleanup)

---

## Open Questions
- [x] None blocking — staff-confirm explicitly deferred

---

## Approval
- Review doc: docs/workflow/reviews/phase-3d-print-size-completion-review.md
- Verdict: pending
