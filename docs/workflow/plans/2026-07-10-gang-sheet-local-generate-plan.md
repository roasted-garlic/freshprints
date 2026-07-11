# Plan: Local Gang Sheet Generate → Preview → Export

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-10-gang-sheet-local-generate-review.md |

---

## Goal

Replace one-shot “Export Gang Sheet” with a **Generate → preview (count + lengths) → download/export** flow that keeps composited PNGs in a **local Electron cache** (not Firebase). After generate succeeds, the primary action becomes **Export gang sheets** (copy cached files to a staff-chosen folder). Filenames include sheet length; the UI previews length before download.

## Background

Staff currently export gang sheets via Electron main: download → resize → nest → composite → save dialog. Sheet count and lengths are only known mid-export. A 200-image show produced ~4 sheets / ~677MB — unsuitable for temporary Firebase Storage. Architecture already treats gangsheet building as a **production-machine** concern (`ARCHITECTURE.md` Gangsheet Export). Decision: local cache only; no cloud upload of generated sheets.

Prior export signoff: `docs/workflow/reviews/2026-07-07-show-queue-export-and-production-files-signoff.md`.

## Scope

### In Scope

- Studio Show Queue: **Generate Gang Sheet** primary CTA (replaces immediate export as first step)
- Electron main: generate pipeline writes sheets to `userData` cache keyed by show id + content fingerprint
- Return sheet metadata: index, filename (with length), length inches, byte size, cache path
- UI after generate: list sheets with lengths; **Download** individual / **Download all**; primary button → **Export gang sheets** (folder/save flow from cache)
- Filename: existing `N-of-M` pattern **plus** length segment (reuse `formatInchesForFilename`)
- Invalidate/clear cache when: regenerate, show marked past / past tab, explicit clear, or fingerprint mismatch (allocations/settings changed)
- Shared unit tests for filename + any pure preview helpers
- Docs: `DECISIONS.md` ADR, brief `ARCHITECTURE.md` / `TESTING.md` notes as needed

### Out of Scope

