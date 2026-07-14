# Plan: Owner Studio archive-first design asset purge

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Planning Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Related | docs/workflow/plans/design-delete-archive-policy-plan.md |

---

## Goal

Let the **Owner** remove large design Storage assets from Studio **only after soft archive**, via **single or bulk Delete** from the Archived library view — while keeping enough metadata (title + thumbnail) that print-request / show history does not go blank.

## Background

Soft archive already hides designs from Portal (`status: "archived"`). Firestore client hard-delete of `designs` is denied. A prior draft of this plan allowed purge from live/ready designs; **owner superseded that (2026-07-14)** with: archive first → delete from archive (one-by-one or bulk).

Broader permanent-delete + 7-day cooling policy lives in `design-delete-archive-policy-plan.md`. This phase ships the **narrow, history-safe asset purge** slice with the new archive-first + bulk UX — not full Firestore tombstone hard-delete.

## Owner decisions (locked)

| # | Decision | Notes |
|---|----------|--------|
| 1 | Keep smallest image only | Retain `/thumbnails/{id}.webp`; purge `/originals/` + `/previews/` |
| 2 | **Archive first** | Delete/purge **only** when `status === "archived"`. **Supersedes** earlier “purge from live” lock. |
| 3 | Delete from archive: **single + bulk** | Owner multi-select + per-row Delete in Archived view |
| 4 | Active show queue | **Warn** if design is on an active show allocation/queue; allow continue after explicit confirm (do not hard-block) |
| 5 | No public like-count style expansion | N/A — Studio only |
| 6 | Cooling period | **Deferred** this phase (policy doc’s 7-day cool-off not required for first ship) |

## Scope

### In Scope

1. **Archive remains as today** for all staff (soft-hide; Storage retained). No change to who can archive/restore **unless** design is already asset-purged (then restore blocked).
2. **Archived library UX (Owner):**
   - Per-design **Delete** (destructive confirm) when viewing archived designs
   - Multi-select + **Delete selected** (bulk) with typed/strong confirmation
   - Non-owners: no Delete controls
3. **Cloud Function callable** (e.g. `purgeArchivedDesignAssets`):
   - Auth: active `role === "owner"` only
   - Input: one or more `designId`s (cap e.g. 25–50 per call)
   - Preconditions per id: exists; `status === "archived"`; not already purged
   - Actions: Admin Storage delete originals + previews; keep thumbnail; set `assetsPurgedAt`, `assetsPurgedBy`, clear/null `originalPath` / `previewPath` (keep `thumbnailPath`); audit fields
   - Active-queue warning is **UI-side** (preflight query); Function may re-check and return `warnings` but still allows purge when `confirmActiveQueue: true`
4. **Studio post-purge behavior:**
   - Purged designs leave the default **Archived** list (`assetsPurgedAt == null` filter), OR show a separate “Images deleted” filter — prefer **hide from Archived default** so “delete from archive” matches UX
   - Optional read-only history resolve by `designId` still works (title + thumb)
   - Restore blocked after purge (service + UI)
   - Gang-sheet / original-dependent export: fail safely with clear message if original missing
5. **Print-request history:** ensure catalog items can show title via live design or existing `titleSnapshot`; document gap if catalog items lack snapshots (fill snapshot on purge if missing, best-effort)
6. Docs: DATA_MODEL, SECURITY, ARCHITECTURE/BACKEND, DECISIONS (ADR), ROADMAP
7. Unit tests for shared helpers (path resolution, request validation, status gate); Studio typecheck; Functions build

### Out of Scope

