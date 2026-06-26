# Plan: Phase 4 — Catalog Cleanup (Design Library & AI Review Navigation)

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Prerequisite | Roadmap realignment approved (`docs/workflow/reviews/roadmap-realignment-review.md`) |
| Related | `docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md`, `docs/architecture/ADR-Application-Platform-Strategy.md` |

---

## Goal

Complete Phase 4 by aligning **Fresh Prints Studio** Design Library and AI Review navigation with the clarified business workflow:

```txt
Import Designs → AI Review → Approved Design Library → Print Requests → Print Runs → Analytics
```

Designs never become queued or printed. The Design Library is the **approved catalog only**. Imported designs surface in **AI Review**, not the library default browse.

**This plan is documentation and implementation scope definition only until review approval.**

---

## Finalized scope decisions (locked for implementation)

### Design Library (approved catalog only)

| Responsibility | In scope |
|----------------|----------|
| Search (title, description, tags) | Yes |
| Category filter | Yes |
| Multi-select tag filter (modal) | Yes — Phase 4A has single tag; upgrade to multi-select in cleanup or follow-up slice |
| Archived visibility toggle | Yes — show/hide `archived` alongside default `ready` browse |
| Metadata editing (staff) | Yes — existing edit modal |
| Thumbnail browsing | Yes |
| Design details | Yes |
| Pagination + URL persistence | Yes — catalog params only |

| Not in Design Library | Where it belongs |
|-----------------------|------------------|
| Import queue | Imports page |
| AI review queue | AI Review page |
| Production queue | Print Runs (Phase 7) |
| Customer / custom request queue | Custom Requests (Phase 9) |
| Operational status filter (`imported`, `processing`, `rejected`) | AI Review page |
| AI review status filter | AI Review page |

**Default server query:** `status == "ready"` (catalog-approved).

**Archived toggle behavior:**

* **Off (default):** `status == "ready"` only.
* **On:** `status in ["ready", "archived"]` (single query using Firestore `in` — max two values).

Rejected designs (`status: rejected`) are never shown in Design Library default browse; staff access via AI Review if needed.

### AI Review (import work queue)

| Responsibility | In scope |
|----------------|----------|
| Queue of imported / pending-review designs | Yes |
| AI-generated title, description, category, tags | Phase 5 provider work; page shell in this cleanup |
| Staff corrections before approval | Yes |
| Approve → `catalogApprovalService` → `status: ready` | Yes |
| Reject → `status: rejected` | Yes |
| Filters: `aiReviewStatus`, operational `status` for pipeline | Yes — on AI Review page only |

**Default AI Review query:** `status in ["imported", "processing"]` with `aiReviewStatus in ["pending", "needs_review"]` — exact matrix finalized during implementation; may use separate tabs (Pending / Needs Review / Rejected).

Approved designs leave the queue and appear in Design Library.

### Platform architecture (locked — ADR-FP-007)

Fresh Prints has **two applications only:**

| Application | Users | Purpose |
|-------------|-------|---------|
| **Fresh Prints Studio** | owner, admin, helper | Imports, AI review, catalog, customers, print requests, print runs, analytics, administration |
| **Fresh Prints Portal** | customer (`role: customer`) | Catalog browse, print requests, progress, custom requests (Phase 9) |

**Fresh Prints Portal** is **mobile-first responsive web** — excellent on phones, tablets, and desktop browsers. Optional PWA install remains the Portal, not a separate application.

**Explicitly out of scope permanently:**

* Native iOS app
* Native Android app
* React Native, Flutter, Xamarin, MAUI, or any standalone mobile application

The responsive web portal is the long-term mobile solution.

---

## Scope

### In scope (implementation — after review approval)

#### 1. Design Library cleanup

| Task | Detail |
|------|--------|
| Remove status filter UI | Drop dropdown for `imported`, `processing`, `rejected`, etc. |
| Remove AI review filter UI | Drop `aiReview` filter from library shell |
| Hard-default catalog query | Always apply `status: ready` unless archived toggle extends query |
| Archived visibility toggle | Boolean toggle; updates query and URL param `includeArchived=true` |
| Keep category filter | Unchanged behavior |
| Keep tag filter | Unchanged; note multi-select modal as stretch or Phase 4B |
| Keep search | Client-side title/description/tags |
| Keep pagination | Load more cursor unchanged |
| URL params cleanup | **Remove:** `status`, `aiReview`. **Keep:** `category`, `tag`, `search`, `includeArchived` |
| Update `designLibraryFilters.ts` | Remove status/AI review param helpers from library |
| Update `DesignLibraryPage.tsx` | Remove filter controls; apply default query in `useDesigns` |
| Update `useDesigns` / `designService` | Library caller passes fixed `status: ready` or archived-inclusive query |
| Unit tests | Update `designLibrarySearch.test.ts`; remove AI review filter tests from library context |