- Firebase Storage / Firestore persistence of gang sheet PNGs
- Portal / customer access to gang sheets
- Gang Sheet Builder manual canvas revival
- Changing nesting algorithm or print DPI
- Auto-upload to cutting software
- Cross-machine cache sync

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/showExportFilename.ts` (+ tests) — length in gang sheet filename
- `packages/shared/src/types/export/gangSheetExportIpc.types.ts` — generate/export-from-cache IPC types
- `apps/studio/electron/services/export/exportGangSheetPng.ts` — split generate vs save-from-cache
- `apps/studio/electron/services/export/` — new cache helper (paths, write, clear, fingerprint)
- `apps/studio/electron/ipc/export/*` — channels, handlers, preload, validation
- `apps/studio/src/renderer/.../useExportGangSheetPng.ts` → generate + export-from-cache hooks (or extend)
- `apps/studio/src/renderer/.../ExportGangSheetConfirmModal.tsx` — generate / preview / download / export UX
- `apps/studio/src/renderer/.../UpcomingShowsPage.tsx` — button labels / wiring
- `docs/project/DECISIONS.md`, optionally `ARCHITECTURE.md`, `TESTING.md`

### Architecture Impact

- [x] Details: Studio-only Electron main owns generate + local disk cache under `app.getPath("userData")`. Renderer never writes binaries; requests generate/export/download via IPC. No Firebase Storage for generated sheets. Aligns with production-machine gangsheet workflow.

### Security Impact

- [x] Details: Cache paths stay under app `userData`; validate showId / fingerprint segments (no path traversal). Download/export still uses native save/open dialogs. Same auth gate as today (`canManageUpcomingShows`). No new secrets. Do not expose arbitrary filesystem read IPC.

### Data Model Impact

- [x] None (no Firestore schema). Cache is local-only metadata + PNG files.

### Backend Impact

- [x] None (no Cloud Functions / Storage). Electron IPC only.

### UI / UX Impact

- [x] Details: Export Gang Sheet modal becomes multi-state:
  1. Idle — explain generate; CTA **Generate Gang Sheet**
  2. Generating — progress (reuse existing steps)
  3. Ready — sheet list with lengths + sizes; Download one / Download all; CTA **Export gang sheets**; secondary **Regenerate**
  4. Error / warnings — same warning patterns as today
- Manual UI QA required on Show Queue with a multi-sheet show.

### Migration Impact

- [x] None. Old one-shot export path replaced in UI; no data migration.

---

## Approach

1. **Filename**
   - Extend `buildGangSheetFilename(base, index, total, lengthInches)` →  
     `{base}_{n}-of-{m}_{length}in.png` (e.g. `whatnot_07-10-2026_gang-sheet_1-of-4_42.25in.png`).
   - On-image label may keep current “N of M” text (length already in filename + UI); optional small label tweak only if cheap.

2. **Refactor export service**
   - Extract shared `composeGangSheetBuffers(request, onProgress)` → `{ sheets: { buffer, heightPx, lengthInches, placements }[], warnings, … }`.
   - **Generate**: compose → write under  
     `userData/gang-sheet-cache/{sanitizedShowId}/{fingerprint}/`  
     → return `GenerateGangSheetResult` (metadata + relative ids, not raw buffers to renderer).
   - **Export from cache**: save dialog / directory → copy cached PNGs (+ warnings txt) with length filenames.
   - **Download one / all**: IPC that copies one file or all files via save/open dialogs (same security model as export).
   - **Clear cache**: by showId; call when opening past show detail, after mark-finished if easy, and before regenerate.

3. **Fingerprint**
   - Hash of layout settings + per-allocation `(designId, qty, targetW, targetH)` (and show scheduled date for base name).  
   - If UI has a ready cache but fingerprint ≠ current allocations/settings → treat as stale; prompt regenerate.

4. **Renderer**
   - Hook: `generateGangSheet`, `exportCachedGangSheets`, `downloadCachedSheet`, `downloadAllCachedSheets`, `clearGangSheetCache`, progress subscription.
   - Modal shows lengths prominently; disable Export until generate succeeded for current fingerprint.

5. **Button behavior (Show Queue)**
   - No cache / stale → **Generate Gang Sheet**
   - Valid cache → **Export gang sheets** (may still open modal to preview/download individuals)
   - Prefer opening the modal for both so lengths are always visible before export.

6. **Docs**
   - ADR: local cache, not Firebase; auto-clear on past / regenerate / fingerprint mismatch.
   - Note disk usage risk for large shows (staff machine).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npx tsx --test packages/shared/src/utils/showExportFilename.test.ts` (+ new cache/fingerprint tests if pure) | yes |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | yes |
| Lint | `npm run lint` | yes |
| Portal typecheck | — | no (Studio-only) |
| Build | Studio vite build if time; installer not required | no |
| Integration / E2E | — | no |
| Backend/rules | — | no |

### Manual

- [ ] Generate on a show with enough allocations to produce **2+ sheets**; confirm count + lengths in modal
- [ ] Filenames include length; Download one / Download all / Export all land correct files
- [ ] Change allocation or settings → cache stale → must regenerate
- [ ] Past show / clear → cache removed (or Export disabled)
- [ ] Warnings still surface; cancel save dialogs do not corrupt cache

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (generate/export on real multi-sheet show)
- [ ] Design approval
- [ ] Business logic decision
- [ ] Production deploy
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [ ] Other: none for Firebase

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Disk fill from large caches (~hundreds of MB) | Medium | Clear on past/regenerate; show total size in UI; fingerprint folders replace old |
| Stale cache exported after queue edits | High | Fingerprint gate; Regenerate CTA |
| Path traversal via showId | Low | Sanitize ids; stay under userData |
| Regression: one-shot export muscle memory | Low | Modal copy explains Generate then Export |
| IPC surface grows | Low | Narrow channels; no generic file read |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the phase commit(s). Staff regain prior one-shot export. Delete leftover `userData/gang-sheet-cache` manually if needed. No cloud rollback.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [x] ARCHITECTURE.md — short note under Gangsheet Export (local generate/cache)
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [x] TESTING.md — mention generate/export manual checks if useful
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — ADR local cache vs Firebase
- [ ] Other: ROADMAP optional one-liner under production export

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | None |
| Development Tooling | None |
| Distribution/Installer | None (Electron IPC only; no installer config change expected) |
| Documentation | Project docs only |
| Development History | Workflow plan/review under `docs/workflow/` |

---

## Open Questions

- [x] None blocking — product direction confirmed: local cache, not Firebase; Generate then Export; lengths in filename + UI preview

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-10-gang-sheet-local-generate-review.md
- Verdict: **approved**
