# Plan: Phase 8 Portal Closeout

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-08-phase-8-portal-closeout-review.md` |

---

## Goal

Mark **Phase 8 — Fresh Prints Portal** as **MVP complete in dev** in durable project documentation, consolidating signoffs from Portal foundation slices and customer show-selection. No application code changes.

**Exit criteria:** `ROADMAP.md`, `ARCHITECTURE.md`, `TESTING.md`, `DEPLOYMENT.md`, and handoff package reflect Portal MVP shipped in dev; workflow signoff recorded.

---

## Background

- Phase 8 slices 0–4 delivered: monorepo scaffold, customer auth, catalog, print requests, progress tabs, customer show selection.
- `portal-customer-show-selection` signed off **approved** 2026-07-08.
- User confirmed manual QA PASS across Portal flows.
- Production App Hosting deploy remains a **separate** human checkpoint — not required for this docs closeout.

---

## Scope

### In Scope

- Update `docs/project/ROADMAP.md` — Phase 8 status **Complete (MVP — dev)**; exit criteria met; signoff references; next = Phase 9 or production deploy.
- Update `docs/architecture/ARCHITECTURE.md` — Portal routes/summary; note Phase 8 MVP complete.
- Update `docs/standards/TESTING.md` — Portal typecheck/build commands; full test sweep paths (`packages/shared`, `src/`, `electron/`, `apps/portal`).
- Update `docs/standards/DEPLOYMENT.md` — Portal `dev:portal`, `build:portal`, App Hosting `rootDir`, Portal callables deploy notes.
- Update `project-chatgpt-handoff/08-tech-stack-repo-map.md` — `packages/shared`, `apps/portal` (fix stale `shared/` at root).
- Create closeout test report + signoff in `docs/workflow/reviews/`.
- Update `.cursor/workflow/state.md`.

### Out of Scope

- Application code changes.
- Production Portal deploy.
- `apps/studio` monorepo normalization (separate planned phase).
- Phase 9 implementation.

---

## Affected Areas

### Architecture Impact
- [x] None (documentation only)

### Security / Data / Backend / UI Impact
- [x] None

---

## Approach

1. Align `ROADMAP.md` Phase 8 section with signed-off deliverables and exit criteria.
2. Refresh `TESTING.md` and `DEPLOYMENT.md` with accurate Portal commands (replace stale intake placeholders).
3. Update `ARCHITECTURE.md` repository layout note (incremental monorepo; Studio migration deferred to next phase).
4. Fix handoff repo map.
5. Write test report (grep/doc consistency) and signoff.
6. Set workflow `DONE: yes` for this closeout goal.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Doc link grep | Grep for stale "Phase 8 is next" / "Portal not built" | yes |
| Markdown | `git diff --check` | yes |

### Manual

- [x] User already confirmed Portal QA PASS 2026-07-08

---

## Human Checkpoints Anticipated

- [ ] Production Portal App Hosting deploy — **deferred** (not part of closeout)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Overclaiming production readiness | Low | Closeout says "MVP complete in dev" explicitly |
| Stale paths in TESTING.md | Low | Update commands in same pass |

---

## Rollback Plan

Revert documentation commit; no runtime impact.

---

## Documentation Updates Required

- [x] ROADMAP.md
- [x] ARCHITECTURE.md
- [x] TESTING.md
- [x] DEPLOYMENT.md
- [x] project-chatgpt-handoff/08-tech-stack-repo-map.md

---

## Signoff References (Phase 8)

| Area | Signoff / plan |
|------|----------------|
| Portal foundation | `docs/workflow/plans/2026-07-07-phase-8-portal-foundation-plan.md` |
| Customer show selection | `docs/workflow/reviews/2026-07-08-portal-customer-show-selection-signoff.md` |
| Printing tab + calendar (shared) | `docs/workflow/reviews/2026-07-08-show-queue-timer-and-calendar-picker-signoff.md` |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-08-phase-8-portal-closeout-review.md`
- Verdict: **approved**