#### 2. AI Review navigation (page shell — minimal in Phase 4 cleanup)

| Task | Detail |
|------|--------|
| Sidebar entry | New nav item **AI Review** (e.g. `/ai-review`) — owner, admin, helper |
| Route + placeholder page | Shell with empty state; full queue UI may land in Phase 4 cleanup or Phase 5 |
| Imports navigation | After successful upload, link/navigate to `/ai-review` (not `/designs?status=imported`) |
| Batch import summary link | Same target |
| Permission gate | Reuse `canViewDesigns` or add `canReviewDesigns` if needed |

**Note:** Full AI Review queue UI (list, approve/reject actions) may be split: **navigation + routing in Phase 4 cleanup**; **queue list and actions in Phase 5** if scope is too large. Minimum deliverable: sidebar + route + import redirects + documented query for pending designs.

#### 3. Firestore index review (document only — no deletions in this phase)

See § Firestore index recommendations below.

#### 4. Documentation updates

| Doc | Updates |
|-----|---------|
| `ROADMAP.md` | Two-app platform; remove mobile app references |
| `PROJECT_BRIEF.md` | Fresh Prints Studio + Portal naming |
| `ARCHITECTURE.md` | Two applications; remove Future Mobile section |
| `WORKFLOWS.md` | Finalize Design Library and AI Review workflows |
| `DATA_MODEL.md` | Index notes for catalog vs AI Review queries (optional follow-up) |
| `DECISIONS.md` | ADR-FP-007 two-application platform |

### Out of scope

* AI provider integration (Phase 5)
* Print Request / Print Run features (Phases 6–7)
* Fresh Prints Portal implementation (Phase 8)
* Firestore index deletion or deploy
* Firestore rules changes
* Multi-select tag filter (if deferred — document as Phase 4B or 4 cleanup stretch)

---

## Affected files (expected implementation)

### Design Library

* `src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`
* `src/renderer/src/features/designs/constants/designLibraryFilters.ts`
* `src/renderer/src/features/designs/hooks/useDesigns.ts`
* `src/renderer/src/features/designs/services/designService.ts`
* `src/renderer/src/features/designs/types/designQuery.types.ts`
* `src/renderer/src/features/designs/utils/designLibrarySearch.ts`
* `src/renderer/src/features/designs/utils/designLibrarySearch.test.ts`
* `src/renderer/src/styles/components/design-library.css` (filter bar layout)

### AI Review navigation

* `src/renderer/src/features/ai-review/pages/AiReviewPage.tsx` (new)
* `src/renderer/src/features/imports/pages/ImportsPage.tsx` (post-upload links)
* `src/renderer/src/features/imports/components/BatchImportPanel.tsx` (summary link)
* App router / sidebar config (locations per existing nav pattern)

### Documentation

* Listed in § In scope

---

## Firestore index recommendations

**Do not remove or deploy index changes in this planning phase.**

Current `firestore.indexes.json` (6 design composites + 2 category):

| Index | Fields | After cleanup |
|-------|--------|---------------|
| D1 | `status` + `updatedAt` | **Keep** — Design Library default (`ready`) and AI Review (`imported`, etc.) |
| D2 | `categoryId` + `status` + `updatedAt` | **Keep** — Design Library category filter |
| D3 | `tags` CONTAINS + `status` + `updatedAt` | **Keep** — Design Library tag filter |
| D4 | `aiReviewStatus` + `status` + `updatedAt` | **Keep** — moves to **AI Review page** queries (not obsolete) |
| D5 | `tags` + `aiReviewStatus` + `status` + `updatedAt` | **Keep for now** — AI Review with tag filter; **candidate to deprecate** if AI Review never combines tag + aiReview server-side |
| D6 | `categoryId` + `tags` + `status` + `updatedAt` | **Keep** — Design Library category + tag on catalog |
| C1–C2 | categories | **Keep** — unchanged |

### Design Library query matrix (post-cleanup)