- Full Firestore hard-delete of `designs/{id}` + `designTombstones` collection (later policy step)
- Admin/helper purge rights
- Bulk **archive** (nice-to-have; not required — staff archive one-by-one then owner bulk-deletes)
- Deleting the thumbnail
- 7-day cooling period enforcement
- Portal UI for purge
- Production deploy (human gate later)

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/` — new callable + register in `index.ts` (pattern: owner assert like `wipeOperationalTestData`, Storage deletes via Admin)
- `packages/shared/` — request/response types, validation helpers, storage path helpers
- `apps/studio/.../designs/` — Library archived view, selection, delete dialogs, hooks/services calling callable
- `apps/studio/.../permissions/` — `canPurgeDesignAssets` (owner only)
- `designService` restore/archive — block restore when purged
- Gang-sheet / preview resolvers if they assume original always exists
- Docs listed above

### Architecture Impact

- [x] Details: Destructive Storage + field updates only via trusted callable (Admin SDK). UI never treated as security boundary. Aligns with existing wipe pattern.

### Security Impact

- [x] Details: Owner-only callable; reject non-archived / already-purged; clients cannot hard-delete design docs (rules unchanged `allow delete: if false`). Prefer Function for product purge deletes (do not rely on client Storage delete rules).

### Data Model Impact

- [x] Details: New optional fields on `designs`: `assetsPurgedAt`, `assetsPurgedBy` (and optionally `assetsPurged: true`). Paths `originalPath` / `previewPath` cleared or marked absent. Status remains `archived`.

### Backend Impact

- [x] Details: New HTTPS callable v2; no new secrets. Dev deploy required before manual test.

### UI / UX Impact

- [x] Details: Archived catalog: owner Delete + bulk. Strong confirm. Active-queue warning. Manual PASS required.

### Migration Impact

- [x] Forward steps: None for existing docs; fields absent = not purged.
- [x] Rollback: Redeploy prior Functions; cannot undelete Storage objects without backups. Soft fields can be cleared only if files restored manually — treat purge as irreversible.

---

## Approach

1. Shared types + validators: `PurgeArchivedDesignAssetsRequest` (`designIds[]`, `confirmActiveQueue`, confirmation phrase if used).
2. Implement callable: load designs; enforce archived + not purged; delete Storage objects for original/preview prefixes; update Firestore fields; return per-id results.
3. Studio permission gate + preflight (active allocations for selected ids).
4. Archived library: selection model, Delete / Delete selected dialogs, call callable, refresh list (exclude purged).
5. Block restore when `assetsPurgedAt` set; safe missing-original messaging in production export paths.
6. Docs + ADR; automated tests; owner manual on `fresh-prints-dev`.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (validators / path helpers) | `npx tsx --test` (shared) | yes |
| Studio typecheck | studio `tsc` / package script | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Lint (touched) | eslint on changed files | yes |
| Rules unit | N/A unless harness exists | no |

### Manual

- [ ] Staff can archive; helper cannot see Delete
- [ ] Owner: archive → Delete one → leaves Archived list; thumb/title still resolvable if opened by id/history
- [ ] Owner: multi-select bulk Delete
- [ ] Reject delete if not archived (UI hidden; Function errors if forced)
- [ ] Active queue: warning then confirm allows purge
- [ ] Restore disabled after purge
- [ ] Portal never showed archived/purged designs

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (PASS/FAIL)
- [x] Business logic — archive-first + bulk locked above
- [ ] Production deploy (later, separate)
- [ ] Destructive data — owner confirms on real designs in dev/manual

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Irreversible Storage loss | high | Archive-first; strong confirm; owner-only; keep thumbnail |
| Broken gang-sheet original | medium | Fail closed with message; `originalPathSnapshot` may still point at deleted object |
| Bulk partial failure | medium | Per-id results; retry failed ids; no silent success |
| Active production surprise | medium | Warn + confirm |
| Confusion vs full hard-delete | low | Docs: doc remains for history; hidden from Archived UI |

---

## Rollback Plan

- Undeploy/replace callable; UI feature-flag or revert PR.
- Storage objects cannot be restored from app — use GCS versioning/backups if enabled (document as risk).

---

## Documentation Updates Required

- [x] DATA_MODEL.md — purge fields + archive-then-purge flow
- [x] SECURITY.md — owner callable
- [x] BACKEND.md / ARCHITECTURE.md — brief
- [x] DECISIONS.md — ADR (archive-first supersedes live purge)
- [x] ROADMAP.md — on signoff
- [ ] STYLE_GUIDE.md — only if new patterns need documenting

---

## Open Questions

- [x] Archive-first vs live purge — **resolved: archive-first**
- [x] Single + bulk — **resolved: both**
- [x] Keep thumbnail — **resolved: yes**
- [ ] None blocking — full Firestore tombstone hard-delete remains explicit follow-up

---

## Review required changes (must implement)

1. Firestore rules: clients cannot write `assetsPurgedAt` / `assetsPurgedBy` or purge-clear `originalPath` / `previewPath` — Admin SDK / callable only
2. Bulk Delete: strong confirmation (typed phrase or equivalent)
3. Server cap `designIds.length` ≤ 25

## Approval

- Review doc: docs/workflow/reviews/2026-07-14-owner-studio-design-asset-purge-review.md
- Verdict: approved_with_changes
