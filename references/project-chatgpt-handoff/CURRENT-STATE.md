# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-08**

---

## At a Glance

| Field | Value |
|-------|-------|
| **App** | Fresh Prints — DTF design catalog & print planning |
| **Active apps** | Fresh Prints Studio (Electron); Fresh Prints Portal (Next.js) |
| **Roadmap phase** | **Phase 8 complete (MVP dev)** — Phase 9 next |
| **Managed workflow goal** | `studio-apps-folder-monorepo-normalization` (plan ready for review) |
| **Workflow phase** | plan (monorepo); Phase 8 closeout DONE |
| **Status** | Portal MVP signed off in dev. Monorepo refactor planned, not started. |
| **Human checkpoint** | none |

---

## Workflow Snapshot (FF)

```txt
Mode:           managed-phase
Goal:           studio-apps-folder-monorepo-normalization
Phase:          plan (review pending)
Last signoff:   docs/workflow/reviews/2026-07-08-phase-8-portal-closeout-signoff.md
DONE:           no (monorepo phase open)
Next:           Review symmetric-apps-monorepo plan → implement
```

### Deferred / backlog (not blocking)

- **Gang Sheet Builder manual canvas** — post-MVP want; auto-nested export covers production needs.
- **Live Whatnot scheduled sync** — not planned for Studio (not 24/7).
- **`apps/studio` monorepo normalization** — optional dedicated refactor phase.

### Current Managed Phase (signed off 2026-07-08)

**Portal customer show selection** — signed off **approved**:

- Callables `listPortalAllocatableShows`, `queuePortalPrintRequestToShow` (customer-safe show list + transactional allocation)
- Portal `PortalQueueToShowModal` + **Add to show** on request detail; shared `@fresh-prints/show-picker`
- `showScheduleGrouping` in `@fresh-prints/shared`; ADR-FP-066
- Portal UX polish: list refresh, tab copy, mobile header, show print-run wording

Automated: targeted suites 40/40, typecheck, lint PASS. User manual QA PASS 2026-07-08.

### Previous signoff (2026-07-08)

**Show Queue production timer + calendar picker** — `docs/workflow/reviews/2026-07-08-show-queue-timer-and-calendar-picker-signoff.md`.

---

## Roadmap Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1–6 | Foundation through Print Requests | Complete |
| **7** | **Show Queue** | **Complete (signed off)** |
| **8** | **Fresh Prints Portal** | **Complete (MVP dev)** — signed off 2026-07-08 |
| **9** | **Custom Request Q&A** | **Next** |
| 10 | Analytics & Popularity | Planned |

---

## Studio Workspaces (live routes)

| Route | Workspace |
|-------|-----------|
| `/designs` | Design Library |
| `/imports` | Imports |
| `/ai-review` | AI Review |
| `/print-requests` | Print Requests |
| `/show-queue` | Show Queue (export, timer, Add to Show) |
| `/users` | Team + customers |
| `/settings` | AI settings |

Default landing: `/designs`.

---

## Portal (Phase 8)

| Route | Purpose |
|-------|---------|
| `/login`, `/register` | Customer auth |
| `/catalog` | Browse approved designs |
| `/requests` | Print requests (Working / Queued / Printing / Printed) |
| `/requests/[id]` | Request detail + **Add to show** |
| `/dashboard`, `/account` | Customer home + profile |

---

## Open Blockers & Risks

1. **No `npm test` script / no CI** — explicit `npx tsx --test`, lint, typecheck, build.
2. **Production Portal App Hosting** — not deployed; human approval required.
3. **Studio at repo root** — incremental monorepo; `apps/studio/` migration optional.

---

## How to Update This File

Required at every managed-phase signoff. See `.cursor/skills/signoff-phase/SKILL.md`.