| User filters | Firestore constraints |
|--------------|----------------------|
| Default | `status == ready` + order `updatedAt` desc |
| + archived toggle | `status in [ready, archived]` + order |
| + category | `categoryId == X` + `status …` + order |
| + tag | `tags array-contains T` + `status …` + order |
| + category + tag | D6 index |

No `aiReviewStatus` in Design Library queries.

### AI Review query matrix (Phase 4 shell / Phase 5 full)

| Tab / filter | Likely constraints | Index |
|--------------|-------------------|-------|
| Pending imports | `status == imported` + `aiReviewStatus == pending` | D4 |
| Needs review | `aiReviewStatus == needs_review` + `status` | D4 |
| Rejected audit | `status == rejected` | D1 |

### Orphan / production-only indexes

Firebase may contain indexes not in `firestore.indexes.json` (e.g. `tags` CONTAINS + `status` without `updatedAt`). **Do not delete** during cleanup without query audit. Reconcile after implementation deploy.

### Future index additions (not Phase 4 cleanup)

* AI Review: `status == imported` + `updatedAt` if pending uses client-side aiReview filter only
* Phase 4B date range: `ready` + `createdAt` — new composite if added

### Index deprecation policy (post-implementation)

1. Implement cleanup and AI Review queries.
2. Run against emulator or staging; confirm which composites Firestore requests.
3. Document unused indexes in test report.
4. Human approval before `firebase deploy` index **deletion**.

---

## Implementation sequence (recommended)

| Step | Work | Depends on |
|------|------|------------|
| 1 | Review approval of this plan | — |
| 2 | Design Library: remove status + AI review filters; default `ready` query | Step 1 |
| 3 | Design Library: archived visibility toggle + URL param | Step 2 |
| 4 | URL param migration (drop `status`, `aiReview`; add `includeArchived`) | Step 2–3 |
| 5 | AI Review: sidebar + route + placeholder page | Step 1 |
| 6 | Imports: redirect/link to `/ai-review` after success | Step 5 |
| 7 | Unit test updates | Step 2–4 |
| 8 | Manual QA: library shows ready only; imports go to AI Review | Step 2–6 |
| 9 | Document index usage; plan index prune (no delete yet) | Step 8 |
| 10 | Phase 4 signoff | Step 8–9 |

**Phase 5** follows: AI Review queue list, approve/reject UI, AI enrichment providers.

Optional **Phase 4B:** multi-select tag modal, date range filters.

---

## Test strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Typecheck | `npx tsc --noEmit` | yes |
| Unit tests | `npx tsx --test src/renderer/src/features/designs/utils/designLibrarySearch.test.ts` | yes |

### Manual

| # | Step | Expected |
|---|------|----------|
| 1 | Open Design Library | Only `ready` designs shown by default |
| 2 | Toggle include archived | Archived designs appear; ready still visible |
| 3 | Category + tag filters | Work on catalog; no status/AI dropdowns |
| 4 | URL refresh | `category`, `tag`, `includeArchived` persist; no `status`/`aiReview` |
| 5 | Complete single PNG import | Navigates or links to AI Review |
| 6 | Complete batch import | Summary links to AI Review |
| 7 | AI Review sidebar | Visible to staff; page loads |
| 8 | Edit / archive design | Unchanged regression |

---

## Human checkpoints

- [ ] Review approval of this plan
- [ ] Manual UI QA after implementation
- [ ] Firestore index deletion (if any) — separate approval after usage audit

---

## Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Staff expect `status=imported` library deep links | Medium | Redirect old URLs to AI Review or strip invalid params |
| AI Review shell without queue list confuses users | Medium | Clear empty state copy; Phase 5 follows quickly |
| Archived + ready `in` query needs index | Low | Same D1 composite supports `in` on `status` |
| Removing library filters breaks bookmarked URLs | Low | Document param migration; graceful ignore of `status`/`aiReview` |
| Multi-select tags deferred | Low | Keep single tag for cleanup; track 4B |

---

## Rollback plan

Revert implementation commit. Restore filter UI and import links. No Firestore data migration required.

---

## Documentation updates (this planning session)

- [x] This plan
- [x] `ROADMAP.md` — two-app platform
- [x] `PROJECT_BRIEF.md` — mobile-first portal
- [x] `ARCHITECTURE.md` — remove standalone mobile
- [x] `WORKFLOWS.md` — finalized library + AI Review
- [x] `DECISIONS.md` — ADR-FP-007

---

## Approval

- Review doc: `docs/workflow/reviews/phase-4-catalog-cleanup-review.md` (create at review phase)
- Verdict: pending
