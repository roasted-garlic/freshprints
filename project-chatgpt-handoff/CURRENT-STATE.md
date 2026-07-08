# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-08**

---

## At a Glance

| Field | Value |
|-------|-------|
| **App** | Fresh Prints — DTF design catalog & print planning |
| **Active apps** | Fresh Prints Studio (Electron); Fresh Prints Portal (Next.js, in progress) |
| **Roadmap phase** | **Phase 8** — Fresh Prints Portal |
| **Managed workflow goal** | idle (last: show-queue timer + calendar picker, signed off 2026-07-08) |
| **Workflow phase** | idle |
| **Status** | Phase 7 Studio Show Queue complete including production timer and calendar picker. Phase 8 Portal slices 0–3 in progress. |
| **Human checkpoint** | none |

---

## Workflow Snapshot (FF)

```txt
Mode:           managed-phase
Goal:           idle
Phase:          idle
Last signoff:   docs/workflow/reviews/2026-07-08-show-queue-timer-and-calendar-picker-signoff.md
DONE:           yes (last managed phase)
Next:           Phase 8 Portal Slice 3 live QA or customer show-selection
```

### Deferred / backlog (not blocking Phase 8)

- **Gang Sheet Builder manual canvas** — post-MVP want; auto-nested export covers production needs.
- **Live Whatnot scheduled sync** — not planned for Studio (not 24/7). Revisit only for future always-on hosted service if needed.

### Current Managed Phase (signed off 2026-07-07)

**Show Queue production-file export** — signed off **approved_with_notes**:

- **Part A:** Gang Sheet Builder unlinked from Show Queue navigation (builder code preserved at its route for deferred work).
- **Part B:** Per-show **Export** zip — resizes each active allocation to fixed 300 DPI print size, names files per convention, saves via native dialog.
- **Multiply-by-qty** option on zip export.
- **Export Gang Sheet** — auto-nested transparent PNG export with configurable width/margins/gutters/max length via Show Queue settings; multi-sheet height cap; on-sheet filename labels (`MM-DD-YYYY` date format).
- **Import pipeline:** auto-upscale low-res PNGs on all four standard import paths; trim transparent padding at import for correct aspect lock.
- **Infrastructure:** shell header stale-closure fix; gang sheet DPI metadata, rotation heuristics, row centering, duplicate-copy interleave.

Automated verification at signoff: `npx tsc --noEmit`, `npm run lint`, targeted suites 72/72, full repo sweep 527/527, `npx vite build` — all PASS.

**Deferred (not part of this signoff):** Gang Sheet Builder standalone route, `react-rnd` canvas fix, Auto Builder slice — **post-MVP backlog** per user 2026-07-07 (want, not need). Live Whatnot scheduled sync **not planned** for Studio.

### Previous Phase 7 signoff (2026-07-05)

**`print-runs-foundation`** — Show Queue combined model, split allocation, capacity UI, Working/Queued/Printed tabs, Whatnot-assisted import polish. Signoff: `docs/workflow/reviews/2026-07-05-print-runs-foundation-signoff.md`.

**`whatnot-show-sync`** — Staff-assisted Whatnot show-list import. Signoff: `docs/workflow/reviews/2026-07-06-whatnot-show-sync-signoff.md`.

### Phase 6

Customers & Print Requests — complete and signed off (2026-07-06 closeout). See `docs/project/ROADMAP.md`.

---

## Roadmap Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation (Auth, roles, shell) | Complete |
| 2 | Design Library (2A–2C) | Complete |
| 3 | Import System (3A–3D) | Complete |
| 4 | Catalog Search & Cleanup | Complete |
| 5 | AI Review Workflow / enrichment baseline | Complete through Phase 0 deploy gate |
| 6 | Customers & Print Requests | Complete |
| **7** | **Show Queue (combined Whatnot show + print run)** | **Studio MVP complete (signed off 2026-07-07)** |
| **8** | **Fresh Prints Portal (customer web)** | **Next — after Firestore rules deploy** |
| 9 | Custom Request Q&A | Planned |
| 10 | Analytics & Popularity | Planned |

---

## Studio Workspaces (live routes)

| Route | Workspace | Purpose |
|-------|-----------|---------|
| `/designs` | Design Library | Approved catalog only (`status: ready`) |
| `/imports` | Imports | ZIP/folder batch import, validation, auto-upscale, trim padding |
| `/ai-review` | AI Review | Processing / Needs Review / Rejected tabs |
| `/print-requests` | Print Requests | Internal/customer request lists and request items |
| `/users` | Team management | Owner/admin team CRUD plus customer record create/edit |
| `/settings` | Settings | AI enrichment model + reasoning selection plus owner/admin AI playground |
| `/show-queue` | Show Queue | Combined Whatnot show + print run; zip export + gang sheet PNG export |
| `/show-queue/:showId/gang-sheet` | Gang Sheet Builder | Deferred manual canvas (unreachable from normal nav) |
| `/print-runs` | Redirect | Redirects to `/show-queue` for link compatibility |
| `/customer-requests` | Legacy placeholder | Future Custom Requests (Phase 9) |

Default landing: `/designs` (Design Library).

---

## Open Blockers & Risks

1. **No `npm test` script / no CI** — tests run via explicit `npx tsx --test ...`, lint, typecheck, and build.
2. **Functions deploy is a separate human checkpoint** — pushing Cloud Function source does not deploy it.
3. **Firestore rules deploy outstanding** — deploy `firestore.rules` before Phase 8 kickoff (dev and/or prod project).
4. **Portal not built** — Phase 8 is next after rules deploy.
5. **Gang Sheet Builder** — post-MVP backlog; not blocking Portal.

---

## How to Update This File

**Required at every managed-phase signoff** (Cursor, Claude, Codex, or any in-repo agent). See `.cursor/skills/signoff-phase/SKILL.md`.

1. Read `.cursor/workflow/state.md` and the signoff doc in `docs/workflow/reviews/`
2. Update **At a Glance**, **Workflow Snapshot**, and **Roadmap Phase Status**
3. Add the phase summary under **Current Managed Phase** (condense prior phase to **Previous**)
4. Update `13-recent-completed-work.md`, `03-roadmap-and-phases.md`, and `04-features-inventory.md` when behavior shipped
5. Bump **Last updated** date
6. Upload this file to your external AI chat
