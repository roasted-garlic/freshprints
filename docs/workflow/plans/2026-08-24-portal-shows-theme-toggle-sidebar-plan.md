# Plan: Restore Portal theme toggle to sidebar on Upcoming Shows

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-review.md |

---

## Goal

Put the Portal light/dark theme selector back in the **sidebar footer** on `/shows` and `/shows/[showId]`, matching every other app-shell page, and remove the floating top-right `PortalChrome` toggle on those routes.

## Background

Owner production Portal QA of Gate E (`fresh-prints-portal-build-2026-08-24-001`) found Upcoming Shows (`/shows`) showing the sun/moon toggle in the **header top-right** (next to Login) and **missing** it from the sidebar footer.

Root cause (two complementary mistakes when Upcoming Shows shipped):

1. `isAuthenticatedAppRoute` in `apps/portal/app/providers.tsx` lists `(app)` shell routes so floating `PortalChrome` is hidden. **`/shows` was never added**, so the floating header toggle still renders.
2. `PortalSidebar` **explicitly hides** `ThemeToggle` on `/shows` (`hideThemeToggle`), so the canonical sidebar control is gone.

Other public browse shell routes (`/catalog`, `/help`, `/share/design`) keep the sidebar toggle and hide `PortalChrome`. This plan restores that pattern for Upcoming Shows.

Parent production-promote Gate F (Studio 1.0.9) remains parked until this Portal chrome hotfix is signed off and a follow-up production App Hosting rollout is authorized.

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Workflow artifacts only |
| Development History | No |

## Scope

### In Scope
- Treat `/shows` and `/shows/**` as Portal app-shell routes (hide floating `PortalChrome`)
- Always show compact `ThemeToggle` in the sidebar footer on Upcoming Shows (remove `hideThemeToggle`)
- Extract the shell-route helper so `/shows` is covered by a unit test
- Manual visual check on `/shows` vs another shell page (e.g. `/catalog`)

### Out of Scope
- Moving Login / Signup (header guest CTA stays)
- Studio theme toggle
- Auth pages (`/login`, `/register`) floating toggle
- Production merge / App Hosting rollout (separate human-gated follow-up after signoff)
- Broader Portal chrome refactor

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/app/providers.tsx`
- `apps/portal/features/navigation/components/PortalSidebar.tsx`
- New: `apps/portal/features/navigation/utils/isPortalAppShellRoute.ts`
- New: `apps/portal/features/navigation/utils/isPortalAppShellRoute.test.ts`

### Architecture Impact
- [x] Details: Extract existing provider route list into a navigation util. No layer change.

### Security Impact
- [x] None

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: `/shows` and `/shows/[showId]` theme control matches other shell pages. Manual visual QA required.

### Migration Impact
- [x] None

---

## Approach

1. Extract `isPortalAppShellRoute(pathname)` from `providers.tsx` `isAuthenticatedAppRoute`, preserving existing prefixes and **adding** `/shows` + `/shows/`.
2. Providers: hide `PortalChrome` when `isPortalAppShellRoute(pathname)` is true.
3. Sidebar: delete `hideThemeToggle`; always render compact `ThemeToggle` in the footer actions row.
4. Unit-test the helper: `/shows` and `/shows/:id` are shell routes; `/login` is not.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npx eslint apps/portal/app/providers.tsx apps/portal/features/navigation/components/PortalSidebar.tsx apps/portal/features/navigation/utils/isPortalAppShellRoute.ts apps/portal/features/navigation/utils/isPortalAppShellRoute.test.ts` | yes (touched files) |
| Unit tests | `npx tsx --test apps/portal/features/navigation/utils/isPortalAppShellRoute.test.ts` | yes |
| Build | `npm run build:portal` | no (UI chrome only; typecheck sufficient) |
| Integration | — | no |
| E2E | — | no |
| Backend/rules | — | no |

### Manual
- [x] Details: Guest and signed-in `/shows` — theme toggle in sidebar footer, **not** top-right. Same on `/shows/[showId]`. `/catalog` unchanged. `/login` still has floating toggle.

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review — owner visual PASS on `/shows` before production rollout
- [ ] Design approval
- [ ] Business logic decision
- [x] Production deploy — **after** this hotfix is on `development` and owner authorizes a follow-up promote (not this implement phase)
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Duplicate toggles if only one of the two sites is fixed | Medium | Do both: add `/shows` to shell routes **and** stop hiding sidebar toggle |
| Miss `/shows/[showId]` | Low | Helper uses exact `/shows` plus `/shows/` prefix |
| Production still shows old chrome until App Hosting | Medium | This phase is development-only; rollout is a later gated promote |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the helper + sidebar/provider diff on `development`. Live Portal stays on `build-2026-08-24-001` until a follow-up App Hosting rollout.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md — existing ThemeToggle rule (shell + login) already matches intended behavior
- [x] Other: workflow plan/review/test/signoff only

---

## Open Questions
- [x] None

---

## Approval
- Review doc: docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-review.md
- Verdict: approved
