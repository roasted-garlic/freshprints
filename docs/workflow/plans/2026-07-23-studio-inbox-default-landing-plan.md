# Plan: Studio Inbox Default Landing

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-23-studio-inbox-default-landing-review.md |

---

## Goal

Make **Staff Inbox** (`/inbox`) the default landing page when Fresh Prints Studio is launched or when an authenticated user hits `/` / post-login, instead of Design Library (`/designs`).

## Background

Owner request (2026-07-23): Inbox should be the first screen after launch. Today three redirects hard-code `/designs`:

- `AppRoutes` root `/` → `/designs`
- `AppRoutes` catch-all `*` → `/designs`
- `LoginRoute` when already authenticated → `/designs`

Sidebar brand (“home”) also links to `/designs`.

Wave C (`firestore-usage-efficiency-wave-c`) remains parked on its owner smoke checkpoint; this goal is a narrow navigation-only change with no Firestore or containment impact.

## Scope

### In Scope
- Change default authenticated landing redirects from `/designs` to `/inbox`
- Align sidebar brand link + aria label/title with Inbox as home
- Record a short decision note and architecture mention of Studio default landing
- Focused verification (grep/constants check or tiny unit if useful; Studio build/lint of touched files)

### Out of Scope
- Reordering sidebar nav items
- Changing Inbox page behavior, permissions, or alert sounds
- Portal landing / SEO
- Wave C containment, snapshots, or Firebase work
- Production deploy

---

## Affected Areas

### Files / Modules (expected)
- `apps/studio/src/renderer/src/routes/AppRoutes.tsx`
- `apps/studio/src/renderer/src/routes/LoginRoute.tsx`
- `apps/studio/src/renderer/src/shared/components/Sidebar.tsx`
- `docs/architecture/ARCHITECTURE.md` (one-line Studio default landing)
- `docs/project/DECISIONS.md` (short ADR)

### Architecture Impact
- [x] Details: Navigation default only; no new modules or layer changes.

### Security Impact
- [x] Details: Inbox already gated by `viewPrintRequests` (same staff gate as `viewDesigns` via `isStaff`). No permission model change. Unauthorized users still cannot see Inbox content.

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Launch / login / unknown-route / brand-home now open Inbox. Design Library remains reachable via sidebar.

### Migration Impact
- [x] None

---

## Approach

1. Update `AppRoutes` `/` and `*` `Navigate` targets to `/inbox`.
2. Update `LoginRoute` authenticated redirect to `/inbox`.
3. Update Sidebar brand `NavLink` `to`, `aria-label`, and `title` to Inbox home.
4. Document default landing in ARCHITECTURE + DECISIONS.
5. Verify no other launch/post-login hard redirects to `/designs` remain for “home”.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck / build | `npm exec --workspace @fresh-prints/studio -- vite build` (or focused if build known-flaky) | yes |
| Lint | eslint on touched Studio TS/TSX files `--max-warnings 0` | yes |
| Unit tests | Optional tiny redirect-constant test if extracted; otherwise N/A | no |
| Integration | N/A | no |
| E2E | N/A | no |
| Backend/rules | N/A | no |

### Manual
- [x] Details: After Studio launch (or hard refresh at `#/`), confirm Inbox. After login, confirm Inbox. Brand logo click → Inbox. Design Library still opens from sidebar.

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review — short smoke after implement (launch + login + brand link)
- [ ] Design approval
- [ ] Business logic decision — **already decided by owner**
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other:

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Staff without Inbox permission see Unauthorized | Low | Both permissions are `isStaff`; same population as Design Library |
| Bookmarks to `/designs` break | None | `/designs` route unchanged |
| Wave C confusion | Low | Park Wave C explicitly in workflow state |

---

## Rollback Plan

Revert the three redirect targets and Sidebar brand link to `/designs`.

---

## Documentation Updates Required
- [ ] PROJECT_BRIEF.md
- [x] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md
- [ ] Other:

---

## Open Questions
- [x] None — owner requested Inbox as default landing.

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-23-studio-inbox-default-landing-review.md
- Verdict: approved
