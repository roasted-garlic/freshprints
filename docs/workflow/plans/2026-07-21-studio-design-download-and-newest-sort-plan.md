# Plan: Studio design full-res download + newest-first sort

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `studio-design-download-and-newest-sort` |
| Related | docs/workflow/reviews/2026-07-21-studio-design-download-and-newest-sort-review.md |

---

## Goal

In Fresh Prints Studio: (1) add a **Download full-res image** control on the **Design details modal**, and (2) sort Studio design list(s) **newest → oldest** so staff see recent imports first (aligned with Portal browse intent from Small Managed #6).

---

## Background

Owner requested full-res download for designs and newest-to-oldest ordering. Clarified **2026-07-21**: download lives on the **Design details modal** (not every grid card).

Inspection findings:

| Area | Current behavior |
|------|------------------|
| **Download UI** | No download button in Design Library components / `DesignDetailsModal`. Full-res file is `design.originalPath` (canonical Storage originals path). Show ZIP export already resolves originals via `designDerivativeUrlService.getDownloadUrlForCatalogPath(design.originalPath)`. |
| **Studio Design Library query** | `buildCatalogDesignListQuery` omits `sortField` / `sortDirection`. `designService` defaults to **`updatedAt` desc**. Editing metadata therefore reshuffles the grid away from “when uploaded.” |
| **Portal catalog (reference)** | Default browse already **`createdAt` desc** (Small Managed #6 Done). Studio was explicitly out of scope then. |
| **AI Review inbox** | Firestore query uses `updatedAt` desc; client `sortInboxDesigns` keeps **needs_review / rejected** newest-first by `updatedAt`, but **processing** is **oldest-first by `createdAt`** (queue fairness). No `importedAt` field on `Design`. |

---

## Scope

### In Scope
- **Download:** Button (or equivalent control) on `DesignDetailsModal` that downloads the **full-resolution original** from `design.originalPath` using existing Storage auth + `getDownloadURL` patterns (reuse `designDerivativeUrlService` or thin wrapper). Disable / hide when assets purged (`assetsPurgedAt`) or `originalPath` missing.
- **Sort:** Studio Design Library list default → **`createdAt` + `desc`** (newest uploads first), including filtered / archived scopes that use `listDesignsPage` / `useDesigns`.
- Fix any client merge/sort helpers that hardcode `updatedAt` when the active `sortField` is `createdAt` (e.g. `mergeDesignListPages`).
- Unit tests for query defaults / download helper behavior where practical; manual Studio check.
- Docs: brief note in ROADMAP / CURRENT-STATE; ADR only if a lasting product rule needs recording.

### Out of Scope
- Portal download or Portal sort changes.
- Download controls on every Design Library card / grid cell.
- AI Review detail/form download unless owner expands scope (default: **not** required; Library details modal is the confirmed surface).
- Changing AI Review **processing** tab oldest-first fairness without explicit owner ask.
- Production deploy; new packages; Storage rule changes (staff already can read originals for export).
- Filename UX beyond a sensible default (e.g. title- or path-based).

---

## Affected Areas

### Files / Modules (expected)
- `apps/studio/.../designs/components/DesignDetailsModal.tsx` — download control (footer or header actions).
- `apps/studio/.../designs/services/designDerivativeUrlService.ts` (and/or small download helper) — resolve `originalPath` → blob/URL → browser/Electron save.
- `apps/studio/.../designs/constants/designLibraryFilters.ts` — `buildCatalogDesignListQuery` set `sortField: "createdAt"`, `sortDirection: "desc"`.
- `apps/studio/.../designs/services/designService.ts` — ensure page merge / cursor sort respect `sortField` (not hardcoded `updatedAt`).
- Tests adjacent to query builder / sort helpers; optional download util test.

### Architecture Impact
- [x] Details: UI → existing design services / Storage download URL helper; no new backend layer.

### Security Impact
- [x] Details: Staff-only Studio; reuse authenticated Firebase Storage download URLs already used for show ZIP export. No public exposure. Disable when purged.

### Data Model Impact
- [x] None (use existing `originalPath`, `createdAt`, `updatedAt`). No `importedAt`.

### Backend Impact
- [x] None (client-only).

### UI / UX Impact
- [x] Details: Design details modal gains Download; Design Library grid order changes to upload-newest-first.

### Migration Impact
- [x] None

---

## Approach

1. **Download:** Add control on `DesignDetailsModal` (near Edit / Archive / footer actions). On click: resolve `originalPath` via existing catalog-path → `getDownloadURL`, trigger download (Electron-safe: open URL or fetch+save). Handle missing path / purged assets with user-safe message.
2. **Sort:** Set Design Library list query to `sortField: "createdAt"`, `sortDirection: "desc"`. Audit `designService` merge/cursor paths so client-side sorts use the same field.
3. **AI Review (default):** Leave inbox sort logic unchanged unless owner expands scope (see Open Questions).
4. Tests + short manual checklist; update workflow state after implement.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck / Studio unit | Focused tests under `apps/studio/.../designs` (query defaults, sort helpers) | yes |
| Lint | Touched files / project lint if practical | no if pre-existing noise |
| Build | Studio build if low-cost | optional |
| Backend/rules | N/A | no |

### Manual
- [x] Details:
  1. Open Design Library → newest uploads appear first (even after metadata edits that bump `updatedAt`).
  2. Open a design → Design details → Download → get full-res original (not thumb/preview).
  3. Archived / purged design: download disabled or clear error.
  4. (If AI Review in scope) confirm tab order still sensible.

---

## Human Checkpoints Anticipated
- [x] Confirm sort surfaces before implement (recommended default below).
- [ ] Manual UI check after implement
- [ ] Production deploy — N/A

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Large originals slow/fail in renderer | medium | Reuse proven ZIP export URL path; clear error on failure |
| `updatedAt`-based staff muscle memory | low | Document change; matches Portal “Studio-newest” meaning (`createdAt`) |
| Composite Firestore indexes | low | `createdAt` already supported as `DesignListSortField`; verify filtered queries |

---

## Rollback Plan

Revert Studio client changes; no data migration.

---

## Documentation Updates Required
- [ ] ROADMAP.md (active goal)
- [ ] DECISIONS.md — only if product rule needs ADR
- [ ] Other: workflow plan/review; handoff CURRENT-STATE at implement/signoff

---

## Open Questions

Resolved:
- [x] **Download surface** = **Design details modal** (owner 2026-07-21). Not required on every card.

Still for owner go-ahead (recommended defaults below):
- [x] **Sort surfaces:** Design Library only (`createdAt` desc). AI Review processing oldest-first unchanged (owner Continue Workflow 2026-07-21).
- [x] Confirm recommended defaults, then **Continue Workflow** to implement.

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-21-studio-design-download-and-newest-sort-review.md
- Verdict: **approved_with_changes** (await owner sort-surface go-ahead before implement)
